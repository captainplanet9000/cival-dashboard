import { SupabaseService } from '@/services/db/supabase-service';
// import { Database } from '@/types/database.types'; // Commented out until type generation is fixed
// import { Farm as FarmType } from '@/types/farm'; // Keep this if it's correct and doesn't conflict
import { UnifiedBankingService } from '../unifiedBankingService';
import { TransactionStatus, TransactionType } from '@/types/vault';
import { createServerClient } from '@/utils/supabase/server';
// import { Farm, FarmAgent, CreateFarmParams, SetFarmGoalParams, UpdateFarmParams, DbFarm } from '@/types/farm';
import { ApiResponse } from '@/types/api';
import { Goal, GoalCreateInput } from '../../../TradingFarm/next-dashboard/src/types/goal-types';

// Import central types
import { Farm } from '@/types/farm';
import { Agent } from '@/types'; // Assuming Agent type is defined in @/types/index.ts
import { Database, Json } from '@/types/database.types'; // Import Json type

// Alias for the generated DB row types
type DbFarmRow = Database['public']['Tables']['farms']['Row'];
type TransactionLogRow = Database['public']['Tables']['transaction_logs']['Row'];
type VaultRow = Database['public']['Tables']['vaults']['Row']; // Use VaultRow alias

// Update Wallet interface to reflect VaultRow structure more closely
// Or consider removing and using VaultRow directly if bankingService exports it
// For now, rename and align fields with 'vaults' table
export interface FarmVaultSummary { // Renamed from Wallet
  id: string;
  name: string;
  farm_id: string;
  is_active: boolean;
  description?: string | null;
  settings?: Json | null;
  metadata?: Json | null;
  created_at: string;
  updated_at: string;
  // Removed fields not in VaultRow: address, user_id, balance (balance is in separate table)
}

// Type combining Farm with related data
export interface EnrichedFarm extends Farm {
  agents?: Agent[]; // Use imported Agent type
  vaults?: FarmVaultSummary[]; // Changed from wallets to vaults, using updated interface
}

// Parameter Types (if not defined centrally)
export interface CreateFarmParams {
  name: string;
  description?: string;
  user_id?: string; // Ensure this aligns with how owner_id is handled
  settings?: Farm['settings']; // Use settings from imported Farm type if applicable
}

export interface SetFarmGoalParams {
  goal_name?: string | null;
  goal_description?: string | null;
  goal_target_assets?: string[] | null;
  goal_target_amount?: number | null;
  goal_completion_action?: Farm['goal_completion_action']; // Use imported Farm type
  goal_deadline?: string | null;
  goal_status?: Farm['goal_status']; // Use imported Farm type
}

export interface CreateAgentParams {
  name: string;
  farm_id: string; // Use string ID consistent with Farm type
  type: string;
  status?: Agent['status']; // Use imported Agent type
  capabilities?: string[];
  eliza_config?: Agent['eliza_config'];
  metadata?: Agent['metadata'];
}

// Update CreateWalletParams to match createVault signature
export interface CreateVaultForFarmParams { // Renamed from CreateWalletParams
  name: string;
  farm_id: string; // Moved farm_id to be required
  description?: string;
  settings?: Json;
  metadata?: Json;
  // Removed address, user_id, balance - these aren't part of vault creation
}

// Update RecordTransactionParams to match createTransaction signature
export interface RecordTransactionParams {
  farm_id: string; // Required
  vault_id?: string | null; // Changed from wallet_id
  transaction_type: TransactionType | string; // Use enum
  asset_symbol: string; // Required
  amount: number; // Required
  status?: TransactionStatus | string; // Use enum
  description?: string | null;
  metadata?: Json | null;
  linked_account_id?: string | null;
  external_id?: string | null;
  transaction_hash?: string | null;
}

/**
 * Service for managing farms and related entities, including goals
 */
export class FarmService {
  private dbService = SupabaseService.getInstance();
  private bankingService = UnifiedBankingService.getInstance(true); // Assuming server-side usage
  private static instance: FarmService;

  // Private constructor for singleton pattern
  private constructor() {}

  // Get singleton instance
  public static getInstance(): FarmService {
    if (!FarmService.instance) {
      FarmService.instance = new FarmService();
    }
    return FarmService.instance;
  }

