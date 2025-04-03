/**
 * Agent Service
 * Handles all agent-related API interactions
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';
import { Json } from '@/types/database.types';

// Define a type for the configuration data to improve type safety
export interface AgentConfiguration {
  description?: string;
  strategy_type?: string;
  risk_level?: string;
  target_markets?: string[];
  performance_metrics?: {
    win_rate?: number;
    profit_loss?: number;
    total_trades?: number;
    average_trade_duration?: number;
  };
  [key: string]: any; // Allow additional configuration options
}

// Helper function to safely extract configuration values
function safeGetConfig(config: unknown): Record<string, any> {
  if (!config) return {};
  
  if (typeof config === 'string') {
    try {
      return JSON.parse(config) || {};
    } catch (e) {
      return {};
    }
  }
  
  if (typeof config === 'object' && config !== null) {
    return config as Record<string, any>;
  }
  
  return {};
}

// Agent interfaces
export interface Agent {
  id: string;
  name: string;
  description?: string | null;
  farm_id: string | null;
  type: string;
  strategy_type?: string;
  status: string;
  risk_level?: string;
  target_markets?: string[];
  config?: Json; // Actual database field
  configuration?: AgentConfiguration; // Processed configuration for UI
  instructions?: string | null;
  permissions?: Json;
  performance?: Json;
  user_id?: string | null;
  is_active?: boolean; // Calculated property based on status
  performance_metrics?: {
    win_rate?: number;
    profit_loss?: number;
    total_trades?: number;
    average_trade_duration?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface ExtendedAgent extends Agent {
  farm_name?: string;
  farms?: {
    id: string;
    name: string;
  }
}

export interface AgentCreationRequest {
  name: string;
  description?: string;
  farm_id: string;
  type?: string;
  strategy_type?: string;
  risk_level?: string;
  target_markets?: string[];
  status?: string;
  config?: any;
}

export interface AgentHistoryEntry {
  id: string;
  agent_id: string;
  action: string;
  details?: any;
  timestamp: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/**
 * Agent service for managing trading agents
 */
