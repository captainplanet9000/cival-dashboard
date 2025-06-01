/**
 * Trading types for the Trading Farm system
 * Contains type definitions for orders, executions, market data, etc.
 */

// Order side enum
export type OrderSide = 'buy' | 'sell';

// Order type enum
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';

// Order status enum
export type OrderStatusType = 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'expired' | 'unknown';

// Time in force enum
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'GTD';

// Parameters for creating an order
export interface OrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  clientOrderId?: string;
  timeInForce?: TimeInForce;
  reduceOnly?: boolean;
  postOnly?: boolean;
  leverage?: number;
  marginType?: 'isolated' | 'cross';
  metadata?: Record<string, any>;
}

// Order object representing an order on an exchange
export interface Order {
  id: string;
  exchangeId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price: number;
  stopPrice?: number;
  status: OrderStatusType;
  timestamp: string;
  clientOrderId: string;
  timeInForce?: TimeInForce;
  fillPrice: number | null;
  fillQuantity: number;
  fee?: {
    amount: number;
    currency: string;
  };
  reduceOnly?: boolean;
  postOnly?: boolean;
  leverage?: number;
  marginType?: 'isolated' | 'cross';
  metadata?: Record<string, any>;
}

// Order status response
export interface OrderStatus {
  orderId: string;
  status: OrderStatusType;
  timestamp: string;
  fillPrice?: number | null;
  fillQuantity?: number;
  message?: string;
}

// Order result returned after placing an order
export interface OrderResult {
  success: boolean;
  message: string;
  orderId: string;
  order: Order | null;
}

// Trade execution representing a fill of an order
export interface TradeExecution {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  price: number;
  quantity: number;
  timestamp: string;
  fee?: {
    amount: number;
    currency: string;
  };
  metadata?: Record<string, any>;
}

// Market data representing real-time market information
export interface MarketData {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  high?: number;
  low?: number;
  volume?: number;
  timestamp: string;
  depth?: {
    bids: Array<[number, number]>; // [price, quantity]
    asks: Array<[number, number]>; // [price, quantity]
  };
}

// Position information
export interface Position {
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice?: number;
  marginType: 'isolated' | 'cross';
  leverage: number;
  unrealizedPnl: number;
  realizedPnl?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Balance information
export interface Balance {
  currency: string;
  total: number;
  available: number;
  locked?: number;
  timestamp: string;
}

// Account information
export interface AccountInfo {
  balances: Balance[];
  positions?: Position[];
  timestamp: string;
}

// Risk parameters for a trading strategy
export interface RiskParameters {
  maxOrderSize: number;
  maxPositionSize: number;
  maxLeverage: number;
  maxDrawdown: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  trailingStopActivationPercentage?: number;
  trailingStopDistancePercentage?: number;
}

// Trading result for performance tracking
export interface TradingResult {
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  side: OrderSide;
  entryTimestamp: string;
  exitTimestamp: string;
  pnl: number;
  pnlPercentage: number;
  fees: number;
  netPnl: number;
  duration: number; // in milliseconds
  metadata?: Record<string, any>;
}

// Trading performance metrics
export interface TradingPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio?: number;
  maxDrawdown: number;
  netPnl: number;
  totalFees: number;
  startDate: string;
  endDate: string;
  metadata?: Record<string, any>;
}
