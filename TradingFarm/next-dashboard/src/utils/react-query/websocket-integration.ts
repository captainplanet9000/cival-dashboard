import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { invalidateEntityCache } from './cache-config';

// Types for WebSocket events
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: number;
}

interface EntityUpdate {
  id: string;
  type: 'strategy' | 'position' | 'agent' | 'order' | 'farm';
  action: 'created' | 'updated' | 'deleted';
  data?: any;
}

interface MarketUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  change?: number;
  changePercent?: number;
}

interface TradeUpdate {
  positionId: string;
  tradeId: string;
  action: 'open' | 'close' | 'modify';
  data: any;
}

/**
 * Connect WebSocket to TanStack Query for real-time data updates
 * @param queryClient The TanStack Query client instance
 * @param socket The WebSocket instance
 */
export function connectWebSocketToQueryClient(
  queryClient: QueryClient,
  socket: WebSocket
): () => void {
  // Event handler for WebSocket messages
  const handleMessage = (event: MessageEvent) => {
    try {
      const wsEvent: WebSocketEvent = JSON.parse(event.data);
      
      // Process different event types
      switch (wsEvent.type) {
        case 'entity_update':
          handleEntityUpdate(queryClient, wsEvent.data as EntityUpdate);
          break;
          
        case 'market_update':
          handleMarketUpdate(queryClient, wsEvent.data as MarketUpdate);
          break;
          
        case 'trade_update':
          handleTradeUpdate(queryClient, wsEvent.data as TradeUpdate);
          break;
          
        case 'dashboard_update':
          // Invalidate dashboard data when it's updated
          queryClient.invalidateQueries({
            queryKey: queryKeys.dashboard._def,
          });
          break;
          
        case 'analytics_update':
          // Invalidate analytics data
          queryClient.invalidateQueries({
            queryKey: queryKeys.analytics._def,
          });
          break;
          
        default:
          console.log('Unknown WebSocket event type:', wsEvent.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };
  
  // Add event listener
  socket.addEventListener('message', handleMessage);
  
  // Return cleanup function to remove event listener
  return () => {
    socket.removeEventListener('message', handleMessage);
  };
}

/**
 * Handle entity update events from WebSocket
 */
function handleEntityUpdate(
  queryClient: QueryClient,
  update: EntityUpdate
): void {
  const { id, type, action, data } = update;
  
  switch (action) {
    case 'created':
      // For created entities, invalidate the list query
      invalidateEntityCache(queryClient, type);
      break;
      
    case 'updated':
      // For updated entities, update the cache directly if we have the data
      if (data) {
        // Update the entity in the cache
        let queryKey;
        switch (type) {
          case 'strategy':
            queryKey = queryKeys.strategies.detail(id)._def;
            break;
          case 'position':
            queryKey = queryKeys.positions.detail(id)._def;
            break;
          case 'agent':
            queryKey = queryKeys.agents.detail(id)._def;
            break;
          case 'order':
            queryKey = queryKeys.orders.detail(id)._def;
            break;
          case 'farm':
            queryKey = queryKeys.farms.detail(id)._def;
            break;
        }
        
        if (queryKey) {
          // Try to update the entity directly in the cache
          queryClient.setQueryData(queryKey, (oldData: any) => {
            if (!oldData) return data;
            // Merge the old data with the new data, preserving fields not included in the update
            return { ...oldData, ...data };
          });
        }
      } else {
        // If we don't have the data, invalidate the entity cache
        invalidateEntityCache(queryClient, type, id);
      }
      break;
      
    case 'deleted':
      // For deleted entities, invalidate both the detail and list queries
      invalidateEntityCache(queryClient, type, id);
      invalidateEntityCache(queryClient, type);
      
      // Also remove the entity from the cache
      let detailQueryKey;
      switch (type) {
        case 'strategy':
          detailQueryKey = queryKeys.strategies.detail(id)._def;
          break;
        case 'position':
          detailQueryKey = queryKeys.positions.detail(id)._def;
          break;
        case 'agent':
          detailQueryKey = queryKeys.agents.detail(id)._def;
          break;
        case 'order':
          detailQueryKey = queryKeys.orders.detail(id)._def;
          break;
        case 'farm':
          detailQueryKey = queryKeys.farms.detail(id)._def;
          break;
      }
      
      if (detailQueryKey) {
        queryClient.removeQueries({ queryKey: detailQueryKey });
      }
      break;
  }
}

/**
 * Handle market update events from WebSocket
 */
function handleMarketUpdate(
  queryClient: QueryClient,
  update: MarketUpdate
): void {
  const { symbol } = update;
  
  // Update any queries for this symbol
  queryClient.setQueriesData(
    { queryKey: ['market', symbol] },
    (oldData: any) => {
      if (!oldData) return update;
      return { ...oldData, ...update };
    }
  );
  
  // For positions with this symbol, we need to update current price and P&L
  queryClient.setQueriesData(
    { queryKey: queryKeys.positions.list._def },
    (oldData: any) => {
      if (!oldData || !oldData.positions) return oldData;
      
      // Find positions with this symbol and update their current price and P&L
      const updatedPositions = oldData.positions.map((position: any) => {
        if (position.symbol === symbol) {
          // Calculate new unrealized P&L
          const quantity = position.quantity || 0;
          const entryPrice = position.entry_price || 0;
          const newPrice = update.price;
          
          // Different calculation for long and short positions
          const priceDiff = position.side === 'long' 
            ? newPrice - entryPrice 
            : entryPrice - newPrice;
          
          const newUnrealizedPnl = priceDiff * quantity;
          const newUnrealizedPnlPercentage = entryPrice > 0 
            ? (priceDiff / entryPrice) * 100 
            : 0;
          
          return {
            ...position,
            current_price: newPrice,
            unrealized_pnl: newUnrealizedPnl,
            unrealized_pnl_percentage: newUnrealizedPnlPercentage,
            market_value: newPrice * quantity,
          };
        }
        
        return position;
      });
      
      return {
        ...oldData,
        positions: updatedPositions,
      };
    }
  );
  
  // Also update individual position queries
  queryClient.getQueriesData({ queryKey: queryKeys.positions.detail._def }).forEach(([queryKey, data]) => {
    // Check if this position query is for the symbol we got an update for
    if (data && data.symbol === symbol) {
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return oldData;
        
        // Calculate new unrealized P&L
        const quantity = oldData.quantity || 0;
        const entryPrice = oldData.entry_price || 0;
        const newPrice = update.price;
        
        // Different calculation for long and short positions
        const priceDiff = oldData.side === 'long' 
          ? newPrice - entryPrice 
          : entryPrice - newPrice;
        
        const newUnrealizedPnl = priceDiff * quantity;
        const newUnrealizedPnlPercentage = entryPrice > 0 
          ? (priceDiff / entryPrice) * 100 
          : 0;
        
        return {
          ...oldData,
          current_price: newPrice,
          unrealized_pnl: newUnrealizedPnl,
          unrealized_pnl_percentage: newUnrealizedPnlPercentage,
          market_value: newPrice * quantity,
        };
      });
    }
  });
}

/**
 * Handle trade update events from WebSocket
 */
function handleTradeUpdate(
  queryClient: QueryClient,
  update: TradeUpdate
): void {
  const { positionId, tradeId, action, data } = update;
  
  // Always invalidate the trades for this position
  queryClient.invalidateQueries({
    queryKey: queryKeys.positions.trades(positionId)._def,
  });
  
  // Also invalidate the position itself as the trade affects its status
  queryClient.invalidateQueries({
    queryKey: queryKeys.positions.detail(positionId)._def,
  });
  
  // For position closures, also update the positions list
  if (action === 'close') {
    queryClient.invalidateQueries({
      queryKey: queryKeys.positions.list._def,
    });
    
    // Update dashboard metrics as well since closed positions affect P&L
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard._def,
    });
  }
}

