/**
 * Coinbase Exchange Connector
 * 
 * Implementation of the IExchangeConnector interface for Coinbase cryptocurrency exchange.
 * Handles API authentication, rate limiting, and exchange-specific error handling.
 * 
 * API Documentation: https://docs.cloud.coinbase.com/exchange/reference/
 */

import crypto from 'crypto';
import { 
  IExchangeConnector, 
  MarketData, 
  OrderParams,
  OrderResult,
  AccountInfo,
  ExchangeCredentials
} from '../types';
import { BaseExchangeConnector } from '../base-connector';

/**
 * Coinbase API endpoints
 */
const COINBASE_API_URLS = {
  production: 'https://api.exchange.coinbase.com',
  sandbox: 'https://api-public.sandbox.exchange.coinbase.com'
};

/**
 * Implements the IExchangeConnector interface for Coinbase exchange
 */
export class CoinbaseConnector extends BaseExchangeConnector implements IExchangeConnector {
  /**
   * Exchange name
   */
  public readonly name: string = 'coinbase';
  
  private baseUrl: string;
  private apiKey: string = '';
  private apiSecret: string = '';
  private passphrase: string = '';

  /**
   * Create a new Coinbase connector
   * 
   * @param useTestnet - Whether to use the sandbox environment
   */
  constructor(private useTestnet: boolean = false) {
    super();
    this.baseUrl = useTestnet ? COINBASE_API_URLS.sandbox : COINBASE_API_URLS.production;
  }

  /**
   * Implementation of connect for Coinbase
   * 
   * @param credentials - API credentials for authentication
   * @returns True if connection was successful
   */
  protected async performConnect(credentials: ExchangeCredentials): Promise<boolean> {
    if (!credentials.apiKey || !credentials.secretKey || !credentials.passphrase) {
      throw new Error('Coinbase requires API key, secret key, and passphrase');
    }

    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.secretKey;
    this.passphrase = credentials.passphrase || '';

    // Test the connection by getting account information
    await this.getAccountInfo();
    return true;
  }

  /**
   * Implementation of disconnect for Coinbase
   * 
   * @returns True if disconnection was successful
   */
  protected async performDisconnect(): Promise<boolean> {
    this.apiKey = '';
    this.apiSecret = '';
    this.passphrase = '';
    return true;
  }

  /**
   * Implementation of getMarketData for Coinbase
   * 
   * @param symbol - The symbol to get market data for (e.g., 'BTC-USD')
   * @returns Market data including price, volume, etc.
   */
  protected async performGetMarketData(symbol: string): Promise<MarketData> {
    this.checkConnection();

    // Format symbol for Coinbase (e.g., 'BTCUSD' -> 'BTC-USD')
    const formattedSymbol = this.formatSymbol(symbol);
    
    // Get ticker data
    const tickerData = await this.get(`/products/${formattedSymbol}/ticker`);
    
    // Get 24h stats
    const stats = await this.get(`/products/${formattedSymbol}/stats`);
    
    return {
      symbol,
      exchange: this.name,
      price: parseFloat(tickerData.price),
      lastPrice: parseFloat(tickerData.price),
      bid: parseFloat(tickerData.bid),
      bidPrice: parseFloat(tickerData.bid),
      ask: parseFloat(tickerData.ask),
      askPrice: parseFloat(tickerData.ask),
      volume24h: parseFloat(stats.volume),
      volume: parseFloat(stats.volume),
      change24h: parseFloat(stats.last) - parseFloat(stats.open),
      high24h: parseFloat(stats.high),
      low24h: parseFloat(stats.low),
      timestamp: new Date(tickerData.time).getTime()
    };
  }

