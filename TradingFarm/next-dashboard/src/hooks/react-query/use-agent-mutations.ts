import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api-service';
import { queryKeys } from '@/utils/react-query/query-keys';
import { toast } from '@/components/ui/use-toast';

// Type definitions
export interface AgentInput {
  farmId: string;
  name: string;
  description?: string;
  type: string;
  status: 'active' | 'paused' | 'inactive';
  configuration?: Record<string, any>;
  capabilities?: string[];
  metadata?: Record<string, any>;
  exchangeAccounts?: string[];
}

export interface AgentUpdateInput extends Partial<AgentInput> {
  id: string;
}

export interface AgentGoalInput {
  agentId: string;
  title: string;
  description: string;
  targetValue?: number;
  targetDate?: string;
  priority: 'low' | 'medium' | 'high';
  metrics?: Record<string, any>;
}

// Create a new agent
export function useCreateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (agent: AgentInput) => {
      const response = await apiService.post('/api/agents', agent);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate agents list query
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.list._def,
      });
      
      // Invalidate farm details as it contains agent counts
      if (data.farmId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.farms.detail(data.farmId)._def, 
        });
      }
      
      // Show success toast
      toast({
        title: 'Agent created',
        description: `Agent "${data.name}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create agent',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}

// Update an existing agent
export function useUpdateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (agent: AgentUpdateInput) => {
      const { id, ...data } = agent;
      const response = await apiService.put(`/api/agents/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific agent query
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.detail(variables.id)._def,
      });
      
      // Also invalidate the list query
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.list._def,
      });
      
      // Show success toast
      toast({
        title: 'Agent updated',
        description: `Agent "${data.name}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update agent',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}

// Delete an agent
export function useDeleteAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiService.delete(`/api/agents/${id}`);
      return id;
    },
    onSuccess: (id) => {
      // Invalidate agents list query
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.list._def,
      });
      
      // Remove specific agent from cache
      queryClient.removeQueries({
        queryKey: queryKeys.agents.detail(id)._def,
      });
      
      // Show success toast
      toast({
        title: 'Agent deleted',
        description: 'The agent has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete agent',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}

// Activate an agent
export function useActivateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (agentId: string) => {
      const response = await apiService.post(`/api/agents/${agentId}/activate`);
      return response.data;
    },
    onMutate: async (agentId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.agents.detail(agentId)._def,
      });
      
      // Get the current agent from the cache
      const previousAgent = queryClient.getQueryData(
        queryKeys.agents.detail(agentId)._def
      );
      
      // Optimistically update the agent status
      if (previousAgent) {
        queryClient.setQueryData(
          queryKeys.agents.detail(agentId)._def,
          {
            ...previousAgent,
            status: 'active',
          }
        );
      }
      
      return { previousAgent };
    },
    onSuccess: (data, agentId) => {
      // Invalidate agent details
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.detail(agentId)._def,
      });
      
      // Show success toast
      toast({
        title: 'Agent activated',
        description: 'The agent has been activated successfully.',
      });
    },
    onError: (error, agentId, context) => {
      // If the mutation fails, revert the optimistic update
      if (context?.previousAgent) {
        queryClient.setQueryData(
          queryKeys.agents.detail(agentId)._def,
          context.previousAgent
        );
      }
      
      toast({
        title: 'Failed to activate agent',
        description: error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}

// Pause an agent
export function usePauseAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (agentId: string) => {
      const response = await apiService.post(`/api/agents/${agentId}/pause`);
      return response.data;
    },
    onMutate: async (agentId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.agents.detail(agentId)._def,
      });
      
      // Get the current agent from the cache
      const previousAgent = queryClient.getQueryData(
        queryKeys.agents.detail(agentId)._def
      );
      
      // Optimistically update the agent status
      if (previousAgent) {
        queryClient.setQueryData(
          queryKeys.agents.detail(agentId)._def,
          {
            ...previousAgent,
            status: 'paused',
          }
        );
      }
      
      return { previousAgent };
    },
    onSuccess: (data, agentId) => {
      // Invalidate agent details
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.detail(agentId)._def,
      });
      
      // Show success toast
      toast({
        title: 'Agent paused',
        description: 'The agent has been paused successfully.',
      });
    },
    onError: (error, agentId, context) => {
      // If the mutation fails, revert the optimistic update
      if (context?.previousAgent) {
        queryClient.setQueryData(
          queryKeys.agents.detail(agentId)._def,
          context.previousAgent
        );
      }
      
      toast({
        title: 'Failed to pause agent',
        description: error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}

// Add a goal to an agent
export function useAddAgentGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (goalData: AgentGoalInput) => {
      const { agentId, ...data } = goalData;
      const response = await apiService.post(`/api/agents/${agentId}/goals`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate agent goals
      queryClient.invalidateQueries({
        queryKey: queryKeys.goals.list(variables.agentId)._def,
      });
      
      // Invalidate agent details as goal count might be included
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.detail(variables.agentId)._def,
      });
      
      // Show success toast
      toast({
        title: 'Goal added',
        description: `Goal "${data.title}" has been added to the agent.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add goal',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}
