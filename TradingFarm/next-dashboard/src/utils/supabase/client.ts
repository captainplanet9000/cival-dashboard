/**
 * Supabase Browser Client
 * Use this in client components to interact with Supabase
 */
import { createClient } from '@supabase/supabase-js';
import type { ExtendedDatabase } from '@/types/supabase-extensions';
import * as mockData from './mocks';

// Import development configuration (this file is not in .gitignore)
// @ts-ignore - Dynamic import
let devConfig: any = { mockDataConfig: { enabled: false, forceMockMode: false }, supabaseConfig: {} };
try {
  // Try to load the development config dynamically
  if (typeof window !== 'undefined') {
    // Only attempt to load in browser environment
    const script = document.createElement('script');
    script.src = '/dev.config.js';
    script.async = false;
    script.onload = () => {
      // @ts-ignore - Window variable
      devConfig = window.devConfig || devConfig;
      console.info('✓ Development config loaded successfully');
    };
    document.head.appendChild(script);
  }
} catch (e) {
  console.warn('Could not load development config:', e);
}

// Load configuration from environment variables with dev config fallback
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || devConfig.supabaseConfig?.url;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || devConfig.supabaseConfig?.anonKey;

// Mock settings from env or dev config
const mockApiEnabled = 
  process.env.NEXT_PUBLIC_MOCK_API_ENABLED === 'true' || 
  devConfig.mockDataConfig?.enabled === true;

const forceMockMode = 
  process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true' || 
  devConfig.mockDataConfig?.forceMockMode === true;

// Local state to track connection failures
let connectionFailed = false;

// Validate configuration is available
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key missing from environment variables and dev config');
  connectionFailed = true;
}

/**
 * Creates a Supabase client for use in browser environments
 * Will automatically use mock data if connection fails or mock mode is forced
 */
export function createBrowserClient() {
  // Log current mode for development clarity
  console.info(`🔧 Supabase client mode: ${(forceMockMode || connectionFailed) && mockApiEnabled ? 'MOCK DATA' : 'REAL CONNECTION'}`);
  
  // If mocks are forced or connection already failed and mocks are enabled, use mock client
  if ((forceMockMode || connectionFailed) && mockApiEnabled) {
    console.info('Using mock Supabase client (Mock API Enabled)');
    return createMockClient();
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ Supabase connection failed: Missing configuration');
    
    if (mockApiEnabled) {
      console.info('Falling back to mock data');
      return createMockClient();
    }
    
    // Return a dummy client that won't actually connect but won't break the app
    // This is better than returning null which would cause runtime errors
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  // Create a real client with error handling
  try {
    const client = createClient<ExtendedDatabase>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        fetch: fetch.bind(globalThis),
        headers: { 'x-application-name': 'trading-farm-dashboard' }
      }
    });

    // Test the connection after creation
    testConnection(client);
    
    return client;
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    connectionFailed = true;
    
    if (mockApiEnabled) {
      console.info('Falling back to mock data after connection error');
      return createMockClient();
    }
    
    // Return dummy client as fallback
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
}

// Function to create a mock client that simulates Supabase responses
function createMockClient() {
  // Create a base client to extend
  const baseClient = createClient('https://example.com', 'mock-key');
  
  // Override methods to return mock data
  return {
    ...baseClient,
    // Override auth
    auth: {
      ...baseClient.auth,
      getUser: async () => ({ data: { user: mockData.mockUsers[0] }, error: null }),
      getSession: async () => ({ data: { session: { user: mockData.mockUsers[0] } }, error: null }),
      onAuthStateChange: (callback: any) => {
        // Simulate auth state loaded
        setTimeout(() => {
          callback('SIGNED_IN', { user: mockData.mockUsers[0] });
        }, 100);
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
    },
    // Table query builder
    from: (tableName: string) => {
      return {
        select: (columns = '*') => {
          return {
            eq: (column: string, value: any) => {
              // Handle different tables
              if (tableName === 'farms') {
                if (column === 'owner_id') {
                  return mockData.mockTableResponse(mockData.mockFarms.filter(f => f.owner_id === value));
                }
                return mockData.mockTableResponse(mockData.mockFarms);
              }
              
              if (tableName === 'layouts') {
                return mockData.mockTableResponse(mockData.mockLayouts);
              }
              
              if (tableName === 'agents') {
                return mockData.mockTableResponse(mockData.mockAgents.filter(a => a.farm_id === value));
              }
              
              if (tableName === 'vault_master') {
                return mockData.mockTableResponse(mockData.mockVaultMaster);
              }
              
              if (tableName === 'vault_transactions') {
                return mockData.mockTableResponse(mockData.mockVaultTransactions);
              }
              
              if (tableName === 'markets') {
                return mockData.mockTableResponse(mockData.mockMarkets);
              }
              
              // Default empty response for unknown tables
              return mockData.mockTableResponse([]);
            },
            // Add support for non-filtered queries
            limit: () => mockData.mockTableResponse([]),
            order: () => ({ limit: () => mockData.mockTableResponse([]) }),
          };
        },
        insert: () => mockData.mockTableResponse([{ id: 'new-mock-id' }]),
        update: () => mockData.mockTableResponse([{ updated: true }]),
        delete: () => mockData.mockTableResponse([{ deleted: true }]),
      };
    }
  };
}

// Test the Supabase connection and set the connectionFailed flag if needed
async function testConnection(client: any) {
  try {
    // Execute a simple query to test connection
    const { error } = await client.from('health_check').select('*').limit(1).maybeSingle();
    
    if (error) {
      console.warn('Supabase connection test failed:', error.message);
      connectionFailed = true;
    } else {
      console.info('✓ Supabase connection successful');
      connectionFailed = false;
    }
  } catch (error) {
    console.error('Supabase connection test error:', error);
    connectionFailed = true;
  }
}

// Singleton pattern for client-side usage
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get a singleton instance of the Supabase client for browser use
 */
export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient();
  }
  return browserClient;
}
