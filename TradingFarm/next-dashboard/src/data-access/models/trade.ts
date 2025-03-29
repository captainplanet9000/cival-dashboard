/**
 * Trade model
 */
import { BaseEntity } from './base-entity';

export interface Trade extends BaseEntity {
  order_id: number;
  symbol: string;
  exchange: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  fee: number;
  fee_currency: string;
  timestamp: string;
  external_id?: string;
  metadata?: Record<string, any>;
}
