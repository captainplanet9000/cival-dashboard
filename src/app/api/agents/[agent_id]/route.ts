import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
// Removed Database type as it's not directly used in API route
import { type TradingAgentWithDetails } from '../route'; // Updated import
import { 
  getAgentById, 
  updateAgentDetails,
  deleteAgentFull, // Added for DELETE handler
  AgentNotFoundError, 
  AgentForbiddenError, 
  AgentServiceError,
  AgentUpdateError,
  StrategyNotFoundError,
  AgentDeletionError // Added for DELETE handler
} from '../../../lib/services/agentService'; // Adjusted path
import { type UpdateAgentPayload } from '@/lib/types/agent'; // For PUT request body

// Basic UUID validation regex (still used for assigned_strategy_id in PUT by API before service call)
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

export async function GET(request: NextRequest, { params }: { params: { agent_id: string } }) {
  const supabase = createServerClient();
  const { agent_id } = params;

  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error(`GET /api/agents/${agent_id}: Authentication error`, authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Fetch Agent using service function
    // getAgentById already returns TradingAgentWithWallet which should be compatible enough
    // or the service function itself would need to be updated to return TradingAgentWithDetails
    // For now, assuming getAgentById's return type is sufficient or will be updated in service.
    const agent = await getAgentById(supabase, user.id, agent_id); 
    
    // 3. Response
    return NextResponse.json(agent as TradingAgentWithDetails, { status: 200 }); // Cast to new type

  } catch (error: any) {
    console.error(`GET /api/agents/${agent_id}: Error - ${error.name} - ${error.message}`);
    if (error instanceof AgentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    } else if (error instanceof AgentForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    } else if (error instanceof AgentServiceError) { // Handles invalid UUID from service
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest, { params }: { params: { agent_id: string } }) {
  const supabase = createServerClient();
  const { agent_id } = params;

  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error(`DELETE /api/agents/${agent_id}: Authentication error`, authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Call the service function to delete the agent and its wallet
    // getAgentById (and thus agent_id UUID validation) is called within deleteAgentFull
    await deleteAgentFull(supabase, user.id, agent_id);
    
    // 3. Response
    return new NextResponse(null, { status: 204 });

  } catch (error: any) {
    console.error(`DELETE /api/agents/${agent_id}: Error - ${error.name} - ${error.message}`);
    if (error instanceof AgentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    } else if (error instanceof AgentForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    } else if (error instanceof AgentDeletionError) {
      // AgentDeletionError messages from service are specific about non-empty wallet (400) or DB error (500)
      const isClientError = error.message.includes("balance must be zero");
      return NextResponse.json({ error: error.message }, { status: isClientError ? 400 : 500 });
    } else if (error instanceof AgentServiceError) { 
      // Handles invalid agent_id format from getAgentById call within deleteAgentFull
      // Or other general service errors like "Agent wallet data missing"
      const isClientError = error.message.includes("Invalid agent ID format");
      return NextResponse.json({ error: error.message }, { status: isClientError ? 400 : 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

// Removed UpdateAgentRequestBody interface, will use UpdateAgentPayload from @/lib/types/agent
// Removed TradingAgentUpdate type

export async function PUT(request: NextRequest, { params }: { params: { agent_id: string } }) {
  const supabase = createServerClient();
  const { agent_id } = params; // agent_id from path params is used by service

  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error(`PUT /api/agents/${agent_id}: Authentication error`, authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Request Body Parsing
  let payload: UpdateAgentPayload;
  try {
    payload = await request.json();
  } catch (error) {
    console.error(`PUT /api/agents/${agent_id}: Error parsing request body`, error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // 3. Basic Payload Validation (more detailed validation in service)
  if (payload.name !== undefined && (typeof payload.name !== 'string' || payload.name.trim() === '')) {
    return NextResponse.json({ error: 'Agent name must be a non-empty string if provided' }, { status: 400 });
  }
  if (payload.assigned_strategy_id !== undefined && (typeof payload.assigned_strategy_id !== 'string' || !isValidUUID(payload.assigned_strategy_id))) {
    return NextResponse.json({ error: 'Valid assigned_strategy_id (UUID) must be provided if updating' }, { status: 400 });
  }
  if (payload.configuration_parameters !== undefined && (typeof payload.configuration_parameters !== 'object' || payload.configuration_parameters === null)) {
    return NextResponse.json({ error: 'configuration_parameters must be an object if provided' }, { status: 400 });
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 });
  }
  
  try {
    // 4. Call the service function
    const updatedAgent = await updateAgentDetails(supabase, user.id, agent_id, payload);
    
    // 5. Response
    // The `updateAgentDetails` service function also returns TradingAgentWithWallet.
    // If it's updated to return TradingAgentWithDetails, this cast will be correct.
    // Otherwise, this cast might be too optimistic if strategy details aren't actually in `updatedAgent`.
    return NextResponse.json(updatedAgent as TradingAgentWithDetails, { status: 200 });

  } catch (error: any) {
    console.error(`PUT /api/agents/${agent_id}: Error - ${error.name} - ${error.message}`);
    if (error instanceof AgentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    } else if (error instanceof AgentForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    } else if (error instanceof StrategyNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 }); // Strategy not found is a client error
    } else if (error instanceof AgentUpdateError) {
      // AgentUpdateError can be for "No valid fields" (400) or actual DB update failure (500)
      // The service message should be clear. If message indicates no fields, it's 400.
      const isClientError = error.message.includes("No valid fields provided") || error.message.includes("must be a non-empty string") || error.message.includes("must be an object");
      return NextResponse.json({ error: error.message }, { status: isClientError ? 400 : 500 });
    } else if (error instanceof AgentServiceError) { // Handles invalid agent_id format from getAgentById
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}