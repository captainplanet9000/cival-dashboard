import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';

// Basic agent type
export interface ElizaAgent {
  id: string;
  name: string;
  farmId: string;
  user_id: string;
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

// Agent command type
export interface ElizaAgentCommand {
  id: string;
  agent_id: string;
  farm_id: string;
  command_text: string;
  response_text?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  execution_time_ms?: number;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

// Mock implementation to unblock build
export class ElizaOSAgentService {
  // Get all agents
  async getAgents(): Promise<ElizaAgent[]> {
    return [];
  }

  // Get agents for a specific farm
  async getAgentsByFarm(farmId: string): Promise<ElizaAgent[]> {
    return [];
  }

  // Get a single agent by ID
  async getAgentById(id: string): Promise<ElizaAgent> {
    return {
      id,
      name: 'Mock Agent',
      farmId: 'mock-farm',
      user_id: 'mock-user',
      status: 'idle',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      config: {
        agentType: 'mock',
        markets: [],
        risk_level: 'low',
        api_access: false,
        trading_permissions: 'none',
        auto_recovery: false
      }
    };
  }

  // Control agent (start, stop, pause, resume)
  async controlAgent(id: string, action: 'start' | 'stop' | 'pause' | 'resume'): Promise<ElizaAgent> {
    return this.getAgentById(id);
  }
}

// Export an instance for convenience
export const elizaOSAgentService = new ElizaOSAgentService();