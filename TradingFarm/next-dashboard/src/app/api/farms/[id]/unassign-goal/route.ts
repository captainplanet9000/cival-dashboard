import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/auth-helpers';

/**
 * POST /api/farms/:id/unassign-goal
 * Unassign a goal from an agent
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const farmId = params.id;
    const requestData = await request.json();
    const { agent_id, is_eliza_agent } = requestData;

    if (!farmId || !agent_id) {
      return NextResponse.json(
        { error: "Farm ID and agent ID are required" },
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

    // Determine which table to update based on agent type
    const table = is_eliza_agent ? 'elizaos_agents' : 'agents';

    // Verify agent exists and belongs to this farm
    const { data: agent, error: agentError } = await supabase
      .from(table)
      .select('*')
      .eq('id', agent_id)
      .eq('farm_id', farmId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: "Agent not found or doesn't belong to this farm" },
        { status: 404 }
      );
    }

    // Update agent to remove goal reference
    const { error: updateError } = await supabase
      .from(table)
      .update({ goal_id: null })
      .eq('id', agent_id)
      .eq('farm_id', farmId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to unassign goal from agent" },
        { status: 500 }
      );
    }

    // Update farm status summary
    await supabase.rpc('update_farm_status_summary', { farm_id: farmId });

    return NextResponse.json({ 
      data: { 
        message: "Goal unassigned from agent successfully" 
      } 
    });
  } catch (error) {
    console.error("Error unassigning goal from agent:", error);
    return NextResponse.json(
      { error: "Failed to unassign goal from agent" },
      { status: 500 }
    );
  }
}
