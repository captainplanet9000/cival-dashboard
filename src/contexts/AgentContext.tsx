'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';

interface Agent {
  id: string;
  name: string;
  agent_type: string;
  is_active: boolean;
}

interface AgentContextType {
  agents: Agent[];
  currentAgentId: string | null;
  setCurrentAgentId: (id: string | null) => void;
  loadingAgents: boolean;
}

const AgentContext = createContext<AgentContextType>({
  agents: [],
  currentAgentId: null,
  setCurrentAgentId: () => {},
  loadingAgents: true,
});

export const useAgentId = () => useContext(AgentContext);

interface AgentProviderProps {
  children: ReactNode;
}

export const AgentProvider: React.FC<AgentProviderProps> = ({ children }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [loadingAgents, setLoadingAgents] = useState<boolean>(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoadingAgents(true);
        
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('is_active', true)
          .order('name');
        
        if (error) {
          console.error('Error fetching agents:', error);
          return;
        }
        
        if (data && data.length > 0) {
          setAgents(data as Agent[]);
          
          // Set first agent as default if none is selected
          if (!currentAgentId) {
            setCurrentAgentId(data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setLoadingAgents(false);
      }
    };

    fetchAgents();
    
    // Set up realtime subscription for agent changes
    const subscription = supabase
      .channel('agent-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'agents' 
        },
        () => {
          fetchAgents();
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AgentContext.Provider
      value={{
        agents,
        currentAgentId,
        setCurrentAgentId,
        loadingAgents,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}; 