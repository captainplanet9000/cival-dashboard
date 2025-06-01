/**
 * Vault System Types
 * Comprehensive type definitions for the consolidated vault system
 */

// Basic types
export type AssetType = 'fiat' | 'crypto' | 'stable';
export type AccountType = 'trading' | 'operational' | 'reserve' | 'fee' | 'investment' | 'custody';
export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'trade' | 'fee' | 'interest' | 'allocation' | 'reward';
export type TransactionStatus = 'pending' | 'approved' | 'completed' | 'failed' | 'cancelled';
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';
export type VaultStatus = 'active' | 'frozen' | 'closed' | 'pending';
export type ApproverRole = 'admin' | 'approver' | 'viewer';
export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// Currency definition
export interface VaultCurrency {
  id: string;           // e.g., 'BTC', 'ETH', 'USD'
  name: string;         // e.g., 'Bitcoin', 'Ethereum', 'US Dollar'
  symbol: string;       // e.g., '₿', 'Ξ', '$'
  type: AssetType;
  decimals: number;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Master vault entity
export interface VaultMaster {
  id: number;
  owner_id: string;
  name: string;
  description?: string;
  status: VaultStatus;
  requires_approval: boolean;
  approval_threshold: number;
  created_at: string;
  updated_at: string;
  // Computed/joined fields
  accounts?: VaultAccount[];
  approvers?: VaultApprover[];
  settings?: VaultSettings;
}

// Vault account entity
export interface VaultAccount {
  id: number;
  vault_id: number;
  farm_id?: number;
  name: string;
  account_type: AccountType;
  address?: string;
  network?: string;
  exchange?: string;
  currency: string;
  balance: number;
  reserved_balance: number;
  last_updated: string;
  status: VaultStatus;
  created_at: string;
  updated_at: string;
  // Computed fields
  available_balance?: number;
  usd_value?: number;
  farm_name?: string;
  currency_info?: VaultCurrency;
}

// Vault transaction entity
export interface VaultTransaction {
  id: number;
  account_id: number;
  reference_id?: string;
  type: TransactionType;
  subtype?: string;
  amount: number;
  currency: string;
  timestamp: string;
  status: TransactionStatus;
  approval_status: ApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  tx_hash?: string;
  source_account_id?: number;
  destination_account_id?: number;
  external_source?: string;
  external_destination?: string;
  fee?: number;
  fee_currency?: string;
  metadata?: Record<string, any>;
  note?: string;
  created_at: string;
  updated_at: string;
  // Computed/joined fields
  account?: VaultAccount;
  source_account?: VaultAccount;
  destination_account?: VaultAccount;
  approver?: VaultApprover;
  approval_logs?: VaultApprovalLog[];
  currency_info?: VaultCurrency;
}

// Balance history record
export interface VaultBalanceHistory {
  id: number;
  account_id: number;
  balance: number;
  reserved_balance: number;
  available_balance: number;
  currency: string;
  usd_value?: number;
  timestamp: string;
  created_at: string;
  // Computed/joined fields
  account?: VaultAccount;
  currency_info?: VaultCurrency;
}

// Vault approver entity
export interface VaultApprover {
  id: number;
  vault_id: number;
  user_id: string;
  role: ApproverRole;
  created_at: string;
  updated_at: string;
  // Computed/joined fields
  user_name?: string;
  user_email?: string;
}

// Approval log entity
export interface VaultApprovalLog {
  id: number;
  transaction_id: number;
  user_id: string;
  action: 'approved' | 'rejected';
  comment?: string;
  created_at: string;
  // Computed/joined fields
  user_name?: string;
  transaction?: VaultTransaction;
}

// Vault settings entity
export interface VaultSettings {
  vault_id: number;
  require_2fa: boolean;
  withdrawal_limit?: number;
  withdrawal_limit_period: TimePeriod;
  alerts_enabled: boolean;
  auto_balance_tracking: boolean;
  balance_tracking_interval: number; // minutes
  created_at: string;
  updated_at: string;
}

// Request types for creating various entities
export interface CreateVaultRequest {
  name: string;
  description?: string;
  requires_approval?: boolean;
  approval_threshold?: number;
  approvers?: { user_id: string; role: ApproverRole }[];
  initial_accounts?: Omit<CreateVaultAccountRequest, 'vault_id'>[];
  settings?: Partial<Omit<VaultSettings, 'vault_id' | 'created_at' | 'updated_at'>>;
}

export interface CreateVaultAccountRequest {
  vault_id: number;
  farm_id?: number;
  name: string;
  account_type: AccountType;
  address?: string;
  network?: string;
  exchange?: string;
  currency: string;
  initial_balance?: number;
}

export interface CreateVaultTransactionRequest {
  account_id: number;
  reference_id?: string;
  type: TransactionType;
  subtype?: string;
  amount: number;
  currency: string;
  source_account_id?: number;
  destination_account_id?: number;
  external_source?: string;
  external_destination?: string;
  fee?: number;
  fee_currency?: string;
  metadata?: Record<string, any>;
  note?: string;
}

export interface TransactionApprovalRequest {
  transaction_id: number;
  action: 'approved' | 'rejected';
  comment?: string;
}

export interface VaultTransferRequest {
  from_account_id: number;
  to_account_id: number;
  amount: number;
  currency: string;
  fee?: number;
  fee_currency?: string;
  note?: string;
}

// Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VaultBalanceSummary {
  total_balance: number;
  available_balance: number;
  reserved_balance: number;
  currency: string;
  usd_value?: number;
  account_count: number;
  last_updated: string;
}

export interface VaultTransactionSummary {
  total_deposits: number;
  total_withdrawals: number;
  total_transfers: number;
  pending_approvals: number;
  recent_transactions: VaultTransaction[];
}

// Filter types
export interface VaultTransactionFilter {
  account_id?: number;
  vault_id?: number;
  type?: TransactionType | TransactionType[];
  status?: TransactionStatus | TransactionStatus[];
  approval_status?: ApprovalStatus;
  currency?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;
}

export interface VaultAccountFilter {
  vault_id?: number;
  farm_id?: number;
  account_type?: AccountType | AccountType[];
  currency?: string;
  status?: VaultStatus;
  search?: string;
  min_balance?: number;
}

// Legacy types for backward compatibility
export interface DepositAddressInfo {
  currency_id: string;
  address: string;
  memo?: string;
  qr_code?: string;
  network: string;
  min_deposit?: number;
  fee_info?: string;
}

// Migration helpers
export interface WalletMigrationItem {
  wallet_id: number;
  target_vault_id: number;
  target_account_type: AccountType;
  target_account_name?: string;
}

export interface MigrationResult {
  migrated_wallets: number;
  migrated_transactions: number;
  created_vaults: number;
  created_accounts: number;
  errors: string[];
}

export type MigrationOptions = {
  createDefaultVault?: boolean;
  migrateTransactions?: boolean;
  migrateBalanceHistory?: boolean;
  dryRun?: boolean;
};
