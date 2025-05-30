import { BaseStrategy } from '../base-strategy';
import { StrategyParams, StrategySignal, MarketData } from '../strategy-interface';
import { OrderSide, TimeFrame } from '@/types/trading.types';

/**
 * AI Adaptive Strategy - A strategy that uses AI to adapt to changing market conditions
 * This strategy can be configured by AI agents with different technical indicators and weights
 */
export class AIAdaptiveStrategy extends BaseStrategy {
  /**
   * Get default parameters for the AI Adaptive Strategy
   */
  getDefaultParams(): StrategyParams {
    return {
      id: 'ai-adaptive-strategy',
      name: 'AI Adaptive Strategy',
      description: 'An adaptive strategy that uses AI to combine multiple technical indicators with dynamic weights',
      timeframe: '1h' as TimeFrame,
      symbols: ['BTC/USDT'],
      risk: {
        maxPositionSize: 5, // Max 5% of capital per position
        maxDrawdown: 2, // Risk 2% of capital per trade
        stopLossPercent: 2, // 2% stop loss
        takeProfitPercent: 4, // 4% take profit (1:2 risk-reward)
      },
      parameters: {
        // Indicator weights (0-1.0) - must sum to 1.0
        indicatorWeights: {
          trend: 0.4,       // Trend following weight
          momentum: 0.3,    // Momentum indicators weight
          volatility: 0.2,  // Volatility indicators weight
          volume: 0.1,      // Volume indicators weight
        },
        
        // Trend indicators
        trendIndicators: {
          ema: {
            enabled: true,
            periods: [20, 50, 200],
          },
          macd: {
            enabled: true,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
          },
        },
        
        // Momentum indicators
        momentumIndicators: {
          rsi: {
            enabled: true,
            period: 14,
            overbought: 70,
            oversold: 30,
          },
          stochastic: {
            enabled: false,
            kPeriod: 14,
            dPeriod: 3,
            overbought: 80,
            oversold: 20,
          },
        },
        
        // Volatility indicators
        volatilityIndicators: {
          atr: {
            enabled: true,
            period: 14,
          },
          bollingerBands: {
            enabled: true,
            period: 20,
            standardDeviations: 2,
          },
        },
        
        // Volume indicators
        volumeIndicators: {
          obv: {
            enabled: true,
          },
          vwap: {
            enabled: false,
          },
        },
        
        // Signal threshold - minimum composite score to generate a signal
        signalThreshold: 0.6,
        
        // Execution settings
        executionSettings: {
          entryType: 'market', // market or limit
          limitEntryOffset: 0.1, // % below or above current price for limit orders
          positionSizing: 'risk-based', // fixed, percentage, risk-based
        },
        
        // AI adaptation settings
        aiSettings: {
          adaptationFrequency: 'daily', // how often AI adjusts indicator weights
          marketRegimeDetection: true, // detect market regime (trending, ranging, volatile)
          maxWeightAdjustment: 0.1, // max weight change per adaptation cycle
        },
      },
    };
  }
  
  /**
   * Process market data to generate trading signals
   */
  processMarketData(marketData: MarketData): StrategySignal[] {
    const signals: StrategySignal[] = [];
    const params = this.params;
    const timestamp = new Date().toISOString();
    
    // For each symbol, calculate indicators and generate signals
    for (const symbol of params.symbols) {
      // Find candle data for this symbol and timeframe
      const candleData = marketData.candles.symbol === symbol && 
                       marketData.candles.timeframe === params.timeframe ? 
                       marketData.candles : null;
      
      if (!candleData || candleData.close.length === 0) {
        continue; // Skip if no data for this symbol
      }
      
      // Current price is the last close price
      const currentPrice = candleData.close[candleData.close.length - 1];
      
      // Calculate indicator scores
      const indicatorScores = this.calculateIndicatorScores(candleData);
      
      // Calculate composite score with indicator weights
      const compositeScore = this.calculateCompositeScore(indicatorScores);
      
      // Check if signal threshold is met
      if (Math.abs(compositeScore) >= params.parameters.signalThreshold) {
        const signalSide: OrderSide = compositeScore > 0 ? 'buy' : 'sell';
        
        // Calculate stop loss and take profit
        const stopLoss = this.calculateStopLoss(
          currentPrice,
          signalSide === 'buy' ? 'long' : 'short'
        );
        
        const takeProfit = this.calculateTakeProfit(
          currentPrice,
          signalSide === 'buy' ? 'long' : 'short'
        );
        
        // Create signal
        signals.push({
          symbol,
          side: signalSide,
          strength: Math.abs(compositeScore),
          price: currentPrice,
          targetPrice: takeProfit,
          stopLoss,
          timestamp,
          timeframe: params.timeframe,
          metadata: {
            strategy: 'ai-adaptive',
            indicatorScores,
            compositeScore,
            marketRegime: this.detectMarketRegime(candleData),
          }
        });
      }
    }
    
    return signals;
  }
  
