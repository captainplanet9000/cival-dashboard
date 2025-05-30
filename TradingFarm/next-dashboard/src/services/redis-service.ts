import Redis from 'ioredis';
import { createInfo } from 'redis-info';

// Redis Cloud connection details
const REDIS_HOST = process.env.REDIS_HOST || 'redis-14325.c60.us-west-1-2.ec2.redns.redis-cloud.com';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '14325', 10);
const REDIS_USERNAME = process.env.REDIS_USERNAME || 'default';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'ri5RqGg7aYiwQ4hQn809DFZPoVA18j2b';
const CACHE_TTL_DEFAULT = parseInt(process.env.CACHE_TTL_DEFAULT || '3600', 10); // 1 hour default

export type CachePolicy = {
  ttl: number; // Time to live in seconds
  staleWhileRevalidate?: boolean; // Whether to use stale data while fetching fresh data
};

export type CacheNamespace = 
  | 'agent' 
  | 'farm' 
  | 'market-data' 
  | 'exchange' 
  | 'goal'
  | 'strategy'
  | 'order'
  | 'trade';

// Standard cache policies for different types of data
export const CACHE_POLICIES = {
  AGENT: { ttl: 60 * 60 }, // 1 hour
  FARM: { ttl: 60 * 60 }, // 1 hour
  GOAL: { ttl: 60 * 60 }, // 1 hour
  MARKET_DATA: { ttl: 60 }, // 1 minute
  EXCHANGE_INFO: { ttl: 60 * 30 }, // 30 minutes
  STRATEGY: { ttl: 60 * 60 * 12 }, // 12 hours
  ORDER: { ttl: 60 * 5 }, // 5 minutes
  TRADE: { ttl: 60 * 5 }, // 5 minutes
  // Add more cache policies as needed
};

let redisClient: Redis | null = null;

/**
 * Initialize Redis client with connection to Redis server
 */
export const initRedisClient = (): Redis => {
  if (!redisClient) {
    try {
      redisClient = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        username: REDIS_USERNAME,
        password: REDIS_PASSWORD,
        retryStrategy: (times) => {
          // Exponential backoff with max 30 second delay
          const delay = Math.min(times * 100, 30000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        // Log connection info
        connectTimeout: 10000,
        enableReadyCheck: true,
        enableOfflineQueue: true,
        lazyConnect: false
      });

      // Handle connection events
      redisClient.on('connect', () => {
        console.log('Connected to Redis Cloud server');
      });

      redisClient.on('error', (err) => {
        console.error('Redis connection error:', err);
      });

      redisClient.on('reconnecting', () => {
        console.log('Reconnecting to Redis Cloud server');
      });
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      throw error;
    }
  }

  return redisClient;
};

/**
 * Get the Redis client instance, initializing if needed
 */
export const getRedisClient = (): Redis => {
  if (!redisClient) {
    return initRedisClient();
  }
  return redisClient;
};

/**
 * Generate a standardized cache key for a given resource
 */
export const generateCacheKey = (
  namespace: CacheNamespace, 
  key: string,
  filters?: Record<string, string | number | boolean>
): string => {
  let finalKey = `trading-farm:${namespace}:${key}`;
  
  if (filters && Object.keys(filters).length > 0) {
    const filterString = Object.entries(filters)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    
    finalKey += `:${filterString}`;
  }
  
  return finalKey;
};

/**
 * Set a value in the cache with expiration
 */
export const setCache = async <T>(
  key: string, 
  value: T, 
  options: { ttl?: number } = {}
): Promise<void> => {
  const client = getRedisClient();
  const ttl = options.ttl || CACHE_TTL_DEFAULT;
  
  try {
    const serializedValue = JSON.stringify(value);
    await client.setex(key, ttl, serializedValue);
    
    // Record cache set operation for analytics
    await incrementCacheCounter('sets');
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
    throw error;
  }
};

/**
 * Get a value from the cache
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  const client = getRedisClient();
  
  try {
    const cachedValue = await client.get(key);
    
    if (!cachedValue) {
      await incrementCacheCounter('misses');
      return null;
    }
    
    await incrementCacheCounter('hits');
    return JSON.parse(cachedValue) as T;
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    await incrementCacheCounter('errors');
    return null;
  }
};

/**
 * Delete a specific key from the cache
 */
