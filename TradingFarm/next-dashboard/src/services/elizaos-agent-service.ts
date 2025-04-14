import { apiClient } from './api-client';
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import databaseService from './database-service';
import { Database } from '@/types/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

// ElizaOS Agent types
export interface ElizaAgent {
  id: string;
  name: string;
  farmId: string;
  user_id: string;
  status: 'initializing' | 'active' | 'idle' | 'paused' | 'error';
  created_at: string;
  updated_at: string;
  config: {
    agentType: string;
    markets: string[];
    risk_level: 'low' | 'medium' | 'high';
    api_access: boolean;
    trading_permissions: string;
    auto_recovery: boolean;
    max_concurrent_tasks?: number;
    allowed_markets?: string[];
    llm_model?: string;
  };
  performance_metrics?: {
    commands_processed: number;
    success_rate: number;
    average_response_time_ms: number;
    uptime_percentage?: number;
  };
}

// Type for agent command
export interface ElizaAgentCommand {
  id: string;
  agent_id: string;
  farm_id: string;
  command_text: string;
  response_text?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  execution_time_ms?: number;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface ElizaAgentCreationRequest {
  name: string;
  farmId: string;
  config: {
    agentType: string;
    markets: string[];
    risk_level: 'low' | 'medium' | 'high';
    api_access?: boolean;
    trading_permissions?: string;
    auto_recovery?: boolean;
    max_concurrent_tasks?: number;
    llm_model?: string;
  };
}

// Type for database row
type ElizaOSAgentRow = Database['public']['Tables']['elizaos_agents']['Row'];
type ElizaOSCommandRow = Database['public']['Tables']['elizaos_commands']['Row'];
type ElizaOSAgentMetricsHistoryRow = Database['public']['Tables']['elizaos_agent_metrics_history']['Row'];
type ElizaOSAgentGoalsRow = Database['public']['Tables']['elizaos_agent_goals']['Row'];

class ElizaOSAgentService {
  private baseEndpoint = '/api/elizaos/agents';
  
  // Helper to determine if we should use Supabase direct access
  private useSupabaseDirect = (): boolean => {
    return process.env.NEXT_PUBLIC_USE_SUPABASE_DIRECT === 'true' || 
           typeof window !== 'undefined' && window.location.search.includes('direct=true');
  };

  // Helper to map database rows to service format
  private mapToElizaAgent = (data: ElizaOSAgentRow): ElizaAgent => {
    return {
      id: data.id,
      name: data.name,
      farmId: data.farm_id,
      user_id: data.user_id,
      status: data.status as ElizaAgent['status'],
      created_at: data.created_at,
      updated_at: data.updated_at,
      config: data.config || {},
      performance_metrics: data.performance_metrics || {
        commands_processed: 0,
        success_rate: 0,
        average_response_time_ms: 0
      }
    };
  };

  // Get all agents
  async getAgents(): Promise<ElizaAgent[]> {
    // Use direct Supabase access if configured
    if (this.useSupabaseDirect()) {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('elizaos_agents')
          .select('*');
          
        if (error) {
          throw new Error(error.message);
        }
        
        return (data as ElizaOSAgentRow[]).map(this.mapToElizaAgent);
      } catch (error) {
        console.error('Supabase error fetching ElizaOS agents:', error);
        throw error;
      }
    }
    
