/**
 * Exchange WebSocket Service
 * 
 * Provides real-time data connections to cryptocurrency exchanges
 * Supports multiple simultaneous exchange connections
 */
import crypto from 'crypto';
import websocketService, { WebSocketTopic } from './websocket-service';
import { ExchangeCredentialsService } from './exchange-credentials-service';
import { ExchangeType } from './exchange-service';

// Types of data to subscribe to
export enum ExchangeDataType {
  TICKER = 'ticker',
  TRADES = 'trades',
  ORDERBOOK = 'orderbook',
  KLINE = 'kline',
  USER_ORDERS = 'user_orders',
  USER_TRADES = 'user_trades',
  USER_POSITIONS = 'user_positions',
  USER_ACCOUNT = 'user_account'
}

// Connection states
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// Subscription info
interface Subscription {
  symbol: string;
  type: ExchangeDataType;
  interval?: string;
}

// Exchange WebSocket connection info
interface ExchangeConnection {
  exchange: ExchangeType;
  socket: WebSocket | null;
  state: ConnectionState;
  subscriptions: Set<string>; // Subscription keys
  authenticationSent: boolean;
  reconnectAttempts: number;
  reconnectTimeout: NodeJS.Timeout | null;
}

class ExchangeWebSocketService {
  private connections: Map<ExchangeType, ExchangeConnection> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 3000;
  private userId?: string;
  
  constructor() {
    // Propagate WebSocket messages to the main WebSocket service
    this.setupEventPropagation();
  }
  
  /**
   * Initialize with user ID for authentication
   */
  initialize(userId?: string) {
    this.userId = userId;
  }
  
  /**
   * Connect to an exchange WebSocket
   */
  connect(exchange: ExchangeType, userId?: string): Promise<boolean> {
    if (userId) {
      this.userId = userId;
    }
    
    // Check if already connected
    if (this.connections.has(exchange) && 
        this.connections.get(exchange)?.state === ConnectionState.CONNECTED) {
      return Promise.resolve(true);
    }
    
    return new Promise((resolve) => {
      const url = this.getWebSocketUrl(exchange);
      
      // Create new connection entry if needed
      if (!this.connections.has(exchange)) {
        this.connections.set(exchange, {
          exchange,
          socket: null,
          state: ConnectionState.DISCONNECTED,
          subscriptions: new Set(),
          authenticationSent: false,
          reconnectAttempts: 0,
          reconnectTimeout: null
        });
      }
      
      const connection = this.connections.get(exchange)!;
      connection.state = ConnectionState.CONNECTING;
      
      try {
        const socket = new WebSocket(url);
        connection.socket = socket;
        
        socket.onopen = () => {
          connection.state = ConnectionState.CONNECTED;
          connection.reconnectAttempts = 0;
          
          // Resubscribe to previous subscriptions
          this.resubscribe(exchange);
          
          // Authenticate if needed and if we have a user ID
          if (this.userId && !connection.authenticationSent) {
            this.authenticate(exchange);
          }
          
          // Notify the app about the connection
          this.notifyConnectionStateChanged(exchange, ConnectionState.CONNECTED);
          
          resolve(true);
        };
        
        socket.onmessage = (event) => {
          this.handleMessage(exchange, event);
        };
        
        socket.onclose = () => {
          if (connection.state !== ConnectionState.RECONNECTING) {
            connection.state = ConnectionState.DISCONNECTED;
            this.notifyConnectionStateChanged(exchange, ConnectionState.DISCONNECTED);
            this.scheduleReconnect(exchange);
          }
        };
        
        socket.onerror = (error) => {
          console.error(`WebSocket error for ${exchange}:`, error);
          connection.state = ConnectionState.ERROR;
          this.notifyConnectionStateChanged(exchange, ConnectionState.ERROR);
        };
      } catch (error) {
        console.error(`Error connecting to ${exchange} WebSocket:`, error);
        connection.state = ConnectionState.ERROR;
        this.notifyConnectionStateChanged(exchange, ConnectionState.ERROR);
        resolve(false);
      }
    });
  }
  
