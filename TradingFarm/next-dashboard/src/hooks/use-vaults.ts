'use client';

import React from 'react';
import { 
  useQuery, 
  useMutation, 
  useQueryClient 
} from '@tanstack/react-query';
import { enhancedVaultService } from '@/services/enhanced-vault-service';
import { 
  VaultMasterSchema,
  VaultAccountSchema,
  VaultTransactionSchema,
  VaultSettingsSchema,
  CreateVaultMasterInput,
  CreateVaultAccountInput,
  UpdateVaultMasterInput,
  UpdateVaultAccountInput,
  CreateVaultTransactionInput
} from '@/schemas/vault-schemas';
import { toast } from '@/components/ui/use-toast';
import { z } from 'zod';

// Query keys for vaults
export const vaultKeys = {
  all: ['vaults'] as const,
  masters: () => [...vaultKeys.all, 'masters'] as const,
  master: (id: number) => [...vaultKeys.masters(), id] as const,
  accounts: (masterId: number) => [...vaultKeys.master(masterId), 'accounts'] as const,
  account: (id: number) => [...vaultKeys.all, 'accounts', id] as const,
  transactions: (accountId: number) => [...vaultKeys.account(accountId), 'transactions'] as const,
  settings: (masterId: number) => [...vaultKeys.master(masterId), 'settings'] as const,
};

/**
 * Hook to fetch all vault masters
 */
export function useVaultMasters(limit = 50, offset = 0) {
  return useQuery({
    queryKey: [...vaultKeys.masters(), { limit, offset }],
    queryFn: async () => {
      const { data, error, count, total } = await enhancedVaultService.getVaultMasters(limit, offset);
      
      if (error) {
        throw new Error(error);
      }
      
      return { 
        vaultMasters: data || [], 
        count: count || 0, 
        total: total || 0 
      };
    },
  });
}

/**
 * Hook to fetch a specific vault master by ID
 */
