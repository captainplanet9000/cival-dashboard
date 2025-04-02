/**
 * Data types for the Trading Farm platform
 */

// Farm type
export interface Farm {
  id: number;
  name: string;
  description?: string;
  user_id: string;
  is_active: boolean;
  status: 'active' | 'inactive' | 'paused';
  exchange?: string;
  asset_pairs?: string[];
  risk_profile: {
    max_drawdown: number;
    max_trade_size?: number;
    risk_per_trade?: number;
    volatility_tolerance?: 'low' | 'medium' | 'high';
  };
  performance_metrics: {
    win_rate: number;
    profit_factor?: number;
    trades_count: number;
    total_profit_loss?: number;
    average_win?: number;
    average_loss?: number;
  };
  created_at: string;
  updated_at: string;
  agents?: Agent[];
  wallets?: Wallet[];
}

// Agent type
export interface Agent {
  id: number;
  name: string;
  description?: string;
  farm_id: number;
  is_active: boolean;
  status: 'idle' | 'running' | 'error' | 'paused';
  type: string;
  strategy_id?: number;
  strategy_name?: string;
  configuration?: {
    exchange?: string;
    api_key_id?: string;
    trading_pairs?: string[];
    risk_level?: number;
    max_order_size?: number;
    use_elizaos?: boolean;
    elizaos_settings?: Record<string, any>;
  };
  performance?: {
    trades_count: number;
    win_rate: number;
    profit_loss: number;
    active_since?: string;
    last_trade?: string;
  };
  created_at: string;
  updated_at: string;
}

// Wallet type
export interface Wallet {
  id: number;
  name: string;
  description?: string;
  farm_id?: number;
  user_id?: string;
  address: string;
  balance: number;
  currency: string;
  wallet_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  transactions?: Transaction[];
}

// Transaction type
export interface Transaction {
  id: number;
  type: string;
  amount: number;
  wallet_id: number;
  farm_id?: number;
  agent_id?: number;
  status: string;
  hash?: string;
  created_at: string;
  updated_at: string;
}

// Risk profile type
export interface RiskProfile {
  riskScore: number;
  factors: Array<{ 
    name: string;
    impact: number; 
    description: string;
  }>;
}

// Performance metrics for dashboard
export interface PerformanceMetrics {
  dailyPnL: Array<{ date: string; value: number }>;
  monthlyPnL: Array<{ date: string; value: number }>;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio?: number;
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
}

// Trade type
export interface Trade {
  id: number;
  agent_id: number;
  symbol: string;
  type: 'market' | 'limit' | 'stop';
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  status: 'open' | 'closed' | 'canceled';
  profit_loss?: number;
  fee?: number;
  opened_at: string;
  closed_at?: string;
}

// ElizaOS command response type
export interface ElizaCommandResponse {
  type: 'command' | 'query' | 'analysis' | 'alert';
  content: string;
  source?: 'knowledge-base' | 'market-data' | 'strategy' | 'system';
  timestamp: string;
  metadata?: Record<string, any>;
}

// Strategy type
export interface Strategy {
  id: number;
  name: string;
  description?: string;
  code: string;
  language: string;
  is_public: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  backtest_results?: Record<string, any>;
}
