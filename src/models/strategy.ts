/**
 * Strategy model representing a trading strategy
 */
export interface Strategy {
  id: string;
  name: string;
  description: string;
  strategy_type: 'pinescript' | 'custom' | 'preset';
  parameters: Record<string, any>;
  is_active: boolean;
  performance_metrics?: {
    backtest_count?: number;
    avg_profit_loss?: number;
    win_rate?: number;
    sharpe_ratio?: number;
    max_drawdown?: number;
    last_backtest_date?: string;
    last_updated?: string;
    [key: string]: any;
  };
  backtest_results?: {
    strategy_id?: string;
    timeframe?: string;
    symbol?: string;
    start_date?: string;
    end_date?: string;
    total_trades?: number;
    winning_trades?: number;
    losing_trades?: number;
    profit_loss?: number;
    max_drawdown?: number;
    sharpe_ratio?: number;
    execution_time_ms?: number;
    trades?: any[];
    equity_curve?: any[];
    executed_at?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Strategy creation parameters
 */
export type CreateStrategyParams = Omit<Strategy, 'id' | 'created_at' | 'updated_at'>;

/**
 * Strategy update parameters
 */
export type UpdateStrategyParams = Partial<Omit<Strategy, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Strategy query options
 */
export interface StrategyQueryOptions {
  strategy_type?: Strategy['strategy_type'];
  is_active?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
} 