import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type SupabaseClient } from '@/utils/supabase/server';
import { type Database } from '@/types/database.types';
import { 
  performTransfer,
  WalletNotFoundError,
  ForbiddenError,
  InactiveWalletError,
  InsufficientFundsError,
  CurrencyMismatchError,
  OperationFailedError
} from '@/lib/services/vaultService'; // Ensure this path is correct

type TradingAgentInsert = Database['public']['Tables']['trading_agents']['Insert'];
type TradingAgent = Database['public']['Tables']['trading_agents']['Row'];
type WalletInsert = Database['public']['Tables']['wallets']['Insert'];
type Wallet = Database['public']['Tables']['wallets']['Row'];

// Basic UUID validation regex
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

interface CreateAgentRequestBody {
  name: string;
  strategy_id: string; // UUID
  configuration_parameters: object; // JSON object
  initial_capital: number;
  funding_currency: string; 
}

async function cleanupAgent(supabase: SupabaseClient<Database>, agentId: string) {
  console.warn(`Attempting cleanup for agent_id: ${agentId}`);
  const { error } = await supabase.from('trading_agents').delete().eq('agent_id', agentId);
  if (error) console.error(`Cleanup failed for agent_id ${agentId}: ${error.message}`);
  else console.log(`Cleanup successful for agent_id ${agentId}`);
}

async function cleanupAgentAndWallet(supabase: SupabaseClient<Database>, agentId: string, agentWalletId: string) {
  console.warn(`Attempting cleanup for agent_id: ${agentId} and wallet_id: ${agentWalletId}`);
  // It's generally safer to delete the agent first if there's a FK constraint from agent to wallet (agent.wallet_id)
  // that is NOT SET NULL ON DELETE. If it is SET NULL, order is less critical.
  // Assuming trading_agents.wallet_id is nullable.
  
  // 1. Attempt to nullify wallet_id in trading_agents to remove FK constraint before deleting wallet
  const { error: updateAgentError } = await supabase
    .from('trading_agents')
    .update({ wallet_id: null })
    .eq('agent_id', agentId);

  if (updateAgentError) {
    console.error(`Cleanup: Failed to nullify wallet_id for agent ${agentId}: ${updateAgentError.message}. Proceeding with wallet deletion attempt.`);
  }

  // 2. Delete the wallet
  const { error: walletError } = await supabase.from('wallets').delete().eq('wallet_id', agentWalletId);
  if (walletError) console.error(`Cleanup: Failed to delete agent wallet ${agentWalletId}: ${walletError.message}`);
  else console.log(`Cleanup: Successfully deleted agent wallet ${agentWalletId}`);
  
  // 3. Delete the agent
  await cleanupAgent(supabase, agentId); 
}

// Define the combined type for an agent with its wallet details
export type TradingAgentWithWallet = TradingAgent & {
  wallets: Wallet | null; // Or Wallet if it's guaranteed to exist and non-nullable via FK
};

