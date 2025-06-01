/**
 * Acquisition Goal Service
 * Handles asset acquisition goals for trading with ElizaOS integration
 */
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { TradingEventEmitter, TRADING_EVENTS } from '@/utils/events/trading-events';
import { agentService } from '@/services/agent-service';

// Types
export interface AcquisitionGoal {
  id: string;
  goal_id: string;
  target_asset: string;
  target_amount: number;
  current_amount: number;
  target_price_range?: {
    min?: number;
    max?: number;
  };
  timeline_days?: number;
  source_assets?: string[];
  strategy_id?: string;
  execution_parameters?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TradingGoal {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  goal_type: 'acquisition' | 'profit' | 'portfolio' | 'risk_management' | 'custom';
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed';
  target: Record<string, any>;
  progress: Record<string, any>;
  timeline?: Record<string, any>;
  metrics?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  farm_id?: string;
  created_at: string;
  updated_at: string;
}

export interface GoalStep {
  id: string;
  goal_id: string;
  name: string;
  description?: string;
  order_index: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  completion_criteria?: Record<string, any>;
  assigned_agent_id?: string;
  start_condition?: string;
  results?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Service for managing acquisition goals
 */
export const acquisitionGoalService = {
  /**
   * Create a new acquisition goal
   */
  async createAcquisitionGoal(
    goalData: {
      name: string;
      description?: string;
      targetAsset: string;
      targetAmount: number;
      targetPriceRange?: { min?: number; max?: number };
      timelineDays?: number;
      sourceAssets?: string[];
      strategyId?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      farmId?: string;
      executionParameters?: Record<string, any>;
    }
  ): Promise<ApiResponse<{ tradingGoal: TradingGoal; acquisitionGoal: AcquisitionGoal }>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Start a transaction
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }
      
      // 1. Create the trading goal
      const { data: tradingGoal, error: goalError } = await supabase
        .from('trading_goals')
        .insert({
          user_id: session.user.id,
          name: goalData.name,
          description: goalData.description || '',
          goal_type: 'acquisition',
          status: 'pending',
          target: {
            asset: goalData.targetAsset,
            amount: goalData.targetAmount,
            price_range: goalData.targetPriceRange || {}
          },
          progress: {
            current_amount: 0,
            percentage: 0,
            last_update: new Date().toISOString()
          },
          timeline: goalData.timelineDays 
            ? { days: goalData.timelineDays, target_completion_date: new Date(Date.now() + goalData.timelineDays * 86400000).toISOString() }
            : null,
          metrics: {},
          priority: goalData.priority || 'medium',
          farm_id: goalData.farmId || null
        })
        .select()
        .single();
      
      if (goalError) {
        console.error('Error creating trading goal:', goalError);
        return { success: false, error: goalError.message };
      }
      
      // 2. Create the acquisition goal details
      const { data: acquisitionGoal, error: acquisitionError } = await supabase
        .from('acquisition_goals')
        .insert({
          goal_id: tradingGoal.id,
          target_asset: goalData.targetAsset,
          target_amount: goalData.targetAmount,
          current_amount: 0,
          target_price_range: goalData.targetPriceRange || null,
          timeline_days: goalData.timelineDays || null,
          source_assets: goalData.sourceAssets || null,
          strategy_id: goalData.strategyId || null,
          execution_parameters: goalData.executionParameters || {}
        })
        .select()
        .single();
      
      if (acquisitionError) {
        console.error('Error creating acquisition goal:', acquisitionError);
        // Try to rollback the trading goal
        await supabase.from('trading_goals').delete().eq('id', tradingGoal.id);
        return { success: false, error: acquisitionError.message };
      }
      
      // 3. Create default goal steps
      const steps = [
        {
          goal_id: tradingGoal.id,
          name: 'Market Analysis',
          description: 'Analyze market conditions for target asset acquisition',
          order_index: 0,
          status: 'pending',
          completion_criteria: { type: 'manual_approval' }
        },
        {
          goal_id: tradingGoal.id,
          name: 'Strategy Selection',
          description: 'Select optimal trading strategy for acquisition',
          order_index: 1,
          status: 'pending',
          start_condition: 'previous_step_completed',
          completion_criteria: { type: 'manual_approval' }
        },
        {
          goal_id: tradingGoal.id,
          name: 'Execution',
          description: 'Execute trades to acquire target asset',
          order_index: 2,
          status: 'pending',
          start_condition: 'previous_step_completed',
          completion_criteria: { type: 'target_achieved' }
        },
        {
          goal_id: tradingGoal.id,
          name: 'Verification',
          description: 'Verify successful acquisition and final reporting',
          order_index: 3,
          status: 'pending',
          start_condition: 'previous_step_completed',
          completion_criteria: { type: 'manual_approval' }
        }
      ];
      
