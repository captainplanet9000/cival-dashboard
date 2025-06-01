/**
 * Real-time market data hook for Trading Farm Dashboard
 * Leverages React Query + WebSockets for instant updates
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { MarketData } from '@/hooks/queries/use-market-data';

// Optimized interface for market data updates
export interface RealTimeMarketData extends MarketData {
  isLive?: boolean;  // Indicates data is from a live update
  lastUpdatedMs?: number; // Timestamp for age calculations
}

// Options for controlling update behavior
export interface RealTimeMarketDataOptions {
  symbols: string[];  // Required symbols to watch
  exchange?: string;
  throttleMs?: number; // Throttle updates to prevent UI jank (defaults to 300ms)
  staleTimeMs?: number; // How long data stays fresh (defaults to 15s)
  includeOrderBook?: boolean; // Include order book data
  includeRecentTrades?: boolean; // Include recent trades
  onUpdate?: (data: RealTimeMarketData) => void; // Optional callback for updates
}

/**
 * Hook for real-time market data with WebSocket support and performance optimizations
 * @param options Configuration for real-time updates
 */
export function useRealTimeMarketData({
  symbols,
  exchange,
  throttleMs = 300,
  staleTimeMs = 15000,
  includeOrderBook = false,
  includeRecentTrades = false,
  onUpdate
}: RealTimeMarketDataOptions) {
  const queryClient = useQueryClient();
  const supabase = createBrowserClient<Database>();
  const lastUpdateTimestamps = useRef<Record<string, number>>({});
  const throttleTimers = useRef<Record<string, NodeJS.Timeout>>({});
  
  // Initial data load (higher stale time for real-time data)
  const query = useQuery<RealTimeMarketData[]>({
    queryKey: ['marketData', 'realtime', { symbols, exchange }],
    queryFn: async () => {
      // Initial load from Supabase
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .in('symbol', symbols)
        .eq('exchange', exchange || 'binance');
        
      if (error) throw error;
      
      // Format data for UI consumption
      return (data || []).map(item => ({
        symbol: item.symbol,
        price: item.price,
        change24h: item.change_24h,
        volume24h: item.volume_24h,
        high24h: item.high_24h,
        low24h: item.low_24h,
        lastUpdated: item.updated_at,
        lastUpdatedMs: Date.now(),
      }));
    },
    staleTime: staleTimeMs,
    gcTime: staleTimeMs * 2,
    refetchInterval: staleTimeMs,
  });

  // WebSocket subscription
  useEffect(() => {
    if (!symbols.length) return;
    
    const channel = supabase.channel(`market-data-${symbols.join('-')}`)
      .on('broadcast', { event: 'market-update' }, (payload) => {
        if (!payload.payload) return;
        
        const updates = payload.payload as Record<string, any>;
        
        // Process each symbol's update
        Object.keys(updates).forEach(symbol => {
          // Skip if not in our watched symbols
          if (!symbols.includes(symbol)) return;
          
          const now = Date.now();
          const lastUpdate = lastUpdateTimestamps.current[symbol] || 0;
          
          // Throttle updates to prevent UI jank
          if (now - lastUpdate < throttleMs) {
            // Clear existing timeout if any
            if (throttleTimers.current[symbol]) {
              clearTimeout(throttleTimers.current[symbol]);
            }
            
            // Set new throttled update
            throttleTimers.current[symbol] = setTimeout(() => {
              processMarketUpdate(symbol, updates[symbol]);
              delete throttleTimers.current[symbol];
            }, throttleMs);
            
            return;
          }
          
          // Process update immediately if not throttled
          processMarketUpdate(symbol, updates[symbol]);
          lastUpdateTimestamps.current[symbol] = now;
        });
      })
      .subscribe();
      
    return () => {
      // Clean up timers
      Object.values(throttleTimers.current).forEach(timer => clearTimeout(timer));
      
      // Unsubscribe from channel
      channel.unsubscribe();
    };
  }, [symbols.join(','), exchange, throttleMs]);

  // Process market data updates
  const processMarketUpdate = (symbol: string, data: any) => {
    // Use query client to update cache directly
    queryClient.setQueryData(
      ['marketData', 'realtime', { symbols, exchange }],
      (oldData: RealTimeMarketData[] = []) => {
        // Find and update existing symbol data
        const newData = oldData.map(item => {
          if (item.symbol !== symbol) return item;
          
          const updatedItem = {
            ...item,
            price: data.price || item.price,
            change24h: data.change_24h || item.change24h,
            lastUpdatedMs: Date.now(),
            isLive: true,
          };
          
          // Call the update callback if provided
          if (onUpdate) {
            onUpdate(updatedItem);
          }
          
          return updatedItem;
        });
        
        return newData;
      }
    );
  };

  return {
    ...query,
    // Memoize data to prevent unnecessary rerenders
    data: query.data || [],
  };
}

export default useRealTimeMarketData;
