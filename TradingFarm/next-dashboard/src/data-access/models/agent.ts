/**
 * Agent model
 */
import { BaseEntity } from './base-entity';

export interface Agent extends BaseEntity {
  name: string;
  type: string;
  farm_id: number;
  status: 'active' | 'paused' | 'stopped' | 'error';
  config?: {
    timeframes?: string[];
    markets?: string[];
    max_positions?: number;
    strategy_parameters?: Record<string, any>;
  };
  memory_context?: Record<string, any>;
  performance_metrics?: {
    win_rate: number;
    profit_factor?: number;
    trades_count: number;
    total_profit_loss?: number;
  };
  capabilities?: string[];
  last_active_at?: string;
}
