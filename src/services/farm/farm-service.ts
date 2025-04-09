import { SupabaseService } from '../database/supabase-service';
import { Database, Json } from '@/types/database.types'; // Uncommented
// import { Farm as FarmType } from '@/types/farm'; // Keep commented if using index.ts version primarily
import { 
    UnifiedBankingService, 
    CreateVaultTransactionLogParams, 
    VaultAccountInsert
} from '../unifiedBankingService';
import { TransactionStatus, TransactionType } from '@/types/vault';
import { createServerClient } from '@/utils/supabase/server';
// import { Farm, FarmAgent, CreateFarmParams, SetFarmGoalParams, UpdateFarmParams, DbFarm } from '@/types/farm';
import { ApiResponse } from '../../../src/services/database/supabase-service'; // Import canonical version
// import { Goal, GoalCreateInput } from '../../../TradingFarm/next-dashboard/src/types/goal-types'; // Path looks incorrect
import { v4 as uuidv4 } from 'uuid'; // Import uuid

// Import central types (using number IDs now)
import { Farm } from '@/types/index'; // Use index.ts version
import { Agent } from '@/types/index'; // Use index.ts version
// Import Wallet types added to index.ts
import { Wallet, CreateWalletParams } from '@/types/index';

// Alias for the generated DB row types (reflecting number IDs)
type DbFarmRow = Database['public']['Tables']['farms']['Row'];
type DbAgentRow = Database['public']['Tables']['agents']['Row'];
// Use vault_accounts/transactions types (assuming they now exist in Database type)
type VaultAccountRow = Database['public']['Tables']['vault_accounts']['Row'];
type VaultTransactionRow = Database['public']['Tables']['vault_transactions']['Row'];
// Define DB row alias for Wallets here
type DbWalletRow = Database['public']['Tables']['wallets']['Row']; 

// REMOVED incorrect aliases based on non-existent tables
// type TransactionLogRow = Database['public']['Tables']['transaction_logs']['Row'];
// type VaultRow = Database['public']['Tables']['vaults']['Row']; 

// Update Summary interface to reflect VaultAccountRow structure
// This interface summarizes key details for display/use in FarmService
export interface FarmVaultAccountSummary { // Renamed from FarmVaultSummary
  id: string; // from VaultAccountRow (uuid)
  master_id: string; // from VaultAccountRow (uuid)
  name: string; // from VaultAccountRow
  type: string; // from VaultAccountRow
  farm_id: number | null; // from VaultAccountRow (bigint/number)
  agent_id: number | null; // from VaultAccountRow (bigint/number)
  is_active: boolean | null; // from VaultAccountRowcom
  balance: number | null; // from VaultAccountRow
  locked_amount: number | null; // from VaultAccountRow
  currency: string | null; // from VaultAccountRow
  created_at: string | null; // from VaultAccountRow
  updated_at: string | null; // from VaultAccountRow
  // Add other relevant fields from VaultAccountRow if needed (address, agent_id, risk_level, settings etc.)
}

// Type combining Farm with related data
export interface EnrichedFarm extends Farm {
  agents?: Agent[];
  vaults?: FarmVaultAccountSummary[];
}

// Parameter Types (adjusting IDs to number)
export interface CreateFarmParams {
  name: string;
  description?: string;
  user_id?: string; // owner_id is string (text/varchar) in DB
  settings?: Farm['settings']; 
}

export interface SetFarmGoalParams {
  goal_name?: string | null;
  goal_description?: string | null;
  goal_target_assets?: string[] | null;
  goal_target_amount?: number | null;
  goal_completion_action?: Farm['goal_completion_action'];
  goal_deadline?: string | null;
  goal_status?: DbFarmRow['goal_status']; // Use DB type for status consistency
}

export interface CreateAgentParams {
  name: string;
  farm_id: number; // Changed to number
  capabilities?: string[]; // Use capabilities from agents table
  config?: Json | null; // Use config from agents table (for eliza_config)
  is_active?: boolean; // Allow setting is_active explicitly
  // agent_type?: string; // REMOVED: Likely doesn't exist in DB
  // description?: string | null; // Add if needed and present in agents table
}

