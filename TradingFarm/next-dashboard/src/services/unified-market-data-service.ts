/**
 * Unified Market Data Service
 * 
 * Provides normalized market data across different exchanges
 * Creates a consistent interface regardless of the data source
 */

import { ExchangeType } from './exchange-service';
import { ExchangeDataType } from './exchange-websocket-service';
import bybitTradingService from './bybit-trading-service';
import hyperliquidTradingService from './hyperliquid-trading-service';
import { ApiResponse } from '@/types/api';
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';

// Unified Market Data Types
export interface MarketTicker {
  symbol: string;
  exchange: ExchangeType;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  volume24h: number;
  quoteVolume24h: number;
  high24h: number;
  low24h: number;
  change24h: number; // Percentage
  changeAmount24h: number; // Absolute
  timestamp: string;
}

export interface MarketCandle {
  symbol: string;
  exchange: ExchangeType;
  interval: string;
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
}

export interface MarketTrade {
  symbol: string;
  exchange: ExchangeType;
  id: string;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  timestamp: string;
}

export interface OrderbookLevel {
  price: number;
  amount: number;
}

export interface MarketOrderbook {
  symbol: string;
  exchange: ExchangeType;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  timestamp: string;
}

// Cache settings
const CACHE_TTL = {
  TICKER: 5 * 1000, // 5 seconds
  CANDLE: 60 * 1000, // 1 minute
  ORDERBOOK: 2 * 1000, // 2 seconds
  TRADE: 1 * 1000, // 1 second
};

// Unified Market Data Service
export class UnifiedMarketDataService {
  private cache: {
    tickers: Map<string, { data: MarketTicker; timestamp: number }>;
    candles: Map<string, { data: MarketCandle[]; timestamp: number }>;
    orderbooks: Map<string, { data: MarketOrderbook; timestamp: number }>;
    trades: Map<string, { data: MarketTrade[]; timestamp: number }>;
  };

  constructor() {
    this.cache = {
      tickers: new Map(),
      candles: new Map(),
      orderbooks: new Map(),
      trades: new Map(),
    };
  }

  /**
   * Get ticker data for a symbol from a specific exchange
   */
  async getTicker(exchange: ExchangeType, symbol: string): Promise<ApiResponse<MarketTicker>> {
    try {
      // Check cache first
      const cacheKey = `${exchange}:${symbol}`;
      const cachedData = this.cache.tickers.get(cacheKey);
      
      if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL.TICKER)) {
        return {
          success: true,
          data: cachedData.data,
        };
      }
      
