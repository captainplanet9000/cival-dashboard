/**
 * Hyperliquid Exchange Connector
 * 
 * Implementation of the base exchange interface for Hyperliquid
 * Handles market data fetching, order management, and perpetual futures trading
 */

import { ExchangeBase, OrderType, OrderSide, TimeInForce, OrderStatus, MarketData, 
         Orderbook, Ticker, ExchangeCredentials, OrderRequest, Order, Position,
         BalanceResponse, AccountInfo, WebSocketSubscription, WebSocketMessage } from './exchange-base';
import WebSocket from 'isomorphic-ws';
import { ethers } from 'ethers';

export interface HyperliquidCredentials extends ExchangeCredentials {
  privateKey: string; // Ethereum private key
  walletAddress: string; // Ethereum wallet address
}

interface HyperliquidApiConfig {
  baseUrl: string;
  wsUrl: string;
  chain: 'arbitrum' | 'mainnet';
}

export class HyperliquidExchange implements ExchangeBase {
  private credentials: HyperliquidCredentials | null = null;
  private config: HyperliquidApiConfig;
  private websocket: WebSocket | null = null;
  private activeSubscriptions: Map<string, WebSocketSubscription> = new Map();
  private messageHandlers: Map<string, ((message: WebSocketMessage) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // 2 seconds initial delay
  private nonce = Date.now();
  
  constructor(testnet: boolean = false) {
    this.config = {
      baseUrl: testnet 
        ? 'https://api-testnet.hyperliquid.xyz' 
        : 'https://api.hyperliquid.xyz',
      wsUrl: testnet 
        ? 'wss://api-testnet.hyperliquid.xyz/ws' 
        : 'wss://api.hyperliquid.xyz/ws',
      chain: testnet ? 'arbitrum' : 'mainnet'
    };
  }
  
  /**
   * Set authentication credentials for the exchange
   */
  setCredentials(credentials: HyperliquidCredentials): void {
    this.credentials = credentials;
  }
  
  /**
   * Check if the exchange client is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.credentials;
  }
  
  /**
   * Generate authentication signature for Hyperliquid API requests
   */
  private async generateSignature(message: any): Promise<string> {
    if (!this.credentials) {
      throw new Error('Authentication credentials not set');
    }
    
    try {
      // Create wallet from private key
      const wallet = new ethers.Wallet(this.credentials.privateKey);
      
      // Hash the message
      const messageHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(JSON.stringify(message))
      );
      
      // Sign the hash
      const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));
      
