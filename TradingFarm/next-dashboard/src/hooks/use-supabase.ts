/**
 * Supabase Hooks
 * 
 * Custom React hooks for common Supabase operations with error handling
 */

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { 
  handleSupabaseError, 
  ErrorSource, 
  ErrorCategory 
} from '@/utils/error-handling';
import { RealtimeChannel } from '@supabase/supabase-js';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Generic result type for Supabase operations
 */
export interface QueryResult<T> {
  data: T | null;
  error: Error | PostgrestError | null;
  isLoading: boolean;
  isError: boolean;
  mutate: () => Promise<void>;
}

/**
 * Options for useSupabaseQuery
 */
export interface SupabaseQueryOptions {
  enabled?: boolean;
  errorMessage?: string;
  showErrorToast?: boolean;
  logErrors?: boolean;
  dependencies?: any[];
}

/**
 * Hook for executing Supabase queries with built-in error handling
 * 
 * @param queryFn Function that executes the Supabase query
 * @param options Configuration options
 * @returns Query result with data, error state, and refetch function
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: SupabaseQueryOptions = {}
): QueryResult<T> {
  const {
    enabled = true,
    errorMessage = 'Error fetching data',
    showErrorToast = true,
    logErrors = true,
    dependencies = []
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | PostgrestError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchData = async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await queryFn();

      if (error) {
        setError(error);
        setData(null);
        
        // Handle error with our utility
        handleSupabaseError(error, errorMessage, {
          showToast: showErrorToast,
          logToConsole: logErrors,
          contextData: { hook: 'useSupabaseQuery' }
        });
      } else {
        setData(data);
        setError(null);
      }
    } catch (err) {
      setError(err as Error);
      setData(null);
      
      // Handle unexpected errors
      handleSupabaseError(err, errorMessage, {
        showToast: showErrorToast,
        logToConsole: logErrors,
        contextData: { hook: 'useSupabaseQuery' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies]);

  const mutate = async () => {
    await fetchData();
  };

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    mutate
  };
}

/**
 * Hook for fetching a single record by ID
 * 
 * @param table Supabase table name
 * @param id Record ID
 * @param options Query options
 * @returns Query result
 */
export function useRecord<T>(
  table: string,
  id: string | undefined,
  options: SupabaseQueryOptions = {}
): QueryResult<T> {
  return useSupabaseQuery<T>(
    async () => {
      if (!id) return { data: null, error: null };
      const supabase = createBrowserClient();
      return await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
    },
    {
      ...options,
      errorMessage: options.errorMessage || `Error fetching ${table} record`,
      enabled: options.enabled !== undefined ? options.enabled : !!id,
      dependencies: [...(options.dependencies || []), table, id]
    }
  );
}

/**
 * Hook for fetching multiple records
 * 
 * @param table Supabase table name
 * @param queryBuilder Function to customize the query
 * @param options Query options
 * @returns Query result with array of records
 */
export function useRecords<T>(
  table: string,
  queryBuilder?: (query: any) => any,
  options: SupabaseQueryOptions = {}
): QueryResult<T[]> {
  return useSupabaseQuery<T[]>(
    async () => {
      const supabase = createBrowserClient();
      let query = supabase.from(table).select('*');
      
      if (queryBuilder) {
        query = queryBuilder(query);
      }
      
      return await query;
    },
    {
      ...options,
      errorMessage: options.errorMessage || `Error fetching ${table} records`,
      dependencies: [...(options.dependencies || []), table]
    }
  );
}

/**
 * Options for useRealtimeSubscription
 */
export interface RealtimeSubscriptionOptions {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  filterValues?: any[];
  onSubscriptionError?: (error: Error) => void;
}

/**
 * Hook for Supabase realtime subscriptions
 * 
 * @param table Table to subscribe to
 * @param callback Function to call when new data arrives
 * @param options Subscription options
 */
export function useRealtimeSubscription<T>(
  table: string,
  callback: (payload: { new: T; old: T }) => void,
  options: RealtimeSubscriptionOptions = {}
): { isSubscribed: boolean; unsubscribe: () => void } {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const {
    event = '*',
    filter,
    filterValues = [],
    onSubscriptionError
  } = options;

  useEffect(() => {
    const supabase = createBrowserClient();
    
    // Create and set up the channel
    const newChannel = supabase
      .channel(`table:${table}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table, filter, filter_values: filterValues },
        (payload) => {
          callback(payload as unknown as { new: T; old: T });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
        } else if (status === 'CHANNEL_ERROR') {
          setIsSubscribed(false);
          onSubscriptionError && onSubscriptionError(new Error('Subscription error'));
        }
      });

    setChannel(newChannel);

    // Cleanup function
    return () => {
      newChannel.unsubscribe();
      setIsSubscribed(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, event, filter, JSON.stringify(filterValues)]);

  const unsubscribe = () => {
    if (channel) {
      channel.unsubscribe();
      setIsSubscribed(false);
    }
  };

  return { isSubscribed, unsubscribe };
}

/**
 * Hook for executing a Supabase mutation (insert, update, delete)
 * 
 * @returns Mutation functions and state
 */
export function useSupabaseMutation<T, TInput = any>(
  table: string,
  operation: 'insert' | 'update' | 'delete' | 'upsert'
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | PostgrestError | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = async (input: TInput, options: { 
    idField?: string; 
    id?: string;
    errorMessage?: string;
    onSuccess?: (data: T) => void;
    onError?: (error: Error | PostgrestError) => void;
    returningSingle?: boolean;
  } = {}) => {
    const {
      idField = 'id',
      id,
      errorMessage = `Error performing ${operation} on ${table}`,
      onSuccess,
      onError,
      returningSingle = true
    } = options;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      let query;

      switch (operation) {
        case 'insert':
          query = supabase.from(table).insert(input);
          break;
        case 'update':
          if (!id) throw new Error('ID is required for update operations');
          query = supabase.from(table).update(input).eq(idField, id);
          break;
        case 'delete':
          if (!id) throw new Error('ID is required for delete operations');
          query = supabase.from(table).delete().eq(idField, id);
          break;
        case 'upsert':
          query = supabase.from(table).upsert(input);
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      // Add returning
      if (returningSingle) {
        query = query.select().single();
      } else {
        query = query.select();
      }

      const { data, error } = await query;

      if (error) {
        setError(error);
        
        handleSupabaseError(error, errorMessage, {
          showToast: true,
          contextData: { operation, table, input }
        });
        
        onError && onError(error);
        return { data: null, error };
      }

      setData(data);
      onSuccess && onSuccess(data);
      return { data, error: null };
    } catch (err) {
      const error = err as Error;
      setError(error);
      
      handleSupabaseError(error, errorMessage, {
        showToast: true,
        contextData: { operation, table, input }
      });
      
      onError && onError(error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    execute,
    isLoading,
    error,
    data,
    isError: error !== null
  };
}

/**
 * Hook for checking if the user has a specific permission
 * 
 * @param permissionKey The permission key to check
 * @returns Whether the user has the permission and loading state
 */
export function usePermission(permissionKey: string) {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkPermission = async () => {
      const supabase = createBrowserClient();
      
      try {
        const { data, error } = await supabase
          .rpc('check_permission', { permission_key: permissionKey });
          
        if (error) {
          throw error;
        }
        
        setHasPermission(data === true);
      } catch (err) {
        handleSupabaseError(err, 'Error checking permissions', {
          showToast: false,
          logToConsole: true
        });
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkPermission();
  }, [permissionKey]);
  
  return { hasPermission, isLoading };
}
