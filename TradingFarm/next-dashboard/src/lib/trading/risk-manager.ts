/**
 * Risk Management System
 * 
 * Provides risk assessment, position sizing, and trading limits
 * for the Trading Farm platform.
 */

import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database.types';

export interface RiskParameters {
  // Position sizing
  maxPositionSize: number;          // Maximum position size as % of account
  maxLeverage: number;              // Maximum allowed leverage
  
  // Risk controls
  maxDrawdown: number;              // Maximum allowed drawdown (%)
  stopLossRequired: boolean;        // Whether stop loss is required
  defaultStopLoss: number;          // Default stop loss percentage if enabled
  takeProfitRequired: boolean;      // Whether take profit is required
  defaultTakeProfit: number;        // Default take profit percentage if enabled
  
  // Exposure limits
  maxExposurePerAsset: number;      // Maximum exposure to a single asset (%)
  maxTotalExposure: number;         // Maximum total position exposure (%)
  
  // Circuit breakers
  enableCircuitBreakers: boolean;   // Whether to enable circuit breakers
  volatilityThreshold: number;      // Volatility threshold for circuit breaker
  priceImpactThreshold: number;     // Price impact threshold (%)
  
  // Operational limits
  maxDailyTrades: number;           // Maximum number of trades per day
  maxDailyVolume: number;           // Maximum daily trading volume
  tradingHoursStart: number;        // Trading hours start (hour, 0-23)
  tradingHoursEnd: number;          // Trading hours end (hour, 0-23)
}

// Default risk parameters
export const DEFAULT_RISK_PARAMETERS: RiskParameters = {
  maxPositionSize: 2,               // 2% of account
  maxLeverage: 5,                   // 5x max leverage
  
  maxDrawdown: 10,                  // 10% max drawdown
  stopLossRequired: true,
  defaultStopLoss: 5,               // 5% default stop loss
  takeProfitRequired: false,
  defaultTakeProfit: 10,            // 10% default take profit
  
  maxExposurePerAsset: 10,          // 10% per asset
  maxTotalExposure: 50,             // 50% total exposure
  
  enableCircuitBreakers: true,
  volatilityThreshold: 5,           // 5% volatility threshold
  priceImpactThreshold: 3,          // 3% price impact
  
  maxDailyTrades: 100,              // 100 trades per day
  maxDailyVolume: 50000,            // $50,000 daily volume
  tradingHoursStart: 0,             // 24/7 trading by default
  tradingHoursEnd: 24
};

export interface TradeValidationResult {
  allowed: boolean;
  reasons: string[];
  adjustedParams?: {
    positionSize?: number;
    leverage?: number;
    stopLoss?: number;
    takeProfit?: number;
  };
}

export interface PositionSizeResult {
  recommendedSize: number;
  maxSize: number;
  riskAmount: number;
  leveragedExposure: number;
}

export interface UserRiskProfile {
  userId: string;
  parameters: RiskParameters;
  lastUpdated: Date;
}

/**
 * Risk Manager class for managing trading risk
 */
export class RiskManager {
  private riskParameters: RiskParameters;
  private userId: string | null = null;
  private supabase: any;
  private isServer: boolean;
  
  constructor(
    initialParameters: Partial<RiskParameters> = {},
    userId?: string,
    isServer = typeof window === 'undefined'
  ) {
    this.riskParameters = { ...DEFAULT_RISK_PARAMETERS, ...initialParameters };
    this.userId = userId || null;
    this.isServer = isServer;
    
    // Initialize Supabase client based on environment
    if (this.isServer) {
      // Will be initialized when needed with createServerClient
      this.supabase = null;
    } else {
      this.supabase = createBrowserClient();
    }
  }
  
  /**
   * Initialize the Supabase client on server
   */
  private async initializeServerClient() {
    if (this.isServer && !this.supabase) {
      this.supabase = await createServerClient();
    }
  }
  
  /**
   * Load risk parameters for a user from the database
   */
  async loadUserRiskParameters(userId?: string): Promise<RiskParameters> {
    const targetUserId = userId || this.userId;
    if (!targetUserId) {
      throw new Error('User ID is required to load risk parameters');
    }
    
    await this.initializeServerClient();
    
    const { data, error } = await this.supabase
      .from('risk_parameters')
      .select('*')
      .eq('user_id', targetUserId)
      .single();
    
    if (error) {
      console.error('Error loading risk parameters:', error);
      return this.riskParameters; // Return default if error
    }
    
    if (data) {
      this.riskParameters = {
        ...DEFAULT_RISK_PARAMETERS,
        ...JSON.parse(data.parameters)
      };
      this.userId = targetUserId;
    }
    
    return this.riskParameters;
  }
  
