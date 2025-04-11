import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { MonitoringService } from '@/services/monitoring-service';

/**
 * Time window conversion helper
 */
const getTimeWindowInMinutes = (timeRange: string): number => {
  switch (timeRange) {
    case '1h': return 60;
    case '6h': return 360;
    case '12h': return 720;
    case '24h': return 1440;
    case '7d': return 10080;
    case '30d': return 43200;
    default: return 1440; // Default to 24h
  }
};

/**
 * Retrieves agent metrics history with server-side aggregation
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const granularity = searchParams.get('granularity') || 'minute';
    
    const supabase = await createServerClient();
    
    // Calculate time boundaries
    const nowDate = new Date();
    const timeWindowMinutes = getTimeWindowInMinutes(timeRange);
    const startDate = new Date(nowDate.getTime() - (timeWindowMinutes * 60 * 1000));
    
    // Log request for monitoring
    await MonitoringService.logSystemEvent(
      'system.startup', // Using a valid event type from MonitoringEventType
      `Metrics history requested for agent ${params.id}`,
      { timeRange, granularity, agentId: params.id },
      'info',
      true
    );
    
    // Server-side aggregation based on granularity
    if (granularity === 'minute' || granularity === 'raw') {
      // For minute-level data or raw data, directly query the table
      // but still limit results based on the time range
      const { data, error } = await supabase
        .from('agent_metrics_history')
        .select('*')
        .eq('agent_id', params.id)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });
      
      if (error) {
        console.error('Error fetching metrics history:', error);
        await MonitoringService.logSystemEvent(
          'system.error',
          `Failed to fetch metrics history for agent ${params.id}`,
          { error: error.message, details: error },
          'error',
          true
        );
        
        return NextResponse.json(
          { error: 'Failed to fetch metrics history' },
          { status: 500 }
        );
      }
      
      if (!data || data.length === 0) {
        return NextResponse.json({ data: [] });
      }
      
      return NextResponse.json({ data });
    } else {
      // For hourly or daily aggregation, use database functions
      // This assumes you've created PostgreSQL functions for aggregation
      const aggregationFunction = granularity === 'hour' 
        ? 'get_hourly_agent_metrics' 
        : 'get_daily_agent_metrics';
      
      const { data, error } = await supabase.rpc(
        aggregationFunction,
        { 
          p_agent_id: params.id,
          p_start_time: startDate.toISOString(),
          p_end_time: nowDate.toISOString()
        }
      );
      
      if (error) {
        console.error(`Error fetching aggregated metrics (${granularity}):`, error);
        await MonitoringService.logSystemEvent(
          'system.error',
          `Failed to fetch aggregated metrics for agent ${params.id}`,
          { error: error.message, details: error, granularity },
          'error',
          true
        );
        
        // Try to fall back to raw data if aggregation fails
        const { data: rawData, error: rawError } = await supabase
          .from('agent_metrics_history')
          .select('*')
          .eq('agent_id', params.id)
          .gte('timestamp', startDate.toISOString())
          .order('timestamp', { ascending: false });
        
        if (rawError) {
          return NextResponse.json(
            { error: 'Failed to fetch metrics history' },
            { status: 500 }
          );
        }
        
        // Return raw data with a warning
        return NextResponse.json({ 
          data: rawData || [], 
          warning: 'Server-side aggregation failed, using raw data instead'
        });
      }
      
      return NextResponse.json({ data: data || [] });
    }
  } catch (error) {
    console.error('Error in metrics history endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await MonitoringService.logSystemEvent(
      'system.error',
      'Exception in metrics history API endpoint',
      { error: errorMessage, agentId: params.id },
      'error',
      true
    );
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
