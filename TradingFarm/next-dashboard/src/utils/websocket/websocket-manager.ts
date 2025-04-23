/**
 * WebSocket Manager
 * 
 * Central service for managing WebSocket connections across the application.
 * Integrates the WebSocket pool, event system, and message parser.
 */

import { WebSocketPool } from './websocket-pool';
import { ExchangeMessageParser } from './exchange-message-parser';
import { 
  ExchangeId,
  WebSocketEvent,
  WebSocketMessage,
  ParsedMessage,
  ConnectionOptions,
  WebSocketConnection,
  MessageType,
  Subscription
} from './websocket-types';
import { v4 as uuidv4 } from 'uuid';

// Singleton instance
let instance: WebSocketManager | null = null;

export class WebSocketManager {
  private pool: WebSocketPool;
  private parser: ExchangeMessageParser;
  private messageListeners: Map<string, (message: ParsedMessage) => void> = new Map();
  private marketDataSubscriptions: Map<string, Set<string>> = new Map();
  private initialized = false;

  private constructor() {
    this.pool = new WebSocketPool();
    this.parser = new ExchangeMessageParser();
    this.setupGlobalListeners();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): WebSocketManager {
    if (!instance) {
      instance = new WebSocketManager();
    }
    return instance;
  }

  /**
   * Initialize the WebSocket manager
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    console.log('[WebSocketManager] Initialized');
  }

  /**
   * Get the WebSocket pool
   */
  getPool(): WebSocketPool {
    return this.pool;
  }

  /**
   * Create a new connection to an exchange
   */
  createConnection(options: ConnectionOptions): WebSocketConnection {
    return this.pool.createConnection(options);
  }

  /**
   * Subscribe to market data for a specific exchange and symbol
   */
  subscribeToMarketData(
    exchange: ExchangeId,
    symbols: string[],
    channels: string[],
    listener: (message: ParsedMessage) => void
  ): string {
    const listenerId = uuidv4();
    this.messageListeners.set(listenerId, listener);
    
    // Keep track of which symbols this listener is subscribed to
    const subscriptionKey = `${exchange}:${listenerId}`;
    this.marketDataSubscriptions.set(subscriptionKey, new Set(symbols));
    
    // Create subscriptions for each channel
    channels.forEach(channel => {
      const subscription: Subscription = {
        channel,
        symbols,
      };
      
      this.pool.subscribe(exchange, subscription);
    });
    
    return listenerId;
  }

  /**
   * Unsubscribe from market data
   */
  unsubscribeFromMarketData(listenerId: string): void {
    // Remove the listener
    this.messageListeners.delete(listenerId);
    
    // Find and remove associated subscriptions
    for (const [key, symbols] of this.marketDataSubscriptions.entries()) {
      if (key.endsWith(`:${listenerId}`)) {
        const [exchange] = key.split(':');
        
        // Unsubscribe from each channel that this listener was using
        const connections = this.pool.getConnectionsByExchange(exchange as ExchangeId);
        
        if (connections.length > 0) {
          // Get all unique channels across all connections
          const channelsSet = new Set<string>();
          connections.forEach(conn => {
            conn.subscriptions.forEach(sub => {
              channelsSet.add(sub.channel);
            });
          });
          
          // Unsubscribe from each channel
          channelsSet.forEach(channel => {
            this.pool.unsubscribe(exchange as ExchangeId, channel, Array.from(symbols));
          });
        }
        
        this.marketDataSubscriptions.delete(key);
      }
    }
  }

  /**
   * Add symbols to an existing market data subscription
   */
  addSymbolsToSubscription(
    listenerId: string,
    exchange: ExchangeId,
    symbols: string[],
    channels: string[]
  ): void {
    const subscriptionKey = `${exchange}:${listenerId}`;
    const existingSymbols = this.marketDataSubscriptions.get(subscriptionKey);
    
    if (!existingSymbols) {
      // If no existing subscription, create a new one
      this.subscribeToMarketData(
        exchange,
        symbols,
        channels,
        this.messageListeners.get(listenerId)!
      );
      return;
    }
    
    // Add new symbols to the existing set
    symbols.forEach(symbol => existingSymbols.add(symbol));
    
    // Create subscriptions for each channel
    channels.forEach(channel => {
      const subscription: Subscription = {
        channel,
        symbols,
      };
      
      this.pool.subscribe(exchange, subscription);
    });
  }

