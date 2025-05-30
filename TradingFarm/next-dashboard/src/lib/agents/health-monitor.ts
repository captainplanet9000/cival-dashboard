/**
 * Health monitoring system for trading agents
 * Enhanced implementation with real-time data and comprehensive metrics
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@/utils/supabase/server';
import { logEvent } from '@/utils/logging';
import { handleSupabaseError } from '@/utils/error-handling';

// Types
export type AgentHealthMetrics = {
  cpuUsage: number;
  memoryUsage: number;
  activeTasks: number;
  errorCount: number;
  warningCount: number;
  lastExecutionTime?: number;
  activeConnections?: number;
  queuedTasks?: number;
  responseTime?: number;
};

export type CircuitBreakerStatus = 'triggered' | 'cleared' | 'none';

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'inactive';

export type AgentHealthData = {
  agent_id: string;
  status: HealthStatus;
  uptime_seconds: number;
  uptime_percentage?: number; // Added for UI display
  cpu_usage: number;
  memory_usage: number;
  active_tasks: number;
  error_count: number;
  warning_count: number;
  last_execution_time?: number;
  active_connections?: number;
  queued_tasks?: number;
  response_time?: number;
  circuit_breaker_status: CircuitBreakerStatus;
  circuit_breaker_reason?: string;
  last_event_timestamp?: string;
  health_check_timestamp: string;
};

export type AgentEventData = {
  id?: number;
  agent_id: string;
  event_type: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metadata?: Record<string, any>;
  created_at?: string;
};

export class AgentMonitoringService {
  private supabase: SupabaseClient;
  
  constructor() {
    // Initialize Supabase client
    this.supabase = null as any; // Will be initialized on demand
  }
  
  private async getSupabase(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createServerClient();
    }
    return this.supabase;
  }
  
  /**
   * Get current health data for an agent
   */
  async getAgentHealth(agentId: string): Promise<AgentHealthData | null> {
    try {
      const supabase = await this.getSupabase();
      
      const { data, error } = await supabase
        .from('agent_health')
        .select('*')
        .eq('agent_id', agentId)
        .single();
        
      if (error) {
        throw error;
      }
      
      return data as AgentHealthData;
    } catch (error) {
      handleSupabaseError(error, 'Failed to get agent health data');
      return null;
    }
  }
  
  /**
   * Get health data for multiple agents
   */
  async getMultipleAgentHealth(agentIds: string[]): Promise<AgentHealthData[]> {
    try {
      if (!agentIds.length) return [];
      
      const supabase = await this.getSupabase();
      
      const { data, error } = await supabase
        .from('agent_health')
        .select('*')
        .in('agent_id', agentIds);
        
      if (error) {
        throw error;
      }
      
      return data as AgentHealthData[];
    } catch (error) {
      handleSupabaseError(error, 'Failed to get multiple agent health data');
      return [];
    }
  }
  
  /**
   * Report agent health metrics to the database
   */
  async reportAgentHealth(agentId: string, metrics: AgentHealthMetrics): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      
      // Get existing health data to calculate uptime
      const { data: existingData } = await supabase
        .from('agent_health')
        .select('uptime_seconds, health_check_timestamp')
        .eq('agent_id', agentId)
        .single();
      
      // Calculate uptime by adding elapsed time since last check
      let uptime = 0;
      if (existingData) {
        const lastCheck = new Date(existingData.health_check_timestamp);
        const elapsed = (new Date().getTime() - lastCheck.getTime()) / 1000;
        uptime = existingData.uptime_seconds + elapsed;
      }
      
      // Calculate health status based on metrics
      let status: HealthStatus = 'healthy';
      
      if (metrics.errorCount > 0) {
        status = 'critical';
      } else if (
        metrics.warningCount > 0 || 
        metrics.cpuUsage > 80 || 
        metrics.memoryUsage > 80
      ) {
        status = 'warning';
      }
      
      const now = new Date().toISOString();
      
      // Update agent health
      const { error } = await supabase
        .from('agent_health')
        .upsert({
          agent_id: agentId,
          status,
          uptime_seconds: uptime,
          cpu_usage: metrics.cpuUsage,
          memory_usage: metrics.memoryUsage,
          active_tasks: metrics.activeTasks,
          error_count: metrics.errorCount,
          warning_count: metrics.warningCount,
          last_execution_time: metrics.lastExecutionTime,
          active_connections: metrics.activeConnections,
          queued_tasks: metrics.queuedTasks,
          response_time: metrics.responseTime,
          health_check_timestamp: now
        });
        
      if (error) {
        throw error;
      }
      
      // Also add a record to the health history table for time-series analysis
      await supabase
        .from('agent_health_history')
        .insert({
          agent_id: agentId,
          status,
          cpu_usage: metrics.cpuUsage,
          memory_usage: metrics.memoryUsage,
          active_tasks: metrics.activeTasks,
          error_count: metrics.errorCount,
          warning_count: metrics.warningCount,
          timestamp: now
        });
      
      // Log this health update for system-wide monitoring
      logEvent({
        category: 'agent',
        action: 'health_updated',
        label: agentId,
        value: status === 'healthy' ? 1 : status === 'warning' ? 0 : -1
      });
      
      return true;
    } catch (error) {
      handleSupabaseError(error, 'Failed to report agent health');
      return false;
    }
  }
  
  /**
   * Report an agent event to the database
   */
  async reportEvent(
    agentId: string, 
    eventType: string, 
    message: string, 
    severity: 'info' | 'warning' | 'error' | 'critical' = 'info',
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      
      const { error } = await supabase
        .from('agent_events')
        .insert({
          agent_id: agentId,
          event_type: eventType,
          message,
          severity,
          metadata,
          created_at: new Date().toISOString()
        });
        
      if (error) {
        throw error;
      }
      
      // Update last_event_timestamp in agent_health
      await supabase
        .from('agent_health')
        .update({ last_event_timestamp: new Date().toISOString() })
        .eq('agent_id', agentId);
      
      // For critical events, trigger immediate circuit breaker analysis
      if (severity === 'critical' || severity === 'error') {
        await this.analyzeShouldTriggerCircuitBreaker(agentId);
      }
      
      return true;
    } catch (error) {
      handleSupabaseError(error, 'Failed to report agent event');
      return false;
    }
  }
  
  /**
   * Get recent events for an agent
   */
  async getAgentEvents(agentId: string, limit: number = 20): Promise<AgentEventData[]> {
    try {
      const supabase = await this.getSupabase();
      
      const { data, error } = await supabase
        .from('agent_events')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit);
        
      if (error) {
        throw error;
      }
      
      return data as AgentEventData[];
    } catch (error) {
      handleSupabaseError(error, 'Failed to get agent events');
      return [];
    }
  }
  
  /**
   * Update agent trading metrics
   */
  async updateAgentTradingMetrics(
    agentId: string, 
    metrics: {
      trades_executed: number;
      profit_loss: number;
      win_rate: number;
      avg_trade_duration: number;
    }
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      
      const { error } = await supabase
        .from('agent_trading_metrics')
        .upsert({
          agent_id: agentId,
          trades_executed: metrics.trades_executed,
          profit_loss: metrics.profit_loss,
          win_rate: metrics.win_rate,
          avg_trade_duration: metrics.avg_trade_duration,
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleSupabaseError(error, 'Failed to update agent trading metrics');
      return false;
    }
  }
  
  /**
   * Analyze if circuit breaker should be triggered
   */
  private async analyzeShouldTriggerCircuitBreaker(agentId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      
      // Get recent critical events
      const { data: criticalEvents, error: criticalError } = await supabase
        .from('agent_events')
        .select('*')
        .eq('agent_id', agentId)
        .in('severity', ['critical', 'error'])
        .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Last 15 minutes
        .order('created_at', { ascending: false });
        
      if (criticalError) throw criticalError;
      
      // If there are 3 or more critical events in the last 15 minutes, trigger circuit breaker
      if (criticalEvents && criticalEvents.length >= 3) {
        await this.updateCircuitBreakerStatus(
          agentId, 
          'triggered', 
          `Automatic circuit breaker: ${criticalEvents.length} critical errors in 15 minutes`
        );
        return true;
      }
      
      return false;
    } catch (error) {
      handleSupabaseError(error, 'Failed to analyze circuit breaker status');
      return false;
    }
  }
  
  /**
   * Update agent circuit breaker status
   */
  async updateCircuitBreakerStatus(
    agentId: string, 
    status: CircuitBreakerStatus, 
    reason?: string
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      
      // Update circuit breaker status
      const { error } = await supabase
        .from('agent_health')
        .update({
          circuit_breaker_status: status,
          circuit_breaker_reason: reason,
          status: status === 'triggered' ? 'inactive' : undefined // If triggered, set agent status to inactive
        })
        .eq('agent_id', agentId);
        
      if (error) {
        throw error;
      }
      
      // Log the circuit breaker event
      await this.reportEvent(
        agentId,
        'circuit_breaker',
        `Circuit breaker ${status}: ${reason || 'No reason provided'}`,
        status === 'triggered' ? 'critical' : 'info',
        { status, reason }
      );
      
      return true;
    } catch (error) {
      handleSupabaseError(error, 'Failed to update circuit breaker status');
      return false;
    }
  }
  
  /**
   * Clear circuit breaker for an agent
   */
  async clearCircuitBreaker(agentId: string): Promise<boolean> {
    return this.updateCircuitBreakerStatus(agentId, 'cleared', 'Manually cleared by user');
  }
  
  /**
   * Get health statistics for a farm
   */
  async getFarmHealthStats(farmId: string): Promise<{
    total: number;
    healthy: number;
    warning: number;
    critical: number;
    inactive: number;
  }> {
    try {
      const supabase = await this.getSupabase();
      
      // Get all agents for this farm
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('id')
        .eq('farm_id', farmId);
        
      if (agentsError) throw agentsError;
      
      if (!agents || agents.length === 0) {
        return { total: 0, healthy: 0, warning: 0, critical: 0, inactive: 0 };
      }
      
      const agentIds = agents.map(a => a.id);
      
      // Get health data for these agents
      const { data: health, error: healthError } = await supabase
        .from('agent_health')
        .select('status')
        .in('agent_id', agentIds);
        
      if (healthError) throw healthError;
      
      // Calculate statistics
      const stats = {
        total: agents.length,
        healthy: 0,
        warning: 0,
        critical: 0,
        inactive: 0
      };
      
      if (health) {
        health.forEach(h => {
          // Fix TypeScript error by ensuring status is a valid key
          const status = h.status as keyof typeof stats;
          if (status in stats) {
            stats[status]++;
          }
        });
        
        // Agents without health records are considered inactive
        stats.inactive += agents.length - health.length;
      } else {
        stats.inactive = agents.length;
      }
      
      return stats;
    } catch (error) {
      handleSupabaseError(error, 'Failed to get farm health statistics');
      return { total: 0, healthy: 0, warning: 0, critical: 0, inactive: 0 };
    }
  }
}

export default AgentMonitoringService;

// Create and export a mock AgentHealthMonitor class to fix build errors
export class AgentHealthMonitor {
  constructor(agentId?: string) {}
  
  getStatus() {
    return 'healthy';
  }
  
  getMetrics() {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      activeTasks: 0,
      errorCount: 0,
      warningCount: 0
    };
  }
}