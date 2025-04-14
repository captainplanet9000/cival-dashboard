/**
 * Farm-related React Query hooks for Trading Farm Dashboard
 * 
 * These hooks provide data fetching, caching, and state management
 * for farm-related data using TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api-service';
import { queryKeys } from '@/utils/react-query/query-keys';

/**
 * Hook to fetch all farms with optional filtering
 */
export function useFarms(filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.farms.list(filters),
    queryFn: () => api.farms.getFarms(filters),
  });
}

/**
 * Hook to fetch a single farm by ID
 */
export function useFarm(id: string) {
  return useQuery({
    queryKey: queryKeys.farms.detail(id),
    queryFn: () => api.farms.getFarmById(id),
    enabled: !!id, // Only run the query if we have an ID
  });
}

/**
 * Hook to create a new farm
 */
export function useCreateFarm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (farmData: any) => api.farms.createFarm(farmData),
    onSuccess: (data) => {
      // Invalidate farms list queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.farms.lists(),
      });
      
      // Add the new farm to the cache
      queryClient.setQueryData(
        queryKeys.farms.detail(data.id),
        data
      );
    },
  });
}

/**
 * Hook to update an existing farm
 */
export function useUpdateFarm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: { id: string, [key: string]: any }) => 
      api.farms.updateFarm(params),
    onSuccess: (data) => {
      // Invalidate the specific farm detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.farms.detail(data.id),
      });
      
      // Invalidate farms list queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.farms.lists(),
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
    mutationFn: (id: string) => api.farms.deleteFarm(id),
    onSuccess: (_, id) => {
      // Remove the farm from the cache
      queryClient.removeQueries({
        queryKey: queryKeys.farms.detail(id),
      });
      
      // Invalidate farms list queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.farms.lists(),
      });
    },
  });
}
