import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/auth-helpers';

/**
 * GET /api/farms/:id/agents/count
 * Count agents by farm ID (both regular and ElizaOS agents)
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
    let elizaTotal = 0;
    let elizaActive = 0;

    // Check if the elizaos_agents table exists
    const { data: tableExists } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'elizaos_agents')
      .single();

    if (tableExists) {
      const { count: elizaTotalCount } = await supabase
        .from('elizaos_agents')
        .select('*', { count: 'exact', head: true })
        .eq('farm_id', farmId);

      elizaTotal = elizaTotalCount || 0;

      const { count: elizaActiveCount } = await supabase
        .from('elizaos_agents')
        .select('*', { count: 'exact', head: true })
        .eq('farm_id', farmId)
        .eq('status', 'active');

      elizaActive = elizaActiveCount || 0;
    }

    return NextResponse.json({ 
      data: { 
        total: totalAgents || 0,
        active: activeAgents || 0,
        elizaTotal,
        elizaActive
      } 
    });
  } catch (error) {
    console.error("Error counting agents by farm:", error);
    return NextResponse.json(
      { error: "Failed to count agents by farm" },
      { status: 500 }
    );
  }
}
