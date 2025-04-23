/**
 * Risk-Aware Order Service
 * 
 * This service integrates the Risk Management system with the Order Management system,
 * ensuring all trades adhere to risk parameters defined in the user's risk profile.
 */

import { OrderParams, OrderResult, MarketData } from '@/types/exchange';
import { RiskManager } from '@/lib/risk/risk-manager';
import { createBrowserClient } from '@/utils/supabase/client';
import { 
  RiskAwareOrderParams, 
  RiskAwareOrderResult, 
  OrderValidationResult, 
  IRiskAwareOrderService 
} from './types';
import { RiskProfile, RiskLevel, RISK_PRESETS } from '@/lib/risk/types';

export class RiskAwareOrderService implements IRiskAwareOrderService {
  private userId: string;
  private riskManager: RiskManager;
  private riskProfile: RiskProfile | null = null;
  private supabase = createBrowserClient();
  
  constructor(userId: string) {
    this.userId = userId;
    this.riskManager = new RiskManager(userId);
    
    // Load the user's default risk profile
    this.loadDefaultRiskProfile();
  }
  
  /**
   * Load the user's default risk profile
   */
  private async loadDefaultRiskProfile(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('risk_profiles')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_default', true)
        .single();
      
      if (error) throw error;
      
      if (data) {
        this.riskProfile = {
          id: data.id,
          name: data.name,
          description: data.description,
          level: data.level as RiskLevel,
          parameters: data.parameters,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          userId: data.user_id,
          isDefault: data.is_default
        };
      } else {
        // Use moderate profile as default if none is set
        this.riskProfile = {
          id: 'default',
          name: 'Default Moderate Risk',
          description: 'System default risk profile',
          level: RiskLevel.MODERATE,
          parameters: {
            ...RISK_PRESETS[RiskLevel.MODERATE],
            customRiskRules: {}
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: this.userId,
          isDefault: true
        };
      }
    } catch (error) {
      console.error('Error loading default risk profile:', error);
    }
  }
  
  /**
   * Place an order with risk management controls
   */
  public async placeOrder(params: RiskAwareOrderParams): Promise<RiskAwareOrderResult> {
    try {
      // Make sure we have a risk profile loaded
      if (!this.riskProfile) {
        await this.loadDefaultRiskProfile();
      }
      
      // Get market data for the symbol
      const { data: marketData, error: marketError } = await this.supabase
        .from('market_data')
        .select('*')
        .eq('symbol', params.symbol)
        .single();
      
      if (marketError) throw marketError;
      
      // Format market data
      const formattedMarketData: MarketData = {
        symbol: marketData.symbol,
        exchange: marketData.exchange,
        price: marketData.price,
        bid: marketData.bid,
        ask: marketData.ask,
        volume24h: marketData.volume_24h,
        change24h: marketData.change_24h,
        high24h: marketData.high_24h,
        low24h: marketData.low_24h,
        timestamp: marketData.timestamp
      };
      
      // Validate the order against risk parameters
      const validationResult = await this.validateOrder(params, formattedMarketData);
      
      if (!validationResult.isValid && !params.bypassRiskChecks) {
        throw new Error(`Order validation failed: ${validationResult.errors.join(', ')}`);
      }
      
      // Apply risk controls if necessary
      const finalParams = validationResult.adjustedParams || params;
      
      // Place the primary order
      const { data: orderResult, error: orderError } = await this.supabase
        .rpc('place_order', {
          p_symbol: finalParams.symbol,
          p_side: finalParams.side,
          p_type: finalParams.type,
          p_quantity: finalParams.quantity,
          p_price: finalParams.price,
          p_time_in_force: finalParams.timeInForce || 'GTC'
        });
      
      if (orderError) throw orderError;
      
      let stopLossOrderId: string | undefined;
      let takeProfitOrderId: string | undefined;
      
      // Place stop loss order if specified
      if (finalParams.stopLossPrice) {
        const { data: slResult, error: slError } = await this.supabase
          .rpc('place_order', {
            p_symbol: finalParams.symbol,
            p_side: finalParams.side === 'buy' ? 'sell' : 'buy', // Opposite side
            p_type: 'stop',
            p_quantity: finalParams.quantity,
            p_price: finalParams.stopLossPrice,
            p_time_in_force: 'GTC'
          });
        
        if (slError) {
          console.error('Error placing stop loss order:', slError);
        } else {
          stopLossOrderId = slResult.id;
        }
      }
      
      // Place take profit order if specified
      if (finalParams.takeProfitPrice) {
        const { data: tpResult, error: tpError } = await this.supabase
          .rpc('place_order', {
            p_symbol: finalParams.symbol,
            p_side: finalParams.side === 'buy' ? 'sell' : 'buy', // Opposite side
            p_type: 'limit',
            p_quantity: finalParams.quantity,
            p_price: finalParams.takeProfitPrice,
            p_time_in_force: 'GTC'
          });
        
        if (tpError) {
          console.error('Error placing take profit order:', tpError);
        } else {
          takeProfitOrderId = tpResult.id;
        }
      }
      
      // Store risk assessment in the database
      await this.supabase
        .from('trade_risk_assessments')
        .insert({
          user_id: this.userId,
          order_id: orderResult.id,
          symbol: params.symbol,
          risk_score: validationResult.riskAssessment?.riskScore || 0,
          is_allowed: validationResult.riskAssessment?.isAllowed || false,
          reasons: validationResult.riskAssessment?.reasons || [],
          warnings: validationResult.riskAssessment?.warnings || [],
          position_sizing: validationResult.riskAssessment?.positionSizing || {}
        });
      
      // Return the order result with risk assessment
      return {
        ...orderResult,
        riskAssessment: validationResult.riskAssessment!,
        stopLossOrderId,
        takeProfitOrderId,
        hasTrailingStop: finalParams.trailingStop || false
      };
    } catch (error) {
      console.error('Error placing risk-aware order:', error);
      throw error;
    }
  }
  
