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
}

export interface OrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price?: number;
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

export type OrderStatus = 
  | 'new' 
  | 'partially_filled' 
  | 'filled' 
  | 'canceled' 
  | 'pending_cancel' 
  | 'rejected' 
  | 'expired';

export interface AccountInfo {
  balances: {
    asset: string;
    free: number;
    locked: number;
  }[];
  permissions: string[];
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
