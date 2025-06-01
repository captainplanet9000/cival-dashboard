/**
 * Coinbase Exchange Connector
 * 
 * Implementation of the base exchange interface for Coinbase
 * Handles market data fetching, order management, and account interactions
 */

import { ExchangeBase, OrderType, OrderSide, TimeInForce, OrderStatus, MarketData, 
         Orderbook, Ticker, ExchangeCredentials, OrderRequest, Order, Position,
         BalanceResponse, AccountInfo, WebSocketSubscription, WebSocketMessage } from './exchange-base';
import crypto from 'crypto';
import WebSocket from '@/lib/stubs/isomorphic-ws';

export interface CoinbaseCredentials extends ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

interface CoinbaseApiConfig {
  baseUrl: string;
  wsUrl: string;
}

export class CoinbaseExchange implements ExchangeBase {
  private credentials: CoinbaseCredentials | null = null;
  private config: CoinbaseApiConfig;
  private websocket: WebSocket | null = null;
  private activeSubscriptions: Map<string, WebSocketSubscription> = new Map();
  private messageHandlers: Map<string, ((message: WebSocketMessage) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // 2 seconds initial delay
  
  constructor(testnet: boolean = false) {
    this.config = {
      baseUrl: testnet 
        ? 'https://api-public.sandbox.exchange.coinbase.com' 
        : 'https://api.exchange.coinbase.com',
      wsUrl: testnet 
        ? 'wss://ws-feed-public.sandbox.exchange.coinbase.com' 
        : 'wss://ws-feed.exchange.coinbase.com'
    };
  }
  
  /**
   * Set authentication credentials for the exchange
   */
  setCredentials(credentials: CoinbaseCredentials): void {
    this.credentials = credentials;
  }
  
  /**
   * Check if the exchange client is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.credentials;
  }
  
  /**
   * Generate authentication signature for Coinbase API requests
   */
  private generateAuthHeaders(
    method: string,
    requestPath: string,
    body: string = ''
  ): { [key: string]: string } {
    if (!this.credentials) {
      throw new Error('Authentication credentials not set');
    }
    
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = timestamp + method + requestPath + body;
    
    const hmac = crypto.createHmac('sha256', Buffer.from(this.credentials.apiSecret, 'base64'));
    const signature = hmac.update(message).digest('base64');
    
    return {
      'CB-ACCESS-KEY': this.credentials.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'CB-ACCESS-PASSPHRASE': this.credentials.passphrase,
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * Make a request to the Coinbase API
   */
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    params: any = {},
    requiresAuth: boolean = false
  ): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    
    let options: RequestInit = {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
    
    // Add query parameters for GET requests
    if (method === 'GET' && Object.keys(params).length > 0) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    
    // Add request body for non-GET requests
    let body = '';
    if (method !== 'GET' && Object.keys(params).length > 0) {
      body = JSON.stringify(params);
      options.body = body;
    }
    
    // Add authentication headers if required
    if (requiresAuth) {
      if (!this.credentials) {
        throw new Error('Authentication required but credentials not set');
      }
      
      const requestPath = url.pathname + url.search;
      const authHeaders = this.generateAuthHeaders(method, requestPath, body);
      options.headers = { ...options.headers, ...authHeaders };
    }
    
    try {
      const response = await fetch(url.toString(), options);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Coinbase API error: ${JSON.stringify(errorData)}`);
      }
      
      return await response.json() as T;
    } catch (error) {
      console.error('Coinbase API request failed:', error);
      throw error;
    }
  }
  
  /**
   * Initialize WebSocket connection
   */
  private async initWebSocket(): Promise<void> {
    if (this.websocket) {
      return;
    }
    
    this.websocket = new WebSocket(this.config.wsUrl);
    
    this.websocket.onopen = () => {
      console.log('Coinbase WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Resubscribe to active channels
      this.activeSubscriptions.forEach((subscription, channel) => {
        this.subscribe(channel, subscription.symbols, subscription.handler);
      });
    };
    
    this.websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data.toString()) as WebSocketMessage;
        
        // Process different message types
        if (message.type === 'subscriptions') {
          console.log('Subscription confirmed:', message);
        } else if (message.type === 'error') {
          console.error('WebSocket error:', message);
        } else {
          // Handle channel-specific messages
          const channel = message.channel || message.type;
          if (channel && this.messageHandlers.has(channel)) {
            this.messageHandlers.get(channel)?.forEach(handler => handler(message));
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    this.websocket.onerror = (error) => {
      console.error('Coinbase WebSocket error:', error);
    };
    
    this.websocket.onclose = (event) => {
      console.log('Coinbase WebSocket disconnected:', event.code, event.reason);
      
      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
          this.websocket = null;
          this.initWebSocket();
        }, delay);
      } else {
        console.error('Max reconnection attempts reached');
      }
    };
  }
  
  /**
   * Subscribe to WebSocket channel
   */
  async subscribe(
    channel: string, 
    symbols: string[], 
    handler: (message: WebSocketMessage) => void
  ): Promise<boolean> {
    try {
      await this.initWebSocket();
      
      if (!this.websocket) {
        throw new Error('WebSocket connection failed');
      }
      
      // Format product_ids for Coinbase format
      const product_ids = symbols.map(symbol => this.formatSymbol(symbol));
      
      // Add handler to message handlers
      if (!this.messageHandlers.has(channel)) {
        this.messageHandlers.set(channel, []);
      }
      this.messageHandlers.get(channel)?.push(handler);
      
      // Save subscription
      this.activeSubscriptions.set(channel, {
        symbols,
        handler
      });
      
      // Send subscription message
      const subscribeMessage = {
        type: 'subscribe',
        product_ids,
        channels: [channel]
      };
      
      // Add authentication if available
      if (this.credentials) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const message = timestamp + 'GET' + '/users/self/verify';
        const signature = crypto
          .createHmac('sha256', Buffer.from(this.credentials.apiSecret, 'base64'))
          .update(message)
          .digest('base64');
          
        Object.assign(subscribeMessage, {
          signature,
          key: this.credentials.apiKey,
          passphrase: this.credentials.passphrase,
          timestamp
        });
      }
      
      this.websocket.send(JSON.stringify(subscribeMessage));
      return true;
    } catch (error) {
      console.error('Error subscribing to WebSocket channel:', error);
      return false;
    }
  }
  
  /**
   * Unsubscribe from WebSocket channel
   */
  async unsubscribe(channel: string, symbols: string[]): Promise<boolean> {
    try {
      if (!this.websocket) {
        return false;
      }
      
      // Format product_ids for Coinbase format
      const product_ids = symbols.map(symbol => this.formatSymbol(symbol));
      
      // Send unsubscribe message
      const unsubscribeMessage = {
        type: 'unsubscribe',
        product_ids,
        channels: [channel]
      };
      
      this.websocket.send(JSON.stringify(unsubscribeMessage));
      
      // Remove subscription and handlers
      this.activeSubscriptions.delete(channel);
      this.messageHandlers.delete(channel);
      
      return true;
    } catch (error) {
      console.error('Error unsubscribing from WebSocket channel:', error);
      return false;
    }
  }
  
  /**
   * Convert symbol to Coinbase format
   */
  private formatSymbol(symbol: string): string {
    // Convert from standardized format (e.g. BTC/USDT) to Coinbase format (e.g. BTC-USDT)
    return symbol.replace('/', '-');
  }
  
  /**
   * Convert symbol from Coinbase format to standardized format
   */
  private standardizeSymbol(symbol: string): string {
    // Convert from Coinbase format (e.g. BTC-USDT) to standardized format (e.g. BTC/USDT)
    return symbol.replace('-', '/');
  }
  
  /**
   * Get exchange info including trading pairs
   */
  async getExchangeInfo(): Promise<{ symbols: string[] }> {
    try {
      const products = await this.makeRequest<any[]>('GET', '/products');
      
      return {
        symbols: products.map(product => this.standardizeSymbol(product.id))
      };
    } catch (error) {
      console.error('Error fetching exchange info:', error);
      throw error;
    }
  }
  
  /**
   * Get ticker data for a symbol
   */
  async getTicker(symbol: string): Promise<Ticker> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const ticker = await this.makeRequest<any>('GET', `/products/${formattedSymbol}/ticker`);
      
      return {
        symbol,
        lastPrice: parseFloat(ticker.price),
        bidPrice: parseFloat(ticker.bid),
        askPrice: parseFloat(ticker.ask),
        volume: parseFloat(ticker.volume),
        timestamp: new Date(ticker.time).getTime()
      };
    } catch (error) {
      console.error(`Error fetching ticker for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get orderbook for a symbol
   */
  async getOrderbook(symbol: string, depth: number = 50): Promise<Orderbook> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const level = depth <= 50 ? 2 : 3; // Level 2 is top 50 bids and asks, Level 3 is full order book
      const orderbook = await this.makeRequest<any>('GET', `/products/${formattedSymbol}/book`, { level });
      
      return {
        symbol,
        bids: orderbook.bids.map((bid: string[]) => ({
          price: parseFloat(bid[0]),
          quantity: parseFloat(bid[1])
        })),
        asks: orderbook.asks.map((ask: string[]) => ({
          price: parseFloat(ask[0]),
          quantity: parseFloat(ask[1])
        })),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching orderbook for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get recent trades for a symbol
   */
  async getTrades(symbol: string, limit: number = 100): Promise<any[]> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const trades = await this.makeRequest<any[]>('GET', `/products/${formattedSymbol}/trades`, { limit });
      
      return trades.map(trade => ({
        id: trade.trade_id,
        symbol,
        price: parseFloat(trade.price),
        quantity: parseFloat(trade.size),
        side: trade.side === 'buy' ? 'buy' : 'sell',
        timestamp: new Date(trade.time).getTime()
      }));
    } catch (error) {
      console.error(`Error fetching trades for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get candlestick data
   */
  async getKlines(
    symbol: string, 
    interval: string, 
    startTime?: number, 
    endTime?: number, 
    limit: number = 300
  ): Promise<any[]> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      
      // Convert interval to Coinbase granularity
      const granularity = this.convertIntervalToSeconds(interval);
      
      const params: any = { granularity };
      
      if (startTime && endTime) {
        params.start = new Date(startTime).toISOString();
        params.end = new Date(endTime).toISOString();
      }
      
      const candles = await this.makeRequest<number[][]>(
        'GET', 
        `/products/${formattedSymbol}/candles`, 
        params
      );
      
      // Coinbase returns [timestamp, low, high, open, close, volume]
      return candles.map(candle => ({
        symbol,
        interval,
        timestamp: candle[0] * 1000,
        open: candle[3],
        high: candle[2],
        low: candle[1],
        close: candle[4],
        volume: candle[5]
      }));
    } catch (error) {
      console.error(`Error fetching klines for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Convert time interval to seconds for Coinbase API
   */
  private convertIntervalToSeconds(interval: string): number {
    const unit = interval.charAt(interval.length - 1);
    const value = parseInt(interval.substring(0, interval.length - 1));
    
    switch (unit) {
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      case 'w':
        return value * 60 * 60 * 24 * 7;
      default:
        throw new Error(`Unsupported interval: ${interval}`);
    }
  }
  
  /**
   * Get market data for a symbol
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      const [ticker, orderbook] = await Promise.all([
        this.getTicker(symbol),
        this.getOrderbook(symbol)
      ]);
      
      return {
        symbol,
        lastPrice: ticker.lastPrice,
        bidPrice: ticker.bidPrice,
        askPrice: ticker.askPrice,
        volume: ticker.volume,
        orderbook: {
          bids: orderbook.bids,
          asks: orderbook.asks
        },
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a new order
   */
  async createOrder(request: OrderRequest): Promise<Order> {
    if (!this.credentials) {
      throw new Error('Authentication required to create orders');
    }
    
    try {
      const formattedSymbol = this.formatSymbol(request.symbol);
      
      const params: any = {
        product_id: formattedSymbol,
        side: request.side.toLowerCase(),
        size: request.quantity.toString()
      };
      
      // Handle different order types
      if (request.type === 'MARKET') {
        params.type = 'market';
      } else if (request.type === 'LIMIT') {
        params.type = 'limit';
        params.price = request.price?.toString();
        
        // Handle time in force
        if (request.timeInForce === 'GTC') {
          params.time_in_force = 'GTC';
        } else if (request.timeInForce === 'IOC') {
          params.time_in_force = 'IOC';
        } else if (request.timeInForce === 'FOK') {
          params.time_in_force = 'FOK';
        }
        
        // Handle post only
        if (request.postOnly) {
          params.post_only = true;
        }
      } else if (request.type === 'STOP_LOSS' || request.type === 'STOP_LOSS_LIMIT') {
        params.type = 'stop';
        params.stop = 'loss';
        params.stop_price = request.stopPrice?.toString();
        
        if (request.type === 'STOP_LOSS_LIMIT') {
          params.price = request.price?.toString();
        }
      } else if (request.type === 'TAKE_PROFIT' || request.type === 'TAKE_PROFIT_LIMIT') {
        params.type = 'stop';
        params.stop = 'entry';
        params.stop_price = request.stopPrice?.toString();
        
        if (request.type === 'TAKE_PROFIT_LIMIT') {
          params.price = request.price?.toString();
        }
      }
      
      const order = await this.makeRequest<any>(
        'POST', 
        '/orders', 
        params, 
        true
      );
      
      return {
        id: order.id,
        symbol: this.standardizeSymbol(order.product_id),
        side: order.side.toUpperCase() as OrderSide,
        type: this.standardizeOrderType(order.type),
        price: order.price ? parseFloat(order.price) : undefined,
        quantity: parseFloat(order.size),
        filledQuantity: order.filled_size ? parseFloat(order.filled_size) : 0,
        status: this.standardizeOrderStatus(order.status),
        timestamp: new Date(order.created_at).getTime()
      };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }
  
  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<Order> {
    if (!this.credentials) {
      throw new Error('Authentication required to get order details');
    }
    
    try {
      const order = await this.makeRequest<any>(
        'GET', 
        `/orders/${orderId}`, 
        {}, 
        true
      );
      
      return {
        id: order.id,
        symbol: this.standardizeSymbol(order.product_id),
        side: order.side.toUpperCase() as OrderSide,
        type: this.standardizeOrderType(order.type),
        price: order.price ? parseFloat(order.price) : undefined,
        quantity: parseFloat(order.size),
        filledQuantity: order.filled_size ? parseFloat(order.filled_size) : 0,
        status: this.standardizeOrderStatus(order.status),
        timestamp: new Date(order.created_at).getTime()
      };
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all open orders
   */
  async getOpenOrders(symbol?: string): Promise<Order[]> {
    if (!this.credentials) {
      throw new Error('Authentication required to get open orders');
    }
    
    try {
      const params: any = {};
      if (symbol) {
        params.product_id = this.formatSymbol(symbol);
      }
      
      const orders = await this.makeRequest<any[]>(
        'GET', 
        '/orders', 
        params, 
        true
      );
      
      return orders.map(order => ({
        id: order.id,
        symbol: this.standardizeSymbol(order.product_id),
        side: order.side.toUpperCase() as OrderSide,
        type: this.standardizeOrderType(order.type),
        price: order.price ? parseFloat(order.price) : undefined,
        quantity: parseFloat(order.size),
        filledQuantity: order.filled_size ? parseFloat(order.filled_size) : 0,
        status: this.standardizeOrderStatus(order.status),
        timestamp: new Date(order.created_at).getTime()
      }));
    } catch (error) {
      console.error('Error fetching open orders:', error);
      throw error;
    }
  }
  
  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.credentials) {
      throw new Error('Authentication required to cancel orders');
    }
    
    try {
      await this.makeRequest<any>(
        'DELETE', 
        `/orders/${orderId}`, 
        {}, 
        true
      );
      
      return true;
    } catch (error) {
      console.error(`Error canceling order ${orderId}:`, error);
      throw error;
    }
  }
  
  /**
   * Cancel all open orders
   */
  async cancelAllOrders(symbol?: string): Promise<boolean> {
    if (!this.credentials) {
      throw new Error('Authentication required to cancel orders');
    }
    
    try {
      const params: any = {};
      if (symbol) {
        params.product_id = this.formatSymbol(symbol);
      }
      
      await this.makeRequest<any>(
        'DELETE', 
        '/orders', 
        params, 
        true
      );
      
      return true;
    } catch (error) {
      console.error('Error canceling all orders:', error);
      throw error;
    }
  }
  
  /**
   * Get account balances
   */
  async getBalances(): Promise<BalanceResponse> {
    if (!this.credentials) {
      throw new Error('Authentication required to get account balances');
    }
    
    try {
      const accounts = await this.makeRequest<any[]>(
        'GET', 
        '/accounts', 
        {}, 
        true
      );
      
      const balances: { [key: string]: { available: number; total: number } } = {};
      
      accounts.forEach(account => {
        balances[account.currency] = {
          available: parseFloat(account.available),
          total: parseFloat(account.balance)
        };
      });
      
      return {
        balances,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching account balances:', error);
      throw error;
    }
  }
  
  /**
   * Get positions (not supported directly by Coinbase)
   */
  async getPositions(): Promise<Position[]> {
    // Coinbase Pro doesn't support margin trading or positions directly
    return [];
  }
  
  /**
   * Get account information
   */
  async getAccountInfo(): Promise<AccountInfo> {
    if (!this.credentials) {
      throw new Error('Authentication required to get account info');
    }
    
    try {
      const accounts = await this.makeRequest<any[]>(
        'GET', 
        '/accounts', 
        {}, 
        true
      );
      
      // Calculate total balance in USD
      const balances = accounts.reduce((acc, account) => {
        acc[account.currency] = {
          available: parseFloat(account.available),
          total: parseFloat(account.balance)
        };
        return acc;
      }, {} as { [key: string]: { available: number, total: number } });
      
      return {
        balances,
        totalEquity: 0, // Would need to convert all balances to USD
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw error;
    }
  }
  
  /**
   * Standardize Coinbase order type to common format
   */
  private standardizeOrderType(type: string): OrderType {
    switch (type) {
      case 'market':
        return 'MARKET';
      case 'limit':
        return 'LIMIT';
      case 'stop':
        return 'STOP_LOSS';
      default:
        return 'LIMIT';
    }
  }
  
  /**
   * Standardize Coinbase order status to common format
   */
  private standardizeOrderStatus(status: string): OrderStatus {
    switch (status) {
      case 'open':
      case 'pending':
        return 'NEW';
      case 'active':
        return 'PARTIALLY_FILLED';
      case 'done':
        return 'FILLED';
      case 'rejected':
        return 'REJECTED';
      case 'cancelled':
        return 'CANCELED';
      default:
        return 'NEW';
    }
  }
}
