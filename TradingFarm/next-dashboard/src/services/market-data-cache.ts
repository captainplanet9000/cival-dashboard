import { RedisCacheService, CacheNamespace, CacheExpiration } from '@/utils/redis/cache-service';
import { getRedisClient } from '@/utils/redis/client';

/**
 * Timeframe definitions for market data
 */
export enum MarketTimeframe {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  THIRTY_MINUTES = '30m',
  ONE_HOUR = '1h',
  FOUR_HOURS = '4h',
  ONE_DAY = '1d',
  ONE_WEEK = '1w',
}

/**
 * Market data types
 */
export enum MarketDataType {
  PRICE = 'price',
  CANDLES = 'candles',
  TICKER = 'ticker',
  ORDERBOOK = 'orderbook',
  TRADES = 'trades',
  FUNDING_RATE = 'funding_rate',
  OPEN_INTEREST = 'open_interest',
  LIQUIDATIONS = 'liquidations',
}

/**
 * Exchange identifiers
 */
export enum Exchange {
  BINANCE = 'binance',
  BYBIT = 'bybit', 
  COINBASE = 'coinbase',
  HYPERLIQUID = 'hyperliquid',
  DYDX = 'dydx',
  OKX = 'okx',
}

/**
 * Market Data Cache Service
 * Provides efficient caching of market data using Redis
 */
export class MarketDataCacheService {
  private static instance: MarketDataCacheService;
  private cache: RedisCacheService;
  private redisClient: any; // Direct client for Time Series operations
  
