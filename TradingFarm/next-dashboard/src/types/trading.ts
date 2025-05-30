/**
 * Trading Farm - Phase 4 Trading Types
 * Type definitions for live trading functionality
 */

// Order types
export enum OrderSide {
  Buy = "buy",
  Sell = "sell"
}

export enum OrderType {
  Market = "market",
  Limit = "limit",
  Stop = "stop",
  StopLimit = "stop_limit"
}

export enum OrderStatus {
  Pending = "pending",
  Open = "open",
  Filled = "filled",
  Partial = "partial",
  Cancelled = "cancelled",
  Rejected = "rejected"
}

export enum TimeInForce {
  GTC = "gtc", // Good Till Cancelled
  IOC = "ioc", // Immediate or Cancel
  FOK = "fok"  // Fill or Kill
}

// Position types
export interface Position {
  id?: number;
  user_id: string;
  agent_id?: string;
  symbol: string;
  quantity: number;
  avg_price: number;
  unrealised_pnl: number;
  created_at?: string;
  updated_at?: string;
}

// Order types
export interface Order {
  id?: number;
  user_id: string;
  agent_id?: string;
  exchange: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: number;
  quantity: number;
  status: OrderStatus;
  executed_qty: number;
  tx_id?: string;
  time_in_force?: TimeInForce;
  created_at?: string;
  updated_at?: string;
}

export interface OrderRequest {
  agent_id?: string;
  exchange: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: number;
  quantity: number;
  time_in_force?: TimeInForce;
}

export interface OrderResponse {
  id: number;
  exchange: string;
  symbol: string;
  side: string;
  type: string;
  price?: number;
  quantity: number;
  status: string;
  tx_id?: string;
  message?: string;
}

// Risk management types
export interface RiskProfile {
  id?: number;
  user_id: string;
  agent_id?: string;
  max_position_pct: number;
  max_daily_loss: number;
  circuit_breaker: boolean;
  created_at?: string;
  updated_at?: string;
}

// Market data types
export interface MarketData {
  symbol: string;
  exchange: string;
  price: number;
  bid?: number;
  ask?: number;
  volume_24h?: number;
  timestamp: string;
  is_stale: boolean;
}

// Wallet and balance types
export interface WalletBalance {
  id?: number;
  user_id: string;
  exchange: string;
  currency: string;
  free: number;
  locked: number;
  updated_at?: string;
}

// Performance metrics
export interface TradePerformance {
  id?: number;
  user_id: string;
  agent_id?: string;
  period: string;
  pnl: number;
  win_rate?: number;
  sharpe_ratio?: number;
  drawdown?: number;
  created_at?: string;
  updated_at?: string;
}

// API error response
export interface ApiError {
  status: number;
  message: string;
  detail?: string;
}

// Exchange info
export interface Exchange {
  id: string;
  name: string;
  logo?: string;
  features: string[];
  markets: number;
  status: 'online' | 'maintenance' | 'offline';
}
