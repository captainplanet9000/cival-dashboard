/**
 * Exchange Client
 * 
 * Provides a typed interface for interacting with cryptocurrency exchange APIs
 * Handles connection pooling, retry logic, and error normalization
 */

import { ApiGateway, ApiServiceType, ApiResponse } from '../api-gateway';
import { MonitoringService } from '../monitoring-service';

// Standard market data structure
export interface MarketData {
  symbol: string;
  interval: string;
  candles: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

// Order types
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderTimeInForce = 'gtc' | 'ioc' | 'fok';
export type OrderStatus = 'open' | 'closed' | 'canceled' | 'expired' | 'rejected';

// Order request parameters
export interface OrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  amount: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: OrderTimeInForce;
  leverage?: number;
  reduceOnly?: boolean;
  postOnly?: boolean;
  clientOrderId?: string;
}

// Order response structure
export interface Order {
  id: string;
  clientOrderId?: string;
  timestamp: number;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  timeInForce?: OrderTimeInForce;
  status: OrderStatus;
  price?: number;
  stopPrice?: number;
  amount: number;
  filled: number;
  remaining: number;
  cost: number;
  fee: number;
  feeCurrency: string;
  average?: number;
}

// Balance structure
export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

// Account balance response
export interface AccountBalance {
  balances: Balance[];
  timestamp: number;
}

// Position structure
export interface Position {
  symbol: string;
  size: number;
  side: OrderSide | 'flat';
  entryPrice: number;
  markPrice: number;
  liquidationPrice?: number;
  margin: number;
  leverage: number;
  unrealizedPnl: number;
  realizedPnl: number;
  marginType: 'isolated' | 'cross';
  timestamp: number;
}

// Exchange information
export interface ExchangeInfo {
  name: string;
  markets: {
    symbol: string;
    base: string;
    quote: string;
    type: 'spot' | 'margin' | 'futures' | 'option';
    active: boolean;
    precision: {
      price: number;
      amount: number;
    };
    limits: {
      leverage?: {
        min: number;
        max: number;
      };
      amount: {
        min: number;
        max: number;
      };
      price: {
        min: number;
        max: number;
      };
      cost: {
        min: number;
        max: number;
      };
    };
  }[];
}

export class ExchangeClient {
  private static instance: ExchangeClient;
  private apiGateway: ApiGateway;
  private connectionStatus: Map<string, boolean> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();
  
  private constructor() {
    this.apiGateway = ApiGateway.getInstance();
    // Initialize connection status for supported exchanges
    ['bybit', 'coinbase', 'hyperliquid'].forEach(exchange => {
      this.connectionStatus.set(exchange, false);
    });
  }
  
  // Singleton pattern
  public static getInstance(): ExchangeClient {
    if (!ExchangeClient.instance) {
      ExchangeClient.instance = new ExchangeClient();
    }
    return ExchangeClient.instance;
  }
  
