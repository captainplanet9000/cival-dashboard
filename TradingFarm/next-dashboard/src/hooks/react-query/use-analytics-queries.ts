import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api-service';
import { queryKeys } from '@/utils/react-query/query-keys';

// Analytics data filter parameters
export interface AnalyticsFilters {
  farmId?: string;
  startDate?: string;
  endDate?: string;
  timeframe?: '1h' | '4h' | '1d' | '1w' | '1m';
  instruments?: string[];
  exchanges?: string[];
  strategies?: string[];
  agents?: string[];
}

// Performance data point interface
export interface PerformanceDataPoint {
  timestamp: string;
  portfolioValue: number;
  pnl: number;
  pnlPercentage: number;
  drawdown: number;
  drawdownPercentage: number;
  exposure: number;
  exposurePercentage: number;
  winRate: number;
  sharpeRatio: number;
  trades: number;
}

// Performance data with pagination
export interface PerformanceDataResponse {
  data: PerformanceDataPoint[];
  nextCursor?: string;
  hasMore: boolean;
}

// Trade distribution data
export interface TradeDistribution {
  symbol: string;
  count: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  maxPnl: number;
  minPnl: number;
  avgDuration: number;
  percentage: number;
}

// Drawdown period data
export interface DrawdownPeriod {
  startDate: string;
  endDate?: string;
  durationDays: number;
  maxDrawdownPercentage: number;
  maxDrawdownValue: number;
  recoveryDays?: number;
  isActive: boolean;
}

// Overall analytics summary
export interface AnalyticsSummary {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  averageProfitLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  volatility: number;
  bestTrade: {
    symbol: string;
    pnl: number;
    pnlPercentage: number;
    date: string;
  };
  worstTrade: {
    symbol: string;
    pnl: number;
    pnlPercentage: number;
    date: string;
  };
  averageTradeLength: number;
  largestDrawdowns: DrawdownPeriod[];
  monthlyPerformance: {
    month: string;
    pnl: number;
    pnlPercentage: number;
    trades: number;
    winRate: number;
  }[];
}

/**
 * Hook to fetch performance time series data with infinite scrolling
 */