// Update CreateVaultForFarmParams - Needs required fields for createAccount
export interface CreateVaultForFarmParams { 
  master_id: string; // uuid
  name: string; 
  type: string; 
  farm_id: number; // number (bigint)
  currency: string; 
  // description?: string; // Not directly on vault_accounts
  address?: string | null; 
  agent_id?: number | null; // number (bigint)
  balance?: number | null; 
  locked_amount?: number | null; 
  is_active?: boolean | null; 
  risk_level?: string | null; 
  security_level?: string | null; 
  settings?: Json | null; 
}

// ** UPDATED Parameter type for recordTransaction **
export interface RecordTransactionParams {
  // Core Fields
  transaction_type: string; // Use vault_transactions type enum if exists?
  amount: number; 
  currency: string; 
  initiated_by: string; // ID of user/agent/system
  initiated_by_type: 'user' | 'agent' | 'system'; // Clarify initiator
  
  // Account IDs (optional, depends on type)
  source_account_id?: string; // Keep as string (matches vault_transactions.source_id text)
  destination_account_id?: string; // Keep as string
  
  // Optional Identifiers & Data
  external_id?: string; 
  transaction_hash?: string; 
  description?: string | null;
  status?: VaultTransactionRow['status'] | string; // Use DB type or string
  metadata?: Json | null; // Use Json from DB types

  // Context
  farm_id?: number; // number (bigint)
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

  // Updated helper function to return undefined instead of null
  private mapDbFarmRowToAppFarm(dbFarm: DbFarmRow | null | undefined): Farm | undefined { // Accept undefined, return undefined
    if (!dbFarm) return undefined; // Return undefined

    const config = (dbFarm.config || {}) as Record<string, any>; // Use config
    const performanceMetrics = (dbFarm.performance_metrics || {}) as Record<string, any>; // Use performance_metrics

    // Calculate progress (example, ensure logic is correct for your needs)
    let progress = 0;
    const currentProgress = (dbFarm.goal_current_progress || {}) as { [asset: string]: number };
    if (dbFarm.goal_target_amount && dbFarm.goal_target_amount > 0 && dbFarm.goal_target_assets) {
        const firstTarget = dbFarm.goal_target_assets[0];
        if (firstTarget && currentProgress[firstTarget]) {
             progress = Math.min(100, (currentProgress[firstTarget] / dbFarm.goal_target_amount) * 100);
        }
    }

    // Map fields from DbFarmRow to Farm (using updated Farm type)
    return {
        id: dbFarm.id,
        name: dbFarm.name,
        description: dbFarm.description, // Now optional in Farm type
        settings: { // Map from config
            autonomyLevel: config?.autonomyLevel,
            defaultExchange: config?.defaultExchange,
            activeStrategies: config?.activeStrategies,
            tradingPairs: config?.tradingPairs,
            exchange: config?.exchange,
            apiKey: config?.apiKey,
            apiSecret: config?.apiSecret,
            // ... map other settings from config if needed
        },
        createdAt: dbFarm.created_at,
        updatedAt: dbFarm.updated_at,
        is_active: dbFarm.is_active,
        status: dbFarm.is_active ? 'ACTIVE' : 'STOPPED', // Or map to other statuses based on logic

        // Optional fields - not directly mapped here, fetched/calculated elsewhere
        balance: undefined, // Set explicitly to undefined or omit
        performance: { // Map from performance_metrics JSON
             totalReturn: performanceMetrics?.totalReturn,
             dailyReturn: performanceMetrics?.dailyReturn,
             monthlyReturn: performanceMetrics?.monthlyReturn,
             winRate: performanceMetrics?.winRate,
             profitFactor: performanceMetrics?.profitFactor,
             // ... map other metrics
        },

        // Goal fields
        goal_name: dbFarm.goal_name,
        goal_description: dbFarm.goal_description,
        goal_target_assets: dbFarm.goal_target_assets,
        goal_target_amount: dbFarm.goal_target_amount,
        goal_current_progress: currentProgress,
        goal_status: dbFarm.goal_status as Farm['goal_status'],
        goal_completion_action: dbFarm.goal_completion_action as Farm['goal_completion_action'],
        goal_deadline: dbFarm.goal_deadline,
        goal_progress: progress, // Derived
    };
  }

