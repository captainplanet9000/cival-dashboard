'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PostgrestError, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Define Agent type based on database schema
export type Agent = Database['public']['Tables']['agents']['Row'];

interface UseAgentsOptions {
  farmId?: string;
  enableRealtime?: boolean;
}

// Function to fetch agents - will be used by React Query
const fetchAgents = async (farmId?: string): Promise<Agent[]> => {
  const supabase = createBrowserClient();
  let query = supabase.from('agents').select('*');

  if (farmId) {
    query = query.eq('farm_id', farmId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase error fetching agents:', error);
    throw error; // React Query will handle this error
  }
  
  return data || [];
};

/**
 * Hook for fetching and subscribing to agent data using React Query
 */
export function useAgents({ farmId, enableRealtime = true }: UseAgentsOptions = {}) {
  const queryClient = useQueryClient();

  // Define a query key, dependent on the farmId
  const queryKey = farmId ? ['agents', farmId] : ['agents'];

  // Use React Query to fetch agents
  const { data: agents = [], isLoading: loading, error, refetch } = useQuery<Agent[], PostgrestError>({ 
    queryKey,
    queryFn: () => fetchAgents(farmId), 
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    gcTime: 10 * 60 * 1000, // Garbage collect after 10 minutes
  });

  // Use React.useEffect
  React.useEffect(() => {
    if (!enableRealtime) return;
    
    const supabase = createBrowserClient();
    const channel = supabase
      .channel('agents-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'agents',
          ...(farmId ? { filter: `farm_id=eq.${farmId}` } : {})
        }, 
        (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
          console.log('Agent change received!', payload);
          queryClient.invalidateQueries({ queryKey }); 
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime channel subscribed for agents${farmId ? ' of farm ' + farmId : ''}.`);
        } else if (err) {
          console.error(`Realtime subscription error for agents: ${status}`, err);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){
           console.error(`Realtime subscription error for agents: ${status}`);
        }
      });
    
    return () => {
      console.log('Removing realtime channel subscription for agents.');
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [farmId, enableRealtime, queryClient, queryKey]);

  // Calculations can be derived directly from the query data
  const activeAgents = agents.filter(agent => agent.is_active);
  const inactiveAgents = agents.filter(agent => !agent.is_active);
  const counts = {
    total: agents.length,
    active: activeAgents.length,
    inactive: inactiveAgents.length
  };

  return {
    agents,
    activeAgents,
    inactiveAgents,
    counts,
    loading,
    error: error ? error.message : null, // Return only the error message string
    refresh: refetch, // Use React Query's refetch function
  };
} 