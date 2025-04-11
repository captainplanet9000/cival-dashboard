import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { AgentPerformanceMetrics } from '@/types/agent-types';
import { MonitoringService } from '@/services/monitoring-service';

/**
 * GET handler to retrieve current performance metrics for an agent
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      await MonitoringService.logSystemEvent(
        'system.warning',
        'Unauthorized metrics access attempt',
        { agentId: params.id },
        'warning'
      );
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get agent ID from URL
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the agent exists and user has permission
    const { data: agent, error: fetchError } = await supabase
      .from('elizaos_agents')
      .select('id, farm_id, status, performance_metrics')
      .eq('id', id)
      .single();
    
    if (fetchError || !agent) {
      await MonitoringService.logSystemEvent(
        'system.warning',
        'Agent not found during metrics request',
        { agentId: id, error: fetchError?.message, userId: session.user.id },
        'warning'
      );
      
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Check if user has access to the farm
    const { data: farmAccess, error: farmError } = await supabase
      .from('farm_members')
      .select('role')
      .eq('farm_id', agent.farm_id)
      .eq('user_id', session.user.id)
      .single();
    
    if (farmError || !farmAccess) {
      await MonitoringService.logSystemEvent(
        'system.warning',
        'Unauthorized agent access attempt',
        { 
          agentId: id, 
          farmId: agent.farm_id, 
          userId: session.user.id,
          error: farmError?.message 
        },
        'warning'
      );
      
      return NextResponse.json(
        { error: 'You do not have access to this agent' },
        { status: 403 }
      );
    }
    
    // Try to get most recent metrics from agent_metrics table (production data source)
    const { data: currentMetrics, error: currentMetricsError } = await supabase
      .from('agent_metrics')
      .select('*')
      .eq('agent_id', id)
      .single();
    
    if (!currentMetricsError && currentMetrics) {
      // Log this metrics retrieval
      await MonitoringService.logEvent({
        type: 'agent.success', // Using predefined MonitoringEventType
        severity: 'info',
        subject: `Agent ${id}`,
        source: 'api',
        agent_id: id,
        user_id: session.user.id,
        message: `Agent metrics retrieved`,
        details: { timestamp: new Date().toISOString(), action: 'metrics_read' }
      });
      
      return NextResponse.json({
        metrics: currentMetrics
      });
    }
    
    // Fallback to monitoring_events table if agent_metrics table doesn't have data
    const { data: recentMetrics, error: metricsError } = await supabase
      .from('monitoring_events')
      .select('details, timestamp')
      .eq('agent_id', id)
      .eq('type', 'agent.metrics')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    
    let metrics: AgentPerformanceMetrics;
    
    if (metricsError || !recentMetrics) {
      // No metrics available for this agent
      await MonitoringService.logSystemEvent(
        'system.warning',
        'No metrics available for agent',
        { agentId: id, userId: session.user.id },
        'warning'
      );
      
      // In production, don't use mock data - return empty metrics
      if (process.env.NODE_ENV === 'production') {
        metrics = {
          success_rate: 0,
          average_response_time_ms: 0,
          commands_processed: 0,
          errors_count: 0,
          uptime_percentage: 0,
          last_active_at: new Date(0).toISOString() // Use epoch time instead of undefined
        } as AgentPerformanceMetrics;
      } else {
        // Only in development, use stored metrics or defaults
        metrics = agent.performance_metrics || getDevelopmentMetrics(agent.status);
      }
    } else {
      // Use the metrics from monitoring_events
      metrics = recentMetrics.details as AgentPerformanceMetrics;
      metrics.last_active_at = recentMetrics.timestamp;
    }
    
    // Log this metrics retrieval
    await MonitoringService.logEvent({
      type: 'agent.success', // Using predefined MonitoringEventType
      severity: 'info',
      subject: `Agent ${id}`,
      source: 'api',
      agent_id: id,
      user_id: session.user.id,
      message: `Agent metrics retrieved`,
      details: { timestamp: new Date().toISOString(), fallback: true, action: 'metrics_read' }
    });
    
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error retrieving agent metrics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await MonitoringService.logSystemEvent(
      'system.error',
      'Exception in agent metrics API endpoint',
      { error: errorMessage, agentId: params.id },
      'error'
    );
    
    // Don't return mock metrics in production on error
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    } else {
      // Only in development, return default metrics with error
      return NextResponse.json(
        { 
          error: 'Internal server error',
          metrics: getDevelopmentMetrics('unknown')
        },
        { status: 500 }
      );
    }
  }
}

/**
 * Generate development-only default metrics based on agent status
 * This should ONLY be used in development environments
 */
function getDevelopmentMetrics(status: string): AgentPerformanceMetrics {
  const isActive = status === 'active';
  
  return {
    success_rate: isActive ? 0.95 : 0.85,
    average_response_time_ms: isActive ? 450 : 650,
    commands_processed: isActive ? 10 : 0,
    errors_count: 0,
    uptime_percentage: isActive ? 99.5 : 0,
    last_active_at: isActive ? new Date().toISOString() : undefined
  } as AgentPerformanceMetrics;
}
