import { type NextRequest, NextResponse } from 'next/server'; 
import { createServerClient } from '@/utils/supabase/server';
// TradingAgentWithWallet might still be needed for the response type if not inferred
import { type TradingAgentWithWallet } from '../../route'; 
import { 
  startAgent, // Changed from getAgentById
  AgentNotFoundError, 
  AgentForbiddenError, 
  AgentServiceError,
  AgentStatusError // Added for startAgent
} from '@/lib/services/agentService'; 

// No need for isValidUUID or UUID_REGEX here, service handles agent_id validation via getAgentById

export async function POST(request: NextRequest, { params }: { params: { agent_id: string } }) {
  const supabase = createServerClient();
  const { agent_id } = params;

  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error(`POST /api/agents/${agent_id}/start: Authentication error`, authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Call the service function to start the agent
    // startAgent internally calls getAgentById for fetch/auth and handles UUID validation
    const updatedAgent = await startAgent(supabase, user.id, agent_id);
    
    // 3. Success Response
    return NextResponse.json(updatedAgent, { status: 200 });

  } catch (error: any) {
    console.error(`POST /api/agents/${agent_id}/start: Error - ${error.name} - ${error.message}`);
    if (error instanceof AgentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    } else if (error instanceof AgentForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    } else if (error instanceof AgentStatusError) { // Specific error for status issues
      return NextResponse.json({ error: error.message }, { status: 400 });
    } else if (error instanceof AgentServiceError) { // Handles invalid UUID or other service errors
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Fallback for unexpected errors
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
