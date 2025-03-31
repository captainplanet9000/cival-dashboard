/**
 * Agent Service
 * Handles all agent-related API interactions
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';

// Define the Agent interface based on the database schema
export interface Agent {
  id: number;
  name: string;
  farm_id: number;
  status: string;
  type: string;
  configuration: any;
  created_at?: string;
  updated_at?: string;
}

// Extended agent interface with UI-specific fields
export interface ExtendedAgent extends Agent {
  description?: string;
  user_id?: string;
  strategy_type?: string;
  risk_level?: string;
  target_markets?: string[];
  performance_metrics?: {
    win_rate?: number;
    profit_loss?: number;
    trade_count?: number;
    total_trades?: number;
    profitable_trades?: number;
    success_rate?: number;
    total_profit?: number;
    profit_last_24h?: number;
    avg_holding_time?: string;
  };
}

// Agent creation request
export interface AgentCreationRequest {
  name: string;
  description?: string;
  farm_id: number;
  strategy_type: string;
  risk_level: string;
  target_markets: string[];
  config?: any;
}

// Agent activity interface
export interface AgentActivity {
  id: number;
  agent_id: number;
  activity_type: string;
  details?: any;
  status?: string;
  created_at?: string;
}

// Agent history entry
export interface AgentHistoryEntry {
  id: number;
  agent_id: number;
  entry_type: string;
  data: any;
  timestamp: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Helper function to extract extended properties from agent configuration
const mapAgentToExtended = (agent: Agent): ExtendedAgent => {
  const config = agent.configuration || {};
  // Ensure config is treated as an object to safely access properties
  const configObj = typeof config === 'object' && config !== null ? config : {};
  
  return {
    ...agent,
    description: configObj.description,
    user_id: configObj.user_id,
    strategy_type: configObj.strategy_type || agent.type,
    risk_level: configObj.risk_level,
    target_markets: Array.isArray(configObj.target_markets) ? configObj.target_markets : [],
    performance_metrics: typeof configObj.performance_metrics === 'object' && configObj.performance_metrics !== null 
      ? configObj.performance_metrics 
      : {}
  };
};

// Helper function to prepare agent data for database
const prepareAgentForDatabase = (agentData: AgentCreationRequest): any => {
  return {
    name: agentData.name,
    farm_id: agentData.farm_id,
    status: 'initializing',
    type: agentData.strategy_type,
    configuration: {
      description: agentData.description,
      strategy_type: agentData.strategy_type,
      risk_level: agentData.risk_level,
      target_markets: agentData.target_markets,
      config: agentData.config || {},
      performance_metrics: {}
    }
  };
};

// Agent service implementation
export const agentService = {
  /**
   * Get all agents or agents for a specific farm
   */
  async getAgents(farmId?: number): Promise<ApiResponse<ExtendedAgent[]>> {
    try {
      const supabase = createBrowserClient();
      
      let query = supabase
        .from('agents')
        .select('*');
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching agents:', error);
        return { error: error.message };
      }
      
      // Map database agents to extended agents
      const extendedAgents = data.map(mapAgentToExtended);
      
      return { data: extendedAgents };
    } catch (error) {
      console.error('Error fetching agents:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get a specific agent by ID
   */
  async getAgentById(id: number): Promise<ApiResponse<ExtendedAgent>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error(`Error fetching agent ${id}:`, error);
        return { error: error.message };
      }
      
      // Map database agent to extended agent
      const extendedAgent = mapAgentToExtended(data);
      
      return { data: extendedAgent };
    } catch (error) {
      console.error(`Error fetching agent ${id}:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a new agent
   */
  async createAgent(agentData: AgentCreationRequest): Promise<ApiResponse<ExtendedAgent>> {
    try {
      const supabase = createBrowserClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: 'User not authenticated' };
      }
      
      // Prepare agent data for database
      const dbAgent = prepareAgentForDatabase(agentData);
      
      // Add user_id to configuration
      dbAgent.configuration.user_id = user.id;
      
      const { data, error } = await supabase
        .from('agents')
        .insert(dbAgent)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating agent:', error);
        return { error: error.message };
      }
      
      // Log creation activity directly in DB or using local tracking
      this.trackAgentActivity(data.id, 'created', { initial_config: agentData }, 'success');
      
      // Return the extended agent
      return { data: mapAgentToExtended(data) };
    } catch (error) {
      console.error('Error creating agent:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Update an agent
   */
  async updateAgent(id: number, updateData: Partial<ExtendedAgent>): Promise<ApiResponse<ExtendedAgent>> {
    try {
      const supabase = createBrowserClient();
      
      // First, get the current agent data
      const { data: currentAgent, error: fetchError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error(`Error fetching agent ${id} for update:`, fetchError);
        return { error: fetchError.message };
      }
      
      // Prepare update object based on database schema
      const updateObj: any = {};
      
      // Only add properties if they are defined
      if (updateData.name !== undefined) updateObj.name = updateData.name;
      if (updateData.farm_id !== undefined) updateObj.farm_id = updateData.farm_id;
      if (updateData.status !== undefined) updateObj.status = updateData.status;
      if (updateData.type !== undefined) updateObj.type = updateData.type;
      else if (updateData.strategy_type !== undefined) updateObj.type = updateData.strategy_type;
      
      // Update configuration if any related fields are provided
      if (
        updateData.description !== undefined || 
        updateData.strategy_type !== undefined || 
        updateData.risk_level !== undefined || 
        updateData.target_markets !== undefined ||
        updateData.performance_metrics !== undefined
      ) {
        // Get current configuration and ensure it's an object
        const currentConfig = typeof currentAgent.configuration === 'object' && currentAgent.configuration !== null 
          ? currentAgent.configuration 
          : {};
        
        // Create updated configuration
        const updatedConfig: any = { ...currentConfig };
        
        if (updateData.description !== undefined) updatedConfig.description = updateData.description;
        if (updateData.strategy_type !== undefined) updatedConfig.strategy_type = updateData.strategy_type;
        if (updateData.risk_level !== undefined) updatedConfig.risk_level = updateData.risk_level;
        if (updateData.target_markets !== undefined) updatedConfig.target_markets = updateData.target_markets;
        
        if (updateData.performance_metrics !== undefined) {
          // Initialize performance_metrics if it doesn't exist
          if (!updatedConfig.performance_metrics || typeof updatedConfig.performance_metrics !== 'object') {
            updatedConfig.performance_metrics = {};
          }
          
          // Safely update performance metrics
          const currentMetrics = updatedConfig.performance_metrics;
          const newMetrics = updateData.performance_metrics;
          
          // Only update defined properties
          if (newMetrics.win_rate !== undefined) currentMetrics.win_rate = newMetrics.win_rate;
          if (newMetrics.profit_loss !== undefined) currentMetrics.profit_loss = newMetrics.profit_loss;
          if (newMetrics.trade_count !== undefined) currentMetrics.trade_count = newMetrics.trade_count;
          if (newMetrics.total_trades !== undefined) currentMetrics.total_trades = newMetrics.total_trades;
          if (newMetrics.profitable_trades !== undefined) currentMetrics.profitable_trades = newMetrics.profitable_trades;
          if (newMetrics.success_rate !== undefined) currentMetrics.success_rate = newMetrics.success_rate;
          if (newMetrics.total_profit !== undefined) currentMetrics.total_profit = newMetrics.total_profit;
          if (newMetrics.profit_last_24h !== undefined) currentMetrics.profit_last_24h = newMetrics.profit_last_24h;
          if (newMetrics.avg_holding_time !== undefined) currentMetrics.avg_holding_time = newMetrics.avg_holding_time;
        }
        
        // Add updated configuration to update object
        updateObj.configuration = updatedConfig;
      }
      
      // Only proceed with update if there are fields to update
      if (Object.keys(updateObj).length === 0) {
        return { data: mapAgentToExtended(currentAgent) };
      }
      
      // Perform the update
      const { data, error } = await supabase
        .from('agents')
        .update(updateObj)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error(`Error updating agent ${id}:`, error);
        return { error: error.message };
      }
      
      // Track update activity
      this.trackAgentActivity(id, 'updated', { updated_fields: Object.keys(updateData) }, 'success');
      
      // Return the extended agent
      return { data: mapAgentToExtended(data) };
    } catch (error) {
      console.error(`Error updating agent ${id}:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Delete an agent
   */
  async deleteAgent(id: number): Promise<ApiResponse<void>> {
    try {
      const supabase = createBrowserClient();
      
      // Track deletion activity
      this.trackAgentActivity(id, 'deleted', { agent_id: id }, 'pending');
      
      // Delete the agent
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error(`Error deleting agent ${id}:`, error);
        // Update activity status to failed
        this.trackAgentActivity(id, 'deletion_failed', { agent_id: id, error: error.message }, 'failed');
        return { error: error.message };
      }
      
      return { data: undefined };
    } catch (error) {
      console.error(`Error deleting agent ${id}:`, error);
      // Log the failure
      this.trackAgentActivity(id, 'deletion_failed', { agent_id: id, error: error instanceof Error ? error.message : 'Unknown error' }, 'failed');
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Change agent status (activate/deactivate/pause)
   */
  async changeAgentStatus(id: number, status: string): Promise<ApiResponse<ExtendedAgent>> {
    try {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('agents')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error(`Error changing agent status ${id}:`, error);
        return { error: error.message };
      }
      
      // Track status change
      this.trackAgentActivity(id, 'status_changed', { new_status: status }, 'success');
      
      // Return the extended agent
      return { data: mapAgentToExtended(data) };
    } catch (error) {
      console.error(`Error changing agent status ${id}:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Track agent activity (temporary implementation until agent_activities table is available)
   * This tracks activities in local storage and console for development
   */
  trackAgentActivity(
    agentId: number, 
    activityType: string, 
    details: any = {}, 
    status: string = 'pending'
  ): void {
    // Create activity object
    const activity = {
      id: Date.now(), // Temporary ID
      agent_id: agentId,
      activity_type: activityType,
      details,
      status,
      created_at: new Date().toISOString()
    };
    
    // Log to console for development
    console.log(`[Agent Activity] ${activityType} for agent ${agentId}:`, activity);
    
    // Store in local storage for development
    try {
      const activitiesKey = `agent_activities_${agentId}`;
      const existingActivities = JSON.parse(localStorage.getItem(activitiesKey) || '[]');
      existingActivities.unshift(activity);
      localStorage.setItem(activitiesKey, JSON.stringify(existingActivities.slice(0, 50))); // Keep last 50
    } catch (error) {
      console.error('Error storing agent activity in localStorage:', error);
    }
  },
  
  /**
   * Get agent activities (temporary implementation until agent_activities table is available)
   * This retrieves tracked activities from local storage for development
   */
  async getAgentActivities(agentId: number, limit: number = 50): Promise<ApiResponse<AgentActivity[]>> {
    try {
      // Retrieve from local storage
      const activitiesKey = `agent_activities_${agentId}`;
      const activities = JSON.parse(localStorage.getItem(activitiesKey) || '[]');
      
      return { data: activities.slice(0, limit) };
    } catch (error) {
      console.error('Error retrieving agent activities:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Add history entry for agent (temporary implementation until agent_history table is available)
   */
  async addAgentHistoryEntry(
    agentId: number, 
    entryType: string, 
    data: any
  ): Promise<ApiResponse<AgentHistoryEntry>> {
    try {
      // Create history entry
      const entry = {
        id: Date.now(), // Temporary ID
        agent_id: agentId,
        entry_type: entryType,
        data,
        timestamp: new Date().toISOString()
      };
      
      // Log to console for development
      console.log(`[Agent History] ${entryType} for agent ${agentId}:`, entry);
      
      // Store in local storage for development
      try {
        const historyKey = `agent_history_${agentId}`;
        const existingEntries = JSON.parse(localStorage.getItem(historyKey) || '[]');
        existingEntries.unshift(entry);
        localStorage.setItem(historyKey, JSON.stringify(existingEntries.slice(0, 50))); // Keep last 50
      } catch (storageError) {
        console.error('Error storing agent history in localStorage:', storageError);
      }
      
      return { data: entry };
    } catch (error) {
      console.error('Error adding agent history entry:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get agent history entries (temporary implementation until agent_history table is available)
   */
  async getAgentHistory(
    agentId: number, 
    entryType?: string, 
    limit: number = 50
  ): Promise<ApiResponse<AgentHistoryEntry[]>> {
    try {
      // Retrieve from local storage
      const historyKey = `agent_history_${agentId}`;
      let entries = JSON.parse(localStorage.getItem(historyKey) || '[]');
      
      // Filter by entry type if provided
      if (entryType) {
        entries = entries.filter((entry: AgentHistoryEntry) => entry.entry_type === entryType);
      }
      
      return { data: entries.slice(0, limit) };
    } catch (error) {
      console.error('Error retrieving agent history:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get available strategy types for agent creation
   */
  async getStrategyTypes(): Promise<ApiResponse<string[]>> {
    try {
      // In a production environment, this would fetch from the database
      // For now we'll return predefined options
      return { 
        data: [
          'Mean Reversion',
          'Trend Following',
          'Momentum',
          'Breakout',
          'Arbitrage',
          'Market Making',
          'Grid Trading',
          'Scalping',
          'Statistical Arbitrage',
          'Sentiment Analysis'
        ] 
      };
    } catch (error) {
      console.error('Error fetching strategy types:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get available risk levels for agent creation
   */
  async getRiskLevels(): Promise<ApiResponse<string[]>> {
    try {
      // In a production environment, this would fetch from the database
      // For now we'll return predefined options
      return { 
        data: [
          'Conservative',
          'Moderate',
          'Aggressive',
          'Very Aggressive'
        ] 
      };
    } catch (error) {
      console.error('Error fetching risk levels:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Get available markets for agent creation
   */
  async getAvailableMarkets(): Promise<ApiResponse<string[]>> {
    try {
      // In a production environment, this would fetch from the database
      // For now we'll return predefined options
      return { 
        data: [
          'Crypto - BTC/USD',
          'Crypto - ETH/USD',
          'Crypto - SOL/USD',
          'Crypto - BNB/USD',
          'Forex - EUR/USD',
          'Forex - USD/JPY',
          'Stocks - US Tech',
          'Stocks - S&P 500',
          'Commodities - Gold',
          'Commodities - Oil'
        ] 
      };
    } catch (error) {
      console.error('Error fetching available markets:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
  
  /**
   * Complete agent setup and set to active
   */
  async finalizeAgentSetup(id: number): Promise<ApiResponse<ExtendedAgent>> {
    try {
      const supabase = createBrowserClient();
      
      // Get agent data first
      const { data: agent, error: fetchError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error(`Error fetching agent ${id} for setup:`, fetchError);
        return { error: fetchError.message };
      }
      
      // Update agent status
      const { data, error } = await supabase
        .from('agents')
        .update({
          status: 'inactive', // Initially set to inactive until user activates it
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error(`Error finalizing agent ${id} setup:`, error);
        return { error: error.message };
      }
      
      // Track finalization activity
      this.trackAgentActivity(id, 'setup_completed', { agent_id: id }, 'success');
      
      // Initialize agent history
      await this.addAgentHistoryEntry(id, 'initialization', {
        message: `Agent "${data.name}" has been successfully initialized`,
        timestamp: new Date().toISOString()
      });
      
      // Return the extended agent
      return { data: mapAgentToExtended(data) };
    } catch (error) {
      console.error(`Error finalizing agent ${id} setup:`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get available farms for agent creation
   */
  async getAvailableFarms(): Promise<ApiResponse<{ id: number; name: string }[]>> {
    try {
      const supabase = createBrowserClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: 'User not authenticated' };
      }
      
      // Fetch farms that the user has access to
      const { data, error } = await supabase
        .from('farms')
        .select('id, name')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching available farms:', error);
        return { error: error.message };
      }
      
      // If no farms are found, return a default farm as fallback
      if (!data || data.length === 0) {
        return {
          data: [
            { id: 1, name: 'My Trading Farm' }
          ]
        };
      }
      
      return { data };
    } catch (error) {
      console.error('Error fetching available farms:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },
};
