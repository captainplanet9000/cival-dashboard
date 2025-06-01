import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database.types';
import { toast } from '@/components/ui/use-toast';

export type AgentStatus = 'idle' | 'running' | 'paused' | 'error' | 'stopped';
export type AgentAction = 'start' | 'stop' | 'pause' | 'resume' | 'restart';

export type AgentPerformanceMetrics = {
  commands_processed: number;
  success_rate: number;
  average_response_time_ms: number;
  uptime_percentage: number;
  last_active_at?: string;
  errors_count?: number;
  warnings_count?: number;
};

export type AgentLogLevel = 'info' | 'warning' | 'error' | 'debug';

export type AgentLogEntry = {
  id: string;
  agent_id: string;
  timestamp: string;
  level: AgentLogLevel;
  message: string;
  details?: any;
  source?: string;
};

/**
 * Service for managing ElizaOS agent lifecycle including start/stop/pause operations,
 * status monitoring, and performance metrics tracking.
 */
export class AgentLifecycleService {
  private supabase = createClientComponentClient<Database>();

  /**
   * Change the state of an agent
   */
  async controlAgent(
    agentId: string, 
    action: AgentAction
  ): Promise<{ success: boolean; status: AgentStatus }> {
    try {
      // First update the agent status in the database
      const newStatus = this.getStatusFromAction(action);
      
      const { data, error } = await this.supabase
        .from('elizaos_agents')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', agentId)
        .select('status')
        .single();
        
      if (error) throw error;

      // Then call the agent control API to actually perform the action
      // This would typically reach out to your ElizaOS backend service
      const response = await fetch(`/api/elizaos/agents/${agentId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} agent: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        status: data.status as AgentStatus,
      };
    } catch (error) {
      console.error(`Failed to ${action} agent ${agentId}:`, error);
      toast({
        title: `Failed to ${action} agent`,
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      return {
        success: false,
        status: 'error',
      };
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentMetrics(agentId: string): Promise<AgentPerformanceMetrics | null> {
    try {
      const { data, error } = await this.supabase
        .from('elizaos_agents')
        .select('performance_metrics')
        .eq('id', agentId)
        .single();
        
      if (error) throw error;
      
      return data.performance_metrics as AgentPerformanceMetrics;
    } catch (error) {
      console.error('Failed to fetch agent metrics:', error);
      return null;
    }
  }

  /**
   * Get agent logs, with optional filtering
   */
  async getAgentLogs(
    agentId: string, 
    options: { 
      limit?: number; 
      offset?: number; 
      level?: AgentLogLevel;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ logs: AgentLogEntry[]; total: number }> {
    try {
      const { limit = 50, offset = 0, level, startDate, endDate } = options;
      
      let query = this.supabase
        .from('agent_logs')
        .select('*', { count: 'exact' })
        .eq('agent_id', agentId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (level) {
        query = query.eq('level', level);
      }
      
      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }
      
      if (endDate) {
        query = query.lte('timestamp', endDate.toISOString());
      }
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return {
        logs: (data || []) as AgentLogEntry[],
        total: count || 0,
      };
    } catch (error) {
      console.error('Failed to fetch agent logs:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Add a log entry for an agent
   */
  async logAgentActivity(
    agentId: string, 
    level: AgentLogLevel, 
    message: string, 
    details?: any
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('agent_logs')
        .insert({
          agent_id: agentId,
          timestamp: new Date().toISOString(),
          level,
          message,
          details,
          source: 'dashboard',
        });
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Failed to log agent activity:', error);
      return false;
    }
  }

  /**
   * Map action to the resulting status
   */
  private getStatusFromAction(action: AgentAction): AgentStatus {
    switch (action) {
      case 'start':
      case 'resume':
        return 'running';
      case 'stop':
        return 'stopped';
      case 'pause':
        return 'paused';
      case 'restart':
        return 'running';
      default:
        return 'idle';
    }
  }
}

// Export singleton instance
export const agentLifecycleService = new AgentLifecycleService();