  /**
   * Get all farms - REMOVED owner_id filter
   */
  async getFarms(userId?: string): Promise<ApiResponse<Farm[]>> {
    // REMOVED owner_id logic
    // const conditions: Record<string, any> = {};
    // if (userId) conditions.owner_id = userId;

    const result = await this.dbService.fetch<DbFarmRow[]>('farms', '*' /* Select all columns */, {
      // eq: conditions, // REMOVED filter
      order: { column: 'created_at', ascending: false }
    });

    return {
        success: result.success,
        data: result.data?.map(this.mapDbFarmRowToAppFarm).filter((f: Farm | undefined): f is Farm => f !== undefined) || [],
        error: result.error
    };
  }

  /**
   * Get a farm by ID with related data - balance/performance still need aggregation if needed at Farm level
   */
  async getFarmById(id: number): Promise<ApiResponse<EnrichedFarm>> { // ID is number
    const farmResult = await this.dbService.fetch<DbFarmRow>('farms', '*' /* Select all columns */, { eq: { id: id }, single: true });
    if (!farmResult.success || !farmResult.data) return { success: false, error: farmResult.error || 'Farm not found' };

    // Fetch related agents using numeric farm ID
    const agentsResult = await this.dbService.fetch<Agent[]>('agents', '*' /* Select all columns */, { eq: { farm_id: id } });
    
    // Fetch related vault accounts using numeric farm ID
    let accounts: VaultAccountRow[] = [];
    let accountError: string | undefined;
    try {
        accounts = await this.bankingService.getAccountsByFarm(id);
    } catch (error: any) {
        accountError = `Failed to fetch accounts: ${error.message}`;
        console.error(accountError);
    }

    const appFarm = this.mapDbFarmRowToAppFarm(farmResult.data);
    if (!appFarm) return { success: false, error: 'Failed to map farm data' };

    // TODO: Optionally calculate aggregated balance/performance for the EnrichedFarm here if needed
    // Example: Calculate total balance from fetched accounts
    let totalBalance = 0;
    let currency = 'USD'; // Default or determine from accounts
    if (accounts.length > 0) {
        currency = accounts[0].currency || currency;
        totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    }

    const enrichedFarm: EnrichedFarm = {
      ...appFarm,
      // Assign aggregated balance if calculated
      balance: { total: totalBalance, available: totalBalance, locked: 0, currency: currency }, // Example structure
      agents: agentsResult.success ? agentsResult.data : [],
      vaults: accounts.map((acc): FarmVaultAccountSummary => ({ 
          id: acc.id,
          master_id: acc.master_id,
          name: acc.name,
          type: acc.type,
          farm_id: acc.farm_id,
          agent_id: acc.agent_id,
          is_active: acc.is_active,
          balance: acc.balance,
          locked_amount: acc.locked_amount,
          currency: acc.currency,
          created_at: acc.created_at,
          updated_at: acc.updated_at,
      })) 
    };

    const finalError = farmResult.error || accountError || agentsResult.error;

    return { data: enrichedFarm, success: !finalError, error: finalError };
  }

  /**
   * Create a new farm - uses 'config' column and dbService.create
   */
  async createFarm(params: CreateFarmParams): Promise<ApiResponse<Farm>> {
    // REMOVED ownerId logic

    // Map CreateFarmParams to DB Insert type
    const insertData: Database['public']['Tables']['farms']['Insert'] = {
        name: params.name,
        description: params.description,
        is_active: true,
        config: params.settings || {}, // Use config column
        // Default goal fields
        goal_name: null,
        goal_description: null,
        goal_target_assets: null,
        goal_target_amount: null,
        goal_current_progress: null,
        goal_status: 'inactive',
        goal_completion_action: null,
        goal_deadline: null,
        // performance_metrics and risk_profile defaults (consider adding if needed)
        performance_metrics: {},
        risk_profile: {},
        metadata: {}
    };

    // Use dbService.create instead of insert
    const result = await this.dbService.create<DbFarmRow>('farms', insertData, { single: true });
    
    return {
      success: result.success,
      // Pass result.data (which could be DbFarmRow | undefined) to mapper
      data: this.mapDbFarmRowToAppFarm(result.data),
      error: result.error
    };
  }

