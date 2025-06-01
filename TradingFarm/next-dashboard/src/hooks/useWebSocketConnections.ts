"use client";

/**
 * Hook for managing WebSocket connections and metrics
 * 
 * Provides access to WebSocket connection data, metrics, and management methods.
 * 
 * @module hooks
 */

import { useEffect, useState } from 'react'
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { 
  WebSocketConnection, 
  WebSocketConnectionMetric 
} from '@/lib/websocket/types';
import { WebSocketManager } from '@/lib/websocket/websocket-manager';

/**
 * Options for the useWebSocketConnections hook
 */
interface UseWebSocketConnectionsOptions {
  /**
   * Optional user ID to filter connections by
   */
  userId?: string;

  /**
   * Optional refresh interval in milliseconds (defaults to 10 seconds)
   */
  refreshInterval?: number;
}

/**
 * Return type for the useWebSocketConnections hook
 */
interface UseWebSocketConnectionsResult {
  /**
   * Array of WebSocket connections
   */
  connections: WebSocketConnection[];
  
  /**
   * Array of WebSocket connection metrics
   */
  metrics: WebSocketConnectionMetric[];
  
  /**
   * Whether data is currently loading
   */
  isLoading: boolean;
  
  /**
   * Error if any occurred during data loading
   */
  error: Error | null;
  
  /**
   * Refresh the connection data
   */
  refreshData: () => Promise<void>;
  
  /**
   * Connect to an exchange
   * 
   * @param exchange - Exchange name
   * @param connectionId - Connection ID
   */
  connectToExchange: (exchange: string, connectionId: string) => Promise<void>;
  
  /**
   * Disconnect from an exchange
   * 
   * @param connectionId - Connection ID
   */
  disconnectFromExchange: (connectionId: number) => Promise<void>;
}

/**
 * Hook for managing WebSocket connections and metrics
 * 
 * @param options - Hook options
 * @returns WebSocket connection data and management methods
 */
export function useWebSocketConnections({
  userId,
  refreshInterval = 10000,
}: UseWebSocketConnectionsOptions = {}): UseWebSocketConnectionsResult {
  const [connections, setConnections] = useState<WebSocketConnection[]>([]);
  const [metrics, setMetrics] = useState<WebSocketConnectionMetric[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize Supabase client
  const supabase = createBrowserClient();
  
  /**
   * Fetch WebSocket connections from the database
   */
  const fetchConnections = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Build the query
      let query = supabase
        .from('websocket_connections')
        .select('*');
      
      // Add user ID filter if provided
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      // Execute the query
      const { data, error } = await query as { data: WebSocketConnection[], error: any };
      
      if (error) {
        throw error;
      }
      
      // Update state
      setConnections(data as WebSocketConnection[]);
      
      // Fetch metrics for these connections
      if (data.length > 0) {
        await fetchMetrics(data.map((conn: WebSocketConnection) => conn.id));
      }
    } catch (err) {
      console.error('Error fetching WebSocket connections:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Fetch metrics for specific connection IDs
   * 
   * @param connectionIds - Array of connection IDs
   */
  const fetchMetrics = async (connectionIds: number[]): Promise<void> => {
    try {
      // Fetch the most recent metrics for each connection
      const { data, error } = await supabase
        .from('websocket_connection_metrics')
        .select('*')
        .in('connection_id', connectionIds)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        throw error;
      }
      
      setMetrics(data as WebSocketConnectionMetric[]);
    } catch (err) {
      console.error('Error fetching WebSocket metrics:', err);
      // Don't set error state for metrics to avoid blocking UI
    }
  };
  
  /**
   * Connect to an exchange
   * 
   * @param exchange - Exchange name
   * @param connectionId - Connection ID
   */
  const connectToExchange = async (exchange: string, connectionId: string): Promise<void> => {
    try {
      // In a real implementation, this would call the WebSocketManager to establish a connection
      // For now, we'll simulate by updating the database
      const { error } = await supabase
        .from('websocket_connections')
        .update({ status: 'connecting' })
        .eq('exchange', exchange)
        .eq('connection_id', connectionId);
      
      if (error) {
        throw error;
      }
      
      // Simulate connection process
      setTimeout(async () => {
        const { error } = await supabase
          .from('websocket_connections')
          .update({ 
            status: 'connected',
            last_connected_at: new Date().toISOString()
          })
          .eq('exchange', exchange)
          .eq('connection_id', connectionId);
          
        if (error) {
          console.error('Error updating connection status:', error);
        }
        
        // Refresh data after connection is established
        fetchConnections();
      }, 2000);
      
      // Refresh immediately to show connecting state
      fetchConnections();
    } catch (err) {
      console.error('Error connecting to exchange:', err);
      setError(err instanceof Error ? err : new Error('Failed to connect to exchange'));
    }
  };
  
  /**
   * Disconnect from an exchange
   * 
   * @param connectionId - Connection ID
   */
  const disconnectFromExchange = async (connectionId: number): Promise<void> => {
    try {
      // In a real implementation, this would call the WebSocketManager to close a connection
      // For now, we'll simulate by updating the database
      const { error } = await supabase
        .from('websocket_connections')
        .update({ status: 'disconnected' })
        .eq('id', connectionId);
      
      if (error) {
        throw error;
      }
      
      // Refresh data
      fetchConnections();
    } catch (err) {
      console.error('Error disconnecting from exchange:', err);
      setError(err instanceof Error ? err : new Error('Failed to disconnect from exchange'));
    }
  };
  
  /**
   * Manually refresh the connection data
   */
  const refreshData = async (): Promise<void> => {
    await fetchConnections();
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchConnections();
  }, [userId]);
  
  // Set up periodic refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) {
      return;
    }
    
    const intervalId = setInterval(() => {
      fetchConnections();
    }, refreshInterval);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [refreshInterval, userId]);
  
  return {
    connections,
    metrics,
    isLoading,
    error,
    refreshData,
    connectToExchange,
    disconnectFromExchange,
  };
}
