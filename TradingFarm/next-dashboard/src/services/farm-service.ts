/**
 * Farm Service
 * Handles all farm-related API interactions with Supabase
 */

import { createBrowserClient } from "@/utils/supabase/client";
import { createServerClient } from "@/utils/supabase/server";
import { Database } from "@/types/database.types";

// Define the Farm interface (should match the Supabase schema)
export interface Farm {
  id: number;
  name: string;
  description?: string | null;
  user_id?: string | null;
  created_at: string;
  updated_at: string;
  agents_count?: number;
  agents?: any; // For handling relationships
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Farm service
export const farmService = {
  /**
   * Get all farms for the current user
   */
  async getFarms(): Promise<ApiResponse<Farm[]>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('farms')
        .select('*, agents(count)')
        .returns<Farm[]>();
      
      if (error) {
        console.error('Error fetching farms:', error);
        return { error: error.message };
      }
      
      // Transform the data to include agents_count
      const farmsWithCounts = data.map(farm => {
        const agentsCount = farm.agents ? (farm.agents as any).count : 0;
        return {
          ...farm,
          agents_count: agentsCount,
        };
      });
      
      return { data: farmsWithCounts };
    } catch (error) {
      console.error('Error fetching farms:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
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
        console.error('Error fetching farms:', error);
        return { error: error.message };
      }
      
      // Transform the data to include agents_count
      const farmsWithCounts = data.map(farm => {
        const agentsCount = farm.agents ? (farm.agents as any).count : 0;
        return {
          ...farm,
          agents_count: agentsCount,
        };
      });
      
      return { data: farmsWithCounts };
    } catch (error) {
      console.error('Error fetching farms:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get a specific farm by ID
   */
  async getFarmById(id: number): Promise<ApiResponse<Farm>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('farms')
        .select('*, agents(count)')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error(`Error fetching farm ${id}:`, error);
        return { error: error.message };
      }
      
      // Transform the data to include agents_count
      const agentsCount = data.agents ? (data.agents as any).count : 0;
      const farm = {
        ...data,
        agents_count: agentsCount,
      };
      
      return { data: farm };
    } catch (error) {
      console.error(`Error fetching farm ${id}:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get a specific farm by ID for server components
   */
  async getFarmByIdServer(id: number): Promise<ApiResponse<Farm>> {
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('farms')
        .select('*, agents(count)')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error(`Error fetching farm ${id}:`, error);
        return { error: error.message };
      }
      
      // Transform the data to include agents_count
      const agentsCount = data.agents ? (data.agents as any).count : 0;
      const farm = {
        ...data,
        agents_count: agentsCount,
      };
      
      return { data: farm };
    } catch (error) {
      console.error(`Error fetching farm ${id}:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a new farm
   */
  async createFarm(farmData: Omit<Farm, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Farm>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('farms')
        .insert(farmData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating farm:', error);
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error creating farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update an existing farm
   */
  async updateFarm(id: number, farmData: Partial<Omit<Farm, 'id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<Farm>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('farms')
        .update(farmData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error(`Error updating farm ${id}:`, error);
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error(`Error updating farm ${id}:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Delete a farm
   */
  async deleteFarm(id: number): Promise<ApiResponse<null>> {
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
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
};
