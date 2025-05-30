import { useState, useEffect, useCallback } from 'react';
import { FarmService, CreateFarmParams, CreateFarmWalletParams, CreateFarmAgentParams, AssignWalletToAgentParams } from '@/services/farm/farm-service';
import { FarmRealtimeService } from '@/services/farm/farm-realtime-service';
import type { Database } from '@/types/database.types';
import { createClient } from '@supabase/supabase-js';

type Farm = Database['public']['Tables']['farms']['Row'] & {
  farm_wallets: Database['public']['Tables']['farm_wallets']['Row'][];
  farm_agents: (Database['public']['Tables']['farm_agents']['Row'] & {
    agent_wallets: (Database['public']['Tables']['agent_wallets']['Row'] & {
      farm_wallet: Database['public']['Tables']['farm_wallets']['Row'];
    })[];
    agent_tools: Database['public']['Tables']['agent_tools']['Row'][];
    agent_apis: Database['public']['Tables']['agent_apis']['Row'][];
  })[];
};

type FarmAgent = Database['public']['Tables']['farm_agents']['Row'];
type AgentTool = Database['public']['Tables']['agent_tools']['Row'];
type AgentApi = Database['public']['Tables']['agent_apis']['Row'];

interface UseFarmOptions {
  supabaseUrl: string;
  supabaseKey: string;
  farmId?: string;
}

interface UseFarmReturn {
  farm: Farm | null;
  farms: Farm[];
  isLoading: boolean;
  error: string | null;
  createFarm: (params: CreateFarmParams) => Promise<{ success: boolean; error?: string }>;
  createFarmWallet: (params: CreateFarmWalletParams) => Promise<{ success: boolean; data?: any; error?: string }>;
  createFarmAgent: (params: CreateFarmAgentParams) => Promise<{ success: boolean; data?: any; error?: string }>;
  assignWalletToAgent: (params: AssignWalletToAgentParams) => Promise<{ success: boolean; data?: any; error?: string }>;
  updateFarmStatus: (status: 'active' | 'paused' | 'stopped') => Promise<{ success: boolean; error?: string }>;
  deleteFarm: (farmId: string) => Promise<{ success: boolean; error?: string }>;
  createAgentTool: (params: CreateAgentToolParams) => Promise<{ success: boolean; data?: AgentTool; error?: string }>;
  createAgentApi: (params: CreateAgentApiParams) => Promise<{ success: boolean; data?: AgentApi; error?: string }>;
  deleteFarmAgent: (agentId: string) => Promise<{ success: boolean; error?: string }>;
  deleteFarmWallet: (walletId: string) => Promise<{ success: boolean; error?: string }>;
  deleteAgentTool: (toolId: string) => Promise<{ success: boolean; error?: string }>;
  deleteAgentApi: (apiId: string) => Promise<{ success: boolean; error?: string }>;
}

interface CreateAgentToolParams {
  agentId: string;
  name: string;
  description: string;
  config: Record<string, any>;
}

interface CreateAgentApiParams {
  agentId: string;
  name: string;
  endpoint: string;
  auth_config: Record<string, any>;
  rate_limit: {
    requests: number;
    per: 'second' | 'minute' | 'hour';
  };
}

