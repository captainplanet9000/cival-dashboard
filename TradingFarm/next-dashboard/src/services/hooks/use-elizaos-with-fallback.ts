import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import useElizaOS from './use-elizaos';
import { useLocalStorage } from './use-local-storage';

// Define types for agents
export interface AgentWithFallback {
  id: string;
  name: string;
  description?: string | null;
  farm_id?: string | null;
  type: 'trading' | 'analytical' | 'research' | 'conversational';
  strategy_type?: string;
  status: 'active' | 'paused' | 'initializing' | 'error' | 'inactive';
  risk_level?: 'low' | 'medium' | 'high';
  exchange?: string;
  target_markets?: string[];
  config?: any;
  configuration?: any;
  instructions?: string | null;
  user_id?: string | null;
  is_active?: boolean;
  performance_metrics?: {
    win_rate?: number;
    profit_loss?: number;
    total_trades?: number;
    average_trade_duration?: number;
  };
  created_at: string;
  updated_at: string;
  execution_mode: 'live' | 'dry-run' | 'backtest';
  model_id?: string;
  knowledge_base_ids?: string[];
  capabilities?: string[];
  role_id?: string;
  is_fallback?: boolean; // Flag to indicate if this is mock/fallback data
  data_source?: 'api' | 'cache' | 'mock'; // Tracks where the data came from
}

// Mock data for development and offline scenarios
export const mockElizaAgents: AgentWithFallback[] = [
  {
    id: "mock-agent-1",
    name: "Market Analyst",
    description: "Analyzes market trends and opportunities",
    status: "active",
    type: "analytical",
    strategy_type: "trend_following",
    risk_level: "medium",
    target_markets: ["BTC/USD", "ETH/USD"],
    execution_mode: "dry-run",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_fallback: true,
    data_source: 'mock',
    performance_metrics: {
      win_rate: 67,
      profit_loss: 8.2,
      total_trades: 24
    }
  },
  {
    id: "mock-agent-2",
    name: "Momentum Trader",
    description: "Trading agent that focuses on momentum indicators",
    status: "paused",
    type: "trading",
    strategy_type: "momentum",
    risk_level: "high",
    target_markets: ["ETH/USD", "SOL/USD"],
    execution_mode: "dry-run",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    is_fallback: true,
    data_source: 'mock',
    performance_metrics: {
      win_rate: 52,
      profit_loss: 12.7,
      total_trades: 36
    }
  },
  {
    id: "mock-agent-3",
    name: "Market Research Assistant",
    description: "Researches market conditions and generates reports",
    status: "active",
    type: "research",
    risk_level: "low",
    target_markets: ["Crypto", "Equities"],
    execution_mode: "dry-run",
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    is_fallback: true,
    data_source: 'mock',
    performance_metrics: {
      win_rate: 0,
      profit_loss: 0,
      total_trades: 0
    }
  }
];

// Formats error messages consistently
export const formatError = (error: any): string => {
  if (!error) return "Unknown error occurred";
  
  if (typeof error === 'string') return error;
  
  if (error instanceof Error) return error.message;
  
  if (error.message) return error.message;
  
  if (typeof error === 'object' && Object.keys(error).length === 0) {
    return "Connection error - service may be unavailable";
  }
  
  try {
    return JSON.stringify(error);
  } catch {
    return "An unexpected error occurred";
  }
};