  // Updated helper function to map DbFarmRow to imported Farm
  private mapDbFarmRowToAppFarm(dbFarm: DbFarmRow | null): Farm | null {
    if (!dbFarm) return null;

    // Basic progress calculation (example)
    let progress = 0;
    const currentProgress = (dbFarm.goal_current_progress || {}) as Record<string, number>;
    if (dbFarm.goal_target_amount && dbFarm.goal_target_amount > 0 && dbFarm.goal_target_assets) {
        const firstTarget = dbFarm.goal_target_assets[0];
        if (firstTarget && currentProgress[firstTarget]) {
             progress = Math.min(100, (currentProgress[firstTarget] / dbFarm.goal_target_amount) * 100);
        }
    }

    // Map fields from DbFarmRow to Farm interface from @/types/farm.ts
    return {
        id: dbFarm.id, // Assumes DbFarmRow uses string ID
        name: dbFarm.name,
        description: dbFarm.description || '', // Match non-null Farm.description
        settings: (dbFarm.settings || {}) as Farm['settings'], // Map settings
        createdAt: dbFarm.created_at, // Map created_at
        updatedAt: dbFarm.updated_at, // Map updated_at

        // Goal fields (mapping names)
        goal_name: dbFarm.goal_name,
        goal_description: dbFarm.goal_description,
        goal_target_assets: dbFarm.goal_target_assets,
        goal_target_amount: dbFarm.goal_target_amount,
        goal_current_progress: currentProgress,
        goal_status: dbFarm.goal_status as Farm['goal_status'],
        goal_completion_action: dbFarm.goal_completion_action as Farm['goal_completion_action'],
        goal_deadline: dbFarm.goal_deadline,
        goal_progress: progress,

        // Fields present in Farm (@/types/farm) but not directly in DbFarmRow need defaults/placeholders
        status: dbFarm.is_active ? 'ACTIVE' : 'STOPPED', // Map is_active to status
        exchange: (dbFarm.settings as any)?.exchange || 'N/A', // Try getting from settings
        apiKey: (dbFarm.settings as any)?.apiKey || 'N/A', // Try getting from settings
        apiSecret: (dbFarm.settings as any)?.apiSecret || 'N/A', // Try getting from settings
        balance: { total: 0, available: 0, locked: 0, currency: 'USD' }, // Placeholder - requires separate query or banking service call
        performance: { totalReturn: 0, dailyReturn: 0, monthlyReturn: 0, winRate: 0, profitFactor: 0 }, // Placeholder
        activeStrategies: (dbFarm.settings as any)?.activeStrategies || [], // Try getting from settings
        tradingPairs: (dbFarm.settings as any)?.tradingPairs || [], // Try getting from settings
    };
  }

  /**
   * Get all farms with optional filtering
   */
  async getFarms(userId?: string): Promise<ApiResponse<Farm[]>> {
    const conditions: Record<string, any> = {};
    if (userId) conditions.owner_id = userId; // Use owner_id from DbFarmRow

    const result = await this.dbService.fetch<DbFarmRow[]>('farms', '*' /* Select all columns */, {
      eq: conditions,
      order: { column: 'created_at', ascending: false }
    });

    return {
        success: result.success,
        // Re-apply explicit type annotation for filter parameter f
        data: result.data?.map(this.mapDbFarmRowToAppFarm).filter((f: Farm | null): f is Farm => f !== null) || [],
        error: result.error
    };
  }

  /**
   * Get a farm by ID with all related data
   */
  async getFarmById(id: string): Promise<ApiResponse<EnrichedFarm>> {
    // ID is already string, matching DbFarmRow.id
    const farmResult = await this.dbService.fetch<DbFarmRow>('farms', '*', { eq: { id: id }, single: true });
    if (!farmResult.success || !farmResult.data) return { success: false, error: farmResult.error || 'Farm not found' };

    // Fetch related data using string ID
    const agentsResult = await this.dbService.fetch<Agent[]>('agents', '*', { eq: { farm_id: id } });
    
    // Use bankingService to get vaults
    let vaults: VaultRow[] = [];
    let vaultError: string | undefined;
    try {
        vaults = await this.bankingService.getVaultsByFarm(id);
    } catch (error: any) {
        vaultError = `Failed to fetch vaults: ${error.message}`;
        console.error(vaultError); // Log the error
    }

    const appFarm = this.mapDbFarmRowToAppFarm(farmResult.data);
    if (!appFarm) return { success: false, error: 'Failed to map farm data' };

    const enrichedFarm: EnrichedFarm = {
      ...appFarm,
      agents: agentsResult.success ? agentsResult.data : [], // Use imported Agent
      vaults: vaults.map(v => ({ // Map VaultRow to FarmVaultSummary
          id: v.id,
          name: v.name,
          farm_id: v.farm_id,
          is_active: v.is_active,
          description: v.description,
          settings: v.settings,
          metadata: v.metadata,
          created_at: v.created_at,
          updated_at: v.updated_at,
      })) 
    };

    // Append vault fetching error if it occurred
    const finalError = farmResult.error || vaultError || agentsResult.error;

    return { data: enrichedFarm, success: !finalError, error: finalError };
  }

