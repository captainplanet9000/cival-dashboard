import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { type Database } from '@/types/database.types';

type AgentTrade = Database['public']['Tables']['agent_trades']['Row'];

// Basic UUID validation regex
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

export async function GET(request: NextRequest, { params }: { params: { agent_id: string } }) {
  const supabase = createServerClient();
  const { agent_id } = params;
  const url = new URL(request.url);

  // 1. Validate agent_id format
  if (!isValidUUID(agent_id)) {
    return NextResponse.json({ error: 'Invalid agent_id format' }, { status: 400 });
  }

  // 2. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error(`GET /api/agents/${agent_id}/trades: Authentication error`, authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 3. Verify Agent Ownership
    const { data: agent, error: agentFetchError } = await supabase
      .from('trading_agents')
      .select('user_id') // Only need user_id for this check
      .eq('agent_id', agent_id)
      .single();

    if (agentFetchError) {
      if (agentFetchError.code === 'PGRST116') { // Agent not found
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      console.error(`GET /api/agents/${agent_id}/trades: Error fetching agent`, agentFetchError);
      return NextResponse.json({ error: 'Failed to verify agent', details: agentFetchError.message }, { status: 500 });
    }

    if (agent.user_id !== user.id) {
      console.warn(`GET /api/agents/${agent_id}/trades: User ${user.id} forbidden to access trades for agent owned by ${agent.user_id}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Pagination Parameters
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');

    let page = pageParam ? parseInt(pageParam, 10) : 1;
    let limit = limitParam ? parseInt(limitParam, 10) : 20;

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100; // Max limit

    const rangeFrom = (page - 1) * limit;
    const rangeTo = page * limit - 1;

    // 5. Fetch Agent Trades (Paginated)
    const { data: trades, error: tradesFetchError } = await supabase
      .from('agent_trades')
      .select('*')
      .eq('agent_id', agent_id)
      .order('created_at', { ascending: false }) // As per requirement
      .range(rangeFrom, rangeTo);

    if (tradesFetchError) {
      console.error(`GET /api/agents/${agent_id}/trades: Error fetching trades`, tradesFetchError);
      return NextResponse.json({ error: 'Failed to fetch trades', details: tradesFetchError.message }, { status: 500 });
    }

    // 6. Fetch Total Trade Count
    const { count: totalCount, error: countError } = await supabase
      .from('agent_trades')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agent_id);

    if (countError) {
      console.error(`GET /api/agents/${agent_id}/trades: Error fetching total trade count`, countError);
      // Non-fatal for the main data, but good to log. Could return trades without total_count or error out.
      // For now, let's still return trades if count fails, but log it.
    }
    
    // 7. Response
    return NextResponse.json({
      data: trades as AgentTrade[] || [],
      page: page,
      limit: limit,
      total_count: totalCount === null ? 0 : totalCount, // Handle null count if query failed or no records
    }, { status: 200 });

  } catch (error: any) {
    console.error(`GET /api/agents/${agent_id}/trades: Unhandled error`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
