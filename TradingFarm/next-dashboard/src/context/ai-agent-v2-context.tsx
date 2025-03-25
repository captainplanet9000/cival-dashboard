"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useToast } from "@/components/ui/use-toast";

// Define the Agent interface for V2
export interface AIAgentV2 {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'offline' | string;
  type?: string;
  performance?: number;
  trades?: number;
  winRate?: number;
  createdAt?: string;
  specialization: string[];
  description?: string;
  level?: 'basic' | 'advanced' | 'expert' | string;
  walletAddress?: string;
  wallet_address?: string; 
  farm_id?: string; 
  balance?: number;
  transactions?: AgentTransaction[];
  detailedPerformance?: DetailedPerformance;
  settings: Settings;
  instructions: string[] | Instruction[];
  exchange?: ExchangeConfig; 
}

// Define the transaction interface
export interface AgentTransaction {
  id: string;
  timestamp: string;
  amount: number;
  type: 'deposit' | 'withdraw' | 'withdrawal' | 'trade';
  details?: string;
  txHash?: string;
  status?: 'pending' | 'completed' | 'failed';
}

// Added for agent exchange configuration
export interface ExchangeConfig {
  name: string;
  apiKey: string;
  apiSecret: string;
  apiPassphrase?: string;
  apiEndpoint?: string;
}

// Define the message interface
export interface AIAgentMessage {
  id: string;
  role: 'system' | 'user' | 'agent';
  content: string;
  timestamp: string;
  agentId?: string;
}

// Define the suggested command interface
export interface SuggestedCommand {
  id: string;
  command: string;
  description: string;
}

// Define the detailed performance interface
export interface DetailedPerformance {
  daily: number;
  weekly: number;
  monthly: number;
  allTime: number;
  trades: Trades;
  profitFactor: number;
  avgDuration: string;
}

// Define the trades interface
export interface Trades {
  won: number;
  lost: number;
  total: number;
}

// Define the settings interface
export interface Settings {
  riskLevel?: string;
  risk_level?: number; 
  maxDrawdown?: number;
  max_drawdown?: number; 
  positionSizing?: number;
  position_size_percent?: number; 
  tradesPerDay?: number;
  trades_per_day?: number; 
  automationLevel?: string;
  automation_level?: string; 
  timeframes?: string[];
  indicators?: string[];
  trade_size?: number; 
  max_open_positions?: number; 
  strategyType?: string; 
}

// Define the instruction interface
export interface Instruction {
  id: string;
  content: string;
  createdAt: string;
  enabled: boolean;
  category: string;
  impact: string;
}

// Define the context interface
interface AIAgentV2ContextType {
  agents: AIAgentV2[];
  messages: AIAgentMessage[];
  suggestedCommands: SuggestedCommand[];
  isLoading: boolean;
  isSending: boolean;
  activeAgentId: string | null;
  createAgent: (agentData: Partial<AIAgentV2>) => Promise<AIAgentV2>;
  deleteAgent: (agentId: string) => Promise<boolean>;
  refreshAgents: () => Promise<void>;
  sendMessage: (message: string, agentId?: string) => Promise<void>;
  setActiveAgentId: (agentId: string | null) => void;
  clearMessages: () => void;
}

// Create the context
const AIAgentV2Context = createContext<AIAgentV2ContextType | undefined>(undefined);

// Define mock data to use as fallback when API is not available
const initialAgentData: AIAgentV2[] = [
  {
    id: "agent-1",
    name: "TrendSurfer Pro",
    status: "active",
    type: "trend",
    performance: 8.4,
    trades: 56,
    winRate: 72,
    createdAt: "2025-03-15T09:30:00Z",
    specialization: ["Trend Following", "Momentum"],
    description: "Advanced trend-following AI that identifies and capitalizes on strong market trends.",
    level: "advanced",
    walletAddress: "0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    balance: 12500,
    transactions: [
      {
        id: "tx-1",
        type: "deposit",
        amount: 10000,
        timestamp: "2025-03-10T14:23:10Z",
        status: "completed"
      }
    ],
    detailedPerformance: {
      daily: 0.5,
      weekly: 2.1,
      monthly: 5.8,
      allTime: 8.2,
      trades: {
        won: 18,
        lost: 14,
        total: 32
      },
      profitFactor: 1.8,
      avgDuration: "5h 30m"
    },
    settings: {
      riskLevel: "high",
      maxDrawdown: 20,
      positionSizing: 15,
      tradesPerDay: 2,
      automationLevel: "semi",
      timeframes: ["4h", "Daily", "Weekly"],
      indicators: ["RSI", "Stochastic", "Bollinger Bands"]
    },
    instructions: [
      {
        id: "instr-2",
        content: "Look for overbought/oversold conditions in combination with price pattern confirmations",
        createdAt: "2025-02-20T10:20:00Z",
        enabled: true,
        category: "strategy",
        impact: "medium"
      }
    ]
  }
];

