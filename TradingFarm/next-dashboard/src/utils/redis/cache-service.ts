import { getRedisClient } from './client';
import Redis from 'ioredis';

/**
 * Expiration times in seconds
 */
export enum CacheExpiration {
  SHORT = 60, // 1 minute
  MEDIUM = 300, // 5 minutes
  LONG = 900, // 15 minutes
  EXTENDED = 3600, // 1 hour
  DAY = 86400, // 1 day
}

/**
 * Cache namespaces to organize keys and prevent collisions
 */
export enum CacheNamespace {
  MARKET_DATA = 'market_data',
  AGENT_STATE = 'agent_state',
  FARM_STATE = 'farm_state',
  EXCHANGE_DATA = 'exchange_data',
  USER_PREFERENCES = 'user_preferences',
  STRATEGY_DATA = 'strategy_data',
}

/**
 * Trading Farm Redis Cache Service
 * Provides caching capabilities for frequent data access patterns
 */
export class RedisCacheService {
  private client: Redis;
  
  constructor() {
    this.client = getRedisClient();
  }
  
  /**
   * Generate a cache key with namespace
   */
  private generateKey(namespace: CacheNamespace, key: string): string {
    return `${namespace}:${key}`;
  }
  
  /**
   * Set a value in cache with expiration
   */
  async set(namespace: CacheNamespace, key: string, value: any, expiration: CacheExpiration = CacheExpiration.MEDIUM): Promise<void> {
    const cacheKey = this.generateKey(namespace, key);
    
    // Serialize value if it's an object
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    await this.client.set(cacheKey, serializedValue, 'EX', expiration);
  }
  
  /**
   * Get a value from cache
   */
  async get<T = any>(namespace: CacheNamespace, key: string): Promise<T | null> {
    const cacheKey = this.generateKey(namespace, key);
    const value = await this.client.get(cacheKey);
    
    if (!value) return null;
    
    // Try to parse as JSON, but return as string if parsing fails
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      return value as unknown as T;
    }
  }
  
  /**
   * Delete a value from cache
   */
  async delete(namespace: CacheNamespace, key: string): Promise<boolean> {
    const cacheKey = this.generateKey(namespace, key);
    const result = await this.client.del(cacheKey);
    return result === 1;
  }
  
  /**
   * Check if a key exists in cache
   */
  async exists(namespace: CacheNamespace, key: string): Promise<boolean> {
    const cacheKey = this.generateKey(namespace, key);
    const result = await this.client.exists(cacheKey);
    return result === 1;
  }
  
  /**
   * Set a value only if the key doesn't already exist
   */
  async setNX(namespace: CacheNamespace, key: string, value: any, expiration: CacheExpiration = CacheExpiration.MEDIUM): Promise<boolean> {
    const cacheKey = this.generateKey(namespace, key);
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    const result = await this.client.set(cacheKey, serializedValue, 'EX', expiration, 'NX');
    return result === 'OK';
  }
  
  /**
   * Increment a numeric value in cache
   */
  async increment(namespace: CacheNamespace, key: string, by: number = 1): Promise<number> {
    const cacheKey = this.generateKey(namespace, key);
    return await this.client.incrby(cacheKey, by);
  }
  
  /**
   * Get all keys matching a pattern within a namespace
   */
  async getKeys(namespace: CacheNamespace, pattern: string = '*'): Promise<string[]> {
    const cachePattern = this.generateKey(namespace, pattern);
    const keys = await this.client.keys(cachePattern);
    
    // Remove namespace prefix from returned keys
    return keys.map(key => key.replace(`${namespace}:`, ''));
  }
  
  /**
   * Clear all keys in a namespace
   */
  async clearNamespace(namespace: CacheNamespace): Promise<number> {
    const keys = await this.client.keys(`${namespace}:*`);
    
    if (keys.length === 0) {
      return 0;
    }
    
    return await this.client.del(...keys);
  }
  
  /**
   * Cache common market data patterns
   */
  async cacheMarketData(symbol: string, timeframe: string, data: any): Promise<void> {
    const key = `${symbol}_${timeframe}`;
    await this.set(CacheNamespace.MARKET_DATA, key, data, CacheExpiration.SHORT);
  }
  
  /**
   * Get cached market data
   */
  async getMarketData<T = any>(symbol: string, timeframe: string): Promise<T | null> {
    const key = `${symbol}_${timeframe}`;
    return await this.get<T>(CacheNamespace.MARKET_DATA, key);
  }
  
  /**
   * Cache exchange-specific data
   */
  async cacheExchangeData(exchange: string, dataType: string, data: any, expiration: CacheExpiration = CacheExpiration.MEDIUM): Promise<void> {
    const key = `${exchange}_${dataType}`;
    await this.set(CacheNamespace.EXCHANGE_DATA, key, data, expiration);
  }
  
  /**
   * Get cached exchange data
   */
  async getExchangeData<T = any>(exchange: string, dataType: string): Promise<T | null> {
    const key = `${exchange}_${dataType}`;
    return await this.get<T>(CacheNamespace.EXCHANGE_DATA, key);
  }
}