      return signature;
    } catch (error) {
      console.error('Error generating signature:', error);
      throw error;
    }
  }
  
  /**
   * Make a request to the Hyperliquid API
   */
  private async makeRequest<T>(
    endpoint: string,
    method: string = 'GET',
    params: any = {},
    requiresAuth: boolean = false
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    let options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (method !== 'GET') {
      if (requiresAuth && this.credentials) {
        const timestamp = Date.now();
        const nonce = this.nonce++;
        
        const message = {
          ...params,
          timestamp,
          nonce
        };
        
        const signature = await this.generateSignature(message);
        
        options.body = JSON.stringify({
          ...params,
          signature,
          address: this.credentials.walletAddress,
          timestamp,
          nonce
        });
      } else {
        options.body = JSON.stringify(params);
      }
    }
    
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hyperliquid API error: ${response.status} ${errorText}`);
      }
      
      return await response.json() as T;
    } catch (error) {
      console.error('Hyperliquid API request failed:', error);
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
      console.log('Hyperliquid WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Resubscribe to active channels
      this.activeSubscriptions.forEach((subscription, channel) => {
        this.subscribe(channel, subscription.symbols, subscription.handler);
      });
    };
    
    this.websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data.toString()) as WebSocketMessage;
        
        // Route message to appropriate handler
        if (message.channel) {
          const handlers = this.messageHandlers.get(message.channel);
          if (handlers) {
            handlers.forEach(handler => handler(message));
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    this.websocket.onerror = (error) => {
      console.error('Hyperliquid WebSocket error:', error);
    };
    
    this.websocket.onclose = (event) => {
      console.log('Hyperliquid WebSocket disconnected:', event.code, event.reason);
      
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
      
      // Convert symbols to Hyperliquid format
      const formattedSymbols = symbols.map(s => this.formatSymbol(s));
      
      // Send subscription message
      const subscribeMessage = {
        method: 'subscribe',
        channel,
        symbols: formattedSymbols
      };
      
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
      
      // Convert symbols to Hyperliquid format
      const formattedSymbols = symbols.map(s => this.formatSymbol(s));
      
      // Send unsubscribe message
      const unsubscribeMessage = {
        method: 'unsubscribe',
        channel,
        symbols: formattedSymbols
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
   * Convert symbol to Hyperliquid format
   */
  private formatSymbol(symbol: string): string {
    // Convert from standardized format (e.g. BTC/USDT) to Hyperliquid format (e.g. BTC)
    return symbol.split('/')[0];
  }
  
  /**
   * Convert symbol from Hyperliquid format to standardized format
   */
  private standardizeSymbol(symbol: string): string {
    // Convert from Hyperliquid format (e.g. BTC) to standardized format (e.g. BTC/USD)
    return `${symbol}/USD`;
  }
  
  /**
   * Get exchange info including trading pairs
   */
  async getExchangeInfo(): Promise<{ symbols: string[] }> {
    try {
      const info = await this.makeRequest<any>('/info/universe');
      
      return {
        symbols: info.universe.map((asset: any) => this.standardizeSymbol(asset.name))
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
      const coin = this.formatSymbol(symbol);
      const response = await this.makeRequest<any>('/info/ticker', 'GET', { coin });
      
      return {
        symbol,
        lastPrice: parseFloat(response.markPrice),
        bidPrice: parseFloat(response.bidPrice),
        askPrice: parseFloat(response.askPrice),
        volume: parseFloat(response.volume24h),
        timestamp: Date.now()
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
      const coin = this.formatSymbol(symbol);
      const response = await this.makeRequest<any>('/orderbook', 'GET', { coin, level: depth });
      
      return {
        symbol,
        bids: response.bids.map((bid: any) => ({
          price: parseFloat(bid[0]),
          quantity: parseFloat(bid[1])
        })),
        asks: response.asks.map((ask: any) => ({
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
      const coin = this.formatSymbol(symbol);
      const response = await this.makeRequest<any>('/trades', 'GET', { coin, limit });
      
      return response.trades.map((trade: any) => ({
        id: trade.id,
        symbol,
        price: parseFloat(trade.price),
        quantity: parseFloat(trade.size),
        side: trade.side.toLowerCase(),
        timestamp: trade.time
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
      const coin = this.formatSymbol(symbol);
      const resolution = this.convertIntervalToMinutes(interval);
      
      const params: any = { 
        coin, 
        resolution, 
        limit 
      };
      
      if (startTime) params.from = Math.floor(startTime / 1000);
      if (endTime) params.to = Math.floor(endTime / 1000);
      
      const response = await this.makeRequest<any>('/candles', 'GET', params);
      
      return response.candles.map((candle: any) => ({
        symbol,
        interval,
        timestamp: candle.time * 1000,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume)
      }));
    } catch (error) {
      console.error(`Error fetching klines for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Convert time interval to minutes for Hyperliquid API
   */
  private convertIntervalToMinutes(interval: string): number {
    const unit = interval.charAt(interval.length - 1);
    const value = parseInt(interval.substring(0, interval.length - 1));
    
    switch (unit) {
      case 'm':
        return value;
      case 'h':
        return value * 60;
      case 'd':
        return value * 60 * 24;
      case 'w':
        return value * 60 * 24 * 7;
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
      const coin = this.formatSymbol(request.symbol);
      
      const params: any = {
        coin,
        side: request.side.toLowerCase(),
        size: request.quantity.toString(),
        type: request.type.toLowerCase(),
        reduceOnly: request.reduceOnly || false
      };
      
      // Handle order types
      if (request.type === 'LIMIT' || request.type === 'STOP_LOSS_LIMIT' || request.type === 'TAKE_PROFIT_LIMIT') {
        params.limitPrice = request.price?.toString();
      }
      
      if (request.type === 'STOP_LOSS' || request.type === 'STOP_LOSS_LIMIT' || 
          request.type === 'TAKE_PROFIT' || request.type === 'TAKE_PROFIT_LIMIT') {
        params.triggerPrice = request.stopPrice?.toString();
      }
      
      // Handle specific order flags
      if (request.timeInForce) {
        params.timeInForce = request.timeInForce;
      }
      
      if (request.postOnly) {
        params.postOnly = true;
      }
      
      const response = await this.makeRequest<any>(
        '/order/create',
        'POST',
        params,
        true
      );
      
      return {
        id: response.orderId,
        symbol,
        side: request.side,
        type: request.type,
        price: request.price,
        quantity: request.quantity,
        filledQuantity: 0,
        status: 'NEW',
        timestamp: Date.now()
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
      const response = await this.makeRequest<any>(
        '/order/status',
        'GET',
        { orderId },
        true
      );
      
      return {
        id: response.orderId,
        symbol: this.standardizeSymbol(response.coin),
        side: response.side.toUpperCase() as OrderSide,
        type: this.standardizeOrderType(response.type),
        price: parseFloat(response.limitPrice),
        quantity: parseFloat(response.size),
        filledQuantity: parseFloat(response.filledSize),
        status: this.standardizeOrderStatus(response.status),
        timestamp: response.time
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
        params.coin = this.formatSymbol(symbol);
      }
      
      const response = await this.makeRequest<any>(
        '/order/open',
        'GET',
        params,
        true
      );
      
      return response.orders.map((order: any) => ({
        id: order.orderId,
        symbol: this.standardizeSymbol(order.coin),
        side: order.side.toUpperCase() as OrderSide,
        type: this.standardizeOrderType(order.type),
        price: parseFloat(order.limitPrice),
        quantity: parseFloat(order.size),
        filledQuantity: parseFloat(order.filledSize),
        status: this.standardizeOrderStatus(order.status),
        timestamp: order.time
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
        '/order/cancel',
        'POST',
        { orderId },
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
        params.coin = this.formatSymbol(symbol);
      }
      
      await this.makeRequest<any>(
        '/order/cancelAll',
        'POST',
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
      const response = await this.makeRequest<any>(
        '/user/balances',
        'GET',
        {},
        true
      );
      
      const balances: { [key: string]: { available: number; total: number } } = {};
      
      // Hyperliquid uses USD as collateral
      balances['USD'] = {
        available: parseFloat(response.freeCollateral),
        total: parseFloat(response.totalCollateral)
      };
      
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
   * Get positions
   */
  async getPositions(): Promise<Position[]> {
    if (!this.credentials) {
      throw new Error('Authentication required to get positions');
    }
    
    try {
      const response = await this.makeRequest<any>(
        '/user/positions',
        'GET',
        {},
        true
      );
      
      return response.positions.map((pos: any) => ({
        symbol: this.standardizeSymbol(pos.coin),
        side: parseFloat(pos.size) > 0 ? 'LONG' : 'SHORT',
        entryPrice: parseFloat(pos.entryPrice),
        markPrice: parseFloat(pos.markPrice),
        quantity: Math.abs(parseFloat(pos.size)),
        leverage: parseFloat(pos.leverage),
        unrealizedPnl: parseFloat(pos.unrealizedPnl),
        liquidationPrice: parseFloat(pos.liquidationPrice),
        marginType: 'CROSSED', // Hyperliquid uses cross margin by default
        updateTime: Date.now()
      }));
    } catch (error) {
      console.error('Error fetching positions:', error);
      throw error;
    }
  }
  
  /**
   * Get account information
   */
  async getAccountInfo(): Promise<AccountInfo> {
    if (!this.credentials) {
      throw new Error('Authentication required to get account info');
    }
    
    try {
      const [balanceResponse, positions] = await Promise.all([
        this.getBalances(),
        this.getPositions()
      ]);
      
      // Calculate total equity
      const totalEquity = positions.reduce(
        (sum, position) => sum + position.unrealizedPnl,
        balanceResponse.balances['USD']?.total || 0
      );
      
      return {
        balances: balanceResponse.balances,
        totalEquity,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw error;
    }
  }
  
  /**
   * Standardize Hyperliquid order type to common format
   */
  private standardizeOrderType(type: string): OrderType {
    switch (type.toLowerCase()) {
      case 'market':
        return 'MARKET';
      case 'limit':
        return 'LIMIT';
      case 'stopmarket':
        return 'STOP_LOSS';
      case 'stoplimit':
        return 'STOP_LOSS_LIMIT';
      case 'takeprofit':
        return 'TAKE_PROFIT';
      case 'takeprofitlimit':
        return 'TAKE_PROFIT_LIMIT';
      default:
        return 'LIMIT';
    }
  }
  
  /**
   * Standardize Hyperliquid order status to common format
   */
  private standardizeOrderStatus(status: string): OrderStatus {
    switch (status.toLowerCase()) {
      case 'new':
        return 'NEW';
      case 'partiallyfilled':
        return 'PARTIALLY_FILLED';
      case 'filled':
        return 'FILLED';
      case 'canceled':
        return 'CANCELED';
      case 'rejected':
        return 'REJECTED';
      case 'expired':
        return 'EXPIRED';
      default:
        return 'NEW';
    }
  }
}
