/**
 * Trading Farm Risk Management Service
 * Handles risk analysis, position sizing, and circuit breakers for trading and yield strategies
 */

import { createServerClient } from '@/utils/supabase/server';
import { YieldStrategy, YieldStrategyAllocation } from '@/types/yield-strategy.types';
import { RiskLevel, CrossChainPosition } from '@/types/cross-chain-position.types';
import { RiskAssessmentDbService, RiskSettings } from './risk-assessment-db';

// Risk thresholds for different risk levels
const RISK_THRESHOLDS = {
  MAX_ALLOCATION_PERCENT: {
    1: 25, // Low risk - max 25% in single allocation
    2: 35, // Medium risk - max 35% in single allocation
    3: 50, // High risk - max 50% in single allocation
    4: 75, // Very high risk - max 75% in single allocation
  },
  MAX_SINGLE_CHAIN_ALLOCATION: {
    1: 40, // Low risk - max 40% on a single chain
    2: 60, // Medium risk - max 60% on a single chain
    3: 80, // High risk - max 80% on a single chain
    4: 100, // Very high risk - no limit
  },
  DRAWDOWN_CIRCUIT_BREAKER: {
    1: -5, // Low risk - 5% drawdown triggers circuit breaker
    2: -10, // Medium risk - 10% drawdown triggers circuit breaker
    3: -15, // High risk - 15% drawdown triggers circuit breaker
    4: -25, // Very high risk - 25% drawdown triggers circuit breaker
  },
  VOLATILITY_MULTIPLIER: {
    1: 0.5, // Low risk - reduce position size by 50% in high volatility
    2: 0.7, // Medium risk - reduce position size by 30% in high volatility
    3: 0.9, // High risk - reduce position size by 10% in high volatility
    4: 1.0, // Very high risk - no reduction
  }
};

// Risk score calculation weights
const RISK_WEIGHTS = {
  PROTOCOL_RISK: 0.3,
  CHAIN_CONCENTRATION: 0.25,
  HISTORICAL_VOLATILITY: 0.2,
  CROSS_CHAIN_BRIDGE_RISK: 0.15,
  PROTOCOL_TVL: 0.1,
};

export interface RiskAssessment {
  riskScore: number;
  riskLevel: RiskLevel;
  maxDrawdown: number;
  volatilityScore: number;
  concentrationRisk: number;
  recommendedMaxAllocation: number;
  warnings: string[];
  suggestions: string[];
}

export interface PositionSizeRecommendation {
  recommendedSize: number;
  maxSize: number;
  minSize: number;
  riskAdjustedSize: number;
  initialStopLoss: number | null;
  takeProfitLevels: number[] | null;
}

