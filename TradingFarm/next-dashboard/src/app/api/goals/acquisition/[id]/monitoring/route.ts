import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';

// Handler for GET requests - fetch monitoring events for a specific acquisition goal
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
    
    // Verify the goal belongs to the user before fetching monitoring events
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
    
    // Fetch monitoring events for the goal
    const { data: events, error: eventsError } = await supabase
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
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });
    
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

// Handler for POST requests - create a new monitoring event for a specific acquisition goal
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
    
    // Verify the goal belongs to the user before creating monitoring event
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id, status, farm_id')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single();
    
    if (goalError || !goal) {
      return NextResponse.json(
        { error: 'Goal not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Check if goal is in a valid state for recording monitoring events
    if (goal.status === 'FAILED') {
      return NextResponse.json(
        { error: 'Cannot add monitoring events to failed goals' },
        { status: 400 }
      );
    }
    
    // Validate monitoring event data
    const { 
      agent_id, 
      event_type, 
      event_data,
      severity = 'INFO' 
    } = requestData;
    
    if (!agent_id || !event_type) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_id, event_type' },
        { status: 400 }
      );
    }
    
    // Validate event type
    const validEventTypes = [
      'PLANNING_STARTED',
      'STRATEGY_PROPOSED',
      'STRATEGY_SELECTED',
      'EXECUTION_STARTED',
      'TRANSACTION_CONFIRMED',
      'TRANSACTION_FAILED',
      'MARKET_UPDATE',
      'ADAPTATION_STARTED',
      'GOAL_COMPLETED'
    ];
    
    if (!validEventTypes.includes(event_type)) {
      return NextResponse.json(
        { error: 'Invalid event_type. Must be one of: ' + validEventTypes.join(', ') },
        { status: 400 }
      );
    }
    
    // Validate severity
    const validSeverities = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid severity. Must be one of: ' + validSeverities.join(', ') },
        { status: 400 }
      );
    }
    
    const eventData = {
      goal_id: goalId,
      farm_id: goal.farm_id,
      agent_id,
      event_type,
      event_data,
      severity
    };
    
    // Create the new monitoring event
    const { data: newEvent, error: createError } = await supabase
      .from('goal_monitoring')
      .insert(eventData)
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
      console.error('Error creating monitoring event:', createError);
      return NextResponse.json(
        { error: 'Failed to create monitoring event' },
        { status: 500 }
      );
    }
    
    // Special handling for certain event types
    let updatedGoal = null;
    
    // If the event is GOAL_COMPLETED, update the goal status
    if (event_type === 'GOAL_COMPLETED' && goal.status !== 'COMPLETED') {
      const { data: goalUpdate, error: updateError } = await supabase
        .from('goals')
        .update({ status: 'COMPLETED' })
        .eq('id', goalId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating goal status:', updateError);
      } else {
        updatedGoal = goalUpdate;
      }
    }
    
    return NextResponse.json({
      data: newEvent,
      goal: updatedGoal
    }, { status: 201 });
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
