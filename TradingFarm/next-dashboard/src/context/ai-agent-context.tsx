"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Agent, TradingAgent, AgentAction, AgentInstruction } from '@/types/ai-agent';
import OpenAIAgentService from '@/services/openai-service';

// Initial mock data for testing
const initialAgents: TradingAgent[] = [
  {
    id: '1',
    name: 'Alpha Hunter',
    description: 'Specialized in finding alpha in volatile markets',
    capabilities: ['trend detection', 'pattern recognition', 'volatility analysis'],
    status: 'idle',
    model: 'gpt-4-turbo',
    specialization: ['crypto', 'forex'],
    risk_tolerance: 'medium',
    max_allocation: 25,
    strategies: ['momentum', 'breakout'],
    performance: {
      win_rate: 68,
      profit_factor: 1.75,
      drawdown: 12,
      total_trades: 145,
      successful_trades: 98,
      failed_trades: 47
    },
    created_at: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Steady Gains',
    description: 'Conservative trading focused on capital preservation',
    capabilities: ['risk management', 'position sizing', 'fundamental analysis'],
    status: 'idle',
    model: 'gpt-4-turbo',
    specialization: ['stocks', 'etfs'],
    risk_tolerance: 'low',
    max_allocation: 15,
    strategies: ['value', 'swing'],
    performance: {
      win_rate: 75,
      profit_factor: 1.55,
      drawdown: 8,
      total_trades: 210,
      successful_trades: 157,
      failed_trades: 53
    },
    created_at: new Date('2023-11-22')
  },
  {
    id: '3',
    name: 'High Flyer',
    description: 'Aggressive trading for maximum returns',
    capabilities: ['momentum detection', 'technical analysis', 'sentiment analysis'],
    status: 'idle',
    model: 'gpt-4-turbo',
    specialization: ['crypto', 'options'],
    risk_tolerance: 'high',
    max_allocation: 35,
    strategies: ['scalping', 'momentum'],
    performance: {
      win_rate: 55,
      profit_factor: 2.15,
      drawdown: 22,
      total_trades: 180,
      successful_trades: 99,
      failed_trades: 81
    },
    created_at: new Date('2024-02-01')
  }
];

// Agent context types
interface AIAgentContextType {
  agents: TradingAgent[];
  activeAgent: TradingAgent | null;
  agentActions: AgentAction[];
  instructions: AgentInstruction[];
  isLoading: boolean;
  error: string | null;
  
  // Agent management functions
  setActiveAgent: (agentId: string) => void;
  createAgent: (agent: Partial<TradingAgent>) => Promise<TradingAgent>;
  updateAgent: (agentId: string, updates: Partial<TradingAgent>) => Promise<TradingAgent>;
  deleteAgent: (agentId: string) => Promise<boolean>;
  
  // Agent actions
  analyzeMarket: (symbol: string, timeframe: string) => Promise<any>;
  processInstruction: (instruction: string) => Promise<AgentInstruction>;
  generateStrategy: (riskTolerance: 'low' | 'medium' | 'high', preferences: string[]) => Promise<any>;
  analyzeTradeRisk: (symbol: string, entry: number, stopLoss: number, target: number, position: number) => Promise<any>;
  getAgentHistory: (agentId: string) => { actions: AgentAction[], instructions: AgentInstruction[] };
}

