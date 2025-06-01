import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';

// Handler for GET requests - fetch strategies for a specific acquisition goal
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const goalId = params.id;
    
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
    
    // Verify the goal belongs to the user before fetching strategies
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
    
    // Fetch strategies for the goal
    const { data: strategies, error: strategiesError } = await supabase
      .from('goal_strategies')
      .select(`
        *,
        agent:agent_id (
          id,
          name,
          type,
          role
        )
      `)
      .eq('goal_id', goalId)
      .order('proposed_at', { ascending: false });
    
    if (strategiesError) {
      console.error('Error fetching strategies:', strategiesError);
      return NextResponse.json(
        { error: 'Failed to fetch strategies' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data: strategies });
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler for POST requests - create a new strategy for a specific acquisition goal
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const goalId = params.id;
    const requestData = await request.json();
    
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
    
    // Verify the goal belongs to the user before creating strategy
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, status')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single();
    
    if (goalError || !goal) {
      return NextResponse.json(
        { error: 'Goal not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Check if goal is in a valid state for strategy creation
    if (goal.status === 'COMPLETED' || goal.status === 'FAILED') {
      return NextResponse.json(
        { error: 'Cannot add strategy to completed or failed goal' },
        { status: 400 }
      );
    }
    
    // Validate strategy data
    const { 
      agent_id, 
      strategy_type, 
      parameters, 
      is_active = false 
    } = requestData;
    
    if (!agent_id || !strategy_type) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_id, strategy_type' },
        { status: 400 }
      );
    }
    
    const strategyData = {
      goal_id: goalId,
      agent_id,
      strategy_type,
      parameters,
      is_active,
      proposed_at: new Date().toISOString(),
      selected_at: is_active ? new Date().toISOString() : null
    };
    
    // If this strategy is active, set all others to inactive
    if (is_active) {
      const { error: updateError } = await supabase
        .from('goal_strategies')
        .update({ is_active: false })
        .eq('goal_id', goalId);
      
      if (updateError) {
        console.error('Error updating existing strategies:', updateError);
        return NextResponse.json(
          { error: 'Failed to update existing strategies' },
          { status: 500 }
        );
      }
    }
    
    // Create the new strategy
    const { data: newStrategy, error: createError } = await supabase
      .from('goal_strategies')
      .insert(strategyData)
      .select(`
        *,
        agent:agent_id (
          id,
          name,
          type,
          role
        )
      `)
      .single();
    
    if (createError) {
      console.error('Error creating strategy:', createError);
      return NextResponse.json(
        { error: 'Failed to create strategy' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data: newStrategy }, { status: 201 });
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
