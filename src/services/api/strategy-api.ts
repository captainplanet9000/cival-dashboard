import { apiService, ApiResponse } from './api-service';
import type { 
  Strategy,
  StrategyVersion, 
  StrategyBacktest,
  CreateStrategyParams,
  UpdateStrategyParams,
  CreateVersionParams,
  DeployStrategyToAgentParams,
  AssignStrategyToFarmParams,
  RunBacktestParams
} from '../strategies';

/**
 * Strategy API Service
 * Handles all communication with the backend API for strategies
 */
export class StrategyApiService {
  private static instance: StrategyApiService;
  private baseEndpoint = '/strategies';

  private constructor() {}

  public static getInstance(): StrategyApiService {
    if (!StrategyApiService.instance) {
      StrategyApiService.instance = new StrategyApiService();
    }
    return StrategyApiService.instance;
  }

  /**
   * Get all strategies with optional filtering
   */
  async getStrategies(limit = 10, offset = 0, filter?: Partial<Strategy>): Promise<ApiResponse<Strategy[]>> {
    const params = { limit, offset, ...filter };
    return apiService.get<Strategy[]>(this.baseEndpoint, params);
  }

  /**
   * Get a strategy by ID
   */
  async getStrategyById(id: string): Promise<ApiResponse<Strategy>> {
    return apiService.get<Strategy>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Create a new strategy
   */
  async createStrategy(params: CreateStrategyParams): Promise<ApiResponse<Strategy>> {
    return apiService.post<Strategy>(this.baseEndpoint, params);
  }

  /**
   * Update a strategy
   */
  async updateStrategy(id: string, params: UpdateStrategyParams): Promise<ApiResponse<Strategy>> {
    return apiService.put<Strategy>(`${this.baseEndpoint}/${id}`, params);
  }

  /**
   * Delete a strategy
   */
  async deleteStrategy(id: string): Promise<ApiResponse<boolean>> {
    return apiService.delete<boolean>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Activate a strategy
   */
  async activateStrategy(id: string): Promise<ApiResponse<Strategy>> {
    return apiService.post<Strategy>(`${this.baseEndpoint}/${id}/activate`);
  }

  /**
   * Pause a strategy
   */
  async pauseStrategy(id: string): Promise<ApiResponse<Strategy>> {
    return apiService.post<Strategy>(`${this.baseEndpoint}/${id}/pause`);
  }

  /**
   * Archive a strategy
   */
  async archiveStrategy(id: string): Promise<ApiResponse<Strategy>> {
    return apiService.post<Strategy>(`${this.baseEndpoint}/${id}/archive`);
  }

  /**
   * Clone a strategy
   */
  async cloneStrategy(id: string, newName: string): Promise<ApiResponse<Strategy>> {
    return apiService.post<Strategy>(`${this.baseEndpoint}/${id}/clone`, { newName });
  }

  /**
   * Get strategy versions
   */
  async getVersions(strategyId: string): Promise<ApiResponse<StrategyVersion[]>> {
    return apiService.get<StrategyVersion[]>(`${this.baseEndpoint}/${strategyId}/versions`);
  }

  /**
   * Get specific version
   */
  async getVersion(strategyId: string, version: string): Promise<ApiResponse<StrategyVersion>> {
    return apiService.get<StrategyVersion>(`${this.baseEndpoint}/${strategyId}/versions/${version}`);
  }

  /**
   * Create a new version
   */
  async createVersion(params: CreateVersionParams): Promise<ApiResponse<StrategyVersion>> {
    return apiService.post<StrategyVersion>(`${this.baseEndpoint}/${params.strategy_id}/versions`, params);
  }

  /**
   * Deploy a strategy to an agent
   */
  async deployToAgent(params: DeployStrategyToAgentParams): Promise<ApiResponse<string>> {
    return apiService.post<string>(`${this.baseEndpoint}/${params.strategy_id}/deployments/agent`, params);
  }

  /**
   * Assign a strategy to a farm
   */
  async assignToFarm(params: AssignStrategyToFarmParams): Promise<ApiResponse<any>> {
    return apiService.post<any>(`${this.baseEndpoint}/${params.strategy_id}/deployments/farm`, params);
  }

  /**
   * Get strategies for a farm
   */
  async getFarmStrategies(farmId: string): Promise<ApiResponse<any[]>> {
    return apiService.get<any[]>(`/farms/${farmId}/strategies`);
  }

  /**
   * Get strategies for an agent
   */
  async getAgentStrategies(agentId: string): Promise<ApiResponse<any[]>> {
    return apiService.get<any[]>(`/agents/${agentId}/strategies`);
  }

  /**
   * Run backtest for a strategy
   */
  async runBacktest(params: RunBacktestParams): Promise<ApiResponse<StrategyBacktest>> {
    return apiService.post<StrategyBacktest>(`${this.baseEndpoint}/${params.strategy_id}/backtests`, params);
  }

  /**
   * Get backtest results for a strategy
   */
  async getBacktestResults(strategyId: string, limit = 10): Promise<ApiResponse<StrategyBacktest[]>> {
    return apiService.get<StrategyBacktest[]>(`${this.baseEndpoint}/${strategyId}/backtests`, { limit });
  }

  /**
   * Search strategies by name or tag
   */
  async searchStrategies(query: string, limit = 10): Promise<ApiResponse<Strategy[]>> {
    return apiService.get<Strategy[]>(`${this.baseEndpoint}/search`, { query, limit });
  }

  /**
   * Get strategy performance metrics
   */
  async getStrategyPerformance(limit = 10): Promise<ApiResponse<any[]>> {
    return apiService.get<any[]>(`${this.baseEndpoint}/performance`, { limit });
  }
}

// Export singleton instance
export const strategyApiService = StrategyApiService.getInstance(); 