  /**
   * Update an existing farm - uses 'config' column
   */
  async updateFarm(id: number, params: Partial<Pick<Farm, 'name' | 'description' | 'settings' | 'status'>>): Promise<ApiResponse<Farm>> {
      const updateData: Partial<DbFarmRow> = {};
      if (params.name !== undefined) updateData.name = params.name;
      if (params.description !== undefined) updateData.description = params.description;
      if (params.settings !== undefined) updateData.config = params.settings; // Use config column
      if (params.status !== undefined) updateData.is_active = params.status === 'ACTIVE';

      const result = await this.dbService.update<DbFarmRow>('farms', updateData, { eq: { id: id } }, { single: true }); // Pass options object to update
       return {
           success: result.success,
           // Pass result.data (DbFarmRow | undefined) to mapper
           data: this.mapDbFarmRowToAppFarm(result.data),
           error: result.error
        };
  }

  /**
   * Delete a farm - uses dbService.remove
   */
  async deleteFarm(id: number): Promise<ApiResponse<boolean>> {
    try {
      console.log(`Attempting to delete farm with ID: ${id}`);
      
      // 1. Find associated agents using numeric farm ID
      const agentsResult = await this.dbService.fetch<DbAgentRow[]>('agents', 'id' /* Only need IDs */, { eq: { farm_id: id } });

      if (!agentsResult.success) {
        console.error(`Failed to fetch agents for farm ${id}:`, agentsResult.error);
        return { success: false, error: `Failed to fetch agents: ${agentsResult.error}` };
      }

      // 2. Delete associated agents if found - use dbService.remove
      if (agentsResult.data && agentsResult.data.length > 0) {
        const agentIds = agentsResult.data.map((agent: DbAgentRow) => agent.id);
        if (agentIds.length > 0) {
            // Use dbService.remove
            const deleteAgentsResult = await this.dbService.remove('agents', { id: agentIds }); // Pass conditions directly
             if (!deleteAgentsResult.success) {
               console.error(`Failed to delete agents for farm ${id}:`, deleteAgentsResult.error);
               return { success: false, error: `Failed to delete associated agents: ${deleteAgentsResult.error}` };
             } 
             console.log(`Successfully deleted ${agentIds.length} agents for farm ${id}.`);
        } 
      } else {
          console.log(`No agents found associated with farm ${id}.`);
      }
      
      // 3. Delete associated Vault Accounts using numeric farm ID
       console.log(`Attempting to delete associated vault accounts for farm ${id}...`);
       try {
           const accountsToDelete = await this.bankingService.getAccountsByFarm(id); // Pass number ID
           if (accountsToDelete.length > 0) {
               const accountIdsToDelete = accountsToDelete.map(acc => acc.id); // These are UUIDs
               console.log(`Found ${accountIdsToDelete.length} vault accounts to delete.`);
               for (const accountId of accountIdsToDelete) {
                   await this.bankingService.deleteAccount(accountId); 
                   console.log(`Deleted vault account ${accountId}`);
               }
                console.log(`Successfully deleted associated vault accounts for farm ${id}.`);
           } else {
                console.log(`No associated vault accounts found for farm ${id}.`);
           }
       } catch (accountDeleteError: any) {
            console.error(`Error deleting associated vault accounts for farm ${id}:`, accountDeleteError);
            return { success: false, error: `Failed to delete associated vault accounts: ${accountDeleteError.message}` };
       }

      // 4. Delete the farm itself - use dbService.remove
      console.log(`Proceeding to delete farm record ${id}...`);
      // Use dbService.remove
      const deleteFarmResult = await this.dbService.remove<DbFarmRow>('farms', { id: id }); // Pass conditions

      if (!deleteFarmResult.success) {
          console.error(`Failed to delete farm ${id}:`, deleteFarmResult.error);
          return { success: false, error: `Failed to delete farm: ${deleteFarmResult.error}` };
      }

      console.log(`Successfully deleted farm ${id}.`);
      return { success: true, data: true };

    } catch (error: any) {
        console.error(`Unexpected error during farm deletion for ID ${id}:`, error);
        return { success: false, error: `An unexpected error occurred: ${error.message}` };
    }
  }

