/**
 * Unified WebSocket Manager
 * 
 * Provides a single interface for managing WebSocket connections to all supported exchanges.
 * Handles connection management, authentication, subscription handling, and normalized data delivery.
 */
import { ExchangeType } from './exchange-service';
import { ExchangeDataType } from './exchange-websocket-service';
import bybitWebSocketAdapter from './exchanges/bybit-websocket-adapter';
import coinbaseWebSocketAdapter from './exchanges/coinbase-websocket-adapter';
import hyperliquidWebSocketAdapter from './exchanges/hyperliquid-websocket-adapter';
import websocketService, { WebSocketTopic } from './websocket-service';

export type { WebSocketEvent } from './exchanges/bybit-websocket-adapter';

// Function type for WebSocket event callbacks
export type WebSocketCallback = (event: any) => void;

/**
 * Class to manage all exchange WebSocket connections
 */
class UnifiedWebSocketManager {
  private userId: string | null = null;
  private connectionStatus: Map<ExchangeType, boolean> = new Map();
  private callbacks: Map<string, Set<WebSocketCallback>> = new Map();
  
  /**
   * Initialize the WebSocket manager with user ID
   * @param userId The user ID for authentication
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    
    // Initialize all adapters
    await Promise.all([
      bybitWebSocketAdapter.initialize(userId),
      coinbaseWebSocketAdapter.initialize(userId),
      hyperliquidWebSocketAdapter.initialize(userId)
    ]);
    
    // Setup callbacks to relay events to the main WebSocket service
    this.setupRelayCallbacks();
  }
  
  /**
   * Connect to an exchange WebSocket
   * @param exchange The exchange to connect to
   */
  async connect(exchange: ExchangeType): Promise<boolean> {
    if (!this.userId) {
      console.error('User ID not set. Call initialize() first.');
      return false;
    }
    
    let success = false;
    
    switch (exchange) {
      case ExchangeType.BYBIT:
        success = await bybitWebSocketAdapter.connect();
        break;
      case ExchangeType.COINBASE:
        success = await coinbaseWebSocketAdapter.connect();
        break;
      case ExchangeType.HYPERLIQUID:
        success = await hyperliquidWebSocketAdapter.connect();
        break;
      default:
        console.error(`Unsupported exchange: ${exchange}`);
        return false;
    }
    
    this.connectionStatus.set(exchange, success);
    return success;
  }
  
  /**
   * Disconnect from an exchange WebSocket
   * @param exchange The exchange to disconnect from
   */
  disconnect(exchange: ExchangeType): void {
    switch (exchange) {
      case ExchangeType.BYBIT:
        bybitWebSocketAdapter.disconnect();
        break;
      case ExchangeType.COINBASE:
        coinbaseWebSocketAdapter.disconnect();
        break;
      case ExchangeType.HYPERLIQUID:
        hyperliquidWebSocketAdapter.disconnect();
        break;
    }
    
    this.connectionStatus.set(exchange, false);
  }
  
  /**
   * Subscribe to data from an exchange
   * @param exchange The exchange to subscribe to
   * @param type The type of data to subscribe to
   * @param symbol The trading symbol
   * @param interval Optional interval for kline data
   */
  subscribe(exchange: ExchangeType, type: ExchangeDataType, symbol: string, interval?: string): boolean {
    // Connect first if not connected
    if (!this.connectionStatus.get(exchange)) {
      this.connect(exchange);
      return false; // Return false but the subscription will happen after connection
    }
    
    let success = false;
    
    switch (exchange) {
      case ExchangeType.BYBIT:
        success = bybitWebSocketAdapter.subscribe(type, symbol, interval);
        break;
      case ExchangeType.COINBASE:
        success = coinbaseWebSocketAdapter.subscribe(type, symbol, interval);
        break;
      case ExchangeType.HYPERLIQUID:
        success = hyperliquidWebSocketAdapter.subscribe(type, symbol, interval);
        break;
    }
    
    return success;
  }
  
  /**
   * Unsubscribe from data from an exchange
   * @param exchange The exchange to unsubscribe from
   * @param type The type of data to unsubscribe from
   * @param symbol The trading symbol
   * @param interval Optional interval for kline data
   */
  unsubscribe(exchange: ExchangeType, type: ExchangeDataType, symbol: string, interval?: string): boolean {
    if (!this.connectionStatus.get(exchange)) {
      return false;
    }
    
    let success = false;
    
    switch (exchange) {
      case ExchangeType.BYBIT:
        success = bybitWebSocketAdapter.unsubscribe(type, symbol, interval);
        break;
      case ExchangeType.COINBASE:
        success = coinbaseWebSocketAdapter.unsubscribe(type, symbol, interval);
        break;
      case ExchangeType.HYPERLIQUID:
        success = hyperliquidWebSocketAdapter.unsubscribe(type, symbol, interval);
        break;
    }
    
    return success;
  }
  
