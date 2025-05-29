// src/lib/services/agentService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { CreateAgentPayload } from '@/lib/types/agent'; // Assuming this path is correct
import { performTransfer } from '@/lib/services/vaultService'; // Assuming this path

// Define Wallet type based on your database.types.ts, if not already globally available through Database type
type Wallet = Database['public']['Tables']['wallets']['Row'];
type TradingAgent = Database['public']['Tables']['trading_agents']['Row'];
type TradingStrategy = Database['public']['Tables']['trading_strategies']['Row']; // Added
type TradingAgentWithDetails = TradingAgent & { 
  wallets: Wallet | null; 
  trading_strategies: TradingStrategy | null; // Added
};

// Custom Error Classes
export class AgentServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
export class StrategyNotFoundError extends AgentServiceError {}
export class UserFundingWalletError extends AgentServiceError {}
export class AgentWalletCreationError extends AgentServiceError {}
export class AgentRecordCreationError extends AgentServiceError {}
export class AgentWalletLinkError extends AgentServiceError {}
export class AgentFundingError extends AgentServiceError {}
export class AgentActivationError extends AgentServiceError {}
export class AgentNotFoundError extends AgentServiceError {}
export class AgentForbiddenError extends AgentServiceError {} // Specific to agent access
export class AgentUpdateError extends AgentServiceError {}
export class AgentDeletionError extends AgentServiceError {}
export class AgentStatusError extends AgentServiceError {}

// Basic UUID validation regex (can be moved to a shared util if used elsewhere)
const UUID_REGEX_AGENT_SERVICE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;


export async function getAgentById(
  supabase: SupabaseClient<Database>,
  userId: string,
  agentId: string
): Promise<TradingAgentWithDetails> {
  // 1. Validate agentId format
  if (!UUID_REGEX_AGENT_SERVICE.test(agentId)) {
    throw new AgentServiceError("Invalid agent ID format");
  }

  // 2. Fetch the agent
  const { data: retrievedAgent, error: fetchError } = await supabase
    .from('trading_agents')
    .select('*, wallets(*), trading_strategies(*)') // Updated select
    .eq('agent_id', agentId)
    .single();

  // 3. If agent not found
  if (fetchError) {
    if (fetchError.code === 'PGRST116') { // PostgREST code for "No rows found"
      throw new AgentNotFoundError(`Agent with ID ${agentId} not found.`);
    }
    // For other fetch errors
    console.error(`getAgentById: Error fetching agent ${agentId}`, fetchError);
    throw new AgentServiceError(`Failed to fetch agent: ${fetchError.message}`);
  }
  
  // This check is theoretically redundant if .single() throws PGRST116 and it's caught above.
  // However, as a safeguard or if behavior of .single() changes or is misunderstood:
  if (!retrievedAgent) {
     throw new AgentNotFoundError(`Agent with ID ${agentId} not found (no data after successful query).`);
  }

  // 4. Verify ownership
  if (retrievedAgent.user_id !== userId) {
    throw new AgentForbiddenError(`User does not have permission to access agent ID ${agentId}.`);
  }

  // 5. Verify wallet data (wallets is the alias Supabase uses for the embedded object/array)
  // Given the trading_agents.wallet_id is NOT NULL and a valid FK to wallets.wallet_id,
  // and it's a one-to-one relationship, agent.wallets should be an object, not null.
  if (!retrievedAgent.wallets) {
    // This indicates a data integrity issue or an unexpected response structure from Supabase.
    console.error(`getAgentById: Wallet data missing for agent ID ${agentId}. Agent wallet_id: ${retrievedAgent.wallet_id}`);
    throw new AgentServiceError(`Wallet data missing for agent ID ${agentId}.`);
  }
  // Also check for trading_strategies (it's nullable in the type, so a null value is acceptable if the FK is null)
  // if (!retrievedAgent.trading_strategies) { 
  //   console.warn(`getAgentById: Trading strategy data missing for agent ID ${agentId}. Agent assigned_strategy_id: ${retrievedAgent.assigned_strategy_id}`);
  //   // Depending on strictness, could throw error or allow null if FK is nullable
  // }


  return retrievedAgent as TradingAgentWithDetails;
}


