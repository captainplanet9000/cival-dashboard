import { createClient } from '@supabase/supabase-js';
import { 
  // VaultMaster, // Uses 'vaults' table now
  // VaultAccount, // No separate 'vault_accounts' table found
  // VaultTransaction, // Uses 'transaction_logs' table now
  // VaultBalance, // Use DB type for balances
  TransactionStatus, // Keep Enums
  TransactionType,   // Keep Enums
  VaultAccountType,  // Keep Enums (May need re-evaluation)
  TransactionFilter, // May need refactoring based on transaction_logs
  // SecurityPolicy, // Table not found
  // AuditLogEntry    // Table not found
} from '@/types/vault';
import { Database, Json } from '@/types/database.types'; // Import Json too
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '@/config/mockConfig';

// --- Define Aliases for DB Types --- 
type VaultRow = Database['public']['Tables']['vaults']['Row'];
type VaultInsert = Database['public']['Tables']['vaults']['Insert'];
type VaultUpdate = Database['public']['Tables']['vaults']['Update'];

type TransactionLogRow = Database['public']['Tables']['transaction_logs']['Row'];
type TransactionLogInsert = Database['public']['Tables']['transaction_logs']['Insert'];
type TransactionLogUpdate = Database['public']['Tables']['transaction_logs']['Update'];

type VaultBalanceRow = Database['public']['Tables']['vault_balances']['Row'];
type VaultBalanceInsert = Database['public']['Tables']['vault_balances']['Insert'];
type VaultBalanceUpdate = Database['public']['Tables']['vault_balances']['Update'];

// --- Define Parameter Interfaces (Moved Outside Class) --- 

/**
 * Parameters for creating a transaction log.
 */
interface CreateTransactionParams {
    farm_id: string;
    vault_id?: string | null; // Vault receiving/sending funds
    transaction_type: string; // Use enum TransactionType values
    asset_symbol: string;
    amount: number; // Note: DB amount is number
    status?: TransactionStatus | string; // Use enum TransactionStatus values
    description?: string | null;
    metadata?: Json | null;
    linked_account_id?: string | null; // For external source/dest
    external_id?: string | null;
    transaction_hash?: string | null;
}

// Legacy wallet types (for migration support)
export interface LegacyWallet {
  id: string | number;
  name: string;
  balance: number;
  currency: string;
  address?: string;
  farm_id?: string | number;
  user_id?: string;
  wallet_type?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Unified Banking Service
 * 
 * Refactored to align with database types (vaults, transaction_logs, vault_balances).
 * Handles vault and transaction operations for the Trading Farm.
 */
export class UnifiedBankingService {
  private supabase: ReturnType<typeof createServerClient>; // Add type
  private isServerSide: boolean;
  
  /**
   * Create a new UnifiedBankingService instance
   * @param isServerSide Whether this service is being used on the server side
   */
  constructor(isServerSide = false) {
    this.isServerSide = isServerSide;
    this.supabase = isServerSide 
      ? createServerClient() 
      : createBrowserClient();
  }
  
  /**
   * Get a singleton instance of the UnifiedBankingService
   * @param isServerSide Whether this service is being used on the server side
   * @returns UnifiedBankingService instance
   */
  static getInstance(isServerSide = false): UnifiedBankingService {
    // Consider true singleton implementation if needed
    return new UnifiedBankingService(isServerSide);
  }
  
  // #region Vault Operations (Using 'vaults' table) 
  
  /**
   * Create a new vault for a farm.
   */
  async createVault(farmId: string, name: string, description?: string, settings?: Json, metadata?: Json): Promise<VaultRow> {
    const insertData: VaultInsert = {
        farm_id: farmId,
        name: name,
        description: description,
        is_active: true,
        settings: settings || {},
        metadata: metadata || {}
    };
    const { data, error } = await this.supabase
      .from('vaults')
      .insert(insertData)
      .select()
      .single();
      
    if (error) throw new Error(`Failed to create vault: ${error.message}`);
    // TODO: Create initial balance entry in vault_balances?
    return data;
  }
  
