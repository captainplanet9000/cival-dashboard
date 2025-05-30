import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/auth-helpers';

/**
 * GET /api/farms/:id/status-summary
 * Get farm status summary including goals and agents stats
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const farmId = params.id;

    if (!farmId) {
      return NextResponse.json(
        { error: "Farm ID is required" },
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

    // Get status summary from farm or generate if not available
    if (farm.status_summary) {
      return NextResponse.json({ data: farm.status_summary });
    }

    // Count goals by status
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('status')
      .eq('farm_id', farmId);

    if (goalsError) {
      return NextResponse.json(
        { error: "Failed to fetch goals" },
        { status: 500 }
      );
    }

    // Count standard agents
    const { count: totalAgents, error: agentsError } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId);

    if (agentsError) {
      return NextResponse.json(
        { error: "Failed to count agents" },
        { status: 500 }
      );
    }

    const { count: activeAgents } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('is_active', true);

    // Count ElizaOS agents if table exists
    let elizaAgentsTotal = 0;
    let elizaAgentsActive = 0;

    // Check if the elizaos_agents table exists
    const { data: tableExists } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'elizaos_agents')
      .single();

    if (tableExists) {
      const { count: elizaTotal } = await supabase
        .from('elizaos_agents')
        .select('*', { count: 'exact', head: true })
        .eq('farm_id', farmId);

      elizaAgentsTotal = elizaTotal || 0;

      const { count: elizaActive } = await supabase
        .from('elizaos_agents')
        .select('*', { count: 'exact', head: true })
        .eq('farm_id', farmId)
        .eq('status', 'active');

      elizaAgentsActive = elizaActive || 0;
    }

    // Build status summary
    const goalsTotal = goals?.length || 0;
    const goalsCompleted = goals?.filter(g => g.status === 'completed').length || 0;
    const goalsInProgress = goals?.filter(g => g.status === 'in_progress').length || 0;
    const goalsNotStarted = goals?.filter(g => g.status === 'not_started').length || 0;
    const goalsCancelled = goals?.filter(g => g.status === 'cancelled').length || 0;

    const statusSummary = {
      goals_total: goalsTotal,
      goals_completed: goalsCompleted,
      goals_in_progress: goalsInProgress,
      goals_not_started: goalsNotStarted,
      goals_cancelled: goalsCancelled,
      agents_total: (totalAgents || 0) + elizaAgentsTotal,
      agents_active: (activeAgents || 0) + elizaAgentsActive,
      updated_at: new Date().toISOString()
    };

    // Update farm status_summary
    await supabase
      .from('farms')
      .update({ status_summary: statusSummary })
      .eq('id', farmId);

    return NextResponse.json({ data: statusSummary });
  } catch (error) {
    console.error("Error fetching farm status summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch farm status summary" },
      { status: 500 }
    );
  }
}
