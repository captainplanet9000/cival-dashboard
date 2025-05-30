import { StrategyExecutionService } from '../trading/strategy-execution-service';
import { OrderService } from '../trading/order-service';
import { MarketDataService } from '../trading/market-data-service';
import { Strategy, StrategyParams } from '../trading/strategy-interface';
import { AIAdaptiveStrategy } from '../trading/strategies/ai-adaptive-strategy';
import { StrategyExecution, StrategyStatus } from '@/types/trading.types';
import { createServerClient } from '@/utils/supabase/server';
import { pusherServer } from '@/lib/pusher';
import knowledgeService from '@/services/knowledge-service-factory';

/**
 * Interface for agent's strategy configuration
 */
export interface AgentStrategyConfig {
  agentId: string;
  farmId: number;
  strategyId: string;
  strategyParams: StrategyParams;
  userId: string;
  status: StrategyStatus;
  metadata?: Record<string, any>;
}

/**
 * AI Strategy Manager - connects ElizaOS agents to the trading strategy framework
 * Allows agents to create, manage, and optimize trading strategies
 */
export class AIStrategyManager {
  private strategyExecutionService: StrategyExecutionService;
  private orderService: OrderService;
  private marketDataService: MarketDataService;
  private strategies: Map<string, Strategy> = new Map();
  private agentStrategies: Map<string, AgentStrategyConfig> = new Map();
  
  constructor(
    strategyExecutionService: StrategyExecutionService,
    orderService: OrderService,
    marketDataService: MarketDataService
  ) {
    this.strategyExecutionService = strategyExecutionService;
    this.orderService = orderService;
    this.marketDataService = marketDataService;
    
    // Register available strategies
    this.registerAvailableStrategies();
  }
  
  /**
   * Initialize the AI Strategy Manager
   */
  async initialize(): Promise<void> {
    try {
      // Load agent strategy configurations from database
      await this.loadAgentStrategies();
      
      // Register all strategies with the execution service
      this.strategies.forEach(strategy => {
        this.strategyExecutionService.registerStrategy(strategy);
      });
      
      // Start any active strategies
      for (const [agentId, config] of this.agentStrategies.entries()) {
        if (config.status === 'active') {
          await this.startAgentStrategy(
            config.agentId,
            config.strategyId,
            config.strategyParams,
            config.userId
          );
        }
      }
    } catch (error) {
      console.error('Error initializing AI Strategy Manager:', error);
    }
  }
  
  /**
   * Register a strategy for an agent
   */
  async registerAgentStrategy(
    agentId: string,
    farmId: number,
    strategyId: string,
    strategyParams: StrategyParams,
    userId: string
  ): Promise<boolean> {
    try {
      // Verify the strategy exists
      if (!this.strategies.has(strategyId)) {
        throw new Error(`Strategy ${strategyId} not found`);
      }
      
      // Create agent strategy configuration
      const config: AgentStrategyConfig = {
        agentId,
        farmId,
        strategyId,
        strategyParams: {
          ...strategyParams,
          id: strategyId, // Ensure the ID is set correctly
        },
        userId,
        status: 'paused', // Start as paused
        metadata: {
          registeredAt: new Date().toISOString()
        }
      };
      
      // Store in memory
      this.agentStrategies.set(agentId, config);
      
      // Save to database
      await this.saveAgentStrategyToDatabase(config);
      
      // Notify via WebSocket
      await this.notifyAgentStrategyEvent('registered', agentId, config);
      
      return true;
    } catch (error) {
      console.error(`Error registering strategy ${strategyId} for agent ${agentId}:`, error);
      return false;
    }
  }
  
