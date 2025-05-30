/**
 * Agent-related React Query hooks for Trading Farm Dashboard
 * 
 * These hooks provide data fetching, caching, and state management
 * for agent-related data using TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api-service';
import { queryKeys } from '@/utils/react-query/query-keys';

/**
 * Hook to fetch all agents with optional filtering
 */
export function useAgents(filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.agents.list(filters),
    queryFn: () => api.agents.getAgents(filters),
  });
}

/**
 * Hook to fetch agents for a specific farm
 */
export function useFarmAgents(farmId: string) {
  return useQuery({
    queryKey: queryKeys.agents.list({ farm_id: farmId }),
    queryFn: () => api.agents.getAgents({ farm_id: farmId }),
    enabled: !!farmId, // Only run the query if we have a farm ID
  });
}

/**
 * Hook to fetch a single agent by ID
 */
export function useAgent(id: string) {
  return useQuery({
    queryKey: queryKeys.agents.detail(id),
    queryFn: () => api.agents.getAgentById(id),
    enabled: !!id, // Only run the query if we have an ID
  });
}

/**
 * Hook to create a new agent
 */
export function useCreateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (agentData: any) => api.agents.createAgent(agentData),
    onSuccess: (data) => {
      // Invalidate agents list queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.lists(),
      });
      
      // If the agent is associated with a farm, invalidate farm details
      if (data.farm_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.farms.detail(data.farm_id),
        });
      }
      
      // Add the new agent to the cache
      queryClient.setQueryData(
        queryKeys.agents.detail(data.id),
        data
      );
    },
  });
}

/**
 * Hook to update an existing agent
 */
export function useUpdateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: { id: string, [key: string]: any }) => 
      api.agents.updateAgent(params),
    onSuccess: (data, variables) => {
      // Invalidate the specific agent detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.detail(data.id),
      });
      
      // Invalidate agents list queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.lists(),
      });
      
      // If farm_id is changing, invalidate both old and new farm details
      const oldFarmId = queryClient.getQueryData<any>(
        queryKeys.agents.detail(variables.id)
      )?.farm_id;
      
      if (oldFarmId && oldFarmId !== data.farm_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.farms.detail(oldFarmId),
        });
      }
      
      if (data.farm_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.farms.detail(data.farm_id),
        });
      }
    },
  });
}

/**
 * Hook to delete an agent
 */
export function useDeleteAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.agents.deleteAgent(id),
    onMutate: async (id) => {
      // Get the agent data before deleting
      const previousAgent = queryClient.getQueryData<any>(
        queryKeys.agents.detail(id)
      );
      
      return { previousAgent };
    },
    onSuccess: (_, id, context) => {
      // Remove the agent from the cache
      queryClient.removeQueries({
        queryKey: queryKeys.agents.detail(id),
      });
      
      // Invalidate agents list queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.lists(),
      });
      
      // If the agent was associated with a farm, invalidate farm details
      if (context?.previousAgent?.farm_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.farms.detail(context.previousAgent.farm_id),
        });
      }
    },
  });
}
