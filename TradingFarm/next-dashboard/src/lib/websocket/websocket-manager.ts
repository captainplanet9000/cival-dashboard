/**
 * WebSocket Manager
 * 
 * A central manager for handling WebSocket connections to various exchanges.
 * Provides a unified interface for:
 * - Creating and managing connections
 * - Handling subscriptions
 * - Processing messages
 * - Monitoring connection health
 * - Collecting metrics
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import {
  WebSocketConfig,
  WebSocketConnectionStatus,
  WebSocketEvent,
  WebSocketEventCallback,
  WebSocketEventType,
  SubscriptionParams,
  WebSocketConnectionRecord,
  WebSocketSubscriptionRecord,
} from './types';
import { ExchangeWebSocketConnection } from './exchange-connection';

/**
 * Main WebSocket manager responsible for coordinating all WebSocket connections
 */
export class WebSocketManager {
  /**
   * Map of active WebSocket connections
   * Key is exchange:connectionId
   */
  private connections: Map<string, ExchangeWebSocketConnection>;
  
  /**
   * Map of event listeners
   * Key is event type, value is array of callbacks
   */
  private eventListeners: Map<WebSocketEventType, WebSocketEventCallback[]>;
  
  /**
   * Singleton instance
   */
  private static instance: WebSocketManager;
  
