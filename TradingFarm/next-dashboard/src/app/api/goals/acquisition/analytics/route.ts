import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';
import { goalAnalyticsService } from '@/services/goal-analytics-service';

/**
 * API endpoint for retrieving analytics for a goal acquisition
 * GET /api/goals/acquisition/analytics?goal_id=<goal_id>
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const goalId = searchParams.get('goal_id');
    
    if (!goalId) {
      return NextResponse.json(
        { error: 'Missing required parameter: goal_id' },
        { status: 400 }
      );
    }
    
    // Create server client with cookies
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify goal ownership
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single();
    
    if (goalError || !goal) {
      return NextResponse.json(
        { error: 'Goal not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Get analytics from service
    const { data: analytics, error } = await goalAnalyticsService.getGoalAnalytics(goalId);
    
    if (error) {
      console.error('Error fetching goal analytics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch goal analytics' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data: analytics });
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
