/**
 * Simulation Client
 * 
 * Provides an interface for interacting with the Simulation Service for dry-run trading
 * Manages simulation configurations, runs, and performance analytics
 */

import { ApiGateway, ApiServiceType, ApiResponse } from '../api-gateway';
import { MonitoringService } from '../monitoring-service';

// Slippage model types
export type SlippageModelType = 'fixed' | 'percentage' | 'dynamic' | 'custom';

// Fee model types
export type FeeModelType = 'fixed' | 'percentage' | 'tiered';

// Simulation model
export interface SimulationModel {
  id: string;
  userId: string;
  name: string;
  description?: string;
  slippageModel: {
    type: SlippageModelType;
    parameters: Record<string, any>;
  };
  feeModel: {
    type: FeeModelType;
    parameters: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string;
}

// Agent simulation config
export interface AgentSimulationConfig {
  id: string;
  userId: string;
  agentId: string;
  simulationModelId: string;
  initialBalances: {
    currency: string;
    amount: number;
  }[];
  defaultLeverage?: number;
  maxDrawdown?: number;
  tradingPairs: string[];
  enabledActions: string[];
  createdAt: string;
  updatedAt: string;
}

// Simulation run
export interface SimulationRun {
  id: string;
  userId: string;
  agentSimulationConfigId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'stopped' | 'failed';
  error?: string;
  metadata?: Record<string, any>;
}

// Simulation trade
export interface SimulationTrade {
  id: string;
  simulationRunId: string;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  amount: number;
  price: number;
  executionPrice: number;
  timestamp: string;
  slippage: number;
  fee: number;
  feeCurrency: string;
  profit?: number;
  profitCurrency?: string;
}

// Virtual balance
export interface VirtualBalance {
  id: string;
  simulationRunId: string;
  currency: string;
  available: number;
  locked: number;
  total: number;
  timestamp: string;
}

// Simulation metrics
export interface SimulationMetrics {
  id: string;
  simulationRunId: string;
  timestamp: string;
  totalPnl: number;
  pnlCurrency: string;
  winRate: number;
  tradeCount: number;
  averageProfit: number;
  averageLoss: number;
  largestProfit: number;
  largestLoss: number;
  sharpeRatio?: number;
  maxDrawdown: number;
  currentDrawdown: number;
  metadata?: Record<string, any>;
}

export class SimulationClient {
  private static instance: SimulationClient;
  private apiGateway: ApiGateway;
  private activeSimulations: Map<string, SimulationRun> = new Map();
  
  private constructor() {
    this.apiGateway = ApiGateway.getInstance();
  }
  
  // Singleton pattern
  public static getInstance(): SimulationClient {
    if (!SimulationClient.instance) {
      SimulationClient.instance = new SimulationClient();
    }
    return SimulationClient.instance;
  }
  
