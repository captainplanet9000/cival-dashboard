import { createServerClient } from "@/utils/supabase/server";

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'paused';
  farm_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  config?: Record<string, any>;
}

export interface AgentEvent {
  id: number;
  agent_id: string;
  event_type: string;
  event_payload: any;
  created_at: string;
  user_id: string;
}

export interface AgentHealth {
  id: number;
  agent_id: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  created_at: string;
  user_id: string;
}

export class AgentService {
  async getAgents(userId: string): Promise<Agent[]> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching agents:', error);
      return [];
    }
    
    return data as Agent[];
  }

  async getAgentById(agentId: string): Promise<Agent | null> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
    
    if (error) {
      console.error(`Error fetching agent ${agentId}:`, error);
      return null;
    }
    
    return data as Agent;
  }

  async createAgent(agent: Omit<Agent, 'id' | 'created_at' | 'updated_at'>): Promise<Agent | null> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('agents')
      .insert(agent)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating agent:', error);
      return null;
    }
    
    return data as Agent;
  }

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | null> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating agent ${id}:`, error);
      return null;
    }
    
    return data as Agent;
  }

  async deleteAgent(id: string): Promise<boolean> {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting agent ${id}:`, error);
      return false;
    }
    
    return true;
  }

  async getAgentEvents(agentId: string, limit: number = 10): Promise<AgentEvent[]> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('agent_events')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error(`Error fetching events for agent ${agentId}:`, error);
      return [];
    }
    
    return data as AgentEvent[];
  }

  async getAgentHealth(agentId: string): Promise<AgentHealth | null> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('agent_health')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      console.error(`Error fetching health for agent ${agentId}:`, error);
      return null;
    }
    
    if (!data) return null;
    
    // Map the database schema to our interface
    return {
      id: data.id,
      agent_id: data.agent_id || '',
      status: data.status as 'healthy' | 'warning' | 'error',
      message: data.details ? JSON.stringify(data.details) : 'No details available',
      created_at: data.created_at,
      user_id: data.user_id
    };
  }
}

// Export a singleton instance
export const agentService = new AgentService();
