/**
 * Exchange Types
 * 
 * Defines common types for interacting with cryptocurrency exchanges.
 * These types provide structure and consistency across different exchange implementations.
 */

import { ExchangeId } from '../websocket/websocket-types';

/**
 * Available order types
 */
export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP_LOSS = 'stop_loss',
  STOP_LIMIT = 'stop_limit',
  TAKE_PROFIT = 'take_profit',
  TAKE_PROFIT_LIMIT = 'take_profit_limit',
  TRAILING_STOP = 'trailing_stop'
}

/**
 * Order side (buy or sell)
 */
export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell'
}

/**
 * Time in force options for limit orders
 */
export enum TimeInForce {
  GTC = 'gtc', // Good Till Canceled
  IOC = 'ioc', // Immediate Or Cancel
  FOK = 'fok', // Fill Or Kill
  GTX = 'gtx'  // Good Till Crossing (Post only)
}

/**
 * Market data structure
 */
export interface MarketData {
  symbol: string;
  timestamp: number;
  bid: number;
  ask: number;
  last: number;
  high: number;
  low: number;
  volume: number;
  quoteVolume: number;
  change: number;
  changePercent: number;
  vwap?: number; // Volume weighted average price
  open?: number;
  close?: number;
}

/**
 * Order parameters for placing orders
 */
export interface OrderParams {
  symbol: string;
  type: OrderType;
  side: OrderSide;
  amount: number;
  price?: number; // Required for limit orders
  stopPrice?: number; // For stop orders
  timeInForce?: TimeInForce;
  clientOrderId?: string; // Custom ID for tracking
  reduceOnly?: boolean; // Only reduce position, do not increase
  postOnly?: boolean; // Make sure order is posted as maker
  leverage?: number; // For margin/futures trading
  params?: Record<string, any>; // Additional exchange-specific parameters
}

/**
 * Order result returned after placing an order
 */
export interface OrderResult {
  id: string;
  clientOrderId?: string;
  timestamp: number;
  status: OrderStatusType;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  price?: number;
  amount: number;
  filled: number;
  remaining: number;
  cost?: number;
  trades?: any[];
  fee?: {
    cost: number;
    currency: string;
    rate?: number;
  };
  raw?: any; // Raw response from exchange
}

/**
 * Order status types
 */
export enum OrderStatusType {
  OPEN = 'open',
  CLOSED = 'closed',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
  REJECTED = 'rejected',
  PENDING = 'pending',
  PARTIALLY_FILLED = 'partially_filled'
}

/**
 * Order status information
 */
export interface OrderStatus extends OrderResult {
  lastTradeTimestamp?: number;
  average?: number; // Average execution price for filled orders
}

/**
 * Balance information for a single currency
 */
export interface Balance {
  currency: string;
  free: number; // Available balance
  used: number; // Balance in use (in orders, etc.)
  total: number; // Total balance (free + used)
}

/**
 * Account information including balances
 */
export interface AccountInfo {
  balances: Map<string, Balance>;
  permissions: {
    trading: boolean;
    margin: boolean;
    futures: boolean;
    withdraw: boolean;
  };
  tradingEnabled: boolean;
  marginEnabled: boolean;
  futuresEnabled: boolean;
}

/**
 * Market symbol information
 */
export interface MarketSymbol {
  symbol: string;
  base: string; // Base currency (e.g., BTC in BTC/USDT)
  quote: string; // Quote currency (e.g., USDT in BTC/USDT)
  active: boolean;
  precision: {
    price: number;
    amount: number;
  };
  limits: {
    price?: {
      min?: number;
      max?: number;
    };
    amount?: {
      min?: number;
      max?: number;
    };
    cost?: {
      min?: number;
      max?: number;
    };
  };
  info?: any; // Raw exchange data
}

/**
 * Exchange rate limits
 */
export interface RateLimits {
  maxRequestsPerSecond: number;
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
}

/**
 * Exchange capabilities and limitations
 */
export interface ExchangeCapabilities {
  exchange: ExchangeId;
  hasFetchTickers: boolean;
  hasFetchOHLCV: boolean;
  hasFetchOrderBook: boolean;
  supportedOrderTypes: OrderType[];
  supportedTimeInForceOptions: TimeInForce[];
  supportsFutures: boolean;
  supportsMargin: boolean;
  supportsSpot: boolean;
  fetchDepositAddress: boolean;
  fetchWithdrawals: boolean;
  fetchDeposits: boolean;
  rateLimits: RateLimits;
}

/**
 * Exchange API credentials
 */
export interface ApiCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string; // Some exchanges like KuCoin require a passphrase
  sandboxMode?: boolean; // Use testnet/sandbox if available
}

/**
 * Exchange configuration
 */
export interface ExchangeConfig {
  exchange: ExchangeId;
  credentials: ApiCredentials;
  rateLimitPadding?: number; // Percentage to stay under rate limits (e.g., 0.1 for 10%)
  defaultOptions?: Record<string, any>; // Default options for all requests
}

/**
 * Mapped order book
 */
export interface OrderBook {
  symbol: string;
  timestamp: number;
  asks: [number, number][]; // [price, amount][]
  bids: [number, number][]; // [price, amount][]
  nonce?: number; // Sequence number
}

/**
 * Trading fee structure
 */
export interface TradingFee {
  symbol: string;
  maker: number; // Maker fee percentage
  taker: number; // Taker fee percentage
  info?: any; // Raw exchange data
}
