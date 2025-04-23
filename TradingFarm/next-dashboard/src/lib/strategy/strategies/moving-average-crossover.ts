/**
 * Moving Average Crossover Strategy
 * 
 * A simple strategy that generates signals when fast MA crosses above/below slow MA.
 */

import { BaseStrategy } from '../base-strategy';
import { MarketData } from '@/types/exchange';
import { 
  SignalType, 
  Timeframe, 
  Signal, 
  StrategyMeta,
  RiskLevel
} from '../types';

export class MovingAverageCrossoverStrategy extends BaseStrategy {
  private fastMA: number[] = [];
  private slowMA: number[] = [];
  private previousCrossState: 'above' | 'below' | null = null;
  
  /**
   * Get strategy metadata
   */
  getMeta(): StrategyMeta {
    return {
      id: 'moving-average-crossover',
      name: 'Moving Average Crossover',
      description: 'Generates signals when the fast moving average crosses above or below the slow moving average.',
      version: '1.0.0',
      author: 'Trading Farm',
      tags: ['Technical', 'Trend Following', 'Moving Average'],
      parameters: [
        {
          id: 'fastPeriod',
          name: 'Fast MA Period',
          description: 'Period for the fast moving average',
          type: 'number',
          default: 20,
          min: 2,
          max: 200,
          step: 1,
          isRequired: true,
          isAdvanced: false
        },
        {
          id: 'slowPeriod',
          name: 'Slow MA Period',
          description: 'Period for the slow moving average',
          type: 'number',
          default: 50,
          min: 5,
          max: 200,
          step: 1,
          isRequired: true,
          isAdvanced: false
        },
        {
          id: 'maType',
          name: 'MA Type',
          description: 'Type of moving average to use',
          type: 'select',
          default: 'sma',
          options: ['sma', 'ema', 'wma'],
          isRequired: true,
          isAdvanced: false
        },
        {
          id: 'stopLossPercentage',
          name: 'Stop Loss Percentage',
          description: 'Percentage from entry price for stop loss',
          type: 'number',
          default: 2,
          min: 0.1,
          max: 20,
          step: 0.1,
          unit: '%',
          isRequired: false,
          isAdvanced: false
        },
        {
          id: 'takeProfitPercentage',
          name: 'Take Profit Percentage',
          description: 'Percentage from entry price for take profit',
          type: 'number',
          default: 5,
          min: 0.1,
          max: 50,
          step: 0.1,
          unit: '%',
          isRequired: false,
          isAdvanced: false
        },
        {
          id: 'signalConfirmation',
          name: 'Signal Confirmation',
          description: 'Require additional confirmation for signals',
          type: 'boolean',
          default: false,
          isRequired: false,
          isAdvanced: true
        }
      ],
      requiredDataFeeds: ['OHLCV'],
      defaultTimeframe: Timeframe.H1,
      maximumBars: 200,
      riskProfileCompatibility: [
        RiskLevel.CONSERVATIVE,
        RiskLevel.MODERATE,
        RiskLevel.AGGRESSIVE
      ]
    };
  }
  
