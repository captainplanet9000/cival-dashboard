import { createBrowserClient } from '@/utils/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';
export type CircuitBreakerStatus = 'open' | 'closed';
export type ComparisonOperator = 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
export type TradingPerformanceMetric = 'profit_loss' | 'win_rate' | 'drawdown' | 'sharpe_ratio' | 'max_drawdown';
export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface AgentHealthMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage?: number;
  responseTime?: number;
  uptime?: number;
  lastHeartbeat?: Date;
  activeTasks?: number;
  errorRate?: number;
}

export interface AgentHealthData {
  id?: string;
  agent_id: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  response_time?: number;
  uptime?: number;
  last_heartbeat?: Date;
  status: HealthStatus;
  message?: string;
  created_at?: string;
  updated_at?: string;
  active_tasks?: number;
  error_rate?: number;
  trading_status?: 'active' | 'paused' | 'inactive';
  order_count?: number;
  trade_count?: number;
  position_count?: number;
  capital_allocated?: number;
  capital_available?: number;
  profit_loss?: number;
  win_rate?: number;
  drawdown?: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  circuit_breaker_status?: CircuitBreakerStatus;
  circuit_breaker_triggered_at?: Date;
  circuit_breaker_reason?: string;
}

export interface TradingPerformanceData {
  agent_id: string;
  metric: TradingPerformanceMetric;
  value: number;
  timeframe: '1h' | '1d' | '7d' | '30d' | 'all';
  created_at?: string;
}

export interface AlertConfig {
  id?: string;
  agent_id: string;
  metric: string;
  threshold: number;
  comparison: ComparisonOperator;
  message: string;
  severity: AlertSeverity;
  enabled: boolean;
  notify_channels: ('email' | 'sms' | 'dashboard' | 'slack')[];
  created_at?: string;
  updated_at?: string;
}

export interface CircuitBreakerConfig {
  id?: string;
  agent_id: string;
  metric: string;
  threshold: number;
  comparison: ComparisonOperator;
  message?: string;
  auto_reset: boolean;
  reset_after_seconds?: number;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Monitors and manages agent health status
 */
export class AgentHealthMonitor {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createBrowserClient();
  }

  async getAgentHealth(agentId: string): Promise<AgentHealthData | null> {
    try {
      const { data, error } = await this.supabase
        .from('agent_health')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      return data as AgentHealthData;
    } catch (error) {
      console.error('Error fetching agent health:', error);
      return null;
    }
  }

  async getAgentsHealth(agentIds: string[]): Promise<Record<string, AgentHealthData>> {
    try {
      const { data, error } = await this.supabase
        .from('agent_health')
        .select('*')
        .in('agent_id', agentIds)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Group by agent_id and take the most recent entry for each agent
      const healthByAgent: Record<string, AgentHealthData> = {};
      
      data.forEach((item: any) => {
        if (!healthByAgent[item.agent_id] || new Date(item.created_at) > new Date(healthByAgent[item.agent_id].created_at)) {
          healthByAgent[item.agent_id] = item as AgentHealthData;
        }
      });

      return healthByAgent;
    } catch (error) {
      console.error('Error fetching agents health:', error);
      return {};
    }
  }

  async reportHealth(healthData: Partial<AgentHealthData> & { agent_id: string }): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('agent_health')
        .insert({
          ...healthData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error reporting agent health:', error);
      return false;
    }
  }

  async reportEvent(agentId: string, eventType: string, message: string): Promise<void> {
    try {
      await this.supabase
        .from('agent_events')
        .insert({
          agent_id: agentId,
          event_type: eventType,
          message: message,
          created_at: new Date().toISOString(),
        });
    } catch (error: any) {
      console.error('Error reporting agent event:', error);
    }
  }

  private async logSystemEvent(eventType: string, message: string): Promise<void> {
    try {
      await this.supabase
        .from('system_events')
        .insert({
          event_type: eventType,
          message: message,
          created_at: new Date().toISOString(),
        });
    } catch (error: any) {
      console.error('Error logging system event:', error);
    }
  }

