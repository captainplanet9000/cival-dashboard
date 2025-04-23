/**
 * WebSocket Connection
 * 
 * Handles individual WebSocket connections with advanced features:
 * - Automatic reconnection
 * - Heartbeat monitoring
 * - Subscription management
 * - Message parsing
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  ConnectionOptions, 
  ConnectionStatus, 
  WebSocketConnection,
  WebSocketMessage,
  Subscription,
  WebSocketEvent
} from './websocket-types';
import { WebSocketEventEmitter } from './websocket-events';

export class Connection implements WebSocketConnection {
  // Required properties from interface
  id: string;
  status: ConnectionStatus;
  exchange: string;
  name: string;
  url: string;
  socket: WebSocket | null;
  options: ConnectionOptions;
  subscriptions: Subscription[];
  lastMessageTime: number;
  reconnectAttempts: number;
  heartbeatInterval?: number;
  reconnectTimeout?: any;
  heartbeatTimeout?: any;

  // Additional tracking properties
  private messageStats = {
    inbound: 0,
    outbound: 0
  };
  private startTime: number;
  private latencyHistory: number[] = [];
  private eventEmitter: WebSocketEventEmitter;

  constructor(options: ConnectionOptions, eventEmitter: WebSocketEventEmitter) {
    this.id = uuidv4();
    this.status = 'closed';
    this.exchange = options.exchange;
    this.name = options.name;
    this.url = options.url;
    this.socket = null;
    this.options = {
      ...{
        autoReconnect: true,
        maxReconnectAttempts: 10,
        reconnectInterval: 5000,
        heartbeatInterval: 30000,
      },
      ...options
    };
    this.subscriptions = options.subscriptions || [];
    this.lastMessageTime = 0;
    this.reconnectAttempts = 0;
    this.startTime = Date.now();
    this.eventEmitter = eventEmitter;
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    if (this.socket && (this.status === 'open' || this.status === 'connecting')) {
      console.warn(`[WebSocket] Connection ${this.id} is already ${this.status}`);
      return;
    }

    this.setStatus('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url, this.options.protocols);

        // Setup event handlers
        this.socket.onopen = () => {
          this.setStatus('open');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.subscribeAll();
          
          console.log(`[WebSocket] Connected to ${this.exchange} (${this.name})`);
          this.eventEmitter.emit(WebSocketEvent.Connected, { connectionId: this.id }, this);
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.socket.onerror = (event) => {
          console.error(`[WebSocket] Error on ${this.exchange} (${this.name}):`, event);
          this.eventEmitter.emit(WebSocketEvent.Error, { 
            connectionId: this.id, 
            error: event 
          }, this);
          
          if (this.options.onError) {
            this.options.onError(new Error('WebSocket error'), this);
          }
        };

        this.socket.onclose = () => {
          const wasConnected = this.status === 'open';
          this.setStatus('closed');
          this.stopHeartbeat();
          
          console.log(`[WebSocket] Disconnected from ${this.exchange} (${this.name})`);
          this.eventEmitter.emit(WebSocketEvent.Disconnected, { connectionId: this.id }, this);
          
          // Handle reconnection if the connection was previously established
          // and auto-reconnect is enabled
          if (wasConnected && this.options.autoReconnect) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.setStatus('error');
        console.error(`[WebSocket] Connection error for ${this.exchange} (${this.name}):`, error);
        this.eventEmitter.emit(WebSocketEvent.Error, { 
          connectionId: this.id, 
          error 
        }, this);
        
        if (this.options.onError) {
          this.options.onError(error as Error, this);
        }
        
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  async disconnect(): Promise<void> {
    this.setStatus('closing');
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {
        console.error(`[WebSocket] Error closing connection ${this.id}:`, error);
      }
      this.socket = null;
    }

    this.setStatus('closed');
    return Promise.resolve();
  }

  /**
   * Send data to the WebSocket server
   */
  send(data: any): void {
    if (!this.isActive()) {
      console.warn(`[WebSocket] Cannot send message, connection ${this.id} is not active`);
      return;
    }

    try {
      // Stringify data if it's an object
      const message = typeof data === 'object' ? JSON.stringify(data) : data;
      this.socket!.send(message);
      this.messageStats.outbound++;
      
      // For debugging - log outbound messages
      // console.debug(`[WebSocket] >>> ${this.exchange} (${this.name}): ${message}`);
    } catch (error) {
      console.error(`[WebSocket] Error sending message on ${this.exchange} (${this.name}):`, error);
    }
  }

  /**
   * Subscribe to a channel
   */
  subscribe(subscription: Subscription): void {
    // Check if already subscribed
    const existingIndex = this.subscriptions.findIndex(
      sub => sub.channel === subscription.channel && 
             JSON.stringify(sub.symbols.sort()) === JSON.stringify(subscription.symbols.sort())
    );
    
    if (existingIndex >= 0) {
      // Update the subscription params if they exist
      if (subscription.params) {
        this.subscriptions[existingIndex].params = {
          ...this.subscriptions[existingIndex].params,
          ...subscription.params
        };
      }
      return;
    }
    
    // Add new subscription
    this.subscriptions.push(subscription);
    
    // If connection is active, send the subscription message
    if (this.isActive()) {
      this.sendSubscription(subscription);
    }
    
    // Notify subscribers
    this.eventEmitter.emit(WebSocketEvent.SubscriptionChanged, {
      connectionId: this.id,
      subscription,
      action: 'subscribe'
    }, this);
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string, symbols?: string[]): void {
    const initialCount = this.subscriptions.length;
    
    if (symbols && symbols.length > 0) {
      // Unsubscribe from specific symbols in the channel
      this.subscriptions = this.subscriptions.map(sub => {
        if (sub.channel === channel) {
          return {
            ...sub,
            symbols: sub.symbols.filter(s => !symbols.includes(s))
          };
        }
        return sub;
      }).filter(sub => sub.symbols.length > 0);
    } else {
      // Unsubscribe from entire channel
      this.subscriptions = this.subscriptions.filter(sub => sub.channel !== channel);
    }
    
    // If subscriptions changed and connection is active, send unsubscription message
    if (initialCount !== this.subscriptions.length && this.isActive()) {
      // Format depends on exchange implementation
      if (this.options.formatters?.formatSubscription) {
        const unsubMsg = this.options.formatters.formatSubscription({
          channel,
          symbols: symbols || [],
          params: { action: 'unsubscribe' }
        });
        this.send(unsubMsg);
      }
    }
    
    // Notify subscribers
    this.eventEmitter.emit(WebSocketEvent.SubscriptionChanged, {
      connectionId: this.id,
      channel,
      symbols,
      action: 'unsubscribe'
    }, this);
  }

  /**
   * Check if the connection is active (open)
   */
  isActive(): boolean {
    return this.socket !== null && this.status === 'open';
  }

  /**
   * Get connection statistics
   */
  getStatistics() {
    return {
      connectionId: this.id,
      exchange: this.exchange,
      status: this.status,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      messageCount: {
        inbound: this.messageStats.inbound,
        outbound: this.messageStats.outbound,
        total: this.messageStats.inbound + this.messageStats.outbound
      },
      lastMessageTime: this.lastMessageTime,
      reconnectCount: this.reconnectAttempts,
      latency: this.latencyHistory.length > 0 
        ? this.latencyHistory.reduce((sum, val) => sum + val, 0) / this.latencyHistory.length 
        : 0
    };
  }

  /**
   * Set connection status and notify listeners
   */
  private setStatus(status: ConnectionStatus): void {
    const previousStatus = this.status;
    this.status = status;
    
    // Notify status change if different
    if (previousStatus !== status) {
      if (this.options.onStatusChange) {
        this.options.onStatusChange(status, this);
      }
      
      this.eventEmitter.emit(WebSocketEvent.StatusChanged, {
        connectionId: this.id,
        status,
        previousStatus
      }, this);
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: any): void {
    this.lastMessageTime = Date.now();
    this.messageStats.inbound++;
    
    // Parse message based on exchange format
    try {
      let parsedMessage: WebSocketMessage;
      
      if (this.options.formatters?.parseMessage) {
        parsedMessage = this.options.formatters.parseMessage(data);
      } else {
        // Default parsing - assume JSON
        const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
        parsedMessage = {
          exchange: this.exchange as any,
          timestamp: Date.now(),
          type: 'system',
          direction: 'inbound',
          data: jsonData,
          raw: data
        };
      }
      
      // For debugging
      // console.debug(`[WebSocket] <<< ${this.exchange} (${this.name}): ${JSON.stringify(parsedMessage).substring(0, 200)}...`);
      
      // Handle heartbeat responses
      if (parsedMessage.type === 'heartbeat') {
        this.handleHeartbeatResponse();
      }
      
      // Pass message to callback if provided
      if (this.options.onMessage) {
        this.options.onMessage(parsedMessage);
      }
      
      // Emit message event
      this.eventEmitter.emit(WebSocketEvent.MessageReceived, parsedMessage, this);
    } catch (error) {
      console.error(`[WebSocket] Error parsing message from ${this.exchange} (${this.name}):`, error);
    }
  }

  /**
   * Send subscription message for all subscriptions
   */
  private subscribeAll(): void {
    if (!this.isActive() || this.subscriptions.length === 0) return;
    
    this.subscriptions.forEach(subscription => {
      this.sendSubscription(subscription);
    });
  }

  /**
   * Send a single subscription message
   */
  private sendSubscription(subscription: Subscription): void {
    if (!this.isActive()) return;
    
    try {
      if (this.options.formatters?.formatSubscription) {
        const subMsg = this.options.formatters.formatSubscription(subscription);
        this.send(subMsg);
      } else {
        // Default format - may not work for all exchanges
        this.send({
          method: 'SUBSCRIBE',
          params: subscription.symbols.map(s => `${subscription.channel}@${s}`),
          id: Date.now()
        });
      }
    } catch (error) {
      console.error(`[WebSocket] Error sending subscription for ${this.exchange} (${this.name}):`, error);
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    if (!this.options.heartbeatInterval || this.options.heartbeatInterval <= 0) {
      return;
    }
    
    this.heartbeatInterval = window.setInterval(() => {
      this.sendHeartbeat();
    }, this.options.heartbeatInterval);
    
    // Also set a timeout to check if we're receiving responses
    this.checkHeartbeat();
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = undefined;
    }
  }

  /**
   * Send heartbeat message
   */
  private sendHeartbeat(): void {
    if (!this.isActive()) return;
    
    try {
      // Use exchange-specific heartbeat format if available
      if (this.options.formatters?.formatHeartbeat) {
        const heartbeatMsg = this.options.formatters.formatHeartbeat();
        this.send(heartbeatMsg);
      } else if (this.options.heartbeatMessage) {
        // Use provided heartbeat message
        this.send(this.options.heartbeatMessage);
      } else {
        // Default ping
        this.send('ping');
      }
      
      // Measure latency with a simple timeout
      const sentTime = Date.now();
      const latencyTimeout = setTimeout(() => {
        // If this executes, we didn't receive a heartbeat response
        this.latencyHistory.push(Date.now() - sentTime);
        // Keep a sliding window of the last 10 measurements
        if (this.latencyHistory.length > 10) {
          this.latencyHistory.shift();
        }
      }, 5000);
      
      // Store the timeout ID somewhere if we need to cancel it when response comes
    } catch (error) {
      console.error(`[WebSocket] Error sending heartbeat for ${this.exchange} (${this.name}):`, error);
    }
  }

  /**
   * Handle heartbeat response
   */
  private handleHeartbeatResponse(): void {
    // Reset heartbeat check
    this.checkHeartbeat();
  }

  /**
   * Check if heartbeats are being received
   */
  private checkHeartbeat(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
    }
    
    if (!this.isActive() || !this.options.heartbeatInterval) return;
    
    // Set timeout for 2.5x the heartbeat interval
    // If we don't receive a message in that time, consider the connection stale
    const timeoutDuration = this.options.heartbeatInterval * 2.5;
    
    this.heartbeatTimeout = setTimeout(() => {
      const timeSinceLastMessage = Date.now() - this.lastMessageTime;
      
      if (timeSinceLastMessage > timeoutDuration) {
        console.warn(
          `[WebSocket] Heartbeat missed for ${this.exchange} (${this.name}). ` +
          `Last message received ${timeSinceLastMessage}ms ago.`
        );
        
        this.eventEmitter.emit(WebSocketEvent.HeartbeatMissed, {
          connectionId: this.id,
          timeSinceLastMessage
        }, this);
        
        // Force reconnection
        this.reconnect();
      } else {
        // Check again after some time
        this.checkHeartbeat();
      }
    }, timeoutDuration);
  }

  /**
   * Schedule reconnection after disconnect
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Check if we've exceeded max reconnect attempts
    if (
      this.options.maxReconnectAttempts !== undefined && 
      this.reconnectAttempts >= this.options.maxReconnectAttempts
    ) {
      console.error(
        `[WebSocket] Maximum reconnect attempts (${this.options.maxReconnectAttempts}) ` +
        `reached for ${this.exchange} (${this.name}).`
      );
      return;
    }
    
    // Exponential backoff with jitter
    const baseDelay = this.options.reconnectInterval || 5000;
    const exponentialBackoff = Math.min(30000, baseDelay * Math.pow(1.5, this.reconnectAttempts));
    const jitter = Math.random() * 0.3 * exponentialBackoff; // Add up to 30% jitter
    const delay = exponentialBackoff + jitter;
    
    console.log(
      `[WebSocket] Scheduling reconnect for ${this.exchange} (${this.name}) ` +
      `in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts + 1})`
    );
    
    this.eventEmitter.emit(WebSocketEvent.Reconnecting, {
      connectionId: this.id,
      attempt: this.reconnectAttempts + 1,
      delay
    }, this);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  /**
   * Reconnect to WebSocket server
   */
  private async reconnect(): Promise<void> {
    if (this.status === 'connecting') return;
    
    this.reconnectAttempts++;
    
    // Clean up existing connection
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        // Ignore errors when closing an already broken connection
      }
      this.socket = null;
    }
    
    // Reconnect
    try {
      await this.connect();
    } catch (error) {
      console.error(
        `[WebSocket] Failed to reconnect to ${this.exchange} (${this.name}): `, 
        error
      );
      
      // Schedule another reconnect
      this.scheduleReconnect();
    }
  }
}
