/**
 * Exchange Service - Core service for interacting with cryptocurrency exchanges
 * This service provides a unified interface for accessing different exchanges.
 * 
 * Enhanced with robust error handling for autonomous trading:
 * - Specific exchange error classification
 * - Retry logic for transient errors
 * - Order status confirmation
 * - Detailed transaction logging
 * - Slippage protection
 * - Rate limit management
 */
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { BybitApiService } from './exchanges/bybit-api-service';
import { CoinbaseApiService } from './exchanges/coinbase-api-service';
import { HyperliquidApiService } from './exchanges/hyperliquid-api-service';
import { MonitoringService } from './monitoring-service';
import { v4 as uuidv4 } from 'uuid';

export type ExchangeType = 'bybit' | 'coinbase' | 'hyperliquid' | 'binance' | 'mock' | 'dry-run';

/**
 * Enhanced error types for better error handling
 */
export enum ExchangeErrorType {
  // Connection errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_API_KEY = 'INVALID_API_KEY',
  EXPIRED_API_KEY = 'EXPIRED_API_KEY',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Order errors
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_ORDER = 'INVALID_ORDER',
  UNKNOWN_ORDER = 'UNKNOWN_ORDER',
  DUPLICATE_ORDER = 'DUPLICATE_ORDER',
  ORDER_FILLED = 'ORDER_FILLED',
  ORDER_CANCELED = 'ORDER_CANCELED',
  ORDER_REJECTED = 'ORDER_REJECTED',
  MIN_NOTIONAL = 'MIN_NOTIONAL',
  MAX_NUM_ORDERS = 'MAX_NUM_ORDERS',
  PRICE_OUTSIDE_ALLOWED_RANGE = 'PRICE_OUTSIDE_ALLOWED_RANGE',
  
  // Symbol errors
  INVALID_SYMBOL = 'INVALID_SYMBOL',
  TRADING_SUSPENDED = 'TRADING_SUSPENDED',
  
  // Market data errors
  MARKET_DATA_UNAVAILABLE = 'MARKET_DATA_UNAVAILABLE',
  
  // Server errors
  EXCHANGE_MAINTENANCE = 'EXCHANGE_MAINTENANCE',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  
  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Exchange error with enhanced classification
 */
export class ExchangeError extends Error {
  type: ExchangeErrorType;
  exchange: ExchangeType;
  httpStatus?: number;
  originalError?: any;
  isRetryable: boolean;
  context?: any;
  
  constructor(message: string, {
    type = ExchangeErrorType.UNKNOWN_ERROR,
    exchange,
    httpStatus,
    originalError,
    isRetryable = false,
    context = {}
  }: {
    type?: ExchangeErrorType;
    exchange: ExchangeType;
    httpStatus?: number;
    originalError?: any;
    isRetryable?: boolean;
    context?: any;
  }) {
    super(message);
    this.name = 'ExchangeError';
    this.type = type;
    this.exchange = exchange;
    this.httpStatus = httpStatus;
    this.originalError = originalError;
    this.isRetryable = isRetryable;
    this.context = context;
  }
}

export type MarketDataParams = {
  symbol: string;
  interval?: string; // Timeframe: 1m, 5m, 15m, 1h, 4h, 1d, etc.
  limit?: number;  // Number of candles
  startTime?: number; // Optional start time in milliseconds
  endTime?: number;   // Optional end time in milliseconds
};

export type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MarketData = {
  symbol: string;
  interval: string;
  candles: Candle[];
};

export type OrderParams = {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  amount: number;  // The quantity/size of the order
  price?: number;  // Required for limit orders
  stopPrice?: number; // Required for stop orders
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  reduceOnly?: boolean;
  postOnly?: boolean;
  clientOrderId?: string;
  leverage?: number;
  marginType?: 'isolated' | 'cross';
  takeProfitPrice?: number;
  stopLossPrice?: number;
  exchange: ExchangeType;
  apiKeys?: any; // API credentials to use (for autonomous agents)
  maxSlippagePercent?: number; // Maximum allowed slippage for market orders
};

export type OrderStatus = 'open' | 'closed' | 'canceled' | 'expired' | 'rejected' | 'unknown';

export type OrderResult = {
  id: string;           // Exchange order ID
  clientOrderId?: string;
  timestamp: number;    // Order creation time
  lastTradeTimestamp?: number;
  status: OrderStatus;
  symbol: string;
  type: string;
  side: string;
  price?: number;
  amount: number;
  filled: number;
  remaining: number;
  cost?: number;
  average?: number;     // Average fill price
  fee?: {
    currency: string;
    cost: number;
    rate?: number;
  };
  trades?: any[];
};

export type OrderStatusCheckResult = {
  id: string;
  status: OrderStatus;
  filled: number;
  remaining: number;
  average?: number;
  trades?: any[];
};

export interface ExchangeService {
  /**
   * Get candle data for a symbol
   */
  getMarketData(params: MarketDataParams): Promise<MarketData>;
  
  /**
   * Get the latest price for a symbol
   */
  getLatestPrice(symbol: string, exchange: ExchangeType): Promise<number | null>;
  
  /**
   * Get the order book for a symbol
   */
  getOrderBook(symbol: string, limit?: number): Promise<any>;
  
  /**
   * Get account balances
   */
  getAccountBalance(exchange: ExchangeType, apiKeys?: any): Promise<any>;
  
  /**
   * Place an order
   */
  placeOrder(params: OrderParams): Promise<OrderResult>;
  
  /**
   * Place an order with retry logic for transient errors
   */
  placeOrderWithRetry(params: OrderParams, maxRetries?: number, delayMs?: number): Promise<OrderResult>;
  
  /**
   * Cancel an order
   */
  cancelOrder(orderId: string, symbol: string, exchange: ExchangeType, apiKeys?: any): Promise<boolean>;
  
  /**
   * Check the status of an order
   */
  checkOrderStatus(orderId: string, exchange: ExchangeType, apiKeys?: any): Promise<OrderStatusCheckResult>;
  
  /**
   * Get active/open orders
   */
  getActiveOrders(symbol?: string, exchange?: ExchangeType, apiKeys?: any): Promise<OrderResult[]>;
  
  /**
   * Get order history
   */
  getOrderHistory(symbol?: string, since?: number, limit?: number, exchange?: ExchangeType, apiKeys?: any): Promise<OrderResult[]>;
  
  /**
   * Get exchange information (trading pairs, limits, etc.)
   */
  getExchangeInfo(exchange: ExchangeType): Promise<any>;
  
  /**
   * Get the exchange server time
   */
  getServerTime(exchange: ExchangeType): Promise<number>;
  