  async getTradingPerformance(
    agentId: string, 
    metrics: TradingPerformanceMetric[] = ['profit_loss', 'win_rate', 'drawdown'],
    timeframe: '1h' | '1d' | '7d' | '30d' | 'all' = '7d'
  ): Promise<TradingPerformanceData[]> {
    try {
      const { data, error } = await this.supabase
        .from('agent_performance')
        .select('*')
        .eq('agent_id', agentId)
        .in('metric', metrics)
        .eq('timeframe', timeframe)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data as TradingPerformanceData[];
    } catch (error) {
      console.error('Error fetching trading performance:', error);
      return [];
    }
  }

  async getAlertConfigs(agentId: string): Promise<AlertConfig[]> {
    try {
      const { data, error } = await this.supabase
        .from('agent_alert_configs')
        .select('*')
        .eq('agent_id', agentId);

      if (error) {
        throw error;
      }

      return data as unknown as AlertConfig[];
    } catch (error) {
      console.error('Error fetching alert configs:', error);
      return [];
    }
  }

  async saveAlertConfig(agentId: string, config: Omit<AlertConfig, 'id'>): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('agent_alert_configs')
        .upsert({
          agent_id: agentId,
          ...config,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error saving alert config:', error);
      return false;
    }
  }

  async getCircuitBreakerConfigs(agentId: string): Promise<CircuitBreakerConfig[]> {
    try {
      const { data, error } = await this.supabase
        .from('agent_circuit_breaker_configs')
        .select('*')
        .eq('agent_id', agentId);

      if (error) {
        throw error;
      }

      return data as unknown as CircuitBreakerConfig[];
    } catch (error) {
      console.error('Error fetching circuit breaker configs:', error);
      return [];
    }
  }

  async saveCircuitBreakerConfig(agentId: string, config: Omit<CircuitBreakerConfig, 'id'>): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('agent_circuit_breaker_configs')
        .upsert({
          agent_id: agentId,
          ...config,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error saving circuit breaker config:', error);
      return false;
    }
  }

