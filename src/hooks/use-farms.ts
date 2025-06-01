import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/lib/store/store';
import { Farm } from '@/types/farm';

interface UseFarmsOptions {
  enabled?: boolean;
  onSuccess?: (data: Farm[]) => void;
  onError?: (error: Error) => void;
}

export function useFarms(options: UseFarmsOptions = {}) {
  const queryClient = useQueryClient();
  const { addToast } = useStore();

  const query = useQuery<Farm[], Error>({
    queryKey: ['farms'],
    queryFn: async () => {
      const response = await fetch('/api/farms');
      if (!response.ok) {
        throw new Error('Failed to fetch farms');
      }
      return response.json();
    },
    ...options,
  });

  const createFarm = useMutation({
    mutationFn: async (farm: Partial<Farm>) => {
      const response = await fetch('/api/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(farm),
      });
      if (!response.ok) {
        throw new Error('Failed to create farm');
      }
      return response.json();
    },
    onSuccess: (newFarm: Farm) => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
      addToast({
        type: 'success',
        message: 'Farm created successfully',
        duration: 3000,
      });
    },
  });

  const updateFarm = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Farm> & { id: string }) => {
      const response = await fetch(`/api/farms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update farm');
      }
      return response.json();
    },
    onSuccess: (updatedFarm: Farm) => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
      addToast({
        type: 'success',
        message: 'Farm updated successfully',
        duration: 3000,
      });
    },
  });

  const deleteFarm = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/farms/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete farm');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
      addToast({
        type: 'success',
        message: 'Farm deleted successfully',
        duration: 3000,
      });
    },
  });

  return {
    farms: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createFarm: createFarm.mutate,
    updateFarm: updateFarm.mutate,
    deleteFarm: deleteFarm.mutate,
    isCreating: createFarm.isLoading,
    isUpdating: updateFarm.isLoading,
    isDeleting: deleteFarm.isLoading,
  };
} 