  /**
   * Validate an order against risk parameters without placing it
   */
  public async validateOrder(params: RiskAwareOrderParams, marketData: MarketData): Promise<OrderValidationResult> {
    try {
      // Make sure we have a risk profile loaded
      if (!this.riskProfile) {
        await this.loadDefaultRiskProfile();
      }
      
      // Initialize portfolio state for risk manager
      await this.updateRiskManagerState();
      
      // Apply risk parameters to the order
      const adjustedParams = await this.applyRiskControls(params);
      
      // Perform risk assessment
      const riskAssessment = this.riskManager.assessTrade(adjustedParams, marketData);
      
      // Extract errors and warnings
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Add reasons as errors if the trade is not allowed
      if (!riskAssessment.isAllowed) {
        errors.push(...riskAssessment.reasons);
      }
      
      // Add warnings regardless
      warnings.push(...riskAssessment.warnings);
      
      // Check position size against recommended size
      if (adjustedParams.quantity > riskAssessment.positionSizing.recommendedPositionSize * 1.2) {
        warnings.push(`Position size (${adjustedParams.quantity}) exceeds recommended size (${riskAssessment.positionSizing.recommendedPositionSize.toFixed(4)}) by more than 20%`);
      }
      
      // Check if price is significantly different from market price
      const priceDiscrepancy = Math.abs((adjustedParams.price || marketData.price) - marketData.price) / marketData.price;
      if (priceDiscrepancy > 0.05) { // 5% price difference
        warnings.push(`Order price differs from market price by ${(priceDiscrepancy * 100).toFixed(2)}%`);
      }
      
      // Check if we have stop loss or take profit
      if (!adjustedParams.stopLossPrice && !adjustedParams.stopLossPercentage) {
        warnings.push('No stop loss specified. Consider adding a stop loss to manage risk.');
      }
      
      return {
        isValid: errors.length === 0 || !!params.bypassRiskChecks,
        errors,
        warnings,
        riskAssessment,
        adjustedParams
      };
    } catch (error) {
      console.error('Error validating order:', error);
      return {
        isValid: false,
        errors: ['Error validating order: ' + (error as Error).message],
        warnings: [],
        riskAssessment: null
      };
    }
  }
  
  /**
   * Calculate appropriate position size based on risk parameters
   */
  public async calculatePositionSize(
    symbol: string,
    price: number,
    stopLossPrice: number | null,
    stopLossPercentage: number | null,
    riskPercentage: number
  ): Promise<number> {
    try {
      // Make sure we have a risk profile loaded
      if (!this.riskProfile) {
        await this.loadDefaultRiskProfile();
      }
      
      // Initialize portfolio state for risk manager
      await this.updateRiskManagerState();
      
      // Calculate stop loss percentage if not provided
      let actualStopLossPercentage = stopLossPercentage;
      if (!actualStopLossPercentage && stopLossPrice) {
        actualStopLossPercentage = Math.abs(price - stopLossPrice) / price * 100;
      } else if (!actualStopLossPercentage) {
        // Use default from risk profile
        actualStopLossPercentage = this.riskProfile!.parameters.stopLossPercentage;
      }
      
      // Calculate position size using risk manager
      const positionSizing = this.riskManager.calculatePositionSize(
        symbol,
        price,
        actualStopLossPercentage,
        riskPercentage
      );
      
      return positionSizing.recommendedPositionSize;
    } catch (error) {
      console.error('Error calculating position size:', error);
      throw error;
    }
  }
  
