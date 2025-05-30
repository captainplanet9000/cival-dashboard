/**
 * Base Exchange Adapter Interface
 * Defines common methods that all exchange adapters must implement
 */
export interface ExchangeAdapter {
  // Connection methods
  connect(credentials: ExchangeCredentials): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  checkConnection(): Promise<boolean>;
  
  // Market data methods
  getMarkets(): Promise<Market[]>;
  getTicker(symbol: string): Promise<Ticker>;
  getOrderBook(symbol: string, depth?: number): Promise<OrderBook>;
  subscribeToTicker(symbol: string, callback: (ticker: Ticker) => void): Promise<Subscription>;
  subscribeToOrderBook(symbol: string, callback: (orderBook: OrderBook) => void): Promise<Subscription>;
  subscribeToTrades(symbol: string, callback: (trade: PublicTrade) => void): Promise<Subscription>;
  
  // Account methods
  getBalances(): Promise<Balance[]>;
  getPositions(symbol?: string): Promise<Position[]>;
  
  // Order methods
  placeOrder(params: OrderRequest): Promise<Order>;
  cancelOrder(orderId: string, symbol: string): Promise<boolean>;
  getOrder(orderId: string, symbol: string): Promise<Order>;
  getOpenOrders(symbol?: string): Promise<Order[]>;
  getOrderHistory(symbol?: string, since?: Date, limit?: number): Promise<Order[]>;
  
  // Trade methods
  getTrades(symbol?: string, since?: Date, limit?: number): Promise<Trade[]>;
}

// Common type definitions
export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  additionalCredentials?: Record<string, any>;
  isTestnet?: boolean;
}

export interface ConnectionResult {
  success: boolean;
  message: string;
  permissions?: {
    trading: boolean;
    margin: boolean;
    futures: boolean;
    withdrawal: boolean;
  };
}

export interface Market {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  pricePrecision: number;
  quantityPrecision: number;
  minQuantity: number;
  maxQuantity?: number;
  minNotional?: number;
  status: 'active' | 'inactive';
  type: 'spot' | 'margin' | 'futures' | 'options';
  expiryTime?: Date;
  metadata?: Record<string, any>;
}

export interface Ticker {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  high: number;
  low: number;
  volume: number;
  quoteVolume: number;
  timestamp: Date;
  percentChange24h?: number;
}

export interface OrderBook {
  symbol: string;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][]; // [price, quantity]
  timestamp: Date;
}

export interface Subscription {
  id: string;
  unsubscribe: () => Promise<void>;
}

export interface PublicTrade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: Date;
}

export interface Balance {
  currency: string;
  available: number;
  total: number;
  inOrder: number;
  btcValue?: number;
}

export interface Position {
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice?: number;
  marginType?: 'isolated' | 'cross';
  leverage?: number;
  unrealizedPnl: number;
  unrealizedPnlPercent?: number;
  collateral?: number;
  notional?: number;
  timestamp: Date;
}

export interface OrderRequest {
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop' | 'oco' | 'post_only';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  postOnly?: boolean;
  reduceOnly?: boolean;
  leverage?: number;
  clientOrderId?: string;
  additionalParams?: Record<string, any>;
}

export interface Order {
  id: string;
  clientOrderId?: string;
  symbol: string;
  type: string;
  side: 'buy' | 'sell';
  status: 'new' | 'open' | 'partially_filled' | 'filled' | 'canceled' | 'rejected' | 'expired';
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  price?: number;
  stopPrice?: number;
  avgFillPrice?: number;
  timestamp: Date;
  lastUpdateTime?: Date;
  timeInForce?: string;
  reduceOnly?: boolean;
  postOnly?: boolean;
  rawExchangeData?: Record<string, any>;
}

export interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  fee: number;
  feeCurrency: string;
  timestamp: Date;
  rawExchangeData?: Record<string, any>;
}
