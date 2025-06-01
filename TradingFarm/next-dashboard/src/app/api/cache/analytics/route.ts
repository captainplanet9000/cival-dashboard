import { NextRequest, NextResponse } from 'next/server';
import { getCacheStats, getDailyCacheStats } from '@/services/redis-service';

/**
 * Cache Analytics API endpoint
 * GET /api/cache/analytics - Get current cache statistics
 * GET /api/cache/analytics?daily=true - Get daily cache statistics
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const daily = url.searchParams.get('daily') === 'true';
    const days = parseInt(url.searchParams.get('days') || '7', 10);
    
    let data;
    if (daily) {
      data = await getDailyCacheStats(days);
    } else {
      data = await getCacheStats();
    }
    
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting cache analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve cache analytics'
      },
      { status: 500 }
    );
  }
}
