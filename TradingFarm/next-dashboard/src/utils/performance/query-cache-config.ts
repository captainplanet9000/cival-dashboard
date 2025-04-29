/**
 * Query Cache Configuration
 * 
 * Optimized React Query configuration for Trading Farm dashboard
 * - Custom stale times for different data types
 * - Intelligent refetch strategies
 * - Memory optimization
 */

import { QueryClient } from '@tanstack/react-query';

// Data type-specific caching strategies
export const CACHE_TIMES = {
  // Real-time data (very short cache)
  MARKET_PRICE: 1000, // 1 second
  ORDER_BOOK: 2000, // 2 seconds
  TRADES: 3000, // 3 seconds
  
  // Semi-real-time data (medium cache)
  ACCOUNT_BALANCE: 15000, // 15 seconds
  OPEN_ORDERS: 10000, // 10 seconds
  POSITIONS: 10000, // 10 seconds
  
  // Static/slow-changing data (longer cache)
  AGENT_CONFIG: 60000, // 1 minute
  STRATEGY_LIST: 300000, // 5 minutes
  EXCHANGE_LIST: 3600000, // 1 hour
  USER_PREFERENCES: 3600000, // 1 hour
};

// Create optimized query client for trading operations
export const createTradingQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Reasonable defaults for trading app
        staleTime: 10000, // 10 seconds default stale time
        cacheTime: 900000, // 15 minutes in cache
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
        retry: 2,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  });
};

// Custom hooks to get query keys with appropriate cache settings
export const getMarketDataQueryKey = (exchange: string, symbol: string) => {
  return ['marketData', exchange, symbol];
};

export const getOrdersQueryKey = (exchange: string, status?: string) => {
  return status ? ['orders', exchange, status] : ['orders', exchange];
};

export const getPositionsQueryKey = (exchange: string) => {
  return ['positions', exchange];
};

export const getBalancesQueryKey = (exchange: string) => {
  return ['balances', exchange];
};

export const getAgentsQueryKey = (farmId?: string) => {
  return farmId ? ['agents', farmId] : ['agents'];
};

// Optimistic update helpers
export const getOptimisticOrderUpdate = (newOrder: any, oldOrders: any[] = []) => {
  return [...oldOrders, { ...newOrder, status: 'pending', _optimistic: true }];
};

export const getOptimisticOrderCancel = (orderId: string, oldOrders: any[] = []) => {
  return oldOrders.map(order => 
    order.id === orderId 
      ? { ...order, status: 'canceling', _optimistic: true } 
      : order
  );
};

// Memory management - clear unnecessary cache
export const clearOldMarketData = (queryClient: QueryClient) => {
  // Find and remove stale market data that's no longer needed
  queryClient.invalidateQueries({ 
    predicate: query => {
      const queryKey = query.queryKey as string[];
      return queryKey[0] === 'marketData' && query.state.dataUpdatedAt < Date.now() - 3600000;
    },
  });
};

// WebSocket integration helpers
export const updateQueryDataFromWebSocket = (
  queryClient: QueryClient, 
  queryKey: unknown[], 
  updater: (oldData: any) => any
) => {
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData) return oldData;
    return updater(oldData);
  });
};
