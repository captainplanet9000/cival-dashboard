'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { PostgrestError } from '@supabase/supabase-js';

// Type for a single agent task
export type AgentTask = Database['public']['Tables']['agent_tasks']['Row'];

// Function to fetch tasks for a specific agent
const fetchAgentTasks = async (agentId: string, limit: number = 20): Promise<AgentTask[]> => {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('agent_tasks')
    .select('*') 
    .eq('assigned_agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`Error fetching tasks for agent ${agentId}:`, error);
    throw error;
  }

  return data || [];
};

/**
 * Hook to fetch recent tasks assigned to a specific agent ID.
 */
export function useAgentTasks(agentId: string | null | undefined, limit: number = 20) {
  const queryKey = ['agentTasks', agentId, limit];

  const { 
    data: tasks = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery<AgentTask[], PostgrestError>({ 
    queryKey,
    queryFn: () => fetchAgentTasks(agentId!, limit), // Pass agentId & limit
    enabled: !!agentId, // Only run query if agentId is truthy
    staleTime: 1 * 60 * 1000, // 1 minute (tasks might update frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    tasks,
    isLoading,
    error: error ? error.message : null,
    refetch,
  };
} 