  async triggerCircuitBreaker(agentId: string, reason: string): Promise<boolean> {
    try {
      // Update agent health with circuit breaker status
      const healthUpdate = {
        agent_id: agentId,
        circuit_breaker_status: 'open' as CircuitBreakerStatus,
        circuit_breaker_triggered_at: new Date().toISOString(),
        circuit_breaker_reason: reason,
        trading_status: 'paused' as 'active' | 'paused' | 'inactive',
      };
      
      await this.reportHealth(healthUpdate);
      
      // Log circuit breaker event
      await this.reportEvent(
        agentId, 
        'circuit_breaker_triggered', 
        `Trading paused: ${reason}`
      );
      
      // Log system-wide event for notifications
      await this.logSystemEvent(
        'circuit_breaker_triggered',
        `Circuit breaker triggered for agent ${agentId}: ${reason}`
      );
      
      return true;
    } catch (error: any) {
    
    // Check if health record exists
    const { data: existing, error: checkError } = await supabase
      .from('agent_health')
      .select('id')
      .eq('agent_id', agentId)
      .maybeSingle();
      
    if (checkError) throw checkError;
    
    if (existing) {
      // Update existing health record
      const { error } = await supabase
        .from('agent_health')
        .update({
          cpu_usage: metrics.cpuUsage,
          memory_usage: metrics.memoryUsage,
          active_tasks: metrics.activeTasks,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
        
      if (error) throw error;
    } else {
      // Create new health record
      const { error } = await supabase
        .from('agent_health')
        .insert({
          agent_id: agentId,
          cpu_usage: metrics.cpuUsage,
          memory_usage: metrics.memoryUsage,
          active_tasks: metrics.activeTasks,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        
      if (error) throw error;
    }
    
    await this.reportEvent(agentId, 'health_reported', `Agent health reported for agent ${agentId}`);
    
    return true;
  } catch (e: any) {
    console.error('Error reporting agent health:', e);
    return false;
  }
}

async updateAgentTradingMetrics(agentId: string): Promise<boolean> {
  try {
    const metrics = await this.fetchTradingMetrics(agentId);
    
    if (Object.keys(metrics).length === 0) {
      return false;
    }
    
    // Update agent health with metrics
    await this.reportHealth({
      agent_id: agentId,
      ...metrics
    });
    
    await this.reportEvent(agentId, 'metrics_updated', `Trading metrics updated for agent ${agentId}`);
    
    return true;
  } catch (e: any) {
    console.error('Error updating agent trading metrics:', e);
    return false;
  }
}

async fetchTradingMetrics(agentId: string): Promise<Partial<AgentHealthData>> {
  try {
    // Get trading metrics from relevant tables
    const [ordersResponse, tradesResponse, positionsResponse, capitalResponse] = await Promise.all([
      this.supabase
        .from('orders')
        .select('count')
        .eq('agent_id', agentId),
      this.supabase
        .from('trades')
        .select('count')
        .eq('agent_id', agentId),
      this.supabase
        .from('positions')
        .select('*')
        .eq('agent_id', agentId),
      this.supabase
        .from('agent_capital')
        .select('*')
        .eq('agent_id', agentId)
        .single()
    ]);
    
    // Handle any errors
    if (ordersResponse.error) throw ordersResponse.error;
    if (tradesResponse.error) throw tradesResponse.error;
    if (positionsResponse.error) throw positionsResponse.error;
    
    const positions = positionsResponse.data || [];
    const capital = capitalResponse.data || { allocated: 0, available: 0 };
    
    await this.reportEvent(agentId, 'metrics_fetched', `Trading metrics fetched for agent ${agentId}`);
    
    return {
      order_count: ordersResponse.data?.[0]?.count || 0,
      trade_count: tradesResponse.data?.[0]?.count || 0,
      position_count: positions.length,
      capital_allocated: capital.allocated,
      capital_available: capital.available
    };
  } catch (e: any) {
    console.error('Error fetching trading metrics:', e);
    return {};
  }
}

async getAgentsHealth(agentIds: string[]): Promise<Record<string, AgentHealthData>> {
  if (!agentIds.length) return {};
  
  try {
    const supabase = createBrowserClient();
    
    // Fetch health data for the agents
    const { data: healthData, error: healthError } = await supabase
      .from('agent_health')
      .select('*')
      .in('agent_id', agentIds);
      
    if (healthError) throw healthError;
    
    // Fetch recent errors for the agents
    const { data: recentErrors, error: errorsError } = await supabase
      .from('agent_events')
      .select('*')
      .in('agent_id', agentIds)
      .eq('event_type', 'error')
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (errorsError) throw errorsError;
    
    // Fetch agent tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('agent_tasks')
      .select('*')
      .in('assigned_agent_id', agentIds)
      .not('status', 'eq', 'completed');
      
    if (tasksError) throw tasksError;
    
    // Process the data into the required format
    const result: Record<string, AgentHealthData> = {};
    
    // Helper to calculate error rate based on events
    const calculateErrorRate = (agentId: string): number => {
      const agentErrors = recentErrors.filter(e => e.agent_id === agentId);
      return agentErrors.length > 0 ? Math.min(100, (agentErrors.length / 10) * 100) : 0;
    };
    
    // Helper to determine health status based on metrics
    const determineHealthStatus = (
      cpuUsage: number, 
      memoryUsage: number, 
      errorRate: number,
      lastActiveTimestamp: string | null
    ): HealthStatus => {
      // Check if agent is inactive
      if (!lastActiveTimestamp) return 'unknown';
        // Check if agent is inactive
        if (!lastActiveTimestamp) return 'unknown';
        
        const lastActive = new Date(lastActiveTimestamp);
        const now = new Date();
        const minutesSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60);
        
        // Critical if inactive for over 15 minutes or very high resource usage or errors
        if (minutesSinceActive > 15 || cpuUsage > 90 || memoryUsage > 90 || errorRate > 50) {
          return 'critical';
        }
        
        // Warning if inactive for over 5 minutes or high resource usage or some errors
        if (minutesSinceActive > 5 || cpuUsage > 70 || memoryUsage > 70 || errorRate > 10) {
          return 'warning';
        }
        
        return 'healthy';
      };
      
      // Helper to generate issue messages based on metrics and status
      const generateIssues = (
        agentId: string,
        cpuUsage: number,
        memoryUsage: number,
        errorRate: number,
        lastActiveTimestamp: string | null
      ): string[] => {
        const issues: string[] = [];
        
        if (!lastActiveTimestamp) {
          issues.push('Agent has never reported status');
          return issues;
        }
        
        const lastActive = new Date(lastActiveTimestamp);
        const now = new Date();
        const minutesSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60);
        
        if (minutesSinceActive > 15) {
          issues.push(`Agent inactive for ${Math.floor(minutesSinceActive)} minutes`);
        } else if (minutesSinceActive > 5) {
          issues.push(`Agent inactive for ${Math.floor(minutesSinceActive)} minutes`);
        }
        
        if (cpuUsage > 90) {
          issues.push(`Critical CPU usage: ${cpuUsage.toFixed(1)}%`);
        } else if (cpuUsage > 70) {
          issues.push(`High CPU usage: ${cpuUsage.toFixed(1)}%`);
        }
        
        if (memoryUsage > 90) {
          issues.push(`Critical memory usage: ${memoryUsage.toFixed(1)}%`);
        } else if (memoryUsage > 70) {
          issues.push(`High memory usage: ${memoryUsage.toFixed(1)}%`);
        }
        
        // Add recent error messages
        const agentErrors = recentErrors
          .filter(e => e.agent_id === agentId)
          .slice(0, 3);
          
        if (agentErrors.length > 0) {
          agentErrors.forEach(error => {
            if (error.event_data && error.event_data.message) {
              issues.push(`Error: ${error.event_data.message}`);
            }
          });
          
          const additionalErrors = recentErrors.filter(e => e.agent_id === agentId).length - agentErrors.length;
          if (additionalErrors > 0) {
            issues.push(`Plus ${additionalErrors} more errors`);
          }
        }
        
        // Add task-related issues
        const agentTasks = tasks.filter(t => t.assigned_agent_id === agentId);
        const stuckTasks = agentTasks.filter(t => t.status === 'in_progress' && new Date(t.updated_at) < new Date(Date.now() - 30 * 60 * 1000));
        
        if (stuckTasks.length > 0) {
          issues.push(`${stuckTasks.length} task(s) appear to be stuck`);
        }
        
        return issues;
      };
      
      // Calculate health data for each agent
      for (const agentId of agentIds) {
        const agentHealth = healthData.find(h => h.agent_id === agentId);
        
        if (!agentHealth) {
          // No health data found for this agent
          result[agentId] = {
            agentId,
            status: 'unknown',
            lastChecked: new Date(),
            metrics: { cpu: 0, memory: 0, latency: 0, uptime: 0, errorRate: 0 },
            issues: ['No health data available']
          };
          continue;
        }
        
        const cpuUsage = agentHealth.cpu_usage || 0;
        const memoryUsage = agentHealth.memory_usage || 0;
        const errorRate = calculateErrorRate(agentId);
        const lastActive = agentHealth.last_active;
        
        // Calculate latency (simulated for now)
        const latency = Math.random() * 100 + 50; // Simulated value between 50-150ms
        
        // Calculate uptime percentage (simulated for now)
        const uptime = Math.max(0, 100 - (Math.random() * 10)); // Simulated 90-100%
        
        // Determine health status
        const status = determineHealthStatus(cpuUsage, memoryUsage, errorRate, lastActive);
        
        // Generate issues list
        const issues = generateIssues(agentId, cpuUsage, memoryUsage, errorRate, lastActive);
        
        // Create health data object
        result[agentId] = {
          agentId,
          status,
          lastChecked: new Date(),
          metrics: {
            cpu: cpuUsage,
            memory: memoryUsage,
            latency,
            uptime,
            errorRate
          },
          issues
        };
      }
      
      logEvent({
        category: 'agent_health',
        action: 'fetch_agents_health',
        label: `Fetched health data for ${agentIds.length} agents`,
        value: agentIds.length
      });
      
      return result;
      
    } catch (err) {
      const errorMessage = handleSupabaseError(err, 'Failed to load agent health data');
      
      logEvent({
        category: 'agent_health',
        action: 'fetch_health_error',
        label: errorMessage,
        error: err
      });
      
      // Return unknown health status for all agents on error
      return agentIds.reduce((acc, agentId) => {
        acc[agentId] = {
          agentId,
          status: 'unknown',
          lastChecked: new Date(),
          metrics: { cpu: 0, memory: 0, latency: 0, uptime: 0, errorRate: 0 },
          issues: ['Failed to retrieve health data']
        };
        return acc;
      }, {} as Record<string, AgentHealthData>);
    }
  }
  
  /**
   * Report health event for an agent
   * @param agentId - Agent ID
   * @param metrics - Health metrics to report
   * @returns Success status
   */
  async reportAgentHealth(
    agentId: string, 
    metrics: {
      cpuUsage: number;
      memoryUsage: number;
      activeTasks: number;
    }
  ): Promise<boolean> {
    try {
      const supabase = createBrowserClient();
      
      // Check if health record exists
      const { data: existing, error: checkError } = await supabase
        .from('agent_health')
        .select('id')
        .eq('agent_id', agentId)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('agent_health')
          .update({
            status: 'active',
            last_active: new Date().toISOString(),
            cpu_usage: metrics.cpuUsage,
            memory_usage: metrics.memoryUsage,
            active_tasks: metrics.activeTasks,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('agent_health')
          .insert({
            agent_id: agentId,
            status: 'active',
            last_active: new Date().toISOString(),
            cpu_usage: metrics.cpuUsage,
            memory_usage: metrics.memoryUsage,
            active_tasks: metrics.activeTasks,
            error_count: 0
          });
          
        if (insertError) throw insertError;
      }
      
      return true;
    } catch (err) {
      const errorMessage = handleSupabaseError(err, 'Failed to report agent health');
      
      logEvent({
        category: 'agent_health',
        action: 'report_health_error',
        label: errorMessage,
        error: err
      });
      
      return false;
    }
  }
  
  /**
   * Report an error event for an agent
   * @param agentId - Agent ID
   * @param error - Error information
   * @returns Success status
   */
  async reportAgentError(
    agentId: string,
    error: {
      message: string;
      stack?: string;
      code?: string;
      context?: Record<string, any>;
    }
  ): Promise<boolean> {
    try {
      const supabase = createBrowserClient();
      
      // Record the error event
      const { error: eventError } = await supabase
        .from('agent_events')
        .insert({
          agent_id: agentId,
          event_type: 'error',
          event_data: error,
          created_at: new Date().toISOString()
        });
        
      if (eventError) throw eventError;
      
      // Update error count in agent health
      const { data: health, error: healthError } = await supabase
        .from('agent_health')
        .select('id, error_count')
        .eq('agent_id', agentId)
        .maybeSingle();
        
      if (healthError) throw healthError;
      
      if (health) {
        const { error: updateError } = await supabase
          .from('agent_health')
          .update({
            error_count: (health.error_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', health.id);
          
        if (updateError) throw updateError;
      }
      
      return true;
    } catch (err) {
      const errorMessage = handleSupabaseError(err, 'Failed to report agent error');
      
      logEvent({
        category: 'agent_health',
        action: 'report_error_error',
        label: errorMessage,
        error: err
      });
      
      return false;
    }
  }
  
  /**
   * Reset error count for an agent
   * @param agentId - Agent ID
   * @returns Success status
   */
  async resetAgentErrorCount(agentId: string): Promise<boolean> {
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('agent_health')
        .update({
          error_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('agent_id', agentId);
        
      if (error) throw error;
      
      return true;
    } catch (err) {
      const errorMessage = handleSupabaseError(err, 'Failed to reset agent error count');
      
      logEvent({
        category: 'agent_health',
        action: 'reset_errors_error',
        label: errorMessage,
        error: err
      });
      
      return false;
    }
  }
}
