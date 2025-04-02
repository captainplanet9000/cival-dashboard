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
  farm_id: number | null;
  user_id: string;
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
}

// Goal service
export const goalService = {
  /**
   * Get all goals or goals for a specific farm
   */
  async getGoals(farmId?: number): Promise<ApiResponse<Goal[]>> {
    try {
      const supabase = createBrowserClient();
      
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
  },

  /**
   * Subscribe to goal changes
   * @returns A function to unsubscribe
   */
  subscribeToGoals(
    callback: (goals: Goal[]) => void,
    farmId?: number
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
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error(`Error fetching goal ${id}:`, error);
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error(`Error fetching goal ${id}:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a new goal
   */
  async createGoal(goalData: Database['public']['Tables']['goals']['Insert']): Promise<ApiResponse<Goal>> {
    try {
      const supabase = createBrowserClient();
      
      // Ensure progress is calculated if not provided
      if (goalData.target_value && goalData.current_value !== null && goalData.current_value !== undefined && goalData.progress === undefined) {
        goalData.progress = (goalData.current_value / goalData.target_value) * 100;
      }
      
      const { data, error } = await supabase
        .from('goals')
        .insert(goalData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating goal:', error);
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error creating goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update a goal
   */
  async updateGoal(id: string, goalData: Database['public']['Tables']['goals']['Update']): Promise<ApiResponse<Goal>> {
    try {
      const supabase = createBrowserClient();
      
      // If current_value or target_value is updated, recalculate progress
      if ((goalData.current_value !== undefined || goalData.target_value !== undefined) && goalData.progress === undefined) {
        // First get the existing goal to access values not being updated
        const { data: existingGoal } = await this.getGoalById(id);
        
        if (existingGoal && existingGoal.target_value) {
          const currentValue = goalData.current_value ?? existingGoal.current_value;
          const targetValue = goalData.target_value ?? existingGoal.target_value;
          
          if (targetValue && currentValue !== null) {
            goalData.progress = (currentValue / targetValue) * 100;
          }
        }
      }
      
      // Update the completed_at timestamp if status is being set to 'completed'
      if (goalData.status === 'completed') {
        // Handle the completed_at field that exists in the DB but might not be in the types
        // Use type assertion to safely add the property
        (goalData as any).completed_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('goals')
        .update(goalData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error(`Error updating goal ${id}:`, error);
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error(`Error updating goal ${id}:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Delete a goal
   */
  async deleteGoal(id: string): Promise<ApiResponse<null>> {
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error(`Error deleting goal ${id}:`, error);
        return { error: error.message };
      }
      
      return { data: null };
    } catch (error) {
      console.error(`Error deleting goal ${id}:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get goal statistics for a farm
   */
  async getGoalStats(farmId: number): Promise<ApiResponse<{
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
    cancelled: number;
    completion_rate: number;
  }>> {
    try {
      const { data: goals, error } = await this.getGoals(farmId);
      
      if (error) {
        return { error };
      }
      
      if (!goals) {
        return { data: {
          total: 0,
          completed: 0,
          in_progress: 0,
          not_started: 0,
          cancelled: 0,
          completion_rate: 0
        }};
      }
      
      const total = goals.length;
      const completed = goals.filter(g => g.status === 'completed').length;
      const in_progress = goals.filter(g => g.status === 'in_progress').length;
      const not_started = goals.filter(g => g.status === 'not_started').length;
      const cancelled = goals.filter(g => g.status === 'cancelled').length;
      
      // Calculate completion rate (excluding cancelled goals)
      const activeGoals = total - cancelled;
      const completion_rate = activeGoals > 0 ? (completed / activeGoals) * 100 : 0;
      
      return {
        data: {
          total,
          completed,
          in_progress,
          not_started,
          cancelled,
          completion_rate
        }
      };
    } catch (error) {
      console.error(`Error getting goal stats for farm ${farmId}:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get goals for server components
   */
  async getGoalsServer(farmId?: number): Promise<ApiResponse<Goal[]>> {
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
