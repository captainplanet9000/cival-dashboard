/**
 * Risk Management Service
 *
 * Handles:
 * - User risk profiles (max drawdown, max position size, etc.)
 * - Circuit breaker logic
 * - Position sizing rules
 * - Risk event logging
 */

import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

export interface RiskProfile {
  id: number;
  user_id: string;
  max_drawdown: number; // e.g. 0.2 for 20%
  max_position_size: number; // e.g. 0.05 for 5% of capital
  max_daily_loss: number; // e.g. 0.1 for 10% per day
  risk_per_trade: number; // e.g. 0.01 for 1% per trade
  created_at: string;
  updated_at: string;
}

export interface CircuitBreaker {
  id: number;
  user_id: string;
  enabled: boolean;
  trigger_type: 'drawdown' | 'volatility' | 'manual';
  threshold: number;
  cooldown_minutes?: number;
  notification_channels?: Record<string, any>;
  status?: 'active' | 'triggered' | 'reset';
  created_at: string;
  updated_at: string;
}

export interface PositionSizingRule {
  id: number;
  user_id: string;
  strategy_type: string;
  calculation_method: 'fixed' | 'risk_percent' | 'volatility_adjusted' | 'kelly';
  max_risk_percent: number;
  position_sizing_model?: string;
  parameters?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

class RiskManagementService {
  private static instance: RiskManagementService;
  private constructor() {}

  public static getInstance(): RiskManagementService {
    if (!RiskManagementService.instance) {
      RiskManagementService.instance = new RiskManagementService();
    }
    return RiskManagementService.instance;
  }

  /**
   * Fetch user risk profile
   */
  public async getRiskProfile(userId: string): Promise<RiskProfile | null> {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('risk_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) return null;
    return data as RiskProfile;
  }

  /**
   * Update or create risk profile
   */
  public async upsertRiskProfile(userId: string, profile: Partial<RiskProfile>): Promise<RiskProfile | null> {
    const supabase = await createServerClient();
    
    // Fix type error by ensuring user_id is a string, not string[]
    const profileData = { 
      ...profile, 
      user_id: userId 
    };
    
    const { data, error } = await supabase
      .from('risk_profiles')
      .upsert(profileData, { onConflict: 'user_id' })
      .select()
      .single();
      
    if (error) {
      console.error('Error upserting risk profile:', error);
      return null;
    }
    
    return data as RiskProfile;
  }

  /**
   * Fetch circuit breaker config
   */
  public async getCircuitBreaker(userId: string): Promise<CircuitBreaker | null> {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('circuit_breakers')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) return null;
    return data as CircuitBreaker;
  }

  /**
   * Update or create circuit breaker config
   */
  public async upsertCircuitBreaker(userId: string, config: Partial<CircuitBreaker>): Promise<CircuitBreaker | null> {
    const supabase = await createServerClient();
    
    const circuitBreakerData = {
      ...config,
      user_id: userId
    };
    
    const { data, error } = await supabase
      .from('circuit_breakers')
      .upsert(circuitBreakerData, { onConflict: 'user_id' })
      .select()
      .single();
      
    if (error) {
      console.error('Error upserting circuit breaker:', error);
      return null;
    }
    
    return data as CircuitBreaker;
  }

  /**
   * Calculate position size based on different models
   */
  public calculatePositionSize(
    capital: number,
    riskPerTrade: number,
    stopLossPercent: number,
    method: 'fixed' | 'risk_percent' | 'volatility_adjusted' | 'kelly' = 'risk_percent',
    additionalParams: Record<string, any> = {}
  ): number {
    // Guard against negative or zero values
    if (stopLossPercent <= 0 || capital <= 0 || riskPerTrade <= 0) return 0;
    
    switch (method) {
      case 'fixed':
        // Fixed size based on capital
        return capital * (additionalParams.fixedPercent || 0.01);
        
      case 'risk_percent':
        // Standard risk-based sizing: position = (capital * riskPerTrade) / stopLossPercent
        return (capital * riskPerTrade) / stopLossPercent;
        
      case 'volatility_adjusted':
        // Adjust position size based on market volatility
        const volatility = additionalParams.volatility || 1;
        const volatilityFactor = 1 / (volatility || 1);
        return (capital * riskPerTrade * volatilityFactor) / stopLossPercent;
        
      case 'kelly':
        // Kelly Criterion: f* = (bp - q) / b
        // Where: b = odds - 1, p = win probability, q = 1 - p
        const winRate = additionalParams.winRate || 0.5;
        const lossRate = 1 - winRate;
        const rewardRiskRatio = additionalParams.rewardRiskRatio || 1.5;
        
        // Kelly formula
        const kellyFraction = (winRate * rewardRiskRatio - lossRate) / rewardRiskRatio;
        
        // Use half-Kelly for more conservative sizing (common practice)
        const halfKelly = Math.max(0, kellyFraction * 0.5);
        
        return capital * halfKelly;
        
      default:
        // Default to standard risk-based sizing
        return (capital * riskPerTrade) / stopLossPercent;
    }
  }
  
