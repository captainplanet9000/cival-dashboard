/**
 * WebSocket Optimizer
 * 
 * Improves WebSocket performance by:
 * - Throttling high-frequency data updates
 * - Batching UI updates
 * - Implementing selective subscriptions
 * - Managing connection health
 */

import { useRef, useEffect, useState } from 'react';
import { updateQueryDataFromWebSocket } from './query-cache-config';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface ThrottleOptions {
  maxRate: number; // Max updates per second
  batchUpdates: boolean; // Whether to batch updates for efficient rendering
  priorityTypes?: string[]; // Message types that bypass throttling
}

// Default throttle options by message type
const DEFAULT_THROTTLE_OPTIONS: Record<string, ThrottleOptions> = {
  'marketTrades': {
    maxRate: 5, // 5 updates per second
    batchUpdates: true,
    priorityTypes: ['largeTradeAlert']
  },
  'orderBookUpdate': {
    maxRate: 2, // 2 updates per second
    batchUpdates: true
  },
  'ticker': {
    maxRate: 1, // 1 update per second
    batchUpdates: false
  },
  'orderUpdate': {
    maxRate: 10, // 10 updates per second (high priority)
    batchUpdates: false,
    priorityTypes: ['filled', 'canceled', 'rejected']
  },
  'balanceUpdate': {
    maxRate: 2, // 2 updates per second
    batchUpdates: true
  }
};

// Hook to optimize WebSocket message processing
export function useOptimizedWebSocket(
  messages: WebSocketMessage[],
  customOptions?: Partial<Record<string, ThrottleOptions>>
) {
  const queryClient = useQueryClient();
  const [optimizedMessages, setOptimizedMessages] = useState<WebSocketMessage[]>([]);
  const messageBuffers = useRef<Record<string, WebSocketMessage[]>>({});
  const lastUpdateTimes = useRef<Record<string, number>>({});
  const throttleOptions = { ...DEFAULT_THROTTLE_OPTIONS, ...customOptions };
  
  useEffect(() => {
    if (!messages.length) return;
    
    // Process each incoming message
    messages.forEach(message => {
      const { type } = message;
      const options = throttleOptions[type] || {
        maxRate: 10,
        batchUpdates: false
      };
      
      // Check if this is a priority message that bypasses throttling
      const isPriority = options.priorityTypes?.some(
        priorityType => message.data?.status === priorityType || message.data?.type === priorityType
      );
      
      if (isPriority) {
        // Priority messages bypass throttling
        processMessageImmediately(message);
        return;
      }
      
      const now = Date.now();
      const minInterval = 1000 / options.maxRate;
      const lastUpdate = lastUpdateTimes.current[type] || 0;
      
      if (!options.batchUpdates) {
        // For non-batched updates, apply throttling directly
        if (now - lastUpdate >= minInterval) {
          processMessageImmediately(message);
          lastUpdateTimes.current[type] = now;
        }
      } else {
        // For batched updates, add to buffer
        if (!messageBuffers.current[type]) {
          messageBuffers.current[type] = [];
        }
        
        messageBuffers.current[type].push(message);
        
        // Process batch if enough time has passed
        if (now - lastUpdate >= minInterval) {
          processBatchedMessages(type);
          lastUpdateTimes.current[type] = now;
        }
      }
    });
    
    // Set up interval to process any remaining batched messages
    const batchInterval = setInterval(() => {
      Object.keys(messageBuffers.current).forEach(type => {
        if (messageBuffers.current[type].length > 0) {
          processBatchedMessages(type);
          lastUpdateTimes.current[type] = Date.now();
        }
      });
    }, 200); // Check every 200ms
    
    return () => clearInterval(batchInterval);
  }, [messages, queryClient]);
  
  // Process a message immediately (bypass batching)
  const processMessageImmediately = (message: WebSocketMessage) => {
    updateReactQuery(message);
    setOptimizedMessages(prev => [...prev, message]);
  };
  
  // Process all batched messages of a specific type
  const processBatchedMessages = (type: string) => {
    if (!messageBuffers.current[type]?.length) return;
    
    // For most types, we only care about the latest message
    // Except for trades where we might want to show all
    let messagesToProcess: WebSocketMessage[] = [];
    
    if (type === 'marketTrades') {
      // For trades, keep all but limit to a reasonable number
      messagesToProcess = messageBuffers.current[type].slice(-20); // Last 20 trades
    } else if (type === 'orderBookUpdate') {
      // For order book, consolidate updates into a single update
      const latestMessage = messageBuffers.current[type][messageBuffers.current[type].length - 1];
      messagesToProcess = [latestMessage];
    } else {
      // For other types, just use the latest message
      const latestMessage = messageBuffers.current[type][messageBuffers.current[type].length - 1];
      messagesToProcess = [latestMessage];
    }
    
    // Update React Query with batched data
    messagesToProcess.forEach(updateReactQuery);
    
    // Update optimized messages state with new batch
    setOptimizedMessages(prev => [...prev, ...messagesToProcess]);
    
    // Clear the buffer for this type
    messageBuffers.current[type] = [];
  };
  
  // Update React Query based on message type
  const updateReactQuery = (message: WebSocketMessage) => {
    const { type, data } = message;
    
    switch (type) {
      case 'ticker':
        if (data.exchange && data.symbol) {
          updateQueryDataFromWebSocket(
            queryClient,
            ['marketData', data.exchange, data.symbol],
            (oldData) => ({
              ...oldData,
              lastPrice: data.lastPrice,
              priceChangePercent: data.priceChangePercent,
              lastUpdateTime: Date.now()
            })
          );
        }
        break;
        
      case 'orderUpdate':
        if (data.exchange) {
          updateQueryDataFromWebSocket(
            queryClient,
            ['orders', data.exchange],
            (oldOrders) => {
              if (!oldOrders) return oldOrders;
              return oldOrders.map((order: any) => 
                order.id === data.orderId ? { ...order, ...data, lastUpdateTime: Date.now() } : order
              );
            }
          );
        }
        break;
        
      case 'balanceUpdate':
        if (data.exchange) {
          updateQueryDataFromWebSocket(
            queryClient,
            ['balances', data.exchange],
            (oldBalances) => {
              if (!oldBalances) return oldBalances;
              return {
                ...oldBalances,
                [data.currency]: {
                  ...oldBalances[data.currency],
                  free: data.free,
                  locked: data.locked,
                  lastUpdateTime: Date.now()
                }
              };
            }
          );
        }
        break;
        
      // Add other message types as needed
    }
  };
  
  return { optimizedMessages };
}