export function useVaultMaster(id: number) {
  return useQuery({
    queryKey: vaultKeys.master(id),
    queryFn: async () => {
      const { data, error } = await enhancedVaultService.getVaultMasterById(id);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    enabled: !!id, // Only run the query if we have an ID
  });
}

/**
 * Hook to fetch vault accounts for a master
 */
export function useVaultAccounts(masterId: number) {
  return useQuery({
    queryKey: vaultKeys.accounts(masterId),
    queryFn: async () => {
      const { data, error, count, total } = await enhancedVaultService.getVaultAccounts(masterId);
      
      if (error) {
        throw new Error(error);
      }
      
      return { 
        accounts: data || [], 
        count: count || 0, 
        total: total || 0 
      };
    },
    enabled: !!masterId, // Only run the query if we have a masterId
  });
}

/**
 * Hook to fetch a specific vault account by ID
 */
export function useVaultAccount(id: number) {
  return useQuery({
    queryKey: vaultKeys.account(id),
    queryFn: async () => {
      const { data, error } = await enhancedVaultService.getVaultAccountById(id);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    enabled: !!id, // Only run the query if we have an ID
  });
}

/**
 * Hook to fetch vault transactions for an account
 */
export function useVaultTransactions(accountId: number, limit = 50, offset = 0) {
  return useQuery({
    queryKey: [...vaultKeys.transactions(accountId), { limit, offset }],
    queryFn: async () => {
      const { data, error, count, total } = await enhancedVaultService.getVaultTransactions(accountId, limit, offset);
      
      if (error) {
        throw new Error(error);
      }
      
      return { 
        transactions: data || [], 
        count: count || 0, 
        total: total || 0 
      };
    },
    enabled: !!accountId, // Only run the query if we have an accountId
  });
}

/**
 * Hook to fetch vault settings
 */
export function useVaultSettings(masterId: number) {
  return useQuery({
    queryKey: vaultKeys.settings(masterId),
    queryFn: async () => {
      const { data, error } = await enhancedVaultService.getVaultSettings(masterId);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    enabled: !!masterId, // Only run the query if we have a masterId
  });
}

/**
 * Hook to create a new vault master
 */
export function useCreateVaultMaster() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vaultData: z.infer<typeof CreateVaultMasterInput>) => {
      const { data, error } = await enhancedVaultService.createVaultMaster(vaultData);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    onSuccess: (newVault) => {
      // Invalidate the vault masters list query to refetch the data
      queryClient.invalidateQueries({ queryKey: vaultKeys.masters() });
      
      // Show success toast
      toast({
        title: 'Vault created',
        description: `Vault "${newVault.name}" has been created successfully.`,
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error creating vault',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update an existing vault master
 */
export function useUpdateVaultMaster(id: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (vaultData: z.infer<typeof UpdateVaultMasterInput>) => {
      const { data, error } = await enhancedVaultService.updateVaultMaster(id, vaultData);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    onSuccess: (updatedVault) => {
      // Invalidate both the list and the detail queries
      queryClient.invalidateQueries({ queryKey: vaultKeys.masters() });
      queryClient.invalidateQueries({ queryKey: vaultKeys.master(id) });
      
      // Show success toast
      toast({
        title: 'Vault updated',
        description: `Vault "${updatedVault.name}" has been updated successfully.`,
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error updating vault',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a vault master
 */
export function useDeleteVaultMaster() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      // Get the vault details first for the success message
      const { data: vault } = await enhancedVaultService.getVaultMasterById(id);
      const vaultName = vault?.name || 'Vault';
      
      const { error } = await enhancedVaultService.deleteVaultMaster(id);
      
      if (error) {
        throw new Error(error);
      }
      
      return { id, name: vaultName };
    },
    onSuccess: ({ id, name }) => {
      // Invalidate the vaults list query to refetch the data
      queryClient.invalidateQueries({ queryKey: vaultKeys.masters() });
      
      // Remove the specific vault from the cache
      queryClient.removeQueries({ queryKey: vaultKeys.master(id) });
      
      // Show success toast
      toast({
        title: 'Vault deleted',
        description: `Vault "${name}" has been deleted successfully.`,
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error deleting vault',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to create a new vault account
 */
export function useCreateVaultAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (accountData: z.infer<typeof CreateVaultAccountInput>) => {
      const { data, error } = await enhancedVaultService.createVaultAccount(accountData);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    onSuccess: (newAccount) => {
      // Invalidate the accounts list query for this vault master
      queryClient.invalidateQueries({ queryKey: vaultKeys.accounts(newAccount.vault_master_id) });
      
      // Show success toast
      toast({
        title: 'Account created',
        description: `Account "${newAccount.name}" has been created successfully.`,
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error creating account',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update an existing vault account
 */
export function useUpdateVaultAccount(id: number, masterId?: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (accountData: z.infer<typeof UpdateVaultAccountInput>) => {
      const { data, error } = await enhancedVaultService.updateVaultAccount(id, accountData);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    onSuccess: (updatedAccount) => {
      // Get master ID, either from params or from the updated account
      const vaultMasterId = masterId || updatedAccount.vault_master_id;
      
      // Invalidate both the accounts list and the detail queries
      if (vaultMasterId) {
        queryClient.invalidateQueries({ queryKey: vaultKeys.accounts(vaultMasterId) });
      }
      queryClient.invalidateQueries({ queryKey: vaultKeys.account(id) });
      
      // Show success toast
      toast({
        title: 'Account updated',
        description: `Account "${updatedAccount.name}" has been updated successfully.`,
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error updating account',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a vault account
 */
export function useDeleteVaultAccount(masterId?: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      // Get the account details first for the success message and master ID
      const { data: account } = await enhancedVaultService.getVaultAccountById(id);
      const accountName = account?.name || 'Account';
      const vaultMasterId = account?.vault_master_id || masterId;
      
      const { error } = await enhancedVaultService.deleteVaultAccount(id);
      
      if (error) {
        throw new Error(error);
      }
      
      return { id, name: accountName, masterId: vaultMasterId };
    },
    onSuccess: ({ id, name, masterId }) => {
      // Invalidate the accounts list query to refetch the data
      if (masterId) {
        queryClient.invalidateQueries({ queryKey: vaultKeys.accounts(masterId) });
      }
      
      // Remove the specific account from the cache
      queryClient.removeQueries({ queryKey: vaultKeys.account(id) });
      
      // Show success toast
      toast({
        title: 'Account deleted',
        description: `Account "${name}" has been deleted successfully.`,
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error deleting account',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to create a new vault transaction
 */
export function useCreateVaultTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transactionData: z.infer<typeof CreateVaultTransactionInput>) => {
      const { data, error } = await enhancedVaultService.createVaultTransaction(transactionData);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    onSuccess: (newTransaction) => {
      // Invalidate the transactions list query for this account
      queryClient.invalidateQueries({ queryKey: vaultKeys.transactions(newTransaction.vault_account_id) });
      
      // Also invalidate the account details as balance may have changed
      queryClient.invalidateQueries({ queryKey: vaultKeys.account(newTransaction.vault_account_id) });
      
      // Show success toast
      toast({
        title: 'Transaction created',
        description: 'Transaction has been created successfully.',
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error creating transaction',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update vault settings
 */
export function useUpdateVaultSettings(masterId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settingsData: Partial<z.infer<typeof VaultSettingsSchema>>) => {
      const { data, error } = await enhancedVaultService.updateVaultSettings(masterId, settingsData);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    onSuccess: () => {
      // Invalidate the settings query
      queryClient.invalidateQueries({ queryKey: vaultKeys.settings(masterId) });
      
      // Show success toast
      toast({
        title: 'Settings updated',
        description: 'Vault settings have been updated successfully.',
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error updating settings',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}