export const agentService = {
  /**
   * Get all agents
   */
  async getAgents(): Promise<ApiResponse<ExtendedAgent[]>> {
    try {
      // Use API route instead of direct Supabase query
      const response = await fetch('/api/agents', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`);
      }
      
      const { agents } = await response.json();
      
      if (!agents || !Array.isArray(agents)) {
        return { error: 'Invalid response format from API' };
      }
      
      // Transform the data to extract farm details and properly cast configuration
      const extendedAgents: ExtendedAgent[] = agents.map(agent => {
        // Safely extract configuration properties
        const configObj = safeGetConfig(agent.config);
        const performanceObj = safeGetConfig(agent.performance);
        
        return {
          ...agent,
          // Map config to configuration for UI consistency
          configuration: configObj as AgentConfiguration,
          // Extract properties from configuration
          description: agent.description || configObj.description as string | undefined,
          strategy_type: configObj.strategy_type as string | undefined,
          risk_level: configObj.risk_level as string | undefined,
          target_markets: Array.isArray(configObj.target_markets) ? configObj.target_markets : undefined,
          performance_metrics: {
            win_rate: performanceObj.win_rate || 0,
            profit_loss: performanceObj.profit_loss || 0,
            total_trades: performanceObj.total_trades || 0,
            average_trade_duration: performanceObj.average_trade_duration || 0
          },
          farm_name: agent.farms?.name || `Farm ${agent.farm_id}`,
          is_active: agent.status === 'active'
        };
      });
      
      return { data: extendedAgents };
    } catch (error) {
      console.error('Unexpected error fetching agents:', error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Get a specific agent by ID
   */
  async getAgent(id: string): Promise<ApiResponse<ExtendedAgent>> {
    try {
      // Use API route instead of direct Supabase query
      const response = await fetch(`/api/agents/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agent: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data) {
        return { error: 'Agent not found' };
      }
      
      // Safely extract configuration properties
      const configObj = safeGetConfig(data.config);
      const performanceObj = safeGetConfig(data.performance);
      
      const extendedAgent: ExtendedAgent = {
        ...data,
        // Map config to configuration for UI consistency
        configuration: configObj as AgentConfiguration,
        // Extract properties from configuration
        description: data.description || configObj.description as string | undefined,
        strategy_type: configObj.strategy_type as string | undefined,
        risk_level: configObj.risk_level as string | undefined,
        target_markets: Array.isArray(configObj.target_markets) ? configObj.target_markets : undefined,
        performance_metrics: {
          win_rate: performanceObj.win_rate || 0,
          profit_loss: performanceObj.profit_loss || 0,
          total_trades: performanceObj.total_trades || 0,
          average_trade_duration: performanceObj.average_trade_duration || 0
        },
        farm_name: data.farms?.name || `Farm ${data.farm_id}`,
        is_active: data.status === 'active'
      };
      
      return { data: extendedAgent };
    } catch (error) {
      console.error(`Error fetching agent with ID ${id}:`, error);
      return { error: 'Failed to fetch agent details' };
    }
  },
  
  /**
   * Create a new agent
   */
  async createAgent(agentData: AgentCreationRequest): Promise<ApiResponse<ExtendedAgent>> {
    try {
      // Use API route instead of direct Supabase query
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create agent: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data) {
        return { error: 'Failed to create agent' };
      }
      
      // Safely extract configuration properties
      const configObj = safeGetConfig(data.config);
      const performanceObj = safeGetConfig(data.performance);
      
      const createdAgent: ExtendedAgent = {
        ...data,
        // Map config to configuration for UI consistency
        configuration: configObj as AgentConfiguration,
        // Extract properties from configuration
        description: data.description || configObj.description as string | undefined,
        strategy_type: configObj.strategy_type as string | undefined,
        risk_level: configObj.risk_level as string | undefined,
        target_markets: Array.isArray(configObj.target_markets) ? configObj.target_markets : undefined,
        performance_metrics: {
          win_rate: performanceObj.win_rate || 0,
          profit_loss: performanceObj.profit_loss || 0,
          total_trades: performanceObj.total_trades || 0,
          average_trade_duration: performanceObj.average_trade_duration || 0
        },
        farm_name: data.farms?.name || `Farm ${data.farm_id}`,
        is_active: data.status === 'active'
      };
      
      return { data: createdAgent };
    } catch (error) {
      console.error('Unexpected error creating agent:', error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Update an agent
   */
  async updateAgent(id: string, updates: Partial<Agent>): Promise<ApiResponse<ExtendedAgent>> {
    try {
      // Use API route instead of direct Supabase query
      const response = await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update agent: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data) {
        return { error: 'Failed to update agent' };
      }
      
      const updatedAgent: ExtendedAgent = {
        ...data,
        farm_name: data.farms?.name || `Farm ${data.farm_id}`,
        is_active: data.status === 'active'
      };
      
      return { data: updatedAgent };
    } catch (error) {
      console.error(`Unexpected error updating agent with ID ${id}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Get available strategy types
   */
  async getStrategyTypes(): Promise<ApiResponse<string[]>> {
    try {
      // Return a list of predefined strategy types
      return { 
        data: [
          'trend_following',
          'mean_reversion',
          'breakout',
          'scalping',
          'momentum',
          'arbitrage',
          'news_based',
          'grid_trading',
          'ai_driven'
        ] 
      };
    } catch (error) {
      console.error('Error fetching strategy types:', error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Get risk levels
   */
  async getRiskLevels(): Promise<ApiResponse<string[]>> {
    try {
      // Return a list of predefined risk levels
      return { 
        data: [
          'very_low',
          'low',
          'medium',
          'high',
          'very_high'
        ] 
      };
    } catch (error) {
      console.error('Error fetching risk levels:', error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Get available markets
   */
  async getAvailableMarkets(): Promise<ApiResponse<string[]>> {
    try {
      // Return a list of predefined markets
      return { 
        data: [
          'BTC/USD',
          'ETH/USD',
          'XRP/USD',
          'ADA/USD',
          'BNB/USD',
          'SOL/USD',
          'DOGE/USD',
          'DOT/USD',
          'AVAX/USD',
          'SHIB/USD'
        ] 
      };
    } catch (error) {
      console.error('Error fetching available markets:', error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Update agent performance metrics
   */
  async updateAgentPerformance(id: string, performanceData: Partial<Agent['performance_metrics']>): Promise<ApiResponse<ExtendedAgent>> {
    try {
      // Use API route instead of direct Supabase query
      const response = await fetch(`/api/agents/${id}/performance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(performanceData),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update agent performance: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data) {
        return { error: 'Failed to update agent performance' };
      }
      
      const updatedAgent: ExtendedAgent = {
        ...data,
        farm_name: data.farms?.name || `Farm ${data.farm_id}`,
        is_active: data.status === 'active'
      };
      
      return { data: updatedAgent };
    } catch (error) {
      console.error(`Unexpected error updating agent performance with ID ${id}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Change agent status (activate/deactivate/pause)
   */
  async changeAgentStatus(id: string, status: string): Promise<ApiResponse<ExtendedAgent>> {
    return this.updateAgent(id, { status });
  },
  
  /**
   * Delete an agent
   */
  async deleteAgent(id: string): Promise<ApiResponse<null>> {
    try {
      // Use API route instead of direct Supabase query
      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete agent: ${response.statusText}`);
      }
      
      return { data: null };
    } catch (error) {
      console.error(`Unexpected error deleting agent with ID ${id}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Get available farms for agent creation
   */
  async getAvailableFarms(): Promise<ApiResponse<{ id: number; name: string }[]>> {
    try {
      // Use API route instead of direct Supabase query
      const response = await fetch('/api/farms', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch farms: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data) {
        return { error: 'Failed to fetch farms' };
      }
      
      return { data };
    } catch (error) {
      console.error('Unexpected error fetching farms:', error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Get agent activity logs
   * Note: Implementation assumes there's an agent_activity table in the database
   */
  async getAgentActivity(agentId: string): Promise<ApiResponse<AgentHistoryEntry[]>> {
    try {
      // Use API route instead of direct Supabase query
      const response = await fetch(`/api/agents/${agentId}/activity`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agent activity: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data) {
        return { error: 'Failed to fetch agent activity' };
      }
      
      return { data };
    } catch (error) {
      console.error(`Unexpected error fetching activity for agent with ID ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  }
};
