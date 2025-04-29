// Enhanced Vault Service - Mock Version (Type-Safe, Canonical Types)
// This is a temporary mock implementation to unblock build issues.
// Replace with the actual implementation after fixing the vault schema issues.

import {
  VaultMaster,
  VaultAccount,
  VaultTransaction,
  VaultSettings,
  ApiResponse,
  CreateVaultAccountRequest,
  CreateVaultTransactionRequest,
  AccountType,
  TransactionType,
} from '@/types/vault-types';

// Canonical input types for create/update
import type { PartialDeep } from 'type-fest';

// Utility: Dummy values for required fields
const now = () => new Date().toISOString();

export const enhancedVaultService = {
  /**
   * Get all vault masters
   */
  async getVaultMasters(limit = 50, offset = 0): Promise<ApiResponse<VaultMaster[]>> {
    return { data: [], message: 'Mock: No vault masters' };
  },

  /**
   * Get vault master by ID
   */
  async getVaultMasterById(id: number): Promise<ApiResponse<VaultMaster>> {
    return {
      data: {
        id,
        owner_id: 'mock-owner',
        name: 'Mock Vault',
        description: 'A mock vault master',
        status: 'active',
        requires_approval: false,
        approval_threshold: 1,
        created_at: now(),
        updated_at: now(),
        accounts: [],
        approvers: [],
        settings: undefined,
      },
      message: 'Mock: Vault master returned',
    };
  },

  /**
   * Get vault accounts by vault ID
   */
  async getVaultAccounts(vault_id: number): Promise<ApiResponse<VaultAccount[]>> {
    return { data: [], message: 'Mock: No vault accounts' };
  },

  /**
   * Get vault account by ID
   */
  async getVaultAccountById(id: number): Promise<ApiResponse<VaultAccount>> {
    return {
      data: {
        id,
        vault_id: 1,
        farm_id: 1,
        name: 'Mock Account',
        account_type: 'trading' as AccountType,
        address: 'mock-address',
        network: 'mocknet',
        exchange: 'mock-exchange',
        currency: 'USD',
        balance: 1000,
        reserved_balance: 0,
        last_updated: now(),
        status: 'active',
        created_at: now(),
        updated_at: now(),
        available_balance: 1000,
        usd_value: 1000,
        farm_name: 'Mock Farm',
      },
      message: 'Mock: Vault account returned',
    };
  },

  /**
   * Get vault transactions by account ID
   */
  async getVaultTransactions(account_id: number, limit = 50, offset = 0): Promise<ApiResponse<VaultTransaction[]>> {
    return { data: [], message: 'Mock: No transactions' };
  },

  /**
   * Create vault master
   */
  async createVaultMaster(data: Omit<VaultMaster, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<VaultMaster>> {
    return {
      data: {
        ...data,
        id: 1,
        created_at: now(),
        updated_at: now(),
        accounts: [],
        approvers: [],
        settings: undefined,
      },
      message: 'Mock: Vault master created',
    };
  },

  /**
   * Update vault master
   */
  async updateVaultMaster(id: number, data: PartialDeep<Omit<VaultMaster, 'id'>>): Promise<ApiResponse<VaultMaster>> {
    return {
      data: {
        id,
        owner_id: 'mock-owner',
        name: data.name ?? 'Updated Vault',
        description: data.description ?? 'Updated description',
        status: data.status ?? 'active',
        requires_approval: data.requires_approval ?? false,
        approval_threshold: data.approval_threshold ?? 1,
        created_at: now(),
        updated_at: now(),
        accounts: [],
        approvers: [],
        settings: undefined,
      },
      message: 'Mock: Vault master updated',
    };
  },

  /**
   * Delete vault master
   */
  async deleteVaultMaster(id: number): Promise<ApiResponse<void>> {
    return { data: undefined, message: 'Mock: Vault master deleted' };
  },

  /**
   * Create vault account
   */
  async createVaultAccount(data: CreateVaultAccountRequest): Promise<ApiResponse<VaultAccount>> {
    return {
      data: {
        id: 1,
        vault_id: data.vault_id,
        farm_id: data.farm_id ?? 1,
        name: data.name,
        account_type: data.account_type,
        address: data.address,
        network: data.network,
        exchange: data.exchange,
        currency: data.currency,
        balance: data.initial_balance ?? 0,
        reserved_balance: 0,
        last_updated: now(),
        status: 'active',
        created_at: now(),
        updated_at: now(),
        available_balance: data.initial_balance ?? 0,
        usd_value: data.initial_balance ?? 0,
        farm_name: 'Mock Farm',
      },
      message: 'Mock: Vault account created',
    };
  },

  /**
   * Update vault account
   */
  async updateVaultAccount(id: number, data: PartialDeep<Omit<VaultAccount, 'id'>>): Promise<ApiResponse<VaultAccount>> {
    return {
      data: {
        id,
        vault_id: 1,
        farm_id: 1,
        name: data.name ?? 'Updated Account',
        account_type: data.account_type ?? 'trading' as AccountType,
        address: data.address,
        network: data.network,
        exchange: data.exchange,
        currency: data.currency ?? 'USD',
        balance: data.balance ?? 1000,
        reserved_balance: data.reserved_balance ?? 0,
        last_updated: now(),
        status: data.status ?? 'active',
        created_at: now(),
        updated_at: now(),
        available_balance: data.available_balance ?? 1000,
        usd_value: data.usd_value ?? 1000,
        farm_name: data.farm_name ?? 'Mock Farm',
      },
      message: 'Mock: Vault account updated',
    };
  },

  /**
   * Delete vault account
   */
  async deleteVaultAccount(id: number): Promise<ApiResponse<void>> {
    return { data: undefined, message: 'Mock: Vault account deleted' };
  },

  /**
   * Create vault transaction
   */
  async createVaultTransaction(data: CreateVaultTransactionRequest): Promise<ApiResponse<VaultTransaction>> {
    return {
      data: {
        id: 1,
        account_id: data.account_id,
        reference_id: data.reference_id,
        type: data.type,
        subtype: data.subtype,
        amount: data.amount,
        currency: data.currency,
        timestamp: now(),
        status: 'pending',
        approval_status: 'pending',
        created_at: now(),
        updated_at: now(),
      },
      message: 'Mock: Vault transaction created',
    };
  },

  /**
   * Get vault settings
   */
  async getVaultSettings(vault_id: number): Promise<ApiResponse<VaultSettings>> {
    return {
      data: {
        vault_id,
        require_2fa: false,
        withdrawal_limit: 1000,
        withdrawal_limit_period: 'daily',
        alerts_enabled: true,
        auto_balance_tracking: false,
        balance_tracking_interval: 60,
        created_at: now(),
        updated_at: now(),
      },
      message: 'Mock: Vault settings returned',
    };
  },

  /**
   * Update vault settings
   */
  async updateVaultSettings(vault_id: number, data: PartialDeep<Omit<VaultSettings, 'vault_id'>>): Promise<ApiResponse<VaultSettings>> {
    return {
      data: {
        vault_id,
        require_2fa: data.require_2fa ?? false,
        withdrawal_limit: data.withdrawal_limit ?? 1000,
        withdrawal_limit_period: data.withdrawal_limit_period ?? 'daily',
        alerts_enabled: data.alerts_enabled ?? true,
        auto_balance_tracking: data.auto_balance_tracking ?? false,
        balance_tracking_interval: data.balance_tracking_interval ?? 60,
        created_at: now(),
        updated_at: now(),
      },
      message: 'Mock: Vault settings updated',
    };
  },
};
