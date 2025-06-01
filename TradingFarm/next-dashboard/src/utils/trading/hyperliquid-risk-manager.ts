/**
 * HyperLiquid Risk Manager
 * 
 * Provides risk management functionality specific to HyperLiquid exchange.
 * Extends the base risk management service with HyperLiquid-specific logic.
 */

import { riskManagementService } from './risk-management-service';
import { ExchangeConnector } from '../exchanges/exchange-connector';
import { OrderParams, OrderSide, OrderType } from '../exchanges/exchange-types';
import { RiskEvent } from '../../types/risk-types';

export interface HyperliquidPosition {
  symbol: string;
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice?: number;
  margin: number;
  unrealizedPnl: number;
  leverage: number;
  side: 'long' | 'short';
}

export interface HyperliquidRiskParams {
  // Default parameters for HyperLiquid risk management
  maxLeverage: number;
  maxNotionalValue: number;
  maxPositionsPerStrategy: number;
  minDistance: { // Minimum distance for stop orders as % of price
    stopLoss: number;
    takeProfit: number;
    liquidation: number;
  };
  marginBufferPercent: number; // Extra margin buffer to avoid liquidation
  autoDeleveraging: boolean; // Whether to automatically reduce leverage in high volatility
}

export class HyperliquidRiskManager {
  private static instance: HyperliquidRiskManager;
  private defaultRiskParams: HyperliquidRiskParams = {
    maxLeverage: 5, // Default conservative max leverage of 5x
    maxNotionalValue: 25000, // Default $25k max position size
    maxPositionsPerStrategy: 5,
    minDistance: {
      stopLoss: 0.01, // 1% minimum distance for stop loss
      takeProfit: 0.02, // 2% minimum distance for take profit
      liquidation: 0.05, // 5% minimum distance to liquidation price
    },
    marginBufferPercent: 0.2, // 20% buffer on margin requirements
    autoDeleveraging: true,
  };

  private userRiskParams: Map<string, HyperliquidRiskParams> = new Map();

  private constructor() {}

  public static getInstance(): HyperliquidRiskManager {
    if (!HyperliquidRiskManager.instance) {
      HyperliquidRiskManager.instance = new HyperliquidRiskManager();
    }
    return HyperliquidRiskManager.instance;
  }

  /**
   * Load user-specific risk parameters
   */
  public async loadUserRiskParams(userId: string): Promise<HyperliquidRiskParams> {
    try {
      // Get user's risk profile from the base risk service
      const profile = await riskManagementService.getRiskProfile(userId);
      
      // If no profile or the user hasn't set specific HyperLiquid params,
      // use our defaults
      if (!profile || !profile.parameters?.hyperliquid) {
        return this.defaultRiskParams;
      }
      
      // Get HyperLiquid-specific parameters from the profile
      const hyperliquidParams = profile.parameters?.hyperliquid as Partial<HyperliquidRiskParams>;
      
      // Merge with defaults to ensure all parameters exist
      const params: HyperliquidRiskParams = {
        ...this.defaultRiskParams,
        ...hyperliquidParams,
        minDistance: {
          ...this.defaultRiskParams.minDistance,
          ...(hyperliquidParams.minDistance || {}),
        }
      };
      
      // Cache for future use
      this.userRiskParams.set(userId, params);
      
      return params;
    } catch (error) {
      console.error('Error loading HyperLiquid risk parameters:', error);
      return this.defaultRiskParams;
    }
  }

  /**
   * Get cached risk parameters for a user, or load them if not already cached
   */
  public async getRiskParams(userId: string): Promise<HyperliquidRiskParams> {
    if (this.userRiskParams.has(userId)) {
      return this.userRiskParams.get(userId)!;
    }
    
    return await this.loadUserRiskParams(userId);
  }

