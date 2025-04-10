'use client';

import React from 'react';
import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  QueryKey
} from '@tanstack/react-query';
import { enhancedGoalService } from '@/services/enhanced-goal-service';
import { 
  Goal, 
  GoalStrategy,
  CreateGoalInput, 
  UpdateGoalInput 
} from '@/schemas/goal-schemas';
import { toast } from '@/components/ui/use-toast';

// Query keys for goals
export const goalKeys = {
  all: ['goals'] as const,
  lists: () => [...goalKeys.all, 'list'] as const,
  list: (farmId?: number) => [...goalKeys.lists(), { farmId }] as const,
  details: () => [...goalKeys.all, 'detail'] as const,
  detail: (id: string) => [...goalKeys.details(), id] as const,
  agents: (goalId: string) => [...goalKeys.detail(goalId), 'agents'] as const,
  dependencies: (goalId: string) => [...goalKeys.detail(goalId), 'dependencies'] as const,
  children: (goalId: string) => [...goalKeys.detail(goalId), 'children'] as const,
};

/**
 * Hook to fetch all goals or goals for a specific farm
 */
export function useGoals(farmId?: number, limit = 50, offset = 0) {
  return useQuery({
    queryKey: goalKeys.list(farmId),
    queryFn: async () => {
      const { data, error, count, total } = await enhancedGoalService.getGoals(farmId, limit, offset);
      
      if (error) {
        throw new Error(error);
      }
      
      return { 
        goals: data || [], 
        count: count || 0, 
        total: total || 0 
      };
    },
  });
}

/**
 * Hook to fetch a specific goal by ID
 */
export function useGoal(id: string) {
  return useQuery({
    queryKey: goalKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await enhancedGoalService.getGoalById(id);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    enabled: !!id, // Only run the query if we have an ID
  });
}

/**
 * Hook to create goal subscription
 * This hook sets up the real-time subscription and returns the current goals state
 */