  /**
   * Disconnect from an exchange WebSocket
   */
  disconnect(exchange: ExchangeType) {
    const connection = this.connections.get(exchange);
    if (!connection) return;
    
    // Clear any reconnect timeouts
    if (connection.reconnectTimeout) {
      clearTimeout(connection.reconnectTimeout);
      connection.reconnectTimeout = null;
    }
    
    // Close the socket if it exists
    if (connection.socket) {
      connection.socket.close();
      connection.socket = null;
    }
    
    connection.state = ConnectionState.DISCONNECTED;
    this.notifyConnectionStateChanged(exchange, ConnectionState.DISCONNECTED);
  }
  
  /**
   * Subscribe to exchange data for a symbol
   */
  subscribe(exchange: ExchangeType, subscription: Subscription): Promise<boolean> {
    return new Promise((resolve) => {
      const connection = this.connections.get(exchange);
      
      // If not connected, connect first
      if (!connection || connection.state !== ConnectionState.CONNECTED) {
        this.connect(exchange).then((connected) => {
          if (connected) {
            this.performSubscription(exchange, subscription);
            resolve(true);
          } else {
            resolve(false);
          }
        });
        return;
      }
      
      this.performSubscription(exchange, subscription);
      resolve(true);
    });
  }
  
  /**
   * Unsubscribe from exchange data for a symbol
   */
  unsubscribe(exchange: ExchangeType, subscription: Subscription) {
    const connection = this.connections.get(exchange);
    if (!connection || !connection.socket || connection.state !== ConnectionState.CONNECTED) {
      return;
    }
    
    const subscriptionKey = this.getSubscriptionKey(subscription);
    
    if (connection.subscriptions.has(subscriptionKey)) {
      const message = this.createUnsubscriptionMessage(exchange, subscription);
      connection.socket.send(JSON.stringify(message));
      connection.subscriptions.delete(subscriptionKey);
    }
  }
  
  /**
   * Get the connection state for an exchange
   */
  getConnectionState(exchange: ExchangeType): ConnectionState {
    return this.connections.get(exchange)?.state || ConnectionState.DISCONNECTED;
  }
  
  /**
   * Close all exchange WebSocket connections
   */
  closeAll() {
    for (const exchange of this.connections.keys()) {
      this.disconnect(exchange);
    }
  }
  
  /**
   * Get the WebSocket URL for an exchange
   */
  private getWebSocketUrl(exchange: ExchangeType): string {
    switch(exchange) {
      case 'bybit':
        return 'wss://stream.bybit.com/v5/public/spot';
      case 'coinbase':
        return 'wss://ws-feed.exchange.coinbase.com';
      case 'hyperliquid':
        return 'wss://api.hyperliquid.xyz/ws';
      default:
        return 'wss://stream.bybit.com/v5/public/spot';
    }
  }
  
  /**
   * Perform the actual subscription
   */
  private performSubscription(exchange: ExchangeType, subscription: Subscription) {
    const connection = this.connections.get(exchange);
    if (!connection || !connection.socket) return;
    
    const subscriptionKey = this.getSubscriptionKey(subscription);
    
    // Skip if already subscribed
    if (connection.subscriptions.has(subscriptionKey)) return;
    
    const message = this.createSubscriptionMessage(exchange, subscription);
    connection.socket.send(JSON.stringify(message));
    connection.subscriptions.add(subscriptionKey);
  }
  
  /**
   * Resubscribe to all previous subscriptions after reconnect
   */
  private resubscribe(exchange: ExchangeType) {
    const connection = this.connections.get(exchange);
    if (!connection || !connection.socket) return;
    
    for (const subscriptionKey of connection.subscriptions) {
      const [symbol, type, interval] = subscriptionKey.split(':');
      
      const subscription: Subscription = {
        symbol,
        type: type as ExchangeDataType,
        interval
      };
      
      const message = this.createSubscriptionMessage(exchange, subscription);
      connection.socket.send(JSON.stringify(message));
    }
  }
  
