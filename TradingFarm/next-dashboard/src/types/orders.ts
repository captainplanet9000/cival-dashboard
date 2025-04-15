// Types for exchange order management

export interface OrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'PostOnly';
  clientOrderId?: string;
  reduceOnly?: boolean;
  stopPrice?: number;
  closePosition?: boolean;
}

export interface Order {
  id: string;
  clientOrderId?: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  status: 'new' | 'partially_filled' | 'filled' | 'canceled' | 'rejected' | 'expired';
  price?: number;
  avgPrice?: number;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  createdAt: Date;
  updatedAt: Date;
  closePosition?: boolean;
  reduceOnly?: boolean;
  stopPrice?: number;
  timeInForce?: string;
}

export interface OrderCancelRequest {
  symbol: string;
  orderId?: string;
  clientOrderId?: string;
}

export interface OrderCancelResponse {
  symbol: string;
  orderId: string;
  clientOrderId?: string;
  status: string;
}

export interface ConnectionResult {
  success: boolean;
  message: string;
  balances?: any;
}

export interface MarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  timestamp: Date;
}

export interface Position {
  symbol: string;
  side: 'long' | 'short' | 'flat';
  entryPrice: number;
  markPrice: number;
  quantity: number;
  leverage: number;
  liquidationPrice?: number;
  marginType: 'isolated' | 'cross';
  unrealizedPnl: number;
  realizedPnl?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  subaccount?: string;
}
