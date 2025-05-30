/**
 * Exchange Hooks
 * 
 * Custom React hooks for interacting with exchange APIs and WebSockets.
 * These hooks provide a unified interface for managing exchange credentials,
 * market data, and trading operations.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ExchangeType } from '@/services/exchange-service';
import exchangeWebSocketService, { 
  ExchangeDataType, 
  ConnectionState 
} from '@/services/exchange-websocket-service';
import { useWebSocketTopic } from './use-websocket';
import { WebSocketTopic } from '@/services/websocket-service';

export type CredentialFormValues = {
  exchange: ExchangeType;
  api_key: string;
  api_secret: string;
  additional_params?: Record<string, any>;
  is_testnet?: boolean;
  is_default?: boolean;
};

export type ExchangeCredential = {
  id: number;
  exchange: string;
  api_key: string;
  api_secret?: string;
  is_testnet: boolean;
  is_default: boolean;
  is_active: boolean;
  last_used?: string;
  created_at: string;
};

/**
 * Hook for managing exchange credentials
 */
export function useExchangeCredentials() {
  const [credentials, setCredentials] = useState<ExchangeCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load credentials on mount
  useEffect(() => {
    fetchCredentials();
  }, []);

  // Fetch all credentials
  const fetchCredentials = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/exchanges/credentials`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch credentials: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCredentials(data.credentials || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error fetching credentials',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Add a new credential
  const addCredential = useCallback(async (values: CredentialFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/exchanges/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add credential: ${response.statusText}`);
      }
      
      // Refresh credentials list
      await fetchCredentials();
      
      toast({
        title: 'Credential added',
        description: `Successfully added ${values.exchange} API credential`,
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error adding credential',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCredentials, toast]);

  // Update an existing credential
  const updateCredential = useCallback(async (id: number, values: Partial<CredentialFormValues>) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/exchanges/credentials/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update credential: ${response.statusText}`);
      }
      
      // Refresh credentials list
      await fetchCredentials();
      
      toast({
        title: 'Credential updated',
        description: 'API credential has been updated successfully',
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error updating credential',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCredentials, toast]);

  // Delete a credential
  const deleteCredential = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/exchanges/credentials/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete credential: ${response.statusText}`);
      }
      
      // Refresh credentials list
      await fetchCredentials();
      
      toast({
        title: 'Credential deleted',
        description: 'API credential has been removed successfully',
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error deleting credential',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCredentials, toast]);

  // Get credentials for a specific exchange
  const getExchangeCredential = useCallback((exchange: ExchangeType) => {
    return credentials.find(cred => 
      cred.exchange === exchange && cred.is_active
    );
  }, [credentials]);

  return {
    credentials,
    isLoading,
    error,
    fetchCredentials,
    addCredential,
    updateCredential,
    deleteCredential,
    getExchangeCredential,
  };
}

/**
 * Hook for working with real-time exchange WebSocket data
 */
export function useExchangeWebSocket(
  exchange: ExchangeType,
  symbol: string,
  dataType: ExchangeDataType,
  options?: { interval?: string, autoConnect?: boolean }
) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );
  const { toast } = useToast();

  // Listen for connection state changes
  const { data: systemMessages } = useWebSocketTopic(WebSocketTopic.SYSTEM);

  // Process system messages to track connection state
  useEffect(() => {
    if (!systemMessages) return;
    
    // Look for connection state messages for this exchange
    const connectionMessage = systemMessages.find(msg => 
      msg.type === 'exchange_connection' && 
      msg.exchange === exchange
    );
    
    if (connectionMessage) {
      setConnectionState(connectionMessage.state);
    }
  }, [systemMessages, exchange]);

  // Auto-connect if enabled
  useEffect(() => {
    if (options?.autoConnect) {
      connect();
    }
    
    // Clean up on unmount
    return () => {
      if (isSubscribed) {
        unsubscribe();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connect to exchange WebSocket
  const connect = useCallback(async () => {
    try {
      const result = await exchangeWebSocketService.connect(exchange);
      
      if (result) {
        setConnectionState(ConnectionState.CONNECTED);
      } else {
        toast({
          title: 'Connection Error',
          description: `Could not connect to ${exchange} WebSocket`,
          variant: 'destructive',
        });
      }
      
      return result;
    } catch (error) {
      console.error(`Error connecting to ${exchange} WebSocket:`, error);
      toast({
        title: 'Connection Error',
        description: `Could not connect to ${exchange} WebSocket: ${error}`,
        variant: 'destructive',
      });
      return false;
    }
  }, [exchange, toast]);

  // Subscribe to data
  const subscribe = useCallback(async () => {
    try {
      if (connectionState !== ConnectionState.CONNECTED) {
        await connect();
      }
      
      const subscription = {
        symbol,
        type: dataType,
        interval: options?.interval,
      };
      
      const result = await exchangeWebSocketService.subscribe(exchange, subscription);
      
      if (result) {
        setIsSubscribed(true);
      }
      
      return result;
    } catch (error) {
      console.error(`Error subscribing to ${exchange} ${dataType}:`, error);
      return false;
    }
  }, [connect, connectionState, dataType, exchange, options?.interval, symbol]);

  // Unsubscribe from data
  const unsubscribe = useCallback(() => {
    try {
      const subscription = {
        symbol,
        type: dataType,
        interval: options?.interval,
      };
      
      exchangeWebSocketService.unsubscribe(exchange, subscription);
      setIsSubscribed(false);
    } catch (error) {
      console.error(`Error unsubscribing from ${exchange} ${dataType}:`, error);
    }
  }, [dataType, exchange, options?.interval, symbol]);

  return {
    isSubscribed,
    connectionState,
    connect,
    subscribe,
    unsubscribe,
  };
}

/**
 * Hook for market data
 */
export interface OHLCV {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function useMarketData(
  symbol: string,
  options?: {
    interval?: string;
    limit?: number;
    exchange?: ExchangeType;
    refreshInterval?: number;
  }
) {
  const [data, setData] = useState<OHLCV[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const interval = options?.interval || '1h';
  const limit = options?.limit || 100;
  const exchange = options?.exchange;
  const refreshInterval = options?.refreshInterval || 0;

  // Fetch market data
  const fetchData = useCallback(async () => {
    if (!symbol) return;
    
    setIsLoading(true);
    setError(null);

    try {
      let url = `/api/market-data?type=ohlcv&symbol=${symbol}&interval=${interval}&limit=${limit}`;
      
      if (exchange) {
        url += `&source=exchange&exchange=${exchange}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch market data: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching market data:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, interval, limit, exchange]);

  // Listen for real-time updates via WebSocket
  const { data: wsData } = useWebSocketTopic(WebSocketTopic.MARKET_DATA);

  // Process WebSocket market data
  useEffect(() => {
    if (!wsData || !symbol) return;
    
    // Find relevant data for this symbol
    const marketUpdate = wsData.find(msg => 
      (msg.type === ExchangeDataType.KLINE || msg.type === ExchangeDataType.TICKER) && 
      msg.symbol === symbol &&
      (!exchange || msg.exchange === exchange)
    );
    
    if (marketUpdate && marketUpdate.type === ExchangeDataType.KLINE) {
      // Update OHLCV data if we have candles
      if (Array.isArray(marketUpdate.data)) {
        setData(prev => {
          // Merge new data with existing data
          const newData = [...prev];
          
          for (const candle of marketUpdate.data) {
            const existingIndex = newData.findIndex(c => c.timestamp === candle.timestamp);
            
            if (existingIndex >= 0) {
              newData[existingIndex] = candle;
            } else {
              newData.push(candle);
            }
          }
          
          // Sort by timestamp
          return newData.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
      }
    } else if (marketUpdate && marketUpdate.type === ExchangeDataType.TICKER) {
      // Update the latest candle with ticker data
      const tickerData = marketUpdate.data;
      
      if (tickerData && tickerData.price) {
        setData(prev => {
          if (prev.length === 0) return prev;
          
          const newData = [...prev];
          const lastCandle = { ...newData[newData.length - 1] };
          
          // Update close price
          lastCandle.close = tickerData.price;
          
          // Update high/low if needed
          if (tickerData.price > lastCandle.high) {
            lastCandle.high = tickerData.price;
          }
          
          if (tickerData.price < lastCandle.low) {
            lastCandle.low = tickerData.price;
          }
          
          newData[newData.length - 1] = lastCandle;
          return newData;
        });
      }
    }
  }, [wsData, symbol, exchange]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
    
    // Set up refresh interval if specified
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchData, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchData, refreshInterval]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for order book data
 */
export interface OrderBookLevel {
  price: number;
  amount: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: string;
}

export function useOrderBook(
  symbol: string,
  exchange?: ExchangeType,
  options?: {
    depth?: number;
    refreshInterval?: number;
  }
) {
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const depth = options?.depth || 10;
  const refreshInterval = options?.refreshInterval || 0;

  // Fetch order book
  const fetchOrderBook = useCallback(async () => {
    if (!symbol) return;
    
    setIsLoading(true);
    setError(null);

    try {
      let url = `/api/market-data?type=orderbook&symbol=${symbol}`;
      
      if (exchange) {
        url += `&exchange=${exchange}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch order book: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.bids && result.asks) {
        // Limit depth if needed
        if (depth > 0) {
          result.bids = result.bids.slice(0, depth);
          result.asks = result.asks.slice(0, depth);
        }
        
        setOrderBook(result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching order book:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, exchange, depth]);

  // Listen for real-time updates via WebSocket
  const { data: wsData } = useWebSocketTopic(WebSocketTopic.MARKET_DATA);

  // Process WebSocket order book data
  useEffect(() => {
    if (!wsData || !symbol) return;
    
    // Find order book updates for this symbol
    const orderBookUpdate = wsData.find(msg => 
      msg.type === ExchangeDataType.ORDERBOOK && 
      msg.symbol === symbol &&
      (!exchange || msg.exchange === exchange)
    );
    
    if (orderBookUpdate && orderBookUpdate.data) {
      if (orderBookUpdate.data.bids && orderBookUpdate.data.asks) {
        // Full order book replacement
        let newOrderBook = { ...orderBookUpdate.data };
        
        // Limit depth if needed
        if (depth > 0) {
          newOrderBook.bids = newOrderBook.bids.slice(0, depth);
          newOrderBook.asks = newOrderBook.asks.slice(0, depth);
        }
        
        setOrderBook(newOrderBook);
      } else if (orderBookUpdate.data.changes) {
        // Incremental updates (e.g., Coinbase format)
        setOrderBook(prev => {
          if (!prev) return prev;
          
          const newOrderBook = { 
            bids: [...prev.bids], 
            asks: [...prev.asks],
            timestamp: orderBookUpdate.data.timestamp
          };
          
          // Apply changes
          for (const change of orderBookUpdate.data.changes) {
            const side = change.side.toLowerCase();
            const price = change.price;
            const amount = change.amount;
            
            const levels = side === 'buy' ? newOrderBook.bids : newOrderBook.asks;
            const levelIndex = levels.findIndex(level => level.price === price);
            
            if (amount === 0) {
              // Remove level
              if (levelIndex >= 0) {
                if (side === 'buy') {
                  newOrderBook.bids.splice(levelIndex, 1);
                } else {
                  newOrderBook.asks.splice(levelIndex, 1);
                }
              }
            } else if (levelIndex >= 0) {
              // Update level
              levels[levelIndex].amount = amount;
            } else {
              // Add new level
              if (side === 'buy') {
                newOrderBook.bids.push({ price, amount });
                // Sort bids in descending order
                newOrderBook.bids.sort((a, b) => b.price - a.price);
              } else {
                newOrderBook.asks.push({ price, amount });
                // Sort asks in ascending order
                newOrderBook.asks.sort((a, b) => a.price - b.price);
              }
            }
          }
          
          // Limit depth if needed
          if (depth > 0) {
            newOrderBook.bids = newOrderBook.bids.slice(0, depth);
            newOrderBook.asks = newOrderBook.asks.slice(0, depth);
          }
          
          return newOrderBook;
        });
      }
    }
  }, [wsData, symbol, exchange, depth]);

  // Initial data fetch
  useEffect(() => {
    fetchOrderBook();
    
    // Set up refresh interval if specified
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchOrderBook, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchOrderBook, refreshInterval]);

  // Calculate mid price and spread
  const midPrice = useMemo(() => {
    if (!orderBook || !orderBook.bids.length || !orderBook.asks.length) {
      return null;
    }
    
    const bestBid = orderBook.bids[0].price;
    const bestAsk = orderBook.asks[0].price;
    
    return (bestBid + bestAsk) / 2;
  }, [orderBook]);

  const spread = useMemo(() => {
    if (!orderBook || !orderBook.bids.length || !orderBook.asks.length) {
      return null;
    }
    
    const bestBid = orderBook.bids[0].price;
    const bestAsk = orderBook.asks[0].price;
    
    return bestAsk - bestBid;
  }, [orderBook]);

  const spreadPercentage = useMemo(() => {
    if (!midPrice || !spread) {
      return null;
    }
    
    return (spread / midPrice) * 100;
  }, [midPrice, spread]);

  return {
    orderBook,
    isLoading,
    error,
    refetch: fetchOrderBook,
    midPrice,
    spread,
    spreadPercentage,
  };
}

/**
 * Hook for placing and managing orders
 */
export interface OrderParams {
  exchange: ExchangeType;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  quantity: number;
  price?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  reduceOnly?: boolean;
  farm_id?: number;
}

export interface Order {
  orderId: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: string;
  quantity: number;
  price?: number;
  status: string;
  time: number;
}

export function useOrders(exchange: ExchangeType, symbol?: string) {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch active orders
  const fetchActiveOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let url = `/api/exchanges/orders?exchange=${exchange}`;
      
      if (symbol) {
        url += `&symbol=${symbol}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }
      
      const result = await response.json();
      setActiveOrders(result.orders?.orders || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching active orders:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [exchange, symbol]);

  // Fetch order history
  const fetchOrderHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let url = `/api/exchanges/orders?exchange=${exchange}&history=true`;
      
      if (symbol) {
        url += `&symbol=${symbol}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch order history: ${response.statusText}`);
      }
      
      const result = await response.json();
      setOrderHistory(result.orders?.orders || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching order history:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [exchange, symbol]);

  // Place an order
  const placeOrder = useCallback(async (params: OrderParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/exchanges/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to place order: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      toast({
        title: 'Order Placed',
        description: `Successfully placed ${params.side} ${params.orderType} order for ${params.quantity} ${params.symbol}`,
      });
      
      // Refresh active orders
      await fetchActiveOrders();
      
      return result.order;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Order Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchActiveOrders, toast]);

  // Cancel an order
  const cancelOrder = useCallback(async (orderId: string, symbol: string, farmId?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/exchanges/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exchange,
          symbol,
          farm_id: farmId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to cancel order: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      toast({
        title: 'Order Cancelled',
        description: 'Order has been cancelled successfully',
      });
      
      // Refresh active orders
      await fetchActiveOrders();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Cancellation Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [exchange, fetchActiveOrders, toast]);

  // Listen for order updates via WebSocket
  const { data: wsData } = useWebSocketTopic(WebSocketTopic.ORDER_UPDATES);

  // Process WebSocket order data
  useEffect(() => {
    if (!wsData) return;
    
    // Process order updates for this exchange
    const orderUpdates = wsData.filter(msg => msg.exchange === exchange);
    
    if (orderUpdates.length > 0) {
      // Refresh orders to get the latest state
      fetchActiveOrders();
    }
  }, [wsData, exchange, fetchActiveOrders]);

  // Initial data fetch
  useEffect(() => {
    fetchActiveOrders();
    fetchOrderHistory();
  }, [fetchActiveOrders, fetchOrderHistory]);

  return {
    activeOrders,
    orderHistory,
    isLoading,
    error,
    placeOrder,
    cancelOrder,
    refreshActiveOrders: fetchActiveOrders,
    refreshOrderHistory: fetchOrderHistory,
  };
}

/**
 * Hook for getting exchange symbols
 */
export function useExchangeSymbols(exchange: ExchangeType) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSymbols = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/exchanges/${exchange}/symbols`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch symbols: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSymbols(data.symbols || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error fetching symbols',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [exchange, toast]);

  useEffect(() => {
    if (exchange) {
      fetchSymbols();
    }
  }, [exchange, fetchSymbols]);

  const refreshSymbols = useCallback(() => {
    if (exchange) {
      fetchSymbols();
    }
  }, [exchange, fetchSymbols]);

  return {
    symbols,
    isLoading,
    error,
    fetchSymbols,
    searchSymbols,
  };
}
