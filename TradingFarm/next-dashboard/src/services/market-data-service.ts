/**
 * Market Data Service
 * 
 * Provides comprehensive market data from multiple sources including:
 * - CoinAPI for cross-exchange cryptocurrency data
 * - MarketStack for traditional market data
 * - Exchange-specific APIs for real-time order book and trade data
 */
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { invalidateMarketDataCache } from '@/utils/cache-invalidation';

export type TimeInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
export type DataSource = 'coinapi' | 'marketstack' | 'exchange' | 'cache';

export interface MarketDataOptions {
  symbol: string;
  interval?: TimeInterval;
  limit?: number;
  startTime?: Date | string;
  endTime?: Date | string;
  source?: DataSource;
  exchange?: string;
}

export interface OHLCV {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  amount: number;
}

export interface OrderBook {
  symbol: string;
  timestamp: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  source: DataSource;
}

export interface MarketSummary {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap?: number;
  timestamp: string;
  source: DataSource;
}

/**
 * Service for fetching and processing market data
 */
export class MarketDataService {
  /**
   * Fetch OHLCV (candlestick) data for a symbol
   */
  static async getOHLCV(
    options: MarketDataOptions,
    isServerSide = true
  ): Promise<OHLCV[]> {
    try {
      // First, check if data is available in cache
      const cachedData = await this.getFromCache(
        'ohlcv',
        options.symbol,
        options.interval || '1h',
        isServerSide
      );
      
      if (cachedData && cachedData.length > 0) {
        return cachedData.slice(0, options.limit || cachedData.length);
      }
      
      // Otherwise, fetch from the appropriate source
      const source = options.source || 'coinapi';
      let data: OHLCV[] = [];
      
      switch (source) {
        case 'coinapi':
          data = await this.fetchFromCoinAPI(options);
          break;
        case 'marketstack':
          data = await this.fetchFromMarketStack(options);
          break;
        case 'exchange':
          data = await this.fetchFromExchange(options);
          break;
        default:
          throw new Error(`Unsupported data source: ${source}`);
      }
      
      // Cache the results
      await this.saveToCache('ohlcv', options.symbol, options.interval || '1h', data, isServerSide);
      
      // Return requested number of records
      return data.slice(0, options.limit || data.length);
    } catch (error) {
      console.error(`Error fetching OHLCV data for ${options.symbol}:`, error);
      return [];
    }
  }

  /**
   * Fetch order book data for a symbol
   */
  static async getOrderBook(
    symbol: string,
    exchange?: string,
    isServerSide = true
  ): Promise<OrderBook | null> {
    try {
      // Order book data is typically not cached due to its real-time nature
      if (!exchange) {
        // If no exchange specified, use CoinAPI for aggregated order book
        return await this.fetchOrderBookFromCoinAPI(symbol);
      } else {
        // Otherwise, fetch from the specified exchange
        return await this.fetchOrderBookFromExchange(symbol, exchange);
      }
    } catch (error) {
      console.error('Error fetching order book data:', error);
      return null;
    }
  }

  /**
   * Fetch market summaries for multiple symbols
   */
  static async getMarketSummaries(
    symbols: string[],
    source: DataSource = 'coinapi',
    isServerSide = true
  ): Promise<MarketSummary[]> {
    try {
      // Check cache first
      const cachedData = await this.getFromCache(
        'market_summary',
        symbols.join(','),
        '',
        isServerSide
      );
      
      if (cachedData && cachedData.length > 0) {
        // Only use cache if it's recent (less than 5 minutes old)
        const mostRecent = new Date(cachedData[0].timestamp);
        if (Date.now() - mostRecent.getTime() < 5 * 60 * 1000) {
          return cachedData;
        }
      }
      
      // Otherwise, fetch new data
      let summaries: MarketSummary[] = [];
      
      switch (source) {
        case 'coinapi':
          summaries = await this.fetchSummariesFromCoinAPI(symbols);
          break;
        case 'marketstack':
          summaries = await this.fetchSummariesFromMarketStack(symbols);
          break;
        case 'exchange':
          summaries = await this.fetchSummariesFromExchange(symbols);
          break;
        default:
          throw new Error(`Unsupported data source: ${source}`);
      }
      
      // Cache the results
      await this.saveToCache('market_summary', symbols.join(','), '', summaries, isServerSide);
      
      return summaries;
    } catch (error) {
      console.error('Error fetching market summaries:', error);
      return [];
    }
  }

