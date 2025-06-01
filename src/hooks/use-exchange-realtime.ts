/**
 * Real-time Exchange Hook
 * 
 * Provides real-time market data updates using WebSockets with automatic reconnection
 * and data stream processing with backpressure handling.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiGateway, ApiServiceType } from '../services/api-gateway';
import { useWebSocket } from './use-exchange-websocket';
import { createStreamProcessor, StreamProcessor } from '../services/streaming/stream-processor';
import { MonitoringService } from '../services/monitoring-service';
import { marketDataSchema } from '../services/validation/api-schemas';
import { ValidationService } from '../services/validation/validator';

// Market data update types
export interface MarketData {
  symbol: string;
  timestamp: number;
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change?: number;
  percentage?: number;
}

export interface TradeUpdate {
  symbol: string;
  timestamp: number;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  id: string;
}

export interface OrderBookUpdate {
  symbol: string;
  timestamp: number;
  bids: [number, number][]; // [price, amount]
  asks: [number, number][]; // [price, amount]
  nonce?: number;
}

export type RealtimeUpdateType = 'ticker' | 'trade' | 'orderbook' | 'chart';

export interface RealtimeSubscription {
  symbol: string;
  type: RealtimeUpdateType;
}

export interface UseExchangeRealtimeOptions {
  exchangeId?: string;
  autoConnect?: boolean;
  subscriptions?: RealtimeSubscription[];
}

export interface UseExchangeRealtimeResult {
  // Connection status
  isConnected: boolean;
  isConnecting: boolean;
  
  // Market data
  marketData: Record<string, MarketData>;
  trades: Record<string, TradeUpdate[]>;
  orderBooks: Record<string, OrderBookUpdate>;
  
  // Subscription management
  subscribe: (subscription: RealtimeSubscription) => void;
  unsubscribe: (subscription: RealtimeSubscription) => void;
  
  // Connection management
  connect: () => void;
  disconnect: () => void;
  
  // Status information
  connectionStatus: string;
  lastError: Error | null;
  metrics: {
    messageCount: number;
    reconnectCount: number;
    dataPoints: number;
  };
}

/**
 * Hook for real-time exchange data with WebSocket connection
 * 
 * @param options Hook options
 * @returns Real-time exchange data and controls
 */
