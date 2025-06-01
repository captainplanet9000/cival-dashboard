/**
 * Market-related React Query Hooks
 * 
 * This module provides hooks for fetching market data from the Trading Farm API
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase/client';
import { getCacheTimeForEntity } from '@/utils/react-query/enhanced-cache-config';

// Types
export interface MarketData {
  id: string;
  exchange: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  lastUpdated: string;
}

// Query Keys
export const marketKeys = {
  all: ['markets'] as const,
  lists: () => [...marketKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => 
    [...marketKeys.lists(), { ...filters }] as const,
  details: () => [...marketKeys.all, 'detail'] as const,
  detail: (id: string) => [...marketKeys.details(), id] as const,
};

/**
 * Fetch market data with optional filters
 */
export const useMarketData = (
  farmId?: string, 
  filters: Record<string, unknown> = {}
) => {
  return useQuery({
    queryKey: marketKeys.list({ farmId, ...filters }),
    queryFn: async () => {
      // Initially return mock data
      const mockData: MarketData[] = [
        {
          id: '1',
          exchange: 'Binance',
          symbol: 'BTC/USDT',
          price: 67890.45,
          priceChange24h: 1230.50,
          priceChangePercent24h: 1.85,
          volume24h: 2345670000,
          high24h: 68123.45,
          low24h: 66789.10,
          lastUpdated: new Date().toISOString(),
        },
        {
          id: '2',
          exchange: 'Binance',
          symbol: 'ETH/USDT',
          price: 3456.78,
          priceChange24h: 87.65,
          priceChangePercent24h: 2.60,
          volume24h: 987654000,
          high24h: 3500.00,
          low24h: 3400.00,
          lastUpdated: new Date().toISOString(),
        },
        {
          id: '3',
          exchange: 'Bybit',
          symbol: 'SOL/USDT',
          price: 145.67,
          priceChange24h: 5.43,
          priceChangePercent24h: 3.87,
          volume24h: 456789000,
          high24h: 148.90,
          low24h: 140.20,
          lastUpdated: new Date().toISOString(),
        }
      ];
      
      // TODO: Replace with actual API call
      // const { data, error } = await supabase
      //   .from('market_data')
      //   .select('*')
      //   .eq('farm_id', farmId)
      //   .order('updated_at', { ascending: false });
      
      // if (error) throw new Error(`Error fetching market data: ${error.message}`);
      
      return mockData;
    },
    staleTime: getCacheTimeForEntity('market').staleTime,
    gcTime: getCacheTimeForEntity('market').gcTime,
    enabled: !!farmId,
    refetchInterval: 30000, // Refetch every 30 seconds for market data
  });
};

/**
 * Fetch details for a specific market
 */
export const useMarketDetails = (marketId: string) => {
  return useQuery({
    queryKey: marketKeys.detail(marketId),
    queryFn: async () => {
      // TODO: Implement actual API call
      // const { data, error } = await supabase
      //   .from('market_data')
      //   .select('*')
      //   .eq('id', marketId)
      //   .single();
      
      // if (error) throw new Error(`Error fetching market details: ${error.message}`);
      
      return {
        id: marketId,
        exchange: 'Binance',
        symbol: 'BTC/USDT',
        price: 67890.45,
        priceChange24h: 1230.50,
        priceChangePercent24h: 1.85,
        volume24h: 2345670000,
        high24h: 68123.45,
        low24h: 66789.10,
        lastUpdated: new Date().toISOString(),
        // Additional details only available in detailed view
        openInterest: 123456789,
        fundingRate: 0.0012,
        marketCap: 1234567890000,
        tradingFee: 0.0005,
        orderTypes: ['limit', 'market', 'stop', 'take_profit'],
        leverageOptions: [1, 2, 3, 5, 10, 20, 50, 100],
      };
    },
    staleTime: getCacheTimeForEntity('market').staleTime,
    gcTime: getCacheTimeForEntity('market').gcTime,
    enabled: !!marketId,
  });
};
