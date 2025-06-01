import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useCallback, useEffect, useState } from 'react';

export interface Agent {
  id: string;
  name: string;
  type: string;
  description: string;
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
  strategyId: string;
  strategyName: string;
  riskProfileId: string;
  lastTradeTime?: string;
  pnl24h: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentHealth {
  agentId: string;
  score: number;
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  errorRate: number;
  lastChecked: string;
}

export interface AgentLog {
  agentId: string;
  agentName: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

/**
 * Hook for managing trading agents and the agent orchestration system
 * 
 * @param userId - The user ID
 * @returns Agent management functions and data
 */
export function useAgentSystem(userId: number) {
  const queryClient = useQueryClient();
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  
  // Subscribe to agent logs
  useEffect(() => {
    const channel = supabase
      .channel('agent-logs')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'agent_logs', filter: `user_id=eq.${userId}` }, 
        (payload) => {
          const newLog: AgentLog = {
            agentId: payload.new.agent_id,
            agentName: payload.new.agent_name,
            level: payload.new.level,
            message: payload.new.message,
            timestamp: payload.new.created_at
          };
          
          setAgentLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);
  
  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_agents')
        .select(`
          id, 
          name, 
          type, 
          description, 
          status, 
          strategy_id, 
          strategies(name), 
          risk_profile_id, 
          last_trade_time, 
          pnl_24h, 
          created_at, 
          updated_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return (data || []).map(agent => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        description: agent.description,
        status: agent.status,
        strategyId: agent.strategy_id,
        strategyName: agent.strategies?.name || 'Unknown Strategy',
        riskProfileId: agent.risk_profile_id,
        lastTradeTime: agent.last_trade_time,
        pnl24h: agent.pnl_24h,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at
      }));
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });
  
  // Fetch agent health metrics
  const { data: agentHealth = [] } = useQuery({
    queryKey: ['agentHealth', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_health')
        .select('*')
        .eq('user_id', userId);
        
      if (error) throw error;
      
      return (data || []).map(health => ({
        agentId: health.agent_id,
        score: health.health_score,
        cpuUsage: health.cpu_usage,
        memoryUsage: health.memory_usage,
        responseTime: health.response_time,
        errorRate: health.error_rate,
        lastChecked: health.last_checked
      }));
    },
    refetchInterval: 15000 // Refresh every 15 seconds
  });
  
  // Create agent mutation
  const createAgentMutation = useMutation({
    mutationFn: async (agentData: {
      name: string;
      type: string;
      description: string;
      strategyId: string;
      riskProfileId: string;
    }) => {
      const { data, error } = await supabase
        .from('trading_agents')
        .insert({
          name: agentData.name,
          type: agentData.type,
          description: agentData.description,
          strategy_id: agentData.strategyId,
          risk_profile_id: agentData.riskProfileId,
          status: 'stopped',
          user_id: userId
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', userId] });
    }
  });
  
  // Start agent mutation
  const startAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      // First update the agent status to 'starting'
      const { error: updateError } = await supabase
        .from('trading_agents')
        .update({ status: 'starting' })
        .eq('id', agentId)
        .eq('user_id', userId);
        
      if (updateError) throw updateError;
      
      // Then call the agent start function
      const { data, error } = await supabase
        .rpc('start_trading_agent', { agent_id: agentId });
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', userId] });
    }
  });
  
  // Stop agent mutation
  const stopAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      // First update the agent status to 'stopping'
      const { error: updateError } = await supabase
        .from('trading_agents')
        .update({ status: 'stopping' })
        .eq('id', agentId)
        .eq('user_id', userId);
        
      if (updateError) throw updateError;
      
      // Then call the agent stop function
      const { data, error } = await supabase
        .rpc('stop_trading_agent', { agent_id: agentId });
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', userId] });
    }
  });
  
  // Restart agent mutation
  const restartAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const { data, error } = await supabase
        .rpc('restart_trading_agent', { agent_id: agentId });
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', userId] });
    }
  });
  
  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      // First stop the agent if it's running
      const agent = agents.find(a => a.id === agentId);
      if (agent && agent.status === 'running') {
        await stopAgentMutation.mutateAsync(agentId);
      }
      
      // Then delete the agent
      const { error } = await supabase
        .from('trading_agents')
        .delete()
        .eq('id', agentId)
        .eq('user_id', userId);
        
      if (error) throw error;
      return agentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', userId] });
    }
  });
  
  // Update agent configuration
  const updateAgentConfigMutation = useMutation({
    mutationFn: async ({ agentId, config }: { agentId: string; config: any }) => {
      const { data, error } = await supabase
        .from('agent_configs')
        .upsert({
          agent_id: agentId,
          user_id: userId,
          config_data: config
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    }
  });
  
  // Agent action wrappers with error handling
  const createAgent = useCallback(async (agentData: any) => {
    try {
      await createAgentMutation.mutateAsync(agentData);
      toast({
        title: "Agent Created",
        description: `Agent "${agentData.name}" has been created successfully.`,
        variant: "success"
      });
    } catch (error: any) {
      toast({
        title: "Failed to Create Agent",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [createAgentMutation, toast]);
  
  const startAgent = useCallback(async (agentId: string) => {
    try {
      await startAgentMutation.mutateAsync(agentId);
      toast({
        title: "Agent Started",
        description: "The trading agent has been started successfully.",
        variant: "success"
      });
    } catch (error: any) {
      toast({
        title: "Failed to Start Agent",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [startAgentMutation, toast]);
  
  const stopAgent = useCallback(async (agentId: string) => {
    try {
      await stopAgentMutation.mutateAsync(agentId);
      toast({
        title: "Agent Stopped",
        description: "The trading agent has been stopped successfully.",
        variant: "success"
      });
    } catch (error: any) {
      toast({
        title: "Failed to Stop Agent",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [stopAgentMutation, toast]);
  
  const restartAgent = useCallback(async (agentId: string) => {
    try {
      await restartAgentMutation.mutateAsync(agentId);
      toast({
        title: "Agent Restarted",
        description: "The trading agent has been restarted successfully.",
        variant: "success"
      });
    } catch (error: any) {
      toast({
        title: "Failed to Restart Agent",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [restartAgentMutation, toast]);
  
  const deleteAgent = useCallback(async (agentId: string) => {
    try {
      await deleteAgentMutation.mutateAsync(agentId);
      toast({
        title: "Agent Deleted",
        description: "The trading agent has been deleted successfully.",
        variant: "success"
      });
    } catch (error: any) {
      toast({
        title: "Failed to Delete Agent",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [deleteAgentMutation, toast]);
  
  const updateAgentConfig = useCallback(async (agentId: string, config: any) => {
    try {
      await updateAgentConfigMutation.mutateAsync({ agentId, config });
      toast({
        title: "Configuration Updated",
        description: "The agent configuration has been updated successfully.",
        variant: "success"
      });
    } catch (error: any) {
      toast({
        title: "Failed to Update Configuration",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [updateAgentConfigMutation, toast]);
  
  return {
    agents,
    agentLogs,
    agentHealth,
    createAgent,
    startAgent,
    stopAgent,
    restartAgent,
    deleteAgent,
    updateAgentConfig
  };
}
