/**
 * Market Data Service for Trading Farm
 * 
 * Handles real-time market data ingestion, normalization, and caching
 * Part of the Phase 1 implementation for live trading functionality
 */

import { MarketData } from '@/types/exchange';
import { IExchangeConnector } from '../exchange/exchange-connector';
import { createServerClient } from '@/utils/supabase/server';

/**
 * Market data subscription information
 */
interface MarketDataSubscription {
  /**
   * Unique subscription ID
   */
  id: string;
  
  /**
   * Exchange subscription ID (returned from exchange connector)
   */
  exchangeSubscriptionId: string;
  
  /**
   * Trading pair symbol
   */
  symbol: string;
  
  /**
   * Exchange ID
   */
  exchangeId: string;
  
  /**
   * Callback function to receive updates
   */
  callback: (data: MarketData) => void;
}

/**
 * Market data subscription request parameters
 */
interface SubscribeParams {
  /**
   * Symbol to subscribe to (e.g., 'BTC/USDT')
   */
  symbol: string;
  
  /**
   * Exchange ID
   */
  exchangeId: string;
  
  /**
   * Callback function to receive updates
   */
  callback: (data: MarketData) => void;
  
  /**
   * Exchange connector instance
   * If not provided, the service will attempt to get it
   */
  connector?: IExchangeConnector;
}

/**
 * Cache entry for market data
 */
interface MarketDataCacheEntry {
  /**
   * The market data
   */
  data: MarketData;
  
  /**
   * When the data was last updated
   */
  timestamp: number;
  
  /**
   * Time-to-live in milliseconds
   */
  ttl: number;
}

/**
 * Market Data Service class
 * 
 * Manages real-time market data subscriptions and caching
 */
export class MarketDataService {
  /**
   * Singleton instance
   */
  private static instance: MarketDataService;
  
  /**
   * Active exchange connectors
   */
  private connectors: Map<string, IExchangeConnector> = new Map();
  
  /**
   * Active market data subscriptions
   */
  private subscriptions: Map<string, MarketDataSubscription> = new Map();
  
  /**
   * Market data cache
   */
  private cache: Map<string, MarketDataCacheEntry> = new Map();
  
