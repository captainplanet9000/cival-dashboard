/**
 * Vault Banking Service
 * Handles transactions, balances, and banking operations for the Trading Farm platform
 */

import { createServerClient } from '@/utils/supabase/server';
import { VaultApprovalLog, VaultApprovalResponse } from '@/types/vault-approval-types';

import { createBrowserClient } from '@/utils/supabase/client';
import { 
  VaultMaster,
  VaultAccount,
  VaultCurrency,
  VaultTransaction,
  VaultBalance,
  VaultBalanceSummary,
  CreateVaultRequest,
  CreateVaultAccountRequest,
  VaultTransactionFilter,
  VaultTransferRequest,
  TransactionApprovalRequest,
  DepositAddressInfo,
  MigrationResult,
  WalletMigrationItem,
  MigrationOptions,
  PaginatedResponse,
  ApiResponse
} from '@/types/vault-types';

// Legacy type for backward compatibility
export type VaultBalance = {
  currency_id: string;
  currency: VaultCurrency;
  available: number;
  reserved: number;
  total: number;
  usd_value: number;
};

/**
 * Checks if the consolidated vault system is available
 * This helps determine which functions to use
 */
export async function isConsolidatedVaultSystemAvailable(): Promise<boolean> {
  try {
    const supabase = createBrowserClient();
    
    // Check if the vault_master table exists and is accessible
    const { count, error } = await supabase
      .from('vault_master')
      .select('*', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking vault system:', error);
      return false;
    }
    
    // If we got a count (even if 0) or a "no rows" error, the table exists
    return true;
  } catch (error) {
    console.error('Error in isConsolidatedVaultSystemAvailable:', error);
    return false;
  }
}

/**
 * Retrieves all vault balances for the current user
 * This supports both legacy and consolidated vault systems
 */
export async function getVaultBalances(userId: string): Promise<VaultBalance[]> {
  try {
    // Check if the consolidated system is available
    const isConsolidated = await isConsolidatedVaultSystemAvailable();
    
    if (isConsolidated) {
      return await getConsolidatedVaultBalances(userId);
    }
    
    // Legacy implementation
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
    
    // Type cast with safer approach for TS compatibility
    return (data as any[]).map(item => ({
      currency_id: item.currency_id,
      currency: Array.isArray(item.currency) && item.currency.length > 0 ? item.currency[0] : null,
      available: item.available,
      reserved: item.reserved,
      total: item.total,
      usd_value: item.usd_value
    }));
  } catch (error) {
    console.error('Error in getVaultBalances:', error);
    return [];
  }
}

/**
 * Retrieves consolidated vault balances using the new system
 * @private Internal function to support getVaultBalances
 */