/**
 * Creates a WebSocket connection with reconnection logic
 * @param url WebSocket URL
 * @param queryClient TanStack Query client
 * @returns Object with connection and disconnect methods
 */
export function createReconnectingWebSocket(
  url: string,
  queryClient: QueryClient
) {
  let socket: WebSocket | null = null;
  let cleanup: (() => void) | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  
  // Function to calculate backoff delay
  const getBackoffDelay = () => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  };
  
  // Connect to WebSocket
  const connect = () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return; // Already connected or connecting
    }
    
    // Clear any existing reconnect timeout
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    // Create new WebSocket connection
    socket = new WebSocket(url);
    
    // Set up event handlers
    socket.addEventListener('open', () => {
      console.log('WebSocket connected');
      reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      
      // Connect to query client for real-time updates
      if (cleanup) {
        cleanup(); // Clean up previous connection if exists
      }
      cleanup = connectWebSocketToQueryClient(queryClient, socket!);
    });
    
    socket.addEventListener('close', (event) => {
      console.log(`WebSocket closed (${event.code}: ${event.reason})`);
      
      // Clean up query client connection
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
      
      // Don't reconnect if we closed intentionally or max attempts reached
      if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = getBackoffDelay();
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts} of ${maxReconnectAttempts})...`);
        
        reconnectTimeout = setTimeout(connect, delay);
      } else if (reconnectAttempts >= maxReconnectAttempts) {
        console.log('Max reconnect attempts reached. Please reconnect manually.');
      }
    });
    
    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });
  };
  
  // Disconnect from WebSocket
  const disconnect = () => {
    // Clear any reconnect timeout
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    // Clean up query client connection
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    
    // Close socket if open
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      socket.close(1000, 'Disconnected by user');
    }
    
    socket = null;
  };
  
  return {
    connect,
    disconnect,
    // Method to check connection status
    isConnected: () => socket?.readyState === WebSocket.OPEN,
    // Send method
    send: (data: any) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(typeof data === 'string' ? data : JSON.stringify(data));
        return true;
      }
      return false;
    }
  };
}
