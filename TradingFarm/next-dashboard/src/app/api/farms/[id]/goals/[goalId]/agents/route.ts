import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/auth-helpers';

/**
 * GET /api/farms/:id/goals/:goalId/agents
 * Get all agents assigned to a specific goal
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string, goalId: string } }
) {
  try {
    const { id: farmId, goalId } = params;

    if (!farmId || !goalId) {
      return NextResponse.json(
        { error: "Farm ID and goal ID are required" },
        { status: 400 }
      );
    }

    // Verify farm exists and user has access
    const supabase = await createServerClient();
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .eq('owner_id', user.id)
      .single();

    if (farmError || !farm) {
      return NextResponse.json(
        { error: "Farm not found or access denied" },
        { status: 404 }
      );
    }

    // Verify goal exists and belongs to this farm
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('farm_id', farmId)
      .single();

    if (goalError || !goal) {
      return NextResponse.json(
        { error: "Goal not found or doesn't belong to this farm" },
        { status: 404 }
      );
    }

    // Get standard agents assigned to this goal
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('farm_id', farmId)
      .eq('goal_id', goalId);

    if (agentsError) {
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    // Get ElizaOS agents assigned to this goal if table exists
    let elizaAgents = [];
    
    // Check if the elizaos_agents table exists
    const { data: tableExists } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'elizaos_agents')
      .single();

    if (tableExists) {
      const { data: elizaData, error: elizaError } = await supabase
        .from('elizaos_agents')
        .select('*')
        .eq('farm_id', farmId)
        .eq('goal_id', goalId);

      if (!elizaError) {
        elizaAgents = elizaData || [];
      }
    }

    return NextResponse.json({ 
      data: { 
        agents: agents || [],
        elizaAgents
      } 
    });
  } catch (error) {
    console.error("Error fetching agents by goal:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents by goal" },
      { status: 500 }
    );
  }
}