  /**
   * Get a vault by its ID.
   */
  async getVault(id: string): Promise<VaultRow | null> {
    const { data, error } = await this.supabase
      .from('vaults')
      .select()
      .eq('id', id)
      .maybeSingle(); // Use maybeSingle if vault might not exist
      
    if (error) throw new Error(`Failed to fetch vault: ${error.message}`);
    return data;
  }
  
  /**
   * Get vaults associated with a specific farm.
   */
  async getVaultsByFarm(farmId: string): Promise<VaultRow[]> {
    const { data, error } = await this.supabase
      .from('vaults')
      .select()
      .eq('farm_id', farmId);
      
    if (error) throw new Error(`Failed to fetch vaults for farm ${farmId}: ${error.message}`);
    return data || [];
  }

  /**
   * Update a vault.
   */
  async updateVault(id: string, updates: VaultUpdate): Promise<VaultRow> {
    // Ensure non-updatable fields like id, created_at, farm_id are not in updates
    delete updates.id;
    delete updates.created_at;
    delete updates.farm_id;

    const { data, error } = await this.supabase
      .from('vaults')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw new Error(`Failed to update vault ${id}: ${error.message}`);
    return data;
  }
  
  // #endregion
  
  // #region Account Operations (REMOVED/ADAPTED)
  // Methods related to 'vault_accounts' are removed as the table isn't in generated types.
  // Logic might be integrated into 'vaults' operations or farm/agent services.
  // Methods like getAccountsByFarm now map to getVaultsByFarm.

  /**
   * Alias for getVaultsByFarm for compatibility if needed.
   */
  async getAccountsByFarm(farmId: string): Promise<VaultRow[]> {
    return this.getVaultsByFarm(farmId);
  }
  
  // #endregion
  
  // #region Transaction Operations (Using 'transaction_logs' table)

  /**
   * Create a new transaction log.
   * NOTE: This only logs the transaction. Balance updates must be handled separately.
   */
  async createTransaction(params: CreateTransactionParams): Promise<TransactionLogRow> {
    const insertData: TransactionLogInsert = {
      farm_id: params.farm_id,
      vault_id: params.vault_id,
      transaction_type: params.transaction_type,
      asset_symbol: params.asset_symbol,
      amount: params.amount,
      status: params.status || TransactionStatus.PENDING,
      description: params.description,
      metadata: params.metadata,
      linked_account_id: params.linked_account_id,
      external_id: params.external_id,
      transaction_hash: params.transaction_hash,
    };

    // Validate required fields
    if (!insertData.farm_id || !insertData.transaction_type || !insertData.asset_symbol || insertData.amount === undefined) {
        throw new Error("Missing required fields for transaction log: farm_id, transaction_type, asset_symbol, amount");
    }

    const { data, error } = await this.supabase
      .from('transaction_logs')
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create transaction log: ${error.message}`);
    
    // IMPORTANT: Balance update logic is NOT included here. 
    // Needs separate call to update vault_balances, potentially using DB functions.
    // Consider calling _updateBalances or similar method after this.
    return data;
  }

  /**
   * Get a specific transaction log by ID.
   */
  async getTransaction(id: string): Promise<TransactionLogRow | null> {
    const { data, error } = await this.supabase
      .from('transaction_logs')
      .select()
      .eq('id', id)
      .maybeSingle();
      
    if (error) throw new Error(`Failed to fetch transaction log ${id}: ${error.message}`);
    return data;
  }

  /**
   * Get transaction logs based on filters.
   */
  async getTransactions(filter: { 
    farmId?: string; 
    vaultId?: string;
    type?: string; 
    status?: string;
    asset?: string;
    limit?: number; 
    offset?: number;
    // Add date range etc. if needed 
  }): Promise<TransactionLogRow[]> {
    let query = this.supabase.from('transaction_logs').select();

    if (filter.farmId) query = query.eq('farm_id', filter.farmId);
    if (filter.vaultId) query = query.eq('vault_id', filter.vaultId);
    if (filter.type) query = query.eq('transaction_type', filter.type);
    if (filter.status) query = query.eq('status', filter.status);
    if (filter.asset) query = query.eq('asset_symbol', filter.asset);
    
    query = query.order('created_at', { ascending: false });

    const limit = filter.limit ?? 50; // Default limit to 50
    query = query.limit(limit);
    if (filter.offset !== undefined) { // Check offset explicitly
      query = query.range(filter.offset, filter.offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch transaction logs: ${error.message}`);
    return data || [];
  }

