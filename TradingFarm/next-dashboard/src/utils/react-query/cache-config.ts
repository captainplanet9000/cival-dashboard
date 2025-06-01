import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a configured QueryClient with Trading Farm-specific settings
 * adjusted for different environments and data types.
 */
export function createConfiguredQueryClient(options?: {
  environment?: 'development' | 'production';
  enableLogging?: boolean;
  aggressiveCaching?: boolean;
}): QueryClient {
  const environment = options?.environment || 
    (process.env.NODE_ENV === 'production' ? 'production' : 'development');
  const enableLogging = options?.enableLogging ?? environment === 'development';
  const aggressiveCaching = options?.aggressiveCaching ?? false;

  // Base default values
  const defaultStaleTime = environment === 'production' 
    ? 1000 * 60 * 5   // 5 minutes in production
    : 1000 * 60 * 2;  // 2 minutes in development
  
  const defaultCacheTime = environment === 'production'
    ? 1000 * 60 * 30  // 30 minutes in production
    : 1000 * 60 * 10; // 10 minutes in development

  // For aggressive caching (useful for demo environments)
  const aggressiveStaleTime = 1000 * 60 * 60;  // 60 minutes
  const aggressiveCacheTime = 1000 * 60 * 120; // 2 hours

  // Calculate final values
  const staleTime = aggressiveCaching ? aggressiveStaleTime : defaultStaleTime;
  const cacheTime = aggressiveCaching ? aggressiveCacheTime : defaultCacheTime;

  return new QueryClient({
    defaultOptions: {
      queries: {
        // Common default settings
        staleTime,
        gcTime: cacheTime,
        refetchOnWindowFocus: environment === 'production', // Only refetch on window focus in production
        retry: environment === 'production' ? 3 : 1, // More retries in production
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff

        // Trading Farm specific settings
        structuralSharing: true, // Enable structural sharing for performance
      },
      mutations: {
        // Error handling for mutations
        retry: environment === 'production' ? 2 : 0, // Fewer retries for mutations
        // No need to set cacheTime for mutations
      },
    },
    // Configure logger for development
    logger: {
      log: enableLogging ? console.log : () => {},
      warn: enableLogging ? console.warn : () => {},
      error: console.error, // Always log errors
    },
  });
}

/**
 * Cache groups for different entity types with tailored cache settings
 */
export const entityCacheConfig = {
  // Core entities - keep fresh but don't fetch excessively
  core: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
  },
  
  // Dashboard data - keep reasonably fresh
  dashboard: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  },
  
  // Market data - keep very fresh
  marketData: {
    staleTime: 1000 * 30,     // 30 seconds
    gcTime: 1000 * 60 * 5,    // 5 minutes
  },
  
  // Active positions data - keep very fresh
  activePositions: {
    staleTime: 1000 * 60,     // 1 minute
    gcTime: 1000 * 60 * 10,   // 10 minutes
  },
  
  // Reference data - can be cached longer
  referenceData: {
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  },
  
  // User settings - longer stale time, shorter gc time
  userSettings: {
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60,    // 1 hour
  },
  
  // Analytical data - can be cached longer
  analyticalData: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60,    // 1 hour
  },
};

/**
 * Cache invalidation functions for specific domain actions
 */
export function invalidateEntityCache(
  queryClient: QueryClient,
  entityType: 'strategy' | 'position' | 'agent' | 'order' | 'farm',
  entityId?: string
) {
  switch (entityType) {
    case 'strategy':
      if (entityId) {
        // Invalidate specific strategy
        queryClient.invalidateQueries({
          queryKey: queryKeys.strategies.detail(entityId)._def,
        });
      } else {
        // Invalidate all strategies
        queryClient.invalidateQueries({
          queryKey: queryKeys.strategies._def,
        });
      }
      break;
      
    case 'position':
      if (entityId) {
        // Invalidate specific position
        queryClient.invalidateQueries({
          queryKey: queryKeys.positions.detail(entityId)._def,
        });
      } else {
        // Invalidate all positions
        queryClient.invalidateQueries({
          queryKey: queryKeys.positions._def,
        });
      }
      // Also invalidate dashboard since positions affect overall metrics
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard._def,
      });
      break;
      
    case 'agent':
      if (entityId) {
        // Invalidate specific agent
        queryClient.invalidateQueries({
          queryKey: queryKeys.agents.detail(entityId)._def,
        });
      } else {
        // Invalidate all agents
        queryClient.invalidateQueries({
          queryKey: queryKeys.agents._def,
        });
      }
      break;
      
    case 'order':
      if (entityId) {
        // Invalidate specific order
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.detail(entityId)._def,
        });
      } else {
        // Invalidate all orders
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders._def,
        });
      }
      // Orders also affect positions
      queryClient.invalidateQueries({
        queryKey: queryKeys.positions._def,
      });
      break;
      
    case 'farm':
      if (entityId) {
        // Invalidate specific farm
        queryClient.invalidateQueries({
          queryKey: queryKeys.farms.detail(entityId)._def,
        });
        // Also invalidate the dashboard for this farm
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.detail(entityId)._def,
        });
      } else {
        // Invalidate all farms
        queryClient.invalidateQueries({
          queryKey: queryKeys.farms._def,
        });
        // Also invalidate all dashboards
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard._def,
        });
      }
      break;
  }
}

// Import at the bottom to avoid circular dependencies
import { queryKeys } from './query-keys';
