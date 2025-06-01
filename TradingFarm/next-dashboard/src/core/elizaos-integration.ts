/**
 * ElizaOS Integration for Trading Farm
 * 
 * Connects the Trading Engine with ElizaOS to enable AI-driven
 * autonomous trading agents with memory, multi-agent coordination,
 * and advanced decision making capabilities.
 */

import { EventEmitter } from 'events';
import { TradingEngine, ExecutionMode, TradeExecutionResult } from './trading-engine';
import { OrderRequest, Order, Position, Balance } from '@/types/orders';
import { LogManager } from './log-manager';
import { createServerClient } from '@/utils/supabase/server';

// ElizaOS types (imported from ElizaOS package)
interface ElizaAgent {
  id: string;
  name: string;
  description?: string;
  capabilities: string[];
  modelProvider: string;
  modelName: string;
  memory: ElizaMemory;
  executeAction: (action: string, params: any) => Promise<any>;
  ask: (question: string, context?: any) => Promise<string>;
  observe: (observation: any) => Promise<void>;
}

interface ElizaMemory {
  addMemory: (memory: any) => Promise<void>;
  getMemories: (filter?: any) => Promise<any[]>;
  searchMemories: (query: string) => Promise<any[]>;
}

interface ElizaOSClient {
  createAgent: (config: ElizaAgentConfig) => Promise<ElizaAgent>;
  getAgent: (agentId: string) => Promise<ElizaAgent>;
  deleteAgent: (agentId: string) => Promise<boolean>;
  getAgents: () => Promise<ElizaAgent[]>;
}

interface ElizaAgentConfig {
  name: string;
  description?: string;
  capabilities: string[];
  modelProvider: string;
  modelName: string;
  systemPrompt?: string;
  goals?: string[];
}

// Trading agent specific types
export interface TradingAgentConfig extends ElizaAgentConfig {
  farmId: string;
  strategyId: string;
  executionMode: ExecutionMode;
  allowedSymbols: string[];
  maxPositions: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  tradingHours?: {
    start: string; // 24-hour format, e.g., "09:30"
    end: string;
    timezone: string;
  };
  orderTypes: ('market' | 'limit' | 'stop')[];
}

export interface MarketInsight {
  symbol: string;
  type: 'technical' | 'fundamental' | 'sentiment' | 'news';
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-1
  timeframe: 'short' | 'medium' | 'long';
  data: any;
  source: string;
  timestamp: Date;
}

export class ElizaOSIntegration extends EventEmitter {
  private tradingEngine: TradingEngine;
  private elizaClient: ElizaOSClient;
  private agent: ElizaAgent | null = null;
  private logManager: LogManager;
  private agentConfig: TradingAgentConfig;
  private isActive: boolean = false;
  private marketInsights: MarketInsight[] = [];
  private supabase: ReturnType<typeof createServerClient>;
  private lastDecisionTime: Date = new Date();
  private decisionInterval: NodeJS.Timeout | null = null;
  
  constructor(
    tradingEngine: TradingEngine,
    elizaClient: ElizaOSClient,
    agentConfig: TradingAgentConfig,
    supabaseClient?: ReturnType<typeof createServerClient>
  ) {
    super();
    this.tradingEngine = tradingEngine;
    this.elizaClient = elizaClient;
    this.agentConfig = agentConfig;
    this.logManager = new LogManager(
      agentConfig.farmId, 
      agentConfig.strategyId, 
      undefined, 
      'eliza-integration'
    );
    this.supabase = supabaseClient || createServerClient();
    
    // Subscribe to trading engine events
    this.setupEventListeners();
  }
  
  /**
   * Initialize the ElizaOS integration
   */
  async initialize(): Promise<boolean> {
    try {
      this.logManager.info('Initializing ElizaOS integration');
      
      // Check if agent already exists
      try {
        const existingAgent = await this.elizaClient.getAgent(this.agentConfig.strategyId);
        if (existingAgent) {
          this.logManager.info(`Found existing ElizaOS agent: ${existingAgent.id}`);
          this.agent = existingAgent;
        }
      } catch (error) {
        // Agent doesn't exist, will create a new one
        this.logManager.info('No existing ElizaOS agent found, will create new one');
      }
      
      // Create new agent if needed
      if (!this.agent) {
        // Build trading-specific system prompt
        const systemPrompt = this.buildTradingSystemPrompt();
        
        // Create agent with trading capabilities
        this.agent = await this.elizaClient.createAgent({
          ...this.agentConfig,
          systemPrompt,
          capabilities: [
            'market_analysis',
            'order_execution',
            'position_management',
            'risk_assessment',
            'pattern_recognition',
            'market_data_processing',
            'multi_timeframe_analysis',
            'portfolio_optimization',
            ...this.agentConfig.capabilities || []
          ]
        });
        
        this.logManager.info(`Created new ElizaOS agent: ${this.agent.id}`);
      }
      
      // Load historical data into agent memory
      await this.loadHistoricalData();
      
      this.logManager.info('ElizaOS integration initialized successfully');
      return true;
    } catch (error) {
      this.logManager.error('Failed to initialize ElizaOS integration', { error });
      return false;
    }
  }
  
