export enum ExchangeType {
  BYBIT = 'bybit',
  COINBASE = 'coinbase',
  HYPERLIQUID = 'hyperliquid',
  OKX = 'okx'
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP = 'stop',
  STOP_LIMIT = 'stop_limit'
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell'
}

export enum TimeInForce {
  GTC = 'GTC', // Good Till Cancel
  IOC = 'IOC', // Immediate or Cancel
  FOK = 'FOK', // Fill or Kill
  PO = 'PO'    // Post Only
}

export interface OrderBookItem {
  price: number;
  quantity: number;
}

export interface OrderBook {
  bids: OrderBookItem[];
  asks: OrderBookItem[];
}

export interface OrderParams {
  symbol: string;
  side: OrderSide;
  quantity: number;
  type: OrderType;
  price?: number;
  timeInForce?: TimeInForce;
}

export interface Balance {
  free: number;
  locked: number;
  total: number;
}

export interface ExchangeBalances {
  [currency: string]: Balance;
}

export interface OrderResponse {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price?: number;
  status: string;
  timestamp: number;
} 