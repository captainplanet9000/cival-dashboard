/**
 * Market Data Service
 * 
 * Central service for managing market data across multiple exchanges.
 * Features:
 * - Real-time data ingestion via WebSockets
 * - Data normalization across exchanges
 * - High-performance caching layer
 * - Aggregation of multi-exchange data
 */

import { WebSocketManager } from '../websocket/websocket-manager';
import { ExchangeService } from '../exchanges/exchange-service';
import { 
  ExchangeId, 
  WebSocketEvent, 
  WebSocketConnection,
  ParsedMessage,
  MessageType
} from '../websocket/websocket-types';
import { 
  MarketData, 
  OrderBook, 
  MarketSymbol
} from '../exchanges/exchange-types';

// Types for market data subscriptions
type DataSubscriptionType = 'ticker' | 'orderbook' | 'trades' | 'candles';

interface DataSubscription {
  id: string;
  exchange: ExchangeId;
  symbol: string;
  type: DataSubscriptionType;
  interval?: string; // For candles
  depth?: number; // For orderbook
  callback: (data: any) => void;
}

interface MarketDataOptions {
  maxCacheSize?: number;
  cacheExpiryMs?: number;
  useWebSockets?: boolean;
  enableAggregation?: boolean;
}

// Default options
const DEFAULT_OPTIONS: MarketDataOptions = {
  maxCacheSize: 1000,
  cacheExpiryMs: 5000, // 5 seconds
  useWebSockets: true,
  enableAggregation: true
};

// Singleton instance
let instance: MarketDataService | null = null;

export class MarketDataService {
  private options: MarketDataOptions;
  private wsManager: WebSocketManager;
  private exchangeService: ExchangeService;
  private dataSubscriptions: Map<string, DataSubscription> = new Map();
  
  // Caches for different data types
  private tickerCache: Map<string, { data: MarketData, timestamp: number }> = new Map();
  private orderbookCache: Map<string, { data: OrderBook, timestamp: number }> = new Map();
  private candleCache: Map<string, { data: any, timestamp: number }> = new Map();
  private tradesCache: Map<string, { data: any[], timestamp: number }> = new Map();
  
  // Subscription mapping for WebSockets
  private wsSubscriptions: Map<string, string[]> = new Map();
  
  // Recently used symbols
  private recentSymbols: Set<string> = new Set();
  
  // Available symbols by exchange
  private availableSymbols: Map<ExchangeId, MarketSymbol[]> = new Map();

