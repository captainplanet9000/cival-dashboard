/**
 * API Route: GET /api/agents/compare
 * Returns comparison data for multiple agents
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/utils/supabase/server';
import { AgentMonitoringService } from '@/services/agent-monitoring-service';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    
    // Get agent IDs from query params
    const agentIds = searchParams.get('ids')?.split(',') || [];
    const timeframe = (searchParams.get('timeframe') || 'weekly') as 'daily' | 'weekly' | 'monthly';
    
    if (agentIds.length === 0) {
      return NextResponse.json({ error: 'No agent IDs provided' }, { status: 400 });
    }
    
    if (agentIds.length > 5) {
      return NextResponse.json(
        { error: 'Too many agents requested. Maximum 5 agents can be compared at once' },
        { status: 400 }
      );
    }
    
    // Get comparison data
    const comparisonData = await AgentMonitoringService.compareAgentPerformance(
      agentIds,
      timeframe
    );
    
    // Get additional agent details
    const supabase = await createServerClient();
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, status, created_at')
      .in('id', agentIds);
      
    if (agentsError) {
      console.error('Error fetching agent details:', agentsError);
      return NextResponse.json({ error: 'Failed to fetch agent details' }, { status: 500 });
    }
    
    // Get agent health data for each agent
    const healthData = await Promise.all(
      agentIds.map(async (agentId) => {
        const health = await AgentMonitoringService.getAgentHealth(agentId);
        return {
          agentId,
          health
        };
      })
    );
    
    // Combine all data for response
    const response = {
      comparisonData,
      agentDetails: agents.map(agent => {
        const health = healthData.find(h => h.agentId === agent.id)?.health;
        
        return {
          id: agent.id,
          name: agent.name,
          status: agent.status,
          createdAt: agent.created_at,
          health: health ? {
            status: health.status,
            uptime: health.uptimeSeconds,
            lastActive: health.lastActive,
            performanceScore: health.performanceScore
          } : null
        };
      })
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error comparing agents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to compare agents' },
      { status: 500 }
    );
  }
}
