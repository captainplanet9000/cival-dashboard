import { ApiResponse } from '@/services/farm-service';

export interface Wallet {
  id: string;
  name: string;
  address: string;
  balance: number;
  token_balances: Record<string, number>;
  farm_id?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'swap' | 'fee';
  amount: number;
  token_symbol: string;
  wallet_id: string;
  farm_id?: string;
  status: 'pending' | 'completed' | 'failed';
  tx_hash?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface VaultBalance {
  id: string;
  farm_id: string;
  token_symbol: string;
  amount: number;
  locked_until?: string;
  interest_rate?: number;
  created_at: string;
  updated_at: string;
}

const SUPABASE_MCP_URL = 'https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe';

export const walletService = {
  /**
   * Get all wallets for a farm
   */
  async getFarmWallets(farmId: string): Promise<ApiResponse<Wallet[]>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'farm_wallets',
            select: '*',
            where: { farm_id: farmId },
            order: 'created_at.desc'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch farm wallets');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching farm wallets:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a new wallet
   */
  async createWallet(walletData: Omit<Wallet, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Wallet>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'create_wallet',
          params: {
            name: walletData.name,
            address: walletData.address,
            balance: walletData.balance || 0,
            farm_id: walletData.farm_id,
            user_id: walletData.user_id
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create wallet');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error creating wallet:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update wallet token balances
   */
  async updateWalletBalances(walletId: string, tokenBalances: Record<string, number>): Promise<ApiResponse<Wallet>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'update_record',
          params: {
            table: 'farm_wallets',
            data: { token_balances: tokenBalances },
            where: { id: walletId },
            returning: '*'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update wallet balances');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error updating wallet balances:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get transactions for a wallet
   */
  async getWalletTransactions(walletId: string): Promise<ApiResponse<Transaction[]>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'transactions',
            select: '*',
            where: { wallet_id: walletId },
            order: 'created_at.desc'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch wallet transactions');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get transactions for a farm
   */
  async getFarmTransactions(farmId: string): Promise<ApiResponse<Transaction[]>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'transactions',
            select: '*',
            where: { farm_id: farmId },
            order: 'created_at.desc'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch farm transactions');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching farm transactions:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Record a transaction
   */
  async recordTransaction(transactionData: Omit<Transaction, 'id' | 'created_at'>): Promise<ApiResponse<Transaction>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'record_transaction',
          params: {
            type: transactionData.type,
            amount: transactionData.amount,
            wallet_id: transactionData.wallet_id,
            farm_id: transactionData.farm_id,
            status: transactionData.status
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to record transaction');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error recording transaction:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get vault balances for a farm
   */
  async getVaultBalances(farmId: string): Promise<ApiResponse<VaultBalance[]>> {
    try {
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'vault_balances',
            select: '*',
            where: { farm_id: farmId },
            order: 'created_at.desc'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch vault balances');
      }
      
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching vault balances:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Deposit tokens to vault
   */
  async depositToVault(params: { farmId: string, tokenSymbol: string, amount: number }): Promise<ApiResponse<VaultBalance>> {
    try {
      // First check if a vault balance exists for this token
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'vault_balances',
            select: '*',
            where: { 
              farm_id: params.farmId,
              token_symbol: params.tokenSymbol
            }
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to check vault balance');
      }
      
      let vaultBalance;
      
      if (result.data && result.data.length > 0) {
        // Update existing balance
        const existingBalance = result.data[0];
        const newAmount = existingBalance.amount + params.amount;
        
        const updateResponse = await fetch(SUPABASE_MCP_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tool: 'update_record',
            params: {
              table: 'vault_balances',
              data: { amount: newAmount },
              where: { id: existingBalance.id },
              returning: '*'
            }
          })
        });
        
        const updateResult = await updateResponse.json();
        
        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Failed to update vault balance');
        }
        
        vaultBalance = updateResult.data;
      } else {
        // Create new vault balance
        const createResponse = await fetch(SUPABASE_MCP_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tool: 'insert_record',
            params: {
              table: 'vault_balances',
              data: {
                farm_id: params.farmId,
                token_symbol: params.tokenSymbol,
                amount: params.amount,
                interest_rate: 0.05 // Example interest rate
              },
              returning: '*'
            }
          })
        });
        
        const createResult = await createResponse.json();
        
        if (!createResult.success) {
          throw new Error(createResult.error || 'Failed to create vault balance');
        }
        
        vaultBalance = createResult.data;
      }
      
      // Record the transaction
      await this.recordTransaction({
        type: 'deposit',
        amount: params.amount,
        token_symbol: params.tokenSymbol,
        wallet_id: 'vault', // Special ID for vault
        farm_id: params.farmId,
        status: 'completed',
        metadata: { vault_operation: true }
      });
      
      return { data: vaultBalance };
    } catch (error) {
      console.error('Error depositing to vault:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Withdraw tokens from vault
   */
  async withdrawFromVault(params: { farmId: string, tokenSymbol: string, amount: number }): Promise<ApiResponse<VaultBalance>> {
    try {
      // Check if vault has sufficient balance
      const response = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'vault_balances',
            select: '*',
            where: { 
              farm_id: params.farmId,
              token_symbol: params.tokenSymbol
            }
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to check vault balance');
      }
      
      if (!result.data || result.data.length === 0) {
        return { error: 'No vault balance found for this token' };
      }
      
      const vaultBalance = result.data[0];
      
      if (vaultBalance.amount < params.amount) {
        return { error: 'Insufficient vault balance' };
      }
      
      // Update vault balance
      const newAmount = vaultBalance.amount - params.amount;
      
      const updateResponse = await fetch(SUPABASE_MCP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'update_record',
          params: {
            table: 'vault_balances',
            data: { amount: newAmount },
            where: { id: vaultBalance.id },
            returning: '*'
          }
        })
      });
      
      const updateResult = await updateResponse.json();
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update vault balance');
      }
      
      // Record the transaction
      await this.recordTransaction({
        type: 'withdrawal',
        amount: params.amount,
        token_symbol: params.tokenSymbol,
        wallet_id: 'vault', // Special ID for vault
        farm_id: params.farmId,
        status: 'completed',
        metadata: { vault_operation: true }
      });
      
      return { data: updateResult.data };
    } catch (error) {
      console.error('Error withdrawing from vault:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
}; 