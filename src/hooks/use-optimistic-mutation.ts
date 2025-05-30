import { useState, useCallback } from 'react';
import { ApiResponse } from '../services/api/api-service';
import { MonitoringService } from '../services/monitoring-service';

// Optimistic update types
export type OptimisticUpdateFn<T> = (current: T | null) => T;
export type RollbackFn<T> = (current: T | null, previous: T | null) => T | null;
export type MutationFn<T, P = any> = (params: P) => Promise<ApiResponse<T>>;

// Mutation state interface
export interface MutationState<T> {
  data: T | null;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  originalData: T | null;
}

// Mutation options interface
export interface OptimisticMutationOptions<T, P> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  optimisticUpdate?: OptimisticUpdateFn<T>;
  rollback?: RollbackFn<T>;
  onSettled?: () => void;
  retry?: number;
  retryDelay?: number;
}

/**
 * Hook for performing optimistic mutations 
 * Allows UI to update immediately before API call completes
 * Automatically rolls back on error
 * 
 * @param initialData Initial data value
 * @param mutationFn The API mutation function to call
 * @param options Optimistic mutation options
 * @returns Optimistic mutation state and execute function
 */
export function useOptimisticMutation<T, P = any>(
  initialData: T | null,
  mutationFn: MutationFn<T, P>,
  options: OptimisticMutationOptions<T, P> = {}
) {
  // Extract options
  const { 
    onSuccess, 
    onError, 
    optimisticUpdate, 
    rollback,
    onSettled,
    retry = 1,
    retryDelay = 1000
  } = options;
  
  // State for mutation handling
  const [state, setState] = useState<MutationState<T>>({
    data: initialData,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    originalData: initialData
  });
  
  // State for retry counter
  const [retryCount, setRetryCount] = useState(0);
  
  // The mutation function exposed to the user
  const mutate = useCallback(async (params: P): Promise<T | null> => {
    // Reset retry counter
    setRetryCount(0);
    
    // Store original data for potential rollback
    const originalData = state.data;
    
    // Set pending state
    setState(prev => ({
      ...prev,
      isPending: true,
      isSuccess: false,
      isError: false,
      error: null,
      originalData
    }));
    
    // Apply optimistic update if provided
    if (optimisticUpdate) {
      const optimisticData = optimisticUpdate(originalData);
      setState(prev => ({
        ...prev,
        data: optimisticData
      }));
    }
    
    // Track timing
    const startTime = performance.now();
    
    try {
      // Execute the actual mutation
      let response = await mutationFn(params);
      let currentRetry = 0;
      
      // Handle retry logic
      while (response.error && currentRetry < retry) {
        // Log retry
        MonitoringService.logEvent({
          type: 'info',
          message: `Retrying mutation (${currentRetry + 1}/${retry})`,
          data: { error: response.error }
        });
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, retryDelay * Math.pow(2, currentRetry))
        );
        
        // Increment retry counter
        currentRetry++;
        setRetryCount(currentRetry);
        
        // Try again
        response = await mutationFn(params);
      }
      
      // Check if there's still an error after retries
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Track successful mutation time
      const endTime = performance.now();
      MonitoringService.trackMetric({
        name: 'optimistic_mutation_time',
        value: endTime - startTime,
        unit: 'ms',
        tags: ['mutation', 'success']
      });
      
      // Update state with successful data
      setState({
        data: response.data ?? null,
        isPending: false,
        isSuccess: true,
        isError: false,
        error: null,
        originalData
      });
      
      // Call onSuccess callback if provided
      if (onSuccess && response.data) {
        onSuccess(response.data);
      }
      
      // Call onSettled callback if provided
      if (onSettled) {
        onSettled();
      }
      
      return response.data ?? null;
    } catch (err) {
      // Track failed mutation time
      const endTime = performance.now();
      MonitoringService.trackMetric({
        name: 'optimistic_mutation_time',
        value: endTime - startTime,
        unit: 'ms',
        tags: ['mutation', 'error']
      });
      
      // Get error message
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Apply rollback if provided, otherwise revert to original data
      const rollbackData = rollback 
        ? rollback(state.data, originalData)
        : originalData;
      
      // Update state with error
      setState({
        data: rollbackData,
        isPending: false,
        isSuccess: false,
        isError: true,
        error: errorMessage,
        originalData
      });
      
      // Call onError callback if provided
      if (onError) {
        onError(errorMessage);
      }
      
      // Log error
      MonitoringService.logEvent({
        type: 'error',
        message: 'Optimistic mutation failed',
        data: { error: errorMessage }
      });
      
      // Call onSettled callback if provided
      if (onSettled) {
        onSettled();
      }
      
      return null;
    }
  }, [
    state.data, 
    mutationFn, 
    optimisticUpdate, 
    rollback,
    onSuccess,
    onError,
    onSettled,
    retry,
    retryDelay
  ]);
  
  // Function to reset the state
  const reset = useCallback(() => {
    setState({
      data: initialData,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
      originalData: initialData
    });
    setRetryCount(0);
  }, [initialData]);
  
  // Set data function
  const setData = useCallback((updater: T | ((prev: T | null) => T)) => {
    setState(prev => {
      const newData = typeof updater === 'function'
        ? (updater as ((prev: T | null) => T))(prev.data)
        : updater;
      
      return {
        ...prev,
        data: newData,
        originalData: newData
      };
    });
  }, []);
  
  return {
    ...state,
    mutate,
    reset,
    setData,
    retryCount
  };
} 