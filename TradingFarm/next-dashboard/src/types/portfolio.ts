/**
 * Portfolio Management Type Definitions
 */

// Portfolio allocation methods
export enum AllocationMethod {
  EQUAL_WEIGHT = 'equal_weight',
  RISK_PARITY = 'risk_parity',
  MAXIMUM_SHARPE = 'maximum_sharpe',
  MINIMUM_VARIANCE = 'minimum_variance',
  CUSTOM = 'custom'
}

// Rebalancing frequencies
export enum RebalancingFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  THRESHOLD = 'threshold', // Based on drift threshold
  MANUAL = 'manual'
}

// Portfolio status
export enum PortfolioStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  DRAFT = 'draft'
}

// Portfolio definition
export interface Portfolio {
  id?: string;
  user_id: string;
  name: string;
  description?: string;
  status: PortfolioStatus;
  initial_capital: number;
  current_value: number;
  allocation_method: AllocationMethod;
  rebalancing_frequency: RebalancingFrequency;
  drift_threshold?: number; // Used for threshold-based rebalancing
  last_rebalanced?: string; // ISO date string
  next_rebalance?: string; // ISO date string
  rebalance_notification?: boolean; // Flag to indicate portfolio needs rebalancing
  created_at?: string;
  updated_at?: string;
}

// Portfolio allocation
export interface PortfolioAllocation {
  id?: string;
  portfolio_id: string;
  strategy_id: string;
  strategy_name?: string; // Denormalized for convenience
  allocation_percentage: number; // 0-100
  current_value?: number;
  target_value?: number;
  actual_percentage?: number; // Actual percentage based on current value
  drift?: number; // Difference between target and actual percentage
  created_at?: string;
  updated_at?: string;
}

// Portfolio performance metrics
export interface PortfolioPerformance {
  id?: string;
  portfolio_id: string;
  date: string;
  value: number;
  daily_return: number;
  daily_return_pct: number;
  cumulative_return: number;
  cumulative_return_pct: number;
  drawdown: number;
  drawdown_pct: number;
  volatility_30d: number;
  sharpe_ratio_30d: number;
  sortino_ratio_30d: number;
  max_drawdown_30d: number;
  max_drawdown_30d_pct: number;
}

// Rebalancing transaction
export interface RebalancingTransaction {
  id?: string;
  portfolio_id: string;
  date: string;
  strategy_id: string;
  strategy_name?: string;
  action: 'buy' | 'sell';
  amount: number;
  previous_allocation: number;
  new_allocation: number;
  reason: 'scheduled' | 'threshold' | 'manual';
  executed_by: string; // User ID or 'system'
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string; // Error message if failed
  executed_at?: string; // When the transaction was executed
  created_at?: string;
  updated_at?: string;
  
  // Supabase nested relationships
  portfolios?: {
    id: string;
    name: string;
    user_id: string;
  };
  strategies?: {
    id: string;
    name: string;
    exchange?: string;
    market?: string;
  };
}

// Portfolio optimization parameters
export interface OptimizationParameters {
  id?: string;
  portfolio_id: string;
  optimization_goal: 'maximize_return' | 'minimize_risk' | 'maximize_sharpe' | 'custom';
  risk_free_rate: number;
  constraints: {
    max_allocation_per_strategy?: number;
    min_allocation_per_strategy?: number;
    max_portfolio_volatility?: number;
    min_expected_return?: number;
    custom_constraints?: Record<string, any>;
  };
  lookback_period: '1m' | '3m' | '6m' | '1y' | 'ytd' | 'all';
  created_at?: string;
  updated_at?: string;
}

// Optimization result
export interface OptimizationResult {
  id?: string;
  optimization_id: string;
  portfolio_id: string;
  date: string;
  allocations: {
    strategy_id: string;
    strategy_name: string;
    current_allocation: number;
    recommended_allocation: number;
    change: number;
  }[];
  expected_portfolio_return: number;
  expected_portfolio_volatility: number;
  expected_sharpe_ratio: number;
  created_at?: string;
  applied_at?: string;
}

// Portfolio correlation matrix
export interface CorrelationMatrix {
  portfolio_id: string;
  date: string;
  period: '1m' | '3m' | '6m' | '1y';
  matrix: {
    strategy_id: string;
    strategy_name: string;
    correlations: {
      strategy_id: string;
      correlation: number;
    }[];
  }[];
}

// Portfolio allocation targets
export interface AllocationTarget {
  id?: string;
  portfolio_id: string;
  strategy_id: string;
  target_percentage: number;
  min_percentage?: number;
  max_percentage?: number;
  is_locked: boolean; // If true, optimization won't change this allocation
  created_at?: string;
  updated_at?: string;
}

// Portfolio report
export interface PortfolioReport {
  id?: string;
  portfolio_id: string;
  report_date: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  starting_value: number;
  ending_value: number;
  profit_loss: number;
  profit_loss_pct: number;
  best_performing_strategy: {
    strategy_id: string;
    strategy_name: string;
    return_pct: number;
  };
  worst_performing_strategy: {
    strategy_id: string;
    strategy_name: string;
    return_pct: number;
  };
  market_correlation: number;
  risk_metrics: {
    volatility: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    max_drawdown: number;
    max_drawdown_pct: number;
    var_95: number; // Value at Risk (95% confidence)
    cvar_95: number; // Conditional Value at Risk (95% confidence)
  };
  created_at?: string;
}
