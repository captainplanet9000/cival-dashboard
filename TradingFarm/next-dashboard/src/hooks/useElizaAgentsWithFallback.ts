/**
 * useElizaAgentsWithFallback Hook
 * 
 * A robust hook for fetching ElizaOS agents with automatic fallback to mock data
 * when authentication fails or when the backend services are unavailable.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { mockElizaAgents, mockDataService } from '@/services/mock-data-service';

interface AgentCreateParams {
  name: string;
  description?: string;
  config?: Record<string, any>;
}

interface AgentWithFallback {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'initializing' | 'error' | 'inactive';
  farm_id?: number;
  farm_name?: string;
  type: 'trading' | 'analytical' | 'research' | 'conversational';
  created_at: string;
  updated_at: string;
  user_id?: string;
  execution_mode: 'live' | 'dry-run' | 'backtest';
  config?: Record<string, any>;
  is_fallback?: boolean;
}

interface UseElizaAgentsWithFallbackResult {
  agents: AgentWithFallback[];
  loading: boolean;
  error: string | null;
  createAgent: (params: AgentCreateParams) => Promise<AgentWithFallback>;
  updateAgent: (id: string, updates: Partial<AgentWithFallback>) => Promise<AgentWithFallback | null>;
  deleteAgent: (id: string) => Promise<boolean>;
  refreshAgents: () => Promise<void>;
  isConnected: boolean;
}

/**
 * Hook for working with ElizaOS agents with built-in fallback for development/offline scenarios
 */