      // Fetch fresh data
      switch (exchange) {
        case 'bybit': {
          const response = await bybitTradingService.getTicker({ apiKey: '', apiSecret: '', testnet: false }, 'linear', symbol);
          
          if (response.success && response.data) {
            const rawData = response.data;
            const normalizedData: MarketTicker = {
              symbol,
              exchange,
              lastPrice: parseFloat(rawData.lastPrice),
              bidPrice: parseFloat(rawData.bidPrice),
              askPrice: parseFloat(rawData.askPrice),
              volume24h: parseFloat(rawData.volume24h),
              quoteVolume24h: parseFloat(rawData.quoteVolume24h || '0'),
              high24h: parseFloat(rawData.highPrice24h),
              low24h: parseFloat(rawData.lowPrice24h),
              change24h: parseFloat(rawData.priceChangePercent24h),
              changeAmount24h: parseFloat(rawData.priceChange24h || '0'),
              timestamp: new Date(rawData.time || Date.now()).toISOString(),
            };
            
            // Update cache
            this.cache.tickers.set(cacheKey, {
              data: normalizedData,
              timestamp: Date.now(),
            });
            
            return {
              success: true,
              data: normalizedData,
            };
          }
          
          return {
            success: false,
            error: response.error || 'Failed to fetch ticker data from Bybit',
          };
        }
        
        case 'hyperliquid': {
          const response = await hyperliquidTradingService.getMarketData(symbol);
          
          if (response.success && response.data) {
            const rawData = response.data;
            const normalizedData: MarketTicker = {
              symbol,
              exchange,
              lastPrice: parseFloat(rawData.markPrice || rawData.lastPrice),
              bidPrice: parseFloat(rawData.bidPrice || rawData.bids?.[0]?.[0] || '0'),
              askPrice: parseFloat(rawData.askPrice || rawData.asks?.[0]?.[0] || '0'),
              volume24h: parseFloat(rawData.volume24h || '0'),
              quoteVolume24h: parseFloat(rawData.quoteVolume24h || '0'),
              high24h: parseFloat(rawData.high24h || '0'),
              low24h: parseFloat(rawData.low24h || '0'),
              change24h: parseFloat(rawData.priceChangePercent24h || '0'),
              changeAmount24h: parseFloat(rawData.priceChange24h || '0'),
              timestamp: new Date().toISOString(),
            };
            
            // Update cache
            this.cache.tickers.set(cacheKey, {
              data: normalizedData,
              timestamp: Date.now(),
            });
            
            return {
              success: true,
              data: normalizedData,
            };
          }
          
          return {
            success: false,
            error: response.error || 'Failed to fetch ticker data from Hyperliquid',
          };
        }
        
        default:
          return {
            success: false,
            error: `Exchange ${exchange} not supported`,
          };
      }
    } catch (error: any) {
      console.error('Error fetching ticker data:', error);
      
      return {
        success: false,
        error: error.message || 'Unknown error fetching ticker data',
      };
    }
  }
  
  /**
   * Get candles (OHLCV) data for a symbol from a specific exchange
   */
  async getCandles(
    exchange: ExchangeType, 
    symbol: string, 
    interval: string,
    limit: number = 100,
    startTime?: number,
    endTime?: number
  ): Promise<ApiResponse<MarketCandle[]>> {
    try {
      // Generate cache key based on all parameters
      const cacheKey = `${exchange}:${symbol}:${interval}:${limit}:${startTime || ''}:${endTime || ''}`;
      const cachedData = this.cache.candles.get(cacheKey);
      
      // Use cache if available and not expired
      if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL.CANDLE)) {
        return {
          success: true,
          data: cachedData.data,
        };
      }
      
      // Fetch fresh data
      switch (exchange) {
        case 'bybit': {
          const response = await bybitTradingService.getKlines(
            { apiKey: '', apiSecret: '', testnet: false },
            'linear',
            symbol,
            interval,
            limit,
            startTime,
            endTime
          );
          
          if (response.success && response.data && response.data.list) {
            const normalizedData: MarketCandle[] = response.data.list.map((item: any) => ({
              symbol,
              exchange,
              interval,
              openTime: new Date(item.openTime).toISOString(),
              open: parseFloat(item.open),
              high: parseFloat(item.high),
              low: parseFloat(item.low),
              close: parseFloat(item.close),
              volume: parseFloat(item.volume),
              quoteVolume: parseFloat(item.quoteVolume || '0'),
            }));
            
            // Update cache
            this.cache.candles.set(cacheKey, {
              data: normalizedData,
              timestamp: Date.now(),
            });
            
            return {
              success: true,
              data: normalizedData,
            };
          }
          
          return {
            success: false,
            error: response.error || 'Failed to fetch candle data from Bybit',
          };
        }
        
        default:
          return {
            success: false,
            error: `Exchange ${exchange} not supported for candle data`,
          };
      }
    } catch (error: any) {
      console.error('Error fetching candle data:', error);
      
      return {
        success: false,
        error: error.message || 'Unknown error fetching candle data',
      };
    }
  }
  
  /**
   * Save market data to the database for historical analysis
   */
  async saveMarketData(dataType: ExchangeDataType, data: any): Promise<boolean> {
    try {
      let supabase;
      
      // Determine if we're in a server or client component
      if (typeof window === 'undefined') {
        supabase = createServerClient();
      } else {
        supabase = createBrowserClient();
      }
      
      // Format the data for storage
      const storageData = {
        data_type: dataType,
        exchange: data.exchange,
        symbol: data.symbol,
        data: data,
        timestamp: new Date().toISOString(),
      };
      
      // Insert into the market_data table
      const { error } = await supabase
        .from('market_data')
        .insert(storageData);
      
      if (error) {
        console.error('Failed to save market data:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error saving market data:', error);
      return false;
    }
  }
  
  /**
   * Get historical market data from the database
   */
  async getHistoricalData(
    exchange: ExchangeType,
    symbol: string,
    dataType: ExchangeDataType,
    startTime: string,
    endTime: string,
    limit: number = 1000
  ): Promise<ApiResponse<any[]>> {
    try {
      let supabase;
      
      // Determine if we're in a server or client component
      if (typeof window === 'undefined') {
        supabase = createServerClient();
      } else {
        supabase = createBrowserClient();
      }
      
      // Query the market_data table
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .eq('exchange', exchange)
        .eq('symbol', symbol)
        .eq('data_type', dataType)
        .gte('timestamp', startTime)
        .lte('timestamp', endTime)
        .order('timestamp', { ascending: true })
        .limit(limit);
      
      if (error) {
        return {
          success: false,
          error: `Failed to fetch historical data: ${error.message}`,
        };
      }
      
      // Extract the actual data from each record
      const extractedData = data.map(record => record.data);
      
      return {
        success: true,
        data: extractedData,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error fetching historical data',
      };
    }
  }
}

// Export singleton instance
const unifiedMarketDataService = new UnifiedMarketDataService();
export default unifiedMarketDataService;