  /**
   * Check if circuit breaker should trigger
   */
  public async checkCircuitBreaker(
    userId: string,
    metrics: { drawdown?: number; volatility?: number; dailyLoss?: number }
  ): Promise<{ triggered: boolean; reason?: string }> {
    const circuitBreaker = await this.getCircuitBreaker(userId);
    
    if (!circuitBreaker || !circuitBreaker.enabled) {
      return { triggered: false };
    }
    
    switch (circuitBreaker.trigger_type) {
      case 'drawdown':
        if (metrics.drawdown && metrics.drawdown >= circuitBreaker.threshold) {
          return { 
            triggered: true, 
            reason: `Drawdown of ${(metrics.drawdown * 100).toFixed(2)}% exceeded threshold of ${(circuitBreaker.threshold * 100).toFixed(2)}%` 
          };
        }
        break;
        
      case 'volatility':
        if (metrics.volatility && metrics.volatility >= circuitBreaker.threshold) {
          return { 
            triggered: true, 
            reason: `Market volatility of ${metrics.volatility.toFixed(2)} exceeded threshold of ${circuitBreaker.threshold.toFixed(2)}` 
          };
        }
        break;
        
      case 'manual':
        // Manual breakers are triggered through UI actions, not automatically
        break;
    }
    
    return { triggered: false };
  }

  /**
   * Log a risk event
   */
  public async logRiskEvent(event: RiskEvent): Promise<RiskEvent | null> {
    const supabase = await createServerClient();
    
    const eventData = {
      ...event,
      acknowledged: event.acknowledged || false,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('risk_events')
      .insert(eventData)
      .select()
      .single();
      
    if (error) {
      console.error('Error logging risk event:', error);
      return null;
    }
    
    return data as RiskEvent;
  }
  
  /**
   * Get risk events for a user
   */
  public async getRiskEvents(userId: string, limit: number = 10): Promise<RiskEvent[]> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('risk_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error || !data) {
      console.error('Error fetching risk events:', error);
      return [];
    }
    
    return data as RiskEvent[];
  }
  
  /**
   * Acknowledge a risk event
   */
  public async acknowledgeRiskEvent(eventId: number, userId: string): Promise<boolean> {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('risk_events')
      .update({ acknowledged: true })
      .eq('id', eventId)
      .eq('user_id', userId);
      
    return !error;
  }
  
  /**
   * Get position sizing rules
   */
  public async getPositionSizingRules(userId: string): Promise<PositionSizingRule[]> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('position_sizing_rules')
      .select('*')
      .eq('user_id', userId);
      
    if (error || !data) {
      return [];
    }
    
    return data as PositionSizingRule[];
  }
  
  /**
   * Create or update position sizing rule
   */
  public async upsertPositionSizingRule(userId: string, rule: Partial<PositionSizingRule>): Promise<PositionSizingRule | null> {
    const supabase = await createServerClient();
    
    const ruleData = {
      ...rule,
      user_id: userId
    };
    
    const { data, error } = await supabase
      .from('position_sizing_rules')
      .upsert(ruleData, { onConflict: 'user_id, strategy_type' })
      .select()
      .single();
      
    if (error) {
      console.error('Error upserting position sizing rule:', error);
      return null;
    }
    
    return data as PositionSizingRule;
  }
}

export const riskManagementService = RiskManagementService.getInstance();