  /**
   * Save risk parameters for a user to the database
   */
  async saveUserRiskParameters(
    parameters: Partial<RiskParameters>,
    userId?: string
  ): Promise<void> {
    const targetUserId = userId || this.userId;
    if (!targetUserId) {
      throw new Error('User ID is required to save risk parameters');
    }
    
    await this.initializeServerClient();
    
    // Update local parameters
    this.riskParameters = {
      ...this.riskParameters,
      ...parameters
    };
    
    // Save to database
    const { error } = await this.supabase
      .from('risk_parameters')
      .upsert({
        user_id: targetUserId,
        parameters: JSON.stringify(this.riskParameters),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (error) {
      console.error('Error saving risk parameters:', error);
      throw error;
    }
  }
  
  /**
   * Calculate optimal position size based on risk parameters
   */
  calculatePositionSize(
    accountBalance: number,
    entryPrice: number,
    stopLossPrice: number | null,
    leverage: number = 1
  ): PositionSizeResult {
    // Validate inputs
    if (accountBalance <= 0 || entryPrice <= 0 || leverage <= 0) {
      throw new Error('Invalid inputs for position sizing calculation');
    }
    
    // If leverage exceeds max, cap it
    const effectiveLeverage = Math.min(leverage, this.riskParameters.maxLeverage);
    
    // Calculate maximum position size based on % of account
    const maxPositionFromPercentage = (accountBalance * this.riskParameters.maxPositionSize) / 100;
    
    // Calculate position size based on stop loss if provided
    let riskBasedSize = maxPositionFromPercentage;
    let riskAmount = (maxPositionFromPercentage * this.riskParameters.maxPositionSize) / 100;
    
    if (stopLossPrice !== null && stopLossPrice > 0) {
      // Calculate risk percentage based on entry and stop loss
      const riskPercentage = Math.abs((entryPrice - stopLossPrice) / entryPrice) * 100;
      
      // Calculate position size that risks the defined percentage of account
      riskAmount = (accountBalance * this.riskParameters.maxPositionSize) / 100;
      riskBasedSize = (riskAmount / riskPercentage) * 100;
    }
    
    // Use the smaller of the two calculations
    const recommendedSize = Math.min(maxPositionFromPercentage, riskBasedSize);
    const leveragedExposure = recommendedSize * effectiveLeverage;
    
    return {
      recommendedSize,
      maxSize: maxPositionFromPercentage,
      riskAmount,
      leveragedExposure
    };
  }
  
  /**
   * Validate a trade against risk parameters
   */
  validateTrade(
    symbol: string,
    orderType: string,
    positionSize: number,
    leverage: number,
    entryPrice: number,
    stopLossPrice: number | null,
    takeProfitPrice: number | null,
    accountBalance: number,
    existingPositions: any[]
  ): TradeValidationResult {
    const result: TradeValidationResult = {
      allowed: true,
      reasons: [],
      adjustedParams: {}
    };
    
    // Check if trading hours are valid
    const currentHour = new Date().getHours();
    if (
      this.riskParameters.tradingHoursStart < this.riskParameters.tradingHoursEnd &&
      (currentHour < this.riskParameters.tradingHoursStart || 
       currentHour >= this.riskParameters.tradingHoursEnd)
    ) {
      result.allowed = false;
      result.reasons.push(`Trading is only allowed between ${this.riskParameters.tradingHoursStart}:00 and ${this.riskParameters.tradingHoursEnd}:00`);
    }
    
    // Validate leverage
    if (leverage > this.riskParameters.maxLeverage) {
      result.allowed = false;
      result.reasons.push(`Leverage exceeds maximum of ${this.riskParameters.maxLeverage}x`);
      result.adjustedParams!.leverage = this.riskParameters.maxLeverage;
    }
    
    // Calculate the position size as percentage of account
    const positionPercentage = (positionSize / accountBalance) * 100;
    if (positionPercentage > this.riskParameters.maxPositionSize) {
      result.allowed = false;
      result.reasons.push(`Position size exceeds maximum of ${this.riskParameters.maxPositionSize}% of account`);
      
      // Calculate adjusted position size
      const adjustedSize = (accountBalance * this.riskParameters.maxPositionSize) / 100;
      result.adjustedParams!.positionSize = adjustedSize;
    }
    
    // Check for stop loss if required
    if (this.riskParameters.stopLossRequired && !stopLossPrice) {
      result.allowed = false;
      result.reasons.push('Stop loss is required for all trades');
      
      // Calculate default stop loss
      const direction = orderType.toLowerCase().includes('buy') ? -1 : 1;
      const defaultStopLossPrice = entryPrice * (1 + (direction * this.riskParameters.defaultStopLoss / 100));
      result.adjustedParams!.stopLoss = defaultStopLossPrice;
    }
    
    // Check for take profit if required
    if (this.riskParameters.takeProfitRequired && !takeProfitPrice) {
      result.allowed = false;
      result.reasons.push('Take profit is required for all trades');
      
      // Calculate default take profit
      const direction = orderType.toLowerCase().includes('buy') ? 1 : -1;
      const defaultTakeProfitPrice = entryPrice * (1 + (direction * this.riskParameters.defaultTakeProfit / 100));
      result.adjustedParams!.takeProfit = defaultTakeProfitPrice;
    }
    
    // Calculate asset exposure
    const existingExposureForSymbol = existingPositions
      .filter(p => p.symbol === symbol)
      .reduce((sum, position) => sum + position.size * position.leverage, 0);
    
    const newExposureForSymbol = existingExposureForSymbol + (positionSize * leverage);
    const symbolExposurePercentage = (newExposureForSymbol / accountBalance) * 100;
    
    if (symbolExposurePercentage > this.riskParameters.maxExposurePerAsset) {
      result.allowed = false;
      result.reasons.push(`Exceeds maximum exposure of ${this.riskParameters.maxExposurePerAsset}% for ${symbol}`);
    }
    
    // Calculate total exposure
    const totalExistingExposure = existingPositions
      .reduce((sum, position) => sum + position.size * position.leverage, 0);
    
    const newTotalExposure = totalExistingExposure + (positionSize * leverage);
    const totalExposurePercentage = (newTotalExposure / accountBalance) * 100;
    
    if (totalExposurePercentage > this.riskParameters.maxTotalExposure) {
      result.allowed = false;
      result.reasons.push(`Exceeds maximum total exposure of ${this.riskParameters.maxTotalExposure}%`);
    }
    
    return result;
  }
  
  /**
   * Check if circuit breakers should trigger based on market conditions
   */
  checkCircuitBreakers(
    symbol: string,
    currentVolatility: number,
    priceImpact: number
  ): { triggered: boolean; reason: string | null } {
    if (!this.riskParameters.enableCircuitBreakers) {
      return { triggered: false, reason: null };
    }
    
    // Check volatility threshold
    if (currentVolatility > this.riskParameters.volatilityThreshold) {
      return {
        triggered: true,
        reason: `Volatility for ${symbol} (${currentVolatility.toFixed(2)}%) exceeds threshold (${this.riskParameters.volatilityThreshold}%)`
      };
    }
    
    // Check price impact threshold
    if (priceImpact > this.riskParameters.priceImpactThreshold) {
      return {
        triggered: true,
        reason: `Price impact for ${symbol} (${priceImpact.toFixed(2)}%) exceeds threshold (${this.riskParameters.priceImpactThreshold}%)`
      };
    }
    
    return { triggered: false, reason: null };
  }
  
  /**
   * Get trading limits for a user
   */
  async getTradingLimits(userId?: string): Promise<{
    dailyTradesRemaining: number;
    dailyVolumeRemaining: number;
  }> {
    const targetUserId = userId || this.userId;
    if (!targetUserId) {
      throw new Error('User ID is required to check trading limits');
    }
    
    await this.initializeServerClient();
    
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Query for today's trades
    const { data: trades, error } = await this.supabase
      .from('trades')
      .select('size')
      .eq('user_id', targetUserId)
      .gte('created_at', today.toISOString());
    
    if (error) {
      console.error('Error checking trading limits:', error);
      throw error;
    }
    
    // Calculate remaining limits
    const tradesCount = trades?.length || 0;
    const tradesVolume = trades?.reduce((sum: number, trade: any) => sum + (trade.size || 0), 0) || 0;
    
    return {
      dailyTradesRemaining: Math.max(0, this.riskParameters.maxDailyTrades - tradesCount),
      dailyVolumeRemaining: Math.max(0, this.riskParameters.maxDailyVolume - tradesVolume)
    };
  }
}
