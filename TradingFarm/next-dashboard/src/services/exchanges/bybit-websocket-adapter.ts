/**
 * Bybit WebSocket Adapter
 * 
 * Provides a standardized interface for connecting to Bybit WebSockets
 * and normalizing the data format
 */
import { ExchangeDataType } from '../exchange-websocket-service';
import { ExchangeType } from '../exchange-service';
import { ExchangeCredentialsService, ExchangeCredential } from '../exchange-credentials-service';
import crypto from 'crypto';

export interface WebSocketEvent {
  topic: string;
  data: any;
  type: ExchangeDataType;
  timestamp: string;
  exchange: ExchangeType;
}

export interface NormalizedTicker {
  symbol: string;
  price: number;
  high: number;
  low: number;
  volume: number;
  quoteVolume: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export interface NormalizedTrade {
  symbol: string;
  id: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: string;
}

export interface NormalizedOrderbook {
  symbol: string;
  bids: Array<[number, number]>; // [price, quantity]
  asks: Array<[number, number]>; // [price, quantity]
  timestamp: string;
}

export interface NormalizedKline {
  symbol: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
}

export interface NormalizedOrder {
  id: string;
  symbol: string;
  status: string;
  side: 'buy' | 'sell';
  type: string;
  price: number;
  quantity: number;
  filledQuantity: number;
  timestamp: string;
}

export interface NormalizedPosition {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  margin: number;
  leverage: number;
  unrealizedPnl: number;
  timestamp: string;
}

export class BybitWebSocketAdapter {
  private socket: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 3000;
  private credential: ExchangeCredential | null = null;
  private userId: string | null = null;
  private readonly callbackMap: Map<ExchangeDataType, ((event: WebSocketEvent) => void)[]> = new Map();

  /**
   * Initialize the adapter
   * @param userId The user ID for authentication
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    
    // Fetch the credentials for the user
    if (userId) {
      const { data, error } = await ExchangeCredentialsService.getCredentials(
        userId,
        ExchangeType.BYBIT
      );
      
      if (data && !error) {
        this.credential = data;
      }
    }
  }

  /**
   * Connect to the Bybit WebSocket
   */
  async connect(): Promise<boolean> {
    try {
      // Determine if using testnet or mainnet
      const isTestnet = this.credential?.is_testnet ?? false;
      const baseUrl = isTestnet 
        ? 'wss://stream-testnet.bybit.com/v5/public/spot' 
        : 'wss://stream.bybit.com/v5/public/spot';
        
      // Create the WebSocket connection
      this.socket = new WebSocket(baseUrl);
      
      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      
      return true;
    } catch (error) {
      console.error('Error connecting to Bybit WebSocket:', error);
      return false;
    }
  }

  /**
   * Subscribe to a specific data type for a symbol
   * @param type The data type to subscribe to
   * @param symbol The trading symbol
   * @param interval Optional interval for klines
   */
  subscribe(type: ExchangeDataType, symbol: string, interval?: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    const topic = this.getTopicName(type, symbol, interval);
    if (!topic) return false;
    
    // Add to local subscriptions
    const subKey = `${type}:${symbol}:${interval || ''}`;
    this.subscriptions.add(subKey);
    
    // Send subscription message
    const subscriptionMessage = {
      op: 'subscribe',
      args: [topic]
    };
    
    this.socket.send(JSON.stringify(subscriptionMessage));
    return true;
  }

  /**
   * Unsubscribe from a specific data type for a symbol
   * @param type The data type to unsubscribe from
   * @param symbol The trading symbol
   * @param interval Optional interval for klines
   */
  unsubscribe(type: ExchangeDataType, symbol: string, interval?: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    const topic = this.getTopicName(type, symbol, interval);
    if (!topic) return false;
    
    // Remove from local subscriptions
    const subKey = `${type}:${symbol}:${interval || ''}`;
    this.subscriptions.delete(subKey);
    
    // Send unsubscription message
    const unsubscriptionMessage = {
      op: 'unsubscribe',
      args: [topic]
    };
    
    this.socket.send(JSON.stringify(unsubscriptionMessage));
    return true;
  }