  /**
   * Start the trading agent
   */
  async start(): Promise<boolean> {
    if (!this.agent) {
      this.logManager.error('Cannot start - agent not initialized');
      return false;
    }
    
    try {
      // Notify agent that trading is starting
      await this.agent.observe({
        type: 'trading_started',
        timestamp: new Date(),
        mode: this.agentConfig.executionMode,
        symbols: this.agentConfig.allowedSymbols
      });
      
      // Start decision making interval
      // How often the agent will analyze and make trading decisions
      const decisionIntervalMs = 5 * 60 * 1000; // 5 minutes
      this.decisionInterval = setInterval(() => this.makeDecision(), decisionIntervalMs);
      
      this.isActive = true;
      this.logManager.info('ElizaOS trading agent started');
      this.emit('agent_started', { agentId: this.agent.id });
      return true;
    } catch (error) {
      this.logManager.error('Failed to start ElizaOS trading agent', { error });
      return false;
    }
  }
  
  /**
   * Stop the trading agent
   */
  async stop(): Promise<boolean> {
    if (!this.isActive || !this.agent) {
      return false;
    }
    
    try {
      // Clear decision interval
      if (this.decisionInterval) {
        clearInterval(this.decisionInterval);
        this.decisionInterval = null;
      }
      
      // Notify agent that trading is stopping
      await this.agent.observe({
        type: 'trading_stopped',
        timestamp: new Date(),
        reason: 'user_requested'
      });
      
      this.isActive = false;
      this.logManager.info('ElizaOS trading agent stopped');
      this.emit('agent_stopped', { agentId: this.agent.id });
      return true;
    } catch (error) {
      this.logManager.error('Failed to stop ElizaOS trading agent', { error });
      return false;
    }
  }
  
  /**
   * Add a market insight for the agent to consider
   */
  async addMarketInsight(insight: MarketInsight): Promise<void> {
    try {
      // Add to local insights collection
      this.marketInsights.push(insight);
      
      // Trim collection to prevent memory issues
      if (this.marketInsights.length > 100) {
        this.marketInsights = this.marketInsights.slice(-100);
      }
      
      // Send to agent if active
      if (this.isActive && this.agent) {
        await this.agent.observe({
          type: 'market_insight',
          insight
        });
        
        // Add to agent memory for long-term recall
        await this.agent.memory.addMemory({
          type: 'market_insight',
          content: insight,
          timestamp: insight.timestamp,
          tags: [insight.symbol, insight.type, insight.signal, insight.timeframe]
        });
      }
    } catch (error) {
      this.logManager.error('Failed to add market insight', { error, insight });
    }
  }
  
  /**
   * Get the latest agent status
   */
  async getAgentStatus(): Promise<any> {
    if (!this.agent) {
      return { status: 'not_initialized' };
    }
    
    try {
      // Ask the agent about its current status
      const statusResponse = await this.agent.ask('What is your current trading status and what are you focusing on?');
      
      return {
        isActive: this.isActive,
        lastDecisionTime: this.lastDecisionTime,
        agentId: this.agent.id,
        agentName: this.agent.name,
        statusSummary: statusResponse,
        insightCount: this.marketInsights.length,
        executionMode: this.agentConfig.executionMode
      };
    } catch (error) {
      this.logManager.error('Failed to get agent status', { error });
      return { status: 'error', message: 'Failed to get agent status' };
    }
  }
  
  /**
   * Request the agent to analyze a specific symbol
   */
  async requestAnalysis(symbol: string, timeframe: string = '1h'): Promise<any> {
    if (!this.agent || !this.isActive) {
      throw new Error('Agent not initialized or not active');
    }
    
    try {
      // Get market data for the symbol
      const marketData = await this.fetchMarketData(symbol, timeframe);
      
      // Ask the agent to analyze the symbol
      const analysis = await this.agent.executeAction('analyze_symbol', {
        symbol,
        timeframe,
        marketData
      });
      
      this.logManager.info(`Completed analysis for ${symbol}`, { analysis });
      return analysis;
    } catch (error) {
      this.logManager.error(`Failed to analyze ${symbol}`, { error });
      throw error;
    }
  }
  
