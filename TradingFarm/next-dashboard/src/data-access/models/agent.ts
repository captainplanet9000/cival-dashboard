/**
 * Agent model representing a trading agent
 */
import { BaseEntity } from './base-entity';

export interface Agent extends BaseEntity {
  farm_id: number;
  name: string;
  description?: string;
  is_active: boolean;
  agent_type: 'momentum' | 'mean_reversion' | 'trend_following' | 'arbitrage' | 'custom';
  markets: string[];
  timeframes: string[];
  parameters: {
    entry_conditions?: any[];
    exit_conditions?: any[];
    risk_management?: {
      stop_loss_percent?: number;
      take_profit_percent?: number;
      trailing_stop?: boolean;
      trailing_stop_distance?: number;
      max_drawdown?: number;
      position_sizing?: 'fixed' | 'percent' | 'kelly' | 'volatility';
    };
    execution?: {
      order_type: 'market' | 'limit' | 'stop' | 'stop_limit';
      slippage_tolerance?: number;
      use_take_profit?: boolean;
      use_stop_loss?: boolean;
    };
    indicators?: Record<string, any>;
    custom_settings?: Record<string, any>;
  };
  performance_metrics: {
    win_rate: number;
    profit_factor?: number;
    trades_count: number;
    total_profit_loss?: number;
    average_win?: number;
    average_loss?: number;
    sharpe_ratio?: number;
    max_drawdown?: number;
    average_trade_duration?: number;
  };
  last_active_at?: string;
  memory_metadata?: {
    memory_count: number;
    last_consolidation?: string;
    important_insights?: string[];
  };
}
