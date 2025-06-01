/**
 * Types for the vault approval system
 */

export interface VaultApprovalLog {
  id: string;
  vault_transaction_id: string;
  approver_id: string;
  status: 'pending' | 'approved' | 'rejected';
  metadata?: {
    transaction_type?: string;
    amount?: number;
    currency?: string;
    requester_id?: string;
    requester_name?: string;
    requested_at?: string;
    description?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface VaultApprovalRequest {
  transaction_id: string;
  approver_id: string;
  metadata?: Record<string, any>;
}

export interface VaultApprovalResponse {
  id: string;
  status: 'approved' | 'rejected';
  reason?: string;
}
