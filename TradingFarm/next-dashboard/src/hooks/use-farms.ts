'use client';

import { 
  useQuery, 
  useMutation, 
  useQueryClient, 
  QueryKey 
} from '@tanstack/react-query';
import { enhancedFarmService } from '@/services/enhanced-farm-service';
import { 
  Farm, 
  Agent, 
  CreateFarmInput, 
  UpdateFarmInput 
} from '@/schemas/farm-schemas';
import { toast } from '@/components/ui/use-toast';

// Query keys for farms
export const farmKeys = {
  all: ['farms'] as const,
  lists: () => [...farmKeys.all, 'list'] as const,
  list: (filters: object) => [...farmKeys.lists(), filters] as const,
  details: () => [...farmKeys.all, 'detail'] as const,
  detail: (id: number) => [...farmKeys.details(), id] as const,
  agents: (farmId: number) => [...farmKeys.detail(farmId), 'agents'] as const,
};

/**
 * Hook to fetch all farms
 */
export function useFarms() {
  return useQuery({
    queryKey: farmKeys.lists(),
    queryFn: async () => {
      const { data, error } = await enhancedFarmService.getFarms();
      
      if (error) {
        throw new Error(error);
      }
      
      return data || [];
    },
  });
}

/**
 * Hook to fetch a specific farm by ID
 */
export function useFarm(id: number) {
  return useQuery({
    queryKey: farmKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await enhancedFarmService.getFarmById(id);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    enabled: !!id, // Only run the query if we have an ID
  });
}

/**
 * Hook to fetch all agents for a farm
 */
export function useFarmAgents(farmId: number) {
  return useQuery({
    queryKey: farmKeys.agents(farmId),
    queryFn: async () => {
      const { data, error } = await enhancedFarmService.getAgents(farmId);
      
      if (error) {
        throw new Error(error);
      }
      
      return data || [];
    },
    enabled: !!farmId, // Only run the query if we have a farmId
  });
}

/**
 * Hook to create a new farm
 */
export function useCreateFarm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (farmData: CreateFarmInput) => {
      const { data, error } = await enhancedFarmService.createFarm(farmData);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    onSuccess: (newFarm) => {
      // Invalidate the farms list query to refetch the data
      queryClient.invalidateQueries({ queryKey: farmKeys.lists() });
      
      // Show success toast
      toast({
        title: 'Farm created',
        description: `Farm "${newFarm.name}" has been created successfully.`,
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error creating farm',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update an existing farm
 */
export function useUpdateFarm(id: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (farmData: UpdateFarmInput) => {
      const { data, error } = await enhancedFarmService.updateFarm(id, farmData);
      
      if (error) {
        throw new Error(error);
      }
      
      return data!;
    },
    onSuccess: (updatedFarm) => {
      // Invalidate both the list and the detail queries
      queryClient.invalidateQueries({ queryKey: farmKeys.lists() });
      queryClient.invalidateQueries({ queryKey: farmKeys.detail(id) });
      
      // Show success toast
      toast({
        title: 'Farm updated',
        description: `Farm "${updatedFarm.name}" has been updated successfully.`,
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error updating farm',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a farm
 */
export function useDeleteFarm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      // Get the farm details first for the success message
      const { data: farm } = await enhancedFarmService.getFarmById(id);
      const farmName = farm?.name || 'Farm';
      
      const { error } = await enhancedFarmService.deleteFarm(id);
      
      if (error) {
        throw new Error(error);
      }
      
      return { id, name: farmName };
    },
    onSuccess: ({ id, name }) => {
      // Invalidate the farms list query to refetch the data
      queryClient.invalidateQueries({ queryKey: farmKeys.lists() });
      
      // Remove the specific farm from the cache
      queryClient.removeQueries({ queryKey: farmKeys.detail(id) });
      
      // Show success toast
      toast({
        title: 'Farm deleted',
        description: `Farm "${name}" has been deleted successfully.`,
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: 'Error deleting farm',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}
