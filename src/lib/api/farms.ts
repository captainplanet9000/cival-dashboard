import { apiClient } from './client';
import type { Strategy } from './strategies';

// Farm interfaces
export interface Farm {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'error';
  strategies: Array<{
    strategyId: string;
    strategy: Strategy;
    allocation: number;
    status: 'active' | 'paused';
    performance: {
      returns: number;
      drawdown: number;
    };
  }>;
  performance: {
    totalReturns: number;
    currentDrawdown: number;
    maxDrawdown: number;
    sharpeRatio: number;
    volatility: number;
  };
  settings: {
    rebalanceInterval: '1d' | '7d' | '30d';
    rebalanceThreshold: number;
    maxDrawdown: number;
    maxAllocationPerStrategy: number;
  };
  createdAt: string;
  updatedAt: string;
  lastRebalanced?: string;
}

export interface CreateFarmDto {
  name: string;
  description: string;
  strategies: Array<{
    strategyId: string;
    allocation: number;
  }>;
  settings: {
    rebalanceInterval: Farm['settings']['rebalanceInterval'];
    rebalanceThreshold: number;
    maxDrawdown: number;
    maxAllocationPerStrategy: number;
  };
}

export interface UpdateFarmDto {
  name?: string;
  description?: string;
  strategies?: Array<{
    strategyId: string;
    allocation: number;
  }>;
  settings?: Partial<Farm['settings']>;
}

export interface FarmPerformance {
  timeframe: string;
  data: Array<{
    timestamp: string;
    returns: number;
    drawdown: number;
    allocations: Record<string, number>;
  }>;
}

export interface FarmMetrics {
  totalReturns: number;
  dailyReturns: number;
  weeklyReturns: number;
  monthlyReturns: number;
  totalTrades: number;
  successRate: number;
  activeAgents: number;
  totalAgents: number;
  activeStrategies: number;
  totalStrategies: number;
  averageAgentPerformance: number;
  riskScore: number;
}

// Farm API class
export class FarmApi {
  private static readonly BASE_PATH = '/farms';

  // Get all farms
  public static async getFarms(params?: {
    status?: Farm['status'];
  }): Promise<Farm[]> {
    return apiClient.get(this.BASE_PATH, params);
  }

  // Get a single farm by ID
  public static async getFarm(id: string): Promise<Farm> {
    return apiClient.get(`${this.BASE_PATH}/${id}`);
  }

  // Create a new farm
  public static async createFarm(data: CreateFarmDto): Promise<Farm> {
    return apiClient.post(this.BASE_PATH, data);
  }

  // Update a farm
  public static async updateFarm(id: string, data: UpdateFarmDto): Promise<Farm> {
    return apiClient.patch(`${this.BASE_PATH}/${id}`, data);
  }

  // Delete a farm
  public static async deleteFarm(id: string): Promise<void> {
    return apiClient.delete(`${this.BASE_PATH}/${id}`);
  }

  // Get farm performance history
  public static async getFarmPerformance(
    id: string,
    params?: {
      timeframe?: '1d' | '7d' | '30d' | '90d' | '1y';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<FarmPerformance> {
    return apiClient.get(`${this.BASE_PATH}/${id}/performance`, params);
  }

  // Get farm metrics
  public static async getFarmMetrics(id: string): Promise<ApiResponse<FarmMetrics>> {
    return apiClient.get<FarmMetrics>(`${this.BASE_PATH}/${id}/metrics`);
  }

  // Start a farm
  public static async activateFarm(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/activate`, {});
  }

  // Pause a farm
  public static async pauseFarm(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/pause`, {});
  }

  // Rebalance a farm
  public static async rebalanceFarm(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/rebalance`, {});
  }

  // Activate a strategy
  public static async activateStrategy(
    farmId: string,
    strategyId: string
  ): Promise<void> {
    return apiClient.post(
      `${this.BASE_PATH}/${farmId}/strategies/${strategyId}/activate`,
      {}
    );
  }

  // Pause a strategy
  public static async pauseStrategy(
    farmId: string,
    strategyId: string
  ): Promise<void> {
    return apiClient.post(
      `${this.BASE_PATH}/${farmId}/strategies/${strategyId}/pause`,
      {}
    );
  }

  // Update a strategy allocation
  public static async updateStrategyAllocation(
    farmId: string,
    strategyId: string,
    allocation: number
  ): Promise<void> {
    return apiClient.patch(
      `${this.BASE_PATH}/${farmId}/strategies/${strategyId}`,
      { allocation }
    );
  }
} 