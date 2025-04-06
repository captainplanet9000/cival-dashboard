import { SupabaseService, ApiResponse } from '../database/supabase-service';
// import { Database } from '@/types/database.types'; // Commented out until type generation is fixed
import { Farm as FarmType } from '@/types/farm'; // Import the updated Farm type
import { UnifiedBankingService } from '../unifiedBankingService'; // For goal completion actions
import { TransactionStatus } from '@/types/vault'; // Correct import path for TransactionStatus
import { createServerClient } from '@/utils/supabase/server';

// Farm type from database (might be slightly different from our updated FarmType)
// Use placeholder or existing types if Database type is unavailable
// export type DbFarm = Database['public']['Tables']['farms']['Row'];
// More specific placeholder for DbFarm
export type DbFarm = { 
  id: number | string; 
  name: string; 
  // Add other known non-goal fields if necessary
  goal_name?: string | null;
  goal_description?: string | null;
  goal_target_assets?: string[] | null;
  goal_target_amount?: number | null;
  goal_current_progress?: any | null; // Keep JSONB as any for now
  goal_status?: string | null;
  goal_completion_action?: any | null; // Keep JSONB as any for now
  goal_deadline?: string | null;
  [key: string]: any; // Allow other string keys
};

// Assuming these types are defined elsewhere or manually maintained for now
// export type FarmAgent = Database['public']['Tables']['agents']['Row'];
// export type Wallet = Database['public']['Tables']['wallets']['Row'];
// export type Transaction = Database['public']['Tables']['transactions']['Row'];

// TEMP: Define placeholder types if not available from database.types.ts
export type FarmAgent = { id: number | string; farm_id: number; name: string; [key: string]: any };
export type Wallet = { id: number | string; farm_id?: number; name: string; [key: string]: any };
export type Transaction = { id: number | string; wallet_id: number; farm_id?: number; [key: string]: any };

// Use the imported FarmType which includes goal fields
export type Farm = FarmType;

// Enriched Farm type with related data (using the updated Farm type)
export interface EnrichedFarm extends Farm {
  agents?: FarmAgent[];
  wallets?: Wallet[];
}

// Parameters for creating a farm (should align with DbFarm, excluding goal fields initially)
export interface CreateFarmParams {
  name: string;
  description?: string;
  user_id?: string; // Assuming user_id is managed or automatically set
  // Initial goal fields are not set on creation via this param type
}

// Parameters for setting/updating a farm goal
export interface SetFarmGoalParams {
  goal_name?: string | null;
  goal_description?: string | null;
  goal_target_assets?: string[] | null;
  goal_target_amount?: number | null;
  goal_completion_action?: Farm['goal_completion_action'];
  goal_deadline?: string | null;
  goal_status?: Farm['goal_status']; // Can be used to activate/set initial status
}

// Parameters for creating an agent
export interface CreateAgentParams {
  name: string;
  farm_id: number; // Assuming farm_id is numeric in 'agents' table based on context
  type: string; // e.g., 'ANALYST', 'TRADER', 'MONITOR'
  status?: string; // Default handled in service
  configuration?: Record<string, any>; // Initial configuration based on type
}

// Parameters for creating a wallet
export interface CreateWalletParams {
  name: string;
  address: string;
  farm_id?: number; // Assuming farm_id is numeric
  user_id?: string;
  balance?: number;
}

// Parameters for recording a transaction
export interface RecordTransactionParams {
  type: string;
  amount: number;
  wallet_id: number; // Assuming wallet_id is numeric
  farm_id?: number; // Assuming farm_id is numeric
  status?: string;
}

/**
 * Service for managing farms and related entities, including goals
 */
export class FarmService {
  private dbService = SupabaseService.getInstance();
  private bankingService = UnifiedBankingService.getInstance(); // Use singleton
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

