/**
 * Goal Service
 * Handles all goal-related API interactions with Supabase
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';

// Define the Goal interface (matching the Supabase schema)
export interface Goal {
  id: string;
  title: string;
  description?: string;
  farm_id: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled' | 'waiting';
  target_value: number;
  current_value: number;
  progress: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  parent_goal_id?: string;
  dependencies?: Array<{goal_id: string, title?: string}>;
  dependency_type?: 'sequential' | 'parallel' | 'none';
  template_id?: string;
  performance_metrics?: any;
  ai_settings?: {
    allowed_models: string[];
    prompt_template: string;
    evaluation_criteria: string;
    use_knowledge_base: boolean;
    max_autonomous_steps: number;
  };
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
  async getGoals(farmId?: number, limit = 50, offset = 0): Promise<ApiResponse<Goal[]>> {
    try {
      // Build query params
      let url = getApiUrl('goals');
      const params = new URLSearchParams();
      
      if (farmId !== undefined) {
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
    farmId?: number
  ): () => void {
    const supabase = createBrowserClient();
    
    // Create the base channel
    let channel = supabase.channel('goals-changes');
    
    // Set up the subscription with optional farm_id filter
    if (farmId !== undefined) {
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
  async createGoal(goalData: Partial<Omit<Goal, 'id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<Goal>> {
    try {
      const url = getApiUrl('goals');
      
      // Ensure farm_id is passed as number if present and handle potential null/undefined properly
      const dataToSend: Record<string, any> = {};
      for (const [key, value] of Object.entries(goalData)) {
        if (value !== null && value !== undefined) { // Exclude null and undefined
          dataToSend[key] = value;
        }
      }
      // Convert farm_id specifically
      if (goalData.farm_id !== null && goalData.farm_id !== undefined) {
        dataToSend.farm_id = Number(goalData.farm_id);
      } else {
        // Explicitly handle if farm_id should be excluded or sent as null/undefined
        // delete dataToSend.farm_id; // Or handle as needed by the API
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      
      if (!response.ok) {
        return { error: `HTTP error! status: ${response.status} ${await response.text()}` }; // Include error body
      }
      
      const result = await response.json();
      // Ensure returned farm_id is number
      if (result.data && typeof result.data.farm_id === 'string') {
        result.data.farm_id = Number(result.data.farm_id);
      }
      return { data: result.data };
    } catch (error) {
      console.error('Error creating goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update a goal
   */
  async updateGoal(id: string, goalData: Partial<Omit<Goal, 'id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<Goal>> {
    try {
      const url = `${getApiUrl('goals')}/${id}`;

      // Prepare data, ensuring farm_id is number and handling nulls/undefined
      const dataToSend: Record<string, any> = {};
      for (const [key, value] of Object.entries(goalData)) {
        if (value !== null && value !== undefined) { // Exclude null and undefined
          dataToSend[key] = value;
        }
         // Optionally handle null specifically if API expects it for clearing fields
         // else if (value === null) { dataToSend[key] = null; }
      }
      // Convert farm_id specifically
       if (goalData.farm_id !== null && goalData.farm_id !== undefined) {
        dataToSend.farm_id = Number(goalData.farm_id);
      } else {
         // delete dataToSend.farm_id; // Or handle as needed by the API
      }
      
      const response = await fetch(url, {
        method: 'PUT', // Or PATCH depending on API
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
         return { error: `HTTP error! status: ${response.status} ${await response.text()}` }; // Include error body
      }

      const result = await response.json();
       // Ensure returned farm_id is number
      if (result.data && typeof result.data.farm_id === 'string') {
        result.data.farm_id = Number(result.data.farm_id);
      }
      return { data: result.data };
    } catch (error) {
      console.error('Error updating goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
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
  async getGoalStats(farmId: number): Promise<ApiResponse<any>> {
    try {
      // Assuming an API endpoint or RPC call exists that takes numeric farmId
      const url = getApiUrl(`farms/${farmId}/goal-stats`);
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return { error: `HTTP error! status: ${response.status}` };
      }
      const result = await response.json();
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching goal stats:', error);
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
  },

  /**
   * Get agents assigned to a goal
   */
  async getGoalAgents(goalId: string): Promise<ApiResponse<{agents: any[], elizaAgents: any[]}>> {
    try {
      const { data: goal, error: goalError } = await this.getGoalById(goalId);
      
      if (goalError || !goal) {
        return { error: goalError || 'Goal not found' };
      }
      
      // Use the farm API endpoint to get agents for this goal
      const farmId = goal.farm_id;
      if (!farmId) {
        return { error: 'Goal has no associated farm' };
      }
      
      const url = `${getApiUrl('farms')}/${farmId}/goals/${goalId}/agents`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Try using Supabase as fallback
        const supabase = createBrowserClient();
        
        // Get regular agents
        const { data: agents } = await supabase
          .from('agents')
          .select('*')
          .eq('farm_id', farmId)
          .eq('goal_id', goalId);
        
        // Get ElizaOS agents if available
        let elizaAgents = [];
        try {
          const { data: elizaData } = await supabase
            .from('elizaos_agents')
            .select('*')
            .eq('farm_id', farmId)
            .eq('goal_id', goalId);
          
          if (elizaData) {
            elizaAgents = elizaData;
          }
        } catch (e) {
          console.warn('Could not fetch ElizaOS agents:', e);
        }
        
        return {
          data: {
            agents: agents || [],
            elizaAgents: elizaAgents
          }
        };
      }
      
      const result = await response.json();
      return { data: result.data };
    } catch (error) {
      console.error('Error fetching goal agents:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Assign an agent to a goal
   */
  async assignAgentToGoal(goalId: string, agentId: string, farmId: number): Promise<ApiResponse<null>> {
    try {
      // Assuming an API endpoint or RPC call exists
      const url = getApiUrl(`goals/${goalId}/assign-agent`); 
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, farmId }) // Pass numeric farmId
      });

      if (!response.ok) {
        return { error: `HTTP error! status: ${response.status}` };
      }
      return { data: null };
    } catch (error) {
      console.error('Error assigning agent to goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Unassign an agent from a goal
   */
  async unassignAgentFromGoal(goalId: string, agentId: string, farmId: number): Promise<ApiResponse<null>> {
    try {
      // Assuming an API endpoint or RPC call exists
      const url = getApiUrl(`goals/${goalId}/unassign-agent`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, farmId }) // Pass numeric farmId
      });

      if (!response.ok) {
         return { error: `HTTP error! status: ${response.status}` };
      }
      return { data: null };
    } catch (error) {
      console.error('Error unassigning agent from goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Update goal progress
   * This will update the current_value and progress of the goal
   */
  async updateGoalProgress(id: string, currentValue: number): Promise<ApiResponse<Goal>> {
    try {
      const { data: goal, error: getError } = await this.getGoalById(id);
      
      if (getError || !goal) {
        return { error: getError || 'Goal not found' };
      }
      
      // Calculate progress as percentage of target
      const targetValue = goal.target_value || 1; // Avoid division by zero
      const progress = Math.min(1, Math.max(0, currentValue / targetValue));
      
      // If goal is completed, set status and completed_at
      let status = goal.status;
      let completed_at = goal.completed_at;
      
      if (progress >= 1 && status !== 'completed') {
        status = 'completed';
        completed_at = new Date().toISOString();
      } else if (progress < 1 && status === 'completed') {
        status = 'in_progress';
        completed_at = undefined; // Fix: Change null to undefined to match TypeScript type
      } else if (progress > 0 && status === 'not_started') {
        status = 'in_progress';
      }
      
      // Update the goal
      return await this.updateGoal(id, {
        current_value: currentValue,
        progress,
        status,
        completed_at
      });
    } catch (error) {
      console.error('Error updating goal progress:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get goals by farm ID for server components
   */
  async getGoalsByFarmServer(farmId: string): Promise<ApiResponse<Goal[]>> {
    try {
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching goals by farm ID:', error);
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error fetching goals by farm:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Add a dependency between goals
   */
  async addDependency(
    goalId: string, 
    dependencyGoalId: string
  ): Promise<ApiResponse<Goal>> {
    try {
      // Get current dependencies
      const { data: goal, error: goalError } = await this.getGoalById(goalId);
      
      if (goalError || !goal) {
        return { error: goalError || 'Goal not found' };
      }
      
      // Verify the dependency goal exists
      const { data: depGoal, error: depGoalError } = await this.getGoalById(dependencyGoalId);
      
      if (depGoalError || !depGoal) {
        return { error: depGoalError || 'Dependency goal not found' };
      }
      
      // Make sure the goals are in the same farm
      if (goal.farm_id !== depGoal.farm_id) {
        return { error: 'Goals must be in the same farm to create dependencies' };
      }
      
      // Check for circular dependency
      if (dependencyGoalId === goalId) {
        return { error: 'Cannot add self as dependency' };
      }
      
      // Check if the dependency already exists
      const dependencies = goal.dependencies || [];
      if (dependencies.some(dep => dep.goal_id === dependencyGoalId)) {
        return { error: 'Dependency already exists' };
      }
      
      // Add new dependency
      const updatedDependencies = [
        ...dependencies,
        { goal_id: dependencyGoalId, title: depGoal.title }
      ];
      
      // Update goal
      return await this.updateGoal(goalId, {
        dependencies: updatedDependencies,
        // If first dependency, set dependency type to sequential by default
        dependency_type: goal.dependency_type || (dependencies.length === 0 ? 'sequential' : undefined)
      });
    } catch (error) {
      console.error('Error adding goal dependency:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Remove a dependency between goals
   */
  async removeDependency(
    goalId: string, 
    dependencyGoalId: string
  ): Promise<ApiResponse<Goal>> {
    try {
      // Get current dependencies
      const { data: goal, error: goalError } = await this.getGoalById(goalId);
      
      if (goalError || !goal) {
        return { error: goalError || 'Goal not found' };
      }
      
      // Remove dependency
      const dependencies = goal.dependencies || [];
      const updatedDependencies = dependencies.filter(dep => dep.goal_id !== dependencyGoalId);
      
      if (dependencies.length === updatedDependencies.length) {
        return { error: 'Dependency not found' };
      }
      
      // Update goal
      return await this.updateGoal(goalId, {
        dependencies: updatedDependencies,
        // If no dependencies left, set dependency type to none
        dependency_type: updatedDependencies.length === 0 ? 'none' : undefined
      });
    } catch (error) {
      console.error('Error removing goal dependency:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Set goal dependency type
   */
  async setDependencyType(
    goalId: string, 
    dependencyType: 'sequential' | 'parallel' | 'none'
  ): Promise<ApiResponse<Goal>> {
    try {
      return await this.updateGoal(goalId, {
        dependency_type: dependencyType
      });
    } catch (error) {
      console.error('Error setting goal dependency type:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Set parent goal
   */
  async setParentGoal(
    goalId: string, 
    parentGoalId: string | null
  ): Promise<ApiResponse<Goal>> {
    try {
      if (parentGoalId) {
        // Verify the parent goal exists
        const { data: parentGoal, error: parentGoalError } = await this.getGoalById(parentGoalId);
        
        if (parentGoalError || !parentGoal) {
          return { error: parentGoalError || 'Parent goal not found' };
        }
        
        // Get current goal
        const { data: goal, error: goalError } = await this.getGoalById(goalId);
        
        if (goalError || !goal) {
          return { error: goalError || 'Goal not found' };
        }
        
        // Make sure the goals are in the same farm
        if (goal.farm_id !== parentGoal.farm_id) {
          return { error: 'Goals must be in the same farm to create parent-child relationship' };
        }
        
        // Check for circular dependency
        if (parentGoalId === goalId) {
          return { error: 'Cannot add self as parent' };
        }
      }
      
      // Update goal
      return await this.updateGoal(goalId, {
        parent_goal_id: parentGoalId || null
      });
    } catch (error) {
      console.error('Error setting parent goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get child goals
   */
  async getChildGoals(
    goalId: string
  ): Promise<ApiResponse<Goal[]>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('parent_goal_id', goalId)
        .order('created_at', { ascending: true });
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error getting child goals:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Check if goal can be started
   */
  async canStartGoal(goalId: string): Promise<ApiResponse<{can_start: boolean, blocking_dependencies?: any[]}>> {
    try {
      // Get goal
      const { data: goal, error: goalError } = await this.getGoalById(goalId);
      
      if (goalError || !goal) {
        return { error: goalError || 'Goal not found' };
      }
      
      // If goal already started or completed, it can't be started again
      if (goal.status === 'in_progress' || goal.status === 'completed') {
        return { data: { can_start: false } };
      }
      
      // If no dependencies or dependency type is none, can start
      if (!goal.dependencies || goal.dependencies.length === 0 || goal.dependency_type === 'none') {
        return { data: { can_start: true } };
      }
      
      // Check dependencies based on dependency type
      const dependencies = goal.dependencies;
      const blockingDependencies = [];
      
      // For each dependency, check its status
      for (const dep of dependencies) {
        const { data: depGoal } = await this.getGoalById(dep.goal_id);
        
        if (depGoal) {
          if (goal.dependency_type === 'sequential') {
            // For sequential, all dependencies must be completed
            if (depGoal.status !== 'completed') {
              blockingDependencies.push({
                id: depGoal.id,
                title: depGoal.title,
                status: depGoal.status
              });
            }
          } else if (goal.dependency_type === 'parallel') {
            // For parallel, all dependencies must be at least in progress
            if (depGoal.status !== 'in_progress' && depGoal.status !== 'completed') {
              blockingDependencies.push({
                id: depGoal.id,
                title: depGoal.title,
                status: depGoal.status
              });
            }
          }
        }
      }
      
      return { 
        data: { 
          can_start: blockingDependencies.length === 0,
          blocking_dependencies: blockingDependencies.length > 0 ? blockingDependencies : undefined
        } 
      };
    } catch (error) {
      console.error('Error checking if goal can be started:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
};
