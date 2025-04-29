/**
 * Binance Exchange Connector
 * 
 * Implementation of the Exchange Connector interface for Binance.
 * Handles Binance REST API operations for trading and market data.
 */

import { 
  BaseExchangeConnector 
} from '../base-connector';
import { 
  MarketData, 
  OrderParams, 
  OrderResult, 
  AccountInfo, 
  ExchangeCredentials,
  OrderStatus
} from '../types';
import { handleExchangeError } from '../error-handling';
import { createHmac } from 'crypto';

// Default Binance API URLs
const BINANCE_API_URL = 'https://api.binance.com';
const BINANCE_API_TESTNET_URL = 'https://testnet.binance.vision';

export class BinanceConnector extends BaseExchangeConnector {
  private apiUrl: string;
  private useTestnet: boolean;
  private lastRequestTime: number = 0;
  private requestWeight: number = 0;
  // Rate limit settings: 1200 weight per minute for REST API
  private maxRequestWeight: number = 1200;
  private weightResetIntervalMs: number = 60000; // 1 minute
  
  name: string = 'Binance';
  
  constructor(useTestnet: boolean = false) {
    super();
    this.useTestnet = useTestnet;
    this.apiUrl = useTestnet ? BINANCE_API_TESTNET_URL : BINANCE_API_URL;
    
    // Set up automatic weight reset
    setInterval(() => {
      this.requestWeight = 0;
      this.lastRequestTime = Date.now();
    }, this.weightResetIntervalMs);
  }
  
  /**
   * Perform connection to Binance
   */
  protected async performConnect(credentials: ExchangeCredentials): Promise<boolean> {
    try {
      // Validate credentials by making a simple API call
      const timestamp = Date.now();
      const signature = this.generateSignature('', timestamp, credentials.secretKey);
      
      const response = await this.sendSignedRequest('/api/v3/account', 'GET', {}, timestamp, signature, credentials.apiKey);
      
      // If no error is thrown, the connection is successful
      return true;
    } catch (error) {
      throw handleExchangeError(error, 'Failed to connect to Binance');
    }
  }
  
  /**
   * Perform disconnection from Binance
   */
  protected async performDisconnect(): Promise<boolean> {
    // For REST API, there's no actual disconnection needed
    this._credentials = undefined;
    return true;
  }
  
