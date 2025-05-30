import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/lib/store/store';
import { Agent } from '@/types/agent';

interface UseAgentsOptions {
  enabled?: boolean;
  onSuccess?: (data: Agent[]) => void;
  onError?: (error: Error) => void;
}

export function useAgents(options: UseAgentsOptions = {}) {
  const queryClient = useQueryClient();
  const { addToast } = useStore();

  const query = useQuery<Agent[], Error>({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      return response.json();
    },
    ...options,
  });

  const createAgent = useMutation({
    mutationFn: async (agent: Partial<Agent>) => {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent),
      });
      if (!response.ok) {
        throw new Error('Failed to create agent');
      }
      return response.json();
    },
    onSuccess: (newAgent: Agent) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      addToast({
        type: 'success',
        message: 'Agent created successfully',
        duration: 3000,
      });
    },
  });

  const updateAgent = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Agent> & { id: string }) => {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update agent');
      }
      return response.json();
    },
    onSuccess: (updatedAgent: Agent) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      addToast({
        type: 'success',
        message: 'Agent updated successfully',
        duration: 3000,
      });
    },
  });

  const deleteAgent = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      addToast({
        type: 'success',
        message: 'Agent deleted successfully',
        duration: 3000,
      });
    },
  });

  const executeAgent = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/agents/${id}/execute`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to execute agent');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      addToast({
        type: 'success',
        message: 'Agent executed successfully',
        duration: 3000,
      });
    },
  });

  return {
    agents: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createAgent: createAgent.mutate,
    updateAgent: updateAgent.mutate,
    deleteAgent: deleteAgent.mutate,
    executeAgent: executeAgent.mutate,
    isCreating: createAgent.isLoading,
    isUpdating: updateAgent.isLoading,
    isDeleting: deleteAgent.isLoading,
    isExecuting: executeAgent.isLoading,
  };
} 