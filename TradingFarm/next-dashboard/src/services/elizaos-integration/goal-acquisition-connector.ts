/**
 * ElizaOS Goal Acquisition Connector
 * Connects the Goal Acquisition system with ElizaOS for agent coordination
 */

import { Goal, GoalStrategy, GoalTransaction } from '@/types/goal-types';
import { ElizaCommandResponse } from '@/types/farm-types';
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';

// Types for ElizaOS commands specific to goal acquisition
export interface GoalAcquisitionCommand {
  type: 'ANALYZE_MARKET' | 'PROPOSE_STRATEGY' | 'EXECUTE_TRADE' | 'MONITOR_PROGRESS' | 'ADAPT_STRATEGY';
  goalId: string;
  context: any;
  priority?: 'low' | 'medium' | 'high';
}

// Types for ElizaOS memories about goal acquisition
export interface GoalAcquisitionMemory {
  goalId: string;
  memoryType: 'STRATEGY' | 'EXECUTION' | 'MARKET_CONDITION' | 'RESULT';
  content: string;
  metadata: any;
  importance: number;
}

/**
 * Connector to ElizaOS Command Service for Goal Acquisition
 * This service handles sending commands to ElizaOS agents and retrieving their responses
 */
export const elizaGoalConnector = {
  /**
   * Send a command to an ElizaOS agent related to goal acquisition
   */
  async sendCommand(
    agentId: string,
    command: GoalAcquisitionCommand
  ): Promise<ElizaCommandResponse> {
    try {
      // Create supabase client
      const supabase = createBrowserClient();
      
      // Format the command for ElizaOS
      const elizaCommand = {
        command_type: command.type,
        agent_id: agentId,
        content: {
          goalId: command.goalId,
          ...command.context
        },
        priority: command.priority || 'medium',
        metadata: {
          source: 'goal_acquisition_system',
          timestamp: new Date().toISOString()
        }
      };
      
      // Send the command to ElizaOS via the commands table
      const { data, error } = await supabase
        .from('eliza_commands')
        .insert(elizaCommand)
        .select()
        .single();
      
      if (error) {
        console.error('Error sending ElizaOS command:', error);
        return {
          success: false,
          message: error.message,
          data: null
        };
      }
      
      return {
        success: true,
        message: 'Command sent successfully',
        data: data
      };
    } catch (error) {
      console.error('Error in elizaGoalConnector.sendCommand:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  },
  
  /**
   * Get the response of a command from ElizaOS
   */
  async getCommandResponse(commandId: string): Promise<ElizaCommandResponse> {
    try {
      // Create supabase client
      const supabase = createBrowserClient();
      
      // Get the command response
      const { data, error } = await supabase
        .from('eliza_command_responses')
        .select('*')
        .eq('command_id', commandId)
        .single();
      
      if (error) {
        console.error('Error getting ElizaOS command response:', error);
        return {
          success: false,
          message: error.message,
          data: null
        };
      }
      
      return {
        success: true,
        message: 'Command response retrieved successfully',
        data
      };
    } catch (error) {
      console.error('Error in elizaGoalConnector.getCommandResponse:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  },
  
  /**
   * Send market analysis command to an agent
   */
  async requestMarketAnalysis(
    agentId: string,
    goalId: string,
    targetAsset: string,
    currentMarketData?: any
  ): Promise<ElizaCommandResponse> {
    return this.sendCommand(agentId, {
      type: 'ANALYZE_MARKET',
      goalId,
      context: {
        targetAsset,
        currentMarketData,
        task: 'Analyze current market conditions and provide insights for acquiring ' + targetAsset
      },
      priority: 'high'
    });
  },
  
  /**
   * Request strategy proposal from an agent
   */
  async requestStrategyProposal(
    agentId: string,
    goalId: string,
    goal: Goal,
    marketAnalysis: any
  ): Promise<ElizaCommandResponse> {
    return this.sendCommand(agentId, {
      type: 'PROPOSE_STRATEGY',
      goalId,
      context: {
        goal,
        marketAnalysis,
        task: `Propose an optimal strategy to acquire ${goal.target_amount} ${goal.selected_asset}`
      },
      priority: 'high'
    });
  },
  
  /**
   * Send execution command to an agent
   */
  async requestExecution(
    agentId: string,
    goalId: string,
    strategy: GoalStrategy
  ): Promise<ElizaCommandResponse> {
    return this.sendCommand(agentId, {
      type: 'EXECUTE_TRADE',
      goalId,
      context: {
        strategy,
        task: 'Execute the selected strategy to progress toward goal acquisition'
      },
      priority: 'high'
    });
  },
  
  /**
   * Request monitoring update from an agent
   */
  async requestMonitoringUpdate(
    agentId: string,
    goalId: string,
    currentProgress: number,
    targetAmount: number,
    selectedAsset: string
  ): Promise<ElizaCommandResponse> {
    return this.sendCommand(agentId, {
      type: 'MONITOR_PROGRESS',
      goalId,
      context: {
        currentProgress,
        targetAmount,
        selectedAsset,
        task: 'Monitor progress toward goal and market conditions for potential strategy adjustments'
      },
      priority: 'medium'
    });
  },
  
  /**
   * Store a memory in ElizaOS about goal acquisition
   */
  async storeMemory(
    agentId: string,
    memory: GoalAcquisitionMemory
  ): Promise<ElizaCommandResponse> {
    try {
      // Create supabase client
      const supabase = createBrowserClient();
      
      // Format the memory for ElizaOS
      const elizaMemory = {
        agent_id: agentId,
        memory_type: 'GOAL_ACQUISITION',
        content: memory.content,
        metadata: {
          goalId: memory.goalId,
          memoryType: memory.memoryType,
          ...memory.metadata
        },
        importance: memory.importance,
        timestamp: new Date().toISOString()
      };
      
      // Store the memory in ElizaOS
      const { data, error } = await supabase
        .from('eliza_memories')
        .insert(elizaMemory)
        .select()
        .single();
      
      if (error) {
        console.error('Error storing ElizaOS memory:', error);
        return {
          success: false,
          message: error.message,
          data: null
        };
      }
      
      return {
        success: true,
        message: 'Memory stored successfully',
        data
      };
    } catch (error) {
      console.error('Error in elizaGoalConnector.storeMemory:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  },
  
  /**
   * Retrieve memories from ElizaOS related to a specific goal
   */
  async getGoalMemories(
    goalId: string,
    memoryType?: string,
    limit = 10
  ): Promise<ElizaCommandResponse> {
    try {
      // Create supabase client
      const supabase = createBrowserClient();
      
      // Build query
      let query = supabase
        .from('eliza_memories')
        .select('*')
        .eq('memory_type', 'GOAL_ACQUISITION')
        .filter('metadata->goalId', 'eq', goalId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      // Add memory type filter if specified
      if (memoryType) {
        query = query.filter('metadata->memoryType', 'eq', memoryType);
      }
      
      // Execute query
      const { data, error } = await query;
      
      if (error) {
        console.error('Error retrieving ElizaOS memories:', error);
        return {
          success: false,
          message: error.message,
          data: null
        };
      }
      
      return {
        success: true,
        message: 'Memories retrieved successfully',
        data
      };
    } catch (error) {
      console.error('Error in elizaGoalConnector.getGoalMemories:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  }
};