export async function createAgent(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: CreateAgentPayload
): Promise<TradingAgentWithDetails> {
  const { name, strategy_id, configuration_parameters, initial_capital, funding_currency } = payload;

  // 1. Verify Strategy ID
  const { data: strategy, error: strategyError } = await supabase
    .from('trading_strategies')
    .select('strategy_id')
    .eq('strategy_id', strategy_id)
    .single();
  if (strategyError || !strategy) {
    throw new StrategyNotFoundError('Invalid strategy_id or failed to fetch strategy.');
  }

  // 2. Fetch User's Funding Wallet & Validate
  const { data: vaultUser, error: vaultUserError } = await supabase
    .from('vault_users')
    .select('primary_vault_wallet_id')
    .eq('user_id', userId)
    .single();
  if (vaultUserError || !vaultUser || !vaultUser.primary_vault_wallet_id) {
    throw new UserFundingWalletError('Primary funding wallet not set up for the user.');
  }
  const userFundingWalletId = vaultUser.primary_vault_wallet_id;

  const { data: userFundingWallet, error: userWalletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('wallet_id', userFundingWalletId)
    .single();

  if (userWalletError || !userFundingWallet) {
    throw new UserFundingWalletError('Failed to fetch user funding wallet.');
  }
  if (userFundingWallet.owner_id !== userId || userFundingWallet.owner_type !== 'user') {
    throw new UserFundingWalletError('Primary funding wallet not owned by the user.');
  }
  if (userFundingWallet.currency !== funding_currency) {
    throw new UserFundingWalletError(`Funding currency (${funding_currency}) does not match user's primary wallet currency (${userFundingWallet.currency}).`);
  }
  // Ensure balance is treated as a number
  const currentFundingBalance = typeof userFundingWallet.balance === 'string' ? parseFloat(userFundingWallet.balance) : userFundingWallet.balance;
  if (currentFundingBalance < initial_capital) {
    throw new UserFundingWalletError('Insufficient balance in user funding wallet.');
  }
   if (userFundingWallet.status !== 'active') {
    throw new UserFundingWalletError('User funding wallet is not active.');
  }


  // 3. Create Trading Agent Record (initially without wallet_id, status 'pending_creation')
  let agentId: string | undefined;
  const { data: newAgentPartial, error: agentCreateError } = await supabase
    .from('trading_agents')
    .insert({
      user_id: userId,
      name,
      assigned_strategy_id: strategy_id,
      configuration_parameters,
      status: 'pending_creation', // Initial status
      // wallet_id will be updated later
    })
    .select('agent_id')
    .single();

  if (agentCreateError || !newAgentPartial) {
    throw new AgentRecordCreationError(`Failed to create trading agent record: ${agentCreateError?.message}`);
  }
  agentId = newAgentPartial.agent_id;

  // 4. Create Agent's Wallet
  let agentWalletId: string | undefined;
  try {
    const { data: newAgentWallet, error: agentWalletCreateError } = await supabase
      .from('wallets')
      .insert({
        owner_id: agentId, // agentId is guaranteed to be defined here
        owner_type: 'agent',
        currency: funding_currency,
        balance: 0,
        status: 'active',
      })
      .select('wallet_id')
      .single();

    if (agentWalletCreateError || !newAgentWallet) {
      throw new AgentWalletCreationError(`Failed to create wallet for agent: ${agentWalletCreateError?.message}`);
    }
    agentWalletId = newAgentWallet.wallet_id;
  } catch (error) {
    // Cleanup: delete partially created agent if wallet creation fails
    if (agentId) await supabase.from('trading_agents').delete().eq('agent_id', agentId);
    throw error; // Re-throw original error or a new AgentWalletCreationError
  }

  // 5. Link Agent to Wallet and set status to 'pending_funding'
  try {
    const { error: agentUpdateError } = await supabase
      .from('trading_agents')
      .update({ wallet_id: agentWalletId, status: 'pending_funding' })
      .eq('agent_id', agentId); // agentId is guaranteed to be defined here
    if (agentUpdateError) {
      throw new AgentWalletLinkError(`Failed to link wallet to agent: ${agentUpdateError.message}`);
    }
  } catch (error) {
    // Cleanup: delete agent wallet and agent record
    if (agentWalletId) await supabase.from('wallets').delete().eq('wallet_id', agentWalletId);
    if (agentId) await supabase.from('trading_agents').delete().eq('agent_id', agentId); // agentId is guaranteed
    throw error;
  }

  // 6. Fund Agent's Wallet
  try {
    await performTransfer(
      supabase,
      userId, // User initiating the transfer
      userFundingWalletId,
      agentWalletId, // agentWalletId is guaranteed to be defined here
      initial_capital,
      `Initial funding for agent: ${name}`
    );
  } catch (error: any) {
     // Agent and wallet exist but funding failed. Status remains 'pending_funding'.
    throw new AgentFundingError(`Failed to fund agent wallet (Agent ID: ${agentId}, Wallet ID: ${agentWalletId}): ${error.message}. Agent and wallet exist but require funding.`);
  }

  // 7. Activate Agent
  try {
    const { error: agentActivateError } = await supabase
      .from('trading_agents')
      .update({ status: 'active' })
      .eq('agent_id', agentId); // agentId is guaranteed
    if (agentActivateError) {
      throw new AgentActivationError(`Agent (ID: ${agentId}) created and funded, but failed to activate: ${agentActivateError.message}`);
    }
  } catch (error) {
    // If activation fails, agent is funded but not active. This is a state that needs attention.
    // The error (AgentActivationError) will be caught by the API layer.
    throw error; 
  }
  
  // 8. Fetch and return the complete agent data
  const { data: finalAgent, error: finalAgentError } = await supabase
    .from('trading_agents')
    .select('*, wallets(*), trading_strategies(*)') // Updated select
    .eq('agent_id', agentId) // agentId is guaranteed
    .single();

  if (finalAgentError || !finalAgent) {
    // This state should ideally not be reached if all prior steps succeeded.
    // It implies the agent was created, funded, activated, but then couldn't be fetched.
    throw new AgentServiceError('Failed to fetch created agent details after all operations.');
  }
  // Ensure the 'wallets' property is not null, as it should exist.
  if (!finalAgent.wallets) {
      // This would be a data integrity issue or unexpected Supabase behavior
      throw new AgentServiceError('Agent wallet data is missing after creation and successful linking.');
  }
  // Also check for trading_strategies
  if (!finalAgent.trading_strategies && finalAgent.assigned_strategy_id) {
     console.warn(`createAgent: Trading strategy data missing for newly created agent ID ${agentId}. Assigned strategy ID: ${finalAgent.assigned_strategy_id}`);
     // This might be acceptable if the strategy details are not strictly needed immediately after creation by all callers.
  }

  return finalAgent as TradingAgentWithDetails; 
}


export async function updateAgentDetails(
  supabase: SupabaseClient<Database>,
  userId: string,
  agentId: string,
  payload: import('@/lib/types/agent').UpdateAgentPayload // Use imported UpdateAgentPayload
): Promise<TradingAgentWithDetails> {
  // 1. Fetch and authorize the agent using getAgentById
  // This also validates agentId format, and handles AgentNotFoundError, AgentForbiddenError
  await getAgentById(supabase, userId, agentId); 
  // We don't strictly need the agent object from getAgentById here if we're just updating,
  // but calling it ensures all initial checks pass.

  const { name, assigned_strategy_id, configuration_parameters } = payload;
  const updateObject: Database['public']['Tables']['trading_agents']['Update'] = {};

  // 2. Validate Payload and construct updateObject
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new AgentUpdateError('Agent name must be a non-empty string if provided.');
    }
    updateObject.name = name;
  }

  if (assigned_strategy_id !== undefined) {
    if (!UUID_REGEX_AGENT_SERVICE.test(assigned_strategy_id)) {
        throw new AgentUpdateError('Valid assigned_strategy_id (UUID) must be provided.');
    }
    const { data: strategy, error: strategyError } = await supabase
      .from('trading_strategies')
      .select('strategy_id')
      .eq('strategy_id', assigned_strategy_id)
      .maybeSingle();
    
    if (strategyError) {
      console.error(`updateAgentDetails: Error verifying strategy ${assigned_strategy_id}`, strategyError);
      throw new AgentServiceError(`Error verifying strategy: ${strategyError.message}`); // Generic service error for DB issues
    }
    if (!strategy) {
      throw new StrategyNotFoundError(`Assigned strategy_id ${assigned_strategy_id} not found.`);
    }
    updateObject.assigned_strategy_id = assigned_strategy_id;
  }

  if (configuration_parameters !== undefined) {
    if (typeof configuration_parameters !== 'object' || configuration_parameters === null) {
      throw new AgentUpdateError('Configuration_parameters must be an object if provided.');
    }
    updateObject.configuration_parameters = configuration_parameters;
  }

  if (Object.keys(updateObject).length === 0) {
    throw new AgentUpdateError("No valid fields provided for update.");
  }

  // 3. Perform Update
  const { data: updatedAgentData, error: updateError } = await supabase
    .from('trading_agents')
    .update(updateObject)
    .eq('agent_id', agentId)
    .select('*, wallets(*), trading_strategies(*)') // Updated select
    .single();

  if (updateError || !updatedAgentData) {
    console.error(`updateAgentDetails: Error updating agent ${agentId}`, updateError);
    throw new AgentUpdateError(`Failed to update agent: ${updateError?.message || 'Unknown error during update.'}`);
  }
  
  // Ensure the 'wallets' property is not null after update, similar to getAgentById.
  if (!updatedAgentData.wallets) {
      throw new AgentServiceError(`Updated agent (ID: ${agentId}) wallet data is missing after update operation.`);
  }
  if (!updatedAgentData.trading_strategies && updatedAgentData.assigned_strategy_id) {
      console.warn(`updateAgentDetails: Trading strategy data missing for updated agent ID ${agentId}. Assigned strategy ID: ${updatedAgentData.assigned_strategy_id}`);
  }

  return updatedAgentData as TradingAgentWithDetails;
}


