/**
 * WebSocket Connection Pool
 * 
 * Manages multiple WebSocket connections with advanced features:
 * - Connection pooling for resource efficiency
 * - Centralized connection management
 * - Automatic reconnection and recovery
 * - Standardized message handling across exchanges
 */

import { 
  WebSocketEvent, 
  WebSocketEventHandler, 
  ConnectionOptions, 
  WebSocketConnection,
  ConnectionStatus,
  WebSocketMessage,
  PoolStatistics,
  Subscription,
  ExchangeId
} from './websocket-types';
import { WebSocketEventEmitter } from './websocket-events';
import { Connection } from './websocket-connection';
import { v4 as uuidv4 } from 'uuid';

export class WebSocketPool {
  private connections: Map<string, WebSocketConnection> = new Map();
  private eventEmitter: WebSocketEventEmitter;
  private statsInterval?: number;
  private messageRate = {
    messages: 0,
    lastCalculation: Date.now(),
    currentRate: 0
  };

  constructor() {
    this.eventEmitter = new WebSocketEventEmitter();
    this.startStatsTracking();
  }

  /**
   * Create a new WebSocket connection
   */
  createConnection(options: ConnectionOptions): WebSocketConnection {
    const connection = new Connection(options, this.eventEmitter);
    this.connections.set(connection.id, connection);
    return connection;
  }

  /**
   * Get a connection by ID
   */
  getConnection(id: string): WebSocketConnection | undefined {
    return this.connections.get(id);
  }

  /**
   * Get all connections for a specific exchange
   */
  getConnectionsByExchange(exchange: ExchangeId): WebSocketConnection[] {
    return Array.from(this.connections.values())
      .filter(conn => conn.exchange === exchange);
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values())
      .filter(conn => conn.isActive());
  }

  /**
   * Remove a connection
   */
  removeConnection(id: string): boolean {
    const connection = this.connections.get(id);
    if (connection) {
      connection.disconnect();
      this.connections.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Connect all connections
   */
  async connectAll(): Promise<void> {
    const connectPromises = Array.from(this.connections.values())
      .filter(conn => conn.status === 'closed')
      .map(conn => conn.connect());
    
    await Promise.allSettled(connectPromises);
  }

  /**
   * Disconnect all connections
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.values())
      .map(conn => conn.disconnect());
    
    await Promise.allSettled(disconnectPromises);
  }

  /**
   * Find the best connection for a specific subscription
   * - Checks if any connection already has this subscription
   * - Otherwise finds least loaded connection for the exchange
   * - Creates a new connection if needed
   */
  findBestConnectionForSubscription(
    exchange: ExchangeId, 
    subscription: Subscription, 
    createIfNeeded: boolean = true
  ): WebSocketConnection | undefined {
    // Get all connections for this exchange
    const exchangeConnections = this.getConnectionsByExchange(exchange);
    
    if (exchangeConnections.length === 0) {
      if (!createIfNeeded) return undefined;
      
      // Create a new connection if none exists
      const defaultUrl = this.getDefaultExchangeUrl(exchange);
      if (!defaultUrl) return undefined;
      
      return this.createConnection({
        exchange,
        name: `${exchange}-${subscription.channel}`,
        url: defaultUrl,
        subscriptions: [subscription]
      });
    }
    
    // Find connection that already has this subscription
    const matchingConnection = exchangeConnections.find(conn => 
      conn.subscriptions.some(sub => 
        sub.channel === subscription.channel && 
        this.arraysHaveCommonElements(sub.symbols, subscription.symbols)
      )
    );
    
    if (matchingConnection) return matchingConnection;
    
    // Find connection with least subscriptions
    return exchangeConnections.reduce((best, current) => {
      if (!best) return current;
      return current.subscriptions.length < best.subscriptions.length ? current : best;
    }, undefined as WebSocketConnection | undefined);
  }

  /**
   * Subscribe to a channel across the connection pool
   */
  subscribe(exchange: ExchangeId, subscription: Subscription): WebSocketConnection {
    const connection = this.findBestConnectionForSubscription(exchange, subscription, true)!;
    connection.subscribe(subscription);
    
    // Connect if not already connected
    if (!connection.isActive()) {
      connection.connect();
    }
    
    return connection;
  }

  /**
   * Unsubscribe from a channel across the connection pool
   */
  unsubscribe(exchange: ExchangeId, channel: string, symbols?: string[]): void {
    const connections = this.getConnectionsByExchange(exchange);
    
    for (const connection of connections) {
      // Check if this connection has the channel subscription
      const hasChannel = connection.subscriptions.some(sub => 
        sub.channel === channel && 
        (!symbols || this.arraysHaveCommonElements(sub.symbols, symbols))
      );
      
      if (hasChannel) {
        connection.unsubscribe(channel, symbols);
      }
    }
  }

  /**
   * Register a handler for WebSocket events
   */
  on(event: WebSocketEvent, handler: WebSocketEventHandler): () => void {
    return this.eventEmitter.on(event, handler);
  }

  /**
   * Register a handler for a specific connection's events
   */
  onConnection(connectionId: string, event: WebSocketEvent, handler: WebSocketEventHandler): () => void {
    return this.eventEmitter.onConnection(connectionId, event, handler);
  }

  /**
   * Get statistics about the connection pool
   */
  getStatistics(): PoolStatistics {
    const connectionStats = Array.from(this.connections.values())
      .map(conn => conn.getStatistics());
    
    return {
      totalConnections: this.connections.size,
      activeConnections: this.getActiveConnections().length,
      messageRate: this.messageRate.currentRate,
      connections: connectionStats
    };
  }

  /**
   * Cleanup and release resources
   */
  destroy(): void {
    this.disconnectAll();
    this.connections.clear();
    this.eventEmitter.removeAllListeners();
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
  }

  /**
   * Start tracking statistics
   */
  private startStatsTracking(): void {
    // Track message rate
    this.eventEmitter.on(WebSocketEvent.MessageReceived, () => {
      this.messageRate.messages++;
    });
    
    // Calculate statistics every 5 seconds
    this.statsInterval = window.setInterval(() => {
      const now = Date.now();
      const elapsed = (now - this.messageRate.lastCalculation) / 1000;
      
      if (elapsed > 0) {
        this.messageRate.currentRate = this.messageRate.messages / elapsed;
      }
      
      this.messageRate.messages = 0;
      this.messageRate.lastCalculation = now;
      
      // Emit statistics event
      this.eventEmitter.emit(WebSocketEvent.Statistics, this.getStatistics());
    }, 5000);
  }

  /**
   * Get default WebSocket URL for an exchange
   */
  private getDefaultExchangeUrl(exchange: ExchangeId): string | undefined {
    const exchangeUrls: Record<ExchangeId, string> = {
      'binance': 'wss://stream.binance.com:9443/ws',
      'coinbase': 'wss://ws-feed.exchange.coinbase.com',
      'kraken': 'wss://ws.kraken.com',
      'kucoin': 'wss://ws-api.kucoin.com/endpoint', // KuCoin requires a token first
      'bybit': 'wss://stream.bybit.com/realtime'
    };
    
    return exchangeUrls[exchange];
  }
  
  /**
   * Check if two arrays have any common elements
   */
  private arraysHaveCommonElements(array1: string[], array2: string[]): boolean {
    return array1.some(item => array2.includes(item));
  }
}
