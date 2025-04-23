/**
 * Coinbase Exchange Connector for Trading Farm
 * 
 * Implementation of the exchange connector interface for Coinbase
 * Using API documentation from: https://docs.cdp.coinbase.com/
 */

import { BaseExchangeConnector } from './exchange-connector';
import {
  MarketData,
  Order,
  OrderParams,
  OrderResult,
  AccountInfo,
  ExchangeCredentials,
  OrderStatus,
  Balance
} from '@/types/exchange';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Coinbase Exchange specific configuration
 */
interface CoinbaseConfig {
  /**
   * Base API URL
   */
  apiUrl: string;
  
  /**
   * WebSocket URL for real-time data
   */
  wsUrl: string;
  
  /**
   * Whether to use the sandbox/testnet environment
   */
  sandbox: boolean;
}

/**
 * Implementation of the Exchange Connector interface for Coinbase
 */
export class CoinbaseConnector extends BaseExchangeConnector {
  private config: CoinbaseConfig;
  private wsConnections: Map<string, WebSocket> = new Map();
  
  /**
   * Constructor
   * @param isTestnet Whether to use Coinbase sandbox environment
   */
  constructor(isTestnet: boolean = false) {
    super(
      'coinbase',
      isTestnet ? 'Coinbase Sandbox' : 'Coinbase',
      isTestnet
    );
    
    this.config = {
      apiUrl: isTestnet 
        ? 'https://api-public.sandbox.pro.coinbase.com' 
        : 'https://api.exchange.coinbase.com',
      wsUrl: isTestnet 
        ? 'wss://ws-feed-public.sandbox.pro.coinbase.com' 
        : 'wss://ws-feed.exchange.coinbase.com',
      sandbox: isTestnet
    };
  }
  
  /**
   * Connect to Coinbase API
   * @returns Promise resolving to boolean indicating success
   */
  protected async _connect(): Promise<boolean> {
    if (!this.credentials) {
      console.error('Cannot connect to Coinbase: No credentials provided');
      return false;
    }
    
    try {
      // Test the connection by getting account info
      await this.getAccountInfo();
      return true;
    } catch (error) {
      console.error('Failed to connect to Coinbase:', error);
      return false;
    }
  }
  
  /**
   * Disconnect from Coinbase API
   * @returns Promise resolving to boolean indicating success
   */
  protected async _disconnect(): Promise<boolean> {
    // Close all WebSocket connections
    this.wsConnections.forEach((ws, _) => {
      try {
        ws.close();
      } catch (e) {
        console.warn('Error closing WebSocket connection:', e);
      }
    });
    
    this.wsConnections.clear();
    return true;
  }
  
  /**
   * Create signature for Coinbase API requests
   * @param path API endpoint path
   * @param method HTTP method
   * @param body Request body (if any)
   * @param timestamp Request timestamp
   * @returns Signature string
   */
  private createSignature(
    path: string,
    method: string,
    body: string | null = null,
    timestamp: number
  ): string {
    if (!this.credentials) {
      throw new Error('No credentials available for signature creation');
    }
    
    // The message to sign is the timestamp + HTTP method + request path + body (if present)
    const message = `${timestamp}${method}${path}${body || ''}`;
    
    // Create an HMAC using the API secret as the key and SHA256 as the hash function
    const hmac = crypto.createHmac('sha256', this.credentials.apiSecret);
    
    // Update the HMAC with the message and get the digest in base64 format
    return hmac.update(message).digest('base64');
  }
  