  /**
   * Create a subscription message for an exchange
   */
  private createSubscriptionMessage(exchange: ExchangeType, subscription: Subscription): any {
    switch(exchange) {
      case 'bybit':
        return {
          op: 'subscribe',
          args: this.getBybitSubscriptionArgs(subscription)
        };
      case 'coinbase':
        return {
          type: 'subscribe',
          product_ids: [subscription.symbol],
          channels: [this.getCoinbaseChannel(subscription.type)]
        };
      case 'hyperliquid':
        return {
          method: 'subscribe',
          subscription: this.getHyperliquidSubscription(subscription)
        };
      default:
        return {};
    }
  }
  
  /**
   * Create an unsubscription message for an exchange
   */
  private createUnsubscriptionMessage(exchange: ExchangeType, subscription: Subscription): any {
    switch(exchange) {
      case 'bybit':
        return {
          op: 'unsubscribe',
          args: this.getBybitSubscriptionArgs(subscription)
        };
      case 'coinbase':
        return {
          type: 'unsubscribe',
          product_ids: [subscription.symbol],
          channels: [this.getCoinbaseChannel(subscription.type)]
        };
      case 'hyperliquid':
        return {
          method: 'unsubscribe',
          subscription: this.getHyperliquidSubscription(subscription)
        };
      default:
        return {};
    }
  }
  
  /**
   * Schedule a reconnect attempt
   */
  private scheduleReconnect(exchange: ExchangeType) {
    const connection = this.connections.get(exchange);
    if (!connection) return;
    
    // If exceeded max reconnect attempts, stop trying
    if (connection.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`Max reconnect attempts exceeded for ${exchange} WebSocket`);
      return;
    }
    
    connection.state = ConnectionState.RECONNECTING;
    this.notifyConnectionStateChanged(exchange, ConnectionState.RECONNECTING);
    
