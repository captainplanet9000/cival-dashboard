/**
 * Goal Service
 * Handles all goal-related API interactions with Supabase
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';

// Define the Goal interface (matching the Supabase schema)
export interface Goal {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  deadline: string | null;
  farm_id: string | null; // Updated to string to match Supabase IDs
  user_id: string | null; // Updated to allow null to match data from Supabase
  target_value: number | null;
  current_value: number | null;
  progress: number | null;
  metrics?: {
    startValue?: number;
    currentValue?: number;
    targetValue?: number;
    [key: string]: any;
  };
  strategy?: string;
  priority: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  count?: number;
  total?: number;
}

// Helper to determine API URL
const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${baseUrl}/api/${path}`;
};

// Goal service
export const goalService = {
  /**
   * Get all goals or goals for a specific farm
   */
  async getGoals(farmId?: string, limit = 50, offset = 0): Promise<ApiResponse<Goal[]>> {
    try {
      // Build query params
      let url = getApiUrl('goals');
      const params = new URLSearchParams();
      
      if (farmId) {
        params.append('farmId', farmId.toString());
      }
      
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      
      // Check if we should add a mock flag from environment
      if (process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true') {
        params.append('mock', 'true');
      }
      
      // Append query parameters to the URL
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        return { error: `HTTP error! status: ${response.status}` };
      }
      
      const result = await response.json();
      
      return {
        data: result.data || [],
        count: result.count,
        total: result.total
      };
    } catch (error) {
      console.error('Error fetching goals:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Subscribe to goal changes
   * @returns A function to unsubscribe
   */
  subscribeToGoals(
    callback: (goals: Goal[]) => void,
    farmId?: string
  ): () => void {
    const supabase = createBrowserClient();
    
    // Create the base channel
    let channel = supabase.channel('goals-changes');
    
    // Set up the subscription with optional farm_id filter
    if (farmId) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `farm_id=eq.${farmId}`
        },
        async () => {
          // When a change occurs, fetch the updated goals list
          const { data } = await this.getGoals(farmId);
          if (data) {
            callback(data);
          }
        }
      );
    } else {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals'
        },
        async () => {
          // When a change occurs, fetch the updated goals list
          const { data } = await this.getGoals();
          if (data) {
            callback(data);
          }
        }
      );
    }
    
    // Subscribe to the channel
    channel.subscribe();
    
    // Return an unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Get a specific goal by ID
   */
  async getGoalById(id: string): Promise<ApiResponse<Goal>> {
    try {
      const url = `${getApiUrl('goals')}/${id}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        // If direct API fails, try using Supabase as fallback
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('goals')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          return { error: error.message };
        }
        
        return { data };
      }
      
      const result = await response.json();
      return { data: result.data };
    } catch (error) {
      console.error(`Error fetching goal ${id}:`, error);
      
      // Try using Supabase as fallback
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('goals')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          return { error: error.message };
        }
        
        return { data };
      } catch (fallbackError) {
        return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
      }
    }
  },

  /**
   * Create a new goal
   */
  async createGoal(goalData: Partial<Goal>): Promise<ApiResponse<Goal>> {
    try {
      const url = getApiUrl('goals');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });
      
      if (!response.ok) {
        return { error: `HTTP error! status: ${response.status}` };
      }
      
      const result = await response.json();
      return { data: result.data };
    } catch (error) {
      console.error('Error creating goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update a goal
   * @param id Goal ID to update
   * @param goalData Data to update with
   * @returns Updated goal data or error
   */
  async updateGoal(id: string, goalData: Partial<Goal>): Promise<ApiResponse<Goal>> {
    try {
      // Convert null values to undefined for the Supabase update operation
      // This addresses TypeScript compatibility issues
      const sanitizedData: Record<string, any> = {};
      
      Object.entries(goalData).forEach(([key, value]) => {
        if (value !== null) {
          sanitizedData[key] = value;
        }
      });
      
      const url = getApiUrl(`goals/${id}`);
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedData),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        // Use Supabase as fallback
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('goals')
          .update(sanitizedData)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          return { error: error.message };
        }
        
        return { data };
      }
      
      const result = await response.json();
      return { data: result.data };
    } catch (error) {
      console.error('Error updating goal:', error);
      
      // Try using Supabase as fallback
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('goals')
          .update(Object.entries(goalData).reduce((acc, [key, value]) => {
            if (value !== null) acc[key] = value;
            return acc;
          }, {} as Record<string, any>))
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          return { error: error.message };
        }
        
        return { data };
      } catch (fallbackError) {
        return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
      }
    }
  },

  /**
   * Delete a goal
   */
  async deleteGoal(id: string): Promise<ApiResponse<null>> {
    try {
      const url = `${getApiUrl('goals')}/${id}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Use Supabase as fallback
        const supabase = createBrowserClient();
        const { error } = await supabase
          .from('goals')
          .delete()
          .eq('id', id);
        
        if (error) {
          return { error: error.message };
        }
      }
      
      return { data: null };
    } catch (error) {
      console.error('Error deleting goal:', error);
      
      // Try using Supabase as fallback
      try {
        const supabase = createBrowserClient();
        const { error } = await supabase
          .from('goals')
          .delete()
          .eq('id', id);
        
        if (error) {
          return { error: error.message };
        }
        
        return { data: null };
      } catch (fallbackError) {
        return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
      }
    }
  },

  /**
   * Get goal statistics for a farm
   */
  async getGoalStats(farmId: string): Promise<ApiResponse<{
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
    cancelled: number;
    completion_rate: number;
  }>> {
    try {
      // Get all goals for the farm
      const { data: goals } = await this.getGoals(farmId);
      
      if (!goals) {
        return { 
          data: {
            total: 0,
            completed: 0,
            in_progress: 0,
            not_started: 0,
            cancelled: 0,
            completion_rate: 0
          }
        };
      }
      
      // Count goals by status
      const total = goals.length;
      const completed = goals.filter(goal => goal.status === 'completed').length;
      const inProgress = goals.filter(goal => goal.status === 'in_progress').length;
      const notStarted = goals.filter(goal => goal.status === 'not_started').length;
      const cancelled = goals.filter(goal => goal.status === 'cancelled').length;
      
      // Calculate completion rate
      const completionRate = total > 0 ? completed / total : 0;
      
      return {
        data: {
          total,
          completed,
          in_progress: inProgress,
          not_started: notStarted,
          cancelled,
          completion_rate: completionRate
        }
      };
    } catch (error) {
      console.error('Error calculating goal stats:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get goals for server components
   */
  async getGoalsServer(farmId?: string): Promise<ApiResponse<Goal[]>> {
    try {
      const supabase = await createServerClient();
      
      let query = supabase
        .from('goals')
        .select('*');
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching goals:', error);
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error fetching goals:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
};
