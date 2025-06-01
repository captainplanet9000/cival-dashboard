/**
 * Risk Assessment Database Service
 * Handles database operations for risk assessments and warnings
 */

import { createServerClient } from '@/utils/supabase/server';
import { YieldStrategy } from '@/types/yield-strategy.types';
import { RiskLevel } from '@/types/cross-chain-position.types';
import { RiskAssessment } from './risk-management-service';

export interface RiskWarning {
  id?: number;
  assessment_id: number;
  warning_type: string;
  message: string;
  severity: number; // 1: Info, 2: Warning, 3: Critical
  is_active: boolean;
}

export interface RiskSettings {
  id?: number;
  user_id: string;
  strategy_id?: number;
  max_risk_percent?: number;
  stop_loss_enabled: boolean;
  stop_loss_percent?: number;
  circuit_breaker_enabled: boolean;
  circuit_breaker_threshold?: number;
  auto_rebalance_enabled: boolean;
  auto_rebalance_threshold?: number;
  is_default: boolean;
}

export interface DbRiskAssessment {
  id?: number;
  strategy_id: number;
  risk_score: number;
  concentration_risk?: number;
  volatility_score?: number;
  max_drawdown?: number;
  recommended_max_allocation?: number;
  notes?: string;
}

export class RiskAssessmentDbService {
  /**
   * Save a risk assessment to the database
   */
  static async saveRiskAssessment(
    strategyId: number | string,
    assessment: RiskAssessment
  ): Promise<DbRiskAssessment | null> {
    const supabase = await createServerClient();
    
    try {
      // Convert string ID to number if needed
      const numericStrategyId = typeof strategyId === 'string' ? parseInt(strategyId) : strategyId;
      
      // Check if an assessment already exists for this strategy
      const { data: existingAssessment } = await supabase
        .from('risk_assessments')
        .select('id')
        .eq('strategy_id', numericStrategyId)
        .maybeSingle();
      
      const dbAssessment: DbRiskAssessment = {
        strategy_id: numericStrategyId,
        risk_score: assessment.riskScore,
        concentration_risk: assessment.concentrationRisk,
        volatility_score: assessment.volatilityScore,
        max_drawdown: assessment.maxDrawdown,
        recommended_max_allocation: assessment.recommendedMaxAllocation,
        notes: assessment.suggestions.join('\n')
      };
      
      let result;
      
      if (existingAssessment?.id) {
        // Update existing assessment
        const { data, error } = await supabase
          .from('risk_assessments')
          .update(dbAssessment)
          .eq('id', existingAssessment.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        
        // Delete old warnings
        await supabase
          .from('risk_warnings')
          .delete()
          .eq('assessment_id', existingAssessment.id);
      } else {
        // Create new assessment
        const { data, error } = await supabase
          .from('risk_assessments')
          .insert(dbAssessment)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }
      
      // Add warnings if any
      if (assessment.warnings.length > 0 && result) {
        const warnings: RiskWarning[] = assessment.warnings.map(warning => ({
          assessment_id: result.id!,
          warning_type: this.categorizeWarning(warning),
          message: warning,
          severity: this.getSeverityFromWarning(warning),
          is_active: true
        }));
        
        await supabase
          .from('risk_warnings')
          .insert(warnings);
      }
      
      return result;
    } catch (error) {
      console.error('Error saving risk assessment:', error);
      return null;
    }
  }
  
  /**
   * Retrieve a risk assessment from the database
   */
  static async getRiskAssessment(
    strategyId: number | string
  ): Promise<{assessment: DbRiskAssessment, warnings: RiskWarning[]} | null> {
    const supabase = await createServerClient();
    
    try {
      const numericStrategyId = typeof strategyId === 'string' ? parseInt(strategyId) : strategyId;
      
      // Get the assessment
      const { data: assessment, error } = await supabase
        .from('risk_assessments')
        .select('*')
        .eq('strategy_id', numericStrategyId)
        .maybeSingle();
      
      if (error) throw error;
      if (!assessment) return null;
      
      // Get the warnings
      const { data: warnings, error: warningsError } = await supabase
        .from('risk_warnings')
        .select('*')
        .eq('assessment_id', assessment.id)
        .eq('is_active', true);
      
      if (warningsError) throw warningsError;
      
      return {
        assessment,
        warnings: warnings || []
      };
    } catch (error) {
      console.error('Error retrieving risk assessment:', error);
      return null;
    }
  }
  
  /**
   * Save risk settings for a user/strategy
   */
  static async saveRiskSettings(settings: RiskSettings): Promise<RiskSettings | null> {
    const supabase = await createServerClient();
    
    try {
      if (settings.is_default) {
        // Check if default settings already exist for this user
        const { data: existingSettings } = await supabase
          .from('risk_settings')
          .select('id')
          .eq('user_id', settings.user_id)
          .eq('is_default', true)
          .maybeSingle();
        
        if (existingSettings?.id) {
          // Update existing default settings
          const { data, error } = await supabase
            .from('risk_settings')
            .update(settings)
            .eq('id', existingSettings.id)
            .select()
            .single();
          
          if (error) throw error;
          return data;
        }
      } else if (settings.strategy_id) {
        // Check if strategy-specific settings already exist
        const { data: existingSettings } = await supabase
          .from('risk_settings')
          .select('id')
          .eq('user_id', settings.user_id)
          .eq('strategy_id', settings.strategy_id)
          .maybeSingle();
        
        if (existingSettings?.id) {
          // Update existing strategy settings
          const { data, error } = await supabase
            .from('risk_settings')
            .update(settings)
            .eq('id', existingSettings.id)
            .select()
            .single();
          
          if (error) throw error;
          return data;
        }
      }
      
      // Create new settings
      const { data, error } = await supabase
        .from('risk_settings')
        .insert(settings)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving risk settings:', error);
      return null;
    }
  }
  
  /**
   * Get risk settings for a user/strategy
   */
  static async getRiskSettings(
    userId: string,
    strategyId?: number | string
  ): Promise<RiskSettings | null> {
    const supabase = await createServerClient();
    
    try {
      let query = supabase
        .from('risk_settings')
        .select('*')
        .eq('user_id', userId);
      
      if (strategyId) {
        const numericStrategyId = typeof strategyId === 'string' ? parseInt(strategyId) : strategyId;
        
        // Try to get strategy-specific settings first
        const { data: strategySettings } = await query
          .eq('strategy_id', numericStrategyId)
          .maybeSingle();
        
        if (strategySettings) return strategySettings;
      }
      
      // Fall back to default settings
      const { data: defaultSettings } = await query
        .eq('is_default', true)
        .maybeSingle();
      
      return defaultSettings;
    } catch (error) {
      console.error('Error retrieving risk settings:', error);
      return null;
    }
  }
  
  /**
   * Helper to categorize warning type
   */
  private static categorizeWarning(warningText: string): string {
    if (warningText.toLowerCase().includes('concentration')) return 'concentration';
    if (warningText.toLowerCase().includes('volatility')) return 'volatility';
    if (warningText.toLowerCase().includes('drawdown')) return 'drawdown';
    if (warningText.toLowerCase().includes('allocation')) return 'allocation';
    if (warningText.toLowerCase().includes('protocol')) return 'protocol';
    if (warningText.toLowerCase().includes('chain')) return 'chain';
    if (warningText.toLowerCase().includes('bridge')) return 'bridge';
    return 'general';
  }
  
  /**
   * Helper to determine warning severity
   */
  private static getSeverityFromWarning(warningText: string): number {
    const lowercaseText = warningText.toLowerCase();
    
    if (
      lowercaseText.includes('critical') || 
      lowercaseText.includes('exceeds') ||
      lowercaseText.includes('high') ||
      lowercaseText.includes('immediate')
    ) {
      return 3; // Critical
    }
    
    if (
      lowercaseText.includes('caution') ||
      lowercaseText.includes('consider') ||
      lowercaseText.includes('monitor')
    ) {
      return 2; // Warning
    }
    
    return 1; // Info
  }
}
