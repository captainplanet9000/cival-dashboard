/**
 * Transaction model for tracking financial movements
 */
import { BaseEntity } from './base-entity';

export interface Transaction extends BaseEntity {
  wallet_id: number;
  farm_id: number;
  agent_id?: number;
  transaction_type: 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'rebalance' | 'interest' | 'swap' | 'payment';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'canceled';
  description?: string;
  reference_id?: string; // For linking to external systems or other entities
  related_transaction_id?: number; // For transfers between wallets
  fee_amount?: number;
  fee_currency?: string;
  exchange_rate?: number; // For currency conversions
  blockchain_hash?: string; // For crypto transactions
  metadata?: {
    exchange?: string;
    order_id?: number;
    trade_id?: number;
    external_id?: string;
    payment_method?: string;
    confirmation_count?: number;
    blockchain_network?: string;
    tags?: string[];
  };
  confirmed_at?: string;
  processed_at?: string; // When transaction was processed by the system
} 