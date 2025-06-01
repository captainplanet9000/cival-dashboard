/**
 * Agent Monitoring Service
 * Tracks agent health, performance, and logs
 */
import { createServerClient } from '@/utils/supabase/server';
import { QueueService, QueueNames } from './queue/queue-service';

export interface AgentHealthMetrics {
  agentId: string;
  userId: string;
  uptimeSeconds: number;
  lastActive?: string;
  memoryUsage?: number;
  cpuUsage?: number;
  requestsProcessed: number;
  tasksCompleted: number;
  errorsEncountered: number;
  performanceScore?: number;
  status: 'online' | 'offline' | 'degraded' | 'error';
  healthCheckTimestamp?: string;
  metricsData?: Record<string, any>;
}

export interface AgentLogEntry {
  agentId: string;
  userId: string;
  logLevel: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
  source?: string;
  timestamp?: string;
}

export interface AgentPerformanceMetrics {
  agentId: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  tasksProcessed: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  executionEfficiency: number;
  memoryEfficiency: number;
  overallScore: number;
}

export interface AgentComparisonResult {
  metrics: string[];
  agents: {
    id: string;
    name: string;
    scores: number[];
  }[];
  timeframe: string;
  startDate: string;
  endDate: string;
}

export class AgentMonitoringService {
  /**
   * Update agent health metrics
   */
  static async updateAgentHealth(metrics: AgentHealthMetrics): Promise<void> {
    const supabase = await createServerClient();
    
    // Check if agent health record exists
    const { data: existingMetrics } = await supabase
      .from('agent_health_metrics')
      .select('id')
      .eq('agent_id', metrics.agentId)
      .maybeSingle();
    
    const now = new Date().toISOString();
    
    if (existingMetrics?.id) {
      // Update existing record
      await supabase
        .from('agent_health_metrics')
        .update({
          uptime_seconds: metrics.uptimeSeconds,
          last_active: metrics.lastActive || now,
          memory_usage: metrics.memoryUsage,
          cpu_usage: metrics.cpuUsage,
          requests_processed: metrics.requestsProcessed,
          tasks_completed: metrics.tasksCompleted,
          errors_encountered: metrics.errorsEncountered,
          performance_score: metrics.performanceScore,
          status: metrics.status,
          health_check_timestamp: metrics.healthCheckTimestamp || now,
          metrics_data: metrics.metricsData || {},
          updated_at: now
        })
        .eq('id', existingMetrics.id);
    } else {
      // Create new record
      await supabase
        .from('agent_health_metrics')
        .insert({
          agent_id: metrics.agentId,
          user_id: metrics.userId,
          uptime_seconds: metrics.uptimeSeconds,
          last_active: metrics.lastActive || now,
          memory_usage: metrics.memoryUsage,
          cpu_usage: metrics.cpuUsage,
          requests_processed: metrics.requestsProcessed,
          tasks_completed: metrics.tasksCompleted,
          errors_encountered: metrics.errorsEncountered,
          performance_score: metrics.performanceScore,
          status: metrics.status,
          health_check_timestamp: metrics.healthCheckTimestamp || now,
          metrics_data: metrics.metricsData || {}
        });
    }
  }
  
  /**
   * Get agent health metrics
   */
  static async getAgentHealth(agentId: string): Promise<AgentHealthMetrics | null> {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('agent_health_metrics')
      .select('*')
      .eq('agent_id', agentId)
      .single();
      
    if (error) {
      console.error('Error fetching agent health metrics:', error);
      return null;
    }
    
    if (!data) return null;
    
    return {
      agentId: data.agent_id,
      userId: data.user_id,
      uptimeSeconds: data.uptime_seconds,
      lastActive: data.last_active,
      memoryUsage: data.memory_usage,
      cpuUsage: data.cpu_usage,
      requestsProcessed: data.requests_processed,
      tasksCompleted: data.tasks_completed,
      errorsEncountered: data.errors_encountered,
      performanceScore: data.performance_score,
      status: data.status as 'online' | 'offline' | 'degraded' | 'error',
      healthCheckTimestamp: data.health_check_timestamp,
      metricsData: data.metrics_data
    };
  }
  
  /**
   * Add log entry for an agent
   */
  static async addLogEntry(log: AgentLogEntry): Promise<void> {
    const supabase = await createServerClient();
    
    const now = new Date().toISOString();
    
    await supabase
      .from('agent_logs')
      .insert({
        agent_id: log.agentId,
        user_id: log.userId,
        log_level: log.logLevel,
        message: log.message,
        context: log.context || {},
        source: log.source,
        timestamp: log.timestamp || now
      });
  }
  
