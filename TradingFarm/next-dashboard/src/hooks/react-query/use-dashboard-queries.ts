import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api-service';
import { queryKeys } from '@/utils/react-query/query-keys';
import { SimpleMetric } from '@/components/risk-management/simplified-risk-card';

// Dashboard data interface
export interface DashboardData {
  portfolioValue: number;
  pnl24h: number;
  winRate: number;
  avgTradeDuration: string;
  topPair: string;
  riskExposure: number;
  riskExposureTrend: 'up' | 'down' | 'neutral';
}

/**
 * Hook to fetch dashboard data for a specific farm
 */
export function useDashboardData(farmId: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.detail(farmId),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getDashboardData(farmId);
      
      // For now, return mock data
      return {
        portfolioValue: 125000 + Math.floor(Math.random() * 5000) - 2500,
        pnl24h: 3450 + Math.floor(Math.random() * 500) - 250,
        winRate: 68 + Math.floor(Math.random() * 5) - 2,
        avgTradeDuration: `4h ${Math.floor(Math.random() * 60)}m`,
        topPair: Math.random() > 0.3 ? "BTC/USD" : "ETH/USD",
        riskExposure: 35 + Math.floor(Math.random() * 10) - 5,
        riskExposureTrend: ['up', 'down', 'neutral'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'neutral'
      };
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * Risk metrics data structure returned by the hook
 */
export interface RiskMetricsData {
  assetExposure: SimpleMetric[];
  exchangeExposure: SimpleMetric[];
}

/**
 * Hook to fetch risk metrics data for a specific farm
 */
export function useRiskMetrics(farmId: string) {
  return useQuery<RiskMetricsData>({
    queryKey: queryKeys.dashboard.riskMetrics(farmId),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getRiskMetrics(farmId);
      
      // For now, return mock data
      return {
        assetExposure: [
          { name: 'BTC/USD', value: '40%', status: 'warning' as const },
          { name: 'ETH/USD', value: '24%', status: 'normal' as const },
          { name: 'SOL/USD', value: '20%', status: 'normal' as const },
          { name: 'AVAX/USD', value: '16%', status: 'normal' as const }
        ],
        exchangeExposure: [
          { name: 'Binance', value: '42%', status: 'warning' as const },
          { name: 'FTX', value: '0%', status: 'danger' as const },
          { name: 'Kraken', value: '35%', status: 'normal' as const },
          { name: 'Coinbase', value: '23%', status: 'normal' as const }
        ]
      };
    },
    staleTime: 60000, // Consider data fresh for 1 minute
  });
}
