/**
 * Bybit Exchange Connector
 * 
 * Implementation of the IExchangeConnector interface for Bybit cryptocurrency exchange.
 * Handles API authentication, rate limiting, and exchange-specific error handling.
 * 
 * API Documentation: https://bybit-exchange.github.io/docs/
 */

import crypto from 'crypto';
import { 
  IExchangeConnector, 
  MarketData, 
  OrderParams,
  OrderResult,
  AccountInfo,
  ExchangeCredentials,
  PositionInfo
} from '../types';
import { BaseExchangeConnector } from '../base-connector';

/**
 * Bybit API endpoints
 */
const BYBIT_API_URLS = {
  production: 'https://api.bybit.com',
  testnet: 'https://api-testnet.bybit.com'
};

/**
 * Implements the IExchangeConnector interface for Bybit exchange
 */
export class BybitConnector extends BaseExchangeConnector implements IExchangeConnector {
  /**
   * Exchange name
   */
  public readonly name: string = 'bybit';
  
  private baseUrl: string;
  private apiKey: string = '';
  private apiSecret: string = '';

  /**
   * Create a new Bybit connector
   * 
   * @param useTestnet - Whether to use the testnet environment
   */
  constructor(private useTestnet: boolean = false) {
    super();
    this.baseUrl = useTestnet ? BYBIT_API_URLS.testnet : BYBIT_API_URLS.production;
  }

  /**
   * Implementation of connect for Bybit
   * 
   * @param credentials - API credentials for authentication
   * @returns True if connection was successful
   */
  protected async performConnect(credentials: ExchangeCredentials): Promise<boolean> {
    if (!credentials.apiKey || !credentials.secretKey) {
      throw new Error('Bybit requires API key and secret key');
    }

    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.secretKey;

    // Test the connection by getting account information
    await this.getAccountInfo();
    return true;
  }

  /**
   * Implementation of disconnect for Bybit
   * 
   * @returns True if disconnection was successful
   */
  protected async performDisconnect(): Promise<boolean> {
    this.apiKey = '';
    this.apiSecret = '';
    return true;
  }

  /**
   * Implementation of getMarketData for Bybit
   * 
   * @param symbol - The symbol to get market data for
   * @returns Market data including price, volume, etc.
   */
  protected async performGetMarketData(symbol: string): Promise<MarketData> {
    // Format symbol for Bybit (e.g., 'BTCUSD' -> 'BTCUSDT')
    const formattedSymbol = this.formatSymbol(symbol);
    
    // Get ticker data from Bybit
    const params = { symbol: formattedSymbol };
    const response = await this.get('/v5/market/tickers', params);
    
    if (!response.result || !response.result.list || response.result.list.length === 0) {
      throw new Error(`No ticker data found for ${symbol}`);
    }
    
    const ticker = response.result.list[0];
    
    return {
      symbol,
      exchange: this.name,
      price: parseFloat(ticker.lastPrice),
      lastPrice: parseFloat(ticker.lastPrice),
      bid: parseFloat(ticker.bid1Price),
      bidPrice: parseFloat(ticker.bid1Price),
      ask: parseFloat(ticker.ask1Price),
      askPrice: parseFloat(ticker.ask1Price),
      volume24h: parseFloat(ticker.volume24h),
      volume: parseFloat(ticker.volume24h),
      change24h: parseFloat(ticker.price24hPcnt) * 100,
      high24h: parseFloat(ticker.highPrice24h),
      low24h: parseFloat(ticker.lowPrice24h),
      timestamp: Date.now()
    };
  }