// Create the context with default values
const AIAgentContext = createContext<AIAgentContextType>({
  agents: [],
  activeAgent: null,
  agentActions: [],
  instructions: [],
  isLoading: false,
  error: null,
  
  setActiveAgent: () => {},
  createAgent: async () => ({ 
    id: '', 
    name: '', 
    capabilities: [], 
    status: 'idle', 
    model: '', 
    specialization: [], 
    risk_tolerance: 'medium', 
    max_allocation: 0, 
    strategies: [],
    created_at: new Date(),
    performance: {
      win_rate: 0,
      profit_factor: 0,
      drawdown: 0,
      total_trades: 0,
      successful_trades: 0,
      failed_trades: 0
    }
  }),
  updateAgent: async () => ({ 
    id: '', 
    name: '', 
    capabilities: [], 
    status: 'idle', 
    model: '', 
    specialization: [], 
    risk_tolerance: 'medium', 
    max_allocation: 0, 
    strategies: [],
    created_at: new Date(),
    performance: {
      win_rate: 0,
      profit_factor: 0,
      drawdown: 0,
      total_trades: 0,
      successful_trades: 0,
      failed_trades: 0
    }
  }),
  deleteAgent: async () => false,
  
  analyzeMarket: async () => ({}),
  processInstruction: async () => ({ id: '', agent_id: '', instruction: '', created_at: new Date(), status: 'pending' }),
  generateStrategy: async () => ({}),
  analyzeTradeRisk: async () => ({}),
  getAgentHistory: () => ({ actions: [], instructions: [] }),
});

