import { apiClient } from './client';

// Strategy interfaces
export interface Strategy {
  id: string;
  name: string;
  type: string;
  description: string;
  status: 'active' | 'paused' | 'testing' | 'error';
  riskLevel: 'Low' | 'Medium' | 'High';
  parameters: Record<string, any>;
  tradingPairs: string[];
  performance: {
    totalReturns: number;
    successRate: number;
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
    winLossRatio: number;
  };
  createdAt: string;
  updatedAt: string;
  lastTested?: string;
  history?: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export interface CreateStrategyDto {
  name: string;
  type: string;
  description: string;
  riskLevel: Strategy['riskLevel'];
  parameters: Record<string, any>;
  tradingPairs: string[];
}

export interface UpdateStrategyDto {
  name?: string;
  description?: string;
  riskLevel?: Strategy['riskLevel'];
  parameters?: Record<string, any>;
  tradingPairs?: string[];
}

export interface StrategyPerformance {
  timeframe: string;
  data: Array<{
    timestamp: string;
    returns: number;
    drawdown: number;
    trades: number;
    winRate: number;
  }>;
}

export interface BacktestResult {
  strategyId: string;
  startDate: string;
  endDate: string;
  totalReturns: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  profitFactor: number;
  tradeCount: number;
  trades: Array<{
    timestamp: string;
    type: 'buy' | 'sell';
    price: number;
    size: number;
    pnl: number;
  }>;
}

// Strategy API class
export class StrategyApi {
  private static readonly BASE_PATH = '/strategies';

  // Get all strategies
  public static async getStrategies(params?: {
    status?: Strategy['status'];
    type?: string;
    riskLevel?: Strategy['riskLevel'];
  }): Promise<Strategy[]> {
    return apiClient.get(this.BASE_PATH, params);
  }

  // Get a single strategy by ID
  public static async getStrategy(id: string): Promise<Strategy> {
    return apiClient.get(`${this.BASE_PATH}/${id}`);
  }

  // Create a new strategy
  public static async createStrategy(data: CreateStrategyDto): Promise<Strategy> {
    return apiClient.post(this.BASE_PATH, data);
  }

  // Update a strategy
  public static async updateStrategy(
    id: string,
    data: UpdateStrategyDto
  ): Promise<Strategy> {
    return apiClient.patch(`${this.BASE_PATH}/${id}`, data);
  }

  // Delete a strategy
  public static async deleteStrategy(id: string): Promise<void> {
    return apiClient.delete(`${this.BASE_PATH}/${id}`);
  }

  // Get strategy performance history
  public static async getStrategyPerformance(
    id: string,
    params?: {
      timeframe?: '1d' | '7d' | '30d' | '90d' | '1y';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<StrategyPerformance> {
    return apiClient.get(`${this.BASE_PATH}/${id}/performance`, params);
  }

  // Run strategy backtest
  public static async runBacktest(
    id: string,
    params: {
      startDate: string;
      endDate: string;
      initialCapital?: number;
      tradingPairs?: string[];
    }
  ): Promise<BacktestResult> {
    return apiClient.post(`${this.BASE_PATH}/${id}/backtest`, params);
  }

  // Start strategy testing
  public static async startTesting(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/test/start`, {});
  }

  // Stop strategy testing
  public static async stopTesting(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/test/stop`, {});
  }

  // Activate strategy
  public static async activateStrategy(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/activate`, {});
  }

  // Pause strategy
  public static async pauseStrategy(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/pause`, {});
  }

  // Get strategy templates
  public static async getTemplates(): Promise<Array<Omit<Strategy, 'id'>>> {
    return apiClient.get(`${this.BASE_PATH}/templates`);
  }

  // Clone strategy
  public static async cloneStrategy(id: string, name: string): Promise<Strategy> {
    return apiClient.post(`${this.BASE_PATH}/${id}/clone`, { name });
  }
} 