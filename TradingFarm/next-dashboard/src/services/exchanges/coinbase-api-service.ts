/**
 * Coinbase API Service
 * Provides functionality for interacting with the Coinbase Exchange API
 * Note: This implements the new Coinbase Advanced API which replaced the Coinbase Pro API
 */
import crypto from 'crypto';
import { ExchangeService, MarketDataParams, OrderParams } from '../exchange-service';

interface CoinbaseCredentials {
  api_key: string;
  api_secret: string;
  passphrase?: string;
}

export class CoinbaseApiService implements ExchangeService {
  private readonly baseUrl: string = 'https://api.exchange.coinbase.com';
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly passphrase: string;

  constructor(credentials: CoinbaseCredentials | null) {
    // If credentials are provided, use them; otherwise, use environment variables
    this.apiKey = credentials?.api_key || process.env.COINBASE_API_KEY || '';
    this.apiSecret = credentials?.api_secret || process.env.COINBASE_API_SECRET || '';
    this.passphrase = credentials?.passphrase || process.env.COINBASE_API_PASSPHRASE || '';
  }

  /**
   * Generate the required headers for Coinbase API requests
   */
  private generateHeaders(
    method: string,
    requestPath: string,
    body: string = ''
  ): HeadersInit {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // Create the message to sign
    const message = timestamp + method + requestPath + body;
    
    // Create the signature using HMAC
    const hmac = crypto.createHmac('sha256', Buffer.from(this.apiSecret, 'base64'));
    const signature = hmac.update(message).digest('base64');
    
    return {
      'CB-ACCESS-KEY': this.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'CB-ACCESS-PASSPHRASE': this.passphrase,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make a request to the Coinbase API
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    params: Record<string, any> = {}
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      // For GET requests, add params to the URL
      const urlWithParams = method === 'GET' && Object.keys(params).length > 0
        ? `${url}?${new URLSearchParams(params).toString()}`
        : url;
      
      const body = method !== 'GET' && Object.keys(params).length > 0
        ? JSON.stringify(params)
        : '';
      
      const headers = this.generateHeaders(method, endpoint, body);
      
      const requestOptions: RequestInit = {
        method,
        headers,
        body: body || undefined,
      };
      
      const response = await fetch(urlWithParams, requestOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Coinbase API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error making Coinbase API request:', error);
      throw error;
    }
  }

  /**
   * Get market data (candles) for a given product
   */
  async getMarketData(params: MarketDataParams): Promise<any> {
    const coinbaseParams: Record<string, any> = {
      product_id: params.symbol,
      granularity: this.convertIntervalToSeconds(params.interval || '1h')
    };
    
    if (params.limit) {
      // Coinbase doesn't have a limit parameter directly
      // We'll retrieve the data and then limit the results
      const data = await this.makeRequest('/products/' + params.symbol + '/candles', 'GET', coinbaseParams);
      return {
        symbol: params.symbol,
        data: data.slice(0, params.limit).map((candle: any) => ({
          time: new Date(candle[0] * 1000).toISOString(),
          low: candle[1],
          high: candle[2],
          open: candle[3],
          close: candle[4],
          volume: candle[5]
        }))
      };
    }
    
    return this.makeRequest('/products/' + params.symbol + '/candles', 'GET', coinbaseParams);
  }

  /**
   * Convert time interval to seconds for Coinbase granularity
   */
  private convertIntervalToSeconds(interval: string): number {
    const value = parseInt(interval);
    const unit = interval.slice(-1);
    
    switch (unit) {
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600; // Default to 1 hour
    }
  }

  /**
   * Get the order book for a given product
   */
  async getOrderBook(symbol: string): Promise<any> {
    return this.makeRequest(`/products/${symbol}/book`, 'GET', { level: 2 });
  }

  /**
   * Get the account balance
   */
  async getAccountBalance(): Promise<any> {
    const accounts = await this.makeRequest('/accounts', 'GET');
    
    return {
      balances: accounts.map((account: any) => ({
        asset: account.currency,
        free: parseFloat(account.available),
        locked: parseFloat(account.hold),
        total: parseFloat(account.balance)
      }))
    };
  }

  /**
   * Place an order on the exchange
   */
  async placeOrder(params: OrderParams): Promise<any> {
    const orderParams: Record<string, any> = {
      product_id: params.symbol,
      side: params.side.toLowerCase(),
      size: params.quantity.toString()
    };
    
    if (params.orderType === 'Limit') {
      orderParams.type = 'limit';
      orderParams.price = params.price?.toString() || '0';
      orderParams.time_in_force = params.timeInForce?.toLowerCase() || 'gtc';
    } else {
      orderParams.type = 'market';
    }
    
    return this.makeRequest('/orders', 'POST', orderParams);
  }

  /**
   * Cancel an order on the exchange
   */
  async cancelOrder(orderId: string, symbol: string): Promise<any> {
    return this.makeRequest(`/orders/${orderId}`, 'DELETE');
  }

  /**
   * Get active orders on the exchange
   */
  async getActiveOrders(symbol?: string): Promise<any> {
    const params: Record<string, any> = { status: 'open' };
    if (symbol) params.product_id = symbol;
    
    const orders = await this.makeRequest('/orders', 'GET', params);
    
    return {
      orders: orders.map((order: any) => ({
        orderId: order.id,
        symbol: order.product_id,
        side: order.side.charAt(0).toUpperCase() + order.side.slice(1),
        orderType: order.type,
        quantity: parseFloat(order.size),
        price: parseFloat(order.price),
        status: order.status,
        time: new Date(order.created_at).getTime()
      }))
    };
  }

  /**
   * Get order history from the exchange
   */
  async getOrderHistory(symbol?: string): Promise<any> {
    const params: Record<string, any> = { status: 'done' };
    if (symbol) params.product_id = symbol;
    
    const orders = await this.makeRequest('/orders', 'GET', params);
    
    return {
      orders: orders.map((order: any) => ({
        orderId: order.id,
        symbol: order.product_id,
        side: order.side.charAt(0).toUpperCase() + order.side.slice(1),
        orderType: order.type,
        quantity: parseFloat(order.size),
        price: parseFloat(order.price),
        status: order.status,
        time: new Date(order.created_at).getTime()
      }))
    };
  }

  /**
   * Get exchange info including symbol information
   */
  async getExchangeInfo(): Promise<any> {
    const products = await this.makeRequest('/products', 'GET');
    
    return {
      symbols: products.map((product: any) => ({
        symbol: product.id,
        baseAsset: product.base_currency,
        quoteAsset: product.quote_currency,
        status: product.status
      }))
    };
  }

  /**
   * Get the server time from the exchange
   */
  async getServerTime(): Promise<any> {
    const time = await this.makeRequest('/time', 'GET');
    return { serverTime: new Date(time.iso).getTime() };
  }
}