export function usePerformanceData(filters: AnalyticsFilters = {}, limit: number = 50) {
  return useInfiniteQuery<PerformanceDataResponse>({
    queryKey: queryKeys.analytics.performance(filters),
    queryFn: async ({ pageParam = null }) => {
      // In a real implementation, this would call the API service
      // return apiService.getPerformanceData(filters, pageParam, limit);
      
      // Generate mock performance data
      const data: PerformanceDataPoint[] = Array.from({ length: limit }).map((_, index) => {
        const date = new Date();
        
        if (filters.timeframe === '1h') {
          date.setHours(date.getHours() - (pageParam ? parseInt(pageParam) : 0) * limit - index);
        } else if (filters.timeframe === '4h') {
          date.setHours(date.getHours() - ((pageParam ? parseInt(pageParam) : 0) * limit + index) * 4);
        } else if (filters.timeframe === '1w') {
          date.setDate(date.getDate() - ((pageParam ? parseInt(pageParam) : 0) * limit + index) * 7);
        } else if (filters.timeframe === '1m') {
          date.setMonth(date.getMonth() - ((pageParam ? parseInt(pageParam) : 0) * limit + index));
        } else {
          // Default to daily
          date.setDate(date.getDate() - (pageParam ? parseInt(pageParam) : 0) * limit - index);
        }
        
        const baseValue = 100000;
        const randomWalk = Math.sin(index / 10) * 5000 + Math.random() * 10000;
        const portfolioValue = baseValue + randomWalk * (1 + index / 100);
        
        return {
          timestamp: date.toISOString(),
          portfolioValue,
          pnl: portfolioValue - baseValue,
          pnlPercentage: ((portfolioValue - baseValue) / baseValue) * 100,
          drawdown: Math.min(0, randomWalk * -0.5),
          drawdownPercentage: Math.min(0, (randomWalk * -0.5) / portfolioValue) * 100,
          exposure: baseValue * 0.7 + Math.random() * baseValue * 0.3,
          exposurePercentage: 70 + Math.random() * 30,
          winRate: 50 + Math.random() * 30,
          sharpeRatio: 1 + Math.random() * 2,
          trades: Math.floor(Math.random() * 10),
        };
      });
      
      // Sort by timestamp
      data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // For demo purposes, limit the data to 500 points total (10 pages)
      const hasMore = (pageParam === null || parseInt(pageParam) < 9);
      const nextCursor = hasMore ? (pageParam === null ? '1' : (parseInt(pageParam) + 1).toString()) : undefined;
      
      return {
        data,
        nextCursor,
        hasMore,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch trade distribution analytics
 */
export function useTradeDistribution(filters: AnalyticsFilters = {}) {
  return useQuery<TradeDistribution[]>({
    queryKey: queryKeys.analytics.tradeDistribution(filters),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getTradeDistribution(filters);
      
      // For now, return mock data
      const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'BNB/USD', 
                      'DOT/USD', 'ADA/USD', 'XRP/USD', 'DOGE/USD', 'MATIC/USD'];
      
      const totalTrades = 750;
      let remainingPercentage = 100;
      
      return symbols.map((symbol, index) => {
        // Generate decreasing distribution for demo purposes
        const percentage = index === symbols.length - 1 
          ? remainingPercentage 
          : Math.floor((40 / (index + 1)) * Math.random() * 10) / 10;
          
        remainingPercentage -= percentage;
        
        const count = Math.floor((percentage / 100) * totalTrades);
        const winRate = 50 + (Math.random() * 30) - (index * 2);
        const winCount = Math.floor((winRate / 100) * count);
        const lossCount = count - winCount;
        
        return {
          symbol,
          count,
          winCount,
          lossCount,
          winRate,
          totalPnl: (winCount * 300) - (lossCount * 200) + Math.random() * 1000,
          avgPnl: ((winCount * 300) - (lossCount * 200)) / count,
          maxPnl: 500 + Math.random() * 1500,
          minPnl: -700 - Math.random() * 300,
          avgDuration: 2 + Math.random() * 48, // hours
          percentage,
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch analytics summary
 */
export function useAnalyticsSummary(filters: AnalyticsFilters = {}) {
  return useQuery<AnalyticsSummary>({
    queryKey: queryKeys.analytics.summary(filters),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getAnalyticsSummary(filters);
      
      // Generate monthly performance for the last 12 months
      const monthlyPerformance = Array.from({ length: 12 }).map((_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - index);
        
        const pnlPercentage = Math.random() * 20 - 5; // Between -5% and 15%
        
        return {
          month: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`,
          pnl: 100000 * (pnlPercentage / 100),
          pnlPercentage,
          trades: 50 + Math.floor(Math.random() * 100),
          winRate: 50 + Math.random() * 30,
        };
      });
      
      // Generate drawdown periods
      const largestDrawdowns = Array.from({ length: 5 }).map((_, index) => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 180));
        
        const durationDays = 3 + Math.floor(Math.random() * 30);
        const isActive = index === 0 && Math.random() > 0.7;
        
        const endDate = isActive ? undefined : new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        
        return {
          startDate: startDate.toISOString(),
          endDate: endDate?.toISOString(),
          durationDays,
          maxDrawdownPercentage: Math.random() * 20 * -1,
          maxDrawdownValue: Math.random() * 20000 * -1,
          recoveryDays: isActive ? undefined : Math.floor(Math.random() * 30),
          isActive,
        };
      });
      
      // Sort drawdowns by magnitude
      largestDrawdowns.sort((a, b) => a.maxDrawdownPercentage - b.maxDrawdownPercentage);
      
      return {
        totalTrades: 750,
        winRate: 62.5,
        profitFactor: 1.75,
        averageProfitLoss: 125,
        maxDrawdown: -15.2,
        sharpeRatio: 1.8,
        sortinoRatio: 2.3,
        calmarRatio: 1.1,
        volatility: 12.5,
        bestTrade: {
          symbol: 'ETH/USD',
          pnl: 4250,
          pnlPercentage: 42.5,
          date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        },
        worstTrade: {
          symbol: 'DOGE/USD',
          pnl: -2300,
          pnlPercentage: -23,
          date: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
        },
        averageTradeLength: 3.5, // hours
        largestDrawdowns,
        monthlyPerformance,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch analytics data for a specific farm
 */
export function useFarmAnalytics(farmId: string, filters: Omit<AnalyticsFilters, 'farmId'> = {}) {
  return {
    summary: useAnalyticsSummary({ ...filters, farmId }),
    performance: usePerformanceData({ ...filters, farmId }),
    tradeDistribution: useTradeDistribution({ ...filters, farmId }),
  };
}
