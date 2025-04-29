/**
 * Exchange WebSocket Connection
 * 
 * Handles WebSocket connections to specific exchanges
 * Implements reconnection logic, heartbeats, and message handling
 */

import {
  WebSocketConfig,
  WebSocketConnectionStatus,
  WebSocketEvent,
  WebSocketEventCallback,
} from './types';

/**
 * Class representing a WebSocket connection to a specific exchange
 */
export class ExchangeWebSocketConnection {
  /**
   * The exchange this connection is for
   */
  private exchange: string;
  
  /**
   * Configuration for the connection
   */
  private config: WebSocketConfig;
  
  /**
   * The WebSocket instance
   */
  private socket: WebSocket | null = null;
  
  /**
   * The current status of the connection
   */
  private status: WebSocketConnectionStatus = 'disconnected';
  
  /**
   * Heartbeat interval ID
   */
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  /**
   * Reconnection timeout ID
   */
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  /**
   * Current reconnection attempt count
   */
  private reconnectAttempts = 0;
  
  /**
   * Map of active subscriptions
   * Key is channel, value is array of symbols
   */
  private subscriptions: Map<string, { symbols: string[]; id: number }> = new Map();
  
  /**
   * The database record ID for this connection
   */
  private connectionRecordId: number;
  
  /**
   * Event callback function
   */
  private eventCallback: WebSocketEventCallback;
  
  /**
   * Constructor
   * 
   * @param exchange - The exchange this connection is for
   * @param config - Configuration for the connection
   * @param connectionRecordId - The database record ID for this connection
   * @param eventCallback - Callback function for events
   */
  constructor(
    exchange: string,
    config: WebSocketConfig,
    connectionRecordId: number,
    eventCallback: WebSocketEventCallback
  ) {
    this.exchange = exchange;
    this.config = config;
    this.connectionRecordId = connectionRecordId;
    this.eventCallback = eventCallback;
  }
  
  /**
   * Connect to the WebSocket
   * 
   * @returns Promise resolving to a boolean indicating success
   */
  public async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Update status
        this.status = 'connecting';
        this.emitEvent('connection_status_change', { status: this.status });
        
        // Create WebSocket
        this.socket = new WebSocket(this.config.url);
        
        // Set timeout for connection
        const connectionTimeout = setTimeout(() => {
          if (this.status === 'connecting') {
            this.handleError(new Error('Connection timeout'));
            resolve(false);
          }
        }, this.config.timeouts?.connection || 10000);
        
        // Set up event handlers
        this.socket.onopen = () => {
          clearTimeout(connectionTimeout);
          this.handleOpen();
          resolve(true);
        };
        