  /**
   * Update user-specific risk parameters
   */
  public async updateRiskParams(
    userId: string, 
    params: Partial<HyperliquidRiskParams>
  ): Promise<HyperliquidRiskParams> {
    try {
      // Get existing profile
      const profile = await riskManagementService.getRiskProfile(userId);
      
      if (!profile) {
        // Create new profile with default values and our HyperLiquid params
        const newProfile = {
          user_id: userId,
          max_drawdown: 0.1, // 10% default max drawdown
          max_position_size: 0.05, // 5% default max position size
          max_daily_loss: 0.05, // 5% default max daily loss
          risk_per_trade: 0.01, // 1% default risk per trade
          parameters: {
            hyperliquid: {
              ...this.defaultRiskParams,
              ...params
            }
          }
        };
        
        await riskManagementService.upsertRiskProfile(userId, newProfile);
      } else {
        // Update existing profile with new HyperLiquid params
        const existingParams = profile.parameters?.hyperliquid as HyperliquidRiskParams || this.defaultRiskParams;
        
        const updatedProfile = {
          ...profile,
          parameters: {
            ...profile.parameters,
            hyperliquid: {
              ...existingParams,
              ...params,
              minDistance: {
                ...existingParams.minDistance,
                ...(params.minDistance || {}),
              }
            }
          }
        };
        
        await riskManagementService.upsertRiskProfile(userId, updatedProfile);
      }
      
      // Update our cache
      const currentParams = this.userRiskParams.get(userId) || this.defaultRiskParams;
      const updatedParams = {
        ...currentParams,
        ...params,
        minDistance: {
          ...currentParams.minDistance,
          ...(params.minDistance || {}),
        }
      };
      
      this.userRiskParams.set(userId, updatedParams);
      
      return updatedParams;
    } catch (error) {
      console.error('Error updating HyperLiquid risk parameters:', error);
      return this.defaultRiskParams;
    }
  }

