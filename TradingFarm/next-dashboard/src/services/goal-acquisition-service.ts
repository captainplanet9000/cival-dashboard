/**
 * Goal Acquisition Service
 * Specialized service for handling cryptocurrency acquisition goals
 * Extends the base goal service with acquisition-specific functionality
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { Goal, GoalStrategy, GoalTransaction, GoalMonitoringEvent } from '@/types/goal-types';
import { goalService } from './goal-service';
import { Agent } from '@/types/farm-types';
import { Database } from '@/types/database.types';

// API response types (matching the existing goalService)
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

// Goal Acquisition Service
export const goalAcquisitionService = {
  /**
   * Create an acquisition goal (e.g., acquire 10,000 SONIC or SUI)
   */
  async createAcquisitionGoal(
    farmId: string,
    name: string,
    targetAmount: number,
    targetAssets: string[],
    description?: string,
    completionActions?: {
      transferToBank?: boolean,
      startNextGoal?: boolean,
      nextGoalId?: string
    }
  ): Promise<ApiResponse<Goal>> {
    try {
      const supabase = createBrowserClient();
      
      // Insert goal into the goals table
      const { data, error } = await supabase
        .from('goals')
        .insert({
          farm_id: farmId,
          name,
          description,
          target_amount: targetAmount,
          current_amount: 0,
          target_assets: targetAssets,
          status: 'PENDING',
          completion_actions: completionActions || {}
        })
        .select()
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error creating acquisition goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Activate an acquisition goal
   * Moves it from PENDING to ACTIVE status
   */
  async activateAcquisitionGoal(goalId: string): Promise<ApiResponse<Goal>> {
    try {
      const supabase = createBrowserClient();
      
      // Update goal status to ACTIVE
      const { data, error } = await supabase
        .from('goals')
        .update({
          status: 'ACTIVE'
        })
        .eq('id', goalId)
        .select()
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      // Notify the AgentCoordinationService about the activated goal
      // This would typically be done through a webhook or event system
      this.notifyGoalActivation(goalId);
      
      return { data };
    } catch (error) {
      console.error('Error activating acquisition goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Pause an active acquisition goal
   */
  async pauseAcquisitionGoal(goalId: string): Promise<ApiResponse<Goal>> {
    try {
      const supabase = createBrowserClient();
      
      // Update goal status to PAUSED
      const { data, error } = await supabase
        .from('goals')
        .update({
          status: 'PAUSED'
        })
        .eq('id', goalId)
        .select()
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error pausing acquisition goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Resume a paused acquisition goal
   */
  async resumeAcquisitionGoal(goalId: string): Promise<ApiResponse<Goal>> {
    try {
      const supabase = createBrowserClient();
      
      // Update goal status to ACTIVE
      const { data, error } = await supabase
        .from('goals')
        .update({
          status: 'ACTIVE'
        })
        .eq('id', goalId)
        .select()
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error resuming acquisition goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update the progress of an acquisition goal
   */
  async updateAcquisitionProgress(goalId: string, currentAmount: number): Promise<ApiResponse<Goal>> {
    try {
      const supabase = createBrowserClient();
      
      // Get the goal to check if it's completed
      const { data: goal, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();
      
      if (goalError || !goal) {
        return { error: goalError?.message || 'Goal not found' };
      }
      
      // Check if the goal is now completed
      const isCompleted = currentAmount >= goal.target_amount;
      const newStatus = isCompleted ? 'COMPLETED' : goal.status;
      
      // Update goal progress
      const { data, error } = await supabase
        .from('goals')
        .update({
          current_amount: currentAmount,
          status: newStatus
        })
        .eq('id', goalId)
        .select()
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      // If goal is completed, execute completion actions
      if (isCompleted) {
        await this.executeCompletionActions(goalId);
      }
      
      return { data };
    } catch (error) {
      console.error('Error updating acquisition progress:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Record a transaction related to a goal
   */
  async recordTransaction(
    goalId: string,
    transactionType: string,
    assetFrom?: string,
    amountFrom?: number,
    assetTo?: string,
    amountTo?: number,
    transactionHash?: string,
    strategyId?: string
  ): Promise<ApiResponse<GoalTransaction>> {
    try {
      const supabase = createBrowserClient();
      
      // Insert transaction
      const { data, error } = await supabase
        .from('goal_transactions')
        .insert({
          goal_id: goalId,
          strategy_id: strategyId,
          transaction_type: transactionType,
          asset_from: assetFrom,
          amount_from: amountFrom,
          asset_to: assetTo,
          amount_to: amountTo,
          transaction_hash: transactionHash,
          status: 'PENDING'
        })
        .select()
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error recording transaction:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update transaction status (e.g., when confirmed on-chain)
   */
  async updateTransactionStatus(
    transactionId: string,
    status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  ): Promise<ApiResponse<GoalTransaction>> {
    try {
      const supabase = createBrowserClient();
      
      // Update transaction status
      const { data, error } = await supabase
        .from('goal_transactions')
        .update({
          status
        })
        .eq('id', transactionId)
        .select()
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      // If transaction is confirmed and it was an acquisition, update goal progress
      if (status === 'CONFIRMED' && data.transaction_type === 'SWAP' && data.asset_to) {
        const { data: goal } = await this.getAcquisitionGoal(data.goal_id);
        
        if (goal && goal.selected_asset === data.asset_to) {
          await this.updateAcquisitionProgress(
            data.goal_id,
            (goal.current_amount || 0) + (data.amount_to || 0)
          );
        }
      }
      
      return { data };
    } catch (error) {
      console.error('Error updating transaction status:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get all transactions for a goal
   */
  async getGoalTransactions(goalId: string): Promise<ApiResponse<GoalTransaction[]>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goal_transactions')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error getting goal transactions:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get a specific acquisition goal
   */
  async getAcquisitionGoal(goalId: string): Promise<ApiResponse<Goal>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error getting acquisition goal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Add a strategy proposal from an agent
   */
  async addStrategyProposal(
    goalId: string,
    agentId: string,
    strategyType: string,
    parameters?: Record<string, any>
  ): Promise<ApiResponse<GoalStrategy>> {
    try {
      const supabase = createBrowserClient();
      
      // Insert strategy proposal
      const { data, error } = await supabase
        .from('goal_strategies')
        .insert({
          goal_id: goalId,
          agent_id: agentId,
          strategy_type: strategyType,
          parameters,
          is_active: false
        })
        .select()
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error adding strategy proposal:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Select a strategy for execution
   */
  async selectStrategy(
    strategyId: string,
    selectedAsset?: string
  ): Promise<ApiResponse<{strategy: GoalStrategy, goal: Goal}>> {
    try {
      const supabase = createBrowserClient();
      
      // First get the strategy to access its goal_id
      const { data: strategy, error: strategyError } = await supabase
        .from('goal_strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
      
      if (strategyError || !strategy) {
        return { error: strategyError?.message || 'Strategy not found' };
      }
      
      // Update this strategy to be active
      const { error: updateError } = await supabase
        .from('goal_strategies')
        .update({
          is_active: true,
          selected_at: new Date().toISOString()
        })
        .eq('id', strategyId);
      
      if (updateError) {
        return { error: updateError.message };
      }
      
      // Deactivate all other strategies for this goal
      const { error: deactivateError } = await supabase
        .from('goal_strategies')
        .update({
          is_active: false
        })
        .eq('goal_id', strategy.goal_id)
        .neq('id', strategyId);
      
      if (deactivateError) {
        console.error('Error deactivating other strategies:', deactivateError);
      }
      
      // If a selected asset was specified, update the goal
      let goal = null;
      if (selectedAsset) {
        const { data: updatedGoal, error: goalError } = await supabase
          .from('goals')
          .update({
            selected_asset: selectedAsset
          })
          .eq('id', strategy.goal_id)
          .select()
          .single();
        
        if (goalError) {
          return { error: goalError.message };
        }
        
        goal = updatedGoal;
      } else {
        // Just fetch the current goal
        const { data: fetchedGoal } = await this.getAcquisitionGoal(strategy.goal_id);
        goal = fetchedGoal;
      }
      
      return { data: { strategy, goal } };
    } catch (error) {
      console.error('Error selecting strategy:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get all strategies for a goal
   */
  async getGoalStrategies(goalId: string): Promise<ApiResponse<GoalStrategy[]>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goal_strategies')
        .select(`
          *,
          agent:agents(*)
        `)
        .eq('goal_id', goalId)
        .order('proposed_at', { ascending: false });
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error getting goal strategies:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get the currently active strategy for a goal
   */
  async getActiveStrategy(goalId: string): Promise<ApiResponse<GoalStrategy>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goal_strategies')
        .select(`
          *,
          agent:agents(*)
        `)
        .eq('goal_id', goalId)
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error getting active strategy:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Record a monitoring event for a goal
   */
  async recordMonitoringEvent(
    goalId: string,
    agentId: string,
    eventType: string,
    eventData?: Record<string, any>
  ): Promise<ApiResponse<GoalMonitoringEvent>> {
    try {
      const supabase = createBrowserClient();
      
      // Insert monitoring event
      const { data, error } = await supabase
        .from('goal_monitoring')
        .insert({
          goal_id: goalId,
          agent_id: agentId,
          event_type: eventType,
          event_data: eventData || {}
        })
        .select()
        .single();
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error recording monitoring event:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get monitoring events for a goal
   */
  async getMonitoringEvents(goalId: string, limit = 50): Promise<ApiResponse<GoalMonitoringEvent[]>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('goal_monitoring')
        .select(`
          *,
          agent:agents(id, name)
        `)
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        return { error: error.message };
      }
      
      return { data };
    } catch (error) {
      console.error('Error getting monitoring events:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Execute completion actions for a goal
   * This is called automatically when a goal is completed
   */
  async executeCompletionActions(goalId: string): Promise<ApiResponse<null>> {
    try {
      // Get the goal to check completion actions
      const { data: goal, error: goalError } = await this.getAcquisitionGoal(goalId);
      
      if (goalError || !goal) {
        return { error: goalError || 'Goal not found' };
      }
      
      const completionActions = goal.completion_actions || {};
      
      // Transfer to bank if enabled
      if (completionActions.transferToBank && goal.selected_asset) {
        // Here we would call the UnifiedBankingService to transfer assets
        // This is just a placeholder - you would implement the actual banking service call
        console.log('Transferring assets to bank:', {
          asset: goal.selected_asset,
          amount: goal.current_amount,
          from: `Farm ${goal.farm_id}`,
          to: 'Bank Account'
        });
        
        // Record the transfer transaction
        await this.recordTransaction(
          goalId,
          'TRANSFER',
          goal.selected_asset,
          goal.current_amount,
          goal.selected_asset,
          goal.current_amount
        );
      }
      
      // Start next goal if enabled
      if (completionActions.startNextGoal && completionActions.nextGoalId) {
        // Activate the next goal
        await this.activateAcquisitionGoal(completionActions.nextGoalId);
      }
      
      return { data: null };
    } catch (error) {
      console.error('Error executing completion actions:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Notify the AgentCoordinationService about goal activation
   * This would typically be done through a webhook or event system
   */
  async notifyGoalActivation(goalId: string): Promise<void> {
    try {
      // Implementation would depend on how the AgentCoordinationService is set up
      // This is a placeholder for the actual implementation
      const url = getApiUrl('agent-coordination/goal-activated');
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ goalId }),
      });
    } catch (error) {
      console.error('Error notifying goal activation:', error);
    }
  },
  
  /**
   * Subscribe to acquisition goal changes
   * @returns A function to unsubscribe
   */
  subscribeToAcquisitionGoalChanges(
    callback: (goal: Goal) => void,
    goalId: string
  ): () => void {
    const supabase = createBrowserClient();
    
    // Create the channel
    const channel = supabase.channel(`goal-${goalId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `id=eq.${goalId}`
        },
        async (payload) => {
          // When a change occurs, fetch the updated goal
          const { data } = await this.getAcquisitionGoal(goalId);
          if (data) {
            callback(data);
          }
        }
      )
      .subscribe();
    
    // Return an unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