export async function deleteAgentFull(
  supabase: SupabaseClient<Database>,
  userId: string,
  agentId: string
): Promise<void> {
  // 1. Fetch the agent and its wallet, and perform initial authorization.
  const agentWithWallet = await getAgentById(supabase, userId, agentId);

  // 2. Access the wallet details.
  if (!agentWithWallet.wallets) {
    // This check is also inside getAgentById, but as an extra safeguard if getAgentById's behavior changes
    // or if the TradingAgentWithWallet type allowed wallets to be truly optional beyond just null.
    throw new AgentServiceError("Agent wallet data missing, cannot proceed with deletion.");
  }
  const agentWallet = agentWithWallet.wallets; // wallets is not null here due to the check in getAgentById

  // 3. Check agentWithWallet.wallets.balance.
  const walletBalance = typeof agentWallet.balance === 'string' ? parseFloat(agentWallet.balance) : agentWallet.balance;
  const epsilon = 0.00000001; // For floating point comparisons
  if (walletBalance > epsilon) {
    throw new AgentDeletionError(`Agent wallet balance must be zero before deletion. Current balance: ${walletBalance}. Please transfer funds out first.`);
  }

  // 4. Sequential Deletion:
  // a. Delete the agent's wallet.
  const { error: walletDeleteError } = await supabase
    .from('wallets')
    .delete()
    .eq('wallet_id', agentWallet.wallet_id);

  if (walletDeleteError) {
    console.error(`deleteAgentFull: Failed to delete agent's wallet ${agentWallet.wallet_id} for agent ${agentId}`, walletDeleteError);
    throw new AgentDeletionError(`Failed to delete agent's wallet: ${walletDeleteError.message}`);
  }

  // b. Delete the agent record.
  // Note: The FK trading_agents.wallet_id should ideally be ON DELETE SET NULL or handled.
  // If not, and wallet deletion succeeded, this step should still work.
  // If wallet deletion failed, this step shouldn't be reached.
  // The cleanup function in previous API route for agent creation had a nullify step, which is good practice if FK is restrictive.
  // For simplicity here, directly deleting agent. If FK issues arise, nullifying wallet_id first in trading_agents would be needed.
  const { error: agentDeleteError } = await supabase
    .from('trading_agents')
    .delete()
    .eq('agent_id', agentId);

  if (agentDeleteError) {
    console.error(`deleteAgentFull: CRITICAL! Agent's wallet ${agentWallet.wallet_id} deleted, but failed to delete agent record ${agentId}.`, agentDeleteError);
    throw new AgentDeletionError(`CRITICAL: Agent's wallet deleted, but failed to delete agent record. Manual cleanup may be required for agent ID: ${agentId}. Error: ${agentDeleteError.message}`);
  }
  
  // If we reach here, all successful.
}


