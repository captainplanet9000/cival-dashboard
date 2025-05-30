import { type NextRequest, NextResponse } from 'next/server'; // Using NextRequest for consistency
import { createServerClient } from '@/utils/supabase/server';
import { type Database } from '@/types/database.types';

type AgentPerformanceLog = Database['public']['Tables']['agent_performance_logs']['Row'];

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
    console.error(`GET /api/agents/${agent_id}/performance: Authentication error`, authError);
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
      console.error(`GET /api/agents/${agent_id}/performance: Error fetching agent`, agentFetchError);
      return NextResponse.json({ error: 'Failed to verify agent', details: agentFetchError.message }, { status: 500 });
    }

    if (agent.user_id !== user.id) {
      console.warn(`GET /api/agents/${agent_id}/performance: User ${user.id} forbidden to access performance logs for agent owned by ${agent.user_id}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Pagination Parameters
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');

    let page = pageParam ? parseInt(pageParam, 10) : 1;
    let limit = limitParam ? parseInt(limitParam, 10) : 50; // Default limit to 50 as per suggestion

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 50;
    if (limit > 200) limit = 200; // Max limit 200

    const rangeFrom = (page - 1) * limit;
    const rangeTo = page * limit - 1;

    // 5. Fetch Agent Performance Logs (Paginated)
    const { data: performanceLogs, error: logsFetchError } = await supabase
      .from('agent_performance_logs')
      .select('*')
      .eq('agent_id', agent_id)
      .order('ts', { ascending: false }) // Order by timestamp descending
      .range(rangeFrom, rangeTo);

    if (logsFetchError) {
      console.error(`GET /api/agents/${agent_id}/performance: Error fetching performance logs`, logsFetchError);
      return NextResponse.json({ error: 'Failed to fetch performance logs', details: logsFetchError.message }, { status: 500 });
    }

    // 6. Fetch Total Log Count
    const { count: totalCount, error: countError } = await supabase
      .from('agent_performance_logs')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agent_id);

    if (countError) {
      console.error(`GET /api/agents/${agent_id}/performance: Error fetching total log count`, countError);
      // Non-fatal for the main data, but log it.
    }
    
    // 7. Response
    return NextResponse.json({
      data: performanceLogs as AgentPerformanceLog[] || [],
      page: page,
      limit: limit,
      total_count: totalCount === null ? 0 : totalCount,
    }, { status: 200 });

  } catch (error: any) {
    console.error(`GET /api/agents/${agent_id}/performance: Unhandled error`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
