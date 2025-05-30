import { createBrowserClient } from '@/utils/supabase/client';

export interface Balance {
  assetId: string;
  symbol: string;
  name: string;
  balance: number;
  valueUsd: number;
  change24h: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'interest' | 'allocation';
  asset: string;
  amount: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  confirmations: number | null;
  txHash: string | null;
  from: string;
  to: string;
  fee: number;
  notes: string;
}

export interface VaultInfo {
  totalValueUsd: number;
  securityLevel: string;
  multisigEnabled: boolean;
  requiredSignatures: number;
  coldStorage: {
    percentage: number;
    lastAudit: string;
  };
  hotWallet: {
    percentage: number;
    rebalanceThreshold: number;
  };
  insuranceFund: {
    valueUsd: number;
    coverageDetails: string;
  };
  stakingRewards: {
    enabled: boolean;
    apr: number;
    nextDistribution: string;
  };
}

export interface BankingData {
  balances: Balance[];
  transactions: Transaction[];
  vaultInfo: VaultInfo;
}

export interface TransactionRequest {
  type: 'deposit' | 'withdrawal' | 'transfer' | 'allocation';
  asset: string;
  amount: number;
  to?: string;
  from?: string;
  notes?: string;
  userId?: string;
}

class BankingService {
  private supabase;

  constructor() {
    this.supabase = createBrowserClient();
  }

  async getBalances(userId: string = '1'): Promise<{ data: Balance[] | null; error: string | null }> {
    try {
      // First try to get from Supabase
      const { data: supabaseData, error } = await this.supabase
        .from('balances')
        .select('*')
        .eq('user_id', userId);
      
      if (!error && supabaseData?.length > 0) {
        // Map the data to match our interface
        const balances = supabaseData.map(item => ({
          assetId: item.asset_id,
          symbol: item.symbol,
          name: item.name,
          balance: item.balance,
          valueUsd: item.value_usd,
          change24h: item.change_24h
        }));
        return { data: balances, error: null };
      }
      
      // Fallback to API if Supabase fails or returns empty
      const response = await fetch(`/api/banking?userId=${userId}&type=balances`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const { balances } = await response.json();
      return { data: balances, error: null };
    } catch (err: any) {
      console.error('Error fetching balances:', err);
      return { data: null, error: err.message || 'Failed to fetch balances' };
    }
  }

  async getTransactions(userId: string = '1', limit: number = 20): Promise<{ data: Transaction[] | null; error: string | null }> {
    try {
      // First try to get from Supabase
      const { data: supabaseData, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (!error && supabaseData?.length > 0) {
        // Map the data to match our interface
        const transactions = supabaseData.map(item => ({
          id: item.id,
          userId: item.user_id,
          type: item.type,
          asset: item.asset,
          amount: item.amount,
          timestamp: item.timestamp,
          status: item.status,
          confirmations: item.confirmations,
          txHash: item.tx_hash,
          from: item.from_address,
          to: item.to_address,
          fee: item.fee,
          notes: item.notes
        }));
        return { data: transactions, error: null };
      }
      
      // Fallback to API if Supabase fails or returns empty
      const response = await fetch(`/api/banking?userId=${userId}&type=transactions`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const { transactions } = await response.json();
      return { data: transactions, error: null };
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      return { data: null, error: err.message || 'Failed to fetch transactions' };
    }
  }

  async getVaultInfo(userId: string = '1'): Promise<{ data: VaultInfo | null; error: string | null }> {
    try {
      // First try to get from Supabase
      const { data: supabaseData, error } = await this.supabase
        .from('vault_info')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (!error && supabaseData) {
        // Map the data to match our interface
        const vaultInfo: VaultInfo = {
          totalValueUsd: supabaseData.total_value_usd,
          securityLevel: supabaseData.security_level,
          multisigEnabled: supabaseData.multisig_enabled,
          requiredSignatures: supabaseData.required_signatures,
          coldStorage: {
            percentage: supabaseData.cold_storage_percentage,
            lastAudit: supabaseData.cold_storage_last_audit
          },
          hotWallet: {
            percentage: supabaseData.hot_wallet_percentage,
            rebalanceThreshold: supabaseData.hot_wallet_rebalance_threshold
          },
          insuranceFund: {
            valueUsd: supabaseData.insurance_fund_value_usd,
            coverageDetails: supabaseData.insurance_fund_coverage_details
          },
          stakingRewards: {
            enabled: supabaseData.staking_rewards_enabled,
            apr: supabaseData.staking_rewards_apr,
            nextDistribution: supabaseData.staking_rewards_next_distribution
          }
        };
        return { data: vaultInfo, error: null };
      }
      
      // Fallback to API if Supabase fails or returns empty
      const response = await fetch(`/api/banking?userId=${userId}&type=vault`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const { vaultInfo } = await response.json();
      return { data: vaultInfo, error: null };
    } catch (err: any) {
      console.error('Error fetching vault info:', err);
      return { data: null, error: err.message || 'Failed to fetch vault info' };
    }
  }

  async getAllBankingData(userId: string = '1'): Promise<{ data: BankingData | null; error: string | null }> {
    try {
      // Fallback to single API call for all data
      const response = await fetch(`/api/banking?userId=${userId}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return { data, error: null };
    } catch (err: any) {
      console.error('Error fetching all banking data:', err);
      return { data: null, error: err.message || 'Failed to fetch banking data' };
    }
  }

  async executeTransaction(transaction: TransactionRequest): Promise<{ data: Transaction | null; error: string | null }> {
    try {
      // Try to submit to Supabase first
      if (this.supabase) {
        let supabaseData;
        
        if (transaction.type === 'allocation') {
          // For allocation, update the balances table
          const { data, error } = await this.supabase.rpc('allocate_funds', {
            p_user_id: transaction.userId || '1',
            p_asset: transaction.asset,
            p_amount: transaction.amount,
            p_notes: transaction.notes || ''
          });
          
          supabaseData = data;
          if (error) throw new Error(error.message);
        } else {
          // For other transaction types
          const { data, error } = await this.supabase
            .from('transactions')
            .insert([
              {
                user_id: transaction.userId || '1',
                type: transaction.type,
                asset: transaction.asset,
                amount: transaction.amount,
                from_address: transaction.from || '',
                to_address: transaction.to || '',
                notes: transaction.notes || '',
                status: transaction.type === 'withdrawal' ? 'pending' : 'completed',
                timestamp: new Date().toISOString()
              }
            ])
            .select()
            .single();
          
          supabaseData = data;
          if (error) throw new Error(error.message);
        }
        
        if (supabaseData) {
          return {
            data: {
              id: supabaseData.id,
              userId: supabaseData.user_id,
              type: supabaseData.type,
              asset: supabaseData.asset,
              amount: supabaseData.amount,
              timestamp: supabaseData.timestamp,
              status: supabaseData.status,
              confirmations: supabaseData.confirmations,
              txHash: supabaseData.tx_hash,
              from: supabaseData.from_address,
              to: supabaseData.to_address,
              fee: supabaseData.fee,
              notes: supabaseData.notes
            },
            error: null
          };
        }
      }
      
      // Fallback to API call
      const response = await fetch('/api/banking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      
      const { transaction: responseTransaction } = await response.json();
      return { data: responseTransaction, error: null };
    } catch (err: any) {
      console.error('Error executing transaction:', err);
      return { data: null, error: err.message || 'Failed to execute transaction' };
    }
  }
}

export const bankingService = new BankingService();
