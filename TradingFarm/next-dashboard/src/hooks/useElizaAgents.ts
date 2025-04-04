import { useState, useCallback, useEffect } from 'react';
import { elizaOSAgentService, ElizaAgent, ElizaAgentCreationRequest } from '@/services/elizaos-agent-service';
import { useToast } from '@/components/ui/use-toast';

export function useElizaAgents(farmId?: number) {
  const [agents, setAgents] = useState<ElizaAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch agents (optionally filtered by farm)
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let fetchedAgents: ElizaAgent[];
      
      if (farmId) {
        fetchedAgents = await elizaOSAgentService.getAgentsByFarm(farmId);
      } else {
        fetchedAgents = await elizaOSAgentService.getAgents();
      }
      
      setAgents(fetchedAgents);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred fetching agents';
      setError(errorMessage);
      toast({
        title: "Error Loading Agents",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [farmId, toast]);

  // Create an agent
  const createAgent = useCallback(async (
    name: string,
    farmId: number,
    config: {
      agentType: string;
      markets: string[];
      riskLevel: 'low' | 'medium' | 'high';
      apiAccess?: boolean;
      tradingPermissions?: string;
      autoRecovery?: boolean;
    }
  ): Promise<ElizaAgent> => {
    setLoading(true);
    setError(null);
    
    try {
      // Map the input format to the API format
      const requestData: ElizaAgentCreationRequest = {
        name,
        farmId,
        config: {
          agentType: config.agentType,
          markets: config.markets,
          risk_level: config.riskLevel,
          api_access: config.apiAccess || false,
          trading_permissions: config.tradingPermissions || 'read',
          auto_recovery: config.autoRecovery || true
        }
      };
      
      const newAgent = await elizaOSAgentService.createAgent(requestData);
      
      // Update local state
      setAgents(prev => [...prev, newAgent]);
      
      toast({
        title: "Agent Created",
        description: `${name} has been created successfully`,
      });
      
      return newAgent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
      setError(errorMessage);
      toast({
        title: "Error Creating Agent",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Update an agent
  const updateAgent = useCallback(async (
    id: string,
    updates: Partial<ElizaAgentCreationRequest>
  ): Promise<ElizaAgent> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedAgent = await elizaOSAgentService.updateAgent(id, updates);
      
      // Update local state
      setAgents(prev => 
        prev.map(agent => agent.id === id ? updatedAgent : agent)
      );
      
      toast({
        title: "Agent Updated",
        description: `${updatedAgent.name} has been updated successfully`,
      });
      
      return updatedAgent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update agent';
      setError(errorMessage);
      toast({
        title: "Error Updating Agent",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Delete an agent
  const deleteAgent = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await elizaOSAgentService.deleteAgent(id);
      
      // Update local state
      setAgents(prev => prev.filter(agent => agent.id !== id));
      
      toast({
        title: "Agent Deleted",
        description: "Agent has been deleted successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete agent';
      setError(errorMessage);
      toast({
        title: "Error Deleting Agent",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Control an agent (start, stop, pause, resume)
  const controlAgent = useCallback(async (
    id: string,
    action: 'start' | 'stop' | 'pause' | 'resume'
  ): Promise<ElizaAgent> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedAgent = await elizaOSAgentService.controlAgent(id, action);
      
      // Update local state
      setAgents(prev => 
        prev.map(agent => agent.id === id ? updatedAgent : agent)
      );
      
      const actionMap = {
        start: 'started',
        stop: 'stopped',
        pause: 'paused',
        resume: 'resumed'
      };
      
      toast({
        title: `Agent ${actionMap[action]}`,
        description: `${updatedAgent.name} has been ${actionMap[action]} successfully`,
      });
      
      return updatedAgent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} agent`;
      setError(errorMessage);
      toast({
        title: `Error ${action.charAt(0).toUpperCase() + action.slice(1)}ing Agent`,
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    loading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    controlAgent,
    refreshAgents: fetchAgents
  };
}