export class RiskManagementService {
  /**
   * Assess risk for a yield strategy
   * @param strategy The yield strategy to assess
   * @param saveToDb Whether to save results to the database
   */
  async assessStrategyRisk(strategy: YieldStrategy, saveToDb: boolean = false): Promise<RiskAssessment> {
    try {
      // First check if we already have a recent assessment in the database
      if (saveToDb) {
        const existingAssessment = await RiskAssessmentDbService.getRiskAssessment(strategy.id);
        if (existingAssessment) {
          // Check if assessment is recent (less than 24 hours old)
          const assessmentTime = new Date(existingAssessment.assessment.updated_at as string);
          const now = new Date();
          const hoursSinceAssessment = (now.getTime() - assessmentTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceAssessment < 24) {
            // Return the existing assessment converted to our format
            return {
              riskScore: existingAssessment.assessment.risk_score,
              riskLevel: strategy.riskLevel,
              maxDrawdown: existingAssessment.assessment.max_drawdown || 0,
              volatilityScore: existingAssessment.assessment.volatility_score || 0,
              concentrationRisk: existingAssessment.assessment.concentration_risk || 0,
              recommendedMaxAllocation: existingAssessment.assessment.recommended_max_allocation || 0,
              warnings: existingAssessment.warnings.map(w => w.message),
              suggestions: existingAssessment.assessment.notes ? existingAssessment.assessment.notes.split('\n') : []
            };
          }
        }
      }
      
      const warnings: string[] = [];
      const suggestions: string[] = [];
      
      // Check chain concentration
      const chainConcentration = await this.calculateChainConcentration(strategy);
      if (chainConcentration > RISK_THRESHOLDS.MAX_SINGLE_CHAIN_ALLOCATION[strategy.riskLevel]) {
        warnings.push(`High concentration (${chainConcentration.toFixed(1)}%) on a single chain exceeds the ${RISK_THRESHOLDS.MAX_SINGLE_CHAIN_ALLOCATION[strategy.riskLevel]}% threshold for this risk level.`);
        suggestions.push('Consider diversifying across more chains to reduce concentration risk.');
      }
      
      // Check allocation concentration
      let highestAllocation = 0;
      if (strategy.allocations && strategy.allocations.length > 0) {
        highestAllocation = Math.max(...strategy.allocations.map(a => a.allocationPercent));
        if (highestAllocation > RISK_THRESHOLDS.MAX_ALLOCATION_PERCENT[strategy.riskLevel]) {
          warnings.push(`Highest protocol allocation (${highestAllocation.toFixed(1)}%) exceeds the ${RISK_THRESHOLDS.MAX_ALLOCATION_PERCENT[strategy.riskLevel]}% threshold for this risk level.`);
          suggestions.push('Rebalance to reduce exposure to any single protocol.');
        }
      } else {
        warnings.push('Strategy has no allocations. Risk assessment is incomplete.');
      }
      
      // Calculate volatility score
      const volatilityScore = await this.calculateVolatilityScore(strategy);
      if (volatilityScore > 0.7) {
        warnings.push(`High volatility detected (score: ${volatilityScore.toFixed(2)}).`);
        suggestions.push('Consider reducing position size during this period of high volatility.');
      }
      
      // Calculate protocol TVL risk
      const tvlRisk = await this.calculateProtocolTvlRisk(strategy);
      if (tvlRisk > 0.7) {
        warnings.push('Some protocols have low TVL relative to your allocation.');
        suggestions.push('Consider limiting exposure to protocols with lower TVL.');
      }
      
      // Calculate bridge risk if cross-chain
      const bridgeRisk = await this.calculateBridgeRisk(strategy);
      if (bridgeRisk > 0.6) {
        warnings.push('Cross-chain bridging adds significant risk to this strategy.');
        suggestions.push('Monitor bridge transactions closely and consider implementing a phased approach for large transfers.');
      }
      
      // Calculate overall risk score
      const protocolRisk = await this.calculateProtocolTvlRisk(strategy);
      const riskFactors = {
        protocolRisk,
        chainConcentration,
        volatilityScore,
        bridgeRisk,
        tvlRisk: protocolRisk // Simplified for now
      };
      
      const riskScore = this.calculateRiskScore(riskFactors);
      
      // Check protocol-specific warnings
      const protocolWarnings = await this.checkProtocolWarnings(strategy);
      warnings.push(...protocolWarnings);
      
      // Calculate max drawdown
      const maxDrawdown = await this.estimateMaxDrawdown(strategy) || 5 * strategy.riskLevel;
      
      // Generate recommendation for maximum allocation
      const recommendedMaxAllocation = this.calculateRecommendedMaxAllocation(riskScore, strategy.totalValueUsd);
      
      // Add general suggestions based on risk score
      if (riskScore > 0.7) {
        suggestions.push('Consider reducing position size due to high overall risk.');
      }
      
      if (bridgeRisk > 0.6 && strategy.chainAllocations && Object.keys(strategy.chainAllocations).length > 1) {
        suggestions.push('Cross-chain bridge risk is high. Consider using more established bridges or reducing cross-chain exposure.');
      }
      
      const assessment: RiskAssessment = {
        riskScore,
        riskLevel: strategy.riskLevel,
        maxDrawdown,
        volatilityScore,
        concentrationRisk: chainConcentration / 100, // Convert to 0-1 scale
        recommendedMaxAllocation,
        warnings,
        suggestions
      };
      
      // Save to database if requested
      if (saveToDb) {
        await RiskAssessmentDbService.saveRiskAssessment(strategy.id, assessment);
      }
      
      return assessment;
    } catch (error) {
      console.error('Error assessing strategy risk:', error);
      
      // Return a default assessment with error warning
      return {
        riskScore: 0.5,
        riskLevel: strategy.riskLevel,
        maxDrawdown: 5 * strategy.riskLevel,
        volatilityScore: 0.5,
        concentrationRisk: 0.5,
        recommendedMaxAllocation: strategy.totalValueUsd * 0.7,
        warnings: ['Error calculating risk assessment. Using default values.'],
        suggestions: ['Try again later or contact support if this issue persists.']
      };
    }
  }
  
