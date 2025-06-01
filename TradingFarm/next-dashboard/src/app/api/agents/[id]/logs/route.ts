/**
 * API Route: GET /api/agents/[id]/logs
 * Returns log entries for a specific agent with filtering options
 */
import { NextResponse } from 'next/server';
// Using stub implementation for next-auth
import { getServerSession } from '@/lib/next-auth-stubs';
import { AgentMonitoringService } from '@/services/agent-monitoring-service';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and agent ID
    const agentId = params.id;
    
    // Get query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const logLevel = searchParams.get('level') || undefined;
    const startDate = searchParams.get('start') || undefined;
    const endDate = searchParams.get('end') || undefined;
    const source = searchParams.get('source') || undefined;
    
    // Build filters
    const filters = {
      limit,
      offset,
      logLevel,
      startDate,
      endDate,
      source
    };
    
    // Get logs data
    const logsData = await AgentMonitoringService.getAgentLogs(agentId, filters);
    
    // Since some methods may not be available, we'll create our own implementations
    const totalCount = logsData.length;
    
    // Create log level distribution
    const logLevels = {
      error: 0,
      warn: 0,
      info: 0,
      debug: 0,
      trace: 0
    };
    
    // Count log levels from the logs we fetched
    logsData.forEach(log => {
      if (log.level && logLevels[log.level] !== undefined) {
        logLevels[log.level]++;
      }
    });
    
    // Get log sources
    const sourceMap = new Map();
    
    // Count sources from the logs we fetched
    logsData.forEach(log => {
      if (log.source) {
        sourceMap.set(log.source, (sourceMap.get(log.source) || 0) + 1);
      }
    });
    
    const logSources = Array.from(sourceMap.entries()).map(([source, count]) => ({
      source,
      count
    }));
    
    return new NextResponse(
      JSON.stringify({
        logs: logsData,
        metadata: {
          total: totalCount,
          limit,
          offset,
          logLevelDistribution: logLevels,
          logSources
        }
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting agent logs:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch agent logs' }),
      { status: 500 }
    );
  }
}