  /**
   * Search for symbols matching a query string
   */
  static async searchSymbols(
    query: string,
    limit: number = 10,
    isServerSide = true
  ): Promise<any[]> {
    try {
      // Check cache first
      const cacheKey = `symbol_search_${query.toLowerCase()}`;
      const cachedData = await this.getFromCache(
        'symbol_search',
        cacheKey,
        '',
        isServerSide
      );
      
      if (cachedData && cachedData.length > 0) {
        return cachedData.slice(0, limit);
      }
      
      // Otherwise, search using CoinAPI
      const symbols = await this.searchSymbolsFromCoinAPI(query, limit);
      
      // Cache the results (valid for 24 hours)
      await this.saveToCache('symbol_search', cacheKey, '', symbols, isServerSide, 24 * 60 * 60);
      
      return symbols.slice(0, limit);
    } catch (error) {
      console.error('Error searching symbols:', error);
      return [];
    }
  }

  /**
   * Refresh market data and invalidate cache
   */
  static async refreshMarketData(symbol: string, interval?: TimeInterval): Promise<void> {
    try {
      // First invalidate Redis cache
      if (symbol) {
        await invalidateMarketDataCache(symbol);
      } else {
        // If no symbol specified, invalidate all market data
        await invalidateMarketDataCache();
      }
      
      // Then invalidate internal cache (Supabase)
      const supabase = await createServerClient();
      await supabase.from('market_data_cache').upsert({
        id: `refresh_${Date.now()}`,
        symbol: symbol || 'ALL',
        interval: interval || 'ALL',
        timestamp: new Date().toISOString(),
        is_refresh_trigger: true
      });
      
      console.log(`Market data cache invalidated for symbol: ${symbol || 'ALL'}, interval: ${interval || 'ALL'}`);
    } catch (error) {
      console.error('Error refreshing market data:', error);
    }
  }

  /**
   * Fetch OHLCV data from CoinAPI
   */
  private static async fetchFromCoinAPI(options: MarketDataOptions): Promise<OHLCV[]> {
    const apiKey = process.env.COINAPI_API_KEY;
    if (!apiKey) {
      throw new Error('CoinAPI API key is not configured');
    }
    
    const interval = this.convertIntervalToCoinAPI(options.interval || '1h');
    const limit = options.limit || 100;
    
    const url = `https://rest.coinapi.io/v1/ohlcv/${options.symbol}/latest?period_id=${interval}&limit=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        'X-CoinAPI-Key': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`CoinAPI request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.map((item: any) => ({
      timestamp: item.time_period_start,
      open: parseFloat(item.price_open),
      high: parseFloat(item.price_high),
      low: parseFloat(item.price_low),
      close: parseFloat(item.price_close),
      volume: parseFloat(item.volume_traded)
    }));
  }

  /**
   * Fetch OHLCV data from MarketStack
   */
  private static async fetchFromMarketStack(options: MarketDataOptions): Promise<OHLCV[]> {
    const apiKey = process.env.MARKETSTACK_API_KEY;
    if (!apiKey) {
      throw new Error('MarketStack API key is not configured');
    }
    
    const interval = this.convertIntervalToMarketStack(options.interval || '1h');
    const limit = options.limit || 100;
    
    const url = `https://api.marketstack.com/v1/eod?access_key=${apiKey}&symbols=${options.symbol}&limit=${limit}&interval=${interval}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`MarketStack request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.data.map((item: any) => ({
      timestamp: item.date,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseFloat(item.volume)
    }));
  }