  /**
   * Calculate indicator scores for different categories (trend, momentum, etc.)
   * Each category returns a score between -1 and 1
   */
  private calculateIndicatorScores(candleData: MarketData['candles']): Record<string, number> {
    const params = this.params.parameters;
    const scores: Record<string, number> = {
      trend: 0,
      momentum: 0,
      volatility: 0,
      volume: 0,
    };
    
    // Calculate trend score
    if (params.trendIndicators.ema.enabled) {
      scores.trend = this.calculateEMAScore(candleData);
    }
    
    // Calculate momentum score
    if (params.momentumIndicators.rsi.enabled) {
      scores.momentum = this.calculateRSIScore(candleData);
    }
    
    // Calculate volatility score
    if (params.volatilityIndicators.bollingerBands.enabled) {
      scores.volatility = this.calculateBollingerBandsScore(candleData);
    }
    
    // Calculate volume score
    if (params.volumeIndicators.obv.enabled) {
      scores.volume = this.calculateVolumeScore(candleData);
    }
    
    return scores;
  }
  
  /**
   * Calculate a composite score from individual indicator scores
   * Returns a value between -1 and 1
   */
  private calculateCompositeScore(scores: Record<string, number>): number {
    const weights = this.params.parameters.indicatorWeights;
    let compositeScore = 0;
    
    // Apply weights to each category
    for (const [category, score] of Object.entries(scores)) {
      if (weights[category] !== undefined) {
        compositeScore += score * weights[category];
      }
    }
    
    // Ensure the score is between -1 and 1
    return Math.max(-1, Math.min(1, compositeScore));
  }
  
  /**
   * Calculate EMA (Exponential Moving Average) score
   * Simplified implementation for demo purposes
   */
  private calculateEMAScore(candleData: MarketData['candles']): number {
    const prices = candleData.close;
    const length = prices.length;
    
    // Need enough data for the longest EMA period
    if (length < 200) {
      return 0;
    }
    
    // Simplified EMA calculation - in production would use a technical analysis library
    const currentPrice = prices[length - 1];
    const ema20 = this.simpleAverage(prices.slice(length - 20));
    const ema50 = this.simpleAverage(prices.slice(length - 50));
    const ema200 = this.simpleAverage(prices.slice(length - 200));
    
    // Calculate score based on EMA crossovers and price position
    let score = 0;
    
    // Price above/below EMAs
    score += currentPrice > ema20 ? 0.2 : -0.2;
    score += currentPrice > ema50 ? 0.3 : -0.3;
    score += currentPrice > ema200 ? 0.5 : -0.5;
    
    // EMA alignments (golden cross, death cross)
    score += ema20 > ema50 ? 0.3 : -0.3;
    score += ema50 > ema200 ? 0.5 : -0.5;
    
    // Normalize score to -1 to 1 range
    return Math.max(-1, Math.min(1, score / 1.8));
  }
  
  /**
   * Calculate RSI (Relative Strength Index) score
   * Simplified implementation for demo purposes
   */
  private calculateRSIScore(candleData: MarketData['candles']): number {
    const prices = candleData.close;
    const length = prices.length;
    const rsiPeriod = this.params.parameters.momentumIndicators.rsi.period;
    
    if (length < rsiPeriod + 1) {
      return 0;
    }
    
    // Simplified RSI calculation - in production would use a technical analysis library
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < rsiPeriod + 1; i++) {
      const diff = prices[length - i] - prices[length - i - 1];
      if (diff >= 0) {
        gains.push(diff);
        losses.push(0);
      } else {
        gains.push(0);
        losses.push(Math.abs(diff));
      }
    }
    
    const avgGain = this.simpleAverage(gains);
    const avgLoss = this.simpleAverage(losses);
    
    // Avoid division by zero
    if (avgLoss === 0) {
      return 1; // Full bull if no losses
    }
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    // Convert RSI (0-100) to score (-1 to 1)
    const overbought = this.params.parameters.momentumIndicators.rsi.overbought;
    const oversold = this.params.parameters.momentumIndicators.rsi.oversold;
    
