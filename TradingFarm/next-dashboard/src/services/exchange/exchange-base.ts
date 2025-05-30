/**
 * Base Exchange Interface for Trading Farm
 * This serves as the foundation for all exchange connectors
 */

export interface MarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
  [key: string]: any;
}

export interface OrderType {
  MARKET: 'MARKET';
  LIMIT: 'LIMIT';
  STOP_MARKET: 'STOP_MARKET';
  STOP_LIMIT: 'STOP_LIMIT';
  TRAILING_STOP: 'TRAILING_STOP';
}

export interface PositionSide {
  LONG: 'LONG';
  SHORT: 'SHORT';
}

export interface OrderStatus {
  NEW: 'NEW';
  PARTIALLY_FILLED: 'PARTIALLY_FILLED';
  FILLED: 'FILLED';
  CANCELED: 'CANCELED';
  REJECTED: 'REJECTED';
  EXPIRED: 'EXPIRED';
}

export interface Position {
  symbol: string;
  side: keyof PositionSide;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  size: number;
  leverage: number;
  liquidationPrice?: number;
  timestamp: number;
  [key: string]: any;
}

export interface OrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: keyof OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  reduceOnly?: boolean;
  postOnly?: boolean;
  clientOrderId?: string;
  leverage?: number;
  [key: string]: any;
}

export interface Order {
  id: string;
  clientOrderId?: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: keyof OrderType;
  status: keyof OrderStatus;
  price?: number;
  stopPrice?: number;
  quantity: number;
  executedQuantity: number;
  remainingQuantity: number;
  leverage?: number;
  reduceOnly: boolean;
  postOnly: boolean;
  timestamp: number;
  updateTime?: number;
  [key: string]: any;
}

export interface AccountBalance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  [key: string]: any;
}

export interface ExchangeOptions {
  apiKey?: string;
  apiSecret?: string;
  apiPassphrase?: string;
  testnet: boolean;
  timeout?: number;
  proxy?: string;
  [key: string]: any;
}

/**
 * Base Exchange interface that all exchange connectors must implement
 */
export interface IExchange {
  // Core methods
  initialize(options: ExchangeOptions): Promise<boolean>;
  isInitialized(): boolean;
  getExchangeInfo(): Promise<any>;
  
  // Market data methods
  getTicker(symbol: string): Promise<MarketData>;
  getOrderBook(symbol: string, limit?: number): Promise<any>;
  getRecentTrades(symbol: string, limit?: number): Promise<any[]>;
  getCandles(symbol: string, interval: string, limit?: number, startTime?: number, endTime?: number): Promise<any[]>;
  
  // Trading methods
  placeOrder(params: OrderParams): Promise<Order>;
  cancelOrder(symbol: string, orderId: string): Promise<boolean>;
  cancelAllOrders(symbol?: string): Promise<boolean>;
  getOrder(symbol: string, orderId: string): Promise<Order>;
  getOpenOrders(symbol?: string): Promise<Order[]>;
  getOrderHistory(symbol?: string, limit?: number): Promise<Order[]>;
  
  // Account methods
  getAccountBalance(): Promise<AccountBalance[]>;
  getPositions(symbol?: string): Promise<Position[]>;
  
  // Stream methods
  subscribeToTicker(symbol: string, callback: (data: MarketData) => void): Promise<any>;
  subscribeToOrderBook(symbol: string, callback: (data: any) => void): Promise<any>;
  subscribeToTrades(symbol: string, callback: (data: any) => void): Promise<any>;
  subscribeToCandles(symbol: string, interval: string, callback: (data: any) => void): Promise<any>;
  subscribeToUserData(callback: (data: any) => void): Promise<any>;
  unsubscribe(subscription: any): Promise<boolean>;
  
  // Utility methods
  getServerTime(): Promise<number>;
  calculateFee(symbol: string, type: string, side: string, amount: number, price: number): Promise<number>;
}

/**
 * Abstract base exchange class with some common implementations
 */
export abstract class BaseExchange implements IExchange {
  protected initialized = false;
  protected options: ExchangeOptions;
  protected static DEFAULT_OPTIONS: ExchangeOptions = {
    testnet: true,
    timeout: 30000
  };
  
  constructor(options: Partial<ExchangeOptions> = {}) {
    this.options = {
      ...BaseExchange.DEFAULT_OPTIONS,
      ...options
    };
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  abstract initialize(options: ExchangeOptions): Promise<boolean>;
  abstract getExchangeInfo(): Promise<any>;
  abstract getTicker(symbol: string): Promise<MarketData>;
  abstract getOrderBook(symbol: string, limit?: number): Promise<any>;
  abstract getRecentTrades(symbol: string, limit?: number): Promise<any[]>;
  abstract getCandles(symbol: string, interval: string, limit?: number, startTime?: number, endTime?: number): Promise<any[]>;
  abstract placeOrder(params: OrderParams): Promise<Order>;
  abstract cancelOrder(symbol: string, orderId: string): Promise<boolean>;
  abstract cancelAllOrders(symbol?: string): Promise<boolean>;
  abstract getOrder(symbol: string, orderId: string): Promise<Order>;
  abstract getOpenOrders(symbol?: string): Promise<Order[]>;
  abstract getOrderHistory(symbol?: string, limit?: number): Promise<Order[]>;
  abstract getAccountBalance(): Promise<AccountBalance[]>;
  abstract getPositions(symbol?: string): Promise<Position[]>;
  abstract subscribeToTicker(symbol: string, callback: (data: MarketData) => void): Promise<any>;
  abstract subscribeToOrderBook(symbol: string, callback: (data: any) => void): Promise<any>;
  abstract subscribeToTrades(symbol: string, callback: (data: any) => void): Promise<any>;
  abstract subscribeToCandles(symbol: string, interval: string, callback: (data: any) => void): Promise<any>;
  abstract subscribeToUserData(callback: (data: any) => void): Promise<any>;
  abstract unsubscribe(subscription: any): Promise<boolean>;
  abstract getServerTime(): Promise<number>;
  abstract calculateFee(symbol: string, type: string, side: string, amount: number, price: number): Promise<number>;
  
  protected validateAndFormatSymbol(symbol: string): string {
    // Default implementation, exchanges can override
    return symbol.toUpperCase();
  }
  
  protected async handleResponse<T>(promise: Promise<Response>): Promise<T> {
    try {
      const response = await promise;
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Exchange API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }
      return await response.json() as T;
    } catch (error: any) {
      throw new Error(`Exchange request failed: ${error.message}`);
    }
  }
  
  protected getTimestamp(): number {
    return Date.now();
  }
}

// Error classes for exchange operations
export class ExchangeApiError extends Error {
  code: number;
  
  constructor(message: string, code: number) {
    super(message);
    this.name = 'ExchangeApiError';
    this.code = code;
  }
}

export class ExchangeAuthError extends ExchangeApiError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'ExchangeAuthError';
  }
}

export class ExchangeRateLimitError extends ExchangeApiError {
  constructor(message: string) {
    super(message, 429);
    this.name = 'ExchangeRateLimitError';
  }
}

export class ExchangeNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExchangeNetworkError';
  }
}
