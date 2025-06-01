/**
 * Socket.IO messaging type definitions for the Trading Farm system
 * Enhanced with comprehensive ElizaOS integration and real-time market data structures
 */

import { ReactNode } from 'react';

/**
 * Standard Trading Events used across client and server
 */
export enum TradingEvent {
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  COMMAND = 'command',
  MARKET_UPDATE = 'market_update',
  TRADE_EXECUTION = 'trade_execution',
  PORTFOLIO_UPDATE = 'portfolio_update',
  AGENT_STATUS = 'agent_status',
  KNOWLEDGE_QUERY = 'knowledge_query',
  SYSTEM_NOTIFICATION = 'system_notification',
  CHART_DATA = 'chart_data',
  ORDER_BOOK = 'order_book',
  SUBSCRIBE_MARKET = 'subscribe:marketData',
  UNSUBSCRIBE_MARKET = 'unsubscribe:marketData'
}

export enum MessageType {
  Command = "command",
  Response = "response",
  System = "system",
  Error = "error",
  Processing = "processing"
}

export interface Message {
  id: string;
  content: string | ReactNode;
  timestamp: string;
  type: MessageType;
  sender?: string;
  metadata?: {
    intent?: string;
    confidence?: number;
    entities?: Record<string, string>;
    [key: string]: any;
  };
}

/**
 * Market data structures
 */
export interface MarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
}

export interface MarketUpdate {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  timestamp: string;
  market_cap?: number;
  high_24h?: number;
  low_24h?: number;
  image?: string;
}

export interface MarketChartData {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface ChartDataResponse {
  asset: string;
  data: MarketChartData;
}

export interface SimplePrice {
  [id: string]: {
    [currency: string]: number;
  };
}

export interface Trending {
  coins: {
    item: {
      id: string;
      name: string;
      symbol: string;
      market_cap_rank: number;
      thumb: string;
      small: string;
      large: string;
      slug: string;
      price_btc: number;
      score: number;
    };
  }[];
}

/**
 * Trading structures
 */
export interface TradeExecution {
  id: string;
  symbol: string;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  timestamp: string;
  total: number;
  fee: number;
  status?: 'pending' | 'completed' | 'failed' | 'canceled';
  orderId?: string;
  exchange?: string;
  executedBy?: 'user' | 'agent';
  agentId?: string;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export interface OrderBook {
  symbol: string;
  timestamp: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  status: 'open' | 'closed' | 'canceled';
  price: number;
  amount: number;
  filled: number;
  remaining: number;
  cost: number;
  fee: number;
  created: string;
  updated: string;
}

/**
 * Portfolio structures
 */
export interface PortfolioUpdate {
  totalValue: number;
  change24h: number;
  assets: PortfolioAsset[];
  timestamp?: string;
  performance?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
    yearly?: number;
  };
}

export interface PortfolioAsset {
  symbol: string;
  amount: number;
  value: number;
  allocation?: number;
  price?: number;
  change24h?: number;
  costBasis?: number;
  profit?: number;
}

/**
 * Trading Agent structures
 */
export interface AgentStatus {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'error' | 'stopped';
  asset: string;
  strategy: string;
  performance: {
    daily: number;
    weekly?: number;
    monthly?: number;
  };
  lastActive?: string;
  description?: string;
  config?: Record<string, any>;
  trades?: number;
  successRate?: number;
}

/**
 * Knowledge Base structures
 */
export interface KnowledgeResult {
  query: string;
  documents: KnowledgeDocument[];
  sources?: string[];
  relatedQueries?: string[];
  totalResults?: number;
  status?: string;
  timestamp?: string;
}

export interface KnowledgeDocument {
  id: string;
  title?: string;
  relevance?: number;
  score?: number;
  snippet: string;
  source?: string;
  url?: string;
  timestamp?: string;
  tags?: string[];
}

/**
 * ElizaOS AI Integration structures
 */
export interface ElizaCommand {
  command: string;
  args?: string[];
  rawInput: string;
  timestamp: string;
  sessionId: string;
  intent?: {
    type: string;
    confidence: number;
    entities: Record<string, string>;
  };
}

export interface ElizaResponse {
  response: string | ReactNode;
  status: 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
  command?: string;
  data?: any;
  format?: 'text' | 'json' | 'html' | 'markdown';
}

/**
 * Socket.IO Client Configuration
 */
export interface SocketConfig {
  url: string;
  options?: {
    reconnection: boolean;
    reconnectionAttempts: number;
    reconnectionDelay: number;
    timeout: number;
  };
}

/**
 * Client Session State
 */
export interface ClientSession {
  id: string;
  connectedAt: string;
  messages: Message[];
  subscriptions: {
    marketData: boolean;
    portfolio: boolean;
    agents: boolean;
  };
}
