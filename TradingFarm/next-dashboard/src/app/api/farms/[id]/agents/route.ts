'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/auth-helpers';

/**
 * GET /api/farms/:id/agents
 * Get all agents (both standard and ElizaOS) for a farm
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

    // Fetch standard agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('farm_id', farmId);

    if (agentsError) {
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    // Fetch ElizaOS agents if table exists
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
        .eq('farm_id', farmId);

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
    console.error("Error fetching agents for farm:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents for farm" },
      { status: 500 }
    );
  }
}
