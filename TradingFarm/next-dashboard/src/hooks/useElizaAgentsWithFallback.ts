/**
 * useElizaAgentsWithFallback Hook
 * 
 * A robust hook for fetching ElizaOS agents with automatic fallback to mock data
 * when authentication fails or when the backend services are unavailable.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { mockElizaAgents, mockDataService } from '@/services/mock-data-service';

export function useElizaAgentsWithFallback() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const supabase = createBrowserClient();
  const router = useRouter();

  // Fetch all ElizaOS agents
  const refreshAgents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check authentication first
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        console.log('No active session, using mock data for ElizaOS agents');
        setAgents(mockElizaAgents);
        setUsingMockData(true);
        setLoading(false);
        return;
      }
      
      // Try using API first
      try {
        const response = await fetch('/api/elizaos/agents');
        if (response.ok) {
          const data = await response.json();
          setAgents(data.agents || []);
          setUsingMockData(false);
          return;
        }
      } catch (apiError) {
        console.error('API endpoint failed, falling back to direct DB query:', apiError);
      }
      
      // Try direct DB query
      const { data, error: fetchError } = await supabase
        .from('elizaos_agents')
        .select('*');
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (data && data.length > 0) {
        setAgents(data);
        setUsingMockData(false);
      } else {
        // No agents found in database, use mock data
        console.log('No agents found in database, using mock data');
        setAgents(mockElizaAgents);
        setUsingMockData(true);
      }
    } catch (err) {
      console.error('Error fetching ElizaOS agents:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
      
      // Always fall back to mock data on error
      setAgents(mockElizaAgents);
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    refreshAgents();
  }, []);

  // Control agent (start, stop, pause, resume)
  const controlAgent = async (agentId: string, action: 'start' | 'stop' | 'pause' | 'resume') => {
    if (usingMockData) {
      // Simulate agent control with mock data
      const updatedAgents = agents.map(agent => {
        if (agent.id === agentId) {
          const newStatus = {
            'start': 'active',
            'stop': 'idle',
            'pause': 'paused',
            'resume': 'active'
          }[action];
          
          return { ...agent, status: newStatus };
        }
        return agent;
      });
      
      setAgents(updatedAgents);
      return;
    }
    
    try {
      // Check authentication
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        throw new Error('Authentication required');
      }
      
      // Try API endpoint first
      try {
        const response = await fetch(`/api/elizaos/agents/${agentId}/control`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action }),
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        
        // Refresh the agent list
        await refreshAgents();
        return;
      } catch (apiError) {
        console.error('API control failed, trying direct DB update:', apiError);
      }
      
      // Fall back to direct DB update
      const newStatus = {
        'start': 'active',
        'stop': 'idle',
        'pause': 'paused',
        'resume': 'active'
      }[action];
      
      const { error: updateError } = await supabase
        .from('elizaos_agents')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', agentId);
      
      if (updateError) throw updateError;
      
      // Refresh the agent list
      await refreshAgents();
    } catch (error) {
      console.error(`Error ${action}ing agent:`, error);
      throw error;
    }
  };

  // Create a new ElizaOS agent
  const createAgent = async (agentData: any) => {
    if (usingMockData) {
      // Create a mock agent
      const newAgent = await mockDataService.createElizaAgent(agentData);
      setAgents([...agents, newAgent]);
      return newAgent;
    }
    
    try {
      // Check authentication
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        throw new Error('Authentication required');
      }
      
      // Try API endpoint first
      try {
        const response = await fetch('/api/elizaos/agents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(agentData),
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        
        const createdAgent = await response.json();
        await refreshAgents();
        return createdAgent;
      } catch (apiError) {
        console.error('API creation failed, trying direct DB insert:', apiError);
      }
      
      // Fall back to direct DB insertion
      const { data, error: insertError } = await supabase
        .from('elizaos_agents')
        .insert([agentData])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Refresh the agent list
      await refreshAgents();
      return data;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  };

  return {
    agents,
    loading,
    error,
    refreshAgents,
    controlAgent,
    createAgent,
    usingMockData
  };
}