  /**
   * Validate an order against risk parameters
   */
  public async validateOrder(
    userId: string, 
    order: OrderParams, 
    connector: ExchangeConnector,
    positions: HyperliquidPosition[] = []
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Get risk parameters
      const riskParams = await this.getRiskParams(userId);
      
      // Get market data for the symbol
      const marketData = await connector.getMarketData(order.symbol);
      
      // Current price for calculations
      const currentPrice = marketData.last;
      
      // Calculate the notional value of the order
      const notionalValue = order.amount * currentPrice;
      
      // Check if exceeds max notional value
      if (notionalValue > riskParams.maxNotionalValue) {
        return {
          valid: false,
          reason: `Order notional value of $${notionalValue.toFixed(2)} exceeds maximum of $${riskParams.maxNotionalValue.toFixed(2)}`
        };
      }
      
      // Get the account info to check available margin
      const accountInfo = await connector.getAccountInfo();
      const availableMargin = [...accountInfo.balances.values()]
        .find(b => b.currency === 'USD')?.free || 0;
      
      // Check available margin
      const requiredMargin = (notionalValue / riskParams.maxLeverage) * (1 + riskParams.marginBufferPercent);
      if (requiredMargin > availableMargin) {
        return {
          valid: false,
          reason: `Required margin of $${requiredMargin.toFixed(2)} exceeds available margin of $${availableMargin.toFixed(2)}`
        };
      }
      
      // Check if position count would exceed maximum
      const symbolPositions = positions.filter(p => p.symbol === order.symbol);
      const existingPosition = symbolPositions.length > 0;
      const totalPositions = positions.length;
      
      if (!existingPosition && totalPositions >= riskParams.maxPositionsPerStrategy) {
        return {
          valid: false,
          reason: `Maximum of ${riskParams.maxPositionsPerStrategy} concurrent positions allowed`
        };
      }
      
      // Check stop loss distance (if order is a stop loss)
      if (order.type === OrderType.STOP_LOSS || order.type === OrderType.STOP_LIMIT) {
        if (!order.stopPrice) {
          return {
            valid: false,
            reason: 'Stop price is required for stop orders'
          };
        }
        
        // Calculate distance as percentage of price
        const stopDistancePercent = Math.abs(currentPrice - order.stopPrice) / currentPrice;
        
        if (stopDistancePercent < riskParams.minDistance.stopLoss) {
          return {
            valid: false,
            reason: `Stop loss distance of ${(stopDistancePercent * 100).toFixed(2)}% is less than the minimum of ${(riskParams.minDistance.stopLoss * 100).toFixed(2)}%`
          };
        }
      }
      
      // Check take profit distance (if order is a take profit)
      if (order.type === OrderType.TAKE_PROFIT || order.type === OrderType.TAKE_PROFIT_LIMIT) {
        if (!order.stopPrice) {
          return {
            valid: false,
            reason: 'Stop price is required for take profit orders'
          };
        }
        
        // Calculate distance as percentage of price
        const tpDistancePercent = Math.abs(currentPrice - order.stopPrice) / currentPrice;
        
        if (tpDistancePercent < riskParams.minDistance.takeProfit) {
          return {
            valid: false,
            reason: `Take profit distance of ${(tpDistancePercent * 100).toFixed(2)}% is less than the minimum of ${(riskParams.minDistance.takeProfit * 100).toFixed(2)}%`
          };
        }
      }
      
      // HyperLiquid specific checks
      if (order.leverage && order.leverage > riskParams.maxLeverage) {
        return {
          valid: false,
          reason: `Requested leverage of ${order.leverage}x exceeds maximum of ${riskParams.maxLeverage}x`
        };
      }
      
      // Order passes all risk checks
      return { valid: true };
      
    } catch (error) {
      console.error('Error validating HyperLiquid order:', error);
      return {
        valid: false,
        reason: `Error during risk validation: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Automatically adjust leverage based on market volatility
   * Returns the adjusted order with appropriate leverage
   */
  public async adjustLeverage(
    userId: string,
    order: OrderParams,
    marketVolatility: number
  ): Promise<OrderParams> {
    const riskParams = await this.getRiskParams(userId);
    
    // Only apply if auto-deleveraging is enabled
    if (!riskParams.autoDeleveraging) {
      return order;
    }
    
    let adjustedLeverage = order.leverage || riskParams.maxLeverage;
    
    // Reduce leverage as volatility increases
    // This is a simple linear model - could be made more sophisticated
    if (marketVolatility > 0.02) { // 2% volatility threshold
      // Calculate reduction factor (higher volatility = lower leverage)
      const reductionFactor = Math.max(0.2, 1 - marketVolatility * 10);
      adjustedLeverage = Math.min(
        adjustedLeverage,
        Math.floor(riskParams.maxLeverage * reductionFactor)
      );
      
      // Ensure minimum leverage of 1x
      adjustedLeverage = Math.max(1, adjustedLeverage);
      
      // Log this risk adjustment
      await this.logLeverageAdjustment(
        userId,
        order.symbol,
        order.leverage || riskParams.maxLeverage,
        adjustedLeverage,
        marketVolatility
      );
    }
    
    return {
      ...order,
      leverage: adjustedLeverage
    };
  }

  /**
   * Log a risk event for leverage adjustment
   */
  private async logLeverageAdjustment(
    userId: string,
    symbol: string,
    originalLeverage: number,
    adjustedLeverage: number,
    volatility: number
  ): Promise<void> {
    const event: RiskEvent = {
      user_id: userId,
      event_type: 'leverage_adjustment',
      event_details: {
        exchange: 'hyperliquid',
        symbol,
        original_leverage: originalLeverage,
        adjusted_leverage: adjustedLeverage,
        market_volatility: volatility,
        reason: 'Auto-deleveraging due to high market volatility'
      },
      severity: 'info',
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
    
    await riskManagementService.logRiskEvent(event);
  }

  /**
   * Calculate the recommended position size for HyperLiquid
   */
  public async calculatePositionSize(
    userId: string,
    symbol: string,
    stopLossPrice: number,
    capital: number,
    connector: ExchangeConnector
  ): Promise<{ amount: number; leverage: number; margin: number }> {
    try {
      // Get risk profile and HyperLiquid parameters
      const profile = await riskManagementService.getRiskProfile(userId);
      const riskParams = await this.getRiskParams(userId);
      
      if (!profile) {
        throw new Error('User risk profile not found');
      }
      
      // Get market data for current price
      const marketData = await connector.getMarketData(symbol);
      const currentPrice = marketData.last;
      
      // Calculate stop loss percentage
      const stopLossPercent = Math.abs(currentPrice - stopLossPrice) / currentPrice;
      
      // Use base risk management service to calculate the position size based on risk
      const riskPerTrade = profile.risk_per_trade;
      const positionSizeUSD = riskManagementService.calculatePositionSize(
        capital,
        riskPerTrade,
        stopLossPercent
      );
      
      // Convert to asset amount
      const amount = positionSizeUSD / currentPrice;
      
      // Calculate appropriate leverage (ensure it doesn't exceed max)
      // We want to use the minimum leverage necessary to achieve the position size
      const requiredLeverage = positionSizeUSD / (capital * riskPerTrade);
      const leverage = Math.min(Math.ceil(requiredLeverage), riskParams.maxLeverage);
      
      // Calculate required margin
      const margin = positionSizeUSD / leverage;
      
      return {
        amount,
        leverage,
        margin
      };
    } catch (error) {
      console.error('Error calculating HyperLiquid position size:', error);
      // Return conservative defaults
      return {
        amount: 0,
        leverage: 1,
        margin: 0
      };
    }
  }

  /**
   * Check for liquidation risk in current positions
   * Returns positions at risk with their liquidation proximity percentage
   */
  public async checkLiquidationRisk(
    userId: string,
    positions: HyperliquidPosition[]
  ): Promise<{ positions: Array<HyperliquidPosition & { riskPercent: number }>, highRisk: boolean }> {
    const riskParams = await this.getRiskParams(userId);
    const positionsAtRisk: Array<HyperliquidPosition & { riskPercent: number }> = [];
    let highRisk = false;
    
    for (const position of positions) {
      if (!position.liquidationPrice) continue;
      
      // Calculate how close we are to liquidation as a percentage
      const distanceToLiquidation = Math.abs(position.markPrice - position.liquidationPrice);
      const liquidationProximity = distanceToLiquidation / position.markPrice;
      
      // If we're closer than our minimum safe distance, flag as at risk
      if (liquidationProximity < riskParams.minDistance.liquidation) {
        const riskPercent = (riskParams.minDistance.liquidation - liquidationProximity) / 
                           riskParams.minDistance.liquidation * 100;
        
        positionsAtRisk.push({
          ...position,
          riskPercent
        });
        
        // Consider high risk if we're within 50% of our minimum distance
        if (liquidationProximity < riskParams.minDistance.liquidation / 2) {
          highRisk = true;
          
          // Log a risk event for high liquidation risk
          await this.logLiquidationRisk(
            userId,
            position.symbol,
            position.size,
            position.markPrice,
            position.liquidationPrice,
            liquidationProximity
          );
        }
      }
    }
    
    return {
      positions: positionsAtRisk,
      highRisk
    };
  }

  /**
   * Log a liquidation risk event
   */
  private async logLiquidationRisk(
    userId: string,
    symbol: string,
    size: number,
    currentPrice: number,
    liquidationPrice: number,
    proximityPercent: number
  ): Promise<void> {
    const event: RiskEvent = {
      user_id: userId,
      event_type: 'liquidation_risk',
      event_details: {
        exchange: 'hyperliquid',
        symbol,
        position_size: size,
        current_price: currentPrice,
        liquidation_price: liquidationPrice,
        proximity_percent: proximityPercent * 100
      },
      severity: 'warning',
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
    
    await riskManagementService.logRiskEvent(event);
  }
}

export const hyperliquidRiskManager = HyperliquidRiskManager.getInstance();