export function useExchangeRealtime(
  options: UseExchangeRealtimeOptions = {}
): UseExchangeRealtimeResult {
  const {
    exchangeId = 'default',
    autoConnect = true,
    subscriptions: initialSubscriptions = []
  } = options;
  
  // API Gateway for getting WebSocket details
  const apiGateway = useMemo(() => ApiGateway.getInstance(), []);
  
  // State for market data
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [trades, setTrades] = useState<Record<string, TradeUpdate[]>>({});
  const [orderBooks, setOrderBooks] = useState<Record<string, OrderBookUpdate>>({});
  
  // Subscription state
  const [subscriptions, setSubscriptions] = useState<RealtimeSubscription[]>(initialSubscriptions);
  const subscriptionsRef = useRef<RealtimeSubscription[]>(initialSubscriptions);
  
  // Error state
  const [lastError, setLastError] = useState<Error | null>(null);
  
  // Metrics state
  const [metrics, setMetrics] = useState({
    messageCount: 0,
    reconnectCount: 0,
    dataPoints: 0
  });
  
  // Stream processors for different data types
  const marketDataProcessor = useRef<StreamProcessor<MarketData> | null>(null);
  const tradesProcessor = useRef<StreamProcessor<TradeUpdate> | null>(null);
  const orderBookProcessor = useRef<StreamProcessor<OrderBookUpdate> | null>(null);
  
  // WebSocket URL
  const wsUrl = useMemo(() => {
    // In a real implementation, this would come from the API gateway or config
    return `wss://api.example.com/ws/${exchangeId}`;
  }, [exchangeId]);
  
  // Initialize stream processors
  useEffect(() => {
    // Market data processor
    marketDataProcessor.current = createStreamProcessor<MarketData>({
      processFn: async (items) => {
        const validItems: MarketData[] = [];
        
        // Validate each item
        for (const item of items) {
          const result = ValidationService.validate(marketDataSchema, item);
          if (result.success && result.data) {
            validItems.push(result.data);
          }
        }
        
        if (validItems.length === 0) return;
        
        // Update market data state
        setMarketData(prevData => {
          const newData = { ...prevData };
          
          for (const item of validItems) {
            newData[item.symbol] = item;
          }
          
          return newData;
        });
        
        // Update metrics
        setMetrics(prev => ({
          ...prev,
          dataPoints: prev.dataPoints + validItems.length
        }));
      },
      batchSize: 10,
      processingInterval: 100,
      maxBufferSize: 500,
      uniqueKeyFn: (item) => `${item.symbol}-${item.timestamp}`,
      onError: (error) => {
        setLastError(error);
      }
    });
    
    // Trades processor
    tradesProcessor.current = createStreamProcessor<TradeUpdate>({
      processFn: async (items) => {
        if (items.length === 0) return;
        
        // Group by symbol
        const tradesBySymbol: Record<string, TradeUpdate[]> = {};
        
        for (const trade of items) {
          if (!tradesBySymbol[trade.symbol]) {
            tradesBySymbol[trade.symbol] = [];
          }
          tradesBySymbol[trade.symbol].push(trade);
        }
        
        // Update trades state
        setTrades(prevTrades => {
          const newTrades = { ...prevTrades };
          
          for (const [symbol, symbolTrades] of Object.entries(tradesBySymbol)) {
            // Keep the most recent 100 trades per symbol
            const existingTrades = newTrades[symbol] || [];
            newTrades[symbol] = [...symbolTrades, ...existingTrades].slice(0, 100);
          }
          
          return newTrades;
        });
        
        // Update metrics
        setMetrics(prev => ({
          ...prev,
          dataPoints: prev.dataPoints + items.length
        }));
      },
      batchSize: 20,
      processingInterval: 100,
      maxBufferSize: 1000,
      uniqueKeyFn: (item) => `${item.symbol}-${item.id}`,
      onError: (error) => {
        setLastError(error);
      }
    });
    
    // Order book processor
    orderBookProcessor.current = createStreamProcessor<OrderBookUpdate>({
      processFn: async (items) => {
        if (items.length === 0) return;
        
        // Get the latest order book update per symbol
        const latestUpdates: Record<string, OrderBookUpdate> = {};
        
        for (const update of items) {
          // Only keep the latest update per symbol (by nonce or timestamp)
          if (!latestUpdates[update.symbol] || 
              (update.nonce && latestUpdates[update.symbol].nonce && update.nonce > latestUpdates[update.symbol].nonce!) ||
              (!update.nonce && update.timestamp > latestUpdates[update.symbol].timestamp)) {
            latestUpdates[update.symbol] = update;
          }
        }
        
        // Update order books state
        setOrderBooks(prevBooks => ({
          ...prevBooks,
          ...latestUpdates
        }));
        
        // Update metrics
        setMetrics(prev => ({
          ...prev,
          dataPoints: prev.dataPoints + Object.keys(latestUpdates).length
        }));
      },
      processingInterval: 100,
      maxBufferSize: 100,
      uniqueKeyFn: (item) => `${item.symbol}-${item.timestamp}`,
      onError: (error) => {
        setLastError(error);
      }
    });
    
    // Clean up on unmount
    return () => {
      marketDataProcessor.current?.stop();
      tradesProcessor.current?.stop();
      orderBookProcessor.current?.stop();
      
      marketDataProcessor.current = null;
      tradesProcessor.current = null;
      orderBookProcessor.current = null;
    };
  }, []);
  
  // Handler for WebSocket messages
  const handleMessage = useCallback((event: WebSocketEventMap['message']) => {
    try {
      // Parse message data
      const data = JSON.parse(event.data);
      
      // Update metrics
      setMetrics(prev => ({
        ...prev,
        messageCount: prev.messageCount + 1
      }));
      
      // Handle different message types
      switch (data.type) {
        case 'ticker':
          // Process market data update
          marketDataProcessor.current?.push(data.data);
          break;
          
        case 'trade':
          // Process trade update
          tradesProcessor.current?.push(data.data);
          break;
          
        case 'orderbook':
          // Process order book update
          orderBookProcessor.current?.push(data.data);
          break;
          
        case 'subscribed':
          // Handle subscription confirmation
          MonitoringService.logEvent({
            type: 'info',
            message: 'WebSocket subscription confirmed',
            data: { subscription: data.subscription }
          });
          break;
          
        case 'error':
          // Handle error message
          MonitoringService.logEvent({
            type: 'error',
            message: 'WebSocket error from server',
            data: { error: data.error }
          });
          
          setLastError(new Error(data.error));
          break;
      }
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Error processing WebSocket message',
        data: { error, data: event.data }
      });
      
      if (error instanceof Error) {
        setLastError(error);
      }
    }
  }, []);
  
  // WebSocket connection
  const { 
    status: connectionStatus,
    sendMessage,
    reconnect,
    disconnect: wsDisconnect,
    reconnectCount
  } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
    onOpen: () => {
      // Re-subscribe to all subscriptions on reconnect
      for (const subscription of subscriptionsRef.current) {
        sendSubscription(subscription);
      }
    },
    onError: (error) => {
      setLastError(new Error('WebSocket connection error'));
    }
  });
  
  // Update metrics when reconnect count changes
  useEffect(() => {
    setMetrics(prev => ({
      ...prev,
      reconnectCount
    }));
  }, [reconnectCount]);
  
  // Helper to send subscription message
  const sendSubscription = useCallback((subscription: RealtimeSubscription) => {
    if (connectionStatus === 'OPEN') {
      sendMessage({
        type: 'subscribe',
        channel: subscription.type,
        symbol: subscription.symbol
      });
      
      MonitoringService.logEvent({
        type: 'info',
        message: 'Sent WebSocket subscription',
        data: { subscription }
      });
    }
  }, [connectionStatus, sendMessage]);
  
  // Helper to send unsubscription message
  const sendUnsubscription = useCallback((subscription: RealtimeSubscription) => {
    if (connectionStatus === 'OPEN') {
      sendMessage({
        type: 'unsubscribe',
        channel: subscription.type,
        symbol: subscription.symbol
      });
      
      MonitoringService.logEvent({
        type: 'info',
        message: 'Sent WebSocket unsubscription',
        data: { subscription }
      });
    }
  }, [connectionStatus, sendMessage]);
  
  // Subscribe to a channel
  const subscribe = useCallback((subscription: RealtimeSubscription) => {
    // Check if already subscribed
    const isAlreadySubscribed = subscriptionsRef.current.some(
      sub => sub.symbol === subscription.symbol && sub.type === subscription.type
    );
    
    if (isAlreadySubscribed) return;
    
    // Update subscriptions
    const newSubscriptions = [...subscriptionsRef.current, subscription];
    subscriptionsRef.current = newSubscriptions;
    setSubscriptions(newSubscriptions);
    
    // Send subscription if connected
    sendSubscription(subscription);
  }, [sendSubscription]);
  
  // Unsubscribe from a channel
  const unsubscribe = useCallback((subscription: RealtimeSubscription) => {
    // Find subscription index
    const index = subscriptionsRef.current.findIndex(
      sub => sub.symbol === subscription.symbol && sub.type === subscription.type
    );
    
    if (index === -1) return;
    
    // Update subscriptions
    const newSubscriptions = [...subscriptionsRef.current];
    newSubscriptions.splice(index, 1);
    subscriptionsRef.current = newSubscriptions;
    setSubscriptions(newSubscriptions);
    
    // Send unsubscription if connected
    sendUnsubscription(subscription);
  }, [sendUnsubscription]);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    reconnect();
  }, [reconnect]);
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    wsDisconnect();
  }, [wsDisconnect]);
  
  // Derived state
  const isConnected = connectionStatus === 'OPEN';
  const isConnecting = connectionStatus === 'CONNECTING' || connectionStatus === 'RECONNECTING';
  
  return {
    // Connection status
    isConnected,
    isConnecting,
    
    // Market data
    marketData,
    trades,
    orderBooks,
    
    // Subscription management
    subscribe,
    unsubscribe,
    
    // Connection management
    connect,
    disconnect,
    
    // Status information
    connectionStatus,
    lastError,
    metrics
  };
} 