export async function startAgent(
  supabase: SupabaseClient<Database>,
  userId: string,
  agentId: string
): Promise<TradingAgentWithDetails> {
  const agent = await getAgentById(supabase, userId, agentId); // Fetches, validates UUID, and authorizes

  // Check agent.status
  if (agent.status === 'active') {
    throw new AgentStatusError("Agent is already active.");
  }
  // Only 'inactive' or 'paused' agents can be started.
  // 'pending_funding' might be an edge case; if funding failed, it might need manual re-trigger or different flow.
  // 'error' state might also require a different recovery mechanism.
  if (agent.status !== 'inactive' && agent.status !== 'paused') {
    throw new AgentStatusError(`Agent cannot be started due to its current state: ${agent.status}`);
  }

  // Update status to 'active'
  const { data: updatedAgentData, error: updateError } = await supabase
    .from('trading_agents')
    .update({ status: 'active' })
    .eq('agent_id', agentId)
    .select('*, wallets(*), trading_strategies(*)') // Updated select
    .single();

  if (updateError || !updatedAgentData) {
    console.error(`startAgent: Error updating agent ${agentId} status to active`, updateError);
    throw new AgentServiceError(`Failed to start agent ${agentId}: ${updateError?.message || 'Unknown error'}`);
  }
  
  if (!updatedAgentData.wallets) {
     throw new AgentServiceError(`Started agent (ID: ${agentId}) wallet data is missing after update operation.`);
  }
  if (!updatedAgentData.trading_strategies && updatedAgentData.assigned_strategy_id) {
     console.warn(`startAgent: Trading strategy data missing for started agent ID ${agentId}. Assigned strategy ID: ${updatedAgentData.assigned_strategy_id}`);
  }

  return updatedAgentData as TradingAgentWithDetails;
}


