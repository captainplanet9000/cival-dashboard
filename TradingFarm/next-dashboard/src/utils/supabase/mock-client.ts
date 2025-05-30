import { createClient } from '@supabase/supabase-js';
import { PostgrestClient } from '@supabase/postgrest-js';
import mockDataService, { getMockResponse } from './mocks-index';

/**
 * Creates a mock Supabase client for testing/development
 */
export function createMockClient(options = {}) {
  /**
   * Mock implementation of the auth methods
   */
  const auth = {
    getUser: async () => {
      try {
        const req = new Request('https://supabase.mock/auth/v1/user', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const response = await getMockResponse('/auth/v1/user', req);
        const data = await response.json();
        
        return { data: data, error: null };
      } catch (error) {
        console.error('Error in mock getUser:', error);
        return { data: { user: null }, error };
      }
    },
    signOut: async () => {
      return { error: null };
    },
    // Add other auth methods as needed
  };
  
  /**
   * Mock implementation of the storage methods
   */
  const storage = {
    from: (bucket: string) => {
      return {
        getPublicUrl: (path: string) => {
          return {
            data: { publicUrl: `https://supabase.mock/storage/v1/object/${bucket}/${path}` }
          };
        },
        list: async (path: string) => {
          try {
            const req = new Request(`https://supabase.mock/storage/v1/object/${bucket}?path=${path}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            const response = await getMockResponse(`/storage/v1/object/${bucket}`, req);
            const data = await response.json();
            
            return { data, error: null };
          } catch (error) {
            console.error(`Error in mock storage.from(${bucket}).list:`, error);
            return { data: null, error };
          }
        },
        // Add other storage methods as needed
      };
    }
  };
  
  /**
   * Creates a function that generates a PostgrestClient-like object
   * that returns mock data for a given table
   */
  const mockFrom = (table: string) => {
    /**
     * Mock implementation of the PostgrestClient
     */
    const mockClient = {
      select: (columns = '*', options = {}) => {
        return {
          ...mockClient,
          _action: 'select',
          _columns: columns,
          _options: options
        };
      },
      insert: (values: any, options = {}) => {
        return {
          ...mockClient,
          _action: 'insert',
          _values: values,
          _options: options
        };
      },
      update: (values: any, options = {}) => {
        return {
          ...mockClient,
          _action: 'update',
          _values: values,
          _options: options
        };
      },
      delete: (options = {}) => {
        return {
          ...mockClient,
          _action: 'delete',
          _options: options
        };
      },
      upsert: (values: any, options = {}) => {
        return {
          ...mockClient,
          _action: 'upsert',
          _values: values,
          _options: options
        };
      },
      eq: (column: string, value: any) => {
        return {
          ...mockClient,
          _filters: { ...mockClient._filters, [column]: value },
        };
      },
      neq: (column: string, value: any) => {
        return {
          ...mockClient,
          _filters: { ...mockClient._filters, [`${column}__neq`]: value },
        };
      },
      gt: (column: string, value: any) => {
        return {
          ...mockClient,
          _filters: { ...mockClient._filters, [`${column}__gt`]: value },
        };
      },
      gte: (column: string, value: any) => {
        return {
          ...mockClient,
          _filters: { ...mockClient._filters, [`${column}__gte`]: value },
        };
      },
      lt: (column: string, value: any) => {
        return {
          ...mockClient,
          _filters: { ...mockClient._filters, [`${column}__lt`]: value },
        };
      },
      lte: (column: string, value: any) => {
        return {
          ...mockClient,
          _filters: { ...mockClient._filters, [`${column}__lte`]: value },
        };
      },
      in: (column: string, values: any[]) => {
        return {
          ...mockClient,
          _filters: { ...mockClient._filters, [`${column}__in`]: values },
        };
      },
      filter: (column: string, operator: string, value: any) => {
        return {
          ...mockClient,
          _filters: { 
            ...mockClient._filters, 
            [`${column}__filter`]: { operator, value } 
          },
        };
      },
      like: (column: string, pattern: string) => {
        return {
          ...mockClient,
          _filters: { ...mockClient._filters, [`${column}__like`]: pattern },
        };
      },
      ilike: (column: string, pattern: string) => {
        return {
          ...mockClient,
          _filters: { ...mockClient._filters, [`${column}__ilike`]: pattern },
        };
      },
      is: (column: string, value: any) => {
        return {
          ...mockClient,
          _filters: { ...mockClient._filters, [`${column}__is`]: value },
        };
      },
      order: (column: string, options = {}) => {
        return {
          ...mockClient,
          _order: { column, options },
        };
      },
      limit: (count: number) => {
        return {
          ...mockClient,
          _limit: count,
        };
      },
      single: () => {
        return {
          ...mockClient,
          _single: true,
        };
      },
      range: (from: number, to: number) => {
        return {
          ...mockClient,
          _range: { from, to },
        };
      },
      then: async (onFulfilled?: any, onRejected?: any) => {
        try {
          // Generate mock request based on the operation
          const method = mockClient._action === 'select' ? 'GET' : 
                        mockClient._action === 'insert' ? 'POST' :
                        mockClient._action === 'update' ? 'PATCH' :
                        mockClient._action === 'delete' ? 'DELETE' : 'POST';
          
          let url = `https://supabase.mock/rest/v1/${table}`;
          let body = null;
          
          // Add query parameters based on the operation
          const queryParams = new URLSearchParams();
          
          if (mockClient._action === 'select') {
            queryParams.append('select', mockClient._columns);
          }
          
          // Add filters
          if (mockClient._filters) {
            Object.entries(mockClient._filters).forEach(([key, value]) => {
              queryParams.append(key, JSON.stringify(value));
            });
          }
          
          // Add limit
          if (mockClient._limit) {
            queryParams.append('limit', mockClient._limit.toString());
          }
          
          // Add ordering
          if (mockClient._order) {
            queryParams.append('order', `${mockClient._order.column}.${mockClient._order.options.ascending ? 'asc' : 'desc'}`);
          }
          
          // Add range
          if (mockClient._range) {
            queryParams.append('offset', mockClient._range.from.toString());
            queryParams.append('limit', (mockClient._range.to - mockClient._range.from + 1).toString());
          }
          
          // For insert, update, upsert operations, add values as body
          if (['insert', 'update', 'upsert'].includes(mockClient._action)) {
            body = mockClient._values;
          }
          
          // Add query string to URL
          const queryString = queryParams.toString();
          if (queryString) {
            url += `?${queryString}`;
          }
          
          const req = new Request(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
            },
            ...(body && { body: JSON.stringify(body) })
          });
          
          // For special case handling of ElizaOS routes
          if (table === 'eliza_memories') {
            const response = await getMockResponse('/rest/v1/eliza_memories', req);
            const data = await response.json();
            return { data: data.data, error: null, count: data.data?.length || 0 };
          } else if (table === 'eliza_commands') {
            const response = await getMockResponse('/rest/v1/eliza_commands', req);
            const data = await response.json();
            return { data: data.data, error: null };
          } else if (table === 'eliza_command_responses') {
            const response = await getMockResponse('/rest/v1/eliza_command_responses', req);
            const data = await response.json();
            return { data: data.data, error: null };
          }
          
          // Get mock response from mock data service
          const mockData = await mockDataService.getMockData(table, {
            action: mockClient._action,
            filters: mockClient._filters || {},
            single: mockClient._single || false,
            values: mockClient._values,
            limit: mockClient._limit,
            order: mockClient._order,
            range: mockClient._range,
          });
          
          return mockData;
        } catch (error) {
          console.error(`Error in mock ${mockClient._action} operation:`, error);
          return onRejected ? onRejected(error) : { data: null, error };
        }
      },
      // Initial state
      _filters: {},
      _action: '',
      _columns: '',
      _values: null,
      _options: {},
      _limit: undefined,
      _single: false,
      _order: undefined,
      _range: undefined,
    };
    
    return mockClient;
  };
  
  // Return the mock client with all required methods
  return {
    auth,
    storage,
    from: mockFrom,
    // Special function for goal coordination 
    rpc: (fn: string, params: any) => {
      if (fn === 'get_goal_coordination') {
        // Mock RPC call for goal coordination
        return {
          then: async (onFulfilled?: any, onRejected?: any) => {
            try {
              const req = new Request(`https://supabase.mock/goals/acquisition/coordination?goalId=${params?.goalId || ''}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                }
              });
              
              const response = await getMockResponse('/goals/acquisition/coordination', req);
              const data = await response.json();
              
              return onFulfilled ? onFulfilled(data) : data;
            } catch (error) {
              console.error(`Error in mock RPC call to ${fn}:`, error);
              return onRejected ? onRejected(error) : { data: null, error };
            }
          }
        };
      }
      
      // Default RPC response for unknown functions
      return {
        then: async (onFulfilled?: any, onRejected?: any) => {
          return onFulfilled ? onFulfilled({ data: null }) : { data: null };
        }
      };
    }
  };
}

// Use this for client components
export function createBrowserClient() {
  // Attempt to use actual Supabase if credentials are available
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
    } catch (e) {
      console.log('Error creating Supabase client, using mock instead:', e);
    }
  }
  
  // Fallback to mock
  console.log('Using mock Supabase client');
  return createMockClient() as any;
}

// Use this for server components
export async function createServerClient() {
  // Attempt to use actual Supabase if credentials are available
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
    } catch (e) {
      console.log('Error creating Supabase server client, using mock instead:', e);
    }
  }
  
  // Fallback to mock
  console.log('Using mock Supabase server client');
  return createMockClient() as any;
}
