import { createServerClient } from '@/utils/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { v4 as uuidv4 } from 'uuid';

interface AgentTask {
  id: string;
  coordinator_id: string;
  target_agent_id: string;
  task_type: string;
  parameters: any;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

interface CoordinationAction {
  action: 'assign_task' | 'share_knowledge' | 'request_analysis' | 'sync_state' | 'delegate_control';
  source_agent_id: string;
  target_agent_ids: string[];
  parameters: any;
  priority?: number;
  deadline_ms?: number;
  callback_url?: string;
}

interface AgentCapability {
  agent_id: string;
  capability: string;
  description: string;
  parameters?: any;
}

export class AgentCoordinationService {
  private supabase: SupabaseClient<Database>;
  
  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient;
  }
  
  /**
   * Static factory method to create a service instance
   */
  public static async create(): Promise<AgentCoordinationService> {
    const supabase = await createServerClient();
    return new AgentCoordinationService(supabase);
  }
  
  /**
   * Create a new coordination action between agents
   */
  public async createCoordinationAction(action: CoordinationAction): Promise<{ success: boolean; taskIds?: string[]; error?: string }> {
    try {
      // Validate the source agent exists
      const { data: sourceAgent, error: sourceError } = await this.supabase
        .from('elizaos_agents')
        .select('id, status, agent_type')
        .eq('id', action.source_agent_id)
        .single();
      
      if (sourceError || !sourceAgent) {
        return { success: false, error: `Source agent not found: ${sourceError?.message || 'Unknown error'}` };
      }
      
      // Check if the source agent is active
      if (sourceAgent.status === 'offline' || sourceAgent.status === 'error') {
        return { success: false, error: `Source agent is not active (status: ${sourceAgent.status})` };
      }
      
      // Validate target agents exist
      const { data: targetAgents, error: targetError } = await this.supabase
        .from('elizaos_agents')
        .select('id, status, agent_type')
        .in('id', action.target_agent_ids);
      
      if (targetError) {
        return { success: false, error: `Error fetching target agents: ${targetError.message}` };
      }
      
      if (!targetAgents || targetAgents.length === 0) {
        return { success: false, error: 'No valid target agents found' };
      }
      
      // Calculate deadlines if specified
      const deadline = action.deadline_ms 
        ? new Date(Date.now() + action.deadline_ms).toISOString()
        : undefined;
      
      // Create tasks for each target agent
      const taskIds: string[] = [];
      
      for (const targetAgent of targetAgents) {
        // Skip offline agents
        if (targetAgent.status === 'offline' || targetAgent.status === 'error') {
          console.warn(`Skipping offline/error agent ${targetAgent.id} (status: ${targetAgent.status})`);
          continue;
        }
        
        // Create the task
        const taskId = uuidv4();
        const { error: insertError } = await this.supabase
          .from('elizaos_agent_tasks')
          .insert({
            id: taskId,
            coordinator_id: action.source_agent_id,
            target_agent_id: targetAgent.id,
            task_type: action.action,
            parameters: action.parameters,
            priority: action.priority || 5,
            status: 'pending',
            deadline: deadline,
          });
        
        if (insertError) {
          console.error(`Error creating task for agent ${targetAgent.id}:`, insertError);
          continue;
        }
        
        taskIds.push(taskId);
        
        // Log the coordination activity
        await this.logCoordinationActivity(
          action.source_agent_id,
          targetAgent.id,
          action.action,
          {
            taskId,
            parameters: action.parameters,
          }
        );
      }
      
      if (taskIds.length === 0) {
        return { success: false, error: 'Failed to create tasks for any target agents' };
      }
      
      return { success: true, taskIds };
    } catch (error: any) {
      console.error('Error in createCoordinationAction:', error);
      return { success: false, error: `Coordination action failed: ${error.message}` };
    }
  }
  
