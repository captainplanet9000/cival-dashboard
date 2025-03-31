/**
 * Goal Service
 * Handles all goal-related API interactions
 */

// Define the Goal interface (should match your API response)
export interface Goal {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  completed_at?: string;
  deadline?: string;
  farm_id: string;
  target_value: number;
  current_value: number;
  progress: number;
  metrics?: {
    startValue?: number;
    currentValue?: number;
    targetValue?: number;
    [key: string]: any;
  };
  strategy?: string;
  priority: 'low' | 'medium' | 'high';
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
  async getGoals(farmId?: string): Promise<ApiResponse<Goal[]>> {
    try {
      // Build the query string with optional farmId
      const queryString = farmId ? `?farmId=${farmId}` : '';
      
      // Use relative URL to ensure it works in development and production
      const response = await fetch(`/api/goals${queryString}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error fetching goals:', errorData);
        return { error: `Failed to load goals: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();
      return { data: data.goals };
    } catch (error) {
      console.error('Error fetching goals:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get a specific goal by ID
   */
  async getGoalById(id: string): Promise<ApiResponse<Goal>> {
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Error fetching goal ${id}:`, errorData);
        return { error: `Failed to load goal: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();
      return { data: data.goal };
    } catch (error) {
      console.error(`Error fetching goal ${id}:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a new goal
   */
  async createGoal(goalData: Partial<Goal>): Promise<ApiResponse<Goal>> {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error creating goal:', errorData);
        return { error: `Failed to create goal: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();
      return { data: data.goal };
    } catch (error) {
      console.error('Error creating goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update a goal
   */
  async updateGoal(id: string, goalData: Partial<Goal>): Promise<ApiResponse<Goal>> {
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Error updating goal ${id}:`, errorData);
        return { error: `Failed to update goal: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();
      return { data: data.goal };
    } catch (error) {
      console.error(`Error updating goal ${id}:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
};
