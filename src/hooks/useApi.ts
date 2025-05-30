import { useState, useEffect, useCallback } from 'react';
import { ApiResponse } from '../services/api/api-service';

/**
 * Type for the state of an API call
 */
export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

/**
 * Initial state for API calls
 */
const initialState = {
  data: null,
  loading: false,
  error: null,
  success: false
};

/**
 * Options for the API hook
 */
export interface ApiOptions<T, P = any> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  initialData?: T | null;
  skip?: boolean;
  dependencies?: any[];
  params?: P;
}

/**
 * Type for API function
 */
export type ApiFn<T, P = any> = (params?: P) => Promise<ApiResponse<T>>;

/**
 * Hook for making API calls
 * 
 * @param apiFunction The API function to call
 * @param options Options for the hook
 * @returns Object with state and functions to control the API call
 */
export function useApi<T, P = any>(
  apiFunction: ApiFn<T, P>,
  options: ApiOptions<T, P> = {}
) {
  const {
    onSuccess,
    onError,
    initialData = null,
    skip = false,
    dependencies = [],
    params
  } = options;

  // API call state
  const [state, setState] = useState<ApiState<T>>({
    ...initialState,
    data: initialData
  });

  // Function to execute the API call
  const execute = useCallback(
    async (callParams?: P) => {
      try {
        // Set loading state
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Execute API call
        const response = await apiFunction(callParams || params);

        if (response.success) {
          // Handle success
          setState({
            data: response.data!,
            loading: false,
            error: null,
            success: true
          });

          // Call success callback if provided
          if (onSuccess) {
            onSuccess(response.data!);
          }

          return response.data!;
        } else {
          // Handle error
          const errorMessage = response.error || 'Unknown error occurred';
          setState({
            data: null,
            loading: false,
            error: errorMessage,
            success: false
          });

          // Call error callback if provided
          if (onError) {
            onError(errorMessage);
          }

          return null;
        }
      } catch (err) {
        // Handle unexpected error
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setState({
          data: null,
          loading: false,
          error: errorMessage,
          success: false
        });

        // Call error callback if provided
        if (onError) {
          onError(errorMessage);
        }

        return null;
      }
    },
    [apiFunction, onSuccess, onError, params]
  );

  // Reset API state
  const reset = useCallback(() => {
    setState({
      ...initialState,
      data: initialData
    });
  }, [initialData]);

  // Set data manually
  const setData = useCallback((data: T | null) => {
    setState(prev => ({
      ...prev,
      data,
      success: !!data
    }));
  }, []);

  // Execute API call on mount or when dependencies change
  useEffect(() => {
    if (!skip) {
      execute(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, ...dependencies]);

  return {
    ...state,
    execute,
    reset,
    setData
  };
}

/**
 * Hook for making API mutations (e.g. POST, PUT, DELETE)
 * 
 * @param apiFunction The API function to call
 * @param options Options for the hook
 * @returns Object with state and functions to control the API call
 */
export function useApiMutation<T, P = any>(
  apiFunction: ApiFn<T, P>,
  options: ApiOptions<T, P> = {}
) {
  const {
    onSuccess,
    onError,
    initialData = null
  } = options;

  // API call state
  const [state, setState] = useState<ApiState<T>>({
    ...initialState,
    data: initialData
  });

  // Function to execute the API call
  const mutate = useCallback(
    async (params?: P) => {
      try {
        // Set loading state
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Execute API call
        const response = await apiFunction(params);

        if (response.success) {
          // Handle success
          setState({
            data: response.data!,
            loading: false,
            error: null,
            success: true
          });

          // Call success callback if provided
          if (onSuccess) {
            onSuccess(response.data!);
          }

          return response.data!;
        } else {
          // Handle error
          const errorMessage = response.error || 'Unknown error occurred';
          setState({
            data: null,
            loading: false,
            error: errorMessage,
            success: false
          });

          // Call error callback if provided
          if (onError) {
            onError(errorMessage);
          }

          return null;
        }
      } catch (err) {
        // Handle unexpected error
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setState({
          data: null,
          loading: false,
          error: errorMessage,
          success: false
        });

        // Call error callback if provided
        if (onError) {
          onError(errorMessage);
        }

        return null;
      }
    },
    [apiFunction, onSuccess, onError]
  );

  // Reset API state
  const reset = useCallback(() => {
    setState({
      ...initialState,
      data: initialData
    });
  }, [initialData]);

  return {
    ...state,
    mutate,
    reset
  };
} 