  /**
   * Fetch candles with error handling and retries
   */
  fetchCandles(symbol: string, exchange: ExchangeType, timeframe?: string, limit?: number): Promise<{
    time: number[];
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
  }>;
}

/**
 * Base Exchange Service with common functionality for all exchange implementations
 */
export abstract class BaseExchangeService implements ExchangeService {
  protected exchange: ExchangeType;
  protected credentials: any;
  protected maxRetries: number = 3;
  protected retryDelay: number = 1000;
  
  constructor(exchange: ExchangeType, credentials?: any) {
    this.exchange = exchange;
    this.credentials = credentials;
  }

  /**
   * Get market data with centralized error handling
   */
  async getMarketData(params: MarketDataParams): Promise<MarketData> {
    try {
      return await this.fetchMarketDataFromExchange(params);
    } catch (error) {
      const exchangeError = this.handleError(error, 'getMarketData', { params });
      throw exchangeError;
    }
  }

  /**
   * Get the latest price for a symbol
   */
  async getLatestPrice(symbol: string, exchange: ExchangeType): Promise<number | null> {
    try {
      return await this.fetchLatestPriceFromExchange(symbol);
    } catch (error) {
      const err = error as Error;
      const exchangeError = error instanceof ExchangeError ? error : new ExchangeError(`Failed to get latest price: ${err.message || 'Unknown error'}`, {
        type: ExchangeErrorType.UNKNOWN_ERROR,
        exchange: this.exchange,
        isRetryable: false,
        context: { symbol }
      });
      MonitoringService.logEvent({
        type: 'system.error',
        severity: 'error',
        subject: 'Exchange Error',
        message: `Failed to get latest price for ${symbol}: ${exchangeError.message}`,
        details: { 
          exchange: this.exchange,
          symbol,
          errorType: exchangeError.type
        },
        source: 'exchange-service'
      });
      return null;
    }
  }

  /**
   * Place an order with retry logic for transient errors
   */
  async placeOrderWithRetry(params: OrderParams, maxRetries: number = 3, delayMs: number = 1000): Promise<OrderResult> {
    let lastError: ExchangeError | null = null;
    let attempt = 0;

    // Log the order attempt
    MonitoringService.logEvent({
      type: 'trade.executed',
      severity: 'info',
      subject: 'Order Placement',
      message: `Attempting to place ${params.side} ${params.type} order for ${params.symbol}`,
      source: 'exchange-service',
      details: {
        exchange: params.exchange,
        symbol: params.symbol,
        side: params.side,
        type: params.type,
        amount: params.amount,
        price: params.price
      }
    });

    while (attempt < maxRetries) {
      try {
        attempt++;
        const result = await this.placeOrder(params);
        
        // Log successful order
        MonitoringService.logEvent({
          type: 'trade.executed',
          severity: 'info',
          subject: 'Order Executed',
          message: `Successfully placed order ${result.id}`,
          source: 'exchange-service',
          details: {
            exchange: params.exchange,
            symbol: params.symbol,
            orderId: result.id,
            side: result.side,
            status: result.status,
            filled: result.filled,
            price: result.average || result.price
          }
        });
        
        return result;
      } catch (error) {
        const exchangeError = this.handleError(error, 'placeOrder', { params });
        lastError = exchangeError;
        
        // Only retry for retryable errors
        if (!exchangeError.isRetryable) {
          MonitoringService.logEvent({
            type: 'trade.failed',
            severity: 'error',
            subject: 'Order Placement Failed',
            message: `Order placement failed with non-retryable error: ${exchangeError.message}`,
            source: 'exchange-service',
            details: {
              exchange: params.exchange,
              symbol: params.symbol,
              errorType: exchangeError.type,
              attempt
            }
          });
          break;
        }
        
        MonitoringService.logEvent({
          type: 'trade.failed',
          severity: 'warning',
          subject: 'Order Placement Retry',
          message: `Order placement failed, retrying (${attempt}/${maxRetries}): ${exchangeError.message}`,
          source: 'exchange-service',
          details: {
            exchange: params.exchange,
            symbol: params.symbol,
            errorType: exchangeError.type,
            attempt
          }
        });
        
        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
      }
    }

    // All retries failed
    const errorMessage = lastError ? lastError.message : 'Unknown error placing order';
    const errorType = lastError ? lastError.type : ExchangeErrorType.UNKNOWN_ERROR;
    
    MonitoringService.logEvent({
      type: 'trade.failed',
      severity: 'error',
      subject: 'Order Placement Failed',
      message: `All ${attempt} order placement attempts failed: ${errorMessage}`,
      source: 'exchange-service',
      details: {
        exchange: params.exchange,
        symbol: params.symbol,
        errorType,
        maxRetries
      }
    });
    
    throw lastError || new ExchangeError('Failed to place order after multiple attempts', {
      type: ExchangeErrorType.UNKNOWN_ERROR,
      exchange: params.exchange,
      isRetryable: false,
      context: params
    });
  }

  /**
   * Check order status with error handling
   */
  async checkOrderStatus(orderId: string, exchange: ExchangeType, apiKeys?: any): Promise<OrderStatusCheckResult> {
    try {
      return await this.fetchOrderStatusFromExchange(orderId, apiKeys);
    } catch (error) {
      const exchangeError = this.handleError(error, 'checkOrderStatus', { orderId, exchange });
      
      // For unknown order errors, return a standardized result to avoid breaking client code
      if (exchangeError.type === ExchangeErrorType.UNKNOWN_ORDER) {
        return {
          id: orderId,
          status: 'unknown',
          filled: 0,
          remaining: 0
        };
      }
      
      throw exchangeError;
    }
  }

  /**
   * Fetch candles with error handling and retries
   */
  async fetchCandles(
    symbol: string, 
    exchange: ExchangeType, 
    timeframe: string = '1h', 
    limit: number = 100
  ): Promise<{
    time: number[];
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
  }> {
    try {
      const params: MarketDataParams = {
        symbol,
        interval: timeframe,
        limit
      };
      
      const marketData = await this.getMarketData(params);
      
      // Transform the candles into the expected format
      return {
        time: marketData.candles.map(c => c.timestamp),
        open: marketData.candles.map(c => c.open),
        high: marketData.candles.map(c => c.high),
        low: marketData.candles.map(c => c.low),
        close: marketData.candles.map(c => c.close),
        volume: marketData.candles.map(c => c.volume)
      };
    } catch (error) {
      const exchangeError = this.handleError(error, 'fetchCandles', { symbol, timeframe, limit });
      throw exchangeError;
    }
  }

