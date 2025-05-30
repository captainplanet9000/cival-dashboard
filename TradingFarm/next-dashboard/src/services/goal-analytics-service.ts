/**
 * Goal Analytics Service
 * Provides analytics and insights for goal acquisition strategies
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { Goal, GoalStrategy, GoalTransaction, GoalMonitoringEvent } from '@/types/goal-types';

export interface GoalPerformanceMetrics {
  totalAcquired: number;
  acquisitionRate: number; // tokens per day
  averageCost: number; // in base currency
  costEfficiency: number; // compared to market average
  volatilityExposure: 'low' | 'medium' | 'high';
  trendAlignment: 'aligned' | 'neutral' | 'contrary';
  timeToComplete: number | null; // estimated days to completion
  suggestedImprovements: string[];
}

export interface StrategyAnalytics {
  strategyId: string;
  strategyType: string;
  executionCount: number;
  successRate: number;
  averageSlippage: number;
  gasCostTotal: number;
  priceImpactAverage: number;
  protocol: string;
  performance: 'excellent' | 'good' | 'average' | 'poor';
}

export interface GoalAnalytics {
  goal: Goal;
  performanceMetrics: GoalPerformanceMetrics;
  strategies: StrategyAnalytics[];
  marketConditions: {
    trend: 'bullish' | 'bearish' | 'neutral';
    volatility: 'low' | 'medium' | 'high';
    liquidity: 'low' | 'medium' | 'high';
    priceChange24h: number;
  };
  topInsights: string[];
}

/**
 * Service for analyzing goal acquisition performance and strategies
 */
