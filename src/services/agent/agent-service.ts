import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export interface Agent {
  id: string;
  farm_id: string;
  name: string;
  status: 'active' | 'inactive';
  config: Record<string, any>;
  plugins: Array<{
    id: string;
    name: string;
    config: Record<string, any>;
  }>;
  clients: Array<{
    id: string;
    name: string;
    config: Record<string, any>;
  }>;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentParams {
  farmId: string;
  name: string;
  config?: Record<string, any>;
  plugins?: Array<{
    name: string;
    config: Record<string, any>;
  }>;
  clients?: Array<{
    name: string;
    config: Record<string, any>;
  }>;
}

export class AgentService {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  async getAgent(agentId: string): Promise<{ success: boolean; data?: Agent; error?: string }> {
    try {
      const { data: agent, error } = await this.supabase
        .from('farm_agents')
        .select(`
          *,
          plugins:agent_plugins(*),
          clients:agent_clients(*)
        `)
        .eq('id', agentId)
        .single();

      if (error) throw error;
      if (!agent) return { success: false, error: 'Agent not found' };

      return { success: true, data: agent as Agent };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch agent'
      };
    }
  }

  async createAgent(params: CreateAgentParams): Promise<{ success: boolean; data?: Agent; error?: string }> {
    try {
      const { data: agent, error } = await this.supabase
        .from('farm_agents')
        .insert({
          farm_id: params.farmId,
          name: params.name,
          config: params.config || {},
          status: 'inactive'
        })
        .select()
        .single();

      if (error) throw error;
      if (!agent) return { success: false, error: 'Failed to create agent' };

      // Create plugins if provided
      if (params.plugins?.length) {
        const { error: pluginError } = await this.supabase
          .from('agent_plugins')
          .insert(
            params.plugins.map(plugin => ({
              agent_id: agent.id,
              name: plugin.name,
              config: plugin.config
            }))
          );
        if (pluginError) throw pluginError;
      }

      // Create clients if provided
      if (params.clients?.length) {
        const { error: clientError } = await this.supabase
          .from('agent_clients')
          .insert(
            params.clients.map(client => ({
              agent_id: agent.id,
              name: client.name,
              config: client.config
            }))
          );
        if (clientError) throw clientError;
      }

      // Fetch the complete agent data with plugins and clients
      return await this.getAgent(agent.id);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create agent'
      };
    }
  }

  async activateAgent(agentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('farm_agents')
        .update({ status: 'active' })
        .eq('id', agentId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to activate agent'
      };
    }
  }

  async deactivateAgent(agentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('farm_agents')
        .update({ status: 'inactive' })
        .eq('id', agentId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to deactivate agent'
      };
    }
  }

  async updateAgent(agentId: string, updates: Partial<Agent>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('farm_agents')
        .update(updates)
        .eq('id', agentId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update agent'
      };
    }
  }

  async deleteAgent(agentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('farm_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete agent'
      };
    }
  }
} 