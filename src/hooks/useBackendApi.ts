/**
 * React Hooks for Backend API Integration
 * Provides easy-to-use hooks for connecting React components to the backend
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  backendApi, 
  ApiResponse, 
  PortfolioSummary, 
  Position, 
  TradingSignal, 
  AgentStatus, 
  MarketOverview, 
  PerformanceMetrics,
  HealthCheck 
} from '@/lib/api/backend-client';

// Generic hook for API calls with loading and error states
export function useApiCall<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = [],
  options: {
    immediate?: boolean;
    refreshInterval?: number;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCall();
      
      if (response.error) {
        setError(response.error);
        setData(null);
      } else {
        setData(response.data || null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (options.immediate !== false) {
      fetchData();
    }
  }, dependencies);

  useEffect(() => {
    if (options.refreshInterval && options.refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, options.refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [fetchData, options.refreshInterval]);

  return {
    data,
    loading,
    error,
    refresh,
    lastUpdated
  };
}

// Health and System hooks
export function useBackendHealth() {
  return useApiCall(
    () => backendApi.getHealth(),
    [],
    { refreshInterval: 30000 } // Check health every 30 seconds
  );
}

export function useBackendConnection() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [backendUrl, setBackendUrl] = useState(backendApi.getBackendUrl());

  const testConnection = useCallback(async () => {
    const connected = await backendApi.testConnection();
    setIsConnected(connected);
    return connected;
  }, []);

  useEffect(() => {
    testConnection();
    // Test connection every minute
    const interval = setInterval(testConnection, 60000);
    return () => clearInterval(interval);
  }, [testConnection]);

  return {
    isConnected,
    backendUrl,
    testConnection,
    setBackendUrl: (url: string) => {
      backendApi.setBackendUrl(url);
      setBackendUrl(url);
      testConnection();
    }
  };
}

// Portfolio hooks
export function usePortfolioSummary(refreshInterval = 10000) {
  return useApiCall(
    () => backendApi.getPortfolioSummary(),
    [],
    { refreshInterval }
  );
}

export function usePortfolioPositions(refreshInterval = 15000) {
  return useApiCall(
    () => backendApi.getPortfolioPositions(),
    [],
    { refreshInterval }
  );
}

// Market data hooks
export function useMarketOverview(refreshInterval = 30000) {
  return useApiCall(
    () => backendApi.getMarketOverview(),
    [],
    { refreshInterval }
  );
}

export function useMarketData(symbol: string, refreshInterval = 30000) {
  return useApiCall(
    () => backendApi.getMarketData(symbol),
    [symbol],
    { refreshInterval }
  );
}

// Trading hooks
export function useTradingSignals(refreshInterval = 60000) {
  return useApiCall(
    () => backendApi.getTradingSignals(),
    [],
    { refreshInterval }
  );
}

// Agent hooks
export function useAgentsStatus(refreshInterval = 30000) {
  return useApiCall(
    () => backendApi.getAgentsStatus(),
    [],
    { refreshInterval }
  );
}

// Performance hooks
export function usePerformanceMetrics(refreshInterval = 60000) {
  return useApiCall(
    () => backendApi.getPerformanceMetrics(),
    [],
    { refreshInterval }
  );
}

// Combined dashboard hook for loading all data at once
export function useDashboardData() {
  const portfolioSummary = usePortfolioSummary();
  const portfolioPositions = usePortfolioPositions();
  const marketOverview = useMarketOverview();
  const tradingSignals = useTradingSignals();
  const agentsStatus = useAgentsStatus();
  const performanceMetrics = usePerformanceMetrics();
  const health = useBackendHealth();

  const isLoading = [
    portfolioSummary.loading,
    portfolioPositions.loading,
    marketOverview.loading,
    tradingSignals.loading,
    agentsStatus.loading,
    performanceMetrics.loading
  ].some(loading => loading);

  const hasErrors = [
    portfolioSummary.error,
    portfolioPositions.error,
    marketOverview.error,
    tradingSignals.error,
    agentsStatus.error,
    performanceMetrics.error
  ].some(error => error !== null);

  const refreshAll = useCallback(() => {
    portfolioSummary.refresh();
    portfolioPositions.refresh();
    marketOverview.refresh();
    tradingSignals.refresh();
    agentsStatus.refresh();
    performanceMetrics.refresh();
    health.refresh();
  }, [
    portfolioSummary.refresh,
    portfolioPositions.refresh,
    marketOverview.refresh,
    tradingSignals.refresh,
    agentsStatus.refresh,
    performanceMetrics.refresh,
    health.refresh
  ]);

  return {
    portfolioSummary: portfolioSummary.data,
    portfolioPositions: portfolioPositions.data,
    marketOverview: marketOverview.data,
    tradingSignals: tradingSignals.data,
    agentsStatus: agentsStatus.data,
    performanceMetrics: performanceMetrics.data,
    health: health.data,
    isLoading,
    hasErrors,
    refreshAll,
    errors: {
      portfolioSummary: portfolioSummary.error,
      portfolioPositions: portfolioPositions.error,
      marketOverview: marketOverview.error,
      tradingSignals: tradingSignals.error,
      agentsStatus: agentsStatus.error,
      performanceMetrics: performanceMetrics.error,
      health: health.error
    },
    lastUpdated: {
      portfolioSummary: portfolioSummary.lastUpdated,
      portfolioPositions: portfolioPositions.lastUpdated,
      marketOverview: marketOverview.lastUpdated,
      tradingSignals: tradingSignals.lastUpdated,
      agentsStatus: agentsStatus.lastUpdated,
      performanceMetrics: performanceMetrics.lastUpdated,
      health: health.lastUpdated
    }
  };
}