  /**
   * Create a new agent for a farm - uses dbService.create
   */
  async createAgent(params: CreateAgentParams): Promise<ApiResponse<Agent>> {
    // Use numeric farm_id 
    const farmId = params.farm_id;

    // Map CreateAgentParams to DB Agent Insert type
     const insertData: Database['public']['Tables']['agents']['Insert'] = {
       farm_id: farmId, // Use number ID
       name: params.name, 
       capabilities: params.capabilities || [], 
       config: params.config || {}, // Map CreateAgentParams.config
       is_active: params.is_active, // Default added column
       // agent_type: params.agent_type, // REMOVED: Likely doesn't exist in DB
       // description: params.description, // Add if needed and present in agents Insert type
     };

    Object.keys(insertData).forEach(key => (insertData as any)[key] === undefined && delete (insertData as any)[key]);

    // Use dbService.create
    const result = await this.dbService.create<DbAgentRow>('agents', insertData, { single: true });

    // Updated mapper to return Agent | undefined
    const mapDbAgentToAppAgent = (dbAgent: DbAgentRow | null | undefined): Agent | undefined => { // Accept undefined, return undefined
        if (!dbAgent) return undefined; // Return undefined

        return {
            id: dbAgent.id,
            name: dbAgent.name,
            farm_id: dbAgent.farm_id,
            status: dbAgent.is_active ? 'active' : 'inactive',
            capabilities: dbAgent.capabilities,
            config: dbAgent.config as any,
            is_active: dbAgent.is_active,
            created_at: dbAgent.created_at,
            updated_at: dbAgent.updated_at,
        };
    };

    return {
        success: result.success,
        // Pass result.data (DbAgentRow | undefined) to mapper
        data: mapDbAgentToAppAgent(result.data),
        error: result.error
    };
  }

  /**
   * Create a new vault for a farm using the banking service.
   * Renamed from createWallet.
   */
  async createVaultForFarm(params: CreateVaultForFarmParams): Promise<ApiResponse<VaultAccountRow>> { 
    try {
      // Ensure farm_id is provided (number)
      if (params.farm_id === undefined || params.farm_id === null) { // Check for null/undefined
        return { success: false, error: 'Farm ID is required to create a vault account.' };
      }

      // Construct the data for the banking service
      const accountData: VaultAccountInsert = {
        master_id: params.master_id,
        name: params.name,
        type: params.type,
        farm_id: params.farm_id, // number (verified not null/undefined)
        agent_id: (params.agent_id !== undefined && params.agent_id !== null) ? params.agent_id : undefined, 
        currency: params.currency,
        address: params.address,
        balance: params.balance ?? 0,
        locked_amount: (params.locked_amount !== undefined && params.locked_amount !== null) ? params.locked_amount : undefined,
        is_active: (params.is_active !== undefined && params.is_active !== null) ? params.is_active : undefined,
        risk_level: params.risk_level,
        security_level: params.security_level,
        settings: params.settings,
    };
    
      const newAccount = await this.bankingService.createAccount(accountData);
        return { success: true, data: newAccount };
    } catch (error: any) {
        console.error('Error creating vault account via banking service:', error);
        return { success: false, error: `Failed to create vault account: ${error.message}` };
    }
  }

  // Helper to map source/destination based on transaction type
  private _getAccountMapping(params: RecordTransactionParams): { 
    source_id: string | null; // Explicitly allow null initially
    source_type: string | null; // Explicitly allow null initially
    destination_id: string | null; // Explicitly allow null initially
    destination_type: string | null; // Explicitly allow null initially
  } {
    const mapping: { 
        source_id: string | null;
        source_type: string | null;
        destination_id: string | null;
        destination_type: string | null;
    } = {
      source_id: null,
      source_type: null,
      destination_id: null,
      destination_type: null
    };
  
    switch(params.transaction_type) {
      case 'deposit':
        if (!params.source_account_id) throw new Error('source_account_id is required for deposit type');
        mapping.destination_id = params.source_account_id;
        mapping.destination_type = 'vault_account';
        mapping.source_id = params.external_id || 'external_deposit'; 
        mapping.source_type = 'external';
        break;
        
      case 'withdrawal':
        if (!params.destination_account_id) throw new Error('destination_account_id is required for withdrawal type');
        mapping.source_id = params.destination_account_id;
        mapping.source_type = 'vault_account';
        mapping.destination_id = params.external_id || 'external_withdrawal'; 
        mapping.destination_type = 'external';
        break;
        
      case 'transfer':
        if (!params.source_account_id || !params.destination_account_id) {
             throw new Error('source_account_id and destination_account_id are required for transfer type');
        }
        mapping.source_id = params.source_account_id;
        mapping.source_type = 'vault_account';
        mapping.destination_id = params.destination_account_id;
        mapping.destination_type = 'vault_account';
        break;
        
      case 'trade':
        console.warn('Trade transaction type mapping is not fully implemented in FarmService._getAccountMapping');
        mapping.source_id = params.source_account_id || params.destination_account_id || 'trade_source'; 
        mapping.source_type = 'vault_account'; 
        mapping.destination_id = params.destination_account_id || params.source_account_id || 'trade_dest';
        mapping.destination_type = 'vault_account'; 
        break;
        
      default:
          throw new Error(`Unsupported transaction_type for account mapping: ${params.transaction_type}`);
    }
  
    return mapping;
  }