  /**
   * Get the singleton instance of WebSocketManager
   */
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.connections = new Map();
    this.eventListeners = new Map();
  }
  
  /**
   * Connect to an exchange's WebSocket API
   * 
   * @param exchange - The exchange to connect to
   * @param config - Configuration for the connection
   * @returns Promise resolving to a boolean indicating success
   */
  public async connect(exchange: string, config: WebSocketConfig): Promise<boolean> {
    try {
      // Generate connection key
      const connectionKey = this.getConnectionKey(exchange, config.connectionId);
      
      // Check if already connected
      if (this.connections.has(connectionKey)) {
        console.warn(`Connection to ${connectionKey} already exists`);
        return true;
      }
      
      // Create a database record for this connection
      const connectionRecord = await this.createConnectionRecord(exchange, config);
      
      // Create the connection
      const connection = new ExchangeWebSocketConnection(
        exchange,
        config,
        connectionRecord.id,
        (event) => this.handleConnectionEvent(event)
      );
      
      // Store the connection
      this.connections.set(connectionKey, connection);
      
      // Connect to the WebSocket
      const success = await connection.connect();
      
      // Update connection status in database
      await this.updateConnectionStatus(
        connectionRecord.id,
        success ? 'connected' : 'error',
        success ? null : 'Failed to connect'
      );
      
      return success;
    } catch (error) {
      console.error(`Error connecting to ${exchange}:`, error);
      this.emitEvent({
        type: 'error',
        exchange,
        connectionId: config.connectionId,
        timestamp: Date.now(),
        data: {
          message: 'Failed to establish connection',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      return false;
    }
  }
  
  /**
   * Disconnect from an exchange's WebSocket API
   * 
   * @param exchange - The exchange to disconnect from
   * @param connectionId - The connection ID to disconnect
   * @returns Promise resolving to a boolean indicating success
   */
  public async disconnect(exchange: string, connectionId: string): Promise<boolean> {
    try {
      const connectionKey = this.getConnectionKey(exchange, connectionId);
      const connection = this.connections.get(connectionKey);
      
      if (!connection) {
        console.warn(`No connection found for ${connectionKey}`);
        return false;
      }
      
      // Disconnect from the WebSocket
      const success = await connection.disconnect();
      
      // Update connection status in database
      await this.updateConnectionStatus(
        connection.getConnectionRecordId(),
        'disconnected'
      );
      
      // Remove from the connections map
      if (success) {
        this.connections.delete(connectionKey);
      }
      
      return success;
    } catch (error) {
      console.error(`Error disconnecting from ${exchange}:`, error);
      return false;
    }
  }
  
  /**
   * Subscribe to a channel for specific symbols
   * 
   * @param exchange - The exchange to subscribe on
   * @param connectionId - The connection ID to use
   * @param params - Subscription parameters
   * @returns Promise resolving to a boolean indicating success
   */
  public async subscribe(
    exchange: string,
    connectionId: string,
    params: SubscriptionParams
  ): Promise<boolean> {
    try {
      const connectionKey = this.getConnectionKey(exchange, connectionId);
      const connection = this.connections.get(connectionKey);
      
      if (!connection) {
        throw new Error(`No connection found for ${connectionKey}`);
      }
      
      // Create subscription record
      const subscriptionRecord = await this.createSubscriptionRecord(
        connection.getConnectionRecordId(),
        params.channel,
        params.symbols
      );
      
      // Subscribe to the channel
      const success = await connection.subscribe(
        params.channel,
        params.symbols,
        params.params,
        subscriptionRecord.id
      );
      
      // Update subscription status
      await this.updateSubscriptionStatus(
        subscriptionRecord.id,
        success ? 'subscribed' : 'error',
        success ? null : 'Failed to subscribe'
      );
      
      return success;
    } catch (error) {
      console.error(`Error subscribing to ${exchange}:`, error);
      this.emitEvent({
        type: 'error',
        exchange,
        connectionId,
        timestamp: Date.now(),
        data: {
          message: 'Failed to subscribe',
          channel: params.channel,
          symbols: params.symbols,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      return false;
    }
  }
  
  /**
   * Unsubscribe from a channel for specific symbols
   * 
   * @param exchange - The exchange to unsubscribe from
   * @param connectionId - The connection ID to use
   * @param channel - The channel to unsubscribe from
   * @param symbols - Optional symbols to unsubscribe from (if empty, unsubscribe from all symbols in the channel)
   * @returns Promise resolving to a boolean indicating success
   */
  public async unsubscribe(
    exchange: string,
    connectionId: string,
    channel: string,
    symbols?: string[]
  ): Promise<boolean> {
    try {
      const connectionKey = this.getConnectionKey(exchange, connectionId);
      const connection = this.connections.get(connectionKey);
      
      if (!connection) {
        throw new Error(`No connection found for ${connectionKey}`);
      }
      
      // Get subscription record ID
      const supabase = await createServerClient();
      const { data: subscriptions } = await supabase
        .from('websocket_subscriptions')
        .select('id')
        .eq('connection_id', connection.getConnectionRecordId())
        .eq('channel', channel);
      
      if (!subscriptions || subscriptions.length === 0) {
        throw new Error(`No subscription found for ${channel}`);
      }
      
      // Unsubscribe from the channel
      const success = await connection.unsubscribe(channel, symbols);
      
      // Update subscription status
      await this.updateSubscriptionStatus(
        subscriptions[0].id,
        success ? 'unsubscribed' : 'error',
        success ? null : 'Failed to unsubscribe'
      );
      
      return success;
    } catch (error) {
      console.error(`Error unsubscribing from ${exchange}:`, error);
      this.emitEvent({
        type: 'error',
        exchange,
        connectionId,
        timestamp: Date.now(),
        data: {
          message: 'Failed to unsubscribe',
          channel,
          symbols,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      return false;
    }
  }
  
  /**
   * Get the status of a connection
   * 
   * @param exchange - The exchange to check
   * @param connectionId - The connection ID to check
   * @returns The connection status
   */
  public getConnectionStatus(exchange: string, connectionId: string): WebSocketConnectionStatus {
    const connectionKey = this.getConnectionKey(exchange, connectionId);
    const connection = this.connections.get(connectionKey);
    
    if (!connection) {
      return 'disconnected';
    }
    
    return connection.getStatus();
  }
  
  /**
   * Add an event listener for WebSocket events
   * 
   * @param type - The event type to listen for
   * @param callback - The callback function to execute when the event occurs
   */
  public addEventListener<T = unknown>(
    type: WebSocketEventType,
    callback: WebSocketEventCallback<T>
  ): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    
    this.eventListeners.get(type)?.push(callback as WebSocketEventCallback);
  }
  
  /**
   * Remove an event listener
   * 
   * @param type - The event type to remove the listener from
   * @param callback - The callback function to remove
   */
  public removeEventListener<T = unknown>(
    type: WebSocketEventType,
    callback: WebSocketEventCallback<T>
  ): void {
    if (!this.eventListeners.has(type)) {
      return;
    }
    
    const listeners = this.eventListeners.get(type) || [];
    const index = listeners.indexOf(callback as WebSocketEventCallback);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
  
  /**
   * Get all active connections
   * 
   * @returns Array of connection keys (exchange:connectionId)
   */
  public getActiveConnections(): string[] {
    return Array.from(this.connections.keys());
  }
  
  /**
   * Get connection statistics from the database
   * 
   * @returns Promise resolving to connection statistics
   */
  public async getConnectionStats(): Promise<{
    total: number;
    connected: number;
    disconnected: number;
    error: number;
  }> {
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('websocket_connections')
        .select('status')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      
      if (error) {
        throw error;
      }
      
      const stats = {
        total: data.length,
        connected: data.filter(c => c.status === 'connected').length,
        disconnected: data.filter(c => c.status === 'disconnected').length,
        error: data.filter(c => c.status === 'error').length
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting connection stats:', error);
      return { total: 0, connected: 0, disconnected: 0, error: 0 };
    }
  }
  
  /**
   * Handle events from connections
   * 
   * @param event - The event to handle
   */
  private handleConnectionEvent<T = unknown>(event: WebSocketEvent<T>): void {
    // Forward the event to all registered listeners
    this.emitEvent(event);
    
    // Record metrics for message events
    if (event.type === 'message') {
      this.recordMetrics(event);
    }
  }
  
  /**
   * Emit an event to all registered listeners
   * 
   * @param event - The event to emit
   */
  private emitEvent<T = unknown>(event: WebSocketEvent<T>): void {
    const listeners = this.eventListeners.get(event.type) || [];
    
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    }
  }
  
  /**
   * Record metrics for a connection
   * 
   * @param event - The event to record metrics for
   */
  private async recordMetrics<T = unknown>(event: WebSocketEvent<T>): Promise<void> {
    try {
      const connectionKey = this.getConnectionKey(event.exchange, event.connectionId);
      const connection = this.connections.get(connectionKey);
      
      if (!connection) {
        return;
      }
      
      const supabase = await createServerClient();
      
      await supabase.rpc('record_websocket_metrics', {
        p_connection_id: connection.getConnectionRecordId(),
        p_message_count: 1,
        p_error_count: event.type === 'error' ? 1 : 0,
        p_message_size_bytes: JSON.stringify(event.data).length,
        p_latency_ms: null,
        p_reconnect_count: 0
      });
    } catch (error) {
      console.error('Error recording metrics:', error);
    }
  }
  
  /**
   * Create a connection record in the database
   * 
   * @param exchange - The exchange to connect to
   * @param config - Configuration for the connection
   * @returns Promise resolving to the created connection record
   */
  private async createConnectionRecord(
    exchange: string,
    config: WebSocketConfig
  ): Promise<WebSocketConnectionRecord> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('websocket_connections')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        exchange,
        connection_id: config.connectionId,
        connection_url: config.url,
        status: 'connecting'
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  /**
   * Update connection status in the database
   * 
   * @param connectionId - The database connection ID
   * @param status - The new status
   * @param errorMessage - Optional error message
   */
  private async updateConnectionStatus(
    connectionId: number,
    status: WebSocketConnectionStatus,
    errorMessage?: string | null
  ): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      await supabase.rpc('update_websocket_connection_status', {
        p_connection_id: connectionId,
        p_status: status,
        p_error_message: errorMessage
      });
    } catch (error) {
      console.error('Error updating connection status:', error);
    }
  }
  
  /**
   * Create a subscription record in the database
   * 
   * @param connectionId - The database connection ID
   * @param channel - The channel to subscribe to
   * @param symbols - The symbols to subscribe to
   * @returns Promise resolving to the created subscription record
   */
  private async createSubscriptionRecord(
    connectionId: number,
    channel: string,
    symbols: string[]
  ): Promise<WebSocketSubscriptionRecord> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('websocket_subscriptions')
      .insert({
        connection_id: connectionId,
        channel,
        symbols,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  /**
   * Update subscription status in the database
   * 
   * @param subscriptionId - The database subscription ID
   * @param status - The new status
   * @param errorMessage - Optional error message
   */
  private async updateSubscriptionStatus(
    subscriptionId: number,
    status: string,
    errorMessage?: string | null
  ): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      await supabase.rpc('update_websocket_subscription_status', {
        p_subscription_id: subscriptionId,
        p_status: status,
        p_error_message: errorMessage
      });
    } catch (error) {
      console.error('Error updating subscription status:', error);
    }
  }
  
  /**
   * Get a unique key for a connection
   * 
   * @param exchange - The exchange name
   * @param connectionId - The connection ID
   * @returns A unique key for the connection
   */
  private getConnectionKey(exchange: string, connectionId: string): string {
    return `${exchange}:${connectionId}`;
  }
}
