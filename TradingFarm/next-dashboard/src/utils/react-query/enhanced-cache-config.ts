/**
 * Enhanced Cache Configuration for TanStack Query
 * 
 * This file defines optimized caching strategies for different data types
 * in the Trading Farm dashboard to balance performance and data freshness.
 */

import { Env } from '@/utils/environment';

// Base cache times in milliseconds
const CACHE_TIMES = {
  // Core entities (rarely change)
  STATIC: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // Reference data (changes occasionally)
  REFERENCE: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Business entities (changes frequently)
  ENTITY: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },
  
  // Dashboard and analytics data (needs to be fresh)
  DASHBOARD: {
    staleTime: 60 * 1000, // 1 minute
    gcTime: 15 * 60 * 1000, // 15 minutes
  },
  
  // Market data (needs to be very fresh)
  MARKET: {
    staleTime: 15 * 1000, // 15 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
  
  // Real-time data (always refetch)
  REALTIME: {
    staleTime: 0, // Always stale
    gcTime: 60 * 1000, // 1 minute
  },
};

// For development, we use faster cache invalidation
const DEV_MULTIPLIER = 0.25; // 1/4 of the time in development

/**
 * Gets appropriate cache time settings based on environment and entity type
 */
export function getCacheTimeForEntity(entityType: EntityType): CacheTime {
  const baseTimes = ENTITY_CACHE_MAP[entityType] || CACHE_TIMES.ENTITY;
  
  // In development, we want faster cache invalidation
  if (Env.isDevelopment) {
    return {
      staleTime: Math.max(baseTimes.staleTime * DEV_MULTIPLIER, 1000), // Min 1 second
      gcTime: Math.max(baseTimes.gcTime * DEV_MULTIPLIER, 5000), // Min 5 seconds
    };
  }
  
  return baseTimes;
}

/**
 * Gets cache time settings for WebSocket-updated entities
 * These have longer stale times since they're updated by WebSockets
 */
export function getWebSocketCacheTime(entityType: EntityType): CacheTime {
  const baseTimes = getCacheTimeForEntity(entityType);
  
  // WebSocket-updated data can have longer stale times
  // since it's refreshed via WebSocket events
  return {
    staleTime: baseTimes.staleTime * 3, // 3x longer stale time
    gcTime: baseTimes.gcTime, // Same garbage collection time
  };
}

/**
 * Cache times specifically for infinite queries
 */
export function getInfiniteQueryCacheTime(entityType: EntityType): CacheTime {
  const baseTimes = getCacheTimeForEntity(entityType);
  
  // Infinite queries should have longer cache times
  // because refetching them is more expensive
  return {
    staleTime: baseTimes.staleTime * 2, // 2x longer stale time
    gcTime: baseTimes.gcTime * 1.5, // 1.5x longer gc time
  };
}

/**
 * Selective refetching configuration for critical data that needs to stay fresh
 */
export function getRefetchInterval(entityType: EntityType): number | false {
  // Only certain entity types should auto-refresh
  switch (entityType) {
    case 'market-data':
      return 30 * 1000; // 30 seconds
    case 'dashboard-overview':
      return 60 * 1000; // 1 minute
    case 'position-active':
      return 2 * 60 * 1000; // 2 minutes
    default:
      return false; // Most data doesn't need to auto-refresh
  }
}

/**
 * Cache configuration for prefetching to optimize user navigation
 */
export function getPrefetchConfig(entityType: EntityType): PrefetchConfig {
  const baseTimes = getCacheTimeForEntity(entityType);
  
  // Prefetched data should become stale sooner
  return {
    staleTime: baseTimes.staleTime / 2, // Half the normal stale time
    gcTime: baseTimes.gcTime,
    prefetchRelatedData: entityType === 'strategy' || entityType === 'agent',
  };
}

// Types
export type EntityType = 
  | 'strategy'
  | 'agent'
  | 'farm'
  | 'position'
  | 'position-active'
  | 'order'
  | 'dashboard-overview'
  | 'dashboard-performance'
  | 'market-data'
  | 'trade-history'
  | 'backtest'
  | 'goal'
  | 'exchange'
  | 'vault'
  | 'eliza-agent';

export interface CacheTime {
  staleTime: number;
  gcTime: number;
}

export interface PrefetchConfig extends CacheTime {
  prefetchRelatedData: boolean;
}

// Mapping of entity types to their cache time categories
const ENTITY_CACHE_MAP: Record<EntityType, CacheTime> = {
  'strategy': CACHE_TIMES.ENTITY,
  'agent': CACHE_TIMES.ENTITY,
  'farm': CACHE_TIMES.REFERENCE,
  'position': CACHE_TIMES.ENTITY,
  'position-active': CACHE_TIMES.DASHBOARD, // Active positions need fresher data
  'order': CACHE_TIMES.ENTITY,
  'dashboard-overview': CACHE_TIMES.DASHBOARD,
  'dashboard-performance': CACHE_TIMES.DASHBOARD,
  'market-data': CACHE_TIMES.MARKET,
  'trade-history': CACHE_TIMES.ENTITY,
  'backtest': CACHE_TIMES.REFERENCE, // Backtests don't change often
  'goal': CACHE_TIMES.ENTITY,
  'exchange': CACHE_TIMES.REFERENCE,
  'vault': CACHE_TIMES.DASHBOARD, // Financial data needs to be fresh
  'eliza-agent': CACHE_TIMES.ENTITY,
};

/**
 * Default query options to use across the application
 */
export const defaultQueryOptions = {
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
};

/**
 * Comprehensive cache configuration for the QueryClient
 */
export const queryCacheConfig = {
  defaultOptions: {
    queries: {
      ...defaultQueryOptions,
      staleTime: CACHE_TIMES.ENTITY.staleTime,
      gcTime: CACHE_TIMES.ENTITY.gcTime,
    },
  },
};

/**
 * Utility to log cache behavior for debugging
 * Only enabled in development mode
 */
export function logCacheEvent(
  type: 'hit' | 'miss' | 'stale' | 'invalidate' | 'update',
  queryKey: unknown[],
  data?: unknown
) {
  if (!Env.isDevelopment) return;
  
  // Only log in development
  const prefix = '🔄 [Cache]';
  const icons = {
    hit: '✅',
    miss: '❌',
    stale: '⏰',
    invalidate: '🚫',
    update: '📝',
  };
  
  // Format the key for better readability
  const formattedKey = Array.isArray(queryKey[0]) 
    ? queryKey[0].join('.')
    : queryKey.join('.');
  
  console.log(`${prefix} ${icons[type]} ${type.toUpperCase()}: ${formattedKey}`);
  
  if (data && type === 'update') {
    console.log('Updated data:', data);
  }
}