export async function stopAgent(
  supabase: SupabaseClient<Database>,
  userId: string,
  agentId: string
): Promise<TradingAgentWithDetails> {
  const agent = await getAgentById(supabase, userId, agentId); // Fetches, validates UUID, and authorizes

  // Check agent.status
  if (agent.status === 'paused' || agent.status === 'inactive') {
    throw new AgentStatusError("Agent is not currently active.");
  }
  // Only 'active' agents can be stopped (paused).
  if (agent.status !== 'active') {
    throw new AgentStatusError(`Agent cannot be stopped due to its current state: ${agent.status}`);
  }

  // Update status to 'paused'
  const { data: updatedAgentData, error: updateError } = await supabase
    .from('trading_agents')
    .update({ status: 'paused' })
    .eq('agent_id', agentId)
    .select('*, wallets(*), trading_strategies(*)') // Updated select
    .single();

  if (updateError || !updatedAgentData) {
    console.error(`stopAgent: Error updating agent ${agentId} status to paused`, updateError);
    throw new AgentServiceError(`Failed to stop agent ${agentId}: ${updateError?.message || 'Unknown error'}`);
  }

  if (!updatedAgentData.wallets) {
     throw new AgentServiceError(`Stopped agent (ID: ${agentId}) wallet data is missing after update operation.`);
  }
  if (!updatedAgentData.trading_strategies && updatedAgentData.assigned_strategy_id) {
     console.warn(`stopAgent: Trading strategy data missing for stopped agent ID ${agentId}. Assigned strategy ID: ${updatedAgentData.assigned_strategy_id}`);
  }

  return updatedAgentData as TradingAgentWithDetails;
}
