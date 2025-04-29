export interface MarketData {
  symbol: string;
  exchange: string;
  price: number;
  bid: number;
  ask: number;
  volume24h: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
  lastPrice?: number; // Alias for price in some exchanges
  bidPrice?: number; // Alias for bid in some exchanges
  askPrice?: number; // Alias for ask in some exchanges
  volume?: number; // Alias for volume24h in some exchanges
}

export interface OrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number;
  reduceOnly?: boolean; // For futures only - only reduce position size
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  clientOrderId?: string;
}

export interface OrderResult {
  id: string;
  clientOrderId?: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  status: OrderStatus;
  quantity: number;
  price?: number;
  stopPrice?: number;
  executedQuantity: number;
  executedPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  createdAt: number;
  updatedAt: number;
}

// Order status as string literal type
export type OrderStatus = 
  | 'new' 
  | 'partially_filled' 
  | 'filled' 
  | 'canceled' 
  | 'pending_cancel' 
  | 'rejected' 
  | 'expired';

// Order status constants for runtime use
export namespace OrderStatusValues {
  export const NEW = 'new';
  export const PARTIALLY_FILLED = 'partially_filled';
  export const FILLED = 'filled';
  export const CANCELED = 'canceled';
  export const PENDING_CANCEL = 'pending_cancel';
  export const REJECTED = 'rejected';
  export const EXPIRED = 'expired';
}

// Time in force as string literal type
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

// Time in force constants for runtime use
export namespace TimeInForceValues {
  export const GTC = 'GTC';
  export const IOC = 'IOC';
  export const FOK = 'FOK';
}

// Order type as string literal type
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';

// Order type constants for runtime use
export namespace OrderTypeValues {
  export const MARKET = 'market';
  export const LIMIT = 'limit';
  export const STOP = 'stop';
  export const STOP_LIMIT = 'stop_limit';
}

// Order side as string literal type
export type OrderSide = 'buy' | 'sell';

// Order side constants for runtime use
export namespace OrderSideValues {
  export const BUY = 'buy';
  export const SELL = 'sell';
}

export interface Position {
  symbol: string;
  entryPrice: number;
  markPrice: number;
  positionAmt: number;
  unrealizedProfit: number;
  leverage: number;
  marginType: string;
  size?: number; // Position size (same as positionAmt)
}

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total?: number; // Total balance (free + locked)
}

export interface AccountInfo {
  balances: Balance[];
  permissions: string[];
  positions?: Position[]; // For exchanges that support futures/margin trading
}

export interface ExchangeCredentials {
  apiKey: string;
  secretKey: string;
  passphrase?: string; // For some exchanges like Coinbase
}

export interface IExchangeConnector {
  name: string;
  connect(credentials: ExchangeCredentials): Promise<boolean>;
  disconnect(): Promise<boolean>;
  getMarkets(): Promise<MarketData[]>;
  getMarketData(symbol: string): Promise<MarketData>;
  getOrderBook(symbol: string, limit?: number): Promise<{
    bids: [number, number][]; // [price, quantity]
    asks: [number, number][]; // [price, quantity]
    timestamp: number;
  }>;
  placeOrder(params: OrderParams): Promise<OrderResult>;
  cancelOrder(orderId: string, symbol: string): Promise<boolean>;
  getOrderStatus(orderId: string, symbol: string): Promise<OrderResult>;
  getOpenOrders(symbol?: string): Promise<OrderResult[]>;
  getAccountInfo(): Promise<AccountInfo>;
  subscribePriceUpdates(
    symbols: string[],
    callback: (data: MarketData) => void
  ): Promise<boolean>;
  unsubscribePriceUpdates(symbols: string[]): Promise<boolean>;
}