  /**
   * Close the WebSocket connection
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // Clear any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Add a callback for a specific data type
   * @param type The data type to listen for
   * @param callback The callback function
   */
  addCallback(type: ExchangeDataType, callback: (event: WebSocketEvent) => void): void {
    if (!this.callbackMap.has(type)) {
      this.callbackMap.set(type, []);
    }
    
    this.callbackMap.get(type)!.push(callback);
  }

  /**
   * Remove a callback for a specific data type
   * @param type The data type to remove the callback from
   * @param callback The callback function to remove
   */
  removeCallback(type: ExchangeDataType, callback: (event: WebSocketEvent) => void): void {
    if (!this.callbackMap.has(type)) return;
    
    const callbacks = this.callbackMap.get(type)!;
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('Bybit WebSocket connected');
    this.reconnectAttempts = 0;
    
    // Resubscribe to all previous subscriptions
    this.resubscribeAll();
    
    // Authenticate if needed (for private data)
    this.authenticate();
  }

  /**
   * Handle WebSocket messages
   * @param event The message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Handle ping messages
      if (data.op === 'ping') {
        this.socket?.send(JSON.stringify({ op: 'pong' }));
        return;
      }
      
      // Handle subscription confirmations
      if (data.op === 'subscribe' && data.success) {
        console.log(`Successfully subscribed to ${data.ret_msg}`);
        return;
      }
      
      // Handle data messages
      if (data.data && data.topic) {
        const normalized = this.normalizeMessage(data);
        if (normalized) {
          this.notifyCallbacks(normalized);
        }
      }
    } catch (error) {
      console.error('Error processing Bybit WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(): void {
    console.log('Bybit WebSocket disconnected');
    
    // Schedule reconnect if needed
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, this.RECONNECT_DELAY);
    }
  }

  /**
   * Handle WebSocket error event
   * @param error The error event
   */
  private handleError(error: Event): void {
    console.error('Bybit WebSocket error:', error);
  }

  /**
   * Resubscribe to all previous subscriptions
   */
  private resubscribeAll(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    const topics: string[] = [];
    
    // Collect all subscription topics
    for (const subKey of this.subscriptions) {
      const [type, symbol, interval] = subKey.split(':');
      const topic = this.getTopicName(type as ExchangeDataType, symbol, interval || undefined);
      if (topic) {
        topics.push(topic);
      }
    }
    
    // Send subscription message
    if (topics.length > 0) {
      const subscriptionMessage = {
        op: 'subscribe',
        args: topics
      };
      
      this.socket.send(JSON.stringify(subscriptionMessage));
    }
  }

  /**
   * Authenticate with the WebSocket server
   */
  private authenticate(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN ||
        !this.credential?.api_key || !this.credential?.api_secret) {
      return;
    }
    
    // For Bybit, we need to use the private endpoint for authenticated requests
    // which is a separate WebSocket connection
    const isTestnet = this.credential.is_testnet ?? false;
    const privateWsUrl = isTestnet 
      ? 'wss://stream-testnet.bybit.com/v5/private' 
      : 'wss://stream.bybit.com/v5/private';
      
    // Close current connection and open a new one to the private endpoint
    this.socket.close();
    this.socket = new WebSocket(privateWsUrl);
    
    // Set up event handlers
    this.socket.onopen = () => {
      if (!this.socket || !this.credential) return;
      
      const timestamp = Date.now().toString();
      const signature = this.generateSignature(
        timestamp,
        this.credential.api_key,
        this.credential.api_secret
      );
      
      const authMessage = {
        op: 'auth',
        args: [this.credential.api_key, timestamp, signature]
      };
      
      this.socket.send(JSON.stringify(authMessage));
      
      // Also resubscribe to private channels
      setTimeout(() => this.resubscribeAll(), 1000);
    };
    
    this.socket.onmessage = this.handleMessage.bind(this);
    this.socket.onclose = this.handleClose.bind(this);
    this.socket.onerror = this.handleError.bind(this);
  }

  /**
   * Generate authentication signature for Bybit
   * @param timestamp The timestamp for the request
   * @param apiKey The API key
   * @param apiSecret The API secret
   */
  private generateSignature(timestamp: string, apiKey: string, apiSecret: string): string {
    return crypto
      .createHmac('sha256', apiSecret)
      .update(timestamp + apiKey + '5000')
      .digest('hex');
  }

