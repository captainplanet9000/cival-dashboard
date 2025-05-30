import { createBrowserClient } from '@/utils/supabase/client';
import { TradingAgent, TradingStrategy, AgentStatus, StrategyParameters, AgentConfig } from '@/types/agent-types';

/**
 * Agent Management Service
 * Handles trading agent lifecycle management including creation, configuration, 
 * monitoring, and strategy assignment
 */
export class AgentManagementService {
  private isAgentSystemEnabled: boolean;
  
  constructor() {
    this.isAgentSystemEnabled = process.env.NEXT_PUBLIC_ENABLE_AGENT_SYSTEM === 'true';
  }
  
  /**
   * Checks if the agent system is enabled
   */
  public isEnabled(): boolean {
    return this.isAgentSystemEnabled;
  }
  
  /**
   * Gets all trading agents for the current user
   * @param limit Maximum number of agents to return
   * @param offset Offset for pagination
   * @returns Array of trading agents
   */
  public async getAgents(limit = 50, offset = 0): Promise<{ data: TradingAgent[], count: number }> {
    try {
      const supabase = createBrowserClient();
      const { data, error, count } = await supabase
        .from('trading_agents')
        .select('*, farm:farm_id(*), strategy:strategy_id(*)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
        
      if (error) {
        console.error('Error fetching trading agents:', error);
        return { data: [], count: 0 };
      }
      
      return { 
        data: data as TradingAgent[], 
        count: count || 0 
      };
    } catch (error) {
      console.error('Error in getAgents:', error);
      return { data: [], count: 0 };
    }
  }
  
  /**
   * Gets a trading agent by ID
   * @param agentId ID of the agent to retrieve
   * @returns The trading agent or null if not found
   */
  public async getAgentById(agentId: string): Promise<TradingAgent | null> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('trading_agents')
        .select('*, farm:farm_id(*), strategy:strategy_id(*), config:agent_configs!inner(*)')
        .eq('id', agentId)
        .single();
        
      if (error) {
        console.error('Error fetching trading agent:', error);
        return null;
      }
      
      return data as TradingAgent;
    } catch (error) {
      console.error('Error in getAgentById:', error);
      return null;
    }
  }
  
  /**
   * Gets trading agents for a specific farm
   * @param farmId ID of the farm
   * @returns Array of trading agents
   */
  public async getAgentsByFarm(farmId: string): Promise<TradingAgent[]> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('trading_agents')
        .select('*, farm:farm_id(*), strategy:strategy_id(*)')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching trading agents by farm:', error);
        return [];
      }
      
      return data as TradingAgent[];
    } catch (error) {
      console.error('Error in getAgentsByFarm:', error);
      return [];
    }
  }
  
  /**
   * Gets available trading strategies
   * @returns Array of trading strategies
   */
  public async getStrategies(): Promise<TradingStrategy[]> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('trading_strategies')
        .select('*')
        .order('name', { ascending: true });
        
      if (error) {
        console.error('Error fetching trading strategies:', error);
        return [];
      }
      
      return data as TradingStrategy[];
    } catch (error) {
      console.error('Error in getStrategies:', error);
      return [];
    }
  }
  
  /**
   * Gets a trading strategy by ID
   * @param strategyId ID of the strategy to retrieve
   * @returns The trading strategy or null if not found
   */
  public async getStrategyById(strategyId: string): Promise<TradingStrategy | null> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('trading_strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
        
      if (error) {
        console.error('Error fetching trading strategy:', error);
        return null;
      }
      
      return data as TradingStrategy;
    } catch (error) {
      console.error('Error in getStrategyById:', error);
      return null;
    }
  }
  
  /**
   * Creates a new trading agent
   * @param agentData Data for the new agent
   * @returns The created agent or null if creation failed
   */
  public async createAgent(agentData: Partial<TradingAgent>): Promise<TradingAgent | null> {
    if (!this.isAgentSystemEnabled) {
      console.warn('Agent system is disabled');
      return null;
    }
    
    try {
      const supabase = createBrowserClient();
      
      // Create agent
      const { data, error } = await supabase
        .from('trading_agents')
        .insert({
          name: agentData.name,
          description: agentData.description,
          farm_id: agentData.farm_id,
          strategy_id: agentData.strategy_id,
          status: 'idle',
          is_live: agentData.is_live || false,
          trading_pair: agentData.trading_pair,
          exchange_id: agentData.exchange_id,
          risk_level: agentData.risk_level || 'medium'
        })
        .select('*, farm:farm_id(*), strategy:strategy_id(*)')
        .single();
        
      if (error) {
        console.error('Error creating trading agent:', error);
        return null;
      }
      
      // If agent was created successfully, create initial config
      if (data) {
        const defaultConfig: AgentConfig = {
          agent_id: data.id,
          parameters: {
            maxOrderSize: 0.1,
            maxPositionSize: 1.0,
            maxLeverage: 3,
            maxDrawdown: 10,
            stopLossPercentage: 2,
            takeProfitPercentage: 5
          },
          risk_controls: {
            enableStopLoss: true,
            enableTakeProfit: true,
            enableTrailingStop: false,
            enableMaxDrawdownProtection: true
          },
          active: true
        };
        
        const { error: configError } = await supabase
          .from('agent_configs')
          .insert(defaultConfig);
          
        if (configError) {
          console.error('Error creating agent config:', configError);
          // We still return the agent even if config creation failed
        }
      }
      
      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        activity_type: 'agent_created',
        entity_type: 'agent',
        entity_id: data.id,
        details: {
          agent_name: data.name,
          farm_id: data.farm_id,
          strategy_id: data.strategy_id
        }
      });
      
      return data as TradingAgent;
    } catch (error) {
      console.error('Error in createAgent:', error);
      return null;
    }
  }
  
  /**
   * Updates an existing trading agent
   * @param agentId ID of the agent to update
   * @param agentData Updated agent data
   * @returns The updated agent or null if update failed
   */
  public async updateAgent(agentId: string, agentData: Partial<TradingAgent>): Promise<TradingAgent | null> {
    if (!this.isAgentSystemEnabled) {
      console.warn('Agent system is disabled');
      return null;
    }
    
    try {
      const supabase = createBrowserClient();
      
      // Prepare update data (only allowed fields)
      const updateData: any = {};
      
      if (agentData.name !== undefined) updateData.name = agentData.name;
      if (agentData.description !== undefined) updateData.description = agentData.description;
      if (agentData.strategy_id !== undefined) updateData.strategy_id = agentData.strategy_id;
      if (agentData.status !== undefined) updateData.status = agentData.status;
      if (agentData.is_live !== undefined) updateData.is_live = agentData.is_live;
      if (agentData.trading_pair !== undefined) updateData.trading_pair = agentData.trading_pair;
      if (agentData.exchange_id !== undefined) updateData.exchange_id = agentData.exchange_id;
      if (agentData.risk_level !== undefined) updateData.risk_level = agentData.risk_level;
      
      // Update agent
      const { data, error } = await supabase
        .from('trading_agents')
        .update(updateData)
        .eq('id', agentId)
        .select('*, farm:farm_id(*), strategy:strategy_id(*)')
        .single();
        
      if (error) {
        console.error('Error updating trading agent:', error);
        return null;
      }
      
      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        activity_type: 'agent_updated',
        entity_type: 'agent',
        entity_id: agentId,
        details: {
          agent_name: data.name,
          updated_fields: Object.keys(updateData)
        }
      });
      
      return data as TradingAgent;
    } catch (error) {
      console.error('Error in updateAgent:', error);
      return null;
    }
  }
  
  /**
   * Updates the configuration of a trading agent
   * @param agentId ID of the agent to update
   * @param config New configuration
   * @returns Success status
   */
  public async updateAgentConfig(agentId: string, config: Partial<AgentConfig>): Promise<boolean> {
    if (!this.isAgentSystemEnabled) {
      console.warn('Agent system is disabled');
      return false;
    }
    
    try {
      const supabase = createBrowserClient();
      
      // Get current config
      const { data: currentConfig, error: configError } = await supabase
        .from('agent_configs')
        .select('*')
        .eq('agent_id', agentId)
        .single();
        
      if (configError) {
        console.error('Error fetching agent config:', configError);
        
        // If no config exists, create one
        if (configError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('agent_configs')
            .insert({
              agent_id: agentId,
              parameters: config.parameters || {},
              risk_controls: config.risk_controls || {},
              active: config.active !== undefined ? config.active : true
            });
            
          if (insertError) {
            console.error('Error creating agent config:', insertError);
            return false;
          }
          
          return true;
        }
        
        return false;
      }
      
      // Update config
      const updateData: any = {};
      
      if (config.parameters !== undefined) {
        updateData.parameters = {
          ...currentConfig.parameters,
          ...config.parameters
        };
      }
      
      if (config.risk_controls !== undefined) {
        updateData.risk_controls = {
          ...currentConfig.risk_controls,
          ...config.risk_controls
        };
      }
      
      if (config.active !== undefined) {
        updateData.active = config.active;
      }
      
      const { error: updateError } = await supabase
        .from('agent_configs')
        .update(updateData)
        .eq('agent_id', agentId);
        
      if (updateError) {
        console.error('Error updating agent config:', updateError);
        return false;
      }
      
      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        activity_type: 'agent_config_updated',
        entity_type: 'agent',
        entity_id: agentId,
        details: {
          updated_config: Object.keys(updateData)
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error in updateAgentConfig:', error);
      return false;
    }
  }
  
  /**
   * Starts a trading agent
   * @param agentId ID of the agent to start
   * @returns Success status
   */
  public async startAgent(agentId: string): Promise<boolean> {
    if (!this.isAgentSystemEnabled) {
      console.warn('Agent system is disabled');
      return false;
    }
    
    try {
      // Get current agent status
      const supabase = createBrowserClient();
      const { data: agent, error: agentError } = await supabase
        .from('trading_agents')
        .select('status, name')
        .eq('id', agentId)
        .single();
        
      if (agentError || !agent) {
        console.error('Error fetching agent:', agentError);
        return false;
      }
      
      // If agent is already running, don't start it again
      if (agent.status === 'running') {
        console.warn('Agent is already running');
        return true;
      }
      
      // Call agent system API to start the agent
      // This would normally call a backend API endpoint
      // For now, we'll just update the status in the database
      
      // Update agent status to 'starting'
      const { error: updateError } = await supabase
        .from('trading_agents')
        .update({ status: 'starting' })
        .eq('id', agentId);
        
      if (updateError) {
        console.error('Error updating agent status:', updateError);
        return false;
      }
      
      // In a real system, we would call an API endpoint to start the agent
      // For now, we'll simulate this with a timeout
      setTimeout(async () => {
        const { error } = await supabase
          .from('trading_agents')
          .update({ status: 'running' })
          .eq('id', agentId);
          
        if (error) {
          console.error('Error updating agent status to running:', error);
        }
      }, 2000);
      
      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        activity_type: 'agent_started',
        entity_type: 'agent',
        entity_id: agentId,
        details: {
          agent_name: agent.name
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error in startAgent:', error);
      return false;
    }
  }
  
  /**
   * Stops a trading agent
   * @param agentId ID of the agent to stop
   * @returns Success status
   */
  public async stopAgent(agentId: string): Promise<boolean> {
    if (!this.isAgentSystemEnabled) {
      console.warn('Agent system is disabled');
      return false;
    }
    
    try {
      // Get current agent status
      const supabase = createBrowserClient();
      const { data: agent, error: agentError } = await supabase
        .from('trading_agents')
        .select('status, name')
        .eq('id', agentId)
        .single();
        
      if (agentError || !agent) {
        console.error('Error fetching agent:', agentError);
        return false;
      }
      
      // If agent is already stopped, don't stop it again
      if (agent.status === 'idle' || agent.status === 'stopped') {
        console.warn('Agent is already stopped');
        return true;
      }
      
      // Update agent status to 'stopping'
      const { error: updateError } = await supabase
        .from('trading_agents')
        .update({ status: 'stopping' })
        .eq('id', agentId);
        
      if (updateError) {
        console.error('Error updating agent status:', updateError);
        return false;
      }
      
      // In a real system, we would call an API endpoint to stop the agent
      // For now, we'll simulate this with a timeout
      setTimeout(async () => {
        const { error } = await supabase
          .from('trading_agents')
          .update({ status: 'idle' })
          .eq('id', agentId);
          
        if (error) {
          console.error('Error updating agent status to idle:', error);
        }
      }, 2000);
      
      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        activity_type: 'agent_stopped',
        entity_type: 'agent',
        entity_id: agentId,
        details: {
          agent_name: agent.name
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error in stopAgent:', error);
      return false;
    }
  }
  
  /**
   * Deletes a trading agent
   * @param agentId ID of the agent to delete
   * @returns Success status
   */
  public async deleteAgent(agentId: string): Promise<boolean> {
    if (!this.isAgentSystemEnabled) {
      console.warn('Agent system is disabled');
      return false;
    }
    
    try {
      // Get agent info for logging
      const supabase = createBrowserClient();
      const { data: agent, error: agentError } = await supabase
        .from('trading_agents')
        .select('name, status')
        .eq('id', agentId)
        .single();
        
      if (agentError) {
        console.error('Error fetching agent:', agentError);
        return false;
      }
      
      // Check if agent is running
      if (agent.status === 'running' || agent.status === 'starting') {
        console.error('Cannot delete a running agent');
        return false;
      }
      
      // Delete agent config first (due to foreign key constraints)
      const { error: configError } = await supabase
        .from('agent_configs')
        .delete()
        .eq('agent_id', agentId);
        
      if (configError) {
        console.error('Error deleting agent config:', configError);
        // Continue anyway, as the agent might not have a config
      }
      
      // Delete agent
      const { error: deleteError } = await supabase
        .from('trading_agents')
        .delete()
        .eq('id', agentId);
        
      if (deleteError) {
        console.error('Error deleting agent:', deleteError);
        return false;
      }
      
      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        activity_type: 'agent_deleted',
        entity_type: 'agent',
        entity_id: agentId,
        details: {
          agent_name: agent.name
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error in deleteAgent:', error);
      return false;
    }
  }
  
  /**
   * Gets performance statistics for a trading agent
   * @param agentId ID of the agent
   * @returns Performance statistics
   */
  public async getAgentPerformance(agentId: string): Promise<any | null> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_performance')
        .select('*')
        .eq('agent_id', agentId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
        
      if (error) {
        console.error('Error fetching agent performance:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getAgentPerformance:', error);
      return null;
    }
  }
  
  /**
   * Gets trading history for a trading agent
   * @param agentId ID of the agent
   * @param limit Maximum number of trades to return
   * @param offset Offset for pagination
   * @returns Array of trades
   */
  public async getAgentTrades(agentId: string, limit = 50, offset = 0): Promise<any[]> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_trades')
        .select('*')
        .eq('agent_id', agentId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);
        
      if (error) {
        console.error('Error fetching agent trades:', error);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error('Error in getAgentTrades:', error);
      return [];
    }
  }
}

// Export singleton instance
export const agentManagementService = new AgentManagementService();