  /**
   * Get market data for a symbol
   */
  protected async performGetMarketData(symbol: string): Promise<MarketData> {
    try {
      // Normalize the symbol format to Binance format
      const binanceSymbol = this.formatSymbolForBinance(symbol);
      
      // Get ticker price
      const tickerResponse = await this.sendPublicRequest(`/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
      
      return {
        symbol,
        exchange: this.name,
        price: parseFloat(tickerResponse.lastPrice),
        bid: parseFloat(tickerResponse.bidPrice),
        ask: parseFloat(tickerResponse.askPrice),
        volume24h: parseFloat(tickerResponse.volume),
        change24h: parseFloat(tickerResponse.priceChangePercent),
        high24h: parseFloat(tickerResponse.highPrice),
        low24h: parseFloat(tickerResponse.lowPrice),
        timestamp: Date.now()
      };
    } catch (error) {
      throw handleExchangeError(error, `Failed to get market data for ${symbol}`);
    }
  }
  
  /**
   * Get the order book for a symbol
   */
  protected async performGetOrderBook(symbol: string, limit: number = 10): Promise<{
    bids: [number, number][];
    asks: [number, number][];
    timestamp: number;
  }> {
    try {
      // Normalize the symbol format to Binance format
      const binanceSymbol = this.formatSymbolForBinance(symbol);
      
      // Get order book
      const response = await this.sendPublicRequest(`/api/v3/depth?symbol=${binanceSymbol}&limit=${limit}`);
      
      return {
        bids: response.bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
        asks: response.asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
        timestamp: response.lastUpdateId
      };
    } catch (error) {
      throw handleExchangeError(error, `Failed to get order book for ${symbol}`);
    }
  }
  
  /**
   * Place a new order
   */
  protected async performPlaceOrder(params: OrderParams): Promise<OrderResult> {
    try {
      if (!this._credentials) {
        throw new Error('Not connected to exchange');
      }
      
      // Normalize the symbol format to Binance format
      const binanceSymbol = this.formatSymbolForBinance(params.symbol);
      
      // Build the request parameters
      const requestParams: Record<string, string> = {
        symbol: binanceSymbol,
        side: params.side.toUpperCase(),
        type: this.mapOrderTypeToBinance(params.type),
        quantity: params.quantity.toString()
      };
      
      // Add optional parameters
      if (params.price && (params.type === 'limit' || params.type === 'stop_limit')) {
        requestParams.price = params.price.toString();
      }
      
      if (params.stopPrice && (params.type === 'stop' || params.type === 'stop_limit')) {
        requestParams.stopPrice = params.stopPrice.toString();
      }
      
      if (params.timeInForce) {
        requestParams.timeInForce = params.timeInForce;
      } else if (params.type === 'limit' || params.type === 'stop_limit') {
        // Default time in force for limit orders
        requestParams.timeInForce = 'GTC';
      }
      
      if (params.clientOrderId) {
        requestParams.newClientOrderId = params.clientOrderId;
      }
      
      // Send the order request
      const timestamp = Date.now();
      const queryString = this.buildQueryString(requestParams);
      const signature = this.generateSignature(queryString, timestamp, this._credentials.secretKey);
      
      const response = await this.sendSignedRequest(
        '/api/v3/order',
        'POST',
        requestParams,
        timestamp,
        signature,
        this._credentials.apiKey
      );
      
      // Map response to OrderResult
      return this.mapBinanceOrderToOrderResult(response);
    } catch (error) {
      throw handleExchangeError(error, 'Failed to place order');
    }
  }
  
  /**
   * Cancel an existing order
   */
  protected async performCancelOrder(orderId: string, symbol: string): Promise<boolean> {
    try {
      if (!this._credentials) {
        throw new Error('Not connected to exchange');
      }
      
      // Normalize the symbol format to Binance format
      const binanceSymbol = this.formatSymbolForBinance(symbol);
      
      // Build the request parameters
      const requestParams: Record<string, string> = {
        symbol: binanceSymbol,
        orderId
      };
      
      // Send the cancel request
      const timestamp = Date.now();
      const queryString = this.buildQueryString(requestParams);
      const signature = this.generateSignature(queryString, timestamp, this._credentials.secretKey);
      
      await this.sendSignedRequest(
        '/api/v3/order',
        'DELETE',
        requestParams,
        timestamp,
        signature,
        this._credentials.apiKey
      );
      
      // If no error is thrown, the cancellation is successful
      return true;
    } catch (error) {
      throw handleExchangeError(error, `Failed to cancel order ${orderId}`);
    }
  }
  
  /**
   * Get the status of an order
   */
  protected async performGetOrderStatus(orderId: string, symbol: string): Promise<OrderResult> {
    try {
      if (!this._credentials) {
        throw new Error('Not connected to exchange');
      }
      
      // Normalize the symbol format to Binance format
      const binanceSymbol = this.formatSymbolForBinance(symbol);
      
      // Build the request parameters
      const requestParams: Record<string, string> = {
        symbol: binanceSymbol,
        orderId
      };
      
      // Send the request
      const timestamp = Date.now();
      const queryString = this.buildQueryString(requestParams);
      const signature = this.generateSignature(queryString, timestamp, this._credentials.secretKey);
      
      const response = await this.sendSignedRequest(
        '/api/v3/order',
        'GET',
        requestParams,
        timestamp,
        signature,
        this._credentials.apiKey
      );
      
      // Map response to OrderResult
      return this.mapBinanceOrderToOrderResult(response);
    } catch (error) {
      throw handleExchangeError(error, `Failed to get order status for ${orderId}`);
    }
  }
  
  /**
   * Get all open orders
   */
  protected async performGetOpenOrders(symbol?: string): Promise<OrderResult[]> {
    try {
      if (!this._credentials) {
        throw new Error('Not connected to exchange');
      }
      
      // Build the request parameters
      const requestParams: Record<string, string> = {};
      
      if (symbol) {
        requestParams.symbol = this.formatSymbolForBinance(symbol);
      }
      
      // Send the request
      const timestamp = Date.now();
      const queryString = this.buildQueryString(requestParams);
      const signature = this.generateSignature(queryString, timestamp, this._credentials.secretKey);
      
      const response = await this.sendSignedRequest(
        '/api/v3/openOrders',
        'GET',
        requestParams,
        timestamp,
        signature,
        this._credentials.apiKey
      );
      
      // Map response to OrderResult array
      return response.map((order: any) => this.mapBinanceOrderToOrderResult(order));
    } catch (error) {
      throw handleExchangeError(error, 'Failed to get open orders');
    }
  }
  
  /**
   * Get account information including balances
   */
  protected async performGetAccountInfo(): Promise<AccountInfo> {
    try {
      if (!this._credentials) {
        throw new Error('Not connected to exchange');
      }
      
      // Send the request
      const timestamp = Date.now();
      const signature = this.generateSignature('', timestamp, this._credentials.secretKey);
      
      const response = await this.sendSignedRequest(
        '/api/v3/account',
        'GET',
        {},
        timestamp,
        signature,
        this._credentials.apiKey
      );
      
      // Map response to AccountInfo
      return {
        balances: response.balances.map((balance: any) => ({
          asset: balance.asset,
          free: parseFloat(balance.free),
          locked: parseFloat(balance.locked)
        })),
        permissions: response.permissions || []
      };
    } catch (error) {
      throw handleExchangeError(error, 'Failed to get account information');
    }
  }
  
  /**
   * Subscribe to real-time price updates (not implemented for REST-only connector)
   */
  protected async performSubscribePriceUpdates(
    symbols: string[],
    callback: (data: MarketData) => void
  ): Promise<boolean> {
    // For REST API connector, use WebSocket manager instead for real-time data
    console.warn('REST API connector does not support real-time price updates. Use WebSocketManager instead.');
    return false;
  }
  
  /**
   * Unsubscribe from price updates (not implemented for REST-only connector)
   */
  protected async performUnsubscribePriceUpdates(symbols: string[]): Promise<boolean> {
    // For REST API connector, use WebSocket manager instead for real-time data
    return false;
  }
  
  // --- Helper methods ---
  
  /**
   * Send a signed request to the Binance API
   */
  private async sendSignedRequest(
    endpoint: string,
    method: string,
    params: Record<string, string>,
    timestamp: number,
    signature: string,
    apiKey: string
  ): Promise<any> {
    try {
      // Add timestamp to params
      params.timestamp = timestamp.toString();
      
      // Add signature to params
      params.signature = signature;
      
      // Build URL and query string
      let url = `${this.apiUrl}${endpoint}`;
      let body: FormData | undefined;
      
      // Handle different HTTP methods
      if (method === 'GET' || method === 'DELETE') {
        const queryString = this.buildQueryString(params);
        url = `${url}?${queryString}`;
      } else {
        body = new FormData();
        for (const key in params) {
          body.append(key, params[key]);
        }
      }
      
      // Track the request for rate limiting
      this.trackRequest(endpoint, 1);
      
      // Make the request
      const response = await fetch(url, {
        method,
        headers: {
          'X-MBX-APIKEY': apiKey
        },
        body
      });
      
      // Handle response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Send a public request to the Binance API
   */
  private async sendPublicRequest(endpoint: string): Promise<any> {
    try {
      // Track the request for rate limiting
      this.trackRequest(endpoint, 1);
      
      // Make the request
      const response = await fetch(`${this.apiUrl}${endpoint}`);
      
      // Handle response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Generate a signature for a Binance API request
   */
  private generateSignature(queryString: string, timestamp: number, secretKey: string): string {
    const totalParams = queryString ? `${queryString}&timestamp=${timestamp}` : `timestamp=${timestamp}`;
    return createHmac('sha256', secretKey)
      .update(totalParams)
      .digest('hex');
  }
  
  /**
   * Build a query string from parameters
   */
  private buildQueryString(params: Record<string, string>): string {
    return Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
  }
  
  /**
   * Track an API request for rate limiting
   */
  private trackRequest(endpoint: string, weight: number = 1): void {
    const now = Date.now();
    this.requestWeight += weight;
    
    // Check if we're approaching rate limits
    if (this.requestWeight >= this.maxRequestWeight * 0.8) {
      const remainingTime = this.weightResetIntervalMs - (now - this.lastRequestTime);
      console.warn(`Approaching Binance rate limit: ${this.requestWeight}/${this.maxRequestWeight}. Reset in ${remainingTime}ms`);
    }
    
    // If we hit the rate limit, delay the request
    if (this.requestWeight >= this.maxRequestWeight) {
      const remainingTime = this.weightResetIntervalMs - (now - this.lastRequestTime);
      console.warn(`Binance rate limit hit: ${this.requestWeight}/${this.maxRequestWeight}. Waiting ${remainingTime}ms`);
      
      // In a real implementation, we would queue the request here
    }
  }
  
  /**
   * Format a trading pair symbol to Binance format
   */
  private formatSymbolForBinance(symbol: string): string {
    // Remove any spaces
    symbol = symbol.trim();
    
    // Convert format like "BTC/USDT" to "BTCUSDT"
    return symbol.replace('/', '');
  }
  
  /**
   * Map order type to Binance format
   */
  private mapOrderTypeToBinance(type: string): string {
    switch (type) {
      case 'market':
        return 'MARKET';
      case 'limit':
        return 'LIMIT';
      case 'stop':
        return 'STOP_LOSS';
      case 'stop_limit':
        return 'STOP_LOSS_LIMIT';
      default:
        return type.toUpperCase();
    }
  }
  
  /**
   * Map Binance order response to OrderResult
   */
  private mapBinanceOrderToOrderResult(order: any): OrderResult {
    // Map status
    let status: OrderStatus;
    switch (order.status) {
      case 'NEW':
        status = 'new';
        break;
      case 'PARTIALLY_FILLED':
        status = 'partially_filled';
        break;
      case 'FILLED':
        status = 'filled';
        break;
      case 'CANCELED':
        status = 'canceled';
        break;
      case 'PENDING_CANCEL':
        status = 'pending_cancel';
        break;
      case 'REJECTED':
        status = 'rejected';
        break;
      case 'EXPIRED':
        status = 'expired';
        break;
      default:
        status = 'new';
    }
    
    return {
      id: order.orderId.toString(),
      clientOrderId: order.clientOrderId,
      symbol: order.symbol,
      side: order.side.toLowerCase() as 'buy' | 'sell',
      type: this.mapBinanceOrderTypeToOrderType(order.type),
      status,
      quantity: parseFloat(order.origQty),
      price: order.price ? parseFloat(order.price) : undefined,
      stopPrice: order.stopPrice ? parseFloat(order.stopPrice) : undefined,
      executedQuantity: parseFloat(order.executedQty),
      executedPrice: order.avgPrice ? parseFloat(order.avgPrice) : undefined,
      timeInForce: order.timeInForce as 'GTC' | 'IOC' | 'FOK',
      createdAt: order.time || Date.now(),
      updatedAt: order.updateTime || Date.now()
    };
  }
  
  /**
   * Map Binance order type to our order type format
   */
  private mapBinanceOrderTypeToOrderType(type: string): 'market' | 'limit' | 'stop' | 'stop_limit' {
    switch (type) {
      case 'MARKET':
        return 'market';
      case 'LIMIT':
        return 'limit';
      case 'STOP_LOSS':
        return 'stop';
      case 'STOP_LOSS_LIMIT':
        return 'stop_limit';
      default:
        return 'market';
    }
  }
}