  /**
   * Get pending tasks for an agent
   */
  public async getAgentTasks(agentId: string, status?: string): Promise<AgentTask[]> {
    try {
      let query = this.supabase
        .from('elizaos_agent_tasks')
        .select('*')
        .eq('target_agent_id', agentId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`Error fetching tasks for agent ${agentId}:`, error);
        return [];
      }
      
      return data as AgentTask[];
    } catch (error) {
      console.error(`Error in getAgentTasks for ${agentId}:`, error);
      return [];
    }
  }
  
  /**
   * Update a task status
   */
  public async updateTaskStatus(taskId: string, status: string, result?: any): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('elizaos_agent_tasks')
        .update({ 
          status, 
          result,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (error) {
        console.error(`Error updating task ${taskId}:`, error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error in updateTaskStatus for ${taskId}:`, error);
      return false;
    }
  }
  
  /**
   * Register agent capabilities
   */
  public async registerAgentCapabilities(agentId: string, capabilities: Omit<AgentCapability, 'agent_id'>[]): Promise<boolean> {
    try {
      // Delete existing capabilities
      await this.supabase
        .from('elizaos_agent_capabilities')
        .delete()
        .eq('agent_id', agentId);
      
      // Insert new capabilities
      const capabilitiesToInsert = capabilities.map(capability => ({
        agent_id: agentId,
        capability: capability.capability,
        description: capability.description,
        parameters: capability.parameters || {},
      }));
      
      const { error } = await this.supabase
        .from('elizaos_agent_capabilities')
        .insert(capabilitiesToInsert);
      
      if (error) {
        console.error(`Error registering capabilities for agent ${agentId}:`, error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error in registerAgentCapabilities for ${agentId}:`, error);
      return false;
    }
  }
  
  /**
   * Find agents with specific capabilities
   */
  public async findAgentsWithCapability(
    capability: string, 
    agentType?: string
  ): Promise<{ id: string; agent_type: string }[]> {
    try {
      let query = this.supabase
        .from('elizaos_agent_capabilities')
        .select('agent_id, elizaos_agents!inner(id, agent_type, status)')
        .eq('capability', capability)
        .eq('elizaos_agents.status', 'idle');
      
      if (agentType) {
        query = query.eq('elizaos_agents.agent_type', agentType);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`Error finding agents with capability ${capability}:`, error);
        return [];
      }
      
      // Transform the data to the expected format
      return data.map(item => ({
        id: item.agent_id,
        agent_type: (item.elizaos_agents as any).agent_type
      }));
    } catch (error) {
      console.error(`Error in findAgentsWithCapability for ${capability}:`, error);
      return [];
    }
  }
  
  /**
   * Create trading research task for research agents
   */
  public async createTradingResearchTask(
    coordinatorId: string,
    symbol: string,
    timeframe: string,
    researchType: 'technical' | 'fundamental' | 'sentiment',
    additionalParams?: any
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      // Find available research agents
      const researchAgents = await this.findAgentsWithCapability('market_research', 'research');
      
      if (researchAgents.length === 0) {
        return { success: false, error: 'No available research agents found' };
      }
      
      // Select the first available research agent
      const targetAgentId = researchAgents[0].id;
      
      // Create the research task
      const taskId = uuidv4();
      const { error } = await this.supabase
        .from('elizaos_agent_tasks')
        .insert({
          id: taskId,
          coordinator_id: coordinatorId,
          target_agent_id: targetAgentId,
          task_type: 'market_research',
          parameters: {
            symbol,
            timeframe,
            research_type: researchType,
            ...additionalParams
          },
          priority: 7, // Research tasks are high priority
          status: 'pending',
        });
      
      if (error) {
        return { success: false, error: `Failed to create research task: ${error.message}` };
      }
      
      // Log the coordination activity
      await this.logCoordinationActivity(
        coordinatorId,
        targetAgentId,
        'request_analysis',
        {
          taskId,
          symbol,
          timeframe,
          research_type: researchType
        }
      );
      
      return { success: true, taskId };
    } catch (error: any) {
      return { success: false, error: `Failed to create research task: ${error.message}` };
    }
  }
  
  /**
   * Create a trading signal from a research agent to a trading agent
   */
  public async createTradingSignal(
    researchAgentId: string,
    symbol: string,
    signalType: 'BUY' | 'SELL' | 'NEUTRAL',
    confidence: number,
    analysis: any,
    timeframe: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find available trading agents that handle this symbol
      const tradingAgents = await this.findAgentsWithCapability('execute_trade', 'trading');
      
      if (tradingAgents.length === 0) {
        return { success: false, error: 'No available trading agents found' };
      }
      
      // Create coordination actions for each trading agent
      const actions = tradingAgents.map(agent => ({
        source_agent_id: researchAgentId,
        target_agent_ids: [agent.id],
        action: 'share_knowledge' as const,
        parameters: {
          knowledge_type: 'trading_signal',
          symbol,
          signal: signalType,
          confidence,
          analysis,
          timeframe,
          timestamp: new Date().toISOString()
        },
        priority: 8 // Trading signals are very high priority
      }));
      
      // Execute all coordination actions
      const results = await Promise.all(
        actions.map(action => this.createCoordinationAction(action))
      );
      
      // Check if at least one action succeeded
      const success = results.some(result => result.success);
      
      if (!success) {
        const errors = results
          .filter(result => !result.success)
          .map(result => result.error)
          .join('; ');
          
        return { success: false, error: `Failed to create trading signals: ${errors}` };
      }
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: `Failed to create trading signal: ${error.message}` };
    }
  }
  
  /**
   * Log coordination activity
   */
  private async logCoordinationActivity(
    sourceAgentId: string,
    targetAgentId: string,
    actionType: string,
    details: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('elizaos_agent_activities')
        .insert({
          agent_id: sourceAgentId,
          action: 'coordination',
          details: `Coordination with agent ${targetAgentId}: ${actionType}`,
          metadata: {
            coordination_type: actionType,
            target_agent_id: targetAgentId,
            ...details
          }
        });
    } catch (error) {
      console.error('Error logging coordination activity:', error);
    }
  }
}
