/**
 * Market Data model
 */
import { BaseEntity } from './base-entity';

export interface MarketData extends BaseEntity {
  symbol: string;
  exchange: string;
  timeframe: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
  backtest_results?: Record<string, any>;
  metadata?: Record<string, any>;
  data?: Record<string, any>;
}