      const { error: stepsError } = await supabase.from('goal_steps').insert(steps);
      
      if (stepsError) {
        console.error('Error creating goal steps:', stepsError);
        // Continue anyway, steps can be added later
      }
      
      // 4. Log activity
      await supabase.from('goal_activity').insert({
        goal_id: tradingGoal.id,
        activity_type: 'GOAL_CREATED',
        description: `Acquisition goal created: ${goalData.targetAmount} ${goalData.targetAsset}`,
        metadata: {
          created_by: session.user.id,
          target_asset: goalData.targetAsset,
          target_amount: goalData.targetAmount
        }
      });
      
      // Emit event for other components to react
      TradingEventEmitter.emit(TRADING_EVENTS.GOAL_CREATED, {
        goalId: tradingGoal.id,
        goalType: 'acquisition',
        name: tradingGoal.name,
        targetAsset: goalData.targetAsset,
        timestamp: new Date().toISOString()
      });
      
      return { 
        success: true, 
        data: { tradingGoal, acquisitionGoal }
      };
    } catch (error: any) {
      console.error('Error in createAcquisitionGoal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get all acquisition goals
   */
  async getAcquisitionGoals(farmId?: string): Promise<ApiResponse<(AcquisitionGoal & { trading_goal: TradingGoal })[]>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      let query = supabase
        .from('acquisition_goals')
        .select(`
          *,
          trading_goal:goal_id(*)
        `);
      
      if (farmId) {
        query = query.eq('trading_goal.farm_id', farmId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching acquisition goals:', error);
        return { success: false, error: error.message };
      }
      
      return {
        success: true,
        data: data || []
      };
    } catch (error: any) {
      console.error('Error in getAcquisitionGoals:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get a specific acquisition goal
   */
  async getAcquisitionGoal(goalId: string): Promise<ApiResponse<AcquisitionGoal & { trading_goal: TradingGoal; steps: GoalStep[] }>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Get acquisition goal with trading goal
      const { data: goalData, error: goalError } = await supabase
        .from('acquisition_goals')
        .select(`
          *,
          trading_goal:goal_id(*)
        `)
        .eq('goal_id', goalId)
        .single();
      
      if (goalError) {
        console.error('Error fetching acquisition goal:', goalError);
        return { success: false, error: goalError.message };
      }
      
      // Get goal steps
      const { data: steps, error: stepsError } = await supabase
        .from('goal_steps')
        .select('*')
        .eq('goal_id', goalId)
        .order('order_index', { ascending: true });
      
      if (stepsError) {
        console.error('Error fetching goal steps:', stepsError);
        // Continue anyway
      }
      
      return {
        success: true,
        data: {
          ...goalData,
          steps: steps || []
        }
      };
    } catch (error: any) {
      console.error('Error in getAcquisitionGoal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Update acquisition goal progress
   */
  async updateProgress(goalId: string, currentAmount: number): Promise<ApiResponse<AcquisitionGoal>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // First get the goal to calculate progress
      const { data: goal, error: goalError } = await supabase
        .from('acquisition_goals')
        .select('*')
        .eq('goal_id', goalId)
        .single();
      
      if (goalError) {
        console.error('Error fetching acquisition goal for update:', goalError);
        return { success: false, error: goalError.message };
      }
      
      // Update acquisition goal
      const { data: updatedGoal, error: updateError } = await supabase
        .from('acquisition_goals')
        .update({ 
          current_amount: currentAmount,
          updated_at: new Date().toISOString()
        })
        .eq('goal_id', goalId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating acquisition goal:', updateError);
        return { success: false, error: updateError.message };
      }
      
      // Calculate progress percentage
      const progressPercentage = goal.target_amount > 0 
        ? (currentAmount / goal.target_amount) * 100 
        : 0;
      
      // Update trading goal progress
      await supabase
        .from('trading_goals')
        .update({
          progress: {
            current_amount: currentAmount,
            percentage: progressPercentage,
            last_update: new Date().toISOString()
          },
          // If we've reached 100%, mark as completed
          ...(progressPercentage >= 100 ? { 
            status: 'completed'
          } : {})
        })
        .eq('id', goalId);
      
      // Log activity
      await supabase.from('goal_activity').insert({
        goal_id: goalId,
        activity_type: 'PROGRESS_UPDATED',
        description: `Progress updated: ${currentAmount} ${goal.target_asset} (${progressPercentage.toFixed(2)}%)`,
        metadata: {
          current_amount: currentAmount,
          target_amount: goal.target_amount,
          percentage: progressPercentage
        }
      });
      
      // Emit event for other components to react
      TradingEventEmitter.emit(TRADING_EVENTS.GOAL_PROGRESS_UPDATED, {
        goalId,
        currentAmount,
        percentage: progressPercentage,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        data: updatedGoal
      };
    } catch (error: any) {
      console.error('Error in updateProgress:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Assign an ElizaOS agent to a goal step
   */
  async assignAgentToStep(stepId: string, agentId: string): Promise<ApiResponse<GoalStep>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Update the step
      const { data: updatedStep, error } = await supabase
        .from('goal_steps')
        .update({ 
          assigned_agent_id: agentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', stepId)
        .select('*, goal:goal_id(*)')
        .single();
      
      if (error) {
        console.error('Error assigning agent to step:', error);
        return { success: false, error: error.message };
      }
      
      // Get the goal information
      const goalId = updatedStep.goal_id;
      
      // Log activity
      await supabase.from('goal_activity').insert({
        goal_id: goalId,
        agent_id: agentId,
        activity_type: 'AGENT_ASSIGNED',
        description: `Agent assigned to step: ${updatedStep.name}`,
        metadata: {
          step_id: stepId,
          step_name: updatedStep.name,
          agent_id: agentId
        }
      });
      
      // Emit event for other components to react
      TradingEventEmitter.emit(TRADING_EVENTS.AGENT_ASSIGNED_TO_STEP, {
        goalId,
        stepId,
        agentId,
        stepName: updatedStep.name,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        data: updatedStep
      };
    } catch (error: any) {
      console.error('Error in assignAgentToStep:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Start a goal step with an ElizaOS agent
   */
  async startStepWithAgent(stepId: string, initialContext?: Record<string, any>): Promise<ApiResponse<{ step: GoalStep; runId?: string }>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Get the step with goal information
      const { data: step, error: stepError } = await supabase
        .from('goal_steps')
        .select(`
          *,
          goal:goal_id(*)
        `)
        .eq('id', stepId)
        .single();
      
      if (stepError || !step) {
        console.error('Error fetching step:', stepError);
        return { success: false, error: stepError?.message || 'Step not found' };
      }
      
      if (!step.assigned_agent_id) {
        return { success: false, error: 'No agent assigned to this step' };
      }
      
      // Get acquisition goal details
      const { data: acquisitionGoal, error: acquisitionError } = await supabase
        .from('acquisition_goals')
        .select('*')
        .eq('goal_id', step.goal_id)
        .single();
      
      if (acquisitionError) {
        console.error('Error fetching acquisition goal:', acquisitionError);
        return { success: false, error: acquisitionError.message };
      }
      
      // Update step status
      const { data: updatedStep, error: updateError } = await supabase
        .from('goal_steps')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', stepId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating step status:', updateError);
        return { success: false, error: updateError.message };
      }
      
      // Start agent run
      let agentRunId;
      try {
        const response = await agentService.startAgentRun(step.assigned_agent_id, {
          goalId: step.goal_id,
          stepId: step.id,
          stepName: step.name,
          goalType: 'acquisition',
          targetAsset: acquisitionGoal.target_asset,
          targetAmount: acquisitionGoal.target_amount,
          currentAmount: acquisitionGoal.current_amount,
          context: initialContext || {}
        });
        
        if (response.success && response.data) {
          agentRunId = response.data.id;
          
          // Log activity
          await supabase.from('goal_activity').insert({
            goal_id: step.goal_id,
            agent_id: step.assigned_agent_id,
            activity_type: 'STEP_STARTED',
            description: `Step started with agent: ${step.name}`,
            metadata: {
              step_id: stepId,
              step_name: step.name,
              agent_id: step.assigned_agent_id,
              run_id: agentRunId
            }
          });
        } else {
          console.error('Error starting agent run:', response.error);
        }
      } catch (agentError: any) {
        console.error('Error starting agent run:', agentError);
        // Continue anyway, we'll just not have a run ID
      }
      
      // Emit event for other components to react
      TradingEventEmitter.emit(TRADING_EVENTS.GOAL_STEP_STARTED, {
        goalId: step.goal_id,
        stepId,
        agentId: step.assigned_agent_id,
        runId: agentRunId,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        data: {
          step: updatedStep,
          runId: agentRunId
        }
      };
    } catch (error: any) {
      console.error('Error in startStepWithAgent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
