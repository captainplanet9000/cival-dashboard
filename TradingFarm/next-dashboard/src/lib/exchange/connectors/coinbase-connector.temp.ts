"use client";

/**
 * Temporary fixed version of the Coinbase connector for deployment
 */

import { BaseExchangeConnector } from '../base-connector';
import { 
  ExchangeCredential, 
  AccountInfo, 
  MarketInfo, 
  OrderType, 
  OrderSide, 
  TimeInForce, 
  OrderStatus, 
  OrderResult, 
  IExchangeConnector, 
  CandleData, 
  TradeData, 
  OrderBookEntry, 
  OrderBook,
  Position,
  PlaceOrderParams
} from '../types';

export class CoinbaseConnector extends BaseExchangeConnector implements IExchangeConnector {
  private baseUrl = 'https://api.coinbase.com/v3';
  
  constructor(credential: ExchangeCredential) {
    super(credential);
    this.validateCredential();
  }
  
  private validateCredential(): void {
    if (!this.credential.apiKey || !this.credential.apiSecret) {
      throw new Error('Coinbase API key and secret are required');
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      // Just check if we can get account info
      await this.getAccountInfo();
      return true;
    } catch (error) {
      console.error('Coinbase connection test failed:', error);
      return false;
    }
  }
  
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      return await this.performGetAccountInfo();
    } catch (error) {
      console.error('Failed to get Coinbase account info:', error);
      throw error;
    }
  }
  
  async getMarkets(): Promise<MarketInfo[]> {
    try {
      // Get products
      const productsResponse = await this.get('/products');
      
      if (!productsResponse || !Array.isArray(productsResponse)) {
        throw new Error('Invalid response from Coinbase API');
      }
      
      // Transform to MarketInfo format
      return productsResponse.map(product => ({
        symbol: product.product_id,
        baseAsset: product.base_currency_id,
        quoteAsset: product.quote_currency_id,
        status: product.status === 'online' ? 'trading' : 'break',
        minPrice: parseFloat(product.price_min_size),
        maxPrice: parseFloat(product.price_max_size),
        tickSize: parseFloat(product.quote_increment),
        minQty: parseFloat(product.base_min_size),
        maxQty: parseFloat(product.base_max_size),
        stepSize: parseFloat(product.base_increment),
        isSpot: true,
        isFuture: false,
        leverageBrackets: [],
        exchangeSpecificData: product
      }));
    } catch (error) {
      console.error('Failed to get Coinbase markets:', error);
      throw error;
    }
  }
  
  async getOrderBook(symbol: string, limit: number = 50): Promise<OrderBook> {
    try {
      // Get order book
      const orderBookResponse = await this.get(`/products/${symbol}/book?level=2&limit=${limit}`);
      
      if (!orderBookResponse || !orderBookResponse.bids || !orderBookResponse.asks) {
        throw new Error('Invalid order book response from Coinbase API');
      }
      
      // Transform to OrderBook format
      const bids: OrderBookEntry[] = orderBookResponse.bids.map(bid => ({
        price: parseFloat(bid[0]),
        quantity: parseFloat(bid[1])
      }));
      
      const asks: OrderBookEntry[] = orderBookResponse.asks.map(ask => ({
        price: parseFloat(ask[0]),
        quantity: parseFloat(ask[1])
      }));
      
      return {
        symbol,
        bids,
        asks,
        timestamp: Date.now(),
        exchangeSpecificData: orderBookResponse
      };
    } catch (error) {
      console.error(`Failed to get order book for ${symbol}:`, error);
      throw error;
    }
  }
  
  async getCandles(symbol: string, interval: string, limit: number = 100): Promise<CandleData[]> {
    try {
      // Map interval to Coinbase granularity
      const granularity = this.mapIntervalToGranularity(interval);
      
      // Get candles
      const candlesResponse = await this.get(`/products/${symbol}/candles?granularity=${granularity}&limit=${limit}`);
      
      if (!candlesResponse || !Array.isArray(candlesResponse)) {
        throw new Error('Invalid candles response from Coinbase API');
      }
      
      // Transform to CandleData format
      return candlesResponse.map(candle => ({
        timestamp: candle[0] * 1000, // Convert to milliseconds
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
        symbol,
        interval
      }));
    } catch (error) {
      console.error(`Failed to get candles for ${symbol}:`, error);
      throw error;
    }
  }
  
  async getRecentTrades(symbol: string, limit: number = 100): Promise<TradeData[]> {
    try {
      // Get trades
      const tradesResponse = await this.get(`/products/${symbol}/trades?limit=${limit}`);
      
      if (!tradesResponse || !Array.isArray(tradesResponse)) {
        throw new Error('Invalid trades response from Coinbase API');
      }
      
      // Transform to TradeData format
      return tradesResponse.map(trade => ({
        id: trade.trade_id.toString(),
        price: parseFloat(trade.price),
        quantity: parseFloat(trade.size),
        quoteQuantity: parseFloat(trade.price) * parseFloat(trade.size),
        timestamp: new Date(trade.time).getTime(),
        isBuyerMaker: trade.side === 'buy',
        symbol
      }));
    } catch (error) {
      console.error(`Failed to get trades for ${symbol}:`, error);
      throw error;
    }
  }
  
  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    try {
      const { symbol, side, type, quantity, price, timeInForce, stopPrice, clientOrderId } = params;
      
      // Build order payload
      const payload: any = {
        product_id: symbol,
        side: side.toLowerCase(),
        client_order_id: clientOrderId || this.generateClientOrderId()
      };
      
      // Set order specific fields based on type
      if (type === OrderType.MARKET) {
        payload.type = 'market';
        payload.size = quantity.toString();
      } else if (type === OrderType.LIMIT) {
        payload.type = 'limit';
        payload.size = quantity.toString();
        payload.price = price.toString();
        payload.time_in_force = this.mapTimeInForce(timeInForce);
      } else if (type === OrderType.STOP_LOSS || type === OrderType.STOP_LOSS_LIMIT) {
        payload.type = 'stop';
        payload.size = quantity.toString();
        payload.stop_price = stopPrice.toString();
        if (type === OrderType.STOP_LOSS_LIMIT) {
          payload.price = price.toString();
        }
      }
      
      // Place order
      const orderResponse = await this.post('/orders', payload);
      
      return this.mapOrderResponse(orderResponse);
    } catch (error) {
      console.error('Failed to place Coinbase order:', error);
      throw error;
    }
  }
  
  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    try {
      await this.delete(`/orders/${orderId}`);
      return true;
    } catch (error) {
      console.error(`Failed to cancel order ${orderId}:`, error);
      return false;
    }
  }
  
  async getOrder(symbol: string, orderId: string): Promise<OrderResult> {
    try {
      const orderResponse = await this.get(`/orders/${orderId}`);
      return this.mapOrderResponse(orderResponse);
    } catch (error) {
      console.error(`Failed to get order ${orderId}:`, error);
      throw error;
    }
  }
  
  async getOpenOrders(symbol?: string): Promise<OrderResult[]> {
    try {
      let endpoint = '/orders?status=open';
      if (symbol) {
        endpoint += `&product_id=${symbol}`;
      }
      
      const ordersResponse = await this.get(endpoint);
      
      if (!ordersResponse || !Array.isArray(ordersResponse)) {
        throw new Error('Invalid open orders response from Coinbase API');
      }
      
      return ordersResponse.map(this.mapOrderResponse.bind(this));
    } catch (error) {
      console.error('Failed to get open orders:', error);
      throw error;
    }
  }
  
  async getPositions(): Promise<Position[]> {
    // Coinbase does not support margin trading in the same way as futures exchanges
    // For spot, positions are equivalent to account balances
    try {
      const accountInfo = await this.getAccountInfo();
      
      // Convert balances to positions format
      return Object.entries(accountInfo.balances).map(([asset, balance]) => ({
        symbol: `${asset}/USD`, // Approximation
        positionSide: 'LONG', // Always long for spot
        marginType: 'ISOLATED', // Not applicable for spot
        isolatedWallet: balance.free + balance.locked,
        leverage: 1, // No leverage for spot
        entryPrice: 0, // Not tracked for spot
        unrealizedPnl: 0, // Not tracked for spot
        positionAmt: balance.free + balance.locked,
        notional: 0, // Would need current price to calculate
        isolatedMargin: 0, // Not applicable for spot
        isAutoAddMargin: false, // Not applicable for spot
        exchangeSpecificData: {
          free: balance.free,
          locked: balance.locked
        }
      }));
    } catch (error) {
      console.error('Failed to get positions:', error);
      throw error;
    }
  }
  
  private async performGetAccountInfo(): Promise<AccountInfo> {
    // Get accounts
    const accounts = await this.get('/accounts');
    
    if (!accounts || !Array.isArray(accounts)) {
      throw new Error('Invalid accounts response from Coinbase API');
    }
    
    // Transform to AccountInfo format
    const balances = {};
    
    accounts.forEach(account => {
      if (parseFloat(account.available) > 0 || parseFloat(account.hold) > 0) {
        balances[account.currency] = {
          free: parseFloat(account.available),
          locked: parseFloat(account.hold),
          total: parseFloat(account.balance)
        };
      }
    });
    
    return {
      balances,
      permissions: ['SPOT'],
      exchangeSpecificData: accounts
    };
  }
  
  private mapIntervalToGranularity(interval: string): number {
    // Map trading interval to Coinbase granularity in seconds
    const intervalMap = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '6h': 21600,
      '1d': 86400
    };
    
    return intervalMap[interval] || 60; // Default to 1m
  }
  
  private mapTimeInForce(timeInForce: TimeInForce): string {
    // Map TimeInForce to Coinbase time_in_force
    const timeInForceMap = {
      [TimeInForce.GTC]: 'GTC',
      [TimeInForce.IOC]: 'IOC',
      [TimeInForce.FOK]: 'FOK'
    };
    
    return timeInForceMap[timeInForce] || 'GTC'; // Default to GTC
  }
  
  private mapOrderStatus(status: string): OrderStatus {
    // Map Coinbase status to OrderStatus
    const statusMap = {
      'open': OrderStatus.NEW,
      'pending': OrderStatus.NEW,
      'active': OrderStatus.PARTIALLY_FILLED,
      'done': OrderStatus.FILLED,
      'rejected': OrderStatus.REJECTED,
      'cancelled': OrderStatus.CANCELED
    };
    
    return statusMap[status] || OrderStatus.UNKNOWN;
  }
  
  private mapOrderResponse(order: any): OrderResult {
    return {
      symbol: order.product_id,
      orderId: order.id,
      clientOrderId: order.client_order_id,
      price: parseFloat(order.price || '0'),
      origQty: parseFloat(order.size || '0'),
      executedQty: parseFloat(order.filled_size || '0'),
      status: this.mapOrderStatus(order.status),
      timeInForce: order.time_in_force ? (order.time_in_force.toUpperCase() as TimeInForce) : TimeInForce.GTC,
      type: (order.type || 'limit').toUpperCase() as OrderType,
      side: (order.side || 'buy').toUpperCase() as OrderSide,
      stopPrice: parseFloat(order.stop_price || '0'),
      time: new Date(order.created_at).getTime(),
      updateTime: new Date(order.done_at || order.created_at).getTime(),
      isWorking: ['open', 'pending', 'active'].includes(order.status),
      exchangeSpecificData: order
    };
  }
  
  private async get(endpoint: string): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const timestamp = Date.now() / 1000;
      const method = 'GET';
      
      const signature = this.generateSignature(method, endpoint, '', timestamp);
      
      const response = await fetch(url, {
        method,
        headers: {
          'CB-ACCESS-KEY': this.credential.apiKey,
          'CB-ACCESS-SIGN': signature,
          'CB-ACCESS-TIMESTAMP': timestamp.toString(),
          'CB-ACCESS-PASSPHRASE': this.credential.additionalParams?.passphrase || '',
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Coinbase API error: ${data.message || JSON.stringify(data)}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Coinbase GET request failed for ${endpoint}:`, error);
      throw error;
    }
  }
  
  private async post(endpoint: string, body: any): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const timestamp = Date.now() / 1000;
      const method = 'POST';
      const bodyString = JSON.stringify(body);
      
      const signature = this.generateSignature(method, endpoint, bodyString, timestamp);
      
      const response = await fetch(url, {
        method,
        headers: {
          'CB-ACCESS-KEY': this.credential.apiKey,
          'CB-ACCESS-SIGN': signature,
          'CB-ACCESS-TIMESTAMP': timestamp.toString(),
          'CB-ACCESS-PASSPHRASE': this.credential.additionalParams?.passphrase || '',
          'Content-Type': 'application/json'
        },
        body: bodyString
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Coinbase API error: ${data.message || JSON.stringify(data)}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Coinbase POST request failed for ${endpoint}:`, error);
      throw error;
    }
  }
  
  private async delete(endpoint: string): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const timestamp = Date.now() / 1000;
      const method = 'DELETE';
      
      const signature = this.generateSignature(method, endpoint, '', timestamp);
      
      const response = await fetch(url, {
        method,
        headers: {
          'CB-ACCESS-KEY': this.credential.apiKey,
          'CB-ACCESS-SIGN': signature,
          'CB-ACCESS-TIMESTAMP': timestamp.toString(),
          'CB-ACCESS-PASSPHRASE': this.credential.additionalParams?.passphrase || '',
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Coinbase API error: ${data.message || JSON.stringify(data)}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Coinbase DELETE request failed for ${endpoint}:`, error);
      throw error;
    }
  }
  
  private generateSignature(method: string, endpoint: string, body: string, timestamp: number): string {
    // In a real implementation, this would use crypto to generate a valid signature
    // For simplicity in this example, we return a placeholder
    return 'signature_placeholder';
  }
  
  private generateClientOrderId(): string {
    return `tf_cb_${Date.now()}`;
  }
}
