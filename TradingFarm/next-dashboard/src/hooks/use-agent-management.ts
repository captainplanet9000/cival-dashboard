'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { agentManagementService } from '@/services/agent-management-service';
import { 
  TradingAgent, 
  TradingStrategy, 
  AgentConfig
} from '@/types/agent-types';

interface UseAgentManagementProps {
  onError?: (message: string) => void;
}

interface UseAgentManagementState {
  loading: boolean;
  agents: TradingAgent[];
  strategies: TradingStrategy[];
  selectedAgent: TradingAgent | null;
  totalAgents: number;
  error: string | null;
}

export function useAgentManagement({ onError }: UseAgentManagementProps = {}) {
  const { toast } = useToast();
  const [state, setState] = useState<UseAgentManagementState>({
    loading: false,
    agents: [],
    strategies: [],
    selectedAgent: null,
    totalAgents: 0,
    error: null,
  });

  // Helper to handle errors
  const handleError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }));
    if (onError) {
      onError(error);
    } else {
      toast({
        variant: "destructive",
        title: "Agent Error",
        description: error,
      });
    }
  }, [onError, toast]);

  // Check if agent system is enabled
  const isAgentSystemEnabled = useCallback(() => {
    return agentManagementService.isEnabled();
  }, []);

  // Load all agents
  const loadAgents = useCallback(async (limit = 50, offset = 0) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { data: agents, count } = await agentManagementService.getAgents(limit, offset);
      
      setState(prev => ({
        ...prev,
        agents,
        totalAgents: count,
        loading: false,
        error: null
      }));
      
      return agents;
    } catch (error) {
      handleError(`Error loading agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [handleError]);

  // Load strategies
  const loadStrategies = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const strategies = await agentManagementService.getStrategies();
      
      setState(prev => ({
        ...prev,
        strategies,
        loading: false,
        error: null
      }));
      
      return strategies;
    } catch (error) {
      handleError(`Error loading strategies: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [handleError]);

  // Get agent by ID
  const getAgentById = useCallback(async (agentId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const agent = await agentManagementService.getAgentById(agentId);
      
      if (agent) {
        setState(prev => ({
          ...prev,
          selectedAgent: agent,
          loading: false,
          error: null
        }));
      } else {
        handleError('Agent not found');
      }
      
      return agent;
    } catch (error) {
      handleError(`Error getting agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [handleError]);

  // Create a new agent
  const createAgent = useCallback(async (agentData: Partial<TradingAgent>) => {
    if (!isAgentSystemEnabled()) {
      handleError('Agent system is disabled');
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const agent = await agentManagementService.createAgent(agentData);
      
      if (agent) {
        setState(prev => ({
          ...prev,
          agents: [agent, ...prev.agents],
          selectedAgent: agent,
          totalAgents: prev.totalAgents + 1,
          loading: false,
          error: null
        }));
        
        toast({
          title: "Agent Created",
          description: `Successfully created agent: ${agent.name}`,
        });
      } else {
        handleError('Failed to create agent');
      }
      
      return agent;
    } catch (error) {
      handleError(`Error creating agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [handleError, isAgentSystemEnabled, toast]);

  // Update an existing agent
  const updateAgent = useCallback(async (agentId: string, agentData: Partial<TradingAgent>) => {
    if (!isAgentSystemEnabled()) {
      handleError('Agent system is disabled');
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const agent = await agentManagementService.updateAgent(agentId, agentData);
      
      if (agent) {
        setState(prev => ({
          ...prev,
          agents: prev.agents.map(a => a.id === agentId ? agent : a),
          selectedAgent: prev.selectedAgent?.id === agentId ? agent : prev.selectedAgent,
          loading: false,
          error: null
        }));
        
        toast({
          title: "Agent Updated",
          description: `Successfully updated agent: ${agent.name}`,
        });
      } else {
        handleError('Failed to update agent');
      }
      
      return agent;
    } catch (error) {
      handleError(`Error updating agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [handleError, isAgentSystemEnabled, toast]);

  // Update agent configuration
  const updateAgentConfig = useCallback(async (agentId: string, config: Partial<AgentConfig>) => {
    if (!isAgentSystemEnabled()) {
      handleError('Agent system is disabled');
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const success = await agentManagementService.updateAgentConfig(agentId, config);
      
      if (success) {
        // Refresh agent data to get updated config
        await getAgentById(agentId);
        
        toast({
          title: "Configuration Updated",
          description: "Agent configuration has been updated successfully",
        });
      } else {
        handleError('Failed to update agent configuration');
      }
      
      return success;
    } catch (error) {
      handleError(`Error updating agent config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [getAgentById, handleError, isAgentSystemEnabled, toast]);

  // Start an agent
  const startAgent = useCallback(async (agentId: string) => {
    if (!isAgentSystemEnabled()) {
      handleError('Agent system is disabled');
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const success = await agentManagementService.startAgent(agentId);
      
      if (success) {
        // Update agent status in state to 'starting'
        setState(prev => ({
          ...prev,
          agents: prev.agents.map(a => a.id === agentId ? { ...a, status: 'starting' } : a),
          selectedAgent: prev.selectedAgent?.id === agentId ? 
            { ...prev.selectedAgent, status: 'starting' } : prev.selectedAgent,
          loading: false,
          error: null
        }));
        
        toast({
          title: "Agent Starting",
          description: "Agent is now starting and will be active shortly",
        });
        
        // After a delay, refresh the agent to get updated status
        setTimeout(() => {
          getAgentById(agentId);
        }, 3000);
      } else {
        handleError('Failed to start agent');
      }
      
      return success;
    } catch (error) {
      handleError(`Error starting agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [getAgentById, handleError, isAgentSystemEnabled, toast]);

  // Stop an agent
  const stopAgent = useCallback(async (agentId: string) => {
    if (!isAgentSystemEnabled()) {
      handleError('Agent system is disabled');
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const success = await agentManagementService.stopAgent(agentId);
      
      if (success) {
        // Update agent status in state to 'stopping'
        setState(prev => ({
          ...prev,
          agents: prev.agents.map(a => a.id === agentId ? { ...a, status: 'stopping' } : a),
          selectedAgent: prev.selectedAgent?.id === agentId ? 
            { ...prev.selectedAgent, status: 'stopping' } : prev.selectedAgent,
          loading: false,
          error: null
        }));
        
        toast({
          title: "Agent Stopping",
          description: "Agent is now stopping and will be idle shortly",
        });
        
        // After a delay, refresh the agent to get updated status
        setTimeout(() => {
          getAgentById(agentId);
        }, 3000);
      } else {
        handleError('Failed to stop agent');
      }
      
      return success;
    } catch (error) {
      handleError(`Error stopping agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [getAgentById, handleError, isAgentSystemEnabled, toast]);

  // Delete an agent
  const deleteAgent = useCallback(async (agentId: string) => {
    if (!isAgentSystemEnabled()) {
      handleError('Agent system is disabled');
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const success = await agentManagementService.deleteAgent(agentId);
      
      if (success) {
        setState(prev => ({
          ...prev,
          agents: prev.agents.filter(a => a.id !== agentId),
          selectedAgent: prev.selectedAgent?.id === agentId ? null : prev.selectedAgent,
          totalAgents: prev.totalAgents - 1,
          loading: false,
          error: null
        }));
        
        toast({
          title: "Agent Deleted",
          description: "Agent has been successfully deleted",
        });
      } else {
        handleError('Failed to delete agent');
      }
      
      return success;
    } catch (error) {
      handleError(`Error deleting agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [handleError, isAgentSystemEnabled, toast]);

  // Get agent performance
  const getAgentPerformance = useCallback(async (agentId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const performance = await agentManagementService.getAgentPerformance(agentId);
      setState(prev => ({ ...prev, loading: false }));
      return performance;
    } catch (error) {
      handleError(`Error getting agent performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [handleError]);

  // Get agent trades
  const getAgentTrades = useCallback(async (agentId: string, limit = 50, offset = 0) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const trades = await agentManagementService.getAgentTrades(agentId, limit, offset);
      setState(prev => ({ ...prev, loading: false }));
      return trades;
    } catch (error) {
      handleError(`Error getting agent trades: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [handleError]);

  // Load agents for a specific farm
  const loadAgentsByFarm = useCallback(async (farmId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const agents = await agentManagementService.getAgentsByFarm(farmId);
      
      setState(prev => ({
        ...prev,
        agents,
        loading: false,
        error: null
      }));
      
      return agents;
    } catch (error) {
      handleError(`Error loading farm agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [handleError]);

  return {
    // State
    ...state,
    isAgentSystemEnabled: isAgentSystemEnabled(),
    
    // Methods
    loadAgents,
    loadStrategies,
    getAgentById,
    createAgent,
    updateAgent,
    updateAgentConfig,
    startAgent,
    stopAgent,
    deleteAgent,
    getAgentPerformance,
    getAgentTrades,
    loadAgentsByFarm
  };
}
