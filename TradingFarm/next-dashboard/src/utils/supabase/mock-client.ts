import { createClient } from '@supabase/supabase-js';
import mockDataService from './mocks-index';
import { mockFarmManager, mockFarmResponse } from './mocks-farm';
import { getCurrentUser, getCurrentSession, isAuthenticated } from './mocks-auth';
import { getApiServiceProviders } from './mocks-api';

// Define the mock agent store interface
interface MockAgentStore {
  agents: any[];
  elizaAgents: any[];
}

// Extend Window interface
declare global {
  interface Window {
    mockAgentStore: MockAgentStore;
  }
}

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

  // Create persistent store for agents if it doesn't exist
  if (typeof window !== 'undefined') {
    if (!window.mockAgentStore) {
      window.mockAgentStore = {
        agents: mockDataService.getStandardAgents() || [],
        elizaAgents: mockDataService.getElizaAgents() || []
      };
    }
  }

  return {
    // Auth methods
    auth: {
      getUser: async () => {
        return { data: { user: getCurrentUser() }, error: null };
      },
      getSession: async () => {
        return { data: { session: getCurrentSession() }, error: null };
      },
      signInWithPassword: async () => {
        return { data: { user: getCurrentUser(), session: getCurrentSession() }, error: null };
      },
      signOut: async () => {
        return { error: null };
      },
      onAuthStateChange: (callback: Function) => {
        // Immediately call with authenticated state
        callback('SIGNED_IN', { user: getCurrentUser() });
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
                  if (typeof window !== 'undefined' && window.mockAgentStore) {
                    if (column === 'id' && value) {
                      const agent = window.mockAgentStore.agents.find((a: any) => a.id === value);
                      result = agent ? [agent] : [];
                    } else {
                      result = window.mockAgentStore.agents;
                    }
                  } else {
                    result = mockDataService.getStandardAgents();
                  }
                  break;
                case 'eliza_agents':
                  if (typeof window !== 'undefined' && window.mockAgentStore) {
                    if (column === 'id' && value) {
                      const agent = window.mockAgentStore.elizaAgents.find((a: any) => a.id === value);
                      result = agent ? [agent] : [];
                    } else {
                      result = window.mockAgentStore.elizaAgents;
                    }
                  } else {
                    result = mockDataService.getElizaAgents();
                  }
                  break;
                case 'api_service_providers': 
                  result = getApiServiceProviders() || [];
                  break;
                case 'user_api_configurations':
                  if (column === 'user_id') {
                    result = mockDataService.getUserApiConfigurations(value);
                  } else {
                    result = [];
                  }
                  break;
                case 'agent_api_services':
                  if (column === 'agent_id') {
                    result = mockDataService.getAgentApiServices(value);
                  } else {
                    result = [];
                  }
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
                      if (typeof window !== 'undefined' && window.mockAgentStore) {
                        result = window.mockAgentStore.agents;
                      } else {
                        result = mockDataService.getStandardAgents();
                      }
                      break;
                    case 'eliza_agents':
                      if (typeof window !== 'undefined' && window.mockAgentStore) {
                        result = window.mockAgentStore.elizaAgents;
                      } else {
                        result = mockDataService.getElizaAgents();
                      }
                      break;
                    case 'api_service_providers':
                      result = getApiServiceProviders() || [];
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
                  if (typeof window !== 'undefined' && window.mockAgentStore) {
                    result = window.mockAgentStore.agents;
                  } else {
                    result = mockDataService.getStandardAgents();
                  }
                  break;
                case 'eliza_agents':
                  if (typeof window !== 'undefined' && window.mockAgentStore) {
                    result = window.mockAgentStore.elizaAgents;
                  } else {
                    result = mockDataService.getElizaAgents();
                  }
                  break;
                case 'api_service_providers':
                  result = getApiServiceProviders() || [];
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
        insert: (data: any) => ({
          then: (callback: Function) => {
            // Mock object with new ID and timestamp
            const newItem = {
              id: `${table}-${Date.now()}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...data
            };

            // Handle specific tables with data persistence
            if (table === 'farms') {
              // Use the persistent farm manager for farm creation
              const farm = mockFarmManager.createFarm(newItem);
              callback({ data: farm, error: null });
            } else if (table === 'agents' && typeof window !== 'undefined' && window.mockAgentStore) {
              // Add to persistent store and log for debugging
              console.log('[MOCK] Creating new agent:', newItem);
              window.mockAgentStore.agents.push(newItem);
              callback({ data: newItem, error: null });
            } else if (table === 'eliza_agents' && typeof window !== 'undefined' && window.mockAgentStore) {
              // Add to persistent store and log for debugging
              console.log('[MOCK] Creating new Eliza agent:', newItem);
              window.mockAgentStore.elizaAgents.push(newItem);
              callback({ data: newItem, error: null });
            } else {
              // Default mock response for other tables
              callback({ data: newItem, error: null });
            }
          }
        }),
        update: (data: any) => ({
          eq: (column: string, value: any) => ({
            then: (callback: Function) => {
              if (table === 'farms' && column === 'id') {
                // Use the persistent farm manager for farm updates
                const updatedFarm = mockFarmManager.updateFarm(value, data);
                callback({ data: updatedFarm, error: null });
              } else if (table === 'agents' && column === 'id' && typeof window !== 'undefined' && window.mockAgentStore) {
                // Update agent in the persistent store
                const index = window.mockAgentStore.agents.findIndex((a: any) => a.id === value);
                if (index >= 0) {
                  window.mockAgentStore.agents[index] = { ...window.mockAgentStore.agents[index], ...data };
                  callback({ data: window.mockAgentStore.agents[index], error: null });
                } else {
                  callback({ data: null, error: { message: 'Agent not found' } });
                }
              } else if (table === 'eliza_agents' && column === 'id' && typeof window !== 'undefined' && window.mockAgentStore) {
                // Update Eliza agent in the persistent store
                const index = window.mockAgentStore.elizaAgents.findIndex((a: any) => a.id === value);
                if (index >= 0) {
                  window.mockAgentStore.elizaAgents[index] = { ...window.mockAgentStore.elizaAgents[index], ...data };
                  callback({ data: window.mockAgentStore.elizaAgents[index], error: null });
                } else {
                  callback({ data: null, error: { message: 'Eliza agent not found' } });
                }
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
              } else if (table === 'agents' && column === 'id' && typeof window !== 'undefined' && window.mockAgentStore) {
                // Remove agent from the persistent store
                const index = window.mockAgentStore.agents.findIndex((a: any) => a.id === value);
                if (index >= 0) {
                  window.mockAgentStore.agents.splice(index, 1);
                  callback({ data: { success: true }, error: null });
                } else {
                  callback({ data: { success: false }, error: { message: 'Agent not found' } });
                }
              } else if (table === 'eliza_agents' && column === 'id' && typeof window !== 'undefined' && window.mockAgentStore) {
                // Remove Eliza agent from the persistent store
                const index = window.mockAgentStore.elizaAgents.findIndex((a: any) => a.id === value);
                if (index >= 0) {
                  window.mockAgentStore.elizaAgents.splice(index, 1);
                  callback({ data: { success: true }, error: null });
                } else {
                  callback({ data: { success: false }, error: { message: 'Eliza agent not found' } });
                }
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
