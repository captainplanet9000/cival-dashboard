import { BacktestEngine } from '@/services/trading/backtest-engine';
import { PerformanceAnalytics } from '@/services/trading/performance-analytics';
import { OrderService } from '@/services/trading/order-service';
import { MarketDataService } from '@/services/trading/market-data-service';
import { StrategyExecutionService } from '@/services/trading/strategy-execution-service';
import { BaseStrategy } from '@/services/trading/base-strategy';
import { AiAdaptiveStrategy } from '@/services/trading/strategies/ai-adaptive-strategy';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Signal, StrategyParameters } from '@/services/trading/strategy-interface';
import { AgentCommand, AgentInfo, CommandResult } from '@/types/elizaos.types';

/**
 * Trading Agent Service
 * Handles trading-specific functionality for ElizaOS agents
 */
export class TradingAgentService {
  private marketDataService: MarketDataService;
  private orderService: OrderService;
  private backtestEngine: BacktestEngine;
  private performanceAnalytics: PerformanceAnalytics;
  private strategyExecutionService: StrategyExecutionService;
  private supabase: SupabaseClient<Database>;
  
  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient;
    this.marketDataService = new MarketDataService(supabaseClient);
    this.orderService = new OrderService(supabaseClient);
    this.performanceAnalytics = new PerformanceAnalytics(supabaseClient);
    this.backtestEngine = new BacktestEngine(
      this.marketDataService,
      this.performanceAnalytics
    );
    this.strategyExecutionService = new StrategyExecutionService(
      this.marketDataService,
      this.orderService,
      supabaseClient
    );
  }
  
  /**
   * Static factory method to create a service instance
   */
  public static async create(): Promise<TradingAgentService> {
    const supabase = await createServerClient();
    return new TradingAgentService(supabase);
  }

  /**
   * Get agent trading configuration
   */
  public async getAgentConfig(agentId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('elizaos_agents')
      .select('configuration')
      .eq('id', agentId)
      .single();
      
    if (error) {
      throw new Error(`Failed to get agent configuration: ${error.message}`);
    }
    
    return data?.configuration || {};
  }
  
  /**
   * Create a trading strategy based on agent configuration
   */
  private async createStrategyFromConfig(agentId: string): Promise<BaseStrategy> {
    const config = await this.getAgentConfig(agentId);
    
    // Create the appropriate strategy based on the configuration
    switch (config.strategy_id) {
      case 'ai-adaptive-strategy':
        return new AiAdaptiveStrategy({
          id: `agent-${agentId}-strategy`,
          name: 'AI Adaptive Strategy',
          description: 'Agent-controlled adaptive trading strategy',
          parameters: {
            timeframe: config.timeframes?.[0] || '1h',
            indicatorWeights: {
              trend: config.indicator_weights?.trend || 0.4,
              momentum: config.indicator_weights?.momentum || 0.3,
              volatility: config.indicator_weights?.volatility || 0.2,
              volume: config.indicator_weights?.volume || 0.1,
            },
            adaptationRate: 0.05,
            riskManagement: {
              maxDrawdown: config.max_drawdown_percent || 10,
              stopLossPercent: config.stop_loss_percent || 2,
              takeProfitPercent: config.take_profit_percent || 4,
              trailingStopEnabled: config.trailing_stop_enabled || false,
              trailingStopPercent: config.trailing_stop_percent || 1
            }
          }
        });
      case 'trend-following':
        // Implement other strategy types as needed
        return new BaseStrategy({
          id: `agent-${agentId}-strategy`,
          name: 'Trend Following Strategy',
          description: 'Agent-controlled trend following strategy',
          parameters: {
            timeframe: config.timeframes?.[0] || '1h',
            // Add strategy-specific parameters
          }
        });
      default:
        // Default to base strategy if no specific type is recognized
        return new BaseStrategy({
          id: `agent-${agentId}-strategy`,
          name: 'Basic Trading Strategy',
          description: 'Default agent trading strategy',
          parameters: {
            timeframe: config.timeframes?.[0] || '1h',
          }
        });
    }
  }
  
  /**
   * Process a trading command from an agent
   */
  public async processCommand(
    agentId: string,
    command: AgentCommand,
    agentInfo: AgentInfo
  ): Promise<CommandResult> {
    try {
      const config = await this.getAgentConfig(agentId);
      const parameters = command.parameters || {};
      
      switch (command.type) {
        case 'analyze_market':
          return await this.analyzeMarket(agentId, parameters, agentInfo);
          
        case 'execute_trade':
          return await this.executeTrade(agentId, parameters, agentInfo);
          
        case 'adjust_strategy':
          return await this.adjustStrategy(agentId, parameters, agentInfo);
          
        case 'evaluate_risk':
          return await this.evaluateRisk(agentId, parameters, agentInfo);
          
        case 'backtest_strategy':
          return await this.backtestStrategy(agentId, parameters, agentInfo);
          
        default:
          throw new Error(`Unsupported trading command type: ${command.type}`);
      }
    } catch (error: any) {
      console.error(`Error processing trading command for agent ${agentId}:`, error);
      
      // Save error to agent history
      await this.logAgentActivity(agentId, {
        action: 'command_error',
        details: error.message,
        command_type: command.type,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        message: `Trading command failed: ${error.message}`,
        data: null,
        error: error.message
      };
    }
  }
  
  /**
   * Analyze market conditions
   */
  private async analyzeMarket(
    agentId: string,
    parameters: any,
    agentInfo: AgentInfo
  ): Promise<CommandResult> {
    const { symbol, timeframe, indicators } = parameters;
    const config = await this.getAgentConfig(agentId);
    
    // Validate parameters
    if (!symbol) {
      throw new Error('Symbol is required for market analysis');
    }
    
    // Get market data
    const marketData = await this.marketDataService.getHistoricalData(
      symbol,
      timeframe || config.timeframes?.[0] || '1h',
      100 // Get the last 100 candles
    );
    
    // Calculate technical indicators
    const analysis = await this.marketDataService.calculateIndicators(
      marketData,
      indicators || ['rsi', 'macd', 'ema', 'bb'] // Default indicators
    );
    
    // Determine market conditions
    const marketConditions = await this.determineMarketConditions(analysis);
    
    // Log the analysis activity
    await this.logAgentActivity(agentId, {
      action: 'market_analysis',
      details: `Analyzed ${symbol} on ${timeframe} timeframe`,
      symbol,
      timeframe,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      message: `Market analysis completed for ${symbol}`,
      data: {
        symbol,
        timeframe: timeframe || config.timeframes?.[0],
        analysis,
        marketConditions,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  /**
   * Determine market conditions based on indicator analysis
   */
  private async determineMarketConditions(analysis: any): Promise<any> {
    // Simple algorithm to determine market conditions
    const rsi = analysis.rsi?.value;
    const macd = analysis.macd;
    const bb = analysis.bb;
    
    let trend = 'neutral';
    let volatility = 'medium';
    let momentum = 'neutral';
    
    // Determine trend
    if (macd?.histogram > 0 && macd?.signal > 0) {
      trend = 'bullish';
    } else if (macd?.histogram < 0 && macd?.signal < 0) {
      trend = 'bearish';
    }
    
    // Determine momentum
    if (rsi > 70) {
      momentum = 'overbought';
    } else if (rsi < 30) {
      momentum = 'oversold';
    } else if (rsi > 50 && rsi < 70) {
      momentum = 'bullish';
    } else if (rsi > 30 && rsi < 50) {
      momentum = 'bearish';
    }
    
    // Determine volatility
    if (bb?.width > 0.05) {
      volatility = 'high';
    } else if (bb?.width < 0.02) {
      volatility = 'low';
    }
    
    return {
      trend,
      momentum,
      volatility,
      signals: this.generateSignalsFromConditions(trend, momentum, volatility)
    };
  }
  
  /**
   * Generate potential trading signals based on market conditions
   */
  private generateSignalsFromConditions(
    trend: string,
    momentum: string,
    volatility: string
  ): Signal[] {
    const signals: Signal[] = [];
    
    // Generate buy signals
    if (
      (trend === 'bullish' && momentum === 'bullish') ||
      momentum === 'oversold'
    ) {
      signals.push({
        type: 'BUY',
        strength: momentum === 'oversold' ? 0.8 : 0.6,
        reason: momentum === 'oversold' 
          ? 'Oversold conditions' 
          : 'Bullish trend with momentum'
      });
    }
    
    // Generate sell signals
    if (
      (trend === 'bearish' && momentum === 'bearish') ||
      momentum === 'overbought'
    ) {
      signals.push({
        type: 'SELL',
        strength: momentum === 'overbought' ? 0.8 : 0.6,
        reason: momentum === 'overbought' 
          ? 'Overbought conditions' 
          : 'Bearish trend with momentum'
      });
    }
    
    // Add volatility-based signals
    if (volatility === 'low' && (trend === 'bullish' || trend === 'bearish')) {
      signals.push({
        type: trend === 'bullish' ? 'BUY' : 'SELL',
        strength: 0.4,
        reason: `${trend} breakout potential in low volatility environment`
      });
    }
    
    return signals;
  }
  
  /**
   * Execute a trade based on agent command
   */
  private async executeTrade(
    agentId: string,
    parameters: any,
    agentInfo: AgentInfo
  ): Promise<CommandResult> {
    const { symbol, side, amount, price, type, stopLoss, takeProfit } = parameters;
    const config = await this.getAgentConfig(agentId);
    
    // Validate trading mode
    if (config.strategy_mode !== 'live' && config.strategy_mode !== 'paper') {
      throw new Error(`Invalid trading mode: ${config.strategy_mode}`);
    }
    
    // Validate parameters
    if (!symbol || !side || !amount) {
      throw new Error('Symbol, side and amount are required for trade execution');
    }
    
    // Validate trading permissions
    if (!this.validateTradingPermissions(agentInfo, config)) {
      throw new Error('Agent does not have permission to execute trades');
    }
    
    // Create an order
    const order = await this.orderService.createOrder({
      symbol,
      side: side.toUpperCase(),
      amount: parseFloat(amount),
      price: price ? parseFloat(price) : undefined,
      type: type || 'MARKET',
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      agentId,
      mode: config.strategy_mode // 'live' or 'paper'
    });
    
    // Log the trade activity
    await this.logAgentActivity(agentId, {
      action: 'trade_execution',
      details: `${side.toUpperCase()} ${amount} ${symbol} at ${price || 'market price'}`,
      order_id: order.id,
      symbol,
      side,
      amount,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      message: `${side.toUpperCase()} order executed for ${amount} ${symbol}`,
      data: order
    };
  }
  
  /**
   * Adjust strategy parameters based on agent command
   */
  private async adjustStrategy(
    agentId: string,
    parameters: any,
    agentInfo: AgentInfo
  ): Promise<CommandResult> {
    const config = await this.getAgentConfig(agentId);
    
    // Create a strategy instance
    const strategy = await this.createStrategyFromConfig(agentId);
    
    // Apply parameter adjustments
    const updatedParameters = {
      ...strategy.getParameters(),
      ...parameters
    };
    
    // Update strategy parameters
    strategy.updateParameters(updatedParameters as StrategyParameters);
    
    // Save the updated parameters to the agent configuration
    const { error } = await this.supabase
      .from('elizaos_agents')
      .update({
        configuration: {
          ...config,
          ...this.extractStrategyConfigFromParameters(updatedParameters)
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId);
    
    if (error) {
      throw new Error(`Failed to save updated strategy parameters: ${error.message}`);
    }
    
    // Log the strategy adjustment
    await this.logAgentActivity(agentId, {
      action: 'strategy_adjustment',
      details: 'Adjusted strategy parameters',
      parameters: updatedParameters,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      message: 'Strategy parameters adjusted successfully',
      data: updatedParameters
    };
  }
  
  /**
   * Extract configuration from strategy parameters
   */
  private extractStrategyConfigFromParameters(parameters: any): any {
    // Map strategy parameters to configuration format
    return {
      indicator_weights: parameters.indicatorWeights,
      risk_management: {
        max_drawdown: parameters.riskManagement?.maxDrawdown,
        stop_loss_percent: parameters.riskManagement?.stopLossPercent,
        take_profit_percent: parameters.riskManagement?.takeProfitPercent,
        trailing_stop_enabled: parameters.riskManagement?.trailingStopEnabled,
        trailing_stop_percent: parameters.riskManagement?.trailingStopPercent
      }
    };
  }
  
  /**
   * Evaluate risk for current positions and market conditions
   */
  private async evaluateRisk(
    agentId: string,
    parameters: any,
    agentInfo: AgentInfo
  ): Promise<CommandResult> {
    const config = await this.getAgentConfig(agentId);
    
    // Get open positions
    const positions = await this.orderService.getOpenPositions(agentId);
    
    // Calculate total exposure
    const totalExposure = positions.reduce((sum, position) => {
      return sum + Math.abs(position.amount * position.entryPrice);
    }, 0);
    
    // Calculate account balance
    const balance = await this.orderService.getAccountBalance(agentId, config.strategy_mode);
    
    // Calculate risk metrics
    const riskMetrics = {
      totalExposure,
      exposurePercentage: (totalExposure / balance.total) * 100,
      maxAllowedExposure: balance.total * (config.max_position_size_percent / 100),
      currentDrawdown: await this.calculateCurrentDrawdown(agentId),
      maxAllowedDrawdown: config.max_drawdown_percent,
      positionCount: positions.length,
      riskScore: 0 // Will be calculated below
    };
    
    // Calculate risk score (0-100, higher is riskier)
    riskMetrics.riskScore = this.calculateRiskScore(riskMetrics, config);
    
    // Get risk-based recommendations
    const recommendations = this.generateRiskRecommendations(riskMetrics, config);
    
    // Log the risk evaluation
    await this.logAgentActivity(agentId, {
      action: 'risk_evaluation',
      details: `Risk evaluation performed, score: ${riskMetrics.riskScore}`,
      metrics: riskMetrics,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      message: 'Risk evaluation completed',
      data: {
        riskMetrics,
        recommendations,
        positions
      }
    };
  }
  
  /**
   * Calculate current drawdown for an agent
   */
  private async calculateCurrentDrawdown(agentId: string): Promise<number> {
    // Get trade history
    const history = await this.orderService.getTradeHistory(agentId);
    
    // Calculate drawdown (simplified version)
    let peak = 0;
    let currentValue = 0;
    let maxDrawdown = 0;
    
    history.forEach(trade => {
      currentValue += trade.realizedPnl;
      
      if (currentValue > peak) {
        peak = currentValue;
      }
      
      const drawdown = ((peak - currentValue) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });
    
    return maxDrawdown;
  }
  
  /**
   * Calculate risk score based on metrics and configuration
   */
  private calculateRiskScore(riskMetrics: any, config: any): number {
    // Simplified risk score calculation
    let score = 0;
    
    // Exposure component (0-40 points)
    const exposureRatio = riskMetrics.exposurePercentage / config.max_position_size_percent;
    score += Math.min(40, exposureRatio * 40);
    
    // Drawdown component (0-40 points)
    const drawdownRatio = riskMetrics.currentDrawdown / config.max_drawdown_percent;
    score += Math.min(40, drawdownRatio * 40);
    
    // Position diversification (0-20 points)
    // Less diversification = higher risk
    const positionCount = riskMetrics.positionCount;
    score += Math.max(0, 20 - (positionCount * 5));
    
    return Math.min(100, Math.max(0, score));
  }
  
  /**
   * Generate risk-based recommendations
   */
  private generateRiskRecommendations(riskMetrics: any, config: any): any[] {
    const recommendations = [];
    
    // Exposure recommendations
    if (riskMetrics.exposurePercentage > 90) {
      recommendations.push({
        type: 'critical',
        action: 'reduce_exposure',
        message: 'Critical exposure level reached. Consider reducing positions immediately.'
      });
    } else if (riskMetrics.exposurePercentage > 75) {
      recommendations.push({
        type: 'warning',
        action: 'monitor_exposure',
        message: 'High exposure level. Monitor closely and prepare to reduce positions.'
      });
    }
    
    // Drawdown recommendations
    if (riskMetrics.currentDrawdown > config.max_drawdown_percent * 0.9) {
      recommendations.push({
        type: 'critical',
        action: 'pause_trading',
        message: 'Approaching maximum allowed drawdown. Consider pausing trading activity.'
      });
    } else if (riskMetrics.currentDrawdown > config.max_drawdown_percent * 0.7) {
      recommendations.push({
        type: 'warning',
        action: 'reduce_position_size',
        message: 'Significant drawdown detected. Consider reducing position sizes.'
      });
    }
    
    // Diversification recommendations
    if (riskMetrics.positionCount === 1) {
      recommendations.push({
        type: 'info',
        action: 'diversify',
        message: 'Low diversification. Consider trading multiple assets to spread risk.'
      });
    }
    
    // Default recommendation if none were generated
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'info',
        action: 'maintain',
        message: 'Risk levels acceptable. Maintain current trading strategy.'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Run a backtest for the agent's strategy
   */
  private async backtestStrategy(
    agentId: string,
    parameters: any,
    agentInfo: AgentInfo
  ): Promise<CommandResult> {
    const config = await this.getAgentConfig(agentId);
    const {
      startDate = parameters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = parameters.endDate || new Date().toISOString(),
      symbols = parameters.symbols || config.trading_pairs || ['BTC/USDT'],
      timeframes = parameters.timeframes || config.timeframes || ['1h'],
      initialCapital = parameters.initialCapital || config.initial_capital || 10000,
    } = parameters;
    
    // Create a strategy instance
    const strategy = await this.createStrategyFromConfig(agentId);
    
    // Configure backtest parameters
    const backtestConfig = {
      startDate,
      endDate,
      initialCapital,
      symbols,
      timeframes,
      // Add other parameters like fees, slippage, etc.
      feesPercentage: parameters.feesPercentage || 0.1,
      slippagePercentage: parameters.slippagePercentage || 0.05
    };
    
    // Get historical data for the backtest
    const historicalData = [];
    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        const data = await this.marketDataService.getHistoricalData(
          symbol,
          timeframe,
          undefined,
          new Date(startDate),
          new Date(endDate)
        );
        historicalData.push({
          symbol,
          timeframe,
          data
        });
      }
    }
    
    // Run the backtest
    const backtestResult = await this.backtestEngine.runBacktest(
      strategy,
      backtestConfig,
      historicalData
    );
    
    // Save the backtest result
    await this.performanceAnalytics.saveBacktestResult({
      ...backtestResult,
      agentId,
      timestamp: new Date().toISOString()
    });
    
    // Log the backtest activity
    await this.logAgentActivity(agentId, {
      action: 'backtest',
      details: `Backtest run from ${startDate} to ${endDate}`,
      result_id: backtestResult.id,
      profit_percent: backtestResult.profitPercent,
      trades: backtestResult.trades,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      message: 'Backtest completed successfully',
      data: backtestResult
    };
  }
  
  /**
   * Validate if the agent has the required trading permissions
   */
  private validateTradingPermissions(agentInfo: AgentInfo, config: any): boolean {
    // Check if the agent is allowed to trade
    if (config.strategy_mode === 'live') {
      // For live trading, check additional permissions
      return agentInfo.permissions?.includes('trading:execute');
    }
    
    // Paper trading permission is less strict
    return agentInfo.permissions?.includes('trading:paper') ||
           agentInfo.permissions?.includes('trading:execute');
  }
  
  /**
   * Log agent activity for tracking and analysis
   */
  private async logAgentActivity(agentId: string, activity: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('elizaos_agent_activities')
        .insert({
          agent_id: agentId,
          ...activity
        });
      
      if (error) {
        console.error(`Error logging agent activity: ${error.message}`);
      }
    } catch (e) {
      console.error('Failed to log agent activity:', e);
    }
  }
}
