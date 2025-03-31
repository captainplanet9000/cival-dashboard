/**
 * Order model for trading system
 */
import { BaseEntity } from './base-entity';

export interface Order extends BaseEntity {
  farm_id: number;
  agent_id?: number; // Optional, as orders can be created manually
  exchange: string;
  symbol: string;
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number; // Required for limit orders
  trigger_price?: number; // For stop and stop-limit orders
  status: 'new' | 'open' | 'filled' | 'partially_filled' | 'canceled' | 'rejected' | 'expired';
  filled_quantity: number;
  average_filled_price?: number;
  fee?: number;
  fee_currency?: string;
  external_id?: string; // ID from the exchange
  strategy_id?: number; // If created by a strategy
  metadata?: {
    stop_loss_price?: number;
    take_profit_price?: number;
    trailing_percent?: number;
    time_in_force?: 'GTC' | 'IOC' | 'FOK' | 'GTD';
    expiration_time?: string;
    client_order_id?: string;
    tags?: string[];
    notes?: string;
    is_hedging?: boolean;
    is_backtest?: boolean;
  };
  executed_at?: string;
}
