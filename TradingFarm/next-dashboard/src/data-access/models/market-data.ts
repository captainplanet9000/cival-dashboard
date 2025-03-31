/**
 * Market Data model for storing price and market information
 */
import { BaseEntity } from './base-entity';

export interface MarketData extends BaseEntity {
  symbol: string;
  exchange: string;
  data_type: 'ticker' | 'candle' | 'orderbook' | 'trade' | 'depth';
  timeframe?: string; // For candle data (1m, 5m, 15m, 1h, etc.)
  data: {
    price?: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
    timestamp?: number;
    bids?: Array<[number, number]>; // [price, size]
    asks?: Array<[number, number]>; // [price, size]
    [key: string]: any;
  };
  fetched_at: string; // ISO timestamp
  source: 'api' | 'websocket' | 'calculation' | 'import';
  is_realtime?: boolean;
}
