'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { PostgrestError } from '@supabase/supabase-js';

// Define the structure for the combined agent strategy data
export type AgentStrategyWithDetails = 
  Database['public']['Tables']['agent_strategies']['Row'] & {
  strategies: Pick<
    Database['public']['Tables']['strategies']['Row'], 
    'name' | 'description' | 'strategy_type'
  > | null;
};

// Function to fetch agent strategies with joined strategy details
const fetchAgentStrategies = async (agentId: string): Promise<AgentStrategyWithDetails[]> => {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('agent_strategies')
    .select(`
      *,
      strategies (
        name,
        description,
        strategy_type
      )
    `)
    .eq('agent_id', agentId);

  if (error) {
    console.error('Error fetching agent strategies:', error);
    throw error;
  }

  // Explicitly cast data type for clarity, although Supabase types should handle this
  return (data as AgentStrategyWithDetails[]) || []; 
};

/**
 * Hook to fetch trading strategies assigned to a specific agent.
 */
export function useAgentStrategies(agentId: string) {
  const queryKey = ['agentStrategies', agentId];

  const { 
    data: strategies = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery<AgentStrategyWithDetails[], PostgrestError>({ 
    queryKey,
    queryFn: () => fetchAgentStrategies(agentId),
    enabled: !!agentId, // Only run query if agentId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    strategies,
    isLoading,
    error: error ? error.message : null,
    refetch,
  };
} 