  /**
   * Start a strategy for an agent
   */
  async startAgentStrategy(
    agentId: string,
    strategyId: string,
    strategyParams?: StrategyParams,
    userId?: string
  ): Promise<StrategyExecution | null> {
    try {
      // Get agent strategy configuration
      const config = this.agentStrategies.get(agentId);
      
      if (!config) {
        throw new Error(`No strategy configuration found for agent ${agentId}`);
      }
      
      // Use provided params or existing ones
      const params = strategyParams || config.strategyParams;
      const user = userId || config.userId;
      
      // Start the strategy execution
      const execution = await this.strategyExecutionService.startStrategyExecution(
        strategyId,
        params,
        user
      );
      
      if (!execution) {
        throw new Error(`Failed to start strategy execution for agent ${agentId}`);
      }
      
      // Update status
      config.status = 'active';
      
      // Update in database
      await this.updateAgentStrategyInDatabase(config);
      
      // Notify via WebSocket
      await this.notifyAgentStrategyEvent('started', agentId, config);
      
      return execution;
    } catch (error) {
      console.error(`Error starting strategy for agent ${agentId}:`, error);
      return null;
    }
  }
  
  /**
   * Stop a strategy for an agent
   */
  async stopAgentStrategy(agentId: string): Promise<boolean> {
    try {
      // Get agent strategy configuration
      const config = this.agentStrategies.get(agentId);
      
      if (!config) {
        throw new Error(`No strategy configuration found for agent ${agentId}`);
      }
      
      // Stop the strategy execution
      const result = await this.strategyExecutionService.stopStrategyExecution(
        config.strategyId
      );
      
      if (!result) {
        throw new Error(`Failed to stop strategy execution for agent ${agentId}`);
      }
      
      // Update status
      config.status = 'stopped';
      
      // Update in database
      await this.updateAgentStrategyInDatabase(config);
      
      // Notify via WebSocket
      await this.notifyAgentStrategyEvent('stopped', agentId, config);
      
      return true;
    } catch (error) {
      console.error(`Error stopping strategy for agent ${agentId}:`, error);
      return false;
    }
  }
  
  /**
   * Pause a strategy for an agent
   */
  async pauseAgentStrategy(agentId: string): Promise<boolean> {
    try {
      // Get agent strategy configuration
      const config = this.agentStrategies.get(agentId);
      
      if (!config) {
        throw new Error(`No strategy configuration found for agent ${agentId}`);
      }
      
      // Pause the strategy execution
      const result = await this.strategyExecutionService.pauseStrategyExecution(
        config.strategyId
      );
      
      if (!result) {
        throw new Error(`Failed to pause strategy execution for agent ${agentId}`);
      }
      
      // Update status
      config.status = 'paused';
      
      // Update in database
      await this.updateAgentStrategyInDatabase(config);
      
      // Notify via WebSocket
      await this.notifyAgentStrategyEvent('paused', agentId, config);
      
      return true;
    } catch (error) {
      console.error(`Error pausing strategy for agent ${agentId}:`, error);
      return false;
    }
  }
  
  /**
   * Update a strategy configuration for an agent
   */
  async updateAgentStrategy(
    agentId: string,
    strategyParams: Partial<StrategyParams>
  ): Promise<boolean> {
    try {
      // Get agent strategy configuration
      const config = this.agentStrategies.get(agentId);
      
      if (!config) {
        throw new Error(`No strategy configuration found for agent ${agentId}`);
      }
      
      // Update parameters
      config.strategyParams = {
        ...config.strategyParams,
        ...strategyParams,
        id: config.strategyId, // Ensure ID remains the same
      };
      
      // If the strategy is active, we need to restart it with the new parameters
      const wasActive = config.status === 'active';
      
      if (wasActive) {
        // Stop the existing execution
        await this.strategyExecutionService.stopStrategyExecution(
          config.strategyId
        );
      }
      
      // Update in database
      await this.updateAgentStrategyInDatabase(config);
      
      // Restart if it was active
      if (wasActive) {
        await this.startAgentStrategy(
          agentId,
          config.strategyId,
          config.strategyParams,
          config.userId
        );
      }
      
      // Notify via WebSocket
      await this.notifyAgentStrategyEvent('updated', agentId, config);
      
      return true;
    } catch (error) {
      console.error(`Error updating strategy for agent ${agentId}:`, error);
      return false;
    }
  }
  