  /**
   * Default cache TTL in milliseconds (5 minutes)
   */
  private defaultCacheTtl = 5 * 60 * 1000;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    // Set up cache cleanup interval (every 10 minutes)
    setInterval(() => this.cleanupCache(), 10 * 60 * 1000);
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }
  
  /**
   * Register an exchange connector
   * @param connector Exchange connector instance
   */
  public registerConnector(connector: IExchangeConnector): void {
    this.connectors.set(connector.exchangeId, connector);
  }
  
  /**
   * Get an exchange connector by ID
   * @param exchangeId Exchange ID
   * @returns Exchange connector instance or undefined
   */
  public getConnector(exchangeId: string): IExchangeConnector | undefined {
    return this.connectors.get(exchangeId);
  }
  
  /**
   * Subscribe to real-time market data
   * @param params Subscription parameters
   * @returns Subscription ID
   */
  public async subscribe(params: SubscribeParams): Promise<string> {
    let connector = params.connector;
    
    // If no connector provided, try to get it from registered connectors
    if (!connector) {
      connector = this.connectors.get(params.exchangeId);
      
      // If still no connector, error
      if (!connector) {
        throw new Error(`No exchange connector registered for ${params.exchangeId}`);
      }
    }
    
    // If connector not connected, error
    if (!connector.isConnected()) {
      throw new Error(`Exchange connector for ${params.exchangeId} is not connected`);
    }
    
    // Create a subscription ID
    const subscriptionId = `${params.exchangeId}_${params.symbol}_${Date.now()}`;
    
    // Create a callback wrapper to handle data normalization and caching
    const callbackWrapper = (data: MarketData) => {
      // Cache the data
      this.updateCache(params.exchangeId, params.symbol, data);
      
      // Forward to the original callback
      params.callback(data);
    };
    
    // Subscribe to the exchange
    const exchangeSubscriptionId = connector.subscribeMarketData(
      params.symbol,
      callbackWrapper
    );
    
    // Store the subscription
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      exchangeSubscriptionId,
      symbol: params.symbol,
      exchangeId: params.exchangeId,
      callback: params.callback
    });
    
    // Return the subscription ID
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from market data
   * @param subscriptionId Subscription ID
   * @returns Whether unsubscribe was successful
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      return false;
    }
    
    const connector = this.connectors.get(subscription.exchangeId);
    
    if (!connector) {
      // Remove subscription from our tracking even if connector is gone
      this.subscriptions.delete(subscriptionId);
      return false;
    }
    
    // Unsubscribe from the exchange
    const success = connector.unsubscribeMarketData(subscription.exchangeSubscriptionId);
    
    // Remove from our tracking
    if (success) {
      this.subscriptions.delete(subscriptionId);
    }
    
    return success;
  }
  
  /**
   * Unsubscribe all subscriptions
   */
  public unsubscribeAll(): void {
    // Create a copy of keys to avoid modification during iteration
    const subscriptionIds = [...this.subscriptions.keys()];
    
    for (const id of subscriptionIds) {
      this.unsubscribe(id);
    }
  }
  
  /**
   * Get market data (from cache or fetch fresh)
   * @param exchangeId Exchange ID
   * @param symbol Trading pair
   * @param forceRefresh Whether to force refresh from exchange
   * @returns Promise resolving to market data
   */
  public async getMarketData(
    exchangeId: string,
    symbol: string,
    forceRefresh: boolean = false
  ): Promise<MarketData> {
    const cacheKey = `${exchangeId}_${symbol}`;
    
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      
      // If we have cached data and it's still fresh
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
    }
    
    // No cache hit or forcing refresh, fetch from exchange
    const connector = this.connectors.get(exchangeId);
    
    if (!connector) {
      throw new Error(`No exchange connector registered for ${exchangeId}`);
    }
    
    if (!connector.isConnected()) {
      throw new Error(`Exchange connector for ${exchangeId} is not connected`);
    }
    
    // Get market data from exchange
    const data = await connector.getMarketData(symbol);
    
    // Update cache
    this.updateCache(exchangeId, symbol, data);
    
    return data;
  }
  
  /**
   * Update the market data cache
   * @param exchangeId Exchange ID
   * @param symbol Trading pair
   * @param data Market data
   * @param ttl Optional custom TTL in milliseconds
   */
  private updateCache(
    exchangeId: string,
    symbol: string,
    data: MarketData,
    ttl: number = this.defaultCacheTtl
  ): void {
    const cacheKey = `${exchangeId}_${symbol}`;
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    // Also store in database if applicable
    this.storeMarketDataInDb(exchangeId, data).catch(err => {
      console.error('Failed to store market data in database:', err);
    });
  }
  
  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Store market data in the database for historical analysis
   * @param exchangeId Exchange ID
   * @param data Market data
   */
  private async storeMarketDataInDb(exchangeId: string, data: MarketData): Promise<void> {
    try {
      // Only store data periodically to avoid database overload
      // For high-frequency data, consider using a time-series database instead
      
      // Create a Supabase client
      const supabase = await createServerClient();
      
      // Insert into the market_data table
      const { error } = await supabase
        .from('market_data')
        .insert({
          exchange_id: exchangeId,
          symbol: data.symbol,
          timestamp: new Date(data.timestamp).toISOString(),
          bid: data.bid,
          ask: data.ask,
          last: data.last,
          high: data.high,
          low: data.low,
          base_volume: data.baseVolume,
          quote_volume: data.quoteVolume,
          percent_change_24h: data.percentChange24h,
          raw_data: JSON.stringify({
            orderBook: data.orderBook,
            recentTrades: data.recentTrades,
            exchangeSpecific: data.exchangeSpecific
          })
        });
      
      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Error storing market data in database:', err);
      // Don't rethrow, just log as this is a background operation
    }
  }
}
