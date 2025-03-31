/**
 * Farm model representing a trading farm entity
 */
import { BaseEntity } from './base-entity';

export interface Farm extends BaseEntity {
  name: string;
  description?: string;
  is_active: boolean;
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
    max_drawdown_amount?: number;
    max_drawdown_percent?: number;
  };
  config: {
    test_mode?: boolean;
    allowed_exchanges?: string[];
    allowed_markets?: string[];
    max_agents?: number;
    auto_rebalance?: boolean;
    max_concurrent_trades?: number;
  };
  metadata?: Record<string, any>;
}
