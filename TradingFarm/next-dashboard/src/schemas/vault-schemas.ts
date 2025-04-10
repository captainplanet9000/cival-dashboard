import { z } from 'zod';

/**
 * Zod schemas for Vault-related entities in the Trading Farm platform
 */

// Basic type schemas
export const assetTypeSchema = z.enum(['fiat', 'crypto', 'stable']);
export const accountTypeSchema = z.enum(['trading', 'operational', 'reserve', 'fee', 'investment', 'custody']);
export const transactionTypeSchema = z.enum([
  'deposit', 'withdrawal', 'transfer', 'trade', 'fee', 'interest', 'allocation', 'reward'
]);
export const transactionStatusSchema = z.enum(['pending', 'approved', 'completed', 'failed', 'cancelled']);
export const approvalStatusSchema = z.enum(['not_required', 'pending', 'approved', 'rejected']);
export const vaultStatusSchema = z.enum(['active', 'frozen', 'closed', 'pending']);
export const approverRoleSchema = z.enum(['admin', 'approver', 'viewer']);
export const timePeriodSchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);

// Currency schema
export const vaultCurrencySchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  type: assetTypeSchema,
  decimals: z.number(),
  logo_url: z.string().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Vault master schema
export const vaultMasterSchema = z.object({
  id: z.number(),
  owner_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: vaultStatusSchema,
  requires_approval: z.boolean(),
  approval_threshold: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  accounts: z.array(z.any()).optional(), // Will be updated later with a reference
  approvers: z.array(z.any()).optional(), // Will be updated later with a reference
  settings: z.any().optional(), // Will be updated later with a reference
});

// Vault account schema
export const vaultAccountSchema = z.object({
  id: z.number(),
  vault_id: z.number(),
  farm_id: z.number().optional(),
  name: z.string(),
  account_type: accountTypeSchema,
  address: z.string().optional(),
  network: z.string().optional(),
  exchange: z.string().optional(),
  currency: z.string(),
  balance: z.number(),
  reserved_balance: z.number(),
  last_updated: z.string(),
  status: vaultStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  // Computed fields
  available_balance: z.number().optional(),
  usd_value: z.number().optional(),
  farm_name: z.string().optional(),
  currency_info: vaultCurrencySchema.optional(),
});

// Vault transaction schema
export const vaultTransactionSchema = z.object({
  id: z.number(),
  account_id: z.number(),
  reference_id: z.string().optional(),
  type: transactionTypeSchema,
  subtype: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  timestamp: z.string(),
  status: transactionStatusSchema,
  approval_status: approvalStatusSchema,
  approved_by: z.string().optional(),
  approved_at: z.string().optional(),
  tx_hash: z.string().optional(),
  source_account_id: z.number().optional(),
  destination_account_id: z.number().optional(),
  external_source: z.string().optional(),
  external_destination: z.string().optional(),
  fee: z.number().optional(),
  fee_currency: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  note: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  // Computed/joined fields
  account: vaultAccountSchema.optional(),
  source_account: vaultAccountSchema.optional(),
  destination_account: vaultAccountSchema.optional(),
  approver: z.any().optional(), // Will be updated later with a reference
  approval_logs: z.array(z.any()).optional(), // Will be updated later with a reference
  currency_info: vaultCurrencySchema.optional(),
});

// Balance history schema
export const vaultBalanceHistorySchema = z.object({
  id: z.number(),
  account_id: z.number(),
  balance: z.number(),
  reserved_balance: z.number(),
  available_balance: z.number(),
  currency: z.string(),
  usd_value: z.number().optional(),
  timestamp: z.string(),
  created_at: z.string(),
  // Computed/joined fields
  account: vaultAccountSchema.optional(),
  currency_info: vaultCurrencySchema.optional(),
});

// Vault approver schema
export const vaultApproverSchema = z.object({
  id: z.number(),
  vault_id: z.number(),
  user_id: z.string(),
  role: approverRoleSchema,
  created_at: z.string(),
  updated_at: z.string(),
  // Computed/joined fields
  user_name: z.string().optional(),
  user_email: z.string().optional(),
});

// Approval log schema
export const vaultApprovalLogSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  user_id: z.string(),
  action: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
  created_at: z.string(),
  // Computed/joined fields
  user_name: z.string().optional(),
  transaction: vaultTransactionSchema.optional(),
});

