'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { vaultBankingService } from '@/services/vault-banking-service';
import { 
  VaultMaster, 
  VaultAccount, 
  VaultTransaction,
  CreateVaultTransactionRequest,
  ApiResponse 
} from '@/types/vault-types';

interface UseVaultBankingProps {
  onError?: (message: string) => void;
}

interface UseVaultBankingState {
  loading: boolean;
  vaultMasters: VaultMaster[];
  vaultAccounts: Record<number, VaultAccount[]>;
  vaultTransactions: Record<number, VaultTransaction[]>;
  selectedVaultMaster: VaultMaster | null;
  selectedVaultAccount: VaultAccount | null;
  error: string | null;
}

export function useVaultBanking({ onError }: UseVaultBankingProps = {}) {
  const { toast } = useToast();
  const [state, setState] = useState<UseVaultBankingState>({
    loading: false,
    vaultMasters: [],
    vaultAccounts: {},
    vaultTransactions: {},
    selectedVaultMaster: null,
    selectedVaultAccount: null,
    error: null,
  });

  // Helper to handle errors
  const handleError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }));
    if (onError) {
      onError(error);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    }
  }, [onError, toast]);

  // Helper to handle API responses
  const handleApiResponse = useCallback(<T,>(response: ApiResponse<T>, errorPrefix: string): T | null => {
    if (response.error) {
      handleError(`${errorPrefix}: ${response.error}`);
      return null;
    }
    return response.data || null;
  }, [handleError]);

  // Load vault masters
  const loadVaultMasters = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await vaultBankingService.getVaultMasters();
      const masters = handleApiResponse(response, 'Failed to load vault masters');
      if (masters) {
        setState(prev => ({ 
          ...prev, 
          vaultMasters: masters, 
          loading: false,
          error: null
        }));
        return masters;
      }
    } catch (error) {
      handleError(`Error loading vault masters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setState(prev => ({ ...prev, loading: false }));
    return null;
  }, [handleApiResponse, handleError]);

  // Select a vault master
  const selectVaultMaster = useCallback(async (masterId: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await vaultBankingService.getVaultMasterById(masterId);
      const master = handleApiResponse(response, 'Failed to load vault master');
      if (master) {
        setState(prev => ({ 
          ...prev, 
          selectedVaultMaster: master,
          selectedVaultAccount: null,
          loading: false,
          error: null
        }));

        // Load accounts for this master
        await loadVaultAccounts(masterId);
        return master;
      }
    } catch (error) {
      handleError(`Error selecting vault master: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setState(prev => ({ ...prev, loading: false }));
    return null;
  }, [handleApiResponse, handleError]);

  // Load vault accounts for a master
  const loadVaultAccounts = useCallback(async (masterId: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await vaultBankingService.getVaultAccounts(masterId);
      const accounts = handleApiResponse(response, 'Failed to load vault accounts');
      if (accounts) {
        setState(prev => ({ 
          ...prev, 
          vaultAccounts: {
            ...prev.vaultAccounts,
            [masterId]: accounts
          },
          loading: false,
          error: null
        }));
        return accounts;
      }
    } catch (error) {
      handleError(`Error loading vault accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setState(prev => ({ ...prev, loading: false }));
    return null;
  }, [handleApiResponse, handleError]);

  // Select a vault account
  const selectVaultAccount = useCallback(async (accountId: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await vaultBankingService.getVaultAccountById(accountId);
      const account = handleApiResponse(response, 'Failed to load vault account');
      if (account) {
        setState(prev => ({ 
          ...prev, 
          selectedVaultAccount: account,
          loading: false,
          error: null
        }));

        // Load transactions for this account
        await loadVaultTransactions(accountId);
        return account;
      }
    } catch (error) {
      handleError(`Error selecting vault account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setState(prev => ({ ...prev, loading: false }));
    return null;
  }, [handleApiResponse, handleError]);

  // Load vault transactions for an account
  const loadVaultTransactions = useCallback(async (accountId: number, limit = 50, offset = 0) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await vaultBankingService.getVaultTransactions(accountId, limit, offset);
      const transactions = handleApiResponse(response, 'Failed to load vault transactions');
      if (transactions) {
        setState(prev => ({ 
          ...prev, 
          vaultTransactions: {
            ...prev.vaultTransactions,
            [accountId]: transactions
          },
          loading: false,
          error: null
        }));
        return transactions;
      }
    } catch (error) {
      handleError(`Error loading vault transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setState(prev => ({ ...prev, loading: false }));
    return null;
  }, [handleApiResponse, handleError]);

  // Create a vault transaction
  const createVaultTransaction = useCallback(async (data: CreateVaultTransactionRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await vaultBankingService.createVaultTransaction(data);
      const transaction = handleApiResponse(response, 'Failed to create transaction');
      if (transaction) {
        // Update transactions for this account
        if (data.account_id) {
          await loadVaultTransactions(data.account_id);
        }
        setState(prev => ({ ...prev, loading: false, error: null }));
        toast({
          title: "Transaction Created",
          description: `Transaction successfully created for $${data.amount} ${data.currency}`,
        });
        return transaction;
      }
    } catch (error) {
      handleError(`Error creating transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setState(prev => ({ ...prev, loading: false }));
    return null;
  }, [handleApiResponse, handleError, loadVaultTransactions, toast]);

  // Synchronize with vault system
  const synchronizeWithVaultSystem = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await vaultBankingService.synchronizeWithVaultSystem();
      const result = handleApiResponse(response, 'Failed to synchronize with vault system');
      if (result) {
        setState(prev => ({ ...prev, loading: false, error: null }));
        toast({
          title: "Synchronization Complete",
          description: `Successfully synchronized ${result.syncedCount} transactions with the vault system.`,
        });
        
        // Refresh data
        if (state.selectedVaultMaster?.id) {
          await loadVaultAccounts(state.selectedVaultMaster.id);
        }
        if (state.selectedVaultAccount?.id) {
          await loadVaultTransactions(state.selectedVaultAccount.id);
        }
        
        return result;
      }
    } catch (error) {
      handleError(`Error synchronizing with vault system: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setState(prev => ({ ...prev, loading: false }));
    return null;
  }, [handleApiResponse, handleError, loadVaultAccounts, loadVaultTransactions, state.selectedVaultAccount?.id, state.selectedVaultMaster?.id, toast]);

  return {
    // State
    ...state,
    isVaultIntegrationEnabled: vaultBankingService.isVaultIntegrationEnabled(),
    
    // Methods
    loadVaultMasters,
    selectVaultMaster,
    loadVaultAccounts,
    selectVaultAccount,
    loadVaultTransactions,
    createVaultTransaction,
    synchronizeWithVaultSystem,
    
    // Helper to get accounts for current master
    getAccountsForCurrentMaster: () => {
      return state.selectedVaultMaster?.id 
        ? state.vaultAccounts[state.selectedVaultMaster.id] || []
        : [];
    },
    
    // Helper to get transactions for current account
    getTransactionsForCurrentAccount: () => {
      return state.selectedVaultAccount?.id 
        ? state.vaultTransactions[state.selectedVaultAccount.id] || []
        : [];
    }
  };
}
