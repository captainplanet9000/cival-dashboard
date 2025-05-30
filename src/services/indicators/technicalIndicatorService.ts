import {
  SMA, EMA, WMA, MACD, RSI, BollingerBands, ADL, ADX, 
  ATR, CCI, ROC, StochasticRSI, VWAP, IchimokuCloud
} from 'technicalindicators';
import { logger } from '../../utils/logger';
import { memoize } from '../../utils/cache';

// Define candle interface for OHLCV data
interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Format candles for indicator functions
function formatCandlesForIndicator(candles: Candle[]): any {
  return {
    open: candles.map(candle => candle.open),
    high: candles.map(candle => candle.high),
    low: candles.map(candle => candle.low),
    close: candles.map(candle => candle.close),
    volume: candles.map(candle => candle.volume),
    timestamp: candles.map(candle => candle.timestamp),
  };
}

/**
 * Calculate Simple Moving Average (SMA)
 * @param candles Array of candles
 * @param period Period to calculate SMA for
 * @param field Field to use for calculation (default: 'close')
 * @returns Array of SMA values
 */
export function calculateSMA(candles: Candle[], period: number, field: string = 'close'): number[] {
  try {
    const values = candles.map(candle => candle[field as keyof Candle] as number);
    
    const result = SMA.calculate({
      period,
      values,
    });
    
    return result;
  } catch (error: any) {
    logger.error('Error calculating SMA:', { error: error.message, period, field });
    return [];
  }
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param candles Array of candles
 * @param period Period to calculate EMA for
 * @param field Field to use for calculation (default: 'close')
 * @returns Array of EMA values
 */
export function calculateEMA(candles: Candle[], period: number, field: string = 'close'): number[] {
  try {
    const values = candles.map(candle => candle[field as keyof Candle] as number);
    
    const result = EMA.calculate({
      period,
      values,
    });
    
    return result;
  } catch (error: any) {
    logger.error('Error calculating EMA:', { error: error.message, period, field });
    return [];
  }
}

/**
 * Calculate Moving Average Convergence Divergence (MACD)
 * @param candles Array of candles
 * @param fastPeriod Fast period (default: 12)
 * @param slowPeriod Slow period (default: 26)
 * @param signalPeriod Signal period (default: 9)
 * @param field Field to use for calculation (default: 'close')
 * @returns MACD results
 */
export function calculateMACD(
  candles: Candle[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9,
  field: string = 'close'
): any {
  try {
    const values = candles.map(candle => candle[field as keyof Candle] as number);
    
    const result = MACD.calculate({
      fastPeriod,
      slowPeriod,
      signalPeriod,
      values,
    });
    
    return result;
  } catch (error: any) {
    logger.error('Error calculating MACD:', { 
      error: error.message, 
      fastPeriod, 
      slowPeriod, 
      signalPeriod, 
      field 
    });
    return [];
  }
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param candles Array of candles
 * @param period Period to calculate RSI for (default: 14)
 * @param field Field to use for calculation (default: 'close')
 * @returns Array of RSI values
 */
export function calculateRSI(candles: Candle[], period: number = 14, field: string = 'close'): number[] {
  try {
    const values = candles.map(candle => candle[field as keyof Candle] as number);
    
    const result = RSI.calculate({
      period,
      values,
    });
    
    return result;
  } catch (error: any) {
    logger.error('Error calculating RSI:', { error: error.message, period, field });
    return [];
  }
}

/**
 * Calculate Bollinger Bands
 * @param candles Array of candles
 * @param period Period to calculate Bollinger Bands for (default: 20)
 * @param stdDev Standard deviation multiplier (default: 2)
 * @param field Field to use for calculation (default: 'close')
 * @returns Bollinger Bands results
 */
export function calculateBollingerBands(
  candles: Candle[], 
  period: number = 20, 
  stdDev: number = 2,
  field: string = 'close'
): any {
  try {
    const values = candles.map(candle => candle[field as keyof Candle] as number);
    
    const result = BollingerBands.calculate({
      period,
      values,
      stdDev,
    });
    
    return result;
  } catch (error: any) {
    logger.error('Error calculating Bollinger Bands:', { 
      error: error.message, 
      period, 
      stdDev, 
      field 
    });
    return [];
  }
}

/**
 * Calculate Average Directional Index (ADX)
 * @param candles Array of candles
 * @param period Period to calculate ADX for (default: 14)
 * @returns ADX results
 */
export function calculateADX(candles: Candle[], period: number = 14): any {
  try {
    const formattedCandles = formatCandlesForIndicator(candles);
    
    const result = ADX.calculate({
      period,
      high: formattedCandles.high,
      low: formattedCandles.low,
      close: formattedCandles.close,
    });
    
    return result;
  } catch (error: any) {
    logger.error('Error calculating ADX:', { error: error.message, period });
    return [];
  }
}

/**
 * Calculate Ichimoku Cloud
 * @param candles Array of candles
 * @param conversionPeriod Conversion period (default: 9)
 * @param basePeriod Base period (default: 26)
 * @param spanPeriod Span period (default: 52)
 * @param displacement Displacement (default: 26)
 * @returns Ichimoku Cloud results
 */
export function calculateIchimokuCloud(
  candles: Candle[], 
  conversionPeriod: number = 9, 
  basePeriod: number = 26,
  spanPeriod: number = 52,
  displacement: number = 26
): any {
  try {
    const formattedCandles = formatCandlesForIndicator(candles);
    
    const result = IchimokuCloud.calculate({
      conversionPeriod,
      basePeriod,
      spanPeriod,
      displacement,
      high: formattedCandles.high,
      low: formattedCandles.low,
    });
    
    return result;
  } catch (error: any) {
    logger.error('Error calculating Ichimoku Cloud:', { 
      error: error.message, 
      conversionPeriod, 
      basePeriod,
      spanPeriod,
      displacement
    });
    return [];
  }
}

// Create memoized versions of compute-intensive indicators
export const memoizedBollingerBands = memoize(calculateBollingerBands);
export const memoizedIchimokuCloud = memoize(calculateIchimokuCloud);

// Export all indicators with a single interface
export default {
  sma: calculateSMA,
  ema: calculateEMA,
  macd: calculateMACD,
  rsi: calculateRSI,
  bollingerBands: calculateBollingerBands,
  adx: calculateADX,
  ichimokuCloud: calculateIchimokuCloud,
  // Memoized versions
  memoized: {
    bollingerBands: memoizedBollingerBands,
    ichimokuCloud: memoizedIchimokuCloud,
  }
}; 