export const deleteCache = async (key: string): Promise<void> => {
  const client = getRedisClient();
  
  try {
    await client.del(key);
    await incrementCacheCounter('deletes');
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
    throw error;
  }
};

/**
 * Delete all keys matching a pattern
 */
export const deleteCacheByPattern = async (pattern: string): Promise<number> => {
  const client = getRedisClient();
  
  try {
    const keys = await client.keys(pattern);
    
    if (keys.length > 0) {
      const result = await client.del(...keys);
      await incrementCacheCounter('pattern_deletes');
      return result;
    }
    
    return 0;
  } catch (error) {
    console.error(`Error deleting cache by pattern ${pattern}:`, error);
    throw error;
  }
};

/**
 * Invalidate cache for a specific namespace
 */
export const invalidateNamespace = async (namespace: CacheNamespace): Promise<number> => {
  const pattern = `trading-farm:${namespace}:*`;
  return deleteCacheByPattern(pattern);
};

/**
 * Increment a counter for cache analytics
 */
export const incrementCacheCounter = async (
  counterType: 'hits' | 'misses' | 'sets' | 'deletes' | 'pattern_deletes' | 'errors'
): Promise<void> => {
  const client = getRedisClient();
  const key = `trading-farm:cache:stats:${counterType}`;
  const dailyKey = `trading-farm:cache:stats:${counterType}:${new Date().toISOString().split('T')[0]}`;
  
  try {
    await client.incr(key);
    await client.incr(dailyKey);
    
    // Set expiration for daily counters (30 days)
    await client.expire(dailyKey, 60 * 60 * 24 * 30);
  } catch (error) {
    console.error(`Error incrementing cache counter ${counterType}:`, error);
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<Record<string, number>> => {
  const client = getRedisClient();
  const counterTypes = ['hits', 'misses', 'sets', 'deletes', 'pattern_deletes', 'errors'];
  const stats: Record<string, number> = {};
  
  try {
    // Get overall stats
    for (const counterType of counterTypes) {
      const key = `trading-farm:cache:stats:${counterType}`;
      const value = await client.get(key);
      stats[counterType] = value ? parseInt(value, 10) : 0;
    }
    
    // Calculate hit rate
    const totalRequests = stats.hits + stats.misses;
    stats.hit_rate = totalRequests > 0 ? Math.round((stats.hits / totalRequests) * 100) : 0;
    
    // Get Redis server info
    try {
      const info = await client.info();
      const parsedInfo = createInfo(info);
      
      stats.memory_used = parseInt(parsedInfo.memory.used_memory, 10);
      stats.total_connections = parseInt(parsedInfo.clients.connected_clients, 10);
      stats.uptime = parseInt(parsedInfo.server.uptime_in_seconds, 10);
    } catch (error) {
      console.error('Error parsing Redis info:', error);
      stats.memory_used = 0;
      stats.total_connections = 0;
      stats.uptime = 0;
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      pattern_deletes: 0,
      errors: 0,
      hit_rate: 0,
      memory_used: 0,
      total_connections: 0,
      uptime: 0
    };
  }
};

/**
 * Get detailed daily cache statistics
 */
export const getDailyCacheStats = async (days = 7): Promise<Record<string, any>> => {
  const client = getRedisClient();
  const counterTypes = ['hits', 'misses', 'sets', 'deletes', 'pattern_deletes', 'errors'];
  const results: Record<string, any> = {};
  
  try {
    // Get daily stats for the specified number of days
    const dates = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    for (const date of dates) {
      results[date] = {};
      
      for (const counterType of counterTypes) {
        const key = `trading-farm:cache:stats:${counterType}:${date}`;
        const value = await client.get(key);
        results[date][counterType] = value ? parseInt(value, 10) : 0;
      }
      
      // Calculate hit rate for the day
      const totalRequests = results[date].hits + results[date].misses;
      results[date].hit_rate = totalRequests > 0 
        ? Math.round((results[date].hits / totalRequests) * 100) 
        : 0;
    }
    
    return results;
  } catch (error) {
    console.error('Error getting daily cache stats:', error);
    return {};
  }
};
