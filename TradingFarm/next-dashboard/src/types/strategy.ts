/**
 * Type definitions for trading strategies
 */

export interface Strategy {
  id: number;
  name: string;
  category: string;
  status: 'active' | 'paused' | 'testing' | 'failed';
  type: string;
  performance: number;
  created_at: string;
}

export interface StrategyDetail extends Strategy {
  description?: string;
  parameters?: StrategyParameter[];
  timeframes?: string[];
  risk_score?: number;
  author?: string;
  last_modified?: string;
  version?: string;
  code?: string;
  backtest_results?: string;
}

export interface StrategyParameter {
  name: string;
  type: 'number' | 'boolean' | 'string' | 'select';
  default: any;
  description: string;
  options?: string[]; // For select type parameters
  min?: number; // For number type parameters
  max?: number; // For number type parameters
}
