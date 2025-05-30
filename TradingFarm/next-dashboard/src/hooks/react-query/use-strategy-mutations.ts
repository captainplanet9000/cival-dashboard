import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api-service';
import { queryKeys } from '@/utils/react-query/query-keys';
import { toast } from '@/components/ui/use-toast';

// Type definitions
export interface StrategyInput {
  name: string;
  description?: string;
  type: string;
  status: 'active' | 'paused' | 'draft';
  parameters: {
    timeframe: string;
    symbols: string[];
    riskManagement: {
      maxPositionSize: number;
      stopLoss?: number;
      takeProfit?: number;
      trailingStop?: number;
    };
  };
  tags?: string[];
  config?: Record<string, any>;
}

export interface StrategyUpdateInput extends Partial<StrategyInput> {
  id: string;
}

// Create a new strategy
export function useCreateStrategy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (strategy: StrategyInput) => {
      const response = await apiService.post('/api/strategies', strategy);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate strategies list query
      queryClient.invalidateQueries({
        queryKey: queryKeys.strategies.list._def,
      });
      
      // Show success toast
      toast({
        title: 'Strategy created',
        description: `Strategy "${data.name}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create strategy',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}

// Update an existing strategy
export function useUpdateStrategy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (strategy: StrategyUpdateInput) => {
      const { id, ...data } = strategy;
      const response = await apiService.put(`/api/strategies/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific strategy query
      queryClient.invalidateQueries({
        queryKey: queryKeys.strategies.detail(variables.id)._def,
      });
      
      // Also invalidate the list query
      queryClient.invalidateQueries({
        queryKey: queryKeys.strategies.list._def,
      });
      
      // Show success toast
      toast({
        title: 'Strategy updated',
        description: `Strategy "${data.name}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update strategy',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}

// Delete a strategy
export function useDeleteStrategy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiService.delete(`/api/strategies/${id}`);
      return id;
    },
    onSuccess: (id) => {
      // Invalidate strategies list query
      queryClient.invalidateQueries({
        queryKey: queryKeys.strategies.list._def,
      });
      
      // Remove specific strategy from cache
      queryClient.removeQueries({
        queryKey: queryKeys.strategies.detail(id)._def,
      });
      
      // Show success toast
      toast({
        title: 'Strategy deleted',
        description: 'The strategy has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete strategy',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}

// Execute a backtest for a strategy
export function useRunStrategyBacktest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      strategyId, 
      params 
    }: { 
      strategyId: string; 
      params: { 
        startDate: string; 
        endDate: string; 
        initialBalance?: number;
      }
    }) => {
      const response = await apiService.post(`/api/strategies/${strategyId}/backtest`, params);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate backtests for this strategy
      queryClient.invalidateQueries({
        queryKey: queryKeys.strategies.backtests(variables.strategyId)._def,
      });
      
      // Show success toast
      toast({
        title: 'Backtest started',
        description: 'Strategy backtest has been initiated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to run backtest',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}

// Start strategy execution
export function useStartStrategy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (strategyId: string) => {
      const response = await apiService.post(`/api/strategies/${strategyId}/start`);
      return response.data;
    },
    onSuccess: (data, strategyId) => {
      // Invalidate strategy details
      queryClient.invalidateQueries({
        queryKey: queryKeys.strategies.detail(strategyId)._def,
      });
      
      // Invalidate strategy executions
      queryClient.invalidateQueries({
        queryKey: queryKeys.strategies.executions(strategyId)._def,
      });
      
      // Show success toast
      toast({
        title: 'Strategy started',
        description: 'The strategy has been started successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to start strategy',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}

// Pause strategy execution
export function usePauseStrategy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (strategyId: string) => {
      const response = await apiService.post(`/api/strategies/${strategyId}/pause`);
      return response.data;
    },
    onSuccess: (data, strategyId) => {
      // Invalidate strategy details to reflect updated status
      queryClient.invalidateQueries({
        queryKey: queryKeys.strategies.detail(strategyId)._def,
      });
      
      // Show success toast
      toast({
        title: 'Strategy paused',
        description: 'The strategy has been paused successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to pause strategy',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}