  /**
   * Create a new farm
   */
  async createFarm(params: CreateFarmParams): Promise<ApiResponse<Farm>> {
    const ownerId = params.user_id || (await createServerClient().auth.getUser()).data.user?.id;
    if (!ownerId) return { success: false, error: 'User not authenticated' };

    // Map CreateFarmParams to DbFarmRow Insert type
    const insertData: Database['public']['Tables']['farms']['Insert'] = {
        name: params.name,
        description: params.description,
        owner_id: ownerId,
        is_active: true, // Default value
        settings: params.settings || {},
        // Set default goal fields to null/empty?
        goal_name: null,
        goal_description: null,
        goal_target_assets: null,
        goal_target_amount: null,
        goal_current_progress: null,
        goal_status: 'inactive',
        goal_completion_action: null,
        goal_deadline: null,
        autonomy_level: 'manual' // Default value
    };

    const result = await this.dbService.create<DbFarmRow>('farms', insertData, { single: true });
    return {
        success: result.success,
        data: this.mapDbFarmRowToAppFarm(result.data),
        error: result.error
     };
  }

  /**
   * Update an existing farm (excluding goal fields)
   */
  async updateFarm(id: string, params: Partial<Pick<Farm, 'name' | 'description' | 'settings' | 'status'>> ): Promise<ApiResponse<Farm>> {
      // Map relevant Farm fields to DbFarmRow Update type
      const updateData: Database['public']['Tables']['farms']['Update'] = {
          name: params.name,
          description: params.description,
          is_active: params.status ? params.status === 'ACTIVE' : undefined, // Map status to is_active
          settings: params.settings,
      };
      // Remove undefined keys to avoid updating fields unnecessarily
      Object.keys(updateData).forEach(key => (updateData as any)[key] === undefined && delete (updateData as any)[key]);


      const result = await this.dbService.update<DbFarmRow>('farms', updateData, { id: id }, { single: true });
       return {
           success: result.success,
           data: this.mapDbFarmRowToAppFarm(result.data),
           error: result.error
        };
  }

  /**
   * Delete a farm
   */
  async deleteFarm(id: string): Promise<ApiResponse<DbFarmRow>> { // Return type might need adjustment
    // Add logic for cascading deletes or checks if needed (e.g., check active agents/vaults)
    return await this.dbService.delete<DbFarmRow>('farms', { id: id }, { single: true });
  }

  /**
   * Create a new agent for a farm
   */
  async createAgent(params: CreateAgentParams): Promise<ApiResponse<Agent>> {
    // Map CreateAgentParams to DB Agent Insert type
     const insertData: Database['public']['Tables']['agents']['Insert'] = {
       agent_type: params.type,
       status: params.status || 'idle', // Default status
       farm_id: params.farm_id, // Linter Error Note: Linter might incorrectly flag this. `database.types.ts` shows `farm_id` is valid here.
       metadata: params.metadata || {},
       // 'name' is not directly in the 'agents' table, maybe store in metadata?
       // If name is crucial, consider adding a name column via migration
       // metadata: { ...params.metadata, name: params.name }, 
       // eliza_config is also not in agents table
     };
    return await this.dbService.create<Agent>('agents', insertData, { single: true });
  }

  /**
   * Create a new vault for a farm using the banking service.
   * Renamed from createWallet.
   */
  async createVaultForFarm(params: CreateVaultForFarmParams): Promise<ApiResponse<VaultRow>> { // Return VaultRow
    try {
      const vault = await this.bankingService.createVault(
        params.farm_id,
        params.name,
        params.description,
        params.settings,
        params.metadata
      );
      return { success: true, data: vault };
    } catch (error: any) {
      return { success: false, error: `Failed to create vault via banking service: ${error.message}` };
    }
  }

  /**
   * Record a transaction log using the banking service.
   */
  async recordTransaction(params: RecordTransactionParams): Promise<ApiResponse<TransactionLogRow>> { // Return TransactionLogRow
    try {
      // Map FarmService params to BankingService params if needed (they seem aligned now)
      const transactionLog = await this.bankingService.createTransaction(params);
      
      // TODO: Crucial - Need to call an atomic balance update function here!
      // This only logs the transaction, balances are not updated yet.
      // Example: await this.bankingService.adjustBalanceAtomic(params.vault_id, params.asset_symbol, params.amount * (params.transaction_type === 'DEPOSIT' ? 1 : -1));
      console.warn(`Transaction ${transactionLog.id} logged, but balance update is PENDING implementation.`);

      return { success: true, data: transactionLog };
    } catch (error: any) {
      return { success: false, error: `Failed to record transaction via banking service: ${error.message}` };
    }
  }