// Main hook for ElizaOS with fallback capabilities
export default function useElizaAgentsWithFallback() {
  // State management
  const [agents, setAgents] = useState<AgentWithFallback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [dataSource, setDataSource] = useState<'api' | 'cache' | 'mock' | null>(null);
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false);
  
  // Integrations
  const elizaOS = useElizaOS();
  const supabase = createBrowserClient();
  
  // Local storage for cached agents
  const [cachedAgents, setCachedAgents] = useLocalStorage<AgentWithFallback[]>(
    'cached_eliza_agents', 
    []
  );
  
  // Check if Supabase is available
  const isSupabaseAvailable = useCallback(async () => {
    if (!supabase) return false;
    
    try {
      const { error } = await supabase.from('agents').select('count', { count: 'exact', head: true });
      return !error;
    } catch (err) {
      console.warn('Supabase connection test failed:', formatError(err));
      return false;
    }
  }, [supabase]);
  
  // Check if ElizaOS is available
  const isElizaOSAvailable = useCallback(() => {
    return elizaOS && 
           typeof elizaOS.loadAgents === 'function' && 
           typeof elizaOS.agents !== 'undefined';
  }, [elizaOS]);

  // Fetch agents with fallback strategy
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First try ElizaOS API
      if (isElizaOSAvailable()) {
        try {
          await elizaOS.loadAgents();
          
          if (elizaOS.agents && Array.isArray(elizaOS.agents) && elizaOS.agents.length > 0) {
            const apiAgents = elizaOS.agents.map(agent => ({
              ...agent,
              is_fallback: false,
              data_source: 'api' as const
            }));
            
            setAgents(apiAgents);
            setCachedAgents(apiAgents); // Update cache
            setIsConnected(true);
            setDataSource('api');
            setError(null);
            setLoading(false);
            return;
          }
        } catch (elizaError) {
          console.warn('ElizaOS service error:', formatError(elizaError));
          // Continue to fallback
        }
      }
      
      // Then try direct Supabase query
      if (await isSupabaseAvailable()) {
        try {
          const { data, error: supaError } = await supabase
            .from('agents')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (supaError) throw supaError;
          
          if (data && data.length > 0) {
            const dbAgents = data.map(agent => ({
              ...agent,
              is_fallback: false,
              data_source: 'api' as const,
            }));
            
            setAgents(dbAgents);
            setCachedAgents(dbAgents); // Update cache
            setIsConnected(true);
            setDataSource('api');
            setError(null);
            setLoading(false);
            return;
          }
        } catch (supaError) {
          console.warn('Supabase query error:', formatError(supaError));
          // Continue to fallback
        }
      }
      
      // If we get here, API access failed - check cache
      if (cachedAgents && cachedAgents.length > 0) {
        setAgents(cachedAgents.map(agent => ({
          ...agent,
          is_fallback: true,
          data_source: 'cache' as const
        })));
        setIsConnected(false);
        setDataSource('cache');
        setError('Using cached data - backend connection unavailable');
        setLoading(false);
        return;
      }
      
      // Last resort - use mock data
      setAgents(mockElizaAgents);
      setIsConnected(false);
      setDataSource('mock');
      setError('Using mock data - backend connection unavailable');
      setLoading(false);
      
    } catch (error) {
      console.error('Error fetching agents:', error);
      setError(formatError(error) || 'Failed to fetch agents');
      setIsConnected(false);
      
      // Use mock data if everything fails
      setAgents(mockElizaAgents);
      setDataSource('mock');
    } finally {
      setLoading(false);
    }
  }, [elizaOS, supabase, cachedAgents, setCachedAgents, isElizaOSAvailable, isSupabaseAvailable]);

  // Create agent with fallback
  const createAgent = useCallback(async (agentData: Partial<AgentWithFallback>) => {
    try {
      // First try direct API endpoint
      try {
        const response = await fetch('/api/agents/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(agentData),
        });
        
        if (response.ok) {
          const data = await response.json();
          await fetchAgents(); // Refresh the list
          return data;
        }
      } catch (apiError) {
        console.warn('Direct API creation failed:', formatError(apiError));
        // Continue to fallback
      }
      
      // Try ElizaOS service
      if (isElizaOSAvailable() && typeof elizaOS.createAgent === 'function') {
        try {
          const result = await elizaOS.createAgent(agentData);
          if (result) {
            await fetchAgents(); // Refresh the list
            return result;
          }
        } catch (elizaError) {
          console.warn('ElizaOS creation failed:', formatError(elizaError));
          // Continue to fallback
        }
      }
      
      // Try Supabase direct
      if (await isSupabaseAvailable()) {
        // Prepare agent data
        const now = new Date().toISOString();
        const newAgent = {
          ...agentData,
          created_at: now,
          updated_at: now,
          status: agentData.status || 'initializing'
        };
        
        const { data, error: createError } = await supabase
          .from('agents')
          .insert([newAgent])
          .select()
          .single();
        
        if (createError) throw createError;
        
        if (data) {
          await fetchAgents(); // Refresh the list
          return data;
        }
      }
      
      throw new Error('All agent creation methods failed');
      
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }, [elizaOS, supabase, fetchAgents, isElizaOSAvailable, isSupabaseAvailable]);

  // Update agent with fallback
  const updateAgent = useCallback(async (id: string, updates: Partial<AgentWithFallback>) => {
    try {
      // First try ElizaOS service
      if (isElizaOSAvailable() && typeof elizaOS.updateAgent === 'function') {
        try {
          const result = await elizaOS.updateAgent(id, updates);
          if (result) {
            await fetchAgents(); // Refresh the list
            return result;
          }
        } catch (elizaError) {
          console.warn('ElizaOS update failed:', formatError(elizaError));
          // Continue to fallback
        }
      }
      
      // Try direct API endpoint
      try {
        const response = await fetch(`/api/agents/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });
        
        if (response.ok) {
          const data = await response.json();
          await fetchAgents(); // Refresh the list
          return data;
        }
      } catch (apiError) {
        console.warn('Direct API update failed:', formatError(apiError));
        // Continue to fallback
      }
      
      // Try Supabase direct
      if (await isSupabaseAvailable()) {
        const { data, error: updateError } = await supabase
          .from('agents')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        
        if (data) {
          await fetchAgents(); // Refresh the list
          return data;
        }
      }
      
      throw new Error('All agent update methods failed');
      
    } catch (error) {
      console.error('Error updating agent:', error);
      throw error;
    }
  }, [elizaOS, supabase, fetchAgents, isElizaOSAvailable, isSupabaseAvailable]);

  // Delete agent with fallback
  const deleteAgent = useCallback(async (id: string) => {
    try {
      // First try ElizaOS service
      if (isElizaOSAvailable() && typeof elizaOS.deleteAgent === 'function') {
        try {
          const result = await elizaOS.deleteAgent(id);
          if (result) {
            await fetchAgents(); // Refresh the list
            return result;
          }
        } catch (elizaError) {
          console.warn('ElizaOS deletion failed:', formatError(elizaError));
          // Continue to fallback
        }
      }
      
      // Try direct API endpoint
      try {
        const response = await fetch(`/api/agents/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          await fetchAgents(); // Refresh the list
          return true;
        }
      } catch (apiError) {
        console.warn('Direct API deletion failed:', formatError(apiError));
        // Continue to fallback
      }
      
      // Try Supabase direct
      if (await isSupabaseAvailable()) {
        const { error: deleteError } = await supabase
          .from('agents')
          .delete()
          .eq('id', id);
        
        if (deleteError) throw deleteError;
        
        await fetchAgents(); // Refresh the list
        return true;
      }
      
      throw new Error('All agent deletion methods failed');
      
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  }, [elizaOS, supabase, fetchAgents, isElizaOSAvailable, isSupabaseAvailable]);

  // Set up Supabase real-time subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!supabase) return null;
    
    try {
      const channel = supabase
        .channel('agents_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'agents' }, 
          (payload) => {
            console.log('Change received!', payload);
            fetchAgents();
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('Channel subscription error');
            setIsConnected(false);
          }
        });
        
      return channel;
    } catch (error) {
      console.error("Error setting up real-time subscription:", error);
      setIsConnected(false);
      return null;
    }
  }, [supabase, fetchAgents]);

  // Initialize and set up subscriptions
  useEffect(() => {
    // Check if we're in development mode
    setIsDevelopmentMode(process.env.NODE_ENV === 'development');
    
    // Fetch agents on mount
    fetchAgents();
    
    // Set up real-time subscription
    const subscription = setupRealtimeSubscription();
    
    // Clean up on unmount
    return () => {
      if (subscription && supabase) {
        supabase.removeChannel(subscription);
      }
    };
  }, [fetchAgents, setupRealtimeSubscription, supabase]);

  return {
    agents,
    loading,
    error,
    isConnected,
    dataSource,
    isDevelopmentMode,
    createAgent,
    updateAgent,
    deleteAgent,
    refreshAgents: fetchAgents
  };
} 