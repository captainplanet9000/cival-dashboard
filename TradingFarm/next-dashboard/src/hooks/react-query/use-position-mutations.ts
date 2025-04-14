import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api-service';
import { queryKeys } from '@/utils/react-query/query-keys';
import { toast } from '@/components/ui/use-toast';

// Type definitions
export interface OrderInput {
  farmId: string;
  exchangeAccountId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'gtc' | 'ioc' | 'fok';
  reduceOnly?: boolean;
  positionId?: string;
  agentId?: string;
  metadata?: Record<string, any>;
}

export interface PositionUpdateInput {
  id: string;
  metadata?: Record<string, any>;
  stopLoss?: number;
  takeProfit?: number;
}

// Create a new order (which may create or modify a position)
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: OrderInput) => {
      const response = await apiService.post('/api/orders', orderData);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate positions list
      queryClient.invalidateQueries({
        queryKey: queryKeys.positions.list._def,
      });
      
      // Invalidate dashboard data since positions affect overall metrics
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard._def,
      });
      
      // Show success toast
      toast({
        title: 'Order created',
        description: `Order for ${data.symbol} has been submitted successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create order',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}

// Update position settings (like stop loss, take profit)
export function useUpdatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (positionData: PositionUpdateInput) => {
      const { id, ...data } = positionData;
      const response = await apiService.patch(`/api/positions/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific position
      queryClient.invalidateQueries({
        queryKey: queryKeys.positions.detail(variables.id)._def,
      });
      
      // Also invalidate positions list
      queryClient.invalidateQueries({
        queryKey: queryKeys.positions.list._def,
      });
      
      // Show success toast
      toast({
        title: 'Position updated',
        description: `Position for ${data.symbol} has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update position',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}

// Close a position completely
export function useClosePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (positionId: string) => {
      const response = await apiService.post(`/api/positions/${positionId}/close`);
      return response.data;
    },
    onMutate: async (positionId) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({
        queryKey: queryKeys.positions.detail(positionId)._def,
      });
      
      // Get the current position from the cache
      const previousPosition = queryClient.getQueryData(
        queryKeys.positions.detail(positionId)._def
      );
      
      // Optimistically update the position status
      if (previousPosition) {
        queryClient.setQueryData(
          queryKeys.positions.detail(positionId)._def,
          {
            ...previousPosition,
            status: 'closing',
          }
        );
      }
      
      // Return context with the previous position
      return { previousPosition };
    },
    onSuccess: (data, positionId) => {
      // Invalidate specific position
      queryClient.invalidateQueries({
        queryKey: queryKeys.positions.detail(positionId)._def,
      });
      
      // Also invalidate positions list
      queryClient.invalidateQueries({
        queryKey: queryKeys.positions.list._def,
      });
      
      // Invalidate dashboard data
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard._def,
      });
      
      // Show success toast
      toast({
        title: 'Position closed',
        description: 'The position has been closed successfully.',
      });
    },
    onError: (error, positionId, context) => {
      // If the mutation fails, revert the optimistic update
      if (context?.previousPosition) {
        queryClient.setQueryData(
          queryKeys.positions.detail(positionId)._def,
          context.previousPosition
        );
      }
      
      toast({
        title: 'Failed to close position',
        description: error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}

// Reconcile a position with exchange data
export function useReconcilePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (positionId: string) => {
      const response = await apiService.post(`/api/positions/${positionId}/reconcile`);
      return response.data;
    },
    onMutate: async (positionId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.positions.detail(positionId)._def,
      });
      
      // Get the current position from the cache
      const previousPosition = queryClient.getQueryData(
        queryKeys.positions.detail(positionId)._def
      );
      
      // Optimistically update the reconciliation status
      if (previousPosition) {
        queryClient.setQueryData(
          queryKeys.positions.detail(positionId)._def,
          {
            ...previousPosition,
            reconciliation_status: 'pending',
            last_reconciled: new Date().toISOString(),
          }
        );
      }
      
      return { previousPosition };
    },
    onSuccess: (data, positionId) => {
      // Invalidate specific position
      queryClient.invalidateQueries({
        queryKey: queryKeys.positions.detail(positionId)._def,
      });
      
      // Also invalidate positions list
      queryClient.invalidateQueries({
        queryKey: queryKeys.positions.list._def,
      });
      
      // Show success toast
      toast({
        title: 'Position reconciled',
        description: data.message || 'Position has been reconciled with exchange data.',
      });
    },
    onError: (error, positionId, context) => {
      // If the mutation fails, revert the optimistic update
      if (context?.previousPosition) {
        queryClient.setQueryData(
          queryKeys.positions.detail(positionId)._def,
          context.previousPosition
        );
      }
      
      toast({
        title: 'Reconciliation failed',
        description: error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });
}