export function useGoalSubscription(farmId?: number) {
  const queryClient = useQueryClient();
  
  const queryResult = useGoals(farmId);
  
  // Set up real-time subscription
  React.useEffect(() => {
    // Function to handle subscription updates
    const handleGoalUpdates = (goals: Goal[]) => {
      // Update the query cache with the new goals
      queryClient.setQueryData(
        goalKeys.list(farmId), 
        (oldData: any) => ({
          ...oldData,
          goals,
        })
      );
    };
    
    // Subscribe to goal changes
    const unsubscribe = enhancedGoalService.subscribeToGoals(handleGoalUpdates, farmId);
    
    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [farmId, queryClient]);
  
  return queryResult;
}

/**
 * Hook to fetch child goals
 */
export function useChildGoals(goalId: string) {
  return useQuery({
    queryKey: goalKeys.children(goalId),
    queryFn: async () => {
      const { data, error } = await enhancedGoalService.getChildGoals(goalId);
      
      if (error) {
        throw new Error(error);
      }
      
      return data || [];
    },
    enabled: !!goalId, // Only run the query if we have a goalId
  });
}

/**
 * Hook to check if goal can be started
 */
export function useCanStartGoal(goalId: string) {
  return useQuery({
    queryKey: [...goalKeys.detail(goalId), 'canStart'],
    queryFn: async () => {
      const { data, error } = await enhancedGoalService.canStartGoal(goalId);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    enabled: !!goalId, // Only run the query if we have a goalId
  });
}

/**
 * Hook to create a new goal
 */
export function useCreateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (goalData: CreateGoalInput) => {
      const { data, error } = await enhancedGoalService.createGoal(goalData);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    onSuccess: (newGoal) => {
      // Invalidate the goals list query to refetch the data
      queryClient.invalidateQueries({ 
        queryKey: goalKeys.list(
          typeof newGoal.farm_id === 'string' 
            ? parseInt(newGoal.farm_id) 
            : newGoal.farm_id
        ) 
      });
      
      // Show success toast
      toast({
        title: 'Goal created',
        description: `Goal "${newGoal.name}" has been created successfully.`,
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error creating goal',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update an existing goal
 */
export function useUpdateGoal(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (goalData: UpdateGoalInput) => {
      const { data, error } = await enhancedGoalService.updateGoal(id, goalData);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    onSuccess: (updatedGoal) => {
      // Get the farm ID for invalidating the list query
      const farmId = typeof updatedGoal.farm_id === 'string' 
        ? parseInt(updatedGoal.farm_id) 
        : updatedGoal.farm_id;
      
      // Invalidate both the list and the detail queries
      queryClient.invalidateQueries({ queryKey: goalKeys.list(farmId) });
      queryClient.invalidateQueries({ queryKey: goalKeys.detail(id) });
      
      // Show success toast
      toast({
        title: 'Goal updated',
        description: `Goal "${updatedGoal.name}" has been updated successfully.`,
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error updating goal',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update goal progress
 */
export function useUpdateGoalProgress(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (currentValue: number) => {
      const { data, error } = await enhancedGoalService.updateGoalProgress(id, currentValue);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    onSuccess: (updatedGoal) => {
      // Get the farm ID for invalidating the list query
      const farmId = typeof updatedGoal.farm_id === 'string' 
        ? parseInt(updatedGoal.farm_id) 
        : updatedGoal.farm_id;
      
      // Invalidate both the list and the detail queries
      queryClient.invalidateQueries({ queryKey: goalKeys.list(farmId) });
      queryClient.invalidateQueries({ queryKey: goalKeys.detail(id) });
      
      // Show success toast
      toast({
        title: 'Goal progress updated',
        description: `Progress for goal "${updatedGoal.name}" has been updated.`,
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error updating goal progress',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a goal
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Get the goal details first for the success message and to get farmId
      const { data: goal } = await enhancedGoalService.getGoalById(id);
      const goalName = goal?.name || 'Goal';
      const farmId = goal?.farm_id;
      
      const { error } = await enhancedGoalService.deleteGoal(id);
      
      if (error) {
        throw new Error(error);
      }
      
      return { id, name: goalName, farmId };
    },
    onSuccess: ({ id, name, farmId }) => {
      // Invalidate the goals list query for the farm to refetch the data
      if (farmId) {
        const numericFarmId = typeof farmId === 'string' ? parseInt(farmId) : farmId;
        queryClient.invalidateQueries({ queryKey: goalKeys.list(numericFarmId) });
      } else {
        // If we don't have a farmId, invalidate all goal lists
        queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
      }
      
      // Remove the specific goal from the cache
      queryClient.removeQueries({ queryKey: goalKeys.detail(id) });
      
      // Show success toast
      toast({
        title: 'Goal deleted',
        description: `Goal "${name}" has been deleted successfully.`,
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error deleting goal',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to manage goal dependencies
 */
export function useGoalDependencies(goalId: string) {
  const queryClient = useQueryClient();
  
  // Add dependency
  const addDependency = useMutation({
    mutationFn: async (dependencyGoalId: string) => {
      const { data, error } = await enhancedGoalService.addDependency(goalId, dependencyGoalId);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.detail(goalId) });
      toast({
        title: 'Dependency added',
        description: 'Goal dependency has been added successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error adding dependency',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Remove dependency
  const removeDependency = useMutation({
    mutationFn: async (dependencyGoalId: string) => {
      const { data, error } = await enhancedGoalService.removeDependency(goalId, dependencyGoalId);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.detail(goalId) });
      toast({
        title: 'Dependency removed',
        description: 'Goal dependency has been removed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error removing dependency',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Set dependency type
  const setDependencyType = useMutation({
    mutationFn: async (dependencyType: 'sequential' | 'parallel' | 'none') => {
      const { data, error } = await enhancedGoalService.setDependencyType(goalId, dependencyType);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.detail(goalId) });
      toast({
        title: 'Dependency type updated',
        description: 'Goal dependency type has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating dependency type',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
  
  return {
    addDependency,
    removeDependency,
    setDependencyType,
  };
}
