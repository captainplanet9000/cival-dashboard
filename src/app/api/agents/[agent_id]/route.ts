import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { type Database } from '@/types/database.types';
// Attempt to import TradingAgentWithWallet from the parent route file
// If this path is incorrect or type is not exported, it will need adjustment
import { type TradingAgentWithWallet } from '../route'; 

// Basic UUID validation regex
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

export async function GET(request: NextRequest, { params }: { params: { agent_id: string } }) {
  const supabase = createServerClient();
  const { agent_id } = params;

  // 1. Validate agent_id format
  if (!isValidUUID(agent_id)) {
    return NextResponse.json({ error: 'Invalid agent_id format' }, { status: 400 });
  }

  // 2. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error(`GET /api/agents/${agent_id}: Authentication error`, authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 3. Fetch Agent with Wallet Details
    const { data: agent, error: fetchError } = await supabase
      .from('trading_agents')
      .select('*, wallets(*)') // Embeds the wallet record
      .eq('agent_id', agent_id)
      .single();

    if (fetchError) {
      // If error is due to 'PGRST116' (No rows found), it's a 404
      if (fetchError.code === 'PGRST116') {
        console.warn(`GET /api/agents/${agent_id}: Agent not found`);
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      // Otherwise, it's a server error
      console.error(`GET /api/agents/${agent_id}: Error fetching agent`, fetchError);
      return NextResponse.json({ error: 'Failed to fetch agent', details: fetchError.message }, { status: 500 });
    }

    // 4. Authorization: Verify agent.user_id matches authenticated user.id
    if (agent.user_id !== user.id) {
      console.warn(`GET /api/agents/${agent_id}: User ${user.id} forbidden to access agent owned by ${agent.user_id}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Response
    return NextResponse.json(agent as TradingAgentWithWallet, { status: 200 });

  } catch (error: any) {
    console.error(`GET /api/agents/${agent_id}: Unhandled error`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

// Interface for the PUT request body
interface UpdateAgentRequestBody {
  name?: string;
  assigned_strategy_id?: string; // UUID
  configuration_parameters?: object; // JSON object
}

type TradingAgentUpdate = Database['public']['Tables']['trading_agents']['Update'];


export async function PUT(request: NextRequest, { params }: { params: { agent_id: string } }) {
  const supabase = createServerClient();
  const { agent_id } = params;

  // 1. Validate agent_id format
  if (!isValidUUID(agent_id)) {
    return NextResponse.json({ error: 'Invalid agent_id format' }, { status: 400 });
  }

  // 2. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error(`PUT /api/agents/${agent_id}: Authentication error`, authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Request Body Parsing and Validation
  let requestData: UpdateAgentRequestBody;
  try {
    requestData = await request.json();
  } catch (error) {
    console.error(`PUT /api/agents/${agent_id}: Error parsing request body`, error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { name, assigned_strategy_id, configuration_parameters } = requestData;
  const updateObject: TradingAgentUpdate = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Agent name must be a non-empty string if provided' }, { status: 400 });
    }
    updateObject.name = name;
  }

  if (assigned_strategy_id !== undefined) {
    if (!isValidUUID(assigned_strategy_id)) {
      return NextResponse.json({ error: 'Valid assigned_strategy_id (UUID) must be provided if attempting to update' }, { status: 400 });
    }
    // Verify strategy_id exists
    const { data: strategy, error: strategyError } = await supabase
      .from('trading_strategies')
      .select('strategy_id')
      .eq('strategy_id', assigned_strategy_id)
      .maybeSingle();
    
    if (strategyError) {
      console.error(`PUT /api/agents/${agent_id}: Error verifying strategy ${assigned_strategy_id}`, strategyError);
      return NextResponse.json({ error: 'Error verifying strategy', details: strategyError.message }, { status: 500 });
    }
    if (!strategy) {
      return NextResponse.json({ error: `Assigned strategy_id ${assigned_strategy_id} not found` }, { status: 400 });
    }
    updateObject.assigned_strategy_id = assigned_strategy_id;
  }

  if (configuration_parameters !== undefined) {
    if (typeof configuration_parameters !== 'object' || configuration_parameters === null) {
      return NextResponse.json({ error: 'configuration_parameters must be an object if provided' }, { status: 400 });
    }
    updateObject.configuration_parameters = configuration_parameters;
  }

  // Ensure there's something to update
  if (Object.keys(updateObject).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
  }

  try {
    // 4. Fetch Agent & Authorization
    const { data: existingAgent, error: fetchExistingError } = await supabase
      .from('trading_agents')
      .select('user_id') // Only need user_id for authorization check
      .eq('agent_id', agent_id)
      .single();

    if (fetchExistingError) {
      if (fetchExistingError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      console.error(`PUT /api/agents/${agent_id}: Error fetching existing agent`, fetchExistingError);
      return NextResponse.json({ error: 'Failed to fetch agent for update', details: fetchExistingError.message }, { status: 500 });
    }

    if (existingAgent.user_id !== user.id) {
      console.warn(`PUT /api/agents/${agent_id}: User ${user.id} forbidden to update agent owned by ${existingAgent.user_id}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Update Agent
    // The 'updated_at' field should be handled by a database trigger automatically.
    const { data: updatedAgent, error: updateError } = await supabase
      .from('trading_agents')
      .update(updateObject)
      .eq('agent_id', agent_id)
      .select('*, wallets(*)') // Fetch with embedded wallet details
      .single();

    if (updateError) {
      console.error(`PUT /api/agents/${agent_id}: Error updating agent`, updateError);
      // Consider more specific error codes based on updateError.code if applicable
      return NextResponse.json({ error: 'Failed to update agent', details: updateError.message }, { status: 500 });
    }
    
    // 6. Response
    return NextResponse.json(updatedAgent as TradingAgentWithWallet, { status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/agents/${agent_id}: Unhandled error`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}