  /**
   * Record a transaction log using the banking service, applying mapping logic.
   */
  async recordTransaction(params: RecordTransactionParams): Promise<ApiResponse<VaultTransactionRow>> { 
    try {
      if (!params.initiated_by || !params.initiated_by_type) {
          return { success: false, error: 'Missing required field: initiated_by and initiated_by_type.' };
      }

      const accountMapping = this._getAccountMapping(params);
      if (!accountMapping.source_id || !accountMapping.source_type || !accountMapping.destination_id || !accountMapping.destination_type) {
         return { success: false, error: 'Failed to determine source/destination mapping.' };
      }

      const reference = params.transaction_hash || params.external_id || `internal-${uuidv4()}`;

      const metadata: Json = {
        ...(params.metadata instanceof Object ? params.metadata : {}), // Ensure metadata is an object before spreading
        farm_id: params.farm_id, // number | undefined
        initiated_at: new Date().toISOString(),
        initiated_by_type: params.initiated_by_type, // Store initiator type
        // ... (original account IDs)
      };

      const transactionLogParams: CreateVaultTransactionLogParams = {
          type: params.transaction_type, 
          amount: params.amount,
          currency: params.currency, 
          source_id: accountMapping.source_id, 
          source_type: accountMapping.source_type, 
          destination_id: accountMapping.destination_id, 
          destination_type: accountMapping.destination_type, 
          initiated_by: params.initiated_by, // Use the initiator ID string
          status: params.status || TransactionStatus.PENDING, 
          description: params.description,
          metadata: metadata, 
          reference: reference, 
      };

      console.log('Calling bankingService.createTransaction with params:', JSON.stringify(transactionLogParams, null, 2));
      const transactionResult = await this.bankingService.createTransaction(transactionLogParams);
      return { success: true, data: transactionResult };

    } catch (error: any) {
      console.error('Error recording transaction in FarmService:', error);
      return { success: false, error: `Failed to record transaction: ${error.message}` };
    }
  }

  /**
   * Set or update the goal for a specific farm
   */
  async setFarmGoal(farmId: number, goalDetails: SetFarmGoalParams): Promise<ApiResponse<Farm>> {
      const updateData: Database['public']['Tables']['farms']['Update'] = {
        goal_name: goalDetails.goal_name,
        goal_description: goalDetails.goal_description,
        goal_target_assets: goalDetails.goal_target_assets,
        goal_target_amount: goalDetails.goal_target_amount,
        goal_completion_action: goalDetails.goal_completion_action as Json, // Cast goal action to Json
        goal_deadline: goalDetails.goal_deadline,
          goal_status: goalDetails.goal_status || 'active',
      };
      Object.keys(updateData).forEach(key => (updateData as any)[key] === undefined && delete (updateData as any)[key]);

      const result = await this.dbService.update<DbFarmRow>('farms', updateData, { id: farmId }, { single: true });

      if (result.success && result.data && result.data.goal_status === 'completed') {
          await this.executeCompletionActions(farmId, result.data);
      }

      return { 
          success: result.success,
          // Pass result.data (DbFarmRow | undefined) to mapper
          data: this.mapDbFarmRowToAppFarm(result.data),
          error: result.error
       };
  }