  /**
   * Remove symbols from an existing market data subscription
   */
  removeSymbolsFromSubscription(
    listenerId: string,
    exchange: ExchangeId,
    symbols: string[]
  ): void {
    const subscriptionKey = `${exchange}:${listenerId}`;
    const existingSymbols = this.marketDataSubscriptions.get(subscriptionKey);
    
    if (!existingSymbols) return;
    
    // Remove symbols from the set
    symbols.forEach(symbol => existingSymbols.delete(symbol));
    
    // Get all channels for this exchange
    const connections = this.pool.getConnectionsByExchange(exchange);
    const channelsSet = new Set<string>();
    
    connections.forEach(conn => {
      conn.subscriptions.forEach(sub => {
        channelsSet.add(sub.channel);
      });
    });
    
    // Unsubscribe from each channel for the removed symbols
    channelsSet.forEach(channel => {
      this.pool.unsubscribe(exchange, channel, symbols);
    });
    
    // If no symbols left, remove the subscription entirely
    if (existingSymbols.size === 0) {
      this.unsubscribeFromMarketData(listenerId);
    }
  }

  /**
   * Register listener for WebSocket events
   */
  on(event: WebSocketEvent, handler: (data: any, connection?: WebSocketConnection) => void): () => void {
    return this.pool.on(event, handler);
  }

  /**
   * Get all connections
   */
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.pool.getActiveConnections());
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.pool.disconnectAll();
    this.messageListeners.clear();
    this.marketDataSubscriptions.clear();
    this.initialized = false;
  }

  /**
   * Setup global event listeners
   */
  private setupGlobalListeners(): void {
    // Listen for messages from all connections
    this.pool.on(WebSocketEvent.MessageReceived, (message: WebSocketMessage, connection?: WebSocketConnection) => {
      if (!connection) return;
      
      // Parse the message
      const parsedMessage = this.parser.parseMessage(connection.exchange, message);
      if (!parsedMessage) return;
      
      // Dispatch to appropriate listeners
      this.dispatchMessage(parsedMessage, connection);
    });
    
    // Log connection status changes
    this.pool.on(WebSocketEvent.Connected, (_, connection) => {
      console.log(`[WebSocketManager] Connection established: ${connection?.name}`);
    });
    
    this.pool.on(WebSocketEvent.Disconnected, (_, connection) => {
      console.log(`[WebSocketManager] Connection closed: ${connection?.name}`);
    });
    
    this.pool.on(WebSocketEvent.Error, (error, connection) => {
      console.error(`[WebSocketManager] Connection error: ${connection?.name}`, error);
    });
  }

  /**
   * Dispatch a parsed message to the appropriate listeners
   */
  private dispatchMessage(message: ParsedMessage, connection: WebSocketConnection): void {
    const { exchange, symbol, type } = message;
    
    // Find listeners that are subscribed to this symbol
    for (const [listenerId, listener] of this.messageListeners.entries()) {
      const subscriptionKey = `${exchange}:${listenerId}`;
      const subscribedSymbols = this.marketDataSubscriptions.get(subscriptionKey);
      
      // If this listener is subscribed to this symbol
      if (subscribedSymbols && (
          subscribedSymbols.has(symbol) || 
          subscribedSymbols.has('*')  // Special case for "all symbols"
      )) {
        try {
          listener(message);
        } catch (error) {
          console.error(`[WebSocketManager] Error in message listener:`, error);
        }
      }
    }
    
    // Also emit as an event for general subscribers
    this.pool.getPool()?.eventEmitter.emit(
      WebSocketEvent.ParsedMessage, 
      message, 
      connection
    );
  }
}