  /**
   * Get all farms with optional filtering
   */
  async getFarms(userId?: string): Promise<ApiResponse<Farm[]>> {
    const conditions: Record<string, any> = {};
    
    if (userId) {
      conditions.user_id = userId;
    }
    
    // Fetch as DbFarm, map later if necessary, or ensure FarmType matches DbFarm Row structure
    const result = await this.dbService.fetch<DbFarm[]>('farms', '*', {
      eq: conditions,
      order: { column: 'created_at', ascending: false }
    });

    // Assuming FarmType is compatible with DbFarm Row type
    return result as ApiResponse<Farm[]>;
  }

  /**
   * Get a farm by ID with all related data
   */
  async getFarmById(id: number | string): Promise<ApiResponse<EnrichedFarm>> {
    // Use numeric ID for database operations if your ID is numeric
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numericId)) {
      return { success: false, error: 'Invalid Farm ID format' };
    }

    // First get the farm
    const farmResult = await this.dbService.fetch<DbFarm>('farms', '*', {
      eq: { id: numericId },
      single: true
    });

    if (!farmResult.success || !farmResult.data) {
      // Type cast error appropriately
      return farmResult as unknown as ApiResponse<EnrichedFarm>;
    }

    // Get related agents
    const agentsResult = await this.dbService.fetch<FarmAgent[]>('agents', '*', {
      eq: { farm_id: numericId } // Use numeric ID
    });

    // Get related wallets
    const walletsResult = await this.dbService.fetch<Wallet[]>('wallets', '*', {
      eq: { farm_id: numericId } // Use numeric ID
    });

    // Combine the data - Ensure FarmType matches DbFarm structure
    const enrichedFarm: EnrichedFarm = {
      ...(farmResult.data as unknown as Farm), // Cast or map DbFarm to FarmType
      agents: agentsResult.success ? agentsResult.data : [],
      wallets: walletsResult.success ? walletsResult.data : []
    };

    return {
      data: enrichedFarm,
      success: true
    };
  }

  /**
   * Create a new farm
   */
  async createFarm(params: CreateFarmParams): Promise<ApiResponse<Farm>> {
    // Create as DbFarm, map later if necessary
    const result = await this.dbService.create<DbFarm>('farms', params, { single: true });
    return result as ApiResponse<Farm>;
  }

  /**
   * Update an existing farm (can be used for simple field updates)
   * Use specific goal methods for goal-related updates.
   */
  async updateFarm(
    id: number | string, 
    params: Partial<Omit<Farm, 'id' | 'created_at' | 'updated_at'>> // Use Farm type, exclude goal fields handled separately
  ): Promise<ApiResponse<Farm>> {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
     if (isNaN(numericId)) {
      return { success: false, error: 'Invalid Farm ID format' };
    }
    // Exclude goal fields from generic update if managed by specific methods
    const { 
      goal_name, goal_description, goal_target_assets, goal_target_amount, 
      goal_current_progress, goal_status, goal_completion_action, goal_deadline,
      ...updateParams 
    } = params;

    const result = await this.dbService.update<DbFarm>('farms', updateParams, { id: numericId }, { single: true });
    return result as ApiResponse<Farm>;
  }

  /**
   * Delete a farm
   */
  async deleteFarm(id: number | string): Promise<ApiResponse<DbFarm>> { // Returns DbFarm as it's a deletion
     const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(numericId)) {
        return { success: false, error: 'Invalid Farm ID format' };
      }
    // Consider deleting related agents, wallets, transactions, goal progress? (cascade or manual cleanup)
    return this.dbService.remove<DbFarm>('farms', { id: numericId });
  }

  // --- Agent Management ---
  /**
   * Create a new agent for a farm
   */
  async createAgent(params: CreateAgentParams): Promise<ApiResponse<FarmAgent>> {
     if (isNaN(params.farm_id)) {
        return { success: false, error: 'Invalid Farm ID for agent creation' };
      }
    
     // Define default configuration based on type (optional)
     let defaultConfig = {};
     switch (params.type.toUpperCase()) {
        case 'TRADER':
            defaultConfig = { allowedStrategies: [], riskPerTrade: 0.01, maxConcurrentTrades: 1 };
            break;
        case 'ANALYST':
            defaultConfig = { dataSources: [], analysisIntervalMinutes: 60 };
            break;
        case 'MONITOR':
            defaultConfig = { alertThresholds: {}, notificationChannels: [] };
            break;
     }
     
     const agentData = {
      name: params.name,
      farm_id: params.farm_id,
      type: params.type,
      status: params.status || 'inactive', // Default status
      // Merge provided config with defaults, allowing override
      configuration: { ...defaultConfig, ...(params.configuration || {}) } 
    };

    return this.dbService.create<FarmAgent>('agents', agentData, { single: true });
  }

  /**
   * Update an existing agent
   */
  async updateAgent(
    id: number | string,
    params: Partial<CreateAgentParams>
  ): Promise<ApiResponse<FarmAgent>> {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
     if (isNaN(numericId)) {
       return { success: false, error: 'Invalid Agent ID format' };
     }
    return this.dbService.update<FarmAgent>('agents', params, { id: numericId }, { single: true });
  }

  /**
   * Delete an agent
   */
  async deleteAgent(id: number | string): Promise<ApiResponse<FarmAgent>> {
     const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(numericId)) {
        return { success: false, error: 'Invalid Agent ID format' };
      }
    return this.dbService.remove<FarmAgent>('agents', { id: numericId });
  }

  /**
   * Get agents for a farm
   */
  async getAgents(farmId: number | string): Promise<ApiResponse<FarmAgent[]>> {
    const numericId = typeof farmId === 'string' ? parseInt(farmId, 10) : farmId;
     if (isNaN(numericId)) {
        return { success: false, error: 'Invalid Farm ID format' };
      }
    return this.dbService.fetch<FarmAgent[]>('agents', '*', {
      eq: { farm_id: numericId }
    });
  }

  /**
   * Get agent by ID
   * @param agentId The ID of the agent to fetch
   * @returns Promise resolving with the agent data or error
   */
  async getAgentById(agentId: number | string): Promise<ApiResponse<FarmAgent>> {
    try {
      // If we're running on the client, use the browser client
      if (typeof window !== 'undefined') {
        const response = await fetch(`/api/agents/${agentId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch agent: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          return { success: false, error: data.error || 'Failed to fetch agent' };
        }
        
        return { success: true, data: data.data };
      } 
      
      // Otherwise, use the server client
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();
      
      if (error) {
        console.error('Error fetching agent:', error);
        return { success: false, error: error.message };
      }
      
      if (!data) {
        return { success: false, error: 'Agent not found' };
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error in getAgentById:', error);
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  }

  // --- Wallet Management ---
  /**
   * Create a new wallet
   */
  async createWallet(params: CreateWalletParams): Promise<ApiResponse<Wallet>> {
    // Validate numeric farm_id if provided
    if (params.farm_id !== undefined && isNaN(params.farm_id)) {
      return { success: false, error: 'Invalid Farm ID for wallet creation' };
    }
    return this.dbService.create<Wallet>('wallets', params, { single: true });
  }

  /**
   * Update an existing wallet
   */
  async updateWallet(
    id: number | string,
    params: Partial<CreateWalletParams>
  ): Promise<ApiResponse<Wallet>> {
     const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(numericId)) {
        return { success: false, error: 'Invalid Wallet ID format' };
      }
    return this.dbService.update<Wallet>('wallets', params, { id: numericId }, { single: true });
  }

  /**
   * Delete a wallet
   */
  async deleteWallet(id: number | string): Promise<ApiResponse<Wallet>> {
     const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(numericId)) {
        return { success: false, error: 'Invalid Wallet ID format' };
      }
    return this.dbService.remove<Wallet>('wallets', { id: numericId });
  }

  /**
   * Get wallets for a farm
   */
  async getWallets(farmId: number | string): Promise<ApiResponse<Wallet[]>> {
     const numericId = typeof farmId === 'string' ? parseInt(farmId, 10) : farmId;
      if (isNaN(numericId)) {
        return { success: false, error: 'Invalid Farm ID format' };
      }
    return this.dbService.fetch<Wallet[]>('wallets', '*', {
      eq: { farm_id: numericId }
    });
  }

  // --- Transaction Management ---
   /**
   * Record a transaction
   */
  async recordTransaction(params: RecordTransactionParams): Promise<ApiResponse<Transaction>> {
    // Validate numeric IDs
    if (isNaN(params.wallet_id) || (params.farm_id !== undefined && isNaN(params.farm_id))) {
       return { success: false, error: 'Invalid ID format for transaction' };
     }
    const transactionData = {
      type: params.type,
      amount: params.amount,
      wallet_id: params.wallet_id,
      farm_id: params.farm_id,
      status: params.status || 'completed'
    };

    return this.dbService.create<Transaction>('transactions', transactionData, { single: true });
  }

  /**
   * Get transactions for a wallet
   */
  async getWalletTransactions(walletId: number | string): Promise<ApiResponse<Transaction[]>> {
    const numericId = typeof walletId === 'string' ? parseInt(walletId, 10) : walletId;
     if (isNaN(numericId)) {
       return { success: false, error: 'Invalid Wallet ID format' };
     }
    return this.dbService.fetch<Transaction[]>('transactions', '*', {
      eq: { wallet_id: numericId },
      order: { column: 'created_at', ascending: false }
    });
  }

  /**
   * Get transactions for a farm
   */
  async getFarmTransactions(farmId: number | string): Promise<ApiResponse<Transaction[]>> {
     const numericId = typeof farmId === 'string' ? parseInt(farmId, 10) : farmId;
      if (isNaN(numericId)) {
        return { success: false, error: 'Invalid Farm ID format' };
      }
    return this.dbService.fetch<Transaction[]>('transactions', '*', {
      eq: { farm_id: numericId },
      order: { column: 'created_at', ascending: false }
    });
  }

  // --- Goal Management Methods ---

  /**
   * Set or update the goal for a specific farm.
   * This replaces the existing goal details for the farm.
   * @param farmId - The ID of the farm.
   * @param goalDetails - The details of the goal to set.
   */
  async setFarmGoal(farmId: number | string, goalDetails: SetFarmGoalParams): Promise<ApiResponse<Farm>> {
    const numericId = typeof farmId === 'string' ? parseInt(farmId, 10) : farmId;
    if (isNaN(numericId)) {
      return { success: false, error: 'Invalid Farm ID format' };
    }

    const updateData: Partial<DbFarm> = {
        goal_name: goalDetails.goal_name,
        goal_description: goalDetails.goal_description,
        goal_target_assets: goalDetails.goal_target_assets,
        goal_target_amount: goalDetails.goal_target_amount,
        goal_completion_action: goalDetails.goal_completion_action,
        goal_deadline: goalDetails.goal_deadline,
        // Reset progress when setting a new goal unless explicitly continued
        goal_current_progress: {}, // Or handle continuation logic if needed
        goal_status: goalDetails.goal_status || 'inactive', // Default to inactive unless specified
    };

    // Remove undefined keys to avoid overwriting with null in Supabase
    Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);


    const result = await this.dbService.update<DbFarm>('farms', updateData, { id: numericId }, { single: true });
    return result as ApiResponse<Farm>;
  }

  /**
   * Update the progress of a farm's goal for a specific asset.
   * @param farmId - The ID of the farm.
   * @param assetSymbol - The symbol of the asset (e.g., 'SUI').
   * @param amountChange - The change in amount (can be positive or negative).
   */
  async updateFarmGoalProgress(farmId: number | string, assetSymbol: string, amountChange: number): Promise<ApiResponse<Farm>> {
    const numericId = typeof farmId === 'string' ? parseInt(farmId, 10) : farmId;
    if (isNaN(numericId)) {
      return { success: false, error: 'Invalid Farm ID format' };
    }

    // Fetch the current farm data to get existing progress
    const farmResult = await this.dbService.fetch<DbFarm>('farms', 'goal_current_progress, goal_target_assets, goal_target_amount, goal_status', {
        eq: { id: numericId },
        single: true
    });

    if (!farmResult.success || !farmResult.data) {
        return { success: false, error: 'Farm not found or failed to fetch progress.' };
    }

    // Ensure goal is active before updating progress
    if (farmResult.data.goal_status !== 'active') {
        return { success: false, error: 'Goal must be active to update progress.' };
    }
    
    const currentProgress = (farmResult.data.goal_current_progress as Record<string, number>) || {};
    const newAmount = (currentProgress[assetSymbol] || 0) + amountChange;
    currentProgress[assetSymbol] = Math.max(0, newAmount); // Ensure progress doesn't go below zero

    const updateData = { goal_current_progress: currentProgress };

    const updateResult = await this.dbService.update<DbFarm>('farms', updateData, { id: numericId }, { single: true });

    // After updating progress, check if the goal is completed
    if (updateResult.success && updateResult.data) {
       const completed = this.checkGoalCompletion(updateResult.data as unknown as Farm);
        if (completed) {
            // Don't await completion here, let it run async or be triggered externally
            this.completeFarmGoal(numericId); 
        }
    }
    
    return updateResult as ApiResponse<Farm>;
  }

  /**
   * Checks if the farm's current goal is completed based on progress.
   * @param farm - The farm data including goal details.
   * @returns True if the goal is completed, false otherwise.
   */
   private checkGoalCompletion(farm: Farm): boolean {
       if (!farm.goal_status || farm.goal_status !== 'active' || !farm.goal_target_assets || !farm.goal_target_amount) {
           return false;
       }

       const progress = farm.goal_current_progress || {};
       
       // Check if *any* of the target assets have reached the target amount
       for (const asset of farm.goal_target_assets) {
           if ((progress[asset] || 0) >= farm.goal_target_amount) {
               return true;
           }
       }
       return false;
   }


  /**
   * Mark a farm's goal as completed and execute completion actions.
   * This should ideally be triggered after progress update confirms completion.
   * @param farmId - The ID of the farm.
   */
   async completeFarmGoal(farmId: number | string): Promise<ApiResponse<Farm>> {
        const numericId = typeof farmId === 'string' ? parseInt(farmId, 10) : farmId;
        if (isNaN(numericId)) {
            return { success: false, error: 'Invalid Farm ID format' };
        }

        // Fetch the farm to get completion actions
        const farmResult = await this.dbService.fetch<DbFarm>('farms', 'goal_completion_action, goal_status', {
            eq: { id: numericId },
            single: true
        });

        if (!farmResult.success || !farmResult.data) {
            return { success: false, error: 'Farm not found.' };
        }

        // Only proceed if the goal is currently active
        if(farmResult.data.goal_status !== 'active') {
             console.warn(`Attempted to complete goal for farm ${numericId}, but status was ${farmResult.data.goal_status}`);
             // Return current state without error, as completion might have already happened or goal is inactive
             return { success: true, data: farmResult.data as unknown as Farm };
        }


        // Update status to 'completed' first
        const statusUpdateResult = await this.dbService.update<DbFarm>(
            'farms',
            { goal_status: 'completed' },
            { id: numericId },
            { single: true }
        );

        if (!statusUpdateResult.success || !statusUpdateResult.data) {
            return { success: false, error: 'Failed to update goal status to completed.' };
        }
        
        const updatedFarmData = statusUpdateResult.data;

        // Execute completion actions (run asynchronously, don't block response)
        this.executeCompletionActions(numericId, updatedFarmData.goal_completion_action as Farm['goal_completion_action']);

        return { success: true, data: updatedFarmData as unknown as Farm };
    }

    /**
     * Executes the defined actions upon goal completion. Runs async.
     * @param farmId - Numeric farm ID.
     * @param completionAction - The completion action object.
     */
    private async executeCompletionActions(farmId: number, completionAction: Farm['goal_completion_action']): Promise<void> {
        if (!completionAction) return;

        try {
             if (completionAction.transferToBank) {
                console.log(`Executing bank transfer for completed goal on farm ${farmId}...`);
                
                // 1. Fetch farm details to determine which asset reached the goal
                const farmDetailsResp = await this.dbService.fetch<DbFarm>('farms', 'goal_target_assets, goal_target_amount, goal_current_progress', { eq: { id: farmId }, single: true });
                if (!farmDetailsResp.success || !farmDetailsResp.data) {
                    console.error(`Farm ${farmId} not found for completion action.`);
                    return;
                }
                const farmData = farmDetailsResp.data;
                const progress = farmData.goal_current_progress as Record<string, number> || {};
                const targetAmount = farmData.goal_target_amount;
                
                let completedAsset: string | null = null;
                if (farmData.goal_target_assets && targetAmount) {
                   for (const asset of farmData.goal_target_assets) {
                       if ((progress[asset] || 0) >= targetAmount) {
                           completedAsset = asset;
                           break;
                       }
                   }
                }
                
                if (!completedAsset) {
                    console.error(`Could not determine which asset completed the goal for farm ${farmId}.`);
                    // Fallback or default logic might be needed here
                    return; 
                }

                // 2. Get the farm's primary operational VaultAccount
                // Assuming the farm has one primary account for operations. Adapt if multiple.
                const farmAccountsResp = await this.bankingService.getAccountsByFarm(farmId.toString()); 
                if (!farmAccountsResp || farmAccountsResp.length === 0) { // Assuming getAccountsByFarm returns array directly or adjust based on actual return type
                     console.error(`No banking accounts found for farm ${farmId}. Cannot transfer.`);
                    return;
                }
                // Add logic here if multiple accounts exist (e.g., find by currency or type)
                const farmAccount = farmAccountsResp[0]; 

                // 3. Determine the Bank Account ID (needs configuration or a standard way to find it)
                const BANK_ACCOUNT_ID = process.env.BANK_ACCOUNT_ID;
                if (!BANK_ACCOUNT_ID) {
                     console.warn(`BANK_ACCOUNT_ID environment variable is not set. Skipping bank transfer for farm ${farmId}.`);
                     // Optionally, could fallback to a default or error out depending on requirements
                } else {
                    // Only proceed with transfer logic if BANK_ACCOUNT_ID is set
                    
                    // 4. Calculate transfer amount
                    const percentage = completionAction.percentage ?? 100; // Default to 100%
                    const totalGoalAmount = targetAmount; // Use the goal target amount
                    
                    if (totalGoalAmount === null || totalGoalAmount === undefined) {
                       console.error(`Target amount is not defined for farm ${farmId}. Cannot calculate transfer amount.`);
                       // Skip transfer if amount is invalid
                    } else {  
                        const transferAmount = totalGoalAmount * (percentage / 100);
    
                        // 5. Initiate transfer via bankingService
                        console.log(`Transferring ${transferAmount} ${completedAsset} from account ${farmAccount.id} to bank account ${BANK_ACCOUNT_ID}`);
                        
                        // TODO: Wallet Security - Ensure UnifiedBankingService handles signing securely
                        // TODO: Real DeFi Service - If this is an on-chain transfer, UnifiedBankingService.createTransaction needs integration
                        await this.bankingService.createTransaction({
                           sourceId: farmAccount.id,
                           sourceType: 'vault_account',
                           destinationId: BANK_ACCOUNT_ID,
                           destinationType: 'vault_account', 
                           amount: transferAmount,
                           currency: completedAsset,
                           type: 'GOAL_COMPLETION_TRANSFER', // Define this type if needed
                           description: `Transfer for completed goal from farm ${farmId}`,
                           status: TransactionStatus.COMPLETED // Assuming internal transfers are immediate; change if on-chain
                        });
        
                        console.log(`Bank transfer initiated successfully for farm ${farmId}.`);
                    }
                }
            }

            if (completionAction.startNextGoal) {
                 console.log(`Starting next goal action for farm ${farmId}...`);
                 // TODO: Implement Next Goal Logic
                 // 1. Need a way to define goal sequences (e.g., 'next_goal_id' field on farms table, or separate 'goal_sequences' table).
                 // 2. Fetch the ID of the next goal based on the completed farmId/goal.
                 // 3. If a next goal ID exists, call AgentCoordinationService.activateFarmGoalWorkflow(nextGoalId);
                 // Example: 
                 // const nextGoalId = await this.findNextGoalIdForFarm(farmId);
                 // if (nextGoalId) { 
                 //    console.log(`Activating next goal ${nextGoalId} for farm ${farmId}`);
                 //    agentCoordinationService.activateFarmGoalWorkflow(nextGoalId).catch(err => console.error('Failed to activate next goal', err));
                 // }
            }
        } catch (error) {
             console.error(`Error executing completion actions for farm ${farmId}:`, error);
             // TODO: Add more robust error handling/logging/retry logic if needed
        }
    }


   /**
    * Set the status of a farm's goal (e.g., 'active', 'paused').
    * @param farmId - The ID of the farm.
    * @param status - The new status to set.
    */
   async setFarmGoalStatus(farmId: number | string, status: Farm['goal_status']): Promise<ApiResponse<Farm>> {
       const numericId = typeof farmId === 'string' ? parseInt(farmId, 10) : farmId;
        if (isNaN(numericId)) {
            return { success: false, error: 'Invalid Farm ID format' };
        }

        // Validate status
        if (!status || !['inactive', 'active', 'paused', 'completed', 'failed'].includes(status)) {
            return { success: false, error: `Invalid goal status: ${status}` };
        }

       const result = await this.dbService.update<DbFarm>(
           'farms',
           { goal_status: status },
           { id: numericId },
           { single: true }
       );
       return result as ApiResponse<Farm>;
   }
   
   async activateFarmGoal(farmId: number | string): Promise<ApiResponse<Farm>> {
       return this.setFarmGoalStatus(farmId, 'active');
   }

   async pauseFarmGoal(farmId: number | string): Promise<ApiResponse<Farm>> {
        return this.setFarmGoalStatus(farmId, 'paused');
   }
   
   async failFarmGoal(farmId: number | string): Promise<ApiResponse<Farm>> {
        return this.setFarmGoalStatus(farmId, 'failed');
   }


  // --- Subscriptions ---
  /**
   * Subscribe to farm changes
   */
  subscribeFarms(callback: (payload: any) => void): () => void {
    return this.dbService.subscribe('farms', callback);
  }

  /**
   * Subscribe to agent changes
   */
  subscribeAgents(callback: (payload: any) => void): () => void {
    return this.dbService.subscribe('agents', callback);
  }

  /**
   * Subscribe to wallet changes
   */
  subscribeWallets(callback: (payload: any) => void): () => void {
    return this.dbService.subscribe('wallets', callback);
  }

  /**
   * Subscribe to transaction changes
   */
  subscribeTransactions(callback: (payload: any) => void): () => void {
    return this.dbService.subscribe('transactions', callback);
  }
}

// Export singleton instance
export const farmService = FarmService.getInstance();