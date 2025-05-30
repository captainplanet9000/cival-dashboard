"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { agentApi, Agent, AgentResponse } from '@/services/agent-api';

// Types for the context
interface AIAgentContextType {
  agents: Agent[];
  activeAgent: Agent | null;
  isLoading: boolean;
  error: string | null;
  serviceAvailable: boolean;
  
  // Agent management functions
  setActiveAgent: (agentId: string) => void;
  createAgent: (name: string, instructions: string) => Promise<Agent>;
  deleteAgent: (agentId: string) => Promise<boolean>;
  
  // Agent interaction
  sendMessage: (message: string) => Promise<AgentResponse>;
  refreshAgents: () => Promise<void>;
}

// Create the context with default values
const AIAgentContextV2 = createContext<AIAgentContextType>({
  agents: [],
  activeAgent: null,
  isLoading: false,
  error: null,
  serviceAvailable: false,
  
  setActiveAgent: () => {},
  createAgent: async () => ({ agent_id: '', name: '' }),
  deleteAgent: async () => false,
  
  sendMessage: async () => ({ agent_id: '', response: {}, timestamp: '' }),
  refreshAgents: async () => {},
});

// Sample instructions for default agents
const DEFAULT_INSTRUCTIONS = {
  trendFollower: `You are a trend following trading agent specializing in cryptocurrency markets. 
  Your primary focus is to identify and capitalize on established trends using technical indicators 
  like moving averages, MACD, and RSI. Provide specific entry and exit signals based on trend 
  strength and momentum indicators. You should be conservative with your recommendations and
  prioritize risk management over aggressive trading.`,
  
  volatilityTrader: `You are a volatility trading specialist focused on identifying trading 
  opportunities during periods of increased market volatility. You utilize indicators like 
  Bollinger Bands, ATR, and volatility breakouts to find high-probability setups. Your 
  expertise is in capturing market moves during news events, breakouts, and significant 
  price action. Always provide precise entry, stop-loss, and multiple take-profit targets.`,
  
  patternRecognition: `You are a chart pattern recognition expert specialized in identifying 
  technical patterns across multiple timeframes. You focus on classic patterns (head and shoulders, 
  double tops/bottoms), harmonic patterns (Gartley, butterfly), and candlestick patterns. For each 
  pattern you identify, explain its formation, potential implications, confirmation signals, and 
  provide specific trading parameters with proper risk management guidelines.`,
};

// Provider component
export function AIAgentProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgentState] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState<boolean>(false);
  
  // Initialize by checking service availability and loading agents
  useEffect(() => {
    const initializeService = async () => {
      try {
        setIsLoading(true);
        // Check if the agent service is available
        await agentApi.healthCheck();
        setServiceAvailable(true);
        
        // Load existing agents
        await refreshAgents();
      } catch (error) {
        console.error('Error initializing agent service:', error);
        setServiceAvailable(false);
        setError('Agent service is unavailable. Please ensure the Python backend is running.');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeService();
  }, []);
  
  // Set the active agent by ID
  const setActiveAgent = (agentId: string) => {
    const agent = agents.find(a => a.agent_id === agentId) || null;
    setActiveAgentState(agent);
  };
  
  // Refresh the list of agents
  const refreshAgents = async (): Promise<void> => {
    if (!serviceAvailable) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await agentApi.listAgents();
      setAgents(response.agents);
      
      // If we have agents but no active agent, set the first one as active
      if (response.agents.length > 0 && !activeAgent) {
        setActiveAgentState(response.agents[0]);
      }
      
      // If there are no agents, create default ones
      if (response.agents.length === 0) {
        await createDefaultAgents();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new agent
  const createAgent = async (name: string, instructions: string): Promise<Agent> => {
    if (!serviceAvailable) {
      throw new Error('Agent service is unavailable');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const agent = await agentApi.createAgent({ name, instructions });
      
      // Update the agents list
      setAgents(prev => [...prev, agent]);
      
      // If this is the first agent, set it as active
      if (agents.length === 0) {
        setActiveAgentState(agent);
      }
      
      return agent;
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete an agent
  const deleteAgent = async (agentId: string): Promise<boolean> => {
    if (!serviceAvailable) {
      throw new Error('Agent service is unavailable');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await agentApi.deleteAgent(agentId);
      
      // Update the agents list
      setAgents(prev => prev.filter(a => a.agent_id !== agentId));
      
      // If the active agent was deleted, set the first agent as active (if any)
      if (activeAgent?.agent_id === agentId) {
        const remainingAgents = agents.filter(a => a.agent_id !== agentId);
        setActiveAgentState(remainingAgents.length > 0 ? remainingAgents[0] : null);
      }
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete agent');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Send a message to the active agent
  const sendMessage = async (message: string): Promise<AgentResponse> => {
    if (!serviceAvailable) {
      throw new Error('Agent service is unavailable');
    }
    
    if (!activeAgent) {
      throw new Error('No active agent selected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await agentApi.sendMessage({
        agent_id: activeAgent.agent_id,
        message,
      });
      
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create default agents if none exist
  const createDefaultAgents = async (): Promise<void> => {
    try {
      const trendFollower = await createAgent('TrendFollower', DEFAULT_INSTRUCTIONS.trendFollower);
      await createAgent('VolatilityTrader', DEFAULT_INSTRUCTIONS.volatilityTrader);
      await createAgent('PatternExpert', DEFAULT_INSTRUCTIONS.patternRecognition);
      
      // Set the first created agent as active
      setActiveAgentState(trendFollower);
    } catch (error) {
      console.error('Error creating default agents:', error);
    }
  };
  
  const contextValue: AIAgentContextType = {
    agents,
    activeAgent,
    isLoading,
    error,
    serviceAvailable,
    
    setActiveAgent,
    createAgent,
    deleteAgent,
    
    sendMessage,
    refreshAgents,
  };
  
  return (
    <AIAgentContextV2.Provider value={contextValue}>
      {children}
    </AIAgentContextV2.Provider>
  );
}

// Custom hook for using the AI agent context
export const useAIAgentV2 = () => useContext(AIAgentContextV2);

export default AIAgentContextV2;
