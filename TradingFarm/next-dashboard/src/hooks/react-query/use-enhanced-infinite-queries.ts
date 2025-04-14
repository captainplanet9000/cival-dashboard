import { useInfiniteQuery, InfiniteData, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { apiService } from '@/services/api-service';
import { queryKeys } from '@/utils/react-query/query-keys';
import { entityCacheConfig } from '@/utils/react-query/cache-config';
import { withCancellation } from '@/utils/react-query/request-manager';

// ============= TYPES =============

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface TradeFilter {
  farmId?: string;
  agentId?: string;
  strategyId?: string;
  symbols?: string[];
  startDate?: string;
  endDate?: string;
  outcome?: 'win' | 'loss' | 'all';
  sort?: {
    field: 'date' | 'profit' | 'duration';
    direction: SortDirection;
  };
}

export interface PerformanceDataFilter {
  farmId: string;
  agentId?: string;
  strategyId?: string;
  timeframe?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  startDate?: string;
  endDate?: string;
}

// ============= ENHANCED INFINITE QUERY HOOKS =============

/**
 * Enhanced useTradeHistory hook with infinite loading & optimized caching
 */
export function useTradeHistory(filters: TradeFilter, options?: UseInfiniteQueryOptions<PaginatedResponse<any>>) {
  const limit = 20; // Number of items per page
  
  // Create unique request ID for cancellation
  const requestId = `trade-history-${JSON.stringify(filters)}`;
  
  // Get appropriate cache settings
  const cacheSettings = entityCacheConfig.analyticalData;
  
  return useInfiniteQuery<PaginatedResponse<any>>({
    queryKey: queryKeys.analytics.trades(filters)._def,
    queryFn: ({ pageParam = 1 }) => {
      const queryParams = {
        ...filters,
        page: pageParam,
        limit,
      };
      
      // Use withCancellation to make the request cancellable
      const fetchFn = withCancellation(
        (config) => apiService.get('/api/analytics/trades', { ...config, params: queryParams })
          .then(res => res.data),
        requestId
      );
      
      return fetchFn();
    },
    initialPageParam: 1, // Start with page 1
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    staleTime: cacheSettings.staleTime,
    gcTime: cacheSettings.gcTime,
    ...options,
  });
}

/**
 * Enhanced usePerformanceData hook with infinite loading & optimized caching
 */
export function usePerformanceData(filters: PerformanceDataFilter, options?: UseInfiniteQueryOptions<PaginatedResponse<any>>) {
  const limit = 30; // Number of data points per page - higher for performance charts
  
  // Create unique request ID for cancellation
  const requestId = `performance-data-${JSON.stringify(filters)}`;
  
  // Get appropriate cache settings
  const cacheSettings = entityCacheConfig.analyticalData;
  
  return useInfiniteQuery<PaginatedResponse<any>>({
    queryKey: queryKeys.analytics.performance(filters)._def,
    queryFn: ({ pageParam = 1 }) => {
      const queryParams = {
        ...filters,
        page: pageParam,
        limit,
      };
      
      // Use withCancellation to make the request cancellable
      const fetchFn = withCancellation(
        (config) => apiService.get('/api/analytics/performance', { ...config, params: queryParams })
          .then(res => res.data),
        requestId
      );
      
      return fetchFn();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    staleTime: cacheSettings.staleTime,
    gcTime: cacheSettings.gcTime,
    ...options,
  });
}

/**
 * Enhanced useBacktestResults hook with infinite loading & optimized caching
 */
export function useBacktestResults(
  strategyId: string, 
  filters?: {
    sort?: {
      field: 'date' | 'performance' | 'trades';
      direction: SortDirection;
    };
  }, 
  options?: UseInfiniteQueryOptions<PaginatedResponse<any>>
) {
  const limit = 10; // Number of items per page
  
  // Create unique request ID for cancellation
  const requestId = `backtest-results-${strategyId}-${JSON.stringify(filters)}`;
  
  // Get appropriate cache settings
  const cacheSettings = entityCacheConfig.analyticalData;
  
  return useInfiniteQuery<PaginatedResponse<any>>({
    queryKey: queryKeys.strategies.backtests(strategyId, filters)._def,
    queryFn: ({ pageParam = 1 }) => {
      const queryParams = {
        ...filters,
        page: pageParam,
        limit,
      };
      
      // Use withCancellation to make the request cancellable
      const fetchFn = withCancellation(
        (config) => apiService.get(`/api/strategies/${strategyId}/backtests`, { ...config, params: queryParams })
          .then(res => res.data),
        requestId
      );
      
      return fetchFn();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    staleTime: cacheSettings.staleTime,
    gcTime: cacheSettings.gcTime,
    enabled: !!strategyId, // Only run if we have a strategy ID
    ...options,
  });
}

// ============= UTILITY FUNCTIONS =============

/**
 * Utility function to combine and flatten infinite query data for display or processing
 */
export function flattenInfiniteQueryData<T>(data: InfiniteData<PaginatedResponse<T>> | undefined): T[] {
  if (!data || !data.pages) {
    return [];
  }
  
  return data.pages.reduce((acc, page) => {
    return [...acc, ...page.data];
  }, [] as T[]);
}

/**
 * Get total count from infinite query data
 */
export function getTotalCount<T>(data: InfiniteData<PaginatedResponse<T>> | undefined): number {
  if (!data || !data.pages || data.pages.length === 0) {
    return 0;
  }
  
  // Get total from the first page (all pages should have the same total)
  return data.pages[0].total;
}

/**
 * Check if we've loaded all available data
 */
export function hasLoadedAllData<T>(data: InfiniteData<PaginatedResponse<T>> | undefined): boolean {
  if (!data || !data.pages || data.pages.length === 0) {
    return false;
  }
  
  // Check if the last page has more data
  const lastPage = data.pages[data.pages.length - 1];
  return !lastPage.hasMore;
}
