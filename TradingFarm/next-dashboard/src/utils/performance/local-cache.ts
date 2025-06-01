/**
 * LocalCache - A utility for efficient client-side data caching
 * Handles expiration, versioning, and memory optimization for client-side data
 */

type CacheItem<T> = {
  data: T;
  timestamp: number;
  version: string;
};

interface LocalCacheOptions {
  /** 
   * Default time-to-live in milliseconds
   * @default 5 minutes (300000ms)
   */
  defaultTTL?: number;
  
  /** 
   * Cache namespace to avoid collisions with other applications
   * @default 'trading-farm-cache'
   */
  namespace?: string;
  
  /**
   * Current application version for cache invalidation
   * When the version changes, all caches will be invalidated
   * @default '1.0'
   */
  version?: string;
  
  /**
   * Maximum size of cache in bytes (approximate)
   * @default 10MB (10485760 bytes)
   */
  maxSize?: number;
}

export class LocalCache {
  private namespace: string;
  private defaultTTL: number;
  private version: string;
  private maxSize: number;
  private initialized: boolean = false;
  
  constructor({
    defaultTTL = 5 * 60 * 1000, // 5 minutes
    namespace = 'trading-farm-cache',
    version = '1.0',
    maxSize = 10 * 1024 * 1024, // 10MB
  }: LocalCacheOptions = {}) {
    this.namespace = namespace;
    this.defaultTTL = defaultTTL;
    this.version = version;
    this.maxSize = maxSize;
  }
  
  /**
   * Initialize the cache system
   * Removes expired items and validates version
   */
  initialize(): void {
    if (typeof window === 'undefined') return;
    
    try {
      this.cleanExpiredItems();
      this.validateVersion();
      this.enforceSizeLimit();
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing LocalCache:', error);
      this.clearAll(); // If there's an error, clear everything to avoid issues
    }
  }
  
  /**
   * Store an item in the cache with optional time-to-live
   */
  set<T>(key: string, data: T, ttl?: number): void {
    if (typeof window === 'undefined') return;
    if (!this.initialized) this.initialize();
    
    try {
      const cacheKey = this.getCacheKey(key);
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        version: this.version,
      };
      
      // Add metadata for cache management
      localStorage.setItem(cacheKey, JSON.stringify(item));
      
      if (ttl) {
        // Schedule cleanup for this item
        setTimeout(() => this.remove(key), ttl);
      }
      
      // Check if we need to enforce size limits
      this.enforceSizeLimit();
    } catch (error) {
      console.error(`Error setting cache item ${key}:`, error);
    }
  }
  
  /**
   * Retrieve an item from the cache
   * Returns null if item is expired or doesn't exist
   */
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    if (!this.initialized) this.initialize();
    
    try {
      const cacheKey = this.getCacheKey(key);
      const item = localStorage.getItem(cacheKey);
      
      if (!item) return null;
      
      const parsedItem = JSON.parse(item) as CacheItem<T>;
      
      // Check if the item is expired
      if (this.isExpired(parsedItem)) {
        this.remove(key);
        return null;
      }
      
      // Check if the version matches
      if (parsedItem.version !== this.version) {
        this.remove(key);
        return null;
      }
      
      return parsedItem.data;
    } catch (error) {
      console.error(`Error getting cache item ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Remove an item from the cache
   */
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheKey = this.getCacheKey(key);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.error(`Error removing cache item ${key}:`, error);
    }
  }
  
  /**
   * Clear all items in the cache for this namespace
   */
  clearAll(): void {
    if (typeof window === 'undefined') return;
    
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.namespace)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
  
  /**
   * Check if an item exists in the cache and is still valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  /**
   * Get the full cache key with namespace
   */
  private getCacheKey(key: string): string {
    return `${this.namespace}:${key}`;
  }
  
  /**
   * Check if a cached item is expired based on the default TTL
   */
  private isExpired<T>(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp > this.defaultTTL;
  }
  
  /**
   * Remove all expired items from the cache
   */
  private cleanExpiredItems(): void {
    try {
      Object.keys(localStorage).forEach(key => {
        if (!key.startsWith(this.namespace)) return;
        
        const item = localStorage.getItem(key);
        if (!item) return;
        
        try {
          const parsedItem = JSON.parse(item) as CacheItem<any>;
          if (this.isExpired(parsedItem)) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // If we can't parse the item, it's corrupt. Remove it.
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error cleaning expired cache items:', error);
    }
  }
  
  /**
   * Ensure all cached items have the current version or remove them
   */
  private validateVersion(): void {
    try {
      Object.keys(localStorage).forEach(key => {
        if (!key.startsWith(this.namespace)) return;
        
        const item = localStorage.getItem(key);
        if (!item) return;
        
        try {
          const parsedItem = JSON.parse(item) as CacheItem<any>;
          if (parsedItem.version !== this.version) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // If we can't parse the item, it's corrupt. Remove it.
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error validating cache versions:', error);
    }
  }
  
  /**
   * Enforce the cache size limit by removing oldest items first
   */
  private enforceSizeLimit(): void {
    try {
      let totalSize = 0;
      const items: { key: string; size: number; timestamp: number }[] = [];
      
      // Calculate current cache size and collect items
      Object.keys(localStorage).forEach(key => {
        if (!key.startsWith(this.namespace)) return;
        
        const item = localStorage.getItem(key);
        if (!item) return;
        
        const size = new Blob([item]).size;
        totalSize += size;
        
        try {
          const parsedItem = JSON.parse(item) as CacheItem<any>;
          items.push({
            key,
            size,
            timestamp: parsedItem.timestamp,
          });
        } catch (e) {
          // If we can't parse the item, it's corrupt. Remove it.
          localStorage.removeItem(key);
        }
      });
      
      // If we're over the limit, remove oldest items first
      if (totalSize > this.maxSize) {
        // Sort by timestamp (oldest first)
        items.sort((a, b) => a.timestamp - b.timestamp);
        
        let removedSize = 0;
        for (const item of items) {
          localStorage.removeItem(item.key);
          removedSize += item.size;
          
          if (totalSize - removedSize <= this.maxSize * 0.8) {
            // Stop when we've removed enough to get to 80% of max size
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error enforcing cache size limit:', error);
    }
  }
}

// Create and export a singleton instance with default options
export const localCache = new LocalCache();
