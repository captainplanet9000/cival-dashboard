export interface ExchangeCredentials {
  id?: string;
  user_id: string;
  exchange: 'bybit' | 'coinbase' | 'hyperliquid' | 'binance';
  name: string;
  api_key: string;
  api_secret: string;
  passphrase?: string; // For Coinbase
  testnet: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BybitBalance {
  coin: string;
  walletBalance: string;
  availableBalance: string;
  usdValue?: string;
}

export interface BybitPosition {
  symbol: string;
  side: 'Buy' | 'Sell';
  size: string;
  entryPrice: string;
  leverage: string;
  markPrice: string;
  unrealisedPnl: string;
  unrealisedPnlPct?: number;
  liquidationPrice: string;
  positionValue: string;
  createdTime: string;
}

export interface BybitOrder {
  orderId: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Limit' | 'Market';
  price: string;
  qty: string;
  timeInForce: string;
  orderStatus: string;
  cumExecQty: string;
  cumExecValue: string;
  cumExecFee: string;
  createdTime: string;
  updatedTime: string;
}

export interface MarketData {
  symbol: string;
  lastPrice: string;
  bidPrice: string;
  askPrice: string;
  volume24h: string;
  priceChange24h: string;
  priceChangePercent24h: string;
  high24h: string;
  low24h: string;
}

export interface OrderParams {
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Limit' | 'Market';
  qty: string;
  price?: string; // Optional for market orders
  timeInForce?: string; // GTC, IOC, FOK
  reduceOnly?: boolean;
  closeOnTrigger?: boolean;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface ExchangeConfig {
  id: string;
  exchange: 'bybit' | 'coinbase' | 'hyperliquid' | 'binance';
  name: string;
  testnet: boolean;
  active: boolean;
}

export interface ExchangeStats {
  totalBalance: number;
  totalPositions: number;
  totalOrders: number;
  uptime: number;
  lastSync: string;
}
