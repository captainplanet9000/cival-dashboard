/**
 * Bybit API Service
 * Provides functionality for interacting with the Bybit exchange API
 */
import crypto from 'crypto';
import { ExchangeService, MarketDataParams, OrderParams } from '../exchange-service';

interface BybitCredentials {
  api_key: string;
  api_secret: string;
  is_testnet?: boolean;
}

export class BybitApiService implements ExchangeService {
  private readonly baseUrl: string;
  private readonly wsUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly isTestnet: boolean;

  constructor(credentials: BybitCredentials | null) {
    this.isTestnet = credentials?.is_testnet ?? false;
    
    // Set the appropriate API endpoints based on whether it's testnet or mainnet
    if (this.isTestnet) {
      this.baseUrl = 'https://api-testnet.bybit.com';
      this.wsUrl = 'wss://stream-testnet.bybit.com';
    } else {
      this.baseUrl = 'https://api.bybit.com';
      this.wsUrl = 'wss://stream.bybit.com';
    }
    
    // If credentials are provided, use them; otherwise, use environment variables
    this.apiKey = credentials?.api_key || process.env.BYBIT_API_KEY || '';
    this.apiSecret = credentials?.api_secret || process.env.BYBIT_API_SECRET || '';
  }

  /**
   * Generate the required signature for Bybit API requests
   */
  private generateSignature(timestamp: number, queryString: string = ''): string {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(timestamp + this.apiKey + queryString)
      .digest('hex');
  }

  /**
   * Make a request to the Bybit API
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    params: Record<string, any> = {}
  ): Promise<any> {
    try {
      const timestamp = Date.now();
      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      
      const signature = this.generateSignature(timestamp, queryString);
      
      const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;
      
      const headers: HeadersInit = {
        'X-BAPI-API-KEY': this.apiKey,
        'X-BAPI-TIMESTAMP': timestamp.toString(),
        'X-BAPI-SIGN': signature,
        'Content-Type': 'application/json'
      };
      
      const requestOptions: RequestInit = {
        method,
        headers,
      };
      
      if (method !== 'GET' && Object.keys(params).length > 0) {
        requestOptions.body = JSON.stringify(params);
      }
      
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`Bybit API request failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error making Bybit API request:', error);
      throw error;
    }
  }

  /**
   * Get market data (klines/candlesticks) for a given symbol
   */
  async getMarketData(params: MarketDataParams): Promise<any> {
    const queryParams = {
      symbol: params.symbol,
      interval: params.interval || '15', // 1, 3, 5, 15, 30, 60, 120, 240, 360, 720, D, W, M
      limit: params.limit || 200
    };
    
    return this.makeRequest('/v5/market/kline', 'GET', queryParams);
  }

  /**
   * Get the order book for a given symbol
   */
  async getOrderBook(symbol: string): Promise<any> {
    return this.makeRequest('/v5/market/orderbook', 'GET', { symbol, limit: 50 });
  }

  /**
   * Get the account balance
   */
  async getAccountBalance(): Promise<any> {
    return this.makeRequest('/v5/account/wallet-balance', 'GET', { accountType: 'UNIFIED' });
  }

  /**
   * Place an order on the exchange
   */
  async placeOrder(params: OrderParams): Promise<any> {
    const orderParams = {
      symbol: params.symbol,
      side: params.side,
      orderType: params.orderType,
      qty: params.quantity.toString(),
      timeInForce: params.timeInForce || 'GTC',
      reduceOnly: params.reduceOnly || false
    };
    
    // Add price for limit orders
    if (params.orderType === 'Limit' && params.price) {
      orderParams['price'] = params.price.toString();
    }
    
    return this.makeRequest('/v5/order/create', 'POST', orderParams);
  }

  /**
   * Cancel an order on the exchange
   */
  async cancelOrder(orderId: string, symbol: string): Promise<any> {
    return this.makeRequest('/v5/order/cancel', 'POST', { orderId, symbol });
  }

  /**
   * Get active orders on the exchange
   */
  async getActiveOrders(symbol?: string): Promise<any> {
    const params: Record<string, any> = { limit: 50 };
    if (symbol) params.symbol = symbol;
    
    return this.makeRequest('/v5/order/realtime', 'GET', params);
  }

  /**
   * Get order history from the exchange
   */
  async getOrderHistory(symbol?: string): Promise<any> {
    const params: Record<string, any> = { limit: 50 };
    if (symbol) params.symbol = symbol;
    
    return this.makeRequest('/v5/order/history', 'GET', params);
  }

  /**
   * Get exchange info including symbol information
   */
  async getExchangeInfo(): Promise<any> {
    return this.makeRequest('/v5/market/instruments-info', 'GET', { category: 'spot' });
  }

  /**
   * Get the server time from the exchange
   */
  async getServerTime(): Promise<any> {
    return this.makeRequest('/v5/market/time');
  }
}
