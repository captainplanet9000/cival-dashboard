export interface PositionSizingConfig {
  accountSize: number;
  riskPerTrade: number; // Percentage of account to risk per trade
  maxPositionSize: number; // Maximum percentage of account for a single position
  volatilityLookback: number; // Number of periods to calculate volatility
  volatilityMultiplier: number; // Multiplier for position sizing based on volatility
  useATR: boolean; // Whether to use Average True Range for volatility
  useVolatilityPositionSizing: boolean; // Enable/disable volatility-based sizing
}

export interface PositionSizingResult {
  positionSize: number; // In quote currency (e.g., USD)
  positionSizePercentage: number; // As percentage of account
  positionSizeUnits: number; // Number of units/shares/contracts
  stopLossPrice: number | null;
  riskAmount: number; // Amount at risk in quote currency
  riskPercentage: number; // Risk as percentage of account
  volatilityFactor: number; // Volatility adjustment factor applied
  leverageUsed: number; // If applicable
}

export interface PriceData {
  high: number;
  low: number;
  close: number;
  date: Date;
}

class PositionSizingService {
  private static instance: PositionSizingService;
  
  private constructor() {}
  
  public static getInstance(): PositionSizingService {
    if (!PositionSizingService.instance) {
      PositionSizingService.instance = new PositionSizingService();
    }
    return PositionSizingService.instance;
  }
  
  /**
   * Calculate position size based on fixed percentage risk
   */
  public calculateFixedPercentagePosition(
    config: PositionSizingConfig,
    entryPrice: number,
    stopLossPrice: number | null,
    currentPrice: number,
    leverageAvailable: number = 1
  ): PositionSizingResult {
    const accountSize = config.accountSize;
    const riskPercentage = config.riskPerTrade;
    const riskAmount = (accountSize * riskPercentage) / 100;
    let positionSize: number;
    let stopDistance: number;
    
    if (stopLossPrice !== null) {
      // Calculate position size based on stop loss distance
      stopDistance = Math.abs((entryPrice - stopLossPrice) / entryPrice);
      positionSize = riskAmount / stopDistance;
    } else {
      // Default to fixed position size if no stop loss
      positionSize = accountSize * (riskPercentage / 100) * 10; // 10x the risk amount as a default
    }
    
    // Apply max position size constraint
    const maxAllowedPosition = accountSize * (config.maxPositionSize / 100);
    positionSize = Math.min(positionSize, maxAllowedPosition);
    
    // Apply leverage if available
    const leverageUsed = Math.min(
      leverageAvailable,
      positionSize / (accountSize * 0.05) // Limit leverage based on position size
    );
    
    if (leverageUsed > 1) {
      positionSize = positionSize * leverageUsed;
    }
    
    const positionSizePercentage = (positionSize / accountSize) * 100;
    const positionSizeUnits = positionSize / currentPrice;
    
    return {
      positionSize,
      positionSizePercentage,
      positionSizeUnits,
      stopLossPrice,
      riskAmount,
      riskPercentage,
      volatilityFactor: 1.0, // No volatility adjustment for fixed percentage
      leverageUsed
    };
  }
  