  /**
   * Handles actions defined in goal_completion_action when a goal is completed.
   */
    private async executeCompletionActions(farmId: number, farmData: DbFarmRow): Promise<void> {
        const completionAction = farmData.goal_completion_action as Farm['goal_completion_action'];
        if (!completionAction) return;
        console.log(`Executing completion actions for farm ${farmId}:`, JSON.stringify(completionAction));

        if (completionAction.transferToBank?.enabled) {
            const transferDetails = completionAction.transferToBank;
            console.log(`Goal completion action: Transfer funds requested. Details:`, transferDetails);

            if (transferDetails.percentage == null || transferDetails.percentage < 0 || transferDetails.percentage > 100 || !transferDetails.targetVaultId) {
                console.warn(`Invalid or missing parameters for TRANSFER_FUNDS action for farm ${farmId}. Required: percentage (0-100), targetVaultId. Details:`, transferDetails);
                return;
            }

            try {
                const assetSymbol = transferDetails.assetSymbol || farmData.goal_target_assets?.[0];
                if (!assetSymbol) {
                    console.warn(`Could not determine asset symbol for transfer in farm ${farmId}.`);
                    return;
                }

                // Find source vault account using numeric farm ID
                const sourceAccounts = await this.bankingService.getAccountsByFarm(farmId);
                const sourceAccount = sourceAccounts.find(acc => acc.is_active && acc.currency === assetSymbol) || sourceAccounts.find(acc => acc.is_active);

                if (!sourceAccount) {
                    console.error(`No suitable active source vault account found in farm ${farmId} for completion transfer of ${assetSymbol}.`);
                    return;
                }

                let actualSourceBalance: number;
                try {
                    // sourceAccount.id is uuid (string)
                    const sourceAccountDetails = await this.bankingService.getAccount(sourceAccount.id);
                    if (!sourceAccountDetails || sourceAccountDetails.balance == null) {
                         console.error(`Could not retrieve actual balance for source account ${sourceAccount.id}.`);
                         return;
                    }
                    actualSourceBalance = sourceAccountDetails.balance;
                } catch (balanceError: any) {
                    console.error(`Error fetching balance for source account ${sourceAccount.id}:`, balanceError);
                    return;
                }

                const transferAmount = (actualSourceBalance * transferDetails.percentage) / 100;
                if (transferAmount <= 0) {
                    console.warn(`Calculated transfer amount based on actual balance (${actualSourceBalance}) is zero or negative for ${assetSymbol} in farm ${farmId}. Skipping transfer.`);
                    return;
                }
                if (transferAmount > actualSourceBalance) {
                    console.warn(`Calculated transfer amount (${transferAmount}) exceeds available balance (${actualSourceBalance}) for ${assetSymbol} in farm ${farmId}. Adjusting transfer amount.`);
                    return; 
                }
                
                console.log(`Attempting goal completion transfer: ${transferAmount} ${assetSymbol} from account ${sourceAccount.id} (Balance: ${actualSourceBalance}) to ${transferDetails.targetVaultId}`);

                const transactionParams: CreateVaultTransactionLogParams = {
                    type: 'transfer',
                    amount: transferAmount,
                    currency: assetSymbol,
                    source_id: sourceAccount.id, // uuid (string)
                    source_type: 'vault_account', 
                    destination_id: transferDetails.targetVaultId, // uuid (string)
                    destination_type: 'vault_account',
                    initiated_by: `system:farm_${farmId}_goal_completion`, // System identifier
                    status: TransactionStatus.PENDING, 
                    description: `Goal completion transfer (${transferDetails.percentage}% of ${assetSymbol}) from farm ${farmId}`,
                    metadata: {
                        farm_id: farmId, // number
                        goal_name: farmData.goal_name || 'N/A',
                        source_account_id: sourceAccount.id,
                        target_account_id: transferDetails.targetVaultId,
                        transfer_percentage: transferDetails.percentage,
                        trigger: 'goal_completion'
                    },
                    reference: `goal_transfer_${farmId}_${uuidv4()}`
                };

                const transferResult = await this.bankingService.createTransaction(transactionParams);
                console.log(`Goal completion transfer transaction created successfully for farm ${farmId}. Transaction ID: ${transferResult.id}`);

            } catch (error: any) {
                console.error(`Error executing TRANSFER_FUNDS completion action for farm ${farmId}:`, error);
            }
        }

        if (completionAction.startNextGoal) {
             console.log(`Goal completion action: Start next goal requested for farm ${farmId}.`);
             try {
                 // Find the first inactive goal associated with *this farm* (or perhaps globally if needed?)
                 // This logic might need refinement based on how 'next goal' is defined.
                 // For now, let's assume we find another goal for the *same* farm if needed.
                 console.warn('START_NEXT_GOAL logic needs clarification. How is the \'next goal\' identified?');
                 /*
                 const nextGoalResult = await this.dbService.fetch<DbFarmRow[]>('farms', '*' , {
                     eq: {
                         // Maybe filter by name pattern, or a sequence field?
                         goal_status: 'inactive'
                     },
                     order: { column: 'created_at', ascending: true },
                     limit: 1
                 });
                 // ... if nextGoalResult.data[0], call setFarmGoal to activate it ...
                 */

             } catch(error: any) {
                 console.error(`Error executing START_NEXT_GOAL completion action for farm ${farmId}:`, error);
             }
        }
    }