  /**
   * Set or update the goal for a specific farm
   */
  async setFarmGoal(farmId: string, goalDetails: SetFarmGoalParams): Promise<ApiResponse<Farm>> {
      // Map SetFarmGoalParams to DbFarmRow Update type
      const updateData: Database['public']['Tables']['farms']['Update'] = {
          goal_name: goalDetails.goal_name,
          goal_description: goalDetails.goal_description,
          goal_target_assets: goalDetails.goal_target_assets,
          goal_target_amount: goalDetails.goal_target_amount,
          goal_completion_action: goalDetails.goal_completion_action,
          goal_deadline: goalDetails.goal_deadline,
          goal_status: goalDetails.goal_status || 'active', // Default to active when setting goal
          // Reset progress when setting/updating goal? Depends on requirements
          // goal_current_progress: {} 
      };
      // Remove undefined keys
      Object.keys(updateData).forEach(key => (updateData as any)[key] === undefined && delete (updateData as any)[key]);


      const result = await this.dbService.update<DbFarmRow>('farms', updateData, { id: farmId }, { single: true });

      if (result.success && result.data && result.data.goal_status === 'completed') {
          // If setting the status directly to completed, execute actions
          await this.executeCompletionActions(farmId, result.data.goal_completion_action);
      }

      return { 
          success: result.success,
          data: this.mapDbFarmRowToAppFarm(result.data),
          error: result.error
       };
  }

  /**
   * Handles actions defined in goal_completion_action when a goal is completed.
   */
    private async executeCompletionActions(farmId: string, completionAction: Farm['goal_completion_action']): Promise<void> {
        if (!completionAction) return;
        console.log(`Executing completion actions for farm ${farmId}:`, completionAction);

        // Check based on the defined type property
        if (completionAction.transferToBank) {
            console.log(`Goal completion action: Transfer funds requested.`);
            // TODO: Update `Farm['goal_completion_action']` type in `src/types/farm.ts` 
            // to include necessary parameters (amount, asset, targetVaultId etc.) 
            // OR fetch/derive these parameters from elsewhere (e.g., goal details, farm settings).
            // The commented-out code below assumes parameters exist on completionAction, which they currently don't.
            /* 
            const params = completionAction.parameters as { amount: number; asset: string; targetVaultId: string };
            if (params && params.amount && params.asset && params.targetVaultId) {
                try {
                    // Find a source vault within the farm for the transfer
                    const sourceVaults = await this.bankingService.getVaultsByFarm(farmId);
                    const sourceVault = sourceVaults.find(v => v.is_active); // Find first active vault
                    
                    if (sourceVault) {
                        await this.recordTransaction({
                            farm_id: farmId,
                            vault_id: sourceVault.id, // Withdraw from source
                            transaction_type: TransactionType.WITHDRAWAL, // Or TRANSFER_OUT
                            asset_symbol: params.asset,
                            amount: -params.amount, // Negative amount for withdrawal
                            description: `Goal completion transfer OUT to ${params.targetVaultId}`,
                            status: TransactionStatus.PENDING // Pending until confirmed
                        });
                        await this.recordTransaction({
                            farm_id: farmId, // Or target farm ID if different
                            vault_id: params.targetVaultId, // Deposit to target
                            transaction_type: TransactionType.DEPOSIT, // Or TRANSFER_IN
                            asset_symbol: params.asset,
                            amount: params.amount, // Positive amount for deposit
                            description: `Goal completion transfer IN from ${sourceVault.id}`,
                            status: TransactionStatus.PENDING // Pending until confirmed
                        });
                         // TODO: Need atomic transfer logic here using adjustBalanceAtomic or similar
                        console.log(`Initiated goal completion transfer: ${params.amount} ${params.asset} from vault ${sourceVault.id} to ${params.targetVaultId}`);
                    } else {
                         console.error(`No active source vault found in farm ${farmId} for completion transfer.`);
                    }
                } catch (error) {
                    console.error(`Error executing TRANSFER_FUNDS completion action for farm ${farmId}:`, error);
                }
            } else {
                 console.warn(`Missing parameters for TRANSFER_FUNDS action for farm ${farmId}.`);
            }
            */
        }

        if (completionAction.startNextGoal) {
             console.log(`Goal completion action: Start next goal requested.`);
             // TODO: Implement logic to find and activate the next goal for the farm.
        }

        // Add more action types based on the properties defined in Farm['goal_completion_action']
    }

}

export const farmService = FarmService.getInstance();