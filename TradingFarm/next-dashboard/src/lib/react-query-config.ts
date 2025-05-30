import { QueryClient, DefaultOptions, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { isProduction, isDevelopment } from '@/lib/environment';

/**
 * Trading Farm Dashboard optimized React Query configuration
 * 
 * This file contains production-ready optimizations for React Query including:
 * - Custom error handling with toasts for user feedback
 * - Optimized caching strategies based on query types
 * - Performance-tuned staleTime and cacheTime settings
 * - Environment-specific logging configuration
 */

// Different stale times based on data volatility
const STALE_TIMES = {
  LIVE_DATA: 1000 * 5, // 5 seconds for real-time data like prices
  ACCOUNT_DATA: 1000 * 30, // 30 seconds for account information
  STATIC_DATA: 1000 * 60 * 5, // 5 minutes for relatively static data
  REFERENCE_DATA: 1000 * 60 * 30, // 30 minutes for reference data that rarely changes
};

// Garbage collection times (how long to keep data in memory after becoming unused)
const GC_TIMES = {
  SHORT: 1000 * 60 * 5, // 5 minutes
  MEDIUM: 1000 * 60 * 15, // 15 minutes
  LONG: 1000 * 60 * 60, // 1 hour
  PERSISTENCE: 1000 * 60 * 60 * 24, // 24 hours for offline access
};

// Custom error handler function for queries and mutations
const handleError = (error: unknown, title: string, defaultMessage: string) => {
  // Only show toasts in UI environments (not during SSR)
  if (typeof window !== 'undefined') {
    if (error instanceof Error) {
      toast({
        title,
        description: error.message || defaultMessage,
        variant: 'destructive',
      });
    } else {
      console.error(`Unknown ${title.toLowerCase()} error:`, error);
    }
  }
};

// Default options that can be overridden on a per-query basis
export const defaultQueryOptions: DefaultOptions = {
  queries: {
    // Optimize for production environment
    staleTime: isProduction() ? STALE_TIMES.ACCOUNT_DATA : STALE_TIMES.LIVE_DATA,
    gcTime: isProduction() ? GC_TIMES.MEDIUM : GC_TIMES.SHORT,
    
    // Set retry behavior (more conservative in production)
    retry: isProduction() ? 3 : 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff capped at 30s
    
    // Refetch on window focus (more aggressive in development)
    refetchOnWindowFocus: isProduction() ? 'always' : false,
    
    // Refetch on reconnect (critical for trading application)
    refetchOnReconnect: true,
    
    // Automatically refresh data when new instances mount
    refetchOnMount: true,
  },
  mutations: {
    // Default retry configuration for mutations
    retry: isProduction() ? 2 : 0,
  },
};

/**
 * Creates a configured QueryClient instance with optimized settings
 */
export function createQueryClient() {
  // Create a query cache with custom error handling
  const queryCache = new QueryCache({
    onError: (error) => {
      if (isDevelopment()) {
        console.error('Query Cache Error:', error);
      }
      // Apply global error handling for queries
      handleError(error, 'Data Fetch Error', 'Failed to fetch data. Please try again.');
    },
  });

  // Create mutation cache with custom error handling
  const mutationCache = new MutationCache({
    onError: (error) => {
      // Apply global error handling for mutations
      handleError(error, 'Operation Failed', 'Your request could not be processed. Please try again.');
    },
  });

  return new QueryClient({
    defaultOptions: defaultQueryOptions,
    queryCache,
    mutationCache,
  });
}

/**
 * Helper functions for common query patterns
 */

/**
 * Get optimized query options for live trading data
 * These queries need frequent updates and shorter stale times
 */
export function getLiveTradingQueryOptions() {
  return {
    staleTime: STALE_TIMES.LIVE_DATA,
    gcTime: GC_TIMES.SHORT,
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchIntervalInBackground: true,
  };
}

/**
 * Get optimized query options for reference data
 * These queries are less frequent and can be cached longer
 */
export function getReferenceDataQueryOptions() {
  return {
    staleTime: STALE_TIMES.REFERENCE_DATA,
    gcTime: GC_TIMES.LONG,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  };
}

/**
 * Get optimized query options for user account data
 */
export function getAccountQueryOptions() {
  return {
    staleTime: STALE_TIMES.ACCOUNT_DATA,
    gcTime: GC_TIMES.MEDIUM,
    refetchInterval: 60000, // Refetch every minute
    refetchIntervalInBackground: false,
  };
}

/**
 * Query key factories to ensure consistent key structures
 */
export const queryKeys = {
  trading: {
    orders: (params?: Record<string, any>) => ['orders', params],
    positions: (params?: Record<string, any>) => ['positions', params],
    balances: (params?: Record<string, any>) => ['balances', params],
    markets: (params?: Record<string, any>) => ['markets', params],
  },
  agents: {
    all: () => ['agents'],
    detail: (id: string | number) => ['agents', id],
    performance: (id: string | number) => ['agents', id, 'performance'],
    logs: (id: string | number, params?: Record<string, any>) => ['agents', id, 'logs', params],
  },
  vault: {
    masters: () => ['vault', 'masters'],
    master: (id: number) => ['vault', 'masters', id],
    accounts: (masterId?: number) => ['vault', 'accounts', masterId],
    account: (id: number) => ['vault', 'accounts', id],
    transactions: (accountId?: number, params?: Record<string, any>) => ['vault', 'transactions', accountId, params],
  },
  user: {
    profile: () => ['user', 'profile'],
    settings: () => ['user', 'settings'],
    permissions: () => ['user', 'permissions'],
  },
};
