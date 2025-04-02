import NodeCache from 'node-cache';
import logger from './logger';

// Create cache instances with different TTLs for different use cases

// Short-lived cache (30 seconds) for frequently changing data
export const shortCache = new NodeCache({
  stdTTL: 30, // Standard TTL in seconds
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Don't clone data to save memory
});

// Medium-lived cache (5 minutes) for moderately changing data
export const mediumCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false,
});

// Long-lived cache (1 hour) for rarely changing data
export const longCache = new NodeCache({
  stdTTL: 3600, // 1 hour
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false,
});

// Function to memoize expensive operations
export function memoize<T>(
  fn: (...args: any[]) => Promise<T>,
  cache: NodeCache = mediumCache,
  keyPrefix: string = ''
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    // Create a cache key from the function arguments
    const key = `${keyPrefix}:${JSON.stringify(args)}`;
    
    // Check if the result is already in the cache
    const cachedResult = cache.get<T>(key);
    if (cachedResult !== undefined) {
      logger.debug(`Cache hit for key: ${key}`);
      return cachedResult;
    }
    
    // Execute the function and cache the result
    logger.debug(`Cache miss for key: ${key}`);
    const result = await fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Create a typed cache getter with default value support
export function getFromCache<T>(
  cache: NodeCache,
  key: string,
  defaultValue?: T
): T | undefined {
  const value = cache.get<T>(key);
  if (value === undefined && defaultValue !== undefined) {
    return defaultValue;
  }
  return value;
}

// Remove multiple keys from cache based on a pattern
export function deleteByPattern(
  cache: NodeCache,
  pattern: string | RegExp
): void {
  const keys = cache.keys();
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  
  const keysToDelete = keys.filter(key => regex.test(key));
  keysToDelete.forEach(key => cache.del(key));
  
  logger.debug(`Deleted ${keysToDelete.length} keys from cache by pattern: ${pattern}`);
}

// Get cache statistics
export function getCacheStats(cache: NodeCache): Record<string, any> {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    ksize: cache.getStats().ksize,
    vsize: cache.getStats().vsize,
  };
}

// Flush all caches
export function flushAllCaches(): void {
  shortCache.flushAll();
  mediumCache.flushAll();
  longCache.flushAll();
  logger.info('All caches flushed');
} 