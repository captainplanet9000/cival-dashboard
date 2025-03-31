/**
 * Vault Banking Service
 * Handles transactions, balances, and banking operations for the Trading Farm platform
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';

export type AssetType = 'FIAT' | 'CRYPTO' | 'STABLE';

export type VaultCurrency = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  type: AssetType;
  network?: string;
  contract_address?: string;
  icon_url?: string;
};

export type VaultBalance = {
  currency_id: string;
  currency: VaultCurrency;
  available: number;
  reserved: number;
  total: number;
  usd_value: number;
};

export type VaultTransaction = {
  id: string;
  user_id: string;
  farm_id?: string;
  currency_id: string;
  currency?: VaultCurrency;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'FEE' | 'REWARD';
  amount: number;
  fee?: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  from_address?: string;
  to_address?: string;
  transaction_hash?: string;
  reference?: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

export type DepositAddressInfo = {
  currency_id: string;
  address: string;
  memo?: string;
  qr_code?: string;
  network: string;
  min_deposit?: number;
  fee_info?: string;
};

/**
 * Retrieves all vault balances for the current user
 */
export async function getVaultBalances(userId: string): Promise<VaultBalance[]> {
  try {
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase
      .from('vault_balances')
      .select(`
        currency_id,
        available,
        reserved,
        total,
        usd_value,
        currency:vault_currencies(
          id,
          code,
          name,
          symbol,
          decimals,
          type,
          network,
          contract_address,
          icon_url
        )
      `)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching vault balances:', error);
      return [];
    }
    
    return data as VaultBalance[];
  } catch (error) {
    console.error('Error in getVaultBalances:', error);
    return [];
  }
}

/**
 * Retrieves transaction history for the user
 */
export async function getTransactionHistory(
  userId: string, 
  limit: number = 10, 
  offset: number = 0,
  currencyId?: string,
  type?: string,
  status?: string
): Promise<{ transactions: VaultTransaction[], total: number }> {
  try {
    const supabase = createBrowserClient();
    
    let query = supabase
      .from('vault_transactions')
      .select(`
        *,
        currency:vault_currencies(*)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (currencyId) {
      query = query.eq('currency_id', currencyId);
    }
    
    if (type) {
      query = query.eq('type', type);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching transaction history:', error);
      return { transactions: [], total: 0 };
    }
    
    return { 
      transactions: data as VaultTransaction[], 
      total: count || 0
    };
  } catch (error) {
    console.error('Error in getTransactionHistory:', error);
    return { transactions: [], total: 0 };
  }
}

/**
 * Retrieves deposit address for a specific currency
 */
export async function getDepositAddress(
  userId: string,
  currencyId: string
): Promise<DepositAddressInfo | null> {
  try {
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase
      .from('vault_deposit_addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('currency_id', currencyId)
      .single();
    
    if (error) {
      // If no address exists, create one
      if (error.code === 'PGRST116') {
        return await createDepositAddress(userId, currencyId);
      }
      
      console.error('Error fetching deposit address:', error);
      return null;
    }
    
    return data as DepositAddressInfo;
  } catch (error) {
    console.error('Error in getDepositAddress:', error);
    return null;
  }
}

/**
 * Creates a new deposit address for the user and currency
 */
async function createDepositAddress(
  userId: string,
  currencyId: string
): Promise<DepositAddressInfo | null> {
  try {
    // In a real implementation, this would call an external service
    // to generate a new blockchain address or bank account details
    
    // For demo purposes, we'll generate a sample address
    const mockAddress = `demo-${currencyId.substring(0, 6)}-${Math.random().toString(36).substring(2, 10)}`;
    
    const addressInfo: DepositAddressInfo = {
      currency_id: currencyId,
      address: mockAddress,
      network: 'ETH',
      qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${mockAddress}`,
    };
    
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase
      .from('vault_deposit_addresses')
      .insert({
        user_id: userId,
        currency_id: currencyId,
        address: addressInfo.address,
        network: addressInfo.network,
        qr_code: addressInfo.qr_code,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating deposit address:', error);
      return null;
    }
    
    return data as DepositAddressInfo;
  } catch (error) {
    console.error('Error in createDepositAddress:', error);
    return null;
  }
}

/**
 * Creates a withdrawal request
 */
export async function createWithdrawal(
  userId: string,
  currencyId: string,
  amount: number,
  address: string,
  description?: string,
  farmId?: string
): Promise<{ success: boolean, transaction?: VaultTransaction, error?: string }> {
  try {
    // First check if the user has sufficient balance
    const supabase = createBrowserClient();
    
    const { data: balance, error: balanceError } = await supabase
      .from('vault_balances')
      .select('available')
      .eq('user_id', userId)
      .eq('currency_id', currencyId)
      .single();
    
    if (balanceError || !balance) {
      return { 
        success: false, 
        error: 'Error fetching balance or insufficient balance'
      };
    }
    
    if (balance.available < amount) {
      return { 
        success: false, 
        error: 'Insufficient balance for withdrawal'
      };
    }
    
    // Create the withdrawal transaction
    const { data: transaction, error: txError } = await supabase
      .from('vault_transactions')
      .insert({
        user_id: userId,
        farm_id: farmId,
        currency_id: currencyId,
        type: 'WITHDRAWAL',
        amount: amount,
        status: 'PENDING',
        to_address: address,
        description: description || 'Withdrawal request',
      })
      .select()
      .single();
    
    if (txError) {
      console.error('Error creating withdrawal:', txError);
      return { 
        success: false, 
        error: 'Error creating withdrawal transaction'
      };
    }
    
    // Update the balance (reserved and available)
    const { error: updateError } = await supabase
      .from('vault_balances')
      .update({
        available: balance.available - amount,
        reserved: balance.reserved + amount,
      })
      .eq('user_id', userId)
      .eq('currency_id', currencyId);
    
    if (updateError) {
      console.error('Error updating balance:', updateError);
      // This would typically trigger a compensation transaction
      // to revert the withdrawal request in a real system
    }
    
    return { 
      success: true, 
      transaction: transaction as VaultTransaction 
    };
  } catch (error) {
    console.error('Error in createWithdrawal:', error);
    return { 
      success: false, 
      error: 'Internal error processing withdrawal'
    };
  }
}

/**
 * Gets supported currencies for the vault
 */
export async function getVaultCurrencies(): Promise<VaultCurrency[]> {
  try {
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase
      .from('vault_currencies')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching vault currencies:', error);
      return [];
    }
    
    return data as VaultCurrency[];
  } catch (error) {
    console.error('Error in getVaultCurrencies:', error);
    return [];
  }
}