// Hook to manage selective WebSocket subscriptions
export function useSelectiveSubscriptions(
  availableSymbols: string[],
  visibleComponents: string[]
) {
  const [activeSubscriptions, setActiveSubscriptions] = useState<string[]>([]);
  
  useEffect(() => {
    // Determine which symbols need subscriptions based on visible components
    const requiredSubscriptions: string[] = [];
    
    if (visibleComponents.includes('tradingChart')) {
      // Trading chart typically only needs the active symbol
      const activeSymbol = availableSymbols[0]; // Usually the primary symbol
      if (activeSymbol) requiredSubscriptions.push(activeSymbol);
    }
    
    if (visibleComponents.includes('marketOverview')) {
      // Market overview might show multiple symbols but limit to a reasonable number
      const overviewSymbols = availableSymbols.slice(0, 10); // First 10 symbols
      requiredSubscriptions.push(...overviewSymbols);
    }
    
    if (visibleComponents.includes('orderBook')) {
      // Order book typically only needs the active symbol
      const activeSymbol = availableSymbols[0];
      if (activeSymbol) requiredSubscriptions.push(activeSymbol);
    }
    
    // Remove duplicates
    const uniqueSubscriptions = [...new Set(requiredSubscriptions)];
    setActiveSubscriptions(uniqueSubscriptions);
    
  }, [availableSymbols, visibleComponents]);
  
  return { activeSubscriptions };
}

// Utility to compress WebSocket payloads (for high-frequency data)
export function compressMarketData(data: any) {
  // Convert full object keys to abbreviated versions to reduce payload size
  // This is especially useful for high-frequency data like order book updates
  
  if (!data) return data;
  
  if (data.type === 'orderBookUpdate') {
    return {
      t: data.type,
      e: data.exchange,
      s: data.symbol,
      b: data.bids.map((bid: [number, number]) => [
        Number(bid[0].toFixed(8)), // price with reduced precision
        Number(bid[1].toFixed(8))  // amount with reduced precision
      ]),
      a: data.asks.map((ask: [number, number]) => [
        Number(ask[0].toFixed(8)),
        Number(ask[1].toFixed(8))
      ]),
      ts: data.timestamp
    };
  }
  
  if (data.type === 'marketTrades') {
    return {
      t: data.type,
      e: data.exchange,
      s: data.symbol,
      tr: data.trades.map((trade: any) => ({
        i: trade.id,
        p: Number(trade.price.toFixed(8)),
        q: Number(trade.quantity.toFixed(8)),
        T: trade.timestamp,
        m: trade.isBuyerMaker
      }))
    };
  }
  
  // For other data types, return as is
  return data;
}
