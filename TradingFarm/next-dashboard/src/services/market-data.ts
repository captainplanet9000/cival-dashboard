import { createServerClient } from '@/utils/supabase/server';

export interface MarketDataOptions {
  symbol: string;
  timeframe: string;
  limit?: number;
  startTime?: string;
  endTime?: string;
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Fetch market data from the available data sources
 */
export async function fetchMarketData(options: MarketDataOptions): Promise<Candle[]> {
  try {
    const supabase = createServerClient();
    
    // Check if we have cached data in our database
    const { data: cachedData, error: cacheError } = await supabase
      .from('market_data_cache')
      .select('*')
      .eq('symbol', options.symbol)
      .eq('timeframe', options.timeframe)
      .order('timestamp', { ascending: true });
    
    if (!cacheError && cachedData && cachedData.length > 0) {
      // Filter cached data based on time range if specified
      let filteredData = cachedData;
      
      if (options.startTime) {
        filteredData = filteredData.filter(d => 
          new Date(d.timestamp) >= new Date(options.startTime!)
        );
      }
      
      if (options.endTime) {
        filteredData = filteredData.filter(d => 
          new Date(d.timestamp) <= new Date(options.endTime!)
        );
      }
      
      // Apply limit if specified
      if (options.limit && filteredData.length > options.limit) {
        filteredData = filteredData.slice(-options.limit);
      }
      
      // Return cached data if available and sufficient
      if (filteredData.length > 0) {
        return filteredData.map(d => ({
          timestamp: d.timestamp,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume
        }));
      }
    }
    
    // If no cached data or insufficient, fetch from external source
    const data = await fetchFromExternalSource(options);
    
    // Cache the data for future use
    if (data.length > 0) {
      await cacheMarketData(options.symbol, options.timeframe, data);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching market data:', error);
    throw error;
  }
}

/**
 * Fetch market data from an external API source
 */
async function fetchFromExternalSource(options: MarketDataOptions): Promise<Candle[]> {
  // In a real implementation, this would connect to CoinAPI, Binance, etc.
  // For now, we'll generate mock data
  const data: Candle[] = [];
  const now = new Date();
  const startTime = options.startTime 
    ? new Date(options.startTime) 
    : new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // Default to 30 days ago
  
  const endTime = options.endTime 
    ? new Date(options.endTime) 
    : now;
  
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
  let timestamp = new Date(startTime.getTime());
  let lastClose = 50000; // Starting price
  
  while (timestamp <= endTime) {
    // Generate random price movement
    const change = lastClose * (0.5 - Math.random()) * 0.01; // +/- 0.5% random change
    const open = lastClose;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * Math.abs(change);
    const low = Math.min(open, close) - Math.random() * Math.abs(change);
    const volume = Math.random() * 100 + 50;
    
    data.push({
      timestamp: timestamp.toISOString(),
      open,
      high,
      low,
      close,
      volume
    });
    
    lastClose = close;
    timestamp = new Date(timestamp.getTime() + interval);
  }
  
  // Apply limit if specified
  if (options.limit && data.length > options.limit) {
    return data.slice(-options.limit);
  }
  
  return data;
}

/**
 * Cache market data in the database for future use
 */
async function cacheMarketData(symbol: string, timeframe: string, data: Candle[]): Promise<void> {
  try {
    const supabase = createServerClient();
    
    // Prepare data for insertion
    const cacheData = data.map(candle => ({
      symbol,
      timeframe,
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }));
    
    // Insert data in batches to avoid hitting size limits
    const batchSize = 100;
    for (let i = 0; i < cacheData.length; i += batchSize) {
      const batch = cacheData.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('market_data_cache')
        .upsert(batch, {
          onConflict: 'symbol,timeframe,timestamp',
          ignoreDuplicates: true
        });
      
      if (error) {
        console.error('Error caching market data:', error);
      }
    }
  } catch (error) {
    console.error('Error caching market data:', error);
  }
}