export function useElizaAgentsWithFallback(): UseElizaAgentsWithFallbackResult {
  const [agents, setAgents] = useState<AgentWithFallback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const supabase = createBrowserClient();
  const router = useRouter();
  const { toast } = useToast();

  // Load agents from supabase and/or localStorage
  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to load from Supabase first
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (userId) {
        try {
          // Get agents from database
          const { data: agentsData, error: agentsError } = await supabase
            .from('agents')
            .select('*, farms(name)')
            .eq('user_id', userId);
            
          if (agentsError) {
            throw agentsError;
          }
          
          if (agentsData && agentsData.length > 0) {
            // Format agents with farm name
            const formattedAgents = agentsData.map(agent => ({
              ...agent,
              farm_name: agent.farms?.name || undefined,
              is_fallback: false
            }));
            
            setAgents(formattedAgents);
            setIsConnected(true);
            
            // Save to localStorage as fallback cache
            localStorage.setItem('cached_agents', JSON.stringify(formattedAgents));
            
            return;
          }
        } catch (supabaseError) {
          console.warn('Error loading agents from Supabase:', supabaseError);
          setIsConnected(false);
        }
      }
      
      // If we get here, either:
      // 1. User is not authenticated
      // 2. There was an error loading from Supabase
      // 3. No agents were found
      
      // Try to load from localStorage cache
      const cachedAgents = localStorage.getItem('cached_agents');
      if (cachedAgents) {
        try {
          const parsedAgents = JSON.parse(cachedAgents);
          if (Array.isArray(parsedAgents) && parsedAgents.length > 0) {
            // Mark these as cached
            const markedAgents = parsedAgents.map(agent => ({
              ...agent,
              is_fallback: true
            }));
            setAgents(markedAgents);
            
            toast({
              title: 'Using cached agents',
              description: 'Unable to connect to server. Using cached data.',
              variant: 'default'
            });
            
            return;
          }
        } catch (parseError) {
          console.warn('Error parsing cached agents:', parseError);
        }
      }
      
      // If we get here, no agents were found in Supabase or localStorage
      // Create a demo agent in development mode
      if (process.env.NODE_ENV === 'development') {
        const demoAgent: AgentWithFallback = {
          id: 'demo-1',
          name: 'Demo Trading Agent',
          description: 'A demo agent for development purposes',
          status: 'active',
          type: 'trading',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          execution_mode: 'dry-run',
          is_fallback: true,
          farm_id: 999,
          farm_name: 'Development Farm',
          config: {
            strategy_type: 'momentum',
            risk_level: 'medium',
            target_markets: ['BTC/USD', 'ETH/USD']
          }
        };
        
        setAgents([demoAgent]);
        
        toast({
          title: 'Development Mode',
          description: 'Using demo agent for development.',
          variant: 'default'
        });
      } else {
        // In production, show empty state
        setAgents([]);
        
        toast({
          title: 'No Agents Found',
          description: 'Create your first agent to get started.',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error in loadAgents:', error);
      setError('Failed to load agents. Please try again.');
      setIsConnected(false);
      
      toast({
        title: 'Connection Error',
        description: 'Failed to load agents. Check your connection.',
        variant: 'destructive'
      });
      
      // Try to load from localStorage as fallback
      try {
        const cachedAgents = localStorage.getItem('cached_agents');
        if (cachedAgents) {
          const parsedAgents = JSON.parse(cachedAgents);
          if (Array.isArray(parsedAgents)) {
            // Mark these as cached
            const markedAgents = parsedAgents.map(agent => ({
              ...agent,
              is_fallback: true
            }));
            setAgents(markedAgents);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  // Create a new agent
  const createAgent = useCallback(async (params: AgentCreateParams): Promise<AgentWithFallback> => {
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) {
        throw new Error('You must be authenticated to create an agent');
      }
      
      // Generate timestamp for now
      const now = new Date().toISOString();
      
      // Create the agent data
      const agentData = {
        name: params.name,
        description: params.description || '',
        user_id: userId,
        status: 'initializing',
        type: 'trading',
        execution_mode: 'dry-run',
        created_at: now,
        updated_at: now,
        config: params.config || {}
      };
      
      // Try to insert into database
      const { data: createdAgent, error: createError } = await supabase
        .from('agents')
        .insert([agentData])
        .select('*, farms(name)')
        .single();
      
      if (createError) {
        throw createError;
      }
      
      if (!createdAgent) {
        throw new Error('Failed to create agent');
      }
      
      // Format the created agent
      const formattedAgent: AgentWithFallback = {
        ...createdAgent,
        farm_name: createdAgent.farms?.name,
        is_fallback: false
      };
      
      // Update state
      setAgents(prev => [formattedAgent, ...prev]);
      
      // Also cache locally
      const cachedAgents = JSON.parse(localStorage.getItem('cached_agents') || '[]');
      localStorage.setItem('cached_agents', JSON.stringify([formattedAgent, ...cachedAgents]));
      
      return formattedAgent;
    } catch (error) {
      console.error('Error creating agent:', error);
      
      // If in development, create a mock agent
      if (process.env.NODE_ENV === 'development') {
        const mockAgent: AgentWithFallback = {
          id: `mock-${Date.now()}`,
          name: params.name,
          description: params.description || 'Mock agent for development',
          status: 'active',
          type: 'trading',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          execution_mode: 'dry-run',
          is_fallback: true,
          config: params.config || {}
        };
        
        // Update state with mock agent
        setAgents(prev => [mockAgent, ...prev]);
        
        // Store in localStorage
        const mockAgents = JSON.parse(localStorage.getItem('mockAgents') || '[]');
        localStorage.setItem('mockAgents', JSON.stringify([...mockAgents, mockAgent]));
        
        toast({
          title: 'Development Mode',
          description: 'Created mock agent for development.',
          variant: 'default'
        });
        
        return mockAgent;
      }
      
      toast({
        title: 'Agent Creation Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
      
      throw error;
    }
  }, [supabase, toast]);

  // Update an existing agent
  const updateAgent = useCallback(async (id: string, updates: Partial<AgentWithFallback>): Promise<AgentWithFallback | null> => {
    try {
      // Check if this is a fallback agent
      const agent = agents.find(a => a.id === id);
      if (agent?.is_fallback) {
        // For fallback agents, just update locally
        const updatedAgent = { ...agent, ...updates, updated_at: new Date().toISOString() };
        
        setAgents(prev => prev.map(a => a.id === id ? updatedAgent : a));
        
        // Update localStorage
        const mockAgents = JSON.parse(localStorage.getItem('mockAgents') || '[]');
        localStorage.setItem('mockAgents', JSON.stringify(
          mockAgents.map((a: any) => a.id === id ? { ...a, ...updates } : a)
        ));
        
        return updatedAgent;
      }
      
      // For real agents, update in database
      const { data: updatedAgent, error: updateError } = await supabase
        .from('agents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, farms(name)')
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      if (!updatedAgent) {
        throw new Error('Failed to update agent');
      }
      
      // Format the updated agent
      const formattedAgent: AgentWithFallback = {
        ...updatedAgent,
        farm_name: updatedAgent.farms?.name,
        is_fallback: false
      };
      
      // Update state
      setAgents(prev => prev.map(a => a.id === id ? formattedAgent : a));
      
      // Update cache
      const cachedAgents = JSON.parse(localStorage.getItem('cached_agents') || '[]');
      localStorage.setItem('cached_agents', JSON.stringify(
        cachedAgents.map((a: any) => a.id === id ? formattedAgent : a)
      ));
      
      return formattedAgent;
    } catch (error) {
      console.error('Error updating agent:', error);
      
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update agent',
        variant: 'destructive'
      });
      
      return null;
    }
  }, [agents, supabase, toast]);

  // Delete an agent
  const deleteAgent = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Check if this is a fallback agent
      const agent = agents.find(a => a.id === id);
      if (agent?.is_fallback) {
        // For fallback agents, just remove locally
        setAgents(prev => prev.filter(a => a.id !== id));
        
        // Update localStorage
        const mockAgents = JSON.parse(localStorage.getItem('mockAgents') || '[]');
        localStorage.setItem('mockAgents', JSON.stringify(
          mockAgents.filter((a: any) => a.id !== id)
        ));
        
        return true;
      }
      
      // For real agents, delete from database
      const { error: deleteError } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        throw deleteError;
      }
      
      // Update state
      setAgents(prev => prev.filter(a => a.id !== id));
      
      // Update cache
      const cachedAgents = JSON.parse(localStorage.getItem('cached_agents') || '[]');
      localStorage.setItem('cached_agents', JSON.stringify(
        cachedAgents.filter((a: any) => a.id !== id)
      ));
      
      return true;
    } catch (error) {
      console.error('Error deleting agent:', error);
      
      toast({
        title: 'Deletion Failed',
        description: error instanceof Error ? error.message : 'Failed to delete agent',
        variant: 'destructive'
      });
      
      return false;
    }
  }, [agents, supabase, toast]);

  // Refresh agents
  const refreshAgents = useCallback(async () => {
    await loadAgents();
  }, [loadAgents]);

  // Initial load
  useEffect(() => {
    loadAgents();
    
    // Set up real-time subscription if possible
    const agentsSubscription = supabase
      .channel('agents_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, (payload) => {
        // Refresh agents when changes happen
        loadAgents();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(agentsSubscription);
    };
  }, [loadAgents, supabase]);

  return {
    agents,
    loading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    refreshAgents,
    isConnected
  };
}
