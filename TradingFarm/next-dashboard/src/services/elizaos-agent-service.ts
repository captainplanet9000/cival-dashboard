import { apiClient } from './api-client';

// ElizaOS Agent types
export interface ElizaAgent {
  id: string;
  name: string;
  farmId: number;
  status: 'initializing' | 'active' | 'idle' | 'paused' | 'error';
  created_at: string;
  updated_at: string;
  config: {
    agentType: string;
    markets: string[];
    risk_level: 'low' | 'medium' | 'high';
    api_access: boolean;
    trading_permissions: string;
    auto_recovery: boolean;
    max_concurrent_tasks?: number;
    allowed_markets?: string[];
    llm_model?: string;
  };
  performance_metrics?: {
    commands_processed: number;
    success_rate: number;
    average_response_time_ms: number;
    uptime_percentage?: number;
  };
}

export interface ElizaAgentCreationRequest {
  name: string;
  farmId: number;
  config: {
    agentType: string;
    markets: string[];
    risk_level: 'low' | 'medium' | 'high';
    api_access?: boolean;
    trading_permissions?: string;
    auto_recovery?: boolean;
    max_concurrent_tasks?: number;
    llm_model?: string;
  };
}

class ElizaOSAgentService {
  private baseEndpoint = '/api/elizaos/agents';

  // Get all agents
  async getAgents(): Promise<ElizaAgent[]> {
    const response = await apiClient.get(this.baseEndpoint);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch agents');
    }
    return response.data;
  }

  // Get agents for a specific farm
  async getAgentsByFarm(farmId: number): Promise<ElizaAgent[]> {
    const response = await apiClient.get(`${this.baseEndpoint}/farm/${farmId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch farm agents');
    }
    return response.data;
  }

  // Get a single agent by ID
  async getAgentById(id: string): Promise<ElizaAgent> {
    const response = await apiClient.get(`${this.baseEndpoint}/${id}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch agent');
    }
    return response.data;
  }

  // Create a new agent
  async createAgent(agentData: ElizaAgentCreationRequest): Promise<ElizaAgent> {
    const response = await apiClient.post(this.baseEndpoint, agentData);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create agent');
    }
    return response.data;
  }

  // Update an agent
  async updateAgent(id: string, agentData: Partial<ElizaAgentCreationRequest>): Promise<ElizaAgent> {
    const response = await apiClient.put(`${this.baseEndpoint}/${id}`, agentData);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update agent');
    }
    return response.data;
  }

  // Delete an agent
  async deleteAgent(id: string): Promise<void> {
    const response = await apiClient.delete(`${this.baseEndpoint}/${id}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete agent');
    }
  }

  // Control agent (start, stop, pause, resume)
  async controlAgent(id: string, action: 'start' | 'stop' | 'pause' | 'resume'): Promise<ElizaAgent> {
    const response = await apiClient.post(`${this.baseEndpoint}/${id}/control`, { action });
    if (!response.success) {
      throw new Error(response.error || `Failed to ${action} agent`);
    }
    return response.data;
  }

  // Get agent performance metrics
  async getAgentMetrics(id: string): Promise<ElizaAgent['performance_metrics']> {
    const response = await apiClient.get(`${this.baseEndpoint}/${id}/metrics`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch agent metrics');
    }
    return response.data;
  }
}

export const elizaOSAgentService = new ElizaOSAgentService();
