/**
 * Hyperliquid Exchange Connector for Trading Farm
 * 
 * Implementation of the exchange connector interface for Hyperliquid
 * Using API documentation from: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
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
 * Hyperliquid Exchange specific configuration
 */
interface HyperliquidConfig {
  /**
   * Base API URL
   */
  apiUrl: string;
  
  /**
   * WebSocket URL for real-time data
   */
  wsUrl: string;
  
  /**
   * Whether to use the testnet environment
   */
  testnet: boolean;
}

/**
 * Implementation of the Exchange Connector interface for Hyperliquid
 */
export class HyperliquidConnector extends BaseExchangeConnector {
  private config: HyperliquidConfig;
  private wsConnections: Map<string, WebSocket> = new Map();
  
  /**
   * Constructor
   * @param isTestnet Whether to use Hyperliquid testnet environment
   */
  constructor(isTestnet: boolean = false) {
    super(
      'hyperliquid',
      isTestnet ? 'Hyperliquid Testnet' : 'Hyperliquid',
      isTestnet
    );
    
    this.config = {
      apiUrl: isTestnet 
        ? 'https://api-testnet.hyperliquid.xyz' 
        : 'https://api.hyperliquid.xyz',
      wsUrl: isTestnet 
        ? 'wss://api-testnet.hyperliquid.xyz/ws' 
        : 'wss://api.hyperliquid.xyz/ws',
      testnet: isTestnet
    };
  }
  
  /**
   * Connect to Hyperliquid API
   * @returns Promise resolving to boolean indicating success
   */
  protected async _connect(): Promise<boolean> {
    if (!this.credentials) {
      console.error('Cannot connect to Hyperliquid: No credentials provided');
      return false;
    }
    
    try {
      // Test the connection by getting account info
      await this.getAccountInfo();
      return true;
    } catch (error) {
      console.error('Failed to connect to Hyperliquid:', error);
      return false;
    }
  }
  
  /**
   * Disconnect from Hyperliquid API
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
   * Create signature for Hyperliquid API requests
   * @param payload Request payload
   * @returns Signature object
   */
  private createSignature(payload: any): any {
    if (!this.credentials) {
      throw new Error('No credentials available for signature creation');
    }
    
    const timestamp = Date.now().toString();
    const msg = JSON.stringify(payload);
    
    // Convert hex private key to Buffer
    const privateKey = Buffer.from(this.credentials.apiSecret, 'hex');
    
    // Sign the message
    const signature = crypto.createHmac('sha256', privateKey)
      .update(timestamp + msg)
      .digest('hex');
    
    return {
      signature,
      timestamp,
      payload
    };
  }
  
