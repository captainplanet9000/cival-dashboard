/**
 * Risk-Aware Order Management Types
 * 
 * These types extend the basic order types with risk management features
 */

import { OrderParams, OrderResult, MarketData } from '@/types/exchange';
import { RiskAssessment } from '@/lib/risk/types';

/**
 * Extended order parameters that include risk management settings
 */
export interface RiskAwareOrderParams extends OrderParams {
  // Risk settings
  stopLossPrice?: number;
  stopLossPercentage?: number;
  takeProfitPrice?: number;
  takeProfitPercentage?: number;
  trailingStop?: boolean;
  trailingStopActivationPercentage?: number;
  trailingStopDistance?: number;
  
  // Position sizing
  riskPercentage?: number; // Percentage of account to risk
  positionSizeType?: 'fixed' | 'risk-based' | 'percentage' | 'value';
  accountRiskPercentage?: number; // Maximum percentage of account to allocate
  
  // Risk verification
  bypassRiskChecks?: boolean; // Only allowed for admins or with explicit confirmation
  riskOverrides?: Partial<Record<string, boolean>>; // Override specific risk checks
}

/**
 * Risk-aware order result that includes the risk assessment
 */
export interface RiskAwareOrderResult extends OrderResult {
  riskAssessment: RiskAssessment;
  stopLossOrderId?: string;
  takeProfitOrderId?: string;
  hasTrailingStop?: boolean;
}

/**
 * Order validation result from risk checks
 */
export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  riskAssessment: RiskAssessment | null;
  adjustedParams?: RiskAwareOrderParams;
}

/**
 * Risk-aware order service interface
 */
export interface IRiskAwareOrderService {
  /**
   * Place an order with risk management controls
   */
  placeOrder(params: RiskAwareOrderParams): Promise<RiskAwareOrderResult>;
  
  /**
   * Validate an order against risk parameters without placing it
   */
  validateOrder(params: RiskAwareOrderParams, marketData: MarketData): Promise<OrderValidationResult>;
  
  /**
   * Calculate appropriate position size based on risk parameters
   */
  calculatePositionSize(
    symbol: string,
    price: number,
    stopLossPrice: number | null,
    stopLossPercentage: number | null,
    riskPercentage: number
  ): Promise<number>;
  
  /**
   * Calculate appropriate stop loss and take profit levels
   */
  calculateRiskLevels(
    symbol: string,
    entryPrice: number,
    side: 'buy' | 'sell',
    riskRewardRatio?: number
  ): Promise<{
    stopLossPrice: number;
    takeProfitPrice: number;
    stopLossPercentage: number;
    takeProfitPercentage: number;
  }>;
  
  /**
   * Apply risk parameters to an existing order
   */
  applyRiskControls(params: OrderParams): Promise<RiskAwareOrderParams>;
}

/**
 * Component configuration for OrderForm
 */
export interface OrderFormConfig {
  showRiskControls: boolean;
  enablePositionSizing: boolean;
  enableTrailingStops: boolean;
  enableRiskOverrides: boolean;
  defaultRiskPercentage: number;
  defaultStopLossPercentage: number;
  defaultTakeProfitPercentage: number;
  defaultRiskRewardRatio: number;
  maxPositionSizePercentage: number;
  maxLeverage: number;
}
