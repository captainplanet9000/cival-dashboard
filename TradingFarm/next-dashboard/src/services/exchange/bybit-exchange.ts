import { BaseExchange, ExchangeOptions, MarketData, OrderParams, Order, AccountBalance, Position, ExchangeApiError, ExchangeAuthError, ExchangeRateLimitError } from './exchange-base';
import WebSocket from '@/lib/stubs/isomorphic-ws';
import crypto from 'crypto';

/**
 * Bybit Exchange implementation for Trading Farm
 */
export class BybitExchange extends BaseExchange {
  private baseUrl: string;
  private wsUrl: string;
  private activeSubscriptions: Map<string, WebSocket> = new Map();
  
  constructor(options: Partial<ExchangeOptions> = {}) {
    super(options);
    
    // Set API URLs based on testnet flag
    if (this.options.testnet) {
      this.baseUrl = 'https://api-testnet.bybit.com';
      this.wsUrl = 'wss://stream-testnet.bybit.com';
    } else {
      this.baseUrl = 'https://api.bybit.com';
      this.wsUrl = 'wss://stream.bybit.com';
    }
  }
  
  /**
   * Initialize the exchange connection
   */
  async initialize(options: ExchangeOptions): Promise<boolean> {
    try {
      this.options = {
        ...this.options,
        ...options
      };
      
      // Validate required credentials for authenticated endpoints
      if (!this.options.apiKey || !this.options.apiSecret) {
        console.warn('Bybit: No API key or secret provided. Only public endpoints will be available.');
      }
      
      // Test connection by getting server time
      await this.getServerTime();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Bybit exchange:', error);
      this.initialized = false;
      return false;
    }
  }
  
  /**
   * Get exchange information including trading pairs and limits
   */
  async getExchangeInfo(): Promise<any> {
    return this.publicGetRequest('/v5/market/instruments-info', { category: 'linear' });
  }
  
  /**
   * Get current price ticker for a symbol
   */
  async getTicker(symbol: string): Promise<MarketData> {
    const formattedSymbol = this.validateAndFormatSymbol(symbol);
    const response = await this.publicGetRequest('/v5/market/tickers', { 
      category: 'linear',
      symbol: formattedSymbol 
    });
    
    if (!response.result || !response.result.list || response.result.list.length === 0) {
      throw new Error(`No ticker data found for symbol ${formattedSymbol}`);
    }
    
    const ticker = response.result.list[0];
    
    return {
      symbol: formattedSymbol,
      price: parseFloat(ticker.lastPrice),
      bid: parseFloat(ticker.bid1Price),
      ask: parseFloat(ticker.ask1Price),
      high24h: parseFloat(ticker.highPrice24h),
      low24h: parseFloat(ticker.lowPrice24h),
      volume24h: parseFloat(ticker.volume24h),
      timestamp: this.getTimestamp(),
      raw: ticker
    };
  }
  
  /**
   * Get order book for a symbol
   */
  async getOrderBook(symbol: string, limit: number = 50): Promise<any> {
    const formattedSymbol = this.validateAndFormatSymbol(symbol);
    const response = await this.publicGetRequest('/v5/market/orderbook', {
      category: 'linear',
      symbol: formattedSymbol,
      limit: limit <= 200 ? limit : 200 // Bybit limits to 200 max
    });
    
    return response.result;
  }
  
  /**
   * Get recent trades for a symbol
   */
  async getRecentTrades(symbol: string, limit: number = 50): Promise<any[]> {
    const formattedSymbol = this.validateAndFormatSymbol(symbol);
    const response = await this.publicGetRequest('/v5/market/recent-trade', {
      category: 'linear',
      symbol: formattedSymbol,
      limit: limit <= 1000 ? limit : 1000 // Bybit limits to 1000 max
    });
    
    return response.result.list || [];
  }
  
  /**
   * Get candles (kline) data for a symbol
   */
  async getCandles(
    symbol: string, 
    interval: string, 
    limit: number = 100, 
    startTime?: number, 
    endTime?: number
  ): Promise<any[]> {
    const formattedSymbol = this.validateAndFormatSymbol(symbol);
    const params: any = {
      category: 'linear',
      symbol: formattedSymbol,
      interval: this.formatTimeInterval(interval),
      limit: limit <= 1000 ? limit : 1000
    };
    
    if (startTime) params.start = startTime;
    if (endTime) params.end = endTime;
    
    const response = await this.publicGetRequest('/v5/market/kline', params);
    
    return response.result.list || [];
  }
  
