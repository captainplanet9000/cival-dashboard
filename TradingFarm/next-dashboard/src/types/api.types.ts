// API Types for Trading Farm Dashboard

export interface Farm {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  metrics: {
    portfolioValue: number;
    dailyChange: number;
    activeAgents: number;
    totalTrades: number;
    profitableTrades: number;
  };
}

export interface Agent {
  id: string;
  name: string;
  farmId: string;
  status: 'active' | 'inactive' | 'error';
  strategy: string;
  metrics: {
    profit: number;
    trades: number;
    winRate: number;
  };
}

export interface RiskMetrics {
  portfolioRisk: {
    var95: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
  marketState: {
    btcVolatility: number;
    ethVolatility: number;
    marketCondition: 'bullish' | 'bearish' | 'neutral';
  };
}

export interface Order {
  id: string;
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  status: 'open' | 'filled' | 'canceled' | 'partial';
  timestamp: string;
}

export interface DashboardData {
  userId: string;
  farms: Farm[];
  agents: Agent[];
  riskMetrics: RiskMetrics;
  recentOrders: Order[];
}

export interface ApiError {
  error: string;
  status?: number;
}

// WebSocket Message Types for ElizaOS Integration
export interface CommandMessage {
  id: string;
  content: string;
  timestamp: string;
  category: 'command' | 'query' | 'analysis' | 'alert';
  source: 'user' | 'system' | 'knowledge-base' | 'market-data' | 'strategy';
  farmId: string;
}

export interface OrderUpdate {
  id: string;
  type: 'ORDER_UPDATE';
  status: 'filled' | 'partial' | 'open' | 'canceled';
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  timestamp: string;
  farmId: string;
}

export interface PriceAlert {
  id: string;
  type: 'PRICE_ALERT';
  symbol: string;
  price: number;
  condition: 'above' | 'below';
  threshold: number;
  message: string;
  timestamp: string;
  farmId: string;
}

export interface ExecutionNotification {
  id: string;
  type: 'EXECUTION_NOTIFICATION';
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  fee: number;
  timestamp: string;
  farmId: string;
}

export type SocketMessage = CommandMessage | OrderUpdate | PriceAlert | ExecutionNotification;
