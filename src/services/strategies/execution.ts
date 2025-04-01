import { EntryCondition, ExitCondition, RiskManagement, StrategyParameters } from "../../integrations/supabase/types";
import { AgentStrategy, Strategy, StrategyVersion, strategyService } from ".";

/**
 * Strategy execution context that includes market data and position state
 */
export interface ExecutionContext {
  strategyId: string;
  strategyVersion: string;
  agentId: string;
  market: string;
  timeframe: string;
  timestamp: number;
  price: number;
  volume: number;
  indicators: Record<string, any>;
  position: {
    active: boolean;
    entryPrice: number | null;
    entryTime: number | null;
    size: number | null;
    currentProfit: number | null;
    currentProfitPercent: number | null;
  };
  balances: {
    base: number;
    quote: number;
    total: number;
  };
}

/**
 * Signal returned by an execution algorithm
 */
export interface ExecutionSignal {
  action: 'buy' | 'sell' | 'hold';
  size?: number;
  price?: number;
  reason: string;
  riskScore?: number;
  confidence?: number;
  metadata?: Record<string, any>;
}

/**
 * Execution order sent to exchange or trading system
 */
export interface ExecutionOrder {
  id: string;
  strategyId: string;
  agentId: string;
  market: string;
  action: 'buy' | 'sell';
  type: 'market' | 'limit';
  size: number;
  price?: number;
  timestamp: number;
  status: 'pending' | 'active' | 'filled' | 'cancelled' | 'rejected';
  reason: string;
  metadata?: Record<string, any>;
}

/**
 * Abstract base strategy executor
 */
export abstract class StrategyExecutor {
  protected strategy: Strategy;
  protected version: StrategyVersion;
  protected config: Record<string, any>;

  constructor(strategy: Strategy, version: StrategyVersion, config: Record<string, any> = {}) {
    this.strategy = strategy;
    this.version = version;
    this.config = config;
  }

  /**
   * Process execution context and determine action
   * @param context Current execution context
   * @returns Signal indicating what action to take
   */
  abstract processContext(context: ExecutionContext): Promise<ExecutionSignal>;
}

/**
 * Default rule-based strategy executor
 */
export class RuleBasedExecutor extends StrategyExecutor {
  async processContext(context: ExecutionContext): Promise<ExecutionSignal> {
    // Extract strategy components
    const entryConditions = this.version.entry_conditions || this.strategy.entry_conditions;
    const exitConditions = this.version.exit_conditions || this.strategy.exit_conditions;
    const riskManagement = this.version.risk_management || this.strategy.risk_management;
    
    // Check if we're in a position
    if (context.position.active) {
      // Apply exit conditions
      const exitSignal = this.evaluateExitConditions(exitConditions, context, riskManagement);
      if (exitSignal) {
        return exitSignal;
      }
    } else {
      // Apply entry conditions
      const entrySignal = this.evaluateEntryConditions(entryConditions, context, riskManagement);
      if (entrySignal) {
        return entrySignal;
      }
    }

    // No action needed
    return {
      action: 'hold',
      reason: 'No entry or exit conditions met'
    };
  }

  private evaluateEntryConditions(
    conditions: EntryCondition[], 
    context: ExecutionContext,
    riskManagement: RiskManagement
  ): ExecutionSignal | null {
    // Check if any entry condition is met
    for (const condition of conditions) {
      if (this.isEntryConditionMet(condition, context)) {
        // Calculate position size based on risk management
        const size = this.calculatePositionSize(context, riskManagement);
        
        return {
          action: 'buy',
          size,
          reason: `Entry condition met: ${condition.description || condition.type}`,
          riskScore: 0.5, // Default risk score
          confidence: 0.7, // Default confidence
          metadata: {
            condition: condition.type,
            entryType: 'rule_based'
          }
        };
      }
    }
    
    return null;
  }

