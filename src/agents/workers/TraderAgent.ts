import { AgentMemory } from '../../memory/AgentMemory';
import { AgentTools } from '../../tools/AgentTools';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { AgentTask } from '../AutonomousAgent';
import { AgentCapability, SpecializedWorkerAgent } from './SpecializedWorkerAgent';

/**
 * TraderAgent specializes in executing trades and managing positions.
 * It handles order placement, position management, and portfolio operations.
 */
export class TraderAgent extends SpecializedWorkerAgent {
    // Define standard capabilities for trader agents
    private static readonly DEFAULT_CAPABILITIES: AgentCapability[] = [
        {
            id: 'execute_trade',
            name: 'Execute Trade',
            description: 'Places buy/sell orders on supported exchanges',
            confidence: 0.95,
            parameters: {
                supportedExchanges: ['binance', 'coinbase', 'dex']
            }
        },
        {
            id: 'manage_position',
            name: 'Position Management',
            description: 'Manages open positions including stop loss and take profit',
            confidence: 0.9,
            parameters: {
                features: ['stop loss', 'take profit', 'trailing stop', 'DCA']
            }
        },
        {
            id: 'portfolio_rebalance',
            name: 'Portfolio Rebalancing',
            description: 'Rebalances portfolio to match target allocations',
            confidence: 0.85
        },
        {
            id: 'risk_management',
            name: 'Risk Management',
            description: 'Applies risk management rules to trades and positions',
            confidence: 0.9,
            parameters: {
                maxPositionSize: '5%', // percent of portfolio
                maxDrawdown: '15%'     // max allowed drawdown
            }
        }
    ];

    // Track active trades and positions
    private activeTrades: Map<string, any> = new Map();
    private riskLimits: Record<string, any> = {
        maxPositionValue: 0, // Will be set during initialization
        maxDrawdownPercent: 15,
        maxPositionsCount: 10,
        maxLeverage: 3
    };

    constructor(
        id: string,
        memory: AgentMemory,
        tools: AgentTools,
        supabaseClient: SupabaseClient<Database>,
        additionalCapabilities: AgentCapability[] = []
    ) {
        // Combine default capabilities with any additional ones
        const allCapabilities = [
            ...TraderAgent.DEFAULT_CAPABILITIES,
            ...additionalCapabilities
        ];
        
        super(id, memory, tools, supabaseClient, allCapabilities);
        this.log('info', `TraderAgent ${id} initialized with ${allCapabilities.length} capabilities`);
        
        // Initialize trader-specific configuration
        this.initializeTraderConfig();
    }

    /**
     * Initializes trader-specific configuration.
     * @private
     */
    private async initializeTraderConfig(): Promise<void> {
        try {
            // Load any persisted configuration
            const config = await this.memory.retrieve('trader_config');
            if (!config) {
                // Set default configuration if none exists
                const defaultConfig = {
                    riskSettings: {
                        maxPositionValue: 1000, // Default in USD
                        maxDrawdownPercent: 15,
                        maxPositionsCount: 10,
                        maxLeverage: 3
                    },
                    defaultOrderSettings: {
                        orderType: 'limit',
                        useStopLoss: true,
                        useTakeProfit: true,
                        slippage: 0.5 // percent
                    },
                    exchanges: {
                        preferred: 'binance',
                        alternates: ['coinbase', 'dex']
                    }
                };
                await this.memory.store('trader_config', defaultConfig);
                this.log('info', 'Initialized default trader configuration');
                
                // Set risk limits from default config
                this.riskLimits = defaultConfig.riskSettings;
            } else {
                // Use stored configuration
                this.riskLimits = config.riskSettings;
                this.log('info', 'Loaded trader configuration from memory');
            }
            
            // Load any active trades
            const storedTrades = await this.memory.retrieve('active_trades');
            if (Array.isArray(storedTrades)) {
                this.activeTrades.clear();
                storedTrades.forEach(trade => {
                    this.activeTrades.set(trade.id, trade);
                });
                this.log('info', `Loaded ${storedTrades.length} active trades from memory`);
            }
        } catch (error: any) {
            this.log('error', `Failed to initialize trader configuration: ${error.message}`);
        }
    }