// Helper function for API calls
const callApi = async <T,>(endpoint: string, method: string = 'GET', body?: any): Promise<T> => {
  try {
    // For development, immediately return mock data instead of making API calls
    // This prevents infinite loading if backend is not available
    if (endpoint.includes('/agents')) {
      console.log(`Mock API call to ${endpoint}`);
      return initialAgentData as unknown as T;
    }
    
    if (endpoint.includes('/messages')) {
      console.log(`Mock API call to ${endpoint}`);
      return [] as unknown as T;
    }

    // In production, this would be a real API call
    const response = await fetch(`/api${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
};

// AI Agent V2 Provider component
export const AIAgentV2Provider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AIAgentV2[]>(initialAgentData); // Initialize with mock data
  const [messages, setMessages] = useState<AIAgentMessage[]>([]);
  const [suggestedCommands, setSuggestedCommands] = useState<SuggestedCommand[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start as false to prevent loading screen
  const [isSending, setIsSending] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  // Fetch agents on component mount - memoize to prevent re-renders
  const fetchAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedAgents = await callApi<AIAgentV2[]>('/agents');
      setAgents(fetchedAgents);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
      toast({
        title: "Failed to load agents",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch messages when active agent changes - memoize to prevent re-renders
  const fetchMessages = useCallback(async (agentId: string | null) => {
    if (agentId) {
      try {
        const fetchedMessages = await callApi<AIAgentMessage[]>(`/agents/${agentId}/messages`);
        setMessages(fetchedMessages);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        toast({
          title: "Failed to load messages",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
        // Clear messages on error
        setMessages([]);
      }
    } else {
      // No active agent, clear messages
      setMessages([]);
    }
  }, [toast]);

  // Initialize with data on mount
  useEffect(() => {
    // Initialize with mock data immediately to prevent loading screens
    setAgents(initialAgentData);
    setIsLoading(false);
    
    // Don't try to fetch from API in development to prevent infinite loading
    // fetchAgents();
  }, []);

  // When active agent changes, fetch messages
  useEffect(() => {
    if (activeAgentId) {
      // In a real app, we would fetch messages
      // For now, just set empty messages to prevent API calls
      setMessages([]);
    }
  }, [activeAgentId]);

  // Create a new agent - memoize to prevent re-renders
  const createAgent = useCallback(async (agentData: Partial<AIAgentV2>): Promise<AIAgentV2> => {
    try {
      setIsLoading(true);
      
      // Generate a mock new agent with default values
      const newAgent: AIAgentV2 = {
        id: `agent-${Date.now()}`,
        name: agentData.name || 'New Agent',
        status: agentData.status || 'active',
        type: agentData.type || 'trend',
        performance: agentData.performance || 0,
        trades: agentData.trades || 0,
        winRate: agentData.winRate || 0,
        createdAt: new Date().toISOString().split('T')[0],
        specialization: agentData.specialization || ['General'],
        description: agentData.description || 'New trading agent',
        level: agentData.level || 'basic',
        walletAddress: agentData.walletAddress || '0x0000...0000',
        balance: agentData.balance || 0,
        transactions: agentData.transactions || [],
        detailedPerformance: agentData.detailedPerformance || {
          daily: 0,
          weekly: 0,
          monthly: 0,
          allTime: 0,
          trades: {
            won: 0,
            lost: 0,
            total: 0
          },
          profitFactor: 0,
          avgDuration: '0h'
        },
        settings: agentData.settings || {
          riskLevel: 'low',
          maxDrawdown: 5,
          positionSizing: 2,
          tradesPerDay: 5,
          automationLevel: 'semi',
          timeframes: ['1h', '4h'],
          indicators: ['RSI', 'MACD']
        },
        instructions: agentData.instructions || []
      };
      
      // For a real application, we would call the API
      // const createdAgent = await callApi<AIAgentV2>('/agents', 'POST', agentData);
      
      // Update local state with the new agent
      setAgents(prevAgents => [...prevAgents, newAgent]);
      
      toast({
        title: "Agent Created",
        description: `${newAgent.name} has been created successfully.`,
      });
      
      return newAgent;
    } catch (error) {
      console.error("Failed to create agent:", error);
      toast({
        title: "Failed to create agent",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Delete an agent - memoize to prevent re-renders
  const deleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // For a real application, we would call the API
      // await callApi(`/agents/${agentId}`, 'DELETE');
      
      // For now, just update local state
      setAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentId));
      
      // If the deleted agent was active, clear active agent
      if (activeAgentId === agentId) {
        setActiveAgentId(null);
      }
      
      toast({
        title: "Agent Deleted",
        description: "The agent has been deleted successfully.",
      });
      
      return true;
    } catch (error) {
      console.error("Failed to delete agent:", error);
      toast({
        title: "Failed to delete agent",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, activeAgentId]);

  // Refresh agents list - memoize to prevent re-renders
  const refreshAgents = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // For a real application, we would call the API
      // const refreshedAgents = await callApi<AIAgentV2[]>('/agents');
      // setAgents(refreshedAgents);
      
      // For now, just keep the existing agents
      toast({
        title: "Agents Refreshed",
        description: "The agent list has been refreshed.",
      });
    } catch (error) {
      console.error("Failed to refresh agents:", error);
      toast({
        title: "Failed to refresh agents",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Send a message to an agent - memoize to prevent re-renders
  const sendMessage = useCallback(async (message: string, agentId?: string): Promise<void> => {
    try {
      const targetAgentId = agentId || activeAgentId;
      if (!targetAgentId) {
        throw new Error("No agent selected to send message to");
      }
      
      setIsSending(true);
      
      const newUserMessage: AIAgentMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        agentId: targetAgentId
      };
      
      // Add user message to the local state
      setMessages(prev => [...prev, newUserMessage]);
      
      // In a real app, we would send to API and get a response
      // const response = await callApi<AIAgentMessage>(`/agents/${targetAgentId}/messages`, 'POST', { content: message });
      
      // Generate a mock agent response
      setTimeout(() => {
        const agentResponse: AIAgentMessage = {
          id: `msg-${Date.now()}-agent`,
          role: 'agent',
          content: `I've received your message: "${message}". This is a mock response as we're in development mode.`,
          timestamp: new Date().toISOString(),
          agentId: targetAgentId
        };
        
        setMessages(prev => [...prev, agentResponse]);
        
        // Generate suggested commands based on the message
        const newSuggestedCommands: SuggestedCommand[] = [
          {
            id: `cmd-${Date.now()}-1`,
            command: '/status',
            description: 'Check agent status'
          },
          {
            id: `cmd-${Date.now()}-2`,
            command: '/help',
            description: 'See available commands'
          }
        ];
        
        setSuggestedCommands(newSuggestedCommands);
        setIsSending(false);
      }, 500); // Simulate network delay
      
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      setIsSending(false);
    }
  }, [activeAgentId, toast]);

  // Clear messages - memoize to prevent re-renders
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    agents,
    messages,
    suggestedCommands,
    isLoading,
    isSending,
    activeAgentId,
    createAgent,
    deleteAgent,
    refreshAgents,
    sendMessage,
    setActiveAgentId,
    clearMessages
  }), [
    agents,
    messages,
    suggestedCommands,
    isLoading,
    isSending,
    activeAgentId,
    createAgent,
    deleteAgent,
    refreshAgents,
    sendMessage,
    setActiveAgentId,
    clearMessages
  ]);

  return (
    <AIAgentV2Context.Provider value={contextValue}>
      {children}
    </AIAgentV2Context.Provider>
  );
};

// Custom hook to use the context
export const useAIAgentV2 = (): AIAgentV2ContextType => {
  const context = useContext(AIAgentV2Context);
  
  if (context === undefined) {
    throw new Error('useAIAgentV2 must be used within an AIAgentV2Provider');
  }
  
  return context;
};