  // Abstract methods that must be implemented by specific exchange services
  protected abstract fetchMarketDataFromExchange(params: MarketDataParams): Promise<MarketData>;
  protected abstract fetchLatestPriceFromExchange(symbol: string): Promise<number>;
  protected abstract fetchOrderStatusFromExchange(orderId: string, apiKeys?: any): Promise<OrderStatusCheckResult>;
  
  /**
   * General error handler for exchange API errors
   * Classifies errors into specific types and determines if they are retryable
   */
  protected handleError(error: any, operation: string, context?: any): ExchangeError {
    // Default error information
    let message = error?.message || 'Unknown error occurred';
    let type = ExchangeErrorType.UNKNOWN_ERROR;
    let isRetryable = false;
    let httpStatus = error?.status || error?.statusCode || error?.code;
    
    // Classify network errors
    if (error?.name === 'AbortError' || message.includes('timeout')) {
      type = ExchangeErrorType.TIMEOUT;
      isRetryable = true;
    } else if (error?.name === 'NetworkError' || message.includes('network') || message.includes('ECONNREFUSED') || message.includes('ECONNRESET')) {
      type = ExchangeErrorType.NETWORK_ERROR;
      isRetryable = true;
    }
    
    // Classify rate limit errors
    else if (httpStatus === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      type = ExchangeErrorType.RATE_LIMIT;
      isRetryable = true;
    }
    
    // Classify authentication errors
    else if (httpStatus === 401 || message.includes('unauthorized') || message.includes('invalid signature')) {
      type = ExchangeErrorType.UNAUTHORIZED;
      isRetryable = false;
    } else if (message.includes('invalid key') || message.includes('invalid api key')) {
      type = ExchangeErrorType.INVALID_API_KEY;
      isRetryable = false;
    } else if (message.includes('expired') && message.includes('key')) {
      type = ExchangeErrorType.EXPIRED_API_KEY;
      isRetryable = false;
    } else if (message.includes('permission') || message.includes('not authorized')) {
      type = ExchangeErrorType.INSUFFICIENT_PERMISSIONS;
      isRetryable = false;
    }
    
    // Classify order errors
    else if (message.includes('insufficient fund') || message.includes('insufficient balance')) {
      type = ExchangeErrorType.INSUFFICIENT_FUNDS;
      isRetryable = false;
    } else if (message.includes('invalid order')) {
      type = ExchangeErrorType.INVALID_ORDER;
      isRetryable = false;
    } else if (message.includes('order not found') || message.includes('unknown order')) {
      type = ExchangeErrorType.UNKNOWN_ORDER;
      isRetryable = false;
    } else if (message.includes('duplicate') || message.includes('already exists')) {
      type = ExchangeErrorType.DUPLICATE_ORDER;
      isRetryable = false;
    } else if (message.includes('min notional')) {
      type = ExchangeErrorType.MIN_NOTIONAL;
      isRetryable = false;
    } else if (message.includes('max num orders')) {
      type = ExchangeErrorType.MAX_NUM_ORDERS;
      isRetryable = false;
    } else if (message.includes('price') && (message.includes('range') || message.includes('allowed'))) {
      type = ExchangeErrorType.PRICE_OUTSIDE_ALLOWED_RANGE;
      isRetryable = false;
    }
    
    // Classify symbol errors
    else if (message.includes('invalid symbol') || message.includes('unknown symbol')) {
      type = ExchangeErrorType.INVALID_SYMBOL;
      isRetryable = false;
    } else if (message.includes('trading suspended') || message.includes('market closed')) {
      type = ExchangeErrorType.TRADING_SUSPENDED;
      isRetryable = false;
    }
    
    // Classify server errors
    else if (message.includes('maintenance') || message.includes('system upgrade')) {
      type = ExchangeErrorType.EXCHANGE_MAINTENANCE;
      isRetryable = true;
    } else if (httpStatus >= 500 && httpStatus < 600) {
      type = ExchangeErrorType.INTERNAL_SERVER_ERROR;
      isRetryable = true;
    } else if (message.includes('service unavailable')) {
      type = ExchangeErrorType.SERVICE_UNAVAILABLE;
      isRetryable = true;
    }
    
    // Log the error
    MonitoringService.logEvent({
      type: 'system.error',
      severity: 'error',
      subject: 'Exchange API Error',
      message: `Exchange error during ${operation}: ${message}`,
      source: 'exchange-service',
      details: {
        exchange: this.exchange,
        errorType: type,
        operation,
        ...context
      }
    });
    
    return new ExchangeError(message, {
      type,
      exchange: this.exchange,
      httpStatus,
      originalError: error,
      isRetryable,
      context
    });
  }
  
  // These methods need to be implemented in subclasses
  abstract getOrderBook(symbol: string, limit?: number): Promise<any>;
  abstract getAccountBalance(exchange: ExchangeType, apiKeys?: any): Promise<any>;
  abstract placeOrder(params: OrderParams): Promise<OrderResult>;
  abstract cancelOrder(orderId: string, symbol: string, exchange: ExchangeType, apiKeys?: any): Promise<boolean>;
  abstract getActiveOrders(symbol?: string, exchange?: ExchangeType, apiKeys?: any): Promise<OrderResult[]>;
  abstract getOrderHistory(symbol?: string, since?: number, limit?: number, exchange?: ExchangeType, apiKeys?: any): Promise<OrderResult[]>;
  abstract getExchangeInfo(exchange: ExchangeType): Promise<any>;
  abstract getServerTime(exchange: ExchangeType): Promise<number>;
}

/**
 * Exchange Service Adapter - Wraps existing API services to implement the enhanced interface
 * This allows us to maintain backward compatibility while progressively enhancing the API
 */
export class ExchangeServiceAdapter implements ExchangeService {
  private apiService: any;
  private exchange: ExchangeType;

  constructor(apiService: any, exchange: ExchangeType) {
    this.apiService = apiService;
    this.exchange = exchange;
  }

  async getMarketData(params: MarketDataParams): Promise<MarketData> {
    try {
      const result = await this.apiService.getMarketData(params);
      // Transform the API result into our standard MarketData format
      return {
        symbol: params.symbol,
        interval: params.interval || '1h',
        candles: Array.isArray(result.data) ? result.data.map((candle: any) => ({
          timestamp: typeof candle.time === 'string' ? new Date(candle.time).getTime() : candle.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        })) : []
      };
    } catch (error) {
      const err = error as Error;
      MonitoringService.logEvent({
        type: 'market.data_error',
        severity: 'error',
        subject: 'Market Data Error',
        message: `Failed to get market data: ${err.message || 'Unknown error'}`,
        details: { exchange: this.exchange, params },
        source: 'exchange-service'
      });
      throw new ExchangeError(`Failed to get market data: ${(error as Error).message || 'Unknown error'}`, {
        type: ExchangeErrorType.UNKNOWN_ERROR,
        exchange: this.exchange,
        originalError: error,
        isRetryable: false,
        context: params
      });
    }
  }