// Provider component
export function AIAgentProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<TradingAgent[]>(initialAgents);
  const [activeAgent, setActiveAgentState] = useState<TradingAgent | null>(null);
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const [instructions, setInstructions] = useState<AgentInstruction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize OpenAI service
  const openAIService = new OpenAIAgentService();
  
  // Set the active agent by ID
  const setActiveAgent = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId) || null;
    setActiveAgentState(agent);
  };
  
  // Create a new agent
  const createAgent = async (agentData: Partial<TradingAgent>): Promise<TradingAgent> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be an API call
      const newAgent: TradingAgent = {
        id: crypto.randomUUID(),
        name: agentData.name || 'New Agent',
        description: agentData.description || 'An AI trading agent',
        capabilities: agentData.capabilities || ['technical analysis'],
        status: 'idle',
        model: agentData.model || 'gpt-4-turbo',
        specialization: agentData.specialization || ['crypto'],
        risk_tolerance: agentData.risk_tolerance || 'medium',
        max_allocation: agentData.max_allocation || 10,
        strategies: agentData.strategies || [],
        created_at: new Date(),
        performance: {
          win_rate: 0,
          profit_factor: 0,
          drawdown: 0,
          total_trades: 0,
          successful_trades: 0,
          failed_trades: 0
        }
      };
      
      setAgents([...agents, newAgent]);
      return newAgent;
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update an existing agent
  const updateAgent = async (agentId: string, updates: Partial<TradingAgent>): Promise<TradingAgent> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be an API call
      const updatedAgents = agents.map(agent => {
        if (agent.id === agentId) {
          return { ...agent, ...updates };
        }
        return agent;
      });
      
      setAgents(updatedAgents);
      
      const updatedAgent = updatedAgents.find(a => a.id === agentId);
      if (!updatedAgent) {
        throw new Error('Agent not found');
      }
      
      if (activeAgent?.id === agentId) {
        setActiveAgentState(updatedAgent);
      }
      
      return updatedAgent;
    } catch (err: any) {
      setError(err.message || 'Failed to update agent');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete an agent
  const deleteAgent = async (agentId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be an API call
      const updatedAgents = agents.filter(agent => agent.id !== agentId);
      setAgents(updatedAgents);
      
      if (activeAgent?.id === agentId) {
        setActiveAgentState(null);
      }
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete agent');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Analyze market using active agent
  const analyzeMarket = async (symbol: string, timeframe: string) => {
    if (!activeAgent) {
      throw new Error('No active agent selected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // For demo purposes, using mock data - in production would fetch real market data
      const mockHistoricalData = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
        open: 45000 + Math.random() * 2000,
        high: 46000 + Math.random() * 2000,
        low: 44000 + Math.random() * 2000,
        close: 45500 + Math.random() * 2000,
        volume: 1000000 + Math.random() * 500000
      }));
      
      const analysis = await openAIService.analyzeMarket(symbol, timeframe, mockHistoricalData);
      
      const action: AgentAction = {
        id: `action-${Date.now()}`,
        agent_id: activeAgent.id,
        action_type: 'market_analysis',
        status: 'completed',
        created_at: new Date(),
        completed_at: new Date(),
        params: {
          symbol,
          timeframe,
        },
        result: analysis,
      };
      
      setAgentActions([...agentActions, action]);
      
      return analysis;
    } catch (err: any) {
      setError(err.message || 'Failed to analyze market');
      
      const failedAction: AgentAction = {
        id: `action-${Date.now()}`,
        agent_id: activeAgent.id,
        action_type: 'market_analysis',
        status: 'failed',
        created_at: new Date(),
        params: {
          symbol,
          timeframe,
        },
        error: err.message,
      };
      
      setAgentActions([...agentActions, failedAction]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Process natural language instruction
  const processInstruction = async (instruction: string): Promise<AgentInstruction> => {
    if (!activeAgent) {
      throw new Error('No active agent selected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await openAIService.processAgentInstruction(activeAgent, instruction);
      setInstructions([...instructions, result]);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to process instruction');
      
      const failedInstruction: AgentInstruction = {
        id: `instruction-${Date.now()}`,
        agent_id: activeAgent.id,
        instruction,
        created_at: new Date(),
        status: 'rejected',
        response: err.message,
      };
      
      setInstructions([...instructions, failedInstruction]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate trading strategy
  const generateStrategy = async (riskTolerance: 'low' | 'medium' | 'high', preferences: string[]) => {
    if (!activeAgent) {
      throw new Error('No active agent selected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const strategy = await openAIService.generateTradingStrategy(
        activeAgent.specialization.join(', '),
        riskTolerance,
        preferences
      );
      
      const action: AgentAction = {
        id: `action-${Date.now()}`,
        agent_id: activeAgent.id,
        action_type: 'report',
        status: 'completed',
        created_at: new Date(),
        completed_at: new Date(),
        params: {
          risk_tolerance: riskTolerance,
          preferences,
        },
        result: strategy,
      };
      
      setAgentActions([...agentActions, action]);
      
      return strategy;
    } catch (err: any) {
      setError(err.message || 'Failed to generate strategy');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Analyze trade risk
  const analyzeTradeRisk = async (symbol: string, entry: number, stopLoss: number, target: number, position: number) => {
    if (!activeAgent) {
      throw new Error('No active agent selected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const risk = await openAIService.analyzeTradeRisk(symbol, entry, stopLoss, target, position);
      
      const action: AgentAction = {
        id: `action-${Date.now()}`,
        agent_id: activeAgent.id,
        action_type: 'report',
        status: 'completed',
        created_at: new Date(),
        completed_at: new Date(),
        params: {
          symbol,
          entry,
          stopLoss,
          target,
          position,
        },
        result: risk,
      };
      
      setAgentActions([...agentActions, action]);
      
      return risk;
    } catch (err: any) {
      setError(err.message || 'Failed to analyze trade risk');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get agent history
  const getAgentHistory = (agentId: string) => {
    const agentActionHistory = agentActions.filter(action => action.agent_id === agentId);
    const agentInstructionHistory = instructions.filter(instruction => instruction.agent_id === agentId);
    
    return {
      actions: agentActionHistory,
      instructions: agentInstructionHistory,
    };
  };
  
  // Set the first agent as active on initial load if none is selected
  useEffect(() => {
    if (agents.length > 0 && !activeAgent) {
      setActiveAgentState(agents[0]);
    }
  }, [agents, activeAgent]);
  
  const contextValue: AIAgentContextType = {
    agents,
    activeAgent,
    agentActions,
    instructions,
    isLoading,
    error,
    
    setActiveAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    
    analyzeMarket,
    processInstruction,
    generateStrategy,
    analyzeTradeRisk,
    getAgentHistory,
  };
  
  return (
    <AIAgentContext.Provider value={contextValue}>
      {children}
    </AIAgentContext.Provider>
  );
}

// Custom hook for using the AI agent context
export const useAIAgent = () => useContext(AIAgentContext);

export default AIAgentContext;
