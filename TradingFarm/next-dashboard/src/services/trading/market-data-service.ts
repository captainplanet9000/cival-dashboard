import { Market, OHLCV, TimeFrame } from '@/types/trading.types';
import { createServerClient } from '@/utils/supabase/server';
import { pusherServer } from '@/lib/pusher';

/**
 * Configuration for the market data service
 */
export interface MarketDataConfig {
  defaultExchange: string;
  supportedExchanges: string[];
  cacheTTL: number; // Time to live for cached data in milliseconds
  useHistoricalData: boolean; // Whether to use historical data for backfilling
}

/**
 * Service responsible for fetching and managing market data
 */
export class MarketDataService {
  private config: MarketDataConfig;
  private markets: Map<string, Market> = new Map();
  private lastUpdated: Map<string, number> = new Map();
  private subscribedSymbols: Set<string> = new Set();
  
  constructor(config: MarketDataConfig) {
    this.config = config;
  }
  
  /**
   * Initialize the market data service
   */
  async initialize(): Promise<void> {
    try {
      // Load markets from database or API
      await this.loadMarkets();
      
      // Start subscription to real-time updates (in production)
      if (!this.config.useHistoricalData) {
        // In a real implementation, would connect to exchange websockets
        console.log('Initializing real-time market data streams');
      }
    } catch (error) {
      console.error('Error initializing market data service:', error);
    }
  }
  
  /**
   * Get available markets (trading pairs)
   */
  async getMarkets(
    exchange?: string,
    refresh: boolean = false
  ): Promise<Market[]> {
    if (refresh || this.markets.size === 0) {
      await this.loadMarkets(exchange);
    }
    
    if (exchange) {
      // Filter by exchange
      return Array.from(this.markets.values())
        .filter(m => m.info.exchange === exchange);
    } else {
      // Return all markets
      return Array.from(this.markets.values());
    }
  }
  
  /**
   * Get a specific market by symbol
   */
  async getMarket(
    symbol: string, 
    exchange: string = this.config.defaultExchange
  ): Promise<Market | null> {
    const key = `${exchange}:${symbol}`;
    
    if (!this.markets.has(key)) {
      // Try to load the market
      await this.loadMarket(symbol, exchange);
    }
    
    return this.markets.get(key) || null;
  }
  
  /**
   * Get candles (OHLCV) data for a symbol and timeframe
   */
  async getCandles(
    symbol: string,
    timeframe: TimeFrame,
    limit: number = 100,
    since?: number,
    exchange: string = this.config.defaultExchange
  ): Promise<OHLCV[]> {
    try {
      if (this.config.useHistoricalData) {
        // Use historical data from database
        return await this.getHistoricalCandles(
          symbol,
          timeframe,
          limit,
          since,
          exchange
        );
      } else {
        // Fetch from exchange API
        return await this.fetchCandlesFromExchange(
          symbol,
          timeframe,
          limit,
          since,
          exchange
        );
      }
    } catch (error) {
      console.error(`Error getting candles for ${symbol} ${timeframe}:`, error);
      return [];
    }
  }
  
