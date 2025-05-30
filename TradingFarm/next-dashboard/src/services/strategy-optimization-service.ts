/**
 * Strategy Optimization Service
 * Uses AI to recommend strategy optimizations based on goal analytics and agent memories
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { Goal, GoalStrategy } from '@/types/goal-types';
import { GoalAnalytics } from '@/services/goal-analytics-service';

export interface OptimizationRecommendation {
  id: string;
  type: 'PARAMETER_ADJUSTMENT' | 'STRATEGY_SWITCH' | 'TIMING_ADJUSTMENT' | 'RISK_ADJUSTMENT';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  reasoning: string;
  expectedBenefit: string;
  parameters?: Record<string, any>;
  confidence: number; // 0-1
}

export interface OptimizationResult {
  goalId: string;
  timestamp: string;
  marketConditions: {
    trend: string;
    volatility: string;
    liquidity: string;
  };
  currentPerformance: {
    acquisitionRate: number;
    successRate: number;
    costEfficiency: number;
  };
  recommendations: OptimizationRecommendation[];
  appliedRecommendations?: string[];
}

/**
 * Service for generating and applying AI strategy optimizations
 */
export const strategyOptimizationService = {
  /**
   * Generate strategy optimization recommendations based on goal analytics
   */
  async generateOptimizations(
    goalId: string,
    analytics?: GoalAnalytics
  ): Promise<{ data: OptimizationResult | null; error: string | null }> {
    try {
      // If analytics not provided, fetch them
      if (!analytics) {
        const analyticsResponse = await fetch(`/api/goals/acquisition/analytics?goal_id=${goalId}`);
        if (!analyticsResponse.ok) {
          throw new Error('Failed to fetch goal analytics');
        }
        
        const analyticsResult = await analyticsResponse.json();
        if (!analyticsResult.data) {
          return { data: null, error: 'Analytics data not available' };
        }
        
        analytics = analyticsResult.data;
      }
      
      // Fetch recent agent memories for additional context
      const memoriesResponse = await fetch(`/api/goals/acquisition/agent-memories?goal_id=${goalId}&limit=20`);
      if (!memoriesResponse.ok) {
        console.warn('Failed to fetch agent memories for optimization context');
      }
      
      let memories: any[] = [];
      const memoriesResult = await memoriesResponse.json();
      if (memoriesResult.data) {
        memories = memoriesResult.data;
      }
      
      // Generate optimization recommendations
      const recommendations = this.analyzeAndGenerateRecommendations(
        analytics,
        memories
      );
      
      const result: OptimizationResult = {
        goalId,
        timestamp: new Date().toISOString(),
        marketConditions: {
          trend: analytics.marketConditions.trend,
          volatility: analytics.marketConditions.volatility,
          liquidity: analytics.marketConditions.liquidity,
        },
        currentPerformance: {
          acquisitionRate: analytics.performanceMetrics.acquisitionRate,
          successRate: analytics.strategies.length > 0 
            ? analytics.strategies.reduce((acc, s) => acc + s.successRate, 0) / analytics.strategies.length 
            : 0,
          costEfficiency: analytics.performanceMetrics.costEfficiency,
        },
        recommendations,
      };
      
      return { data: result, error: null };
    } catch (error) {
      console.error('Error generating optimizations:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },
  
  /**
   * Apply a recommended optimization to a goal's strategy
   */
  async applyOptimization(
    goalId: string,
    recommendationId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // First get the current optimization recommendations
      const { data: optimizations, error } = await this.generateOptimizations(goalId);
      
      if (error || !optimizations) {
        return { success: false, error: error || 'Failed to generate optimizations' };
      }
      
      // Find the specific recommendation
      const recommendation = optimizations.recommendations.find(r => r.id === recommendationId);
      if (!recommendation) {
        return { success: false, error: 'Recommendation not found' };
      }
      
      // Get the current goal and strategies
      const supabase = createBrowserClient();
      const { data: goal, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();
      
      if (goalError || !goal) {
        return { success: false, error: 'Goal not found' };
      }
      
      const { data: strategies, error: strategiesError } = await supabase
        .from('goal_strategies')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (strategiesError) {
        return { success: false, error: 'Failed to fetch strategies' };
      }
      
      // If no strategies exist, we can't apply an optimization
      if (!strategies || strategies.length === 0) {
        return { success: false, error: 'No strategy found to optimize' };
      }
      
      // Get the most recent strategy
      const currentStrategy = strategies[0];
      
      // Apply the recommendation based on type
      let updatedStrategy: Partial<GoalStrategy> = { ...currentStrategy };
      delete updatedStrategy.id; // Remove the ID for the new strategy
      
      switch (recommendation.type) {
        case 'PARAMETER_ADJUSTMENT':
          // Update strategy parameters
          if (recommendation.parameters) {
            updatedStrategy.parameters = {
              ...(currentStrategy.parameters || {}),
              ...recommendation.parameters
            };
          }
          break;
          
        case 'STRATEGY_SWITCH':
          // Change strategy type
          if (recommendation.parameters?.strategy_type) {
            updatedStrategy.strategy_type = recommendation.parameters.strategy_type;
            updatedStrategy.parameters = {
              ...(currentStrategy.parameters || {}),
              ...recommendation.parameters
            };
          }
          break;
          
        case 'TIMING_ADJUSTMENT':
          // Update timing parameters
          if (recommendation.parameters?.timing) {
            updatedStrategy.parameters = {
              ...(currentStrategy.parameters || {}),
              timing: recommendation.parameters.timing
            };
          }
          break;
          
        case 'RISK_ADJUSTMENT':
          // Update risk parameters
          if (recommendation.parameters?.risk) {
            updatedStrategy.parameters = {
              ...(currentStrategy.parameters || {}),
              risk: recommendation.parameters.risk
            };
          }
          break;
      }
      
      // Add metadata about the optimization
      updatedStrategy.metadata = {
        ...(currentStrategy.metadata || {}),
        optimization: {
          applied_at: new Date().toISOString(),
          recommendation_id: recommendationId,
          recommendation_type: recommendation.type,
          previous_strategy_id: currentStrategy.id,
          reason: recommendation.reasoning
        }
      };
      
      // Insert the new strategy
      const { data: newStrategy, error: insertError } = await supabase
        .from('goal_strategies')
        .insert({
          ...updatedStrategy,
          goal_id: goalId,
          created_at: new Date().toISOString(),
          status: 'ACTIVE'
        })
        .select()
        .single();
      
      if (insertError) {
        return { success: false, error: 'Failed to apply optimization' };
      }
      
      // Mark the previous strategy as superseded
      const { error: updateError } = await supabase
        .from('goal_strategies')
        .update({ 
          status: 'SUPERSEDED',
          metadata: {
            ...(currentStrategy.metadata || {}),
            superseded_by: newStrategy.id,
            superseded_at: new Date().toISOString()
          }
        })
        .eq('id', currentStrategy.id);
      
      if (updateError) {
        console.warn('Failed to update previous strategy status', updateError);
      }
      
      // Record the optimization in monitoring
      const { error: monitoringError } = await supabase
        .from('goal_monitoring')
        .insert({
          goal_id: goalId,
          event_type: 'STRATEGY_OPTIMIZED',
          severity: 'INFO',
          event_data: {
            recommendation_id: recommendationId,
            recommendation_type: recommendation.type,
            previous_strategy_id: currentStrategy.id,
            new_strategy_id: newStrategy.id,
            description: recommendation.description,
            expected_benefit: recommendation.expectedBenefit,
            timestamp: new Date().toISOString()
          }
        });
      
      if (monitoringError) {
        console.warn('Failed to record optimization in monitoring', monitoringError);
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error applying optimization:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },
  
  /**
   * Analyze goal analytics and generate recommendations
   */
  analyzeAndGenerateRecommendations(
    analytics: GoalAnalytics,
    memories: any[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const { goal, performanceMetrics, strategies, marketConditions } = analytics;
    
    // 1. Check for high volatility optimizations
    if (marketConditions.volatility === 'high') {
      if (strategies.some(s => s.averageSlippage > 0.01)) {
        recommendations.push({
          id: `rec-${Date.now()}-1`,
          type: 'PARAMETER_ADJUSTMENT',
          priority: 'HIGH',
          description: 'Reduce trade size to minimize slippage in high volatility',
          reasoning: 'High market volatility combined with larger trades is causing increased slippage. Smaller trade sizes will reduce price impact.',
          expectedBenefit: 'Lower average slippage, improved cost efficiency',
          parameters: {
            trade_size_factor: 0.5,
            max_slippage: Math.min(0.01, ...strategies.map(s => s.averageSlippage / 2))
          },
          confidence: 0.85
        });
      }
      
      recommendations.push({
        id: `rec-${Date.now()}-2`,
        type: 'TIMING_ADJUSTMENT',
        priority: 'MEDIUM',
        description: 'Implement dollar-cost averaging with more frequent, smaller trades',
        reasoning: 'High volatility markets benefit from systematic, regular purchases to smooth out price fluctuations.',
        expectedBenefit: 'Reduced impact of short-term price swings, better average entry price',
        parameters: {
          timing: {
            frequency: 'daily',
            trade_count: 7,
            trade_size_reduction: 0.7
          }
        },
        confidence: 0.75
      });
    }
    
    // 2. Check for market trend optimizations
    if (marketConditions.trend === 'bearish' && performanceMetrics.acquisitionRate < goal.target_amount / 60) {
      recommendations.push({
        id: `rec-${Date.now()}-3`,
        type: 'RISK_ADJUSTMENT',
        priority: 'HIGH',
        description: 'Increase acquisition rate during bearish trend',
        reasoning: 'Current market conditions present a good accumulation opportunity with lower prices. Your current acquisition rate is too low to take advantage of these conditions.',
        expectedBenefit: 'Lower average acquisition cost, faster progress toward goal',
        parameters: {
          risk: {
            acquisition_rate_multiplier: 2.0,
            max_daily_budget_increase: 0.3
          }
        },
        confidence: 0.8
      });
    }
    
    // 3. Check for protocol optimizations
    if (strategies.length > 0) {
      const bestStrategy = strategies.reduce((prev, current) => 
        (prev.performance === 'excellent' && current.performance !== 'excellent') ? prev :
        (prev.performance !== 'excellent' && current.performance === 'excellent') ? current :
        (prev.averageSlippage < current.averageSlippage) ? prev : current
      );
      
      const worstStrategy = strategies.reduce((prev, current) => 
        (prev.performance === 'poor' && current.performance !== 'poor') ? prev :
        (prev.performance !== 'poor' && current.performance === 'poor') ? current :
        (prev.averageSlippage > current.averageSlippage) ? prev : current
      );
      
      if (bestStrategy.protocol !== worstStrategy.protocol && worstStrategy.performance === 'poor') {
        recommendations.push({
          id: `rec-${Date.now()}-4`,
          type: 'STRATEGY_SWITCH',
          priority: 'HIGH',
          description: `Switch from ${worstStrategy.protocol} to ${bestStrategy.protocol} for better execution`,
          reasoning: `${bestStrategy.protocol} is showing significantly better performance metrics with lower slippage (${(bestStrategy.averageSlippage * 100).toFixed(2)}% vs ${(worstStrategy.averageSlippage * 100).toFixed(2)}%) and higher success rate.`,
          expectedBenefit: 'Reduced slippage, higher success rate, better cost efficiency',
          parameters: {
            strategy_type: bestStrategy.strategyType,
            protocol: bestStrategy.protocol,
            min_success_threshold: 0.9
          },
          confidence: 0.9
        });
      }
    }
    
    // 4. Check for memory-based optimizations
    const recentMarketMemories = memories.filter(m => 
      m.metadata?.memoryType === 'MARKET_CONDITION' && 
      new Date(m.timestamp).getTime() > Date.now() - 86400000 // Last 24 hours
    );
    
    if (recentMarketMemories.length > 0) {
      // Check if agents have identified a specific market opportunity
      const opportunityMemories = recentMarketMemories.filter(m => 
        m.content.toLowerCase().includes('opportunity') || 
        m.content.toLowerCase().includes('favorable')
      );
      
      if (opportunityMemories.length > 0) {
        recommendations.push({
          id: `rec-${Date.now()}-5`,
          type: 'TIMING_ADJUSTMENT',
          priority: 'MEDIUM',
          description: 'Capitalize on identified market opportunity',
          reasoning: 'Agent market analysis has identified a favorable entry opportunity based on current market conditions.',
          expectedBenefit: 'Better entry price, taking advantage of temporary market conditions',
          parameters: {
            timing: {
              accelerate_next_purchase: true,
              opportunity_window_hours: 12,
              size_increase_factor: 1.5
            }
          },
          confidence: 0.7
        });
      }
    }
    
    // 5. Check for efficiency optimizations
    if (performanceMetrics.timeToComplete && performanceMetrics.timeToComplete > 30) {
      recommendations.push({
        id: `rec-${Date.now()}-6`,
        type: 'PARAMETER_ADJUSTMENT',
        priority: 'MEDIUM',
        description: 'Increase acquisition rate to meet goals sooner',
        reasoning: `At current pace, you'll reach your goal in ${Math.ceil(performanceMetrics.timeToComplete / 30)} months, which is longer than optimal.`,
        expectedBenefit: 'Faster progress toward acquisition goal',
        parameters: {
          acquisition_rate_multiplier: 1.5,
          max_daily_budget_pct: 0.05
        },
        confidence: 0.65
      });
    }
    
    // Sort recommendations by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
};