  /**
   * Get risk assessment from database
   */
  async getRiskAssessmentFromDb(strategyId: number | string): Promise<RiskAssessment | null> {
    const dbAssessment = await RiskAssessmentDbService.getRiskAssessment(strategyId);
    
    if (!dbAssessment) return null;
    
    return {
      riskScore: dbAssessment.assessment.risk_score,
      riskLevel: 2, // Default to medium if we don't have this info
      maxDrawdown: dbAssessment.assessment.max_drawdown || 5,
      volatilityScore: dbAssessment.assessment.volatility_score || 0.5,
      concentrationRisk: dbAssessment.assessment.concentration_risk || 0.5,
      recommendedMaxAllocation: dbAssessment.assessment.recommended_max_allocation || 0,
      warnings: dbAssessment.warnings.map(w => w.message),
      suggestions: dbAssessment.assessment.notes ? dbAssessment.assessment.notes.split('\n') : []
    };
  }
  
  /**
   * Calculate optimal position size based on risk parameters
   * @param capital Available capital
   * @param riskLevel Risk level (1-4)
   * @param maxRiskPercent Maximum risk percentage per trade
   * @param volatilityMultiplier Market volatility multiplier
   * @param userId Optional user ID to fetch personalized risk settings
   */
  async calculatePositionSize(
    capital: number,
    riskLevel: RiskLevel,
    maxRiskPercent: number = 2,
    volatilityMultiplier: number = 1,
    userId?: string,
    strategyId?: number | string
  ): Promise<PositionSizeRecommendation> {
    // Get user risk settings if available
    let userRiskSettings: RiskSettings | null = null;
    if (userId) {
      userRiskSettings = await RiskAssessmentDbService.getRiskSettings(userId, strategyId);
    }
    
    // Use user settings if available
    const effectiveMaxRiskPercent = userRiskSettings?.max_risk_percent || maxRiskPercent;
    
    // Apply risk level multiplier
    const riskMultiplier = 1 + ((riskLevel - 1) * 0.5);
    
    // Apply volatility adjustment
    const volatilityThresholds = RISK_THRESHOLDS.VOLATILITY_MULTIPLIER;
    const adjustedVolatilityMultiplier = volatilityMultiplier * volatilityThresholds[riskLevel];
    
    // Calculate risk-adjusted size
    const maxRiskAmount = capital * (effectiveMaxRiskPercent / 100);
    const maxSize = capital * 0.8; // Never use more than 80% of capital
    const baseSize = capital * (riskLevel * 0.1); // Size increases with risk level
    const riskAdjustedSize = baseSize * riskMultiplier * adjustedVolatilityMultiplier;
    
    // Recommended size should not exceed max size or risk too little
    const recommendedSize = Math.min(maxSize, Math.max(capital * 0.05, riskAdjustedSize));
    
    // Check if stop loss is enabled in settings
    const stopLossEnabled = userRiskSettings ? userRiskSettings.stop_loss_enabled : riskLevel <= 3;
    
    // Calculate stop loss level if applicable
    const initialStopLoss = stopLossEnabled ? 
      (userRiskSettings?.stop_loss_percent || maxRiskAmount / recommendedSize * 100) : 
      null;
    
    // Calculate take profit levels based on risk/reward ratio
    const takeProfitLevels = stopLossEnabled ? 
      [initialStopLoss ? initialStopLoss * 1.5 : null, initialStopLoss ? initialStopLoss * 3 : null].filter(Boolean) as number[] : 
      null;
    
    return {
      recommendedSize,
      maxSize,
      minSize: capital * 0.05, // Minimum position size is 5% of capital
      riskAdjustedSize,
      initialStopLoss,
      takeProfitLevels
    };
  }
  
