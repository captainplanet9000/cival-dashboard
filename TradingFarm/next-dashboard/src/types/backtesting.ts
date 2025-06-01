/**
 * Backtesting and Strategy Development Type Definitions
 */

// Time periods for backtesting
export enum TimeframeUnit {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month'
}

export interface Timeframe {
  value: number;
  unit: TimeframeUnit;
}

// Supported strategy types
export enum StrategyType {
  TREND_FOLLOWING = 'trend_following',
  MEAN_REVERSION = 'mean_reversion',
  BREAKOUT = 'breakout',
  MOMENTUM = 'momentum',
  CUSTOM = 'custom'
}

// Market data for backtesting
export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  close: number;
  low: number;
  volume: number;
}

// Parameters for backtesting
export interface BacktestParameters {
  id?: string;
  user_id: string;
  name: string;
  description?: string;
  strategy_type: StrategyType;
  exchange: string;
  symbol: string;
  start_date: string;
  end_date: string;
  timeframe: Timeframe;
  initial_capital: number;
  parameters: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Results of a backtest run
export interface BacktestResult {
  id: string;
  backtest_id: string;
  user_id: string;
  total_trades: number;
  win_rate: number;
  profit_loss: number;
  max_drawdown: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
  equity_curve: { timestamp: number; value: number }[];
  trades: BacktestTrade[];
  monthly_returns: { month: string; return_pct: number }[];
  metrics: {
    average_win: number;
    average_loss: number;
    max_consecutive_wins: number;
    max_consecutive_losses: number;
    profit_factor: number;
    recovery_factor: number;
    expected_payoff: number;
    annualized_return: number;
  };
  created_at: string;
  updated_at: string;
}

// Individual trade from backtest
export interface BacktestTrade {
  entry_time: string;
  exit_time: string;
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number;
  exit_price: number;
  quantity: number;
  profit_loss: number;
  profit_loss_pct: number;
  exit_reason: 'take_profit' | 'stop_loss' | 'signal' | 'end_of_period';
}

// Strategy template
export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  type: StrategyType;
  default_parameters: Record<string, any>;
  parameter_descriptions: Record<string, string>;
  code_template: string;
  created_at: string;
  category: 'basic' | 'advanced' | 'community';
}

// Strategy implementation
export interface Strategy {
  id?: string;
  user_id: string;
  name: string;
  description?: string;
  type: StrategyType;
  is_public: boolean;
  parameters: Record<string, any>;
  code: string;
  base_template_id?: string;
  backtests?: string[];
  created_at?: string;
  updated_at?: string;
}

// Parameter validation rules
export interface ParameterValidation {
  name: string;
  type: 'number' | 'boolean' | 'string' | 'select';
  label: string;
  description: string;
  default_value: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: any }[];
  required: boolean;
}

// Optimization parameters
export interface OptimizationParameters {
  id?: string;
  user_id: string;
  strategy_id: string;
  backtest_base_id: string;
  parameters_to_optimize: {
    name: string;
    min: number;
    max: number;
    step: number;
  }[];
  optimization_metric: 'sharpe_ratio' | 'total_return' | 'win_rate' | 'profit_factor';
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  created_at?: string;
  updated_at?: string;
}

// Optimization results
export interface OptimizationResult {
  id: string;
  optimization_id: string;
  user_id: string;
  results: {
    parameters: Record<string, any>;
    metric_value: number;
    backtest_result_id: string;
  }[];
  best_result: {
    parameters: Record<string, any>;
    metric_value: number;
    backtest_result_id: string;
  };
  created_at: string;
}
