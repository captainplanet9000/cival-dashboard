import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/lib/store/store';
import { Strategy } from '@/types/strategy';

interface UseStrategiesOptions {
  enabled?: boolean;
  onSuccess?: (data: Strategy[]) => void;
  onError?: (error: Error) => void;
}

export function useStrategies(options: UseStrategiesOptions = {}) {
  const queryClient = useQueryClient();
  const { addToast } = useStore();

  const query = useQuery<Strategy[], Error>({
    queryKey: ['strategies'],
    queryFn: async () => {
      const response = await fetch('/api/strategies');
      if (!response.ok) {
        throw new Error('Failed to fetch strategies');
      }
      return response.json();
    },
    ...options,
  });

  const createStrategy = useMutation({
    mutationFn: async (strategy: Partial<Strategy>) => {
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategy),
      });
      if (!response.ok) {
        throw new Error('Failed to create strategy');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      addToast({
        type: 'success',
        message: 'Strategy created successfully',
        duration: 3000,
      });
    },
  });

  const updateStrategy = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Strategy> & { id: string }) => {
      const response = await fetch(`/api/strategies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update strategy');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      addToast({
        type: 'success',
        message: 'Strategy updated successfully',
        duration: 3000,
      });
    },
  });

  const deleteStrategy = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/strategies/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete strategy');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      addToast({
        type: 'success',
        message: 'Strategy deleted successfully',
        duration: 3000,
      });
    },
  });

  return {
    strategies: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createStrategy: createStrategy.mutate,
    updateStrategy: updateStrategy.mutate,
    deleteStrategy: deleteStrategy.mutate,
    isCreating: createStrategy.isLoading,
    isUpdating: updateStrategy.isLoading,
    isDeleting: deleteStrategy.isLoading,
  };
} 