export const goalAnalyticsService = {
  
  /**
   * Get comprehensive analytics for a goal
   */
  async getGoalAnalytics(goalId: string): Promise<{ data: GoalAnalytics | null, error: string | null }> {
    try {
      const supabase = createBrowserClient();
      
      // Fetch goal data
      const { data: goal, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();
      
      if (goalError || !goal) {
        return { data: null, error: goalError?.message || 'Goal not found' };
      }
      
      // Fetch strategies
      const { data: strategies, error: strategiesError } = await supabase
        .from('goal_strategies')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });
      
      if (strategiesError) {
        return { data: null, error: strategiesError.message };
      }
      
      // Fetch transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('goal_transactions')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });
      
      if (transactionsError) {
        return { data: null, error: transactionsError.message };
      }
      
      // Fetch monitoring events
      const { data: events, error: eventsError } = await supabase
        .from('goal_monitoring')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });
      
      if (eventsError) {
        return { data: null, error: eventsError.message };
      }
      
      // Calculate analytics
      const performanceMetrics = this.calculatePerformanceMetrics(
        goal,
        transactions || []
      );
      
      const strategyAnalytics = this.analyzeStrategies(
        strategies || [],
        transactions || []
      );
      
      const marketConditions = this.analyzeMarketConditions(
        events || []
      );
      
      const topInsights = this.generateInsights(
        goal,
        performanceMetrics,
        strategyAnalytics,
        marketConditions
      );
      
      return {
        data: {
          goal,
          performanceMetrics,
          strategies: strategyAnalytics,
          marketConditions,
          topInsights
        },
        error: null
      };
    } catch (error) {
      console.error('Error in getGoalAnalytics:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },
  
  /**
   * Calculate performance metrics for a goal based on transactions
   */
  calculatePerformanceMetrics(
    goal: Goal,
    transactions: GoalTransaction[]
  ): GoalPerformanceMetrics {
    // Filter successful transactions for the target asset
    const acquisitionTxs = transactions.filter(tx => 
      tx.status === 'COMPLETED' && 
      tx.asset_to === goal.selected_asset
    );
    
    // Calculate total acquired
    const totalAcquired = acquisitionTxs.reduce(
      (sum, tx) => sum + (tx.amount_to || 0), 
      0
    );
    
    // Calculate acquisition rate
    const firstTxDate = acquisitionTxs.length > 0 
      ? new Date(acquisitionTxs[acquisitionTxs.length - 1].created_at) 
      : new Date(goal.created_at);
    
    const daysSinceStart = Math.max(1, (new Date().getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24));
    const acquisitionRate = totalAcquired / daysSinceStart;
    
    // Calculate average cost
    const totalCost = acquisitionTxs.reduce(
      (sum, tx) => sum + (tx.amount_from || 0), 
      0
    );
    
    const averageCost = totalAcquired > 0 
      ? totalCost / totalAcquired 
      : 0;
    
    // Estimate cost efficiency (simplified; would use market data in real implementation)
    const costEfficiency = 1.0; // Placeholder; would compare to market average
    
    // Estimate volatility exposure based on transaction timing patterns
    const txTimings = acquisitionTxs.map(tx => new Date(tx.created_at).getTime());
    const txTimingVariance = this.calculateVariance(txTimings);
    const volatilityExposure: 'low' | 'medium' | 'high' = 
      txTimingVariance > 86400000 ? 'high' : 
      txTimingVariance > 3600000 ? 'medium' : 
      'low';
    
    // Determine trend alignment
    const trendAlignment: 'aligned' | 'neutral' | 'contrary' = 'neutral'; // Placeholder
    
    // Estimate time to completion
    let timeToComplete: number | null = null;
    if (goal.status !== 'COMPLETED' && goal.target_amount > 0 && acquisitionRate > 0) {
      const remaining = goal.target_amount - (goal.current_amount || 0);
      timeToComplete = remaining / acquisitionRate;
    }
    
    // Generate improvement suggestions
    const suggestedImprovements: string[] = [];
    
    if (acquisitionRate < goal.target_amount / 30) { // If it would take > 30 days
      suggestedImprovements.push('Increase acquisition frequency to meet target sooner');
    }
    
    if (volatilityExposure === 'high') {
      suggestedImprovements.push('Consider more regular acquisition intervals to reduce volatility exposure');
    }
    
    if (transactions.length > 0 && transactions.some(tx => tx.status === 'FAILED')) {
      suggestedImprovements.push('Review failed transactions to improve success rate');
    }
    
    return {
      totalAcquired,
      acquisitionRate,
      averageCost,
      costEfficiency,
      volatilityExposure,
      trendAlignment,
      timeToComplete,
      suggestedImprovements
    };
  },
  
  /**
   * Analyze strategies used for a goal
   */
  analyzeStrategies(
    strategies: GoalStrategy[],
    transactions: GoalTransaction[]
  ): StrategyAnalytics[] {
    return strategies.map(strategy => {
      // Find transactions associated with this strategy
      const strategyTxs = transactions.filter(tx => 
        tx.strategy_id === strategy.id
      );
      
      const executionCount = strategyTxs.length;
      const successfulTxs = strategyTxs.filter(tx => tx.status === 'COMPLETED');
      const successRate = executionCount > 0 
        ? successfulTxs.length / executionCount 
        : 0;
      
      // Calculate averages from transaction metadata
      let totalSlippage = 0;
      let totalGasCost = 0;
      let totalPriceImpact = 0;
      
      for (const tx of successfulTxs) {
        if (tx.metadata) {
          totalSlippage += tx.metadata.slippage || 0;
          totalGasCost += tx.metadata.gas_cost || 0;
          totalPriceImpact += tx.metadata.price_impact || 0;
        }
      }
      
      const averageSlippage = successfulTxs.length > 0 
        ? totalSlippage / successfulTxs.length 
        : 0;
      
      const gasCostTotal = totalGasCost;
      
      const priceImpactAverage = successfulTxs.length > 0 
        ? totalPriceImpact / successfulTxs.length 
        : 0;
      
      // Evaluate overall performance
      let performance: 'excellent' | 'good' | 'average' | 'poor' = 'average';
      
      if (successRate > 0.9 && averageSlippage < 0.5 && priceImpactAverage < 0.3) {
        performance = 'excellent';
      } else if (successRate > 0.7 && averageSlippage < 1.0 && priceImpactAverage < 0.5) {
        performance = 'good';
      } else if (successRate < 0.5 || averageSlippage > 2.0 || priceImpactAverage > 1.0) {
        performance = 'poor';
      }
      
      return {
        strategyId: strategy.id,
        strategyType: strategy.strategy_type || 'Unknown',
        executionCount,
        successRate,
        averageSlippage,
        gasCostTotal,
        priceImpactAverage,
        protocol: strategy.protocol || 'Unknown',
        performance
      };
    });
  },
  
  /**
   * Analyze market conditions based on monitoring events
   */
  analyzeMarketConditions(
    events: GoalMonitoringEvent[]
  ): {
    trend: 'bullish' | 'bearish' | 'neutral';
    volatility: 'low' | 'medium' | 'high';
    liquidity: 'low' | 'medium' | 'high';
    priceChange24h: number;
  } {
    // Find market update events
    const marketEvents = events.filter(event => 
      event.event_type === 'MARKET_UPDATE' && 
      event.event_data
    );
    
    // Default values
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let volatility: 'low' | 'medium' | 'high' = 'medium';
    let liquidity: 'low' | 'medium' | 'high' = 'medium';
    let priceChange24h = 0;
    
    // If we have market events, use the most recent one
    if (marketEvents.length > 0) {
      const latestMarketEvent = marketEvents[0]; // Events are sorted by created_at desc
      
      if (latestMarketEvent.event_data) {
        const data = latestMarketEvent.event_data;
        
        // Extract trend
        if (data.trend) {
          if (typeof data.trend === 'string') {
            const trendStr = data.trend.toLowerCase();
            if (trendStr.includes('bull')) {
              trend = 'bullish';
            } else if (trendStr.includes('bear')) {
              trend = 'bearish';
            }
          }
        }
        
        // Extract volatility
        if (data.volatility) {
          if (typeof data.volatility === 'string') {
            const volStr = data.volatility.toLowerCase();
            if (volStr.includes('high')) {
              volatility = 'high';
            } else if (volStr.includes('low')) {
              volatility = 'low';
            } else {
              volatility = 'medium';
            }
          }
        }
        
        // Extract liquidity
        if (data.liquidity) {
          if (typeof data.liquidity === 'string') {
            const liqStr = data.liquidity.toLowerCase();
            if (liqStr.includes('high')) {
              liquidity = 'high';
            } else if (liqStr.includes('low')) {
              liquidity = 'low';
            } else {
              liquidity = 'medium';
            }
          }
        }
        
        // Extract price change
        if (data.price_change_24h) {
          if (typeof data.price_change_24h === 'number') {
            priceChange24h = data.price_change_24h;
          } else if (typeof data.price_change_24h === 'string') {
            priceChange24h = parseFloat(data.price_change_24h) || 0;
          }
        }
      }
    }
    
    return {
      trend,
      volatility,
      liquidity,
      priceChange24h
    };
  },
  
  /**
   * Generate insights based on analytics
   */
  generateInsights(
    goal: Goal,
    metrics: GoalPerformanceMetrics,
    strategies: StrategyAnalytics[],
    marketConditions: {
      trend: 'bullish' | 'bearish' | 'neutral';
      volatility: 'low' | 'medium' | 'high';
      liquidity: 'low' | 'medium' | 'high';
      priceChange24h: number;
    }
  ): string[] {
    const insights: string[] = [];
    
    // Progress insights
    const progressPercentage = goal.target_amount > 0 
      ? ((goal.current_amount || 0) / goal.target_amount) * 100 
      : 0;
    
    if (progressPercentage > 0) {
      insights.push(`You've acquired ${progressPercentage.toFixed(1)}% of your ${goal.target_amount} ${goal.selected_asset} target`);
    }
    
    if (metrics.timeToComplete !== null) {
      if (metrics.timeToComplete <= 7) {
        insights.push(`At current rate, you'll reach your goal in about ${metrics.timeToComplete.toFixed(1)} days`);
      } else if (metrics.timeToComplete <= 30) {
        insights.push(`At current rate, you'll reach your goal in about ${(metrics.timeToComplete / 7).toFixed(1)} weeks`);
      } else {
        insights.push(`At current rate, you'll reach your goal in about ${(metrics.timeToComplete / 30).toFixed(1)} months`);
      }
    }
    
    // Strategy insights
    const bestStrategy = strategies.find(s => s.performance === 'excellent') || 
                        strategies.find(s => s.performance === 'good');
    
    const worstStrategy = strategies.find(s => s.performance === 'poor');
    
    if (bestStrategy) {
      insights.push(`Your ${bestStrategy.strategyType} strategy on ${bestStrategy.protocol} is performing well with ${(bestStrategy.successRate * 100).toFixed(1)}% success rate`);
    }
    
    if (worstStrategy) {
      insights.push(`Consider adjusting your ${worstStrategy.strategyType} strategy which has ${(worstStrategy.averageSlippage * 100).toFixed(2)}% average slippage`);
    }
    
    // Market condition insights
    if (marketConditions.trend === 'bullish') {
      insights.push(`Market is trending bullish with ${marketConditions.priceChange24h.toFixed(2)}% 24h change, consider increasing acquisition pace`);
    } else if (marketConditions.trend === 'bearish') {
      insights.push(`Market is trending bearish with ${Math.abs(marketConditions.priceChange24h).toFixed(2)}% 24h decline, good opportunity for accumulation`);
    }
    
    if (marketConditions.volatility === 'high') {
      insights.push('High market volatility detected, consider using dollar-cost averaging strategy');
    }
    
    if (marketConditions.liquidity === 'low') {
      insights.push('Low market liquidity may lead to higher slippage, consider smaller transaction sizes');
    }
    
    // Add efficiency insights
    if (goal.current_amount && goal.current_amount > 0) {
      insights.push(`Average acquisition cost: ${metrics.averageCost.toFixed(4)} per ${goal.selected_asset}`);
    }
    
    // Add recommendations from performance metrics
    metrics.suggestedImprovements.forEach(improvement => {
      insights.push(improvement);
    });
    
    return insights;
  },
  
  /**
   * Calculate statistical variance of an array of numbers
   */
  calculateVariance(values: number[]): number {
    if (values.length <= 1) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return variance;
  }
};