// Vault settings schema
export const vaultSettingsSchema = z.object({
  vault_id: z.number(),
  require_2fa: z.boolean(),
  withdrawal_limit: z.number().optional(),
  withdrawal_limit_period: timePeriodSchema,
  alerts_enabled: z.boolean(),
  auto_balance_tracking: z.boolean(),
  balance_tracking_interval: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Update schemas with the correct references
// This needs to happen after all schemas are defined
vaultMasterSchema.extend({
  accounts: z.array(vaultAccountSchema).optional(),
  approvers: z.array(vaultApproverSchema).optional(),
  settings: vaultSettingsSchema.optional(),
});

vaultTransactionSchema.extend({
  approver: vaultApproverSchema.optional(),
  approval_logs: z.array(vaultApprovalLogSchema).optional(),
});

// Request schemas
export const createVaultApproverSchema = z.object({
  user_id: z.string(),
  role: approverRoleSchema,
});

export const createVaultAccountRequestSchema = z.object({
  vault_id: z.number(),
  farm_id: z.number().optional(),
  name: z.string(),
  account_type: accountTypeSchema,
  address: z.string().optional(),
  network: z.string().optional(),
  exchange: z.string().optional(),
  currency: z.string(),
  initial_balance: z.number().optional(),
});

export const createVaultRequestSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  requires_approval: z.boolean().optional(),
  approval_threshold: z.number().optional(),
  approvers: z.array(createVaultApproverSchema).optional(),
  initial_accounts: z.array(createVaultAccountRequestSchema.omit({ vault_id: true })).optional(),
  settings: vaultSettingsSchema.omit({ 
    vault_id: true,
    created_at: true,
    updated_at: true
  }).partial().optional(),
});

export const createVaultTransactionRequestSchema = z.object({
  account_id: z.number(),
  reference_id: z.string().optional(),
  type: transactionTypeSchema,
  subtype: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  source_account_id: z.number().optional(),
  destination_account_id: z.number().optional(),
  external_source: z.string().optional(),
  external_destination: z.string().optional(),
  fee: z.number().optional(),
  fee_currency: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  note: z.string().optional(),
});

export const transactionApprovalRequestSchema = z.object({
  transaction_id: z.number(),
  action: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
});

export const vaultTransferRequestSchema = z.object({
  from_account_id: z.number(),
  to_account_id: z.number(),
  amount: z.number(),
  currency: z.string(),
  fee: z.number().optional(),
  fee_currency: z.string().optional(),
  note: z.string().optional(),
});

// Response types
export const apiResponseSchema = z.object({
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const paginatedResponseSchema = z.object({
  data: z.array(z.any()),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export const vaultBalanceSummarySchema = z.object({
  total_balance: z.number(),
  available_balance: z.number(),
  reserved_balance: z.number(),
  currency: z.string(),
  usd_value: z.number().optional(),
  account_count: z.number(),
  last_updated: z.string(),
});

export const vaultTransactionSummarySchema = z.object({
  total_deposits: z.number(),
  total_withdrawals: z.number(),
  total_transfers: z.number(),
  pending_approvals: z.number(),
  recent_transactions: z.array(vaultTransactionSchema),
});

// Type inference helpers
export type VaultCurrency = z.infer<typeof vaultCurrencySchema>;
export type VaultMaster = z.infer<typeof vaultMasterSchema>;
export type VaultAccount = z.infer<typeof vaultAccountSchema>;
export type VaultTransaction = z.infer<typeof vaultTransactionSchema>;
export type VaultBalanceHistory = z.infer<typeof vaultBalanceHistorySchema>;
export type VaultApprover = z.infer<typeof vaultApproverSchema>;
export type VaultApprovalLog = z.infer<typeof vaultApprovalLogSchema>;
export type VaultSettings = z.infer<typeof vaultSettingsSchema>;
export type CreateVaultRequest = z.infer<typeof createVaultRequestSchema>;
export type CreateVaultAccountRequest = z.infer<typeof createVaultAccountRequestSchema>;
export type CreateVaultTransactionRequest = z.infer<typeof createVaultTransactionRequestSchema>;
export type TransactionApprovalRequest = z.infer<typeof transactionApprovalRequestSchema>;
export type VaultTransferRequest = z.infer<typeof vaultTransferRequestSchema>;
