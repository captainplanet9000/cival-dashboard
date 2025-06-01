/**
 * Enhanced Risk Management Service
 * 
 * This service extends the base risk management functionality with:
 * - Risk profiles management
 * - Risk parameters for farms, strategies, accounts, and goals
 * - Risk event tracking and monitoring
 * - Circuit breaker management
 * - Integration with ElizaOS agents for risk-aware trading
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { TradingEventEmitter, TRADING_EVENTS } from '@/utils/events/trading-events';
import riskManagementService, { RiskProfile as LegacyRiskProfile } from './risk-management-service';

// Type definitions matching our database schema
export interface RiskProfileRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  parameters: {
    max_drawdown: number;
    position_sizing: {
      method: 'fixed' | 'percentage' | 'risk_based' | 'kelly' | 'volatility_adjusted';
      value: number;
    };
    trade_limits: {
      max_open_trades: number;
      max_daily_trades: number;
      max_trade_size?: number;
    };
    risk_reward_parameters: {
      min_risk_reward_ratio: number;
      take_profit_required: boolean;
      stop_loss_required: boolean;
    };
    circuit_breakers: {
      enabled: boolean;
      daily_loss_percentage: number;
      weekly_loss_percentage: number;
      monthly_loss_percentage: number;
      consecutive_losses: number;
      volatility_threshold?: number;
    };
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface RiskParameterRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  profile_id?: string;
  target_type: 'farm' | 'strategy' | 'account' | 'goal';
  target_id: string;
  max_drawdown?: number;
  position_sizing?: {
    method: 'fixed' | 'percentage' | 'risk_based' | 'kelly' | 'volatility_adjusted';
    value: number;
  };
  trade_limits?: {
    max_open_trades: number;
    max_daily_trades: number;
    max_trade_size?: number;
  };
  risk_reward_parameters?: {
    min_risk_reward_ratio: number;
    take_profit_required: boolean;
    stop_loss_required: boolean;
  };
  circuit_breakers?: {
    enabled: boolean;
    daily_loss_percentage: number;
    weekly_loss_percentage: number;
    monthly_loss_percentage: number;
    consecutive_losses: number;
    volatility_threshold?: number;
  };
  custom_parameters?: Record<string, any>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface RiskEventRecord {
  id: string;
  user_id: string;
  event_type: 'circuit_breaker_triggered' | 'drawdown_warning' | 'drawdown_exceeded' | 'position_size_exceeded' | 'trade_limit_reached' | 'volatility_warning' | 'risk_reward_violation' | 'manual_intervention' | 'system_action';
  severity: 'info' | 'warning' | 'critical';
  target_type: 'farm' | 'strategy' | 'account' | 'goal' | 'agent' | 'position' | 'order';
  target_id: string;
  parameter_id?: string;
  description: string;
  details: Record<string, any>;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolution?: string;
  resolution_details?: Record<string, any>;
  created_at: string;
}

export interface RiskActionRecord {
  id: string;
  event_id: string;
  action_type: 'trading_paused' | 'position_closed' | 'farm_disabled' | 'strategy_disabled' | 'size_reduced' | 'notification_sent' | 'agent_paused' | 'agent_override' | 'manual_action';
  description: string;
  details?: Record<string, any>;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  executed_at?: string;
  result?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface RiskMetricsRecord {
  id: string;
  user_id: string;
  account_id?: string;
  date: string;
  period: 'daily' | 'weekly' | 'monthly';
  starting_balance: number;
  ending_balance: number;
  drawdown_percentage?: number;
  max_drawdown_percentage?: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  average_risk_per_trade?: number;
  largest_loss?: number;
  largest_gain?: number;
  profit_factor?: number;
  sharpe_ratio?: number;
  volatility?: number;
  custom_metrics?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// API response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Service class
class EnhancedRiskService {
  /**
   * Get all risk profiles for the current user
   */
  async getRiskProfiles(): Promise<ApiResponse<RiskProfileRecord[]>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('risk_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching risk profiles:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error in getRiskProfiles:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get a specific risk profile by ID
   */
  async getRiskProfile(id: string): Promise<ApiResponse<RiskProfileRecord>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('risk_profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching risk profile:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error in getRiskProfile:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Create a new risk profile
   */
  async createRiskProfile(profile: Omit<RiskProfileRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<RiskProfileRecord>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('risk_profiles')
        .insert(profile)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating risk profile:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error in createRiskProfile:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Update an existing risk profile
   */
  async updateRiskProfile(id: string, updates: Partial<Omit<RiskProfileRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<RiskProfileRecord>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('risk_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating risk profile:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error in updateRiskProfile:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Delete a risk profile
   */
  async deleteRiskProfile(id: string): Promise<ApiResponse<void>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Check if the profile is in use
      const { count: parameterCount, error: countError } = await supabase
        .from('risk_parameters')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', id);
      
      if (countError) {
        console.error('Error checking if profile is in use:', countError);
        return { success: false, error: countError.message };
      }
      
      if (parameterCount && parameterCount > 0) {
        return { 
          success: false, 
          error: `This risk profile is currently in use by ${parameterCount} risk parameters and cannot be deleted.` 
        };
      }
      
      const { error } = await supabase
        .from('risk_profiles')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting risk profile:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteRiskProfile:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get risk parameters for a specific target (farm, strategy, account, goal)
   */
  async getRiskParameters(targetType: 'farm' | 'strategy' | 'account' | 'goal', targetId: string): Promise<ApiResponse<RiskParameterRecord>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('risk_parameters')
        .select('*, profile:profile_id(*)')
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching risk parameters:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error in getRiskParameters:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Create or update risk parameters for a specific target
   */
  async setRiskParameters(
    targetType: 'farm' | 'strategy' | 'account' | 'goal',
    targetId: string,
    parameters: Omit<RiskParameterRecord, 'id' | 'user_id' | 'target_type' | 'target_id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<RiskParameterRecord>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Check if parameters already exist for this target
      const { data: existing, error: checkError } = await supabase
        .from('risk_parameters')
        .select('id')
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking existing risk parameters:', checkError);
        return { success: false, error: checkError.message };
      }
      
      let result;
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('risk_parameters')
          .update({
            ...parameters,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) {
          console.error('Error updating risk parameters:', error);
          return { success: false, error: error.message };
        }
        
        result = data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('risk_parameters')
          .insert({
            ...parameters,
            target_type: targetType,
            target_id: targetId
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating risk parameters:', error);
          return { success: false, error: error.message };
        }
        
        result = data;
      }
      
      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error in setRiskParameters:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Log a risk event
   */
  async logRiskEvent(
    eventType: RiskEventRecord['event_type'],
    severity: RiskEventRecord['severity'],
    targetType: RiskEventRecord['target_type'],
    targetId: string,
    description: string,
    details: Record<string, any> = {},
    parameterId?: string
  ): Promise<ApiResponse<RiskEventRecord>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('risk_events')
        .insert({
          event_type: eventType,
          severity,
          target_type: targetType,
          target_id: targetId,
          parameter_id: parameterId,
          description,
          details
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error logging risk event:', error);
        return { success: false, error: error.message };
      }
      
      // Emit event for UI notification
      TradingEventEmitter.emit(TRADING_EVENTS.SYSTEM_WARNING, {
        title: `Risk ${severity.toUpperCase()}: ${eventType.replace(/_/g, ' ')}`,
        message: description,
        details: {
          ...details,
          eventId: data.id,
          targetType,
          targetId
        }
      });
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error in logRiskEvent:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Create a risk action in response to a risk event
   */
  async createRiskAction(
    eventId: string,
    actionType: RiskActionRecord['action_type'],
    description: string,
    details: Record<string, any> = {}
  ): Promise<ApiResponse<RiskActionRecord>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('risk_actions')
        .insert({
          event_id: eventId,
          action_type: actionType,
          description,
          details,
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating risk action:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error in createRiskAction:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Execute a risk action
   */
  async executeRiskAction(actionId: string, result: Record<string, any> = {}): Promise<ApiResponse<RiskActionRecord>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('risk_actions')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString(),
          result
        })
        .eq('id', actionId)
        .select()
        .single();
      
      if (error) {
        console.error('Error executing risk action:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error in executeRiskAction:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get recent risk events for a target
   */
  async getRiskEvents(
    targetType?: RiskEventRecord['target_type'],
    targetId?: string,
    limit: number = 10,
    acknowledged: boolean = false
  ): Promise<ApiResponse<RiskEventRecord[]>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      let query = supabase
        .from('risk_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (targetType && targetId) {
        query = query.eq('target_type', targetType).eq('target_id', targetId);
      }
      
      if (acknowledged !== null) {
        query = query.eq('acknowledged', acknowledged);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching risk events:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error in getRiskEvents:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Acknowledge a risk event
   */
  async acknowledgeRiskEvent(
    eventId: string,
    resolution?: string,
    resolutionDetails?: Record<string, any>
  ): Promise<ApiResponse<RiskEventRecord>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const updateData: any = {
        acknowledged: true,
        acknowledged_at: new Date().toISOString()
      };
      
      if (resolution) {
        updateData.resolution = resolution;
      }
      
      if (resolutionDetails) {
        updateData.resolution_details = resolutionDetails;
      }
      
      const { data, error } = await supabase
        .from('risk_events')
        .update(updateData)
        .eq('id', eventId)
        .select()
        .single();
      
      if (error) {
        console.error('Error acknowledging risk event:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error in acknowledgeRiskEvent:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check if a trading goal is within risk parameters
   */
  async validateGoalRisk(
    goalId: string,
    targetAsset: string,
    targetAmount: number,
    timelineDays?: number,
    sourceAssets?: string[]
  ): Promise<ApiResponse<{ valid: boolean; warnings: string[]; riskScore: number }>> {
    try {
      // Get risk parameters for this goal
      const { data: riskParams, error } = await this.getRiskParameters('goal', goalId);
      
      if (error) {
        return { 
          success: false, 
          error
        };
      }
      
      // If no specific risk parameters, use defaults
      const params = riskParams || {
        max_drawdown: 10,
        trade_limits: {
          max_open_trades: 5,
          max_daily_trades: 10
        },
        circuit_breakers: {
          enabled: true,
          daily_loss_percentage: 5
        }
      };
      
      // Perform validation checks
      const warnings: string[] = [];
      let riskScore = 0;
      
      // These checks would be customized based on your specific requirements
      // For example:
      if (timelineDays && timelineDays < 7) {
        warnings.push('Very short timeline may lead to excessive trading and higher fees');
        riskScore += 20;
      }
      
      // For now, we'll always return valid with some generic warnings
      return {
        success: true,
        data: {
          valid: true,
          warnings,
          riskScore
        }
      };
    } catch (error: any) {
      console.error('Error validating goal risk:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Convert legacy risk profile to new format
   */
  convertLegacyRiskProfile(legacy: LegacyRiskProfile): Omit<RiskProfileRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
    return {
      name: legacy.name,
      description: `Converted from legacy risk profile: ${legacy.name}`,
      is_default: false,
      parameters: {
        max_drawdown: legacy.max_drawdown_percent,
        position_sizing: {
          method: this.mapLegacyPositionSizingMethod(legacy.position_sizing_method),
          value: legacy.max_risk_per_trade_percent
        },
        trade_limits: {
          max_open_trades: legacy.max_open_positions,
          max_daily_trades: legacy.max_daily_trades,
          max_trade_size: legacy.max_position_size
        },
        risk_reward_parameters: {
          min_risk_reward_ratio: 1.5, // Default
          take_profit_required: false,
          stop_loss_required: true
        },
        circuit_breakers: {
          enabled: true,
          daily_loss_percentage: legacy.max_daily_drawdown_percent,
          weekly_loss_percentage: legacy.max_drawdown_percent * 1.5,
          monthly_loss_percentage: legacy.max_drawdown_percent,
          consecutive_losses: legacy.agent_circuit_breakers.consecutive_losses_limit,
          volatility_threshold: legacy.agent_circuit_breakers.volatility_threshold
        }
      }
    };
  }
  
  /**
   * Map legacy position sizing method to new format
   */
  private mapLegacyPositionSizingMethod(legacyMethod: string): 'fixed' | 'percentage' | 'risk_based' | 'kelly' | 'volatility_adjusted' {
    switch (legacyMethod) {
      case 'fixed':
        return 'fixed';
      case 'percent_of_balance':
        return 'percentage';
      case 'risk_based':
        return 'risk_based';
      case 'kelly_criterion':
        return 'kelly';
      case 'custom':
      default:
        return 'percentage';
    }
  }
  
  /**
   * Subscribe to risk events (client-side only)
   */
  subscribeToRiskEvents(callback: (event: RiskEventRecord) => void): () => void {
    if (typeof window === 'undefined') {
      console.warn('Risk event subscription attempted on server side');
      return () => {};
    }
    
    const supabase = createBrowserClient();
    
    const subscription = supabase
      .channel('risk_events_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'risk_events'
        },
        (payload) => {
          callback(payload.new as RiskEventRecord);
        }
      )
      .subscribe();
    
    // Return unsubscribe function
    return () => {
      supabase.removeChannel(subscription);
    };
  }
}

export const enhancedRiskService = new EnhancedRiskService();
export default enhancedRiskService;
