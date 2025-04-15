/**
 * Hyperliquid WebSocket Adapter
 * 
 * Provides a standardized interface for connecting to Hyperliquid WebSockets
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
  fundingRate?: number;
  openInterest?: number;
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

export class HyperliquidWebSocketAdapter {
  private socket: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 3000;
  private credential: ExchangeCredential | null = null;
  private userId: string | null = null;
  private readonly callbackMap: Map<ExchangeDataType, ((event: WebSocketEvent) => void)[]> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000; // 30 seconds

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
        ExchangeType.HYPERLIQUID
      );
      
      if (data && !error) {
        this.credential = data;
      }
    }
  }

  /**
   * Connect to the Hyperliquid WebSocket
   */
  async connect(): Promise<boolean> {
    try {
      // Hyperliquid WebSocket URL
      const baseUrl = 'wss://api.hyperliquid.xyz/ws';
        
      // Create the WebSocket connection
      this.socket = new WebSocket(baseUrl);
      
      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      
      return true;
    } catch (error) {
      console.error('Error connecting to Hyperliquid WebSocket:', error);
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
    const subscription = this.createSubscriptionMessage(type, symbol, interval);
    if (!subscription) return false;
    
    this.socket.send(JSON.stringify(subscription));
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
    
    // Create unsubscription message - for Hyperliquid, it's the same as subscription but with action: 'unsubscribe'
    const subscription = this.createSubscriptionMessage(type, symbol, interval, 'unsubscribe');
    if (!subscription) return false;
    
    this.socket.send(JSON.stringify(subscription));
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
    
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
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
    console.log('Hyperliquid WebSocket connected');
    this.reconnectAttempts = 0;
    
    // Resubscribe to all previous subscriptions
    this.resubscribeAll();
    
    // Authenticate if we have credentials
    this.authenticate();
    
    // Set up ping interval to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.PING_INTERVAL);
  }

  /**
   * Handle WebSocket messages
   * @param event The message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Handle ping responses
      if (data.type === 'pong') {
        return;
      }
      
      // Handle subscription confirmations
      if (data.type === 'subscribed') {
        console.log(`Successfully subscribed to ${data.channel}`);
        return;
      }
      
      // Handle data messages
      const normalized = this.normalizeMessage(data);
      if (normalized) {
        this.notifyCallbacks(normalized);
      }
    } catch (error) {
      console.error('Error processing Hyperliquid WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(): void {
    console.log('Hyperliquid WebSocket disconnected');
    
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
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
    console.error('Hyperliquid WebSocket error:', error);
  }

  /**
   * Authenticate with the Hyperliquid WebSocket
   */
  private authenticate(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN ||
        !this.credential?.additional_params?.wallet_address || 
        !this.credential?.api_secret) {
      return;
    }
    
    const walletAddress = this.credential.additional_params.wallet_address;
    const privateKey = this.credential.api_secret;
    
    // Create authentication message
    const timestamp = Date.now().toString();
    const message = `${timestamp}:auth`;
    
    try {
      // Sign the message
      // Note: In production, you should use a proper Ethereum signing library
      const signature = this.signMessage(message, privateKey);
      
      const authMessage = {
        type: 'auth',
        wallet: walletAddress,
        signature,
        timestamp
      };
      
      this.socket.send(JSON.stringify(authMessage));
    } catch (error) {
      console.error('Error authenticating with Hyperliquid:', error);
    }
  }

  /**
   * Sign a message for authentication
   * @param message The message to sign
   * @param privateKey The private key to sign with
   */
  private signMessage(message: string, privateKey: string): string {
    // This is a placeholder for actual Ethereum signing
    // In production, you would use ethers.js or similar
    return '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
  }

  /**
   * Resubscribe to all previous subscriptions
   */
  private resubscribeAll(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    for (const subKey of this.subscriptions) {
      const [type, symbol, interval] = subKey.split(':');
      const subscription = this.createSubscriptionMessage(
        type as ExchangeDataType,
        symbol,
        interval || undefined
      );
      
      if (subscription) {
        this.socket.send(JSON.stringify(subscription));
      }
    }
  }

  /**
   * Create a subscription message
   * @param type The data type to subscribe to
   * @param symbol The trading symbol
   * @param interval Optional interval for klines
   * @param action The action type (subscribe or unsubscribe)
   */
  private createSubscriptionMessage(
    type: ExchangeDataType, 
    symbol: string, 
    interval?: string,
    action: 'subscribe' | 'unsubscribe' = 'subscribe'
  ): any {
    const baseMessage = {
      action,
      name: this.getChannelName(type)
    };
    
    switch (type) {
      case ExchangeDataType.TICKER:
        return {
          ...baseMessage,
          data: {
            coin: symbol
          }
        };
      case ExchangeDataType.TRADES:
        return {
          ...baseMessage,
          data: {
            coin: symbol
          }
        };
      case ExchangeDataType.ORDERBOOK:
        return {
          ...baseMessage,
          data: {
            coin: symbol,
            level: 20 // Default to 20 levels
          }
        };
      case ExchangeDataType.KLINE:
        if (!interval) return null;
        return {
          ...baseMessage,
          data: {
            coin: symbol,
            interval: this.convertInterval(interval)
          }
        };
      case ExchangeDataType.USER_ORDERS:
      case ExchangeDataType.USER_POSITIONS:
      case ExchangeDataType.USER_ACCOUNT:
        // These require authentication
        if (!this.credential?.additional_params?.wallet_address) return null;
        return {
          ...baseMessage,
          data: {
            wallet: this.credential.additional_params.wallet_address
          }
        };
      default:
        return null;
    }
  }

  /**
   * Get the channel name for a data type
   * @param type The data type
   */
  private getChannelName(type: ExchangeDataType): string {
    switch (type) {
      case ExchangeDataType.TICKER:
        return 'mktData';
      case ExchangeDataType.TRADES:
        return 'trades';
      case ExchangeDataType.ORDERBOOK:
        return 'l2Book';
      case ExchangeDataType.KLINE:
        return 'candles';
      case ExchangeDataType.USER_ORDERS:
        return 'userOrders';
      case ExchangeDataType.USER_POSITIONS:
        return 'userPositions';
      case ExchangeDataType.USER_ACCOUNT:
        return 'userAccount';
      default:
        return '';
    }
  }

  /**
   * Convert interval format to Hyperliquid format
   * @param interval The interval in standard format (e.g., 1m, 1h)
   */
  private convertInterval(interval: string): string {
    // Hyperliquid uses '1m', '5m', '15m', '30m', '1h', '4h', '12h', '1d'
    // We'll map our standard interval format to Hyperliquid's
    const value = parseInt(interval);
    const unit = interval.slice(-1);
    
    if (unit === 'm' && [1, 5, 15, 30].includes(value)) {
      return interval;
    } else if (unit === 'h' && [1, 4, 12].includes(value)) {
      return interval;
    } else if (unit === 'd' && value === 1) {
      return interval;
    }
    
    // Default to 1h if not supported
    return '1h';
  }

  /**
   * Normalize WebSocket messages to a standard format
   * @param message The message to normalize
   */
  private normalizeMessage(message: any): WebSocketEvent | null {
    if (!message.channel || !message.data) return null;
    
    const channel = message.channel;
    let dataType: ExchangeDataType;
    let data: any;
    let symbol: string;
    
    switch (channel) {
      case 'mktData':
        dataType = ExchangeDataType.TICKER;
        symbol = message.data.coin;
        data = this.normalizeTicker(message.data);
        break;
      case 'trades':
        dataType = ExchangeDataType.TRADES;
        symbol = message.data.coin;
        data = this.normalizeTrades(message.data);
        break;
      case 'l2Book':
        dataType = ExchangeDataType.ORDERBOOK;
        symbol = message.data.coin;
        data = this.normalizeOrderbook(message.data);
        break;
      case 'candles':
        dataType = ExchangeDataType.KLINE;
        symbol = message.data.coin;
        data = this.normalizeKline(message.data);
        break;
      case 'userOrders':
        dataType = ExchangeDataType.USER_ORDERS;
        symbol = message.data.orders?.[0]?.coin || 'UNKNOWN';
        data = this.normalizeOrders(message.data);
        break;
      case 'userPositions':
        dataType = ExchangeDataType.USER_POSITIONS;
        symbol = message.data.positions?.[0]?.coin || 'UNKNOWN';
        data = this.normalizePositions(message.data);
        break;
      default:
        return null;
    }
    
    if (!data) return null;
    
    return {
      topic: `${channel}.${symbol}`,
      data,
      type: dataType,
      timestamp: new Date().toISOString(),
      exchange: ExchangeType.HYPERLIQUID
    };
  }

  /**
   * Normalize ticker data
   * @param data The ticker data
   */
  private normalizeTicker(data: any): NormalizedTicker {
    return {
      symbol: data.coin,
      price: parseFloat(data.markPrice || 0),
      high: parseFloat(data.high24h || 0),
      low: parseFloat(data.low24h || 0),
      volume: parseFloat(data.volume24h || 0),
      quoteVolume: parseFloat(data.volume24h || 0) * parseFloat(data.markPrice || 0),
      change: parseFloat(data.markPrice || 0) - parseFloat(data.prevPrice24h || 0),
      changePercent: (
        ((parseFloat(data.markPrice || 0) - parseFloat(data.prevPrice24h || 0)) / 
        parseFloat(data.prevPrice24h || 1)) * 100
      ),
      timestamp: new Date().toISOString(),
      fundingRate: parseFloat(data.fundingRate || 0),
      openInterest: parseFloat(data.openInterest || 0)
    };
  }

  /**
   * Normalize trades data
   * @param data The trades data
   */
  private normalizeTrades(data: any): NormalizedTrade[] {
    if (!Array.isArray(data.trades)) return [];
    
    return data.trades.map((trade: any) => ({
      symbol: data.coin,
      id: trade.tid || '',
      price: parseFloat(trade.px || 0),
      quantity: parseFloat(trade.sz || 0),
      side: trade.side.toLowerCase() as 'buy' | 'sell',
      timestamp: new Date(trade.time || Date.now()).toISOString()
    }));
  }

  /**
   * Normalize orderbook data
   * @param data The orderbook data
   */
  private normalizeOrderbook(data: any): NormalizedOrderbook {
    return {
      symbol: data.coin,
      bids: (data.levels?.bids || []).map((bid: any) => [
        parseFloat(bid.px || 0),
        parseFloat(bid.sz || 0)
      ]),
      asks: (data.levels?.asks || []).map((ask: any) => [
        parseFloat(ask.px || 0),
        parseFloat(ask.sz || 0)
      ]),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Normalize kline data
   * @param data The kline data
   */
  private normalizeKline(data: any): NormalizedKline {
    if (!data.candle) return null;
    
    return {
      symbol: data.coin,
      interval: data.interval || '1h',
      open: parseFloat(data.candle.open || 0),
      high: parseFloat(data.candle.high || 0),
      low: parseFloat(data.candle.low || 0),
      close: parseFloat(data.candle.close || 0),
      volume: parseFloat(data.candle.volume || 0),
      timestamp: new Date(data.candle.time || Date.now()).toISOString()
    };
  }

  /**
   * Normalize orders data
   * @param data The orders data
   */
  private normalizeOrders(data: any): NormalizedOrder[] {
    if (!Array.isArray(data.orders)) return [];
    
    return data.orders.map((order: any) => ({
      id: order.oid || '',
      symbol: order.coin,
      status: order.status || 'unknown',
      side: order.side.toLowerCase() as 'buy' | 'sell',
      type: order.type || 'limit',
      price: parseFloat(order.px || 0),
      quantity: parseFloat(order.sz || 0),
      filledQuantity: parseFloat(order.filled || 0),
      timestamp: new Date(order.time || Date.now()).toISOString()
    }));
  }

  /**
   * Normalize positions data
   * @param data The positions data
   */
  private normalizePositions(data: any): NormalizedPosition[] {
    if (!Array.isArray(data.positions)) return [];
    
    return data.positions.map((pos: any) => ({
      symbol: pos.coin,
      side: parseFloat(pos.szi || 0) > 0 ? 'long' : 'short',
      size: Math.abs(parseFloat(pos.szi || 0)),
      entryPrice: parseFloat(pos.entryPx || 0),
      markPrice: parseFloat(pos.markPx || 0),
      liquidationPrice: parseFloat(pos.liqPx || 0),
      margin: parseFloat(pos.margin || 0),
      leverage: parseFloat(pos.leverage || 0),
      unrealizedPnl: parseFloat(pos.unrealizedPnl || 0),
      timestamp: new Date().toISOString()
    }));
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
          console.error(`Error in Hyperliquid WebSocket callback for ${event.type}:`, error);
        }
      }
    }
  }
}

// Export a singleton instance
const hyperliquidWebSocketAdapter = new HyperliquidWebSocketAdapter();
export default hyperliquidWebSocketAdapter;
