import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

// GET /api/goals/:id/history - Get goal history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create server supabase client
    const supabase = await createServerClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const goalId = params.id;
    
    // Get query parameters for pagination
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
    const sortOrder = request.nextUrl.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Validate the goal exists
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id')
      .eq('id', goalId)
      .single();

    if (goalError) {
      console.error('Error fetching goal:', goalError);
      return NextResponse.json(
        { error: 'Goal not found' }, 
        { status: 404 }
      );
    }

    // Fetch history entries
    const { data, error, count } = await supabase
      .from('goal_history')
      .select('*', { count: 'exact' })
      .eq('goal_id', goalId)
      .order('recorded_at', { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching goal history:', error);
      return NextResponse.json(
        { error: 'Error fetching goal history' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count !== null && offset + limit < count
      }
    });
  } catch (error) {
    console.error('Error handling goal history request:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// POST /api/goals/:id/history - Add history entry
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create server supabase client
    const supabase = await createServerClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const goalId = params.id;
    const entryData = await request.json();

    // Validate required fields
    if (entryData.value === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: value' }, 
        { status: 400 }
      );
    }

    // Validate the goal exists and get the current progress
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, target_value, progress_percentage')
      .eq('id', goalId)
      .single();

    if (goalError) {
      console.error('Error fetching goal:', goalError);
      return NextResponse.json(
        { error: 'Goal not found' }, 
        { status: 404 }
      );
    }

    // Calculate progress percentage if not provided
    let progressPercentage = entryData.progress_percentage;
    if (progressPercentage === undefined && goal.target_value) {
      progressPercentage = (entryData.value / goal.target_value) * 100;
      // Ensure it doesn't exceed 100%
      progressPercentage = Math.min(100, Math.max(0, progressPercentage));
    } else if (progressPercentage === undefined) {
      // If no target value and no progress provided, use current progress
      progressPercentage = goal.progress_percentage || 0;
    }

    // Prepare history entry
    const historyEntry = {
      goal_id: goalId,
      value: entryData.value,
      progress_percentage: progressPercentage,
      recorded_at: entryData.recorded_at || new Date().toISOString(),
      metadata: entryData.metadata || {},
    };

    // Insert history entry
    const { data, error } = await supabase
      .from('goal_history')
      .insert(historyEntry)
      .select()
      .single();

    if (error) {
      console.error('Error creating history entry:', error);
      return NextResponse.json(
        { error: 'Error creating history entry: ' + error.message }, 
        { status: 500 }
      );
    }

    // Update goal's current value and progress
    const { error: updateError } = await supabase
      .from('goals')
      .update({
        current_value: entryData.value,
        progress_percentage: progressPercentage,
        updated_at: new Date().toISOString()
      })
      .eq('id', goalId);

    if (updateError) {
      console.error('Error updating goal:', updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error handling history creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 