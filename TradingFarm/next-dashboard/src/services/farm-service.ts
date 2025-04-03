/**
 * Farm Service
 * Handles all farm-related API interactions with Supabase
 */

import { createBrowserClient } from "@/utils/supabase/client";
import { createServerClient } from "@/utils/supabase/server";
import { Database } from "@/types/database.types";
import { DEMO_MODE, demoFarms } from "@/utils/demo-data";
import { Farm as DemoFarm } from "@/types/farm";

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

// Farm service
export const farmService = {
  /**
   * Get all farms for the current user
   */
  async getFarms(): Promise<ApiResponse<Farm[]>> {
    try {
      // Use mock data in development or when mock mode is enabled
      if (isMockModeEnabled()) {
        console.log('Using mock farm data');
        return { data: mockFarms };
      }
      
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('farms')
        .select('*, agents(count)')
        .returns<Farm[]>();
      
      if (error) {
        console.error('Error fetching farms:', error);
        console.log('Falling back to mock data due to error');
        return { data: mockFarms };
      }
      
      if (!data || data.length === 0) {
        console.log('No farms found, using mock data');
        return { data: mockFarms };
      }
      
      // Transform the data to include agents_count
      const farmsWithCounts = data.map(farm => {
        const agentsCount = farm.agents ? (farm.agents as any).count : 0;
        return {
          ...farm,
          agents_count: agentsCount,
          agents: undefined
        };
      });
      
      return { data: farmsWithCounts };
    } catch (error) {
      console.error('Error in getFarms:', error);
      // Fallback to mock data on error
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
        .select('*, agents(count)')
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
        const agentsCount = farm.agents ? (farm.agents as any).count : 0;
        return {
          ...farm,
          agents_count: agentsCount,
          agents: undefined
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
      // Use mock data in development or when mock mode is enabled
      if (isMockModeEnabled()) {
        const mockFarm = mockFarms.find(farm => farm.id === id);
        if (mockFarm) {
          return { data: mockFarm };
        }
      }
      
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('farms')
        .select('*, agents(count)')
        .eq('id', id)
        .single<Farm>();
      
      if (error) {
        console.error(`Error fetching farm ${id}:`, error);
        
        // Fall back to mock data
        const mockFarm = mockFarms.find(farm => farm.id === id);
        if (mockFarm) {
          return { data: mockFarm };
        }
        
        return { error: error.message };
      }
      
      // Transform the data to include agents_count
      const agentsCount = data.agents ? (data.agents as any).count : 0;
      const farmWithCounts = {
        ...data,
        agents_count: agentsCount,
        agents: undefined
      };
      
      return { data: farmWithCounts };
    } catch (error) {
      console.error(`Error in getFarmById ${id}:`, error);
      
      // Fall back to mock data
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
        .select('*, agents(count)')
        .eq('id', id)
        .single<Farm>();
      
      if (error) {
        console.error(`Error fetching farm ${id}:`, error);
        
        // Fall back to mock data
        const mockFarm = mockFarms.find(farm => farm.id === id);
        if (mockFarm) {
          return { data: mockFarm };
        }
        
        return { error: error.message };
      }
      
      // Transform the data to include agents_count
      const agentsCount = data.agents ? (data.agents as any).count : 0;
      const farmWithCounts = {
        ...data,
        agents_count: agentsCount,
        agents: undefined
      };
      
      return { data: farmWithCounts };
    } catch (error) {
      console.error(`Error in getFarmByIdServer ${id}:`, error);
      
      // Fall back to mock data
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
  async createFarm(farmData: Omit<Farm, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Farm>> {
    try {
      const supabase = createBrowserClient();
      
      const completeData = {
        ...farmData,
        exchange: farmData.exchange || 'default',
        status: farmData.status || 'active',
        api_keys: farmData.api_keys || {},
        config: farmData.config || {}
      };
      
      const { data, error } = await supabase
        .from('farms')
        .insert(completeData)
        .select()
        .single<Farm>();
      
      if (error) {
        console.error('Error creating farm:', error);
        
        const mockFarm: Farm = {
          id: `mock-${Date.now()}`,
          name: farmData.name,
          description: farmData.description,
          user_id: farmData.user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: farmData.status || 'active',
          exchange: farmData.exchange || 'default',
          api_keys: farmData.api_keys || {},
          config: farmData.config || {},
          agents_count: 0
        };
        
        if (isMockModeEnabled()) {
          return { data: mockFarm };
        }
        
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error creating farm:', error);
      
      if (isMockModeEnabled()) {
        const mockFarm: Farm = {
          id: `mock-${Date.now()}`,
          name: farmData.name,
          description: farmData.description,
          user_id: farmData.user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: farmData.status || 'active',
          exchange: farmData.exchange || 'default',
          api_keys: farmData.api_keys || {},
          config: farmData.config || {},
          agents_count: 0
        };
        return { data: mockFarm };
      }
      
      return { error: 'Failed to create farm' };
    }
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
  }
};