  private evaluateExitConditions(
    conditions: ExitCondition[], 
    context: ExecutionContext,
    riskManagement: RiskManagement
  ): ExecutionSignal | null {
    // Check stop loss first
    if (riskManagement.stopLoss && context.position.currentProfitPercent !== null && 
        context.position.currentProfitPercent <= -riskManagement.stopLoss) {
      return {
        action: 'sell',
        size: context.position.size || undefined,
        reason: `Stop loss triggered at ${riskManagement.stopLoss}%`,
        riskScore: 0.2, // Low risk for stop loss
        confidence: 0.9, // High confidence for stop loss
        metadata: {
          exitType: 'stop_loss'
        }
      };
    }
    
    // Check take profit
    if (riskManagement.takeProfit && context.position.currentProfitPercent !== null && 
        context.position.currentProfitPercent >= riskManagement.takeProfit) {
      return {
        action: 'sell',
        size: context.position.size || undefined,
        reason: `Take profit triggered at ${riskManagement.takeProfit}%`,
        riskScore: 0.3,
        confidence: 0.8,
        metadata: {
          exitType: 'take_profit'
        }
      };
    }
    
    // Check if any exit condition is met
    for (const condition of conditions) {
      if (this.isExitConditionMet(condition, context)) {
        return {
          action: 'sell',
          size: context.position.size || undefined,
          reason: `Exit condition met: ${condition.description || condition.type}`,
          riskScore: 0.4,
          confidence: 0.7,
          metadata: {
            condition: condition.type,
            exitType: 'rule_based'
          }
        };
      }
    }
    
    return null;
  }

  private isEntryConditionMet(condition: EntryCondition, context: ExecutionContext): boolean {
    switch (condition.type) {
      case 'indicator_crossover': {
        const { indicator, direction } = condition.params;
        if (indicator === 'MACD' && direction === 'bullish' && context.indicators.MACD) {
          // Simulate MACD crossover check
          const macd = context.indicators.MACD;
          return macd.crossover === 'bullish';
        }
        return false;
      }
      
      case 'indicator_threshold': {
        const { indicator, threshold, comparison } = condition.params;
        if (indicator === 'RSI' && context.indicators.RSI) {
          const rsi = context.indicators.RSI;
          if (comparison === 'below') {
            return rsi.value < threshold;
          } else if (comparison === 'above') {
            return rsi.value > threshold;
          }
        }
        return false;
      }
      
      case 'moving_average_crossover': {
        const { shortPeriod, longPeriod, direction } = condition.params;
        // Look for moving averages in indicators
        const shortMA = context.indicators[`MA${shortPeriod}`];
        const longMA = context.indicators[`MA${longPeriod}`];
        
        if (shortMA && longMA && direction === 'bullish') {
          return shortMA.value > longMA.value && 
                 // Check if it's a recent crossover (previous value was below)
                 shortMA.previous < longMA.previous;
        }
        return false;
      }
      
      case 'price_action': {
        // Simplified pattern recognition
        const { pattern } = condition.params;
        if (pattern === 'bullish_reversal') {
          // Basic logic: price is higher than N periods ago after a downtrend
          return context.indicators.priceAction?.bullishReversal || false;
        }
        return false;
      }
      
      default:
        return false;
    }
  }

  private isExitConditionMet(condition: ExitCondition, context: ExecutionContext): boolean {
    switch (condition.type) {
      case 'price_target': {
        const { targetType, value } = condition.params;
        if (targetType === 'percent' && context.position.currentProfitPercent !== null) {
          return context.position.currentProfitPercent >= value;
        }
        return false;
      }
      
      case 'stop_loss': {
        const { stopType, value } = condition.params;
        if (stopType === 'percent' && context.position.currentProfitPercent !== null) {
          return context.position.currentProfitPercent <= -value;
        }
        return false;
      }
      
      case 'trailing_stop': {
        // Trailing stop implementation would track highest price since entry
        const { distance, unit } = condition.params;
        const trailingStopData = context.indicators.trailingStop;
        if (trailingStopData && unit === 'percent') {
          return trailingStopData.triggered;
        }
        return false;
      }
      
      case 'time_based': {
        const { timeframe, periods } = condition.params;
        if (context.position.entryTime) {
          const timeElapsed = context.timestamp - context.position.entryTime;
          
          // Convert periods to milliseconds based on timeframe
          let timeframeMs = 0;
          switch (timeframe) {
            case '1m': timeframeMs = 60 * 1000; break;
            case '5m': timeframeMs = 5 * 60 * 1000; break;
            case '15m': timeframeMs = 15 * 60 * 1000; break;
            case '30m': timeframeMs = 30 * 60 * 1000; break;
            case '1h': timeframeMs = 60 * 60 * 1000; break;
            case '4h': timeframeMs = 4 * 60 * 60 * 1000; break;
            case '1d': timeframeMs = 24 * 60 * 60 * 1000; break;
            default: timeframeMs = 60 * 60 * 1000; // Default to 1h
          }
          
          // Check if enough time has passed
          return timeElapsed >= periods * timeframeMs;
        }
        return false;
      }
      
      default:
        return false;
    }
  }