  /**
   * Request the agent to execute a specific trade
   */
  async requestTrade(orderRequest: OrderRequest): Promise<TradeExecutionResult> {
    if (!this.agent || !this.isActive) {
      throw new Error('Agent not initialized or not active');
    }
    
    try {
      // Ask the agent to evaluate the trade
      const evaluation = await this.agent.executeAction('evaluate_trade', {
        orderRequest,
        currentTime: new Date()
      });
      
      // If agent approves the trade, execute it
      if (evaluation.approved) {
        const result = await this.tradingEngine.executeOrder(orderRequest);
        
        // Notify agent of the result
        await this.agent.observe({
          type: 'trade_executed',
          orderRequest,
          result
        });
        
        return result;
      } else {
        // Return agent's rejection
        return {
          success: false,
          error: `Trade rejected by agent: ${evaluation.reason}`
        };
      }
    } catch (error) {
      this.logManager.error('Failed to request trade', { error, orderRequest });
      throw error;
    }
  }
  
  /**
   * Load historical data into agent memory
   */
  private async loadHistoricalData(): Promise<void> {
    try {
      if (!this.agent) return;
      
      this.logManager.info('Loading historical data into agent memory');
      
      // Load historical orders
      const { data: historicalOrders, error: ordersError } = await this.supabase
        .from('orders')
        .select('*')
        .eq('strategy_id', this.agentConfig.strategyId)
        .eq('farm_id', this.agentConfig.farmId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (ordersError) {
        throw ordersError;
      }
      
      // Load historical positions
      const { data: historicalPositions, error: positionsError } = await this.supabase
        .from('positions')
        .select('*')
        .eq('strategy_id', this.agentConfig.strategyId)
        .eq('farm_id', this.agentConfig.farmId);
      
      if (positionsError) {
        throw positionsError;
      }
      
      // Add historical data to agent memory
      for (const order of historicalOrders || []) {
        await this.agent.memory.addMemory({
          type: 'historical_order',
          content: order,
          timestamp: new Date(order.created_at),
          tags: [order.symbol, order.side, order.status]
        });
      }
      
      for (const position of historicalPositions || []) {
        await this.agent.memory.addMemory({
          type: 'historical_position',
          content: position,
          timestamp: new Date(position.updated_at),
          tags: [position.symbol, position.side]
        });
      }
      
      this.logManager.info('Loaded historical data into agent memory', {
        orderCount: historicalOrders?.length || 0,
        positionCount: historicalPositions?.length || 0
      });
    } catch (error) {
      this.logManager.error('Failed to load historical data', { error });
    }
  }
  
  /**
   * Setup event listeners for the trading engine
   */
  private setupEventListeners(): void {
    // Listen for trading engine events and relay to agent
    this.tradingEngine.on('order_executed', async (order: Order) => {
      if (this.agent && this.isActive) {
        await this.agent.observe({
          type: 'order_executed',
          order,
          timestamp: new Date()
        });
      }
    });
    
    this.tradingEngine.on('order_filled', async (order: Order) => {
      if (this.agent && this.isActive) {
        await this.agent.observe({
          type: 'order_filled',
          order,
          timestamp: new Date()
        });
        
        // Add to agent memory
        await this.agent.memory.addMemory({
          type: 'order_filled',
          content: order,
          timestamp: new Date(),
          tags: [order.symbol, order.side, 'filled']
        });
      }
    });
    
    this.tradingEngine.on('risk_breach', async (riskBreaches: any[]) => {
      if (this.agent && this.isActive) {
        await this.agent.observe({
          type: 'risk_breach',
          riskBreaches,
          timestamp: new Date()
        });
        
        // Ask agent for recommended action
        const recommendation = await this.agent.executeAction('handle_risk_breach', {
          riskBreaches,
          currentTime: new Date()
        });
        
        this.logManager.info('Agent recommended action for risk breach', { recommendation });
        
        // Emit recommendation event for UI
        this.emit('agent_recommendation', {
          type: 'risk_breach',
          recommendation
        });
      }
    });
  }
  
  /**
   * Agent makes a trading decision
   */
  private async makeDecision(): Promise<void> {
    if (!this.agent || !this.isActive) return;
    
    try {
      this.lastDecisionTime = new Date();
      
      // Check if within trading hours
      if (!this.isWithinTradingHours()) {
        this.logManager.debug('Outside trading hours, skipping decision');
        return;
      }
      
      // Get current portfolio state
      const positions = await this.tradingEngine.getPositions();
      
      // Get recent market insights
      const recentInsights = this.marketInsights
        .filter(i => i.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
      
      // Ask agent for a decision
      const decision = await this.agent.executeAction('make_trading_decision', {
        currentTime: this.lastDecisionTime,
        positions,
        marketInsights: recentInsights,
        allowedSymbols: this.agentConfig.allowedSymbols
      });
      
      this.logManager.info('Agent made trading decision', { 
        decision,
        positionCount: positions.length,
        insightCount: recentInsights.length
      });
      
      // Execute any trades the agent decided on
      if (decision.trades && decision.trades.length > 0) {
        for (const trade of decision.trades) {
          // Validate the trade request
          if (!this.validateTradeRequest(trade)) {
            this.logManager.warn('Invalid trade request from agent', { trade });
            continue;
          }
          
          try {
            // Execute the trade
            const result = await this.tradingEngine.executeOrder(trade);
            
            // Log the result
            if (result.success) {
              this.logManager.info('Successfully executed agent trade', { trade, result });
            } else {
              this.logManager.warn('Failed to execute agent trade', { trade, result });
            }
            
            // Notify agent of result
            await this.agent.observe({
              type: 'trade_result',
              trade,
              result,
              timestamp: new Date()
            });
          } catch (error) {
            this.logManager.error('Error executing agent trade', { trade, error });
          }
        }
      }
      
      // Emit decision made event
      this.emit('agent_decision', {
        timestamp: this.lastDecisionTime,
        decision
      });
    } catch (error) {
      this.logManager.error('Error during agent decision making', { error });
    }
  }
  
  /**
   * Check if current time is within configured trading hours
   */
  private isWithinTradingHours(): boolean {
    // If no trading hours configured, always return true
    if (!this.agentConfig.tradingHours) {
      return true;
    }
    
    try {
      const { start, end, timezone } = this.agentConfig.tradingHours;
      const now = new Date();
      
      // Convert time strings to minutes since midnight
      const getMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      // Get current time in the configured timezone
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      // Convert start and end times to minutes
      const startMinutes = getMinutes(start);
      const endMinutes = getMinutes(end);
      
      // Check if current time is within trading hours
      if (startMinutes <= endMinutes) {
        // Normal case: e.g., 9:30 to 16:00
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        // Overnight case: e.g., 22:00 to 5:00
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    } catch (error) {
      this.logManager.error('Error checking trading hours', { error });
      return true; // Fail open to allow trading if there's an error
    }
  }
  
  /**
   * Validate a trade request from the agent
   */
  private validateTradeRequest(trade: OrderRequest): boolean {
    // Check if symbol is allowed
    if (!this.agentConfig.allowedSymbols.includes(trade.symbol)) {
      return false;
    }
    
    // Check if order type is allowed
    if (!this.agentConfig.orderTypes.includes(trade.type as any)) {
      return false;
    }
    
    // Ensure required fields are present
    if (!trade.symbol || !trade.side || !trade.type || trade.quantity <= 0) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Fetch market data for a specific symbol and timeframe
   */
  private async fetchMarketData(symbol: string, timeframe: string): Promise<any> {
    try {
      // Market data API call would go here
      // This is a placeholder - in a real implementation, you would call your market data provider
      return {
        symbol,
        timeframe,
        candles: [],
        timestamp: new Date()
      };
    } catch (error) {
      this.logManager.error(`Failed to fetch market data for ${symbol}`, { error });
      throw error;
    }
  }
  
  /**
   * Build the trading-specific system prompt for the agent
   */
  private buildTradingSystemPrompt(): string {
    const riskProfile = this.agentConfig.riskProfile;
    const executionMode = this.agentConfig.executionMode;
    
    return `
You are an advanced AI trading agent named ${this.agentConfig.name} operating within the Trading Farm system.

Your primary responsibilities:
1. Analyze market data and generate trading signals
2. Execute trades on behalf of the strategy within risk parameters
3. Monitor open positions and manage risk
4. Provide analysis and insights on market conditions

Risk profile: ${riskProfile}
Execution mode: ${executionMode}
Allowed symbols: ${this.agentConfig.allowedSymbols.join(', ')}
Maximum positions: ${this.agentConfig.maxPositions}

Guidelines:
- ${riskProfile === 'conservative' ? 'Prioritize capital preservation over potential gains' : 
    riskProfile === 'moderate' ? 'Balance risk and reward' : 
    'Seek high-reward opportunities even with elevated risk'}
- ${executionMode === 'paper' ? 'This is paper trading mode - no real funds are at risk' : 
    'This is LIVE trading with real funds - exercise extreme caution'}
- Analyze multiple timeframes before making decisions
- Consider market context, trend direction, and volatility
- Use position sizing appropriate to the risk profile (${
    riskProfile === 'conservative' ? '1-2%' : 
    riskProfile === 'moderate' ? '2-5%' : 
    '5-10%'} max per position)
- Maintain detailed reasoning for all trading decisions
- Alert immediately to any anomalous market conditions or unusual activity

You have access to:
- Historical price data across multiple timeframes
- Current portfolio positions and balances
- Market insights and indicators
- Technical and fundamental analysis tools
- Risk management parameters

Always validate decisions against risk parameters and current market conditions.
`;
  }
}