  /**
   * Update the status of a transaction log.
   */
  async updateTransactionStatus(id: string, status: TransactionStatus | string, errorDetails?: Json): Promise<TransactionLogRow> {
     const updates: TransactionLogUpdate = { 
         status: status, 
         metadata: errorDetails ? { error: errorDetails } : undefined 
     };
     const { data, error } = await this.supabase
      .from('transaction_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
     if (error) throw new Error(`Failed to update transaction log ${id} status: ${error.message}`);
     return data;
  }

  // #endregion

  // #region Balance Operations (Using 'vault_balances' table)

  /**
   * Get the balance for a specific asset in a vault.
   */
  async getBalance(vaultId: string, assetSymbol: string): Promise<VaultBalanceRow | null> {
    const { data, error } = await this.supabase
      .from('vault_balances')
      .select()
      .eq('vault_id', vaultId)
      .eq('asset_symbol', assetSymbol)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch balance for vault ${vaultId}, asset ${assetSymbol}: ${error.message}`);
    return data;
  }

  /**
   * Get all balances for a vault.
   */
  async getBalances(vaultId: string): Promise<VaultBalanceRow[]> {
    const { data, error } = await this.supabase
      .from('vault_balances')
      .select()
      .eq('vault_id', vaultId);

    if (error) throw new Error(`Failed to fetch balances for vault ${vaultId}: ${error.message}`);
    return data || [];
  }

  /**
   * Update balance - Use with caution, prefer atomic DB functions.
   * This is a simple update, NOT atomic. Use DB functions for ledger operations.
   */
  private async _updateBalanceDirect(vaultId: string, assetSymbol: string, newAmount: number): Promise<VaultBalanceRow> {
     console.warn('_updateBalanceDirect is not atomic. Use database functions for balance updates.');
     // Check if balance exists, insert if not, update if it does
     const existing = await this.getBalance(vaultId, assetSymbol);
     
     let resultData: VaultBalanceRow | null = null;
     let resultError: Error | null = null;

     if (existing) {
         const { data, error } = await this.supabase
             .from('vault_balances')
             .update({ amount: newAmount, last_updated: new Date().toISOString() })
             .eq('id', existing.id)
             .select()
             .single();
         resultData = data;
         resultError = error ? new Error(error.message) : null;
     } else {
         const { data, error } = await this.supabase
             .from('vault_balances')
             .insert({ vault_id: vaultId, asset_symbol: assetSymbol, amount: newAmount, last_updated: new Date().toISOString() })
             .select()
             .single();
         resultData = data;
         resultError = error ? new Error(error.message) : null;
     }

     if (resultError) throw resultError;
     if (!resultData) throw new Error('Failed to update or insert balance entry.');
     return resultData;
  }
  
  /**
   * Atomically updates balances using DB functions (PLACEHOLDER - requires DB function names)
   * Example assumes functions like 'adjust_vault_balance' exist.
   */
  async adjustBalanceAtomic(vaultId: string, assetSymbol: string, amountChange: number): Promise<void> {
      // IMPORTANT: Replace 'adjust_vault_balance' with your actual DB function name
      // --- COMMENTING OUT UNTIL CORRECT FUNCTION NAME IS KNOWN --- 
      /*
      const { error } = await this.supabase.rpc('adjust_vault_balance', { 
          p_vault_id: vaultId, 
          p_asset_symbol: assetSymbol, 
          p_amount_change: amountChange 
      });

      if (error) {
          console.error("Database function error:", error);
          throw new Error(`Atomic balance update failed: ${error.message}`);
      }
      */
     console.warn('adjustBalanceAtomic is disabled until the correct database function name is provided.');
     // Simulate success for now, or throw an error if preferred
     await Promise.resolve(); 
  }

  // #endregion

  // #region Security Policy Management (REMOVED)
  // Methods related to 'vault_security_policies' are removed.
  // #endregion

  // #region Audit Log Management (REMOVED)
  // Methods related to 'vault_audit_logs' are removed.
  // #endregion

  // #region Legacy Wallet Migration (Keep for now)
  async getLegacyWallets(farmId: string | number): Promise<LegacyWallet[]> {
      // Implementation... assumes a 'legacy_wallets' table or similar
      return [];
  }
  async migrateLegacyWallet(legacyWalletId: string | number): Promise<VaultRow> {
     // Implementation...
     // 1. Get legacy wallet data
     // 2. Create a new vault in 'vaults' table for the farm
     // 3. Create balance entry in 'vault_balances'
     // 4. Log transaction in 'transaction_logs'
     // 5. Mark legacy wallet as migrated
     throw new Error('Legacy migration not fully implemented.');
  }
  // #endregion

  // #region Helper Mapping Functions (REMOVED/ADAPTED)
  // Remove mappers for VaultMaster, VaultAccount, VaultTransaction, SecurityPolicy, AuditLogEntry
  // Add mappers if needed for VaultRow, TransactionLogRow, VaultBalanceRow to simplified app types
  // For now, service methods will return DB Row types directly.
  // #endregion

  /**
   * Checks the available balance for a specific asset across all accounts associated with a farm.
   * Available balance considers total balance minus locked amounts and pending outgoing transactions.
   * @param farmId - The ID of the farm.
   * @param assetSymbol - The currency/asset symbol (e.g., 'SUI', 'USDC').
   * @param requiredAmount - The amount required.
   * @returns Object indicating if the balance is sufficient and the total available amount.
   */
  async checkFarmBalance(
      farmId: string,
      assetSymbol: string,
      requiredAmount: number
  ): Promise<{ sufficient: boolean; availableAmount: number }> {
      let totalAvailableAmount = 0;

      try {
          // 1. Get all vaults associated with the farm
          const farmVaults = await this.getAccountsByFarm(farmId);
          if (!farmVaults || farmVaults.length === 0) {
              console.warn(`No vaults found for farm ${farmId}.`);
              return { sufficient: false, availableAmount: 0 };
          }

          // 2. Iterate through each vault and sum the balance for the specific asset
          for (const vault of farmVaults) {
              // Ensure the vault itself is active before checking its balance
              if (!vault.is_active) continue;

              // Fetch the balance for the specific asset in this vault
              const balanceDetails = await this.getBalance(vault.id, assetSymbol);
              totalAvailableAmount += balanceDetails?.amount || 0;
              // Note: This uses the direct 'amount'. A true 'available' calculation 
              // would need to factor in pending outgoing transactions from transaction_logs.
          }

          return {
              sufficient: totalAvailableAmount >= requiredAmount,
              availableAmount: totalAvailableAmount,
          };

      } catch (error: any) {
          console.error(`Error checking balance for farm ${farmId}, asset ${assetSymbol}:`, error);
          // Default to insufficient on error to be safe
          return { sufficient: false, availableAmount: 0 };
      }
  }

  // #region Farm Balance Calculation

  /**
   * Calculate the total available balance for a specific asset across all vaults in a farm.
   * @param farmId The farm ID.
   * @param assetSymbol The asset symbol (e.g., 'USD', 'BTC').
   * @returns Total available amount.
   */
  async calculateFarmTotalAvailable(farmId: string, assetSymbol: string): Promise<number> {
      let totalAvailableAmount = 0;

      // 1. Get all vaults associated with the farm
      const farmVaults = await this.getVaultsByFarm(farmId);

      // 2. For each vault, find the balance for the specific asset
      for (const vault of farmVaults) {
          // Get all balances for this vault
          const vaultBalances = await this.getBalances(vault.id);
          // Find the balance matching the requested asset symbol
          const targetBalance = vaultBalances.find(b => b.asset_symbol === assetSymbol);
          // Add the amount if found
          totalAvailableAmount += targetBalance?.amount || 0;
      }

      // NOTE: This uses the simple 'amount' from vault_balances.
      // A more complex calculation might involve checking related pending transactions 
      // from transaction_logs if 'available' vs 'total' is needed.
      return totalAvailableAmount;
  }

  // #endregion
}

// Export singleton instance
export const unifiedBankingService = new UnifiedBankingService(); 