  /**
   * Calculate position size based on volatility (ATR or standard deviation)
   */
  public calculateVolatilityBasedPosition(
    config: PositionSizingConfig,
    entryPrice: number,
    currentPrice: number,
    historicalPrices: PriceData[],
    leverageAvailable: number = 1
  ): PositionSizingResult {
    // First calculate the base position using fixed percentage
    const fixedPositionResult = this.calculateFixedPercentagePosition(
      config,
      entryPrice,
      null, // We'll calculate stop loss based on volatility
      currentPrice,
      leverageAvailable
    );
    
    if (!config.useVolatilityPositionSizing) {
      return fixedPositionResult;
    }
    
    // Calculate volatility measure
    let volatility: number;
    let stopLossPrice: number | null = null;
    
    if (config.useATR && historicalPrices.length >= 2) {
      volatility = this.calculateATR(historicalPrices, config.volatilityLookback);
      
      // ATR-based stop loss
      const atrDistance = volatility * 2; // 2x ATR for stop loss
      stopLossPrice = entryPrice > currentPrice
        ? entryPrice - atrDistance // Long position
        : entryPrice + atrDistance; // Short position
    } else {
      volatility = this.calculateVolatility(
        historicalPrices.map(p => p.close),
        config.volatilityLookback
      );
      
      // Volatility-based stop loss
      const volDistance = currentPrice * volatility * 2; // 2x volatility for stop loss
      stopLossPrice = entryPrice > currentPrice
        ? entryPrice - volDistance // Long position
        : entryPrice + volDistance; // Short position
    }
    
    // Normalize volatility to a factor (higher volatility = smaller position)
    // Base volatility is considered 2% (0.02)
    const baseVolatility = 0.02;
    let volatilityFactor = baseVolatility / Math.max(volatility, 0.001);
    
    // Apply volatility multiplier from config
    volatilityFactor = volatilityFactor * config.volatilityMultiplier;
    
    // Constrain volatility factor to reasonable bounds
    volatilityFactor = Math.max(0.2, Math.min(volatilityFactor, 2.0));
    
    // Apply volatility factor to position size
    let positionSize = fixedPositionResult.positionSize * volatilityFactor;
    
    // Apply max position size constraint
    const maxAllowedPosition = config.accountSize * (config.maxPositionSize / 100);
    positionSize = Math.min(positionSize, maxAllowedPosition);
    
    // Calculate risk amount based on stop loss
    let riskAmount: number;
    if (stopLossPrice !== null) {
      const stopDistance = Math.abs((entryPrice - stopLossPrice) / entryPrice);
      riskAmount = positionSize * stopDistance;
    } else {
      riskAmount = fixedPositionResult.riskAmount;
    }
    
    const riskPercentage = (riskAmount / config.accountSize) * 100;
    const positionSizePercentage = (positionSize / config.accountSize) * 100;
    const positionSizeUnits = positionSize / currentPrice;
    
    return {
      positionSize,
      positionSizePercentage,
      positionSizeUnits,
      stopLossPrice,
      riskAmount,
      riskPercentage,
      volatilityFactor,
      leverageUsed: fixedPositionResult.leverageUsed
    };
  }
  
  /**
   * Calculate Average True Range (ATR)
   */
  private calculateATR(priceData: PriceData[], periods: number = 14): number {
    if (priceData.length < 2) {
      return 0;
    }
    
    const trueRanges: number[] = [];
    
    // Calculate true ranges
    for (let i = 1; i < priceData.length; i++) {
      const high = priceData[i].high;
      const low = priceData[i].low;
      const prevClose = priceData[i - 1].close;
      
      const tr1 = high - low; // Current high - current low
      const tr2 = Math.abs(high - prevClose); // Current high - previous close
      const tr3 = Math.abs(low - prevClose); // Current low - previous close
      
      const trueRange = Math.max(tr1, tr2, tr3);
      trueRanges.push(trueRange);
    }
    
    // Use only the most recent 'periods' true ranges
    const recentTrueRanges = trueRanges.slice(-periods);
    
    // Calculate average
    const atr = recentTrueRanges.reduce((sum, tr) => sum + tr, 0) / recentTrueRanges.length;
    
    // Return as percentage of current price
    return atr / priceData[priceData.length - 1].close;
  }
  
  /**
   * Calculate standard deviation of price changes (volatility)
   */
  private calculateVolatility(prices: number[], periods: number = 14): number {
    if (prices.length < 2) {
      return 0;
    }
    
    // Calculate returns
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const pctChange = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(pctChange);
    }
    
    // Use only the most recent 'periods' returns
    const recentReturns = returns.slice(-periods);
    
    // Calculate mean
    const mean = recentReturns.reduce((sum, ret) => sum + ret, 0) / recentReturns.length;
    
    // Calculate variance
    const variance = recentReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / recentReturns.length;
    
    // Return standard deviation
    return Math.sqrt(variance);
  }
  
  /**
   * Get default position sizing configuration
   */
  public getDefaultConfig(): PositionSizingConfig {
    return {
      accountSize: 10000,
      riskPerTrade: 2, // 2% risk per trade
      maxPositionSize: 20, // 20% of account maximum
      volatilityLookback: 14, // 14 periods for volatility calculation
      volatilityMultiplier: 1.0, // Default multiplier
      useATR: true, // Use ATR by default
      useVolatilityPositionSizing: true // Enable volatility-based sizing by default
    };
  }
}

export default PositionSizingService; 