export type OrderStatus = 'new' | 'open' | 'partially_filled' | 'filled' | 'canceled' | 'rejected';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
export type OrderSide = 'buy' | 'sell';
export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1w';
export type PositionSide = 'long' | 'short';
export type ExchangeType = 'spot' | 'futures' | 'options';
export type StrategyStatus = 'active' | 'paused' | 'stopped' | 'error';

export interface MarketInfo {
  exchange: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  type: ExchangeType;
  minOrderSize: number;
  pricePrecision: number;
  sizePrecision: number;
  tickSize: number;
  minNotional: number;
  leverage?: {
    max: number;
    default: number;
  };
}

export interface Market {
  info: MarketInfo;
  lastPrice?: number;
  lastUpdateTime?: number;
  bid?: number;
  ask?: number;
  volume24h?: number;
  priceChange24h?: number;
  priceChangePercent24h?: number;
  high24h?: number;
  low24h?: number;
}

export interface Order {
  id: string;
  exchangeId?: string;
  symbol: string;
  exchange: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  price?: number;
  stopPrice?: number;
  quantity: number;
  filledQuantity: number;
  avgFillPrice?: number;
  createdAt: string;
  updatedAt: string;
  clientOrderId?: string;
  strategyId?: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface Position {
  id: string;
  symbol: string;
  exchange: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice?: number;
  leverage?: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  initialMargin?: number;
  openTime: string;
  updateTime: string;
  stopLoss?: number;
  takeProfit?: number;
  strategyId?: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface StrategyExecution {
  id: string;
  strategyId: string;
  name: string;
  status: StrategyStatus;
  startTime: string;
  lastUpdateTime: string;
  signals: number;
  orders: number;
  pnl: number;
  pnlPercent: number;
  parameters: Record<string, any>;
  userId: string;
  metadata?: Record<string, any>;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  id: string;
  symbol: string;
  exchange: string;
  side: OrderSide;
  price: number;
  quantity: number;
  value: number;
  fee: number;
  feeCurrency: string;
  timestamp: string;
  orderId: string;
  userId: string;
  strategyId?: string;
  metadata?: Record<string, any>;
}

export interface StrategyBacktestResult {
  id: string;
  strategyId: string;
  startTime: string;
  endTime: string;
  initialCapital: number;
  finalCapital: number;
  profit: number;
  profitPercent: number;
  trades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  parameters: Record<string, any>;
  metadata?: Record<string, any>;
}