export async function GET(request: NextRequest) {
  const supabase = createServerClient();

  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('GET /api/agents: Authentication error', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Fetch Trading Agents with their Wallets
    // The foreign key relationship is from trading_agents.wallet_id to wallets.wallet_id
    // So, when querying trading_agents, wallets(*) will fetch the related wallet.
    const { data: agents, error: fetchError } = await supabase
      .from('trading_agents')
      .select('*, wallets(*)') // Embeds the wallet record linked by trading_agents.wallet_id
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('GET /api/agents: Error fetching trading agents', fetchError);
      return NextResponse.json({ error: 'Failed to fetch trading agents', details: fetchError.message }, { status: 500 });
    }

    // 3. Response
    return NextResponse.json(agents as TradingAgentWithWallet[] || [], { status: 200 });

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Request Body Validation
  let requestData: CreateAgentRequestBody;
  try {
    requestData = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { name, strategy_id, configuration_parameters, initial_capital, funding_currency } = requestData;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
  }
  if (!strategy_id || !UUID_REGEX.test(strategy_id)) {
    return NextResponse.json({ error: 'Valid strategy_id is required' }, { status: 400 });
  }
  if (typeof configuration_parameters !== 'object' || configuration_parameters === null) {
    return NextResponse.json({ error: 'configuration_parameters must be an object' }, { status: 400 });
  }
  if (typeof initial_capital !== 'number' || initial_capital <= 0) {
    return NextResponse.json({ error: 'initial_capital must be a positive number' }, { status: 400 });
  }
  if (!funding_currency || typeof funding_currency !== 'string' || funding_currency.trim() === '') {
    return NextResponse.json({ error: 'funding_currency is required' }, { status: 400 });
  }

  let userFundingWallet: Wallet | null = null;
  let tempAgentId: string | null = null; // Used for cleanup in case of partial failure
  let tempAgentWalletId: string | null = null; // Used for cleanup

  try {
    // 3. Fetch User's Funding Wallet & Strategy Verification
    const { data: vaultUser, error: vaultUserError } = await supabase
      .from('vault_users')
      .select('primary_vault_wallet_id')
      .eq('user_id', user.id)
      .single();

    if (vaultUserError || !vaultUser || !vaultUser.primary_vault_wallet_id) {
      console.error('POST /api/agents: User primary funding wallet not found or query failed.', vaultUserError);
      return NextResponse.json({ error: 'Primary funding wallet not set up or query failed.' }, { status: 400 });
    }

    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('wallet_id', vaultUser.primary_vault_wallet_id)
      .single();
    
    if (walletError || !walletData) {
        console.error(`POST /api/agents: User funding wallet (${vaultUser.primary_vault_wallet_id}) not found.`, walletError);
      return NextResponse.json({ error: `User funding wallet not found.` }, { status: 400 });
    }
    userFundingWallet = walletData; 

    if (userFundingWallet.status !== 'active') {
      return NextResponse.json({ error: `User funding wallet is not active. Status: ${userFundingWallet.status}` }, { status: 400 });
    }
    if (userFundingWallet.owner_id !== user.id || userFundingWallet.owner_type !== 'user') {
      return NextResponse.json({ error: 'User funding wallet ownership mismatch.' }, { status: 403 });
    }
    if (userFundingWallet.currency !== funding_currency) {
      return NextResponse.json({ error: `User funding wallet currency (${userFundingWallet.currency}) does not match requested funding_currency (${funding_currency}).` }, { status: 400 });
    }
    const userCurrentBalance = typeof userFundingWallet.balance === 'string' ? parseFloat(userFundingWallet.balance) : userFundingWallet.balance;
    if (userCurrentBalance < initial_capital) {
      return NextResponse.json({ error: `Insufficient funds in user funding wallet. Balance: ${userCurrentBalance}, Required: ${initial_capital}` }, { status: 400 });
    }

    const { data: strategy, error: strategyError } = await supabase
      .from('trading_strategies')
      .select('strategy_id')
      .eq('strategy_id', strategy_id)
      .maybeSingle(); 

    if (strategyError) {
        console.error('POST /api/agents: Error verifying strategy', strategyError);
        return NextResponse.json({ error: `Error verifying strategy: ${strategyError.message}` }, { status: 500 });
    }
    if (!strategy) {
      return NextResponse.json({ error: 'Invalid strategy_id: Strategy not found.' }, { status: 400 });
    }

    // 4. Transaction-like Sequence
    // A. Create Trading Agent Record (without wallet_id yet)
    const agentInsertData: TradingAgentInsert = {
      user_id: user.id,
      name,
      assigned_strategy_id: strategy_id,
      configuration_parameters,
      status: 'inactive', 
    };
    const { data: createdAgentPartial, error: agentInsertError } = await supabase
      .from('trading_agents')
      .insert(agentInsertData)
      .select('agent_id') 
      .single();

    if (agentInsertError || !createdAgentPartial) {
      console.error('POST /api/agents: Error creating trading agent', agentInsertError);
      return NextResponse.json({ error: 'Failed to create trading agent', details: agentInsertError?.message }, { status: 500 });
    }
    tempAgentId = createdAgentPartial.agent_id; 

    // B. Create Agent's Wallet
    const agentWalletInsertData: WalletInsert = {
      owner_id: tempAgentId,
      owner_type: 'agent',
      currency: funding_currency,
      balance: 0, 
      status: 'active',
    };
    const { data: createdAgentWalletPartial, error: agentWalletInsertError } = await supabase
      .from('wallets')
      .insert(agentWalletInsertData)
      .select('wallet_id') 
      .single();

    if (agentWalletInsertError || !createdAgentWalletPartial) {
      console.error('POST /api/agents: Error creating agent wallet', agentWalletInsertError);
      if (tempAgentId) await cleanupAgent(supabase, tempAgentId); 
      return NextResponse.json({ error: 'Failed to create agent wallet', details: agentWalletInsertError?.message }, { status: 500 });
    }
    tempAgentWalletId = createdAgentWalletPartial.wallet_id;

    // C. Link Agent to Wallet & Activate Agent
    // Set status to 'pending_funding' before attempting to fund.
    const { error: agentUpdateError } = await supabase
      .from('trading_agents')
      .update({ wallet_id: tempAgentWalletId, status: 'pending_funding' }) 
      .eq('agent_id', tempAgentId);

    if (agentUpdateError) {
      console.error('POST /api/agents: Error linking agent to wallet', agentUpdateError);
      if (tempAgentId && tempAgentWalletId) await cleanupAgentAndWallet(supabase, tempAgentId, tempAgentWalletId); 
      return NextResponse.json({ error: 'Failed to link agent to wallet', details: agentUpdateError.message }, { status: 500 });
    }

    // D. Fund Agent's Wallet
    await performTransfer(
      supabase,
      user.id, 
      userFundingWallet.wallet_id, 
      tempAgentWalletId, 
      initial_capital,
      `Initial funding for agent ${name}`
    );
    // performTransfer will throw an error if funding fails. If it succeeds, update agent status.

    // E. Update Agent Status to 'active' after successful funding
    const { error: finalStatusUpdateError } = await supabase
      .from('trading_agents')
      .update({ status: 'active' })
      .eq('agent_id', tempAgentId);
    
    if (finalStatusUpdateError) {
      // Funding succeeded, but final status update failed. Agent is funded but 'pending_funding'.
      // This is not ideal but not critical enough to roll back the funding. Log and proceed.
      console.warn(`POST /api/agents: Agent ${tempAgentId} funded, but failed to update status to 'active'. Current status: 'pending_funding'. Error: ${finalStatusUpdateError.message}`);
    }


    // Fetch the complete agent record to return
    const { data: finalAgentData, error: finalAgentError } = await supabase
        .from('trading_agents')
        .select('*')
        .eq('agent_id', tempAgentId)
        .single();

    if (finalAgentError || !finalAgentData) {
        console.error('POST /api/agents: Failed to fetch final agent details after creation and funding.', finalAgentError);
        return NextResponse.json({ 
            message: 'Agent created and funded, but failed to retrieve final agent details.', 
            agent_id: tempAgentId, 
            wallet_id: tempAgentWalletId 
        }, { status: 207 }); // 207 Multi-Status
    }
    
    // 5. Response
    return NextResponse.json(finalAgentData as TradingAgent, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/agents: Error during agent creation/funding process', error);
    
    if (error instanceof WalletNotFoundError || 
        error instanceof ForbiddenError || 
        error instanceof InactiveWalletError || 
        error instanceof InsufficientFundsError || 
        error instanceof CurrencyMismatchError ||
        error instanceof OperationFailedError) {
      
      // These errors are from performTransfer (funding step D).
      // Agent, wallet created and linked. Agent status is 'pending_funding'.
      // Requirement: "if funding fails, return 500 but the agent/wallet will exist."
      console.warn(`POST /api/agents: Funding failed for agent ${tempAgentId} (wallet: ${tempAgentWalletId}). Error: ${error.message}`);
      return NextResponse.json({ 
        error: 'Agent and wallet created, but funding failed.', 
        details: error.message,
        agent_id: tempAgentId,
        agent_wallet_id: tempAgentWalletId 
      }, { status: 500 });
    }

    // General error during earlier steps (A, B, C)
    // Cleanup would have been attempted in those specific blocks if IDs were available.
    return NextResponse.json({ error: 'Internal Server Error during agent creation.', details: error.message }, { status: 500 });
  }
}