  /**
   * Implementation of getOrderBook for Bybit
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
    // Format symbol for Bybit
    const formattedSymbol = this.formatSymbol(symbol);
    
    // Get order book data
    const params = { 
      symbol: formattedSymbol,
      limit: limit.toString()
    };
    
    const response = await this.get('/v5/market/orderbook', params);
    
    if (!response.result || !response.result.b || !response.result.a) {
      throw new Error(`Failed to get order book for ${symbol}`);
    }
    
    // Process bids and asks
    const bids = response.result.b
      .slice(0, limit)
      .map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]);
    
    const asks = response.result.a
      .slice(0, limit)
      .map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]);
    
    return {
      bids,
      asks,
      timestamp: parseInt(response.result.ts)
    };
  }

  /**
   * Implementation of placeOrder for Bybit
   * 
   * @param params - Order parameters
   * @returns Order result
   */
  protected async performPlaceOrder(params: OrderParams): Promise<OrderResult> {
    // Format symbol for Bybit
    const formattedSymbol = this.formatSymbol(params.symbol);
    
    // Prepare order data
    const orderData: any = {
      symbol: formattedSymbol,
      side: params.side.toUpperCase(),
      orderType: this.mapOrderType(params.type),
      qty: params.quantity.toString()
    };
    
    // Add price for limit orders
    if (params.type === 'limit' || params.type === 'stop_limit') {
      orderData.price = params.price?.toString();
    }
    
    // Add stop price for stop orders
    if (params.type === 'stop' || params.type === 'stop_limit') {
      orderData.triggerPrice = params.stopPrice?.toString();
    }
    
    // Add time in force
    if (params.timeInForce) {
      orderData.timeInForce = this.mapTimeInForce(params.timeInForce);
    } else {
      orderData.timeInForce = 'GTC';
    }
    
    // Add client order ID if provided
    if (params.clientOrderId) {
      orderData.orderLinkId = params.clientOrderId;
    }
    
    // Place the order
    const response = await this.post('/v5/order/create', orderData);
    
    if (!response.result) {
      throw new Error(`Failed to place order: ${response.retMsg}`);
    }
    
    // Get the order status
    const orderResult = await this.getOrderStatus(response.result.orderId, params.symbol);
    
    return orderResult;
  }

  /**
   * Implementation of cancelOrder for Bybit
   * 
   * @param orderId - The ID of the order to cancel
   * @param symbol - The symbol of the order
   * @returns True if the cancellation was successful
   */
  protected async performCancelOrder(orderId: string, symbol: string): Promise<boolean> {
    // Format symbol for Bybit
    const formattedSymbol = this.formatSymbol(symbol);
    
    // Prepare cancel data
    const cancelData = {
      symbol: formattedSymbol,
      orderId
    };
    
    // Cancel the order
    const response = await this.post('/v5/order/cancel', cancelData);
    
    if (!response.result) {
      throw new Error(`Failed to cancel order: ${response.retMsg}`);
    }
    
    return true;
  }

  /**
   * Implementation of getOrderStatus for Bybit
   * 
   * @param orderId - The ID of the order to check
   * @param symbol - The symbol of the order
   * @returns The current status of the order
   */
  protected async performGetOrderStatus(orderId: string, symbol: string): Promise<OrderResult> {
    // Format symbol for Bybit
    const formattedSymbol = this.formatSymbol(symbol);
    
    // Get order details
    const params = {
      symbol: formattedSymbol,
      orderId
    };
    
    const response = await this.get('/v5/order/history', params);
    
    if (!response.result || !response.result.list || response.result.list.length === 0) {
      throw new Error(`Order not found: ${orderId}`);
    }
    
    const order = response.result.list[0];
    
    // Format the response to match OrderResult interface
    return {
      id: order.orderId,
      clientOrderId: order.orderLinkId,
      symbol: this.normalizeSymbol(order.symbol),
      side: order.side.toLowerCase() as 'buy' | 'sell',
      type: this.reverseMapOrderType(order.orderType),
      status: this.mapOrderStatus(order.orderStatus),
      quantity: parseFloat(order.qty),
      price: order.price ? parseFloat(order.price) : undefined,
      stopPrice: order.triggerPrice ? parseFloat(order.triggerPrice) : undefined,
      executedQuantity: parseFloat(order.cumExecQty || '0'),
      executedPrice: order.avgPrice ? parseFloat(order.avgPrice) : undefined,
      timeInForce: this.reverseMapTimeInForce(order.timeInForce),
      createdAt: parseInt(order.createdTime),
      updatedAt: parseInt(order.updatedTime || order.createdTime)
    };
  }

