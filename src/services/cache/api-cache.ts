/**
 * API Cache Service
 * 
 * Provides caching for API responses with persistence support
 * to enable offline functionality and reduce API calls.
 */

import { MonitoringService } from '../monitoring-service';
import { persistentCache } from './persistent-cache';

export interface ApiCacheOptions {
  // Default TTL for cache entries in milliseconds
  defaultTTL?: number | null;
  
  // Tag to categorize API cache entries
  cacheTag?: string;
  
  // Whether to enable persistent caching
  enablePersistence?: boolean;
  
  // Custom serializer for cache entries
  serializer?: <T>(data: T) => any;
  
  // Custom deserializer for cache entries
  deserializer?: <T>(data: any) => T;
}

export interface ApiCacheResult<T> {
  data: T | null;
  success: boolean;
  fromCache: boolean;
  timestamp: number | null;
  status?: number;
}

const DEFAULT_OPTIONS: ApiCacheOptions = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cacheTag: 'api-cache',
  enablePersistence: true
};

/**
 * API cache service for caching API responses
 */
export class ApiCache {
  private static instance: ApiCache;
  private options: ApiCacheOptions;
  private memoryCache: Map<string, { data: any; timestamp: number; expiry: number | null }> = new Map();
  private initialized = false;
  
  private constructor(options: ApiCacheOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get the singleton instance of the API cache
   */
  public static getInstance(options?: ApiCacheOptions): ApiCache {
    if (!ApiCache.instance) {
      ApiCache.instance = new ApiCache(options);
    } else if (options) {
      // Update options if provided
      ApiCache.instance.options = { 
        ...ApiCache.instance.options, 
        ...options 
      };
    }
    return ApiCache.instance;
  }

  /**
   * Initialize the cache
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Initialize persistent cache if enabled
    if (this.options.enablePersistence) {
      await persistentCache.init();
    }
    
    this.initialized = true;
  }

  /**
   * Generate a cache key from a URL and params
   * 
   * @param url API URL
   * @param params Optional request parameters
   * @returns Cache key
   */
  public generateCacheKey(url: string, params?: any): string {
    // Remove protocol and domain from URL to avoid caching differences
    // between http/https or different environments
    const normalizedUrl = url.replace(/^https?:\/\/[^/]+/, '');
    
    if (!params) {
      return normalizedUrl;
    }
    
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc: Record<string, any>, key) => {
        acc[key] = params[key];
        return acc;
      }, {});
    
