'use client';

import React from 'react';
const { useState, useEffect } = React;
import { useSocket } from '@/providers/socket-provider';
import { createBrowserClient } from '@/utils/supabase/client';

// Development flag to use mock data
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

interface PortfolioData {
  totalValue: number;
  dailyPnL: number;
  dailyPnLPercentage: number;
  activePositions: number;
  profitPositions: number;
  riskScore: 'Low' | 'Medium' | 'High';
  allocation: {
    asset: string;
    allocation: number;
    performance: number;
  }[];
}

// Mock portfolio data for development
const MOCK_PORTFOLIO_DATA: PortfolioData = {
  totalValue: 125890,
  dailyPnL: 3240,
  dailyPnLPercentage: 2.6,
  activePositions: 12,
  profitPositions: 4,
  riskScore: 'Medium',
  allocation: [
    { asset: 'BTC', allocation: 35, performance: 12.5 },
    { asset: 'ETH', allocation: 25, performance: 8.2 },
    { asset: 'SOL', allocation: 15, performance: 24.8 },
    { asset: 'AVAX', allocation: 10, performance: 15.3 },
    { asset: 'BNB', allocation: 8, performance: 5.1 },
    { asset: 'Others', allocation: 7, performance: 4.3 },
  ],
};

export function usePortfolioData(farmId: string) {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { subscribe, latestMessages } = useSocket();
  const supabase = createBrowserClient();

  // Initial data fetch
  useEffect(() => {
    async function fetchPortfolioData() {
      setIsLoading(true);
      
      // If in development mode and USE_MOCK_DATA is true, use mock data
      if (USE_MOCK_DATA) {
        setData(MOCK_PORTFOLIO_DATA);
        setIsLoading(false);
        return;
      }
      
      try {
        // Fetch from Supabase in production or when mock data is disabled
        const { data: portfolioData, error } = await supabase
          .from('portfolio_metrics')
          .select('*')
          .eq('farm_id', farmId)
          .single();

        if (error) throw error;

        if (portfolioData) {
          // Transform data for our UI
          setData({
            totalValue: portfolioData.total_value || MOCK_PORTFOLIO_DATA.totalValue,
            dailyPnL: portfolioData.daily_pnl || MOCK_PORTFOLIO_DATA.dailyPnL,
            dailyPnLPercentage: portfolioData.daily_pnl_percentage || MOCK_PORTFOLIO_DATA.dailyPnLPercentage,
            activePositions: portfolioData.active_positions || MOCK_PORTFOLIO_DATA.activePositions,
            profitPositions: portfolioData.profit_positions || MOCK_PORTFOLIO_DATA.profitPositions,
            riskScore: portfolioData.risk_score || MOCK_PORTFOLIO_DATA.riskScore,
            allocation: portfolioData.allocation || MOCK_PORTFOLIO_DATA.allocation,
          });
        }
      } catch (err) {
        // Log error but not in development mode with mock data enabled
        if (!USE_MOCK_DATA) {
          console.error('Error fetching portfolio data:', err);
        }
        
        setError(err instanceof Error ? err : new Error(String(err)));
        // Use fallback data
        setData(MOCK_PORTFOLIO_DATA);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPortfolioData();

    // Subscribe to portfolio updates via WebSocket
    subscribe('PORTFOLIO_UPDATE');

    return () => {
      // No need to unsubscribe as the hook handles this
    };
  }, [farmId, supabase, subscribe]);

  // Listen for real-time updates
  useEffect(() => {
    if (latestMessages?.PORTFOLIO_UPDATE && data) {
      const update = latestMessages.PORTFOLIO_UPDATE;
      
      // Update the relevant parts of the data
      setData((prevData: PortfolioData | null) => {
        if (!prevData) return null;
        
        return {
          ...prevData,
          ...update,
        };
      });
    }
  }, [latestMessages, data]);

  return { data, isLoading, error };
}
