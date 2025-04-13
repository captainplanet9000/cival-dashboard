import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { PostgrestError } from '@supabase/supabase-js';

// Historical data types
export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source?: string;
}

export interface HistoricalDataOptions {
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  source?: string;
  limit?: number;
}

export interface MarketDataSource {
  id: number;
  name: string;
  description: string;
  api_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get historical data for backtesting
 */
export async function getHistoricalData(options: HistoricalDataOptions): Promise<Candle[]> {
  const supabase = createBrowserClient();
  
  try {
    // Check if we have data in our cache
    const { data: cachedData, error: cacheError } = await supabase
      .rpc('get_historical_data', {
        p_symbol: options.symbol,
        p_timeframe: options.timeframe,
        p_start_date: options.startDate,
        p_end_date: options.endDate,
        p_source: options.source || null
      });
    
    if (cacheError) {
      console.error('Error fetching cached historical data:', cacheError);
      throw cacheError;
    }
    
    // If we have sufficient cached data, return it
    if (cachedData && cachedData.length > 0) {
      console.log(`Using ${cachedData.length} cached candles from database`);
      
      // Apply limit if specified
      if (options.limit && cachedData.length > options.limit) {
        return cachedData.slice(0, options.limit);
      }
      
      return cachedData;
    }
    
    // If no cache or insufficient data, fetch from external API
    const data = await fetchHistoricalDataFromExternalSource(options);
    
    // Cache the data for future use
    if (data.length > 0) {
      await cacheHistoricalData(options.symbol, options.timeframe, data, options.source || 'default');
    }
    
    return data;
  } catch (error) {
    console.error('Error in getHistoricalData:', error);
    
    // Return empty array on error
    return [];
  }
}

/**
 * Fetch historical data from an external API
 * This would be customized based on the exchange/provider being used
 */
async function fetchHistoricalDataFromExternalSource(options: HistoricalDataOptions): Promise<Candle[]> {
  // In a real implementation, this would fetch from Binance, Coinbase, etc.
  // For now, we'll generate mock data
  console.log('Fetching from external source:', options);
  
  const candles: Candle[] = [];
  const startTime = new Date(options.startDate);
  const endTime = new Date(options.endDate);
  
  // Determine interval in milliseconds based on timeframe
  let interval = 60000; // Default to 1 minute
  switch (options.timeframe) {
    case '1m': interval = 60000; break;
    case '5m': interval = 300000; break;
    case '15m': interval = 900000; break;
    case '30m': interval = 1800000; break;
    case '1h': interval = 3600000; break;
    case '4h': interval = 14400000; break;
    case '1d': interval = 86400000; break;
    case '1w': interval = 604800000; break;
  }
  
  // Generate mock data
  let time = new Date(startTime.getTime());
  let lastClose = 50000; // Starting price for BTC-like asset
  
  // Adjust starting price based on symbol
  if (options.symbol.includes('ETH')) {
    lastClose = 3000;
  } else if (options.symbol.includes('SOL')) {
    lastClose = 100;
  } else if (options.symbol.includes('DOGE')) {
    lastClose = 0.1;
  }
  
  while (time <= endTime) {
    // Generate random price movement (more realistic than pure random)
    const percentChange = (Math.random() * 2 - 1) * 0.5; // -0.5% to +0.5%
    const change = lastClose * (percentChange / 100);
    
    const open = lastClose;
    const close = open + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.002); // Up to 0.2% above max(open,close)
    const low = Math.min(open, close) * (1 - Math.random() * 0.002); // Up to 0.2% below min(open,close)
    const volume = Math.random() * 100 + 50; // Random volume between 50 and 150
    
    candles.push({
      timestamp: time.toISOString(),
      open,
      high,
      low,
      close,
      volume,
      source: options.source || 'mock'
    });
    
    lastClose = close;
    time = new Date(time.getTime() + interval);
  }
  
  // Apply limit if specified
  if (options.limit && candles.length > options.limit) {
    return candles.slice(0, options.limit);
  }
  
  return candles;
}

/**
 * Cache historical data in the database
 */
async function cacheHistoricalData(
  symbol: string,
  timeframe: string,
  data: Candle[],
  source: string
): Promise<void> {
  const supabase = createBrowserClient();
  
  try {
    // Prepare data for insertion
    const dataToInsert = data.map(candle => ({
      symbol,
      timeframe,
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      source: candle.source || source
    }));
    
    // Insert data in batches to avoid request size limits
    const batchSize = 100;
    for (let i = 0; i < dataToInsert.length; i += batchSize) {
      const batch = dataToInsert.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('historical_data')
        .upsert(batch, {
          onConflict: 'symbol,timeframe,timestamp,source',
          ignoreDuplicates: true
        });
      
      if (error) {
        console.error('Error caching historical data batch:', error);
      }
    }
    
    console.log(`Cached ${dataToInsert.length} candles for ${symbol} ${timeframe}`);
  } catch (error) {
    console.error('Error caching historical data:', error);
  }
}

/**
 * Get all available market data sources
 */
export async function getMarketDataSources(): Promise<MarketDataSource[]> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('market_data_sources')
      .select('*')
      .eq('status', 'active')
      .order('name');
    
    if (error) {
      throw error;
    }
    
    return data as MarketDataSource[];
  } catch (error) {
    console.error('Error fetching market data sources:', error);
    return [];
  }
}

/**
 * Check if we have historical data for a specific symbol and timeframe
 */
export async function checkHistoricalDataAvailability(
  symbol: string,
  timeframe: string,
  source?: string
): Promise<{ available: boolean; count: number; oldestDate: string | null; newestDate: string | null }> {
  const supabase = createBrowserClient();
  
  try {
    // Build the query
    let query = supabase
      .from('historical_data')
      .select('timestamp', { count: 'exact' })
      .eq('symbol', symbol)
      .eq('timeframe', timeframe);
    
    // Add source filter if provided
    if (source) {
      query = query.eq('source', source);
    }
    
    // Execute the query
    const { count, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // If we have data, get the date range
    if (count && count > 0) {
      // Get oldest date
      const { data: oldestData, error: oldestError } = await supabase
        .from('historical_data')
        .select('timestamp')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .order('timestamp', { ascending: true })
        .limit(1);
      
      if (oldestError) {
        throw oldestError;
      }
      
      // Get newest date
      const { data: newestData, error: newestError } = await supabase
        .from('historical_data')
        .select('timestamp')
        .eq('symbol', symbol)
        .eq('timeframe', timeframe)
        .order('timestamp', { ascending: false })
        .limit(1);
      
      if (newestError) {
        throw newestError;
      }
      
      return {
        available: true,
        count: count,
        oldestDate: oldestData && oldestData.length > 0 ? oldestData[0].timestamp : null,
        newestDate: newestData && newestData.length > 0 ? newestData[0].timestamp : null
      };
    }
    
    // No data available
    return {
      available: false,
      count: 0,
      oldestDate: null,
      newestDate: null
    };
  } catch (error) {
    console.error('Error checking historical data availability:', error);
    
    return {
      available: false,
      count: 0,
      oldestDate: null,
      newestDate: null
    };
  }
}
