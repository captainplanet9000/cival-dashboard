/**
 * Risk Manager
 * 
 * Validates trade orders against predefined risk parameters:
 * - Max position size
 * - Max leverage
 * - Max drawdown
 * - Max daily loss
 * - Max order value
 * - Slippage control
 */

import { OrderRequest } from '@/types/orders';
import { Position, Balance } from '@/types/orders';

export interface RiskParameters {
  maxPositionSize: number;       // Max position size as % of account
  maxLeverage: number;           // Max leverage allowed
  maxDrawdown: number;           // Max drawdown % before emergency stop
  maxDailyLoss: number;          // Max daily loss % before emergency stop
  maxOrderValue: number;         // Max order value in USD
  slippageTolerance: number;     // Max slippage % allowed
  emergencyStopEnabled: boolean; // Enable emergency stop on risk breach
  circuitBreakerEnabled: boolean;// Enable circuit breaker on volatility
}

export interface RiskValidationResult {
  passed: boolean;
  details: Record<string, boolean | string>;
}

export interface RiskBreachInfo {
  type: 'position_size' | 'leverage' | 'drawdown' | 'daily_loss' | 'volatility';
  severity: 'warning' | 'critical';
  message: string;
  thresholdValue: number;
  currentValue: number;
  position?: Position;
}

export class RiskManager {
  private riskParams: RiskParameters;
  private dailyPnL: Map<string, number> = new Map(); // Track daily PnL by currency
  private startOfDayBalances: Map<string, number> = new Map(); // Start of day balances
  private lastPositionCheck: Date = new Date();
  
  constructor(riskParams: RiskParameters) {
    this.riskParams = riskParams;
    // Reset daily tracking at midnight
    this.scheduleResetDailyTracking();
  }
  
