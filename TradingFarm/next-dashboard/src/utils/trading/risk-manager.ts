/**
 * Risk Management System
 * 
 * Manages portfolio risk by applying rules, limits, and circuit breakers.
 * Core component for ensuring safe trading operations.
 */

import { createServerClient } from '@/utils/supabase/server';
import { Position, RiskMetrics, PositionManager } from './position-manager';
import { OrderParams, OrderSide, OrderType } from '../exchanges/exchange-types';

// Risk configuration interface
export interface RiskConfig {
  id?: string;
  portfolioId: string;
  maxPositionSize: number; // Maximum size of any single position as % of portfolio
  maxAssetExposure: number; // Maximum exposure to any asset as % of portfolio
  maxExchangeExposure: number; // Maximum exposure to any exchange as % of portfolio
  stopLossDefault: number; // Default stop loss percentage
  takeProfitDefault: number; // Default take profit percentage
  maxDailyDrawdown: number; // Maximum daily drawdown percentage before halting trading
  maxOpenPositions: number; // Maximum number of open positions
  marketVolatilityLimit: number; // Volatility threshold for reducing position size
  maxLeverage: number; // Maximum leverage allowed
  rebalancingThreshold: number; // Drift threshold for triggering rebalance
  circuitBreakerEnabled: boolean; // Whether circuit breaker is enabled
  created_at?: string;
  updated_at?: string;
}

// Position sizing result
export interface PositionSizeResult {
  recommendedSize: number;
  sizeReduction: number;
  sizeReductionReason?: string;
  riskScore: number; // 0-100 scale, higher means more risky
  approved: boolean;
}

// Trading allowance for a portfolio
export interface TradingAllowance {
  canTrade: boolean;
  remainingDailyAllowance: number;
  circuitBreakerTriggered: boolean;
  reasonIfBlocked?: string;
}

export class RiskManager {
  /**
   * Get risk configuration for a portfolio
   */
  static async getRiskConfig(portfolioId: string): Promise<RiskConfig | null> {
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('risk_configs')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .single();
        
      if (error) {
        // If config doesn't exist, create default
        if (error.code === 'PGRST116') {
          return this.createDefaultRiskConfig(portfolioId);
        }
        
        console.error('Error fetching risk config:', error);
        return null;
      }
      
      return {
        id: data.id,
        portfolioId: data.portfolio_id,
        maxPositionSize: data.max_position_size,
        maxAssetExposure: data.max_asset_exposure,
        maxExchangeExposure: data.max_exchange_exposure,
        stopLossDefault: data.stop_loss_default,
        takeProfitDefault: data.take_profit_default,
        maxDailyDrawdown: data.max_daily_drawdown,
        maxOpenPositions: data.max_open_positions,
        marketVolatilityLimit: data.market_volatility_limit,
        maxLeverage: data.max_leverage,
        rebalancingThreshold: data.rebalancing_threshold,
        circuitBreakerEnabled: data.circuit_breaker_enabled,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Failed to get risk config:', error);
      return null;
    }
  }

