import { BaseRepository, QueryOptions } from '../../lib/base-repository';
import { MarketData } from '../models/market-data';

/**
 * Extended query options specifically for market data
 */
export interface MarketDataQueryOptions extends QueryOptions {
  dataType?: MarketData['data_type'];
  symbol?: string;
  exchange?: string;
  timeframe?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * Repository implementation for MarketData entities
 */
export class MarketDataRepository extends BaseRepository<MarketData> {
  constructor() {
    super('market_data');
  }

  /**
   * Find latest market data for a specific symbol and exchange
   */
  async findLatestBySymbol(symbol: string, exchange: string, dataType: MarketData['data_type'] = 'ticker'): Promise<MarketData | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('symbol', symbol)
      .eq('exchange', exchange)
      .eq('data_type', dataType)
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
   * Find market data with advanced filtering
   */
  async findWithFilters(options: MarketDataQueryOptions = {}): Promise<MarketData[]> {
    let query = this.client
      .from(this.tableName)
      .select('*');
    
    // Apply filters
    if (options.dataType) {
      query = query.eq('data_type', options.dataType);
    }
    
    if (options.symbol) {
      query = query.eq('symbol', options.symbol);
    }
    
    if (options.exchange) {
      query = query.eq('exchange', options.exchange);
    }
    
    if (options.timeframe) {
      query = query.eq('timeframe', options.timeframe);
    }
    
    if (options.fromDate) {
      query = query.gte('fetched_at', options.fromDate);
    }
    
    if (options.toDate) {
      query = query.lte('fetched_at', options.toDate);
    }
    
    // Apply standard query options
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderDirection !== 'desc' });
    } else {
      query = query.order('fetched_at', { ascending: false });
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as MarketData[];
  }

  /**
   * Find candle data for a specific timeframe
   */
  async findCandles(
    symbol: string, 
    exchange: string, 
    timeframe: string, 
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
    
    return data as MarketData[];
  }

  /**
   * Get available symbols with latest data
   */
  async getAvailableSymbols(exchange?: string): Promise<string[]> {
    let query = this.client
      .from(this.tableName)
      .select('symbol')
      .eq('data_type', 'ticker')
      .is('symbol', 'not.null');
    
    if (exchange) {
      query = query.eq('exchange', exchange);
    }
    
    const { data, error } = await query.distinct();
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data.map((item: { symbol: string }) => item.symbol);
  }

  /**
   * Get available exchanges
   */
  async getAvailableExchanges(): Promise<string[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('exchange')
      .is('exchange', 'not.null')
      .distinct();
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data.map((item: { exchange: string }) => item.exchange);
  }

  /**
   * Store market data batch
   */
  async storeBatch(marketData: Partial<MarketData>[]): Promise<boolean> {
    // Ensure all entries have a fetched_at timestamp
    const dataWithTimestamps = marketData.map(item => ({
      ...item,
      fetched_at: item.fetched_at || new Date().toISOString(),
      created_at: new Date().toISOString()
    }));
    
    const { error } = await this.client
      .from(this.tableName)
      .insert(dataWithTimestamps);
    
    if (error) {
      this.handleError(error);
      return false;
    }
    
    return true;
  }

  /**
   * Calculate and store derived market data
   */
  async calculateDerivedData(
    symbol: string, 
    exchange: string, 
    calculation: 'vwap' | 'sma' | 'ema' | 'rsi',
    period: number = 14,
    options: Record<string, any> = {}
  ): Promise<MarketData | null> {
    // This would typically call a stored procedure or function in the database
    // that calculates the derived data
    const { data, error } = await this.client.rpc('calculate_market_indicator', {
      p_symbol: symbol,
      p_exchange: exchange,
      p_calculation: calculation,
      p_period: period,
      p_options: options
    });
    
    if (error) {
      this.handleError(error);
      return null;
    }
    
    return data as MarketData;
  }
} 