  /**
   * Make authenticated request to Coinbase API
   * @param endpoint API endpoint path
   * @param method HTTP method
   * @param data Request data (for POST, PUT)
   * @returns Promise resolving to response data
   */
  private async makeAuthRequest<T>(
    endpoint: string,
    method: string = 'GET',
    data: any = null
  ): Promise<T> {
    if (!this.credentials) {
      throw new Error('No credentials available for authenticated request');
    }
    
    const timestamp = Math.floor(Date.now() / 1000);
    const body = data ? JSON.stringify(data) : null;
    
    const headers: HeadersInit = {
      'CB-ACCESS-KEY': this.credentials.apiKey,
      'CB-ACCESS-SIGN': this.createSignature(endpoint, method, body, timestamp),
      'CB-ACCESS-TIMESTAMP': timestamp.toString(),
      'CB-ACCESS-PASSPHRASE': this.credentials.passphrase || '',
      'Content-Type': 'application/json',
    };
    
    const url = `${this.config.apiUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Coinbase API error (${response.status}): ${errorText}`);
      }
      
      return await response.json() as T;
    } catch (error) {
      console.error(`Error in Coinbase API request to ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Get market data for a symbol
   * @param symbol Trading pair (e.g., 'BTC-USD')
   * @returns Promise resolving to market data
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      // Format symbol for Coinbase (change BTC/USD to BTC-USD if needed)
      const formattedSymbol = symbol.replace('/', '-');
      
      // Get ticker data
      const ticker = await this.makeAuthRequest<any>(`/products/${formattedSymbol}/ticker`);
      
      // Get 24h stats
      const stats = await this.makeAuthRequest<any>(`/products/${formattedSymbol}/stats`);
      
      return {
        symbol,
        timestamp: Date.now(),
        bid: parseFloat(ticker.bid),
        ask: parseFloat(ticker.ask),
        last: parseFloat(ticker.price),
        high: parseFloat(stats.high),
        low: parseFloat(stats.low),
        baseVolume: parseFloat(stats.volume),
        quoteVolume: parseFloat(stats.volume) * parseFloat(ticker.price), // Approximation
        percentChange24h: 0, // Not directly provided by Coinbase API
        // Additional data can be included here
      };
    } catch (error) {
      console.error(`Failed to get market data for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Subscribe to real-time market data updates
   * @param symbol Trading pair
   * @param callback Function to call with updated data
   * @returns Subscription identifier
   */
  subscribeMarketData(symbol: string, callback: (data: MarketData) => void): string {
    // Format symbol for Coinbase
    const formattedSymbol = symbol.replace('/', '-');
    const subscriptionId = uuidv4();
    
    // Create WebSocket connection if not already connected
    if (!this.wsConnections.has('market')) {
      const ws = new WebSocket(this.config.wsUrl);
      
      ws.onopen = () => {
        console.log('Coinbase WebSocket connected');
        // Subscribe to ticker channel for the symbol
        ws.send(JSON.stringify({
          type: 'subscribe',
          product_ids: [formattedSymbol],
          channels: ['ticker']
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          
          // Handle ticker message
          if (data.type === 'ticker' && this.marketDataSubscriptions.has(subscriptionId)) {
            const callbackFn = this.marketDataSubscriptions.get(subscriptionId);
            
            if (callbackFn && typeof callbackFn === 'function') {
              // Convert to standard MarketData format
              const marketData: MarketData = {
                symbol: data.product_id.replace('-', '/'),
                timestamp: new Date(data.time).getTime(),
                bid: parseFloat(data.best_bid),
                ask: parseFloat(data.best_ask),
                last: parseFloat(data.price),
                high: 0, // Not included in ticker message
                low: 0, // Not included in ticker message
                baseVolume: parseFloat(data.volume_24h || '0'),
                quoteVolume: 0, // Not directly provided
                percentChange24h: 0, // Not directly provided
              };
              
              callbackFn(marketData);
            }
          }
        } catch (e) {
          console.error('Error processing WebSocket message:', e);
        }
      };
      
      ws.onerror = (error) => {
        console.error('Coinbase WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('Coinbase WebSocket connection closed');
        this.wsConnections.delete('market');
      };
      
      this.wsConnections.set('market', ws);
    }
    
    // Store the callback with the subscription ID
    this.marketDataSubscriptions.set(subscriptionId, callback);
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from real-time market data updates
   * @param subscriptionId Identifier returned from subscribeMarketData
   * @returns Boolean indicating success
   */
  unsubscribeMarketData(subscriptionId: string): boolean {
    const success = this.marketDataSubscriptions.delete(subscriptionId);
    
    // If no more subscriptions, close the WebSocket
    if (this.marketDataSubscriptions.size === 0 && this.wsConnections.has('market')) {
      const ws = this.wsConnections.get('market');
      if (ws) {
        ws.close();
        this.wsConnections.delete('market');
      }
    }
    
    return success;
  }
  
  /**
   * Get account information including balances
   * @returns Promise resolving to account information
   */
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      // Get accounts (balances)
      const accounts = await this.makeAuthRequest<any[]>('/accounts');
      
      // Format balances
      const balances: Balance[] = accounts.map(account => ({
        asset: account.currency,
        free: parseFloat(account.available),
        used: parseFloat(account.hold),
        total: parseFloat(account.balance)
      }));
      
      // Get trading fees (simplified example)
      const tradingFees = {
        makerFee: 0.004, // 0.4% default, could be fetched from /fees endpoint
        takerFee: 0.006, // 0.6% default, could be fetched from /fees endpoint
      };
      
      return {
        exchangeId: this.exchangeId,
        exchangeName: this.name,
        balances,
        tradingFees,
        fetchTimestamp: Date.now(),
      };
    } catch (error) {
      console.error('Failed to get account information:', error);
      throw error;
    }
  }
  
  /**
   * Place an order on Coinbase
   * @param params Order parameters
   * @returns Promise resolving to order result
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      // Format the symbol for Coinbase
      const formattedSymbol = params.symbol.replace('/', '-');
      
      // Build the order data
      const orderData: any = {
        product_id: formattedSymbol,
        side: params.side,
        client_oid: params.clientOrderId || uuidv4(),
      };
      
      // Handle different order types
      switch (params.type) {
        case 'market':
          orderData.type = 'market';
          if (params.side === 'buy') {
            // For market buy orders, specify funds (quote currency amount)
            // This is a simplification, you may want to calculate this differently
            orderData.funds = (params.quantity * (params.price || 0)).toFixed(8);
          } else {
            // For market sell orders, specify size (base currency amount)
            orderData.size = params.quantity.toFixed(8);
          }
          break;
          
        case 'limit':
          if (!params.price) {
            throw new Error('Price is required for limit orders');
          }
          orderData.type = 'limit';
          orderData.price = params.price.toFixed(8);
          orderData.size = params.quantity.toFixed(8);
          
          // Handle time in force
          if (params.timeInForce) {
            switch (params.timeInForce) {
              case 'GTC':
                orderData.time_in_force = 'GTC';
                break;
              case 'IOC':
                orderData.time_in_force = 'IOC';
                break;
              case 'FOK':
                orderData.time_in_force = 'FOK';
                break;
            }
          }
          
          // Handle post-only flag
          if (params.postOnly) {
            orderData.post_only = true;
          }
          break;
          
        case 'stop':
        case 'stop_limit':
          throw new Error('Stop and stop-limit orders not yet implemented for Coinbase connector');
          
        default:
          throw new Error(`Unsupported order type: ${params.type}`);
      }
      
      // Place the order
      const response = await this.makeAuthRequest<any>('/orders', 'POST', orderData);
      
      // Format the response
      const order: Order = {
        id: response.id,
        clientOrderId: response.client_oid,
        symbol: params.symbol,
        timestamp: new Date(response.created_at).getTime(),
        lastUpdateTimestamp: new Date(response.created_at).getTime(),
        status: this.mapOrderStatus(response.status),
        type: params.type,
        side: params.side,
        price: parseFloat(response.price || '0'),
        quantity: parseFloat(response.size || '0'),
        filledQuantity: 0, // Not available in the initial response
        remainingQuantity: parseFloat(response.size || '0'),
        rawData: response
      };
      
      return {
        success: true,
        order,
        rawResponse: response
      };
    } catch (error) {
      console.error('Failed to place order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error placing order',
      };
    }
  }
  
  /**
   * Map Coinbase order status to standard OrderStatus
   * @param coinbaseStatus Status from Coinbase API
   * @returns Standardized OrderStatus
   */
  private mapOrderStatus(coinbaseStatus: string): OrderStatus {
    switch (coinbaseStatus) {
      case 'open':
      case 'pending':
        return 'open';
      case 'active':
        return 'open';
      case 'partially_filled':
        return 'partial_fill';
      case 'filled':
        return 'filled';
      case 'cancelled':
      case 'canceled':
        return 'canceled';
      case 'rejected':
        return 'rejected';
      default:
        return 'open';
    }
  }
  
  /**
   * Cancel an existing order
   * @param orderId Order identifier to cancel
   * @returns Promise resolving to boolean indicating success
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.makeAuthRequest<any>(`/orders/${orderId}`, 'DELETE');
      return true;
    } catch (error) {
      console.error(`Failed to cancel order ${orderId}:`, error);
      return false;
    }
  }
  
  /**
   * Get status and details of an existing order
   * @param orderId Order identifier to check
   * @returns Promise resolving to order information
   */
  async getOrder(orderId: string): Promise<Order> {
    try {
      const response = await this.makeAuthRequest<any>(`/orders/${orderId}`);
      
      return {
        id: response.id,
        clientOrderId: response.client_oid,
        symbol: response.product_id.replace('-', '/'),
        timestamp: new Date(response.created_at).getTime(),
        lastUpdateTimestamp: new Date(response.done_at || response.created_at).getTime(),
        status: this.mapOrderStatus(response.status),
        type: response.type as any,
        side: response.side as any,
        price: parseFloat(response.price || '0'),
        quantity: parseFloat(response.size || '0'),
        filledQuantity: parseFloat(response.filled_size || '0'),
        remainingQuantity: parseFloat(response.size || '0') - parseFloat(response.filled_size || '0'),
        averageFillPrice: parseFloat(response.executed_value || '0') / parseFloat(response.filled_size || '1'),
        fee: {
          amount: parseFloat(response.fill_fees || '0'),
          currency: response.product_id.split('-')[1] // Quote currency
        },
        rawData: response
      };
    } catch (error) {
      console.error(`Failed to get order ${orderId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all open orders
   * @param symbol Optional trading pair to filter orders
   * @returns Promise resolving to array of orders
   */
  async getOpenOrders(symbol?: string): Promise<Order[]> {
    try {
      let endpoint = '/orders?status=open';
      
      if (symbol) {
        // Format symbol for Coinbase
        const formattedSymbol = symbol.replace('/', '-');
        endpoint += `&product_id=${formattedSymbol}`;
      }
      
      const response = await this.makeAuthRequest<any[]>(endpoint);
      
      return response.map(order => ({
        id: order.id,
        clientOrderId: order.client_oid,
        symbol: order.product_id.replace('-', '/'),
        timestamp: new Date(order.created_at).getTime(),
        lastUpdateTimestamp: new Date(order.created_at).getTime(),
        status: this.mapOrderStatus(order.status),
        type: order.type as any,
        side: order.side as any,
        price: parseFloat(order.price || '0'),
        quantity: parseFloat(order.size || '0'),
        filledQuantity: parseFloat(order.filled_size || '0'),
        remainingQuantity: parseFloat(order.size || '0') - parseFloat(order.filled_size || '0'),
        rawData: order
      }));
    } catch (error) {
      console.error('Failed to get open orders:', error);
      throw error;
    }
  }
  
  /**
   * Get historical trades
   * @param symbol Trading pair
   * @param limit Maximum number of trades to return
   * @param startTime Optional start time in milliseconds
   * @param endTime Optional end time in milliseconds
   * @returns Promise resolving to array of orders
   */
  async getOrderHistory(
    symbol: string,
    limit: number = 100,
    startTime?: number,
    endTime?: number
  ): Promise<Order[]> {
    try {
      // Format symbol for Coinbase
      const formattedSymbol = symbol.replace('/', '-');
      
      let endpoint = `/orders?product_id=${formattedSymbol}&status=done&limit=${limit}`;
      
      // Coinbase API uses ISO string for dates
      if (startTime) {
        endpoint += `&start=${new Date(startTime).toISOString()}`;
      }
      
      if (endTime) {
        endpoint += `&end=${new Date(endTime).toISOString()}`;
      }
      
      const response = await this.makeAuthRequest<any[]>(endpoint);
      
      return response.map(order => ({
        id: order.id,
        clientOrderId: order.client_oid,
        symbol: order.product_id.replace('-', '/'),
        timestamp: new Date(order.created_at).getTime(),
        lastUpdateTimestamp: new Date(order.done_at || order.created_at).getTime(),
        status: this.mapOrderStatus(order.status),
        type: order.type as any,
        side: order.side as any,
        price: parseFloat(order.price || '0'),
        quantity: parseFloat(order.size || '0'),
        filledQuantity: parseFloat(order.filled_size || '0'),
        remainingQuantity: 0, // Completed orders
        averageFillPrice: parseFloat(order.executed_value || '0') / parseFloat(order.filled_size || '1'),
        fee: {
          amount: parseFloat(order.fill_fees || '0'),
          currency: order.product_id.split('-')[1] // Quote currency
        },
        rawData: order
      }));
    } catch (error) {
      console.error(`Failed to get order history for ${symbol}:`, error);
      throw error;
    }
  }
}