    /**
     * Updates the trader configuration.
     * @param updates Partial updates to apply to the configuration
     */
    public async updateTraderConfig(updates: Record<string, any>): Promise<void> {
        try {
            const currentConfig = await this.memory.retrieve('trader_config') || {};
            const updatedConfig = { ...currentConfig, ...updates };
            await this.memory.store('trader_config', updatedConfig);
            
            // Update risk limits if they were changed
            if (updates.riskSettings) {
                this.riskLimits = { ...this.riskLimits, ...updates.riskSettings };
            }
            
            this.log('info', 'Updated trader configuration', updates);
        } catch (error: any) {
            this.log('error', `Failed to update trader configuration: ${error.message}`);
            throw error;
        }
    }

    /**
     * Persists active trades to memory.
     * @private
     */
    private async persistActiveTrades(): Promise<void> {
        try {
            const trades = Array.from(this.activeTrades.values());
            await this.memory.store('active_trades', trades);
        } catch (error: any) {
            this.log('error', `Failed to persist active trades: ${error.message}`);
        }
    }

    /**
     * Performs a trader-specific task.
     * @override
     */
    protected async _performTask(task: AgentTask): Promise<any> {
        this.log('info', `TraderAgent ${this.id} processing task: ${task.type}`);

        switch (task.type) {
            case 'execute_trade':
                return this.executeTrade(task);
                
            case 'manage_position':
                return this.managePosition(task);
                
            case 'portfolio_rebalance':
                return this.rebalancePortfolio(task);
                
            case 'check_positions':
                return this.checkPositions(task);
                
            default:
                // Delegate to parent class for unknown task types
                return super._performTask(task);
        }
    }