  /**
   * Place a new order
   */
  async placeOrder(params: OrderParams): Promise<Order> {
    this.checkInitialized();
    
    const formattedSymbol = this.validateAndFormatSymbol(params.symbol);
    
    const orderParams: any = {
      category: 'linear',
      symbol: formattedSymbol,
      side: params.side,
      orderType: this.formatOrderType(params.type),
      qty: params.quantity.toString(),
    };
    
    // Add conditional parameters
    if (params.price) orderParams.price = params.price.toString();
    if (params.stopPrice) orderParams.triggerPrice = params.stopPrice.toString();
    if (params.timeInForce) orderParams.timeInForce = params.timeInForce;
    if (params.clientOrderId) orderParams.orderLinkId = params.clientOrderId;
    if (params.reduceOnly !== undefined) orderParams.reduceOnly = params.reduceOnly;
    if (params.postOnly !== undefined) orderParams.postOnly = params.postOnly;
    
    const response = await this.privatePostRequest('/v5/order/create', orderParams);
    
    if (!response.result) {
      throw new Error('Failed to place order: No result in response');
    }
    
    // Get the order details to return standardized Order object
    return this.getOrder(formattedSymbol, response.result.orderId);
  }
  
  /**
   * Cancel an existing order
   */
  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    this.checkInitialized();
    
    const formattedSymbol = this.validateAndFormatSymbol(symbol);
    
    const response = await this.privatePostRequest('/v5/order/cancel', {
      category: 'linear',
      symbol: formattedSymbol,
      orderId
    });
    
