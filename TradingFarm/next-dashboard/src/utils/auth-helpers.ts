import { createServerClient } from '@/utils/supabase/server';

/**
 * Get the authenticated user from the Supabase session
 * @returns The authenticated user or null if not authenticated
 */
export async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Check if the user has access to the specified farm
 * @param farmId The farm ID to check
 * @param userId The user ID to check
 * @returns True if the user has access, false otherwise
 */
export async function userHasAccessToFarm(farmId: string, userId: string) {
  if (!farmId || !userId) return false;

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('farms')
    .select('id')
    .eq('id', farmId)
    .eq('owner_id', userId)
    .single();

  return !error && !!data;
}

/**
 * Check if the user has access to the specified goal
 * @param goalId The goal ID to check
 * @param userId The user ID to check
 * @returns True if the user has access, false otherwise
 */
export async function userHasAccessToGoal(goalId: string, userId: string) {
  if (!goalId || !userId) return false;

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('goals')
    .select('id, farm_id')
    .eq('id', goalId)
    .single();

  if (error || !data) return false;

  return await userHasAccessToFarm(data.farm_id, userId);
}

/**
 * Check if the user has access to the specified agent
 * @param agentId The agent ID to check
 * @param userId The user ID to check
 * @param isElizaAgent Whether this is an ElizaOS agent
 * @returns True if the user has access, false otherwise
 */
export async function userHasAccessToAgent(agentId: string, userId: string, isElizaAgent = false) {
  if (!agentId || !userId) return false;

  const supabase = await createServerClient();
  const table = isElizaAgent ? 'elizaos_agents' : 'agents';
  
  const { data, error } = await supabase
    .from(table)
    .select('id, farm_id')
    .eq('id', agentId)
    .single();

  if (error || !data) return false;

  return await userHasAccessToFarm(data.farm_id, userId);
}
