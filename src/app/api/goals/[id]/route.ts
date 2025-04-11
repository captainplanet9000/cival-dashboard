import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

// GET /api/goals/:id - Get a single goal
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
    const includeHistory = request.nextUrl.searchParams.get('includeHistory') === 'true';
    const includeSubgoals = request.nextUrl.searchParams.get('includeSubgoals') === 'true';

    // Fetch goal with related entities
    const { data: goal, error } = await supabase
      .from('goals')
      .select(`
        *,
        farm:farms(id, name),
        agent:agents(id, name),
        parent:goals!goals_parent_goal_id_fkey(id, name)
      `)
      .eq('id', goalId)
      .single();

    if (error) {
      console.error('Error fetching goal:', error);
      return NextResponse.json(
        { error: 'Error fetching goal' }, 
        { status: 500 }
      );
    }

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' }, 
        { status: 404 }
      );
    }

    // Transform data for frontend
    const mappedGoal = {
      ...goal,
      farm_name: goal.farm?.name,
      agent_name: goal.agent?.name,
      parent: goal.parent,
    };

    // Optionally fetch history
    if (includeHistory) {
      const { data: history, error: historyError } = await supabase
        .from('goal_history')
        .select('*')
        .eq('goal_id', goalId)
        .order('recorded_at', { ascending: false });

      if (historyError) {
        console.error('Error fetching goal history:', historyError);
      } else {
        mappedGoal.history = history;
      }
    }

    // Optionally fetch subgoals
    if (includeSubgoals) {
      const { data: subgoals, error: subgoalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('parent_goal_id', goalId)
        .order('created_at', { ascending: false });

      if (subgoalsError) {
        console.error('Error fetching subgoals:', subgoalsError);
      } else {
        mappedGoal.subgoals = subgoals;
      }
    }

    return NextResponse.json(mappedGoal);
  } catch (error) {
    console.error('Error handling goal request:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// PATCH /api/goals/:id - Update a goal
export async function PATCH(
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
    const updateData = await request.json();

    // Validate the goal exists
    const { data: existingGoal, error: fetchError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (fetchError) {
      console.error('Error fetching goal for update:', fetchError);
      return NextResponse.json(
        { error: 'Goal not found' }, 
        { status: 404 }
      );
    }

    // Update goal
    const { data, error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', goalId)
      .select(`
        *,
        farm:farms(id, name),
        agent:agents(id, name),
        parent:goals!goals_parent_goal_id_fkey(id, name)
      `)
      .single();

    if (error) {
      console.error('Error updating goal:', error);
      return NextResponse.json(
        { error: 'Error updating goal: ' + error.message }, 
        { status: 500 }
      );
    }

    // Transform data for frontend
    const mappedGoal = {
      ...data,
      farm_name: data.farm?.name,
      agent_name: data.agent?.name,
      parent: data.parent,
    };

    // Create history entry if current_value is updated
    if (
      updateData.current_value !== undefined && 
      updateData.current_value !== null && 
      updateData.current_value !== existingGoal.current_value
    ) {
      await supabase
        .from('goal_history')
        .insert({
          goal_id: goalId,
          value: updateData.current_value,
          progress_percentage: updateData.progress_percentage || existingGoal.progress_percentage,
          recorded_at: new Date().toISOString(),
          metadata: {},
        });
    }

    return NextResponse.json({ data: mappedGoal });
  } catch (error) {
    console.error('Error handling goal update:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/goals/:id - Delete a goal
export async function DELETE(
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

    // Check for subgoals
    const { data: subgoals, error: subgoalsError } = await supabase
      .from('goals')
      .select('id')
      .eq('parent_goal_id', goalId);

    if (subgoalsError) {
      console.error('Error checking for subgoals:', subgoalsError);
      return NextResponse.json(
        { error: 'Error checking for subgoals' }, 
        { status: 500 }
      );
    }

    if (subgoals && subgoals.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete goal with subgoals. Please delete subgoals first or unlink them.' }, 
        { status: 400 }
      );
    }

    // Delete goal history first
    const { error: historyError } = await supabase
      .from('goal_history')
      .delete()
      .eq('goal_id', goalId);

    if (historyError) {
      console.error('Error deleting goal history:', historyError);
      return NextResponse.json(
        { error: 'Error deleting goal history' }, 
        { status: 500 }
      );
    }

    // Delete goal
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      console.error('Error deleting goal:', error);
      return NextResponse.json(
        { error: 'Error deleting goal: ' + error.message }, 
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Goal deleted successfully' }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('Error handling goal deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 