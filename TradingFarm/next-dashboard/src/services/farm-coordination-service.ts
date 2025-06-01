/**
 * Farm Coordination Service
 * Manages multi-agent coordination within farms
 */
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { TradingEventEmitter, TRADING_EVENTS } from '@/utils/events/trading-events';
import { agentService, ElizaAgent } from '@/services/agent-service';
import { v4 as uuidv4 } from 'uuid';

// Types for farm coordination
export type CoordinationType = 'sequential' | 'parallel' | 'hierarchical' | 'custom';

export interface FarmCoordination {
  id: string;
  farm_id: string;
  name: string;
  description?: string;
  coordination_type: CoordinationType;
  status: 'inactive' | 'active' | 'paused' | 'completed' | 'failed';
  config: Record<string, any>;
  agent_roles?: Record<string, any>;
  execution_plan?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CoordinationRun {
  id: string;
  coordination_id: string;
  farm_id: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  started_at: string;
  ended_at?: string;
  results?: Record<string, any>;
  metrics?: Record<string, any>;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentAssignment {
  id: string;
  coordination_id: string;
  agent_id: string;
  role: string;
  position: number;
  execution_order?: number;
  status: 'inactive' | 'active' | 'paused' | 'completed' | 'failed';
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
  agent?: ElizaAgent;
}

export interface CoordinationMessage {
  id: string;
  coordination_run_id: string;
  from_agent_id?: string;
  to_agent_id?: string;
  message_type: string;
  content: string;
  metadata?: Record<string, any>;
  timestamp: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Service for managing farm coordination
 */
export const farmCoordinationService = {
  /**
   * Get all coordination plans for a farm
   */
  async getCoordinationPlans(farmId: string): Promise<ApiResponse<FarmCoordination[]>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('farm_coordination')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching coordination plans:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      return {
        success: true,
        data: data || []
      };
    } catch (error: any) {
      console.error('Error in getCoordinationPlans:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get a specific coordination plan by ID
   */
  async getCoordinationPlan(id: string): Promise<ApiResponse<FarmCoordination>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('farm_coordination')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching coordination plan:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error in getCoordinationPlan:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Create a new coordination plan
   */
  async createCoordinationPlan(plan: Omit<FarmCoordination, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<FarmCoordination>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('farm_coordination')
        .insert(plan)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating coordination plan:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      // Emit event for other components to react
      TradingEventEmitter.emit(TRADING_EVENTS.COORDINATION_PLAN_CREATED, {
        coordinationId: data.id,
        farmId: data.farm_id,
        name: data.name,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error in createCoordinationPlan:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Update an existing coordination plan
   */
  async updateCoordinationPlan(id: string, updates: Partial<FarmCoordination>): Promise<ApiResponse<FarmCoordination>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('farm_coordination')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating coordination plan:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      // Emit event for other components to react
      TradingEventEmitter.emit(TRADING_EVENTS.COORDINATION_PLAN_UPDATED, {
        coordinationId: data.id,
        farmId: data.farm_id,
        name: data.name,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error in updateCoordinationPlan:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Delete a coordination plan
   */
  async deleteCoordinationPlan(id: string): Promise<ApiResponse<null>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // First, get the coordination plan to have farm_id for the event
      const { data: plan, error: planError } = await supabase
        .from('farm_coordination')
        .select('farm_id')
        .eq('id', id)
        .single();
      
      if (planError) {
        console.error('Error fetching coordination plan for deletion:', planError);
        return { 
          success: false, 
          error: planError.message 
        };
      }
      
      // Delete the coordination plan
      const { error } = await supabase
        .from('farm_coordination')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting coordination plan:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      // Emit event for other components to react
      TradingEventEmitter.emit(TRADING_EVENTS.COORDINATION_PLAN_DELETED, {
        coordinationId: id,
        farmId: plan.farm_id,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        data: null
      };
    } catch (error: any) {
      console.error('Error in deleteCoordinationPlan:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get agent assignments for a coordination plan
   */
  async getAgentAssignments(coordinationId: string): Promise<ApiResponse<AgentAssignment[]>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('coordination_agent_assignments')
        .select(`
          *,
          agent:agent_id (
            id, name, description, status, agent_type_id, model, parameters, created_at, updated_at
          )
        `)
        .eq('coordination_id', coordinationId)
        .order('position', { ascending: true });
      
      if (error) {
        console.error('Error fetching agent assignments:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      return {
        success: true,
        data: data || []
      };
    } catch (error: any) {
      console.error('Error in getAgentAssignments:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Assign an agent to a coordination plan
   */
  async assignAgent(assignment: Omit<AgentAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<AgentAssignment>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Check if agent is already assigned to this coordination
      const { data: existing, error: checkError } = await supabase
        .from('coordination_agent_assignments')
        .select('id')
        .eq('coordination_id', assignment.coordination_id)
        .eq('agent_id', assignment.agent_id);
      
      if (checkError) {
        console.error('Error checking existing assignment:', checkError);
        return { 
          success: false, 
          error: checkError.message 
        };
      }
      
      if (existing && existing.length > 0) {
        return {
          success: false,
          error: 'Agent is already assigned to this coordination plan'
        };
      }
      
      // Create the assignment
      const { data, error } = await supabase
        .from('coordination_agent_assignments')
        .insert(assignment)
        .select(`
          *,
          agent:agent_id (
            id, name, description, status, agent_type_id, model, parameters, created_at, updated_at
          )
        `)
        .single();
      
      if (error) {
        console.error('Error assigning agent:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      // Emit event for other components to react
      TradingEventEmitter.emit(TRADING_EVENTS.AGENT_ASSIGNED, {
        assignmentId: data.id,
        coordinationId: data.coordination_id,
        agentId: data.agent_id,
        role: data.role,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error in assignAgent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Update an agent assignment
   */
  async updateAgentAssignment(id: string, updates: Partial<AgentAssignment>): Promise<ApiResponse<AgentAssignment>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('coordination_agent_assignments')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          agent:agent_id (
            id, name, description, status, agent_type_id, model, parameters, created_at, updated_at
          )
        `)
        .single();
      
      if (error) {
        console.error('Error updating agent assignment:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      // Emit event for other components to react
      TradingEventEmitter.emit(TRADING_EVENTS.AGENT_ASSIGNMENT_UPDATED, {
        assignmentId: data.id,
        coordinationId: data.coordination_id,
        agentId: data.agent_id,
        role: data.role,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error in updateAgentAssignment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Remove an agent from a coordination plan
   */
  async removeAgent(assignmentId: string): Promise<ApiResponse<null>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // First, get the assignment to have data for the event
      const { data: assignment, error: assignmentError } = await supabase
        .from('coordination_agent_assignments')
        .select('coordination_id, agent_id, role')
        .eq('id', assignmentId)
        .single();
      
      if (assignmentError) {
        console.error('Error fetching assignment for removal:', assignmentError);
        return { 
          success: false, 
          error: assignmentError.message 
        };
      }
      
      // Delete the assignment
      const { error } = await supabase
        .from('coordination_agent_assignments')
        .delete()
        .eq('id', assignmentId);
      
      if (error) {
        console.error('Error removing agent assignment:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      // Emit event for other components to react
      TradingEventEmitter.emit(TRADING_EVENTS.AGENT_REMOVED, {
        assignmentId,
        coordinationId: assignment.coordination_id,
        agentId: assignment.agent_id,
        role: assignment.role,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        data: null
      };
    } catch (error: any) {
      console.error('Error in removeAgent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Start a coordination run
   */
  async startCoordination(coordinationId: string, initialData?: Record<string, any>): Promise<ApiResponse<CoordinationRun>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Get the coordination plan
      const { data: plan, error: planError } = await supabase
        .from('farm_coordination')
        .select('*')
        .eq('id', coordinationId)
        .single();
      
      if (planError) {
        console.error('Error fetching coordination plan for execution:', planError);
        return { 
          success: false, 
          error: planError.message 
        };
      }
      
      // Create a new run
      const { data, error } = await supabase
        .from('farm_coordination_runs')
        .insert({
          coordination_id: coordinationId,
          farm_id: plan.farm_id,
          status: 'running',
          results: initialData || {},
          metrics: {}
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating coordination run:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      // Update coordination plan status
      await supabase
        .from('farm_coordination')
        .update({ status: 'active' })
        .eq('id', coordinationId);
      
      // Get agent assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('coordination_agent_assignments')
        .select('*')
        .eq('coordination_id', coordinationId)
        .order('position', { ascending: true });
      
      if (assignmentsError) {
        console.error('Error fetching agent assignments for coordination:', assignmentsError);
        // Continue anyway, as we can start the run without assignments
      }
      
      // If this is a sequential coordination, activate the first agent
      if (plan.coordination_type === 'sequential' && assignments && assignments.length > 0) {
        // Set first agent to active, others to inactive
        for (let i = 0; i < assignments.length; i++) {
          await supabase
            .from('coordination_agent_assignments')
            .update({ 
              status: i === 0 ? 'active' : 'inactive',
              execution_order: i
            })
            .eq('id', assignments[i].id);
          
          // Start the first agent if coordination is sequential
          if (i === 0) {
            try {
              await agentService.startAgentRun(assignments[i].agent_id, {
                coordinationRunId: data.id,
                coordinationId,
                role: assignments[i].role,
                farmId: plan.farm_id,
                isCoordinated: true
              });
            } catch (agentError) {
              console.error('Error starting agent in coordination:', agentError);
              // Continue anyway, the coordination can proceed manually
            }
          }
        }
      } 
      // If parallel, start all agents at once
      else if (plan.coordination_type === 'parallel' && assignments && assignments.length > 0) {
        for (let i = 0; i < assignments.length; i++) {
          await supabase
            .from('coordination_agent_assignments')
            .update({ 
              status: 'active',
              execution_order: i
            })
            .eq('id', assignments[i].id);
          
          try {
            await agentService.startAgentRun(assignments[i].agent_id, {
              coordinationRunId: data.id,
              coordinationId,
              role: assignments[i].role,
              farmId: plan.farm_id,
              isCoordinated: true
            });
          } catch (agentError) {
            console.error('Error starting agent in coordination:', agentError);
            // Continue anyway, the coordination can proceed manually
          }
        }
      }
      
      // Emit event for other components to react
      TradingEventEmitter.emit(TRADING_EVENTS.COORDINATION_STARTED, {
        coordinationId,
        runId: data.id,
        farmId: plan.farm_id,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error in startCoordination:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get runs for a coordination plan
   */
  async getCoordinationRuns(coordinationId: string): Promise<ApiResponse<CoordinationRun[]>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('farm_coordination_runs')
        .select('*')
        .eq('coordination_id', coordinationId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching coordination runs:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      return {
        success: true,
        data: data || []
      };
    } catch (error: any) {
      console.error('Error in getCoordinationRuns:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get a specific coordination run
   */
  async getCoordinationRun(runId: string): Promise<ApiResponse<CoordinationRun>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('farm_coordination_runs')
        .select('*')
        .eq('id', runId)
        .single();
      
      if (error) {
        console.error('Error fetching coordination run:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error in getCoordinationRun:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Complete or stop a coordination run
   */
  async completeCoordinationRun(runId: string, status: 'completed' | 'failed' | 'stopped', results?: Record<string, any>, error?: string): Promise<ApiResponse<CoordinationRun>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Get the run to retrieve coordination_id
      const { data: run, error: runError } = await supabase
        .from('farm_coordination_runs')
        .select('coordination_id, farm_id')
        .eq('id', runId)
        .single();
      
      if (runError) {
        console.error('Error fetching run for completion:', runError);
        return { 
          success: false, 
          error: runError.message 
        };
      }
      
      // Update the run
      const { data, error: updateError } = await supabase
        .from('farm_coordination_runs')
        .update({
          status,
          ended_at: new Date().toISOString(),
          results: results || {},
          error: error
        })
        .eq('id', runId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error completing coordination run:', updateError);
        return { 
          success: false, 
          error: updateError.message 
        };
      }
      
      // If run is completed or stopped, update coordination plan status
      if (status === 'completed' || status === 'stopped') {
        await supabase
          .from('farm_coordination')
          .update({ 
            status: status === 'completed' ? 'completed' : 'inactive' 
          })
          .eq('id', run.coordination_id);
      } else if (status === 'failed') {
        await supabase
          .from('farm_coordination')
          .update({ status: 'failed' })
          .eq('id', run.coordination_id);
      }
      
      // Update agent assignments status
      await supabase
        .from('coordination_agent_assignments')
        .update({ 
          status: status === 'completed' ? 'completed' : (status === 'failed' ? 'failed' : 'inactive')
        })
        .eq('coordination_id', run.coordination_id);
      
      // Emit event for other components to react
      TradingEventEmitter.emit(TRADING_EVENTS.COORDINATION_COMPLETED, {
        coordinationId: run.coordination_id,
        runId,
        farmId: run.farm_id,
        status,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error in completeCoordinationRun:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Send a coordination message between agents
   */
  async sendCoordinationMessage(message: Omit<CoordinationMessage, 'id' | 'created_at'>): Promise<ApiResponse<CoordinationMessage>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('coordination_messages')
        .insert(message)
        .select()
        .single();
      
      if (error) {
        console.error('Error sending coordination message:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      // Emit event for other components to react
      TradingEventEmitter.emit(TRADING_EVENTS.COORDINATION_MESSAGE_SENT, {
        messageId: data.id,
        runId: data.coordination_run_id,
        fromAgentId: data.from_agent_id,
        toAgentId: data.to_agent_id,
        messageType: data.message_type,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error in sendCoordinationMessage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get messages for a coordination run
   */
  async getCoordinationMessages(runId: string): Promise<ApiResponse<CoordinationMessage[]>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('coordination_messages')
        .select('*')
        .eq('coordination_run_id', runId)
        .order('timestamp', { ascending: true });
      
      if (error) {
        console.error('Error fetching coordination messages:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
      
      return {
        success: true,
        data: data || []
      };
    } catch (error: any) {
      console.error('Error in getCoordinationMessages:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