  /**
   * Get strategy execution status for an agent
   */
  async getAgentStrategyStatus(agentId: string): Promise<{
    config: AgentStrategyConfig | null;
    execution: StrategyExecution | null;
  }> {
    try {
      // Get agent strategy configuration
      const config = this.agentStrategies.get(agentId) || null;
      
      if (!config) {
        return { config: null, execution: null };
      }
      
      // Get strategy execution
      const execution = this.strategyExecutionService.getStrategyExecution(
        config.strategyId
      );
      
      return { config, execution };
    } catch (error) {
      console.error(`Error getting strategy status for agent ${agentId}:`, error);
      return { config: null, execution: null };
    }
  }
  
  /**
   * Optimize strategy parameters using AI and market data
   */
  async optimizeAgentStrategy(
    agentId: string,
    optimizationCriteria: Record<string, any>
  ): Promise<StrategyParams | null> {
    try {
      // Get agent strategy configuration
      const config = this.agentStrategies.get(agentId);
      
      if (!config) {
        throw new Error(`No strategy configuration found for agent ${agentId}`);
      }
      
      // In a real implementation, this would use machine learning optimization
      // For now, we'll implement a simple adaptive algorithm
      
      // 1. Get market data for symbols in the strategy
      const symbols = config.strategyParams.symbols;
      const timeframe = config.strategyParams.timeframe;
      
      const marketDataPromises = symbols.map(symbol => 
        this.marketDataService.getCandles(symbol, timeframe, 200)
      );
      
      const marketDataResults = await Promise.all(marketDataPromises);
      
      // 2. Analyze market conditions
      const marketConditions = this.analyzeMarketConditions(marketDataResults);
      
      // 3. Query knowledge base for optimization insights
      const knowledgeQuery = `optimizing trading strategy for ${marketConditions.regime} market conditions`;
      const knowledgeResults = await knowledgeService.searchKnowledge(knowledgeQuery);
      
      // 4. Generate optimized parameters based on market conditions and knowledge
      const optimizedParams = this.generateOptimizedParameters(
        config.strategyParams,
        marketConditions,
        knowledgeResults.success ? knowledgeResults.data : [],
        optimizationCriteria
      );
      
      // 5. Update agent strategy with optimized parameters
      await this.updateAgentStrategy(agentId, optimizedParams);
      
      // 6. Notify optimization event
      await this.notifyAgentStrategyEvent('optimized', agentId, {
        ...config,
        strategyParams: optimizedParams,
        metadata: {
          ...config.metadata,
          lastOptimization: {
            timestamp: new Date().toISOString(),
            marketConditions,
            criteria: optimizationCriteria
          }
        }
      });
      
      return optimizedParams;
    } catch (error) {
      console.error(`Error optimizing strategy for agent ${agentId}:`, error);
      return null;
    }
  }
  
  /**
   * Register all available strategies
   */
  private registerAvailableStrategies(): void {
    // Register AI Adaptive Strategy
    const aiAdaptiveStrategy = new AIAdaptiveStrategy();
    this.strategies.set(aiAdaptiveStrategy.getId(), aiAdaptiveStrategy);
    
    // In a real implementation, would register additional strategies here
  }
  
  /**
   * Load agent strategy configurations from database
   */
  private async loadAgentStrategies(): Promise<void> {
    try {
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('elizaos_agent_strategies')
        .select('*');
      
      if (error) {
        console.error('Error loading agent strategies from database:', error);
        return;
      }
      
      // Clear existing map
      this.agentStrategies.clear();
      
      // Convert to AgentStrategyConfig objects
      for (const record of data) {
        this.agentStrategies.set(record.agent_id, {
          agentId: record.agent_id,
          farmId: record.farm_id,
          strategyId: record.strategy_id,
          strategyParams: record.strategy_params,
          userId: record.user_id,
          status: record.status as StrategyStatus,
          metadata: record.metadata
        });
      }
    } catch (error) {
      console.error('Error loading agent strategies from database:', error);
    }
  }
  
