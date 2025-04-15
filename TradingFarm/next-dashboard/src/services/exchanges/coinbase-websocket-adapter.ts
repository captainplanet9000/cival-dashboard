/**
 * Coinbase WebSocket Adapter
 * 
 * Provides a standardized interface for connecting to Coinbase WebSockets
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

export class CoinbaseWebSocketAdapter {
  private socket: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 3000;
  private credential: ExchangeCredential | null = null;
  private userId: string | null = null;
  private readonly callbackMap: Map<ExchangeDataType, ((event: WebSocketEvent) => void)[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

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
        ExchangeType.COINBASE
      );
      
      if (data && !error) {
        this.credential = data;
      }
    }
  }

  /**
   * Connect to the Coinbase WebSocket
   */
  async connect(): Promise<boolean> {
    try {
      // Coinbase exchange WebSocket URL
      const baseUrl = 'wss://ws-feed.exchange.coinbase.com';
        
      // Create the WebSocket connection
      this.socket = new WebSocket(baseUrl);
      
      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      
      return true;
    } catch (error) {
      console.error('Error connecting to Coinbase WebSocket:', error);
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
    
    // Add to local subscriptions
    const subKey = `${type}:${symbol}:${interval || ''}`;
    this.subscriptions.add(subKey);
    
    // Create subscription message
    const channels = this.getChannelsForType(type);
    if (!channels || channels.length === 0) return false;
    
    const subscriptionMessage = {
      type: 'subscribe',
      product_ids: [symbol],
      channels: channels
    };
    
    // Add authentication if available
    if (this.credential && (
        type === ExchangeDataType.USER_ORDERS || 
        type === ExchangeDataType.USER_TRADES ||
        type === ExchangeDataType.USER_ACCOUNT
    )) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const message = timestamp + 'GET' + '/users/self/verify';
      
      const signature = crypto
        .createHmac('sha256', Buffer.from(this.credential.api_secret, 'base64'))
        .update(message)
        .digest('base64');
      
      Object.assign(subscriptionMessage, {
        signature,
        key: this.credential.api_key,
        timestamp,
        passphrase: this.credential.additional_params?.passphrase || ''
      });
    }
    
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
    
    // Remove from local subscriptions
    const subKey = `${type}:${symbol}:${interval || ''}`;
    this.subscriptions.delete(subKey);
    
    // Create unsubscription message
    const channels = this.getChannelsForType(type);
    if (!channels || channels.length === 0) return false;
    
    const unsubscriptionMessage = {
      type: 'unsubscribe',
      product_ids: [symbol],
      channels: channels
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
    
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
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
    console.log('Coinbase WebSocket connected');
    this.reconnectAttempts = 0;
    
    // Resubscribe to all previous subscriptions
    this.resubscribeAll();
    
    // Set up heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Handle WebSocket messages
   * @param event The message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Handle subscription confirmations
      if (data.type === 'subscriptions') {
        console.log(`Coinbase subscriptions confirmed:`, data.channels);
        return;
      }
      
      // Handle heartbeat responses
      if (data.type === 'heartbeat') {
        return;
      }
      
      // Handle error messages
      if (data.type === 'error') {
        console.error('Coinbase WebSocket error:', data.message);
        return;
      }
      
      // Handle data messages
      const normalized = this.normalizeMessage(data);
      if (normalized) {
        this.notifyCallbacks(normalized);
      }
    } catch (error) {
      console.error('Error processing Coinbase WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(): void {
    console.log('Coinbase WebSocket disconnected');
    
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
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
    console.error('Coinbase WebSocket error:', error);
  }

  /**
   * Resubscribe to all previous subscriptions
   */
  private resubscribeAll(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Group subscriptions by channel for efficiency
    const channelGroups: Map<string, Set<string>> = new Map();
    
    for (const subKey of this.subscriptions) {
      const [type, symbol, interval] = subKey.split(':');
      const channels = this.getChannelsForType(type as ExchangeDataType);
      
      if (channels && channels.length > 0) {
        for (const channel of channels) {
          if (!channelGroups.has(channel)) {
            channelGroups.set(channel, new Set());
          }
          channelGroups.get(channel)!.add(symbol);
        }
      }
    }
    
    // Create subscription messages
    for (const [channel, symbols] of channelGroups.entries()) {
      const subscriptionMessage = {
        type: 'subscribe',
        product_ids: Array.from(symbols),
        channels: [channel]
      };
      
      // Add authentication if needed
      if (this.credential && (
          channel === 'user' || 
          channel === 'orders'
      )) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const message = timestamp + 'GET' + '/users/self/verify';
        
        const signature = crypto
          .createHmac('sha256', Buffer.from(this.credential.api_secret, 'base64'))
          .update(message)
          .digest('base64');
        
        Object.assign(subscriptionMessage, {
          signature,
          key: this.credential.api_key,
          timestamp,
          passphrase: this.credential.additional_params?.passphrase || ''
        });
      }
      
      this.socket.send(JSON.stringify(subscriptionMessage));
    }
  }

  /**
   * Normalize WebSocket messages to a standard format
   * @param message The message to normalize
   */
  private normalizeMessage(message: any): WebSocketEvent | null {
    const messageType = message.type;
    const symbol = message.product_id;
    
    if (!messageType || !symbol) return null;
    
    let dataType: ExchangeDataType;
    let data: any;
    
    switch (messageType) {
      case 'ticker':
        dataType = ExchangeDataType.TICKER;
        data = this.normalizeTicker(message);
        break;
      case 'match':
      case 'last_match':
        dataType = ExchangeDataType.TRADES;
        data = this.normalizeTrade(message);
        break;
      case 'l2update':
        dataType = ExchangeDataType.ORDERBOOK;
        data = this.normalizeOrderbookUpdate(message);
        break;
      case 'snapshot':
        dataType = ExchangeDataType.ORDERBOOK;
        data = this.normalizeOrderbookSnapshot(message);
        break;
      case 'received':
      case 'open':
      case 'done':
      case 'change':
        dataType = ExchangeDataType.USER_ORDERS;
        data = this.normalizeOrder(message);
        break;
      default:
        return null;
    }
    
    if (!data) return null;
    
    return {
      topic: `${messageType}.${symbol}`,
      data,
      type: dataType,
      timestamp: new Date(message.time || Date.now()).toISOString(),
      exchange: ExchangeType.COINBASE
    };
  }

  /**
   * Normalize ticker data
   * @param message The ticker message
   */
  private normalizeTicker(message: any): NormalizedTicker {
    return {
      symbol: message.product_id,
      price: parseFloat(message.price),
      high: parseFloat(message.high_24h || 0),
      low: parseFloat(message.low_24h || 0),
      volume: parseFloat(message.volume_24h || 0),
      quoteVolume: parseFloat(message.volume_30d || 0),
      change: parseFloat(message.price) - parseFloat(message.open_24h || 0),
      changePercent: (
        ((parseFloat(message.price) - parseFloat(message.open_24h || 0)) / 
        parseFloat(message.open_24h || 1)) * 100
      ),
      timestamp: new Date(message.time).toISOString()
    };
  }

  /**
   * Normalize trade data
   * @param message The trade message
   */
  private normalizeTrade(message: any): NormalizedTrade {
    return {
      symbol: message.product_id,
      id: message.trade_id.toString(),
      price: parseFloat(message.price),
      quantity: parseFloat(message.size),
      side: message.side,
      timestamp: new Date(message.time).toISOString()
    };
  }

  /**
   * Normalize orderbook snapshot
   * @param message The orderbook snapshot message
   */
  private normalizeOrderbookSnapshot(message: any): NormalizedOrderbook {
    return {
      symbol: message.product_id,
      bids: (message.bids || []).map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: (message.asks || []).map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Normalize orderbook update
   * @param message The orderbook update message
   */
  private normalizeOrderbookUpdate(message: any): NormalizedOrderbook {
    // For l2update, we're just sending the changes.
    // The client will need to apply these to an existing orderbook snapshot
    const changes: Array<[number, number]> = [];
    
    (message.changes || []).forEach((change: string[]) => {
      const side = change[0];
      const price = parseFloat(change[1]);
      const quantity = parseFloat(change[2]);
      
      if (side === 'buy') {
        changes.push([price, quantity]);
      } else if (side === 'sell') {
        changes.push([price, quantity]);
      }
    });
    
    return {
      symbol: message.product_id,
      bids: changes.filter(change => change[1] > 0), // Positive quantities are bids
      asks: changes.filter(change => change[1] <= 0), // Negative or zero quantities are asks
      timestamp: new Date(message.time).toISOString()
    };
  }

  /**
   * Normalize order data
   * @param message The order message
   */
  private normalizeOrder(message: any): NormalizedOrder {
    return {
      id: message.order_id,
      symbol: message.product_id,
      status: message.type, // 'received', 'open', 'done', 'change'
      side: message.side,
      type: message.order_type,
      price: parseFloat(message.price || 0),
      quantity: parseFloat(message.size || 0),
      filledQuantity: parseFloat(message.filled_size || 0),
      timestamp: new Date(message.time).toISOString()
    };
  }

  /**
   * Get the channels to subscribe to for a data type
   * @param type The data type
   */
  private getChannelsForType(type: ExchangeDataType): string[] {
    switch (type) {
      case ExchangeDataType.TICKER:
        return ['ticker'];
      case ExchangeDataType.TRADES:
        return ['matches'];
      case ExchangeDataType.ORDERBOOK:
        return ['level2'];
      case ExchangeDataType.USER_ORDERS:
      case ExchangeDataType.USER_TRADES:
        return ['user', 'orders'];
      case ExchangeDataType.USER_ACCOUNT:
        return ['user'];
      default:
        return [];
    }
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
          console.error(`Error in Coinbase WebSocket callback for ${event.type}:`, error);
        }
      }
    }
  }
}

// Export a singleton instance
const coinbaseWebSocketAdapter = new CoinbaseWebSocketAdapter();
export default coinbaseWebSocketAdapter;