  async getLatestPrice(symbol: string, exchange: ExchangeType): Promise<number | null> {
    try {
      // Many API services don't have a dedicated method for this
      // so we'll get the latest candle and extract close price
      const params: MarketDataParams = {
        symbol,
        interval: '1m',
        limit: 1
      };
      const result = await this.apiService.getMarketData(params);
      if (Array.isArray(result.data) && result.data.length > 0) {
        return result.data[0].close;
      }
      return null;
    } catch (error) {
      const err = error as Error;
      MonitoringService.logEvent({
        type: 'market.data_error',
        severity: 'error',
        subject: 'Price Data Error',
        message: `Failed to get latest price: ${err.message || 'Unknown error'}`,
        details: { exchange, symbol },
        source: 'exchange-service'
      });
      return null;
    }
  }

  async getOrderBook(symbol: string, limit?: number): Promise<any> {
    return this.apiService.getOrderBook(symbol);
  }

  async getAccountBalance(exchange: ExchangeType, apiKeys?: any): Promise<any> {
    return this.apiService.getAccountBalance();
  }

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      // Convert from our new OrderParams format to the old format
      const apiParams = {
        symbol: params.symbol,
        side: params.side.charAt(0).toUpperCase() + params.side.slice(1), // Convert to 'Buy' or 'Sell'
        orderType: params.type.charAt(0).toUpperCase() + params.type.slice(1), // Convert to 'Market' or 'Limit'
        quantity: params.amount,
        price: params.price,
        timeInForce: params.timeInForce,
        reduceOnly: params.reduceOnly
      };

      const result = await this.apiService.placeOrder(apiParams);

      // Convert the result to our standardized OrderResult format
      return {
        id: result.orderId,
        clientOrderId: result.clientOrderId,
        timestamp: result.transactTime || Date.now(),
        status: result.status === 'FILLED' ? 'closed' : 'open',
        symbol: result.symbol,
        type: result.orderType.toLowerCase(),
        side: result.side.toLowerCase(),
        price: result.price,
        amount: result.quantity,
        filled: result.status === 'FILLED' ? result.quantity : 0,
        remaining: result.status === 'FILLED' ? 0 : result.quantity,
        average: result.price
      };
    } catch (error) {
      const err = error as Error;
      MonitoringService.logEvent({
        type: 'trade.failed',
        severity: 'error',
        subject: 'Order Placement Failed',
        message: `Failed to place order: ${err.message || 'Unknown error'}`,
        details: { exchange: params.exchange, symbol: params.symbol, params },
        source: 'exchange-service'
      });
      throw new ExchangeError(`Failed to place order: ${(error as Error).message || 'Unknown error'}`, {
        type: ExchangeErrorType.UNKNOWN_ERROR,
        exchange: params.exchange,
        originalError: error,
        isRetryable: false,
        context: params
      });
    }
  }

  async placeOrderWithRetry(params: OrderParams, maxRetries: number = 3, delayMs: number = 1000): Promise<OrderResult> {
    let lastError: ExchangeError | null = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        return await this.placeOrder(params);
      } catch (error) {
        // Determine if this error is retryable
        const isRetryable = error instanceof ExchangeError && [
          'TIMEOUT', 'NETWORK_ERROR', 'RATE_LIMIT',
          'EXCHANGE_MAINTENANCE', 'SERVICE_UNAVAILABLE', 'INTERNAL_SERVER_ERROR'
        ].includes(error.type || '');

        if (!isRetryable) {
          throw error;
        }

        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
      }
    }

    throw lastError || new ExchangeError('Failed to place order after multiple attempts', {
      type: ExchangeErrorType.UNKNOWN_ERROR,
      exchange: this.exchange,
      isRetryable: false
    });
  }

  async cancelOrder(orderId: string, symbol: string, exchange: ExchangeType, apiKeys?: any): Promise<boolean> {
    try {
      const result = await this.apiService.cancelOrder(orderId, symbol);
      return result.status === 'CANCELED';
    } catch (error) {
      const err = error as Error;
      MonitoringService.logEvent({
        type: 'trade.failed',
        severity: 'error',
        subject: 'Order Cancellation Failed',
        message: `Failed to cancel order: ${err.message || 'Unknown error'}`,
        details: { exchange, symbol, orderId },
        source: 'exchange-service'
      });
      return false;
    }
  }

  async checkOrderStatus(orderId: string, exchange: ExchangeType, apiKeys?: any): Promise<OrderStatusCheckResult> {
    try {
      // Most basic API services don't have a dedicated method for this
      // so we'll look through active orders
      const activeOrders = await this.getActiveOrders();
      const order = activeOrders.find(o => o.id === orderId);

      if (order) {
        return {
          id: order.id,
          status: order.status,
          filled: order.filled,
          remaining: order.remaining,
          average: order.average
        };
      }

      // Not found in active orders, check order history
      const historyOrders = await this.getOrderHistory();
      const historyOrder = historyOrders.find(o => o.id === orderId);

      if (historyOrder) {
        return {
          id: historyOrder.id,
          status: historyOrder.status,
          filled: historyOrder.filled,
          remaining: historyOrder.remaining,
          average: historyOrder.average
        };
      }

      return {
        id: orderId,
        status: 'unknown',
        filled: 0,
        remaining: 0
      };
    } catch (error) {
      const err = error as Error;
      MonitoringService.logEvent({
        type: 'system.error',
        severity: 'error',
        subject: 'Order Status Check Failed',
        message: `Failed to check order status: ${err.message || 'Unknown error'}`,
        details: { exchange, orderId },
        source: 'exchange-service'
      });
      return {
        id: orderId,
        status: 'unknown',
        filled: 0,
        remaining: 0
      };
    }
  }

  async getActiveOrders(symbol?: string, exchange?: ExchangeType, apiKeys?: any): Promise<OrderResult[]> {
    try {
      const result = await this.apiService.getActiveOrders(symbol);
      if (!result.orders || !Array.isArray(result.orders)) {
        return [];
      }

      return result.orders.map((order: any) => ({
        id: order.orderId,
        timestamp: order.time,
        status: 'open',
        symbol: order.symbol,
        type: order.orderType.toLowerCase(),
        side: order.side.toLowerCase(),
        price: order.price,
        amount: order.quantity,
        filled: 0, // Most mock services don't provide this
        remaining: order.quantity
      }));
    } catch (error) {
      const err = error as Error;
      MonitoringService.logEvent({
        type: 'system.error',
        severity: 'error',
        subject: 'Active Orders Query Failed',
        message: `Failed to get active orders: ${err.message || 'Unknown error'}`,
        details: { exchange: exchange || this.exchange, symbol },
        source: 'exchange-service'
      });
      return [];
    }
  }

  async getOrderHistory(symbol?: string, since?: number, limit?: number, exchange?: ExchangeType, apiKeys?: any): Promise<OrderResult[]> {
    try {
      const result = await this.apiService.getOrderHistory(symbol);
      if (!result.orders || !Array.isArray(result.orders)) {
        return [];
      }

      return result.orders.map((order: any) => ({
        id: order.orderId,
        timestamp: order.time,
        status: order.status.toLowerCase() === 'filled' ? 'closed' : 'canceled',
        symbol: order.symbol,
        type: order.orderType.toLowerCase(),
        side: order.side.toLowerCase(),
        price: order.price,
        amount: order.quantity,
        filled: order.status.toLowerCase() === 'filled' ? order.quantity : 0,
        remaining: order.status.toLowerCase() === 'filled' ? 0 : order.quantity
      }));
    } catch (error) {
      const err = error as Error;
      MonitoringService.logEvent({
        type: 'system.error',
        severity: 'error',
        subject: 'Order History Query Failed',
        message: `Failed to get order history: ${err.message || 'Unknown error'}`,
        details: { exchange: exchange || this.exchange, symbol },
        source: 'exchange-service'
      });
      return [];
    }
  }

  async getExchangeInfo(exchange: ExchangeType): Promise<any> {
    return this.apiService.getExchangeInfo();
  }

  async getServerTime(exchange: ExchangeType): Promise<number> {
    try {
      const result = await this.apiService.getServerTime();
      return result.serverTime;
    } catch (error) {
      return Date.now();
    }
  }

  async fetchCandles(symbol: string, exchange: ExchangeType, timeframe: string = '1h', limit: number = 100): Promise<{
    time: number[];
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
  }> {
    try {
      const params: MarketDataParams = {
        symbol,
        interval: timeframe,
        limit
      };
      
      const result = await this.apiService.getMarketData(params);
      
      if (!Array.isArray(result.data) || result.data.length === 0) {
        return {
          time: [],
          open: [],
          high: [],
          low: [],
          close: [],
          volume: []
        };
      }
      
      return {
        time: result.data.map((c: any) => typeof c.time === 'string' ? new Date(c.time).getTime() : c.time),
        open: result.data.map((c: any) => c.open),
        high: result.data.map((c: any) => c.high),
        low: result.data.map((c: any) => c.low),
        close: result.data.map((c: any) => c.close),
        volume: result.data.map((c: any) => c.volume)
      };
    } catch (error) {
      const err = error as Error;
      MonitoringService.logEvent({
        type: 'market.data_error',
        severity: 'error',
        subject: 'Candle Data Error',
        message: `Failed to fetch candles: ${err.message || 'Unknown error'}`,
        details: { exchange, symbol, timeframe },
        source: 'exchange-service'
      });
      return {
        time: [],
        open: [],
        high: [],
        low: [],
        close: [],
        volume: []
      };
    }
  }
}

