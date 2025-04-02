import NodeCache from 'node-cache';
import { logger } from '../logging/winston-service';

/**
 * Cache Service using node-cache
 * Provides in-memory caching for performance optimization
 */
export class CacheService {
  private static instance: CacheService;
  private cache: NodeCache;
  
  // Different TTLs for different types of data
  private readonly TTL = {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
  };

  private constructor() {
    this.cache = new NodeCache({
      stdTTL: this.TTL.MEDIUM, // Default TTL
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false, // Don't clone objects (better performance)
      deleteOnExpire: true, // Auto-delete expired items
    });

    // Set up event handlers
    this.cache.on('expired', (key, value) => {
      logger.debug(`Cache key expired: ${key}`);
    });

    this.cache.on('flush', () => {
      logger.debug('Cache flushed');
    });

    logger.info('Cache service initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Set a value in cache
   */
  public set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      const result = this.cache.set(key, value, ttl);
      logger.debug(`Cache set: ${key}, TTL: ${ttl || this.TTL.MEDIUM}s`);
      return result;
    } catch (error) {
      logger.error(`Error setting cache key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get a value from cache
   */
  public get<T>(key: string): T | undefined {
    try {
      const value = this.cache.get<T>(key);
      logger.debug(`Cache ${value !== undefined ? 'hit' : 'miss'}: ${key}`);
      return value;
    } catch (error) {
      logger.error(`Error getting cache key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  /**
   * Check if a key exists in cache
   */
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a key from cache
   */
  public delete(key: string | string[]): number {
    try {
      const deleted = this.cache.del(key);
      if (typeof key === 'string') {
        logger.debug(`Cache delete: ${key}`);
      } else {
        logger.debug(`Cache delete multiple keys: ${key.join(', ')}`);
      }
      return deleted;
    } catch (error) {
      logger.error(`Error deleting cache key(s): ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  /**
   * Flush all cache
   */
  public flush(): void {
    try {
      this.cache.flushAll();
      logger.info('Cache flushed completely');
    } catch (error) {
      logger.error(`Error flushing cache: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): NodeCache.Stats {
    return this.cache.getStats();
  }

  /**
   * Set multiple values in cache
   */
  public setMultiple<T>(keyValuePairs: Record<string, T>, ttl?: number): boolean {
    try {
      const result = this.cache.mset(
        Object.entries(keyValuePairs).map(([key, value]) => ({ key, val: value, ttl }))
      );
      logger.debug(`Cache set multiple keys: ${Object.keys(keyValuePairs).join(', ')}`);
      return result;
    } catch (error) {
      logger.error(`Error setting multiple cache keys: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  public getMultiple<T>(keys: string[]): Record<string, T> {
    try {
      const values = this.cache.mget<T>(keys);
      const hitCount = Object.keys(values).length;
      logger.debug(`Cache multi-get: ${hitCount}/${keys.length} hits`);
      return values;
    } catch (error) {
      logger.error(`Error getting multiple cache keys: ${error instanceof Error ? error.message : String(error)}`);
      return {};
    }
  }

  /**
   * Set a value with short TTL (1 minute)
   */
  public setShort<T>(key: string, value: T): boolean {
    return this.set(key, value, this.TTL.SHORT);
  }

  /**
   * Set a value with medium TTL (5 minutes)
   */
  public setMedium<T>(key: string, value: T): boolean {
    return this.set(key, value, this.TTL.MEDIUM);
  }

  /**
   * Set a value with long TTL (1 hour)
   */
  public setLong<T>(key: string, value: T): boolean {
    return this.set(key, value, this.TTL.LONG);
  }

  /**
   * Set a value with very long TTL (24 hours)
   */
  public setVeryLong<T>(key: string, value: T): boolean {
    return this.set(key, value, this.TTL.VERY_LONG);
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();
