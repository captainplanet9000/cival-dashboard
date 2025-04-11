import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiResponse } from '../services/api/api-service';
import { ValidationService } from '../services/validation/validator';
import { MonitoringService } from '../services/monitoring-service';
import { ZodSchema } from 'zod';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

// Query status types
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

// Query options
export interface QueryOptions<TData, TParams = any> {
  enabled?: boolean;
  initialData?: TData;
  retry?: number;
  retryDelay?: number;
  staleTime?: number;
  cacheTime?: number;
  onSuccess?: (data: TData) => void;
  onError?: (error: string) => void;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  refetchOnMount?: boolean;
  suspense?: boolean;
  params?: TParams;
  keepPreviousData?: boolean;
  validationSchema?: ZodSchema<TData>;
  placeholderData?: TData;
}

// Query function type
export type QueryFn<TData, TParams = any> = (params?: TParams) => Promise<ApiResponse<TData>>;

// Query result interface
export interface QueryResult<TData> {
  data: TData | null;
  error: string | null;
  status: QueryStatus;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => Promise<TData | null>;
  invalidate: () => void;
  setData: (data: TData) => void;
}

// Default query options
const defaultOptions: Omit<QueryOptions<any>, 'initialData'> = {
  enabled: true,
  retry: 3,
  retryDelay: 1000,
  staleTime: 0,
  cacheTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchOnMount: true,
  keepPreviousData: false,
};

/**
 * useQuery hook for data fetching with advanced features
 * Provides a react-query like experience with better type safety and integration
 * 
 * @param queryKey Unique identifier for this query
 * @param queryFn Function that returns a promise with the data
 * @param options Query options
 * @returns Query result object
 */
