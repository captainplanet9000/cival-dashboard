/**
 * Vault Banking Hook
 * 
 * React hook for interacting with the Vault Banking system
 * Provides account management, transaction handling, and balance tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  VaultBankingClient, 
  Account, 
  AccountBalance, 
  Transaction, 
  TransactionRequest,
  AccountSummary,
  Currency
} from '../clients/vault-banking-client';
import { MonitoringService } from '../monitoring-service';

export interface UseVaultBankingOptions {
  accountId?: string;
  autoLoad?: boolean;
}

/**
 * Hook for interacting with the Vault Banking system
 */
export default function useVaultBanking(options: UseVaultBankingOptions = {}) {
  const { accountId: initialAccountId, autoLoad = true } = options;
  
  const [accountId, setAccountId] = useState<string | undefined>(initialAccountId);
  const [account, setAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Initialize client
  const client = VaultBankingClient.getInstance();
  
  // Load accounts when component mounts if autoLoad is true
  useEffect(() => {
    if (autoLoad) {
      loadAccounts();
      loadAccountSummary();
    }
  }, [autoLoad]);
  
  // Load specific account when accountId changes
  useEffect(() => {
    if (accountId) {
      loadAccount(accountId);
      loadAccountBalance(accountId);
      loadTransactionHistory(accountId);
    }
  }, [accountId]);
  
  /**
   * Load all accounts for the current user
   */
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getAccounts();
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setAccounts(response.data);
        
        // If no account is selected but accounts exist, select the first one
        if (!accountId && response.data.length > 0) {
          setAccountId(response.data[0].id);
        }
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load accounts');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to load Vault Banking accounts',
        data: { error }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, accountId]);
  
  /**
   * Load a specific account by ID
   */
  const loadAccount = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getAccount(id);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setAccount(response.data);
        setBalances(response.data.balances);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to load account ${id}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to load Vault Banking account ${id}`,
        data: { error, accountId: id }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Create a new account
   */
  const createAccount = useCallback(async (
    name: string,
    type: 'main' | 'trading' | 'savings' | 'staking',
    initialBalances?: { currency: Currency, amount: number }[]
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.createAccount(name, type, initialBalances);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // Update accounts list
        setAccounts((prev) => [...prev, response.data!]);
        
        // Set as current account if no account is selected
        if (!accountId) {
          setAccountId(response.data.id);
          setAccount(response.data);
          setBalances(response.data.balances);
        }
        
        // Refresh account summary
        loadAccountSummary();
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create account');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to create Vault Banking account',
        data: { error, name, type, initialBalances }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, accountId]);
  
  /**
   * Update an existing account
   */
  const updateAccount = useCallback(async (
    id: string,
    updates: { name?: string, metadata?: Record<string, any> }
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.updateAccount(id, updates);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // Update accounts list
        setAccounts((prev) => 
          prev.map((a) => a.id === id ? response.data! : a)
        );
        
        // Update current account if it's the one being updated
        if (accountId === id) {
          setAccount(response.data);
        }
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to update account ${id}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to update Vault Banking account ${id}`,
        data: { error, accountId: id, updates }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, accountId]);
  
  /**
   * Load account balance
   */
  const loadAccountBalance = useCallback(async (
    id: string,
    currency?: Currency
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getAccountBalance(id, currency);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setBalances(response.data);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to load balance for account ${id}`);
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to load Vault Banking account balance ${id}`,
        data: { error, accountId: id, currency }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Load account summary with total balance
   */
  const loadAccountSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getAccountSummary();
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setSummary(response.data);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load account summary');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to load Vault Banking account summary',
        data: { error }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Create a transaction
   */
  const createTransaction = useCallback(async (transaction: TransactionRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.createTransaction(transaction);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // Add transaction to list if it belongs to the current account
        if (transaction.accountId === accountId) {
          setTransactions((prev) => [response.data!, ...prev]);
        }
        
        // Refresh balances and summary
        if (accountId) {
          loadAccountBalance(accountId);
        }
        loadAccountSummary();
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create transaction');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to create Vault Banking transaction',
        data: { error, transaction }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, accountId]);
  
  /**
   * Load transaction history
   */
  const loadTransactionHistory = useCallback(async (
    id?: string,
    limit: number = 50,
    offset: number = 0,
    startDate?: string,
    endDate?: string,
    types?: Array<'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'interest' | 'reward'>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.getTransactionHistory(
        id,
        limit,
        offset,
        startDate,
        endDate,
        types
      );
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        setTransactions(response.data);
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load transaction history');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to load Vault Banking transaction history',
        data: { error, accountId: id, limit, offset }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  /**
   * Transfer funds between accounts
   */
  const transferFunds = useCallback(async (
    fromAccountId: string,
    toAccountId: string,
    currency: Currency,
    amount: number,
    description?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await client.transferFunds(
        fromAccountId,
        toAccountId,
        currency,
        amount,
        description
      );
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data) {
        // Refresh balances and summary
        if (accountId) {
          loadAccountBalance(accountId);
        }
        loadAccountSummary();
        
        // Refresh transaction history if the current account is involved
        if (accountId === fromAccountId || accountId === toAccountId) {
          loadTransactionHistory(accountId);
        }
      }
      
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to transfer funds');
      setError(error);
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to transfer funds in Vault Banking',
        data: { error, fromAccountId, toAccountId, currency, amount }
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, accountId]);
  
  /**
   * Select an account
   */
  const selectAccount = useCallback((id: string) => {
    setAccountId(id);
  }, []);
  
  /**
   * Get total balance for a specific currency across all accounts
   */
  const getTotalBalance = useCallback((currency: Currency): number => {
    if (!accounts.length) return 0;
    
    return accounts.reduce((total, account) => {
      const balance = account.balances.find(b => b.currency === currency);
      return total + (balance?.total || 0);
    }, 0);
  }, [accounts]);
  
  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    accountId,
    account,
    accounts,
    balances,
    transactions,
    summary,
    loading,
    error,
    loadAccounts,
    loadAccount,
    createAccount,
    updateAccount,
    loadAccountBalance,
    loadAccountSummary,
    createTransaction,
    loadTransactionHistory,
    transferFunds,
    selectAccount,
    getTotalBalance,
    resetError
  };
}