  /**
   * Save user risk settings
   */
  async saveRiskSettings(settings: RiskSettings): Promise<RiskSettings | null> {
    return RiskAssessmentDbService.saveRiskSettings(settings);
  }
  
  /**
   * Get user risk settings
   */
  async getRiskSettings(userId: string, strategyId?: number | string): Promise<RiskSettings | null> {
    return RiskAssessmentDbService.getRiskSettings(userId, strategyId);
  }
  
  /**
   * Check if a circuit breaker should be triggered
   */
  async checkCircuitBreakers(strategy: YieldStrategy, userId?: string): Promise<{ triggered: boolean; reason?: string }> {
    try {
      // Get user risk settings if available
      let userRiskSettings: RiskSettings | null = null;
      if (userId) {
        userRiskSettings = await RiskAssessmentDbService.getRiskSettings(userId, strategy.id);
      }
      
      // Check if circuit breakers are disabled in user settings
      if (userRiskSettings && userRiskSettings.circuit_breaker_enabled === false) {
        return { triggered: false, reason: 'Circuit breakers disabled in user settings' };
      }
      
      // Get current strategy stats - load from DB if available for performance
      let riskAssessment = await this.getRiskAssessmentFromDb(strategy.id);
      if (!riskAssessment) {
        riskAssessment = await this.assessStrategyRisk(strategy, true); // Save to DB for future use
      }
      
      // Check if any circuit breakers should be triggered
      const triggered = false;
      let reason = '';
      
      // Check 1: Max drawdown exceeded
      const maxAllowedDrawdown = userRiskSettings?.circuit_breaker_threshold || 
                                RISK_THRESHOLDS.DRAWDOWN_CIRCUIT_BREAKER[strategy.riskLevel];
      const currentDrawdown = -1 * await this.getCurrentDrawdown(strategy);
      
      if (currentDrawdown <= maxAllowedDrawdown) {
        return {
          triggered: true,
          reason: `Drawdown circuit breaker triggered: ${currentDrawdown.toFixed(2)}% exceeds threshold of ${maxAllowedDrawdown}%`
        };
      }
      
      // Check 2: Volatility spike
      if (riskAssessment.volatilityScore > 0.85) {
        return {
          triggered: true,
          reason: `Volatility circuit breaker triggered: Volatility score of ${riskAssessment.volatilityScore.toFixed(2)} exceeds threshold of 0.85`
        };
      }
      
      // Check 3: Concentration risk (only for lower risk levels)
      if (strategy.riskLevel <= 2 && riskAssessment.concentrationRisk > 0.7) {
        return {
          triggered: true,
          reason: `Concentration circuit breaker triggered: Concentration risk of ${riskAssessment.concentrationRisk.toFixed(2)} exceeds threshold of 0.7 for risk level ${strategy.riskLevel}`
        };
      }
      
      return { triggered: false };
    } catch (error) {
      console.error('Error checking circuit breakers:', error);
      return { triggered: false };
    }
  }
  
