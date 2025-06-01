/**
 * Exchange WebSocket Adapter Interface
 * 
 * This interface defines the contract that all exchange-specific adapters must implement.
 * It provides a unified way to interact with different exchange WebSocket APIs.
 */

import {
  WebSocketConfig,
  WebSocketConnectionStatus,
  WebSocketEvent,
  WebSocketEventCallback,
  SubscriptionParams
} from '../types';

/**
 * Interface for exchange-specific WebSocket adapters
 */
export interface ExchangeWebSocketAdapter {
  /**
   * Initialize the adapter with configuration
   * 
   * @param exchange - The exchange name
   * @param config - WebSocket configuration
   * @param connectionId - Database connection record ID
   * @param eventCallback - Callback for events
   */
  initialize(
    exchange: string,
    config: WebSocketConfig,
    connectionId: number,
    eventCallback: WebSocketEventCallback
  ): void;
  
  /**
   * Connect to the exchange WebSocket API
   * 
   * @returns Promise resolving to success status
   */
  connect(): Promise<boolean>;
  
  /**
   * Disconnect from the exchange WebSocket API
   * 
   * @returns Promise resolving to success status
   */
  disconnect(): Promise<boolean>;
  
  /**
   * Subscribe to a channel for specific symbols
   * 
   * @param params - Subscription parameters
   * @param subscriptionId - Database subscription record ID
   * @returns Promise resolving to success status
   */
  subscribe(params: SubscriptionParams, subscriptionId: number): Promise<boolean>;
  
  /**
   * Unsubscribe from a channel for specific symbols
   * 
   * @param channel - The channel to unsubscribe from
   * @param symbols - Symbols to unsubscribe from (if empty, unsubscribe from all symbols in the channel)
   * @returns Promise resolving to success status
   */
  unsubscribe(channel: string, symbols?: string[]): Promise<boolean>;
  
  /**
   * Get the current connection status
   * 
   * @returns The connection status
   */
  getStatus(): WebSocketConnectionStatus;
  
  /**
   * Get the database connection record ID
   * 
   * @returns The connection record ID
   */
  getConnectionRecordId(): number;
  
  /**
   * Send a ping/heartbeat message
   * 
   * @returns Promise resolving to success status
   */
  sendHeartbeat(): Promise<boolean>;
}

/**
 * Factory function to create exchange-specific adapters
 * 
 * @param exchange - The exchange name
 * @returns The appropriate exchange adapter
 */
export function createExchangeAdapter(exchange: string): ExchangeWebSocketAdapter {
  // Import adapters dynamically to avoid circular dependencies
  switch (exchange.toLowerCase()) {
    case 'binance':
      return new (require('./binance').BinanceWebSocketAdapter)();
    case 'coinbase':
      return new (require('./coinbase').CoinbaseWebSocketAdapter)();
    case 'bybit':
      return new (require('./bybit').BybitWebSocketAdapter)();
    default:
      throw new Error(`Unsupported exchange: ${exchange}`);
  }
}

/**
 * Base adapter implementation with common functionality
 * Exchange-specific adapters can extend this class
 */
export abstract class BaseExchangeAdapter implements ExchangeWebSocketAdapter {
  /**
   * The exchange this adapter is for
   */
  protected exchange = '';
  
  /**
   * Configuration for the connection
   */
  protected config: WebSocketConfig | null = null;
  
  /**
   * The WebSocket instance
   */
  protected socket: WebSocket | null = null;
  
  /**
   * The current status of the connection
   */
  protected status: WebSocketConnectionStatus = 'disconnected';
  
  /**
   * Heartbeat interval ID
   */
  protected heartbeatInterval: NodeJS.Timeout | null = null;
  
  /**
   * Reconnection timeout ID
   */
  protected reconnectTimeout: NodeJS.Timeout | null = null;
  
  /**
   * Current reconnection attempt count
   */
  protected reconnectAttempts = 0;
  
  /**
   * Map of active subscriptions
   * Key is channel, value is array of symbols
   */
  protected subscriptions: Map<string, { symbols: string[]; id: number }> = new Map();
  
  /**
   * The database record ID for this connection
   */
  protected connectionRecordId = 0;
  
  /**
   * Event callback function
   */
  protected eventCallback: WebSocketEventCallback | null = null;
  
  /**
   * Initialize the adapter
   */
  public initialize(
    exchange: string,
    config: WebSocketConfig,
    connectionId: number,
    eventCallback: WebSocketEventCallback
  ): void {
    this.exchange = exchange;
    this.config = config;
    this.connectionRecordId = connectionId;
    this.eventCallback = eventCallback;
  }
  
  /**
   * Connect to the WebSocket
   * This method should be implemented by exchange-specific adapters
   */
  public abstract connect(): Promise<boolean>;
  
  /**
   * Disconnect from the WebSocket
   */
  public async disconnect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (!this.socket) {
          resolve(true);
          return;
        }
        