  /**
   * Subscribe to real-time market data updates
   */
  async subscribeToMarketData(
    symbol: string,
    exchange: string = this.config.defaultExchange
  ): Promise<boolean> {
    const key = `${exchange}:${symbol}`;
    
    if (this.subscribedSymbols.has(key)) {
      return true; // Already subscribed
    }
    
    try {
      // In a real implementation, would subscribe to exchange websocket
      console.log(`Subscribing to market data for ${key}`);
      
      this.subscribedSymbols.add(key);
      
      return true;
    } catch (error) {
      console.error(`Error subscribing to market data for ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Unsubscribe from real-time market data updates
   */
  async unsubscribeFromMarketData(
    symbol: string,
    exchange: string = this.config.defaultExchange
  ): Promise<boolean> {
    const key = `${exchange}:${symbol}`;
    
    if (!this.subscribedSymbols.has(key)) {
      return true; // Not subscribed
    }
    
    try {
      // In a real implementation, would unsubscribe from exchange websocket
      console.log(`Unsubscribing from market data for ${key}`);
      
      this.subscribedSymbols.delete(key);
      
      return true;
    } catch (error) {
      console.error(`Error unsubscribing from market data for ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Load markets from database or API
   */
  private async loadMarkets(exchange?: string): Promise<void> {
    if (this.config.useHistoricalData) {
      await this.loadMarketsFromDatabase(exchange);
    } else {
      await this.fetchMarketsFromExchanges(exchange);
    }
  }
  
  /**
   * Load a specific market by symbol
   */
  private async loadMarket(
    symbol: string,
    exchange: string
  ): Promise<void> {
    const key = `${exchange}:${symbol}`;
    
    if (this.config.useHistoricalData) {
      // Load from database
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('elizaos_markets')
        .select('*')
        .eq('symbol', symbol)
        .eq('exchange', exchange)
        .single();
      
      if (error || !data) {
        console.error(`Error loading market ${key} from database:`, error);
        return;
      }
      
      // Convert to Market object
      this.markets.set(key, {
        info: {
          exchange: data.exchange,
          symbol: data.symbol,
          baseCurrency: data.base_currency,
          quoteCurrency: data.quote_currency,
          type: data.type,
          minOrderSize: data.min_order_size,
          pricePrecision: data.price_precision,
          sizePrecision: data.size_precision,
          tickSize: data.tick_size,
          minNotional: data.min_notional,
          leverage: data.leverage
        },
        lastPrice: data.last_price,
        lastUpdateTime: data.last_update_time,
        bid: data.bid,
        ask: data.ask,
        volume24h: data.volume_24h,
        priceChange24h: data.price_change_24h,
        priceChangePercent24h: data.price_change_percent_24h,
        high24h: data.high_24h,
        low24h: data.low_24h
      });
    } else {
      // Fetch from exchange API
      // In a real implementation, would call the exchange API
      console.log(`Fetching market ${key} from exchange API`);
      
      // Mock implementation
      this.markets.set(key, this.createMockMarket(symbol, exchange));
    }
  }
  
  /**
   * Load markets from database
   */
  private async loadMarketsFromDatabase(exchange?: string): Promise<void> {
    try {
      const supabase = createServerClient();
      
      let query = supabase.from('elizaos_markets').select('*');
      
      if (exchange) {
        query = query.eq('exchange', exchange);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading markets from database:', error);
        return;
      }
      
      // Clear existing markets if loading all
      if (!exchange) {
        this.markets.clear();
      }
      
      // Convert to Market objects
      for (const market of data) {
        const key = `${market.exchange}:${market.symbol}`;
        
        this.markets.set(key, {
          info: {
            exchange: market.exchange,
            symbol: market.symbol,
            baseCurrency: market.base_currency,
            quoteCurrency: market.quote_currency,
            type: market.type,
            minOrderSize: market.min_order_size,
            pricePrecision: market.price_precision,
            sizePrecision: market.size_precision,
            tickSize: market.tick_size,
            minNotional: market.min_notional,
            leverage: market.leverage
          },
          lastPrice: market.last_price,
          lastUpdateTime: market.last_update_time,
          bid: market.bid,
          ask: market.ask,
          volume24h: market.volume_24h,
          priceChange24h: market.price_change_24h,
          priceChangePercent24h: market.price_change_percent_24h,
          high24h: market.high_24h,
          low24h: market.low_24h
        });
      }
    } catch (error) {
      console.error('Error loading markets from database:', error);
    }
  }
  
  /**
   * Fetch markets from exchange APIs
   */
  private async fetchMarketsFromExchanges(exchange?: string): Promise<void> {
    try {
      const exchanges = exchange 
        ? [exchange] 
        : this.config.supportedExchanges;
      
      // Clear existing markets if loading all
      if (!exchange) {
        this.markets.clear();
      }
      
      for (const ex of exchanges) {
        // In a real implementation, would call the exchange API
        console.log(`Fetching markets from ${ex} exchange API`);
        
        // Mock implementation - generate some common trading pairs
        const mockSymbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT'];
        
        for (const symbol of mockSymbols) {
          const key = `${ex}:${symbol}`;
          this.markets.set(key, this.createMockMarket(symbol, ex));
        }
      }
    } catch (error) {
      console.error('Error fetching markets from exchanges:', error);
    }
  }
  
  /**
   * Get historical candles from database
   */
  private async getHistoricalCandles(
    symbol: string,
    timeframe: TimeFrame,
    limit: number,
    since?: number,
    exchange: string = this.config.defaultExchange
  ): Promise<OHLCV[]> {
    try {
      const supabase = createServerClient();
      
      let query = supabase
        .from('elizaos_candles')
        .select('*')
        .eq('symbol', symbol)
        .eq('exchange', exchange)
        .eq('timeframe', timeframe)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (since) {
        query = query.gt('timestamp', since);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`Error loading historical candles for ${symbol} ${timeframe}:`, error);
        return [];
      }
      
      // Convert to OHLCV array
      return data.map(candle => ({
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      }));
    } catch (error) {
      console.error(`Error loading historical candles for ${symbol} ${timeframe}:`, error);
      return [];
    }
  }
  
  /**
   * Fetch candles from exchange API
   */
  private async fetchCandlesFromExchange(
    symbol: string,
    timeframe: TimeFrame,
    limit: number,
    since?: number,
    exchange: string = this.config.defaultExchange
  ): Promise<OHLCV[]> {
    try {
      // In a real implementation, would call the exchange API
      console.log(`Fetching candles for ${symbol} ${timeframe} from ${exchange}`);
      
      // Mock implementation - generate random candles
      return this.generateMockCandles(symbol, timeframe, limit, since);
    } catch (error) {
      console.error(`Error fetching candles for ${symbol} ${timeframe} from ${exchange}:`, error);
      return [];
    }
  }
  
  /**
   * Create a mock market for development/testing
   */
  private createMockMarket(symbol: string, exchange: string): Market {
    const [base, quote] = symbol.split('/');
    
    const lastPrice = this.getRandomPrice(symbol);
    
    return {
      info: {
        exchange,
        symbol,
        baseCurrency: base,
        quoteCurrency: quote,
        type: 'spot',
        minOrderSize: 0.001,
        pricePrecision: 2,
        sizePrecision: 6,
        tickSize: 0.01,
        minNotional: 10,
        leverage: base === 'BTC' ? { max: 100, default: 10 } : undefined
      },
      lastPrice,
      lastUpdateTime: Date.now(),
      bid: lastPrice * 0.9995,
      ask: lastPrice * 1.0005,
      volume24h: Math.random() * 10000,
      priceChange24h: (Math.random() * 2 - 1) * lastPrice * 0.05,
      priceChangePercent24h: (Math.random() * 2 - 1) * 5,
      high24h: lastPrice * (1 + Math.random() * 0.03),
      low24h: lastPrice * (1 - Math.random() * 0.03)
    };
  }
  
  /**
   * Generate mock candles for development/testing
   */
  private generateMockCandles(
    symbol: string,
    timeframe: TimeFrame,
    limit: number,
    since?: number
  ): OHLCV[] {
    const candles: OHLCV[] = [];
    
    // Get a base price for the symbol
    const basePrice = this.getRandomPrice(symbol);
    
    // Calculate time interval based on timeframe
    const interval = this.timeframeToMilliseconds(timeframe);
    
    // Calculate start time (now - interval * limit)
    const startTime = since || Date.now() - interval * limit;
    
    // Generate random price movements with a slight trend
    let lastClose = basePrice;
    const trend = Math.random() * 0.1 - 0.05; // Random trend between -0.05 and 0.05
    
    for (let i = 0; i < limit; i++) {
      const timestamp = startTime + i * interval;
      
      // Random price movement with trend
      const changePercent = (Math.random() * 0.02 - 0.01) + trend;
      const close = lastClose * (1 + changePercent);
      
      // Generate high, low, and open
      const volatility = Math.random() * 0.01 + 0.005; // 0.5% to 1.5% volatility
      const high = close * (1 + volatility);
      const low = close * (1 - volatility);
      const open = lastClose;
      
      // Random volume
      const volume = Math.random() * 100 + 50;
      
      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
      
      lastClose = close;
    }
    
    return candles;
  }
  
  /**
   * Get a random but reasonable price for a symbol
   */
  private getRandomPrice(symbol: string): number {
    const [base] = symbol.split('/');
    
    switch (base) {
      case 'BTC':
        return 65000 + Math.random() * 5000;
      case 'ETH':
        return 3500 + Math.random() * 300;
      case 'SOL':
        return 150 + Math.random() * 20;
      case 'BNB':
        return 550 + Math.random() * 50;
      case 'XRP':
        return 0.5 + Math.random() * 0.1;
      default:
        return 10 + Math.random() * 10;
    }
  }
  
  /**
   * Convert timeframe string to milliseconds
   */
  private timeframeToMilliseconds(timeframe: TimeFrame): number {
    const amount = parseInt(timeframe.slice(0, -1), 10);
    const unit = timeframe.slice(-1);
    
    switch (unit) {
      case 'm': // minute
        return amount * 60 * 1000;
      case 'h': // hour
        return amount * 60 * 60 * 1000;
      case 'd': // day
        return amount * 24 * 60 * 60 * 1000;
      case 'w': // week
        return amount * 7 * 24 * 60 * 60 * 1000;
      default:
        return 60 * 1000; // default to 1 minute
    }
  }
  
  /**
   * Update market data in the database
   */
  private async updateMarketData(market: Market): Promise<void> {
    try {
      const supabase = createServerClient();
      
      const { error } = await supabase
        .from('elizaos_markets')
        .upsert({
          exchange: market.info.exchange,
          symbol: market.info.symbol,
          base_currency: market.info.baseCurrency,
          quote_currency: market.info.quoteCurrency,
          type: market.info.type,
          min_order_size: market.info.minOrderSize,
          price_precision: market.info.pricePrecision,
          size_precision: market.info.sizePrecision,
          tick_size: market.info.tickSize,
          min_notional: market.info.minNotional,
          leverage: market.info.leverage,
          last_price: market.lastPrice,
          last_update_time: market.lastUpdateTime,
          bid: market.bid,
          ask: market.ask,
          volume_24h: market.volume24h,
          price_change_24h: market.priceChange24h,
          price_change_percent_24h: market.priceChangePercent24h,
          high_24h: market.high24h,
          low_24h: market.low24h
        }, {
          onConflict: 'exchange,symbol'
        });
      
      if (error) {
        console.error(`Error updating market data for ${market.info.symbol}:`, error);
      }
    } catch (error) {
      console.error(`Error updating market data for ${market.info.symbol}:`, error);
    }
  }
}