  /**
   * Implementation of getOpenOrders for Bybit
   * 
   * @param symbol - Optional symbol to filter by
   * @returns Array of open orders
   */
  protected async performGetOpenOrders(symbol?: string): Promise<OrderResult[]> {
    // Prepare query parameters
    const params: any = { limit: '50' };
    
    if (symbol) {
      params.symbol = this.formatSymbol(symbol);
    }
    
    // Get open orders
    const response = await this.get('/v5/order/realtime', params);
    
    if (!response.result || !response.result.list) {
      throw new Error(`Failed to get open orders: ${response.retMsg}`);
    }
    
    // Format the response to match OrderResult interface
    return response.result.list.map((order: any) => ({
      id: order.orderId,
      clientOrderId: order.orderLinkId,
      symbol: this.normalizeSymbol(order.symbol),
      side: order.side.toLowerCase() as 'buy' | 'sell',
      type: this.reverseMapOrderType(order.orderType),
      status: this.mapOrderStatus(order.orderStatus),
      quantity: parseFloat(order.qty),
      price: order.price ? parseFloat(order.price) : undefined,
      stopPrice: order.triggerPrice ? parseFloat(order.triggerPrice) : undefined,
      executedQuantity: parseFloat(order.cumExecQty || '0'),
      executedPrice: order.avgPrice ? parseFloat(order.avgPrice) : undefined,
      timeInForce: this.reverseMapTimeInForce(order.timeInForce),
      createdAt: parseInt(order.createdTime),
      updatedAt: parseInt(order.updatedTime || order.createdTime)
    }));
  }

  /**
   * Implementation of getAccountInfo for Bybit
   * 
   * @returns Account information
   */
  protected async performGetAccountInfo(): Promise<AccountInfo> {
    // Get account balances
    const balanceResponse = await this.get('/v5/account/wallet-balance', { accountType: 'UNIFIED' });
    
    if (!balanceResponse.result || !balanceResponse.result.list || balanceResponse.result.list.length === 0) {
      throw new Error('Failed to get account balances');
    }
    
    // Format balances
    const balances = balanceResponse.result.list[0].coin.map((coin: any) => ({
      asset: coin.coin,
      free: parseFloat(coin.availableToWithdraw),
      locked: parseFloat(coin.walletBalance) - parseFloat(coin.availableToWithdraw)
    }));
    
    // Get positions for futures trading
    const positionResponse = await this.get('/v5/position/list');
    
    let positions: PositionInfo[] = [];
    
    if (positionResponse.result && positionResponse.result.list) {
      positions = positionResponse.result.list
        .filter((pos: any) => parseFloat(pos.size) !== 0)
        .map((pos: any) => ({
          symbol: this.normalizeSymbol(pos.symbol),
          positionSize: parseFloat(pos.size) * (pos.side === 'Buy' ? 1 : -1),
          entryPrice: parseFloat(pos.entryPrice),
          markPrice: parseFloat(pos.markPrice),
          liquidationPrice: parseFloat(pos.liqPrice),
          unrealizedPnL: parseFloat(pos.unrealisedPnl),
          margin: parseFloat(pos.positionIM),
          leverage: parseFloat(pos.leverage)
        }));
    }
    
    return {
      balances,
      permissions: ['spot', 'futures', 'margin'],
      positions
    };
  }

