import { createServerClient } from '@/utils/supabase/server';
import { elizaOSPluginManager } from '@/utils/elizaos';
import { RedisCacheService } from '@/utils/redis/cache-service';
import { RedisPubSubService } from '@/utils/redis/pubsub-service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Trading Agent types supported by the system
 */
export enum TradingAgentType {
  MARKET_MAKER = 'market_maker',
  TREND_FOLLOWER = 'trend_follower',
  ARBITRAGE = 'arbitrage',
  PORTFOLIO_MANAGER = 'portfolio_manager',
  SIGNAL_GENERATOR = 'signal_generator',
  RISK_MANAGER = 'risk_manager',
}

/**
 * Trading Agent status
 */
export enum TradingAgentStatus {
  CREATED = 'created',
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ERROR = 'error',
  TERMINATED = 'terminated',
}

/**
 * Exchange types supported by trading agents
 */
export enum SupportedExchange {
  BINANCE = 'binance',
  BYBIT = 'bybit',
  HYPERLIQUID = 'hyperliquid',
}

/**
 * Trading Agent configuration interface
 */
export interface TradingAgentConfig {
  name: string;
  description?: string;
  agentType: TradingAgentType;
  exchanges: SupportedExchange[];
  tradingPairs: string[]; // e.g. ["BTC-USDT", "ETH-USDT"]
  riskParameters: {
    maxPositionSize: number;
    maxDrawdown: number;
    maxOrdersPerInterval: number;
    orderIntervalSeconds: number;
  };
  tradingParameters: Record<string, any>;
  modelProvider?: string; // e.g. "openai", "anthropic"
  modelId?: string; // e.g. "gpt-4o"
  isPaperTrading: boolean;
}

/**
 * Trading Agent interface
 */
