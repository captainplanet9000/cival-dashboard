import { apiClient } from './client';
import type { Strategy } from './strategies';
import { createServerClient } from '@/utils/supabase/server';
import { Database, Json } from '@/types/database.types';
import { AgentSpecs } from '@/types/database-json.types';

// Agent interfaces
export interface Agent {
  id: string;
  name: string;
  type: 'spot' | 'margin' | 'futures';
  status: 'active' | 'paused' | 'error';
  exchange: string;
  tradingPair: string;
  strategy: {
    id: string;
    name: string;
    type: string;
  };
  performance: {
    totalReturns: number;
    currentDrawdown: number;
    maxDrawdown: number;
    totalTrades: number;
    winRate: number;
    profitFactor: number;
  };
  settings: {
    leverage?: number;
    maxPositionSize: number;
    stopLoss: number;
    takeProfit: number;
    trailingStop?: number;
  };
  position?: {
    type: 'long' | 'short';
    entryPrice: number;
    size: number;
    unrealizedPnl: number;
    stopLoss: number;
    takeProfit: number;
  };
  createdAt: string;
  updatedAt: string;
  lastTrade?: {
    type: 'buy' | 'sell';
    price: number;
    size: number;
    pnl: number;
    timestamp: string;
  };
}

export interface CreateAgentDto {
  name: string;
  type: Agent['type'];
  exchange: string;
  tradingPair: string;
  strategyId: string;
  settings: {
    leverage?: number;
    maxPositionSize: number;
    stopLoss: number;
    takeProfit: number;
    trailingStop?: number;
  };
}

export interface UpdateAgentDto {
  name?: string;
  settings?: Partial<Agent['settings']>;
}

export interface AgentPerformance {
  timeframe: string;
  data: Array<{
    timestamp: string;
    returns: number;
    drawdown: number;
    equity: number;
    position: number;
  }>;
}

export interface AgentTrade {
  id: string;
  type: 'buy' | 'sell';
  price: number;
  size: number;
  pnl: number;
  fees: number;
  timestamp: string;
}

// Basic type for worker agent info
export type WorkerAgentBasicInfo = Omit<Database['public']['Tables']['worker_agents']['Row'], 'specs'> & {
  specs: AgentSpecs | null;
};

// Input DTO for creating a basic worker
export interface CreateBasicWorkerDto {
  manager_id?: string | null;
  specs: AgentSpecs;
  initial_status?: string;
}

// Agent API class
export class AgentApi {
  private static readonly BASE_PATH = '/agents';

  // Get all agents
  public static async getAgents(params?: {
    status?: Agent['status'];
    type?: Agent['type'];
    exchange?: string;
    strategyId?: string;
  }): Promise<Agent[]> {
    return apiClient.get(this.BASE_PATH, params);
  }

  // Get a single agent by ID
  public static async getAgent(id: string): Promise<Agent> {
    return apiClient.get(`${this.BASE_PATH}/${id}`);
  }

  // Create a new agent
  public static async createAgent(data: CreateAgentDto): Promise<Agent> {
    return apiClient.post(this.BASE_PATH, data);
  }

  // Update an agent
  public static async updateAgent(id: string, data: UpdateAgentDto): Promise<Agent> {
    return apiClient.patch(`${this.BASE_PATH}/${id}`, data);
  }

  // Delete an agent
  public static async deleteAgent(id: string): Promise<void> {
    return apiClient.delete(`${this.BASE_PATH}/${id}`);
  }

  // Get agent performance history
  public static async getAgentPerformance(
    id: string,
    params?: {
      timeframe?: '1d' | '7d' | '30d' | '90d' | '1y';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<AgentPerformance> {
    return apiClient.get(`${this.BASE_PATH}/${id}/performance`, params);
  }

  // Get agent trades
  public static async getAgentTrades(
    id: string,
    params?: {
      limit?: number;
      before?: string;
      after?: string;
    }
  ): Promise<AgentTrade[]> {
    return apiClient.get(`${this.BASE_PATH}/${id}/trades`, params);
  }

  // Activate an agent
  public static async activateAgent(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/activate`, {});
  }

  // Pause an agent
  public static async pauseAgent(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/pause`, {});
  }

  // Close a position
  public static async closePosition(id: string): Promise<void> {
    return apiClient.post(`${this.BASE_PATH}/${id}/close-position`, {});
  }

  // Update stop loss
  public static async updateStopLoss(id: string, price: number): Promise<void> {
    return apiClient.patch(`${this.BASE_PATH}/${id}/stop-loss`, { price });
  }

  // Update take profit
  public static async updateTakeProfit(id: string, price: number): Promise<void> {
    return apiClient.patch(`${this.BASE_PATH}/${id}/take-profit`, { price });
  }

  // Get exchanges
  public static async getExchanges(): Promise<
    Array<{
      id: string;
      name: string;
      type: 'spot' | 'margin' | 'futures';
      tradingPairs: string[];
      features: string[];
    }>
  > {
    return apiClient.get(`${this.BASE_PATH}/exchanges`);
  }

  /**
   * Creates a basic worker agent record.
   * Assumes server-side execution (e.g., called from an API route).
   * @param data DTO containing necessary worker creation data.
   * @returns Promise resolving to the newly created worker agent's basic info.
   */
  public static async createBasicWorkerAgent(data: CreateBasicWorkerDto): Promise<WorkerAgentBasicInfo> {
    const supabase = createServerClient();
    const specsJson = data.specs as unknown as Json;
    const insertData: Database['public']['Tables']['worker_agents']['Insert'] = {
      manager_id: data.manager_id,
      specs: specsJson,
      status: data.initial_status ?? 'initializing',
      // last_heartbeat and elizaos_session_id likely set by agent process later
    };

    const { data: newAgentData, error: createError } = await supabase
      .from('worker_agents')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating basic worker agent:', createError);
      throw new Error(createError.message || 'Failed to create worker agent');
    }

    const newAgent = newAgentData as any; // Use any for mapping robustness
    return {
      ...newAgent,
      specs: newAgent.specs as AgentSpecs | null,
    } as WorkerAgentBasicInfo;
  }
} 