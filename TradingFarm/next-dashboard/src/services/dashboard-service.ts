/**
 * Dashboard Service
 * Handles data fetching for the dashboard components
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';

export interface DashboardData {
  portfolioValue: number;
  pnl24h: number;
  winRate: number;
  avgTradeDuration: string;
  topPair: string;
  riskExposure: number;
  riskExposureTrend: 'up' | 'down' | 'neutral';
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/**
 * Service for dashboard data
 */
export const dashboardService = {
  /**
   * Get dashboard data for a specific farm
   */
  async getDashboardData(farmId: string): Promise<ApiResponse<DashboardData>> {
    try {
      const supabase = createBrowserClient();
      
      // Fetch portfolio value and PnL from wallets
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('farm_id', farmId);
      
      if (walletsError) {
        console.error('Error fetching wallets:', walletsError);
        return { error: walletsError.message };
      }
      
      // Calculate portfolio value
      const portfolioValue = wallets?.reduce((total, wallet) => total + (wallet.balance || 0), 0) || 0;
      
      // Fetch performance metrics (in a real implementation, this would involve trades table)
      // For now we'll return reasonable defaults
      
      // In a real implementation, you would calculate these values from actual trade data
      const winRate = 68; // This would be calculated from trade history
      const avgTradeDuration = "4h 32m"; // This would be calculated from trade durations
      const topPair = "BTC/USD"; // This would be determined from most traded pair
      
      // Calculate risk exposure based on open positions
      // For now we'll return a reasonable default
      const riskExposure = 35;
      const riskExposureTrend = 'neutral' as const;

      // Calculate the 24h PnL from transactions
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayIsoString = yesterday.toISOString();
      
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('farm_id', farmId)
        .gte('created_at', yesterdayIsoString);
      
      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        // Continue, as this is not critical
      }
      
      // Calculate PnL from transactions
      const pnl24h = transactions?.reduce((total, tx) => {
        if (tx.type === 'profit') return total + tx.amount;
        if (tx.type === 'loss') return total - tx.amount;
        return total;
      }, 0) || 3450; // Default value if no data

      return {
        data: {
          portfolioValue,
          pnl24h,
          winRate,
          avgTradeDuration,
          topPair,
          riskExposure,
          riskExposureTrend
        }
      };
    } catch (error) {
      console.error('Error in getDashboardData:', error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Get risk metrics for a specific farm
   */
  async getRiskMetrics(farmId: string) {
    try {
      const supabase = createBrowserClient();
      
      // In a full implementation, you would fetch actual risk metrics from the database
      // For now we'll return mock data that would normally be calculated from real data
      
      // Example of how you would fetch real data:
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('farm_id', farmId);
      
      if (walletsError) {
        console.error('Error fetching wallets for risk metrics:', walletsError);
        return { error: walletsError.message };
      }
      
      // Calculate portfolio value
      const portfolioValue = wallets?.reduce((total, wallet) => total + (wallet.balance || 0), 0) || 125000;
      
      // Mock risk metric calculations
      return {
        data: {
          portfolioValue,
          totalRisk: portfolioValue * 0.2, // 20% of portfolio at risk
          riskCapacityUsed: 65,
          maxDrawdown: 12.5,
          currentDrawdown: 3.8,
          sharpeRatio: 1.85,
          dailyVaR: portfolioValue * 0.01, // 1% daily VaR
          dailyVaRPercentage: 1.0,
          stressTestLoss: portfolioValue * 0.15, // 15% potential loss in stress case
          stressTestLossPercentage: 15,
          valueAtRisk: portfolioValue * 0.05, // 5% VaR
          valueAtRiskPercentage: 5,
          marginUsagePercentage: 28,
          leverageRatio: 2.5,
          riskRewardRatio: 2.1,
          riskPerTrade: 0.8,
          concentrationRisk: 42,
          riskExposureByAsset: [
            { symbol: "BTC/USD", exposure: portfolioValue * 0.4, riskContribution: 40 },
            { symbol: "ETH/USD", exposure: portfolioValue * 0.24, riskContribution: 24 },
            { symbol: "SOL/USD", exposure: portfolioValue * 0.2, riskContribution: 20 },
            { symbol: "AVAX/USD", exposure: portfolioValue * 0.16, riskContribution: 16 }
          ],
          riskExposureByStrategy: [
            { strategy: "Momentum", exposure: portfolioValue * 0.6, riskContribution: 60 },
            { strategy: "Mean Reversion", exposure: portfolioValue * 0.4, riskContribution: 40 }
          ],
          riskProfile: {
            id: "profile-1",
            name: "Balanced Growth",
            risk_level: "moderate"
          },
          riskLimits: {
            maxPositionSize: portfolioValue * 0.2,
            maxPositionSizePercentage: 20,
            maxDrawdownPercentage: 15,
            maxDailyLossPercentage: 2
          },
          breachedLimits: [
            {
              limit: "Concentration in BTC",
              currentValue: 40,
              maxValue: 35,
              percentageOver: 14.3
            }
          ],
          largestDrawdowns: [
            {
              startDate: "2025-02-15T00:00:00Z",
              endDate: "2025-02-28T00:00:00Z",
              durationDays: 13,
              drawdownPercentage: 12.5,
              recovered: true
            },
            {
              startDate: "2025-01-05T00:00:00Z",
              endDate: "2025-01-12T00:00:00Z",
              durationDays: 7,
              drawdownPercentage: 8.2,
              recovered: true
            }
          ]
        }
      };
    } catch (error) {
      console.error('Error in getRiskMetrics:', error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Get available farms for the current user
   */
  async getAvailableFarms(): Promise<ApiResponse<Array<{ id: number; name: string }>>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('farms')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error fetching farms:', error);
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error in getAvailableFarms:', error);
      return { error: 'An unexpected error occurred' };
    }
  }
}; 