    // Fall back to API client
    const response = await apiClient.get(this.baseEndpoint);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch agents');
    }
    return response.data as ElizaAgent[];
  }

  // Get agents for a specific farm
  async getAgentsByFarm(farmId: string): Promise<ElizaAgent[]> {
    // Use direct Supabase access if configured
    if (this.useSupabaseDirect()) {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('elizaos_agents')
          .select('*')
          .eq('farm_id', farmId);
          
        if (error) {
          throw new Error(error.message);
        }
        
        return (data as ElizaOSAgentRow[]).map(this.mapToElizaAgent);
      } catch (error) {
        console.error('Supabase error fetching ElizaOS agents by farm:', error);
        throw error;
      }
    }
    
    // Fall back to API client
    const response = await apiClient.get(`${this.baseEndpoint}/farm/${farmId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch farm agents');
    }
    return response.data as ElizaAgent[];
  }

  // Get a single agent by ID
  async getAgentById(id: string): Promise<ElizaAgent> {
    // Use direct Supabase access if configured
    if (this.useSupabaseDirect()) {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('elizaos_agents')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) {
          throw new Error(error.message);
        }
        
        return this.mapToElizaAgent(data as ElizaOSAgentRow);
      } catch (error) {
        console.error('Supabase error fetching ElizaOS agent:', error);
        throw error;
      }
    }
    
    // Fall back to API client
    const response = await apiClient.get(`${this.baseEndpoint}/${id}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch agent');
    }
    return response.data as ElizaAgent;
  }

  // Create a new agent
  async createAgent(agentData: ElizaAgentCreationRequest): Promise<ElizaAgent> {
    // Use direct Supabase access if configured
    if (this.useSupabaseDirect()) {
      try {
        // Get current user ID
        const supabaseAuth = createBrowserClient();
        const { data: { user } } = await supabaseAuth.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // Prepare the agent data for insertion
        const agentDbData = {
          name: agentData.name,
          farm_id: agentData.farmId,
          user_id: user.id,
          status: 'initializing' as const,
          config: agentData.config,
          performance_metrics: {
            commands_processed: 0,
            success_rate: 0,
            average_response_time_ms: 0
          }
        };
        
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('elizaos_agents')
          .insert(agentDbData)
          .select()
          .single();
          
        if (error) {
          throw new Error(error.message);
        }
        
        return this.mapToElizaAgent(data as ElizaOSAgentRow);
      } catch (error) {
        console.error('Supabase error creating ElizaOS agent:', error);
        throw error;
      }
    }
    
    // Fall back to API client
    const response = await apiClient.post(this.baseEndpoint, agentData);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create agent');
    }
    return response.data as ElizaAgent;
  }

  // Update an agent
  async updateAgent(id: string, agentData: Partial<ElizaAgentCreationRequest>): Promise<ElizaAgent> {
    // Use direct Supabase access if configured
    if (this.useSupabaseDirect()) {
      try {
        // Prepare the update data
        const updateData: Partial<ElizaOSAgentRow> = {};
        if (agentData.name) updateData.name = agentData.name;
        if (agentData.config) updateData.config = agentData.config;
        
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('elizaos_agents')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
          
        if (error) {
          throw new Error(error.message);
        }
        
        return this.mapToElizaAgent(data as ElizaOSAgentRow);
      } catch (error) {
        console.error('Supabase error updating ElizaOS agent:', error);
        throw error;
      }
    }
    
    // Fall back to API client
    const response = await apiClient.patch(`${this.baseEndpoint}/${id}`, agentData);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update agent');
    }
    return response.data as ElizaAgent;
  }

  // Delete an agent
  async deleteAgent(id: string): Promise<void> {
    // Use direct Supabase access if configured
    if (this.useSupabaseDirect()) {
      try {
        const supabase = createBrowserClient();
        const { error } = await supabase
          .from('elizaos_agents')
          .delete()
          .eq('id', id);
          
        if (error) {
          throw new Error(error.message);
        }
      } catch (error) {
        console.error('Supabase error deleting ElizaOS agent:', error);
        throw error;
      }
    } else {
      // Fall back to API client
      const response = await apiClient.delete(`${this.baseEndpoint}/${id}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete agent');
      }
    }
  }

  // Control agent (start, stop, pause, resume)
  async controlAgent(id: string, action: 'start' | 'stop' | 'pause' | 'resume'): Promise<ElizaAgent> {
    // Use direct Supabase access if configured
    if (this.useSupabaseDirect()) {
      try {
        // Map action to status
        let newStatus: ElizaAgent['status'];
        switch (action) {
          case 'start':
            newStatus = 'active';
            break;
          case 'stop':
            newStatus = 'idle';
            break;
          case 'pause':
            newStatus = 'paused';
            break;
          case 'resume':
            newStatus = 'active';
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }
        
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('elizaos_agents')
          .update({ status: newStatus })
          .eq('id', id)
          .select()
          .single();
          
        if (error) {
          throw new Error(error.message);
        }
        
        return this.mapToElizaAgent(data as ElizaOSAgentRow);
      } catch (error) {
        console.error(`Supabase error ${action} ElizaOS agent:`, error);
        throw error;
      }
    }
    
    // Fall back to API client
    const response = await apiClient.post(`${this.baseEndpoint}/${id}/control`, { action });
    if (!response.success) {
      throw new Error(response.error || `Failed to ${action} agent`);
    }
    return response.data as ElizaAgent;
  }

  // Get agent performance metrics
  async getAgentMetrics(id: string): Promise<ElizaAgent['performance_metrics']> {
    // Use direct Supabase access if configured
    if (this.useSupabaseDirect()) {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('elizaos_agents')
          .select('performance_metrics')
          .eq('id', id)
          .single();
          
        if (error) {
          throw new Error(error.message);
        }
        
        const metrics = data.performance_metrics || {
          commands_processed: 0,
          success_rate: 0,
          average_response_time_ms: 0
        };
        
        return metrics as ElizaAgent['performance_metrics'];
      } catch (error) {
        console.error('Supabase error fetching ElizaOS agent metrics:', error);
        throw error;
      }
    }
    
    // Fall back to API client
    const response = await apiClient.get(`${this.baseEndpoint}/${id}/metrics`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch agent metrics');
    }
    return response.data as ElizaAgent['performance_metrics'];
  }
  
  // Get agent metrics history for a specific timeframe
  async getAgentMetricsHistory(id: string, timeframe: 'day' | 'week' | 'month' = 'day'): Promise<any[]> {
    // Use direct Supabase access if configured
    if (this.useSupabaseDirect()) {
      try {
        const supabase = createBrowserClient();
        
        // Calculate the date range based on timeframe
        const endDate = new Date();
        const startDate = new Date();
        
        switch (timeframe) {
          case 'day':
            startDate.setDate(startDate.getDate() - 1);
            break;
          case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        }
        
        const { data, error } = await supabase
          .from('elizaos_agent_metrics_history')
          .select('*')
          .eq('agent_id', id)
          .gte('timestamp', startDate.toISOString())
          .lte('timestamp', endDate.toISOString())
          .order('timestamp', { ascending: true });
          
        if (error) {
          throw new Error(error.message);
        }
        
        return (data || []) as ElizaOSAgentMetricsHistoryRow[];
      } catch (error) {
        console.error('Supabase error fetching ElizaOS agent metrics history:', error);
        throw error;
      }
    }
    
    // Fall back to API client
    const response = await apiClient.get(`${this.baseEndpoint}/${id}/metrics/history?timeframe=${timeframe}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch agent metrics history');
    }
    return response.data as any[];
  }

  // Add new command for an agent
  async addAgentCommand(agentId: string, commandText: string): Promise<ElizaAgentCommand> {
    if (this.useSupabaseDirect()) {
      try {
        // Get agent info first to get farm_id
        const agent = await this.getAgentById(agentId);
        
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('elizaos_commands')
          .insert({
            agent_id: agentId,
            farm_id: agent.farmId,
            command_text: commandText,
            status: 'pending',
            metadata: {}
          })
          .select()
          .single();
          
        if (error) {
          throw new Error(error.message);
        }
        
        return data as ElizaAgentCommand;
      } catch (error) {
        console.error('Supabase error adding agent command:', error);
        throw error;
      }
    }
    
    // Fall back to API client
    const response = await apiClient.post(`${this.baseEndpoint}/${agentId}/commands`, { command: commandText });
    if (!response.success) {
      throw new Error(response.error || 'Failed to add agent command');
    }
    return response.data as ElizaAgentCommand;
  }
  
  // Get commands for an agent
  async getAgentCommands(agentId: string, limit: number = 20): Promise<ElizaAgentCommand[]> {
    if (this.useSupabaseDirect()) {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('elizaos_commands')
          .select('*')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false })
          .limit(limit);
          
        if (error) {
          throw new Error(error.message);
        }
        
        return data as ElizaAgentCommand[];
      } catch (error) {
        console.error('Supabase error fetching agent commands:', error);
        throw error;
      }
    }
    
    // Fall back to API client
    const response = await apiClient.get(`${this.baseEndpoint}/${agentId}/commands?limit=${limit}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch agent commands');
    }
    return response.data as ElizaAgentCommand[];
  }
  
  // Update command response
  async updateCommandResponse(commandId: string, responseText: string, status: 'completed' | 'failed', executionTime?: number): Promise<ElizaAgentCommand> {
    if (this.useSupabaseDirect()) {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('elizaos_commands')
          .update({
            response_text: responseText,
            status: status,
            execution_time_ms: executionTime,
            updated_at: new Date().toISOString()
          })
          .eq('id', commandId)
          .select()
          .single();
          
        if (error) {
          throw new Error(error.message);
        }
        
        return data as ElizaAgentCommand;
      } catch (error) {
        console.error('Supabase error updating command response:', error);
        throw error;
      }
    }
    
    // Fall back to API client
    const response = await apiClient.patch(`${this.baseEndpoint}/commands/${commandId}`, {
      response: responseText,
      status: status,
      execution_time: executionTime
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to update command response');
    }
    return response.data as ElizaAgentCommand;
  }
  
  // Add or update agent goal
  async updateAgentGoal(agentId: string, goalId: string, status: string, progress: number): Promise<any> {
    if (this.useSupabaseDirect()) {
      try {
        const supabase = createBrowserClient();
        
        // Check if the goal association already exists
        const { data: existingGoal } = await supabase
          .from('elizaos_agent_goals')
          .select('id')
          .eq('agent_id', agentId)
          .eq('goal_id', goalId)
          .single();
        
        if (existingGoal) {
          // Update existing goal
          const { data, error } = await supabase
            .from('elizaos_agent_goals')
            .update({
              status: status,
              progress: progress,
              updated_at: new Date().toISOString()
            })
            .eq('agent_id', agentId)
            .eq('goal_id', goalId)
            .select()
            .single();
            
          if (error) {
            throw new Error(error.message);
          }
          
          return data;
        } else {
          // Create new goal association
          const { data, error } = await supabase
            .from('elizaos_agent_goals')
            .insert({
              agent_id: agentId,
              goal_id: goalId,
              status: status,
              progress: progress,
              priority: 1 // Default priority
            })
            .select()
            .single();
            
          if (error) {
            throw new Error(error.message);
          }
          
          return data;
        }
      } catch (error) {
        console.error('Supabase error updating agent goal:', error);
        throw error;
      }
    }
    
    // Fall back to API client
    const response = await apiClient.post(`${this.baseEndpoint}/${agentId}/goals/${goalId}`, {
      status: status,
      progress: progress
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to update agent goal');
    }
    return response.data;
  }
  
  // Get agent goals
  async getAgentGoals(agentId: string): Promise<any[]> {
    if (this.useSupabaseDirect()) {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('elizaos_agent_goals')
          .select(`
            id,
            agent_id,
            goal_id,
            status,
            progress,
            priority,
            created_at,
            updated_at,
            goals:goal_id (*)
          `)
          .eq('agent_id', agentId);
          
        if (error) {
          throw new Error(error.message);
        }
        
        return data as any[];
      } catch (error) {
        console.error('Supabase error fetching agent goals:', error);
        throw error;
      }
    }
    
    // Fall back to API client
    const response = await apiClient.get(`${this.baseEndpoint}/${agentId}/goals`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch agent goals');
    }
    return response.data as any[];
  }

  // Record agent metric history
  async recordAgentMetricHistory(agentId: string, metrics: any): Promise<void> {
    if (this.useSupabaseDirect()) {
      try {
        const supabase = createBrowserClient();
        const { error } = await supabase
          .from('elizaos_agent_metrics_history')
          .insert({
            agent_id: agentId,
            metrics: metrics,
            timestamp: new Date().toISOString()
          });
          
        if (error) {
          throw new Error(error.message);
        }
      } catch (error) {
        console.error('Supabase error recording agent metric history:', error);
        throw error;
      }
    } else {
      // Fall back to API client
      const response = await apiClient.post(`${this.baseEndpoint}/${agentId}/metrics/history`, { metrics });
      if (!response.success) {
        throw new Error(response.error || 'Failed to record agent metric history');
      }
    }
  }
}

export const elizaOSAgentService = new ElizaOSAgentService();