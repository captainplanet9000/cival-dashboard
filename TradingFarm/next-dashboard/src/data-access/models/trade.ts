/**
 * Trade model representing executed trades
 */
import { BaseEntity } from './base-entity';

export interface Trade extends BaseEntity {
  order_id: number;
  farm_id: number;
  agent_id?: number;
  exchange: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  fee?: number;
  fee_currency?: string;
  total_value: number; // Price * Quantity
  profit_loss?: number; // For closed positions
  profit_loss_percent?: number;
  executed_at: string;
  strategy_id?: number;
  external_id?: string;
  metadata?: {
    trade_type?: 'entry' | 'exit' | 'partial';
    position_id?: number;
    exit_reason?: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'manual' | 'signal' | 'liquidation';
    market_conditions?: Record<string, any>;
    tags?: string[];
    is_backtest?: boolean;
  };
}
