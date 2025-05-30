import { BaseEntity, BaseRepository } from '../lib/base-repository';

/**
 * Market Data entity interface
 */
export interface MarketData extends BaseEntity {
  symbol: string;
  exchange: string;
  data_type: 'ticker' | 'orderbook' | 'trade' | 'candle';
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
  data: {
    price?: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
    bid?: number;
    ask?: number;
    last?: number;
    vwap?: number;
    timestamp?: string;
    bids?: [number, number][]; // [price, amount]
    asks?: [number, number][]; // [price, amount]
    [key: string]: any;
  };
  fetched_at: string;
  source: string;
}

/**
 * Repository implementation for Market Data
 */
export class MarketDataRepository extends BaseRepository<MarketData> {
  constructor() {
    super('market_data');
  }

  /**
   * Create a new market data entry
   * @param marketData The market data to create (without id and timestamps)
   * @returns The created market data with id and timestamps
   */
  async create(marketData: Omit<MarketData, 'id' | 'created_at' | 'updated_at'>): Promise<MarketData> {
    try {
      // Ensure timeframe is set as it's required by the schema
      if (!marketData.timeframe) {
        marketData.timeframe = '1m'; // Default to 1 minute timeframe if not specified
      }
      
      return await super.create(marketData);
    } catch (error) {
      console.error('Error in market_data repository:', error);
      throw error;
    }
  }

  /**
   * Find latest ticker data for a symbol
   */
  async findLatestTicker(symbol: string, exchange: string = 'binance'): Promise<MarketData | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('symbol', symbol)
      .eq('exchange', exchange)
      .eq('data_type', 'ticker')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      this.handleError(error);
      return null;
    }

    return data as MarketData;
  }

  /**
   * Find latest orderbook data for a symbol
   */
  async findLatestOrderbook(symbol: string, exchange: string = 'binance'): Promise<MarketData | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('symbol', symbol)
      .eq('exchange', exchange)
      .eq('data_type', 'orderbook')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      this.handleError(error);
      return null;
    }

    return data as MarketData;
  }

  /**
   * Find recent trades for a symbol
   */
  async findRecentTrades(symbol: string, exchange: string = 'binance', limit: number = 50): Promise<MarketData[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('symbol', symbol)
      .eq('exchange', exchange)
      .eq('data_type', 'trade')
      .order('fetched_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.handleError(error);
      return [];
    }

    return data as MarketData[];
  }

  /**
   * Find candles for a symbol and timeframe
   */
  async findCandles(
    symbol: string, 
    timeframe: MarketData['timeframe'] = '1h', 
    exchange: string = 'binance',
    limit: number = 100
  ): Promise<MarketData[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('symbol', symbol)
      .eq('exchange', exchange)
      .eq('data_type', 'candle')
      .eq('timeframe', timeframe)
      .order('fetched_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.handleError(error);
      return [];
    }

    // Sort by timestamp ascending since we want oldest to newest for charts
    return (data as MarketData[]).sort((a, b) => {
      // Parse ISO strings to compare timestamps
      const aTime = a.data.timestamp ? new Date(a.data.timestamp).getTime() : 0;
      const bTime = b.data.timestamp ? new Date(b.data.timestamp).getTime() : 0;
      return aTime - bTime;
    });
  }

  /**
   * Get price comparison across multiple exchanges
   */
  async getPriceComparison(symbol: string, exchanges: string[] = ['binance', 'coinbase', 'ftx']): Promise<any[]> {
    const results: any[] = [];

    // Query each exchange in parallel
    const exchangeQueries = exchanges.map(async (exchange) => {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('symbol', symbol)
        .eq('exchange', exchange)
        .eq('data_type', 'ticker')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error(`Error fetching ${exchange} data:`, error);
        return null;
      }

      return {
        exchange,
        price: data?.data?.price || data?.data?.last,
        bid: data?.data?.bid,
        ask: data?.data?.ask,
        volume: data?.data?.volume,
        fetched_at: data?.fetched_at,
        spread: data?.data?.ask && data?.data?.bid 
          ? ((data.data.ask - data.data.bid) / data.data.bid * 100).toFixed(4) 
          : null
      };
    });

    const exchangeResults = await Promise.all(exchangeQueries);
    return exchangeResults.filter(Boolean);
  }

  /**
   * Get the latest market data entry for a symbol
   * @param symbol The symbol to get data for (e.g. BTC/USD)
   * @param timeframe The timeframe to get data for (e.g. 1m, 5m, 1h)
   * @returns The latest market data for the symbol
   */
  async getLatestForSymbol(symbol: string, timeframe: string = '1m'): Promise<MarketData | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      return data && data.length > 0 ? data[0] as MarketData : null;
    } catch (error) {
      console.error('Error getting latest market data:', error);
      throw error;
    }
  }

  /**
   * Get historical market data for a symbol
   * @param symbol The symbol to get data for (e.g. BTC/USD) 
   * @param timeframe The timeframe to get data for (e.g. 1m, 5m, 1h)
   * @param limit Max number of records to return
   * @returns Array of market data ordered by timestamp
   */
  async getHistoricalData(
    symbol: string,
    timeframe: string = '1m',
    limit: number = 100
  ): Promise<MarketData[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw error;
      }
      
      return data as MarketData[];
    } catch (error) {
      console.error('Error getting historical market data:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time market data updates
   * @param callback Function to call when new data is received
   * @param symbol Optional symbol filter
   * @param timeframe Optional timeframe filter (defaults to 1m)
   * @returns Subscription object that can be used to unsubscribe
   */
  subscribeToMarketData(
    callback: (data: MarketData) => void,
    symbol?: string,
    timeframe: string = '1m'
  ) {
    const client = this.client;
    
    // Create a realtime channel
    const channel = client.channel('market-data-changes');
    
    // Set up the subscription with filters
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_data',
          filter: symbol ? `symbol=eq.${symbol}` : undefined
        },
        (payload: { new: MarketData }) => {
          // If timeframe filter is provided, only call callback for matching records
          if (!timeframe || payload.new.timeframe === timeframe) {
            callback(payload.new);
          }
        }
      )
      .subscribe();
    
    // Return the channel so the caller can unsubscribe
    return channel;
  }

  /**
   * Unsubscribe from a market data subscription
   * @param subscription The subscription to unsubscribe from
   */
  unsubscribe(subscription: any) {
    subscription.unsubscribe();
  }
}