  /**
   * Fetch OHLCV data from a specific exchange
   */
  private static async fetchFromExchange(options: MarketDataOptions): Promise<OHLCV[]> {
    if (!options.exchange) {
      throw new Error('Exchange must be specified when using exchange source');
    }
    
    // Use the API endpoints we created
    const url = `/api/exchanges/market-data?exchange=${options.exchange}&symbol=${options.symbol}&interval=${options.interval || '1h'}&limit=${options.limit || 100}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Exchange request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // The structure depends on the exchange, so we need to normalize it
    if (Array.isArray(data.data)) {
      return data.data;
    } else if (data.data && Array.isArray(data.data.data)) {
      return data.data.data;
    }
    
    throw new Error('Unexpected response format from exchange');
  }

  /**
   * Fetch order book data from CoinAPI
   */
  private static async fetchOrderBookFromCoinAPI(symbol: string): Promise<OrderBook> {
    const apiKey = process.env.COINAPI_API_KEY;
    if (!apiKey) {
      throw new Error('CoinAPI API key is not configured');
    }
    
    const url = `https://rest.coinapi.io/v1/orderbooks/${symbol}/current`;
    
    const response = await fetch(url, {
      headers: {
        'X-CoinAPI-Key': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`CoinAPI order book request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      symbol,
      timestamp: data.time_exchange,
      bids: data.bids.map((bid: any) => ({
        price: parseFloat(bid.price),
        amount: parseFloat(bid.size)
      })),
      asks: data.asks.map((ask: any) => ({
        price: parseFloat(ask.price),
        amount: parseFloat(ask.size)
      })),
      source: 'coinapi'
    };
  }

  /**
   * Fetch order book data from a specific exchange
   */
  private static async fetchOrderBookFromExchange(symbol: string, exchange: string): Promise<OrderBook> {
    // Use the API endpoints we created
    const url = `/api/exchanges/${exchange}/orderbook?symbol=${symbol}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Exchange order book request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      symbol,
      timestamp: new Date().toISOString(),
      bids: data.bids.map((bid: any) => ({
        price: Array.isArray(bid) ? parseFloat(bid[0]) : parseFloat(bid.price),
        amount: Array.isArray(bid) ? parseFloat(bid[1]) : parseFloat(bid.amount)
      })),
      asks: data.asks.map((ask: any) => ({
        price: Array.isArray(ask) ? parseFloat(ask[0]) : parseFloat(ask.price),
        amount: Array.isArray(ask) ? parseFloat(ask[1]) : parseFloat(ask.amount)
      })),
      source: 'exchange'
    };
  }

  /**
   * Fetch market summaries from CoinAPI
   */
  private static async fetchSummariesFromCoinAPI(symbols: string[]): Promise<MarketSummary[]> {
    const apiKey = process.env.COINAPI_API_KEY;
    if (!apiKey) {
      throw new Error('CoinAPI API key is not configured');
    }
    
    const url = `https://rest.coinapi.io/v1/quotes/current?filter_symbol_id=${symbols.join(';')}`;
    
    const response = await fetch(url, {
      headers: {
        'X-CoinAPI-Key': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`CoinAPI summaries request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.map((item: any) => ({
      symbol: item.symbol_id,
      price: parseFloat(item.ask_price),
      change24h: 0, // Not directly provided by this endpoint
      changePercent24h: 0, // Not directly provided by this endpoint
      high24h: 0, // Not directly provided by this endpoint
      low24h: 0, // Not directly provided by this endpoint
      volume24h: parseFloat(item.volume_24h),
      timestamp: item.time_exchange,
      source: 'coinapi'
    }));
  }

  /**
   * Fetch market summaries from MarketStack
   */
  private static async fetchSummariesFromMarketStack(symbols: string[]): Promise<MarketSummary[]> {
    const apiKey = process.env.MARKETSTACK_API_KEY;
    if (!apiKey) {
      throw new Error('MarketStack API key is not configured');
    }
    
    const url = `https://api.marketstack.com/v1/eod/latest?access_key=${apiKey}&symbols=${symbols.join(',')}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`MarketStack summaries request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.data.map((item: any) => ({
      symbol: item.symbol,
      price: parseFloat(item.close),
      change24h: 0, // Not directly provided by this endpoint
      changePercent24h: 0, // Not directly provided by this endpoint
      high24h: parseFloat(item.high),
      low24h: parseFloat(item.low),
      volume24h: parseFloat(item.volume),
      timestamp: item.date,
      source: 'marketstack'
    }));
  }

  /**
   * Fetch market summaries from exchanges
   */
  private static async fetchSummariesFromExchange(symbols: string[]): Promise<MarketSummary[]> {
    // This would typically involve multiple API calls to different exchanges
    // For simplicity, we'll just return mock data
    return symbols.map(symbol => ({
      symbol,
      price: 50000 + Math.random() * 1000,
      change24h: Math.random() * 1000 - 500,
      changePercent24h: Math.random() * 10 - 5,
      high24h: 51000 + Math.random() * 1000,
      low24h: 49000 + Math.random() * 1000,
      volume24h: Math.random() * 10000,
      timestamp: new Date().toISOString(),
      source: 'exchange'
    }));
  }

  /**
   * Search for symbols using CoinAPI
   */
  private static async searchSymbolsFromCoinAPI(query: string, limit: number): Promise<any[]> {
    const apiKey = process.env.COINAPI_API_KEY;
    if (!apiKey) {
      throw new Error('CoinAPI API key is not configured');
    }
    
    const url = `https://rest.coinapi.io/v1/symbols?filter_symbol_id=${query}`;
    
    const response = await fetch(url, {
      headers: {
        'X-CoinAPI-Key': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`CoinAPI symbols request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data
      .filter((item: any) => item.symbol_type === 'SPOT')
      .slice(0, limit)
      .map((item: any) => ({
        symbol: item.symbol_id,
        baseAsset: item.asset_id_base,
        quoteAsset: item.asset_id_quote,
        exchangeId: item.exchange_id
      }));
  }

  /**
   * Get data from cache
   */
  private static async getFromCache(
    type: string,
    key: string,
    interval: string,
    isServerSide: boolean
  ): Promise<any[]> {
    try {
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      const cacheKey = `${type}_${key}_${interval}`;
      
      const { data, error } = await supabase
        .from('market_data_cache')
        .select('data, timestamp')
        .eq('cache_key', cacheKey)
        .single();
      
      if (error || !data) {
        return [];
      }
      
      return data.data;
    } catch (error) {
      console.error('Error getting data from cache:', error);
      return [];
    }
  }

  /**
   * Save data to cache
   */
  private static async saveToCache(
    type: string,
    key: string,
    interval: string,
    data: any[],
    isServerSide: boolean,
    ttlSeconds: number = 60 * 60 // Default 1 hour TTL
  ): Promise<void> {
    try {
      const supabase = isServerSide
        ? await createServerClient()
        : createBrowserClient();
      
      const cacheKey = `${type}_${key}_${interval}`;
      
      const { error } = await supabase
        .from('market_data_cache')
        .upsert({
          cache_key: cacheKey,
          data,
          timestamp: new Date().toISOString(),
          expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString()
        }, {
          onConflict: 'cache_key'
        });
      
      if (error) {
        console.error('Error saving data to cache:', error);
      }
    } catch (error) {
      console.error('Error saving data to cache:', error);
    }
  }

  /**
   * Convert internal interval format to CoinAPI format
   */
  private static convertIntervalToCoinAPI(interval: TimeInterval): string {
    switch (interval) {
      case '1m': return '1MIN';
      case '5m': return '5MIN';
      case '15m': return '15MIN';
      case '30m': return '30MIN';
      case '1h': return '1HRS';
      case '4h': return '4HRS';
      case '1d': return '1DAY';
      case '1w': return '1WEK';
      default: return '1HRS';
    }
  }

  /**
   * Convert internal interval format to MarketStack format
   */
  private static convertIntervalToMarketStack(interval: TimeInterval): string {
    switch (interval) {
      case '1d': return 'daily';
      case '1w': return 'weekly';
      default: return 'daily'; // MarketStack only supports daily, weekly, monthly
    }
  }
}