  /**
   * Add a callback for WebSocket events
   * @param exchange The exchange to listen to
   * @param type The type of data to listen for
   * @param callback The callback function
   */
  addCallback(exchange: ExchangeType, type: ExchangeDataType, callback: WebSocketCallback): void {
    const key = `${exchange}:${type}`;
    
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, new Set());
    }
    
    this.callbacks.get(key)!.add(callback);
  }
  
  /**
   * Remove a callback for WebSocket events
   * @param exchange The exchange to stop listening to
   * @param type The type of data to stop listening for
   * @param callback The callback function to remove
   */
  removeCallback(exchange: ExchangeType, type: ExchangeDataType, callback: WebSocketCallback): void {
    const key = `${exchange}:${type}`;
    
    if (!this.callbacks.has(key)) {
      return;
    }
    
    this.callbacks.get(key)!.delete(callback);
  }
  
  /**
   * Disconnect from all exchanges
   */
  disconnectAll(): void {
    bybitWebSocketAdapter.disconnect();
    coinbaseWebSocketAdapter.disconnect();
    hyperliquidWebSocketAdapter.disconnect();
    
    this.connectionStatus.clear();
  }
  
  /**
   * Get connection status for all exchanges
   */
  getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    for (const [exchange, connected] of this.connectionStatus.entries()) {
      status[exchange] = connected;
    }
    
    return status;
  }
  
  /**
   * Setup relay callbacks to forward events to the main WebSocket service
   */
  private setupRelayCallbacks(): void {
    // Setup for Bybit
    this.setupExchangeCallbacks(ExchangeType.BYBIT, (event) => {
      bybitWebSocketAdapter.addCallback(event.type, (wsEvent) => {
        this.relayEvent(ExchangeType.BYBIT, wsEvent);
      });
    });
    
    // Setup for Coinbase
    this.setupExchangeCallbacks(ExchangeType.COINBASE, (event) => {
      coinbaseWebSocketAdapter.addCallback(event.type, (wsEvent) => {
        this.relayEvent(ExchangeType.COINBASE, wsEvent);
      });
    });
    
    // Setup for Hyperliquid
    this.setupExchangeCallbacks(ExchangeType.HYPERLIQUID, (event) => {
      hyperliquidWebSocketAdapter.addCallback(event.type, (wsEvent) => {
        this.relayEvent(ExchangeType.HYPERLIQUID, wsEvent);
      });
    });
  }
  
  /**
   * Setup callbacks for a specific exchange
   * @param exchange The exchange to setup callbacks for
   * @param callback The callback registration function
   */
  private setupExchangeCallbacks(
    exchange: ExchangeType,
    callbackRegistrar: (event: { type: ExchangeDataType }) => void
  ): void {
    // Setup callbacks for all data types
    [
      ExchangeDataType.TICKER,
      ExchangeDataType.TRADES,
      ExchangeDataType.ORDERBOOK,
      ExchangeDataType.KLINE,
      ExchangeDataType.USER_ORDERS,
      ExchangeDataType.USER_TRADES,
      ExchangeDataType.USER_POSITIONS,
      ExchangeDataType.USER_ACCOUNT
    ].forEach(type => {
      callbackRegistrar({ type });
    });
  }
  
  /**
   * Relay an event to both the callbacks and the main WebSocket service
   * @param exchange The exchange the event is from
   * @param event The WebSocket event
   */
  private relayEvent(exchange: ExchangeType, event: any): void {
    // Call specific callbacks for this exchange and type
    const key = `${exchange}:${event.type}`;
    const callbacks = this.callbacks.get(key);
    
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in callback for ${key}:`, error);
        }
      }
    }
    
    // Also relay to the main WebSocket service based on the event type
    const topic = this.getTopicForEventType(event.type);
    if (topic) {
      websocketService.broadcastToTopic(topic, {
        ...event,
        exchange,
      });
    }
  }
  
  /**
   * Get the WebSocket topic for an event type
   * @param type The event type
   */
  private getTopicForEventType(type: ExchangeDataType): WebSocketTopic | null {
    switch (type) {
      case ExchangeDataType.TICKER:
      case ExchangeDataType.TRADES:
      case ExchangeDataType.ORDERBOOK:
      case ExchangeDataType.KLINE:
        return WebSocketTopic.MARKET_DATA;
      case ExchangeDataType.USER_ORDERS:
        return WebSocketTopic.ORDER_UPDATES;
      case ExchangeDataType.USER_TRADES:
        return WebSocketTopic.TRADE_UPDATES;
      case ExchangeDataType.USER_POSITIONS:
        return WebSocketTopic.PERFORMANCE;
      case ExchangeDataType.USER_ACCOUNT:
        return WebSocketTopic.ALERTS;
      default:
        return null;
    }
  }
}

// Export a singleton instance
const unifiedWebSocketManager = new UnifiedWebSocketManager();
export default unifiedWebSocketManager;