  /**
   * Create default risk configuration for a portfolio
   */
  static async createDefaultRiskConfig(portfolioId: string): Promise<RiskConfig> {
    const defaultConfig: RiskConfig = {
      portfolioId,
      maxPositionSize: 20.0, // Maximum 20% in single position
      maxAssetExposure: 30.0, // Maximum 30% exposure to single asset
      maxExchangeExposure: 80.0, // Maximum 80% exposure to single exchange
      stopLossDefault: 5.0, // Default 5% stop loss
      takeProfitDefault: 10.0, // Default 10% take profit
      maxDailyDrawdown: 5.0, // Halt trading after 5% daily drawdown
      maxOpenPositions: 15, // Maximum 15 open positions
      marketVolatilityLimit: 50.0, // Reduce position size in high volatility
      maxLeverage: 3.0, // Maximum 3x leverage
      rebalancingThreshold: 5.0, // Rebalance when drift exceeds 5%
      circuitBreakerEnabled: true, // Circuit breaker enabled by default
    };
    
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('risk_configs')
        .insert({
          portfolio_id: portfolioId,
          max_position_size: defaultConfig.maxPositionSize,
          max_asset_exposure: defaultConfig.maxAssetExposure,
          max_exchange_exposure: defaultConfig.maxExchangeExposure,
          stop_loss_default: defaultConfig.stopLossDefault,
          take_profit_default: defaultConfig.takeProfitDefault,
          max_daily_drawdown: defaultConfig.maxDailyDrawdown,
          max_open_positions: defaultConfig.maxOpenPositions,
          market_volatility_limit: defaultConfig.marketVolatilityLimit,
          max_leverage: defaultConfig.maxLeverage,
          rebalancing_threshold: defaultConfig.rebalancingThreshold,
          circuit_breaker_enabled: defaultConfig.circuitBreakerEnabled
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating default risk config:', error);
        return defaultConfig;
      }
      
      return {
        ...defaultConfig,
        id: data.id,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Failed to create default risk config:', error);
      return defaultConfig;
    }
  }

  /**
   * Calculate recommended position size based on risk parameters
   */
  static async calculatePositionSize(
    portfolioId: string,
    symbol: string,
    orderSide: OrderSide,
    requestedAmount: number,
    price: number
  ): Promise<PositionSizeResult> {
    try {
      // Get risk configuration
      const riskConfig = await this.getRiskConfig(portfolioId);
      if (!riskConfig) {
        throw new Error('Risk configuration not found');
      }
      
      // Get current positions
      const positions = await PositionManager.getPositions(portfolioId);
      const riskMetrics = PositionManager.calculateRiskMetrics(positions);
      
      // Calculate portfolio total value
      const portfolioValue = riskMetrics.totalExposure;
      
      // Check if we have too many open positions
      if (positions.length >= riskConfig.maxOpenPositions) {
        return {
          recommendedSize: 0,
          sizeReduction: requestedAmount,
          sizeReductionReason: 'Maximum number of open positions reached',
          riskScore: 100,
          approved: false
        };
      }
      
      // Calculate position value
      const positionValue = requestedAmount * price;
      const positionPercentage = (positionValue / portfolioValue) * 100;
      
      // Check maximum position size
      if (positionPercentage > riskConfig.maxPositionSize) {
        const maxAllowedSize = (riskConfig.maxPositionSize / 100) * portfolioValue / price;
        return {
          recommendedSize: maxAllowedSize,
          sizeReduction: requestedAmount - maxAllowedSize,
          sizeReductionReason: 'Position size exceeds maximum allowed percentage',
          riskScore: 80,
          approved: maxAllowedSize > 0
        };
      }
      
      // Extract base asset from symbol (e.g., BTC from BTC/USDT)
      const baseAsset = symbol.split('/')[0];
      
      // Calculate current exposure to this asset
      const currentAssetExposure = riskMetrics.exposurePerAsset[baseAsset] || 0;
      const newAssetExposure = currentAssetExposure + positionValue;
      const newAssetExposurePercentage = (newAssetExposure / portfolioValue) * 100;
      
      // Check maximum asset exposure
      if (newAssetExposurePercentage > riskConfig.maxAssetExposure) {
        const maxAdditionalExposure = (riskConfig.maxAssetExposure / 100) * portfolioValue - currentAssetExposure;
        const maxAllowedSize = maxAdditionalExposure > 0 ? maxAdditionalExposure / price : 0;
        
        return {
          recommendedSize: maxAllowedSize,
          sizeReduction: requestedAmount - maxAllowedSize,
          sizeReductionReason: `Exposure to ${baseAsset} exceeds maximum allowed percentage`,
          riskScore: 70,
          approved: maxAllowedSize > 0
        };
      }
      
      // All checks passed, recommend full size
      return {
        recommendedSize: requestedAmount,
        sizeReduction: 0,
        riskScore: 30,
        approved: true
      };
    } catch (error) {
      console.error('Failed to calculate position size:', error);
      return {
        recommendedSize: 0,
        sizeReduction: requestedAmount,
        sizeReductionReason: 'Error calculating position size',
        riskScore: 100,
        approved: false
      };
    }
  }

  /**
   * Check if trading is allowed for the portfolio
   */
  static async checkTradingAllowance(portfolioId: string): Promise<TradingAllowance> {
    try {
      // Get risk configuration
      const riskConfig = await this.getRiskConfig(portfolioId);
      if (!riskConfig) {
        return {
          canTrade: false,
          remainingDailyAllowance: 0,
          circuitBreakerTriggered: false,
          reasonIfBlocked: 'Risk configuration not found'
        };
      }
      
      // Check circuit breaker status
      const circuitBreakerStatus = await this.getCircuitBreakerStatus(portfolioId);
      if (circuitBreakerStatus.triggered) {
        return {
          canTrade: false,
          remainingDailyAllowance: 0,
          circuitBreakerTriggered: true,
          reasonIfBlocked: circuitBreakerStatus.reason
        };
      }
      
      // Check daily drawdown limit
      const { data: portfolioData } = await (await createServerClient())
        .from('portfolios')
        .select('id, initial_capital, current_value, daily_high_value')
        .eq('id', portfolioId)
        .single();
        
      if (!portfolioData) {
        return {
          canTrade: false,
          remainingDailyAllowance: 0,
          circuitBreakerTriggered: false,
          reasonIfBlocked: 'Portfolio data not found'
        };
      }
      
      // Calculate daily drawdown
      const dailyHighValue = portfolioData.daily_high_value || portfolioData.current_value;
      const dailyDrawdown = ((dailyHighValue - portfolioData.current_value) / dailyHighValue) * 100;
      
      if (dailyDrawdown > riskConfig.maxDailyDrawdown) {
        // Trigger circuit breaker
        await this.triggerCircuitBreaker(portfolioId, `Daily drawdown of ${dailyDrawdown.toFixed(2)}% exceeded maximum of ${riskConfig.maxDailyDrawdown}%`);
        
        return {
          canTrade: false,
          remainingDailyAllowance: 0,
          circuitBreakerTriggered: true,
          reasonIfBlocked: `Daily drawdown limit of ${riskConfig.maxDailyDrawdown}% has been reached`
        };
      }
      
      // Calculate remaining daily allowance
      const remainingAllowancePercentage = riskConfig.maxDailyDrawdown - dailyDrawdown;
      const remainingAllowance = (remainingAllowancePercentage / 100) * portfolioData.current_value;
      
      return {
        canTrade: true,
        remainingDailyAllowance: remainingAllowance,
        circuitBreakerTriggered: false
      };
    } catch (error) {
      console.error('Failed to check trading allowance:', error);
      return {
        canTrade: false,
        remainingDailyAllowance: 0,
        circuitBreakerTriggered: false,
        reasonIfBlocked: 'Error checking trading allowance'
      };
    }
  }

  /**
   * Get circuit breaker status
   */
  static async getCircuitBreakerStatus(portfolioId: string): Promise<{ triggered: boolean; reason?: string }> {
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('circuit_breakers')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('status', 'active')
        .order('triggered_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // No active circuit breaker
          return { triggered: false };
        }
        
        console.error('Error fetching circuit breaker status:', error);
        return { triggered: false };
      }
      
      return {
        triggered: true,
        reason: data.reason
      };
    } catch (error) {
      console.error('Failed to check circuit breaker status:', error);
      return { triggered: false };
    }
  }

  /**
   * Trigger circuit breaker to halt trading
   */
  static async triggerCircuitBreaker(portfolioId: string, reason: string): Promise<boolean> {
    try {
      const supabase = await createServerClient();
      
      // Check if risk config allows circuit breaker
      const riskConfig = await this.getRiskConfig(portfolioId);
      if (!riskConfig || !riskConfig.circuitBreakerEnabled) {
        return false;
      }
      
      // Insert circuit breaker record
      const { error } = await supabase
        .from('circuit_breakers')
        .insert({
          portfolio_id: portfolioId,
          status: 'active',
          reason,
          triggered_at: new Date().toISOString(),
          triggered_by: 'system'
        });
        
      if (error) {
        console.error('Error triggering circuit breaker:', error);
        return false;
      }
      
      // Update portfolio status
      await supabase
        .from('portfolios')
        .update({ status: 'paused' })
        .eq('id', portfolioId);
        
      return true;
    } catch (error) {
      console.error('Failed to trigger circuit breaker:', error);
      return false;
    }
  }

  /**
   * Rebalance portfolio allocations based on drift threshold
   */
  static async checkRebalancingNeeded(portfolioId: string): Promise<boolean> {
    try {
      // Get risk configuration to check threshold
      const riskConfig = await this.getRiskConfig(portfolioId);
      if (!riskConfig) {
        return false;
      }
      
      const supabase = await createServerClient();
      
      // Get current allocations
      const { data: allocations, error } = await supabase
        .from('portfolio_allocations')
        .select('*')
        .eq('portfolio_id', portfolioId);
        
      if (error || !allocations) {
        console.error('Error fetching portfolio allocations:', error);
        return false;
      }
      
      // Check if any allocation exceeds drift threshold
      const driftThreshold = riskConfig.rebalancingThreshold;
      const needsRebalancing = allocations.some(allocation => {
        const drift = Math.abs(allocation.drift || 0);
        return drift > driftThreshold;
      });
      
      // If rebalancing is needed, mark portfolio
      if (needsRebalancing) {
        await supabase
          .from('portfolios')
          .update({ rebalance_notification: true })
          .eq('id', portfolioId);
      }
      
      return needsRebalancing;
    } catch (error) {
      console.error('Failed to check if rebalancing is needed:', error);
      return false;
    }
  }
}