  private constructor() {
    this.cache = new RedisCacheService();
    this.redisClient = getRedisClient();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MarketDataCacheService {
    if (!MarketDataCacheService.instance) {
      MarketDataCacheService.instance = new MarketDataCacheService();
    }
    return MarketDataCacheService.instance;
  }
  
  /**
   * Cache latest price for a symbol
   */
  public async cachePrice(exchange: Exchange, symbol: string, price: number): Promise<void> {
    const key = `${exchange}:${symbol}:${MarketDataType.PRICE}`;
    
    // Store in regular cache for quick access
    await this.cache.set(
      CacheNamespace.MARKET_DATA,
      key,
      {
        price,
        timestamp: Date.now(),
      },
      CacheExpiration.SHORT
    );
    
    // Store in time series for historical access
    await this.storeTimeSeriesDataPoint(
      `ts:${key}`,
      price,
      Date.now()
    );
  }
  
  /**
   * Get latest price for a symbol
   */
  public async getPrice(exchange: Exchange, symbol: string): Promise<{ price: number, timestamp: number } | null> {
    const key = `${exchange}:${symbol}:${MarketDataType.PRICE}`;
    return await this.cache.get<{ price: number, timestamp: number }>(CacheNamespace.MARKET_DATA, key);
  }
  
  /**
   * Cache candlestick data
   */
  public async cacheCandlesticks(
    exchange: Exchange,
    symbol: string,
    timeframe: MarketTimeframe, 
    candles: any[]
  ): Promise<void> {
    const key = `${exchange}:${symbol}:${MarketDataType.CANDLES}:${timeframe}`;
    
    // Store full candle array in cache
    await this.cache.set(
      CacheNamespace.MARKET_DATA,
      key,
      {
        candles,
        timestamp: Date.now(),
      },
      this.getCandleExpiration(timeframe)
    );
    
    // Store latest candle values in time series
    if (candles.length > 0) {
      const latestCandle = candles[candles.length - 1];
      
      // Store close price in time series
      await this.storeTimeSeriesDataPoint(
        `ts:${exchange}:${symbol}:close:${timeframe}`,
        latestCandle.close,
        latestCandle.timestamp || Date.now()
      );
      
      // Store volume in time series
      await this.storeTimeSeriesDataPoint(
        `ts:${exchange}:${symbol}:volume:${timeframe}`,
        latestCandle.volume,
        latestCandle.timestamp || Date.now()
      );
    }
  }
  
  /**
   * Get candlestick data
   */
  public async getCandlesticks(
    exchange: Exchange,
    symbol: string,
    timeframe: MarketTimeframe
  ): Promise<{ candles: any[], timestamp: number } | null> {
    const key = `${exchange}:${symbol}:${MarketDataType.CANDLES}:${timeframe}`;
    return await this.cache.get<{ candles: any[], timestamp: number }>(CacheNamespace.MARKET_DATA, key);
  }
  
  /**
   * Cache orderbook data
   */
  public async cacheOrderbook(
    exchange: Exchange,
    symbol: string,
    orderbook: { bids: [number, number][], asks: [number, number][], timestamp: number }
  ): Promise<void> {
    const key = `${exchange}:${symbol}:${MarketDataType.ORDERBOOK}`;
    
    // Store orderbook in cache
    await this.cache.set(
      CacheNamespace.MARKET_DATA,
      key,
      {
        ...orderbook,
        cached_at: Date.now(),
      },
      CacheExpiration.SHORT
    );
    
    // Calculate and store orderbook metrics in time series
    const bestBid = orderbook.bids[0]?.[0] || 0;
    const bestAsk = orderbook.asks[0]?.[0] || 0;
    const spread = bestAsk - bestBid;
    const bidDepth = orderbook.bids.reduce((sum, [price, amount]) => sum + amount, 0);
    const askDepth = orderbook.asks.reduce((sum, [price, amount]) => sum + amount, 0);
    const depthRatio = bidDepth / (askDepth || 1);
    
    // Store spread in time series
    await this.storeTimeSeriesDataPoint(
      `ts:${exchange}:${symbol}:spread`,
      spread,
      orderbook.timestamp || Date.now()
    );
    
    // Store depth ratio in time series
    await this.storeTimeSeriesDataPoint(
      `ts:${exchange}:${symbol}:depth_ratio`,
      depthRatio,
      orderbook.timestamp || Date.now()
    );
  }
  
  /**
   * Get orderbook data
   */
  public async getOrderbook(
    exchange: Exchange,
    symbol: string
  ): Promise<{ bids: [number, number][], asks: [number, number][], timestamp: number, cached_at: number } | null> {
    const key = `${exchange}:${symbol}:${MarketDataType.ORDERBOOK}`;
    return await this.cache.get<{ bids: [number, number][], asks: [number, number][], timestamp: number, cached_at: number }>(
      CacheNamespace.MARKET_DATA,
      key
    );
  }
  
  /**
   * Cache recent trades
   */
  public async cacheTrades(
    exchange: Exchange,
    symbol: string,
    trades: any[]
  ): Promise<void> {
    const key = `${exchange}:${symbol}:${MarketDataType.TRADES}`;
    
    // Store trades in cache
    await this.cache.set(
      CacheNamespace.MARKET_DATA,
      key,
      {
        trades,
        timestamp: Date.now(),
      },
      CacheExpiration.SHORT
    );
    
    // Track trade volume and count in time series
    if (trades.length > 0) {
      const timestamp = trades[0].timestamp || Date.now();
      const volume = trades.reduce((sum, trade) => sum + (trade.amount || 0), 0);
      const buyVolume = trades
        .filter(trade => trade.side === 'buy')
        .reduce((sum, trade) => sum + (trade.amount || 0), 0);
      
      // Store trade count
      await this.storeTimeSeriesDataPoint(
        `ts:${exchange}:${symbol}:trade_count`,
        trades.length,
        timestamp
      );
      
      // Store trade volume
      await this.storeTimeSeriesDataPoint(
        `ts:${exchange}:${symbol}:trade_volume`,
        volume,
        timestamp
      );
      
      // Store buy/sell ratio
      await this.storeTimeSeriesDataPoint(
        `ts:${exchange}:${symbol}:buy_ratio`,
        buyVolume / (volume || 1),
        timestamp
      );
    }
  }
  
  /**
   * Get recent trades
   */
  public async getTrades(
    exchange: Exchange,
    symbol: string
  ): Promise<{ trades: any[], timestamp: number } | null> {
    const key = `${exchange}:${symbol}:${MarketDataType.TRADES}`;
    return await this.cache.get<{ trades: any[], timestamp: number }>(CacheNamespace.MARKET_DATA, key);
  }
  
  /**
   * Store a data point in Redis time series
   * Using Redis commands directly or simulating time series with sorted sets
   */
  private async storeTimeSeriesDataPoint(key: string, value: number, timestamp: number): Promise<void> {
    try {
      // Use Redis Sorted Set to simulate time series
      // Score is the timestamp, member is timestamp:value
      await this.redisClient.zadd(key, timestamp, `${timestamp}:${value}`);
      
      // Set expiration (7 days) if not already set
      await this.redisClient.expire(key, 60 * 60 * 24 * 7);
      
      // Trim to last 1000 points to prevent unbounded growth
      await this.redisClient.zremrangebyrank(key, 0, -1001);
    } catch (error) {
      console.error(`Error storing time series data point for ${key}:`, error);
    }
  }
  
  /**
   * Query time series data within a time range
   */
  public async queryTimeSeries(
    key: string,
    startTime: number,
    endTime: number = Date.now()
  ): Promise<{ timestamp: number, value: number }[]> {
    try {
      // Get range from sorted set
      const results = await this.redisClient.zrangebyscore(
        `ts:${key}`,
        startTime,
        endTime,
        'WITHSCORES'
      );
      
      // Parse results from [member1, score1, member2, score2, ...]
      const data: { timestamp: number, value: number }[] = [];
      
      for (let i = 0; i < results.length; i += 2) {
        const [timestamp, value] = results[i].split(':');
        data.push({
          timestamp: parseInt(timestamp, 10),
          value: parseFloat(value)
        });
      }
      
      return data;
    } catch (error) {
      console.error(`Error querying time series data for ${key}:`, error);
      return [];
    }
  }
  
  /**
   * Get time series data summary (min, max, avg, etc.)
   */
  public async getTimeSeriesSummary(
    key: string,
    startTime: number,
    endTime: number = Date.now()
  ): Promise<{ min: number, max: number, avg: number, count: number, first: number, last: number }> {
    try {
      // Get all data points in the range
      const dataPoints = await this.queryTimeSeries(key, startTime, endTime);
      
      if (dataPoints.length === 0) {
        return { min: 0, max: 0, avg: 0, count: 0, first: 0, last: 0 };
      }
      
      // Calculate statistics
      const values = dataPoints.map(point => point.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const sum = values.reduce((acc, val) => acc + val, 0);
      const avg = sum / values.length;
      const first = dataPoints[0].value;
      const last = dataPoints[dataPoints.length - 1].value;
      
      return {
        min,
        max,
        avg,
        count: dataPoints.length,
        first,
        last
      };
    } catch (error) {
      console.error(`Error getting time series summary for ${key}:`, error);
      return { min: 0, max: 0, avg: 0, count: 0, first: 0, last: 0 };
    }
  }
  
  /**
   * Get appropriate cache expiration time based on candle timeframe
   */
  private getCandleExpiration(timeframe: MarketTimeframe): number {
    switch (timeframe) {
      case MarketTimeframe.ONE_MINUTE:
        return CacheExpiration.SHORT; // 1 minute
      case MarketTimeframe.FIVE_MINUTES:
      case MarketTimeframe.FIFTEEN_MINUTES:
        return CacheExpiration.MEDIUM; // 5 minutes
      case MarketTimeframe.THIRTY_MINUTES:
      case MarketTimeframe.ONE_HOUR:
        return CacheExpiration.LONG; // 15 minutes
      case MarketTimeframe.FOUR_HOURS:
      case MarketTimeframe.ONE_DAY:
      case MarketTimeframe.ONE_WEEK:
        return CacheExpiration.EXTENDED; // 1 hour
      default:
        return CacheExpiration.MEDIUM;
    }
  }
}