  /**
   * Get all simulation models for the current user
   */
  public async getSimulationModels(): Promise<ApiResponse<SimulationModel[]>> {
    try {
      const response = await this.apiGateway.serviceRequest<SimulationModel[]>(
        ApiServiceType.SIMULATION,
        '/models',
        {
          method: 'GET',
          requireAuth: true,
          useCache: true,
          cacheTime: 300000 // Cache for 5 minutes
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to get simulation models',
        data: { error }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Create a new simulation model
   */
  public async createSimulationModel(
    model: Omit<SimulationModel, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<SimulationModel>> {
    try {
      const response = await this.apiGateway.serviceRequest<SimulationModel>(
        ApiServiceType.SIMULATION,
        '/models',
        {
          method: 'POST',
          body: model,
          requireAuth: true
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to create simulation model',
        data: { error, model }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Update a simulation model
   */
  public async updateSimulationModel(
    modelId: string,
    updates: Partial<Omit<SimulationModel, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<ApiResponse<SimulationModel>> {
    try {
      const response = await this.apiGateway.serviceRequest<SimulationModel>(
        ApiServiceType.SIMULATION,
        `/models/${modelId}`,
        {
          method: 'PATCH',
          body: updates,
          requireAuth: true
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to update simulation model ${modelId}`,
        data: { error, modelId, updates }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Delete a simulation model
   */
  public async deleteSimulationModel(modelId: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.apiGateway.serviceRequest<{ success: boolean }>(
        ApiServiceType.SIMULATION,
        `/models/${modelId}`,
        {
          method: 'DELETE',
          requireAuth: true
        }
      );
      
      return {
        data: response.data?.success || false,
        error: response.error,
        status: response.status
      };
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to delete simulation model ${modelId}`,
        data: { error, modelId }
      });
      
      return {
        data: false,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get agent simulation configs for a specific agent
   */
  public async getAgentSimulationConfigs(
    agentId?: string
  ): Promise<ApiResponse<AgentSimulationConfig[]>> {
    try {
      let path = '/configs';
      if (agentId) {
        path += `?agentId=${agentId}`;
      }
      
      const response = await this.apiGateway.serviceRequest<AgentSimulationConfig[]>(
        ApiServiceType.SIMULATION,
        path,
        {
          method: 'GET',
          requireAuth: true,
          useCache: true,
          cacheTime: 60000 // Cache for 1 minute
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to get agent simulation configs',
        data: { error, agentId }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Create a new agent simulation config
   */
  public async createAgentSimulationConfig(
    config: Omit<AgentSimulationConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<AgentSimulationConfig>> {
    try {
      const response = await this.apiGateway.serviceRequest<AgentSimulationConfig>(
        ApiServiceType.SIMULATION,
        '/configs',
        {
          method: 'POST',
          body: config,
          requireAuth: true
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to create agent simulation config',
        data: { error, config }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Update an agent simulation config
   */
  public async updateAgentSimulationConfig(
    configId: string,
    updates: Partial<Omit<AgentSimulationConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<ApiResponse<AgentSimulationConfig>> {
    try {
      const response = await this.apiGateway.serviceRequest<AgentSimulationConfig>(
        ApiServiceType.SIMULATION,
        `/configs/${configId}`,
        {
          method: 'PATCH',
          body: updates,
          requireAuth: true
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to update agent simulation config ${configId}`,
        data: { error, configId, updates }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Start a new simulation run
   */
  public async startSimulationRun(
    agentSimulationConfigId: string,
    metadata?: Record<string, any>
  ): Promise<ApiResponse<SimulationRun>> {
    try {
      const response = await this.apiGateway.serviceRequest<SimulationRun>(
        ApiServiceType.SIMULATION,
        '/runs',
        {
          method: 'POST',
          body: { agentSimulationConfigId, metadata },
          requireAuth: true
        }
      );
      
      // Track active simulation
      if (response.data) {
        this.activeSimulations.set(response.data.id, response.data);
        
        MonitoringService.logEvent({
          type: 'info',
          message: `Started simulation run for config ${agentSimulationConfigId}`,
          data: { runId: response.data.id, configId: agentSimulationConfigId }
        });
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to start simulation run',
        data: { error, agentSimulationConfigId }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Stop a simulation run
   */
  public async stopSimulationRun(runId: string): Promise<ApiResponse<SimulationRun>> {
    try {
      const response = await this.apiGateway.serviceRequest<SimulationRun>(
        ApiServiceType.SIMULATION,
        `/runs/${runId}/stop`,
        {
          method: 'POST',
          requireAuth: true
        }
      );
      
      // Update cached simulation
      if (response.data) {
        this.activeSimulations.set(runId, response.data);
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to stop simulation run ${runId}`,
        data: { error, runId }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get simulation run details
   */
  public async getSimulationRun(runId: string): Promise<ApiResponse<SimulationRun>> {
    try {
      // Check cache first
      const cachedRun = this.activeSimulations.get(runId);
      if (cachedRun && cachedRun.status !== 'running') {
        return {
          data: cachedRun,
          error: null,
          status: 200,
          cached: true
        };
      }
      
      const response = await this.apiGateway.serviceRequest<SimulationRun>(
        ApiServiceType.SIMULATION,
        `/runs/${runId}`,
        {
          method: 'GET',
          requireAuth: true
        }
      );
      
      // Update cache
      if (response.data) {
        this.activeSimulations.set(runId, response.data);
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get simulation run ${runId}`,
        data: { error, runId }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get simulation runs for a specific agent or config
   */
  public async getSimulationRuns(
    agentId?: string,
    configId?: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ApiResponse<SimulationRun[]>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (agentId) {
        queryParams.append('agentId', agentId);
      }
      
      if (configId) {
        queryParams.append('configId', configId);
      }
      
      if (status) {
        queryParams.append('status', status);
      }
      
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());
      
      const response = await this.apiGateway.serviceRequest<SimulationRun[]>(
        ApiServiceType.SIMULATION,
        `/runs?${queryParams.toString()}`,
        {
          method: 'GET',
          requireAuth: true
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to get simulation runs',
        data: { error, agentId, configId, status }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get simulation trades for a run
   */
  public async getSimulationTrades(
    runId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ApiResponse<SimulationTrade[]>> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());
      
      const response = await this.apiGateway.serviceRequest<SimulationTrade[]>(
        ApiServiceType.SIMULATION,
        `/runs/${runId}/trades?${queryParams.toString()}`,
        {
          method: 'GET',
          requireAuth: true
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get trades for simulation run ${runId}`,
        data: { error, runId }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get virtual balances for a simulation run
   */
  public async getVirtualBalances(runId: string): Promise<ApiResponse<VirtualBalance[]>> {
    try {
      const response = await this.apiGateway.serviceRequest<VirtualBalance[]>(
        ApiServiceType.SIMULATION,
        `/runs/${runId}/balances`,
        {
          method: 'GET',
          requireAuth: true
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get virtual balances for simulation run ${runId}`,
        data: { error, runId }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get simulation metrics for a run
   */
  public async getSimulationMetrics(runId: string): Promise<ApiResponse<SimulationMetrics>> {
    try {
      const response = await this.apiGateway.serviceRequest<SimulationMetrics>(
        ApiServiceType.SIMULATION,
        `/runs/${runId}/metrics`,
        {
          method: 'GET',
          requireAuth: true
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get metrics for simulation run ${runId}`,
        data: { error, runId }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Execute a trade in a simulation
   */
  public async executeTrade(
    runId: string,
    trade: {
      symbol: string;
      side: 'buy' | 'sell';
      type: 'market' | 'limit' | 'stop' | 'stop_limit';
      amount: number;
      price?: number;
      stopPrice?: number;
    }
  ): Promise<ApiResponse<SimulationTrade>> {
    try {
      const response = await this.apiGateway.serviceRequest<SimulationTrade>(
        ApiServiceType.SIMULATION,
        `/runs/${runId}/trades`,
        {
          method: 'POST',
          body: trade,
          requireAuth: true
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to execute trade in simulation run ${runId}`,
        data: { error, runId, trade }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
}
