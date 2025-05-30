/**
 * API Route: GET /api/agents/[id]/performance
 * Returns performance metrics for a specific agent
 */
import { NextResponse } from 'next/server';
// Using stub implementation for next-auth
import { getServerSession } from '@/lib/next-auth-stubs';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and agent ID
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const agentId = params.id;
    
    // Get query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const timeframe = searchParams.get('timeframe') || 'daily';
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
      
    if (agentError || !agent) {
      console.error('Error fetching agent:', agentError);
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    // Verify user has access to this agent
    if (agent.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access to agent' }, { status: 403 });
    }
    
    // Generate mock performance data (in a real app, this would come from the database)
    // Create sample metrics with a date range based on timeframe
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Go back 30 days
    
    const metrics = [];
    for (let i = 0; i < limit; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      metrics.push({
        id: i,
        agent_id: agentId,
        created_at: date.toISOString(),
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 1024,
        api_calls: Math.floor(Math.random() * 100),
        response_time: Math.random() * 1000,
        errors: Math.floor(Math.random() * 5)
      });
    }
    
    // Find most recent data point
    const latestMetric = metrics[metrics.length - 1];
    
    // Calculate summary metrics
    const summary = {
      cpu: {
        current: latestMetric ? parseFloat(latestMetric.cpu_usage.toFixed(2)) : 0,
        average: parseFloat((metrics.reduce((sum, m) => sum + m.cpu_usage, 0) / (metrics.length || 1)).toFixed(2)),
        peak: parseFloat((Math.max(...metrics.map(m => m.cpu_usage || 0))).toFixed(2))
      },
      memory: {
        current: latestMetric ? parseFloat(latestMetric.memory_usage.toFixed(2)) : 0,
        average: parseFloat((metrics.reduce((sum, m) => sum + m.memory_usage, 0) / (metrics.length || 1)).toFixed(2)),
        peak: parseFloat((Math.max(...metrics.map(m => m.memory_usage || 0))).toFixed(2))
      },
      apiCalls: metrics.reduce((sum, m) => sum + m.api_calls, 0)
    };
    
    // Get historical data for charts
    const timeSeriesData = metrics.map(metric => ({
      timestamp: new Date(metric.created_at).toISOString(),
      cpu: parseFloat(metric.cpu_usage.toFixed(2)),
      memory: parseFloat(metric.memory_usage.toFixed(2)),
      apiCalls: metric.api_calls,
      responseTime: metric.response_time,
      errors: metric.errors
    })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Create formatted time labels based on timeframe
    const labels = timeSeriesData.map(point => {
      const date = new Date(point.timestamp);
      switch (timeframe) {
        case 'daily':
          return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        case 'weekly':
          return `Week ${Math.ceil(date.getDate() / 7)} - ${date.toLocaleDateString(undefined, { month: 'short' })}`;
        case 'monthly':
          return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        default:
          return date.toLocaleDateString();
      }
    });
    
    // Create alerts from metrics with errors
    const alerts = metrics
      .filter(m => m.errors > 0)
      .slice(0, 5)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(m => ({
        timestamp: m.created_at,
        message: `Agent encountered ${m.errors} errors`,
        severity: m.errors > 2 ? 'high' : 'medium'
      }));
    
    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name || 'Unknown Agent',
        status: agent.status || 'unknown'
      },
      summary,
      timeSeriesData,
      labels,
      alerts
    });
  } catch (error: any) {
    console.error('Error fetching agent performance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}