  /**
   * Make authenticated request to Hyperliquid API
   * @param endpoint API endpoint path
   * @param method HTTP method
   * @param data Request data
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
    
    const url = `${this.config.apiUrl}${endpoint}`;
    const payload = data || {};
    const signatureObj = this.createSignature(payload);
    
    // Build the request headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-HL-Signature': signatureObj.signature,
      'X-HL-Timestamp': signatureObj.timestamp,
      'X-HL-Api-Key': this.credentials.apiKey
    };
    
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' ? JSON.stringify(payload) : undefined
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hyperliquid API error (${response.status}): ${errorText}`);
      }
      
      return await response.json() as T;
    } catch (error) {
      console.error(`Error in Hyperliquid API request to ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Make public request to Hyperliquid API (no authentication)
   * @param endpoint API endpoint path
   * @param params Query parameters
   * @returns Promise resolving to response data
   */
  private async makePublicRequest<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    // Build query string
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.config.apiUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hyperliquid API error (${response.status}): ${errorText}`);
      }
      
      return await response.json() as T;
    } catch (error) {
      console.error(`Error in Hyperliquid public API request to ${endpoint}:`, error);
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
      // Hyperliquid uses different symbol format, normalize if needed
      const coin = symbol.split('/')[0].toUpperCase();
      
      // Get market info
      const marketInfo = await this.makePublicRequest<any>(`/info/meta`);
      const coinInfo = marketInfo.universe.find((item: any) => item.name === coin);
      
      if (!coinInfo) {
        throw new Error(`Symbol ${symbol} not found on Hyperliquid`);
      }
      
      // Get market data
      const marketData = await this.makePublicRequest<any>(`/info/ticker/${coin}`);
      
      // Normalize the response to our standard MarketData format
      return {
        symbol,
        timestamp: Date.now(),
        bid: parseFloat(marketData.levels.bids[0]?.px || '0'),
        ask: parseFloat(marketData.levels.asks[0]?.px || '0'),
        last: parseFloat(marketData.markPx || '0'),
        high: parseFloat(marketData.dayHighPx || '0'),
        low: parseFloat(marketData.dayLowPx || '0'),
        baseVolume: parseFloat(marketData.dayNotional || '0'),
        quoteVolume: parseFloat(marketData.dayNotional || '0'),
        percentChange24h: parseFloat(marketData.dayReturn || '0') * 100,
        exchangeSpecific: {
          fundingRate: marketData.fundingRate,
          openInterest: marketData.openInterest,
          indexPx: marketData.indexPx
        }
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
    // Extract the coin name from the symbol
    const coin = symbol.split('/')[0].toUpperCase();
    const subscriptionId = uuidv4();
    
    // Create WebSocket connection if not already connected
    if (!this.wsConnections.has('market')) {
      const ws = new WebSocket(this.config.wsUrl);
      
      ws.onopen = () => {
        console.log('Hyperliquid WebSocket connected');
        // Subscribe to market updates for the specific coin
        ws.send(JSON.stringify({
          method: 'subscribe',
          subscription: {
            type: 'allMids',
            coins: [coin]
          }
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          
          // Handle ticker updates
          if (data.channel === 'allMids' && this.marketDataSubscriptions.has(subscriptionId)) {
            const callbackFn = this.marketDataSubscriptions.get(subscriptionId);
            
            if (callbackFn && typeof callbackFn === 'function') {
              // Find the update for our coin
              const coinUpdate = data.data.find((update: any) => update.coin === coin);
              
              if (coinUpdate) {
                // Convert to standard MarketData format
                const marketData: MarketData = {
                  symbol,
                  timestamp: Date.now(),
                  bid: parseFloat(coinUpdate.bid || '0'),
                  ask: parseFloat(coinUpdate.ask || '0'),
                  last: parseFloat(coinUpdate.mid || '0'),
                  high: 0, // Not included in WebSocket updates
                  low: 0, // Not included in WebSocket updates
                  baseVolume: 0, // Not included in WebSocket updates
                  quoteVolume: 0, // Not included in WebSocket updates
                  percentChange24h: 0, // Not included in WebSocket updates
                };
                
                callbackFn(marketData);
              }
            }
          }
        } catch (e) {
          console.error('Error processing WebSocket message:', e);
        }
      };
      
      ws.onerror = (error) => {
        console.error('Hyperliquid WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('Hyperliquid WebSocket connection closed');
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
      // Get user state (balances and positions)
      const userState = await this.makeAuthRequest<any>('/user/state', 'POST', {
        wallet: this.credentials?.additionalParams?.wallet || ''
      });
      
      // Format balances
      const balances: Balance[] = [
        {
          asset: 'USD',
          free: parseFloat(userState.marginSummary.accountValue || '0'),
          used: parseFloat(userState.marginSummary.totalMarginUsed || '0'),
          total: parseFloat(userState.marginSummary.accountValue || '0')
        }
      ];
      
      // Format positions
      const positions = userState.assetPositions.map((pos: any) => ({
        symbol: `${pos.coin}/USD`,
        size: parseFloat(pos.position || '0'),
        entryPrice: parseFloat(pos.entryPx || '0'),
        markPrice: parseFloat(pos.markPx || '0'),
        liquidationPrice: parseFloat(pos.liquidationPx || '0'),
        unrealizedPnl: parseFloat(pos.unrealizedPnl || '0'),
        leverage: parseFloat(pos.leverage || '1'),
        side: parseFloat(pos.position || '0') >= 0 ? 'long' : 'short'
      }));
      
      return {
        exchangeId: this.exchangeId,
        exchangeName: this.name,
        balances,
        positions,
        tradingFees: {
          makerFee: -0.0002, // -0.02% (negative means rebate)
          takerFee: 0.0005,  // 0.05%
        },
        fetchTimestamp: Date.now(),
      };
    } catch (error) {
      console.error('Failed to get account information:', error);
      throw error;
    }
  }
  
  /**
   * Map Hyperliquid order type to standard type
   * @param hlType Hyperliquid order type
   * @returns Standardized order type
   */
  private mapOrderType(hlType: string): OrderResult['order']['type'] {
    switch (hlType) {
      case 'Limit':
        return 'limit';
      case 'Market':
        return 'market';
      case 'StopMarket':
        return 'stop';
      case 'StopLimit':
        return 'stop_limit';
      default:
        return 'limit';
    }
  }
  
  /**
   * Map Hyperliquid order status to standard status
   * @param hlStatus Hyperliquid status
   * @returns Standardized order status
   */
  private mapOrderStatus(hlStatus: string): OrderStatus {
    switch (hlStatus) {
      case 'Open':
        return 'open';
      case 'Filled':
        return 'filled';
      case 'PartiallyFilled':
        return 'partial_fill';
      case 'Cancelled':
        return 'canceled';
      case 'Rejected':
        return 'rejected';
      default:
        return 'open';
    }
  }
  
  /**
   * Place an order on Hyperliquid
   * @param params Order parameters
   * @returns Promise resolving to order result
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      // Extract the coin name from the symbol
      const coin = params.symbol.split('/')[0].toUpperCase();
      
      // Build the order object for Hyperliquid
      const orderData: any = {
        coin,
        side: params.side.toUpperCase(),
        size: params.quantity.toString(),
        clientId: params.clientOrderId || uuidv4().substring(0, 20), // Hyperliquid allows max 20 chars
      };
      
      // Handle different order types
      switch (params.type) {
        case 'market':
          orderData.orderType = 'Market';
          break;
          
        case 'limit':
          if (!params.price) {
            throw new Error('Price is required for limit orders');
          }
          orderData.orderType = 'Limit';
          orderData.limitPx = params.price.toString();
          
          // Handle post-only flag
          if (params.postOnly) {
            orderData.tif = 'PostOnly';
          } else {
            orderData.tif = 'Gtc'; // Good-till-cancelled is default
          }
          break;
          
        case 'stop':
          if (!params.stopPrice) {
            throw new Error('Stop price is required for stop orders');
          }
          orderData.orderType = 'StopMarket';
          orderData.triggerPx = params.stopPrice.toString();
          break;
          
        case 'stop_limit':
          if (!params.price || !params.stopPrice) {
            throw new Error('Price and stop price are required for stop-limit orders');
          }
          orderData.orderType = 'StopLimit';
          orderData.limitPx = params.price.toString();
          orderData.triggerPx = params.stopPrice.toString();
          break;
          
        default:
          throw new Error(`Unsupported order type: ${params.type}`);
      }
      
      // Add reduce-only flag if specified
      if (params.reduceOnly) {
        orderData.reduceOnly = true;
      }
      
      // Place the order
      const response = await this.makeAuthRequest<any>('/exchange/order', 'POST', {
        action: orderData,
        wallet: this.credentials?.additionalParams?.wallet || ''
      });
      
      // Check for error
      if (response.status !== 'ok') {
        return {
          success: false,
          error: response.response || 'Unknown error placing order',
        };
      }
      
      // Format the response
      const order: Order = {
        id: response.response.orderId,
        clientOrderId: orderData.clientId,
        symbol: params.symbol,
        timestamp: Date.now(),
        lastUpdateTimestamp: Date.now(),
        status: 'open', // Assume open initially
        type: params.type,
        side: params.side,
        price: params.price,
        quantity: params.quantity,
        filledQuantity: 0, // Not available in the initial response
        remainingQuantity: params.quantity,
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
   * Cancel an existing order
   * @param orderId Order identifier to cancel
   * @returns Promise resolving to boolean indicating success
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const response = await this.makeAuthRequest<any>('/exchange/cancel', 'POST', {
        cancels: [{
          orderId,
          coin: '', // Will be filled in from order status query
        }],
        wallet: this.credentials?.additionalParams?.wallet || ''
      });
      
      return response.status === 'ok';
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
      const response = await this.makeAuthRequest<any>('/exchange/orderStatus', 'POST', {
        orderId,
        wallet: this.credentials?.additionalParams?.wallet || ''
      });
      
      if (response.status !== 'ok' || !response.response) {
        throw new Error(`Order ${orderId} not found`);
      }
      
      const orderData = response.response;
      
      // Format into standard Order structure
      return {
        id: orderId,
        clientOrderId: orderData.clientId || '',
        symbol: `${orderData.coin}/USD`,
        timestamp: parseInt(orderData.timestamp) || Date.now(),
        lastUpdateTimestamp: parseInt(orderData.timestamp) || Date.now(),
        status: this.mapOrderStatus(orderData.status),
        type: this.mapOrderType(orderData.orderType),
        side: orderData.side.toLowerCase(),
        price: parseFloat(orderData.limitPx || '0'),
        stopPrice: parseFloat(orderData.triggerPx || '0'),
        quantity: parseFloat(orderData.size || '0'),
        filledQuantity: parseFloat(orderData.filledSize || '0'),
        remainingQuantity: parseFloat(orderData.size || '0') - parseFloat(orderData.filledSize || '0'),
        averageFillPrice: parseFloat(orderData.avgFillPx || '0'),
        fee: {
          amount: parseFloat(orderData.fee || '0'),
          currency: 'USD'
        },
        rawData: orderData
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
      // Extract coin if symbol provided
      const coin = symbol ? symbol.split('/')[0].toUpperCase() : undefined;
      
      const response = await this.makeAuthRequest<any>('/exchange/openOrders', 'POST', {
        coin, // If undefined, will return all open orders
        wallet: this.credentials?.additionalParams?.wallet || ''
      });
      
      if (response.status !== 'ok') {
        throw new Error('Failed to get open orders');
      }
      
      // Map the orders to our standard format
      return response.response.map((order: any) => ({
        id: order.orderId,
        clientOrderId: order.clientId || '',
        symbol: `${order.coin}/USD`,
        timestamp: parseInt(order.timestamp) || Date.now(),
        lastUpdateTimestamp: parseInt(order.timestamp) || Date.now(),
        status: 'open',
        type: this.mapOrderType(order.orderType),
        side: order.side.toLowerCase(),
        price: parseFloat(order.limitPx || '0'),
        stopPrice: parseFloat(order.triggerPx || '0'),
        quantity: parseFloat(order.size || '0'),
        filledQuantity: parseFloat(order.filledSize || '0'),
        remainingQuantity: parseFloat(order.size || '0') - parseFloat(order.filledSize || '0'),
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
      // Extract coin from symbol
      const coin = symbol.split('/')[0].toUpperCase();
      
      // Get historical orders
      const response = await this.makeAuthRequest<any>('/exchange/orderHistory', 'POST', {
        coin,
        limit,
        startTime: startTime ? Math.floor(startTime / 1000).toString() : undefined,
        endTime: endTime ? Math.floor(endTime / 1000).toString() : undefined,
        wallet: this.credentials?.additionalParams?.wallet || ''
      });
      
      if (response.status !== 'ok') {
        throw new Error('Failed to get order history');
      }
      
      // Map the orders to our standard format
      return response.response.map((order: any) => ({
        id: order.orderId,
        clientOrderId: order.clientId || '',
        symbol: `${order.coin}/USD`,
        timestamp: parseInt(order.timestamp) || Date.now(),
        lastUpdateTimestamp: parseInt(order.timestamp) || Date.now(),
        status: this.mapOrderStatus(order.status),
        type: this.mapOrderType(order.orderType),
        side: order.side.toLowerCase(),
        price: parseFloat(order.limitPx || '0'),
        stopPrice: parseFloat(order.triggerPx || '0'),
        quantity: parseFloat(order.size || '0'),
        filledQuantity: parseFloat(order.filledSize || '0'),
        remainingQuantity: parseFloat(order.size || '0') - parseFloat(order.filledSize || '0'),
        averageFillPrice: parseFloat(order.avgFillPx || '0'),
        fee: {
          amount: parseFloat(order.fee || '0'),
          currency: 'USD'
        },
        rawData: order
      }));
    } catch (error) {
      console.error(`Failed to get order history for ${symbol}:`, error);
      throw error;
    }
  }
}