  /**
   * Process market data and generate signals
   */
  async process(marketData: MarketData[], timeframe: Timeframe): Promise<Signal[]> {
    if (!this.initialized) {
      throw new Error('Strategy not initialized. Call initialize() first.');
    }
    
    // Ensure we're working with the right timeframe
    const meta = this.getMeta();
    if (timeframe !== meta.defaultTimeframe) {
      console.warn(`Warning: Strategy is optimized for ${meta.defaultTimeframe} timeframe, but received ${timeframe}`);
    }
    
    const signals: Signal[] = [];
    
    // We need a minimum amount of data to calculate MAs
    const fastPeriod = this.parameters.fastPeriod as number;
    const slowPeriod = this.parameters.slowPeriod as number;
    const maxPeriod = Math.max(fastPeriod, slowPeriod);
    
    // Process each symbol separately
    const symbols = [...new Set(marketData.map(data => data.symbol))];
    
    for (const symbol of symbols) {
      // Filter data for this symbol and sort by timestamp
      const symbolData = marketData
        .filter(data => data.symbol === symbol)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Skip if insufficient data
      if (symbolData.length < maxPeriod + 1) {
        console.warn(`Not enough data for ${symbol} to calculate moving averages`);
        continue;
      }
      
      // Get close prices
      const prices = symbolData.map(data => data.price);
      
      // Calculate moving averages
      const maType = this.parameters.maType as string;
      this.fastMA = this.calculateMA(prices, fastPeriod, maType);
      this.slowMA = this.calculateMA(prices, slowPeriod, maType);
      
      // We need at least 2 MA points to detect a crossover
      if (this.fastMA.length < 2 || this.slowMA.length < 2) {
        continue;
      }
      
      // Check for crossovers
      const currentFast = this.fastMA[this.fastMA.length - 1];
      const currentSlow = this.slowMA[this.slowMA.length - 1];
      const previousFast = this.fastMA[this.fastMA.length - 2];
      const previousSlow = this.slowMA[this.slowMA.length - 2];
      
      // Determine current cross state
      const currentCrossState = currentFast > currentSlow ? 'above' : 'below';
      
      // If first run, just store the state
      if (this.previousCrossState === null) {
        this.previousCrossState = currentCrossState;
        continue;
      }
      
      // Check for a crossover
      if (currentCrossState !== this.previousCrossState) {
        // Golden cross (bullish): fast MA crosses above slow MA
        if (currentCrossState === 'above') {
          const signalStrength = this.calculateSignalStrength(currentFast, currentSlow, 'buy');
          
          // Calculate stop loss and take profit levels
          const currentPrice = symbolData[symbolData.length - 1].price;
          const stopLossPercentage = this.parameters.stopLossPercentage as number || 2;
          const takeProfitPercentage = this.parameters.takeProfitPercentage as number || 5;
          
          const stopLossPrice = currentPrice * (1 - stopLossPercentage / 100);
          const takeProfitPrice = currentPrice * (1 + takeProfitPercentage / 100);
          
          // Generate buy signal
          signals.push({
            type: signalStrength > 75 ? SignalType.STRONG_BUY : SignalType.BUY,
            symbol,
            timestamp: symbolData[symbolData.length - 1].timestamp,
            price: currentPrice,
            strength: signalStrength,
            timeframe,
            strategyId: this.getMeta().id,
            metadata: {
              fastMA: currentFast,
              slowMA: currentSlow,
              fastPeriod,
              slowPeriod,
              stopLoss: stopLossPrice,
              takeProfit: takeProfitPrice
            }
          });
        }
        // Death cross (bearish): fast MA crosses below slow MA
        else {
          const signalStrength = this.calculateSignalStrength(currentFast, currentSlow, 'sell');
          
          const currentPrice = symbolData[symbolData.length - 1].price;
          
          // Generate sell signal
          signals.push({
            type: signalStrength > 75 ? SignalType.STRONG_SELL : SignalType.SELL,
            symbol,
            timestamp: symbolData[symbolData.length - 1].timestamp,
            price: currentPrice,
            strength: signalStrength,
            timeframe,
            strategyId: this.getMeta().id,
            metadata: {
              fastMA: currentFast,
              slowMA: currentSlow,
              fastPeriod,
              slowPeriod
            }
          });
        }
        
        // Update cross state
        this.previousCrossState = currentCrossState;
      }
    }
    
    return signals;
  }
  
  /**
   * Calculate moving average based on type
   */
  private calculateMA(prices: number[], period: number, type: string = 'sma'): number[] {
    if (prices.length < period) {
      return [];
    }
    
    const result: number[] = [];
    
    switch (type) {
      case 'sma':
        // Simple Moving Average
        for (let i = period - 1; i < prices.length; i++) {
          const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
          result.push(sum / period);
        }
        break;
        
      case 'ema':
        // Exponential Moving Average
        const multiplier = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
        result.push(ema);
        
        for (let i = period; i < prices.length; i++) {
          ema = (prices[i] - ema) * multiplier + ema;
          result.push(ema);
        }
        break;
        
      case 'wma':
        // Weighted Moving Average
        for (let i = period - 1; i < prices.length; i++) {
          let sum = 0;
          let weightSum = 0;
          
          for (let j = 0; j < period; j++) {
            const weight = period - j;
            sum += prices[i - j] * weight;
            weightSum += weight;
          }
          
          result.push(sum / weightSum);
        }
        break;
        
      default:
        throw new Error(`Unsupported MA type: ${type}`);
    }
    
    return result;
  }
  
  /**
   * Calculate signal strength (0-100)
   */
  private calculateSignalStrength(fastMA: number, slowMA: number, signalType: 'buy' | 'sell'): number {
    // Calculate percentage difference between fast and slow MA
    const diff = Math.abs(fastMA - slowMA) / slowMA * 100;
    
    // Normalize to 0-100 scale (max difference considered is 5%)
    const normalizedDiff = Math.min(diff / 5 * 100, 100);
    
    // Apply additional factors based on signal type
    if (signalType === 'buy' && this.parameters.signalConfirmation) {
      // Additional confirmation for buy signals
      return normalizedDiff * 0.8; // Reduce strength if confirmation is required
    }
    
    return normalizedDiff;
  }
}
