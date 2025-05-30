import { useState, useEffect, useCallback } from 'react';
import { FarmAgentManager, CreateAgentParams } from '@/services/agent/farm-agent-manager';
import { FarmRealtimeService } from '@/services/farm/farm-realtime-service';
import type { Database } from '@/types/database.types';

type AgentData = Database['public']['Tables']['farm_agents']['Row'] & {
  plugins: Database['public']['Tables']['agent_plugins']['Row'][];
  clients: Database['public']['Tables']['agent_clients']['Row'][];
};

interface UseAgentOptions {
  supabaseUrl: string;
  supabaseKey: string;
  agentId?: string;
  farmId?: string;
}

interface UseAgentReturn {
  agent: AgentData | null;
  isLoading: boolean;
  error: string | null;
  createAgent: (params: CreateAgentParams) => Promise<{ success: boolean; data?: AgentData; error?: string }>;
  activateAgent: () => Promise<{ success: boolean; error?: string }>;
  deactivateAgent: () => Promise<{ success: boolean; error?: string }>;
  updateAgent: (updates: Partial<Database['public']['Tables']['farm_agents']['Update']>) => Promise<{ success: boolean; error?: string }>;
  deleteAgent: () => Promise<{ success: boolean; error?: string }>;
}

export function useAgent({
  supabaseUrl,
  supabaseKey,
  agentId,
  farmId
}: UseAgentOptions): UseAgentReturn {
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentManager = new FarmAgentManager(supabaseUrl, supabaseKey);
  const farmRealtimeService = new FarmRealtimeService(supabaseUrl, supabaseKey);

  const loadAgent = useCallback(async () => {
    if (!agentId) {
      setAgent(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await agentManager.getAgent(agentId);
      if (result.success && result.data) {
        setAgent(result.data as AgentData);
      } else {
        setError(result.error || 'Failed to load agent');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [agentId, agentManager]);

  const createAgent = async (params: CreateAgentParams) => {
    try {
      const result = await agentManager.createAgent(params);
      if (result.success && result.data) {
        return { success: true, data: result.data as AgentData };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create agent'
      };
    }
  };

  const activateAgent = async () => {
    if (!agentId) return { success: false, error: 'No agent selected' };
    try {
      const result = await agentManager.activateAgent(agentId);
      if (result.success) {
        await loadAgent();
      }
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to activate agent'
      };
    }
  };

  const deactivateAgent = async () => {
    if (!agentId) return { success: false, error: 'No agent selected' };
    try {
      const result = await agentManager.deactivateAgent(agentId);
      if (result.success) {
        await loadAgent();
      }
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to deactivate agent'
      };
    }
  };

  const updateAgent = async (updates: Partial<Database['public']['Tables']['farm_agents']['Update']>) => {
    if (!agentId) return { success: false, error: 'No agent selected' };
    try {
      const result = await agentManager.updateAgentConfig(agentId, updates);
      if (result.success) {
        await loadAgent();
      }
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update agent'
      };
    }
  };

  const deleteAgent = async () => {
    if (!agentId) return { success: false, error: 'No agent selected' };
    try {
      const result = await agentManager.deleteAgent(agentId);
      if (result.success) {
        setAgent(null);
      }
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete agent'
      };
    }
  };

  useEffect(() => {
    loadAgent();

    // Set up real-time subscription for agent updates
    let unsubscribe: (() => void) | undefined;

    if (farmId) {
      unsubscribe = farmRealtimeService.subscribeFarmAgents(farmId, {
        onUpdate: (_, newAgent) => {
          if (newAgent.id === agentId) {
            setAgent(newAgent as AgentData);
          }
        },
        onDelete: (oldAgent) => {
          if (oldAgent.id === agentId) {
            setAgent(null);
          }
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Subscription error')
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [agentId, farmId, loadAgent, farmRealtimeService]);

  return {
    agent,
    isLoading,
    error,
    createAgent,
    activateAgent,
    deactivateAgent,
    updateAgent,
    deleteAgent
  };
} 