import { NextResponse } from 'next/server';
import { dashboardService } from '../../../data-access/services';

/**
 * GET /api/dashboard
 * Returns the main dashboard summary for the user
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get('userId') || '1'); // Default to user ID 1 if not provided
    
    const dashboardData = await dashboardService.getDashboardSummary(userId);
    
    return NextResponse.json({ data: dashboardData });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
} 