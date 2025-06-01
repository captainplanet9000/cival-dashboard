import { apiService, ApiResponse } from './api-service';
import type { 
  Farm,
  FarmAgent,
  Wallet,
  Transaction,
  EnrichedFarm,
  CreateFarmParams,
  CreateAgentParams,
  CreateWalletParams,
  RecordTransactionParams
} from '../farm/farm-service';

/**
 * Farm API Service
 * Handles all communication with the backend API for farms
 */
export class FarmApiService {
  private static instance: FarmApiService;
  private baseEndpoint = '/farms';

  private constructor() {}

  public static getInstance(): FarmApiService {
    if (!FarmApiService.instance) {
      FarmApiService.instance = new FarmApiService();
    }
    return FarmApiService.instance;
  }

  /**
   * Get all farms with optional filtering
   */
  async getFarms(userId?: string): Promise<ApiResponse<Farm[]>> {
    const params = userId ? { user_id: userId } : undefined;
    return apiService.get<Farm[]>(this.baseEndpoint, params);
  }

  /**
   * Get a farm by ID with all related data
   */
  async getFarmById(id: number | string): Promise<ApiResponse<EnrichedFarm>> {
    return apiService.get<EnrichedFarm>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Create a new farm
   */
  async createFarm(params: CreateFarmParams): Promise<ApiResponse<Farm>> {
    return apiService.post<Farm>(this.baseEndpoint, params);
  }

  /**
   * Update an existing farm
   */
  async updateFarm(
    id: number | string, 
    params: Partial<CreateFarmParams>
  ): Promise<ApiResponse<Farm>> {
    return apiService.put<Farm>(`${this.baseEndpoint}/${id}`, params);
  }

  /**
   * Delete a farm
   */
  async deleteFarm(id: number | string): Promise<ApiResponse<boolean>> {
    return apiService.delete<boolean>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Create a new agent for a farm
   */
  async createAgent(params: CreateAgentParams): Promise<ApiResponse<FarmAgent>> {
    return apiService.post<FarmAgent>(`${this.baseEndpoint}/${params.farm_id}/agents`, params);
  }

  /**
   * Update an existing agent
   */
  async updateAgent(
    id: number | string,
    params: Partial<CreateAgentParams>
  ): Promise<ApiResponse<FarmAgent>> {
    return apiService.put<FarmAgent>(`/agents/${id}`, params);
  }

  /**
   * Delete an agent
   */
  async deleteAgent(id: number | string): Promise<ApiResponse<boolean>> {
    return apiService.delete<boolean>(`/agents/${id}`);
  }

  /**
   * Get agents for a farm
   */
  async getAgents(farmId: number | string): Promise<ApiResponse<FarmAgent[]>> {
    return apiService.get<FarmAgent[]>(`${this.baseEndpoint}/${farmId}/agents`);
  }

  /**
   * Create a new wallet
   */
  async createWallet(params: CreateWalletParams): Promise<ApiResponse<Wallet>> {
    const endpoint = params.farm_id 
      ? `${this.baseEndpoint}/${params.farm_id}/wallets` 
      : '/wallets';
    
    return apiService.post<Wallet>(endpoint, params);
  }

  /**
   * Update an existing wallet
   */
  async updateWallet(
    id: number | string,
    params: Partial<CreateWalletParams>
  ): Promise<ApiResponse<Wallet>> {
    return apiService.put<Wallet>(`/wallets/${id}`, params);
  }

  /**
   * Delete a wallet
   */
  async deleteWallet(id: number | string): Promise<ApiResponse<boolean>> {
    return apiService.delete<boolean>(`/wallets/${id}`);
  }

  /**
   * Get wallets for a farm
   */
  async getWallets(farmId: number | string): Promise<ApiResponse<Wallet[]>> {
    return apiService.get<Wallet[]>(`${this.baseEndpoint}/${farmId}/wallets`);
  }

  /**
   * Record a transaction
   */
  async recordTransaction(params: RecordTransactionParams): Promise<ApiResponse<Transaction>> {
    const endpoint = params.farm_id 
      ? `${this.baseEndpoint}/${params.farm_id}/transactions` 
      : `/wallets/${params.wallet_id}/transactions`;
    
    return apiService.post<Transaction>(endpoint, params);
  }

  /**
   * Get transactions for a wallet
   */
  async getWalletTransactions(walletId: number | string): Promise<ApiResponse<Transaction[]>> {
    return apiService.get<Transaction[]>(`/wallets/${walletId}/transactions`);
  }

  /**
   * Get transactions for a farm
   */
  async getFarmTransactions(farmId: number | string): Promise<ApiResponse<Transaction[]>> {
    return apiService.get<Transaction[]>(`${this.baseEndpoint}/${farmId}/transactions`);
  }

  /**
   * Get farm performance metrics
   */
  async getFarmPerformance(farmId: number | string): Promise<ApiResponse<any>> {
    return apiService.get<any>(`${this.baseEndpoint}/${farmId}/performance`);
  }

  /**
   * Start a farm
   */
  async startFarm(farmId: number | string): Promise<ApiResponse<Farm>> {
    return apiService.post<Farm>(`${this.baseEndpoint}/${farmId}/start`);
  }

  /**
   * Stop a farm
   */
  async stopFarm(farmId: number | string): Promise<ApiResponse<Farm>> {
    return apiService.post<Farm>(`${this.baseEndpoint}/${farmId}/stop`);
  }

  /**
   * Restart a farm
   */
  async restartFarm(farmId: number | string): Promise<ApiResponse<Farm>> {
    return apiService.post<Farm>(`${this.baseEndpoint}/${farmId}/restart`);
  }
}

// Export singleton instance
export const farmApiService = FarmApiService.getInstance(); 