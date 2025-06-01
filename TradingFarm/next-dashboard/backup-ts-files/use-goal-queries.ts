/**
 * Goal-related React Query hooks for Trading Farm Dashboard
 * 
 * These hooks provide data fetching, caching, and state management
 * for goal-related data using TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api-service';
import { queryKeys } from '@/utils/react-query/query-keys';

/**
 * Hook to fetch all goals with optional filtering
 */
export function useGoals(filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.goals.list(filters),
    queryFn: () => api.goals.getGoals(filters),
  });
}

/**
 * Hook to fetch goals for a specific farm
 */
export function useFarmGoals(farmId: string) {
  return useQuery({
    queryKey: queryKeys.goals.list({ farm_id: farmId }),
    queryFn: () => api.goals.getGoals({ farm_id: farmId }),
    enabled: !!farmId, // Only run the query if we have a farm ID
  });
}

/**
 * Hook to fetch a single goal by ID
 */
export function useGoal(id: string) {
  return useQuery({
    queryKey: queryKeys.goals.detail(id),
    queryFn: () => api.goals.getGoalById(id),
    enabled: !!id, // Only run the query if we have an ID
  });
}

/**
 * Hook to create a new goal
 */
// [MIGRATION NOTICE] All goal mutation hooks have been consolidated and standardized in use-goals.ts.
// Only query/read hooks should remain in this file. Please use use-goals.ts for all mutations.

// [Legacy mutation hooks removed]
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (goalData: any) => api.goals.createGoal(goalData),
    onSuccess: (data) => {
      // Invalidate goals list queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.goals.lists(),
      });
      
      // If the goal is associated with a farm, invalidate farm details
      if (data.farm_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.farms.detail(data.farm_id),
        });
      }
      
      // Add the new goal to the cache
      queryClient.setQueryData(
        queryKeys.goals.detail(data.id),
        data
      );
    },
  });
}

/**
 * Hook to update an existing goal
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: { id: string, [key: string]: any }) => 
      api.goals.updateGoal(params),
    onSuccess: (data, variables) => {
      // Invalidate the specific goal detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.goals.detail(data.id),
      });
      
      // Invalidate goals list queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.goals.lists(),
      });
      
      // If farm_id is changing, invalidate both old and new farm details
      const oldFarmId = queryClient.getQueryData<any>(
        queryKeys.goals.detail(variables.id)
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
 * Hook to delete a goal
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.goals.deleteGoal(id),
    onMutate: async (id) => {
      // Get the goal data before deleting
      const previousGoal = queryClient.getQueryData<any>(
        queryKeys.goals.detail(id)
      );
      
      return { previousGoal };
    },
    onSuccess: (_, id, context) => {
      // Remove the goal from the cache
      queryClient.removeQueries({
        queryKey: queryKeys.goals.detail(id),
      });
      
      // Invalidate goals list queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.goals.lists(),
      });
      
      // If the goal was associated with a farm, invalidate farm details
      if (context?.previousGoal?.farm_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.farms.detail(context.previousGoal.farm_id),
        });
      }
    },
  });
}