  private calculatePositionSize(context: ExecutionContext, riskManagement: RiskManagement): number {
    // Default position size based on available balance
    const availableBalance = context.balances.quote;
    
    // Default to 100% of available balance
    let size = availableBalance / context.price;
    
    // Apply position sizing from risk management if specified
    if (riskManagement.positionSizing) {
      const matchPercent = riskManagement.positionSizing.match(/(\d+\.?\d*)%/);
      if (matchPercent) {
        const percent = parseFloat(matchPercent[1]);
        size = (availableBalance * (percent / 100)) / context.price;
      }
    }
    
    // Apply max positions limit if specified
    if (riskManagement.maxPositions && riskManagement.maxPositions > 0) {
      // Divide available balance by max positions
      const maxPositionSize = availableBalance / riskManagement.maxPositions / context.price;
      size = Math.min(size, maxPositionSize);
    }
    
    return size;
  }
}

/**
 * Service for executing strategies and integrating with agents
 */
export class StrategyExecutionService {
  /**
   * Get the appropriate executor for a strategy
   * @param strategyId Strategy ID
   * @param version Version string (optional, uses latest if not provided)
   * @param config Optional configuration
   * @returns Strategy executor instance
   */
  async getExecutor(strategyId: string, version?: string, config: Record<string, any> = {}): Promise<StrategyExecutor> {
    // Get the strategy
    const strategy = await strategyService.getStrategyById(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    
    // Get the version (latest if not specified)
    let strategyVersion;
    if (version) {
      strategyVersion = await strategyService.getVersion(strategyId, version);
      if (!strategyVersion) {
        throw new Error(`Strategy version not found: ${version}`);
      }
    } else {
      const versions = await strategyService.getVersions(strategyId);
      if (versions.length === 0) {
        throw new Error(`No versions found for strategy: ${strategyId}`);
      }
      
      strategyVersion = versions[0]; // Latest version
    }
    
    // Create executor based on strategy type or config
    // In a real implementation, this could use more sophisticated logic to select executor types
    return new RuleBasedExecutor(strategy, strategyVersion, config);
  }
  
  /**
   * Execute a strategy for a given context
   * @param strategyId Strategy ID
   * @param agentId Agent ID
   * @param context Execution context
   * @returns Execution signal
   */
  async executeStrategy(strategyId: string, agentId: string, context: ExecutionContext): Promise<ExecutionSignal> {
    // Get the agent-strategy link to get configuration
    const agentStrategies = await strategyService.getAgentStrategies(agentId);
    const agentStrategy = agentStrategies.find((as: any) => as.strategy_id === strategyId);
    
    if (!agentStrategy) {
      throw new Error(`Agent ${agentId} is not authorized to execute strategy ${strategyId}`);
    }
    
    if (!agentStrategy.is_active) {
      throw new Error(`Strategy ${strategyId} is not active for agent ${agentId}`);
    }
    
    // Get executor with agent-specific configuration
    const executor = await this.getExecutor(strategyId, undefined, agentStrategy.config);
    
    // Execute strategy
    return executor.processContext({
      ...context,
      strategyId,
      strategyVersion: agentStrategy.strategy.version,
      agentId
    });
  }
  
  /**
   * Convert a signal to an execution order
   * @param signal Execution signal
   * @param context Execution context
   * @returns Execution order
   */
  createOrderFromSignal(
    signal: ExecutionSignal, 
    context: ExecutionContext
  ): ExecutionOrder | null {
    // Skip if action is hold
    if (signal.action === 'hold') {
      return null;
    }
    
    // Create a unique order ID
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    return {
      id: orderId,
      strategyId: context.strategyId,
      agentId: context.agentId,
      market: context.market,
      action: signal.action,
      type: signal.price ? 'limit' : 'market',
      size: signal.size || (context.position.size || 0),
      price: signal.price,
      timestamp: Date.now(),
      status: 'pending',
      reason: signal.reason,
      metadata: {
        ...signal.metadata,
        riskScore: signal.riskScore,
        confidence: signal.confidence
      }
    };
  }
  
  /**
   * Deploy a strategy to an agent for execution
   * @param strategyId Strategy ID
   * @param agentId Agent ID
   * @param config Optional configuration
   * @returns Deployment ID
   */
  async deployToAgent(strategyId: string, agentId: string, config: Record<string, any> = {}) {
    // Validate strategy
    const strategy = await strategyService.getStrategyById(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    
    if (strategy.status !== 'active') {
      throw new Error(`Strategy ${strategyId} is not active and cannot be deployed`);
    }
    
    // Deploy to agent
    return strategyService.deployToAgent({
      strategy_id: strategyId,
      agent_id: agentId,
      config
    });
  }
}

// Export singleton instance
export const strategyExecutionService = new StrategyExecutionService(); 