import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h';
    const agentId = searchParams.get('agentId');

    // Calculate start time based on timeframe
    const now = new Date();
    const startTime = new Date(now.getTime() - parseTimeframe(timeframe));

    // Base query for command history
    let commandQuery = supabase
      .from('elizaos_command_history')
      .select('*')
      .gte('started_at', startTime.toISOString());

    // Base query for audit log
    let auditQuery = supabase
      .from('elizaos_audit_log')
      .select('*')
      .gte('created_at', startTime.toISOString());

    // Filter by agent if specified
    if (agentId) {
      commandQuery = commandQuery.eq('agent_id', agentId);
      auditQuery = auditQuery.eq('agent_id', agentId);
    }

    // Execute queries in parallel
    const [commandHistory, auditLog, agentMetrics] = await Promise.all([
      commandQuery,
      auditQuery,
      getAgentMetrics(supabase, agentId, startTime)
    ]);

    // Calculate analytics
    const analytics = {
      performance: calculatePerformanceMetrics(commandHistory.data || []),
      knowledge: analyzeKnowledgeUtilization(auditLog.data || []),
      resources: agentMetrics,
      trends: analyzeTrends(commandHistory.data || [], auditLog.data || [])
    };

    return NextResponse.json(
      { success: true, data: analytics },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to parse timeframe string to milliseconds
function parseTimeframe(timeframe: string): number {
  const units: { [key: string]: number } = {
    h: 3600000,
    d: 86400000,
    w: 604800000,
    m: 2592000000
  };
  const value = parseInt(timeframe);
  const unit = timeframe.slice(-1);
  return value * (units[unit] || units.h);
}

// Calculate performance metrics from command history
function calculatePerformanceMetrics(commands: any[]) {
  const total = commands.length;
  const successful = commands.filter(c => c.status === 'completed').length;
  const avgProcessingTime = commands.reduce((sum, c) => sum + (c.processing_time_ms || 0), 0) / total;

  return {
    total_commands: total,
    success_rate: total > 0 ? successful / total : 1,
    average_processing_time_ms: avgProcessingTime || 0,
    command_types: aggregateCommandTypes(commands),
    error_rates: calculateErrorRates(commands)
  };
}

// Analyze knowledge utilization from audit log
function analyzeKnowledgeUtilization(auditLog: any[]) {
  const knowledgeEvents = auditLog.filter(e => 
    e.event_type.startsWith('knowledge_')
  );

  return {
    total_knowledge_operations: knowledgeEvents.length,
    knowledge_types: aggregateKnowledgeTypes(knowledgeEvents),
    sharing_patterns: analyzeKnowledgeSharing(knowledgeEvents),
    access_patterns: analyzeAccessPatterns(knowledgeEvents)
  };
}

// Get agent metrics from database
async function getAgentMetrics(supabase: any, agentId: string | null, startTime: Date) {
  const query = supabase
    .from('elizaos_agents')
    .select('id, status, resource_utilization, error_count, performance_metrics')
    .gte('updated_at', startTime.toISOString());

  if (agentId) {
    query.eq('id', agentId);
  }

  const { data } = await query;

  return {
    active_agents: data?.filter(a => a.status !== 'offline').length || 0,
    error_rates: aggregateErrorRates(data || []),
    resource_usage: aggregateResourceUsage(data || []),
    performance_trends: analyzePerformanceTrends(data || [])
  };
}

// Analyze trends over time
function analyzeTrends(commands: any[], auditLog: any[]) {
  return {
    command_volume: aggregateTimeSeriesData(commands, 'started_at'),
    error_frequency: aggregateTimeSeriesData(
      commands.filter(c => c.status === 'error'),
      'started_at'
    ),
    activity_patterns: identifyActivityPatterns(commands, auditLog)
  };
}

// Helper functions for data aggregation
function aggregateCommandTypes(commands: any[]) {
  return commands.reduce((acc, cmd) => {
    acc[cmd.command_type] = (acc[cmd.command_type] || 0) + 1;
    return acc;
  }, {});
}

function calculateErrorRates(commands: any[]) {
  const errorTypes = commands
    .filter(c => c.status === 'error')
    .reduce((acc, cmd) => {
      const errorType = cmd.error?.split(':')[0] || 'unknown';
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {});

  return {
    types: errorTypes,
    total: Object.values(errorTypes).reduce((a: number, b: number) => a + b, 0)
  };
}

function aggregateKnowledgeTypes(events: any[]) {
  return events.reduce((acc, event) => {
    const type = event.event_data?.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
}

function analyzeKnowledgeSharing(events: any[]) {
  const sharingEvents = events.filter(e => e.event_type === 'knowledge_share');
  return {
    total_shares: sharingEvents.length,
    sharing_patterns: aggregateSharePatterns(sharingEvents)
  };
}

function analyzeAccessPatterns(events: any[]) {
  return events.reduce((acc, event) => {
    const accessLevel = event.event_data?.access_level || 'unknown';
    acc[accessLevel] = (acc[accessLevel] || 0) + 1;
    return acc;
  }, {});
}

function aggregateErrorRates(agents: any[]) {
  return {
    total_errors: agents.reduce((sum, a) => sum + (a.error_count || 0), 0),
    by_agent: agents.reduce((acc, a) => {
      acc[a.id] = a.error_count || 0;
      return acc;
    }, {})
  };
}

function aggregateResourceUsage(agents: any[]) {
  return agents.reduce((acc, agent) => {
    const resources = agent.resource_utilization || {};
    Object.entries(resources).forEach(([key, value]) => {
      acc[key] = (acc[key] || []).concat(value);
    });
    return acc;
  }, {});
}

function analyzePerformanceTrends(agents: any[]) {
  return agents.reduce((acc, agent) => {
    const metrics = agent.performance_metrics || {};
    Object.entries(metrics).forEach(([key, value]) => {
      acc[key] = (acc[key] || []).concat(value);
    });
    return acc;
  }, {});
}

function aggregateTimeSeriesData(data: any[], timeField: string) {
  const timePoints = data.map(d => new Date(d[timeField]).getTime());
  const minTime = Math.min(...timePoints);
  const maxTime = Math.max(...timePoints);
  const interval = Math.max(Math.floor((maxTime - minTime) / 50), 60000); // min 1 minute intervals

  return data.reduce((acc: any[], item) => {
    const time = new Date(item[timeField]).getTime();
    const bucket = Math.floor((time - minTime) / interval);
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, []);
}

function identifyActivityPatterns(commands: any[], auditLog: any[]) {
  const allEvents = [
    ...commands.map(c => ({ time: new Date(c.started_at).getTime(), type: 'command' })),
    ...auditLog.map(e => ({ time: new Date(e.created_at).getTime(), type: e.event_type }))
  ].sort((a, b) => a.time - b.time);

  return analyzeEventSequences(allEvents);
}

function analyzeEventSequences(events: any[]) {
  const sequences: { [key: string]: number } = {};
  for (let i = 0; i < events.length - 1; i++) {
    const seq = `${events[i].type}->${events[i + 1].type}`;
    sequences[seq] = (sequences[seq] || 0) + 1;
  }
  return sequences;
}

function aggregateSharePatterns(events: any[]) {
  return events.reduce((acc, event) => {
    const pattern = `${event.event_data?.source_type}->${event.event_data?.target_type}`;
    acc[pattern] = (acc[pattern] || 0) + 1;
    return acc;
  }, {});
}
