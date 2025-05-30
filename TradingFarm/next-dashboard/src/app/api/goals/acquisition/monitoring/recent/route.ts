import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';

// Handler for GET requests - fetch recent monitoring events across all goals
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number(searchParams.get('limit')) || 10;
    const farmId = searchParams.get('farm_id');
    
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
    
    // Build query
    let query = supabase
      .from('goal_monitoring')
      .select(`
        *,
        agent:agent_id (
          id,
          name,
          type,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Apply farm filter if specified
    if (farmId) {
      query = query.eq('farm_id', farmId);
    }
    
    // Execute query
    const { data: events, error: eventsError } = await query;
    
    if (eventsError) {
      console.error('Error fetching monitoring events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch monitoring events' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data: events });
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
