/**
 * Market data fetch hook for Trading Farm Dashboard
 * Provides type-safe access to market data with caching and error handling
 */
import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';

// Strongly typed market data interface
export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  lastUpdated: string;
}

// Optional filter parameters
export interface MarketDataParams {
  exchange?: string;
  symbols?: string[];
  limit?: number;
}

/**
 * Fetches real-time market data from Trading Farm's data service
 * @param params Optional filter parameters (exchange, symbols, limit)
 * @returns Query result with typed market data, loading state, and error handling
 */
export function useMarketData(params?: MarketDataParams) {
  const { exchange, symbols, limit = 20 } = params || {};
  const supabase = createBrowserClient<Database>();
  
  return useQuery<MarketData[], Error>({
    queryKey: ['marketData', { exchange, symbols, limit }],
    queryFn: async () => {
      try {
        // First try to get data from Supabase if available
        let query = supabase.from('market_data').select('*');
        
        if (exchange) {
          query = query.eq('exchange', exchange);
        }
        
        if (symbols && symbols.length > 0) {
          query = query.in('symbol', symbols);
        }
        
        query = query.limit(limit);
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          return data.map(item => ({
            symbol: item.symbol,
            price: item.price,
            change24h: item.change_24h,
            volume24h: item.volume_24h,
            high24h: item.high_24h,
            low24h: item.low_24h,
            lastUpdated: item.updated_at
          }));
        }
        
        // Fallback to API if no data in Supabase
        const response = await fetch(`/api/market-data?${new URLSearchParams({
          ...(exchange ? { exchange } : {}),
          ...(symbols ? { symbols: symbols.join(',') } : {}),
          limit: limit.toString()
        })}`);
        
        if (!response.ok) {
          throw new Error(`Market data fetch failed: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Market data fetch error:', error);
        throw error;
      }
    },
    staleTime: 15000, // 15 seconds before data is considered stale
    refetchInterval: 30000, // refetch every 30 seconds
  });
}

export default useMarketData;
