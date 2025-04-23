/**
 * Risk Manager Implementation
 * 
 * Core risk management logic for Trading Farm
 */

import { 
  RiskParameters, 
  PositionSizingResult, 
  RiskAssessment, 
  PortfolioRiskSnapshot,
  RiskLevel,
  RiskProfile,
  RISK_PRESETS
} from './types';
import { Order, MarketData, OrderParams } from '@/types/exchange';
import { createBrowserClient } from '@/utils/supabase/client';

interface PortfolioState {
  equity: number;                        // Total account equity
  openPositions: Order[];                // Currently open positions
  availableMargin: number;               // Available margin for trading
  dailyPnL: number;                      // Current day's profit/loss
  initialDailyEquity: number;            // Equity at start of day
  historicalVolatility: Record<string, number>; // Historical volatility by symbol
  symbolData: Record<string, MarketData>; // Current market data by symbol
  sectorExposure: Record<string, number>; // Current exposure by sector
}

/**
 * Risk Manager class that provides risk management functionality 
 * for the trading system
 */
export class RiskManager {
  private riskProfile: RiskProfile;
  private portfolioState: PortfolioState | null = null;
  private userId: string;
  
  /**
   * Create a new RiskManager instance
   * 
   * @param userId User ID for loading profile and permissions
   * @param riskProfileId Optional specific risk profile ID to use
   */
  constructor(userId: string, riskProfileId?: string) {
    this.userId = userId;
    
    // Initialize with default profile until actual profile is loaded
    this.riskProfile = {
      id: 'default',
      name: 'Default Profile',
      description: 'Default risk profile',
      level: RiskLevel.MODERATE,
      parameters: {
        ...RISK_PRESETS[RiskLevel.MODERATE],
        customRiskRules: {}
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: userId,
      isDefault: true
    };
    
    // Load risk profile asynchronously
    this.loadRiskProfile(riskProfileId);
  }
  
  /**
   * Load a risk profile from the database
   */
  private async loadRiskProfile(profileId?: string): Promise<void> {
    try {
      const supabase = createBrowserClient();
      
      let query = supabase
        .from('risk_profiles')
        .select('*')
        .eq('user_id', this.userId);
      
      if (profileId) {
        query = query.eq('id', profileId);
      } else {
        query = query.eq('is_default', true);
      }
      
      const { data, error } = await query.single();
      
      if (error) {
        console.error('Error loading risk profile:', error);
        return;
      }
      
      if (data) {
        this.riskProfile = {
          id: data.id,
          name: data.name,
          description: data.description,
          level: data.level as RiskLevel,
          parameters: data.parameters as RiskParameters,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          userId: data.user_id,
          isDefault: data.is_default
        };
      }
    } catch (error) {
      console.error('Error loading risk profile:', error);
    }
  }
  
  /**
   * Update the portfolio state with current market data and account information
   */
  public async updatePortfolioState(
    equity: number,
    openPositions: Order[],
    availableMargin: number,
    marketData: Record<string, MarketData>,
    sectorMapping: Record<string, string> = {}
  ): Promise<void> {
    const initialDailyEquity = this.portfolioState?.initialDailyEquity || equity;
    const dailyPnL = equity - initialDailyEquity;
    
    // Calculate sector exposure
    const sectorExposure: Record<string, number> = {};
    for (const position of openPositions) {
      const symbol = position.symbol;
      const sector = sectorMapping[symbol] || 'unknown';
      const exposure = position.size * (marketData[symbol]?.price || 0);
      
      sectorExposure[sector] = (sectorExposure[sector] || 0) + exposure;
    }
    
    // Update portfolio state
    this.portfolioState = {
      equity,
      openPositions,
      availableMargin,
      dailyPnL,
      initialDailyEquity,
      historicalVolatility: this.portfolioState?.historicalVolatility || {},
      symbolData: marketData,
      sectorExposure
    };
  }
  
  /**
   * Calculate the recommended position size for a trade
   */
  public calculatePositionSize(
    symbol: string,
    price: number,
    stopLossPercent: number = this.riskProfile.parameters.stopLossPercentage,
    maxRiskPercent: number = 1.0
  ): PositionSizingResult {
    if (!this.portfolioState) {
      throw new Error('Portfolio state not initialized. Call updatePortfolioState first.');
    }
    
    const equity = this.portfolioState.equity;
    const availableMargin = this.portfolioState.availableMargin;
    
    // Calculate the dollar risk amount
    const maxRiskAmount = equity * (maxRiskPercent / 100);
    const stopLossAmount = price * (stopLossPercent / 100);
    
    // Calculate position size based on risk amount
    const riskBasedSize = maxRiskAmount / stopLossAmount;
    
    // Calculate position size based on max position size parameter
    const maxPositionSizePercent = this.riskProfile.parameters.maxPositionSize;
    const percentBasedSize = (equity * (maxPositionSizePercent / 100)) / price;
    
    // Calculate absolute position size limit
    const absoluteBasedSize = this.riskProfile.parameters.maxPositionSizeAbsolute / price;
    
    // Calculate position size based on available margin
    const marginBasedSize = availableMargin / price;
    
    // Take the minimum of all calculations
    const recommendedSize = Math.min(
      riskBasedSize,
      percentBasedSize,
      absoluteBasedSize,
      marginBasedSize
    );
    
    // Determine which factor is limiting the position size
    let limitingFactor: string | null = null;
    if (recommendedSize === riskBasedSize) {
      limitingFactor = 'Risk amount';
    } else if (recommendedSize === percentBasedSize) {
      limitingFactor = 'Position size percentage';
    } else if (recommendedSize === absoluteBasedSize) {
      limitingFactor = 'Absolute position size limit';
    } else if (recommendedSize === marginBasedSize) {
      limitingFactor = 'Available margin';
    }
    
    return {
      recommendedPositionSize: recommendedSize,
      maxAllowedPositionSize: Math.min(percentBasedSize, absoluteBasedSize, marginBasedSize),
      sizeReason: `Position size determined by ${limitingFactor?.toLowerCase()}`,
      riskAmount: recommendedSize * stopLossAmount,
      riskPercentage: (recommendedSize * stopLossAmount) / equity * 100,
      leverageUsed: null, // To be calculated if using leverage
      isWithinLimits: true,
      limitingFactor
    };
  }
  
  /**
   * Assess the risk of a trading order before execution
   */
  public assessTrade(params: OrderParams, marketData: MarketData): RiskAssessment {
    if (!this.portfolioState) {
      throw new Error('Portfolio state not initialized. Call updatePortfolioState first.');
    }
    
    const { parameters } = this.riskProfile;
    const portfolioState = this.portfolioState;
    const equity = portfolioState.equity;
    const symbol = params.symbol;
    const price = params.price || marketData.price;
    
    // Initialize result arrays
    const reasons: string[] = [];
    const warnings: string[] = [];
    
    // Initialize risk score
    let riskScore = 50; // Start with a neutral score
    
    // Check if we're within trading hours
    const isWithinTradingHours = this.checkTradingHours();
    if (!isWithinTradingHours) {
      reasons.push('Outside of allowed trading hours');
      riskScore += 20;
    }
    
    // Check if we've hit a circuit breaker
    const hasCircuitBreaker = this.checkCircuitBreakers();
    if (hasCircuitBreaker) {
      reasons.push('Circuit breaker triggered - trading halted');
      riskScore += 30;
    }
    
    // Check the max open positions limit
    const openPositionsCount = portfolioState.openPositions.length;
    if (openPositionsCount >= parameters.maxOpenPositions) {
      reasons.push(`Maximum open positions limit reached (${parameters.maxOpenPositions})`);
      riskScore += 15;
    }
    
    // Check symbol exposure
    const currentSymbolExposure = this.calculateSymbolExposure(symbol);
    const symbolExposurePercent = (currentSymbolExposure / equity) * 100;
    if (symbolExposurePercent >= parameters.maxSymbolExposure) {
      reasons.push(`Maximum exposure to ${symbol} reached (${parameters.maxSymbolExposure}%)`);
      riskScore += 15;
    }
    
    // Check sector exposure
    const symbolSector = this.getSymbolSector(symbol);
    const currentSectorExposure = portfolioState.sectorExposure[symbolSector] || 0;
    const sectorExposurePercent = (currentSectorExposure / equity) * 100;
    if (sectorExposurePercent >= parameters.maxSectorExposure) {
      reasons.push(`Maximum exposure to ${symbolSector} sector reached (${parameters.maxSectorExposure}%)`);
      riskScore += 10;
    }
    
    // Check diversification
    const uniqueAssets = new Set(portfolioState.openPositions.map(p => p.symbol));
    if (uniqueAssets.size < parameters.minDiversificationCount) {
      warnings.push(`Portfolio diversification below minimum (${uniqueAssets.size}/${parameters.minDiversificationCount})`);
      riskScore += 5;
    }
    
    // Calculate position sizing
    const stopLossPercent = params.stopLossPercent || parameters.stopLossPercentage;
    const positionSizing = this.calculatePositionSize(symbol, price, stopLossPercent);
    
    // Check if requested size exceeds recommended size
    const requestedSize = params.quantity;
    if (requestedSize > positionSizing.recommendedPositionSize) {
      warnings.push(`Requested position size (${requestedSize}) exceeds recommended size (${positionSizing.recommendedPositionSize.toFixed(4)})`);
      riskScore += 10;
    }
    
    // Calculate stop loss price
    const isBuy = params.side === 'buy';
    const stopLossPrice = isBuy
      ? price * (1 - stopLossPercent / 100)
      : price * (1 + stopLossPercent / 100);
    
    // Calculate take profit price (assuming 2:1 reward/risk by default)
    const takeProfitPercent = stopLossPercent * 2; 
    const takeProfitPrice = isBuy
      ? price * (1 + takeProfitPercent / 100)
      : price * (1 - takeProfitPercent / 100);
    
    // Determine if trade is allowed
    const isAllowed = reasons.length === 0;
    
    return {
      isAllowed,
      riskScore: Math.min(100, Math.max(0, riskScore)),
      positionSizing,
      reasons,
      warnings,
      stopLossPrice,
      takeProfitPrice,
      adjustedParameters: {}
    };
  }
  
  /**
   * Check if the current time is within allowed trading hours
   */
  private checkTradingHours(): boolean {
    const { parameters } = this.riskProfile;
    const now = new Date();
    
    // Check excluded days
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    if (parameters.excludedDays.includes(dayOfWeek)) {
      return false;
    }
    
    // Parse trading hours
    const [startHour, startMinute] = parameters.tradingHoursStart.split(':').map(Number);
    const [endHour, endMinute] = parameters.tradingHoursEnd.split(':').map(Number);
    
    // Convert current time to minutes since midnight
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    // Convert trading hours to minutes since midnight
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    
    // Check if current time is within trading hours
    return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
  }
  
  /**
   * Check if any circuit breakers have been triggered
   */
  private checkCircuitBreakers(): boolean {
    if (!this.portfolioState) return false;
    
    const { parameters } = this.riskProfile;
    const { dailyPnL, equity } = this.portfolioState;
    
    // Check daily loss circuit breaker
    const dailyLossPercent = (dailyPnL / equity) * -100;
    if (dailyPnL < 0 && dailyLossPercent >= parameters.dailyLossCircuitBreaker) {
      return true;
    }
    
    // Check volatility circuit breaker
    // This would require historical volatility calculation
    // which we're not implementing in this basic version
    
    return false;
  }
  
  /**
   * Calculate current exposure to a symbol
   */
  private calculateSymbolExposure(symbol: string): number {
    if (!this.portfolioState) return 0;
    
    const { openPositions, symbolData } = this.portfolioState;
    
    let exposure = 0;
    for (const position of openPositions) {
      if (position.symbol === symbol) {
        // Use current price if available, otherwise use position's price
        const currentPrice = symbolData[symbol]?.price || position.price;
        exposure += position.size * currentPrice;
      }
    }
    
    return exposure;
  }
  
  /**
   * Get the sector for a symbol
   */
  private getSymbolSector(symbol: string): string {
    // In a real implementation, this would lookup the sector from a reference database
    // For now, we'll extract the base asset as a simple approximation
    
    // For crypto, split by / or -
    if (symbol.includes('/')) {
      return symbol.split('/')[0];
    }
    
    if (symbol.includes('-')) {
      return symbol.split('-')[0];
    }
    
    // For stocks, return first two characters as "sector" (very simplified)
    return symbol.substring(0, 2);
  }
  
  /**
   * Create a risk snapshot of the current portfolio
   */
  public createPortfolioRiskSnapshot(): PortfolioRiskSnapshot {
    if (!this.portfolioState) {
      throw new Error('Portfolio state not initialized. Call updatePortfolioState first.');
    }
    
    const { equity, openPositions, symbolData, sectorExposure } = this.portfolioState;
    
    // Calculate total exposure
    let totalExposure = 0;
    const exposureBySymbol: Record<string, number> = {};
    
    for (const position of openPositions) {
      const symbol = position.symbol;
      const currentPrice = symbolData[symbol]?.price || position.price;
      const positionExposure = position.size * currentPrice;
      
      totalExposure += positionExposure;
      exposureBySymbol[symbol] = positionExposure;
    }
    
    // Calculate drawdown (simplified)
    const initialEquity = this.portfolioState.initialDailyEquity;
    const currentDrawdown = initialEquity > equity 
      ? ((initialEquity - equity) / initialEquity) * 100
      : 0;
    
    // Create a simplified correlation matrix
    // In a real implementation, this would use historical price data
    const correlationMatrix: Record<string, Record<string, number>> = {};
    const symbols = Object.keys(exposureBySymbol);
    
    for (const symbol1 of symbols) {
      correlationMatrix[symbol1] = {};
      for (const symbol2 of symbols) {
        // Set self-correlation to 1, otherwise use a placeholder value
        correlationMatrix[symbol1][symbol2] = symbol1 === symbol2 ? 1 : 0.5;
      }
    }
    
    // Calculate a simplistic risk score
    const riskScore = this.calculatePortfolioRiskScore(totalExposure, equity, currentDrawdown);
    
    // Calculate diversification score
    const diversificationScore = this.calculateDiversificationScore(symbols.length, Object.keys(sectorExposure).length);
    
    return {
      timestamp: Date.now(),
      totalEquity: equity,
      totalExposure,
      currentDrawdown,
      exposureBySymbol,
      exposureBySector: sectorExposure,
      leverageUtilization: totalExposure > 0 ? (totalExposure / equity) * 100 : 0,
      riskScore,
      diversificationScore,
      correlationMatrix,
      circuitBreakerWarnings: this.getActiveCircuitBreakers()
    };
  }
  
  /**
   * Calculate a risk score for the portfolio (0-100)
   */
  private calculatePortfolioRiskScore(exposure: number, equity: number, drawdown: number): number {
    // Simplified calculation
    let score = 0;
    
    // Exposure ratio component (0-40 points)
    const exposureRatio = exposure / equity;
    score += Math.min(40, exposureRatio * 40);
    
    // Drawdown component (0-30 points)
    score += Math.min(30, drawdown * 2);
    
    // Diversification component (0-30 points)
    if (this.portfolioState) {
      const uniqueAssets = new Set(this.portfolioState.openPositions.map(p => p.symbol)).size;
      const minDiversification = this.riskProfile.parameters.minDiversificationCount;
      
      if (uniqueAssets < minDiversification) {
        score += 30 * (1 - uniqueAssets / minDiversification);
      }
    }
    
    return Math.min(100, score);
  }
  
  /**
   * Calculate a diversification score (0-100)
   */
  private calculateDiversificationScore(symbolCount: number, sectorCount: number): number {
    const { parameters } = this.riskProfile;
    const minDiversification = parameters.minDiversificationCount;
    
    // Symbol diversification (0-50 points)
    const symbolScore = Math.min(50, (symbolCount / minDiversification) * 50);
    
    // Sector diversification (0-50 points)
    const sectorScore = Math.min(50, (sectorCount / (minDiversification / 2)) * 50);
    
    return symbolScore + sectorScore;
  }
  
  /**
   * Get a list of active circuit breaker warnings
   */
  private getActiveCircuitBreakers(): string[] {
    const warnings: string[] = [];
    if (!this.portfolioState) return warnings;
    
    const { parameters } = this.riskProfile;
    const { dailyPnL, equity } = this.portfolioState;
    
    // Check daily loss circuit breaker
    const dailyLossPercent = (dailyPnL / equity) * -100;
    if (dailyPnL < 0 && dailyLossPercent >= parameters.dailyLossCircuitBreaker) {
      warnings.push(`Daily loss limit (${parameters.dailyLossCircuitBreaker}%) reached: ${dailyLossPercent.toFixed(2)}%`);
    }
    
    return warnings;
  }
  
  /**
   * Apply safety measures to an order based on risk parameters
   */
  public enhanceOrderWithRiskControls(
    orderParams: OrderParams,
    marketData: MarketData
  ): OrderParams {
    const { parameters } = this.riskProfile;
    const price = orderParams.price || marketData.price;
    
    // Clone the order params
    const enhancedOrder: OrderParams = { ...orderParams };
    
    // Calculate stop loss if not provided
    if (!enhancedOrder.stopLossPrice) {
      const stopLossPercent = parameters.stopLossPercentage;
      if (orderParams.side === 'buy') {
        enhancedOrder.stopLossPrice = price * (1 - stopLossPercent / 100);
      } else {
        enhancedOrder.stopLossPrice = price * (1 + stopLossPercent / 100);
      }
    }
    
    // Calculate take profit if not provided (2:1 reward/risk by default)
    if (!enhancedOrder.takeProfitPrice) {
      const stopLossPrice = enhancedOrder.stopLossPrice;
      if (stopLossPrice) {
        const stopDiff = Math.abs(price - stopLossPrice);
        if (orderParams.side === 'buy') {
          enhancedOrder.takeProfitPrice = price + (stopDiff * 2);
        } else {
          enhancedOrder.takeProfitPrice = price - (stopDiff * 2);
        }
      }
    }
    
    // Add trailing stop if enabled
    if (parameters.trailingStopEnabled && !enhancedOrder.trailingStopConfig) {
      enhancedOrder.trailingStopConfig = {
        activationPercent: parameters.trailingStopActivationPercent,
        distancePercent: parameters.trailingStopDistance
      };
    }
    
    return enhancedOrder;
  }
}

// Extend OrderParams to include risk management parameters
declare module '@/types/exchange' {
  interface OrderParams {
    stopLossPrice?: number;
    takeProfitPrice?: number;
    stopLossPercent?: number;
    takeProfitPercent?: number;
    trailingStopConfig?: {
      activationPercent: number;
      distancePercent: number;
    };
  }
}
