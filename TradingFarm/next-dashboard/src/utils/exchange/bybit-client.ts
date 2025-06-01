import crypto from 'crypto';
import { BybitBalance, BybitOrder, BybitPosition, ExchangeCredentials, MarketData, OrderParams, WebSocketMessage } from './types';
import { ServerVaultService, ExchangeName } from '@/utils/supabase/vault-service';

// Environment configuration
const ENV = {
  USE_VAULT: process.env.USE_SUPABASE_VAULT === 'true'
};

export class BybitClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private wsBaseUrl: string;
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(credentials: ExchangeCredentials) {
    this.apiKey = credentials.api_key;
    this.apiSecret = credentials.api_secret;
    
    if (credentials.testnet) {
      this.baseUrl = 'https://api-testnet.bybit.com';
      this.wsBaseUrl = 'wss://stream-testnet.bybit.com';
    } else {
      this.baseUrl = 'https://api.bybit.com';
      this.wsBaseUrl = 'wss://stream.bybit.com';
    }
    
    // For server-side execution, attempt to use Vault if available
    if (typeof window === 'undefined' && ENV.USE_VAULT && !this.apiKey) {
      this.initializeFromVault(credentials.exchange);
    }
  }

  // Helper method to generate signature for API requests
  // Initialize credentials from vault if needed
  private async initializeFromVault(exchange: string): Promise<void> {
    // Convert string to ExchangeName type
    const exchangeName = exchange as ExchangeName;
    try {
      const vaultCredentials = await ServerVaultService.getExchangeCredentials(exchangeName);
      if (vaultCredentials && vaultCredentials.apiKey && vaultCredentials.apiSecret) {
        this.apiKey = vaultCredentials.apiKey;
        this.apiSecret = vaultCredentials.apiSecret;
        console.log('Successfully loaded Bybit credentials from vault');
      } else {
        console.warn('Vault credentials incomplete or not found for Bybit');
      }
    } catch (error) {
      console.error('Error loading Bybit credentials from vault:', error);
    }
  }

  private getSignature(timestamp: string, method: string, path: string, data?: any): string {
    const dataQueryString = data ? new URLSearchParams(data).toString() : '';
    const stringToSign = `${timestamp}${this.apiKey}${method}${path}${dataQueryString}`;
    return crypto.createHmac('sha256', this.apiSecret).update(stringToSign).digest('hex');
  }

  // Generic method to make API requests
  private async request(method: string, endpoint: string, data?: any): Promise<any> {
    const timestamp = Date.now().toString();
    const signature = this.getSignature(timestamp, method, endpoint, data);
    
    const url = `${this.baseUrl}${endpoint}${method === 'GET' && data ? `?${new URLSearchParams(data).toString()}` : ''}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'X-BAPI-API-KEY': this.apiKey,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000',
        'Content-Type': 'application/json'
      }
    };
    
    if (method !== 'GET' && data) {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bybit API Error: ${response.status} ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Bybit API request error:', error);
      throw error;
    }
  }

  // ======== REST API Methods ========
  
  // Get wallet balance
  async getWalletBalance(accountType: 'UNIFIED' | 'CONTRACT' = 'UNIFIED'): Promise<BybitBalance[]> {
    const endpoint = '/v5/account/wallet-balance';
    const params = { accountType };
    
    const response = await this.request('GET', endpoint, params);
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API Error: ${response.retMsg}`);
    }
    
    // Extract balance information from the response
    const balanceData = response.result?.list?.[0]?.coin || [];
    
    return balanceData.map((coin: any) => ({
      coin: coin.coin,
      walletBalance: coin.walletBalance,
      availableBalance: coin.availableToWithdraw,
      usdValue: coin.usdValue
    }));
  }
  
  // Get open positions
  async getPositions(category: 'linear' | 'inverse' = 'linear', symbol?: string): Promise<BybitPosition[]> {
    const endpoint = '/v5/position/list';
    const params: any = { category };
    
    if (symbol) {
      params.symbol = symbol;
    }
    
    const response = await this.request('GET', endpoint, params);
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API Error: ${response.retMsg}`);
    }
    
    // Extract position information from the response
    const positionList = response.result?.list || [];
    
    return positionList.map((position: any) => {
      // Calculate unrealised PnL percentage
      const size = parseFloat(position.size);
      const entryPrice = parseFloat(position.entryPrice);
      const markPrice = parseFloat(position.markPrice);
      const unrealisedPnl = parseFloat(position.unrealisedPnl);
      
      let unrealisedPnlPct = 0;
      if (size && entryPrice && markPrice) {
        const positionValue = size * entryPrice;
        unrealisedPnlPct = (unrealisedPnl / positionValue) * 100;
      }
      
      return {
        symbol: position.symbol,
        side: position.side,
        size: position.size,
        entryPrice: position.entryPrice,
        leverage: position.leverage,
        markPrice: position.markPrice,
        unrealisedPnl: position.unrealisedPnl,
        unrealisedPnlPct,
        liquidationPrice: position.liqPrice,
        positionValue: position.positionValue,
        createdTime: position.createdTime
      };
    });
  }
  
  // Get active orders
  async getActiveOrders(category: 'linear' | 'inverse' = 'linear', symbol?: string): Promise<BybitOrder[]> {
    const endpoint = '/v5/order/realtime';
    const params: any = { category };
    
    if (symbol) {
      params.symbol = symbol;
    }
    
    const response = await this.request('GET', endpoint, params);
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API Error: ${response.retMsg}`);
    }
    
    // Extract order information from the response
    const orderList = response.result?.list || [];
    
    return orderList.map((order: any) => ({
      orderId: order.orderId,
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      price: order.price,
      qty: order.qty,
      timeInForce: order.timeInForce,
      orderStatus: order.orderStatus,
      cumExecQty: order.cumExecQty,
      cumExecValue: order.cumExecValue,
      cumExecFee: order.cumExecFee,
      createdTime: order.createdTime,
      updatedTime: order.updatedTime
    }));
  }
  
  // Get order history
  async getOrderHistory(category: 'linear' | 'inverse' = 'linear', symbol?: string, limit: number = 50): Promise<BybitOrder[]> {
    const endpoint = '/v5/order/history';
    const params: any = { category, limit };
    
    if (symbol) {
      params.symbol = symbol;
    }
    
    const response = await this.request('GET', endpoint, params);
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API Error: ${response.retMsg}`);
    }
    
    // Extract order information from the response
    const orderList = response.result?.list || [];
    
    return orderList.map((order: any) => ({
      orderId: order.orderId,
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      price: order.price,
      qty: order.qty,
      timeInForce: order.timeInForce,
      orderStatus: order.orderStatus,
      cumExecQty: order.cumExecQty,
      cumExecValue: order.cumExecValue,
      cumExecFee: order.cumExecFee,
      createdTime: order.createdTime,
      updatedTime: order.updatedTime
    }));
  }
  
  // Get ticker data
  async getTickers(category: 'linear' | 'inverse' = 'linear', symbol?: string): Promise<MarketData[]> {
    const endpoint = '/v5/market/tickers';
    const params: any = { category };
    
    if (symbol) {
      params.symbol = symbol;
    }
    
    const response = await this.request('GET', endpoint, params);
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API Error: ${response.retMsg}`);
    }
    
    // Extract ticker information from the response
    const tickerList = response.result?.list || [];
    
    return tickerList.map((ticker: any) => ({
      symbol: ticker.symbol,
      lastPrice: ticker.lastPrice,
      bidPrice: ticker.bid1Price,
      askPrice: ticker.ask1Price,
      volume24h: ticker.volume24h,
      priceChange24h: ticker.price24hPcnt,
      priceChangePercent24h: ticker.price24hPcnt,
      high24h: ticker.highPrice24h,
      low24h: ticker.lowPrice24h
    }));
  }
  
  // Create order
  async createOrder(params: OrderParams): Promise<BybitOrder> {
    const endpoint = '/v5/order/create';
    
    const orderParams = {
      category: 'linear',
      symbol: params.symbol,
      side: params.side,
      orderType: params.orderType,
      qty: params.qty,
      timeInForce: params.timeInForce || 'GTC'
    } as any;
    
    // Add price for limit orders
    if (params.orderType === 'Limit' && params.price) {
      orderParams.price = params.price;
    }
    
    // Add optional parameters if they exist
    if (params.reduceOnly !== undefined) {
      orderParams.reduceOnly = params.reduceOnly;
    }
    
    if (params.closeOnTrigger !== undefined) {
      orderParams.closeOnTrigger = params.closeOnTrigger;
    }
    
    const response = await this.request('POST', endpoint, orderParams);
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit Order Creation Error: ${response.retMsg}`);
    }
    
    // Return order details
    return {
      orderId: response.result?.orderId,
      symbol: params.symbol,
      side: params.side,
      orderType: params.orderType,
      price: params.price || '0',
      qty: params.qty,
      timeInForce: params.timeInForce || 'GTC',
      orderStatus: 'Created',
      cumExecQty: '0',
      cumExecValue: '0',
      cumExecFee: '0',
      createdTime: new Date().toISOString(),
      updatedTime: new Date().toISOString()
    };
  }
  
  // Cancel order
  async cancelOrder(category: 'linear' | 'inverse' = 'linear', symbol: string, orderId: string): Promise<boolean> {
    const endpoint = '/v5/order/cancel';
    
    const params = {
      category,
      symbol,
      orderId
    };
    
    const response = await this.request('POST', endpoint, params);
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit Order Cancellation Error: ${response.retMsg}`);
    }
    
    return true;
  }
  
  // ======== WebSocket Methods ========
  
  // Connect to WebSocket
  connectWebSocket(): void {
    if (this.socket) {
      this.disconnectWebSocket();
    }
    
    // For private endpoints that require authentication
    const expires = Math.floor(Date.now() / 1000) + 10;
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update('GET/realtime' + expires)
      .digest('hex');
    
    const wsUrl = `${this.wsBaseUrl}/v5/private?api_key=${this.apiKey}&expires=${expires}&signature=${signature}`;
    
    try {
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('Bybit WebSocket connected');
        
        // Set up ping interval to keep connection alive
        this.pingInterval = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ op: 'ping' }));
          }
        }, 20000); // Send ping every 20 seconds
      };
      
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle pong response
          if (message.op === 'pong') {
            return;
          }
          
          // Handle subscription success
          if (message.op === 'subscribe' && message.success) {
            console.log(`Successfully subscribed to ${message.req_id}`);
            return;
          }
          
          // Handle data updates
          if (message.data && message.topic) {
            const topic = message.topic.split('.')[0];
            const handler = this.messageHandlers.get(topic);
            
            if (handler) {
              const wsMessage: WebSocketMessage = {
                type: topic,
                data: message.data,
                timestamp: Date.now()
              };
              
              handler(wsMessage);
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('Bybit WebSocket error:', error);
      };
      
      this.socket.onclose = () => {
        console.log('Bybit WebSocket disconnected');
        
        // Clear ping interval
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
            this.connectWebSocket();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }
  
  // Disconnect WebSocket
  disconnectWebSocket(): void {
    if (this.socket) {
      // Clear ping interval
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      
      // Close socket
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      
      this.socket = null;
    }
  }
  
  // Subscribe to specific topics
  subscribe(topics: string[]): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }
    
    const message = {
      op: 'subscribe',
      args: topics
    };
    
    this.socket.send(JSON.stringify(message));
  }
  
  // Register handler for specific topic
  onMessage(topic: string, handler: (data: WebSocketMessage) => void): void {
    this.messageHandlers.set(topic, handler);
  }
  
  // Remove handler for specific topic
  offMessage(topic: string): void {
    this.messageHandlers.delete(topic);
  }
}
