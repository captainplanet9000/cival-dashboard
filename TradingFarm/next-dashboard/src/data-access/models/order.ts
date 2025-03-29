/**
 * Order model
 */
import { BaseEntity } from './base-entity';

export interface Order extends BaseEntity {
  agent_id: number;
  farm_id: number;
  exchange: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'trailing_stop';
  status: 'pending' | 'open' | 'closed' | 'canceled' | 'rejected';
  amount: number;
  price?: number;
  filled_amount?: number;
  average_fill_price?: number;
  stop_price?: number;
  trailing_percent?: number;
  time_in_force?: 'GTC' | 'IOC' | 'FOK';
  external_id?: string;
  metadata?: Record<string, any>;
}
