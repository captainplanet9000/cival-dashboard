import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
// Removed SupabaseClient type as it's not directly used in API route anymore
// Removed Database, TradingAgentInsert, WalletInsert, Wallet types as they are handled by service or payload types
// Removed performTransfer and vaultService errors as they are handled by agentService
import { CreateAgentPayload } from '@/lib/types/agent'; // For request body validation
import { 
  createAgent,
  StrategyNotFoundError,
  UserFundingWalletError,
  AgentRecordCreationError,
  AgentWalletCreationError,
  AgentWalletLinkError,
  AgentFundingError,
  AgentActivationError,
  AgentServiceError // Generic service error
} from '../../../lib/services/agentService'; // Adjusted path

// Removed TradingAgent type if response type comes from service (TradingAgentWithWallet)
// type TradingAgent = Database['public']['Tables']['trading_agents']['Row'];
// Type for the response, assuming createAgent returns TradingAgentWithWallet
// This might need to be imported from agentService or defined if not already
// For now, relying on the return type of createAgent.
// export type TradingAgentWithWallet = TradingAgent & { wallets: Wallet | null }; // This was in the previous version

// Basic UUID validation regex - keep for API level validation
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Removed cleanupAgent and cleanupAgentAndWallet functions as they are now internal to agentService (or would be if needed there)

// Updated type definition
export type TradingAgentWithDetails = import('@/types/database.types').Database['public']['Tables']['trading_agents']['Row'] & {
    wallets: import('@/types/database.types').Database['public']['Tables']['wallets']['Row'] | null;
    trading_strategies: import('@/types/database.types').Database['public']['Tables']['trading_strategies']['Row'] | null;
};

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('GET /api/agents: Authentication error', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { data: agents, error: fetchError } = await supabase
      .from('trading_agents')
      .select('*, wallets(*), trading_strategies(*)') // Updated query
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (fetchError) {
      console.error('GET /api/agents: Error fetching trading agents', fetchError);
      return NextResponse.json({ error: 'Failed to fetch trading agents', details: fetchError.message }, { status: 500 });
    }
    return NextResponse.json(agents as TradingAgentWithDetails[] || [], { status: 200 }); // Updated type cast
  } catch (error: any) {
    console.error('GET /api/agents: Unhandled error', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  const supabase = createServerClient();

  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('POST /api/agents: Authentication error', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Request Body Parsing and Basic Validation
  let payload: CreateAgentPayload;
  try {
    payload = await request.json();
  } catch (error) {
    console.error('POST /api/agents: Error parsing request body', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Basic validation (more detailed validation is now in the service)
  if (!payload.name || typeof payload.name !== 'string' || payload.name.trim() === '') {
    return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
  }
  if (!payload.strategy_id || !UUID_REGEX.test(payload.strategy_id)) {
    return NextResponse.json({ error: 'Valid strategy_id is required' }, { status: 400 });
  }
  if (typeof payload.configuration_parameters !== 'object' || payload.configuration_parameters === null) {
    return NextResponse.json({ error: 'configuration_parameters must be an object' }, { status: 400 });
  }
  if (typeof payload.initial_capital !== 'number' || payload.initial_capital <= 0) {
    return NextResponse.json({ error: 'initial_capital must be a positive number' }, { status: 400 });
  }
  if (!payload.funding_currency || typeof payload.funding_currency !== 'string' || payload.funding_currency.trim() === '') {
    return NextResponse.json({ error: 'funding_currency is required' }, { status: 400 });
  }

  try {
    // 3. Call the agent creation service function
    const createdAgentWithWallet = await createAgent(supabase, user.id, payload);

    // 4. Success Response
    return NextResponse.json(createdAgentWithWallet, { status: 201 });

  } catch (error: any) {
    // 5. Error Handling based on custom error types from agentService
    console.error('POST /api/agents: Service error -', error.name, error.message);

    if (error instanceof StrategyNotFoundError || error instanceof UserFundingWalletError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    } else if (
        error instanceof AgentRecordCreationError ||
        error instanceof AgentWalletCreationError ||
        error instanceof AgentWalletLinkError ||
        error instanceof AgentFundingError || // Funding failures are 500 as agent/wallet might exist
        error instanceof AgentActivationError || // Agent funded but not active is a server-side issue
        error instanceof AgentServiceError // Generic service error
      ) {
      // For AgentFundingError, the service message already indicates agent/wallet might exist.
      // For AgentActivationError, agent is created and funded.
      return NextResponse.json({ error: 'Agent creation process failed.', details: error.message }, { status: 500 });
    } else {
      // Fallback for unexpected errors
      return NextResponse.json({ error: 'Internal Server Error during agent creation.', details: error.message }, { status: 500 });
    }
  }
}