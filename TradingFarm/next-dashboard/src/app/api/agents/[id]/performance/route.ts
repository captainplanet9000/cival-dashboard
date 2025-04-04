/**
 * API Route: GET /api/agents/[id]/performance
 * Returns performance metrics for a specific agent
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
    const { searchParams } = new URL(request.url);
    
    // Parse timeframe parameter
    const timeframe = (searchParams.get('timeframe') || 'daily') as 'daily' | 'weekly' | 'monthly';
    
    // Calculate performance metrics
    const currentMetrics = await AgentMonitoringService.calculatePerformanceMetrics(agentId, timeframe);
    
    // Get agent details
    const supabase = await createServerClient();
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('name, status')
      .eq('id', agentId)
      .single();
      
    if (agentError) {
      console.error('Error fetching agent details:', agentError);
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    // Get historical performance data for trends
    const now = new Date();
    const pastDate = new Date();
    
    // Determine how far back to look based on timeframe
    switch (timeframe) {
      case 'daily':
        pastDate.setDate(pastDate.getDate() - 7); // Last 7 days
        break;
      case 'weekly':
        pastDate.setDate(pastDate.getDate() - 28); // Last 4 weeks
        break;
      case 'monthly':
        pastDate.setMonth(pastDate.getMonth() - 6); // Last 6 months
        break;
    }
    
    // Query historical performance data
    const { data: historicalData, error: historyError } = await supabase
      .from('agent_performance_metrics')
      .select('*')
      .eq('agent_id', agentId)
      .gte('timestamp', pastDate.toISOString())
      .lte('timestamp', now.toISOString())
      .order('timestamp', { ascending: true });
      
    if (historyError) {
      console.error('Error fetching historical performance:', historyError);
    }
    
    // Format historical data for charts
    const performanceHistory = {
      labels: [] as string[],
      successRate: [] as number[],
      responseTime: [] as number[],
      errorRate: [] as number[],
      overallScore: [] as number[]
    };
    
    // If we have historical data, format it for charts
    if (historicalData && historicalData.length > 0) {
      historicalData.forEach(record => {
        // Format date based on timeframe
        let dateLabel = '';
        const date = new Date(record.timestamp);
        
        switch (timeframe) {
          case 'daily':
            dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            break;
          case 'weekly':
            dateLabel = `Week ${Math.ceil(date.getDate() / 7)} - ${date.toLocaleDateString(undefined, { month: 'short' })}`;
            break;
          case 'monthly':
            dateLabel = date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
            break;
        }
        
        performanceHistory.labels.push(dateLabel);
        performanceHistory.successRate.push(record.metrics.successRate || 0);
        performanceHistory.responseTime.push(record.metrics.averageResponseTime || 0);
        performanceHistory.errorRate.push(record.metrics.errorRate || 0);
        performanceHistory.overallScore.push(record.metrics.overallScore || 0);
      });
    } else {
      // If no historical data, use current metrics as the only data point
      const now = new Date();
      const dateLabel = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      performanceHistory.labels.push(dateLabel);
      performanceHistory.successRate.push(currentMetrics.successRate);
      performanceHistory.responseTime.push(currentMetrics.averageResponseTime);
      performanceHistory.errorRate.push(currentMetrics.errorRate);
      performanceHistory.overallScore.push(currentMetrics.overallScore);
    }
    
    // Store current metrics in the database for future reference
    await supabase
      .from('agent_performance_metrics')
      .upsert({
        agent_id: agentId,
        user_id: session.user.id,
        timestamp: now.toISOString(),
        timeframe,
        metrics: currentMetrics
      }, {
        onConflict: 'agent_id,timestamp,timeframe'
      });
    
    return NextResponse.json({
      agent: {
        id: agentId,
        name: agent.name,
        status: agent.status
      },
      currentMetrics,
      performanceHistory
    });
  } catch (error: any) {
    console.error('Error fetching agent performance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agent performance' },
      { status: 500 }
    );
  }
}
