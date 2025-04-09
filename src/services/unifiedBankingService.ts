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

// --- Type Aliases based on ACTUAL DB Schema --- 
// Tables: vault_accounts, vault_transactions

type VaultAccountRow = Database['public']['Tables']['vault_accounts']['Row'];
export type VaultAccountInsert = Database['public']['Tables']['vault_accounts']['Insert'];
type VaultAccountUpdate = Database['public']['Tables']['vault_accounts']['Update'];

type VaultTransactionRow = Database['public']['Tables']['vault_transactions']['Row'];
type VaultTransactionInsert = Database['public']['Tables']['vault_transactions']['Insert'];
type VaultTransactionUpdate = Database['public']['Tables']['vault_transactions']['Update'];

// --- REMOVED Aliases for non-existent tables/types ---
// type TransactionLogRow = ... 
// type VaultBalanceRow = ...

// Tables confirmed MISSING from schema/types: transaction_logs, vault_balances
// Functions confirmed MISSING from schema/types: update_account_balance

// --- Define Parameter Interfaces --- 

/**
 * Interface for parameters needed to create a vault transaction log entry.
 * This is used as the input type for the createTransaction method.
 */
export interface CreateVaultTransactionLogParams {
    type: string; // Corresponds to vault_transactions.type (e.g., 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER')
    amount: number; // Corresponds to vault_transactions.amount
    currency: string; // Corresponds to vault_transactions.currency
    source_id: string; // Corresponds to vault_transactions.source_id
    source_type: string; // Corresponds to vault_transactions.source_type
    destination_id: string; // Corresponds to vault_transactions.destination_id
    destination_type: string; // Corresponds to vault_transactions.destination_type
    initiated_by: string; // Corresponds to vault_transactions.initiated_by
    status?: TransactionStatus | string; // Corresponds to vault_transactions.status, Optional
    description?: string | null; // Corresponds to vault_transactions.description, Optional
    metadata?: Json | null; // Corresponds to vault_transactions.metadata, Optional
    reference?: string | null; // Corresponds to vault_transactions.reference, Optional
}

/**
 * Parameters for creating a transaction log (Legacy or simplified internal use?).
 */
interface CreateTransactionParams {
    farm_id: string;
    account_id?: string | null; // Changed from vault_id to match vault_accounts.id
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
 * REFACTORED based on ACTUAL schema (vault_accounts, vault_transactions).
 * Handles vault account and transaction operations for the Trading Farm.
 * NOTE: Uses non-atomic balance updates via direct table manipulation 
 *       due to missing update_account_balance function type.
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
  
  // #region Vault Account Operations (Using 'vault_accounts' table)
  
  /**
   * Create a new vault account.
   */
  async createAccount(params: VaultAccountInsert): Promise<VaultAccountRow> {
    // Ensure required fields from vault_accounts definition are provided
    if (!params.master_id || !params.name || !params.type) {
        throw new Error('Missing required fields for vault account creation: master_id, name, type');
    }
    
    // Set defaults based on vault_accounts table definition
    const insertData: VaultAccountInsert = {
        ...params,
        // 'description' is NOT in vault_accounts Insert type, removing.
        // description: params.description, 
        is_active: params.is_active ?? true,
        balance: params.balance ?? 0, // Default initial balance to 0
        locked_amount: params.locked_amount ?? 0, // Default locked amount to 0
        // currency: params.currency // Ensure currency is provided if needed by schema
        // Ensure other required fields like owner_id (if applicable) are handled
    };
    
    const { data, error } = await this.supabase
      .from('vault_accounts') 
      .insert(insertData)
      .select()
      .single();
      
    if (error) throw new Error(`Failed to create vault account: ${error.message}`);
    return data;
  }
  
  /**
   * Get a vault account by its ID. Renamed from getVault.
   */
  async getAccount(id: string): Promise<VaultAccountRow | null> {
    const { data, error } = await this.supabase
      .from('vault_accounts') // Use correct table name
      .select()
      .eq('id', id)
      .maybeSingle();
      
    if (error) throw new Error(`Failed to fetch vault account: ${error.message}`);
    return data;
  }
  
  /**
   * Get vault accounts associated with a specific farm. Renamed from getVaultsByFarm.
   */
  async getAccountsByFarm(farmId: number): Promise<VaultAccountRow[]> {
    const { data, error } = await this.supabase
      .from('vault_accounts') // Use correct table name
      .select()
      .eq('farm_id', farmId);
      
    if (error) throw new Error(`Failed to fetch vault accounts for farm ${farmId}: ${error.message}`);
    return data || [];
  }

