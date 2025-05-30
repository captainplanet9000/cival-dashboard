import { supabase } from '@/integrations/supabase/client';

export interface Agent {
  id: string;
  agent_id: string;
  name: string;
  specialization: string;
  status: string;
  capabilities: string[];
  performance_metrics: {
    success_rate: number;
    tasks_completed: number;
    avg_completion_time: number;
  };
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export interface Task {
  id: string;
  task_id: string;
  agent_id: string;
  task_type: string;
  parameters: any;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
  due_at: string | null;
  completed_at: string | null;
  metadata: any;
}

export interface Workflow {
  id: string;
  workflow_id: string;
  name: string;
  description: string;
  workflow_type: string;
  tasks: any[];
  dependencies: any;
  status: string;
  created_at: string;
  updated_at: string;
  metadata: any;
}

// Coordinator Service to interact with the MCP Agent Coordinator
export const CoordinatorService = {
  // Agent methods
  async getAgents(filters = {}) {
    try {
      const { data, error } = await supabase
        .from('agent_registry')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error in getAgents:', error);
      throw error;
    }
  },

  async getAgentById(agentId: string) {
    try {
      const { data, error } = await supabase
        .from('agent_registry')
        .select('*')
        .eq('agent_id', agentId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error in getAgentById for ${agentId}:`, error);
      throw error;
    }
  },

  async registerAgent(agentData: Partial<Agent>) {
    try {
      const { data, error } = await supabase
        .from('agent_registry')
        .insert([agentData])
        .select();
      
      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Error in registerAgent:', error);
      throw error;
    }
  },

  async updateAgentStatus(agentId: string, status: string) {
    try {
      const { data, error } = await supabase
        .from('agent_registry')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('agent_id', agentId)
        .select();
      
      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error(`Error in updateAgentStatus for ${agentId}:`, error);
      throw error;
    }
  },

  // Task methods
  async getTasks(filters = {}) {
    try {
      const { data, error } = await supabase
        .from('agent_task_assignments')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error in getTasks:', error);
      throw error;
    }
  },

  async createTask(taskData: Partial<Task>) {
    try {
      const { data, error } = await supabase
        .from('agent_task_assignments')
        .insert([taskData])
        .select();
      
      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Error in createTask:', error);
      throw error;
    }
  },

  async updateTaskStatus(taskId: string, updateData: Partial<Task>) {
    try {
      const { data, error } = await supabase
        .from('agent_task_assignments')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('task_id', taskId)
        .select();
      
      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error(`Error in updateTaskStatus for ${taskId}:`, error);
      throw error;
    }
  },

  // Workflow methods
  async createWorkflow(workflowData: Partial<Workflow>) {
    try {
      const { data, error } = await supabase
        .from('agent_workflows')
        .insert([workflowData])
        .select();
      
      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Error in createWorkflow:', error);
      throw error;
    }
  },

  // Decision coordination
  async coordinateDecision(decisionType: string, data: any, mode = 'democratic') {
    try {
      // This is a more complex operation that would likely involve:
      // 1. Creating a new decision record
      // 2. Sending messages to relevant agents
      // 3. Collecting responses
      // 4. Applying the decision mode (e.g., democratic voting)
      
      // For now, we'll simulate this with a simplified implementation
      console.log(`Coordinating decision of type ${decisionType} using ${mode} mode`);
      
      // In a real implementation, this would be an API call to the coordination endpoint
      return {
        decision_id: `decision_${Date.now()}`,
        decision_type: decisionType,
        mode: mode,
        status: 'pending',
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error in coordinateDecision for ${decisionType}:`, error);
      throw error;
    }
  }
}; 