  /**
   * Calculate appropriate stop loss and take profit levels
   */
  public async calculateRiskLevels(
    symbol: string,
    entryPrice: number,
    side: 'buy' | 'sell',
    riskRewardRatio: number = 2
  ): Promise<{
    stopLossPrice: number;
    takeProfitPrice: number;
    stopLossPercentage: number;
    takeProfitPercentage: number;
  }> {
    try {
      // Make sure we have a risk profile loaded
      if (!this.riskProfile) {
        await this.loadDefaultRiskProfile();
      }
      
      // Get default stop loss percentage from risk profile
      const stopLossPercentage = this.riskProfile!.parameters.stopLossPercentage;
      
      // Calculate stop loss price
      let stopLossPrice: number;
      if (side === 'buy') {
        stopLossPrice = entryPrice * (1 - stopLossPercentage / 100);
      } else {
        stopLossPrice = entryPrice * (1 + stopLossPercentage / 100);
      }
      
      // Calculate take profit using risk-reward ratio
      const takeProfitPercentage = stopLossPercentage * riskRewardRatio;
      let takeProfitPrice: number;
      if (side === 'buy') {
        takeProfitPrice = entryPrice * (1 + takeProfitPercentage / 100);
      } else {
        takeProfitPrice = entryPrice * (1 - takeProfitPercentage / 100);
      }
      
      return {
        stopLossPrice,
        takeProfitPrice,
        stopLossPercentage,
        takeProfitPercentage
      };
    } catch (error) {
      console.error('Error calculating risk levels:', error);
      throw error;
    }
  }
  
  /**
   * Apply risk parameters to an existing order
   */
  public async applyRiskControls(params: OrderParams): Promise<RiskAwareOrderParams> {
    try {
      // Make sure we have a risk profile loaded
      if (!this.riskProfile) {
        await this.loadDefaultRiskProfile();
      }
      
      // Get market data for the symbol
      const { data: marketData, error: marketError } = await this.supabase
        .from('market_data')
        .select('*')
        .eq('symbol', params.symbol)
        .single();
      
      if (marketError) throw marketError;
      
      // Format market data
      const formattedMarketData: MarketData = {
        symbol: marketData.symbol,
        exchange: marketData.exchange,
        price: marketData.price,
        bid: marketData.bid,
        ask: marketData.ask,
        volume24h: marketData.volume_24h,
        change24h: marketData.change_24h,
        high24h: marketData.high_24h,
        low24h: marketData.low_24h,
        timestamp: marketData.timestamp
      };
      
      // Cast to RiskAwareOrderParams
      const riskParams = params as RiskAwareOrderParams;
      
      // Apply risk controls
      const enhancedOrder = this.riskManager.enhanceOrderWithRiskControls(riskParams, formattedMarketData);
      
      // Add trailing stop if enabled in risk profile
      if (this.riskProfile!.parameters.trailingStopEnabled && !riskParams.trailingStop) {
        riskParams.trailingStop = true;
        riskParams.trailingStopActivationPercentage = this.riskProfile!.parameters.trailingStopActivationPercent;
        riskParams.trailingStopDistance = this.riskProfile!.parameters.trailingStopDistance;
      }
      
      return {
        ...riskParams,
        stopLossPrice: enhancedOrder.stopLossPrice,
        takeProfitPrice: enhancedOrder.takeProfitPrice
      };
    } catch (error) {
      console.error('Error applying risk controls:', error);
      return params as RiskAwareOrderParams;
    }
  }
  
  /**
   * Update the RiskManager with the current portfolio state
   */
  private async updateRiskManagerState(): Promise<void> {
    try {
      // Get account data
      const { data: accountData, error: accountError } = await this.supabase
        .from('account_balances')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (accountError) throw accountError;
      
      // Get open positions
      const { data: positionsData, error: positionsError } = await this.supabase
        .from('positions')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'open');
      
      if (positionsError) throw positionsError;
      
      // Get market data for all symbols
      const symbols = [...new Set(positionsData.map((pos: any) => pos.symbol))];
      
      // Default market data in case we can't find it
      const marketData: Record<string, MarketData> = {};
      
      if (symbols.length > 0) {
        const { data: marketDataResult, error: marketDataError } = await this.supabase
          .from('market_data')
          .select('*')
          .in('symbol', symbols);
        
        if (!marketDataError && marketDataResult) {
          // Convert to record by symbol
          marketDataResult.forEach((item: any) => {
            marketData[item.symbol] = {
              symbol: item.symbol,
              exchange: item.exchange,
              price: item.price,
              bid: item.bid,
              ask: item.ask,
              volume24h: item.volume_24h,
              change24h: item.change_24h,
              high24h: item.high_24h,
              low24h: item.low_24h,
              timestamp: item.timestamp
            };
          });
        }
      }
      
      // Create a simplified mapping for now
      const sectorMapping: Record<string, string> = {};
      
      // Update the risk manager state
      await this.riskManager.updatePortfolioState(
        accountData.equity,
        positionsData,
        accountData.available_balance,
        marketData,
        sectorMapping
      );
    } catch (error) {
      console.error('Error updating risk manager state:', error);
    }
  }
}
