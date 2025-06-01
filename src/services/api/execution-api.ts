import { apiService, ApiResponse } from './api-service';

// Execution types
export interface Execution {
  id: string;
  strategy_id: string;
  farm_id: string;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  entry_price: number | null;
  exit_price: number | null;
  entry_time: string | null;
  exit_time: string | null;
  market: string;
  direction: 'long' | 'short';
  position_size: number;
  profit_loss: number | null;
  profit_loss_percent: number | null;
  notes: string | null;
  metadata: Record<string, any> | null;
}

export interface ExecutionLog {
  id: string;
  execution_id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  data: Record<string, any> | null;
}

export interface CreateExecutionParams {
  strategy_id: string;
  farm_id: string;
  agent_id?: string;
  market: string;
  direction: 'long' | 'short';
  position_size: number;
  entry_price?: number;
  entry_time?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateExecutionParams {
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  entry_price?: number;
  exit_price?: number;
  entry_time?: string;
  exit_time?: string;
  position_size?: number;
  profit_loss?: number;
  profit_loss_percent?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CreateLogParams {
  execution_id: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  data?: Record<string, any>;
}

export interface ExecutionStats {
  total_count: number;
  successful_count: number;
  failed_count: number;
  win_rate: number;
  average_profit: number;
  average_loss: number;
  profit_factor: number;
  total_profit_loss: number;
}

/**
 * Execution API Service
 * Handles all communication with the backend API for trade executions
 */
export class ExecutionApiService {
  private static instance: ExecutionApiService;
  private baseEndpoint = '/executions';

  private constructor() {}

  public static getInstance(): ExecutionApiService {
    if (!ExecutionApiService.instance) {
      ExecutionApiService.instance = new ExecutionApiService();
    }
    return ExecutionApiService.instance;
  }

  /**
   * Get all executions with optional filtering
   */
  async getExecutions(
    params?: {
      strategy_id?: string;
      farm_id?: string;
      agent_id?: string;
      status?: string;
      limit?: number;
      offset?: number;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<ApiResponse<Execution[]>> {
    return apiService.get<Execution[]>(this.baseEndpoint, params);
  }

  /**
   * Get an execution by ID
   */
  async getExecutionById(id: string): Promise<ApiResponse<Execution>> {
    return apiService.get<Execution>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Create a new execution
   */
  async createExecution(params: CreateExecutionParams): Promise<ApiResponse<Execution>> {
    return apiService.post<Execution>(this.baseEndpoint, params);
  }

  /**
   * Update an execution
   */
  async updateExecution(id: string, params: UpdateExecutionParams): Promise<ApiResponse<Execution>> {
    return apiService.put<Execution>(`${this.baseEndpoint}/${id}`, params);
  }

  /**
   * Complete an execution
   */
  async completeExecution(
    id: string, 
    exitPrice: number, 
    exitTime: string
  ): Promise<ApiResponse<Execution>> {
    return apiService.post<Execution>(`${this.baseEndpoint}/${id}/complete`, {
      exit_price: exitPrice,
      exit_time: exitTime
    });
  }

  /**
   * Cancel an execution
   */
  async cancelExecution(id: string, reason: string): Promise<ApiResponse<Execution>> {
    return apiService.post<Execution>(`${this.baseEndpoint}/${id}/cancel`, { reason });
  }

  /**
   * Get execution logs
   */
  async getExecutionLogs(
    executionId: string,
    params?: {
      level?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ApiResponse<ExecutionLog[]>> {
    return apiService.get<ExecutionLog[]>(`${this.baseEndpoint}/${executionId}/logs`, params);
  }

  /**
   * Add a log entry to an execution
   */
  async addExecutionLog(params: CreateLogParams): Promise<ApiResponse<ExecutionLog>> {
    return apiService.post<ExecutionLog>(`${this.baseEndpoint}/${params.execution_id}/logs`, params);
  }

  /**
   * Get executions for a strategy
   */
  async getStrategyExecutions(
    strategyId: string,
    params?: {
      status?: string;
      limit?: number;
      offset?: number;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<ApiResponse<Execution[]>> {
    return apiService.get<Execution[]>(`/strategies/${strategyId}/executions`, params);
  }

  /**
   * Get executions for a farm
   */
  async getFarmExecutions(
    farmId: string,
    params?: {
      status?: string;
      limit?: number;
      offset?: number;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<ApiResponse<Execution[]>> {
    return apiService.get<Execution[]>(`/farms/${farmId}/executions`, params);
  }

  /**
   * Get executions for an agent
   */
  async getAgentExecutions(
    agentId: string,
    params?: {
      status?: string;
      limit?: number;
      offset?: number;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<ApiResponse<Execution[]>> {
    return apiService.get<Execution[]>(`/agents/${agentId}/executions`, params);
  }

  /**
   * Get execution statistics for a strategy
   */
  async getStrategyExecutionStats(
    strategyId: string,
    params?: {
      start_date?: string;
      end_date?: string;
    }
  ): Promise<ApiResponse<ExecutionStats>> {
    return apiService.get<ExecutionStats>(`/strategies/${strategyId}/executions/stats`, params);
  }

  /**
   * Get execution statistics for a farm
   */
  async getFarmExecutionStats(
    farmId: string,
    params?: {
      start_date?: string;
      end_date?: string;
    }
  ): Promise<ApiResponse<ExecutionStats>> {
    return apiService.get<ExecutionStats>(`/farms/${farmId}/executions/stats`, params);
  }

  /**
   * Get execution statistics for an agent
   */
  async getAgentExecutionStats(
    agentId: string,
    params?: {
      start_date?: string;
      end_date?: string;
    }
  ): Promise<ApiResponse<ExecutionStats>> {
    return apiService.get<ExecutionStats>(`/agents/${agentId}/executions/stats`, params);
  }
}

// Export singleton instance
export const executionApiService = ExecutionApiService.getInstance(); 