  /**
   * Normalize WebSocket messages to a standard format
   * @param message The message to normalize
   */
  private normalizeMessage(message: any): WebSocketEvent | null {
    // Extract the data type and symbol from the topic
    const topic = message.topic;
    if (!topic) return null;
    
    const topicParts = topic.split('.');
    if (topicParts.length < 2) return null;
    
    const dataType = this.getDataTypeFromTopic(topicParts[0]);
    const symbol = topicParts[1];
    
    // Normalize based on the data type
    switch (dataType) {
      case ExchangeDataType.TICKER:
        return this.normalizeTicker(message, symbol);
      case ExchangeDataType.TRADES:
        return this.normalizeTrades(message, symbol);
      case ExchangeDataType.ORDERBOOK:
        return this.normalizeOrderbook(message, symbol);
      case ExchangeDataType.KLINE:
        return this.normalizeKline(message, symbol);
      case ExchangeDataType.USER_ORDERS:
        return this.normalizeOrders(message, symbol);
      case ExchangeDataType.USER_POSITIONS:
        return this.normalizePositions(message, symbol);
      default:
        return null;
    }
  }

  /**
   * Normalize ticker data
   * @param message The message to normalize
   * @param symbol The trading symbol
   */
  private normalizeTicker(message: any, symbol: string): WebSocketEvent {
    const data = message.data;
    
    const normalizedTicker: NormalizedTicker = {
      symbol,
      price: parseFloat(data.lastPrice),
      high: parseFloat(data.highPrice24h),
      low: parseFloat(data.lowPrice24h),
      volume: parseFloat(data.volume24h),
      quoteVolume: parseFloat(data.turnover24h),
      change: parseFloat(data.lastPrice) - parseFloat(data.prevPrice24h),
      changePercent: ((parseFloat(data.lastPrice) - parseFloat(data.prevPrice24h)) / parseFloat(data.prevPrice24h)) * 100,
      timestamp: new Date(data.timestamp).toISOString()
    };
    
    return {
      topic,
      data: normalizedTicker,
      type: ExchangeDataType.TICKER,
      timestamp: normalizedTicker.timestamp,
      exchange: ExchangeType.BYBIT
    };
  }

  /**
   * Normalize trades data
   * @param message The message to normalize
   * @param symbol The trading symbol
   */
  private normalizeTrades(message: any, symbol: string): WebSocketEvent {
    const data = message.data;
    
    const normalizedTrades: NormalizedTrade[] = data.map((trade: any) => ({
      symbol,
      id: trade.tradeId,
      price: parseFloat(trade.price),
      quantity: parseFloat(trade.size),
      side: trade.side.toLowerCase() as 'buy' | 'sell',
      timestamp: new Date(trade.timestamp).toISOString()
    }));
    
    return {
      topic: message.topic,
      data: normalizedTrades,
      type: ExchangeDataType.TRADES,
      timestamp: new Date().toISOString(),
      exchange: ExchangeType.BYBIT
    };
  }