  /**
   * Check for protocol-specific warnings
   */
  private async checkProtocolWarnings(strategy: YieldStrategy): Promise<string[]> {
    const warnings: string[] = [];
    
    if (!strategy.allocations) {
      return warnings;
    }
    
    // Check protocol health
    const supabase = await createServerClient();
    
    for (const allocation of strategy.allocations) {
      // Check if protocol integration is healthy
      const { data, error } = await supabase
        .from('protocol_integrations')
        .select('health_status, error_count')
        .eq('protocol_id', allocation.protocolId)
        .single();
      
      if (error) {
        continue;
      }
      
      if (data && (data.health_status === 'degraded' || data.health_status === 'down')) {
        warnings.push(`Protocol ${allocation.protocol?.name || allocation.protocolId} is ${data.health_status}`);
      }
      
      if (data && data.error_count > 5) {
        warnings.push(`Protocol ${allocation.protocol?.name || allocation.protocolId} has ${data.error_count} recent errors`);
      }
    }
    
    return warnings;
  }
  
  /**
   * Calculate chain concentration (percentage on highest chain)
   */
  private async calculateChainConcentration(strategy: YieldStrategy): Promise<number> {
    if (!strategy.chainAllocations || Object.keys(strategy.chainAllocations).length === 0) {
      return 100; // If no allocations specified, assume 100% concentration
    }
    
    // Find the highest allocation percentage
    return Math.max(...Object.values(strategy.chainAllocations));
  }
  