export function useFarm({
  supabaseUrl,
  supabaseKey,
  farmId
}: UseFarmOptions): UseFarmReturn {
  const [farm, setFarm] = useState<Farm | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const farmService = new FarmService(supabaseUrl, supabaseKey);
  const farmRealtimeService = new FarmRealtimeService(supabaseUrl, supabaseKey);
  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  const loadFarm = useCallback(async () => {
    if (!farmId) {
      setFarm(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await farmService.getFarm(farmId);
      if (result.success && result.data) {
        setFarm(result.data as Farm);
      } else {
        setError(result.error || 'Failed to load farm');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [farmId, farmService]);

  const fetchFarm = async () => {
    if (!farmId) return;

    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*, farm_agents(*)')
        .eq('id', farmId)
        .single();

      if (error) throw error;
      setFarm(data);
    } catch (err: any) {
      console.error('Error fetching farm:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFarms = async () => {
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*, farm_agents(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFarms(data);
    } catch (err: any) {
      console.error('Error fetching farms:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createFarm = async (params: CreateFarmParams) => {
    try {
      const { data, error } = await supabase
        .from('farms')
        .insert([params])
        .select()
        .single();

      if (error) throw error;

      setFarms((prev) => [data, ...prev]);
      return { success: true };
    } catch (err: any) {
      console.error('Error creating farm:', err);
      return { success: false, error: err.message };
    }
  };

  const createFarmWallet = async (params: CreateFarmWalletParams) => {
    try {
      const result = await farmService.createFarmWallet(params);
      if (result.success) {
        await loadFarm();
      }
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create farm wallet'
      };
    }
  };

  const createFarmAgent = async (params: CreateFarmAgentParams) => {
    try {
      const result = await farmService.createFarmAgent(params);
      if (result.success) {
        await loadFarm();
      }
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create farm agent'
      };
    }
  };

  const assignWalletToAgent = async (params: AssignWalletToAgentParams) => {
    try {
      const result = await farmService.assignWalletToAgent(params);
      if (result.success) {
        await loadFarm();
      }
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to assign wallet to agent'
      };
    }
  };

  const updateFarmStatus = async (status: 'active' | 'paused' | 'stopped') => {
    if (!farmId) return { success: false, error: 'No farm selected' };
    try {
      const result = await farmService.updateFarmStatus(farmId, status);
      if (result.success) {
        await loadFarm();
      }
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update farm status'
      };
    }
  };

  const deleteFarm = async (id: string) => {
    try {
      const { error } = await supabase
        .from('farms')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFarms((prev) => prev.filter((farm) => farm.id !== id));
      if (farm?.id === id) setFarm(null);

      return { success: true };
    } catch (err: any) {
      console.error('Error deleting farm:', err);
      return { success: false, error: err.message };
    }
  };

  const createAgentTool = async (params: CreateAgentToolParams) => {
    try {
      const result = await supabase
        .from('agent_tools')
        .insert([
          {
            agent_id: params.agentId,
            name: params.name,
            description: params.description,
            config: params.config,
          },
        ])
        .select()
        .single();
      if (result.error) throw result.error;
      return { success: true, data: result.data as AgentTool };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create agent tool'
      };
    }
  };

  const createAgentApi = async (params: CreateAgentApiParams) => {
    try {
      const result = await supabase
        .from('agent_apis')
        .insert([
          {
            agent_id: params.agentId,
            name: params.name,
            endpoint: params.endpoint,
            auth_config: params.auth_config,
            rate_limit: params.rate_limit,
          },
        ])
        .select()
        .single();
      if (result.error) throw result.error;
      return { success: true, data: result.data as AgentApi };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create agent API'
      };
    }
  };

  const deleteFarmAgent = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('farm_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;
      await loadFarm();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete farm agent'
      };
    }
  };

  const deleteFarmWallet = async (walletId: string) => {
    try {
      const { error } = await supabase
        .from('farm_wallets')
        .delete()
        .eq('id', walletId);

      if (error) throw error;
      await loadFarm();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete farm wallet'
      };
    }
  };

  const deleteAgentTool = async (toolId: string) => {
    try {
      const { error } = await supabase
        .from('agent_tools')
        .delete()
        .eq('id', toolId);

      if (error) throw error;
      await loadFarm();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete agent tool'
      };
    }
  };

  const deleteAgentApi = async (apiId: string) => {
    try {
      const { error } = await supabase
        .from('agent_apis')
        .delete()
        .eq('id', apiId);

      if (error) throw error;
      await loadFarm();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete agent API'
      };
    }
  };

  useEffect(() => {
    loadFarm();
    fetchFarms();

    // Set up real-time subscription for farm updates
    let unsubscribe: (() => void) | undefined;

    if (farmId) {
      unsubscribe = farmRealtimeService.subscribeFarmAgents(farmId, {
        onInsert: () => loadFarm(),
        onUpdate: () => loadFarm(),
        onDelete: () => loadFarm(),
        onError: (err) => setError(err instanceof Error ? err.message : 'Subscription error')
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [farmId, loadFarm, farmRealtimeService, fetchFarms]);

  return {
    farm,
    farms,
    createFarm,
    createFarmWallet,
    createFarmAgent,
    assignWalletToAgent,
    updateFarmStatus,
    deleteFarm,
    createAgentTool,
    createAgentApi,
    deleteFarmAgent,
    deleteFarmWallet,
    deleteAgentTool,
    deleteAgentApi,
    isLoading,
    error
  };
} 