    return `${normalizedUrl}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Set a value in the cache
   * 
   * @param key Cache key
   * @param data Data to cache
   * @param options Cache options
   * @returns Promise resolving when the cache is updated
   */
  public async set<T>(
    key: string, 
    data: T, 
    options: { ttl?: number | null; status?: number } = {}
  ): Promise<void> {
    if (!key) {
      throw new Error('Cache key is required');
    }
    
    // Initialize if needed
    if (!this.initialized) {
      await this.init();
    }
    
    const timestamp = Date.now();
    const ttl = options.ttl !== undefined ? options.ttl : this.options.defaultTTL || null;
    const expiry = ttl === null ? null : timestamp + ttl;
    
    // Always store in memory cache
    this.memoryCache.set(key, {
      data,
      timestamp,
      expiry
    });
    
    // Store in persistent cache if enabled
    if (this.options.enablePersistence) {
      try {
        // Process data with custom serializer if provided
        const processedData = this.options.serializer ? this.options.serializer(data) : data;
        
        // Store with metadata
        await persistentCache.set(key, {
          data: processedData,
          status: options.status
        }, {
          ttl,
          tags: [this.options.cacheTag!]
        });
      } catch (error) {
        MonitoringService.logEvent({
          type: 'error',
          message: 'Failed to set API cache in persistent storage',
          data: { key, error }
        });
      }
    }
  }

  /**
   * Get a value from the cache
   * 
   * @param key Cache key
   * @returns Promise resolving to the cached result
   */
  public async get<T>(key: string): Promise<ApiCacheResult<T>> {
    if (!key) {
      throw new Error('Cache key is required');
    }
    
    // Initialize if needed
    if (!this.initialized) {
      await this.init();
    }
    
    // First try memory cache
    const memoryEntry = this.memoryCache.get(key);
    
    if (memoryEntry) {
      // Check if expired
      if (memoryEntry.expiry !== null && memoryEntry.expiry < Date.now()) {
        // Expired - remove and continue to persistent cache
        this.memoryCache.delete(key);
      } else {
        // Valid memory cache entry
        return {
          data: memoryEntry.data,
          success: true,
          fromCache: true,
          timestamp: memoryEntry.timestamp
        };
      }
    }
    
    // Try persistent cache if enabled
    if (this.options.enablePersistence) {
      try {
        const persistentEntry = await persistentCache.get<{ data: any; status?: number }>(key);
        
        if (persistentEntry) {
          // Process data with custom deserializer if provided
          const processedData = this.options.deserializer ? 
            this.options.deserializer<T>(persistentEntry.data) : 
            persistentEntry.data as T;
          
          // Store in memory cache for faster access next time
          // Get the entry's timestamp and expiry from metadata
          const timestamp = Date.now(); // Default if we can't get the actual timestamp
          let expiry: number | null = null;
          
          // Try to get estimated timestamp/expiry from persistent cache metadata
          try {
            // We don't have direct access to the metadata, so estimate based on TTL
            if (this.options.defaultTTL) {
              expiry = timestamp + this.options.defaultTTL;
            }
          } catch (error) {
            // Ignore any errors here and use the defaults
          }
          
          // Store in memory cache with our best guess of metadata
          this.memoryCache.set(key, {
            data: processedData,
            timestamp,
            expiry
          });
          
          return {
            data: processedData,
            success: true,
            fromCache: true,
            timestamp,
            status: persistentEntry.status
          };
        }
      } catch (error) {
        MonitoringService.logEvent({
          type: 'error',
          message: 'Failed to get API cache from persistent storage',
          data: { key, error }
        });
      }
    }
    
    // Not found in any cache
    return {
      data: null,
      success: false,
      fromCache: false,
      timestamp: null
    };
  }

  /**
   * Remove a value from the cache
   * 
   * @param key Cache key
   * @returns Promise resolving when the cache entry is removed
   */
  public async remove(key: string): Promise<void> {
    if (!key) {
      throw new Error('Cache key is required');
    }
    
    // Initialize if needed
    if (!this.initialized) {
      await this.init();
    }
    
    // Remove from memory cache
    this.memoryCache.delete(key);
    
    // Remove from persistent cache if enabled
    if (this.options.enablePersistence) {
      try {
        await persistentCache.remove(key);
      } catch (error) {
        MonitoringService.logEvent({
          type: 'error',
          message: 'Failed to remove API cache from persistent storage',
          data: { key, error }
        });
      }
    }
  }

  /**
   * Clear all API cache entries
   * 
   * @param options.olderThan Only clear entries older than this timestamp
   * @returns Promise resolving when the cache is cleared
   */
  public async clear(options: { olderThan?: number } = {}): Promise<void> {
    // Initialize if needed
    if (!this.initialized) {
      await this.init();
    }
    
    // Clear memory cache
    if (options.olderThan) {
      // Clear only older entries
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.timestamp < options.olderThan) {
          this.memoryCache.delete(key);
        }
      }
    } else {
      // Clear all entries
      this.memoryCache.clear();
    }
    
    // Clear persistent cache if enabled
    if (this.options.enablePersistence) {
      try {
        await persistentCache.clear({
          olderThan: options.olderThan,
          tags: [this.options.cacheTag!]
        });
      } catch (error) {
        MonitoringService.logEvent({
          type: 'error',
          message: 'Failed to clear API cache from persistent storage',
          data: { options, error }
        });
      }
    }
  }

  /**
   * Fetch data from API with caching support
   * 
   * @param url API URL
   * @param options Fetch and cache options
   * @returns Promise resolving to the API response
   */
  public async fetch<T>(
    url: string, 
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
      params?: Record<string, any>;
      cacheTTL?: number | null;
      forceRefresh?: boolean;
      offlineSupport?: boolean;
    } = {}
  ): Promise<ApiCacheResult<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      cacheTTL,
      forceRefresh = false,
      offlineSupport = true
    } = options;
    
    // Only cache GET requests
    const canCache = method.toUpperCase() === 'GET';
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(url, params);
    
    // Try to get from cache if not forcing refresh
    if (canCache && !forceRefresh) {
      const cachedResult = await this.get<T>(cacheKey);
      
      if (cachedResult.success) {
        return cachedResult;
      }
    }
    
    // Build request URL with query parameters
    let fullUrl = url;
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      
      const queryString = queryParams.toString();
      if (queryString) {
        fullUrl += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    
    try {
      // Make API request
      const fetchOptions: RequestInit = {
        method,
        headers,
        credentials: 'same-origin'
      };
      
      if (body) {
        if (typeof body === 'object') {
          fetchOptions.body = JSON.stringify(body);
          // Set content type if not already set
          if (!headers['Content-Type']) {
            fetchOptions.headers = { 
              ...fetchOptions.headers,
              'Content-Type': 'application/json'
            };
          }
        } else {
          fetchOptions.body = body;
        }
      }
      
      const response = await fetch(fullUrl, fetchOptions);
      const contentType = response.headers.get('Content-Type') || '';
      
      // Parse response
      let data: T;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType.includes('text/')) {
        data = await response.text() as any;
      } else {
        data = await response.blob() as any;
      }
      
      // Cache successful responses
      if (canCache && response.ok) {
        await this.set<T>(cacheKey, data, { 
          ttl: cacheTTL,
          status: response.status
        });
      }
      
      return {
        data,
        success: response.ok,
        fromCache: false,
        timestamp: Date.now(),
        status: response.status
      };
    } catch (error) {
      // Network error - try to get from cache if offline support is enabled
      if (offlineSupport) {
        const cachedResult = await this.get<T>(cacheKey);
        
        if (cachedResult.success) {
          // Return cached data with warning
          MonitoringService.logEvent({
            type: 'warning',
            message: 'Using cached data due to network error',
            data: { url, error }
          });
          
          return cachedResult;
        }
      }
      
      // No cached data available or offline support disabled
      MonitoringService.logEvent({
        type: 'error',
        message: 'API request failed with no cached fallback',
        data: { url, error }
      });
      
      return {
        data: null,
        success: false,
        fromCache: false,
        timestamp: null
      };
    }
  }
}

// Export singleton instance
export const apiCache = ApiCache.getInstance(); 