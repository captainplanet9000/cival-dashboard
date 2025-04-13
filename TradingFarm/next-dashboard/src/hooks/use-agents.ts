'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';

// Define Agent type based on database schema
export type Agent = Database['public']['Tables']['agents']['Row'];

interface UseAgentsOptions {
  farmId?: string;
  enableRealtime?: boolean;
}

/**
 * Hook for fetching and subscribing to agent data
 */
export function useAgents({ farmId, enableRealtime = true }: UseAgentsOptions = {}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch agents
  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const supabase = createBrowserClient();
        let query = supabase.from('agents').select('*');
        
        // If farmId is provided, filter by it
        if (farmId) {
          query = query.eq('farm_id', farmId);
        }
        
        const { data, error: queryError } = await query;
        
        if (queryError) {
          throw queryError;
        }
        
        setAgents(data || []);
      } catch (err: any) {
        console.error('Error fetching agents:', err);
        setError(err.message || 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [farmId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;
    
    const supabase = createBrowserClient();
    
    // Create a channel for real-time updates
    const channel = supabase
      .channel('agents-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'agents',
          ...(farmId ? { filter: `farm_id=eq.${farmId}` } : {})
        }, 
        (payload) => {
          // Handle different event types
          if (payload.eventType === 'INSERT') {
            setAgents(prev => [...prev, payload.new as Agent]);
          } else if (payload.eventType === 'UPDATE') {
            setAgents(prev => 
              prev.map(agent => 
                agent.id === payload.new.id ? (payload.new as Agent) : agent
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setAgents(prev => 
              prev.filter(agent => agent.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();
    
    // Clean up subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [farmId, enableRealtime]);

  // Get active agents
  const activeAgents = agents.filter(agent => agent.is_active);
  
  // Get inactive agents
  const inactiveAgents = agents.filter(agent => !agent.is_active);
  
  // Calculate counts
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
    error,
    refresh: async () => {
      setLoading(true);
      const supabase = createBrowserClient();
      let query = supabase.from('agents').select('*');
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      const { data, error: refreshError } = await query;
      
      if (refreshError) {
        setError(refreshError.message);
      } else {
        setAgents(data || []);
        setError(null);
      }
      
      setLoading(false);
    }
  };
} 