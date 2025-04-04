import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { BybitBalance, BybitOrder, BybitPosition, ExchangeConfig, MarketData, OrderParams, WebSocketMessage } from '@/utils/exchange/types';

interface ExchangeState {
  isLoading: boolean;
  isConnected: boolean;
  balances: BybitBalance[];
  positions: BybitPosition[];
  activeOrders: BybitOrder[];
  orderHistory: BybitOrder[];
  marketData: MarketData[];
}

interface UseExchangeReturn extends ExchangeState {
  connectExchange: (exchangeId: string) => Promise<boolean>;
  disconnectExchange: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  refreshPositions: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshOrderHistory: () => Promise<void>;
  refreshMarketData: (symbol?: string) => Promise<void>;
  createOrder: (params: OrderParams) => Promise<BybitOrder | null>;
  cancelOrder: (symbol: string, orderId: string) => Promise<boolean>;
  getExchangeConfig: () => ExchangeConfig | null;
  registerWebSocketHandler: (topic: string, handler: (data: WebSocketMessage) => void) => string;
  unregisterWebSocketHandler: (topic: string, handlerId: string) => void;
}

export default function useExchange(initialExchangeId?: string): UseExchangeReturn {
  const supabase = createBrowserClient();
  const [exchangeId, setExchangeId] = useState<string | undefined>(initialExchangeId);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [exchangeConfig, setExchangeConfig] = useState<ExchangeConfig | null>(null);
  
  // State for exchange data
  const [balances, setBalances] = useState<BybitBalance[]>([]);
  const [positions, setPositions] = useState<BybitPosition[]>([]);
  const [activeOrders, setActiveOrders] = useState<BybitOrder[]>([]);
  const [orderHistory, setOrderHistory] = useState<BybitOrder[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);

  // Connect to exchange
  const connectExchange = useCallback(async (exchangeId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Fetch exchange config
      const { data: configData, error: configError } = await supabase
        .from('exchange_configs')
        .select('*')
        .eq('id', exchangeId)
        .single();
      
      if (configError || !configData) {
        throw new Error(configError?.message || 'Exchange configuration not found');
      }

      // Initialize exchange via server-side API
      const response = await fetch('/api/exchange/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ exchangeId }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to connect to exchange');
      }
      
      // Update state
      setExchangeId(exchangeId);
      setExchangeConfig({
        id: configData.id,
        exchange: configData.exchange,
        name: configData.name,
        testnet: configData.testnet,
        active: configData.active
      });
      setIsConnected(true);
      
      // Fetch initial data
      await Promise.all([
        refreshBalances(),
        refreshPositions(),
        refreshOrders(),
        refreshOrderHistory(),
        refreshMarketData()
      ]);
      
      toast({
        title: 'Exchange Connected',
        description: `Successfully connected to ${configData.name}`,
      });
      
      return true;
    } catch (error) {
      console.error('Failed to connect to exchange:', error);
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to exchange',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Disconnect from exchange
  const disconnectExchange = useCallback(async (): Promise<void> => {
    if (!exchangeId) return;
    
    try {
      // Disconnect via server-side API
      const response = await fetch('/api/exchange/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ exchangeId }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to disconnect from exchange');
      }
      
      // Clear state
      setIsConnected(false);
      setBalances([]);
      setPositions([]);
      setActiveOrders([]);
      setOrderHistory([]);
      setMarketData([]);
      
      toast({
        title: 'Exchange Disconnected',
        description: `Successfully disconnected from ${exchangeConfig?.name}`,
      });
    } catch (error) {
      console.error('Failed to disconnect from exchange:', error);
      toast({
        title: 'Disconnect Failed',
        description: error instanceof Error ? error.message : 'Failed to disconnect from exchange',
        variant: 'destructive',
      });
    }
  }, [exchangeId, exchangeConfig]);

  // Refresh wallet balances
  const refreshBalances = useCallback(async (): Promise<void> => {
    if (!exchangeId || !isConnected) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/exchange/${exchangeId}/balances`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch balances');
      }
      
      setBalances(result.data || []);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch balances',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [exchangeId, isConnected]);

  // Refresh positions
  const refreshPositions = useCallback(async (): Promise<void> => {
    if (!exchangeId || !isConnected) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/exchange/${exchangeId}/positions`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch positions');
      }
      
      setPositions(result.data || []);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch positions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [exchangeId, isConnected]);

  // Refresh active orders
  const refreshOrders = useCallback(async (): Promise<void> => {
    if (!exchangeId || !isConnected) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/exchange/${exchangeId}/orders`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch orders');
      }
      
      setActiveOrders(result.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch orders',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [exchangeId, isConnected]);

  // Refresh order history
  const refreshOrderHistory = useCallback(async (): Promise<void> => {
    if (!exchangeId || !isConnected) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/exchange/${exchangeId}/order-history`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch order history');
      }
      
      setOrderHistory(result.data || []);
    } catch (error) {
      console.error('Failed to fetch order history:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch order history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [exchangeId, isConnected]);

  // Refresh market data
  const refreshMarketData = useCallback(async (symbol?: string): Promise<void> => {
    if (!exchangeId || !isConnected) return;
    
    try {
      setIsLoading(true);
      
      const url = symbol
        ? `/api/exchange/${exchangeId}/market-data?symbol=${encodeURIComponent(symbol)}`
        : `/api/exchange/${exchangeId}/market-data`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch market data');
      }
      
      setMarketData(result.data || []);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch market data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [exchangeId, isConnected]);

  // Create order
  const createOrder = useCallback(async (params: OrderParams): Promise<BybitOrder | null> => {
    if (!exchangeId || !isConnected) return null;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/exchange/${exchangeId}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create order');
      }
      
      // Refresh orders after creating a new one
      refreshOrders();
      
      toast({
        title: 'Order Created',
        description: `Successfully created ${params.side} order for ${params.symbol}`,
      });
      
      return result.data;
    } catch (error) {
      console.error('Failed to create order:', error);
      toast({
        title: 'Order Failed',
        description: error instanceof Error ? error.message : 'Failed to create order',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [exchangeId, isConnected, refreshOrders]);

  // Cancel order
  const cancelOrder = useCallback(async (symbol: string, orderId: string): Promise<boolean> => {
    if (!exchangeId || !isConnected) return false;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/exchange/${exchangeId}/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel order');
      }
      
      // Refresh orders after cancelling
      refreshOrders();
      
      toast({
        title: 'Order Cancelled',
        description: `Successfully cancelled order ${orderId}`,
      });
      
      return true;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast({
        title: 'Cancel Failed',
        description: error instanceof Error ? error.message : 'Failed to cancel order',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [exchangeId, isConnected, refreshOrders]);

  // Get exchange config
  const getExchangeConfig = useCallback((): ExchangeConfig | null => {
    return exchangeConfig;
  }, [exchangeConfig]);

  // Register WebSocket handler
  const registerWebSocketHandler = useCallback((topic: string, handler: (data: WebSocketMessage) => void): string => {
    if (!exchangeId || !isConnected) return '';
    
    const handlerId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Register handler with server-side WebSocket
    fetch(`/api/exchange/${exchangeId}/websocket/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, handlerId }),
    }).catch(error => {
      console.error('Failed to register WebSocket handler:', error);
    });
    
    // Set up event source for server-sent events
    const eventSource = new EventSource(`/api/exchange/${exchangeId}/websocket/events?handlerId=${handlerId}&topic=${topic}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handler(data);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
    };
    
    // Store event source for cleanup
    return handlerId;
  }, [exchangeId, isConnected]);

  // Unregister WebSocket handler
  const unregisterWebSocketHandler = useCallback((topic: string, handlerId: string): void => {
    if (!exchangeId || !isConnected || !handlerId) return;
    
    // Unregister handler with server-side WebSocket
    fetch(`/api/exchange/${exchangeId}/websocket/unregister`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, handlerId }),
    }).catch(error => {
      console.error('Failed to unregister WebSocket handler:', error);
    });
  }, [exchangeId, isConnected]);

  // Connect to exchange on mount if ID is provided
  useEffect(() => {
    if (initialExchangeId) {
      connectExchange(initialExchangeId);
    } else {
      setIsLoading(false);
    }
    
    // Cleanup on unmount
    return () => {
      if (isConnected && exchangeId) {
        disconnectExchange();
      }
    };
  }, [initialExchangeId]);

  return {
    isLoading,
    isConnected,
    balances,
    positions,
    activeOrders,
    orderHistory,
    marketData,
    connectExchange,
    disconnectExchange,
    refreshBalances,
    refreshPositions,
    refreshOrders,
    refreshOrderHistory,
    refreshMarketData,
    createOrder,
    cancelOrder,
    getExchangeConfig,
    registerWebSocketHandler,
    unregisterWebSocketHandler
  };
}