  /**
   * Get market data from an exchange
   */
  public async getMarketData(
    exchange: string,
    symbol: string,
    interval: string = '1h',
    limit: number = 100,
    since?: number
  ): Promise<ApiResponse<MarketData>> {
    try {
      const response = await this.apiGateway.serviceRequest<MarketData>(
        ApiServiceType.EXCHANGE,
        `/${exchange}/market-data/${symbol}`,
        {
          method: 'GET',
          body: { interval, limit, since },
          useCache: true,
          cacheTime: 60000, // Cache for 1 minute
          retries: 2
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get market data for ${symbol} on ${exchange}`,
        data: { error, exchange, symbol, interval }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get latest price for a symbol
   */
  public async getLatestPrice(
    exchange: string,
    symbol: string
  ): Promise<ApiResponse<number>> {
    try {
      const response = await this.apiGateway.serviceRequest<{ price: number }>(
        ApiServiceType.EXCHANGE,
        `/${exchange}/ticker/${symbol}`,
        {
          method: 'GET',
          useCache: true,
          cacheTime: 10000, // Cache for 10 seconds
          retries: 2
        }
      );
      
      return {
        data: response.data?.price || null,
        error: response.error,
        status: response.status
      };
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get latest price for ${symbol} on ${exchange}`,
        data: { error, exchange, symbol }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Place an order on an exchange
   */
  public async placeOrder(
    exchange: string,
    params: OrderParams
  ): Promise<ApiResponse<Order>> {
    try {
      // Log order attempt
      MonitoringService.logEvent({
        type: 'info',
        message: `Placing ${params.side} ${params.type} order for ${params.amount} ${params.symbol} on ${exchange}`,
        data: { exchange, params }
      });
      
      const response = await this.apiGateway.serviceRequest<Order>(
        ApiServiceType.EXCHANGE,
        `/${exchange}/orders`,
        {
          method: 'POST',
          body: params,
          requireAuth: true,
          retries: 1 // Limited retries for orders to avoid duplicates
        }
      );
      
      // Log order result
      if (response.error) {
        MonitoringService.logEvent({
          type: 'error',
          message: `Order placement failed on ${exchange}`,
          data: { error: response.error, exchange, params }
        });
      } else {
        MonitoringService.logEvent({
          type: 'order',
          message: `Order placed successfully on ${exchange}`,
          data: { order: response.data, exchange }
        });
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to place order on ${exchange}`,
        data: { error, exchange, params }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Cancel an order on an exchange
   */
  public async cancelOrder(
    exchange: string,
    symbol: string,
    orderId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.apiGateway.serviceRequest<{ success: boolean }>(
        ApiServiceType.EXCHANGE,
        `/${exchange}/orders/${orderId}`,
        {
          method: 'DELETE',
          body: { symbol },
          requireAuth: true,
          retries: 2
        }
      );
      
      return {
        data: response.data?.success || false,
        error: response.error,
        status: response.status
      };
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to cancel order ${orderId} on ${exchange}`,
        data: { error, exchange, symbol, orderId }
      });
      
      return {
        data: false,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get account balances from an exchange
   */
  public async getAccountBalance(
    exchange: string
  ): Promise<ApiResponse<AccountBalance>> {
    try {
      const response = await this.apiGateway.serviceRequest<AccountBalance>(
        ApiServiceType.EXCHANGE,
        `/${exchange}/balance`,
        {
          method: 'GET',
          requireAuth: true,
          retries: 2
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get account balance on ${exchange}`,
        data: { error, exchange }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get open positions from an exchange
   */
  public async getPositions(
    exchange: string,
    symbol?: string
  ): Promise<ApiResponse<Position[]>> {
    try {
      const path = symbol 
        ? `/${exchange}/positions/${symbol}`
        : `/${exchange}/positions`;
        
      const response = await this.apiGateway.serviceRequest<Position[]>(
        ApiServiceType.EXCHANGE,
        path,
        {
          method: 'GET',
          requireAuth: true,
          retries: 2
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get positions on ${exchange}`,
        data: { error, exchange, symbol }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get exchange information and available markets
   */
  public async getExchangeInfo(
    exchange: string
  ): Promise<ApiResponse<ExchangeInfo>> {
    try {
      const response = await this.apiGateway.serviceRequest<ExchangeInfo>(
        ApiServiceType.EXCHANGE,
        `/${exchange}/info`,
        {
          method: 'GET',
          useCache: true,
          cacheTime: 3600000, // Cache for 1 hour
          retries: 2
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get exchange info for ${exchange}`,
        data: { error, exchange }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Connect to real-time WebSocket updates for a market
   */
  public subscribeToMarket(
    exchange: string,
    symbol: string,
    callback: (data: any) => void
  ): () => void {
    const wsKey = `${exchange}:${symbol}`;
    
    // Don't create duplicate connections
    if (this.wsConnections.has(wsKey)) {
      const ws = this.wsConnections.get(wsKey)!;
      if (ws.readyState === WebSocket.OPEN) {
        return () => this.unsubscribeFromMarket(exchange, symbol);
      }
      
      // If connection exists but is not open, close it and create a new one
      ws.close();
      this.wsConnections.delete(wsKey);
    }
    
    try {
      // Determine WebSocket endpoint based on exchange
      let wsEndpoint = '';
      switch (exchange) {
        case 'bybit':
          wsEndpoint = `wss://stream.bybit.com/v5/public/spot`;
          break;
        case 'coinbase':
          wsEndpoint = `wss://ws-feed.exchange.coinbase.com`;
          break;
        case 'hyperliquid':
          wsEndpoint = `wss://api.hyperliquid.xyz/ws`;
          break;
        default:
          throw new Error(`Unsupported exchange: ${exchange}`);
      }
      
      // Create WebSocket connection
      const ws = new WebSocket(wsEndpoint);
      this.wsConnections.set(wsKey, ws);
      
      ws.onopen = () => {
        this.connectionStatus.set(exchange, true);
        MonitoringService.logEvent({
          type: 'info',
          message: `WebSocket connection established for ${symbol} on ${exchange}`,
          data: { exchange, symbol }
        });
        
        // Subscribe to the appropriate channel based on exchange
        const subscribeMessage = this.getSubscriptionMessage(exchange, symbol);
        ws.send(JSON.stringify(subscribeMessage));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          MonitoringService.logEvent({
            type: 'error',
            message: `Failed to parse WebSocket message for ${symbol} on ${exchange}`,
            data: { error, exchange, symbol, rawData: event.data }
          });
        }
      };
      
      ws.onerror = (error) => {
        this.connectionStatus.set(exchange, false);
        MonitoringService.logEvent({
          type: 'error',
          message: `WebSocket error for ${symbol} on ${exchange}`,
          data: { error, exchange, symbol }
        });
      };
      
      ws.onclose = () => {
        this.connectionStatus.set(exchange, false);
        this.wsConnections.delete(wsKey);
        MonitoringService.logEvent({
          type: 'info',
          message: `WebSocket connection closed for ${symbol} on ${exchange}`,
          data: { exchange, symbol }
        });
        
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (!this.wsConnections.has(wsKey)) {
            this.subscribeToMarket(exchange, symbol, callback);
          }
        }, 5000);
      };
      
      // Return unsubscribe function
      return () => this.unsubscribeFromMarket(exchange, symbol);
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to subscribe to ${symbol} on ${exchange}`,
        data: { error, exchange, symbol }
      });
      
      // Return no-op unsubscribe function
      return () => {};
    }
  }
  
  /**
   * Unsubscribe from WebSocket updates
   */
  private unsubscribeFromMarket(exchange: string, symbol: string): void {
    const wsKey = `${exchange}:${symbol}`;
    const ws = this.wsConnections.get(wsKey);
    
    if (ws) {
      // Send unsubscribe message if connection is open
      if (ws.readyState === WebSocket.OPEN) {
        const unsubscribeMessage = this.getUnsubscriptionMessage(exchange, symbol);
        ws.send(JSON.stringify(unsubscribeMessage));
      }
      
      // Close the connection
      ws.close();
      this.wsConnections.delete(wsKey);
    }
  }
  
  /**
   * Get subscription message based on exchange
   */
  private getSubscriptionMessage(exchange: string, symbol: string): any {
    switch (exchange) {
      case 'bybit':
        return {
          op: 'subscribe',
          args: [`tickers.${symbol}`]
        };
      case 'coinbase':
        return {
          type: 'subscribe',
          product_ids: [symbol],
          channels: ['ticker']
        };
      case 'hyperliquid':
        return {
          method: 'subscribe',
          subscription: {
            type: 'market',
            coin: symbol.split('-')[0]
          }
        };
      default:
        return {};
    }
  }
  
  /**
   * Get unsubscription message based on exchange
   */
  private getUnsubscriptionMessage(exchange: string, symbol: string): any {
    switch (exchange) {
      case 'bybit':
        return {
          op: 'unsubscribe',
          args: [`tickers.${symbol}`]
        };
      case 'coinbase':
        return {
          type: 'unsubscribe',
          product_ids: [symbol],
          channels: ['ticker']
        };
      case 'hyperliquid':
        return {
          method: 'unsubscribe',
          subscription: {
            type: 'market',
            coin: symbol.split('-')[0]
          }
        };
      default:
        return {};
    }
  }
  
  /**
   * Check if a WebSocket connection is active
   */
  public isConnected(exchange: string): boolean {
    return this.connectionStatus.get(exchange) || false;
  }
  
  /**
   * Close all WebSocket connections
   */
  public closeAllConnections(): void {
    this.wsConnections.forEach((ws, key) => {
      ws.close();
    });
    this.wsConnections.clear();
    
    this.connectionStatus.forEach((_, key) => {
      this.connectionStatus.set(key, false);
    });
  }
}
