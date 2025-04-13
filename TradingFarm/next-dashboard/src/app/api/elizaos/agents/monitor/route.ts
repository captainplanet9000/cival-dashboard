import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Validation schemas
const healthCheckSchema = z.object({
  agent_id: z.string().uuid(),
  metrics: z.object({
    cpu_usage: z.number().min(0).max(100),
    memory_usage: z.number().min(0),
    active_tasks: z.number().min(0),
    queue_length: z.number().min(0),
    last_command_latency_ms: z.number().min(0)
  }),
  status_check: z.object({
    is_responsive: z.boolean(),
    last_heartbeat: z.string().datetime(),
    error_count: z.number().min(0),
    warning_count: z.number().min(0)
  })
});

const alertSchema = z.object({
  agent_id: z.string().uuid(),
  type: z.enum(['error', 'warning', 'info']),
  category: z.enum([
    'system',
    'trading',
    'performance',
    'security',
    'connectivity'
  ]),
  message: z.string(),
  details: z.record(z.any()).optional(),
  severity: z.number().min(1).max(5)
});

// GET handler for monitoring dashboard data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    // Get monitoring data
    const [healthData, alerts, performance] = await Promise.all([
      getHealthMetrics(supabase, agentId),
      getActiveAlerts(supabase, agentId),
      getPerformanceMetrics(supabase, agentId)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        health: healthData,
        alerts,
        performance
      }
    });
  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}

// POST handler for health checks and alerts
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const path = request.nextUrl.pathname;
    const json = await request.json();

    if (path.endsWith('/health')) {
      // Handle health check update
      const validationResult = healthCheckSchema.safeParse(json);
      if (!validationResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid health check data' },
          { status: 400 }
        );
      }

      const result = await updateHealthCheck(supabase, validationResult.data);
      return NextResponse.json({ success: true, data: result });
    }

    if (path.endsWith('/alert')) {
      // Handle new alert
      const validationResult = alertSchema.safeParse(json);
      if (!validationResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid alert data' },
          { status: 400 }
        );
      }

      const result = await createAlert(supabase, validationResult.data);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid endpoint' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error in monitoring endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getHealthMetrics(supabase: any, agentId: string | null) {
  let query = supabase
    .from('elizaos_agents')
    .select('id, status, resource_utilization, error_count, health_check_timestamp')
    .order('updated_at', { ascending: false });

  if (agentId) {
    query = query.eq('id', agentId);
  }

  const { data } = await query;

  return data?.map((agent: any) => ({
    agent_id: agent.id,
    status: agent.status,
    health: {
      last_check: agent.health_check_timestamp,
      resource_usage: agent.resource_utilization || {},
      error_count: agent.error_count || 0,
      status_assessment: assessHealthStatus(agent)
    }
  }));
}

async function getActiveAlerts(supabase: any, agentId: string | null) {
  let query = supabase
    .from('elizaos_alerts')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data } = await query;
  return data || [];
}

async function getPerformanceMetrics(supabase: any, agentId: string | null) {
  let query = supabase
    .from('elizaos_agents')
    .select('id, performance_metrics')
    .order('updated_at', { ascending: false });

  if (agentId) {
    query = query.eq('id', agentId);
  }

  const { data } = await query;

  return data?.map((agent: any) => ({
    agent_id: agent.id,
    metrics: agent.performance_metrics || {}
  }));
}

async function updateHealthCheck(supabase: any, healthData: z.infer<typeof healthCheckSchema>) {
  const { agent_id, metrics, status_check } = healthData;

  // Update agent health data
  const { data, error } = await supabase
    .from('elizaos_agents')
    .update({
      resource_utilization: metrics,
      health_check_timestamp: new Date().toISOString(),
      error_count: status_check.error_count,
      status: determineAgentStatus(status_check),
      updated_at: new Date().toISOString()
    })
    .eq('id', agent_id)
    .select()
    .single();

  if (error) throw error;

  // Create alerts if necessary
  if (!status_check.is_responsive) {
    await createAlert(supabase, {
      agent_id,
      type: 'error',
      category: 'system',
      message: 'Agent is not responsive',
      severity: 5
    });
  }

  if (metrics.cpu_usage > 90) {
    await createAlert(supabase, {
      agent_id,
      type: 'warning',
      category: 'performance',
      message: 'High CPU usage detected',
      details: { cpu_usage: metrics.cpu_usage },
      severity: 3
    });
  }

  return data;
}

async function createAlert(supabase: any, alertData: z.infer<typeof alertSchema>) {
  // Create alert record
  const { data, error } = await supabase
    .from('elizaos_alerts')
    .insert({
      ...alertData,
      status: 'active',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // Log to audit trail
  await supabase
    .from('elizaos_audit_log')
    .insert({
      agent_id: alertData.agent_id,
      event_type: 'alert_created',
      event_data: alertData
    });

  return data;
}

function assessHealthStatus(agent: any): 'healthy' | 'degraded' | 'critical' {
  if (!agent.status || agent.status === 'error' || agent.status === 'offline') {
    return 'critical';
  }

  const resourceUtilization = agent.resource_utilization || {};
  if (
    resourceUtilization.cpu_usage > 90 ||
    resourceUtilization.memory_usage > 90 ||
    (agent.error_count || 0) > 10
  ) {
    return 'degraded';
  }

  return 'healthy';
}

function determineAgentStatus(statusCheck: z.infer<typeof healthCheckSchema>['status_check']): string {
  if (!statusCheck.is_responsive) {
    return 'offline';
  }

  if (statusCheck.error_count > 0) {
    return 'error';
  }

  return 'idle';
}
