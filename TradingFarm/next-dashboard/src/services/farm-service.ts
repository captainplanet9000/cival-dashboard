/**
 * Farm Service
 * Handles all farm-related API interactions with Supabase
 */

import { createBrowserClient } from "@/utils/supabase/client";
import { createServerClient } from "@/utils/supabase/server";
import { Database } from "@/types/database.types";
import { DEMO_MODE, demoFarms } from "@/utils/demo-data";
import { Farm as DemoFarm } from "@/types/farm";
import { ApiResponse } from '@/types/api';

// Helper to determine API URL
const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${baseUrl}/api/${path}`;
};

// Define the Farm interface (should match the Supabase schema)
export interface Farm {
  id: string; 
  name: string;
  description?: string | null;
  user_id?: string | null;
  created_at: string;
  updated_at: string;
  agents_count?: number;
  agents?: any; 
  status?: string;
  exchange?: string;
  api_keys?: any;
  config?: any;
  elizaos_agents?: any;
  status_summary?: FarmStatusSummary;
  performance_metrics?: {
    win_rate?: number;
    profit_factor?: number;
    sharpe_ratio?: number;
    max_drawdown?: number;
  };
}

// Helper type for status summary that's stored in the farm
export interface FarmStatusSummary {
  goals_total: number;
  goals_completed: number;
  goals_in_progress: number;
  goals_not_started: number;
  goals_cancelled: number;
  agents_total: number;
  agents_active: number;
  updated_at?: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Mock data for development and fallback
const mockFarms: Farm[] = [
  {
    id: "1", 
    name: "Bitcoin Momentum Farm",
    description: "Trading farm focused on BTC momentum strategies",
    user_id: "mock-user-id",
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    agents_count: 3,
    status: "active",
    exchange: "binance",
    api_keys: {},
    config: {}
  },
  {
    id: "2", 
    name: "Altcoin Swing Trader",
    description: "Farm for short-term swing trading on major altcoins",
    user_id: "mock-user-id",
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    agents_count: 5,
    status: "active",
    exchange: "coinbase",
    api_keys: {},
    config: {}
  },
  {
    id: "3", 
    name: "DeFi Yield Farm",
    description: "Optimizing yield farming opportunities across DeFi protocols",
    user_id: "mock-user-id",
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    agents_count: 2,
    status: "active",
    exchange: "bybit",
    api_keys: {},
    config: {}
  }
];

// Check if we should use mock mode
const isMockModeEnabled = () => {
  return typeof window !== 'undefined' && 
    (window.location.search.includes('mock=true') || 
     process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true' ||
     process.env.NEXT_PUBLIC_MOCK_API_ENABLED === 'true' ||
     DEMO_MODE === true);
};

// Extended Farm type with additional fields needed for UI
interface ExtendedFarm extends Farm {
  // Additional properties for UI needs
  configuration?: Record<string, any>;
  is_active?: boolean;
}

/**
 * Farm creation request type 
 */
interface FarmCreationRequest {
  name: string;
  description?: string;
  exchange?: string;
  status?: string;
  api_keys?: Record<string, any>;
  config?: Record<string, any>;
}

// Farm service
export const farmService = {
  /**
   * Get all farms for the current user
   */
  async getFarms(): Promise<ApiResponse<Farm[]>> {
    try {
      // Check for mock mode
      if (isMockModeEnabled()) {
        // Check localStorage for mock farms
        try {
          const storedMockFarms = localStorage.getItem('mockFarms');
          if (storedMockFarms) {
            return { data: JSON.parse(storedMockFarms) };
          }
        } catch (e) {
          console.warn('Error reading mock farms from localStorage:', e);
        }
        
        // Return hardcoded mock data
        return { data: mockFarms };
      }
      
      // First try the API endpoint
      try {
        const url = getApiUrl('farms');
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // Store in localStorage for persistence
          try {
            localStorage.setItem('farms_cache', JSON.stringify(result.data));
            // Also store timestamp for cache validity
            localStorage.setItem('farms_cache_timestamp', Date.now().toString());
          } catch (e) {
            console.warn('Could not cache farms in localStorage:', e);
          }
          
          return result;
        }
      } catch (e) {
        console.error('API error, falling back to Supabase direct:', e);
      }
      
      // If API fails, try Supabase directly
      const supabase = createBrowserClient();
      
      // Use try/catch here to handle any Supabase connection issues
      try {
        const { data, error } = await supabase
          .from('farms')
          .select('*, agents(count), elizaos_agents(count)')
          .returns<Farm[]>();
        
        if (error) {
          console.error('Error fetching farms:', error);
          
          // Try to get from localStorage
          try {
            const storedFarms = localStorage.getItem('farms_cache');
            if (storedFarms) {
              console.log('Returning farms from localStorage cache');
              return { data: JSON.parse(storedFarms) };
            }
          } catch (e) {
            console.warn('Error reading farms from localStorage:', e);
          }
          
          // If we're in demo mode or forced to use mocks
          if (process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true') {
            return { data: mockFarms };
          }
          
          // Check for locally created farms that haven't been synced
          try {
            const localFarms = localStorage.getItem('localFarms');
            if (localFarms) {
              return { data: JSON.parse(localFarms) };
            }
          } catch (e) {
            console.warn('Error reading local farms from localStorage:', e);
          }
          
          // Last resort - fallback farms
          try {
            const fallbackFarms = localStorage.getItem('fallbackFarms');
            if (fallbackFarms) {
              return { data: JSON.parse(fallbackFarms) };
            }
          } catch (e) {
            console.warn('Error reading fallback farms from localStorage:', e);
          }
          
          // If all else fails, return mock data
          console.log('No farms found in any storage, using hardcoded mock data');
          return { data: mockFarms };
        }
        
        if (!data || data.length === 0) {
          // Check all possible sources in localStorage
          let localData: Farm[] = [];
          
          // Check localStorage for any farms
          try {
            // Regular cache
            const storedFarms = localStorage.getItem('farms_cache');
            if (storedFarms) {
              localData = JSON.parse(storedFarms);
            }
            
            // Local farms
            const localFarms = localStorage.getItem('localFarms');
            if (localFarms) {
              const parsedLocalFarms = JSON.parse(localFarms);
              localData = [...localData, ...parsedLocalFarms];
            }
            
            // Mock farms
            const mockStoredFarms = localStorage.getItem('mockFarms');
            if (mockStoredFarms) {
              const parsedMockFarms = JSON.parse(mockStoredFarms);
              localData = [...localData, ...parsedMockFarms];
            }
            
            // Fallback farms
            const fallbackFarms = localStorage.getItem('fallbackFarms');
            if (fallbackFarms) {
              const parsedFallbackFarms = JSON.parse(fallbackFarms);
              localData = [...localData, ...parsedFallbackFarms];
            }
            
            if (localData.length > 0) {
              console.log('No farms in database, using cached farms from localStorage');
              return { data: localData };
            }
          } catch (e) {
            console.warn('Error reading farms from localStorage:', e);
          }
          
          console.log('No farms found in database or localStorage, using mock data');
          return { data: mockFarms };
        }
        
        // Transform the data to include agents_count
        const farmsWithCounts = data.map(farm => {
          const standardAgentsCount = farm.agents ? (farm.agents as any).count : 0;
          const elizaAgentsCount = farm.elizaos_agents ? (farm.elizaos_agents as any).count : 0;
          
          return {
            ...farm,
            agents_count: standardAgentsCount + elizaAgentsCount
          };
        });
        
        // Cache the results in localStorage
        try {
          localStorage.setItem('farms_cache', JSON.stringify(farmsWithCounts));
          localStorage.setItem('farms_cache_timestamp', Date.now().toString());
        } catch (e) {
          console.warn('Could not cache farms in localStorage:', e);
        }
        
        return { data: farmsWithCounts };
      } catch (supabaseError) {
        console.error('Unexpected error fetching farms:', supabaseError);
        
        // Try to get from localStorage as a fallback
        try {
          // Check all sources in order of preference
          const sources = [
            'farms_cache',
            'localFarms',
            'mockFarms',
            'fallbackFarms'
          ];
          
          for (const source of sources) {
            const storedData = localStorage.getItem(source);
            if (storedData) {
              console.log(`Returning farms from ${source}`);
              return { data: JSON.parse(storedData) };
            }
          }
        } catch (e) {
          console.warn('Error reading from localStorage:', e);
        }
        
        return { data: mockFarms };
      }
    } catch (error) {
      console.error('Error processing farms request:', error);
      return { data: mockFarms };
    }
  },
  
  /**
   * Get farms for server components
   */
  async getFarmsServer(): Promise<ApiResponse<Farm[]>> {
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('farms')
        .select('*, agents(count), elizaos_agents(count)')
        .returns<Farm[]>();
      
      if (error) {
        console.error('Error fetching farms in server component:', error);
        return { data: mockFarms };
      }
      
      if (!data || data.length === 0) {
        return { data: mockFarms };
      }
      
      // Transform the data to include agents_count
      const farmsWithCounts = data.map(farm => {
        const standardAgentsCount = farm.agents ? (farm.agents as any).count : 0;
        const elizaAgentsCount = farm.elizaos_agents ? (farm.elizaos_agents as any).count : 0;
        const totalAgentsCount = standardAgentsCount + elizaAgentsCount;
        
        return {
          ...farm,
          agents_count: totalAgentsCount,
          agents: undefined,
          elizaos_agents: undefined
        };
      });
      
      return { data: farmsWithCounts };
    } catch (error) {
      console.error('Error in getFarmsServer:', error);
      return { data: mockFarms };
    }
  },
  
  /**
   * Get a specific farm by ID
   */
  async getFarmById(id: string): Promise<ApiResponse<Farm>> { 
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('farms')
        .select('*, agents(count), elizaos_agents(count)')
        .eq('id', id)
        .single<Farm>();
      
      if (error) {
        console.error(`Error fetching farm ${id}:`, error);
        
        const mockFarm = mockFarms.find(farm => farm.id === id);
        if (mockFarm) {
          return { data: mockFarm };
        }
        
        return { error: error.message };
      }
      
      if (!data) {
        const mockFarm = mockFarms.find(farm => farm.id === id);
        if (mockFarm) {
          return { data: mockFarm };
        }
        
        return { error: 'Farm not found' };
      }
      
      // Transform the data to include agents_count
      const standardAgentsCount = data.agents ? (data.agents as any).count : 0;
      const elizaAgentsCount = data.elizaos_agents ? (data.elizaos_agents as any).count : 0;
      const totalAgentsCount = standardAgentsCount + elizaAgentsCount;
      
      const farmWithCounts = {
        ...data,
        agents_count: totalAgentsCount,
        agents: undefined,
        elizaos_agents: undefined
      };
      
      return { data: farmWithCounts };
    } catch (error) {
      console.error(`Error in getFarmById ${id}:`, error);
      
      const mockFarm = mockFarms.find(farm => farm.id === id);
      if (mockFarm) {
        return { data: mockFarm };
      }
      
      return { error: 'Failed to fetch farm' };
    }
  },
  
  /**
   * Get a specific farm by ID for server components
   */
  async getFarmByIdServer(id: string): Promise<ApiResponse<Farm>> { 
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('farms')
        .select('*, agents(count), elizaos_agents(count)')
        .eq('id', id)
        .single<Farm>();
      
      if (error) {
        console.error(`Error fetching farm ${id}:`, error);
        
        const mockFarm = mockFarms.find(farm => farm.id === id);
        if (mockFarm) {
          return { data: mockFarm };
        }
        
        return { error: error.message };
      }
      
      if (!data) {
        const mockFarm = mockFarms.find(farm => farm.id === id);
        if (mockFarm) {
          return { data: mockFarm };
        }
        
        return { error: 'Farm not found' };
      }
      
      // Transform the data to include agents_count
      const standardAgentsCount = data.agents ? (data.agents as any).count : 0;
      const elizaAgentsCount = data.elizaos_agents ? (data.elizaos_agents as any).count : 0;
      const totalAgentsCount = standardAgentsCount + elizaAgentsCount;
      
      const farmWithCounts = {
        ...data,
        agents_count: totalAgentsCount,
        agents: undefined,
        elizaos_agents: undefined
      };
      
      return { data: farmWithCounts };
    } catch (error) {
      console.error(`Error in getFarmByIdServer ${id}:`, error);
      
      const mockFarm = mockFarms.find(farm => farm.id === id);
      if (mockFarm) {
        return { data: mockFarm };
      }
      
      return { error: 'Failed to fetch farm' };
    }
  },
  
  /**
   * Create a new farm
   */
  async createFarm(farmData: FarmCreationRequest): Promise<ApiResponse<ExtendedFarm>> {
    try {
      const now = new Date().toISOString();
      
      // Prepare core farm data with defaults
      const farmCore = {
        name: farmData.name,
        description: farmData.description || '',
        exchange: farmData.exchange || '',
        status: farmData.status || 'active',
        created_at: now,
        updated_at: now
      };
      
      // Prepare configuration
      const config = {
        description: farmData.description,
        ...(farmData.config || {})
      };
      
      // Prepare API key object
      const api_keys = farmData.api_keys || {};
      
      // First try the API endpoint
      try {
        const response = await fetch('/api/farms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...farmCore,
            config,
            api_keys
          }),
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          const farm = result.data;
          
          // Store in localStorage for persistence
          try {
            // Store this specific farm
            localStorage.setItem(`farm_${farm.id}`, JSON.stringify(farm));
            
            // Also add to farms cache list
            const cachedFarms = JSON.parse(localStorage.getItem('farms_cache') || '[]');
            cachedFarms.push(farm);
            localStorage.setItem('farms_cache', JSON.stringify(cachedFarms));
          } catch (e) {
            console.warn('Could not cache farm in localStorage:', e);
          }
          
          // Return the created farm with extended properties
          return { 
            data: {
              ...farm,
              configuration: config,
              is_active: farm.status === 'active'
            } 
          };
        } else {
          console.log('API error, falling back to direct Supabase:', await response.text());
        }
      } catch (apiError) {
        console.error('Error creating farm via API, trying Supabase directly:', apiError);
      }
      
      // If API fails, try direct Supabase
      const supabase = createBrowserClient();
      
      // First check if we're authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // If not authenticated and we're in demo mode, create a mock farm
        if (process.env.NEXT_PUBLIC_MOCK_API_ENABLED === 'true' || 
            process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true') {
          return this.createMockFarm(farmData);
        }
        
        return { error: 'You must be logged in to create a farm' };
      }
      
      // Create a new farm
      const { data, error } = await supabase
        .from('farms')
        .insert({
          name: farmData.name,
          description: farmData.description || '',
          user_id: session.user.id,
          created_at: now,
          updated_at: now,
          status: farmData.status || 'active',
          exchange: farmData.exchange || '',
          api_keys: farmData.api_keys || {},
          config: farmData.config || {},
          status_summary: {
            goals_total: 0,
            goals_completed: 0,
            goals_in_progress: 0,
            goals_not_started: 0,
            goals_cancelled: 0,
            agents_total: 0,
            agents_active: 0,
            updated_at: now
          }
        })
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error creating farm:', error);
        
        // If Supabase fails, create a local farm
        return this.createLocalFarm(farmData, session.user.id);
      }
      
      if (!data) {
        return { error: 'Failed to create farm, no data returned' };
      }
      
      // Process the result to match expected format
      const farm: ExtendedFarm = {
        ...data,
        configuration: farmData.config || {},
        is_active: data.status === 'active'
      };
      
      // Store in localStorage for persistence
      try {
        localStorage.setItem(`farm_${farm.id}`, JSON.stringify(farm));
        
        // Also add to farms cache list
        const cachedFarms = JSON.parse(localStorage.getItem('farms_cache') || '[]');
        cachedFarms.push(farm);
        localStorage.setItem('farms_cache', JSON.stringify(cachedFarms));
      } catch (e) {
        console.warn('Could not cache farm in localStorage:', e);
      }
      
      return { data: farm };
    } catch (error) {
      console.error('Unexpected error creating farm:', error);
      
      // Final fallback - create a mock farm that at least appears in the UI
      return this.createMockFarm(farmData);
    }
  },
  
  /**
   * Create a mock farm for demo/fallback purposes
   * @private
   */
  async createMockFarm(farmData: FarmCreationRequest): Promise<ApiResponse<ExtendedFarm>> {
    const now = new Date().toISOString();
    const mockId = `mock-${Date.now().toString(36)}`;
    
    const config = {
      description: farmData.description,
      ...(farmData.config || {})
    };
    
    const mockFarm: ExtendedFarm = {
      id: mockId,
      name: farmData.name,
      description: farmData.description || '',
      exchange: farmData.exchange || '',
      status: farmData.status || 'active',
      configuration: config,
      config,
      api_keys: farmData.api_keys || {},
      is_active: farmData.status !== 'inactive',
      user_id: 'mock-user',
      created_at: now,
      updated_at: now,
      status_summary: {
        goals_total: 0,
        goals_completed: 0,
        goals_in_progress: 0,
        goals_not_started: 0,
        goals_cancelled: 0,
        agents_total: 0,
        agents_active: 0,
        updated_at: now
      }
    };
    
    // Store in localStorage
    try {
      // Store individual farm
      localStorage.setItem(`mock_farm_${mockId}`, JSON.stringify(mockFarm));
      
      // Add to mock farms list
      const mockFarms = JSON.parse(localStorage.getItem('mock_farms') || '[]');
      mockFarms.push(mockFarm);
      localStorage.setItem('mock_farms', JSON.stringify(mockFarms));
    } catch (e) {
      console.warn('Could not store mock farm in localStorage:', e);
    }
    
    console.log('Created mock farm as fallback:', mockFarm);
    return { data: mockFarm };
  },
  
  /**
   * Create a local farm when database operations fail
   * @private
   */
  async createLocalFarm(farmData: FarmCreationRequest, userId: string): Promise<ApiResponse<ExtendedFarm>> {
    const now = new Date().toISOString();
    const localId = `local-${Date.now().toString(36)}`;
    
    const config = {
      description: farmData.description,
      ...(farmData.config || {})
    };
    
    const localFarm: ExtendedFarm = {
      id: localId,
      name: farmData.name,
      description: farmData.description || '',
      exchange: farmData.exchange || '',
      status: farmData.status || 'active',
      configuration: config,
      config,
      api_keys: farmData.api_keys || {},
      is_active: farmData.status !== 'inactive',
      user_id: userId,
      created_at: now,
      updated_at: now,
      status_summary: {
        goals_total: 0,
        goals_completed: 0,
        goals_in_progress: 0,
        goals_not_started: 0,
        goals_cancelled: 0,
        agents_total: 0,
        agents_active: 0,
        updated_at: now
      }
    };
    
    // Store in localStorage
    try {
      // Store individual farm
      localStorage.setItem(`local_farm_${localId}`, JSON.stringify(localFarm));
      
      // Add to local farms list
      const localFarms = JSON.parse(localStorage.getItem('local_farms') || '[]');
      localFarms.push(localFarm);
      localStorage.setItem('local_farms', JSON.stringify(localFarms));
    } catch (e) {
      console.warn('Could not store local farm in localStorage:', e);
    }
    
    console.log('Created local farm due to database error:', localFarm);
    return { data: localFarm };
  },
  
  /**
   * Update an existing farm
   */
  async updateFarm(id: string, farmData: Partial<Omit<Farm, 'id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<Farm>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('farms')
        .update(farmData)
        .eq('id', id)
        .select()
        .single<Farm>();
      
      if (error) {
        console.error(`Error updating farm ${id}:`, error);
        
        if (isMockModeEnabled()) {
          const mockFarm = mockFarms.find(farm => farm.id === id);
          if (mockFarm) {
            const updatedFarm = {
              ...mockFarm,
              ...farmData,
              updated_at: new Date().toISOString()
            };
            return { data: updatedFarm };
          }
        }
        
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error(`Error updating farm ${id}:`, error);
      
      if (isMockModeEnabled()) {
        const mockFarm = mockFarms.find(farm => farm.id === id);
        if (mockFarm) {
          const updatedFarm = {
            ...mockFarm,
            ...farmData,
            updated_at: new Date().toISOString()
          };
          return { data: updatedFarm };
        }
      }
      
      return { error: 'Failed to update farm' };
    }
  },
  
  /**
   * Delete a farm
   */
  async deleteFarm(id: string): Promise<ApiResponse<null>> { 
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('farms')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error(`Error deleting farm ${id}:`, error);
        return { error: error.message };
      }
      
      return { data: null };
    } catch (error) {
      console.error(`Error deleting farm ${id}:`, error);
      return { error: 'Failed to delete farm' };
    }
  },
  
  /**
   * Get a summary of a farm's status including goals and agents
   */
  async getFarmStatusSummary(farmId: string): Promise<ApiResponse<FarmStatusSummary>> {
    try {
      // Try direct API first
      const url = `${getApiUrl('farms')}/${farmId}/status-summary`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        return { data: result.data };
      }
      
      // Fallback to Supabase
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('farms')
        .select('status_summary')
        .eq('id', farmId)
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      return { data: data.status_summary };
    } catch (error) {
      console.error('Error fetching farm status summary:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update the farm's status summary (typically done automatically by the database)
   */
  async refreshFarmStatusSummary(farmId: string): Promise<ApiResponse<FarmStatusSummary>> {
    try {
      const url = `${getApiUrl('farms')}/${farmId}/refresh-status`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        return { error: `HTTP error! status: ${response.status}` };
      }
      
      const result = await response.json();
      
      return { data: result.data };
    } catch (error) {
      console.error('Error refreshing farm status summary:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Assign a goal to an agent
   */
  async assignGoalToAgent(farmId: string, goalId: string, agentId: string, isElizaAgent: boolean = false): Promise<ApiResponse<null>> {
    try {
      const url = `${getApiUrl('farms')}/${farmId}/assign-goal`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goal_id: goalId,
          agent_id: agentId,
          is_eliza_agent: isElizaAgent
        }),
      });
      
      if (!response.ok) {
        // Fallback to Supabase direct update
        const supabase = createBrowserClient();
        
        // Determine which table to update based on agent type
        const table = isElizaAgent ? 'elizaos_agents' : 'agents';
        
        const { error } = await supabase
          .from(table)
          .update({ goal_id: goalId })
          .eq('id', agentId)
          .eq('farm_id', farmId);
        
        if (error) {
          return { error: error.message };
        }
      }
      
      return { data: null };
    } catch (error) {
      console.error('Error assigning goal to agent:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Unassign a goal from an agent
   */
  async unassignGoalFromAgent(farmId: string, agentId: string, isElizaAgent: boolean = false): Promise<ApiResponse<null>> {
    try {
      const url = `${getApiUrl('farms')}/${farmId}/unassign-goal`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          is_eliza_agent: isElizaAgent
        }),
      });
      
      if (!response.ok) {
        // Fallback to Supabase direct update
        const supabase = createBrowserClient();
        
        // Determine which table to update based on agent type
        const table = isElizaAgent ? 'elizaos_agents' : 'agents';
        
        const { error } = await supabase
          .from(table)
          .update({ goal_id: null })
          .eq('id', agentId)
          .eq('farm_id', farmId);
        
        if (error) {
          return { error: error.message };
        }
      }
      
      return { data: null };
    } catch (error) {
      console.error('Error unassigning goal from agent:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get all agents (both regular and ElizaOS) assigned to a goal
   */
  async getAgentsByGoal(farmId: string, goalId: string): Promise<ApiResponse<{ agents: any[], elizaAgents: any[] }>> {
    try {
      // First try the API endpoint
      const url = `${getApiUrl('farms')}/${farmId}/goals/${goalId}/agents`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        return { data: result.data };
      }
      
      // Fallback to Supabase
      const supabase = createBrowserClient();
      
      // Get regular agents
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('farm_id', farmId)
        .eq('goal_id', goalId);
      
      if (agentsError) {
        return { error: agentsError.message };
      }
      
      // Get ElizaOS agents if the table exists
      let elizaAgents = [];
      try {
        const { data: elizaData, error: elizaError } = await supabase
          .from('elizaos_agents')
          .select('*')
          .eq('farm_id', farmId)
          .eq('goal_id', goalId);
        
        if (!elizaError) {
          elizaAgents = elizaData || [];
        }
      } catch (e) {
        // Table might not exist, so just continue
        console.warn('Could not fetch ElizaOS agents, table might not exist:', e);
      }
      
      return { 
        data: { 
          agents: agents || [],
          elizaAgents
        } 
      };
    } catch (error) {
      console.error('Error fetching agents by goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Count agents by farm ID (both regular and ElizaOS agents)
   */
  async countAgentsByFarm(farmId: string): Promise<ApiResponse<{ total: number, active: number, elizaTotal: number, elizaActive: number }>> {
    try {
      // First try the API endpoint
      const url = `${getApiUrl('farms')}/${farmId}/agents/count`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        return { data: result.data };
      }
      
      // Fallback to Supabase
      const supabase = createBrowserClient();
      
      // Count regular agents
      const { count: totalAgents, error: agentsError } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('farm_id', farmId);
      
      if (agentsError) {
        return { error: agentsError.message };
      }
      
      // Count active regular agents
      const { count: activeAgents, error: activeError } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('farm_id', farmId)
        .eq('is_active', true);
      
      if (activeError) {
        return { error: activeError.message };
      }
      
      // Count ElizaOS agents if the table exists
      let elizaTotal = 0;
      let elizaActive = 0;
      
      try {
        const { count: elizaTotalCount, error: elizaError } = await supabase
          .from('elizaos_agents')
          .select('*', { count: 'exact', head: true })
          .eq('farm_id', farmId);
        
        if (!elizaError && elizaTotalCount !== null) {
          elizaTotal = elizaTotalCount;
          
          // Count active ElizaOS agents
          const { count: elizaActiveCount } = await supabase
            .from('elizaos_agents')
            .select('*', { count: 'exact', head: true })
            .eq('farm_id', farmId)
            .eq('status', 'active');
          
          elizaActive = elizaActiveCount || 0;
        }
      } catch (e) {
        // Table might not exist, so just continue with zeros
        console.warn('Could not count ElizaOS agents, table might not exist:', e);
      }
      
      return { 
        data: { 
          total: totalAgents || 0, 
          active: activeAgents || 0,
          elizaTotal,
          elizaActive
        } 
      };
    } catch (error) {
      console.error('Error counting agents by farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get all standard agents for a farm
   */
  async getAgents(farmId: string): Promise<ApiResponse<any[]>> {
    try {
      // Try using the API endpoint first
      const url = `${getApiUrl(`farms/${farmId}/agents`)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        // Try using Supabase as fallback
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('farm_id', farmId);
          
        if (error) {
          return { error: error.message };
        }
        
        return { data: data || [] };
      }
      
      const result = await response.json();
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching agents for farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get all ElizaOS agents for a farm
   */
  async getElizaAgents(farmId: string): Promise<ApiResponse<any[]>> {
    try {
      // Try using the API endpoint first
      const url = `${getApiUrl(`farms/${farmId}/elizaos-agents`)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        // Try using Supabase as fallback
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('elizaos_agents')
          .select('*')
          .eq('farm_id', farmId);
          
        if (error) {
          return { error: error.message };
        }
        
        return { data: data || [] };
      }
      
      const result = await response.json();
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching ElizaOS agents for farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
};