export function useQuery<TData, TParams = any>(
  queryKey: string | Array<any>,
  queryFn: QueryFn<TData, TParams>,
  options: QueryOptions<TData, TParams> = {}
): QueryResult<TData> {
  // Normalize query key
  const queryKeyString = Array.isArray(queryKey) ? queryKey.join('::') : queryKey;
  
  // Merge options with defaults
  const {
    enabled = defaultOptions.enabled,
    initialData = null,
    retry = defaultOptions.retry,
    retryDelay = defaultOptions.retryDelay,
    staleTime = defaultOptions.staleTime,
    cacheTime = defaultOptions.cacheTime,
    onSuccess,
    onError,
    refetchInterval,
    refetchOnWindowFocus = defaultOptions.refetchOnWindowFocus,
    refetchOnReconnect = defaultOptions.refetchOnReconnect,
    refetchOnMount = defaultOptions.refetchOnMount,
    keepPreviousData = defaultOptions.keepPreviousData,
    validationSchema,
    placeholderData,
    params,
  } = options;
  
  // State
  const [data, setData] = useState<TData | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<QueryStatus>(initialData ? 'success' : 'idle');
  const [isFetching, setIsFetching] = useState<boolean>(false);
  
  // Refs to avoid dependency issues with useEffect
  const enabledRef = useRef(enabled);
  const queryFnRef = useRef(queryFn);
  const optionsRef = useRef(options);
  const retryCountRef = useRef(0);
  const activeRequestRef = useRef<AbortController | null>(null);
  const dataRef = useRef<TData | null>(initialData);
  const refetchIntervalRef = useRef<number | undefined>(refetchInterval);
  
  // Update refs when dependencies change
  useIsomorphicLayoutEffect(() => {
    enabledRef.current = enabled;
    queryFnRef.current = queryFn;
    optionsRef.current = options;
    refetchIntervalRef.current = refetchInterval;
  }, [enabled, queryFn, options, refetchInterval]);
  
  // Update data ref when data changes
  useIsomorphicLayoutEffect(() => {
    dataRef.current = data;
  }, [data]);
  
  // Main fetch function
  const fetchData = useCallback(async (): Promise<TData | null> => {
    // Skip if disabled
    if (!enabledRef.current) {
      return dataRef.current;
    }
    
    // Set loading state
    setIsFetching(true);
    if (status === 'idle') {
      setStatus('loading');
    }
    
    // Cancel previous request if any
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    
    // Create new abort controller
    activeRequestRef.current = new AbortController();
    
    try {
      // Track request in monitoring
      const startTime = performance.now();
      
      // Execute query function
      const response = await queryFnRef.current(optionsRef.current.params);
      
      // Track request performance
      const endTime = performance.now();
      MonitoringService.trackMetric({
        name: `query_${queryKeyString}`,
        value: endTime - startTime,
        unit: 'ms',
        tags: ['api', 'query']
      });
      
      // Reset retry counter on success
      retryCountRef.current = 0;
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data) {
        throw new Error('No data received');
      }
      
      // Validate response if schema provided
      let validatedData = response.data;
      if (validationSchema) {
        const validationResult = ValidationService.validate(validationSchema, response.data);
        if (!validationResult.success) {
          throw new Error(validationResult.message || 'Validation failed');
        }
        validatedData = validationResult.data!;
      }
      
      // Update state with success
      const newData = validatedData as TData;
      setData(newData);
      setStatus('success');
      setError(null);
      
      // Call success callback
      if (optionsRef.current.onSuccess) {
        optionsRef.current.onSuccess(newData);
      }
      
      return newData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Check if this was an abort error (user cancelled)
      const isAbortError = err instanceof DOMException && err.name === 'AbortError';
      
      // Only set error state if not aborted
      if (!isAbortError) {
        // Determine if we should retry
        const shouldRetry = retryCountRef.current < (optionsRef.current.retry || 0);
        
        if (shouldRetry) {
          // Increment retry counter
          retryCountRef.current++;
          
          // Calculate backoff delay with exponential backoff
          const delay = Math.min(
            (optionsRef.current.retryDelay || 1000) * Math.pow(2, retryCountRef.current - 1),
            30000
          );
          
          // Schedule retry
          setTimeout(() => {
            fetchData();
          }, delay);
          
          // Log retry
          MonitoringService.logEvent({
            type: 'info',
            message: `Retrying query ${queryKeyString} (${retryCountRef.current}/${optionsRef.current.retry})`,
            data: { error: errorMessage, queryKey: queryKeyString }
          });
          
          return keepPreviousData ? dataRef.current : null;
        }
        
        // Update state with error
        if (!keepPreviousData) {
          setData(null);
        }
        setStatus('error');
        setError(errorMessage);
        
        // Call error callback
        if (optionsRef.current.onError) {
          optionsRef.current.onError(errorMessage);
        }
        
        // Log error
        MonitoringService.logEvent({
          type: 'error',
          message: `Query error: ${queryKeyString}`,
          data: { error: errorMessage, queryKey: queryKeyString }
        });
      }
      
      return keepPreviousData ? dataRef.current : null;
    } finally {
      setIsFetching(false);
      activeRequestRef.current = null;
    }
  }, [queryKeyString, keepPreviousData, status, validationSchema]);
  
  // Manual refetch function
  const refetch = useCallback(async (): Promise<TData | null> => {
    return fetchData();
  }, [fetchData]);
  
  // Manual data setter
  const setDataManually = useCallback((newData: TData): void => {
    setData(newData);
    setStatus('success');
    setError(null);
  }, []);
  
  // Manual cache invalidation
  const invalidate = useCallback((): void => {
    if (enabledRef.current) {
      fetchData();
    }
  }, [fetchData]);
  
  // Set up refetch interval
  useEffect(() => {
    if (!refetchIntervalRef.current || !enabledRef.current) {
      return;
    }
    
    const intervalId = setInterval(() => {
      fetchData();
    }, refetchIntervalRef.current);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchData]);
  
  // Set up window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabledRef.current) {
      return;
    }
    
    const handleFocus = () => {
      fetchData();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData, refetchOnWindowFocus]);
  
  // Set up initial fetch
  useEffect(() => {
    if (enabled && refetchOnMount) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle network reconnect
  useEffect(() => {
    if (!refetchOnReconnect || !enabledRef.current) {
      return;
    }
    
    const handleOnline = () => {
      fetchData();
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchData, refetchOnReconnect]);
  
  // Handle params changes
  useEffect(() => {
    if (enabledRef.current) {
      fetchData();
    }
  }, [params, fetchData]);
  
  return {
    data: data ?? placeholderData ?? null,
    error,
    status,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    isFetching,
    refetch,
    invalidate,
    setData: setDataManually,
  };
}

/**
 * Helper hook for isomorphic useLayoutEffect
 * Uses useLayoutEffect on client, useEffect on server
 */
export function useIsomorphicLayoutEffect(callback: React.EffectCallback, deps?: React.DependencyList) {
  const isServer = typeof window === 'undefined';
  return isServer ? useEffect(callback, deps) : useIsomorphicLayoutEffect(callback, deps);
} 