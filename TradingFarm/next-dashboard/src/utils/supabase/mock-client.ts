import { createClient } from '@supabase/supabase-js';
import mockDataService from './mocks-index';
import { mockFarmManager, mockFarmResponse } from './mocks-farm';

// Create a mock implementation of the Supabase client
export function createMockClient() {
  // Mock for realtime subscriptions
  const mockRealtimeSubscription = {
    on: (event: string, callback: Function) => {
      // Simulate successful subscription
      console.log(`[MOCK] Subscribed to ${event}`);
      return mockRealtimeSubscription;
    },
    subscribe: (callback?: Function) => {
      if (callback) {
        callback();
      }
      return {
        unsubscribe: () => console.log('[MOCK] Unsubscribed')
      };
    }
  };

  // Initiate mock farm manager
  mockFarmManager.initialize();

  return {
    // Auth methods
    auth: {
      getUser: async () => {
        return { data: { user: mockDataService.getCurrentUser() }, error: null };
      },
      signInWithPassword: async () => {
        return { data: { user: mockDataService.getCurrentUser() }, error: null };
      },
      signOut: async () => {
        return { error: null };
      },
      onAuthStateChange: (callback: Function) => {
        // Immediately call with authenticated state
        callback('SIGNED_IN', { user: mockDataService.getCurrentUser() });
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
    },
    
    // Database methods
    from: (table: string) => {
      return {
        select: (columns = '*') => {
          return {
            eq: (column: string, value: any) => {
              let result: any[] = [];
              
              // Map table names to mock data
              switch (table) {
                case 'farms':
                  // Use the persistent farm manager
                  if (column === 'id') {
                    const farm = mockFarmManager.getFarmById(value);
                    result = farm ? [farm] : [];
                  } else if (column === 'owner_id') {
                    result = mockFarmManager.getFarmsByOwnerId(value);
                  } else {
                    result = mockFarmManager.getAllFarms();
                  }
                  break;
                case 'agents':
                  result = value ? [mockDataService.getAgent(value)] : mockDataService.getStandardAgents();
                  break;
                case 'eliza_agents':
                  result = value ? [mockDataService.getAgent(value)] : mockDataService.getElizaAgents();
                  break;
                case 'goals':
                  result = value ? [mockDataService.getGoal(value)] : [];
                  break;
                case 'orders':
                  result = value ? [mockDataService.getOrder(value)] : [];
                  break;
                case 'vaults':
                  result = value ? mockDataService.getVaultsByFarm(value) : [];
                  break;
                case 'exchange_connections':
                  result = value ? mockDataService.getExchangeConnections(value) : [];
                  break;
                case 'markets':
                  result = mockDataService.getMarkets();
                  break;
                default:
                  result = [];
              }
              
              return {
                order: () => ({
                  limit: () => ({
                    then: (callback: Function) => {
                      callback({ data: result, error: null });
                    }
                  }),
                  then: (callback: Function) => {
                    callback({ data: result, error: null });
                  }
                }),
                limit: () => ({
                  then: (callback: Function) => {
                    callback({ data: result, error: null });
                  }
                }),
                then: (callback: Function) => {
                  callback({ data: result, error: null });
                }
              };
            },
            in: (column: string, values: any[]) => ({
              then: (callback: Function) => {
                let result: any[] = [];
                // Handle 'in' queries for farms
                if (table === 'farms' && column === 'id') {
                  result = values
                    .map(id => mockFarmManager.getFarmById(id))
                    .filter(Boolean);
                }
                callback({ data: result, error: null });
              }
            }),
            order: () => ({
              limit: () => ({
                then: (callback: Function) => {
                  // Return appropriate mock data based on table
                  let result: any[] = [];
                  switch(table) {
                    case 'farms':
                      result = mockFarmManager.getAllFarms();
                      break;
                    case 'agents':
                      result = mockDataService.getStandardAgents();
                      break;
                    case 'eliza_agents':
                      result = mockDataService.getElizaAgents();
                      break;
                    case 'markets':
                      result = mockDataService.getMarkets();
                      break;
                    default:
                      result = [];
                  }
                  callback({ data: result, error: null });
                }
              }),
              then: (callback: Function) => {
                // Use persistent farm manager for farms
                const result = table === 'farms' 
                  ? mockFarmManager.getAllFarms() 
                  : [];
                callback({ data: result, error: null });
              }
            }),
            limit: () => ({
              then: (callback: Function) => {
                // Use persistent farm manager for farms
                const result = table === 'farms' 
                  ? mockFarmManager.getAllFarms() 
                  : [];
                callback({ data: result, error: null });
              }
            }),
            then: (callback: Function) => {
              // Return appropriate mock data based on table
              let result: any[] = [];
              switch(table) {
                case 'farms':
                  // Use the persistent farm manager
                  result = mockFarmManager.getAllFarms();
                  break;
                case 'agents':
                  result = mockDataService.getStandardAgents();
                  break;
                case 'eliza_agents':
                  result = mockDataService.getElizaAgents();
                  break;
                case 'markets':
                  result = mockDataService.getMarkets();
                  break;
                default:
                  result = [];
              }
              callback({ data: result, error: null });
            }
          };
        },
        insert: (data) => ({
          then: (callback: Function) => {
            if (table === 'farms') {
              // Use the persistent farm manager for farm creation
              const newFarm = mockFarmManager.createFarm(data);
              callback({ data: newFarm, error: null });
            } else {
              // Default mock response for other tables
              callback({ data: { id: 'new-mock-id', ...data }, error: null });
            }
          }
        }),
        update: (data) => ({
          eq: (column: string, value: any) => ({
            then: (callback: Function) => {
              if (table === 'farms' && column === 'id') {
                // Use the persistent farm manager for farm updates
                const updatedFarm = mockFarmManager.updateFarm(value, data);
                callback({ data: updatedFarm, error: null });
              } else {
                // Default mock response for other tables
                callback({ data: { id: value, ...data }, error: null });
              }
            }
          })
        }),
        delete: () => ({
          eq: (column: string, value: any) => ({
            then: (callback: Function) => {
              if (table === 'farms' && column === 'id') {
                // Use the persistent farm manager for farm deletion
                const success = mockFarmManager.deleteFarm(value);
                callback({ data: { success }, error: null });
              } else {
                // Default mock response for other tables
                callback({ data: { success: true }, error: null });
              }
            }
          })
        }),
        // Mock realtime subscriptions
        on: () => mockRealtimeSubscription
      };
    },
    
    // Storage methods
    storage: {
      from: (bucket: string) => ({
        upload: () => ({ data: { path: 'mock-file-path' }, error: null }),
        download: () => ({ data: new Blob(), error: null }),
        list: () => ({ data: [], error: null }),
        remove: () => ({ data: {}, error: null })
      })
    },
    
    // Mock realtime subscriptions
    channel: (name: string) => ({
      on: (event: string, callback: Function) => {
        console.log(`[MOCK] Created channel: ${name}, event: ${event}`);
        return {
          subscribe: (cb?: Function) => {
            if (cb) cb();
            return {
              unsubscribe: () => {}
            };
          }
        };
      }
    })
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
