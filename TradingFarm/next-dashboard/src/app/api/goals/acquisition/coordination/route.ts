import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';
import { agentCoordinationService } from '@/services/agent-coordination-service';

// Handler for GET requests - get coordination state for active goals
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const goalId = searchParams.get('goal_id');
    
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
    
    // If a specific goal ID is provided, verify ownership
    if (goalId) {
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
      
      // Get coordination state for the specific goal
      const coordinationState = agentCoordinationService.coordinationStates.get(goalId);
      
      if (!coordinationState) {
        return NextResponse.json(
          { error: 'No active coordination for this goal' },
          { status: 404 }
        );
      }
      
      // Get agents information to enhance the response
      let agentsInfo = {};
      const activeAgentIds = Object.keys(coordinationState.activeAgents);
      
      if (activeAgentIds.length > 0) {
        const { data: agents } = await supabase
          .from('agents')
          .select('id, name, type, role, status')
          .in('id', activeAgentIds);
        
        if (agents) {
          agentsInfo = agents.reduce((acc, agent) => ({
            ...acc,
            [agent.id]: agent
          }), {});
        }
      }
      
      return NextResponse.json({
        data: {
          ...coordinationState,
          agentsInfo
        }
      });
    } else {
      // Get all active goals for the user
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id, name, status')
        .eq('user_id', user.id)
        .in('status', ['ACTIVE', 'PAUSED']);
      
      if (goalsError) {
        console.error('Error fetching goals:', goalsError);
        return NextResponse.json(
          { error: 'Failed to fetch goals' },
          { status: 500 }
        );
      }
      
      // Get coordination states for all active goals
      const coordinationStates = {};
      
      for (const goal of goals) {
        const state = agentCoordinationService.coordinationStates.get(goal.id);
        if (state) {
          coordinationStates[goal.id] = {
            ...state,
            goalName: goal.name,
            status: goal.status
          };
        }
      }
      
      return NextResponse.json({
        data: coordinationStates
      });
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler for POST requests - trigger actions for goal coordination
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { goalId, action } = requestData;
    
    if (!goalId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: goalId, action' },
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
    
    // Handle different coordination actions
    let result;
    
    switch (action) {
      case 'activate':
        if (goal.status !== 'ACTIVE') {
          // First update the goal status to ACTIVE
          const { error: updateError } = await supabase
            .from('goals')
            .update({ status: 'ACTIVE' })
            .eq('id', goalId);
          
          if (updateError) {
            return NextResponse.json(
              { error: 'Failed to activate goal' },
              { status: 500 }
            );
          }
        }
        
        // Then start coordination
        result = await agentCoordinationService.handleGoalActivation(goalId);
        break;
        
      case 'adaptStrategy':
        const state = agentCoordinationService.coordinationStates.get(goalId);
        
        if (!state) {
          return NextResponse.json(
            { error: 'No active coordination for this goal' },
            { status: 404 }
          );
        }
        
        if (state.phase !== 'EXECUTION' && state.phase !== 'MONITORING') {
          return NextResponse.json(
            { error: 'Can only adapt strategy during execution or monitoring phase' },
            { status: 400 }
          );
        }
        
        result = await agentCoordinationService.initiateAdaptationPhase(goalId);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Unsupported action' },
          { status: 400 }
        );
    }
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: {
        success: true,
        message: `Successfully initiated ${action} for goal ${goalId}`
      }
    });
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
