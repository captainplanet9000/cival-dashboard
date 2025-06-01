/**
 * Goal Updates Service
 * Handles all real-time goal updates and websocket connections
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';

// Helper to determine API URL
const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${baseUrl}/api/${path}`;
};

// Define interfaces
export interface GoalUpdate {
  id: string;
  goal_id: string;
  value_change: number;
  cumulative_value: number;
  agent_id?: string;
  is_eliza_agent?: boolean;
  message?: string;
  created_at: string;
}

export interface ProgressUpdateEvent {
  goal_id: string;
  progress: number;
  current_value: number;
}

export interface StatusChangeEvent {
  goal_id: string;
  status: string;
  progress: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export const goalUpdateService = {
  /**
   * Record a new goal update
   */
  async createUpdate(
    goalId: string, 
    valueChange: number, 
    cumulativeValue: number, 
    agentId?: string, 
    isElizaAgent: boolean = false,
    message?: string
  ): Promise<ApiResponse<GoalUpdate>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goal_updates')
        .insert({
          goal_id: goalId,
          value_change: valueChange,
          cumulative_value: cumulativeValue,
          agent_id: agentId,
          is_eliza_agent: isElizaAgent,
          message
        })
        .select()
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error creating goal update:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get recent updates for a goal
   */
  async getRecentUpdates(goalId: string, limit: number = 10): Promise<ApiResponse<GoalUpdate[]>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goal_updates')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error fetching recent goal updates:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Subscribe to real-time updates for a specific goal
   */
  subscribeToGoalUpdates(goalId: string, callback: (update: GoalUpdate) => void): () => void {
    const supabase = createBrowserClient();
    
    const subscription = supabase
      .channel(`goal-updates:${goalId}`)
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'goal_updates',
          filter: `goal_id=eq.${goalId}`
        }, 
        (payload) => {
          callback(payload.new as GoalUpdate);
        }
      )
      .subscribe();
    
    // Return unsubscribe function
    return () => {
      supabase.removeChannel(subscription);
    };
  },
  
  /**
   * Subscribe to status changes for all goals in a farm
   */
  subscribeToFarmGoalChanges(
    farmId: string, 
    onStatusChange: (event: StatusChangeEvent) => void,
    onProgressUpdate: (event: ProgressUpdateEvent) => void
  ): () => void {
    const supabase = createBrowserClient();
    
    // Listen for status changes
    const channel = supabase.channel('farm-goals-realtime')
      .on('broadcast', { event: 'goal_status_change' }, (payload) => {
        // Check if this goal belongs to the requested farm
        this.getGoalFarmId(payload.payload.goal_id).then(goalFarmId => {
          if (goalFarmId === farmId) {
            onStatusChange(payload.payload as StatusChangeEvent);
          }
        });
      })
      .on('broadcast', { event: 'goal_progress_update' }, (payload) => {
        // Check if this goal belongs to the requested farm
        this.getGoalFarmId(payload.payload.goal_id).then(goalFarmId => {
          if (goalFarmId === farmId) {
            onProgressUpdate(payload.payload as ProgressUpdateEvent);
          }
        });
      })
      .subscribe();
    
    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  },
  
  /**
   * Helper to get a goal's farm ID
   * @private
   */
  async getGoalFarmId(goalId: string): Promise<string | null> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goals')
        .select('farm_id')
        .eq('id', goalId)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return data.farm_id;
    } catch (error) {
      console.error('Error getting goal farm ID:', error);
      return null;
    }
  }
};
