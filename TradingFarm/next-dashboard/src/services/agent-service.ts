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
  id: number;
  name: string;
  description?: string;
  farm_id: number;
  type: string;
  strategy_type?: string;
  status: string;
  risk_level?: string;
  target_markets?: string[];
  configuration?: AgentConfiguration;
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
}

export interface AgentCreationRequest {
  name: string;
  description?: string;
  farm_id: number;
  type?: string;
  strategy_type?: string;
  risk_level?: string;
  target_markets?: string[];
  status?: string;
  config?: any;
}

export interface AgentHistoryEntry {
  id: number;
  agent_id: number;
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
      const supabase = createBrowserClient();
      
      // Query the agents table
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          farms:farm_id (name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching agents:', error);
        return { error: error.message };
      }
      
      // Transform the data to extract the farm name and properly cast configuration
      const extendedAgents: ExtendedAgent[] = data.map(agent => {
        // Safely extract configuration properties
        const configObj = safeGetConfig(agent.configuration);
        const performanceMetrics = safeGetConfig(configObj.performance_metrics);
        
        return {
          ...agent,
          // Cast configuration to the right type
          configuration: configObj as AgentConfiguration,
          // Extract properties from configuration
          description: configObj.description as string | undefined,
          strategy_type: configObj.strategy_type as string | undefined,
          risk_level: configObj.risk_level as string | undefined,
          target_markets: Array.isArray(configObj.target_markets) ? configObj.target_markets : undefined,
          performance_metrics: {
            win_rate: performanceMetrics.win_rate || 0,
            profit_loss: performanceMetrics.profit_loss || 0,
            total_trades: performanceMetrics.total_trades || 0,
            average_trade_duration: performanceMetrics.average_trade_duration || 0
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
  async getAgent(id: number): Promise<ApiResponse<ExtendedAgent>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          farms:farm_id (name)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        console.error(`Error fetching agent with ID ${id}:`, error);
        return { error: error.message };
      }
      
      // Safely extract configuration properties
      const configObj = safeGetConfig(data.configuration);
      const performanceMetrics = safeGetConfig(configObj.performance_metrics);
      
      const extendedAgent: ExtendedAgent = {
        ...data,
        // Cast configuration to the right type
        configuration: configObj as AgentConfiguration,
        // Extract properties from configuration
        description: configObj.description as string | undefined,
        strategy_type: configObj.strategy_type as string | undefined,
        risk_level: configObj.risk_level as string | undefined,
        target_markets: Array.isArray(configObj.target_markets) ? configObj.target_markets : undefined,
        performance_metrics: {
          win_rate: performanceMetrics.win_rate || 0,
          profit_loss: performanceMetrics.profit_loss || 0,
          total_trades: performanceMetrics.total_trades || 0,
          average_trade_duration: performanceMetrics.average_trade_duration || 0
        },
        farm_name: data.farms?.name || `Farm ${data.farm_id}`,
        is_active: data.status === 'active'
      };
      
      return { data: extendedAgent };
    } catch (error) {
      console.error(`Unexpected error fetching agent with ID ${id}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Create a new agent
   */
  async createAgent(agentData: AgentCreationRequest): Promise<ApiResponse<ExtendedAgent>> {
    try {
      const supabase = createBrowserClient();
      
      // Prepare agent data for database
      // Moving fields that don't exist in the table schema into configuration JSON
      const agentToCreate = {
        name: agentData.name,
        farm_id: agentData.farm_id,
        status: agentData.status || 'initializing',
        type: agentData.type || 'eliza', // Setting to eliza by default
        configuration: {
          description: agentData.description,
          strategy_type: agentData.strategy_type,
          risk_level: agentData.risk_level,
          target_markets: agentData.target_markets,
          performance_metrics: {
            win_rate: 0,
            profit_loss: 0,
            total_trades: 0,
            average_trade_duration: 0
          },
          ...agentData.config // Add any additional configuration options
        }
      };
      
      console.log('Creating agent with data:', agentToCreate);
      
      const { data, error } = await supabase
        .from('agents')
        .insert(agentToCreate)
        .select(`
          *,
          farms:farm_id (name)
        `)
        .single();
      
      if (error) {
        console.error('Error creating agent:', error);
        return { error: error.message };
      }
      
      // Safely extract configuration properties
      const configObj = safeGetConfig(data.configuration);
      const performanceMetrics = safeGetConfig(configObj.performance_metrics);
      
      // Transform the returned data to match the ExtendedAgent interface
      const createdAgent: ExtendedAgent = {
        ...data,
        // Cast configuration to the right type
        configuration: configObj as AgentConfiguration,
        // Extract properties from configuration
        description: configObj.description as string || '',
        strategy_type: configObj.strategy_type as string || '',
        risk_level: configObj.risk_level as string || '',
        target_markets: Array.isArray(configObj.target_markets) ? configObj.target_markets : [],
        performance_metrics: {
          win_rate: performanceMetrics.win_rate || 0,
          profit_loss: performanceMetrics.profit_loss || 0,
          total_trades: performanceMetrics.total_trades || 0,
          average_trade_duration: performanceMetrics.average_trade_duration || 0
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
  async updateAgent(id: number, updates: Partial<Agent>): Promise<ApiResponse<ExtendedAgent>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          farms:farm_id (name)
        `)
        .single();
      
      if (error) {
        console.error(`Error updating agent with ID ${id}:`, error);
        return { error: error.message };
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
  async updateAgentPerformance(id: number, performanceData: Partial<Agent['performance_metrics']>): Promise<ApiResponse<ExtendedAgent>> {
    try {
      const supabase = createBrowserClient();
      
      // Fetch current agent to get existing performance metrics
      const { data: currentAgent, error: fetchError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error(`Error fetching agent ${id} for performance update:`, fetchError);
        return { error: fetchError.message };
      }
      
      // Type assertion to handle the database schema
      const agentData = currentAgent as unknown as Agent;
      
      // Ensure we have a performance_metrics object
      const currentMetrics = agentData.performance_metrics || {};
      
      // Merge existing metrics with new data
      const updatedMetrics = {
        ...currentMetrics,
        ...performanceData
      };
      
      // Update the agent with new performance metrics
      const { data, error } = await supabase
        .from('agents')
        .update({
          performance_metrics: updatedMetrics,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          farms:farm_id (name)
        `)
        .single();
      
      if (error) {
        console.error(`Error updating agent performance ${id}:`, error);
        return { error: error.message };
      }
      
      const updatedAgent: ExtendedAgent = {
        ...data,
        farm_name: data.farms?.name || `Farm ${data.farm_id}`,
        is_active: data.status === 'active'
      };
      
      return { data: updatedAgent };
    } catch (error) {
      console.error(`Unexpected error updating agent performance ${id}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Change agent status (activate/deactivate/pause)
   */
  async changeAgentStatus(id: number, status: string): Promise<ApiResponse<ExtendedAgent>> {
    return this.updateAgent(id, { status });
  },
  
  /**
   * Delete an agent
   */
  async deleteAgent(id: number): Promise<ApiResponse<null>> {
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error(`Error deleting agent with ID ${id}:`, error);
        return { error: error.message };
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
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('farms')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error fetching farms:', error);
        return { error: error.message };
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
  async getAgentActivity(agentId: number): Promise<ApiResponse<AgentHistoryEntry[]>> {
    try {
      const supabase = createBrowserClient();
      
      // Since the agent_activity table doesn't exist yet in the database schema,
      // we're returning an empty array for now. In production, uncomment the query below
      // when the table is available.
      
      /*
      const { data, error } = await supabase
        .from('agent_activity')
        .select('*')
        .eq('agent_id', agentId)
        .order('timestamp', { ascending: false });
      
      if (error) {
        console.error(`Error fetching activity for agent with ID ${agentId}:`, error);
        return { error: error.message };
      }
      
      return { data };
      */
      
      // Temporary implementation until table exists
      return { data: [] };
    } catch (error) {
      console.error(`Unexpected error fetching activity for agent with ID ${agentId}:`, error);
      return { error: 'An unexpected error occurred' };
    }
  }
};