  /**
   * Update a vault account. Renamed from updateVault.
   */
  async updateAccount(id: string, updates: VaultAccountUpdate): Promise<VaultAccountRow> {
    // Ensure non-updatable fields like id, created_at, farm_id are not in updates
    delete updates.id;
    delete updates.created_at;
    delete updates.farm_id;

    const { data, error } = await this.supabase
      .from('vault_accounts') // Use correct table name
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw new Error(`Failed to update vault account ${id}: ${error.message}`);
    return data;
  }
  
  /**
   * Get the current balance directly from the vault_accounts table for a specific account.
   * --- Method to be kept --- 
   */
  async getBalance(accountId: string): Promise<number> {
      const account = await this.getAccount(accountId);
      if (!account) throw new Error(`Account ${accountId} not found to get balance.`);
      // Return balance from the row, default to 0 if null/undefined
      return account.balance ?? 0; 
  }

  /**
   * ATOMIC: Calls the database function public.update_account_balance to adjust balance.
   */
  private async _updateBalanceAtomic(accountId: string, amountChange: number): Promise<number> {
      console.log(`Calling RPC update_account_balance for account ${accountId}. Amount change: ${amountChange}.`);
      const { data, error } = await this.supabase.rpc('update_account_balance', {
          target_account_id: accountId,
          amount_change: amountChange
      });

      if (error) {
          console.error(`RPC update_account_balance failed for account ${accountId}:`, error);
          // Check for specific error messages if needed, e.g., insufficient funds
          if (error.message.includes('Insufficient funds')) {
              throw new Error(`Insufficient funds for account ${accountId}.`);
          }
          throw new Error(`Failed to update balance atomically for account ${accountId}: ${error.message}`);
      }
      console.log(`RPC update_account_balance successful for account ${accountId}. New balance: ${data}`);
      return data as number; // Assuming the function returns the new balance
  }
  
  /**
   * Deletes a vault account by its ID.
   */
  async deleteAccount(id: string): Promise<{ success: boolean; error?: string }> {
      console.log(`Attempting to delete vault account with ID: ${id}`);
      const { error } = await this.supabase
          .from('vault_accounts') // Use correct table name
          .delete()
          .eq('id', id);

      if (error) {
          console.error(`Failed to delete vault account ${id}: ${error.message}`);
          throw new Error(`Failed to delete vault account ${id}: ${error.message}`);
          // Or return { success: false, error: `Failed to delete vault account ${id}: ${error.message}` };
      }

      console.log(`Successfully deleted vault account ${id}.`);
      return { success: true };
  }
  
  // #endregion
  
  // #region Transaction Operations (Using 'vault_transactions' table)

