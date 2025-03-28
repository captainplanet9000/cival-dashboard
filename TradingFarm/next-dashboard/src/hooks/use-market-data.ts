// use-market-data.ts
'use client';

import React from 'react';
import { getMarketData } from '@/services/supabase/trading-service';

export interface MarketData {
  symbol: string;
  exchange: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  percentChange24h: number;
  timestamp: number;
}

/**
 * Hook to subscribe to and manage market data for a trading pair
 * @param symbol The trading pair symbol (e.g., 'BTC/USDT')
 * @param exchange The exchange ID (optional)
 * @returns Market data, loading state, and any error
 */
export function useMarketData(symbol: string, exchange?: string) {
  const [data, setData] = React.useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;
    
    const fetchData = async () => {
      if (!symbol) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const marketData = await getMarketData(symbol, exchange || 'default');
        
        if (isMounted && marketData && marketData.length > 0) {
          setData(marketData[0]);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching market data:', err);
          setError(err instanceof Error ? err : new Error('Failed to fetch market data'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling interval for real-time updates
    intervalId = setInterval(fetchData, 5000); // Update every 5 seconds

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [symbol, exchange]);

  return { 
    data, 
    isLoading, 
    error 
  };
}