        this.socket.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this.handleClose(event);
          if (this.status === 'connecting') {
            resolve(false);
          }
        };
        
        this.socket.onerror = (event) => {
          clearTimeout(connectionTimeout);
          this.handleError(event);
          if (this.status === 'connecting') {
            resolve(false);
          }
        };
        
        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };
      } catch (error) {
        this.handleError(error);
        resolve(false);
      }
    });
  }
  
  /**
   * Disconnect from the WebSocket
   * 
   * @returns Promise resolving to a boolean indicating success
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
   * 
   * @param channel - The channel to subscribe to
   * @param symbols - The symbols to subscribe to
   * @param params - Additional parameters for the subscription
   * @param subscriptionId - The database record ID for this subscription
   * @returns Promise resolving to a boolean indicating success
   */
  public async subscribe(
    channel: string,
    symbols: string[],
    params?: Record<string, unknown>,
    subscriptionId?: number
  ): Promise<boolean> {
    try {
      if (!this.socket || this.status !== 'connected') {
        throw new Error('Socket not connected');
      }
      
      // Exchange-specific subscription message
      const subscriptionMessage = this.createSubscriptionMessage(channel, symbols, params);
      
      // Send subscription message
      this.socket.send(JSON.stringify(subscriptionMessage));
      
      // Store subscription
      this.subscriptions.set(channel, { 
        symbols, 
        id: subscriptionId || 0 
      });
      
      // Emit event
      this.emitEvent('subscription_status_change', {
        channel,
        symbols,
        status: 'subscribed'
      });
      
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }
  
  /**
   * Unsubscribe from a channel for specific symbols
   * 
   * @param channel - The channel to unsubscribe from
   * @param symbols - Optional symbols to unsubscribe from (if empty, unsubscribe from all symbols in the channel)
   * @returns Promise resolving to a boolean indicating success
   */
  public async unsubscribe(channel: string, symbols?: string[]): Promise<boolean> {
    try {
      if (!this.socket || this.status !== 'connected') {
        throw new Error('Socket not connected');
      }
      
      const subscription = this.subscriptions.get(channel);
      
      if (!subscription) {
        throw new Error(`Not subscribed to channel ${channel}`);
      }
      
      // If symbols not provided, unsubscribe from all symbols in the channel
      const symbolsToUnsubscribe = symbols || subscription.symbols;
      
      // Exchange-specific unsubscription message
      const unsubscriptionMessage = this.createUnsubscriptionMessage(channel, symbolsToUnsubscribe);
      
      // Send unsubscription message
      this.socket.send(JSON.stringify(unsubscriptionMessage));
      
      // Update subscription
      if (!symbols) {
        // If no symbols provided, remove the entire subscription
        this.subscriptions.delete(channel);
      } else {
        // Otherwise, remove only the specified symbols
        const remainingSymbols = subscription.symbols.filter(s => !symbols.includes(s));
        
        if (remainingSymbols.length === 0) {
          // If no symbols left, remove the entire subscription
          this.subscriptions.delete(channel);
        } else {
          // Otherwise, update the subscription
          this.subscriptions.set(channel, { 
            symbols: remainingSymbols, 
            id: subscription.id 
          });
        }
      }
      
      // Emit event
      this.emitEvent('subscription_status_change', {
        channel,
        symbols: symbolsToUnsubscribe,
        status: 'unsubscribed'
      });
      
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }
  
  /**
   * Get the current status of the connection
   * 
   * @returns The current status
   */
  public getStatus(): WebSocketConnectionStatus {
    return this.status;
  }
  
  /**
   * Get the database record ID for this connection
   * 
   * @returns The connection record ID
   */
  public getConnectionRecordId(): number {
    return this.connectionRecordId;
  }
  
  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    this.status = 'connected';
    this.reconnectAttempts = 0;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Emit event
    this.emitEvent('connection_status_change', { status: this.status });
    
    // Resubscribe to all channels
    this.resubscribeAll();
  }
  
  /**
   * Handle WebSocket close event
   * 
   * @param event - The close event
   */
  private handleClose(event: CloseEvent): void {
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
    if (wasConnected && this.config.reconnect?.auto) {
      this.attemptReconnect();
    }
  }
  
  /**
   * Handle WebSocket error event
   * 
   * @param error - The error event or object
   */
  private handleError(error: Event | Error | unknown): void {
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
    if (this.config.reconnect?.auto) {
      this.attemptReconnect();
    }
  }
  
  /**
   * Handle WebSocket message event
   * 
   * @param event - The message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      // Parse message
      const message = JSON.parse(event.data.toString());
      
      // Emit event
      this.emitEvent('message', message);
      
      // Update heartbeat
      this.updateHeartbeat();
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }
  
  /**
   * Attempt to reconnect to the WebSocket
   */
  private attemptReconnect(): void {
    // Clear any existing reconnect timeout
    this.clearReconnect();
    
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
  private startHeartbeat(): void {
    // Clear any existing heartbeat
    this.clearHeartbeat();
    
    // Start interval
    const heartbeatInterval = this.config.timeouts?.heartbeat || 30000;
    
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, heartbeatInterval);
  }
  
  /**
   * Clear heartbeat interval
   */
  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Clear reconnect timeout
   */
  private clearReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  /**
   * Send heartbeat message
   */
  private sendHeartbeat(): void {
    if (!this.socket || this.status !== 'connected') {
      return;
    }
    
    try {
      // Exchange-specific heartbeat message
      const heartbeatMessage = this.createHeartbeatMessage();
      
      // Send heartbeat
      if (heartbeatMessage) {
        this.socket.send(JSON.stringify(heartbeatMessage));
      }
      
      // Emit event
      this.emitEvent('heartbeat', { timestamp: Date.now() });
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }
  
  /**
   * Update heartbeat timestamp
   */
  private updateHeartbeat(): void {
    // Emit heartbeat event
    this.emitEvent('heartbeat', { timestamp: Date.now() });
  }
  
  /**
   * Resubscribe to all channels
   */
  private async resubscribeAll(): Promise<void> {
    for (const [channel, subscription] of this.subscriptions.entries()) {
      try {
        await this.subscribe(channel, subscription.symbols, undefined, subscription.id);
      } catch (error) {
        console.error(`Error resubscribing to ${channel}:`, error);
      }
    }
  }
  
  /**
   * Create exchange-specific subscription message
   * 
   * @param channel - The channel to subscribe to
   * @param symbols - The symbols to subscribe to
   * @param params - Additional parameters for the subscription
   * @returns The subscription message object
   */
  private createSubscriptionMessage(
    channel: string,
    symbols: string[],
    params?: Record<string, unknown>
  ): unknown {
    // This implementation will vary by exchange
    // Here's a generic implementation that will need to be overridden
    
    // Generic format that works for many exchanges
    return {
      method: 'subscribe',
      params: [
        channel,
        ...symbols
      ],
      ...params
    };
  }
  
  /**
   * Create exchange-specific unsubscription message
   * 
   * @param channel - The channel to unsubscribe from
   * @param symbols - The symbols to unsubscribe from
   * @returns The unsubscription message object
   */
  private createUnsubscriptionMessage(channel: string, symbols: string[]): unknown {
    // This implementation will vary by exchange
    // Here's a generic implementation that will need to be overridden
    
    // Generic format that works for many exchanges
    return {
      method: 'unsubscribe',
      params: [
        channel,
        ...symbols
      ]
    };
  }
  
  /**
   * Create exchange-specific heartbeat message
   * 
   * @returns The heartbeat message object or null if not required
   */
  private createHeartbeatMessage(): unknown | null {
    // This implementation will vary by exchange
    // Some exchanges don't require heartbeats, so return null
    // Here's a generic implementation that will need to be overridden
    
    // Generic format that works for many exchanges
    return {
      method: 'ping',
      params: [Date.now()]
    };
  }
  
  /**
   * Emit an event to the callback
   * 
   * @param type - The event type
   * @param data - The event data
   */
  private emitEvent<T = unknown>(type: WebSocketEvent['type'], data: T): void {
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