export interface TradingAgent {
  id: string;
  agentId: string; // ElizaOS agent ID
  userId: string;
  config: TradingAgentConfig;
  status: TradingAgentStatus;
  metrics?: {
    totalTrades: number;
    winRate: number;
    pnl: number;
    lastActive: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Trading Agent Service
 * Manages the lifecycle and operations of trading agents using ElizaOS
 */
export class TradingAgentService {
  private cacheService: RedisCacheService;
  private pubSubService: RedisPubSubService;
  
  constructor() {
    this.cacheService = new RedisCacheService();
    this.pubSubService = new RedisPubSubService();
  }
  
  /**
   * Create a new trading agent
   */
  async createAgent(userId: string, config: TradingAgentConfig): Promise<TradingAgent> {
    // Initialize ElizaOS plugins if not already
    await elizaOSPluginManager.initialize();
    
    // Generate a unique ID for the agent
    const id = uuidv4();
    
    // Create agent in Supabase
    const supabase = await createServerClient();
    
    // Define agent capabilities based on type
    const capabilities = this.getAgentCapabilities(config.agentType);
    
    // Create agent record in database
    const { data, error } = await supabase
      .from('trading_agents')
      .insert({
        id,
        user_id: userId,
        name: config.name,
        description: config.description || `${config.agentType} agent for ${config.tradingPairs.join(', ')}`,
        agent_type: config.agentType,
        exchanges: config.exchanges,
        trading_pairs: config.tradingPairs,
        risk_parameters: config.riskParameters,
        trading_parameters: config.tradingParameters,
        model_provider: config.modelProvider || 'openai',
        model_id: config.modelId || 'gpt-4o',
        is_paper_trading: config.isPaperTrading,
        status: TradingAgentStatus.CREATED,
        capabilities
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create trading agent: ${error.message}`);
    }
    
    // Initialize the agent with ElizaOS
    // Note: In a real implementation, this would communicate with the ElizaOS API
    // For now, we're just simulating the agent creation
    
    const agent: TradingAgent = {
      id: data.id,
      agentId: `elizaos_agent_${data.id}`, // This would be returned from ElizaOS API in a real implementation
      userId: data.user_id,
      config: {
        name: data.name,
        description: data.description,
        agentType: data.agent_type as TradingAgentType,
        exchanges: data.exchanges as SupportedExchange[],
        tradingPairs: data.trading_pairs,
        riskParameters: data.risk_parameters,
        tradingParameters: data.trading_parameters,
        modelProvider: data.model_provider,
        modelId: data.model_id,
        isPaperTrading: data.is_paper_trading
      },
      status: data.status as TradingAgentStatus,
      metrics: {
        totalTrades: 0,
        winRate: 0,
        pnl: 0,
        lastActive: new Date()
      },
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
    
    // Store agent initial state in Redis cache for quick access
    await this.cacheService.set('AGENT_STATE', agent.id, JSON.stringify(agent));
    
    // Publish agent creation event
    await this.pubSubService.publish('AGENT_EVENTS', 'agent_created', {
      agentId: agent.id,
      userId: agent.userId,
      timestamp: new Date().toISOString()
    });
    
    return agent;
  }
  
  /**
   * Get agent capabilities based on agent type
   */
  private getAgentCapabilities(agentType: TradingAgentType): string[] {
    const baseCapabilities = ['market_data_access', 'technical_analysis'];
    
    switch (agentType) {
      case TradingAgentType.MARKET_MAKER:
        return [...baseCapabilities, 'order_book_analysis', 'spread_management', 'inventory_management'];
      
      case TradingAgentType.TREND_FOLLOWER:
        return [...baseCapabilities, 'trend_detection', 'momentum_analysis', 'breakout_detection'];
      
      case TradingAgentType.ARBITRAGE:
        return [...baseCapabilities, 'multi_exchange_analysis', 'price_comparison', 'latency_optimization'];
      
      case TradingAgentType.PORTFOLIO_MANAGER:
        return [...baseCapabilities, 'portfolio_allocation', 'risk_management', 'rebalancing'];
      
      case TradingAgentType.SIGNAL_GENERATOR:
        return [...baseCapabilities, 'pattern_recognition', 'alert_generation', 'multi_timeframe_analysis'];
      
      case TradingAgentType.RISK_MANAGER:
        return [...baseCapabilities, 'position_monitoring', 'drawdown_protection', 'exposure_management'];
      
      default:
        return baseCapabilities;
    }
  }
  
  /**
   * Get a trading agent by ID
   */
  async getAgentById(agentId: string): Promise<TradingAgent | null> {
    // Try to get from cache first
    const cachedAgent = await this.cacheService.get('AGENT_STATE', agentId);
    
    if (cachedAgent) {
      return JSON.parse(cachedAgent);
    }
    
    // Fallback to database
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('trading_agents')
      .select('*')
      .eq('id', agentId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    const agent: TradingAgent = {
      id: data.id,
      agentId: `elizaos_agent_${data.id}`,
      userId: data.user_id,
      config: {
        name: data.name,
        description: data.description,
        agentType: data.agent_type as TradingAgentType,
        exchanges: data.exchanges as SupportedExchange[],
        tradingPairs: data.trading_pairs,
        riskParameters: data.risk_parameters,
        tradingParameters: data.trading_parameters,
        modelProvider: data.model_provider,
        modelId: data.model_id,
        isPaperTrading: data.is_paper_trading
      },
      status: data.status as TradingAgentStatus,
      metrics: data.metrics,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
    
    // Cache the agent data
    await this.cacheService.set('AGENT_STATE', agent.id, JSON.stringify(agent));
    
    return agent;
  }
  
  /**
   * Activate a trading agent
   */
  async activateAgent(agentId: string): Promise<TradingAgent> {
    const agent = await this.getAgentById(agentId);
    
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Update the agent status in the database
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('trading_agents')
      .update({
        status: TradingAgentStatus.ACTIVE,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to activate agent: ${error.message}`);
    }
    
    // Update the agent in our object
    agent.status = TradingAgentStatus.ACTIVE;
    agent.updatedAt = new Date();
    
    // Update the cache
    await this.cacheService.set('AGENT_STATE', agent.id, JSON.stringify(agent));
    
    // Publish agent activation event
    await this.pubSubService.publish('AGENT_EVENTS', 'agent_activated', {
      agentId: agent.id,
      userId: agent.userId,
      timestamp: new Date().toISOString()
    });
    
    return agent;
  }
  
  /**
   * Pause a trading agent
   */
  async pauseAgent(agentId: string): Promise<TradingAgent> {
    const agent = await this.getAgentById(agentId);
    
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Update the agent status in the database
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('trading_agents')
      .update({
        status: TradingAgentStatus.PAUSED,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to pause agent: ${error.message}`);
    }
    
    // Update the agent in our object
    agent.status = TradingAgentStatus.PAUSED;
    agent.updatedAt = new Date();
    
    // Update the cache
    await this.cacheService.set('AGENT_STATE', agent.id, JSON.stringify(agent));
    
    // Publish agent paused event
    await this.pubSubService.publish('AGENT_EVENTS', 'agent_paused', {
      agentId: agent.id,
      userId: agent.userId,
      timestamp: new Date().toISOString()
    });
    
    return agent;
  }
  
  /**
   * Delete a trading agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    const agent = await this.getAgentById(agentId);
    
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Delete the agent from the database
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('trading_agents')
      .delete()
      .eq('id', agentId);
    
    if (error) {
      throw new Error(`Failed to delete agent: ${error.message}`);
    }
    
    // Remove from cache
    await this.cacheService.delete('AGENT_STATE', agentId);
    
    // Publish agent deletion event
    await this.pubSubService.publish('AGENT_EVENTS', 'agent_deleted', {
      agentId: agent.id,
      userId: agent.userId,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Get all trading agents for a user
   */
  async getUserAgents(userId: string): Promise<TradingAgent[]> {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('trading_agents')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      throw new Error(`Failed to get user agents: ${error.message}`);
    }
    
    return data.map(item => ({
      id: item.id,
      agentId: `elizaos_agent_${item.id}`,
      userId: item.user_id,
      config: {
        name: item.name,
        description: item.description,
        agentType: item.agent_type as TradingAgentType,
        exchanges: item.exchanges as SupportedExchange[],
        tradingPairs: item.trading_pairs,
        riskParameters: item.risk_parameters,
        tradingParameters: item.trading_parameters,
        modelProvider: item.model_provider,
        modelId: item.model_id,
        isPaperTrading: item.is_paper_trading
      },
      status: item.status as TradingAgentStatus,
      metrics: item.metrics,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));
  }
}

// Export singleton instance
export const tradingAgentService = new TradingAgentService();