  /**
   * Logs a transaction to the vault_transactions table and attempts a 
   * NON-ATOMIC balance update on related vault_accounts if applicable.
   */
  async createTransaction(
      params: CreateVaultTransactionLogParams,
      attemptDirectBalanceUpdate: boolean = true // Flag to control the non-atomic update
  ): Promise<VaultTransactionRow> { // Use correct Row type
      
    // --- Step 1: Log the transaction intent --- 
    let logData: VaultTransactionRow | null = null; // Use correct Row type
    try {
        // --- Explicit Validation of Required Params (using correct param type) --- 
        if (params.amount === undefined || params.amount === null) throw new Error("Missing required parameter: amount");
        if (!params.type) throw new Error("Missing required parameter: type");
        if (!params.currency) throw new Error("Missing required parameter: currency");
        if (!params.source_id) throw new Error("Missing required parameter: source_id");
        if (!params.source_type) throw new Error("Missing required parameter: source_type");
        if (!params.destination_id) throw new Error("Missing required parameter: destination_id");
        if (!params.destination_type) throw new Error("Missing required parameter: destination_type");
        if (!params.initiated_by) throw new Error("Missing required parameter: initiated_by");
        // --- End Validation ---

        // Map params directly - *should now align with params type*
        const insertDataSecure: VaultTransactionInsert = {
            type: params.type,                 
            amount: params.amount,               
            currency: params.currency,           
            source_id: params.source_id,         
            source_type: params.source_type,       
            destination_id: params.destination_id, 
            destination_type: params.destination_type,
            status: params.status || TransactionStatus.PENDING, // Default applied
            description: params.description, // Nullable OK
            metadata: params.metadata, // Nullable OK
            reference: params.reference, // Nullable OK
            initiated_by: params.initiated_by,       
        };
    
        const { data, error } = await this.supabase
              .from('vault_transactions') 
              .insert(insertDataSecure) 
              .select()
              .single();
      
        if (error) throw error; 
        if (!data) throw new Error('Transaction log creation returned no data');
        logData = data;
        console.log(`Transaction log created successfully: ${logData.id}, Status: ${logData.status}`);

    } catch (logError: any) {
        console.error('Failed to create transaction log:', logError);
        throw new Error(`Failed to create transaction log: ${logError.message}`);
    }

    // --- Step 2: Attempt NON-ATOMIC balance updates if flagged --- 
    if (attemptDirectBalanceUpdate && logData) {
        let sourceUpdateError: any = null;
        let destUpdateError: any = null;
        const transactionId = logData.id;

        console.log(`Attempting non-atomic balance updates for transaction ${transactionId}...`);

        // Update source account (Debit) - *should now use correct params type*
        if (params.source_type === 'vault_account') { 
            try {
                 await this._updateBalanceAtomic(params.source_id, -Math.abs(params.amount)); 
            } catch (error: any) {
                 sourceUpdateError = error;
                 console.error(`[NON-ATOMIC FAILURE] Debit failed for source account ${params.source_id}, transaction ${transactionId}:`, error.message);
            }
        }

        // Update destination account (Credit) - *should now use correct params type*
        if (params.destination_type === 'vault_account') {
             try {
                 await this._updateBalanceAtomic(params.destination_id, Math.abs(params.amount)); 
            } catch (error: any) {
                 destUpdateError = error;
                 console.error(`[NON-ATOMIC FAILURE] Credit failed for destination account ${params.destination_id}, transaction ${transactionId}:`, error.message);
                 
                 // Rollback Attempt (Best Effort) - *should now use correct params type*
                 if (!sourceUpdateError && params.source_type === 'vault_account') { 
                     console.warn(`Attempting rollback for transaction ${transactionId}: Crediting source ${params.source_id} back...`);
                     try {
                        await this._updateBalanceAtomic(params.source_id, Math.abs(params.amount)); 
                        console.log(`Rollback successful for source ${params.source_id}.`);
                     } catch (rollbackError: any) {
                        console.error(`CRITICAL ROLLBACK FAILURE for transaction ${transactionId}, source ${params.source_id}. REQUIRES MANUAL INTERVENTION.`, rollbackError.message);
                     }
                 }
            }
        }

        // --- Step 3: Update transaction status based on balance update outcome --- 
        if (sourceUpdateError || destUpdateError) {
             const combinedError = `Source Update Error: ${sourceUpdateError?.message || 'None'}; Dest Update Error: ${destUpdateError?.message || 'None'}`;
             try {
                  console.warn(`Marking transaction ${transactionId} as FAILED due to balance update issues.`);
                  const updatedLog = await this.updateTransactionStatus(transactionId, TransactionStatus.FAILED, combinedError);
                  return updatedLog; // Return the log marked as FAILED
             } catch(statusUpdateError: any) {
                  console.error(`CRITICAL: Failed to mark transaction ${transactionId} as FAILED after balance update failure. Requires manual reconciliation.`, statusUpdateError.message);
                  // Return the original log data, but state is inconsistent
                  return logData; 
             }
         } else {
             // If balance updates succeeded (or weren't applicable), mark as COMPLETED
              if (logData.status === TransactionStatus.PENDING) {
                 console.log(`Balance updates successful for transaction ${transactionId}. Marking as COMPLETED.`);
                 try {
                     const updatedLog = await this.updateTransactionStatus(transactionId, TransactionStatus.COMPLETED);
                     return updatedLog;
                 } catch (statusUpdateError: any) {
                      console.error(`Failed to mark transaction ${transactionId} as COMPLETED after successful balance updates. Requires manual review.`, statusUpdateError.message);
                      // Return original log data, status might be stuck as PENDING
                      return logData;
                 }
             } else {
                 // If status was already non-pending, just return the log
                 return logData;
             }
         }
    } else {
         // If not attempting balance update, or log creation failed, return the initial log data
         if (!logData) {
              // This case should ideally not be reached due to earlier throw
              throw new Error("Log data is unexpectedly null after creation attempt.");
         }
         return logData;
     }
    // --- COMMENTED OUT OLD RPC CALL --- 
    // const { data: rpcData, error: rpcError } = await this.supabase.rpc(
    //     'update_account_balance', // Function needs to exist and type needs to be generated
    //     { 
    //         account_id: accountId,
    //         amount_change: amountChange,
    //         transaction_type: transactionType // Ensure enum/string matches function param type
    //     }
    // );
    // if (rpcError) throw new Error(`Failed to update balance via RPC: ${rpcError.message}`);
    // return rpcData; // Assuming RPC returns the updated account/balance
    // --------------------------------
  }