  /**
   * Normalize orderbook data
   * @param message The message to normalize
   * @param symbol The trading symbol
   */
  private normalizeOrderbook(message: any, symbol: string): WebSocketEvent {
    const data = message.data;
    
    const normalizedOrderbook: NormalizedOrderbook = {
      symbol,
      bids: (data.bids || []).map((bid: any) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: (data.asks || []).map((ask: any) => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: new Date(data.timestamp || Date.now()).toISOString()
    };
    
    return {
      topic: message.topic,
      data: normalizedOrderbook,
      type: ExchangeDataType.ORDERBOOK,
      timestamp: normalizedOrderbook.timestamp,
      exchange: ExchangeType.BYBIT
    };
  }

  /**
   * Normalize kline data
   * @param message The message to normalize
   * @param symbol The trading symbol
   */
  private normalizeKline(message: any, symbol: string): WebSocketEvent {
    const data = message.data[0]; // Bybit returns an array of klines
    
    const normalizedKline: NormalizedKline = {
      symbol,
      interval: message.topic.split('.')[2], // Extract interval from topic
      open: parseFloat(data.open),
      high: parseFloat(data.high),
      low: parseFloat(data.low),
      close: parseFloat(data.close),
      volume: parseFloat(data.volume),
      timestamp: new Date(data.timestamp).toISOString()
    };
    
    return {
      topic: message.topic,
      data: normalizedKline,
      type: ExchangeDataType.KLINE,
      timestamp: normalizedKline.timestamp,
      exchange: ExchangeType.BYBIT
    };
  }

  /**
   * Normalize order data
   * @param message The message to normalize
   * @param symbol The trading symbol
   */
  private normalizeOrders(message: any, symbol: string): WebSocketEvent {
    const data = message.data;
    
    const normalizedOrder: NormalizedOrder = {
      id: data.orderId,
      symbol: data.symbol,
      status: data.orderStatus,
      side: data.side.toLowerCase() as 'buy' | 'sell',
      type: data.orderType,
      price: parseFloat(data.price),
      quantity: parseFloat(data.qty),
      filledQuantity: parseFloat(data.cumExecQty),
      timestamp: new Date(data.createdTime).toISOString()
    };
    
    return {
      topic: message.topic,
      data: normalizedOrder,
      type: ExchangeDataType.USER_ORDERS,
      timestamp: normalizedOrder.timestamp,
      exchange: ExchangeType.BYBIT
    };
  }

  /**
   * Normalize position data
   * @param message The message to normalize
   * @param symbol The trading symbol
   */
  private normalizePositions(message: any, symbol: string): WebSocketEvent {
    const data = message.data;
    
    const normalizedPosition: NormalizedPosition = {
      symbol: data.symbol,
      side: data.side.toLowerCase() as 'long' | 'short',
      size: parseFloat(data.size),
      entryPrice: parseFloat(data.entryPrice),
      markPrice: parseFloat(data.markPrice),
      liquidationPrice: parseFloat(data.liqPrice),
      margin: parseFloat(data.positionIM),
      leverage: parseFloat(data.leverage),
      unrealizedPnl: parseFloat(data.unrealisedPnl),
      timestamp: new Date(data.updatedTime).toISOString()
    };
    
    return {
      topic: message.topic,
      data: normalizedPosition,
      type: ExchangeDataType.USER_POSITIONS,
      timestamp: normalizedPosition.timestamp,
      exchange: ExchangeType.BYBIT
    };
  }

  /**
   * Notify all callbacks for a specific event
   * @param event The event to notify about
   */
  private notifyCallbacks(event: WebSocketEvent): void {
    const callbacks = this.callbackMap.get(event.type);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in Bybit WebSocket callback for ${event.type}:`, error);
        }
      }
    }
  }

  /**
   * Get the WebSocket topic name for a data type and symbol
   * @param type The data type
   * @param symbol The trading symbol
   * @param interval Optional interval for klines
   */
  private getTopicName(type: ExchangeDataType, symbol: string, interval?: string): string | null {
    switch (type) {
      case ExchangeDataType.TICKER:
        return `tickers.${symbol}`;
      case ExchangeDataType.TRADES:
        return `publicTrade.${symbol}`;
      case ExchangeDataType.ORDERBOOK:
        return `orderbook.50.${symbol}`;
      case ExchangeDataType.KLINE:
        return interval ? `kline.${interval}.${symbol}` : null;
      case ExchangeDataType.USER_ORDERS:
        return 'order';
      case ExchangeDataType.USER_POSITIONS:
        return 'position';
      case ExchangeDataType.USER_ACCOUNT:
        return 'wallet';
      default:
        return null;
    }
  }

  /**
   * Convert a topic prefix to a data type
   * @param topicPrefix The topic prefix
   */
  private getDataTypeFromTopic(topicPrefix: string): ExchangeDataType {
    switch (topicPrefix) {
      case 'tickers':
        return ExchangeDataType.TICKER;
      case 'publicTrade':
        return ExchangeDataType.TRADES;
      case 'orderbook':
        return ExchangeDataType.ORDERBOOK;
      case 'kline':
        return ExchangeDataType.KLINE;
      case 'order':
        return ExchangeDataType.USER_ORDERS;
      case 'position':
        return ExchangeDataType.USER_POSITIONS;
      case 'wallet':
        return ExchangeDataType.USER_ACCOUNT;
      default:
        return ExchangeDataType.TICKER;
    }
  }
}

// Export a singleton instance
const bybitWebSocketAdapter = new BybitWebSocketAdapter();
export default bybitWebSocketAdapter;