  /**
   * Implementation of getOrderBook for Coinbase
   * 
   * @param symbol - The symbol to get the order book for
   * @param limit - Maximum number of bids and asks to retrieve
   * @returns Order book with bids, asks, and timestamp
   */
  protected async performGetOrderBook(symbol: string, limit: number = 50): Promise<{
    bids: [number, number][];
    asks: [number, number][];
    timestamp: number;
  }> {
    this.checkConnection();

    // Format symbol for Coinbase (e.g., 'BTCUSD' -> 'BTC-USD')
    const formattedSymbol = this.formatSymbol(symbol);
    
    // Get order book
    const orderBookData = await this.get(`/products/${formattedSymbol}/book`, { level: 2 });
    
    // Process bids and asks
    const bids = orderBookData.bids
      .slice(0, limit)
      .map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]);
    
    const asks = orderBookData.asks
      .slice(0, limit)
      .map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]);
    
    return {
      bids,
      asks,
      timestamp: Date.now()
    };
  }

  /**
   * Implementation of placeOrder for Coinbase
   * 
   * @param params - Order parameters
   * @returns Order result
   */
  protected async performPlaceOrder(params: OrderParams): Promise<OrderResult> {
    this.checkConnection();

    // Format symbol for Coinbase (e.g., 'BTCUSD' -> 'BTC-USD')
    const formattedSymbol = this.formatSymbol(params.symbol);
    
    // Prepare order data based on order type
    const orderData: any = {
      side: params.side,
      product_id: formattedSymbol,
      size: params.quantity.toString()
    };
    
    // Set order type and price based on order type
    if (params.type === 'market') {
      orderData.type = 'market';
    } else if (params.type === 'limit') {
      orderData.type = 'limit';
      orderData.price = params.price?.toString();
      
      // Add time in force if provided
      if (params.timeInForce) {
        orderData.time_in_force = this.mapTimeInForce(params.timeInForce);
      }
    } else if (params.type === 'stop' || params.type === 'stop_limit') {
      orderData.type = params.type === 'stop' ? 'market' : 'limit';
      orderData.stop = params.side === 'buy' ? 'entry' : 'loss';
      orderData.stop_price = params.stopPrice?.toString();
      
      if (params.type === 'stop_limit') {
        orderData.price = params.price?.toString();
      }
    }
    
    // Add client order ID if provided
    if (params.clientOrderId) {
      orderData.client_oid = params.clientOrderId;
    }
    
    // Place the order
    const orderResponse = await this.post('/orders', orderData);
    
    // Format the response to match OrderResult interface
    return {
      id: orderResponse.id,
      clientOrderId: orderResponse.client_oid,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      status: this.mapOrderStatus(orderResponse.status),
      quantity: parseFloat(orderResponse.size),
      price: orderResponse.price ? parseFloat(orderResponse.price) : undefined,
      stopPrice: orderResponse.stop_price ? parseFloat(orderResponse.stop_price) : undefined,
      executedQuantity: parseFloat(orderResponse.filled_size || '0'),
      executedPrice: orderResponse.executed_value && orderResponse.filled_size ? 
        parseFloat(orderResponse.executed_value) / parseFloat(orderResponse.filled_size) : 
        undefined,
      timeInForce: this.mapCoinbaseTimeInForce(orderResponse.time_in_force),
      createdAt: new Date(orderResponse.created_at).getTime(),
      updatedAt: new Date(orderResponse.done_at || orderResponse.created_at).getTime()
    };
  }

  /**
   * Implementation of cancelOrder for Coinbase
   * 
   * @param orderId - The ID of the order to cancel
   * @param symbol - The symbol of the order (not required for Coinbase but kept for interface consistency)
   * @returns True if the cancellation was successful
   */
  protected async performCancelOrder(orderId: string, symbol: string): Promise<boolean> {
    this.checkConnection();
    
    // Cancel the order
    await this.delete(`/orders/${orderId}`);
    
    return true;
  }

  /**
   * Implementation of getOrderStatus for Coinbase
   * 
   * @param orderId - The ID of the order to check
   * @param symbol - The symbol of the order (not required for Coinbase but kept for interface consistency)
   * @returns The current status of the order
   */
  protected async performGetOrderStatus(orderId: string, symbol: string): Promise<OrderResult> {
    this.checkConnection();
    
    // Get order details
    const orderResponse = await this.get(`/orders/${orderId}`);
    
    // Format the response to match OrderResult interface
    return {
      id: orderResponse.id,
      clientOrderId: orderResponse.client_oid,
      symbol: this.normalizeSymbol(orderResponse.product_id),
      side: orderResponse.side,
      type: this.mapCoinbaseOrderType(orderResponse.type, orderResponse.stop),
      status: this.mapOrderStatus(orderResponse.status),
      quantity: parseFloat(orderResponse.size),
      price: orderResponse.price ? parseFloat(orderResponse.price) : undefined,
      stopPrice: orderResponse.stop_price ? parseFloat(orderResponse.stop_price) : undefined,
      executedQuantity: parseFloat(orderResponse.filled_size || '0'),
      executedPrice: orderResponse.executed_value && orderResponse.filled_size ? 
        parseFloat(orderResponse.executed_value) / parseFloat(orderResponse.filled_size) : 
        undefined,
      timeInForce: this.mapCoinbaseTimeInForce(orderResponse.time_in_force),
      createdAt: new Date(orderResponse.created_at).getTime(),
      updatedAt: new Date(orderResponse.done_at || orderResponse.created_at).getTime()
    };
  }

  /**
   * Implementation of getOpenOrders for Coinbase
   * 
   * @param symbol - Optional symbol to filter by
   * @returns Array of open orders
   */
  protected async performGetOpenOrders(symbol?: string): Promise<OrderResult[]> {
    this.checkConnection();
    
    // Prepare query parameters
    const params: any = { status: 'open' };
    
    if (symbol) {
      params.product_id = this.formatSymbol(symbol);
        params.product_id = this.formatSymbol(symbol);
      }
      
      // Get open orders
      const ordersResponse = await this.get('/orders', params);
      
      // Format the response to match OrderResult interface
      return ordersResponse.map((order: any) => ({
        id: order.id,
        clientOrderId: order.client_oid,
        symbol: this.normalizeSymbol(order.product_id),
        side: order.side,
        type: this.mapCoinbaseOrderType(order.type, order.stop),
        status: this.mapOrderStatus(order.status),
        quantity: parseFloat(order.size),
        price: order.price ? parseFloat(order.price) : undefined,
        stopPrice: order.stop_price ? parseFloat(order.stop_price) : undefined,
        executedQuantity: parseFloat(order.filled_size || '0'),
        executedPrice: order.executed_value && order.filled_size ? 
          parseFloat(order.executed_value) / parseFloat(order.filled_size) : 
          undefined,
        timeInForce: this.mapCoinbaseTimeInForce(order.time_in_force),
        createdAt: new Date(order.created_at).getTime(),
        updatedAt: new Date(order.done_at || order.created_at).getTime()
      }));
    } catch (error) {
      handleExchangeError(error, `Failed to get open orders`);
      throw error;
    }
  }

  /**
   * Implementation of getAccountInfo for Coinbase
   * 
   * @returns Account information
   */
  protected async performGetAccountInfo(): Promise<AccountInfo> {
    // Get accounts
    const accounts = await this.get('/accounts');
    
    // Format balances
    const balances = accounts
      .filter((account: any) => parseFloat(account.balance) > 0)
      .map((account: any) => ({
        asset: account.currency,
        free: parseFloat(account.available),
        locked: parseFloat(account.hold)
      }));
    
    return {
      balances,
      permissions: ['spot']
    }
  }

  /**
   * Implementation of subscribePriceUpdates for Coinbase
   * 
   * @param symbols - Array of symbols to subscribe to
   * @param callback - Callback function for price updates
   * @returns True if subscription was successful
   */
  protected async performSubscribePriceUpdates(
    symbols: string[],
    callback: (data: MarketData) => void
  ): Promise<boolean> {
    // REST API connectors don't support real-time updates
    // This would be implemented using Coinbase's WebSocket API in a WebSocket adapter
    console.warn('subscribePriceUpdates is not implemented in the REST API connector');
    return false;
  }

  /**
   * Implementation of unsubscribePriceUpdates for Coinbase
   * 
   * @param symbols - Array of symbols to unsubscribe from
   * @returns True if unsubscription was successful
   */
  protected async performUnsubscribePriceUpdates(symbols: string[]): Promise<boolean> {
    // REST API connectors don't support real-time updates
    console.warn('unsubscribePriceUpdates is not implemented in the REST API connector');
    return false;
  }

  /**
   * Make a GET request to the Coinbase API
   * 
   * @param endpoint - API endpoint
   * @param params - Query parameters
   * @returns Response data
   */
  private async get(endpoint: string, params: any = {}): Promise<any> {
    const url = new URL(this.baseUrl + endpoint);
    
    // Add query parameters
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
    
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'GET';
    const path = url.pathname + url.search;
    const body = '';
    
    const signature = this.sign(timestamp, method, path, body);
    
    const response = await fetch(url.toString(), {
      method,
      headers: this.getHeaders(timestamp, signature)
    });
    
    return this.handleResponse(response);
  }

  /**
   * Make a POST request to the Coinbase API
   * 
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @returns Response data
   */
  private async post(endpoint: string, data: any): Promise<any> {
    const url = this.baseUrl + endpoint;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'POST';
    const path = endpoint;
    const body = JSON.stringify(data);
    
    const signature = this.sign(timestamp, method, path, body);
    
    const response = await fetch(url, {
      method,
      headers: this.getHeaders(timestamp, signature),
      body
    });
    
    return this.handleResponse(response);
  }

  /**
   * Make a DELETE request to the Coinbase API
   * 
   * @param endpoint - API endpoint
   * @returns Response data
   */
  private async delete(endpoint: string): Promise<any> {
    const url = this.baseUrl + endpoint;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'DELETE';
    const path = endpoint;
    const body = '';
    
    const signature = this.sign(timestamp, method, path, body);
    
    const response = await fetch(url, {
      method,
      headers: this.getHeaders(timestamp, signature)
    });
    
    return this.handleResponse(response);
  }

  /**
   * Get headers for authentication
   * 
   * @param timestamp - Request timestamp
   * @param signature - Request signature
   * @returns Headers object
   */
  private getHeaders(timestamp: string, signature: string): HeadersInit {
    return {
      'CB-ACCESS-KEY': this.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'CB-ACCESS-PASSPHRASE': this.passphrase,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Sign a request with the API secret
   * 
   * @param timestamp - Request timestamp
   * @param method - HTTP method
   * @param path - Request path
   * @param body - Request body
   * @returns Signature
   */
  private sign(timestamp: string, method: string, path: string, body: string): string {
    const message = timestamp + method + path + body;
    const key = Buffer.from(this.apiSecret, 'base64');
    const hmac = crypto.createHmac('sha256', key);
    return hmac.update(message).digest('base64');
  }

  /**
   * Handle API response
   * 
   * @param response - Fetch response
   * @returns Response data
   */
  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        code: response.status,
        message: errorData.message || response.statusText,
        data: errorData
      };
    }
    
    return response.json();
  }

  /**
   * Format a symbol for Coinbase's API
   * E.g., 'BTCUSD' -> 'BTC-USD'
   * 
   * @param symbol - Symbol to format
   * @returns Formatted symbol
   */
  private formatSymbol(symbol: string): string {
    // Handle existing well-formatted symbols
    if (symbol.includes('-')) {
      return symbol;
    }
    
    // Try to find the split point between base and quote
    const commonQuotes = ['USD', 'USDT', 'USDC', 'DAI', 'BTC', 'ETH'];
    
    for (const quote of commonQuotes) {
      if (symbol.endsWith(quote)) {
        const base = symbol.slice(0, -quote.length);
        return `${base}-${quote}`;
      }
    }
    
    // Default split at position 3 or 4 if no common quote found
    const splitPoint = symbol.length >= 7 ? 4 : 3;
    return `${symbol.slice(0, splitPoint)}-${symbol.slice(splitPoint)}`;
  }

  /**
   * Normalize a symbol from Coinbase's format
   * E.g., 'BTC-USD' -> 'BTCUSD'
   * 
   * @param symbol - Symbol to normalize
   * @returns Normalized symbol
   */
  private normalizeSymbol(symbol: string): string {
    return symbol.replace('-', '');
  }

  /**
   * Map Coinbase order status to our standard order status
   * 
   * @param status - Coinbase order status
   * @returns Normalized order status
   */
  private mapOrderStatus(status: string): OrderResult['status'] {
    switch (status) {
      case 'open':
      case 'pending':
        return 'new';
      case 'active':
        return 'partially_filled';
      case 'done':
        return 'filled';
      case 'rejected':
        return 'rejected';
      case 'cancelled':
        return 'canceled';
      default:
        return 'new';
    }
  }

  /**
   * Map our time in force values to Coinbase's format
   * 
   * @param timeInForce - Our time in force value
   * @returns Coinbase time in force value
   */
  private mapTimeInForce(timeInForce: 'GTC' | 'IOC' | 'FOK'): string {
    switch (timeInForce) {
      case 'GTC':
        return 'GTC';
      case 'IOC':
        return 'IOC';
      case 'FOK':
        return 'FOK';
      default:
        return 'GTC';
    }
  }

  /**
   * Map Coinbase time in force to our format
   * 
   * @param timeInForce - Coinbase time in force
   * @returns Our time in force value
   */
  private mapCoinbaseTimeInForce(timeInForce: string): OrderResult['timeInForce'] {
    switch (timeInForce) {
      case 'GTC':
        return 'GTC';
      case 'IOC':
        return 'IOC';
      case 'FOK':
        return 'FOK';
      default:
        return undefined;
    }
  }

  /**
   * Map Coinbase order type to our format
   * 
   * @param type - Coinbase order type
   * @param stop - Coinbase stop type
   * @returns Our order type
   */
  private mapCoinbaseOrderType(type: string, stop?: string): OrderResult['type'] {
    if (stop) {
      return type === 'limit' ? 'stop_limit' : 'stop';
    }
    
    return type === 'limit' ? 'limit' : 'market';
  }

  /**
   * Ensure that the connector is connected
   */
  private checkConnection(): void {
    if (!this._connected) {
      throw new Error('Not connected to Coinbase. Call connect() first.');
    }
  }
}