  private constructor(options: MarketDataOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.wsManager = WebSocketManager.getInstance();
    this.exchangeService = ExchangeService.getInstance();
    
    // Initialize
    this.setupListeners();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(options: MarketDataOptions = {}): MarketDataService {
    if (!instance) {
      instance = new MarketDataService(options);
    }
    return instance;
  }

  /**
   * Set up event listeners for WebSocket events
   */
  private setupListeners(): void {
    // Listen for WebSocket parsed messages
    this.wsManager.on(WebSocketEvent.ParsedMessage, (message: ParsedMessage) => {
      this.handleWebSocketMessage(message);
    });
  }

  /**
   * Handle WebSocket messages and update relevant caches
   */
  private handleWebSocketMessage(message: ParsedMessage): void {
    const { type, exchange, symbol, timestamp, data } = message;
    
    // Generate a cache key
    const cacheKey = `${exchange}:${symbol}:${type}`;
    
    // Update appropriate cache based on message type
    switch (type) {
      case MessageType.Ticker:
        // Convert to standard MarketData format
        const tickerData: MarketData = {
          symbol: symbol,
          timestamp: timestamp,
          bid: data.bid || data.price || 0,
          ask: data.ask || data.price || 0,
          last: data.price || 0,
          high: data.high || 0,
          low: data.low || 0,
          volume: data.volume || 0,
          quoteVolume: data.quoteVolume || 0,
          change: data.priceChange || 0,
          changePercent: data.priceChangePercent || 0
        };
        
        this.tickerCache.set(cacheKey, {
          data: tickerData,
          timestamp: Date.now()
        });
        
        // Notify subscribers
        this.notifySubscribers('ticker', exchange, symbol, tickerData);
        break;
        
      case MessageType.OrderBook:
        const orderBookData: OrderBook = {
          symbol: symbol,
          timestamp: timestamp,
          asks: data.asks || [],
          bids: data.bids || [],
          nonce: data.lastUpdateId
        };
        
        this.orderbookCache.set(cacheKey, {
          data: orderBookData,
          timestamp: Date.now()
        });
        
        // Notify subscribers
        this.notifySubscribers('orderbook', exchange, symbol, orderBookData);
        break;
        
      case MessageType.Candle:
        this.candleCache.set(`${cacheKey}:${data.interval || '1m'}`, {
          data: data,
          timestamp: Date.now()
        });
        
        // Notify subscribers
        this.notifySubscribers('candles', exchange, symbol, data);
        break;
        
      case MessageType.Trade:
        // Get existing trades array or create new one
        const cacheEntry = this.tradesCache.get(cacheKey) || { 
          data: [], 
          timestamp: Date.now() 
        };
        
        // Add new trade to beginning of array (newest first)
        cacheEntry.data.unshift(data);
        
        // Limit array size to 100 trades
        if (cacheEntry.data.length > 100) {
          cacheEntry.data = cacheEntry.data.slice(0, 100);
        }
        
        // Update cache
        cacheEntry.timestamp = Date.now();
        this.tradesCache.set(cacheKey, cacheEntry);
        
        // Notify subscribers
        this.notifySubscribers('trades', exchange, symbol, data);
        break;
    }
    
    // Perform cache cleanup if needed
    this.cleanupCacheIfNeeded();
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCacheIfNeeded(): void {
    const now = Date.now();
    const maxAge = this.options.cacheExpiryMs || 5000;
    
    // Check if caches are getting too large
    if (this.tickerCache.size > (this.options.maxCacheSize || 1000)) {
      // Remove old entries
      for (const [key, entry] of this.tickerCache.entries()) {
        if (now - entry.timestamp > maxAge) {
          this.tickerCache.delete(key);
        }
      }
    }
    
    if (this.orderbookCache.size > (this.options.maxCacheSize || 1000)) {
      for (const [key, entry] of this.orderbookCache.entries()) {
        if (now - entry.timestamp > maxAge) {
          this.orderbookCache.delete(key);
        }
      }
    }
    
    if (this.candleCache.size > (this.options.maxCacheSize || 1000)) {
      for (const [key, entry] of this.candleCache.entries()) {
        if (now - entry.timestamp > maxAge) {
          this.candleCache.delete(key);
        }
      }
    }
    
    if (this.tradesCache.size > (this.options.maxCacheSize || 1000)) {
      for (const [key, entry] of this.tradesCache.entries()) {
        if (now - entry.timestamp > maxAge) {
          this.tradesCache.delete(key);
        }
      }
    }
  }

  /**
   * Notify subscribers about new data
   */
  private notifySubscribers(
    type: DataSubscriptionType, 
    exchange: ExchangeId, 
    symbol: string, 
    data: any
  ): void {
    // Find all subscriptions matching these criteria
    for (const subscription of this.dataSubscriptions.values()) {
      if (
        subscription.type === type &&
        subscription.exchange === exchange &&
        subscription.symbol === symbol
      ) {
        try {
          subscription.callback(data);
        } catch (error) {
          console.error(`Error in market data subscription callback:`, error);
        }
      }
    }
  }

  /**
   * Subscribe to market data updates
   */
  subscribeTicker(
    exchange: ExchangeId, 
    symbol: string, 
    callback: (data: MarketData) => void
  ): string {
    // Generate a unique subscription ID
    const subscriptionId = `ticker:${exchange}:${symbol}:${Date.now().toString(36)}`;
    
    // Store the subscription
    this.dataSubscriptions.set(subscriptionId, {
      id: subscriptionId,
      exchange,
      symbol,
      type: 'ticker',
      callback
    });
    
    // Set up WebSocket subscription if enabled
    if (this.options.useWebSockets) {
      this.subscribeViaWebSocket(exchange, symbol, 'ticker');
    }
    
    // Add to recent symbols
    this.recentSymbols.add(symbol);
    
    return subscriptionId;
  }

  /**
   * Subscribe to order book updates
   */
  subscribeOrderBook(
    exchange: ExchangeId, 
    symbol: string, 
    callback: (data: OrderBook) => void,
    depth?: number
  ): string {
    // Generate a unique subscription ID
    const subscriptionId = `orderbook:${exchange}:${symbol}:${Date.now().toString(36)}`;
    
    // Store the subscription
    this.dataSubscriptions.set(subscriptionId, {
      id: subscriptionId,
      exchange,
      symbol,
      type: 'orderbook',
      depth,
      callback
    });
    
    // Set up WebSocket subscription if enabled
    if (this.options.useWebSockets) {
      this.subscribeViaWebSocket(exchange, symbol, 'orderbook');
    }
    
    // Add to recent symbols
    this.recentSymbols.add(symbol);
    
    return subscriptionId;
  }

  /**
   * Subscribe to trades updates
   */
  subscribeTrades(
    exchange: ExchangeId, 
    symbol: string, 
    callback: (data: any) => void
  ): string {
    // Generate a unique subscription ID
    const subscriptionId = `trades:${exchange}:${symbol}:${Date.now().toString(36)}`;
    
    // Store the subscription
    this.dataSubscriptions.set(subscriptionId, {
      id: subscriptionId,
      exchange,
      symbol,
      type: 'trades',
      callback
    });
    
    // Set up WebSocket subscription if enabled
    if (this.options.useWebSockets) {
      this.subscribeViaWebSocket(exchange, symbol, 'trades');
    }
    
    // Add to recent symbols
    this.recentSymbols.add(symbol);
    
    return subscriptionId;
  }

  /**
   * Subscribe to candle (OHLCV) updates
   */
  subscribeCandles(
    exchange: ExchangeId, 
    symbol: string, 
    callback: (data: any) => void,
    interval: string = '1m'
  ): string {
    // Generate a unique subscription ID
    const subscriptionId = `candles:${exchange}:${symbol}:${interval}:${Date.now().toString(36)}`;
    
    // Store the subscription
    this.dataSubscriptions.set(subscriptionId, {
      id: subscriptionId,
      exchange,
      symbol,
      type: 'candles',
      interval,
      callback
    });
    
    // Set up WebSocket subscription if enabled
    if (this.options.useWebSockets) {
      this.subscribeViaWebSocket(exchange, symbol, 'candles', interval);
    }
    
    // Add to recent symbols
    this.recentSymbols.add(symbol);
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from market data updates
   */
  unsubscribe(subscriptionId: string): boolean {
    // Check if subscription exists
    if (!this.dataSubscriptions.has(subscriptionId)) {
      return false;
    }
    
    // Get subscription details
    const subscription = this.dataSubscriptions.get(subscriptionId)!;
    
    // Remove the subscription
    this.dataSubscriptions.delete(subscriptionId);
    
    // Check if we need to unsubscribe from WebSocket
    // Only if there are no more subscriptions for this exchange/symbol/type
    let hasRelatedSubscriptions = false;
    
    for (const sub of this.dataSubscriptions.values()) {
      if (
        sub.exchange === subscription.exchange &&
        sub.symbol === subscription.symbol &&
        sub.type === subscription.type
      ) {
        hasRelatedSubscriptions = true;
        break;
      }
    }
    
    // If no more related subscriptions, unsubscribe from WebSocket
    if (!hasRelatedSubscriptions && this.options.useWebSockets) {
      this.unsubscribeFromWebSocket(
        subscription.exchange, 
        subscription.symbol, 
        subscription.type
      );
    }
    
    return true;
  }

  /**
   * Get latest ticker data for a symbol
   */
  async getTicker(exchange: ExchangeId, symbol: string): Promise<MarketData> {
    // Check cache first
    const cacheKey = `${exchange}:${symbol}:${MessageType.Ticker}`;
    const cached = this.tickerCache.get(cacheKey);
    
    // Use cache if fresh
    if (cached && Date.now() - cached.timestamp < (this.options.cacheExpiryMs || 5000)) {
      return cached.data;
    }
    
    try {
      // Get exchange connector
      const connector = await this.exchangeService.getConnector(exchange);
      
      if (!connector) {
        throw new Error(`No connector available for ${exchange}`);
      }
      
      // Fetch market data
      const marketData = await connector.getMarketData(symbol);
      
      // Update cache
      this.tickerCache.set(cacheKey, {
        data: marketData,
        timestamp: Date.now()
      });
      
      // Add to recent symbols
      this.recentSymbols.add(symbol);
      
      return marketData;
    } catch (error) {
      console.error(`Failed to get ticker for ${symbol} on ${exchange}:`, error);
      
      // Return cached data even if stale, or throw error if no cache
      if (cached) {
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Get ticker data across multiple exchanges
   */
  async getTickerAcrossExchanges(symbol: string): Promise<Map<ExchangeId, MarketData>> {
    // Get all exchanges with credentials
    const exchanges = this.exchangeService.getAvailableExchanges();
    
    // Results map
    const results = new Map<ExchangeId, MarketData>();
    
    // Fetch data from all exchanges
    const promises = exchanges.map(async (exchange) => {
      try {
        const data = await this.getTicker(exchange, symbol);
        results.set(exchange, data);
      } catch (error) {
        console.warn(`Failed to get ticker for ${symbol} on ${exchange}:`, error);
      }
    });
    
    // Wait for all promises to resolve
    await Promise.allSettled(promises);
    
    return results;
  }

  /**
   * Get aggregated ticker data across exchanges
   */
  async getAggregatedTicker(symbol: string): Promise<MarketData | null> {
    if (!this.options.enableAggregation) {
      return null;
    }
    
    try {
      // Get data from all exchanges
      const allData = await this.getTickerAcrossExchanges(symbol);
      
      // If no data, return null
      if (allData.size === 0) {
        return null;
      }
      
      // Aggregate data
      let totalVolume = 0;
      let totalQuoteVolume = 0;
      let volumeWeightedPrice = 0;
      let high = 0;
      let low = Number.MAX_VALUE;
      let bid = 0;
      let ask = Number.MAX_VALUE;
      
      for (const data of allData.values()) {
        // Track highest bid and lowest ask
        if (data.bid > bid) bid = data.bid;
        if (data.ask < ask && data.ask > 0) ask = data.ask;
        
        // Track highest high and lowest low
        if (data.high > high) high = data.high;
        if (data.low < low && data.low > 0) low = data.low;
        
        // Accumulate volume
        totalVolume += data.volume || 0;
        totalQuoteVolume += data.quoteVolume || 0;
        
        // Calculate volume-weighted price
        volumeWeightedPrice += (data.last * data.volume);
      }
      
      // Calculate final volume-weighted price
      const last = totalVolume > 0 
        ? volumeWeightedPrice / totalVolume 
        : Array.from(allData.values()).reduce((sum, data) => sum + data.last, 0) / allData.size;
      
      // Calculate average price change
      const avgChange = Array.from(allData.values())
        .reduce((sum, data) => sum + data.change, 0) / allData.size;
        
      // Calculate average percent change
      const avgPercentChange = Array.from(allData.values())
        .reduce((sum, data) => sum + data.changePercent, 0) / allData.size;
      
      // Return aggregated data
      return {
        symbol,
        timestamp: Date.now(),
        bid,
        ask,
        last,
        high,
        low,
        volume: totalVolume,
        quoteVolume: totalQuoteVolume,
        change: avgChange,
        changePercent: avgPercentChange,
        vwap: totalQuoteVolume > 0 ? totalQuoteVolume / totalVolume : undefined
      };
    } catch (error) {
      console.error(`Failed to get aggregated ticker for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get order book for a symbol
   */
  async getOrderBook(
    exchange: ExchangeId, 
    symbol: string, 
    depth?: number
  ): Promise<OrderBook> {
    // Check cache first
    const cacheKey = `${exchange}:${symbol}:${MessageType.OrderBook}`;
    const cached = this.orderbookCache.get(cacheKey);
    
    // Use cache if fresh
    if (cached && Date.now() - cached.timestamp < (this.options.cacheExpiryMs || 5000)) {
      return cached.data;
    }
    
    try {
      // Get exchange connector
      const connector = await this.exchangeService.getConnector(exchange);
      
      if (!connector) {
        throw new Error(`No connector available for ${exchange}`);
      }
      
      // Get connector class to access additional methods
      // This is a bit of a hack, relying on specific implementation
      const connectorAny = connector as any;
      
      // Check if the connector has getOrderBook method
      if (typeof connectorAny.getOrderBook !== 'function') {
        throw new Error(`Connector for ${exchange} does not support getOrderBook`);
      }
      
      // Fetch order book
      const orderBook = await connectorAny.getOrderBook(symbol, depth);
      
      // Update cache
      this.orderbookCache.set(cacheKey, {
        data: orderBook,
        timestamp: Date.now()
      });
      
      // Add to recent symbols
      this.recentSymbols.add(symbol);
      
      return orderBook;
    } catch (error) {
      console.error(`Failed to get order book for ${symbol} on ${exchange}:`, error);
      
      // Return cached data even if stale, or throw error if no cache
      if (cached) {
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Get trades for a symbol
   */
  getTrades(exchange: ExchangeId, symbol: string, limit: number = 50): any[] {
    // Check cache
    const cacheKey = `${exchange}:${symbol}:${MessageType.Trade}`;
    const cached = this.tradesCache.get(cacheKey);
    
    if (cached) {
      return cached.data.slice(0, limit);
    }
    
    return [];
  }

  /**
   * Get candles (OHLCV) for a symbol
   */
  async getCandles(
    exchange: ExchangeId, 
    symbol: string, 
    interval: string = '1m',
    limit: number = 100
  ): Promise<any[]> {
    // Implement REST API fetch for historical candles
    // This would typically use the CCXT connector
    
    // For now, return an empty array - would be implemented with exchange connectors
    return [];
  }

  /**
   * Get recently used symbols
   */
  getRecentSymbols(): string[] {
    return Array.from(this.recentSymbols);
  }

  /**
   * Get available trading pairs from an exchange
   */
  async getAvailableSymbols(exchange: ExchangeId): Promise<MarketSymbol[]> {
    // Check cache
    if (this.availableSymbols.has(exchange)) {
      return this.availableSymbols.get(exchange) || [];
    }
    
    try {
      // Get exchange connector
      const connector = await this.exchangeService.getConnector(exchange);
      
      if (!connector) {
        throw new Error(`No connector available for ${exchange}`);
      }
      
      // Fetch available symbols
      const symbols = await connector.getAvailableSymbols();
      
      // Update cache
      this.availableSymbols.set(exchange, symbols);
      
      return symbols;
    } catch (error) {
      console.error(`Failed to get available symbols for ${exchange}:`, error);
      return [];
    }
  }

  /**
   * Subscribe to data via WebSocket
   */
  private subscribeViaWebSocket(
    exchange: ExchangeId, 
    symbol: string, 
    type: DataSubscriptionType,
    interval?: string
  ): void {
    // Map data type to WebSocket channel
    let channel: string;
    let params: Record<string, any> = {};
    
    switch (type) {
      case 'ticker':
        channel = 'ticker';
        break;
      case 'orderbook':
        channel = 'orderbook';
        break;
      case 'trades':
        channel = 'trade';
        break;
      case 'candles':
        channel = 'kline';
        params.interval = interval || '1m';
        break;
      default:
        channel = 'ticker';
    }
    
    // Generate subscription ID
    const wsSubId = `${exchange}:${symbol}:${channel}`;
    
    // Check if already subscribed
    if (this.wsSubscriptions.has(wsSubId)) {
      return;
    }
    
    // Subscribe to WebSocket
    const listenerId = this.wsManager.subscribeToMarketData(
      exchange,
      [symbol],
      [channel],
      (message: ParsedMessage) => {
        // WebSocket manager handles the message routing
        // It will emit events that our service listens for
      }
    );
    
    // Store the listener ID
    this.wsSubscriptions.set(wsSubId, [listenerId]);
  }

  /**
   * Unsubscribe from WebSocket data
   */
  private unsubscribeFromWebSocket(
    exchange: ExchangeId, 
    symbol: string, 
    type: DataSubscriptionType
  ): void {
    // Map data type to WebSocket channel
    let channel: string;
    
    switch (type) {
      case 'ticker':
        channel = 'ticker';
        break;
      case 'orderbook':
        channel = 'orderbook';
        break;
      case 'trades':
        channel = 'trade';
        break;
      case 'candles':
        channel = 'kline';
        break;
      default:
        channel = 'ticker';
    }
    
    // Generate subscription ID
    const wsSubId = `${exchange}:${symbol}:${channel}`;
    
    // Check if subscribed
    if (!this.wsSubscriptions.has(wsSubId)) {
      return;
    }
    
    // Get listener IDs
    const listenerIds = this.wsSubscriptions.get(wsSubId) || [];
    
    // Unsubscribe from WebSocket
    for (const listenerId of listenerIds) {
      this.wsManager.unsubscribeFromMarketData(listenerId);
    }
    
    // Remove from tracking
    this.wsSubscriptions.delete(wsSubId);
  }

  /**
   * Clear all caches and subscriptions
   */
  clear(): void {
    // Clear caches
    this.tickerCache.clear();
    this.orderbookCache.clear();
    this.candleCache.clear();
    this.tradesCache.clear();
    
    // Unsubscribe from all WebSockets
    for (const [wsSubId, listenerIds] of this.wsSubscriptions.entries()) {
      for (const listenerId of listenerIds) {
        this.wsManager.unsubscribeFromMarketData(listenerId);
      }
    }
    
    // Clear subscriptions
    this.wsSubscriptions.clear();
    this.dataSubscriptions.clear();
  }
}
