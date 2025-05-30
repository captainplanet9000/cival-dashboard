import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { v4 as uuidv4 } from 'uuid';

export interface CreateAgentParams {
  name: string;
  description: string;
  farmId: string;
  ownerId: string;
  characterConfig?: any;
  modelConfig?: {
    provider: 'openai' | 'anthropic' | 'llama' | 'grok' | 'gemini';
    model_name: string;
    api_key?: string;
  };
  clientConfig?: {
    enabled_clients: string[];
    client_settings: Record<string, any>;
  };
  pluginConfig?: {
    enabled_plugins: string[];
    plugin_settings: Record<string, any>;
  };
  memoryConfig?: {
    memory_type: 'supabase' | 'local';
    settings: Record<string, any>;
  };
}

export class FarmAgentManager {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  async createAgent(params: CreateAgentParams) {
    const {
      name,
      description,
      farmId,
      ownerId,
      characterConfig = {},
      modelConfig = {
        provider: 'openai',
        model_name: 'gpt-4'
      },
      clientConfig = {
        enabled_clients: [],
        client_settings: {}
      },
      pluginConfig = {
        enabled_plugins: [],
        plugin_settings: {}
      },
      memoryConfig = {
        memory_type: 'supabase',
        settings: {}
      }
    } = params;

    try {
      // Create the agent record
      const { data: agent, error: agentError } = await this.supabase
        .from('farm_agents')
        .insert([{
          name,
          description,
          farm_id: farmId,
          owner_id: ownerId,
          character_config: characterConfig,
          model_config: modelConfig,
          client_config: clientConfig,
          plugin_config: pluginConfig,
          memory_config: memoryConfig,
          status: 'inactive'
        }])
        .select()
        .single();

      if (agentError) throw agentError;

      // Set up enabled plugins
      if (pluginConfig.enabled_plugins.length > 0) {
        const pluginInserts = pluginConfig.enabled_plugins.map(plugin => ({
          agent_id: agent.id,
          plugin_name: plugin,
          plugin_version: '1.0.0', // You might want to make this configurable
          plugin_config: pluginConfig.plugin_settings[plugin] || {},
          enabled: true
        }));

        const { error: pluginError } = await this.supabase
          .from('agent_plugins')
          .insert(pluginInserts);

        if (pluginError) throw pluginError;
      }

      // Set up enabled clients
      if (clientConfig.enabled_clients.length > 0) {
        const clientInserts = clientConfig.enabled_clients.map(client => ({
          agent_id: agent.id,
          client_type: client,
          client_config: clientConfig.client_settings[client] || {},
          enabled: true
        }));

        const { error: clientError } = await this.supabase
          .from('agent_clients')
          .insert(clientInserts);

        if (clientError) throw clientError;
      }

      return {
        success: true,
        data: agent
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create agent'
      };
    }
  }

  async activateAgent(agentId: string) {
    try {
      // Update agent status
      const { error: statusError } = await this.supabase
        .from('farm_agents')
        .update({ status: 'active' })
        .eq('id', agentId);

      if (statusError) throw statusError;

      // Initialize agent memory
      const { error: memoryError } = await this.supabase
        .from('agent_memory')
        .insert([{
          agent_id: agentId,
          memory_type: 'state',
          content: {
            initialized: true,
            last_activation: new Date().toISOString()
          },
          metadata: {}
        }]);

      if (memoryError) throw memoryError;

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to activate agent'
      };
    }
  }

  async deactivateAgent(agentId: string) {
    try {
      const { error } = await this.supabase
        .from('farm_agents')
        .update({ status: 'inactive' })
        .eq('id', agentId);

      if (error) throw error;

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deactivate agent'
      };
    }
  }

  async getAgent(agentId: string) {
    try {
      const { data: agent, error: agentError } = await this.supabase
        .from('farm_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (agentError) throw agentError;

      // Get plugins
      const { data: plugins, error: pluginError } = await this.supabase
        .from('agent_plugins')
        .select('*')
        .eq('agent_id', agentId);

      if (pluginError) throw pluginError;

      // Get clients
      const { data: clients, error: clientError } = await this.supabase
        .from('agent_clients')
        .select('*')
        .eq('agent_id', agentId);

      if (clientError) throw clientError;

      return {
        success: true,
        data: {
          ...agent,
          plugins,
          clients
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agent'
      };
    }
  }

  async updateAgentConfig(agentId: string, updates: Partial<Database['public']['Tables']['farm_agents']['Update']>) {
    try {
      const { error } = await this.supabase
        .from('farm_agents')
        .update(updates)
        .eq('id', agentId);

      if (error) throw error;

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update agent configuration'
      };
    }
  }

  async deleteAgent(agentId: string) {
    try {
      // Delete related records first
      await Promise.all([
        this.supabase.from('agent_plugins').delete().eq('agent_id', agentId),
        this.supabase.from('agent_clients').delete().eq('agent_id', agentId),
        this.supabase.from('agent_memory').delete().eq('agent_id', agentId),
        this.supabase.from('agent_documents').delete().eq('agent_id', agentId)
      ]);

      // Delete the agent record
      const { error } = await this.supabase
        .from('farm_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete agent'
      };
    }
  }
} 