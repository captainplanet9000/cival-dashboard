/**
 * WebSocket Metrics API Routes
 * 
 * Handles API operations for WebSocket connection metrics retrieval.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

/**
 * GET handler to retrieve WebSocket connection metrics
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(req.url);
    
    // Get filter parameters
    const connectionId = searchParams.get('connection_id');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string, 10) : 100;
    
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Missing required parameter: connection_id' },
        { status: 400 }
      );
    }
    
    // Build the query
    let query = supabase
      .from('websocket_connection_metrics')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ metrics: data });
  } catch (error) {
    console.error('Error retrieving WebSocket metrics:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve WebSocket metrics' },
      { status: 500 }
    );
  }
}

/**
 * GET handler to retrieve aggregated metrics for dashboard displays
 */
export async function getAggregatedMetrics(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(req.url);
    
    // Get filter parameters
    const userId = searchParams.get('user_id');
    const exchange = searchParams.get('exchange');
    const period = searchParams.get('period') || '24h'; // Default to last 24 hours
    
    // Determine time range based on period
    let timeRange: string;
    switch (period) {
      case '1h':
        timeRange = '1 hour';
        break;
      case '6h':
        timeRange = '6 hours';
        break;
      case '12h':
        timeRange = '12 hours';
        break;
      case '7d':
        timeRange = '7 days';
        break;
      case '30d':
        timeRange = '30 days';
        break;
      case '24h':
      default:
        timeRange = '24 hours';
        break;
    }
    
    // Execute a raw SQL query for aggregated metrics
    // This uses the SQL function we created in the migration file
    const { data, error } = await supabase.rpc('get_connection_metrics_summary', {
      p_user_id: userId,
      p_exchange: exchange,
      p_time_range: timeRange
    });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      metrics: data,
      period
    });
  } catch (error) {
    console.error('Error retrieving aggregated WebSocket metrics:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve aggregated WebSocket metrics' },
      { status: 500 }
    );
  }
}
