import React from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { mockFarms, mockMarkets, mockTools } from '@/services/mock-data-service';
import { 
  AgentAction, 
  AgentConfig, 
  AgentPerformanceMetrics, 
  CreateAgentParams, 
  ElizaAgent 
} from '@/types/agent-types';

interface AgentManagerState {
  agents: ElizaAgent[];
  loading: boolean;
  error: Error | null;
  usingMockData: boolean;
}

export function useElizaAgentManager() {
  const supabase = createBrowserClient();
  const [state, setState] = React.useState<AgentManagerState>({
    agents: [],
    loading: true,
    error: null,
    usingMockData: false
  });
  
  // Get local agents from localStorage
  const getLocalAgents = React.useCallback(() => {
    try {
      const storedAgents = localStorage.getItem('mockElizaAgents');
      return storedAgents ? JSON.parse(storedAgents) : [];
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return [];
    }
  }, []);
  
  // Save local agents to localStorage
  const saveLocalAgents = React.useCallback((agents: ElizaAgent[]) => {
    try {
      localStorage.setItem('mockElizaAgents', JSON.stringify(agents));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }, []);
  
  // Fetch all available agents
  const fetchAgents = React.useCallback(async () => {
    setState((prev: AgentManagerState) => ({ ...prev, loading: true, error: null }));
    
    try {
      // Check authentication
      const { data: authData } = await supabase.auth.getSession();
      
      if (!authData.session) {
        // Not authenticated, use mock data
        console.log('Not authenticated, using mock data');
        const localAgents = getLocalAgents();
        const agents = localAgents.length > 0 ? localAgents : [];
        setState((prev: AgentManagerState) => ({ ...prev, agents, loading: false, error: null, usingMockData: true }));
        return;
      }
      
      // Try API route first
      try {
        const response = await fetch('/api/elizaos/agents');
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        setState({ 
          agents: data.agents || [], 
          loading: false, 
          error: null,
          usingMockData: false
        });
        return;
      } catch (apiError) {
        console.error('API fetch failed, trying direct DB:', apiError);
      }
      
      // Try direct DB query as fallback
      const { data: agents, error: dbError } = await supabase
        .from('elizaos_agents')
        .select('*');
      
      if (dbError) {
        throw dbError;
      }
      
      setState({ 
        agents: agents || [],
        loading: false, 
        error: null,
        usingMockData: false 
      });
      
    } catch (error) {
      console.error('Error fetching agents:', error);
      
      // Final fallback to mock/local data
      const localAgents = getLocalAgents();
      const fallbackAgents = localAgents.length > 0 ? localAgents : [];
      
      setState({ 
        agents: fallbackAgents, 
        loading: false, 
        error: error instanceof Error ? error : new Error('Unknown error'),
        usingMockData: true
      });
    }
  }, [supabase, getLocalAgents]);
  
  // Create a new agent
  const createAgent = React.useCallback(async (agentParams: CreateAgentParams): Promise<ElizaAgent> => {
    try {
      const { name, description, config } = agentParams;
      
      // Prepare API config
      const apiConfig = {
        agentType: config.agentType || 'trading',
        strategyType: config.strategyType || 'momentum',
        markets: config.markets || ['BTC/USD'],
        tools: config.tools || ['trending-analysis', 'market-data'],
        risk_level: config.riskLevel || 'medium',
        api_access: config.apiAccess !== undefined ? config.apiAccess : true,
        trading_permissions: config.tradingPermissions || 'read-write',
        auto_recovery: config.autoRecovery !== undefined ? config.autoRecovery : true,
        max_concurrent_tasks: 3,
        llm_model: 'gpt-4',
        initialInstructions: config.initialInstructions
      };
      
      // Prepare complete agent data
      const agentData = {
        name,
        description,
        farmId: config.farmId,
        config: apiConfig
      };
      
      // Try API route first
      if (!state.usingMockData) {
        try {
          const response = await fetch('/api/elizaos/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agentData),
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }
          
          const result = await response.json();
          setState((prev: AgentManagerState) => ({
            ...prev,
            agents: [...prev.agents, result.data],
            loading: false,
            error: null,
            usingMockData: false
          }));
          return result.data;
        } catch (apiError) {
          console.error('API creation failed:', apiError);
          // If real API fails, fall back to mock mode
          setState((prev: AgentManagerState) => ({ ...prev, usingMockData: true }));
        }
      }
      
      // Not authenticated or DB insertion failed, use localStorage
      const newAgentId = `local-${Date.now()}`;
      const newMockAgent: ElizaAgent = {
        id: newAgentId,
        name: name,
        description: description,
        farm_id: config.farmId,
        farmId: config.farmId, // For compatibility with mockData
        config: apiConfig,
        status: 'idle',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Store in local storage
      const currentAgents = getLocalAgents() || [];
      const updatedAgents = [...currentAgents, newMockAgent];
      saveLocalAgents(updatedAgents);
      
      setState((prev: AgentManagerState) => ({
        ...prev,
        agents: [...prev.agents, newMockAgent],
        usingMockData: true
      }));
      await fetchAgents();
      return newMockAgent;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }, [supabase, getLocalAgents, saveLocalAgents, state.usingMockData]);
  
  // Delete agent
  const deleteAgent = React.useCallback(async (agentId: string): Promise<void> => {
    try {
      if (!state.usingMockData) {
        // Try API route first
        try {
          const response = await fetch(`/api/elizaos/agents/${agentId}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }
          
          await fetchAgents(); // Refresh the agent list
          return;
        } catch (apiError) {
          console.error('API deletion failed, trying direct DB:', apiError);
        }
        
        // Try direct DB deletion as fallback
        const { error } = await supabase
          .from('elizaos_agents')
          .delete()
          .eq('id', agentId);
        
        if (error) {
          throw error;
        }
        
        await fetchAgents(); // Refresh the agent list
        return;
      }
      
      // Using mock data, delete from localStorage
      const agents = getLocalAgents();
      const updatedAgents = agents.filter((agent: ElizaAgent) => agent.id !== agentId);
      
      saveLocalAgents(updatedAgents);
      setState((prev: AgentManagerState) => ({
        ...prev,
        agents: updatedAgents
      }));
      
    } catch (error) {
      console.error(`Error deleting agent:`, error);
      throw error;
    }
  }, [fetchAgents, state.usingMockData, supabase, getLocalAgents, saveLocalAgents]);
  
  // Control agent (start, stop, pause, resume)
  const controlAgent = React.useCallback(async (agentId: string, action: AgentAction): Promise<void> => {
    try {
      if (!state.usingMockData) {
        // Try API route first
        try {
          const response = await fetch(`/api/elizaos/agents/${agentId}/${action}`, {
            method: 'POST'
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }
          
          await fetchAgents(); // Refresh the agent list
          return;
        } catch (apiError) {
          console.error(`API ${action} failed, trying direct DB:`, apiError);
        }
        
        // Try direct DB update as fallback
        const status = action === 'start' || action === 'resume' ? 'active' : 
                      action === 'pause' ? 'paused' : 'idle';
        
        const { error } = await supabase
          .from('elizaos_agents')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', agentId);
        
        if (error) {
          throw error;
        }
        
        await fetchAgents(); // Refresh the agent list
        return;
      }
      
      // Using mock data, update in localStorage
      const agents = getLocalAgents();
      const updatedAgents = agents.map((agent: ElizaAgent) => {
        if (agent.id === agentId) {
          const status = action === 'start' || action === 'resume' ? 'active' : 
                        action === 'pause' ? 'paused' : 'idle';
          return { ...agent, status, updated_at: new Date().toISOString() };
        }
        return agent;
      });
      
      saveLocalAgents(updatedAgents);
      setState((prev: AgentManagerState) => ({
        ...prev,
        agents: updatedAgents
      }));
      
    } catch (error) {
      console.error(`Error controlling agent (${action}):`, error);
      throw error;
    }
  }, [fetchAgents, state.usingMockData, supabase, getLocalAgents, saveLocalAgents]);
  
  // Setup real-time subscription
  React.useEffect(() => {
    let subscription: any = null;
    
    const setupRealtimeSubscription = async () => {
      try {
        // Check authentication before setting up subscription
        const { data: authData } = await supabase.auth.getSession();
        
        if (!authData.session) {
          console.log('Not authenticated, skipping realtime subscription');
          return;
        }
        
        // Subscribe to changes in the elizaos_agents table
        subscription = supabase
          .channel('elizaos_agents_changes')
          .on('postgres_changes', 
              { event: '*', schema: 'public', table: 'elizaos_agents' }, 
              () => {
                console.log('Detected change in agents, refreshing...');
                fetchAgents();
              })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to elizaos_agents changes');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Error setting up realtime subscription');
            }
          });
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
      }
    };
    
    // Initialize: fetch agents and set up subscription
    fetchAgents();
    setupRealtimeSubscription();
    
    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [fetchAgents, supabase]);
  
  // Get agent metrics
  const getAgentMetrics = React.useCallback(async (agentId: string): Promise<AgentPerformanceMetrics> => {
    try {
      if (!state.usingMockData) {
        // Try API route first
        try {
          const response = await fetch(`/api/elizaos/agents/${agentId}/metrics`);
          
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }
          
          const data = await response.json();
          return data.metrics;
        } catch (apiError) {
          console.error('API metrics fetch failed, using fallback:', apiError);
        }
        
        // If API fails, try to get metrics from the agent object
        const agent = state.agents.find((a: ElizaAgent) => a.id === agentId);
        if (agent && agent.performance_metrics) {
          return agent.performance_metrics as AgentPerformanceMetrics;
        }
      }
      
      // Using mock data or fallback
      // Return mock metrics based on agent status
      const agent = state.agents.find((a: ElizaAgent) => a.id === agentId);
      const isActive = agent?.status === 'active';
      
      return {
        success_rate: isActive ? 0.95 : 0.85,
        average_response_time_ms: isActive ? 450 : 650,
        commands_processed: Math.floor(Math.random() * 100) + 10,
        errors_count: Math.floor(Math.random() * 5),
        uptime_percentage: isActive ? 99.5 : 85.0,
        last_active_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting agent metrics:', error);
      // Return default metrics on error
      return {
        success_rate: 0.9,
        average_response_time_ms: 500,
        commands_processed: 0,
        errors_count: 0,
        uptime_percentage: 0,
        last_active_at: new Date().toISOString()
      };
    }
  }, [state.agents, state.usingMockData]);
  
  // Update agent configuration
  const updateAgentConfig = React.useCallback(async (agentId: string, updatedData: {
    name?: string;
    description?: string;
    config?: any;
  }): Promise<void> => {
    try {
      if (!state.usingMockData) {
        // Try API route first
        try {
          const response = await fetch(`/api/elizaos/agents/${agentId}/config`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }
          
          await fetchAgents(); // Refresh the agent list
          return;
        } catch (apiError) {
          console.error('API update config failed, trying direct DB:', apiError);
        }
        
        // Try direct DB update as fallback
        const { error } = await supabase
          .from('elizaos_agents')
          .update({
            ...updatedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', agentId);
        
        if (error) {
          throw error;
        }
        
        await fetchAgents(); // Refresh the agent list
        return;
      }
      
      // Using mock data, update in localStorage
      const agents = getLocalAgents();
      const updatedAgents = agents.map((agent: ElizaAgent) => {
        if (agent.id === agentId) {
          return { 
            ...agent, 
            ...updatedData, 
            updated_at: new Date().toISOString() 
          };
        }
        return agent;
      });
      
      saveLocalAgents(updatedAgents);
      setState((prev: AgentManagerState) => ({
        ...prev,
        agents: updatedAgents
      }));
      
    } catch (error) {
      console.error('Error updating agent config:', error);
      throw error;
    }
  }, [fetchAgents, state.usingMockData, supabase, getLocalAgents, saveLocalAgents]);
  
  // Get agent logs
  const getAgentLogs = React.useCallback(async (agentId: string, limit: number = 100, offset: number = 0) => {
    try {
      if (!state.usingMockData) {
        // Try API route first
        try {
          const response = await fetch(`/api/elizaos/agents/${agentId}/logs?limit=${limit}&offset=${offset}`);
          
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }
          
          return await response.json();
        } catch (apiError) {
          console.error('API logs fetch failed, using fallback:', apiError);
        }
        
        // Try direct DB query as fallback
        const { data: logs, error } = await supabase
          .from('monitoring_events')
          .select('*')
          .eq('agent_id', agentId)
          .order('timestamp', { ascending: false })
          .range(offset, offset + limit - 1);
        
        if (error) {
          throw error;
        }
        
        return { logs };
      }
      
      // Generate mock logs
      const mockLogs = [];
      const now = new Date();
      const agent = state.agents.find((a: ElizaAgent) => a.id === agentId);
      
      for (let i = 0; i < limit; i++) {
        const timestamp = new Date(now);
        timestamp.setMinutes(now.getMinutes() - i * 5);
        
        const logTypes = ['info', 'warn', 'error', 'debug'];
        const logCategories = ['system', 'command', 'strategy', 'api'];
        
        mockLogs.push({
          id: `log-${i}-${agentId}`,
          agent_id: agentId,
          timestamp: timestamp.toISOString(),
          level: logTypes[Math.floor(Math.random() * logTypes.length)],
          category: logCategories[Math.floor(Math.random() * logCategories.length)],
          message: `Mock log message for ${agent?.name || 'agent'} at ${timestamp.toLocaleTimeString()}`,
          details: { mock: true }
        });
      }
      
      return { logs: mockLogs };
    } catch (error) {
      console.error('Error getting agent logs:', error);
      return { logs: [], error: 'Failed to fetch logs' };
    }
  }, [state.agents, state.usingMockData, supabase]);

  return {
    agents: state.agents,
    loading: state.loading,
    error: state.error,
    usingMockData: state.usingMockData,
    refreshAgents: fetchAgents,
    createAgent,
    controlAgent,
    getAgentMetrics,
    updateAgentConfig,
    getAgentLogs
  };
}
