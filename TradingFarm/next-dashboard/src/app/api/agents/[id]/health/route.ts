/**
 * API Route: GET /api/agents/[id]/health
 * Returns health metrics for a specific agent
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/utils/supabase/server';
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
    
    // Trigger health monitoring to update metrics before returning them
    await AgentMonitoringService.monitorAgentHealth(agentId);
    
    // Get current health metrics
    const healthMetrics = await AgentMonitoringService.getAgentHealth(agentId);
    
    if (!healthMetrics) {
      return NextResponse.json({ error: 'Agent health metrics not found' }, { status: 404 });
    }
    
    // Get agent details
    const supabase = await createServerClient();
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('name, status, created_at')
      .eq('id', agentId)
      .single();
      
    if (agentError) {
      console.error('Error fetching agent details:', agentError);
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    // Calculate additional metrics
    const createdAt = new Date(agent.created_at);
    const totalLifetimeHours = Math.round((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
    
    // Get historical uptime data for a chart
    const { data: historicalHealth, error: historicalError } = await supabase
      .from('agent_health_metrics')
      .select('uptime_seconds, health_check_timestamp, status')
      .eq('agent_id', agentId)
      .order('health_check_timestamp', { ascending: true })
      .limit(48); // Last 48 data points
    
    const uptimeHistory = historicalHealth?.map(record => ({
      timestamp: record.health_check_timestamp,
      uptimeSeconds: record.uptime_seconds,
      status: record.status
    })) || [];
    
    // Format response with combined data
    const response = {
      agent: {
        id: agentId,
        name: agent.name,
        status: agent.status,
        createdAt: agent.created_at,
        totalLifetimeHours
      },
      currentHealth: healthMetrics,
      uptimeHistory,
      uptimePercentage: totalLifetimeHours > 0 
        ? Math.min(100, Math.round((healthMetrics.uptimeSeconds / (totalLifetimeHours * 3600)) * 100)) 
        : 0
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching agent health:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agent health' },
      { status: 500 }
    );
  }
}
