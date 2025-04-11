import { useQuery, QueryOptions } from './use-query';
import { ApiGateway, ApiServiceType } from '../services/api-gateway';
import { marketDataSchema, orderSchema, marketsResponseSchema, positionsResponseSchema } from '../services/validation/api-schemas';
import { Market, MarketData, Order, Position } from '../services/validation/api-schemas';
import { useEffect, useState, useCallback } from 'react';

// Exchange hook types
export interface ExchangeQueryOptions<T> extends Omit<QueryOptions<T>, 'validationSchema'> {
  exchangeId?: string;
}

// Exchange hook interface
export interface UseExchangeInterface {
  getMarkets: (options?: ExchangeQueryOptions<Market[]>) => ReturnType<typeof useQuery<Market[]>>;
  getMarketData: (symbol: string, options?: ExchangeQueryOptions<MarketData>) => ReturnType<typeof useQuery<MarketData>>;
  getOpenOrders: (symbol?: string, options?: ExchangeQueryOptions<Order[]>) => ReturnType<typeof useQuery<Order[]>>;
  getPositions: (symbols?: string[], options?: ExchangeQueryOptions<Position[]>) => ReturnType<typeof useQuery<Position[]>>;
  placeOrder: (orderParams: PlaceOrderParams) => Promise<Order | null>;
  cancelOrder: (id: string, symbol: string) => Promise<boolean>;
  subscribeToMarketData: (symbols: string[]) => () => void;
  subscribeToOrders: () => () => void;
  subscribeToPositions: () => () => void;
  activeExchangeId: string;
}

// Order types
export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell'
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP = 'stop',
  STOP_LIMIT = 'stop_limit'
}

// Order parameters
export interface PlaceOrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  amount: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: string;
  postOnly?: boolean;
  reduceOnly?: boolean;
  leverage?: number;
  params?: Record<string, any>;
}

/**
 * Hook for interacting with cryptocurrency exchanges
 * Provides methods for fetching market data, placing orders, and managing positions
 * 
 * @param exchangeId Optional exchange ID (defaults to the primary exchange in user settings)
 * @returns Exchange API interface
 */