    return response.retCode === 0;
  }
  
  /**
   * Cancel all open orders, optionally filtered by symbol
   */
  async cancelAllOrders(symbol?: string): Promise<boolean> {
    this.checkInitialized();
    
    const params: any = {
      category: 'linear'
    };
    
    if (symbol) {
      params.symbol = this.validateAndFormatSymbol(symbol);
    }
    
    const response = await this.privatePostRequest('/v5/order/cancel-all', params);
    
    return response.retCode === 0;
  }
  
  /**
   * Get information about a specific order
   */
  async getOrder(symbol: string, orderId: string): Promise<Order> {
    this.checkInitialized();
    
    const formattedSymbol = this.validateAndFormatSymbol(symbol);
    
    const response = await this.privateGetRequest('/v5/order/realtime', {
      category: 'linear',
      symbol: formattedSymbol,
      orderId
    });
    
    if (!response.result || !response.result.list || response.result.list.length === 0) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    const orderData = response.result.list[0];
    
    const order: Order = {
      id: orderData.orderId,
      clientOrderId: orderData.orderLinkId || undefined,
      symbol: formattedSymbol,
      side: orderData.side,
      type: this.normalizeOrderType(orderData.orderType),
      status: this.normalizeOrderStatus(orderData.orderStatus),
      price: orderData.price ? parseFloat(orderData.price) : undefined,
      stopPrice: orderData.triggerPrice ? parseFloat(orderData.triggerPrice) : undefined,
      quantity: parseFloat(orderData.qty),
      executedQuantity: parseFloat(orderData.cumExecQty),
      remainingQuantity: parseFloat(orderData.leavesQty),
      reduceOnly: orderData.reduceOnly || false,
      postOnly: orderData.postOnly || false,
      timestamp: parseInt(orderData.createdTime),
      updateTime: parseInt(orderData.updatedTime),
      raw: orderData
    };
    
    return order;
  }
  
  /**
   * Get all open orders, optionally filtered by symbol
   */
  async getOpenOrders(symbol?: string): Promise<Order[]> {
    this.checkInitialized();
    
    const params: any = {
      category: 'linear',
      limit: 50
    };
    
    if (symbol) {
      params.symbol = this.validateAndFormatSymbol(symbol);
    }
    
    const response = await this.privateGetRequest('/v5/order/realtime', params);
    
    if (!response.result || !response.result.list) {
      return [];
    }
    
    return response.result.list.map((orderData: any) => {
      return {
        id: orderData.orderId,
        clientOrderId: orderData.orderLinkId || undefined,
        symbol: orderData.symbol,
        side: orderData.side,
        type: this.normalizeOrderType(orderData.orderType),
        status: this.normalizeOrderStatus(orderData.orderStatus),
        price: orderData.price ? parseFloat(orderData.price) : undefined,
        stopPrice: orderData.triggerPrice ? parseFloat(orderData.triggerPrice) : undefined,
        quantity: parseFloat(orderData.qty),
        executedQuantity: parseFloat(orderData.cumExecQty),
        remainingQuantity: parseFloat(orderData.leavesQty),
        reduceOnly: orderData.reduceOnly || false,
        postOnly: orderData.postOnly || false,
        timestamp: parseInt(orderData.createdTime),
        updateTime: parseInt(orderData.updatedTime),
        raw: orderData
      };
    });
  }
  
  /**
   * Get historical orders, optionally filtered by symbol
   */
  async getOrderHistory(symbol?: string, limit: number = 50): Promise<Order[]> {
    this.checkInitialized();
    
    const params: any = {
      category: 'linear',
      limit: limit <= 100 ? limit : 100
    };
    
    if (symbol) {
      params.symbol = this.validateAndFormatSymbol(symbol);
    }
    
    const response = await this.privateGetRequest('/v5/order/history', params);
    
    if (!response.result || !response.result.list) {
      return [];
    }
    
    return response.result.list.map((orderData: any) => {
      return {
        id: orderData.orderId,
        clientOrderId: orderData.orderLinkId || undefined,
        symbol: orderData.symbol,
        side: orderData.side,
        type: this.normalizeOrderType(orderData.orderType),
        status: this.normalizeOrderStatus(orderData.orderStatus),
        price: orderData.price ? parseFloat(orderData.price) : undefined,
        stopPrice: orderData.triggerPrice ? parseFloat(orderData.triggerPrice) : undefined,
        quantity: parseFloat(orderData.qty),
        executedQuantity: parseFloat(orderData.cumExecQty),
        remainingQuantity: parseFloat(orderData.leavesQty),
        reduceOnly: orderData.reduceOnly || false,
        postOnly: orderData.postOnly || false,
        timestamp: parseInt(orderData.createdTime),
        updateTime: parseInt(orderData.updatedTime),
        raw: orderData
      };
    });
  }
  
  /**
   * Get account balance
   */
  async getAccountBalance(): Promise<AccountBalance[]> {
    this.checkInitialized();
    
    const response = await this.privateGetRequest('/v5/account/wallet-balance', {
      accountType: 'UNIFIED'
    });
    
    if (!response.result || !response.result.list || response.result.list.length === 0) {
      return [];
    }
    
    const account = response.result.list[0];
    if (!account.coin || !account.coin.length) {
      return [];
    }
    
    return account.coin.map((coinData: any) => {
      return {
        asset: coinData.coin,
        free: parseFloat(coinData.availableToWithdraw),
        locked: parseFloat(coinData.locked),
        total: parseFloat(coinData.walletBalance),
        equity: parseFloat(coinData.equity),
        raw: coinData
      };
    });
  }
  
  /**
   * Get current positions, optionally filtered by symbol
   */
  async getPositions(symbol?: string): Promise<Position[]> {
    this.checkInitialized();
    
    const params: any = {
      category: 'linear'
    };
    
    if (symbol) {
      params.symbol = this.validateAndFormatSymbol(symbol);
    }
    
    const response = await this.privateGetRequest('/v5/position/list', params);
    
    if (!response.result || !response.result.list) {
      return [];
    }
    
    return response.result.list.map((posData: any) => {
      const side = parseFloat(posData.size) >= 0 ? 'LONG' : 'SHORT';
      
      return {
        symbol: posData.symbol,
        side: side,
        entryPrice: parseFloat(posData.entryPrice),
        markPrice: parseFloat(posData.markPrice),
        unrealizedPnl: parseFloat(posData.unrealisedPnl),
        size: Math.abs(parseFloat(posData.size)),
        leverage: parseFloat(posData.leverage),
        liquidationPrice: parseFloat(posData.liqPrice),
        timestamp: this.getTimestamp(),
        raw: posData
      };
    });
  }
  
  /**
   * Subscribe to real-time ticker updates
   */
  async subscribeToTicker(symbol: string, callback: (data: MarketData) => void): Promise<any> {
    const formattedSymbol = this.validateAndFormatSymbol(symbol);
    const topic = `tickers.${formattedSymbol}`;
    
    return this.subscribeToWebsocket('market', [topic], (message) => {
      if (message.topic === topic && message.data) {
        const ticker = message.data;
        const marketData: MarketData = {
          symbol: formattedSymbol,
          price: parseFloat(ticker.lastPrice),
          bid: parseFloat(ticker.bid1Price),
          ask: parseFloat(ticker.ask1Price),
          high24h: parseFloat(ticker.highPrice24h),
          low24h: parseFloat(ticker.lowPrice24h),
          volume24h: parseFloat(ticker.volume24h),
          timestamp: ticker.timestamp,
          raw: ticker
        };
        
        callback(marketData);
      }
    });
  }
  
  /**
   * Subscribe to order book updates
   */
  async subscribeToOrderBook(symbol: string, callback: (data: any) => void): Promise<any> {
    const formattedSymbol = this.validateAndFormatSymbol(symbol);
    const topic = `orderbook.50.${formattedSymbol}`;
    
    return this.subscribeToWebsocket('market', [topic], (message) => {
      if (message.topic === topic && message.data) {
        callback(message.data);
      }
    });
  }
  
  /**
   * Subscribe to trade updates
   */
  async subscribeToTrades(symbol: string, callback: (data: any) => void): Promise<any> {
    const formattedSymbol = this.validateAndFormatSymbol(symbol);
    const topic = `publicTrade.${formattedSymbol}`;
    
    return this.subscribeToWebsocket('market', [topic], (message) => {
      if (message.topic === topic && message.data) {
        callback(message.data);
      }
    });
  }
  
  /**
   * Subscribe to candle updates
   */
  async subscribeToCandles(symbol: string, interval: string, callback: (data: any) => void): Promise<any> {
    const formattedSymbol = this.validateAndFormatSymbol(symbol);
    const formattedInterval = this.formatTimeInterval(interval);
    const topic = `kline.${formattedInterval}.${formattedSymbol}`;
    
    return this.subscribeToWebsocket('market', [topic], (message) => {
      if (message.topic === topic && message.data) {
        callback(message.data);
      }
    });
  }
  
  /**
   * Subscribe to user account updates (requires authentication)
   */
  async subscribeToUserData(callback: (data: any) => void): Promise<any> {
    this.checkInitialized();
    
    const topics = ['position', 'execution', 'order', 'wallet'];
    
    return this.subscribeToWebsocket('private', topics, (message) => {
      callback(message);
    });
  }
  
  /**
   * Unsubscribe from a websocket stream
   */
  async unsubscribe(subscription: any): Promise<boolean> {
    if (!subscription || !subscription.id) {
      return false;
    }
    
    const id = subscription.id;
    const ws = this.activeSubscriptions.get(id);
    
    if (ws) {
      ws.close();
      this.activeSubscriptions.delete(id);
      return true;
    }
    
    return false;
  }
  
  /**
   * Get the current server time
   */
  async getServerTime(): Promise<number> {
    const response = await this.publicGetRequest('/v5/market/time');
    return parseInt(response.result.timeNano);
  }
  
  /**
   * Calculate the trading fee for a given order
   */
  async calculateFee(symbol: string, type: string, side: string, amount: number, price: number): Promise<number> {
    // Bybit fee structure is complex and depends on VIP levels, so this is an approximation
    // In a real implementation, this would fetch the actual fee rate from the account info
    const feeRate = 0.0006; // 0.06% for maker/taker
    return amount * price * feeRate;
  }
  
  // Helper methods
  private checkInitialized() {
    if (!this.initialized) {
      throw new Error('Bybit exchange has not been initialized. Call initialize() first.');
    }
    
    if (!this.options.apiKey || !this.options.apiSecret) {
      throw new ExchangeAuthError('API key and secret are required for authenticated endpoints');
    }
  }
  
  private validateAndFormatSymbol(symbol: string): string {
    // Bybit typically uses BTCUSDT format without the slash
    return symbol.replace('/', '').toUpperCase();
  }
  
  private formatTimeInterval(interval: string): string {
    // Convert common interval format to Bybit format
    const mapping: {[key: string]: string} = {
      '1m': '1',
      '3m': '3',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1h': '60',
      '2h': '120',
      '4h': '240',
      '6h': '360',
      '12h': '720',
      '1d': 'D',
      '1w': 'W',
      '1M': 'M'
    };
    
    return mapping[interval] || interval;
  }
  
  private formatOrderType(type: string): string {
    // Convert order type to Bybit format
    const mapping: {[key: string]: string} = {
      'MARKET': 'Market',
      'LIMIT': 'Limit',
      'STOP_MARKET': 'Market',
      'STOP_LIMIT': 'Limit',
      'TRAILING_STOP': 'Market'
    };
    
    return mapping[type] || type;
  }
  
  private normalizeOrderType(bybitType: string): keyof any {
    // Convert Bybit order type to standard format
    const mapping: {[key: string]: string} = {
      'Market': 'MARKET',
      'Limit': 'LIMIT'
    };
    
    return mapping[bybitType] || bybitType;
  }
  
  private normalizeOrderStatus(bybitStatus: string): keyof any {
    // Convert Bybit order status to standard format
    const mapping: {[key: string]: string} = {
      'Created': 'NEW',
      'New': 'NEW',
      'PartiallyFilled': 'PARTIALLY_FILLED',
      'Filled': 'FILLED',
      'Cancelled': 'CANCELED',
      'Rejected': 'REJECTED',
      'PendingCancel': 'CANCELED'
    };
    
    return mapping[bybitStatus] || bybitStatus;
  }
  
  // API request methods
  private async publicGetRequest(endpoint: string, params: any = {}): Promise<any> {
    const url = new URL(this.baseUrl + endpoint);
    
    // Add params to URL
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return this.handleResponse(response);
  }
  
  private async privateGetRequest(endpoint: string, params: any = {}): Promise<any> {
    const timestamp = Date.now().toString();
    const queryString = this.buildQueryString(params);
    
    // Create signature
    const signature = this.generateSignature(timestamp, this.options.apiKey!, queryString);
    
    let url = this.baseUrl + endpoint;
    if (queryString) {
      url += '?' + queryString;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-BAPI-API-KEY': this.options.apiKey!,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000'
      }
    });
    
    return this.handleResponse(response);
  }
  
  private async privatePostRequest(endpoint: string, params: any = {}): Promise<any> {
    const timestamp = Date.now().toString();
    const postData = JSON.stringify(params);
    
    // Create signature
    const signature = this.generateSignature(timestamp, this.options.apiKey!, postData);
    
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BAPI-API-KEY': this.options.apiKey!,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000'
      },
      body: postData
    });
    
    return this.handleResponse(response);
  }
  
  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 401) {
        throw new ExchangeAuthError(error.retMsg || 'Authentication failed');
      } else if (response.status === 429) {
        throw new ExchangeRateLimitError('Rate limit exceeded');
      } else {
        throw new ExchangeApiError(error.retMsg || 'API error', error.retCode || response.status);
      }
    }
    
    const data = await response.json();
    
    if (data.retCode !== 0) {
      throw new ExchangeApiError(data.retMsg || 'API error', data.retCode);
    }
    
    return data;
  }
  
  private buildQueryString(params: any): string {
    return Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }
  
  private generateSignature(timestamp: string, apiKey: string, payload: string): string {
    const signaturePayload = timestamp + apiKey + '5000' + payload;
    return crypto
      .createHmac('sha256', this.options.apiSecret!)
      .update(signaturePayload)
      .digest('hex');
  }
  
  private subscribeToWebsocket(type: 'market' | 'private', topics: string[], messageCallback: (data: any) => void): any {
    // Generate a unique ID for this subscription
    const subscriptionId = Math.random().toString(36).substring(2, 15);
    let wsUrl = '';
    
    if (type === 'market') {
      wsUrl = `${this.wsUrl}/v5/public/linear`;
    } else {
      wsUrl = `${this.wsUrl}/v5/private`;
    }
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log(`Bybit WebSocket connected: ${type}`);
      
      // Authentication for private streams
      if (type === 'private') {
        const timestamp = Date.now().toString();
        const signature = crypto
          .createHmac('sha256', this.options.apiSecret!)
          .update(timestamp + this.options.apiKey! + '5000')
          .digest('hex');
        
        ws.send(JSON.stringify({
          op: 'auth',
          args: [this.options.apiKey!, timestamp, signature]
        }));
      }
      
      // Subscribe to topics
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: topics
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data.toString());
        
        // Handle ping/pong for keep-alive
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ op: 'pong' }));
          return;
        }
        
        // Handle subscription confirmation
        if (message.type === 'response' && message.success) {
          console.log(`Subscription successful: ${message.conn_id}`);
          return;
        }
        
        // Handle actual data messages
        if (message.data) {
          messageCallback(message);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      this.activeSubscriptions.delete(subscriptionId);
    };
    
    // Store the subscription
    this.activeSubscriptions.set(subscriptionId, ws);
    
    return { id: subscriptionId, topics };
  }
}
