'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { PostgrestError } from '@supabase/supabase-js';

// Re-export Agent type from main agents hook or define here if needed
export type Agent = Database['public']['Tables']['agents']['Row'];

// Function to fetch a single agent by ID
const fetchAgent = async (agentId: string): Promise<Agent | null> => {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single(); // Use .single() to get one record or null

  if (error && error.code !== 'PGRST116') { // PGRST116 = Row not found, which is okay
    console.error(`Error fetching agent ${agentId}:`, error);
    throw error;
  }

  return data;
};

/**
 * Hook to fetch a single agent by its ID.
 */
export function useAgent(agentId: string | null | undefined) {
  const queryKey = ['agent', agentId];

  const { 
    data: agent = null, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<Agent | null, PostgrestError>({ 
    queryKey,
    queryFn: () => fetchAgent(agentId!),
    enabled: !!agentId, // Only run query if agentId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    agent,
    isLoading,
    error: error ? error.message : null,
    refetch,
  };
} 