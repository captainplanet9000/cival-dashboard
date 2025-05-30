'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/auth-helpers';

/**
 * GET /api/farms/:id/elizaos-agents
 * Get all ElizaOS agents for a farm
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

    // Check if the elizaos_agents table exists
    const { data: tableExists } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'elizaos_agents')
      .single();

    if (!tableExists) {
      return NextResponse.json({ 
        data: [] 
      });
    }

    // Fetch ElizaOS agents
    const { data: elizaAgents, error: elizaError } = await supabase
      .from('elizaos_agents')
      .select('*')
      .eq('farm_id', farmId);

    if (elizaError) {
      return NextResponse.json(
        { error: "Failed to fetch ElizaOS agents" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      data: elizaAgents || [] 
    });
  } catch (error) {
    console.error("Error fetching ElizaOS agents for farm:", error);
    return NextResponse.json(
      { error: "Failed to fetch ElizaOS agents for farm" },
      { status: 500 }
    );
  }
}