  /**
   * Get a transaction log by its ID from vault_transactions.
   */
  async getTransaction(id: string): Promise<VaultTransactionRow | null> { // Use correct Row type
    const { data, error } = await this.supabase
      .from('vault_transactions') // Use correct table name
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) {
        console.error(`Error fetching transaction ${id}:`, error);
        throw new Error(`Failed to fetch transaction ${id}: ${error.message}`);
    }
    return data;
  }

  /**
   * Get transaction logs based on a filter, querying the vault_transactions table.
   */
  async getTransactions(filter: TransactionFilter): Promise<VaultTransactionRow[]> { // Restore correct return type
    let query = this.supabase.from('vault_transactions').select(); // Use CORRECT table name

    // ... (Filtering logic remains the same) ...
    if (filter.accountId) {
        // Filter where accountId is either source_id or destination_id
      query = query.or(`source_id.eq.${filter.accountId},destination_id.eq.${filter.accountId}`);
    }
    if (filter.types && filter.types.length > 0) {
      query = query.in('type', filter.types);
    }
    if (filter.statuses && filter.statuses.length > 0) {
      query = query.in('status', filter.statuses);
    }
    if (filter.fromDate) {
        // Remove .toISOString() - Assume filter.fromDate is already an ISO string
        query = query.gte('created_at', filter.fromDate); 
    }
    if (filter.toDate) {
        // Remove .toISOString() - Assume filter.toDate is already an ISO string
        query = query.lte('created_at', filter.toDate);
    }
    if (filter.minAmount !== undefined) {
        query = query.gte('amount', filter.minAmount);
    }
    if (filter.maxAmount !== undefined) {
        query = query.lte('amount', filter.maxAmount);
    }
    if (filter.search) {
         // Example: searching description, adjust column/method as needed
         query = query.ilike('description', `%${filter.search}%`); 
    }

    // ... (Pagination logic remains the same) ...
    // Pagination
    const limit = filter.limit ?? 50; // Default limit
    query = query.limit(limit);
    if (filter.offset && filter.offset > 0) {
       // Supabase range is inclusive [from, to]
       query = query.range(filter.offset, filter.offset + limit - 1);
    }

    // ... (Sorting logic remains the same) ...
    // Sorting
    // Default sort by creation date descending. Allow overriding via filter if needed.
    // Note: TransactionFilter type doesn't currently define sorting options.
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
      
    if (error) {
        console.error("Error fetching transactions:", error);
        throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
    return data || [];
  }

  /**
   * Update the status and optionally metadata (for errors) of a transaction log.
   */
  async updateTransactionStatus(id: string, status: TransactionStatus | string, errorDetails?: string): Promise<VaultTransactionRow> { // Use correct Row type
      
      let updateObject: VaultTransactionUpdate = { // Use correct Update type
          status: status,
          updated_at: new Date().toISOString(),
      };

    // ... (Metadata update logic remains the same) ...
      // Add error details to metadata if status is FAILED
      if (status === TransactionStatus.FAILED && errorDetails) {
          // Fetch existing metadata first to merge, avoid overwriting
          const currentTx = await this.getTransaction(id);
          const existingMetadata = currentTx?.metadata ? JSON.parse(JSON.stringify(currentTx.metadata)) : {}; // Deep copy or handle Json type correctly
          
          updateObject.metadata = { 
              ...existingMetadata, // Preserve existing metadata
              error: errorDetails 
          } as Json; // Cast may be needed depending on Json type definition
      }

    const { data, error } = await this.supabase
          .from('vault_transactions') // Use CORRECT table name
          .update(updateObject)
          .eq('id', id)
      .select()
      .single();
      
      if (error) {
          console.error(`Error updating transaction status for ${id}:`, error);
          throw new Error(`Failed to update transaction status for ${id}: ${error.message}`);
      }
      console.log(`Updated transaction ${id} status to ${status}.`);
      return data;
  }
  
  // #endregion
  
  // #region Helper/Utility Methods (Based on vault_accounts)

  /**
   * Checks if a farm has sufficient available balance for a specific asset (currency).
   * Calculates available balance by summing (balance - locked_amount) across relevant active vault accounts.
   */
  async checkFarmBalance(
      farmId: string,
      assetSymbol: string, // Corresponds to the 'currency' column in vault_accounts
      requiredAmount: number
  ): Promise<{ sufficient: boolean; availableAmount: number }> {
      let totalAvailableAmount = 0;

      try {
          // 1. Get all active vault accounts associated with the farm
          const farmAccounts = await this.getAccountsByFarm(Number(farmId));
          const activeAccounts = farmAccounts.filter(acc => acc.is_active);

          if (!activeAccounts || activeAccounts.length === 0) {
              console.warn(`No active vault accounts found for farm ${farmId}.`);
              return { sufficient: false, availableAmount: 0 };
          }

          // 2. Iterate, check currency, and sum available balance
          for (const account of activeAccounts) {
              // Check if the account's currency matches the requested assetSymbol
              if (account.currency === assetSymbol) {
                  // Calculate available: balance minus locked amount
                  const available = (account.balance ?? 0) - (account.locked_amount ?? 0);
                  totalAvailableAmount += available > 0 ? available : 0; // Don't add if locked amount exceeds balance
              }
          }

          console.log(`Farm ${farmId} balance check for ${assetSymbol}: Required=${requiredAmount}, Available=${totalAvailableAmount}`);
          return {
              sufficient: totalAvailableAmount >= requiredAmount,
              availableAmount: totalAvailableAmount,
          };

      } catch (error: any) {
          console.error(`Error checking balance for farm ${farmId}, asset ${assetSymbol}:`, error.message);
          // Return insufficient on error to be safe
          return { sufficient: false, availableAmount: 0 };
      }
  }

  /**
   * Calculate the total raw balance for a specific asset (currency) across all active accounts in a farm.
   * Note: This sums the raw 'balance' field, ignoring locked amounts.
   */
  async calculateFarmTotalBalance(farmId: string, assetSymbol: string): Promise<number> {
      let totalBalance = 0;
      try {
          // 1. Get all active vault accounts associated with the farm
          const farmAccounts = await this.getAccountsByFarm(Number(farmId));
          const activeAccounts = farmAccounts.filter(acc => acc.is_active);

          // 2. For each active account, add its balance if the currency matches
          for (const account of activeAccounts) {
              if (account.currency === assetSymbol) {
                  totalBalance += account.balance ?? 0;
              }
          }
          console.log(`Farm ${farmId} total balance calculated for ${assetSymbol}: ${totalBalance}`);
          return totalBalance;
      } catch (error: any) {
          console.error(`Error calculating total balance for farm ${farmId}, asset ${assetSymbol}:`, error.message);
          return 0; // Return 0 on error
      }
  }

  // #endregion

  // --- DEPRECATED / REMOVED METHODS (Referencing old/missing tables/functions) ---
  
  // Method getBalances using non-existent vault_balances
  /* 
  async getBalances(vaultId: string): Promise<VaultBalanceRow[]> {
      const { data, error } = await this.supabase
          .from('vault_balances') // ERROR: vault_balances does not exist
          .select()
          .eq('vault_id', vaultId); 

      if (error) throw new Error(`Failed to fetch balances for vault ${vaultId}: ${error.message}`);
      return data || [];
  }
  */

  // Method upsertBalance using non-existent vault_balances
  /*
  async upsertBalance(balance: VaultBalanceInsert): Promise<VaultBalanceRow> {
      const { data, error } = await this.supabase
          .from('vault_balances') // ERROR: vault_balances does not exist
          .upsert(balance)
          .select()
          .single();

      if (error) throw new Error(`Failed to upsert balance: ${error.message}`);
      return data;
  }
  */

  // Method createTransactionLog using non-existent transaction_logs
  /*
  async createTransactionLog(log: TransactionLogInsert): Promise<TransactionLogRow> {
      const { data, error } = await this.supabase
          .from('transaction_logs') // ERROR: transaction_logs does not exist
          .insert(log)
          .select()
          .single();

      if (error) throw new Error(`Failed to create transaction log: ${error.message}`);
      return data;
  }
  */

  // Method getTransactionLog using non-existent transaction_logs
  /*
  async getTransactionLog(id: string): Promise<TransactionLogRow | null> {
    const { data, error } = await this.supabase
      .from('transaction_logs') // ERROR: transaction_logs does not exist
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch transaction log ${id}: ${error.message}`);
    return data;
  }
  */

  // -------------------------------------------------------------------------------
}

// Export a singleton instance (consider dependency injection for better testability)
export const unifiedBankingService = UnifiedBankingService.getInstance(false); // Default to client-side instance? Or make context-aware? 