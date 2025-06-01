import * as technicalIndicators from 'technicalindicators';
import { logger } from '../logging/winston-service';
import { cacheService } from '../cache/node-cache-service';
import { MarketData } from '../exchange/ccxt-service';

// Configure technical-indicators library
technicalIndicators.setConfig('precision', 8);

/**
 * Technical Indicators Service
 * Provides technical analysis functions for trading strategies
 */
export class TechnicalIndicatorService {
  private static instance: TechnicalIndicatorService;

  private constructor() {
    logger.info('Technical Indicator Service initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TechnicalIndicatorService {
    if (!TechnicalIndicatorService.instance) {
      TechnicalIndicatorService.instance = new TechnicalIndicatorService();
    }
    return TechnicalIndicatorService.instance;
  }

  /**
   * Convert OHLCV data to format needed by technical indicators
   */
  private formatCandlesForIndicators(candles: MarketData[]): {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
    timestamp: number[];
  } {
    return {
      open: candles.map(c => c.open),
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      close: candles.map(c => c.close),
      volume: candles.map(c => c.volume),
      timestamp: candles.map(c => c.timestamp)
    };
  }

  /**
   * Calculate Simple Moving Average (SMA)
   */
  public calculateSMA(
    candles: MarketData[],
    period: number,
    field: 'open' | 'high' | 'low' | 'close' = 'close'
  ): number[] {
    try {
      const cacheKey = `sma_${period}_${field}_${candles[0].symbol}_${candles[0].timestamp}-${candles[candles.length - 1].timestamp}`;
      const cachedResult = cacheService.get<number[]>(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }

      const values = candles.map(c => c[field]);
      
      const sma = technicalIndicators.SMA.calculate({
        period,
        values
      });

      cacheService.setShort(cacheKey, sma);
      return sma;
    } catch (error) {
      logger.error(`Error calculating SMA: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  public calculateEMA(
    candles: MarketData[],
    period: number,
    field: 'open' | 'high' | 'low' | 'close' = 'close'
  ): number[] {
    try {
      const cacheKey = `ema_${period}_${field}_${candles[0].symbol}_${candles[0].timestamp}-${candles[candles.length - 1].timestamp}`;
      const cachedResult = cacheService.get<number[]>(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }

      const values = candles.map(c => c[field]);
      
      const ema = technicalIndicators.EMA.calculate({
        period,
        values
      });

      cacheService.setShort(cacheKey, ema);
      return ema;
    } catch (error) {
      logger.error(`Error calculating EMA: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Calculate Relative Strength Index (RSI)
   */
  public calculateRSI(
    candles: MarketData[],
    period: number = 14,
    field: 'open' | 'high' | 'low' | 'close' = 'close'
  ): number[] {
    try {
      const cacheKey = `rsi_${period}_${field}_${candles[0].symbol}_${candles[0].timestamp}-${candles[candles.length - 1].timestamp}`;
      const cachedResult = cacheService.get<number[]>(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }

      const values = candles.map(c => c[field]);
      
      const rsi = technicalIndicators.RSI.calculate({
        period,
        values
      });

      cacheService.setShort(cacheKey, rsi);
      return rsi;
    } catch (error) {
      logger.error(`Error calculating RSI: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Calculate Moving Average Convergence Divergence (MACD)
   */
  public calculateMACD(
    candles: MarketData[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9,
    field: 'open' | 'high' | 'low' | 'close' = 'close'
  ): { MACD: number[]; signal: number[]; histogram: number[] } {
    try {
      const cacheKey = `macd_${fastPeriod}_${slowPeriod}_${signalPeriod}_${field}_${candles[0].symbol}_${candles[0].timestamp}-${candles[candles.length - 1].timestamp}`;
      const cachedResult = cacheService.get<{ MACD: number[]; signal: number[]; histogram: number[] }>(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }

      const values = candles.map(c => c[field]);
      
      const macd = technicalIndicators.MACD.calculate({
        fastPeriod,
        slowPeriod,
        signalPeriod,
        values
      });

      const result = {
        MACD: macd.map(m => m.MACD as number),
        signal: macd.map(m => m.signal as number),
        histogram: macd.map(m => m.histogram as number)
      };

      cacheService.setShort(cacheKey, result);
      return result;
    } catch (error) {
      logger.error(`Error calculating MACD: ${error instanceof Error ? error.message : String(error)}`);
      return { MACD: [], signal: [], histogram: [] };
    }
  }

  /**
   * Calculate Bollinger Bands
   */
  public calculateBollingerBands(
    candles: MarketData[],
    period: number = 20,
    stdDev: number = 2,
    field: 'open' | 'high' | 'low' | 'close' = 'close'
  ): { upper: number[]; middle: number[]; lower: number[] } {
    try {
      const cacheKey = `bb_${period}_${stdDev}_${field}_${candles[0].symbol}_${candles[0].timestamp}-${candles[candles.length - 1].timestamp}`;
      const cachedResult = cacheService.get<{ upper: number[]; middle: number[]; lower: number[] }>(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }

      const values = candles.map(c => c[field]);
      
      const bb = technicalIndicators.BollingerBands.calculate({
        period,
        stdDev,
        values
      });

      const result = {
        upper: bb.map(b => b.upper as number),
        middle: bb.map(b => b.middle as number),
        lower: bb.map(b => b.lower as number)
      };

      cacheService.setShort(cacheKey, result);
      return result;
    } catch (error) {
      logger.error(`Error calculating Bollinger Bands: ${error instanceof Error ? error.message : String(error)}`);
      return { upper: [], middle: [], lower: [] };
    }
  }

  /**
   * Calculate Stochastic Oscillator
   */
  public calculateStochastic(
    candles: MarketData[],
    period: number = 14,
    signalPeriod: number = 3
  ): { k: number[]; d: number[] } {
    try {
      const cacheKey = `stoch_${period}_${signalPeriod}_${candles[0].symbol}_${candles[0].timestamp}-${candles[candles.length - 1].timestamp}`;
      const cachedResult = cacheService.get<{ k: number[]; d: number[] }>(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }

      const formattedData = this.formatCandlesForIndicators(candles);
      
      const stoch = technicalIndicators.Stochastic.calculate({
        period,
        signalPeriod,
        high: formattedData.high,
        low: formattedData.low,
        close: formattedData.close
      });

      const result = {
        k: stoch.map(s => s.k as number),
        d: stoch.map(s => s.d as number)
      };

      cacheService.setShort(cacheKey, result);
      return result;
    } catch (error) {
      logger.error(`Error calculating Stochastic: ${error instanceof Error ? error.message : String(error)}`);
      return { k: [], d: [] };
    }
  }

  /**
   * Calculate Average True Range (ATR)
   */
  public calculateATR(
    candles: MarketData[],
    period: number = 14
  ): number[] {
    try {
      const cacheKey = `atr_${period}_${candles[0].symbol}_${candles[0].timestamp}-${candles[candles.length - 1].timestamp}`;
      const cachedResult = cacheService.get<number[]>(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }

      const formattedData = this.formatCandlesForIndicators(candles);
      
      const atr = technicalIndicators.ATR.calculate({
        period,
        high: formattedData.high,
        low: formattedData.low,
        close: formattedData.close
      });

      cacheService.setShort(cacheKey, atr);
      return atr;
    } catch (error) {
      logger.error(`Error calculating ATR: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Calculate On-Balance Volume (OBV)
   */
  public calculateOBV(candles: MarketData[]): number[] {
    try {
      const cacheKey = `obv_${candles[0].symbol}_${candles[0].timestamp}-${candles[candles.length - 1].timestamp}`;
      const cachedResult = cacheService.get<number[]>(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }

      const formattedData = this.formatCandlesForIndicators(candles);
      
      const obv = technicalIndicators.OBV.calculate({
        close: formattedData.close,
        volume: formattedData.volume
      });

      cacheService.setShort(cacheKey, obv);
      return obv;
    } catch (error) {
      logger.error(`Error calculating OBV: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Check if price crosses above a value
   */
  public crossedAbove(
    candles: MarketData[],
    values: number[],
    field: 'open' | 'high' | 'low' | 'close' = 'close'
  ): boolean[] {
    try {
      const prices = candles.map(c => c[field]);
      const result: boolean[] = [];
      
      for (let i = 1; i < prices.length; i++) {
        if (values[i - 1] !== undefined && values[i] !== undefined) {
          result.push(
            prices[i - 1] <= values[i - 1] && 
            prices[i] > values[i]
          );
        } else {
          result.push(false);
        }
      }
      
      return result;
    } catch (error) {
      logger.error(`Error checking crossedAbove: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Check if price crosses below a value
   */
  public crossedBelow(
    candles: MarketData[],
    values: number[],
    field: 'open' | 'high' | 'low' | 'close' = 'close'
  ): boolean[] {
    try {
      const prices = candles.map(c => c[field]);
      const result: boolean[] = [];
      
      for (let i = 1; i < prices.length; i++) {
        if (values[i - 1] !== undefined && values[i] !== undefined) {
          result.push(
            prices[i - 1] >= values[i - 1] && 
            prices[i] < values[i]
          );
        } else {
          result.push(false);
        }
      }
      
      return result;
    } catch (error) {
      logger.error(`Error checking crossedBelow: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Calculate a complete analysis for a symbol
   */
  public async calculateFullAnalysis(candles: MarketData[]): Promise<Record<string, any>> {
    try {
      if (!candles.length) {
        return {};
      }

      const analysis = {
        symbol: candles[0].symbol,
        exchange: candles[0].exchange,
        timestamp: candles[candles.length - 1].timestamp,
        price: candles[candles.length - 1].close,
        
        // Moving Averages
        sma20: this.calculateSMA(candles, 20).slice(-1)[0],
        sma50: this.calculateSMA(candles, 50).slice(-1)[0],
        sma200: this.calculateSMA(candles, 200).slice(-1)[0],
        ema20: this.calculateEMA(candles, 20).slice(-1)[0],
        ema50: this.calculateEMA(candles, 50).slice(-1)[0],
        
        // Oscillators
        rsi14: this.calculateRSI(candles).slice(-1)[0],
        
        // MACD
        macd: this.calculateMACD(candles).MACD.slice(-1)[0],
        macdSignal: this.calculateMACD(candles).signal.slice(-1)[0],
        macdHistogram: this.calculateMACD(candles).histogram.slice(-1)[0],
        
        // Bollinger Bands
        bbUpper: this.calculateBollingerBands(candles).upper.slice(-1)[0],
        bbMiddle: this.calculateBollingerBands(candles).middle.slice(-1)[0],
        bbLower: this.calculateBollingerBands(candles).lower.slice(-1)[0],
        
        // ATR
        atr: this.calculateATR(candles).slice(-1)[0],
        
        // Calculate trends
        trend: {
          shortTerm: candles[candles.length - 1].close > this.calculateEMA(candles, 20).slice(-1)[0] ? 'bullish' : 'bearish',
          mediumTerm: candles[candles.length - 1].close > this.calculateEMA(candles, 50).slice(-1)[0] ? 'bullish' : 'bearish',
          longTerm: candles[candles.length - 1].close > this.calculateSMA(candles, 200).slice(-1)[0] ? 'bullish' : 'bearish',
        },
        
        // Volatility
        volatility: {
          bollingerWidth: (this.calculateBollingerBands(candles).upper.slice(-1)[0] - 
                          this.calculateBollingerBands(candles).lower.slice(-1)[0]) / 
                          this.calculateBollingerBands(candles).middle.slice(-1)[0],
          atrPercent: this.calculateATR(candles).slice(-1)[0] / candles[candles.length - 1].close * 100
        }
      };

      return analysis;
    } catch (error) {
      logger.error(`Error generating full analysis: ${error instanceof Error ? error.message : String(error)}`);
      return {};
    }
  }
}

// Export singleton instance
export const technicalIndicatorService = TechnicalIndicatorService.getInstance();
