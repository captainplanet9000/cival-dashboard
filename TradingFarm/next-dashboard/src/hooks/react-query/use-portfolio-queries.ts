/**
 * Portfolio-related React Query Hooks
 * 
 * This module provides hooks for fetching portfolio data from the Trading Farm API
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase/client';
import { getCacheTimeForEntity } from '@/utils/react-query/enhanced-cache-config';

// Types
export interface PortfolioData {
  id: string;
  farmId: string;
  totalValue: number;
  totalPnl: number;
  pnlPercent: number;
  allocations: {
    asset: string;
    percentage: number;
    value: number;
  }[];
  historicalPerformance: {
    timestamp: string;
    value: number;
  }[];
  lastUpdated: string;
}

// Query Keys
export const portfolioKeys = {
  all: ['portfolio'] as const,
  lists: () => [...portfolioKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => 
    [...portfolioKeys.lists(), { ...filters }] as const,
  details: () => [...portfolioKeys.all, 'detail'] as const,
  detail: (id: string) => [...portfolioKeys.details(), id] as const,
};

/**
 * Fetch portfolio data for a farm
 */
export const usePortfolioData = (farmId?: string) => {
  return useQuery({
    queryKey: portfolioKeys.list({ farmId }),
    queryFn: async () => {
      // Initially return mock data
      const mockData: PortfolioData = {
        id: '1',
        farmId: farmId || '1',
        totalValue: 123456.78,
        totalPnl: 3456.78,
        pnlPercent: 2.89,
        allocations: [
          { asset: 'BTC', percentage: 45, value: 55555.55 },
          { asset: 'ETH', percentage: 30, value: 37037.03 },
          { asset: 'SOL', percentage: 15, value: 18518.52 },
          { asset: 'USDT', percentage: 10, value: 12345.68 }
        ],
        historicalPerformance: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 120000 + (i * 120) + (Math.random() * 500 - 250)
        })),
        lastUpdated: new Date().toISOString()
      };
      
      // TODO: Replace with actual API call
      // const { data, error } = await supabase
      //   .from('portfolio')
      //   .select('*')
      //   .eq('farm_id', farmId)
      //   .single();
      
      // if (error) throw new Error(`Error fetching portfolio data: ${error.message}`);
      
      return mockData;
    },
    staleTime: getCacheTimeForEntity('portfolio').staleTime,
    gcTime: getCacheTimeForEntity('portfolio').gcTime,
    enabled: !!farmId,
    refetchInterval: 60000, // Refetch every minute
  });
};

/**
 * Fetch detailed portfolio analysis
 */
export const usePortfolioAnalysis = (portfolioId: string) => {
  return useQuery({
    queryKey: [...portfolioKeys.detail(portfolioId), 'analysis'],
    queryFn: async () => {
      // TODO: Implement actual API call
      // const { data, error } = await supabase
      //   .from('portfolio_analysis')
      //   .select('*')
      //   .eq('portfolio_id', portfolioId)
      //   .single();
      
      // if (error) throw new Error(`Error fetching portfolio analysis: ${error.message}`);
      
      return {
        id: portfolioId,
        riskMetrics: {
          sharpeRatio: 1.72,
          sortinoRatio: 2.35,
          maxDrawdown: -15.4,
          volatility: 12.8,
          calmarRatio: 1.23,
          winRate: 68.5
        },
        correlations: {
          btc: 0.82,
          eth: 0.75,
          spy: 0.32,
          gold: -0.15
        },
        assetAllocationAdvice: {
          recommendations: [
            { asset: 'BTC', currentAllocation: 45, recommendedAllocation: 40, reasoning: 'Reduce risk due to increased volatility' },
            { asset: 'ETH', currentAllocation: 30, recommendedAllocation: 35, reasoning: 'Strong fundamentals and upcoming protocol upgrades' },
            { asset: 'SOL', currentAllocation: 15, recommendedAllocation: 15, reasoning: 'Maintain current allocation' },
            { asset: 'USDT', currentAllocation: 10, recommendedAllocation: 10, reasoning: 'Maintain cash reserves for opportunities' }
          ],
          summary: 'Portfolio is well balanced but slightly overexposed to BTC volatility.'
        }
      };
    },
    staleTime: getCacheTimeForEntity('analysis').staleTime,
    gcTime: getCacheTimeForEntity('analysis').gcTime,
    enabled: !!portfolioId,
  });
};