  /**
   * Save agent strategy configuration to database
   */
  private async saveAgentStrategyToDatabase(
    config: AgentStrategyConfig
  ): Promise<void> {
    try {
      const supabase = createServerClient();
      
      const { error } = await supabase
        .from('elizaos_agent_strategies')
        .insert([{
          agent_id: config.agentId,
          farm_id: config.farmId,
          strategy_id: config.strategyId,
          strategy_params: config.strategyParams,
          user_id: config.userId,
          status: config.status,
          metadata: config.metadata
        }]);
      
      if (error) {
        console.error('Error saving agent strategy to database:', error);
      }
    } catch (error) {
      console.error('Error saving agent strategy to database:', error);
    }
  }
  
  /**
   * Update agent strategy configuration in database
   */
  private async updateAgentStrategyInDatabase(
    config: AgentStrategyConfig
  ): Promise<void> {
    try {
      const supabase = createServerClient();
      
      const { error } = await supabase
        .from('elizaos_agent_strategies')
        .update({
          strategy_params: config.strategyParams,
          status: config.status,
          metadata: config.metadata
        })
        .eq('agent_id', config.agentId);
      
      if (error) {
        console.error('Error updating agent strategy in database:', error);
      }
    } catch (error) {
      console.error('Error updating agent strategy in database:', error);
    }
  }
  
  /**
   * Send a WebSocket notification for an agent strategy event
   */
  private async notifyAgentStrategyEvent(
    event: 'registered' | 'started' | 'stopped' | 'paused' | 'updated' | 'optimized',
    agentId: string,
    config: AgentStrategyConfig
  ): Promise<void> {
    try {
      // Notify on agent and farm channels
      const agentChannel = `agent-${agentId}`;
      const farmChannel = `farm-${config.farmId}`;
      
      const payload = {
        event,
        agentId,
        farmId: config.farmId,
        strategyId: config.strategyId,
        status: config.status,
        timestamp: new Date().toISOString()
      };
      
      await pusherServer.trigger(agentChannel, 'AGENT_STRATEGY_EVENT', payload);
      await pusherServer.trigger(farmChannel, 'AGENT_STRATEGY_EVENT', payload);
      
      // Also notify the user channel
      const userChannel = `user-${config.userId}`;
      await pusherServer.trigger(userChannel, 'AGENT_STRATEGY_EVENT', payload);
    } catch (error) {
      console.error('Error sending WebSocket notification for agent strategy event:', error);
    }
  }
  
  /**
   * Analyze market conditions based on recent market data
   */
  private analyzeMarketConditions(
    marketDataList: any[]
  ): { 
    regime: 'trending' | 'ranging' | 'volatile';
    trend: 'bullish' | 'bearish' | 'neutral';
    volatility: number;
    volume: number;
  } {
    // Simple market regime detection based on volatility and directional movement
    
    // Default result
    const result = {
      regime: 'ranging' as 'trending' | 'ranging' | 'volatile',
      trend: 'neutral' as 'bullish' | 'bearish' | 'neutral',
      volatility: 0,
      volume: 0
    };
    
    if (marketDataList.length === 0 || !marketDataList[0].length) {
      return result;
    }
    
    // Use the first symbol for analysis (in a real implementation would use correlation)
    const candles = marketDataList[0];
    
    // Need at least 20 candles for analysis
    if (candles.length < 20) {
      return result;
    }
    
    // Calculate volatility (average true range)
    let sumATR = 0;
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      sumATR += tr;
    }
    
    const avgATR = sumATR / (candles.length - 1);
    const normalizedATR = avgATR / candles[candles.length - 1].close;
    
    // Calculate trend strength
    const startPrice = candles[0].close;
    const endPrice = candles[candles.length - 1].close;
    const priceChange = endPrice - startPrice;
    const percentChange = priceChange / startPrice;
    
    // Average volume
    const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
    