  /**
   * Schedule daily reset of PnL tracking
   */
  private scheduleResetDailyTracking() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilReset = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyTracking();
      this.scheduleResetDailyTracking(); // Schedule next reset
    }, timeUntilReset);
  }
  
  /**
   * Reset daily PnL tracking
   */
  private resetDailyTracking() {
    this.dailyPnL.clear();
    this.startOfDayBalances.clear();
  }
  
  /**
   * Validate an order against risk parameters
   */
  async validateOrder(
    order: OrderRequest, 
    currentPositions: Position[], 
    balances: Balance[]
  ): Promise<RiskValidationResult> {
    const result: RiskValidationResult = {
      passed: true,
      details: {}
    };
    
    try {
      // 1. Calculate total account value
      const totalAccountValue = this.calculateTotalAccountValue(balances);
      
      // 2. Validate position size - never exceed maxPositionSize% of account
      const orderValue = this.calculateOrderValue(order);
      const positionSizePercent = (orderValue / totalAccountValue) * 100;
      
      result.details.positionSizeCheck = positionSizePercent <= this.riskParams.maxPositionSize;
      
      // 3. Check existing position for the same symbol
      const existingPosition = currentPositions.find(p => p.symbol === order.symbol);
      
      // 4. Calculate new position size if order is executed
      if (existingPosition) {
        const newPositionSize = this.calculateNewPositionSize(existingPosition, order);
        const newPositionSizePercent = (newPositionSize / totalAccountValue) * 100;
        
        result.details.totalPositionSizeCheck = newPositionSizePercent <= this.riskParams.maxPositionSize;
      } else {
        result.details.totalPositionSizeCheck = true;
      }
      
      // 5. Validate leverage if applicable
      if (order.leverage && order.leverage > this.riskParams.maxLeverage) {
        result.details.leverageCheck = false;
      } else {
        result.details.leverageCheck = true;
      }
      
      // 6. Check if we're exceeding max positions (if we have a limit)
      if (this.riskParams.maxPositions && !existingPosition) {
        const currentPositionCount = currentPositions.filter(p => p.quantity > 0).length;
        result.details.maxPositionsCheck = currentPositionCount < this.riskParams.maxPositions;
      } else {
        result.details.maxPositionsCheck = true;
      }
      
      // 7. Check daily loss limit
      const dailyLossCheck = await this.checkDailyLossLimit(balances);
      result.details.dailyLossCheck = dailyLossCheck;
      
      // 8. Check for drawdown limit using current positions
      const drawdownCheck = this.checkDrawdownLimit(currentPositions);
      result.details.drawdownCheck = drawdownCheck;
      
      // 9. Maximum order value check
      result.details.maxOrderValueCheck = orderValue <= this.riskParams.maxOrderValue;
      
      // Final result determination - all checks must pass
      result.passed = Object.values(result.details).every(check => check === true);
      
      return result;
    } catch (error) {
      console.error('Error validating order against risk parameters', error);
      return {
        passed: false,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
  
  /**
   * Check all positions against risk limits
   */
  async checkPositionLimits(positions: Position[]): Promise<RiskBreachInfo[]> {
    const breaches: RiskBreachInfo[] = [];
    
    // Only run checks every 5 minutes to avoid too frequent checks
    const now = new Date();
    if (now.getTime() - this.lastPositionCheck.getTime() < 5 * 60 * 1000) {
      return breaches;
    }
    this.lastPositionCheck = now;
    
    // Calculate total position value
    const totalPositionValue = positions.reduce((sum, pos) => {
      return sum + (pos.quantity * pos.markPrice);
    }, 0);
    
    // Check each position
    for (const position of positions) {
      if (position.quantity === 0) continue;
      
      // 1. Check for overleveraged positions
      if (position.leverage && position.leverage > this.riskParams.maxLeverage) {
        breaches.push({
          type: 'leverage',
          severity: 'critical',
          message: `Position leverage exceeds maximum allowed`,
          thresholdValue: this.riskParams.maxLeverage,
          currentValue: position.leverage,
          position
        });
      }
      
      // 2. Check for excessive drawdown on individual positions
      if (position.unrealizedPnl < 0) {
        const drawdownPercent = Math.abs(position.unrealizedPnl) / (position.quantity * position.entryPrice) * 100;
        
        if (drawdownPercent > this.riskParams.maxDrawdown) {
          breaches.push({
            type: 'drawdown',
            severity: 'critical',
            message: `Position drawdown exceeds maximum allowed`,
            thresholdValue: this.riskParams.maxDrawdown,
            currentValue: drawdownPercent,
            position
          });
        }
      }
      
      // 3. Check for position concentration risk
      const positionValue = position.quantity * position.markPrice;
      const positionPercentage = (positionValue / totalPositionValue) * 100;
      
      if (positionPercentage > this.riskParams.maxPositionSize) {
        breaches.push({
          type: 'position_size',
          severity: 'warning',
          message: `Position size exceeds maximum allowed percentage of portfolio`,
          thresholdValue: this.riskParams.maxPositionSize,
          currentValue: positionPercentage,
          position
        });
      }
    }
    
    return breaches;
  }
  
  /**
   * Calculate the total account value across all balances
   */
  private calculateTotalAccountValue(balances: Balance[]): number {
    return balances.reduce((total, balance) => total + balance.total, 0);
  }
  
  /**
   * Calculate the value of an order
   */
  private calculateOrderValue(order: OrderRequest): number {
    return order.price 
      ? order.price * order.quantity 
      : order.quantity; // Estimate for market orders (will be refined with actual price)
  }
  
  /**
   * Calculate the new position size if an order is executed
   */
  private calculateNewPositionSize(existingPosition: Position, order: OrderRequest): number {
    const orderEffect = order.side === 'buy' ? order.quantity : -order.quantity;
    const newQuantity = existingPosition.quantity + orderEffect;
    
    // If this order would close the position, return 0
    if ((existingPosition.quantity > 0 && newQuantity <= 0) || 
        (existingPosition.quantity < 0 && newQuantity >= 0)) {
      return 0;
    }
    
    return Math.abs(newQuantity) * (order.price || existingPosition.markPrice);
  }
  
  /**
   * Check if daily loss limit has been exceeded
   */
  private async checkDailyLossLimit(balances: Balance[]): Promise<boolean> {
    try {
      // Initialize start of day balances if not already set
      if (this.startOfDayBalances.size === 0) {
        for (const balance of balances) {
          this.startOfDayBalances.set(balance.asset, balance.total);
        }
        return true;
      }
      
      // Calculate current PnL for each asset
      for (const balance of balances) {
        const startBalance = this.startOfDayBalances.get(balance.asset) || balance.total;
        const pnl = balance.total - startBalance;
        const pnlPercent = (pnl / startBalance) * 100;
        
        // Update daily PnL
        this.dailyPnL.set(balance.asset, pnlPercent);
        
        // Check if loss limit is exceeded
        if (pnlPercent < 0 && Math.abs(pnlPercent) > this.riskParams.maxDailyLoss) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking daily loss limit', error);
      return false; // Fail-safe: reject the order if we can't check
    }
  }
  
  /**
   * Check if drawdown limit has been exceeded
   */
  private checkDrawdownLimit(positions: Position[]): boolean {
    try {
      // Calculate total unrealized PnL
      const totalUnrealizedPnl = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
      
      // Calculate total invested capital
      const totalInvestedCapital = positions.reduce((sum, pos) => {
        return sum + (pos.quantity * pos.entryPrice);
      }, 0);
      
      // Skip if no open positions
      if (totalInvestedCapital === 0) return true;
      
      // Calculate drawdown percentage
      const drawdownPercent = totalUnrealizedPnl < 0 
        ? Math.abs(totalUnrealizedPnl) / totalInvestedCapital * 100 
        : 0;
        
      return drawdownPercent <= this.riskParams.maxDrawdown;
    } catch (error) {
      console.error('Error checking drawdown limit', error);
      return false; // Fail-safe: reject the order if we can't check
    }
  }
  
  /**
   * Update risk parameters
   */
  updateRiskParameters(newParams: Partial<RiskParameters>) {
    this.riskParams = { ...this.riskParams, ...newParams };
  }
  
  /**
   * Get current risk parameters
   */
  getRiskParameters(): RiskParameters {
    return { ...this.riskParams };
  }
}
