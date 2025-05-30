import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

// GET /api/goals - List goals with filtering options
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const goalType = searchParams.get('goalType');
    const farmId = searchParams.get('farmId');
    const agentId = searchParams.get('agentId');
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const includeCompleted = searchParams.get('includeCompleted') === 'true';
    const parentGoalId = searchParams.get('parentGoalId');

    // Build query
    let query = supabase
      .from('goals')
      .select(`
        *,
        farm:farms(id, name),
        agent:agents(id, name),
        parent:goals!goals_parent_goal_id_fkey(id, name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    } else if (!includeCompleted) {
      query = query.neq('status', 'completed');
    }

    if (goalType) {
      query = query.eq('goal_type', goalType);
    }

    if (farmId) {
      query = query.eq('farm_id', farmId);
    }

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    if (parentGoalId) {
      query = query.eq('parent_goal_id', parentGoalId);
    } else if (parentGoalId === 'null') {
      query = query.is('parent_goal_id', null);
    }

    if (!includeArchived) {
      query = query.eq('archived', false);
    }

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching goals:', error);
      return NextResponse.json(
        { error: 'Error fetching goals' }, 
        { status: 500 }
      );
    }

    // Transform data for frontend
    const mappedGoals = data.map(goal => ({
      ...goal,
      farm_name: goal.farm?.name,
      agent_name: goal.agent?.name,
      parent: goal.parent,
    }));

    return NextResponse.json(mappedGoals);
  } catch (error) {
    console.error('Error handling goals request:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// POST /api/goals - Create a new goal
export async function POST(request: NextRequest) {
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

    // Parse request body
    const goalData = await request.json();

    // Validate required fields
    if (!goalData.name || !goalData.goal_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name and goal_type are required' }, 
        { status: 400 }
      );
    }

    // Validate goal has associated entity
    if (!goalData.farm_id && !goalData.agent_id && !goalData.parent_goal_id) {
      return NextResponse.json(
        { error: 'Goal must be associated with a farm, agent, or parent goal' }, 
        { status: 400 }
      );
    }

    // Set initial status and other defaults
    const newGoal = {
      ...goalData,
      status: goalData.status || 'not_started',
      progress_percentage: goalData.progress_percentage || 0,
      current_value: goalData.current_value || 0,
      archived: false,
      metadata: goalData.metadata || {},
    };

    // Insert into database
    const { data, error } = await supabase
      .from('goals')
      .insert(newGoal)
      .select(`
        *,
        farm:farms(id, name),
        agent:agents(id, name),
        parent:goals!goals_parent_goal_id_fkey(id, name)
      `)
      .single();

    if (error) {
      console.error('Error creating goal:', error);
      return NextResponse.json(
        { error: 'Error creating goal: ' + error.message }, 
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

    // Create initial history entry
    if (data.current_value !== undefined && data.current_value !== null) {
      await supabase
        .from('goal_history')
        .insert({
          goal_id: data.id,
          value: data.current_value,
          progress_percentage: data.progress_percentage,
          recorded_at: new Date().toISOString(),
          metadata: {},
        });
    }

    return NextResponse.json(mappedGoal, { status: 201 });
  } catch (error) {
    console.error('Error handling goal creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 