    if (rsi > overbought) {
      // Overbought - bearish signal
      return -((rsi - overbought) / (100 - overbought));
    } else if (rsi < oversold) {
      // Oversold - bullish signal
      return (oversold - rsi) / oversold;
    } else {
      // Neutral zone - proportional signal
      return 2 * ((rsi - oversold) / (overbought - oversold) - 0.5);
    }
  }
  
  /**
   * Calculate Bollinger Bands score
   * Simplified implementation for demo purposes
   */
  private calculateBollingerBandsScore(candleData: MarketData['candles']): number {
    const prices = candleData.close;
    const length = prices.length;
    const period = this.params.parameters.volatilityIndicators.bollingerBands.period;
    const stdDev = this.params.parameters.volatilityIndicators.bollingerBands.standardDeviations;
    
    if (length < period) {
      return 0;
    }
    
    // Calculate SMA and standard deviation
    const recentPrices = prices.slice(length - period);
    const sma = this.simpleAverage(recentPrices);
    const standardDeviation = this.standardDeviation(recentPrices);
    
    // Calculate bands
    const upperBand = sma + (standardDeviation * stdDev);
    const lowerBand = sma - (standardDeviation * stdDev);
    
    // Current price
    const currentPrice = prices[length - 1];
    
    // Calculate bandwidth and %B
    const bandwidth = (upperBand - lowerBand) / sma;
    const percentB = (currentPrice - lowerBand) / (upperBand - lowerBand);
    
    // Score based on position within bands
    if (currentPrice > upperBand) {
      // Price above upper band - overbought
      return -0.8 - 0.2 * (currentPrice - upperBand) / (upperBand * 0.03);
    } else if (currentPrice < lowerBand) {
      // Price below lower band - oversold
      return 0.8 + 0.2 * (lowerBand - currentPrice) / (lowerBand * 0.03);
    } else {
      // Price within bands - scale from -0.8 to 0.8
      return (percentB - 0.5) * 1.6;
    }
  }
  
  /**
   * Calculate volume score based on OBV (On-Balance Volume)
   * Simplified implementation for demo purposes
   */
  private calculateVolumeScore(candleData: MarketData['candles']): number {
    const prices = candleData.close;
    const volumes = candleData.volume;
    const length = prices.length;
    
    if (length < 20) {
      return 0;
    }
    
    // Simplified OBV calculation
    let obv = 0;
    let obvValues = [0];
    
    for (let i = 1; i < 20; i++) {
      const price = prices[length - i];
      const prevPrice = prices[length - i - 1];
      const volume = volumes[length - i];
      
      if (price > prevPrice) {
        obv += volume;
      } else if (price < prevPrice) {
        obv -= volume;
      }
      // If price is unchanged, OBV remains the same
      
      obvValues.push(obv);
    }
    
    // Calculate OBV trend
    const recentOBV = obvValues.slice(-5);
    const olderOBV = obvValues.slice(-10, -5);
    
    const recentAvg = this.simpleAverage(recentOBV);
    const olderAvg = this.simpleAverage(olderOBV);
    
    // Score based on OBV trend
    const obvTrend = (recentAvg - olderAvg) / Math.abs(olderAvg || 1);
    
    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, obvTrend * 5));
  }
  
  /**
   * Detect the current market regime
   */
  private detectMarketRegime(candleData: MarketData['candles']): 'trending' | 'ranging' | 'volatile' {
    const prices = candleData.close;
    const length = prices.length;
    
    if (length < 20) {
      return 'ranging'; // Default if not enough data
    }
    
    // Calculate volatility
    const recentPrices = prices.slice(length - 20);
    const std = this.standardDeviation(recentPrices);
    const mean = this.simpleAverage(recentPrices);
    const volatilityRatio = std / mean;
    
    // Calculate trend strength (using a simple directional movement)
    const priceChange = prices[length - 1] - prices[length - 20];
    const trendStrength = Math.abs(priceChange) / (std * Math.sqrt(20));
    
    if (volatilityRatio > 0.04) {
      return 'volatile';
    } else if (trendStrength > 1.5) {
      return 'trending';
    } else {
      return 'ranging';
    }
  }
  
  /**
   * Helper method to calculate simple average
   */
  private simpleAverage(data: number[]): number {
    if (data.length === 0) return 0;
    return data.reduce((sum, value) => sum + value, 0) / data.length;
  }
  
  /**
   * Helper method to calculate standard deviation
   */
  private standardDeviation(data: number[]): number {
    if (data.length <= 1) return 0;
    
    const avg = this.simpleAverage(data);
    const squareDiffs = data.map(value => {
      const diff = value - avg;
      return diff * diff;
    });
    
    const avgSquareDiff = this.simpleAverage(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
}