  /**
   * Implementation of subscribePriceUpdates for Bybit
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
    console.warn('subscribePriceUpdates is not implemented in the REST API connector');
    return false;
  }

  /**
   * Implementation of unsubscribePriceUpdates for Bybit
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
   * Make a GET request to the Bybit API
   * 
   * @param endpoint - API endpoint
   * @param params - Query parameters
   * @returns Response data
   */
  private async get(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    
    // Add common parameters
    const queryParams: Record<string, string> = {
      ...params,
      api_key: this.apiKey,
      timestamp,
      recv_window: recvWindow
    };
    
    // Generate signature
    const signature = this.generateSignature(queryParams);
    queryParams.sign = signature;
    
    // Build query string
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    // Make the request
    const url = `${this.baseUrl}${endpoint}?${queryString}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return this.handleResponse(response);
  }

  /**
   * Make a POST request to the Bybit API
   * 
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @returns Response data
   */
  private async post(endpoint: string, data: Record<string, any> = {}): Promise<any> {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    
    // Add common parameters
    const postData: Record<string, any> = {
      ...data,
      api_key: this.apiKey,
      timestamp,
      recv_window: recvWindow
    };
    
    // Generate signature
    const signature = this.generateSignature(postData);
    postData.sign = signature;
    
    // Make the request
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });
    
    return this.handleResponse(response);
  }

  /**
   * Generate a signature for API authentication
   * 
   * @param params - Parameters to sign
   * @returns Signature
   */
  private generateSignature(params: Record<string, any>): string {
    const orderedParams = Object.keys(params)
      .sort()
      .reduce((result: Record<string, any>, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    const queryString = Object.entries(orderedParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Handle API response
   * 
   * @param response - Fetch response
   * @returns Response data
   */
  private async handleResponse(response: Response): Promise<any> {
    const data = await response.json();
    
    if (!response.ok || data.retCode !== 0) {
      throw {
        code: data.retCode || response.status,
        message: data.retMsg || response.statusText,
        data
      };
    }
    
    return data;
  }

  /**
   * Format a symbol for Bybit's API
   * 
   * @param symbol - Symbol to format
   * @returns Formatted symbol
   */
  private formatSymbol(symbol: string): string {
    // Handle common pairs by adding USDT if not specified
    if (/^BTC|ETH|XRP|SOL|DOGE$/.test(symbol)) {
      return `${symbol}USDT`;
    }
    
    // For pairs like BTCUSDT, no change needed
    if (/^[A-Z0-9]+USDT$/.test(symbol)) {
      return symbol;
    }
    
    // Convert pairs like BTC/USDT or BTC-USDT to BTCUSDT
    return symbol.replace(/[/-]/g, '');
  }

  /**
   * Normalize a symbol from Bybit's format
   * 
   * @param symbol - Symbol to normalize
   * @returns Normalized symbol
   */
  private normalizeSymbol(symbol: string): string {
    return symbol;
  }

  /**
   * Map our order type to Bybit's format
   * 
   * @param type - Our order type
   * @returns Bybit order type
   */
  private mapOrderType(type: string): string {
    switch (type) {
      case 'market':
        return 'Market';
      case 'limit':
        return 'Limit';
      case 'stop':
        return 'Market';
      case 'stop_limit':
        return 'Limit';
      default:
        return 'Limit';
    }
  }

  /**
   * Map Bybit order type back to our format
   * 
   * @param type - Bybit order type
   * @returns Our order type
   */
  private reverseMapOrderType(type: string): OrderResult['type'] {
    switch (type) {
      case 'Market':
        return 'market';
      case 'Limit':
        return 'limit';
      default:
        return 'limit';
    }
  }

  /**
   * Map Bybit order status to our standard order status
   * 
   * @param status - Bybit order status
   * @returns Normalized order status
   */
  private mapOrderStatus(status: string): OrderResult['status'] {
    switch (status) {
      case 'Created':
      case 'New':
      case 'Active':
        return 'new';
      case 'PartiallyFilled':
        return 'partially_filled';
      case 'Filled':
        return 'filled';
      case 'Cancelled':
        return 'canceled';
      case 'Rejected':
        return 'rejected';
      case 'PendingCancel':
        return 'pending_cancel';
      default:
        return 'new';
    }
  }

  /**
   * Map our time in force values to Bybit's format
   * 
   * @param timeInForce - Our time in force value
   * @returns Bybit time in force value
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
   * Map Bybit time in force to our format
   * 
   * @param timeInForce - Bybit time in force
   * @returns Our time in force value
   */
  private reverseMapTimeInForce(timeInForce: string): OrderResult['timeInForce'] {
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
}