  /**
   * Calculate volatility score based on historical data
   */
  private async calculateVolatilityScore(strategy: YieldStrategy): Promise<number> {
    try {
      const supabase = await createServerClient();
      
      // Get performance history for the last 30 days
      const { data, error } = await supabase
        .from('yield_strategy_performance')
        .select('timestamp, total_value_usd')
        .eq('strategy_id', strategy.id)
        .order('timestamp', { ascending: true })
        .limit(30);
      
      if (error || !data || data.length < 5) {
        // Default moderate volatility if insufficient data
        return 0.5;
      }
      
      // Calculate daily returns
      const returns: number[] = [];
      for (let i = 1; i < data.length; i++) {
        const previousValue = data[i-1].total_value_usd;
        const currentValue = data[i].total_value_usd;
        
        if (previousValue > 0) {
          returns.push((currentValue - previousValue) / previousValue);
        }
      }
      
      // Calculate standard deviation of returns
      const meanReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;
      const squaredDiffs = returns.map(val => Math.pow(val - meanReturn, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
      const stdDev = Math.sqrt(variance);
      
      // Normalize to a 0-1 scale (assuming 0.05 std dev is very stable, 0.2+ is highly volatile)
      return Math.min(1, Math.max(0, stdDev * 5));
    } catch (error) {
      console.error('Error calculating volatility score:', error);
      return 0.5; // Default to moderate volatility
    }
  }
  
  /**
   * Calculate protocol TVL risk
   */
  private async calculateProtocolTvlRisk(strategy: YieldStrategy): Promise<number> {
    if (!strategy.allocations || strategy.allocations.length === 0) {
      return 0.5; // Default if no allocations
    }
    
    // Calculate risk based on TVL ratio (allocation vs protocol TVL)
    const tvlRisks: number[] = [];
    
    for (const allocation of strategy.allocations) {
      if (!allocation.protocol || !allocation.protocol.tvlUsd || allocation.protocol.tvlUsd === 0) {
        tvlRisks.push(0.7); // Default high risk if TVL unknown
        continue;
      }
      
      // Calculate what percentage your allocation is of the protocol's TVL
      const allocationUsdValue = allocation.currentValueUsd;
      const tvlRatio = allocationUsdValue / allocation.protocol.tvlUsd;
      
      // Normalized risk score
      // tvlRatio of 0.001 (0.1%) or less is low risk (0.1)
      // tvlRatio of 0.01 (1%) is moderate risk (0.5)
      // tvlRatio of 0.05 (5%) or more is high risk (0.9)
      const normalizedRisk = Math.min(0.9, Math.max(0.1, tvlRatio * 20));
      tvlRisks.push(normalizedRisk);
    }
    
    // Return weighted average, giving more weight to higher risks
    return tvlRisks.sort((a, b) => b - a).reduce((sum, risk, index) => {
      const weight = 1 / Math.pow(2, index); // Exponentially decreasing weights
      return sum + (risk * weight);
    }, 0) / tvlRisks.reduce((sum, _, index) => sum + (1 / Math.pow(2, index)), 0);
  }
  
  /**
   * Calculate bridge risk for cross-chain strategies
   */
  private async calculateBridgeRisk(strategy: YieldStrategy): Promise<number> {
    // If single chain or no chain allocations, bridge risk is 0
    if (!strategy.chainAllocations || Object.keys(strategy.chainAllocations).length <= 1) {
      return 0;
    }
    
    // More chains = more bridge risk
    const chainCount = Object.keys(strategy.chainAllocations).length;
    
    // Base risk increases with chain count
    const baseRisk = Math.min(0.7, (chainCount - 1) * 0.15);
    
    // Risk is higher for chains with fewer established bridges
    let bridgeQualityRisk = 0;
    try {
      const supabase = await createServerClient();
      
      // Get bridge providers for chains in this strategy
      const { data, error } = await supabase
        .from('bridge_provider_configs')
        .select('source_chain_id, destination_chain_id, is_active, error_rate')
        .in('source_chain_id', Object.keys(strategy.chainAllocations))
        .in('destination_chain_id', Object.keys(strategy.chainAllocations));
      
      if (error || !data || data.length === 0) {
        bridgeQualityRisk = 0.3; // Default moderate risk if data unavailable
      } else {
        // Calculate average error rate for bridges between strategy chains
        const avgErrorRate = data.reduce((sum, bridge) => sum + (bridge.error_rate || 0), 0) / data.length;
        
        // Normalize to a 0-0.3 scale
        bridgeQualityRisk = Math.min(0.3, avgErrorRate / 100);
      }
    } catch (error) {
      console.error('Error calculating bridge quality risk:', error);
      bridgeQualityRisk = 0.3; // Default moderate risk
    }
    
    return baseRisk + bridgeQualityRisk;
  }
  
  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(riskFactors: {
    protocolRisk: number;
    chainConcentration: number;
    volatilityScore: number;
    bridgeRisk: number;
    tvlRisk: number;
  }): number {
    return (
      riskFactors.protocolRisk * RISK_WEIGHTS.PROTOCOL_RISK +
      riskFactors.chainConcentration * RISK_WEIGHTS.CHAIN_CONCENTRATION +
      riskFactors.volatilityScore * RISK_WEIGHTS.HISTORICAL_VOLATILITY +
      riskFactors.bridgeRisk * RISK_WEIGHTS.CROSS_CHAIN_BRIDGE_RISK +
      riskFactors.tvlRisk * RISK_WEIGHTS.PROTOCOL_TVL
    );
  }
  
  /**
   * Estimate maximum drawdown based on historical data
   */
  private async estimateMaxDrawdown(strategy: YieldStrategy): Promise<number | null> {
    try {
      const supabase = await createServerClient();
      
      // Get performance history
      const { data, error } = await supabase
        .from('yield_strategy_performance')
        .select('timestamp, total_value_usd')
        .eq('strategy_id', strategy.id)
        .order('timestamp', { ascending: true });
      
      if (error || !data || data.length < 10) {
        return null; // Insufficient data
      }
      
      // Calculate rolling drawdowns
      let maxDrawdown = 0;
      let peakValue = data[0].total_value_usd;
      
      for (const point of data) {
        if (point.total_value_usd > peakValue) {
          peakValue = point.total_value_usd;
        } else {
          const drawdown = (point.total_value_usd - peakValue) / peakValue * 100;
          if (drawdown < maxDrawdown) {
            maxDrawdown = drawdown;
          }
        }
      }
      
      return Math.abs(maxDrawdown);
    } catch (error) {
      console.error('Error estimating max drawdown:', error);
      return null;
    }
  }
  
  /**
   * Calculate recommended maximum allocation
   */
  private calculateRecommendedMaxAllocation(riskScore: number, currentValue: number): number {
    // Higher risk score = lower recommended max allocation
    const allocationPercentage = 100 - (riskScore * 50); // 50% to 100% depending on risk
    return currentValue * (allocationPercentage / 100);
  }
  
  /**
   * Apply stop loss to an order
   */
  applyStopLoss(orderValue: number, stopLossPercent: number): number {
    return orderValue * (1 - stopLossPercent / 100);
  }
  
  /**
   * Apply take profit levels
   */
  applyTakeProfit(orderValue: number, takeProfitPercent: number[]): number[] {
    return takeProfitPercent.map(percent => orderValue * (1 + percent / 100));
  }
  
  /**
   * Get diversification recommendations for a position
   */
  async getDiversificationRecommendations(position: CrossChainPosition): Promise<{
    recommended: Record<string, number>;
    current: Record<string, number>;
    suggestions: string[];
  }> {
    // Current allocation by chain
    const current: Record<string, number> = {};
    
    // Calculate current allocations
    if (position.components) {
      const totalValue = position.components.reduce((sum, comp) => sum + comp.valueUsd, 0);
      
      for (const component of position.components) {
        const chainId = component.chainId;
        if (!current[chainId]) {
          current[chainId] = 0;
        }
        current[chainId] += (component.valueUsd / totalValue) * 100;
      }
    }
    
    // Calculate recommended allocation based on risk level
    const recommended: Record<string, number> = {};
    const suggestions: string[] = [];
    
    switch (position.riskLevel) {
      case 1: // Low risk
        recommended['1'] = 40; // Ethereum
        recommended['137'] = 25; // Polygon
        recommended['10'] = 15; // Optimism
        recommended['42161'] = 20; // Arbitrum
        suggestions.push('For low risk, maintain significant allocation to Ethereum mainnet.');
        suggestions.push('Diversify remaining capital across established L2 networks.');
        break;
        
      case 2: // Medium risk
        recommended['1'] = 30; // Ethereum
        recommended['137'] = 20; // Polygon
        recommended['42161'] = 25; // Arbitrum
        recommended['43114'] = 15; // Avalanche
        recommended['10'] = 10; // Optimism
        suggestions.push('Balance between Ethereum and L2s/sidechains for moderate risk.');
        suggestions.push('Consider small allocations to newer L2s with strong fundamentals.');
        break;
        
      case 3: // High risk
        recommended['1'] = 20; // Ethereum
        recommended['137'] = 15; // Polygon
        recommended['42161'] = 20; // Arbitrum
        recommended['43114'] = 15; // Avalanche
        recommended['56'] = 15; // BSC
        recommended['10'] = 15; // Optimism
        suggestions.push('Diversify broadly across established and emerging chains.');
        suggestions.push('Limit exposure to any single chain to reduce risk.');
        break;
        
      case 4: // Very high risk
        recommended['1'] = 15; // Ethereum
        recommended['137'] = 10; // Polygon
        recommended['42161'] = 15; // Arbitrum
        recommended['43114'] = 15; // Avalanche
        recommended['56'] = 10; // BSC
        recommended['250'] = 10; // Fantom
        recommended['10'] = 15; // Optimism
        recommended['1101'] = 10; // Polygon zkEVM
        suggestions.push('Maximum diversification across established and emerging chains.');
        suggestions.push('Consider allocations to experimental L2s and new chains with potential.');
        break;
    }
    
    return {
      recommended,
      current,
      suggestions
    };
  }
}
