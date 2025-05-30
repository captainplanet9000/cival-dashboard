/**
 * API Route Handler for Performance Metrics
 * Stores and processes application performance data
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

// Process and store performance metrics
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { metrics, timestamp, userAgent, url } = await request.json();
    
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json(
        { error: 'Invalid metrics data provided' },
        { status: 400 }
      );
    }

    // Get user information if available
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    // Prepare batch of metrics for database insertion
    const metricsForDb = metrics.map((metric) => ({
      user_id: userId,
      metric_name: metric.name,
      metric_value: metric.value,
      metric_unit: metric.unit,
      timestamp: new Date(metric.timestamp).toISOString(),
      user_agent: userAgent,
      page_url: url,
    }));

    // Insert metrics into database
    const { error } = await supabase
      .from('performance_metrics')
      .insert(metricsForDb);

    if (error) {
      console.error('Error storing performance metrics:', error);
      
      // Still return success to client - we don't want to block the user experience
      // But log the error for monitoring
      return NextResponse.json(
        { success: true, message: 'Metrics received but storage failed' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Metrics stored successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to process performance metrics:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get aggregated performance metrics for analysis
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || '24h';
    const metricType = searchParams.get('metricType') || 'all';
    
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Check authorization
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Calculate time range based on timeframe parameter
    let timeAgo;
    const now = new Date();
    
    switch (timeframe) {
      case '1h':
        timeAgo = new Date(now.getTime() - (60 * 60 * 1000));
        break;
      case '6h':
        timeAgo = new Date(now.getTime() - (6 * 60 * 60 * 1000));
        break;
      case '24h':
      default:
        timeAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        break;
      case '7d':
        timeAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case '30d':
        timeAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
    }
    
    // Build query based on parameters
    let query = supabase
      .from('performance_metrics')
      .select('*')
      .gte('timestamp', timeAgo.toISOString());
    
    // Filter by metric type if specified
    if (metricType !== 'all') {
      query = query.like('metric_name', `${metricType}%`);
    }
    
    // Fetch data
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching performance metrics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      );
    }
    
    // Process and aggregate metrics
    const aggregatedMetrics = processMetrics(data, metricType);
    
    return NextResponse.json(
      { 
        success: true, 
        metrics: aggregatedMetrics,
        timeframe
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to get performance metrics:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to process and aggregate metrics
function processMetrics(metrics: any[], metricType: string) {
  // Group metrics by name
  const groupedMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.metric_name]) {
      acc[metric.metric_name] = [];
    }
    acc[metric.metric_name].push(metric);
    return acc;
  }, {});
  
  // Calculate aggregations for each metric group
  return Object.entries(groupedMetrics).map(([name, values]: [string, any[]]) => {
    // Calculate statistics
    const numValues = values.length;
    const numericValues = values.map(v => parseFloat(v.metric_value));
    const sum = numericValues.reduce((a, b) => a + b, 0);
    const avg = sum / numValues;
    const sorted = [...numericValues].sort((a, b) => a - b);
    const median = sorted[Math.floor(numValues / 2)];
    const p95 = sorted[Math.floor(numValues * 0.95)];
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    
    return {
      name,
      count: numValues,
      average: avg,
      median,
      p95,
      min,
      max,
      unit: values[0].metric_unit,
      // Include timestamps for time-series data
      timestamps: values.map(v => v.timestamp),
      values: numericValues
    };
  });
}
