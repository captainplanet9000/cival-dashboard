'use client';

import React from 'react';
const { useState, useEffect } = React;
import { useSocket } from '@/providers/socket-provider';
import { createBrowserClient } from '@/utils/supabase/client';

// Development flag to use mock data
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

interface MarketAsset {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
  high24h?: number;
  low24h?: number;
}

interface MarketData {
  assets: MarketAsset[];
  timestamp: string;
  topGainers: MarketAsset[];
  topLosers: MarketAsset[];
  marketSentiment: 'Bullish' | 'Bearish' | 'Neutral';
  fearGreedIndex?: number;
}

// Mock market data for development
const MOCK_MARKET_DATA: MarketData = {
  assets: [
    { symbol: 'BTC/USD', price: 52890, change24h: 1.8, volume24h: 23.4e9, high24h: 53100, low24h: 51200 },
    { symbol: 'ETH/USD', price: 2890, change24h: 3.2, volume24h: 12.1e9, high24h: 2950, low24h: 2780 },
    { symbol: 'SOL/USD', price: 135.2, change24h: 4.5, volume24h: 5.6e9, high24h: 138.8, low24h: 129.5 },
    { symbol: 'AVAX/USD', price: 37.9, change24h: 2.3, volume24h: 1.8e9, high24h: 38.5, low24h: 36.1 },
    { symbol: 'BNB/USD', price: 410.5, change24h: -0.8, volume24h: 3.2e9, high24h: 415.3, low24h: 405.2 },
  ],
  timestamp: new Date().toISOString(),
  topGainers: [
    { symbol: 'SOL/USD', price: 135.2, change24h: 4.5, volume24h: 5.6e9 },
    { symbol: 'ETH/USD', price: 2890, change24h: 3.2, volume24h: 12.1e9 },
    { symbol: 'AVAX/USD', price: 37.9, change24h: 2.3, volume24h: 1.8e9 },
  ],
  topLosers: [
    { symbol: 'BNB/USD', price: 410.5, change24h: -0.8, volume24h: 3.2e9 },
    { symbol: 'DOT/USD', price: 8.2, change24h: -1.2, volume24h: 0.9e9 },
    { symbol: 'DOGE/USD', price: 0.12, change24h: -2.5, volume24h: 1.1e9 },
  ],
  marketSentiment: 'Bullish',
  fearGreedIndex: 65,
};

export function useMarketData() {
  const [data, setData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { subscribe, latestMessages } = useSocket();
  const supabase = createBrowserClient();

  // Initial data fetch
  useEffect(() => {
    async function fetchMarketData() {
      setIsLoading(true);
      
      // If in development mode and USE_MOCK_DATA is true, use mock data
      if (USE_MOCK_DATA) {
        console.log('Using mock market data');
        setData(MOCK_MARKET_DATA);
        setIsLoading(false);
        return;
      }
      
      try {
        // Fetch from Supabase in production or when mock data is disabled
        const { data: marketData, error } = await supabase
          .from('market_data')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;

        if (marketData) {
          setData({
            assets: marketData.assets || MOCK_MARKET_DATA.assets,
            timestamp: marketData.timestamp || new Date().toISOString(),
            topGainers: marketData.top_gainers || MOCK_MARKET_DATA.topGainers,
            topLosers: marketData.top_losers || MOCK_MARKET_DATA.topLosers,
            marketSentiment: marketData.market_sentiment || MOCK_MARKET_DATA.marketSentiment,
            fearGreedIndex: marketData.fear_greed_index || MOCK_MARKET_DATA.fearGreedIndex,
          });
        }
      } catch (err) {
        // Log error but not in development mode with mock data enabled
        if (!USE_MOCK_DATA) {
          console.error('Error fetching market data:', err);
        }
        
        setError(err instanceof Error ? err : new Error(String(err)));
        // Use fallback data
        setData(MOCK_MARKET_DATA);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMarketData();

    // Subscribe to market updates via WebSocket
    subscribe('MARKET_UPDATE');
    subscribe('PRICE_TICK');

    return () => {
      // No need to unsubscribe as the hook handles this
    };
  }, [supabase, subscribe]);

  // Listen for real-time updates
  useEffect(() => {
    // Handle MARKET_UPDATE events
    if (latestMessages?.MARKET_UPDATE && data) {
      const update = latestMessages.MARKET_UPDATE;
      
      setData((prevData: MarketData | null) => {
        if (!prevData) return null;
        
        return {
          ...prevData,
          ...update,
        };
      });
    }
    
    // Handle PRICE_TICK events (individual price updates)
    if (latestMessages?.PRICE_TICK && data) {
      const { symbol, price, change24h } = latestMessages.PRICE_TICK;
      
      setData((prevData: MarketData | null) => {
        if (!prevData) return null;
        
        // Update the specific asset price
        const updatedAssets = prevData.assets.map(asset => 
          asset.symbol === symbol ? { ...asset, price, change24h } : asset
        );
        
        // Also update in top gainers and losers if present
        const updatedTopGainers = prevData.topGainers.map(asset => 
          asset.symbol === symbol ? { ...asset, price, change24h } : asset
        );
        
        const updatedTopLosers = prevData.topLosers.map(asset => 
          asset.symbol === symbol ? { ...asset, price, change24h } : asset
        );
        
        return {
          ...prevData,
          assets: updatedAssets,
          topGainers: updatedTopGainers,
          topLosers: updatedTopLosers,
          timestamp: new Date().toISOString(),
        };
      });
    }
  }, [latestMessages, data]);

  return { data, isLoading, error };
}
