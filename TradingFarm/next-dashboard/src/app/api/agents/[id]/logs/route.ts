/**
 * API Route: GET /api/agents/[id]/logs
 * Returns log entries for a specific agent with filtering options
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AgentMonitoringService } from '@/services/agent-monitoring-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const agentId = params.id;
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const logLevel = searchParams.get('level') as 'info' | 'warning' | 'error' | 'debug' | undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const source = searchParams.get('source') || undefined;
    
    // Get agent logs with filters
    const logs = await AgentMonitoringService.getAgentLogs(agentId, {
      limit,
      offset,
      logLevel,
      startDate,
      endDate,
      source
    });
    
    // Get total count for pagination
    const totalLogs = await AgentMonitoringService.getAgentLogCount(agentId, {
      logLevel,
      startDate,
      endDate,
      source
    });
    
    // Get log level distribution for charts
    const logLevelDistribution = await AgentMonitoringService.getLogLevelDistribution(agentId, {
      startDate,
      endDate
    });
    
    // Get log sources for filtering options
    const logSources = await AgentMonitoringService.getLogSources(agentId);
    
    return NextResponse.json({
      logs,
      metadata: {
        total: totalLogs,
        limit,
        offset,
        logLevelDistribution,
        logSources
      }
    });
  } catch (error: any) {
    console.error('Error fetching agent logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agent logs' },
      { status: 500 }
    );
  }
}
