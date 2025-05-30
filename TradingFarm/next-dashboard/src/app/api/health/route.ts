/**
 * Health Check API endpoint
 * Used by monitoring services to verify application status
 */
import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

/**
 * Health check response structure
 */
interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'unavailable';
  version: string;
  timestamp: string;
  services: {
    api: {
      status: 'ok' | 'degraded' | 'unavailable';
      latency?: number;
    };
    database: {
      status: 'ok' | 'degraded' | 'unavailable';
      latency?: number;
    };
  };
  uptime: number;
}

/**
 * GET handler for health check endpoint
 */
export async function GET() {
  const startTime = Date.now();
  const version = process.env.npm_package_version || '1.0.0';
  const startupTime = process.uptime();
  
  try {
    // Check database connectivity
    let dbStatus: 'ok' | 'degraded' | 'unavailable' = 'unavailable';
    let dbLatency: number | undefined = undefined;
    
    try {
      const dbStartTime = Date.now();
      const supabase = createServerClient();
      const { data, error } = await supabase.from('health_checks').select('created_at').limit(1);
      
      if (error) throw error;
      
      dbLatency = Date.now() - dbStartTime;
      dbStatus = 'ok';
    } catch (error) {
      console.error('Database health check failed:', error);
      dbStatus = 'unavailable';
    }
    
    // Determine overall status
    const overallStatus: 'ok' | 'degraded' | 'unavailable' = 
      dbStatus === 'unavailable' ? 'degraded' : 'ok';
    
    // Build response
    const healthCheck: HealthCheckResponse = {
      status: overallStatus,
      version,
      timestamp: new Date().toISOString(),
      services: {
        api: {
          status: 'ok',
          latency: Date.now() - startTime,
        },
        database: {
          status: dbStatus,
          latency: dbLatency,
        },
      },
      uptime: startupTime,
    };
    
    return NextResponse.json(healthCheck, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unavailable',
      version,
      timestamp: new Date().toISOString(),
      services: {
        api: {
          status: 'unavailable',
        },
        database: {
          status: 'unavailable',
        },
      },
      uptime: startupTime,
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
}