/**
 * Factory function to create an exchange service based on the exchange type
 */
export async function createExchangeService(
  exchange: ExchangeType,
  userId?: string
): Promise<ExchangeService> {
  // If no userId is provided, try to get it from the server client
  if (!userId) {
    try {
      const supabase = await createServerClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id;
    } catch (error) {
      console.error('Error getting user ID:', error);
    }
  }

  // Get API credentials from the database for the specific user and exchange
  const credentials = await getExchangeCredentials(exchange, userId);

  // Create the appropriate exchange service based on the exchange type
  switch (exchange) {
    case 'bybit':
      // Wrap the original API services with our adapter to provide the enhanced interface
      return new ExchangeServiceAdapter(new BybitApiService(credentials), exchange);
    case 'coinbase':
      return new ExchangeServiceAdapter(new CoinbaseApiService(credentials), exchange);
    case 'hyperliquid':
      return new ExchangeServiceAdapter(new HyperliquidApiService(credentials), exchange);
    case 'binance':
      throw new Error('Binance API service not yet implemented');
    case 'mock':
    default:
      return new ExchangeServiceAdapter(new MockExchangeService(), exchange);
  }
}

/**
 * Get exchange API credentials from the database for a specific user and exchange
 */
async function getExchangeCredentials(exchange: ExchangeType, userId?: string) {
  if (!userId) {
    return null;
  }

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('exchange_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('exchange', exchange)
      .single();

    if (error) {
      console.error(`Error fetching ${exchange} credentials:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching ${exchange} credentials:`, error);
    return null;
  }
}

/**
 * DryRunExchangeService - Simulates trading with real market data but without executing actual trades
 * 
 * This service is designed for safely testing trading strategies with real market data
 * but without risking actual funds. It maintains virtual balances and records all simulated trades.
 */
export class DryRunExchangeService extends BaseExchangeService implements ExchangeService {
  private wrappedService: ExchangeService;
  private virtualBalances: Record<string, number> = {};
  private simulatedOrders: OrderResult[] = [];
  private activeOrders: OrderResult[] = [];
  private userId: string;

  constructor(wrappedService: ExchangeService, userId: string, initialBalances?: Record<string, number>) {
    super('dry-run');
    this.wrappedService = wrappedService;
    this.userId = userId;
    this.virtualBalances = initialBalances || {
      'USDT': 10000,
      'BTC': 0.5,
      'ETH': 5,
      'SOL': 100
    };
    
    // Log service initialization
    MonitoringService.logEvent({
      type: 'system.startup',
      severity: 'info',
      subject: 'Dry Run Mode Initialized',
      message: `Dry run trading service initialized for user ${userId}`,
      source: 'exchange-service',
      details: {
        exchange: 'dry-run',
        wrappedExchange: (wrappedService as any).exchange || 'unknown',
        initialBalances: this.virtualBalances
      }
    });
  }

  // Use real market data from the wrapped exchange
  protected async fetchMarketDataFromExchange(params: MarketDataParams): Promise<MarketData> {
    try {
      return await this.wrappedService.getMarketData(params);
    } catch (error) {
      const err = error as Error;
      throw new ExchangeError(`Failed to fetch market data: ${err.message || 'Unknown error'}`, {
        type: ExchangeErrorType.MARKET_DATA_UNAVAILABLE,
        exchange: 'dry-run',
        isRetryable: true,
        originalError: error,
        context: { params }
      });
    }
  }

  protected async fetchLatestPriceFromExchange(symbol: string): Promise<number> {
    try {
      const price = await this.wrappedService.getLatestPrice(symbol, (this.wrappedService as any).exchange);
      if (price === null) {
        throw new Error(`Failed to get price for ${symbol}`);
      }
      return price;
    } catch (error) {
      const err = error as Error;
      throw new ExchangeError(`Failed to get latest price: ${err.message || 'Unknown error'}`, {
        type: ExchangeErrorType.MARKET_DATA_UNAVAILABLE,
        exchange: 'dry-run',
        isRetryable: true,
        originalError: error,
        context: { symbol }
      });
    }
  }

  protected async placeOrderOnExchange(params: OrderParams): Promise<OrderResult> {
    try {
      // Get the latest price for the symbol
      const latestPrice = await this.getLatestPrice(params.symbol, 'dry-run');
      if (latestPrice === null) {
        throw new ExchangeError(`Failed to get price for ${params.symbol}`, {
          type: ExchangeErrorType.MARKET_DATA_UNAVAILABLE,
          exchange: 'dry-run',
          isRetryable: true
        });
      }
      
      // Create a simulated price with some realistic slippage
      let executionPrice = latestPrice;
      if (params.type === 'market') {
        // Apply random slippage for market orders (0.1% to 0.5%)
        const slippagePercent = (Math.random() * 0.4 + 0.1) * (params.side === 'buy' ? 1 : -1);
        executionPrice = latestPrice * (1 + slippagePercent / 100);
      } else {
        // For limit orders, use the specified price
        executionPrice = params.price || latestPrice;
      }
      
      // Calculate the cost of the trade
      const cost = params.amount * executionPrice;
      const fee = cost * 0.001; // Simulate a 0.1% fee
      
      // Check if the user has enough balance
      const [baseAsset, quoteAsset] = params.symbol.split(/USD|USDT|USDC/); // Simple parsing for demo
      const quoteCurrency = params.symbol.includes('USD') ? 'USDT' : 'USD';
      
      if (params.side === 'buy') {
        // Check if user has enough quote currency (e.g., USDT)
        if ((this.virtualBalances[quoteCurrency] || 0) < cost + fee) {
          throw new ExchangeError('Insufficient funds for simulated trade', {
            type: ExchangeErrorType.INSUFFICIENT_FUNDS,
            exchange: 'dry-run',
            isRetryable: false,
            context: {
              required: cost + fee,
              available: this.virtualBalances[quoteCurrency] || 0,
              asset: quoteCurrency
            }
          });
        }
      } else { // sell
        // Check if user has enough base currency (e.g., BTC)
        if ((this.virtualBalances[baseAsset] || 0) < params.amount) {
          throw new ExchangeError('Insufficient funds for simulated trade', {
            type: ExchangeErrorType.INSUFFICIENT_FUNDS,
            exchange: 'dry-run',
            isRetryable: false,
            context: {
              required: params.amount,
              available: this.virtualBalances[baseAsset] || 0,
              asset: baseAsset
            }
          });
        }
      }
      
      // Update virtual balances
      if (params.side === 'buy') {
        // Decrease quote currency (e.g., USDT)
        this.virtualBalances[quoteCurrency] = (this.virtualBalances[quoteCurrency] || 0) - cost - fee;
        // Increase base currency (e.g., BTC)
        this.virtualBalances[baseAsset] = (this.virtualBalances[baseAsset] || 0) + params.amount;
      } else { // sell
        // Decrease base currency (e.g., BTC)
        this.virtualBalances[baseAsset] = (this.virtualBalances[baseAsset] || 0) - params.amount;
        // Increase quote currency (e.g., USDT)
        this.virtualBalances[quoteCurrency] = (this.virtualBalances[quoteCurrency] || 0) + cost - fee;
      }
      
      // Create the simulated order result
      const orderId = `dry-run-${uuidv4()}`;
      const timestamp = Date.now();
      const simulatedOrder: OrderResult = {
        id: orderId,
        clientOrderId: params.clientOrderId || `client-${orderId}`,
        timestamp,
        lastTradeTimestamp: timestamp,
        status: 'closed',
        symbol: params.symbol,
        type: params.type,
        side: params.side,
        price: executionPrice,
        amount: params.amount,
        filled: params.amount,
        remaining: 0,
        cost: cost,
        average: executionPrice,
        fee: {
          currency: quoteCurrency,
          cost: fee,
          rate: 0.001 // 0.1%
        },
        trades: []
      };
      
      // Store the order in our simulated orders history
      this.simulatedOrders.push(simulatedOrder);
      
      // Persist the simulated trade to the database
      this.saveSimulatedTrade(simulatedOrder).catch(err => {
        MonitoringService.logEvent({
          type: 'system.warning',
          severity: 'warning',
          subject: 'Failed to Save Simulated Trade',
          message: `Failed to persist simulated trade to database: ${err.message || 'Unknown error'}`,
          source: 'exchange-service',
          details: {
            exchange: 'dry-run',
            orderId,
            error: err
          }
        });
      });
      
      // Log the simulated trade
      MonitoringService.logEvent({
        type: 'trade.executed',
        severity: 'info',
        subject: 'Simulated Trade Executed',
        message: `Simulated ${params.side} order executed for ${params.amount} ${baseAsset} at ${executionPrice} ${quoteCurrency}`,
        source: 'exchange-service',
        details: {
            exchange: 'dry-run',
            order: simulatedOrder,
            balances: this.virtualBalances
          }
      });
      
      return simulatedOrder;
    } catch (error) {
      if (error instanceof ExchangeError) {
        throw error;
      }
      const err = error as Error;
      throw new ExchangeError(`Failed to place order: ${err.message || 'Unknown error'}`, {
        type: ExchangeErrorType.UNKNOWN_ERROR,
        exchange: 'dry-run',
        isRetryable: false,
        originalError: error,
        context: { params }
      });
    }
  }

  public async getOrderBook(symbol: string, limit?: number): Promise<any> {
    // Use real order book data from the wrapped exchange
    try {
      return await this.wrappedService.getOrderBook(symbol, limit);
    } catch (error) {
      const err = error as Error;
      throw new ExchangeError(`Failed to get order book: ${err.message || 'Unknown error'}`, {
        type: ExchangeErrorType.MARKET_DATA_UNAVAILABLE,
        exchange: 'dry-run',
        isRetryable: true,
        originalError: error,
        context: { symbol, limit }
      });
    }
  }

  public async getAccountBalance(exchange: ExchangeType, apiKeys?: any): Promise<any> {
    // Return virtual balances formatted as account balance
    return await this.fetchAccountBalanceFromExchange();
  }

  public async placeOrder(params: OrderParams): Promise<OrderResult> {
    return this.placeOrderOnExchange(params);
  }

  public async cancelOrder(orderId: string, symbol: string, exchange: ExchangeType, apiKeys?: any): Promise<boolean> {
    const order = this.activeOrders.find(o => o.id === orderId);
    if (!order) {
      throw new ExchangeError(`Order not found: ${orderId}`, {
        type: ExchangeErrorType.UNKNOWN_ORDER,
        exchange: 'dry-run',
        isRetryable: false,
        context: { orderId, symbol }
      });
    }
    
    // Remove from active orders
    this.activeOrders = this.activeOrders.filter(o => o.id !== orderId);
    
    // Update order status
    order.status = 'canceled';
    order.remaining = order.amount - order.filled;
    
    // Add to order history
    this.simulatedOrders.push({
      ...order,
      lastTradeTimestamp: Date.now()
    });
    
    MonitoringService.logEvent({
      type: 'trade.cancelled',
      severity: 'info',
      subject: 'Simulated Order Cancelled',
      message: `Cancelled simulated order ${orderId} for ${symbol}`,
      source: 'exchange-service',
      details: {
        exchange: 'dry-run',
        orderId,
        symbol,
        order
      }
    });
    
    return true;
  }

  public async placeOrderWithRetry(params: OrderParams, maxRetries: number = 3, delayMs: number = 1000): Promise<OrderResult> {
    let lastError: ExchangeError | null = null;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        attempt++;
        return await this.placeOrder(params);
      } catch (error) {
        if (error instanceof ExchangeError) {
          lastError = error;
          if (!error.isRetryable) {
            break;
          }
        } else {
          lastError = new ExchangeError(`Unknown error: ${(error as Error).message || 'Error placing order'}`, {
            type: ExchangeErrorType.UNKNOWN_ERROR,
            exchange: 'dry-run',
            isRetryable: false
          });
          break;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    throw lastError || new ExchangeError('Failed to place order after multiple attempts', {
      type: ExchangeErrorType.UNKNOWN_ERROR,
      exchange: 'dry-run',
      isRetryable: false
    });
  }

  public async checkOrderStatus(orderId: string, exchange: ExchangeType, apiKeys?: any): Promise<OrderStatusCheckResult> {
    return this.fetchOrderStatusFromExchange(orderId);
  }

  public async getActiveOrders(symbol?: string, exchange?: ExchangeType, apiKeys?: any): Promise<OrderResult[]> {
    return this.fetchActiveOrdersFromExchange(symbol);
  }

  public async getOrderHistory(symbol?: string, since?: number, limit?: number, exchange?: ExchangeType, apiKeys?: any): Promise<OrderResult[]> {
    return this.fetchOrderHistoryFromExchange(symbol, since, limit);
  }

  public async getExchangeInfo(exchange: ExchangeType): Promise<any> {
    try {
      return await this.wrappedService.getExchangeInfo(exchange);
    } catch (error) {
      const err = error as Error;
      throw new ExchangeError(`Failed to get exchange info: ${err.message || 'Unknown error'}`, {
        type: ExchangeErrorType.UNKNOWN_ERROR,
        exchange: 'dry-run',
        isRetryable: true,
        originalError: error
      });
    }
  }

  public async getServerTime(exchange: ExchangeType): Promise<number> {
    return Date.now();
  }

  public async fetchCandles(symbol: string, exchange: ExchangeType, timeframe: string = '1h', limit: number = 100): Promise<{
    time: number[];
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
  }> {
    try {
      return await this.wrappedService.fetchCandles(symbol, (this.wrappedService as any).exchange, timeframe, limit);
    } catch (error) {
      const err = error as Error;
      throw new ExchangeError(`Failed to fetch candles: ${err.message || 'Unknown error'}`, {
        type: ExchangeErrorType.MARKET_DATA_UNAVAILABLE,
        exchange: 'dry-run',
        isRetryable: true,
        originalError: error,
        context: { symbol, timeframe, limit }
      });
    }
  }
  
  protected async fetchOrderStatusFromExchange(orderId: string): Promise<OrderStatusCheckResult> {
    const order = this.simulatedOrders.find(o => o.id === orderId);
    if (!order) {
      throw new ExchangeError(`Order not found: ${orderId}`, {
        type: ExchangeErrorType.UNKNOWN_ORDER,
        exchange: 'dry-run',
        isRetryable: false,
        context: { orderId }
      });
    }
    
    return {
      id: order.id,
      status: order.status,
      filled: order.filled,
      remaining: order.remaining,
      average: order.average,
      trades: order.trades
    };
  }

  protected async fetchActiveOrdersFromExchange(symbol?: string): Promise<OrderResult[]> {
    if (symbol) {
      return this.activeOrders.filter(order => order.symbol === symbol);
    }
    return this.activeOrders;
  }

  protected async fetchOrderHistoryFromExchange(symbol?: string, since?: number, limit?: number): Promise<OrderResult[]> {
    let filteredOrders = this.simulatedOrders;
    
    if (symbol) {
      filteredOrders = filteredOrders.filter(order => order.symbol === symbol);
    }
    
    if (since) {
      filteredOrders = filteredOrders.filter(order => order.timestamp >= since);
    }
    
    // Sort by timestamp (newest first)
    filteredOrders.sort((a, b) => b.timestamp - a.timestamp);
    
    if (limit && limit > 0) {
      filteredOrders = filteredOrders.slice(0, limit);
    }
    
    return filteredOrders;
  }

  protected async fetchAccountBalanceFromExchange(): Promise<any> {
    // Format the virtual balances into the expected structure
    const balances = Object.entries(this.virtualBalances).map(([asset, amount]) => ({
      asset,
      free: amount,
      locked: 0
    }));
    
    return { balances };
  }

  public async getVirtualBalances(): Promise<Record<string, number>> {
    return { ...this.virtualBalances };
  }

  public async resetVirtualBalances(initialBalances?: Record<string, number>): Promise<void> {
    this.virtualBalances = initialBalances || {
      'USDT': 10000,
      'BTC': 0.5,
      'ETH': 5,
      'SOL': 100
    };
    this.simulatedOrders = [];
    this.activeOrders = [];
    
    MonitoringService.logEvent({
      type: 'system.startup',
      severity: 'info',
      subject: 'Virtual Balances Reset',
      message: `Dry run virtual balances have been reset`,
      source: 'exchange-service',
      details: {
        exchange: 'dry-run',
        userId: this.userId,
        initialBalances: this.virtualBalances
      }
    });
  }

  private async saveSimulatedTrade(order: OrderResult): Promise<void> {
    try {
      const supabase = createBrowserClient();
      
      // Save the trade to the database
      await supabase
        .from('simulated_trades')
        .insert({
          user_id: this.userId,
          order_id: order.id,
          client_order_id: order.clientOrderId,
          timestamp: new Date(order.timestamp).toISOString(),
          symbol: order.symbol,
          type: order.type,
          side: order.side,
          price: order.price,
          amount: order.amount,
          cost: order.cost,
          fee: order.fee?.cost || 0,
          fee_currency: order.fee?.currency || 'USDT',
          status: order.status
        });
      
      // Also update the virtual balances table
      await supabase
        .from('virtual_balances')
        .upsert(
          Object.entries(this.virtualBalances).map(([asset, amount]) => ({
            user_id: this.userId,
            asset,
            amount,
            updated_at: new Date().toISOString()
          })),
          { onConflict: 'user_id,asset' }
        );
    } catch (error) {
      // Just log the error but don't fail the operation
      console.error('Failed to save simulated trade:', error);
    }
  }
}

/**
 * Mock Exchange Service for development and testing
 */
// Enhanced MockExchangeService that implements the full ExchangeService interface
class MockExchangeService implements ExchangeService {
  private exchange: ExchangeType = 'mock';
  
  // Method required by BaseExchangeService
  protected fetchMarketDataFromExchange(params: MarketDataParams): Promise<MarketData> {
    return Promise.resolve({
      symbol: params.symbol,
      interval: params.interval || '1h',
      candles: Array(params.limit || 100).fill(0).map((_, i) => ({
        timestamp: Date.now() - i * 60000,
        open: 50000 + Math.random() * 1000,
        high: 51000 + Math.random() * 1000,
        low: 49000 + Math.random() * 1000,
        close: 50500 + Math.random() * 1000,
        volume: Math.random() * 100
      }))
    });
  }
  
  // Method required by BaseExchangeService
  protected fetchLatestPriceFromExchange(symbol: string): Promise<number> {
    return Promise.resolve(50000 + Math.random() * 1000);
  }
  
  // Method required by BaseExchangeService
  protected fetchOrderStatusFromExchange(orderId: string): Promise<OrderStatusCheckResult> {
    return Promise.resolve({
      id: orderId,
      status: Math.random() > 0.3 ? 'closed' : 'open',
      filled: Math.random() * 1,
      remaining: Math.random() * 1,
      average: 50000 + Math.random() * 1000
    });
  }
  async getMarketData(params: MarketDataParams): Promise<MarketData> {
    return this.fetchMarketDataFromExchange(params);
  }

  async getOrderBook(symbol: string, limit?: number): Promise<any> {
    return {
      symbol,
      bids: Array(limit || 10).fill(0).map((_, i) => ([50000 - i * 10, Math.random() * 10])),
      asks: Array(limit || 10).fill(0).map((_, i) => ([50000 + i * 10, Math.random() * 10]))
    };
  }

  async getAccountBalance(exchange: ExchangeType, apiKeys?: any): Promise<any> {
    return {
      balances: [
        { asset: 'BTC', free: 1.234, locked: 0.1 },
        { asset: 'ETH', free: 15.678, locked: 1.5 },
        { asset: 'USDT', free: 10000, locked: 5000 }
      ]
    };
  }

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    const orderId = `mock-order-${Date.now()}`;
    return {
      id: orderId,
      clientOrderId: `client-${orderId}`,
      timestamp: Date.now(),
      status: 'closed',
      symbol: params.symbol,
      type: params.type,
      side: params.side,
      price: params.price || 50000,
      amount: params.amount,
      filled: params.amount,
      remaining: 0,
      average: params.price || 50000
    };
  }

  async cancelOrder(orderId: string, symbol: string, exchange: ExchangeType, apiKeys?: any): Promise<boolean> {
    // Always returns success in mock mode
    return true;
  }

  async getActiveOrders(symbol?: string, exchange?: ExchangeType, apiKeys?: any): Promise<OrderResult[]> {
    return Array(5).fill(0).map((_, i) => ({
      id: `mock-order-${i}`,
      clientOrderId: `client-mock-${i}`,
      timestamp: Date.now() - i * 60000,
      status: 'open',
      symbol: symbol || 'BTCUSDT',
      type: 'limit',
      side: i % 2 === 0 ? 'buy' : 'sell',
      price: 50000 + i * 100,
      amount: 0.1 + i * 0.1,
      filled: 0,
      remaining: 0.1 + i * 0.1,
      average: 50000 + i * 100
    }));
  }

  async getOrderHistory(symbol?: string, since?: number, limit?: number, exchange?: ExchangeType, apiKeys?: any): Promise<OrderResult[]> {
    const count = limit || 10;
    return Array(count).fill(0).map((_, i) => ({
      id: `mock-order-history-${i}`,
      clientOrderId: `client-history-${i}`,
      timestamp: Date.now() - i * 3600000,
      status: 'closed',
      symbol: symbol || 'BTCUSDT',
      type: i % 3 === 0 ? 'market' : 'limit',
      side: i % 2 === 0 ? 'buy' : 'sell',
      price: 50000 + i * 50,
      amount: 0.1 + i * 0.05,
      filled: 0.1 + i * 0.05,
      remaining: 0,
      average: 50000 + i * 50
    }));
  }

  async getExchangeInfo(exchange: ExchangeType): Promise<any> {
    return {
      symbols: [
        { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' },
        { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING' },
        { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', status: 'TRADING' }
      ]
    };
  }

  async getServerTime(exchange: ExchangeType): Promise<number> {
    return Date.now();
  }
  
  async getLatestPrice(symbol: string, exchange: ExchangeType): Promise<number | null> {
    return this.fetchLatestPriceFromExchange(symbol);
  }
  
  async placeOrderWithRetry(params: OrderParams, maxRetries: number = 3, delayMs: number = 1000): Promise<OrderResult> {
    // Mock implementation always succeeds on first try
    return this.placeOrder(params);
  }
  
  async checkOrderStatus(orderId: string, exchange: ExchangeType, apiKeys?: any): Promise<OrderStatusCheckResult> {
    return this.fetchOrderStatusFromExchange(orderId);
  }
  
  async fetchCandles(symbol: string, exchange: ExchangeType, timeframe: string = '1h', limit: number = 100): Promise<{
    time: number[];
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
  }> {
    const marketData = await this.getMarketData({ symbol, interval: timeframe, limit });
    return {
      time: marketData.candles.map(c => c.timestamp),
      open: marketData.candles.map(c => c.open),
      high: marketData.candles.map(c => c.high),
      low: marketData.candles.map(c => c.low),
      close: marketData.candles.map(c => c.close),
      volume: marketData.candles.map(c => c.volume)
    };
  }
}