    /**
     * Executes a trade based on the provided task parameters.
     * @param task The task with trade parameters
     */
    private async executeTrade(task: AgentTask): Promise<any> {
        this.log('info', `Executing trade: ${JSON.stringify(task.payload)}`);
        
        const { symbol, side, amount, price, orderType, options } = task.payload || {};
        
        // Basic validation
        if (!symbol || !side || !amount) {
            throw new Error('Symbol, side, and amount are required for trade execution');
        }
        
        if (!['buy', 'sell'].includes(side.toLowerCase())) {
            throw new Error(`Invalid trade side: ${side}. Must be 'buy' or 'sell'`);
        }
        
        // Get the trading platform tool
        const tradingTool = this.tools.getTool('tradingPlatform');
        if (!tradingTool) {
            throw new Error('Required tool tradingPlatform not available');
        }
        
        // Apply risk management checks
        await this.applyRiskChecks({
            symbol,
            side,
            amount,
            price
        });
        
        try {
            // Execute the trade
            const tradeResult = await tradingTool.execute({
                symbol,
                amount: parseFloat(amount),
                type: side.toLowerCase(),
                orderType: orderType || 'market',
                price: price ? parseFloat(price) : undefined,
                ...options
            });
            
            if (!tradeResult.success) {
                throw new Error(`Trade execution failed: ${tradeResult.error}`);
            }
            
            // Create a record of the trade
            const tradeId = tradeResult.orderId || `trade-${Date.now()}`;
            const tradeRecord = {
                id: tradeId,
                symbol,
                side,
                amount,
                price: price || 'market',
                orderType: orderType || 'market',
                status: 'active',
                orderId: tradeResult.orderId,
                timestamp: new Date().toISOString(),
                options
            };
            
            // Store the trade if it needs to be tracked
            if (options?.trackPosition) {
                this.activeTrades.set(tradeId, tradeRecord);
                await this.persistActiveTrades();
            }
            
            // Record the trade in the database
            try {
                await this.supabase.from('trades').insert({
                    trade_id: tradeId,
                    symbol,
                    side: side.toLowerCase(),
                    amount: parseFloat(amount),
                    price: price ? parseFloat(price) : null,
                    order_type: orderType || 'market',
                    status: 'executed',
                    agent_id: this.id,
                    metadata: {
                        orderId: tradeResult.orderId,
                        options
                    },
                    created_at: new Date().toISOString()
                });
            } catch (dbError: any) {
                this.log('warn', `Failed to record trade in database: ${dbError.message}`);
                // Continue execution, this is a non-critical error
            }
            
            return {
                success: true,
                tradeId,
                orderId: tradeResult.orderId,
                status: tradeResult.status || 'executed',
                message: `${side} order for ${amount} ${symbol} executed successfully`
            };
        } catch (error: any) {
            this.log('error', `Trade execution failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Manages an existing position (update stop loss, take profit, etc).
     * @param task The task with position management parameters
     */
    private async managePosition(task: AgentTask): Promise<any> {
        this.log('info', `Managing position: ${JSON.stringify(task.payload)}`);
        
        const { tradeId, orderId, symbol, action, params } = task.payload || {};
        
        // Need either tradeId, orderId, or symbol to identify the position
        if (!tradeId && !orderId && !symbol) {
            throw new Error('Either tradeId, orderId, or symbol is required for position management');
        }
        
        if (!action) {
            throw new Error('Action is required for position management');
        }
        
        // Get the trading platform tool
        const tradingTool = this.tools.getTool('tradingPlatform');
        if (!tradingTool) {
            throw new Error('Required tool tradingPlatform not available');
        }
        
        try {
            let positionDetails;
            
            // Find the position by its identifier
            if (tradeId && this.activeTrades.has(tradeId)) {
                positionDetails = this.activeTrades.get(tradeId);
            } else if (orderId || symbol) {
                // Would typically fetch from exchange API
                // For now, use mock data for demonstration
                positionDetails = {
                    id: tradeId || `position-${Date.now()}`,
                    symbol: symbol || 'UNKNOWN',
                    orderId: orderId || 'unknown',
                    // Other details would be populated from exchange data
                };
            } else {
                throw new Error('Position not found');
            }
            
            let result;
            
            // Handle different management actions
            switch (action.toLowerCase()) {
                case 'update_sl':
                    // Update stop loss
                    result = await tradingTool.execute({
                        method: 'updateStopLoss',
                        symbol: positionDetails.symbol,
                        orderId: positionDetails.orderId,
                        price: params.price
                    });
                    break;
                    
                case 'update_tp':
                    // Update take profit
                    result = await tradingTool.execute({
                        method: 'updateTakeProfit',
                        symbol: positionDetails.symbol,
                        orderId: positionDetails.orderId,
                        price: params.price
                    });
                    break;
                    
                case 'close':
                    // Close the position
                    result = await tradingTool.execute({
                        symbol: positionDetails.symbol,
                        type: positionDetails.side === 'buy' ? 'sell' : 'buy', // Opposite of the open direction
                        amount: params.amount || positionDetails.amount, // Full amount if not specified
                        orderType: params.orderType || 'market'
                    });
                    
                    // Remove from active trades if full close
                    if (tradeId && (!params.amount || params.amount === positionDetails.amount)) {
                        this.activeTrades.delete(tradeId);
                        await this.persistActiveTrades();
                    }
                    break;
                    
                default:
                    throw new Error(`Unsupported position management action: ${action}`);
            }
            
            return {
                success: true,
                action: action.toLowerCase(),
                positionId: positionDetails.id,
                symbol: positionDetails.symbol,
                result
            };
        } catch (error: any) {
            this.log('error', `Position management failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Rebalances a portfolio to match target allocations.
     * @param task The task with rebalancing parameters
     */
    private async rebalancePortfolio(task: AgentTask): Promise<any> {
        this.log('info', `Rebalancing portfolio: ${JSON.stringify(task.payload)}`);
        
        const { targets, tolerancePercent, dryRun } = task.payload || {};
        
        if (!targets || !Array.isArray(targets)) {
            throw new Error('Target allocations array is required for portfolio rebalancing');
        }
        
        // Get the trading platform tool
        const tradingTool = this.tools.getTool('tradingPlatform');
        if (!tradingTool) {
            throw new Error('Required tool tradingPlatform not available');
        }
        
        try {
            // 1. Get current portfolio composition
            const portfolioResult = await tradingTool.execute({
                method: 'getPortfolio'
            });
            
            const currentHoldings = portfolioResult.holdings;
            const totalValue = portfolioResult.totalValue;
            
            // 2. Calculate required trades to achieve target allocations
            const requiredTrades = [];
            const tolerance = tolerancePercent || 1.0; // Default 1% tolerance
            
            for (const target of targets) {
                const { asset, targetPercent } = target;
                
                // Find current holding for this asset
                const currentHolding = currentHoldings.find(h => h.asset === asset);
                const currentValue = currentHolding ? currentHolding.value : 0;
                const currentPercent = (currentValue / totalValue) * 100;
                
                // Calculate the difference between current and target percentages
                const percentDiff = targetPercent - currentPercent;
                
                // Only rebalance if difference exceeds tolerance
                if (Math.abs(percentDiff) > tolerance) {
                    const valueToTrade = (percentDiff / 100) * totalValue;
                    
                    requiredTrades.push({
                        asset,
                        side: percentDiff > 0 ? 'buy' : 'sell',
                        value: Math.abs(valueToTrade),
                        currentPercent,
                        targetPercent,
                        percentDiff
                    });
                }
            }
            
            // 3. Execute the required trades (if not dry run)
            const executedTrades = [];
            
            if (!dryRun && requiredTrades.length > 0) {
                for (const trade of requiredTrades) {
                    try {
                        const tradeResult = await tradingTool.execute({
                            symbol: trade.asset,
                            type: trade.side,
                            value: trade.value, // Trade by value instead of amount
                            orderType: 'market'
                        });
                        
                        executedTrades.push({
                            asset: trade.asset,
                            side: trade.side,
                            value: trade.value,
                            status: 'executed',
                            orderId: tradeResult.orderId
                        });
                    } catch (tradeError: any) {
                        this.log('error', `Rebalance trade failed for ${trade.asset}: ${tradeError.message}`);
                        executedTrades.push({
                            asset: trade.asset,
                            side: trade.side,
                            value: trade.value,
                            status: 'failed',
                            error: tradeError.message
                        });
                    }
                }
            }
            
            return {
                success: true,
                dryRun: !!dryRun,
                currentPortfolio: {
                    holdings: currentHoldings,
                    totalValue
                },
                targetAllocations: targets,
                requiredTrades,
                executedTrades: dryRun ? [] : executedTrades,
                summary: `Portfolio rebalance ${dryRun ? 'dry run' : 'execution'} completed. ${requiredTrades.length} trades required, ${dryRun ? 0 : executedTrades.length} executed.`
            };
        } catch (error: any) {
            this.log('error', `Portfolio rebalance failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Checks and reports on open positions.
     * @param task The task parameters
     */
    private async checkPositions(task: AgentTask): Promise<any> {
        this.log('info', `Checking positions: ${JSON.stringify(task.payload)}`);
        
        const { symbol } = task.payload || {};
        
        // Get the trading platform tool
        const tradingTool = this.tools.getTool('tradingPlatform');
        if (!tradingTool) {
            throw new Error('Required tool tradingPlatform not available');
        }
        
        try {
            // Get positions from the trading platform
            const positionsResult = await tradingTool.execute({
                method: 'getPositions',
                symbol // Optional, if undefined will get all positions
            });
            
            // Update local active trades based on exchange data
            if (Array.isArray(positionsResult.positions)) {
                for (const position of positionsResult.positions) {
                    // Update or add to active trades
                    if (position.orderId) {
                        this.activeTrades.set(position.id, {
                            ...position,
                            lastUpdated: new Date().toISOString()
                        });
                    }
                }
                await this.persistActiveTrades();
            }
            
            return {
                success: true,
                timestamp: new Date().toISOString(),
                positions: positionsResult.positions,
                summary: `${positionsResult.positions.length} active positions found${symbol ? ` for ${symbol}` : ''}`
            };
        } catch (error: any) {
            this.log('error', `Check positions failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Applies risk management checks to a potential trade.
     * @private
     */
    private async applyRiskChecks(tradeParams: { symbol: string; side: string; amount: string | number; price?: string | number }): Promise<void> {
        try {
            // Convert amount to number if it's a string
            const amount = typeof tradeParams.amount === 'string' 
                ? parseFloat(tradeParams.amount) 
                : tradeParams.amount;
            
            // Convert price to number if it's a string
            const price = tradeParams.price !== undefined
                ? (typeof tradeParams.price === 'string' ? parseFloat(tradeParams.price) : tradeParams.price)
                : undefined;
            
            // 1. Check if we have too many open positions
            if (this.activeTrades.size >= this.riskLimits.maxPositionsCount) {
                throw new Error(`Risk limit exceeded: Maximum number of positions (${this.riskLimits.maxPositionsCount}) reached`);
            }
            
            // 2. Check position size against max position value
            // Note: In a real implementation, we would need to fetch current price if not provided
            // and convert amount to value based on price.
            if (price && amount * price > this.riskLimits.maxPositionValue) {
                throw new Error(`Risk limit exceeded: Position value (${amount * price}) exceeds maximum (${this.riskLimits.maxPositionValue})`);
            }
            
            // 3. Additional checks would be performed here
            // - Check available balance
            // - Check for portfolio concentration
            // - Check drawdown limits
            // - etc.
            
            this.log('info', 'Trade passed all risk checks');
        } catch (error: any) {
            this.log('warn', `Risk check failed: ${error.message}`);
            throw error;
        }
    }
} 