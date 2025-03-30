/**
 * Wallet model
 */
import { BaseEntity } from './base-entity';

export interface Wallet extends BaseEntity {
  owner_id: number;
  owner_type: 'farm' | 'agent';
  currency: string;
  balance: number;
  available: number;
  locked: number;
  address?: string;
  exchange?: string;
  external_id?: string;
  metadata?: Record<string, any>;
}