        // Clear intervals and timeouts
        this.clearHeartbeat();
        this.clearReconnect();
        
        // Close socket
        this.socket.onclose = () => {
          this.status = 'disconnected';
          this.emitEvent('connection_status_change', { status: this.status });
          this.socket = null;
          resolve(true);
        };
        
        this.socket.close();
      } catch (error) {
        this.handleError(error);
        resolve(false);
      }
    });
  }
  
  /**
   * Subscribe to a channel for specific symbols
   * This method should be implemented by exchange-specific adapters
   */
  public abstract subscribe(params: SubscriptionParams, subscriptionId: number): Promise<boolean>;
  
  /**
   * Unsubscribe from a channel for specific symbols
   * This method should be implemented by exchange-specific adapters
   */
  public abstract unsubscribe(channel: string, symbols?: string[]): Promise<boolean>;
  
  /**
   * Get the current status of the connection
   */
  public getStatus(): WebSocketConnectionStatus {
    return this.status;
  }
  
  /**
   * Get the database record ID for this connection
   */
  public getConnectionRecordId(): number {
    return this.connectionRecordId;
  }
  
  /**
   * Send a heartbeat message
   * This method should be implemented by exchange-specific adapters
   */
  public abstract sendHeartbeat(): Promise<boolean>;
  
  /**
   * Handle WebSocket open event
   */
  protected handleOpen(): void {
    this.status = 'connected';
    this.reconnectAttempts = 0;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Emit event
    this.emitEvent('connection_status_change', { status: this.status });
  }
  
  /**
   * Handle WebSocket close event
   */
  protected handleClose(event: CloseEvent): void {
    // Clear heartbeat
    this.clearHeartbeat();
    
    // Update status
    const wasConnected = this.status === 'connected';
    this.status = 'disconnected';
    
    // Emit event
    this.emitEvent('connection_status_change', {
      status: this.status,
      code: event.code,
      reason: event.reason
    });
    
    // Attempt reconnection if was connected and auto-reconnect is enabled
    if (wasConnected && this.config?.reconnect?.auto) {
      this.attemptReconnect();
    }
  }
  
  /**
   * Handle WebSocket error event
   */
  protected handleError(error: Event | Error | unknown): void {
    // Update status
    this.status = 'error';
    
    // Format error message
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error instanceof Event && error.type === 'error') {
      errorMessage = 'WebSocket error event';
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Emit event
    this.emitEvent('error', {
      message: errorMessage,
      error
    });
    
    // Attempt reconnection if auto-reconnect is enabled
    if (this.config?.reconnect?.auto) {
      this.attemptReconnect();
    }
  }
  
  /**
   * Handle WebSocket message event
   */
  protected handleMessage(event: MessageEvent): void {
    try {
      // Parse message
      const message = JSON.parse(event.data.toString());
      
      // Emit event
      this.emitEvent('message', message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }
  
  /**
   * Attempt to reconnect to the WebSocket
   */
  protected attemptReconnect(): void {
    // Clear any existing reconnect timeout
    this.clearReconnect();
    
    if (!this.config) {
      return;
    }
    
    // Check if max attempts reached
    const maxAttempts = this.config.reconnect?.maxAttempts || 5;
    
    if (this.reconnectAttempts >= maxAttempts) {
      this.emitEvent('error', {
        message: `Max reconnection attempts (${maxAttempts}) reached`
      });
      return;
    }
    
    // Calculate delay with exponential backoff if enabled
    let delay = this.config.reconnect?.delay || 1000;
    
    if (this.config.reconnect?.useExponentialBackoff) {
      delay = delay * Math.pow(2, this.reconnectAttempts);
    }
    
    // Increment attempt counter
    this.reconnectAttempts++;
    
    // Schedule reconnect
    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Error reconnecting:', error);
      });
    }, delay);
    
    // Emit event
    this.emitEvent('connection_status_change', {
      status: this.status,
      reconnectAttempt: this.reconnectAttempts,
      nextAttemptDelay: delay
    });
  }
  
  /**
   * Start heartbeat interval
   */
  protected startHeartbeat(): void {
    // Clear any existing heartbeat
    this.clearHeartbeat();
    
    if (!this.config) {
      return;
    }
    
    // Start interval
    const heartbeatInterval = this.config.timeouts?.heartbeat || 30000;
    
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat().catch(error => {
        console.error('Error sending heartbeat:', error);
      });
    }, heartbeatInterval);
  }
  
  /**
   * Clear heartbeat interval
   */
  protected clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Clear reconnect timeout
   */
  protected clearReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  /**
   * Emit an event to the callback
   */
  protected emitEvent<T = unknown>(type: WebSocketEvent['type'], data: T): void {
    if (!this.eventCallback || !this.config) {
      return;
    }
    
    const event: WebSocketEvent<T> = {
      type,
      exchange: this.exchange,
      connectionId: this.config.connectionId,
      timestamp: Date.now(),
      data
    };
    
    this.eventCallback(event);
  }
}
