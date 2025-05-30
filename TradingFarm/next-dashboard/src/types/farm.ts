/**
 * Type definitions for trading farms
 */

export interface Farm {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'stopped' | 'archived';
  goal_percentage: number;
  assets: string[];
  created_at: string;
}

export interface FarmDetail extends Farm {
  agent_count?: number;
  strategy_count?: number;
  performance_metrics?: {
    daily_pnl: number;
    weekly_pnl: number;
    monthly_pnl: number;
    all_time_pnl: number;
    win_rate: number;
    max_drawdown: number;
  };
  capital_allocation?: {
    total_capital: number;
    allocated_capital: number;
    available_capital: number;
  };
  risk_settings?: {
    max_drawdown_percentage: number;
    position_size_percentage: number;
    stop_loss_type: 'fixed' | 'atr' | 'volatility' | 'support_resistance';
  };
}