    // Determine market regime
    if (normalizedATR > 0.03) {
      result.regime = 'volatile';
    } else if (Math.abs(percentChange) > 0.05) {
      result.regime = 'trending';
    } else {
      result.regime = 'ranging';
    }
    
    // Determine trend direction
    if (percentChange > 0.02) {
      result.trend = 'bullish';
    } else if (percentChange < -0.02) {
      result.trend = 'bearish';
    } else {
      result.trend = 'neutral';
    }
    
    result.volatility = normalizedATR;
    result.volume = avgVolume;
    
    return result;
  }
  
  /**
   * Generate optimized strategy parameters based on market conditions and knowledge
   */
  private generateOptimizedParameters(
    currentParams: StrategyParams,
    marketConditions: ReturnType<typeof this.analyzeMarketConditions>,
    knowledgeResults: any[],
    optimizationCriteria: Record<string, any>
  ): StrategyParams {
    // Clone the current parameters
    const optimizedParams: StrategyParams = JSON.parse(JSON.stringify(currentParams));
    
    // Adjust parameters based on market conditions
    if (marketConditions.regime === 'trending') {
      // In trending markets, favor trend-following indicators
      if (optimizedParams.parameters.indicatorWeights) {
        optimizedParams.parameters.indicatorWeights.trend = 0.5;
        optimizedParams.parameters.indicatorWeights.momentum = 0.3;
        optimizedParams.parameters.indicatorWeights.volatility = 0.1;
        optimizedParams.parameters.indicatorWeights.volume = 0.1;
      }
      
      // Adjust risk/reward for trending market
      optimizedParams.risk.takeProfitPercent = 5;
      optimizedParams.risk.stopLossPercent = 2;
    } else if (marketConditions.regime === 'ranging') {
      // In ranging markets, favor mean reversion indicators
      if (optimizedParams.parameters.indicatorWeights) {
        optimizedParams.parameters.indicatorWeights.trend = 0.2;
        optimizedParams.parameters.indicatorWeights.momentum = 0.2;
        optimizedParams.parameters.indicatorWeights.volatility = 0.4;
        optimizedParams.parameters.indicatorWeights.volume = 0.2;
      }
      
      // Tighter risk/reward for ranging market
      optimizedParams.risk.takeProfitPercent = 3;
      optimizedParams.risk.stopLossPercent = 2;
    } else if (marketConditions.regime === 'volatile') {
      // In volatile markets, be more conservative
      if (optimizedParams.parameters.indicatorWeights) {
        optimizedParams.parameters.indicatorWeights.trend = 0.1;
        optimizedParams.parameters.indicatorWeights.momentum = 0.2;
        optimizedParams.parameters.indicatorWeights.volatility = 0.5;
        optimizedParams.parameters.indicatorWeights.volume = 0.2;
      }
      
      // Wider stops for volatile market, smaller position size
      optimizedParams.risk.stopLossPercent = 4;
      optimizedParams.risk.takeProfitPercent = 6;
      optimizedParams.risk.maxPositionSize = 
        Math.max(1, optimizedParams.risk.maxPositionSize * 0.8);
    }
    
    // Apply user-specified optimization criteria
    if (optimizationCriteria.riskTolerance === 'high') {
      optimizedParams.risk.maxPositionSize *= 1.2;
      optimizedParams.risk.maxDrawdown *= 1.2;
    } else if (optimizationCriteria.riskTolerance === 'low') {
      optimizedParams.risk.maxPositionSize *= 0.8;
      optimizedParams.risk.maxDrawdown *= 0.8;
    }
    
    // Apply knowledge insights (in a real implementation, this would be more sophisticated)
    if (knowledgeResults.length > 0) {
      // Just a placeholder - in a real implementation, would parse knowledge content
      // and apply specific settings
      optimizedParams.metadata = {
        ...optimizedParams.metadata,
        knowledgeApplied: true,
        knowledgeTimestamp: new Date().toISOString()
      };
    }
    
    return optimizedParams;
  }
}