    connection.reconnectAttempts++;
    connection.reconnectTimeout = setTimeout(() => {
      this.connect(exchange);
    }, this.RECONNECT_DELAY * connection.reconnectAttempts);
  }
  
  /**
   * Authenticate with the exchange WebSocket
   */
  private async authenticate(exchange: ExchangeType) {
    if (!this.userId) return;
    
    const connection = this.connections.get(exchange);
    if (!connection || !connection.socket) return;
    
    try {
      // Get credentials for this exchange
      const { data: credentials } = await ExchangeCredentialsService.getCredentials(
        this.userId,
        exchange
      );
      
      if (!credentials) {
        console.error(`No credentials found for ${exchange}`);
        return;
      }
      
      // Create authentication message
      let authMessage: any;
      
      switch(exchange) {
        case 'bybit':
          authMessage = this.createBybitAuthMessage(credentials.api_key, credentials.api_secret);
          break;
        case 'coinbase':
          authMessage = this.createCoinbaseAuthMessage(
            credentials.api_key, 
            credentials.api_secret,
            credentials.additional_params?.passphrase
          );
          break;
        case 'hyperliquid':
          // Hyperliquid uses a different auth mechanism
          return;
        default:
          return;
      }
      
      // Send authentication message
      connection.socket.send(JSON.stringify(authMessage));
      connection.authenticationSent = true;
    } catch (error) {
      console.error(`Error authenticating with ${exchange} WebSocket:`, error);
    }
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(exchange: ExchangeType, event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      // Normalize the data based on exchange
      const normalizedData = this.normalizeMessage(exchange, data);
      
      // Skip empty or error messages
      if (!normalizedData || normalizedData.error) return;
      
      // Determine the appropriate WebSocket topic based on the data type
      const topic = this.getTopicForData(normalizedData.type);
      
      // Propagate to the main WebSocket service
      websocketService.broadcastToTopic(topic, {
        exchange,
        ...normalizedData
      });
    } catch (error) {
      console.error(`Error handling ${exchange} WebSocket message:`, error);
    }
  }
  
  /**
   * Normalize message data from different exchanges
   */
  private normalizeMessage(exchange: ExchangeType, data: any): any {
    switch(exchange) {
      case 'bybit':
        return this.normalizeBybitMessage(data);
      case 'coinbase':
        return this.normalizeCoinbaseMessage(data);
      case 'hyperliquid':
        return this.normalizeHyperliquidMessage(data);
      default:
        return null;
    }
  }
  
  /**
   * Helper methods for Bybit
   */
  private getBybitSubscriptionArgs(subscription: Subscription): string[] {
    let topic = '';
    
    switch(subscription.type) {
      case ExchangeDataType.TICKER:
        topic = `tickers.${subscription.symbol}`;
        break;
      case ExchangeDataType.TRADES:
        topic = `publicTrade.${subscription.symbol}`;
        break;
      case ExchangeDataType.ORDERBOOK:
        topic = `orderbook.50.${subscription.symbol}`;
        break;
      case ExchangeDataType.KLINE:
        topic = `kline.${subscription.interval || '1h'}.${subscription.symbol}`;
        break;
      case ExchangeDataType.USER_ORDERS:
        topic = 'order';
        break;
      case ExchangeDataType.USER_POSITIONS:
        topic = 'position';
        break;
      case ExchangeDataType.USER_ACCOUNT:
        topic = 'wallet';
        break;
    }
    
    return [topic];
  }
  
  private createBybitAuthMessage(apiKey: string, apiSecret: string): any {
    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(`${timestamp}${apiKey}auth`)
      .digest('hex');
    
    return {
      op: 'auth',
      args: [apiKey, timestamp, signature]
    };
  }
  
  private normalizeBybitMessage(data: any): any {
    // Handle different Bybit message types
    if (data.topic && data.data) {
      const topic = data.topic;
      
      if (topic.startsWith('tickers.')) {
        return {
          type: ExchangeDataType.TICKER,
          symbol: topic.split('.')[1],
          data: {
            price: parseFloat(data.data.lastPrice),
            timestamp: new Date(data.ts).toISOString(),
            volume: parseFloat(data.data.volume24h),
            high: parseFloat(data.data.highPrice24h),
            low: parseFloat(data.data.lowPrice24h),
            change: parseFloat(data.data.price24hPcnt) * 100
          }
        };
      } else if (topic.startsWith('orderbook.')) {
        return {
          type: ExchangeDataType.ORDERBOOK,
          symbol: topic.split('.')[2],
          data: {
            bids: data.data.b.map((bid: any[]) => ({ price: parseFloat(bid[0]), amount: parseFloat(bid[1]) })),
            asks: data.data.a.map((ask: any[]) => ({ price: parseFloat(ask[0]), amount: parseFloat(ask[1]) })),
            timestamp: new Date(data.ts).toISOString()
          }
        };
      } else if (topic.startsWith('kline.')) {
        const parts = topic.split('.');
        return {
          type: ExchangeDataType.KLINE,
          symbol: parts[2],
          interval: parts[1],
          data: data.data.map((candle: any) => ({
            timestamp: new Date(candle.start).toISOString(),
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
            volume: parseFloat(candle.volume)
          }))
        };
      }
    }
    
    return null;
  }
  
  /**
   * Helper methods for Coinbase
   */
  private getCoinbaseChannel(dataType: ExchangeDataType): string {
    switch(dataType) {
      case ExchangeDataType.TICKER:
        return 'ticker';
      case ExchangeDataType.TRADES:
        return 'matches';
      case ExchangeDataType.ORDERBOOK:
        return 'level2';
      case ExchangeDataType.USER_ORDERS:
        return 'user';
      default:
        return 'ticker';
    }
  }
  
  private createCoinbaseAuthMessage(apiKey: string, apiSecret: string, passphrase?: string): any {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = timestamp + 'GET' + '/users/self/verify';
    
    const hmac = crypto.createHmac('sha256', Buffer.from(apiSecret, 'base64'));
    const signature = hmac.update(message).digest('base64');
    
    return {
      type: 'subscribe',
      channels: ['user'],
      signature,
      key: apiKey,
      passphrase: passphrase || '',
      timestamp
    };
  }
  
  private normalizeCoinbaseMessage(data: any): any {
    if (data.type === 'ticker') {
      return {
        type: ExchangeDataType.TICKER,
        symbol: data.product_id,
        data: {
          price: parseFloat(data.price),
          timestamp: new Date(data.time).toISOString(),
          volume: parseFloat(data.volume_24h),
          high: parseFloat(data.high_24h),
          low: parseFloat(data.low_24h),
          change: parseFloat(data.price_change_percent)
        }
      };
    } else if (data.type === 'l2update') {
      return {
        type: ExchangeDataType.ORDERBOOK,
        symbol: data.product_id,
        data: {
          changes: data.changes.map((change: string[]) => ({
            side: change[0],
            price: parseFloat(change[1]),
            amount: parseFloat(change[2])
          })),
          timestamp: new Date().toISOString()
        }
      };
    }
    
    return null;
  }
  
  /**
   * Helper methods for Hyperliquid
   */
  private getHyperliquidSubscription(subscription: Subscription): any {
    switch(subscription.type) {
      case ExchangeDataType.TICKER:
        return { type: 'mktData', coin: subscription.symbol };
      case ExchangeDataType.TRADES:
        return { type: 'trades', coin: subscription.symbol };
      case ExchangeDataType.ORDERBOOK:
        return { type: 'l2Book', coin: subscription.symbol };
      case ExchangeDataType.USER_POSITIONS:
        return { type: 'userEvents' };
      default:
        return { type: 'mktData', coin: subscription.symbol };
    }
  }
  
  private normalizeHyperliquidMessage(data: any): any {
    if (data.channel === 'mktData' && data.data) {
      return {
        type: ExchangeDataType.TICKER,
        symbol: data.data.coin,
        data: {
          price: parseFloat(data.data.markPrice),
          timestamp: new Date().toISOString(),
          fundingRate: parseFloat(data.data.fundingRate),
          openInterest: parseFloat(data.data.openInterest)
        }
      };
    } else if (data.channel === 'l2Book' && data.data) {
      return {
        type: ExchangeDataType.ORDERBOOK,
        symbol: data.data.coin,
        data: {
          bids: data.data.levels.bids.map((bid: any) => ({ 
            price: parseFloat(bid.px), 
            amount: parseFloat(bid.sz) 
          })),
          asks: data.data.levels.asks.map((ask: any) => ({ 
            price: parseFloat(ask.px), 
            amount: parseFloat(ask.sz) 
          })),
          timestamp: new Date().toISOString()
        }
      };
    }
    
    return null;
  }
  
  /**
   * Set up propagation of WebSocket events to the main service
   */
  private setupEventPropagation() {
    // Nothing to do here since we're directly calling the broadcast method
  }
  
  /**
   * Get the subscription key for caching and tracking
   */
  private getSubscriptionKey(subscription: Subscription): string {
    return `${subscription.symbol}:${subscription.type}:${subscription.interval || ''}`;
  }
  
  /**
   * Get the WebSocket topic for a data type
   */
  private getTopicForData(dataType: ExchangeDataType): WebSocketTopic {
    switch(dataType) {
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
        return WebSocketTopic.SYSTEM;
    }
  }
  
  /**
   * Notify about connection state changes
   */
  private notifyConnectionStateChanged(exchange: ExchangeType, state: ConnectionState) {
    websocketService.broadcastToTopic(WebSocketTopic.SYSTEM, {
      type: 'exchange_connection',
      exchange,
      state
    });
  }
}

// Create singleton instance
const exchangeWebSocketService = new ExchangeWebSocketService();
export default exchangeWebSocketService;
