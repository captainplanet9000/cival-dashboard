/**
 * ElizaOS API Client
 * 
 * This client handles all direct communications with the ElizaOS API for agent management.
 * It replaces the mock implementations in the original API client.
 */

// API response type
interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

// Agent types
export type AgentType = 'market_maker' | 'trend_follower' | 'arbitrage' | 'ml_predictor' | 'grid_trader' | 'custom';

// Agent status
export type AgentStatus = 'initializing' | 'running' | 'paused' | 'error' | 'stopped';

// Agent interface
export interface ElizaAgent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  description?: string;
  parameters: Record<string, any>;
  created_at: string;
  updated_at: string;
  health?: {
    cpu_usage: number;
    memory_usage: number;
    last_active: string;
    uptime: number;
    status: string;
  };
}

// Agent metrics
export interface ElizaAgentMetrics {
  agent_id: string;
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  trades_executed: number;
  success_rate: number;
  profit_loss?: number;
  avg_trade_duration?: number;
}

// Agent command result
export interface CommandResult {
  command_id: string;
  status: 'success' | 'error' | 'pending';
  result: any;
  executed_at: string;
}

class ElizaOSApiClient {
  private apiUrl: string;
  private authToken?: string;
  
  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_ELIZAOS_API_URL || '';
  }
  
  // Set auth token for authenticated requests
  setAuthToken(token: string) {
    this.authToken = token;
  }
  
  // Helper for making API requests
  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }
      
      const requestOptions: RequestInit = {
        method,
        headers,
      };
      
      if (body && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(body);
      }
      
      const response = await fetch(`${this.apiUrl}${endpoint}`, requestOptions);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `API error: ${response.status}`);
      }
      
      return { data: data.data || data };
    } catch (err) {
      console.error(`ElizaOS API error (${endpoint}):`, err);
      return { error: err instanceof Error ? err.message : 'Unknown API error' };
    }
  }
  
  // Get all agents
  async getAgents(): Promise<ApiResponse<ElizaAgent[]>> {
    return this.makeRequest<ElizaAgent[]>('/agents');
  }
  
  // Get a specific agent
  async getAgent(agentId: string): Promise<ApiResponse<ElizaAgent>> {
    return this.makeRequest<ElizaAgent>(`/agents/${agentId}`);
  }
  
  // Create a new agent
  async createAgent(agentData: Partial<ElizaAgent>): Promise<ApiResponse<ElizaAgent>> {
    return this.makeRequest<ElizaAgent>('/agents', 'POST', agentData);
  }
  
  // Update an existing agent
  async updateAgent(agentId: string, agentData: Partial<ElizaAgent>): Promise<ApiResponse<ElizaAgent>> {
    return this.makeRequest<ElizaAgent>(`/agents/${agentId}`, 'PUT', agentData);
  }
  
  // Delete an agent
  async deleteAgent(agentId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.makeRequest<{ success: boolean }>(`/agents/${agentId}`, 'DELETE');
  }
  
  // Get agent metrics
  async getAgentMetrics(agentId: string, limit: number = 100): Promise<ApiResponse<ElizaAgentMetrics[]>> {
    return this.makeRequest<ElizaAgentMetrics[]>(`/agents/${agentId}/metrics?limit=${limit}`);
  }
  
  // Get agent status
  async getAgentStatus(agentId: string): Promise<ApiResponse<ElizaAgent['health']>> {
    return this.makeRequest<ElizaAgent['health']>(`/agents/${agentId}/status`);
  }
  
  // Execute a command on an agent
  async executeCommand(
    agentId: string, 
    command: string, 
    params: Record<string, any> = {}
  ): Promise<ApiResponse<CommandResult>> {
    return this.makeRequest<CommandResult>(
      `/agents/${agentId}/command`, 
      'POST', 
      { command, parameters: params }
    );
  }
  
  // Start an agent
  async startAgent(agentId: string): Promise<ApiResponse<CommandResult>> {
    return this.executeCommand(agentId, 'start');
  }
  
  // Stop an agent
  async stopAgent(agentId: string): Promise<ApiResponse<CommandResult>> {
    return this.executeCommand(agentId, 'stop');
  }
  
  // Restart an agent
  async restartAgent(agentId: string): Promise<ApiResponse<CommandResult>> {
    return this.executeCommand(agentId, 'restart');
  }
  
  // Get command history for an agent
  async getCommandHistory(agentId: string, limit: number = 20): Promise<ApiResponse<CommandResult[]>> {
    return this.makeRequest<CommandResult[]>(`/agents/${agentId}/commands?limit=${limit}`);
  }
  
  // Get logs for an agent
  async getAgentLogs(
    agentId: string, 
    level: 'debug' | 'info' | 'warn' | 'error' = 'info',
    limit: number = 50
  ): Promise<ApiResponse<string[]>> {
    return this.makeRequest<string[]>(`/agents/${agentId}/logs?level=${level}&limit=${limit}`);
  }
}

export const elizaOSApi = new ElizaOSApiClient(); 