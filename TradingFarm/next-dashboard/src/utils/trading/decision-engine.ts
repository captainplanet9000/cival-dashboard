/**
 * Trading Decision Engine
 * 
 * Processes market data, portfolio state, and risk parameters to generate 
 * trading signals and execute automated strategies.
 */

import { createServerClient } from '@/utils/supabase/server';
import { MarketDataService } from '../market-data/market-data-service';
import { RiskManager } from './risk-manager';
import { PositionManager, Position } from './position-manager';
import { OrderSide, OrderType } from '../exchanges/exchange-types';
import { RebalancingService } from './rebalancing-service';

// Signal types for trading decisions
export enum SignalType {
  BUY = 'buy',
  SELL = 'sell',
  HOLD = 'hold',
  REBALANCE = 'rebalance',
  CLOSE = 'close'
}

// Strength of the signal
export enum SignalStrength {
  WEAK = 'weak',
  MODERATE = 'moderate',
  STRONG = 'strong'
}

// Signal source
export enum SignalSource {
  TECHNICAL = 'technical',
  FUNDAMENTAL = 'fundamental',
  REBALANCING = 'rebalancing',
  RISK_MANAGEMENT = 'risk_management',
  MANUAL = 'manual'
}

// Trading signal details
export interface TradingSignal {
  id?: string;
  portfolioId: string;
  strategyId: string;
  timestamp: string;
  symbol: string;
  exchange: string;
  type: SignalType;
  strength: SignalStrength;
  source: SignalSource;
  price: number;
  targetPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity?: number;
  executed: boolean;
  executionTimestamp?: string;
  executionDetails?: any;
  metadata?: Record<string, any>;
}

// Strategy configuration
export interface StrategyConfig {
  id: string;
  name: string;
  type: 'trend_following' | 'mean_reversion' | 'breakout' | 'custom';
  symbols: string[];
  exchange: string;
  parameters: Record<string, any>;
  timeframes: string[];
  indicators: {
    name: string;
    parameters: Record<string, any>;
  }[];
  signalThresholds: {
    buy: number;
    sell: number;
  };
  position: {
    sizing: 'fixed' | 'percentage' | 'risk_based';
    sizingValue: number;
    maxPositions: number;
  };
  enabled: boolean;
}

export class DecisionEngine {
  private static marketDataService = MarketDataService.getInstance();
  
  /**
   * Generate trading signals based on strategy and current market data
   */
  static async generateSignals(
    portfolioId: string,
    strategyId: string
  ): Promise<TradingSignal[]> {
    try {
      const supabase = await createServerClient();
      
      // Get strategy configuration
      const { data: strategy, error: strategyError } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
        
      if (strategyError || !strategy) {
        console.error('Error fetching strategy:', strategyError);
        return [];
      }
      
      // Parse strategy configuration
      const strategyConfig: StrategyConfig = {
        id: strategy.id,
        name: strategy.name,
        type: strategy.type || 'trend_following',
        symbols: strategy.symbols || [],
        exchange: strategy.exchange || 'binance',
        parameters: strategy.parameters || {},
        timeframes: strategy.timeframes || ['1h'],
        indicators: strategy.indicators || [],
        signalThresholds: strategy.signal_thresholds || { buy: 70, sell: 30 },
        position: strategy.position || {
          sizing: 'percentage',
          sizingValue: 5,
          maxPositions: 10
        },
        enabled: strategy.is_active || false
      };
      
      // Check if strategy is enabled
      if (!strategyConfig.enabled) {
        return [];
      }
      
      // Get current positions
      const positions = await PositionManager.getPositions(portfolioId);
      
      // Trading signals to return
      const signals: TradingSignal[] = [];
      
      // Process each symbol in the strategy
      for (const symbol of strategyConfig.symbols) {
        // Get market data
        const marketData = await this.marketDataService.getTicker(
          strategyConfig.exchange as any,
          symbol
        );
        
        if (!marketData) {
          console.warn(`No market data for ${symbol} on ${strategyConfig.exchange}`);
          continue;
        }
        
        // Find existing position for this symbol
        const existingPosition = positions.find(
          p => p.symbol === symbol && p.exchange === strategyConfig.exchange
        );
        
        // Generate signal based on strategy type
        let signal: TradingSignal | null = null;
        
        switch (strategyConfig.type) {
          case 'trend_following':
            signal = await this.generateTrendFollowingSignal(
              portfolioId,
              strategyId,
              strategyConfig,
              symbol,
              marketData,
              existingPosition
            );
            break;
            
          case 'mean_reversion':
            signal = await this.generateMeanReversionSignal(
              portfolioId,
              strategyId,
              strategyConfig,
              symbol,
              marketData,
              existingPosition
            );
            break;
            
          case 'breakout':
            signal = await this.generateBreakoutSignal(
              portfolioId,
              strategyId,
              strategyConfig,
              symbol,
              marketData,
              existingPosition
            );
            break;
            
          default:
            // Default to a simple moving average crossover
            signal = await this.generateDefaultSignal(
              portfolioId,
              strategyId,
              strategyConfig,
              symbol,
              marketData,
              existingPosition
            );
        }
        
        if (signal) {
          signals.push(signal);
        }
      }
      
      // Save generated signals to database
      if (signals.length > 0) {
        await this.saveSignals(signals);
      }
      
      return signals;
    } catch (error) {
      console.error('Error generating signals:', error);
      return [];
    }
  }

