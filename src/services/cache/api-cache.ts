/**
 * ApiCache - A cache service for API responses
 * Features:
 * - Configurable TTL (Time To Live)
 * - LRU (Least Recently Used) eviction policy
 * - Size-based limits
 * - Automatic cache invalidation
 * - Group-based invalidation
 */

import { MonitoringService } from '../monitoring-service';

// Cache entry structure
interface CacheEntry<T> {
  value: T;
  expires: number;
  created: number;
  lastAccessed: number;
  hits: number;
  group?: string[];
}

// Cache options for individual cache operations
export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  group?: string | string[]; // Group identifier(s) for batch invalidation
}

// Cache statistics
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  oldestEntry: number;
  newestEntry: number;
}

// Default cache configuration
const DEFAULT_CACHE_SIZE = 1000; // Maximum number of items
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const DEFAULT_CHECK_PERIOD = 60 * 1000; // 1 minute in milliseconds

/**
 * ApiCache implementation with LRU eviction policy
 */
export class ApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;
  private defaultTtl: number;
  private checkPeriod: number;
  private hits: number = 0;
  private misses: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  /**
   * Creates a new ApiCache instance
   * 
   * @param options Configuration options
   */
  constructor({
    maxSize = DEFAULT_CACHE_SIZE,
    defaultTtl = DEFAULT_TTL,
    checkPeriod = DEFAULT_CHECK_PERIOD,
    autoCleanup = true
  }: {
    maxSize?: number;
    defaultTtl?: number;
    checkPeriod?: number;
    autoCleanup?: boolean;
  } = {}) {
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
    this.checkPeriod = checkPeriod;
    
    if (autoCleanup) {
      this.startCleanupTask();
    }
  }
  
  /**
   * Gets a value from the cache
   * 
   * @param key Cache key
   * @returns The cached value or null if not found or expired
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    // Check if expired
    if (entry.expires && Date.now() > entry.expires) {
      this.delete(key);
      this.misses++;
      return null;
    }
    
    // Update stats
    this.hits++;
    entry.lastAccessed = Date.now();
    entry.hits++;
    
    return entry.value;
  }
  
  /**
   * Sets a value in the cache
   * 
   * @param key Cache key
   * @param value Value to cache
   * @param options Caching options
   */
  public set<T>(key: string, value: T, options: CacheOptions = {}): void {
    // Make room if we're at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    const now = Date.now();
    const ttl = options.ttl ?? this.defaultTtl;
    const expires = ttl ? now + ttl : 0;
    
    // Normalize group to array
    const group = options.group 
      ? Array.isArray(options.group) ? options.group : [options.group]
      : undefined;
    
    this.cache.set(key, {
      value,
      expires,
      created: now,
      lastAccessed: now,
      hits: 0,
      group
    });
    
    // Log cache operation
    MonitoringService.logEvent({
      type: 'debug',
      message: `Cache set: ${key}`,
      data: { ttl, expires: new Date(expires).toISOString(), group }
    });
  }
  
  /**
   * Deletes a value from the cache
   * 
   * @param key Cache key
   * @returns True if item was found and deleted
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Clears the entire cache
   */
  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    
    MonitoringService.logEvent({
      type: 'info',
      message: 'Cache cleared'
    });
  }
  
  /**
   * Invalidates all entries in a specific group
   * 
   * @param group Group identifier to invalidate
   * @returns Number of entries invalidated
   */
  public invalidateGroup(group: string): number {
    let count = 0;
    
    // Find all keys in the group
    for (const [key, entry] of this.cache.entries()) {
      if (entry.group && entry.group.includes(group)) {
        this.delete(key);
        count++;
      }
    }
    
    if (count > 0) {
      MonitoringService.logEvent({
        type: 'info',
        message: `Invalidated ${count} entries in group ${group}`
      });
    }
    
    return count;
  }
  
  /**
   * Gets cache statistics
   * 
   * @returns Cache stats
   */
  public getStats(): CacheStats {
    let oldestEntry = Date.now();
    let newestEntry = 0;
    
    for (const entry of this.cache.values()) {
      if (entry.created < oldestEntry) {
        oldestEntry = entry.created;
      }
      if (entry.created > newestEntry) {
        newestEntry = entry.created;
      }
    }
    
    const totalRequests = this.hits + this.misses;
    
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      totalEntries: this.cache.size,
      oldestEntry,
      newestEntry
    };
  }
  
  /**
   * Cleans up expired entries
   * 
   * @returns Number of entries cleaned up
   */
  public cleanup(): number {
    const now = Date.now();
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires && entry.expires < now) {
        this.delete(key);
        count++;
      }
    }
    
    if (count > 0) {
      MonitoringService.logEvent({
        type: 'debug',
        message: `Cleaned up ${count} expired cache entries`,
        data: { 
          cacheSize: this.cache.size, 
          maxSize: this.maxSize,
          hitRate: this.getStats().hitRate
        }
      });
    }
    
    return count;
  }
  
  /**
   * Starts the automatic cleanup task
   */
  private startCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.checkPeriod);
  }
  
  /**
   * Stops the automatic cleanup task
   */
  public stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  /**
   * Evicts the least recently used item
   */
  private evictLRU(): void {
    // Find the least recently used item
    let oldestAccess = Date.now();
    let oldestKey: string | null = null;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    // Delete the oldest item
    if (oldestKey) {
      this.delete(oldestKey);
      
      MonitoringService.logEvent({
        type: 'debug',
        message: `Cache eviction (LRU): ${oldestKey}`,
        data: {
          lastAccessed: new Date(oldestAccess).toISOString(),
          cacheSize: this.cache.size
        }
      });
    }
  }
} 