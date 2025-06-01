'use client';

import React from 'react';
const { useState, useEffect } = React;
import { useSocket } from '@/providers/socket-provider';
import { createBrowserClient } from '@/utils/supabase/client';

// Development flag to use mock data
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'offline';
  lastActive: string;
  description?: string;
  performance?: {
    winRate: number;
    trades: number;
    pnl: number;
  };
}

interface AgentStatusData {
  agents: Agent[];
  activeCount: number;
  idleCount: number;
  offlineCount: number;
}

// Mock agent data for development
const MOCK_AGENT_DATA: AgentStatusData = {
  agents: [
    {
      id: 'agent-1',
      name: 'Market Analyst',
      type: 'analysis',
      status: 'active',
      lastActive: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      description: 'Analyzes market conditions and identifies opportunities',
      performance: { winRate: 65, trades: 42, pnl: 1240 },
    },
    {
      id: 'agent-2',
      name: 'Trend Follower',
      type: 'execution',
      status: 'active',
      lastActive: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      description: 'Executes trades based on trend signals',
      performance: { winRate: 58, trades: 37, pnl: 850 },
    },
    {
      id: 'agent-3',
      name: 'Risk Manager',
      type: 'risk',
      status: 'idle',
      lastActive: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      description: 'Monitors portfolio risk and enforces limits',
      performance: { winRate: 72, trades: 18, pnl: 320 },
    },
    {
      id: 'agent-4',
      name: 'Portfolio Optimizer',
      type: 'optimization',
      status: 'offline',
      lastActive: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      description: 'Balances portfolio for optimal performance',
      performance: { winRate: 61, trades: 25, pnl: -120 },
    },
  ],
  activeCount: 2,
  idleCount: 1,
  offlineCount: 1,
};

export function useAgentStatus(farmId: string) {
  const [data, setData] = useState<AgentStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { subscribe, latestMessages } = useSocket();
  const supabase = createBrowserClient();

  // Initial data fetch
  useEffect(() => {
    async function fetchAgentStatus() {
      setIsLoading(true);
      
      // If in development mode and USE_MOCK_DATA is true, use mock data
      if (USE_MOCK_DATA) {
        console.log('Using mock agent data');
        setData(MOCK_AGENT_DATA);
        setIsLoading(false);
        return;
      }
      
      try {
        // Fetch from Supabase in production or when mock data is disabled
        const { data: agentsData, error } = await supabase
          .from('agents')
          .select('*')
          .eq('farm_id', farmId);

        if (error) throw error;

        if (agentsData && agentsData.length > 0) {
          const formattedAgents = agentsData.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            type: agent.type,
            status: agent.status as 'active' | 'idle' | 'offline',
            lastActive: agent.last_active || new Date().toISOString(),
            description: agent.description,
            performance: agent.performance || {
              winRate: Math.random() * 30 + 50, // Random between 50-80%
              trades: Math.floor(Math.random() * 50) + 10, // Random between 10-60
              pnl: (Math.random() * 20 - 5) * 100, // Random between -500 and 1500
            },
          }));

          setData({
            agents: formattedAgents,
            activeCount: formattedAgents.filter((a: Agent) => a.status === 'active').length,
            idleCount: formattedAgents.filter((a: Agent) => a.status === 'idle').length,
            offlineCount: formattedAgents.filter((a: Agent) => a.status === 'offline').length,
          });
        } else {
          // Use mock data if no agents found
          setData(MOCK_AGENT_DATA);
        }
      } catch (err) {
        // Log error but not in development mode with mock data enabled
        if (!USE_MOCK_DATA) {
          console.error('Error fetching agent status:', err);
        }
        
        setError(err instanceof Error ? err : new Error(String(err)));
        // Use fallback data
        setData(MOCK_AGENT_DATA);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAgentStatus();

    // Subscribe to agent status updates via WebSocket
    subscribe('AGENT_STATUS');

    return () => {
      // No need to unsubscribe as the hook handles this
    };
  }, [farmId, supabase, subscribe]);

  // Listen for real-time updates
  useEffect(() => {
    if (latestMessages?.AGENT_STATUS && data) {
      const { agentId, status, lastActive } = latestMessages.AGENT_STATUS;
      
      setData((prevData: AgentStatusData | null) => {
        if (!prevData) return null;
        
        // Update the specific agent's status
        const updatedAgents = prevData.agents.map(agent => 
          agent.id === agentId 
            ? { ...agent, status: status as 'active' | 'idle' | 'offline', lastActive } 
            : agent
        );
        
        return {
          agents: updatedAgents,
          activeCount: updatedAgents.filter((a: Agent) => a.status === 'active').length,
          idleCount: updatedAgents.filter((a: Agent) => a.status === 'idle').length,
          offlineCount: updatedAgents.filter((a: Agent) => a.status === 'offline').length,
        };
      });
    }
  }, [latestMessages, data]);

  return { data, isLoading, error };
}
