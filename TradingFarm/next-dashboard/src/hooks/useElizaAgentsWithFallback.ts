/**
 * useElizaAgentsWithFallback Hook
 * 
 * A robust hook for fetching ElizaOS agents with automatic fallback to mock data
 * when authentication fails or when the backend services are unavailable.
 */

// @ts-ignore - React will be correctly imported by Next.js
import React from 'react';
const { useState, useEffect, useCallback } = React;
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { mockElizaAgents } from '@/services/mock-data-service';
import { ElizaAgent, ElizaAgentCreationRequest, elizaOSAgentService } from '@/services/elizaos-agent-service';

// Create params match ElizaAgentCreationRequest but with optional fields
interface AgentCreateParams {
  name: string;
  farmId: string;
  description?: string; // Added for compatibility
  config?: {
    agentType?: string;
    markets?: string[];
    risk_level?: 'low' | 'medium' | 'high';
    api_access?: boolean;
    trading_permissions?: string;
    auto_recovery?: boolean;
    max_concurrent_tasks?: number;
    llm_model?: string;
  };
}

// Match ElizaAgent interface with is_fallback flag and extra properties
export interface AgentWithFallback extends Partial<Omit<ElizaAgent, 'performance_metrics'>> {
  id: string; // Keep id required
  name: string; // Keep name required
  status: ElizaAgent['status']; // Keep status required
  created_at: string; // Keep created_at required
  updated_at: string; // Keep updated_at required
  performance_metrics?: ElizaAgent['performance_metrics'];
  is_fallback?: boolean;
  description?: string; // Add description for compatibility
  farm_name?: string; // Add farm_name for compatibility
  type?: string; // Add type for compatibility with previous code
  execution_mode?: string; // Add execution_mode for compatibility
  farm_id?: number; // Add farm_id for compatibility
  user_id?: string; // Add user_id for compatibility
}

interface UseElizaAgentsWithFallbackResult {
  agents: AgentWithFallback[];
  loading: boolean;
  error: string | null;
  createAgent: (params: AgentCreateParams) => Promise<AgentWithFallback>;
  updateAgent: (id: string, updates: Partial<AgentWithFallback>) => Promise<AgentWithFallback | null>;
  deleteAgent: (id: string) => Promise<boolean>;
  refreshAgents: () => Promise<void>;
  controlAgent: (id: string, action: 'start' | 'stop' | 'pause' | 'resume') => Promise<boolean>;
  isConnected: boolean;
  usingMockData: boolean;
}

/**
 * Hook for working with ElizaOS agents with built-in fallback for development/offline scenarios
 */