export function useExchange(exchangeId?: string): UseExchangeInterface {
  const apiGateway = ApiGateway.getInstance();
  const [activeExchangeId, setActiveExchangeId] = useState<string>(exchangeId || '');
  
  // Load default exchange if not provided
  useEffect(() => {
    if (!exchangeId) {
      // Load from user settings or localStorage
      const savedExchange = localStorage.getItem('defaultExchange') || '';
      setActiveExchangeId(savedExchange);
    } else {
      setActiveExchangeId(exchangeId);
    }
  }, [exchangeId]);
  
  /**
   * Get all available markets
   */
  const getMarkets = useCallback((options: ExchangeQueryOptions<Market[]> = {}) => {
    const { exchangeId: optionsExchangeId, ...queryOptions } = options;
    const exchId = optionsExchangeId || activeExchangeId;
    
    return useQuery<Market[]>(
      ['markets', exchId],
      async () => {
        return apiGateway.serviceRequest(
          ApiServiceType.EXCHANGE,
          `/markets${exchId ? `?exchange=${exchId}` : ''}`
        );
      },
      {
        ...queryOptions,
        validationSchema: marketsResponseSchema,
        staleTime: 5 * 60 * 1000, // 5 minutes
      }
    );
  }, [activeExchangeId, apiGateway]);
  
  /**
   * Get market data for a specific symbol
   */
  const getMarketData = useCallback((symbol: string, options: ExchangeQueryOptions<MarketData> = {}) => {
    const { exchangeId: optionsExchangeId, ...queryOptions } = options;
    const exchId = optionsExchangeId || activeExchangeId;
    
    return useQuery<MarketData>(
      ['marketData', exchId, symbol],
      async () => {
        return apiGateway.serviceRequest(
          ApiServiceType.EXCHANGE,
          `/markets/${symbol}/ticker${exchId ? `?exchange=${exchId}` : ''}`
        );
      },
      {
        ...queryOptions,
        validationSchema: marketDataSchema,
        refetchInterval: 10000, // 10 seconds
      }
    );
  }, [activeExchangeId, apiGateway]);
  
  /**
   * Get open orders
   */
  const getOpenOrders = useCallback((symbol?: string, options: ExchangeQueryOptions<Order[]> = {}) => {
    const { exchangeId: optionsExchangeId, ...queryOptions } = options;
    const exchId = optionsExchangeId || activeExchangeId;
    
    return useQuery<Order[]>(
      ['openOrders', exchId, symbol],
      async () => {
        return apiGateway.serviceRequest(
          ApiServiceType.EXCHANGE,
          `/orders/open${symbol ? `/${symbol}` : ''}${exchId ? `?exchange=${exchId}` : ''}`
        );
      },
      {
        ...queryOptions,
        refetchInterval: 30000, // 30 seconds
      }
    );
  }, [activeExchangeId, apiGateway]);
  
  /**
   * Get positions
   */
  const getPositions = useCallback((symbols?: string[], options: ExchangeQueryOptions<Position[]> = {}) => {
    const { exchangeId: optionsExchangeId, ...queryOptions } = options;
    const exchId = optionsExchangeId || activeExchangeId;
    
    const symbolsParam = symbols?.length 
      ? `symbols=${symbols.join(',')}` 
      : '';
    
    return useQuery<Position[]>(
      ['positions', exchId, symbols],
      async () => {
        return apiGateway.serviceRequest(
          ApiServiceType.EXCHANGE,
          `/positions${symbolsParam ? `?${symbolsParam}` : ''}${exchId ? `${symbolsParam ? '&' : '?'}exchange=${exchId}` : ''}`
        );
      },
      {
        ...queryOptions,
        validationSchema: positionsResponseSchema,
        refetchInterval: 30000, // 30 seconds
      }
    );
  }, [activeExchangeId, apiGateway]);
  
  /**
   * Place a new order
   */
  const placeOrder = useCallback(async (orderParams: PlaceOrderParams): Promise<Order | null> => {
    try {
      const response = await apiGateway.serviceRequest<Order>(
        ApiServiceType.EXCHANGE,
        `/orders`,
        {
          method: 'POST',
          body: {
            ...orderParams,
            exchange: activeExchangeId
          }
        }
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to place order:', error);
      return null;
    }
  }, [activeExchangeId, apiGateway]);
  
  /**
   * Cancel an order
   */
  const cancelOrder = useCallback(async (id: string, symbol: string): Promise<boolean> => {
    try {
      const response = await apiGateway.serviceRequest<{ success: boolean }>(
        ApiServiceType.EXCHANGE,
        `/orders/${id}`,
        {
          method: 'DELETE',
          body: {
            symbol,
            exchange: activeExchangeId
          }
        }
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data?.success || false;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      return false;
    }
  }, [activeExchangeId, apiGateway]);
  
  /**
   * Subscribe to market data updates via WebSocket
   */
  const subscribeToMarketData = useCallback((symbols: string[]): (() => void) => {
    // Implementation will depend on your WebSocket setup
    // This is a placeholder
    
    return () => {
      // Cleanup function
    };
  }, []);
  
  /**
   * Subscribe to order updates via WebSocket
   */
  const subscribeToOrders = useCallback((): (() => void) => {
    // Implementation will depend on your WebSocket setup
    // This is a placeholder
    
    return () => {
      // Cleanup function
    };
  }, []);
  
  /**
   * Subscribe to position updates via WebSocket
   */
  const subscribeToPositions = useCallback((): (() => void) => {
    // Implementation will depend on your WebSocket setup
    // This is a placeholder
    
    return () => {
      // Cleanup function
    };
  }, []);
  
  return {
    getMarkets,
    getMarketData,
    getOpenOrders,
    getPositions,
    placeOrder,
    cancelOrder,
    subscribeToMarketData,
    subscribeToOrders,
    subscribeToPositions,
    activeExchangeId
  };
} 