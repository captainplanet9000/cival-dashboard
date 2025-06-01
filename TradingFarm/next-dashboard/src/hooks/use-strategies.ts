'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PostgrestError, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Define Strategy type based on database schema
export type Strategy = {
  id: string;
  name: string;
  description?: string;
  type?: string;
  status?: string;
  config?: any;
  farm_id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  // Add other fields as needed from your database schema
};

interface UseStrategiesOptions {
  farmId?: string;
  enableRealtime?: boolean;
}

// Function to fetch strategies - will be used by React Query
const fetchStrategies = async (farmId?: string): Promise<Strategy[]> => {
  const supabase = createBrowserClient();
  
  // Mock data for now to avoid build errors - replace with actual table name
  const mockStrategies: Strategy[] = [
    {
      id: 'strategy-1',
      name: 'Momentum Trading',
      description: 'Follows market momentum with adaptive entry/exit',
      type: 'momentum',
      status: 'active',
      farm_id: farmId || 'default-farm',
      created_at: new Date().toISOString()
    },
    {
      id: 'strategy-2',
      name: 'Mean Reversion',
      description: 'Identifies and trades temporary price deviations',
      type: 'mean-reversion',
      status: 'active',
      farm_id: farmId || 'default-farm',
      created_at: new Date().toISOString()
    }
  ];
  
  // Use this when you have the actual database table
  // let query = supabase.from('strategies').select('*');
  // if (farmId) {
  //   query = query.eq('farm_id', farmId);
  // }
  // const { data, error } = await query;
  // if (error) {
  //   console.error('Supabase error fetching strategies:', error);
  //   throw error;
  // }
  // return data || [];
  
  // Return mock data for now
  return mockStrategies;
};

/**
 * Hook for fetching and subscribing to strategy data using React Query
 */
export function useStrategies({ farmId, enableRealtime = true }: UseStrategiesOptions = {}) {
  const queryClient = useQueryClient();

  // Define a query key, dependent on the farmId
  const queryKey = farmId ? ['strategies', farmId] : ['strategies'];

  // Use React Query to fetch strategies
  const { data: strategies = [], isLoading: loading, error, refetch } = useQuery<Strategy[], PostgrestError>({ 
    queryKey,
    queryFn: () => fetchStrategies(farmId), 
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    gcTime: 10 * 60 * 1000, // Garbage collect after 10 minutes
  });

  // Use React.useEffect for realtime subscriptions
  React.useEffect(() => {
    if (!enableRealtime) return;
    
    const supabase = createBrowserClient();
    
    // Uncomment when you have the actual table name
    // const channel = supabase
    //   .channel('strategies-changes')
    //   .on('postgres_changes', 
    //     { 
    //       event: '*', 
    //       schema: 'public', 
    //       table: 'strategies',
    //       ...(farmId ? { filter: `farm_id=eq.${farmId}` } : {})
    //     }, 
    //     (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
    //       console.log('Strategy change received!', payload);
    //       queryClient.invalidateQueries({ queryKey }); 
    //     }
    //   )
    //   .subscribe((status: string, err?: Error) => {
    //     if (status === 'SUBSCRIBED') {
    //       console.log(`Realtime channel subscribed for strategies${farmId ? ' of farm ' + farmId : ''}.`);
    //     } else if (err) {
    //       console.error(`Realtime subscription error for strategies: ${status}`, err);
    //     }
    //   });
    
    // return () => {
    //   console.log('Removing realtime channel subscription for strategies.');
    //   if (supabase && channel) {
    //     supabase.removeChannel(channel);
    //   }
    // };
    
    // No cleanup needed for now with mock data
    return () => {};
  }, [farmId, enableRealtime, queryClient, queryKey]);

  // Derived calculations
  const activeStrategies = strategies.filter(strategy => strategy.status === 'active');
  const inactiveStrategies = strategies.filter(strategy => strategy.status !== 'active');
  const counts = {
    total: strategies.length,
    active: activeStrategies.length,
    inactive: inactiveStrategies.length
  };

  return {
    strategies,
    activeStrategies,
    inactiveStrategies,
    counts,
    loading,
    error: error ? error.message : null,
    refresh: refetch,
  };
}
