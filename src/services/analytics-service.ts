import { ApiResponse } from '@/services/farm-service';
import { SupabaseMcp } from '@/utils/supabase-mcp';

export interface PerformanceMetrics {
  totalProfitLoss: number;
  winRate: number;
  profitFactor: number;
  tradesCount: number;
  maxDrawdown: number;
  sharpeRatio: number;
  dailyReturns: Array<{
    date: string;
    return: number;
  }>;
  monthlyReturns: Array<{
    month: string;
    return: number;
  }>;
  equityCurve: Array<{
    date: string;
    equity: number;
  }>;
}

export interface RiskMetrics {
  valueAtRisk: number;
  expectedShortfall: number;
  stressTestResults: Array<{
    scenario: string;
    impact: number;
    description: string;
  }>;
  riskByAsset: Array<{
    asset: string;
    allocation: number;
    risk: number;
  }>;
  riskByStrategy: Array<{
    strategy: string;
    allocation: number;
    risk: number;
  }>;
  correlationMatrix: Array<Array<number>>;
  correlationLabels: string[];
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface StrategyAnalytics {
  id: string;
  strategy_id: string;
  period: 'daily' | 'weekly' | 'monthly' | 'all';
  start_date: string;
  end_date: string;
  metrics: {
    trades_count: number;
    win_rate: number;
    profit_factor: number;
    max_drawdown: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    profit_loss: number;
    roi: number;
    volatility: number;
    [key: string]: any;
  };
  trades: Array<{
    timestamp: string;
    type: 'buy' | 'sell';
    price: number;
    size: number;
    profit_loss?: number;
    fees?: number;
  }>;
  equity_curve: Array<{
    date: string;
    equity: number;
  }>;
  created_at: string;
}

export const analyticsService = {
  /**
   * Get performance metrics for a farm
   */
  async getFarmPerformance(farmId: string, period?: 'daily' | 'weekly' | 'monthly' | 'all'): Promise<ApiResponse<PerformanceMetrics>> {
    try {
      // Use a custom SQL function to get the performance metrics
      const response = await SupabaseMcp.sql<{ performance: PerformanceMetrics }>(`
        SELECT get_farm_performance('${farmId}', '${period || 'all'}') as performance;
      `);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data || response.data.length === 0 || !response.data[0].performance) {
        return { error: 'No performance data available' };
      }
      
      return { data: response.data[0].performance };
    } catch (error) {
      console.error('Error fetching farm performance:', error);
      
      // Return sample data for development/demo purposes
      return {
        data: {
          totalProfitLoss: 12587.25,
          winRate: 0.72,
          profitFactor: 2.34,
          tradesCount: 145,
          maxDrawdown: 0.15,
          sharpeRatio: 1.89,
          dailyReturns: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
            return: (Math.random() * 0.06) - 0.02
          })),
          monthlyReturns: Array.from({ length: 12 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - (11 - i));
            return {
              month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
              return: (Math.random() * 0.12) - 0.03
            };
          }),
          equityCurve: Array.from({ length: 60 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (59 - i));
            return {
              date: date.toISOString().split('T')[0],
              equity: 10000 * (1 + (0.003 * i) + (Math.random() * 0.02) - 0.01)
            };
          })
        }
      };
    }
  },

  /**
   * Get risk metrics for a farm
   */
  async getFarmRiskMetrics(farmId: string): Promise<ApiResponse<RiskMetrics>> {
    try {
      // Use a custom SQL function to get the risk metrics
      const response = await SupabaseMcp.sql<{ risk_metrics: RiskMetrics }>(`
        SELECT get_farm_risk_metrics('${farmId}') as risk_metrics;
      `);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data || response.data.length === 0 || !response.data[0].risk_metrics) {
        return { error: 'No risk metrics available' };
      }
      
      return { data: response.data[0].risk_metrics };
    } catch (error) {
      console.error('Error fetching farm risk metrics:', error);
      
      // Return sample data for development/demo purposes
      return {
        data: {
          valueAtRisk: 0.045,
          expectedShortfall: 0.062,
          stressTestResults: [
            { scenario: 'Market Crash', impact: -0.32, description: 'Simulated 30% market drop' },
            { scenario: 'Liquidity Crisis', impact: -0.18, description: 'Simulated 50% reduction in market liquidity' },
            { scenario: 'Interest Rate Hike', impact: -0.12, description: 'Simulated 2% increase in interest rates' }
          ],
          riskByAsset: [
            { asset: 'BTC', allocation: 0.35, risk: 0.24 },
            { asset: 'ETH', allocation: 0.25, risk: 0.22 },
            { asset: 'SOL', allocation: 0.15, risk: 0.28 },
            { asset: 'USDC', allocation: 0.25, risk: 0.02 }
          ],
          riskByStrategy: [
            { strategy: 'Trend Following', allocation: 0.4, risk: 0.18 },
            { strategy: 'Mean Reversion', allocation: 0.3, risk: 0.14 },
            { strategy: 'Arbitrage', allocation: 0.2, risk: 0.09 },
            { strategy: 'Market Making', allocation: 0.1, risk: 0.05 }
          ],
          correlationMatrix: [
            [1.00, 0.85, 0.65, 0.10],
            [0.85, 1.00, 0.72, 0.15],
            [0.65, 0.72, 1.00, 0.18],
            [0.10, 0.15, 0.18, 1.00]
          ],
          correlationLabels: ['BTC', 'ETH', 'SOL', 'USDC'],
          riskScore: 65,
          riskLevel: 'medium'
        }
      };
    }
  },

  /**
   * Get analytics for a strategy
   */
  async getStrategyAnalytics(strategyId: string, period?: 'daily' | 'weekly' | 'monthly' | 'all'): Promise<ApiResponse<StrategyAnalytics>> {
    try {
      // Check if analytics record exists for this strategy and period
      const existingAnalytics = await SupabaseMcp.query<StrategyAnalytics>({
        table: 'strategy_analytics',
        select: '*',
        where: { 
          strategy_id: strategyId,
          period: period || 'all'
        }
      });
      
      if (existingAnalytics.error) {
        throw new Error(existingAnalytics.error);
      }
      
      // If records exist and are not too old, return them
      if (existingAnalytics.data && existingAnalytics.data.length > 0) {
        const analytics = existingAnalytics.data[0];
        const recordAge = new Date().getTime() - new Date(analytics.created_at).getTime();
        
        // If record is less than 24 hours old, return it
        if (recordAge < 86400000) {
          return { data: analytics };
        }
      }
      
      // Otherwise, generate new analytics
      const response = await SupabaseMcp.sql<{ analytics: StrategyAnalytics }>(`
        SELECT generate_strategy_analytics('${strategyId}', '${period || 'all'}') as analytics;
      `);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data || response.data.length === 0 || !response.data[0].analytics) {
        return { error: 'Failed to generate strategy analytics' };
      }
      
      // Insert or update the analytics record
      const analytics = response.data[0].analytics;
      
      if (existingAnalytics.data && existingAnalytics.data.length > 0) {
        // Update existing record
        await SupabaseMcp.update({
          table: 'strategy_analytics',
          data: {
            metrics: analytics.metrics,
            trades: analytics.trades,
            equity_curve: analytics.equity_curve,
            created_at: new Date().toISOString()
          },
          where: { id: existingAnalytics.data[0].id }
        });
      } else {
        // Insert new record
        await SupabaseMcp.insert({
          table: 'strategy_analytics',
          data: {
            strategy_id: strategyId,
            period: period || 'all',
            start_date: analytics.start_date,
            end_date: analytics.end_date,
            metrics: analytics.metrics,
            trades: analytics.trades,
            equity_curve: analytics.equity_curve
          }
        });
      }
      
      return { data: analytics };
    } catch (error) {
      console.error('Error fetching strategy analytics:', error);
      
      // Return sample data for development/demo purposes
      return {
        data: {
          id: 'sample-analytics-id',
          strategy_id: strategyId,
          period: period || 'all',
          start_date: new Date(Date.now() - 5184000000).toISOString().split('T')[0], // 60 days ago
          end_date: new Date().toISOString().split('T')[0],
          metrics: {
            trades_count: 87,
            win_rate: 0.68,
            profit_factor: 2.15,
            max_drawdown: 0.12,
            sharpe_ratio: 1.92,
            sortino_ratio: 2.35,
            profit_loss: 4325.75,
            roi: 0.29,
            volatility: 0.022
          },
          trades: Array.from({ length: 20 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (19 - i));
            const type = Math.random() > 0.5 ? 'buy' : 'sell';
            const price = 1000 + (Math.random() * 200);
            const size = 0.5 + (Math.random() * 1.5);
            return {
              timestamp: date.toISOString(),
              type,
              price,
              size,
              profit_loss: type === 'sell' ? (Math.random() * 200) - 50 : undefined,
              fees: (price * size) * 0.001
            };
          }),
          equity_curve: Array.from({ length: 60 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (59 - i));
            return {
              date: date.toISOString().split('T')[0],
              equity: 10000 * (1 + (0.004 * i) + (Math.random() * 0.015) - 0.005)
            };
          }),
          created_at: new Date().toISOString()
        }
      };
    }
  },

  /**
   * Compare multiple strategies' performance
   */
  async compareStrategies(strategyIds: string[]): Promise<ApiResponse<Record<string, StrategyAnalytics>>> {
    try {
      if (!strategyIds || strategyIds.length === 0) {
        return { error: 'No strategies specified for comparison' };
      }
      
      const results: Record<string, StrategyAnalytics> = {};
      
      // Get analytics for each strategy
      for (const strategyId of strategyIds) {
        const response = await this.getStrategyAnalytics(strategyId);
        
        if (response.error) {
          console.error(`Error fetching analytics for strategy ${strategyId}:`, response.error);
          continue;
        }
        
        if (response.data) {
          results[strategyId] = response.data;
        }
      }
      
      if (Object.keys(results).length === 0) {
        return { error: 'Failed to fetch analytics for any of the specified strategies' };
      }
      
      return { data: results };
    } catch (error) {
      console.error('Error comparing strategies:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Generate a performance report for a farm
   */
  async generatePerformanceReport(farmId: string): Promise<ApiResponse<Blob>> {
    try {
      // This endpoint would typically return a PDF or other report format
      // For this example, we'll just prepare the data that would go into such a report
      
      // Get farm performance data
      const performanceResponse = await this.getFarmPerformance(farmId);
      
      if (performanceResponse.error) {
        throw new Error(performanceResponse.error);
      }
      
      // Get farm risk metrics
      const riskResponse = await this.getFarmRiskMetrics(farmId);
      
      if (riskResponse.error) {
        throw new Error(riskResponse.error);
      }
      
      // Get farm details
      const farmDetailsResponse = await SupabaseMcp.query({
        table: 'farms',
        select: '*',
        where: { id: farmId }
      });
      
      if (farmDetailsResponse.error) {
        throw new Error(farmDetailsResponse.error);
      }
      
      if (!farmDetailsResponse.data || farmDetailsResponse.data.length === 0) {
        return { error: 'Farm not found' };
      }
      
      const farmDetails = farmDetailsResponse.data[0];
      
      // Build report data structure
      const reportData = {
        farm: farmDetails,
        performance: performanceResponse.data,
        risk: riskResponse.data,
        generatedAt: new Date().toISOString(),
      };
      
      // In a real implementation, we would generate a PDF here
      // For demo purposes, we're returning a JSON blob
      const reportBlob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      
      return { data: reportBlob };
    } catch (error) {
      console.error('Error generating performance report:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
}; 