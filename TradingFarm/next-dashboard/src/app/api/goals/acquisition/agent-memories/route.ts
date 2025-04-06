import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';
import { agentCoordinationElizaService } from '@/services/agent-coordination-eliza-service';

/**
 * API endpoint for retrieving agent memories related to goal acquisition
 * GET /api/goals/acquisition/agent-memories
 * Query parameters:
 *   - goal_id: ID of the goal to retrieve memories for (required)
 *   - memory_type: Optional filter for memory type (STRATEGY, EXECUTION, MARKET_CONDITION, etc.)
 *   - limit: Maximum number of memories to return (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const goalId = searchParams.get('goal_id');
    const memoryType = searchParams.get('memory_type') || undefined;
    const limit = Number(searchParams.get('limit')) || 20;
    
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
    
    // Get agent memories from ElizaOS
    const { data: memories, error } = await agentCoordinationElizaService.getGoalAcquisitionMemories(
      goalId,
      memoryType,
      limit
    );
    
    if (error) {
      console.error('Error fetching agent memories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agent memories' },
        { status: 500 }
      );
    }
    
    // Get agent details to enhance the response
    const agentIds = [...new Set(memories.map(memory => memory.agent_id))];
    let agentsInfo = {};
    
    if (agentIds.length > 0) {
      const { data: agents } = await supabase
        .from('agents')
        .select('id, name, type, role, status')
        .in('id', agentIds);
      
      if (agents) {
        agentsInfo = agents.reduce((acc, agent) => ({
          ...acc,
          [agent.id]: agent
        }), {});
      }
    }
    
    // Add agent info to each memory
    const enhancedMemories = memories.map(memory => ({
      ...memory,
      agent: agentsInfo[memory.agent_id as keyof typeof agentsInfo] || null
    }));
    
    return NextResponse.json({ data: enhancedMemories });
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