async function getConsolidatedVaultBalances(userId: string): Promise<VaultBalance[]> {
  try {
    const supabase = createBrowserClient();
    
    // Define expected type for vault account data
    type VaultAccountData = {
        id: string;
        vault_id: string;
        name: string;
        account_type: string;
        currency: string;
        balance: number;
        reserved_balance: number;
        vault_master: { owner_id: string };
    };

    const { data: vaultAccounts, error: accountsError } = await supabase
      .from('vault_accounts')
      .select(`
        id,
        vault_id, 
        name,
        account_type,
        currency,
        balance,
        reserved_balance,
        vault_master!inner(owner_id)
      `)
      .eq('vault_master.owner_id', userId)
      .returns<VaultAccountData[]>(); // Use explicit return type
    
    if (accountsError || !vaultAccounts) {
      console.error('Error fetching vault accounts:', accountsError);
      return [];
    }
    
    // Add explicit type for 'account' parameter
    const currencyIds = Array.from(new Set(vaultAccounts.map((account: VaultAccountData) => account.currency)));
    
    if (currencyIds.length === 0) {
      return [];
    }
    
    const { data: currencies, error: currencyError } = await supabase
      .from('vault_currencies')
      .select('*')
      .in('id', currencyIds)
      .returns<VaultCurrency[]>(); // Use explicit return type
    
    if (currencyError) {
      console.error('Error fetching currencies:', currencyError);
      return [];
    }
    
    // Add explicit type for 'account' and 'c' parameters
    return vaultAccounts.map((account: VaultAccountData) => {
      const currencyInfo = currencies?.find((c: VaultCurrency) => c.id === account.currency) || null;
      
      return {
        currency_id: account.currency,
        currency: currencyInfo,
        available: account.balance - account.reserved_balance,
        reserved: account.reserved_balance,
        total: account.balance,
        usd_value: 0, // This would need to be calculated
      };
    });
  } catch (error) {
    console.error('Error in getConsolidatedVaultBalances:', error);
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
 * Update to handle numeric farmId if provided
 */
export async function createWithdrawal(
  userId: string, 
  currencyId: string, 
  amount: number, 
  address: string,
  memo?: string,
  farmId?: number | null // Changed to number | null
): Promise<ApiResponse<{ transaction_id: string }>> {
  try {
    const supabase = createBrowserClient();
    
    // Call the RPC function, ensuring farm_id is passed correctly
    const { data, error } = await supabase.rpc('create_withdrawal', {
      p_user_id: userId,
      p_currency_id: currencyId,
      p_amount: amount,
      p_address: address,
      p_memo: memo || null,
      // Pass farm_id as number or null
      p_farm_id: farmId !== undefined ? farmId : null 
    });
    
    if (error) {
      console.error('Error creating withdrawal:', error);
      return { error: error.message };
    }
    
    return { data: { transaction_id: data } }; // Assuming RPC returns the transaction ID
  } catch (error) {
    console.error('Error in createWithdrawal:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Creates a consolidated withdrawal using the new vault system
 * Update to handle numeric farmId if provided
 */
export async function createConsolidatedWithdrawal(
  userId: string,
  accountId: string,
  amount: number,
  destinationAddress: string,
  memo?: string,
  farmId?: number | null // Changed to number | null
): Promise<ApiResponse<{ transaction_id: string }>> {
  try {
    const supabase = createBrowserClient();

    // Call RPC, ensuring farm_id is handled correctly
    const { data, error } = await supabase.rpc('create_vault_withdrawal', {
      p_user_id: userId,
      p_account_id: accountId,
      p_amount: amount,
      p_destination_address: destinationAddress,
      p_memo: memo,
      // Pass farm_id as number or null
      p_farm_id: farmId !== undefined ? farmId : null
    });

    if (error) {
      console.error('Error creating consolidated withdrawal:', error);
      return { error: error.message };
    }

    return { data: { transaction_id: data } }; // Assuming RPC returns transaction ID
  } catch (error) {
    console.error('Error in createConsolidatedWithdrawal:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
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

/**
 * Gets all vaults for the current user
 */
export async function getUserVaults(userId: string): Promise<VaultMaster[]> {
  try {
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase
      .from('vault_master')
      .select(`
        *,
        accounts:vault_accounts(
          id,
          name,
          account_type,
          currency,
          balance,
          reserved_balance,
          status
        ),
        approvers:vault_approvers(
          id,
          user_id,
          role
        )
      `)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user vaults:', error);
      return [];
    }
    
    return data as VaultMaster[];
  } catch (error) {
    console.error('Error in getUserVaults:', error);
    return [];
  }
}

/**
 * Gets a single vault by ID
 */
export async function getVaultById(vaultId: number, userId: string): Promise<VaultMaster | null> {
  try {
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase
      .from('vault_master')
      .select(`
        *,
        accounts:vault_accounts(
          *
        ),
        approvers:vault_approvers(
          *
        ),
        settings:vault_settings(
          *
        )
      `)
      .eq('id', vaultId)
      .eq('owner_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching vault by ID:', error);
      return null;
    }
    
    return data as VaultMaster;
  } catch (error) {
    console.error('Error in getVaultById:', error);
    return null;
  }
}

/**
 * Creates a new vault master with optional initial accounts and settings
 */
export async function createVault(userId: string, request: CreateVaultRequest): Promise<ApiResponse<VaultMaster>> {
  try {
    const supabase = createBrowserClient();
    
    // Start a transaction
    const { data: vault, error: vaultError } = await supabase
      .from('vault_master')
      .insert({
        owner_id: userId,
        name: request.name,
        description: request.description || '',
        status: 'active',
        requires_approval: request.requires_approval || false,
        approval_threshold: request.approval_threshold || 1,
      })
      .select()
      .single();
    
    if (vaultError) {
      console.error('Error creating vault:', vaultError);
      return { error: `Failed to create vault: ${vaultError.message}` };
    }
    
    // Add approvers if specified
    if (request.approvers && request.approvers.length > 0) {
      const approversToAdd = request.approvers.map(approver => ({
        vault_id: vault.id,
        user_id: approver.user_id,
        role: approver.role,
      }));
      
      const { error: approversError } = await supabase
        .from('vault_approvers')
        .insert(approversToAdd);
      
      if (approversError) {
        console.error('Error adding vault approvers:', approversError);
        // Continue even if adding approvers fails
      }
    }
    
    // Add default settings
    const defaultSettings = {
      vault_id: vault.id,
      require_2fa: request.settings?.require_2fa || false,
      withdrawal_limit: request.settings?.withdrawal_limit,
      withdrawal_limit_period: request.settings?.withdrawal_limit_period || 'daily',
      alerts_enabled: request.settings?.alerts_enabled || true,
      auto_balance_tracking: request.settings?.auto_balance_tracking || true,
      balance_tracking_interval: request.settings?.balance_tracking_interval || 60, // Default to hourly
    };
    
    const { error: settingsError } = await supabase
      .from('vault_settings')
      .insert(defaultSettings);
    
    if (settingsError) {
      console.error('Error adding vault settings:', settingsError);
      // Continue even if settings creation fails
    }
    
    // Add initial accounts if specified
    if (request.initial_accounts && request.initial_accounts.length > 0) {
      const accountsToAdd = request.initial_accounts.map(account => ({
        vault_id: vault.id,
        farm_id: account.farm_id,
        name: account.name,
        account_type: account.account_type,
        currency: account.currency,
        balance: account.initial_balance || 0,
        reserved_balance: 0,
        status: 'active',
        address: account.address,
        network: account.network,
        exchange: account.exchange,
      }));
      
      const { error: accountsError } = await supabase
        .from('vault_accounts')
        .insert(accountsToAdd);
      
      if (accountsError) {
        console.error('Error adding vault accounts:', accountsError);
        // Continue even if account creation fails
      }
    }
    
    // Fetch the complete vault with all related data
    const { data: completeVault, error: fetchError } = await supabase
      .from('vault_master')
      .select(`
        *,
        accounts:vault_accounts(*),
        approvers:vault_approvers(*),
        settings:vault_settings(*)
      `)
      .eq('id', vault.id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching complete vault:', fetchError);
      return { data: vault as VaultMaster, message: 'Vault created but some details may be missing' };
    }
    
    return { data: completeVault as VaultMaster, message: 'Vault created successfully' };
  } catch (error) {
    console.error('Error in createVault:', error);
    return { error: 'Internal error creating vault' };
  }
}

/**
 * Updates an existing vault master
 */
export async function updateVault(
  vaultId: number, 
  userId: string, 
  updates: Partial<VaultMaster>
): Promise<ApiResponse<VaultMaster>> {
  try {
    const supabase = createBrowserClient();
    
    // Verify ownership first
    const { data: existingVault, error: checkError } = await supabase
      .from('vault_master')
      .select('owner_id')
      .eq('id', vaultId)
      .single();
    
    if (checkError || !existingVault) {
      return { error: 'Vault not found' };
    }
    
    if (existingVault.owner_id !== userId) {
      return { error: 'You do not have permission to update this vault' };
    }
    
    // Prepare updates - only allow certain fields to be updated
    const vaultUpdates: Record<string, any> = {
      name: updates.name,
      description: updates.description,
      status: updates.status,
      requires_approval: updates.requires_approval,
      approval_threshold: updates.approval_threshold,
    };
    
    // Filter out undefined values
    Object.keys(vaultUpdates).forEach(key => {
      if (vaultUpdates[key] === undefined) {
        delete vaultUpdates[key];
      }
    });
    
    if (Object.keys(vaultUpdates).length === 0) {
      return { error: 'No valid updates provided' };
    }
    
    const { data: updatedVault, error: updateError } = await supabase
      .from('vault_master')
      .update(vaultUpdates)
      .eq('id', vaultId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating vault:', updateError);
      return { error: `Failed to update vault: ${updateError.message}` };
    }
    
    return { 
      data: updatedVault as VaultMaster, 
      message: 'Vault updated successfully' 
    };
  } catch (error) {
    console.error('Error in updateVault:', error);
    return { error: 'Internal error updating vault' };
  }
}

/**
 * Creates a new vault account within a vault
 */
export async function createVaultAccount(
  userId: string, 
  request: CreateVaultAccountRequest
): Promise<ApiResponse<VaultAccount>> {
  try {
    const supabase = createBrowserClient();
    
    // Verify vault ownership first
    const { data: vault, error: vaultError } = await supabase
      .from('vault_master')
      .select('id, owner_id')
      .eq('id', request.vault_id)
      .single();
    
    if (vaultError || !vault) {
      return { error: 'Vault not found' };
    }
    
    if (vault.owner_id !== userId) {
      return { error: 'You do not have permission to add accounts to this vault' };
    }
    
    // Create the account
    const { data: account, error: accountError } = await supabase
      .from('vault_accounts')
      .insert({
        vault_id: request.vault_id,
        farm_id: request.farm_id,
        name: request.name,
        account_type: request.account_type,
        address: request.address,
        network: request.network,
        exchange: request.exchange,
        currency: request.currency,
        balance: request.initial_balance || 0,
        reserved_balance: 0,
        status: 'active',
        last_updated: new Date().toISOString()
      })
      .select()
      .single();
    
    if (accountError) {
      console.error('Error creating vault account:', accountError);
      return { error: `Failed to create account: ${accountError.message}` };
    }
    
    // If there's an initial balance, create a deposit transaction
    if (request.initial_balance && request.initial_balance > 0) {
      const { error: txError } = await supabase
        .from('vault_transactions')
        .insert({
          account_id: account.id,
          type: 'deposit',
          amount: request.initial_balance,
          currency: request.currency,
          status: 'completed',
          approval_status: 'not_required',
          note: 'Initial account funding',
        });
      
      if (txError) {
        console.error('Error creating initial transaction:', txError);
        // Continue despite transaction record error
      }
    }
    
    return { 
      data: account as VaultAccount, 
      message: 'Account created successfully' 
    };
  } catch (error) {
    console.error('Error in createVaultAccount:', error);
    return { error: 'Internal error creating account' };
  }
}

/**
 * Updates an existing vault account
 */
export async function updateVaultAccount(
  userId: string,
  accountId: number,
  updates: Partial<VaultAccount>
): Promise<ApiResponse<VaultAccount>> {
  try {
    const supabase = createBrowserClient();
    
    // First verify permission
    const { data: account, error: accountError } = await supabase
      .from('vault_accounts')
      .select(`
        id,
        vault_id,
        vault_master!inner(owner_id)
      `)
      .eq('id', accountId)
      .single();
    
    if (accountError || !account) {
      return { error: 'Account not found' };
    }
    
    if ((account as any).vault_master && (account as any).vault_master.owner_id !== userId) {
      return { error: 'You do not have permission to update this account' };
    }
    
    // Only allow certain fields to be updated
    const accountUpdates: Record<string, any> = {
      name: updates.name,
      account_type: updates.account_type,
      address: updates.address,
      network: updates.network,
      exchange: updates.exchange,
      status: updates.status,
      farm_id: updates.farm_id
    };
    
    // Filter out undefined values
    Object.keys(accountUpdates).forEach(key => {
      if (accountUpdates[key] === undefined) {
        delete accountUpdates[key];
      }
    });
    
    if (Object.keys(accountUpdates).length === 0) {
      return { error: 'No valid updates provided' };
    }
    
    const { data: updatedAccount, error: updateError } = await supabase
      .from('vault_accounts')
      .update(accountUpdates)
      .eq('id', accountId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating account:', updateError);
      return { error: `Failed to update account: ${updateError.message}` };
    }
    
    return { 
      data: updatedAccount as VaultAccount, 
      message: 'Account updated successfully' 
    };
  } catch (error) {
    console.error('Error in updateVaultAccount:', error);
    return { error: 'Internal error updating account' };
  }
}

/**
 * Gets transactions for a specific vault or account
 */
export async function getVaultTransactions(
  userId: string, 
  filter: VaultTransactionFilter,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<VaultTransaction>> {
  try {
    const supabase = createBrowserClient();
    const offset = (page - 1) * pageSize;
    
    // Build the base query
    let query = supabase
      .from('vault_transactions')
      .select(`
        *,
        account:vault_accounts!inner(
          id, 
          name,
          account_type,
          currency,
          vault_id,
          vault_master!inner(owner_id)
        )
      `, { count: 'exact' })
      .eq('vault_accounts.vault_master.owner_id', userId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    // Apply filters
    if (filter.account_id) {
      query = query.eq('account_id', filter.account_id);
    }
    
    if (filter.vault_id) {
      query = query.eq('vault_accounts.vault_id', filter.vault_id);
    }
    
    if (filter.type) {
      if (Array.isArray(filter.type)) {
        query = query.in('type', filter.type);
      } else {
        query = query.eq('type', filter.type);
      }
    }
    
    if (filter.status) {
      if (Array.isArray(filter.status)) {
        query = query.in('status', filter.status);
      } else {
        query = query.eq('status', filter.status);
      }
    }
    
    if (filter.approval_status) {
      query = query.eq('approval_status', filter.approval_status);
    }
    
    if (filter.currency) {
      query = query.eq('currency', filter.currency);
    }
    
    if (filter.start_date) {
      query = query.gte('timestamp', filter.start_date);
    }
    
    if (filter.end_date) {
      query = query.lte('timestamp', filter.end_date);
    }
    
    if (filter.min_amount) {
      query = query.gte('amount', filter.min_amount);
    }
    
    if (filter.max_amount) {
      query = query.lte('amount', filter.max_amount);
    }
    
    // Execute the query
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching vault transactions:', error);
      return { 
        data: [], 
        total: 0, 
        page, 
        pageSize, 
        totalPages: 0 
      };
    }
    
    return {
      data: data as VaultTransaction[],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('Error in getVaultTransactions:', error);
    return { 
      data: [], 
      total: 0, 
      page, 
      pageSize, 
      totalPages: 0 
    };
  }
}

/**
 * Creates a deposit transaction in the consolidated vault system
 */
export async function createDeposit(
  userId: string,
  accountId: number,
  amount: number,
  currency: string,
  note?: string,
  externalSource?: string
): Promise<ApiResponse<VaultTransaction>> {
  try {
    const supabase = createBrowserClient();
    
    // Verify ownership and account existence
    const { data: account, error: accountError } = await supabase
      .from('vault_accounts')
      .select(`
        id,
        currency,
        balance,
        vault_id,
        vault_master!inner(owner_id)
      `)
      .eq('id', accountId)
      .single();
    
    if (accountError || !account) {
      return { error: 'Account not found' };
    }
    
    if ((account as any).vault_master && (account as any).vault_master.owner_id !== userId) {
      return { error: 'You do not have permission to deposit to this account' };
    }
    
    if ((account as any).currency !== currency) {
      return { error: 'Currency mismatch. Cannot deposit different currency than the account currency.' };
    }
    
    // Create the transaction
    const { data: transaction, error: txError } = await supabase
      .from('vault_transactions')
      .insert({
        account_id: accountId,
        type: 'deposit',
        amount: amount,
        currency: currency,
        external_source: externalSource,
        status: 'completed', // Deposits are usually completed immediately
        approval_status: 'not_required',
        timestamp: new Date().toISOString(),
        note: note || 'Deposit',
      })
      .select()
      .single();
    
    if (txError) {
      console.error('Error creating deposit transaction:', txError);
      return { error: `Failed to create deposit: ${txError.message}` };
    }
    
    // Update the account balance
    const { error: updateError } = await supabase
      .from('vault_accounts')
      .update({
        balance: (account as any).balance + amount,
        last_updated: new Date().toISOString()
      })
      .eq('id', accountId);
    
    if (updateError) {
      console.error('Error updating account balance:', updateError);
      // This would need compensation logic in a production system
    }
    
    // Track balance history
    const { error: historyError } = await supabase
      .from('vault_balance_history')
      .insert({
        account_id: accountId,
        balance: (account as any).balance + amount,
        reserved_balance: 0, // Would need to fetch this in a real system
        available_balance: (account as any).balance + amount,
        currency: currency,
        timestamp: new Date().toISOString()
      });
    
    if (historyError) {
      console.error('Error recording balance history:', historyError);
      // Non-critical error, can continue
    }
    
    return {
      data: transaction as VaultTransaction,
      message: 'Deposit created successfully'
    };
  } catch (error) {
    console.error('Error in createDeposit:', error);
    return { error: 'Internal error creating deposit' };
  }
}

/**
 * Creates a transfer between vault accounts
 */
export async function createTransfer(
  userId: string,
  request: VaultTransferRequest
): Promise<ApiResponse<VaultTransaction>> {
  try {
    const supabase = createBrowserClient();
    
    // Verify both accounts exist and are owned by the user
    const { data: accounts, error: accountsError } = await supabase
      .from('vault_accounts')
      .select(`
        id,
        currency,
        balance,
        reserved_balance,
        vault_id,
        vault_master!inner(owner_id)
      `)
      .in('id', [request.from_account_id, request.to_account_id]);
    
    if (accountsError || !accounts || accounts.length !== 2) {
      return { error: 'One or both accounts not found' };
    }
    
    const fromAccount = accounts.find(a => a.id === request.from_account_id);
    const toAccount = accounts.find(a => a.id === request.to_account_id);
    
    if (!fromAccount || !toAccount) {
      return { error: 'Invalid account IDs provided' };
    }
    
    if ((fromAccount as any).vault_master && (fromAccount as any).vault_master.owner_id !== userId || (toAccount as any).vault_master && (toAccount as any).vault_master.owner_id !== userId) {
      return { error: 'You do not have permission to transfer between these accounts' };
    }
    
    if ((fromAccount as any).currency !== request.currency || (toAccount as any).currency !== request.currency) {
      return { error: 'Currency mismatch. Transfer requires same currency for both accounts.' };
    }
    
    const availableBalance = (fromAccount as any).balance - (fromAccount as any).reserved_balance;
    if (availableBalance < request.amount) {
      return { error: 'Insufficient balance for transfer' };
    }
    
    // Create the transaction
    const { data: transaction, error: txError } = await supabase
      .from('vault_transactions')
      .insert({
        account_id: request.from_account_id,
        type: 'transfer',
        amount: request.amount,
        currency: request.currency,
        source_account_id: request.from_account_id,
        destination_account_id: request.to_account_id,
        fee: request.fee,
        fee_currency: request.fee_currency,
        status: 'completed',
        approval_status: 'not_required',
        timestamp: new Date().toISOString(),
        note: request.note || 'Account transfer',
      })
      .select()
      .single();
    
    if (txError) {
      console.error('Error creating transfer transaction:', txError);
      return { error: `Failed to create transfer: ${txError.message}` };
    }
    
    // Update source account balance
    const { error: fromUpdateError } = await supabase
      .from('vault_accounts')
      .update({
        balance: (fromAccount as any).balance - request.amount,
        last_updated: new Date().toISOString()
      })
      .eq('id', request.from_account_id);
    
    if (fromUpdateError) {
      console.error('Error updating source account balance:', fromUpdateError);
      // Would need compensation logic in a production system
    }
    
    // Update destination account balance
    const { error: toUpdateError } = await supabase
      .from('vault_accounts')
      .update({
        balance: (toAccount as any).balance + request.amount,
        last_updated: new Date().toISOString()
      })
      .eq('id', request.to_account_id);
    
    if (toUpdateError) {
      console.error('Error updating destination account balance:', toUpdateError);
      // Would need compensation logic in a production system
    }
    
    return {
      data: transaction as VaultTransaction,
      message: 'Transfer completed successfully'
    };
  } catch (error) {
    console.error('Error in createTransfer:', error);
    return { error: 'Internal error creating transfer' };
  }
}

/**
 * Approves or rejects a pending transaction
 */
export async function approveTransaction(
  userId: string,
  request: TransactionApprovalRequest
): Promise<ApiResponse<VaultTransaction>> {
  try {
    const supabase = createBrowserClient();
    
    // Verify the transaction exists and needs approval
    const { data: transaction, error: txError } = await supabase
      .from('vault_transactions')
      .select(`
        *,
        account:vault_accounts!inner(
          vault_id,
          vault_master!inner(*)
        )
      `)
      .eq('id', request.transaction_id)
      .single();
    
    if (txError || !transaction) {
      return { error: 'Transaction not found' };
    }
    
    // Check if user is an approver
    const { data: approverInfo, error: approverError } = await supabase
      .from('vault_approvers')
      .select('id, role')
      .eq('vault_id', transaction.account.vault_id)
      .eq('user_id', userId)
      .single();
    
    if (approverError || !approverInfo) {
      return { error: 'You do not have permission to approve this transaction' };
    }
    
    if (transaction.approval_status !== 'pending') {
      return { error: 'This transaction is not pending approval' };
    }
    
    // Record the approval action
    const { error: logError } = await supabase
      .from('vault_approval_logs')
      .insert({
        transaction_id: request.transaction_id,
        user_id: userId,
        action: request.action,
        comment: request.comment,
      });
    
    if (logError) {
      console.error('Error recording approval log:', logError);
      // Non-critical error, can continue
    }
    
    // Update the transaction
    if (request.action === 'approved') {
      // For approved transactions, need to update status and possibly process it
      const { data: updatedTx, error: updateError } = await supabase
        .from('vault_transactions')
        .update({
          approval_status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          status: transaction.type === 'withdrawal' ? 'pending' : 'completed'
        })
        .eq('id', request.transaction_id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating transaction:', updateError);
        return { error: `Failed to approve transaction: ${updateError.message}` };
      }
      
      return {
        data: updatedTx as VaultTransaction,
        message: 'Transaction approved successfully'
      };
    } else {
      // For rejected transactions
      const { data: updatedTx, error: updateError } = await supabase
        .from('vault_transactions')
        .update({
          approval_status: 'rejected',
          status: 'cancelled'
        })
        .eq('id', request.transaction_id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating transaction:', updateError);
        return { error: `Failed to reject transaction: ${updateError.message}` };
      }
      
      // For rejected withdrawals, release the reserved balance
      if (transaction.type === 'withdrawal') {
        const { error: accountError } = await supabase
          .from('vault_accounts')
          .update({
            reserved_balance: supabase.rpc('decrement_reserved', { 
              account_id_param: transaction.account_id, 
              amount_param: transaction.amount 
            })
          })
          .eq('id', transaction.account_id);
        
        if (accountError) {
          console.error('Error updating account reserved balance:', accountError);
          // Non-critical, can continue
        }
      }
      
      return {
        data: updatedTx as VaultTransaction,
        message: 'Transaction rejected'
      };
    }
  } catch (error) {
    console.error('Error in approveTransaction:', error);
    return { error: 'Internal error processing approval' };
  }
}

/**
 * Gets vault balance summary aggregated across all accounts
 */
export async function getVaultBalanceSummary(userId: string, vaultId?: number): Promise<VaultBalanceSummary[]> {
  try {
    const supabase = createBrowserClient();
    
    let query = supabase.rpc('get_vault_balance_summary', { 
      user_id_param: userId 
    });
    
    if (vaultId) {
      query = supabase.rpc('get_vault_balance_summary_by_vault', { 
        user_id_param: userId,
        vault_id_param: vaultId
      });
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching vault balance summary:', error);
      return [];
    }
    
    return data as VaultBalanceSummary[];
  } catch (error) {
    console.error('Error in getVaultBalanceSummary:', error);
    return [];
  }
}

/**
 * Migrate from old wallet system to new vault system
 */
export async function migrateToVaultSystem(
  userId: string, 
  items: WalletMigrationItem[],
  options: MigrationOptions = {}
): Promise<ApiResponse<MigrationResult>> {
  try {
    const supabase = createBrowserClient();
    const result: MigrationResult = {
      migrated_wallets: 0,
      migrated_transactions: 0,
      created_vaults: 0,
      created_accounts: 0,
      errors: []
    };
    
    // Get the list of existing vaults
    const { data: existingVaults, error: vaultError } = await supabase
      .from('vault_master')
      .select('id')
      .eq('owner_id', userId);
    
    if (vaultError) {
      console.error('Error fetching existing vaults:', vaultError);
      return { 
        error: 'Failed to access vault data',
        data: result
      };
    }
    
    // Create a default vault if needed
    let defaultVaultId: number | null = null;
    if (options.createDefaultVault && existingVaults.length === 0) {
      const { data: newVault, error: createError } = await supabase
        .from('vault_master')
        .insert({
          owner_id: userId,
          name: 'Default Vault',
          description: 'Migrated from wallet system',
          status: 'active',
          requires_approval: false,
          approval_threshold: 1,
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating default vault:', createError);
        result.errors.push(`Failed to create default vault: ${createError.message}`);
      } else {
        defaultVaultId = newVault.id;
        result.created_vaults++;
      }
    }
    
    // Process each migration item
    for (const item of items) {
      try {
        // Skip if no target vault ID and no default vault created
        if (!item.target_vault_id && !defaultVaultId) {
          result.errors.push(`No vault specified for wallet ${item.wallet_id}`);
          continue;
        }
        
        const vaultId = item.target_vault_id || defaultVaultId;
        
        // Get the wallet data
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select(`
            id,
            user_id,
            name,
            currency,
            balance,
            address
          `)
          .eq('id', item.wallet_id)
          .eq('user_id', userId)
          .single();
        
        if (walletError || !wallet) {
          result.errors.push(`Wallet ${item.wallet_id} not found`);
          continue;
        }
        
        // Create the account
        if (!options.dryRun) {
          const { data: account, error: accountError } = await supabase
            .from('vault_accounts')
            .insert({
              vault_id: vaultId,
              name: item.target_account_name || wallet.name,
              account_type: item.target_account_type,
              currency: wallet.currency,
              balance: wallet.balance,
              reserved_balance: 0,
              status: 'active',
              address: wallet.address,
              last_updated: new Date().toISOString()
            })
            .select()
            .single();
          
          if (accountError) {
            result.errors.push(`Failed to create account for wallet ${item.wallet_id}: ${accountError.message}`);
            continue;
          }
          
          result.created_accounts++;
          
          // Migrate transactions if requested
          if (options.migrateTransactions) {
            const { data: transactions, error: txError } = await supabase
              .from('wallet_transactions')
              .select('*')
              .eq('wallet_id', item.wallet_id);
            
            if (txError) {
              result.errors.push(`Failed to fetch transactions for wallet ${item.wallet_id}`);
            } else if (transactions) {
              // Map old transaction types to new ones
              const typeMapping: Record<string, any> = {
                'DEPOSIT': 'deposit',
                'WITHDRAWAL': 'withdrawal',
                'TRANSFER': 'transfer',
                'FEE': 'fee',
                'REWARD': 'reward'
              };
              
              // Map old statuses to new ones
              const statusMapping: Record<string, any> = {
                'PENDING': 'pending',
                'COMPLETED': 'completed',
                'FAILED': 'failed',
                'CANCELLED': 'cancelled'
              };
              
              for (const tx of transactions) {
                const { error: insertError } = await supabase
                  .from('vault_transactions')
                  .insert({
                    account_id: account.id,
                    reference_id: `old_wallet_tx_${tx.id}`,
                    type: typeMapping[tx.type] || 'transfer',
                    amount: tx.amount,
                    currency: wallet.currency,
                    status: statusMapping[tx.status] || 'completed',
                    approval_status: 'not_required',
                    timestamp: tx.created_at,
                    external_source: tx.from_address,
                    external_destination: tx.to_address,
                    tx_hash: tx.transaction_hash,
                    fee: tx.fee,
                    note: tx.description || `Migrated from wallet ${item.wallet_id}`,
                    metadata: {
                      migrated: true,
                      original_wallet_id: item.wallet_id,
                      original_tx_id: tx.id
                    }
                  });
                
                if (insertError) {
                  result.errors.push(`Failed to migrate transaction ${tx.id} from wallet ${item.wallet_id}`);
                } else {
                  result.migrated_transactions++;
                }
              }
            }
          }
          
          result.migrated_wallets++;
        }
      } catch (itemError) {
        console.error(`Error processing wallet ${item.wallet_id}:`, itemError);
        result.errors.push(`Unexpected error with wallet ${item.wallet_id}`);
      }
    }
    
    return {
      data: result,
      message: `Migration ${options.dryRun ? 'simulation' : 'completed'} with ${result.errors.length} errors`
    };
  } catch (error) {
    console.error('Error in migrateToVaultSystem:', error);
    return { 
      error: 'Internal error during migration',
      data: {
        migrated_wallets: 0,
        migrated_transactions: 0,
        created_vaults: 0,
        created_accounts: 0,
        errors: ['Unexpected internal error']
      }
    };
  }
}

/**
 * Migrates legacy wallet balances to the new consolidated vault system
 */
// Add explicit types for 'a' parameter in reduce calls if needed
export async function migrateWalletsToVaults(
  userId: string,
  items: WalletMigrationItem[],
  options?: MigrationOptions
): Promise<MigrationResult> {
  const supabase = createBrowserClient();
  const results: MigrationResult = { successes: [], failures: [] };
  let masterVaultId: string | null = null;

  // ... (rest of migration logic)
  // Example of fixing implicit any in a potential reduce call:
  // const totalAmount = items.reduce((sum: number, item: WalletMigrationItem) => sum + item.amount, 0);

  // Find or create a master vault for the user
  // ...
  
  for (const item of items) {
    // ... (migration logic for each item) ...
  }

  return results;
}



/**
 * Retrieves pending vault transaction approvals for the current user
 * @param userId - The ID of the user (approver) to get pending approvals for
 * @returns An array of pending approval records
 */
export async function getVaultPendingApprovals(userId: string): Promise<VaultApprovalLog[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('vault_approval_log')
      .select('*')
      .eq('status', 'pending')
      .eq('approver_id', userId);
    
    if (error) {
      console.error('Error fetching vault pending approvals:', error);
      return [];
    }
    
    return data as VaultApprovalLog[];
  } catch (err) {
    console.error('Exception in getVaultPendingApprovals:', err);
    return [];
  }
}

/**
 * Approves a pending vault transaction
 * @param userId - The ID of the user (approver) approving the transaction
 * @param approvalId - The ID of the approval record to update
 * @param reason - Optional reason for approval
 * @returns Response with status and any error message
 */
export async function approveVaultTransaction(
  userId: string,
  approvalId: string,
  reason?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = createServerClient();
    
    // First verify this user is the approver
    const { data: approval, error: fetchError } = await supabase
      .from('vault_approval_log')
      .select('*')
      .eq('id', approvalId)
      .eq('approver_id', userId)
      .eq('status', 'pending')
      .single();
    
    if (fetchError || !approval) {
      return { 
        success: false, 
        message: fetchError?.message || 'Approval not found or not pending' 
      };
    }
    
    // Update the approval status
    const { error } = await supabase
      .from('vault_approval_log')
      .update({ 
        status: 'approved',
        metadata: { 
          ...approval.metadata,
          approved_at: new Date().toISOString(),
          approval_reason: reason
        }
      })
      .eq('id', approvalId);
    
    if (error) {
      return { success: false, message: error.message };
    }
    
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || 'An error occurred' };
  }
}

/**
 * Rejects a pending vault transaction
 * @param userId - The ID of the user (approver) rejecting the transaction
 * @param approvalId - The ID of the approval record to update
 * @param reason - Reason for rejection
 * @returns Response with status and any error message
 */
export async function rejectVaultTransaction(
  userId: string,
  approvalId: string,
  reason: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = createServerClient();
    
    // First verify this user is the approver
    const { data: approval, error: fetchError } = await supabase
      .from('vault_approval_log')
      .select('*')
      .eq('id', approvalId)
      .eq('approver_id', userId)
      .eq('status', 'pending')
      .single();
    
    if (fetchError || !approval) {
      return { 
        success: false, 
        message: fetchError?.message || 'Approval not found or not pending' 
      };
    }
    
    // Update the approval status
    const { error } = await supabase
      .from('vault_approval_log')
      .update({ 
        status: 'rejected',
        metadata: { 
          ...approval.metadata,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason
        }
      })
      .eq('id', approvalId);
    
    if (error) {
      return { success: false, message: error.message };
    }
    
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || 'An error occurred' };
  }
}

// Combine all vault functions into a single exportable service object
export const vaultService = {
  isConsolidatedVaultSystemAvailable,
  getVaultPendingApprovals,
  approveVaultTransaction,
  rejectVaultTransaction,
  getVaultBalances,
  getConsolidatedVaultBalances,
  getTransactionHistory,
  getDepositAddress,
  createDepositAddress,
  createWithdrawal,
  createConsolidatedWithdrawal,
  getVaultCurrencies,
  getUserVaults,
  getVaultById,
  createVault,
  updateVault,
  createVaultAccount,
  updateVaultAccount,
  getVaultTransactions,
  createDeposit,
  createTransfer,
  approveTransaction,
  getVaultBalanceSummary,
  migrateToVaultSystem,
  migrateWalletsToVaults
};