    // --- Wallet Methods --- 
    // Helper to map DB row to App type
    private mapDbWalletRowToAppWallet(dbWallet: DbWalletRow | undefined | null): Wallet | undefined {
        if (!dbWallet) return undefined;
        return {
            id: dbWallet.id,
            name: dbWallet.name,
            balance: dbWallet.balance,
            currency: dbWallet.currency,
            is_active: dbWallet.is_active,
            metadata: dbWallet.metadata,
            owner_id: dbWallet.owner_id,
            owner_type: dbWallet.owner_type,
            created_at: dbWallet.created_at,
            updated_at: dbWallet.updated_at,
        };
    }

    /**
     * Create a new wallet
     */
    async createWallet(params: CreateWalletParams): Promise<ApiResponse<Wallet>> {
        const insertData: Database['public']['Tables']['wallets']['Insert'] = {
            name: params.name,
            currency: params.currency,
            owner_id: params.owner_id,
            owner_type: params.owner_type,
            balance: params.balance ?? 0,
            is_active: params.is_active ?? true,
            metadata: params.metadata ?? {},
        };

        const result = await this.dbService.create<DbWalletRow>('wallets', insertData, { single: true });

        return {
            success: result.success,
            data: this.mapDbWalletRowToAppWallet(result.data),
            error: result.error
        };
    }

    /**
     * Update a wallet
     */
    async updateWallet(walletId: number, params: Partial<CreateWalletParams>): Promise<ApiResponse<Wallet>> {
        const updateData: Database['public']['Tables']['wallets']['Update'] = {};
        if (params.name !== undefined) updateData.name = params.name;
        if (params.currency !== undefined) updateData.currency = params.currency;
        if (params.owner_id !== undefined) updateData.owner_id = params.owner_id;
        if (params.owner_type !== undefined) updateData.owner_type = params.owner_type;
        if (params.balance !== undefined) updateData.balance = params.balance;
        if (params.is_active !== undefined) updateData.is_active = params.is_active;
        if (params.metadata !== undefined) updateData.metadata = params.metadata;

        if (Object.keys(updateData).length === 0) {
            return { success: false, error: 'No update parameters provided.' };
        }

        const result = await this.dbService.update<DbWalletRow>('wallets', updateData, { eq: { id: walletId } }, { single: true });

        return {
            success: result.success,
            data: this.mapDbWalletRowToAppWallet(result.data),
            error: result.error
        };
    }

    /**
     * Delete a wallet
     */
    async deleteWallet(walletId: number): Promise<ApiResponse<boolean>> {
        // Consider adding logic here to check for balance or associated transactions before deletion?
        console.log(`Attempting to delete wallet with ID: ${walletId}`);

        const result = await this.dbService.remove<DbWalletRow>('wallets', { id: walletId });

        if (!result.success) {
            console.error(`Failed to delete wallet ${walletId}:`, result.error);
        }

        return {
            success: result.success,
            data: result.success, // Return true on successful deletion
            error: result.error
        };
    }
}

export const farmService = FarmService.getInstance();