/**
 * WebSocket Types
 * 
 * Defines typings for the WebSocket management system.
 */

// Supported exchanges
export type ExchangeId = 'binance' | 'coinbase' | 'kraken' | 'kucoin' | 'bybit' | 'hyperliquid';

// WebSocket connection status
export type ConnectionStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error';

// WebSocket message directions
export type MessageDirection = 'inbound' | 'outbound';

// WebSocket message types
export enum MessageType {
  Raw = 'raw',
  Heartbeat = 'heartbeat',
  Subscription = 'subscription',
  Trade = 'trade',
  Ticker = 'ticker',
  OrderBook = 'orderbook',
  Candle = 'candle',
  OrderUpdate = 'order_update',
  BalanceUpdate = 'balance_update',
  PositionUpdate = 'position_update',
  Error = 'error',
  System = 'system'
}

// Generic WebSocket message
export interface WebSocketMessage {
  exchange: ExchangeId;
  timestamp: number;
  type: MessageType;
  direction: MessageDirection;
  channel?: string;
  symbols?: string[];
  data: any;
  raw?: any;
}

// WebSocket connection options
export interface ConnectionOptions {
  url: string;
  protocols?: string | string[];
  exchange: ExchangeId;
  name: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  heartbeatMessage?: any;
  subscriptions?: Subscription[];
  onMessage?: (msg: WebSocketMessage) => void;
  onError?: (error: Error, connection: WebSocketConnection) => void;
  onStatusChange?: (status: ConnectionStatus, connection: WebSocketConnection) => void;
  formatters?: {
    parseMessage?: (data: any) => WebSocketMessage;
    formatSubscription?: (subscription: Subscription) => any;
    formatHeartbeat?: () => any;
  };
}

// WebSocket subscription
export interface Subscription {
  channel: string;
  symbols: string[];
  params?: Record<string, any>;
}

// WebSocket connection interface
export interface WebSocketConnection {
  id: string;
  status: ConnectionStatus;
  exchange: ExchangeId;
  name: string;
  url: string;
  socket: WebSocket | null;
  options: ConnectionOptions;
  subscriptions: Subscription[];
  lastMessageTime: number;
  reconnectAttempts: number;
  heartbeatInterval?: number;
  reconnectTimeout?: any;
  heartbeatTimeout?: any;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(data: any): void;
  subscribe(subscription: Subscription): void;
  unsubscribe(channel: string, symbols?: string[]): void;
  isActive(): boolean;
}

// WebSocket connection statistics
export interface ConnectionStatistics {
  connectionId: string;
  exchange: ExchangeId;
  status: ConnectionStatus;
  uptime: number;
  messageCount: {
    inbound: number;
    outbound: number;
    total: number;
  };
  lastMessageTime: number;
  reconnectCount: number;
  latency: number;
}

// WebSocket pool statistics
export interface PoolStatistics {
  totalConnections: number;
  activeConnections: number;
  messageRate: number;
  connections: ConnectionStatistics[];
}

// Trade data structure
export interface TradeData {
  id: string;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  time: number;
  maker?: boolean;
  taker?: boolean;
}

// Order book data structure
export interface OrderBookData {
  bids: [number, number][];
  asks: [number, number][];
  lastUpdateId: number;
  timestamp?: number;
}

// Ticker data structure
export interface TickerData {
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  high: number;
  low: number;
  timestamp?: number;
}

// Candle/Kline data structure
export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  interval: string;
  isClosed: boolean;
  quoteVolume?: number;
}

// Parsed message structure with standardized fields
export interface ParsedMessage {
  type: MessageType;
  exchange: ExchangeId;
  symbol: string;
  timestamp: number;
  data: TradeData | OrderBookData | TickerData | CandleData | any;
  raw?: any;
}

// WebSocket events
export enum WebSocketEvent {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Reconnecting = 'reconnecting',
  MessageReceived = 'message',
  ParsedMessage = 'parsed_message',
  Error = 'error',
  SubscriptionChanged = 'subscription',
  StatusChanged = 'status',
  HeartbeatMissed = 'heartbeat_missed',
  Statistics = 'statistics'
}

// WebSocket event handlers
export type WebSocketEventHandler = (data: any, connection?: WebSocketConnection) => void;

// Exchange-specific message parsers
export interface MessageParser {
  parseMessage(data: any, exchange: ExchangeId): WebSocketMessage;
  formatSubscription(subscription: Subscription, exchange: ExchangeId): any;
  formatHeartbeat(exchange: ExchangeId): any;
}
