/**
 * API Service for Trading Farm Dashboard
 * 
 * This service provides centralized data fetching functions for use with TanStack Query.
 * It uses the standardized Supabase clients as specified in the project architecture.
 */

import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { ExtendedDatabase } from '@/types/database.types';

// Type for filter parameters
type FilterParams = Record<string, any>;

/**
 * Get a configured Supabase client based on execution context
 * @returns Supabase client for the current context
 */
function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // Server-side execution
    return createServerClient();
  } else {
    // Client-side execution
    return createBrowserClient();
  }
}

/**
 * Farm-related data fetching functions
 */
export const farmApi = {
  /**
   * Get all farms with optional filtering
   */
  getFarms: async (filters?: FilterParams) => {
    const supabase = getSupabaseClient();
    
    let query = supabase.from('farms').select('*');
    
    // Apply filters if provided
    if (filters) {
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching farms:', error);
      throw new Error(`Failed to fetch farms: ${error.message}`);
    }
    
    return data;
  },
  
  /**
   * Get a single farm by ID
   */
  getFarmById: async (id: string) => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('farms')
      .select('*, farm_users(*), agents(*)')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching farm ${id}:`, error);
      throw new Error(`Failed to fetch farm: ${error.message}`);
    }
    
    return data;
  },
  
  /**
   * Create a new farm
   */
  createFarm: async (farmData: any) => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('farms')
      .insert(farmData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating farm:', error);
      throw new Error(`Failed to create farm: ${error.message}`);
    }
    
    return data;
  },
  
  /**
   * Update an existing farm
   */
  updateFarm: async ({ id, ...farmData }: { id: string, [key: string]: any }) => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('farms')
      .update(farmData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating farm ${id}:`, error);
      throw new Error(`Failed to update farm: ${error.message}`);
    }
    
    return data;
  },
  
  /**
   * Delete a farm
   */
  deleteFarm: async (id: string) => {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('farms')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting farm ${id}:`, error);
      throw new Error(`Failed to delete farm: ${error.message}`);
    }
    
    return true;
  }
};

/**
 * Agent-related data fetching functions
 */
export const agentApi = {
  /**
   * Get all agents with optional filtering
   */
  getAgents: async (filters?: FilterParams) => {
    const supabase = getSupabaseClient();
    
    let query = supabase.from('agents').select('*');
    
    // Apply filters if provided
    if (filters) {
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.farm_id) {
        query = query.eq('farm_id', filters.farm_id);
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching agents:', error);
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }
    
    return data;
  },
  
  /**
   * Get a single agent by ID
   */
  getAgentById: async (id: string) => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching agent ${id}:`, error);
      throw new Error(`Failed to fetch agent: ${error.message}`);
    }
    
    return data;
  },
  
  /**
   * Create a new agent
   */
  createAgent: async (agentData: any) => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('agents')
      .insert(agentData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating agent:', error);
      throw new Error(`Failed to create agent: ${error.message}`);
    }
    
    return data;
  },
  
  /**
   * Update an existing agent
   */
  updateAgent: async ({ id, ...agentData }: { id: string, [key: string]: any }) => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('agents')
      .update(agentData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating agent ${id}:`, error);
      throw new Error(`Failed to update agent: ${error.message}`);
    }
    
    return data;
  },
  
  /**
   * Delete an agent
   */
  deleteAgent: async (id: string) => {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting agent ${id}:`, error);
      throw new Error(`Failed to delete agent: ${error.message}`);
    }
    
    return true;
  }
};

/**
 * Goal-related data fetching functions
 */
export const goalApi = {
  /**
   * Get all goals with optional filtering
   */
  getGoals: async (filters?: FilterParams) => {
    const supabase = getSupabaseClient();
    
    let query = supabase.from('goals').select('*');
    
    // Apply filters if provided
    if (filters) {
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.farm_id) {
        query = query.eq('farm_id', filters.farm_id);
      }
      
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching goals:', error);
      throw new Error(`Failed to fetch goals: ${error.message}`);
    }
    
    return data;
  },
  
  /**
   * Get a single goal by ID
   */
  getGoalById: async (id: string) => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching goal ${id}:`, error);
      throw new Error(`Failed to fetch goal: ${error.message}`);
    }
    
    return data;
  },
  
  /**
   * Create a new goal
   */
  createGoal: async (goalData: any) => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('goals')
      .insert(goalData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating goal:', error);
      throw new Error(`Failed to create goal: ${error.message}`);
    }
    
    return data;
  },
  
  /**
   * Update an existing goal
   */
  updateGoal: async ({ id, ...goalData }: { id: string, [key: string]: any }) => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('goals')
      .update(goalData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating goal ${id}:`, error);
      throw new Error(`Failed to update goal: ${error.message}`);
    }
    
    return data;
  },
  
  /**
   * Delete a goal
   */
  deleteGoal: async (id: string) => {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting goal ${id}:`, error);
      throw new Error(`Failed to delete goal: ${error.message}`);
    }
    
    return true;
  }
};

/**
 * Trading related data fetching functions (positions and orders)
 */
export const tradingApi = {
  /**
   * Get all positions with optional filtering
   */
  getPositions: async (filters?: FilterParams) => {
    const supabase = getSupabaseClient();
    
    let query = supabase.from('positions').select('*');
    
    // Apply filters if provided
    if (filters) {
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.exchange) {
        query = query.eq('exchange', filters.exchange);
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching positions:', error);
      throw new Error(`Failed to fetch positions: ${error.message}`);
    }
    
    return data;
  },
  
  /**
   * Get all orders with optional filtering
   */
  getOrders: async (filters?: FilterParams) => {
    const supabase = getSupabaseClient();
    
    let query = supabase.from('orders').select('*');
    
    // Apply filters if provided
    if (filters) {
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.exchange) {
        query = query.eq('exchange', filters.exchange);
      }
      
      if (filters.symbol) {
        query = query.eq('symbol', filters.symbol);
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching orders:', error);
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
    
    return data;
  },
  
  /**
   * Create a new order
   */
  createOrder: async (orderData: any) => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
    
    return data;
  }
};

/**
 * Exchange credentials related functions
 */
export const exchangeApi = {
  /**
   * Get all exchange credentials
   */
  getExchangeCredentials: async () => {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('exchange_credentials')
      .select('id, exchange, name, testnet, created_at, updated_at');
    
    if (error) {
      console.error('Error fetching exchange credentials:', error);
      throw new Error(`Failed to fetch exchange credentials: ${error.message}`);
    }
    
    return data;
  }
};

/**
 * Combined API service export
 */
export const api = {
  farms: farmApi,
  agents: agentApi,
  goals: goalApi,
  trading: tradingApi,
  exchanges: exchangeApi,
};