export function useElizaAgentsWithFallback(): UseElizaAgentsWithFallbackResult {
  const [agents, setAgents] = useState<AgentWithFallback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const supabase = createBrowserClient();
  const router = useRouter();
  const { toast } = useToast();

  // Load agents from elizaos-agent-service and/or localStorage
  const loadAgents = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to load from ElizaOS agent service first
      try {
        const elizaAgents = await elizaOSAgentService.getAgents();
        
        if (elizaAgents && elizaAgents.length > 0) {
          // Format agents
          const formattedAgents: AgentWithFallback[] = elizaAgents.map((agent: ElizaAgent) => ({
            ...agent,
            is_fallback: false
          }));
          
          setAgents(formattedAgents);
          setIsConnected(true);
          setUsingMockData(false);
          
          // Save to localStorage as fallback cache
          localStorage.setItem('cached_elizaos_agents', JSON.stringify(formattedAgents));
          
          return;
        }
      } catch (serviceError) {
        console.warn('Error loading agents from ElizaOS service:', serviceError);
        setIsConnected(false);
      }
      
      // If we get here, either:
      // 1. User is not authenticated
      // 2. There was an error loading from ElizaOS service
      // 3. No agents were found
      
      // Try to load from localStorage cache
      const cachedAgents = localStorage.getItem('cached_elizaos_agents');
      if (cachedAgents) {
        try {
          const parsedAgents = JSON.parse(cachedAgents);
          if (Array.isArray(parsedAgents) && parsedAgents.length > 0) {
            // Mark these as cached
            const markedAgents = parsedAgents.map((agent: any) => ({
              ...agent,
              is_fallback: true
            }));
            setAgents(markedAgents);
            setUsingMockData(true);
            
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
          farmId: '999', // Use string for newer interface
          farm_name: 'Development Farm',
          user_id: 'demo-user', // Add demo user ID
          config: {
            agentType: 'trading',
            markets: ['BTC/USD', 'ETH/USD'],
            risk_level: 'medium',
            api_access: true,
            trading_permissions: 'read-write',
            auto_recovery: true,
            max_concurrent_tasks: 3
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
            const markedAgents = parsedAgents.map((agent: any) => ({
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
        is_fallback: false
      };
      
      // Update state
      setAgents((prev: AgentWithFallback[]) => [formattedAgent, ...prev]);
      
      // Also cache locally
      const cachedAgents = JSON.parse(localStorage.getItem('cached_elizaos_agents') || '[]');
      localStorage.setItem('cached_elizaos_agents', JSON.stringify([formattedAgent, ...cachedAgents]));
      
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
          farmId: params.farmId || '999', // Use string for newer interface
          farm_name: 'Development Farm',
          user_id: 'mock-user', // Add mock user ID
          config: {
            agentType: params.config?.agentType || 'trading',
            markets: params.config?.markets || ['BTC/USD', 'ETH/USD'],
            risk_level: params.config?.risk_level || 'medium',
            api_access: params.config?.api_access !== undefined ? params.config.api_access : true,
            trading_permissions: params.config?.trading_permissions || 'read-write',
            auto_recovery: params.config?.auto_recovery !== undefined ? params.config.auto_recovery : true,
            max_concurrent_tasks: params.config?.max_concurrent_tasks || 3,
            llm_model: params.config?.llm_model
          }
        };
        
        // Update state with mock agent
        setAgents((prev: AgentWithFallback[]) => [mockAgent, ...prev]);
        
        // Store in localStorage
        const mockAgents = JSON.parse(localStorage.getItem('mockElizaAgents') || '[]');
        localStorage.setItem('mockElizaAgents', JSON.stringify([...mockAgents, mockAgent]));
        
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
      const agent = agents.find((a: AgentWithFallback) => a.id === id);
      if (agent?.is_fallback) {
        // For fallback agents, just update locally
        const updatedAgent = { ...agent, ...updates, updated_at: new Date().toISOString() };
        
        setAgents((prev: AgentWithFallback[]) => prev.map((a: AgentWithFallback) => a.id === id ? updatedAgent : a));
        
        // Update localStorage
        const mockAgents = JSON.parse(localStorage.getItem('mockElizaAgents') || '[]');
        localStorage.setItem('mockElizaAgents', JSON.stringify(
          mockAgents.map((a: any) => a.id === id ? { ...a, ...updates } : a)
        ));
        
        return updatedAgent;
      }
      
      // For real agents, update in database using ElizaOS service
      const updatedAgent = await elizaOSAgentService.updateAgent(id, updates);
      
      if (!updatedAgent) {
        throw new Error('Failed to update agent');
      }
      
      // Format the updated agent
      const formattedAgent: AgentWithFallback = {
        ...updatedAgent,
        is_fallback: false
      };
      
      // Update state
      setAgents((prev: AgentWithFallback[]) => prev.map((a: AgentWithFallback) => a.id === id ? formattedAgent : a));
      
      // Update cache
      const cachedAgents = JSON.parse(localStorage.getItem('cached_elizaos_agents') || '[]');
      localStorage.setItem('cached_elizaos_agents', JSON.stringify(
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
      const agent = agents.find((a: AgentWithFallback) => a.id === id);
      if (agent?.is_fallback) {
        // For fallback agents, just remove locally
        setAgents((prev: AgentWithFallback[]) => prev.filter((a: AgentWithFallback) => a.id !== id));
        
        // Update localStorage
        const mockAgents = JSON.parse(localStorage.getItem('mockElizaAgents') || '[]');
        localStorage.setItem('mockElizaAgents', JSON.stringify(
          mockAgents.filter((a: any) => a.id !== id)
        ));
        
        return true;
      }
      
      // For real agents, use the ElizaOS agent service
      try {
        await elizaOSAgentService.deleteAgent(id);
        
        // Update state
        setAgents((prev: AgentWithFallback[]) => prev.filter((a: AgentWithFallback) => a.id !== id));
        
        // Update cache
        const cachedAgents = JSON.parse(localStorage.getItem('cached_elizaos_agents') || '[]');
        localStorage.setItem('cached_elizaos_agents', JSON.stringify(
          cachedAgents.filter((a: any) => a.id !== id)
        ));
        
        return true;
      } catch (error) {
        console.error('Error deleting agent with service:', error);
        throw error;
      }
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

  // Add control agent function (start, stop, pause, resume)
  const controlAgent = useCallback(async (id: string, action: 'start' | 'stop' | 'pause' | 'resume'): Promise<boolean> => {
    try {
      // Check if this is a fallback agent
      const agent = agents.find((a: AgentWithFallback) => a.id === id);
      if (agent?.is_fallback) {
        // For fallback agents, just update status locally
        let newStatus: ElizaAgent['status'];
        
        switch (action) {
          case 'start':
          case 'resume':
            newStatus = 'active';
            break;
          case 'stop':
            newStatus = 'idle';
            break;
          case 'pause':
            newStatus = 'paused';
            break;
          default:
            newStatus = 'idle';
        }
        
        const updatedAgent = {
          ...agent,
          status: newStatus,
          updated_at: new Date().toISOString()
        };
        
        setAgents((prev: AgentWithFallback[]) => prev.map((a: AgentWithFallback) => a.id === id ? updatedAgent : a));
        
        // Update localStorage
        const mockAgents = JSON.parse(localStorage.getItem('mockElizaAgents') || '[]');
        localStorage.setItem('mockElizaAgents', JSON.stringify(
          mockAgents.map((a: any) => a.id === id ? { ...a, status: newStatus } : a)
        ));
        
        return true;
      }
      
      // For real agents, use the service
      await elizaOSAgentService.controlAgent(id, action);
      await refreshAgents(); // Refresh to get updated status
      return true;
    } catch (error) {
      console.error(`Error ${action} agent:`, error);
      
      toast({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} Failed`,
        description: error instanceof Error ? error.message : `Failed to ${action} agent`,
        variant: 'destructive'
      });
      
      return false;
    }
  }, [agents, refreshAgents, toast]);
  
  // Initial load
  useEffect(() => {
    loadAgents();
    
    // Set up real-time subscription if possible
    const agentsSubscription = supabase
      .channel('elizaos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'elizaos_agents' }, (payload: any) => {
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
    controlAgent,
    isConnected,
    usingMockData
  };
}