  /**
   * Process and execute trading signals
   */
  static async executeSignals(
    signals: TradingSignal[],
    apiKeys: { exchange: string; apiKey: string; apiSecret: string }[]
  ): Promise<{ success: boolean; executedSignals: number; errors: any[] }> {
    try {
      const executedSignals: TradingSignal[] = [];
      const errors: any[] = [];
      
      // Check if trading is allowed (risk circuit breakers)
      for (const signal of signals) {
        try {
          // Skip already executed signals
          if (signal.executed) {
            continue;
          }
          
          // Check risk parameters
          const tradingAllowance = await RiskManager.checkTradingAllowance(signal.portfolioId);
          if (!tradingAllowance.canTrade) {
            console.warn(`Trading not allowed for portfolio ${signal.portfolioId}: ${tradingAllowance.reasonIfBlocked}`);
            continue;
          }
          
          // Calculate position size
          let quantity = signal.quantity;
          if (!quantity) {
            const positionSizeResult = await RiskManager.calculatePositionSize(
              signal.portfolioId,
              signal.symbol,
              signal.type === SignalType.BUY ? OrderSide.BUY : OrderSide.SELL,
              1, // Default quantity, will be adjusted by risk manager
              signal.price
            );
            
            if (!positionSizeResult.approved) {
              console.warn(`Position size not approved: ${positionSizeResult.sizeReductionReason}`);
              continue;
            }
            
            quantity = positionSizeResult.recommendedSize;
          }
          
          // Find API key for the exchange
          const exchangeKey = apiKeys.find(k => k.exchange === signal.exchange);
          if (!exchangeKey) {
            errors.push({
              signal,
              error: `No API key found for exchange ${signal.exchange}`
            });
            continue;
          }
          
          // Create transaction object for execution
          const transaction = {
            id: signal.id || crypto.randomUUID(),
            portfolio_id: signal.portfolioId,
            strategy_id: signal.strategyId,
            action: signal.type,
            strategies: {
              exchange: signal.exchange,
              market: signal.symbol
            },
            amount: quantity * signal.price,
            price: signal.price,
            quantity
          };
          
          // Execute the transaction
          const result = await RebalancingService.executeTransaction(
            transaction as any, 
            exchangeKey.apiKey, 
            exchangeKey.apiSecret
          );
          
          if (result.success) {
            // Update signal with execution details
            const executedSignal = {
              ...signal,
              executed: true,
              executionTimestamp: new Date().toISOString(),
              executionDetails: {
                orderId: result.orderId,
                executionPrice: result.executionPrice,
                executionQuantity: result.executionQuantity,
                fee: result.fee
              }
            };
            
            executedSignals.push(executedSignal);
            
            // Update signal in database
            await this.updateSignalExecutionStatus(executedSignal);
          } else {
            errors.push({
              signal,
              error: result.message || 'Unknown execution error'
            });
          }
        } catch (error) {
          errors.push({
            signal,
            error: error.message || 'Unknown error'
          });
        }
      }
      
      return {
        success: executedSignals.length > 0,
        executedSignals: executedSignals.length,
        errors
      };
    } catch (error) {
      console.error('Error executing signals:', error);
      return {
        success: false,
        executedSignals: 0,
        errors: [{ error: error.message || 'Unknown error' }]
      };
    }
  }

