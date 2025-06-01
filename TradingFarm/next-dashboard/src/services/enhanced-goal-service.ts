/**
 * Enhanced Goal Service
 * Adds Zod validation to goal-related API interactions with Supabase
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { 
  goalSchema, 
  goalStrategySchema,
  createGoalSchema,
  updateGoalSchema,
  Goal,
  GoalStrategy,
  CreateGoalInput,
  UpdateGoalInput
} from '@/schemas/goal-schemas';
import { goalService, ApiResponse } from './goal-service';

/**
 * Enhanced goal service with Zod validation
 */
export const enhancedGoalService = {
  /**
   * Get all goals or goals for a specific farm with Zod validation
   */
  async getGoals(farmId?: number, limit = 50, offset = 0): Promise<ApiResponse<Goal[]>> {
    try {
      const response = await goalService.getGoals(farmId, limit, offset);
      
      if (response.error) {
        return response;
      }
      
      // Validate the response data using Zod
      if (response.data) {
        const validationResult = goalSchema.array().safeParse(response.data);
        
        if (validationResult.success) {
          return { 
            data: validationResult.data,
            count: response.count,
            total: response.total
          };
        } else {
          console.error('Goal validation error:', validationResult.error);
          return { 
            data: response.data, // Return the original data
            count: response.count,
            total: response.total,
            error: 'Data validation warning: Some goal fields might be invalid' 
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in enhanced getGoals:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Subscribe to goal changes (pass-through to original service)
   * @returns A function to unsubscribe
   */
  subscribeToGoals(
    callback: (goals: Goal[]) => void,
    farmId?: number
  ): () => void {
    return goalService.subscribeToGoals((goals) => {
      try {
        // Try to validate the data before passing it to the callback
        const validationResult = goalSchema.array().safeParse(goals);
        if (validationResult.success) {
          callback(validationResult.data);
        } else {
          console.warn('Goal subscription validation warning:', validationResult.error);
          // Still pass the original data to avoid breaking functionality
          callback(goals);
        }
      } catch (error) {
        console.error('Error in goal subscription handler:', error);
        // Still pass the original data to avoid breaking functionality
        callback(goals);
      }
    }, farmId);
  },

  /**
   * Get a specific goal by ID with Zod validation
   */
  async getGoalById(id: string): Promise<ApiResponse<Goal>> {
    try {
      const response = await goalService.getGoalById(id);
      
      if (response.error) {
        return response;
      }
      
      // Validate the response data using Zod
      if (response.data) {
        const validationResult = goalSchema.safeParse(response.data);
        
        if (validationResult.success) {
          return { data: validationResult.data };
        } else {
          console.error('Goal validation error:', validationResult.error);
          return { 
            data: response.data, // Return the original data
            error: 'Data validation warning: Some goal fields might be invalid' 
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in enhanced getGoalById:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a new goal with Zod validation
   */
  async createGoal(goalData: CreateGoalInput): Promise<ApiResponse<Goal>> {
    try {
      // Validate the input data using Zod
      const validationResult = createGoalSchema.safeParse(goalData);
      
      if (!validationResult.success) {
        console.error('Create goal validation error:', validationResult.error);
        return { error: 'Invalid goal data: ' + validationResult.error.message };
      }
      
      // Proceed with the validated data
      const response = await goalService.createGoal(validationResult.data);
      
      // Validate the response
      if (response.data && !response.error) {
        const responseValidation = goalSchema.safeParse(response.data);
        
        if (responseValidation.success) {
          return { data: responseValidation.data };
        } else {
          console.error('Goal response validation error:', responseValidation.error);
          return { 
            data: response.data, 
            error: 'Data validation warning: Created goal might have invalid fields' 
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in enhanced createGoal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update a goal with Zod validation
   */
  async updateGoal(id: string, goalData: UpdateGoalInput): Promise<ApiResponse<Goal>> {
    try {
      // Validate the input data using Zod
      const validationResult = updateGoalSchema.safeParse(goalData);
      
      if (!validationResult.success) {
        console.error('Update goal validation error:', validationResult.error);
        return { error: 'Invalid goal data: ' + validationResult.error.message };
      }
      
      // Proceed with the validated data
      const response = await goalService.updateGoal(id, validationResult.data);
      
      // Validate the response
      if (response.data && !response.error) {
        const responseValidation = goalSchema.safeParse(response.data);
        
        if (responseValidation.success) {
          return { data: responseValidation.data };
        } else {
          console.error('Goal response validation error:', responseValidation.error);
          return { 
            data: response.data, 
            error: 'Data validation warning: Updated goal might have invalid fields' 
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in enhanced updateGoal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Delete a goal (pass-through to original service)
   */
  async deleteGoal(id: string): Promise<ApiResponse<null>> {
    return goalService.deleteGoal(id);
  },

  /**
   * Update goal progress with Zod validation
   */
  async updateGoalProgress(id: string, currentValue: number): Promise<ApiResponse<Goal>> {
    try {
      // Validate the input
      if (typeof currentValue !== 'number' || isNaN(currentValue)) {
        return { error: 'Current value must be a valid number' };
      }
      
      const response = await goalService.updateGoalProgress(id, currentValue);
      
      // Validate the response
      if (response.data && !response.error) {
        const responseValidation = goalSchema.safeParse(response.data);
        
        if (responseValidation.success) {
          return { data: responseValidation.data };
        } else {
          console.error('Goal progress validation error:', responseValidation.error);
          return { 
            data: response.data, 
            error: 'Data validation warning: Updated goal might have invalid fields' 
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in enhanced updateGoalProgress:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  // Additional methods from the original service with pass-through
  getGoalStats: goalService.getGoalStats,
  getGoalsServer: goalService.getGoalsServer,
  getGoalAgents: goalService.getGoalAgents,
  assignAgentToGoal: goalService.assignAgentToGoal,
  unassignAgentFromGoal: goalService.unassignAgentFromGoal,
  getGoalsByFarmServer: goalService.getGoalsByFarmServer,
  addDependency: goalService.addDependency,
  removeDependency: goalService.removeDependency,
  setDependencyType: goalService.setDependencyType,
  setParentGoal: goalService.setParentGoal,
  getChildGoals: goalService.getChildGoals,
  canStartGoal: goalService.canStartGoal
};
