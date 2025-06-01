import { useState, useCallback, useEffect } from 'react';
import { Agent } from '@/types/agent';

// Mock data - this would typically come from an API
const initialAgents: Agent[] = [
  {
    id: '1',
    name: 'TrendSurfer',
    status: 'active',
    type: 'Algorithmic',
    description: 'Trend following algorithm focused on major crypto pairs',
    model: 'GPT-4o',
    performance: {
      day: 2.5,
      week: 7.8,
      month: 21.3,
      winRate: 68,
      avgProfit: 1.2
    },
    farm: {
      id: 'farm-1',
      name: 'Crypto Alpha'
    },
    trades: [
      { id: 'tr-1', pair: 'BTC/USDT', type: 'buy', amount: 0.2, price: 52800, time: '2023-03-23T14:32:15Z', profit: 2.3 },
      { id: 'tr-2', pair: 'ETH/USDT', type: 'sell', amount: 1.5, price: 3150, time: '2023-03-23T13:15:22Z', profit: -0.8 },
    ],
    capabilities: ['Technical Analysis', 'Market Data', 'Automated Execution'],
    tools: [
      { name: 'TradingView API', status: 'active', lastUsed: '20 min ago', usageLevel: 'High' },
      { name: 'DEX Aggregator', status: 'active', lastUsed: '35 min ago', usageLevel: 'Medium' },
      { name: 'Risk Calculator', status: 'active', lastUsed: '1h ago', usageLevel: 'Low' }
    ],
    settings: {
      general: {
        timeZone: 'UTC',
        notifications: true,
        reportFrequency: 'daily',
      },
      trading: {
        maxTradeSize: 1000,
        stopLoss: 2.5,
        takeProfit: 5.0,
        leverageAllowed: false,
      },
      automation: {
        active: true,
        tradingHours: 'all',
        maxDailyTrades: 10,
      }
    },
    AIModelConfig: {
      primary: 'GPT-4o',
      fallback: 'Claude-3-Haiku',
      maxBudget: 25,
      usedBudget: 11.4,
      avgTokensPerRequest: 1250,
      promptTemplate: 'Standard Trading'
    }
  }
];

export function useAIAgentV2() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with mock data on first mount
  useEffect(() => {
    refreshAgents();
  }, []);

  // Fetch all agents (simulated)
  const refreshAgents = useCallback(() => {
    setIsLoading(true);
    setError(null);
    
    // Simulate API call
    setTimeout(() => {
      setAgents(initialAgents);
      setIsLoading(false);
    }, 500);
  }, []);

  // Delete an agent
  const deleteAgent = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      setAgents(prevAgents => prevAgents.filter(agent => agent.id !== id));
    } catch (err) {
      setError('Failed to delete agent');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add a new agent
  const addAgent = useCallback(async (newAgent: Omit<Agent, 'id'>) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      const id = Math.random().toString(36).substring(2, 9);
      const agent = { id, ...newAgent };
      setAgents(prevAgents => [...prevAgents, agent]);
      return agent;
    } catch (err) {
      setError('Failed to add agent');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update an agent
  const updateAgent = useCallback(async (updatedAgent: Agent) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      setAgents(prevAgents => 
        prevAgents.map(agent => 
          agent.id === updatedAgent.id ? updatedAgent : agent
        )
      );
      return true;
    } catch (err) {
      setError('Failed to update agent');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    agents,
    activeAgentId,
    setActiveAgentId,
    isLoading,
    error,
    refreshAgents,
    deleteAgent,
    addAgent,
    updateAgent,
  };
}