  /**
   * Get active signals for a portfolio
   */
  static async getActiveSignals(portfolioId: string): Promise<TradingSignal[]> {
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('executed', false)
        .order('timestamp', { ascending: false });
        
      if (error) {
        console.error('Error fetching active signals:', error);
        return [];
      }
      
      return data.map(this.mapDatabaseSignalToInterface);
    } catch (error) {
      console.error('Error getting active signals:', error);
      return [];
    }
  }

  /**
   * Save signals to database
   */
  private static async saveSignals(signals: TradingSignal[]): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      // Map signals to database format
      const dbSignals = signals.map(signal => ({
        portfolio_id: signal.portfolioId,
        strategy_id: signal.strategyId,
        timestamp: signal.timestamp,
        symbol: signal.symbol,
        exchange: signal.exchange,
        type: signal.type,
        strength: signal.strength,
        source: signal.source,
        price: signal.price,
        target_price: signal.targetPrice,
        stop_loss: signal.stopLoss,
        take_profit: signal.takeProfit,
        quantity: signal.quantity,
        executed: signal.executed,
        execution_timestamp: signal.executionTimestamp,
        execution_details: signal.executionDetails,
        metadata: signal.metadata
      }));
      
      // Insert signals
      const { error } = await supabase
        .from('trading_signals')
        .insert(dbSignals);
        
      if (error) {
        console.error('Error saving signals:', error);
      }
    } catch (error) {
      console.error('Error saving signals:', error);
    }
  }

  /**
   * Update signal execution status
   */
  private static async updateSignalExecutionStatus(signal: TradingSignal): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      const { error } = await supabase
        .from('trading_signals')
        .update({
          executed: true,
          execution_timestamp: signal.executionTimestamp,
          execution_details: signal.executionDetails
        })
        .eq('id', signal.id);
        
      if (error) {
        console.error('Error updating signal execution status:', error);
      }
    } catch (error) {
      console.error('Error updating signal execution status:', error);
    }
  }

  /**
   * Map database signal to interface
   */
  private static mapDatabaseSignalToInterface(dbSignal: any): TradingSignal {
    return {
      id: dbSignal.id,
      portfolioId: dbSignal.portfolio_id,
      strategyId: dbSignal.strategy_id,
      timestamp: dbSignal.timestamp,
      symbol: dbSignal.symbol,
      exchange: dbSignal.exchange,
      type: dbSignal.type,
      strength: dbSignal.strength,
      source: dbSignal.source,
      price: dbSignal.price,
      targetPrice: dbSignal.target_price,
      stopLoss: dbSignal.stop_loss,
      takeProfit: dbSignal.take_profit,
      quantity: dbSignal.quantity,
      executed: dbSignal.executed,
      executionTimestamp: dbSignal.execution_timestamp,
      executionDetails: dbSignal.execution_details,
      metadata: dbSignal.metadata
    };
  }

  /**
   * Generate signal for trend following strategy
   */
  private static async generateTrendFollowingSignal(
    portfolioId: string,
    strategyId: string,
    strategyConfig: StrategyConfig,
    symbol: string,
    marketData: any,
    existingPosition?: Position
  ): Promise<TradingSignal | null> {
    // In a real implementation, this would analyze market data using indicators
    // For demonstration, using a simple up/down trend check
    const uptrend = marketData.change > 0;
    
    // If in uptrend and no position, generate buy signal
    if (uptrend && !existingPosition) {
      return {
        portfolioId,
        strategyId,
        timestamp: new Date().toISOString(),
        symbol,
        exchange: strategyConfig.exchange,
        type: SignalType.BUY,
        strength: SignalStrength.MODERATE,
        source: SignalSource.TECHNICAL,
        price: marketData.last,
        stopLoss: marketData.last * 0.95, // 5% below current price
        takeProfit: marketData.last * 1.15, // 15% above current price
        executed: false,
        metadata: { strategy: 'trend_following' }
      };
    }
    
    // If not in uptrend and have position, generate sell signal
    if (!uptrend && existingPosition) {
      return {
        portfolioId,
        strategyId,
        timestamp: new Date().toISOString(),
        symbol,
        exchange: strategyConfig.exchange,
        type: SignalType.SELL,
        strength: SignalStrength.MODERATE,
        source: SignalSource.TECHNICAL,
        price: marketData.last,
        quantity: existingPosition.quantity,
        executed: false,
        metadata: { strategy: 'trend_following' }
      };
    }
    
    return null;
  }

  /**
   * Generate signal for mean reversion strategy
   */
  private static async generateMeanReversionSignal(
    portfolioId: string,
    strategyId: string,
    strategyConfig: StrategyConfig,
    symbol: string,
    marketData: any,
    existingPosition?: Position
  ): Promise<TradingSignal | null> {
    // For demonstration, using a simple oversold/overbought check
    const changePercent = marketData.changePercent || 0;
    const oversold = changePercent < -5; // 5% down is oversold
    const overbought = changePercent > 5; // 5% up is overbought
    
    // If oversold and no position, buy
    if (oversold && !existingPosition) {
      return {
        portfolioId,
        strategyId,
        timestamp: new Date().toISOString(),
        symbol,
        exchange: strategyConfig.exchange,
        type: SignalType.BUY,
        strength: SignalStrength.MODERATE,
        source: SignalSource.TECHNICAL,
        price: marketData.last,
        stopLoss: marketData.last * 0.95,
        takeProfit: marketData.last * 1.05,
        executed: false,
        metadata: { strategy: 'mean_reversion' }
      };
    }
    
    // If overbought and have position, sell
    if (overbought && existingPosition) {
      return {
        portfolioId,
        strategyId,
        timestamp: new Date().toISOString(),
        symbol,
        exchange: strategyConfig.exchange,
        type: SignalType.SELL,
        strength: SignalStrength.MODERATE,
        source: SignalSource.TECHNICAL,
        price: marketData.last,
        quantity: existingPosition.quantity,
        executed: false,
        metadata: { strategy: 'mean_reversion' }
      };
    }
    
    return null;
  }

  /**
   * Generate signal for breakout strategy
   */
  private static async generateBreakoutSignal(
    portfolioId: string,
    strategyId: string,
    strategyConfig: StrategyConfig,
    symbol: string,
    marketData: any,
    existingPosition?: Position
  ): Promise<TradingSignal | null> {
    // For demonstration, using a simple volume + price change check
    const highVolume = marketData.quoteVolume > 1000000; // $1M volume
    const priceChange = Math.abs(marketData.changePercent || 0);
    const significantMove = priceChange > 3; // 3% price move
    const upward = marketData.change > 0;
    
    // Breakout conditions: high volume + significant price move
    const breakout = highVolume && significantMove;
    
    if (breakout) {
      if (upward && !existingPosition) {
        // Bullish breakout - buy
        return {
          portfolioId,
          strategyId,
          timestamp: new Date().toISOString(),
          symbol,
          exchange: strategyConfig.exchange,
          type: SignalType.BUY,
          strength: SignalStrength.STRONG,
          source: SignalSource.TECHNICAL,
          price: marketData.last,
          stopLoss: marketData.last * 0.93,
          takeProfit: marketData.last * 1.15,
          executed: false,
          metadata: { 
            strategy: 'breakout',
            volume: marketData.quoteVolume,
            priceChange: marketData.changePercent
          }
        };
      } else if (!upward && existingPosition) {
        // Bearish breakout - sell
        return {
          portfolioId,
          strategyId,
          timestamp: new Date().toISOString(),
          symbol,
          exchange: strategyConfig.exchange,
          type: SignalType.SELL,
          strength: SignalStrength.STRONG,
          source: SignalSource.TECHNICAL,
          price: marketData.last,
          quantity: existingPosition.quantity,
          executed: false,
          metadata: { 
            strategy: 'breakout',
            volume: marketData.quoteVolume,
            priceChange: marketData.changePercent
          }
        };
      }
    }
    
    return null;
  }

  /**
   * Generate signal using default strategy (moving average crossover)
   */
  private static async generateDefaultSignal(
    portfolioId: string,
    strategyId: string,
    strategyConfig: StrategyConfig,
    symbol: string,
    marketData: any,
    existingPosition?: Position
  ): Promise<TradingSignal | null> {
    // For demonstration, using a simple price vs threshold check
    const buyThreshold = marketData.last * 0.98; // 2% below current price
    const sellThreshold = marketData.last * 1.03; // 3% above current price
    
    if (!existingPosition && marketData.last < buyThreshold) {
      // Price below buy threshold - buy signal
      return {
        portfolioId,
        strategyId,
        timestamp: new Date().toISOString(),
        symbol,
        exchange: strategyConfig.exchange,
        type: SignalType.BUY,
        strength: SignalStrength.MODERATE,
        source: SignalSource.TECHNICAL,
        price: marketData.last,
        stopLoss: marketData.last * 0.95,
        takeProfit: marketData.last * 1.1,
        executed: false,
        metadata: { strategy: 'default' }
      };
    } else if (existingPosition && marketData.last > sellThreshold) {
      // Price above sell threshold - sell signal
      return {
        portfolioId,
        strategyId,
        timestamp: new Date().toISOString(),
        symbol,
        exchange: strategyConfig.exchange,
        type: SignalType.SELL,
        strength: SignalStrength.MODERATE,
        source: SignalSource.TECHNICAL,
        price: marketData.last,
        quantity: existingPosition.quantity,
        executed: false,
        metadata: { strategy: 'default' }
      };
    }
    
    return null;
  }
}