  /**
   * Get agent logs
   */
  static async getAgentLogs(
    agentId: string,
    options?: {
      limit?: number;
      offset?: number;
      logLevel?: 'info' | 'warning' | 'error' | 'debug';
      startDate?: string;
      endDate?: string;
      source?: string;
    }
  ): Promise<AgentLogEntry[]> {
    const supabase = await createServerClient();
    
    let query = supabase
      .from('agent_logs')
      .select('*')
      .eq('agent_id', agentId)
      .order('timestamp', { ascending: false });
      
    // Apply filters
    if (options?.logLevel) {
      query = query.eq('log_level', options.logLevel);
    }
    
    if (options?.startDate) {
      query = query.gte('timestamp', options.startDate);
    }
    
    if (options?.endDate) {
      query = query.lte('timestamp', options.endDate);
    }
    
    if (options?.source) {
      query = query.eq('source', options.source);
    }
    
    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }
    
    const { data, error } = await query;
      
    if (error) {
      console.error('Error fetching agent logs:', error);
      return [];
    }
    
    return (data || []).map(log => ({
      agentId: log.agent_id,
      userId: log.user_id,
      logLevel: log.log_level as 'info' | 'warning' | 'error' | 'debug',
      message: log.message,
      context: log.context,
      source: log.source,
      timestamp: log.timestamp
    }));
  }
  
  /**
   * Calculate agent performance metrics
   */
  static async calculatePerformanceMetrics(
    agentId: string,
    timeframe: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<AgentPerformanceMetrics> {
    const supabase = await createServerClient();
    
    // Calculate date range based on timeframe
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }
    
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
    
    // Get agent logs for the timeframe
    const logs = await this.getAgentLogs(agentId, {
      startDate: startDateStr,
      endDate: endDateStr,
      limit: 1000 // Reasonable limit for performance calculation
    });
    
    // Get agent health metrics
    const health = await this.getAgentHealth(agentId);
    
    // Calculate performance metrics
    const errorLogs = logs.filter(log => log.logLevel === 'error');
    const warningLogs = logs.filter(log => log.logLevel === 'warning');
    const infoLogs = logs.filter(log => log.logLevel === 'info');
    
    // Extract task completion times from logs if available
    const taskCompletionTimes: number[] = [];
    for (const log of logs) {
      if (log.context?.taskDuration) {
        taskCompletionTimes.push(log.context.taskDuration);
      }
    }
    
    // Calculate metrics
    const tasksProcessed = health?.tasksCompleted || 0;
    const errorsEncountered = health?.errorsEncountered || 0;
    const successRate = tasksProcessed > 0 
      ? ((tasksProcessed - errorsEncountered) / tasksProcessed) * 100 
      : 0;
    
    const averageResponseTime = taskCompletionTimes.length > 0
      ? taskCompletionTimes.reduce((sum, time) => sum + time, 0) / taskCompletionTimes.length
      : 0;
    
    const errorRate = tasksProcessed > 0 
      ? (errorsEncountered / tasksProcessed) * 100 
      : 0;
    
    // Calculate efficiency metrics based on available data
    const executionEfficiency = health?.performanceScore || 0;
    const memoryEfficiency = health?.memoryUsage 
      ? Math.max(0, 100 - (health.memoryUsage / 10)) // Lower memory usage is better
      : 0;
    
    // Calculate overall score (weighted average)
    const overallScore = (
      (successRate * 0.3) + 
      (Math.max(0, 100 - averageResponseTime) * 0.2) + 
      (Math.max(0, 100 - errorRate) * 0.3) + 
      (executionEfficiency * 0.1) + 
      (memoryEfficiency * 0.1)
    );
    
    // Return compiled metrics
    return {
      agentId,
      timeframe,
      startDate: startDateStr,
      endDate: endDateStr,
      tasksProcessed,
      successRate,
      averageResponseTime,
      errorRate,
      executionEfficiency,
      memoryEfficiency,
      overallScore
    };
  }
  
  /**
   * Compare multiple agents' performance
   */
  static async compareAgentPerformance(
    agentIds: string[],
    timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<AgentComparisonResult> {
    const supabase = await createServerClient();
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }
    
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
    
    // Get agent details and metrics
    const agentDetailsPromises = agentIds.map(async (agentId) => {
      // Get agent name
      const { data: agent } = await supabase
        .from('agents')
        .select('name')
        .eq('id', agentId)
        .single();
      
      // Calculate performance metrics
      const metrics = await this.calculatePerformanceMetrics(agentId, timeframe);
      
      return {
        id: agentId,
        name: agent?.name || `Agent ${agentId.substring(0, 8)}`,
        metrics
      };
    });
    
    const agentDetails = await Promise.all(agentDetailsPromises);
    
    // Define metrics to compare
    const metricsToCompare = [
      'Success Rate',
      'Response Time',
      'Error Rate',
      'Execution Efficiency',
      'Memory Efficiency',
      'Overall Score'
    ];
    
    // Format comparison result
    const result: AgentComparisonResult = {
      metrics: metricsToCompare,
      agents: agentDetails.map(agent => ({
        id: agent.id,
        name: agent.name,
        scores: [
          agent.metrics.successRate,
          agent.metrics.averageResponseTime,
          agent.metrics.errorRate,
          agent.metrics.executionEfficiency,
          agent.metrics.memoryEfficiency,
          agent.metrics.overallScore
        ]
      })),
      timeframe,
      startDate: startDateStr,
      endDate: endDateStr
    };
    
    return result;
  }
  
  /**
   * Monitor agent health
   * This is intended to be called periodically to update agent health metrics
   */
  static async monitorAgentHealth(agentId: string): Promise<void> {
    const supabase = await createServerClient();
    
    try {
      // Get agent details
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id, user_id, status, last_active')
        .eq('id', agentId)
        .single();
        
      if (agentError || !agent) {
        console.error('Error fetching agent for health monitoring:', agentError);
        return;
      }
      
      // Get current health metrics
      const { data: currentHealth } = await supabase
        .from('agent_health_metrics')
        .select('*')
        .eq('agent_id', agentId)
        .maybeSingle();
      
      const now = new Date();
      const lastActive = agent.last_active ? new Date(agent.last_active) : null;
      
      // Calculate uptime
      const uptimeSeconds = currentHealth?.uptime_seconds || 0;
      let additionalUptime = 0;
      
      if (lastActive && agent.status === 'active') {
        // If agent is active, add time since last measurement to uptime
        const lastHealthCheck = currentHealth?.health_check_timestamp 
          ? new Date(currentHealth.health_check_timestamp)
          : null;
          
        if (lastHealthCheck) {
          additionalUptime = Math.floor((now.getTime() - lastHealthCheck.getTime()) / 1000);
        }
      }
      
      // Determine agent status
      let status: 'online' | 'offline' | 'degraded' | 'error' = 'offline';
      
      if (agent.status === 'active') {
        if (lastActive && (now.getTime() - lastActive.getTime()) < 5 * 60 * 1000) {
          // Active within the last 5 minutes
          status = 'online';
        } else {
          // Active but not recently seen
          status = 'degraded';
        }
      } else if (agent.status === 'error') {
        status = 'error';
      }
      
      // Get recent logs to check for errors
      const { data: recentLogs } = await supabase
        .from('agent_logs')
        .select('log_level')
        .eq('agent_id', agentId)
        .gte('timestamp', new Date(now.getTime() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
        .order('timestamp', { ascending: false });
        
      const recentErrors = (recentLogs || []).filter(log => log.log_level === 'error').length;
      
      // If there are recent errors but agent is online, mark as degraded
      if (recentErrors > 0 && status === 'online') {
        status = 'degraded';
      }
      
      // Update health metrics
      const updatedHealth: AgentHealthMetrics = {
        agentId,
        userId: agent.user_id,
        uptimeSeconds: uptimeSeconds + additionalUptime,
        lastActive: agent.last_active,
        requestsProcessed: currentHealth?.requests_processed || 0,
        tasksCompleted: currentHealth?.tasks_completed || 0,
        errorsEncountered: (currentHealth?.errors_encountered || 0) + recentErrors,
        status,
        healthCheckTimestamp: now.toISOString(),
        metricsData: {
          ...(currentHealth?.metrics_data || {}),
          lastMonitoringUpdate: now.toISOString()
        }
      };
      
      await this.updateAgentHealth(updatedHealth);
      
      // Log the health check
      await this.addLogEntry({
        agentId,
        userId: agent.user_id,
        logLevel: 'info',
        message: `Agent health monitoring check completed. Status: ${status}`,
        source: 'monitoring',
        context: {
          healthMetrics: updatedHealth
        }
      });
    } catch (error) {
      console.error('Error monitoring agent health:', error);
    }
  }
  
  /**
   * Queue an agent health monitoring job
   */
  static async queueHealthMonitoring(agentId: string): Promise<void> {
    const queue = QueueService.getQueue(QueueNames.AGENT_MONITORING);
    
    await queue.add('monitor-agent-health', {
      agentId
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });
  }
}
