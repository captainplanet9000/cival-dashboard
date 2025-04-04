/**
 * ElizaOS Agent Service
 * Extends base agents with advanced autonomous capabilities
 */

import { Agent, ExtendedAgent } from '@/services/agent-service';
import { toolService, EquippedTool } from '@/services/tool-service';
import { llmService, Message, LLMResponse } from '@/services/llm-service';
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';

// Event types for agent-environment interaction
export type AgentEventType = 
  | 'COMMAND_RESPONSE'      // Response to a command
  | 'KNOWLEDGE_RESPONSE'    // Response from knowledge base
  | 'MARKET_DATA'           // Market data update
  | 'TRADE_EXECUTION'       // Trade executed
  | 'TRADE_RESULT'          // Trade result
  | 'STATUS_UPDATE'         // Status update
  | 'TOOL_EXECUTION'        // Tool execution
  | 'MEMORY_RETRIEVE'       // Memory retrieval
  | 'MEMORY_STORE'          // Memory storage
  | 'ERROR';                // Error event

// Message source types
export type MessageSourceType = 
  | 'knowledge-base'
  | 'market-data'
  | 'strategy'
  | 'system'
  | 'user'
  | 'tool'
  | 'exchange';

// Message category types
export type MessageCategoryType = 
  | 'command'       // Execution command
  | 'query'         // Information query
  | 'analysis'      // Data analysis
  | 'alert'         // Important notification
  | 'status';       // Status update

// Agent memory entry
export interface AgentMemory {
  id: string;
  agent_id: string;
  key: string;            // Identifier for the memory
  content: any;           // Memory content (can be any data)
  context: string;        // Context of the memory (trading context, market, etc.)
  source: MessageSourceType;
  importance: number;     // 1-10 rating of importance
  created_at: string;
  updated_at: string;
  expires_at?: string;    // Optional expiration
  metadata?: Record<string, any>;
}

// Agent event interface
export interface AgentEvent {
  type: AgentEventType;
  agent_id: string;
  timestamp: string;
  data: any;              // Event data
  source: MessageSourceType;
  metadata?: Record<string, any>;
}

// Trading action interface
export interface TradingAction {
  action_type: 'BUY' | 'SELL' | 'CLOSE' | 'MODIFY';
  symbol: string;
  quantity?: number;
  price?: number;
  order_type?: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  time_in_force?: 'GTC' | 'IOC' | 'FOK';
  leverage?: number;
  stop_loss?: number;
  take_profit?: number;
  metadata?: Record<string, any>;
}

// Command execution result
export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  context?: Record<string, any>;
}

// Agent interaction message
export interface AgentMessage {
  id: string;
  agent_id: string;
  content: string;
  role: 'user' | 'agent' | 'system';
  source: MessageSourceType;
  category: MessageCategoryType;
  timestamp: string;
  metadata?: Record<string, any>;
  related_action?: TradingAction;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/**
 * ElizaOS Agent Service for advanced agent capabilities
 */
export const elizaAgentService = {
  /**
   * Initialize an ElizaOS agent with advanced capabilities
   */
  async initializeAgent(agentId: string): Promise<ApiResponse<ExtendedAgent>> {
    try {
      // Fetch the agent details
      const response = await fetch(`/api/agents/${agentId}/eliza/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to initialize ElizaOS agent: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.agent) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.agent };
    } catch (error) {
      console.error(`Error initializing ElizaOS agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Send a command to the agent for execution
   */
  async sendCommand(agentId: string, command: string, context: Record<string, any> = {}): Promise<ApiResponse<CommandResult>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/eliza/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          context
        }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send command to agent: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.commandResult) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.commandResult };
    } catch (error) {
      console.error(`Error sending command to agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get agent's memory entries
   */
  async getAgentMemories(agentId: string, context?: string, limit: number = 20): Promise<ApiResponse<AgentMemory[]>> {
    try {
      const url = new URL(`/api/agents/${agentId}/eliza/memories`, window.location.origin);
      if (context) url.searchParams.append('context', context);
      url.searchParams.append('limit', limit.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agent memories: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.memories || !Array.isArray(result.memories)) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.memories };
    } catch (error) {
      console.error(`Error fetching memories for agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Store a new memory for the agent
   */
  async storeAgentMemory(agentId: string, memory: Omit<AgentMemory, 'id' | 'agent_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<AgentMemory>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/eliza/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memory),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to store agent memory: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.memory) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.memory };
    } catch (error) {
      console.error(`Error storing memory for agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get agent conversation history
   */
  async getAgentConversation(agentId: string, limit: number = 50): Promise<ApiResponse<AgentMessage[]>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/eliza/messages?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agent conversation: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.messages || !Array.isArray(result.messages)) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.messages };
    } catch (error) {
      console.error(`Error fetching conversation for agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Send a message to the agent and get a response
   */
  async sendMessage(agentId: string, message: string, category: MessageCategoryType = 'query', context: Record<string, any> = {}): Promise<ApiResponse<AgentMessage>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/eliza/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          category,
          context
        }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message to agent: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.message) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.message };
    } catch (error) {
      console.error(`Error sending message to agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get agent knowledge base
   */
  async getAgentKnowledge(agentId: string, query?: string): Promise<ApiResponse<any[]>> {
    try {
      const url = new URL(`/api/agents/${agentId}/eliza/knowledge`, window.location.origin);
      if (query) url.searchParams.append('query', query);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agent knowledge: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.knowledge || !Array.isArray(result.knowledge)) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.knowledge };
    } catch (error) {
      console.error(`Error fetching knowledge for agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Add knowledge to agent's knowledge base
   */
  async addAgentKnowledge(agentId: string, knowledge: { title: string, content: string, metadata?: Record<string, any> }): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/eliza/knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(knowledge),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add agent knowledge: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.knowledge) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.knowledge };
    } catch (error) {
      console.error(`Error adding knowledge for agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Execute a trading action through the agent
   */
  async executeTradingAction(agentId: string, action: TradingAction): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/eliza/trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to execute trading action: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.trade) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.trade };
    } catch (error) {
      console.error(`Error executing trading action for agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get agent's trading permission status for markets/exchanges
   */
  async getTradingPermissions(agentId: string): Promise<ApiResponse<{ exchanges: string[], defi_protocols: string[] }>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/eliza/permissions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trading permissions: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.permissions) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.permissions };
    } catch (error) {
      console.error(`Error fetching trading permissions for agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Update agent's trading permissions
   */
  async updateTradingPermissions(agentId: string, permissions: { exchanges?: string[], defi_protocols?: string[] }): Promise<ApiResponse<{ exchanges: string[], defi_protocols: string[] }>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/eliza/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(permissions),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update trading permissions: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.permissions) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.permissions };
    } catch (error) {
      console.error(`Error updating trading permissions for agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Get agent performance metrics with enhanced analysis
   */
  async getAgentPerformanceAnalysis(agentId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`/api/agents/${agentId}/eliza/performance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agent performance analysis: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.performance) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.performance };
    } catch (error) {
      console.error(`Error fetching performance analysis for agent ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  }
};
