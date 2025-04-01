import { SupabaseService, ApiResponse } from '../database/supabase-service';
import { Database } from '@/types/database.types';

// Farm type from database
export type Farm = Database['public']['Tables']['farms']['Row'];
export type FarmAgent = Database['public']['Tables']['agents']['Row'];
export type Wallet = Database['public']['Tables']['wallets']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];

// Enriched Farm type with related data
export interface EnrichedFarm extends Farm {
  agents?: FarmAgent[];
  wallets?: Wallet[];
}

// Parameters for creating a farm
export interface CreateFarmParams {
  name: string;
  description?: string;
  user_id?: string;
}

// Parameters for creating an agent
export interface CreateAgentParams {
  name: string;
  farm_id: number;
  type: string;
  status?: string;
  configuration?: Record<string, any>;
}

// Parameters for creating a wallet
export interface CreateWalletParams {
  name: string;
  address: string;
  farm_id?: number;
  user_id?: string;
  balance?: number;
}

// Parameters for recording a transaction
export interface RecordTransactionParams {
  type: string;
  amount: number;
  wallet_id: number;
  farm_id?: number;
  status?: string;
}

/**
 * Service for managing farms and related entities
 */
export class FarmService {
  private dbService = SupabaseService.getInstance();
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
    
    return this.dbService.fetch<Farm[]>('farms', '*', {
      eq: conditions,
      order: { column: 'created_at', ascending: false }
    });
  }

  /**
   * Get a farm by ID with all related data
   */
  async getFarmById(id: number | string): Promise<ApiResponse<EnrichedFarm>> {
    // First get the farm
    const farmResult = await this.dbService.fetch<Farm>('farms', '*', {
      eq: { id },
      single: true
    });

    if (!farmResult.success || !farmResult.data) {
      return farmResult as ApiResponse<EnrichedFarm>;
    }

    // Get related agents
    const agentsResult = await this.dbService.fetch<FarmAgent[]>('agents', '*', {
      eq: { farm_id: id }
    });

    // Get related wallets
    const walletsResult = await this.dbService.fetch<Wallet[]>('wallets', '*', {
      eq: { farm_id: id }
    });

    // Combine the data
    const enrichedFarm: EnrichedFarm = {
      ...farmResult.data,
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
    return this.dbService.create<Farm>('farms', params, { single: true });
  }

  /**
   * Update an existing farm
   */
  async updateFarm(
    id: number | string, 
    params: Partial<CreateFarmParams>
  ): Promise<ApiResponse<Farm>> {
    return this.dbService.update<Farm>('farms', params, { id }, { single: true });
  }

  /**
   * Delete a farm
   */
  async deleteFarm(id: number | string): Promise<ApiResponse<Farm>> {
    return this.dbService.remove<Farm>('farms', { id });
  }

  /**
   * Create a new agent for a farm
   */
  async createAgent(params: CreateAgentParams): Promise<ApiResponse<FarmAgent>> {
    const agentData = {
      name: params.name,
      farm_id: params.farm_id,
      type: params.type,
      status: params.status || 'inactive',
      configuration: params.configuration || {}
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
    return this.dbService.update<FarmAgent>('agents', params, { id }, { single: true });
  }

  /**
   * Delete an agent
   */
  async deleteAgent(id: number | string): Promise<ApiResponse<FarmAgent>> {
    return this.dbService.remove<FarmAgent>('agents', { id });
  }

  /**
   * Get agents for a farm
   */
  async getAgents(farmId: number | string): Promise<ApiResponse<FarmAgent[]>> {
    return this.dbService.fetch<FarmAgent[]>('agents', '*', {
      eq: { farm_id: farmId }
    });
  }

  /**
   * Create a new wallet
   */
  async createWallet(params: CreateWalletParams): Promise<ApiResponse<Wallet>> {
    return this.dbService.create<Wallet>('wallets', params, { single: true });
  }

  /**
   * Update an existing wallet
   */
  async updateWallet(
    id: number | string,
    params: Partial<CreateWalletParams>
  ): Promise<ApiResponse<Wallet>> {
    return this.dbService.update<Wallet>('wallets', params, { id }, { single: true });
  }

  /**
   * Delete a wallet
   */
  async deleteWallet(id: number | string): Promise<ApiResponse<Wallet>> {
    return this.dbService.remove<Wallet>('wallets', { id });
  }

  /**
   * Get wallets for a farm
   */
  async getWallets(farmId: number | string): Promise<ApiResponse<Wallet[]>> {
    return this.dbService.fetch<Wallet[]>('wallets', '*', {
      eq: { farm_id: farmId }
    });
  }

  /**
   * Record a transaction
   */
  async recordTransaction(params: RecordTransactionParams): Promise<ApiResponse<Transaction>> {
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
    return this.dbService.fetch<Transaction[]>('transactions', '*', {
      eq: { wallet_id: walletId },
      order: { column: 'created_at', ascending: false }
    });
  }

  /**
   * Get transactions for a farm
   */
  async getFarmTransactions(farmId: number | string): Promise<ApiResponse<Transaction[]>> {
    return this.dbService.fetch<Transaction[]>('transactions', '*', {
      eq: { farm_id: farmId },
      order: { column: 'created_at', ascending: false }
    });
  }

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