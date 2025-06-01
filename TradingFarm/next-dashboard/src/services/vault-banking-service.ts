'use client';

/**
 * Vault Banking Service
 * Handles integration with the external Vault Banking System
 */

import { ApiResponse, VaultTransaction, VaultAccount, VaultMaster, CreateVaultTransactionRequest } from '@/types/vault-types';
import { enhancedVaultService } from './enhanced-vault-service';

// Environment variables
const VAULT_API_URL = process.env.NEXT_PUBLIC_BASE_URL || '/api';
const VAULT_INTEGRATION_ENABLED = process.env.NEXT_PUBLIC_ENABLE_VAULT_BANKING === 'true';

/**
 * Vault Banking Service that integrates with the external Vault Banking system
 * and falls back to the enhanced vault service for offline/development mode
 */
export const vaultBankingService = {
  /**
   * Check if vault integration is enabled in the current environment
   */
  isVaultIntegrationEnabled(): boolean {
    return VAULT_INTEGRATION_ENABLED;
  },

  /**
   * Get all vault masters
   */
  async getVaultMasters(limit = 50, offset = 0): Promise<ApiResponse<VaultMaster[]>> {
    if (!this.isVaultIntegrationEnabled()) {
      return enhancedVaultService.getVaultMasters(limit, offset);
    }

    try {
      const response = await fetch(`${VAULT_API_URL}/vault/masters?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch vault masters: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error in getVaultMasters:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error fetching vault masters' };
    }
  },

  /**
   * Get vault master by ID
   */
  async getVaultMasterById(id: number): Promise<ApiResponse<VaultMaster>> {
    if (!this.isVaultIntegrationEnabled()) {
      return enhancedVaultService.getVaultMasterById(id);
    }

    try {
      const response = await fetch(`${VAULT_API_URL}/vault/masters/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch vault master: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error in getVaultMasterById:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error fetching vault master' };
    }
  },

  /**
   * Get vault accounts for a vault master
   */
  async getVaultAccounts(vault_id: number): Promise<ApiResponse<VaultAccount[]>> {
    if (!this.isVaultIntegrationEnabled()) {
      return enhancedVaultService.getVaultAccounts(vault_id);
    }

    try {
      const response = await fetch(`${VAULT_API_URL}/vault/accounts?vault_id=${vault_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch vault accounts: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error in getVaultAccounts:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error fetching vault accounts' };
    }
  },

  /**
   * Get vault account by ID
   */
  async getVaultAccountById(id: number): Promise<ApiResponse<VaultAccount>> {
    if (!this.isVaultIntegrationEnabled()) {
      return enhancedVaultService.getVaultAccountById(id);
    }

    try {
      const response = await fetch(`${VAULT_API_URL}/vault/accounts/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch vault account: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error in getVaultAccountById:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error fetching vault account' };
    }
  },

  /**
   * Get transactions for an account
   */
  async getVaultTransactions(account_id: number, limit = 50, offset = 0): Promise<ApiResponse<VaultTransaction[]>> {
    if (!this.isVaultIntegrationEnabled()) {
      return enhancedVaultService.getVaultTransactions(account_id, limit, offset);
    }

    try {
      const response = await fetch(
        `${VAULT_API_URL}/vault/transactions?account_id=${account_id}&limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch vault transactions: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error in getVaultTransactions:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error fetching vault transactions' };
    }
  },

  /**
   * Create a new transaction
   */
  async createVaultTransaction(data: CreateVaultTransactionRequest): Promise<ApiResponse<VaultTransaction>> {
    if (!this.isVaultIntegrationEnabled()) {
      return enhancedVaultService.createVaultTransaction(data);
    }

    try {
      const response = await fetch(`${VAULT_API_URL}/vault/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create vault transaction: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error in createVaultTransaction:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error creating vault transaction' };
    }
  },

  /**
   * Synchronize transactions with the Vault Banking System
   * This is used to ensure data consistency between systems
   */
  async synchronizeWithVaultSystem(): Promise<ApiResponse<{ syncedCount: number }>> {
    if (!this.isVaultIntegrationEnabled()) {
      // Mock response for development mode
      return { data: { syncedCount: 0 }, message: 'Vault integration is disabled' };
    }

    try {
      const response = await fetch(`${VAULT_API_URL}/vault/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to synchronize with vault system: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error in synchronizeWithVaultSystem:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error synchronizing with vault system' };
    }
  }
};
