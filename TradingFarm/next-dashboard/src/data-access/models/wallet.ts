/**
 * Wallet model for tracking balances and transactions
 */
import { BaseEntity } from './base-entity';

export interface Wallet extends BaseEntity {
  owner_id: number;
  owner_type: 'farm' | 'agent' | 'user';
  name: string;
  balance: number;
  currency: string;
  is_active: boolean;
  blockchain_address?: string;
  private_key_encrypted?: string;
  wallet_type: 'fiat' | 'crypto' | 'virtual';
  risk_allocation?: number; // Percentage of total farm capital allocated to this wallet
  metadata?: {
    exchange?: string;
    network?: string;
    last_sync_at?: string;
    tags?: string[];
    external_id?: string;
    permissions?: string[];
  };
}
