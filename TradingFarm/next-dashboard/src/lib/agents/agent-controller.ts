/**
 * Agent Controller System
 * 
 * Central controller for managing trading agents, their strategies,
 * and execution pipelines.
 */

import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { RiskManager } from '../trading/risk-manager';
import type { Database } from '@/types/database.types';

// Agent states
export enum AgentState {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPING = 'stopping',
  ERROR = 'error'
}

// Agent types
export enum AgentType {
  STRATEGY = 'strategy',
  MARKET_MAKER = 'market_maker',
  ARBITRAGE = 'arbitrage',
  SIGNAL_FOLLOWER = 'signal_follower',
  CUSTOM = 'custom'
}

// Agent operation modes
export enum AgentMode {
  SIMULATION = 'simulation',
  TESTNET = 'testnet',
  LIVE = 'live'
}

// Strategy settings schema
export interface StrategySettings {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  defaultRiskParameters?: Record<string, any>;
}

// Agent configuration interface
export interface AgentConfig {
  id?: string;
  name: string;
  description?: string;
  type: AgentType;
  strategyId?: string;
  mode: AgentMode;
  state: AgentState;
  exchangeCredentialId?: string;
  symbols: string[];
  parameters: Record<string, any>;
  schedule?: {
    enabled: boolean;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    days?: number[];
  };
  userId: string;
  farmId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Agent health metrics
export interface AgentHealth {
  id: string;
  agentId: string;
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    cpuUsage?: number;
    memoryUsage?: number;
    responseTime?: number;
    successRate?: number;
    errorCount?: number;
    warningCount?: number;
    lastPing?: string;
    tradeCount?: number;
    pnl?: number;
  };
  lastUpdated: string;
}

/**
 * Agent Controller class for managing trading agents
 */
export class AgentController {
  private supabase: any;
  private isServer: boolean;
  private userId: string | null = null;
  private riskManager: RiskManager;
  
  constructor(
    userId?: string,
    isServer = typeof window === 'undefined'
  ) {
    this.userId = userId || null;
    this.isServer = isServer;
    
    // Initialize risk manager
    this.riskManager = new RiskManager({}, userId, isServer);
    
    // Initialize Supabase client based on environment
    if (this.isServer) {
      // Will be initialized when needed with createServerClient
      this.supabase = null;
    } else {
      this.supabase = createBrowserClient();
    }
  }
  
  /**
   * Initialize the Supabase client on server
   */
  private async initializeServerClient() {
    if (this.isServer && !this.supabase) {
      this.supabase = await createServerClient();
    }
  }
  
  /**
   * Get a list of all available trading strategies
   */
  async getStrategies(): Promise<StrategySettings[]> {
    await this.initializeServerClient();
    
    const { data, error } = await this.supabase
      .from('strategies')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching strategies:', error);
      throw error;
    }
    
    return data || [];
  }
  
  /**
   * Get strategy by ID
   */
  async getStrategy(strategyId: string): Promise<StrategySettings | null> {
    await this.initializeServerClient();
    
    const { data, error } = await this.supabase
      .from('strategies')
      .select('*')
      .eq('id', strategyId)
      .single();
    
    if (error) {
      console.error(`Error fetching strategy ${strategyId}:`, error);
      return null;
    }
    
    return data;
  }
  
  /**
   * Get all agents for a user or farm
   */
  async getAgents(farmId?: string): Promise<AgentConfig[]> {
    await this.initializeServerClient();
    
    let query = this.supabase
      .from('agents')
      .select('*');
    
    if (farmId) {
      query = query.eq('farm_id', farmId);
    } else if (this.userId) {
      query = query.eq('user_id', this.userId);
    } else {
      throw new Error('Either farmId or userId must be provided');
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
    
    return (data || []).map(this.mapDatabaseAgentToAgentConfig);
  }
  
  /**
   * Get a single agent by ID
   */
  async getAgent(agentId: string): Promise<AgentConfig | null> {
    await this.initializeServerClient();
    
    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
    
    if (error) {
      console.error(`Error fetching agent ${agentId}:`, error);
      return null;
    }
    
    return this.mapDatabaseAgentToAgentConfig(data);
  }
  
  /**
   * Create a new agent
   */
  async createAgent(config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentConfig> {
    await this.initializeServerClient();
    
    // Validate required fields
    if (!config.name || !config.type || !config.mode) {
      throw new Error('Missing required fields (name, type, mode)');
    }
    
    // Validate the strategy if specified
    if (config.strategyId) {
      const strategy = await this.getStrategy(config.strategyId);
      if (!strategy) {
        throw new Error(`Strategy with ID ${config.strategyId} not found`);
      }
    }
    
    // Map to database structure
    const dbAgent = {
      name: config.name,
      description: config.description || '',
      type: config.type,
      strategy_id: config.strategyId,
      mode: config.mode,
      state: config.state || AgentState.STOPPED,
      exchange_credential_id: config.exchangeCredentialId,
      symbols: config.symbols,
      parameters: config.parameters,
      schedule: config.schedule || { enabled: false },
      user_id: config.userId,
      farm_id: config.farmId,
    };
    
    // Insert into database
    const { data, error } = await this.supabase
      .from('agents')
      .insert(dbAgent)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
    
    // Create initial health record
    await this.supabase
      .from('agent_health')
      .insert({
        agent_id: data.id,
        status: 'healthy',
        metrics: {
          errorCount: 0,
          warningCount: 0,
          successRate: 100,
          lastPing: new Date().toISOString()
        },
      });
    
    return this.mapDatabaseAgentToAgentConfig(data);
  }
  
  /**
   * Update an existing agent
   */
  async updateAgent(agentId: string, updates: Partial<AgentConfig>): Promise<AgentConfig> {
    await this.initializeServerClient();
    
    // Map to database structure
    const dbUpdates: any = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.strategyId !== undefined) dbUpdates.strategy_id = updates.strategyId;
    if (updates.mode !== undefined) dbUpdates.mode = updates.mode;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.exchangeCredentialId !== undefined) dbUpdates.exchange_credential_id = updates.exchangeCredentialId;
    if (updates.symbols !== undefined) dbUpdates.symbols = updates.symbols;
    if (updates.parameters !== undefined) dbUpdates.parameters = updates.parameters;
    if (updates.schedule !== undefined) dbUpdates.schedule = updates.schedule;
    
    // Update in database
    const { data, error } = await this.supabase
      .from('agents')
      .update(dbUpdates)
      .eq('id', agentId)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating agent ${agentId}:`, error);
      throw error;
    }
    
    return this.mapDatabaseAgentToAgentConfig(data);
  }
  
  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<boolean> {
    await this.initializeServerClient();
    
    // Get current state to ensure it's not running
    const agent = await this.getAgent(agentId);
    
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    if (agent.state === AgentState.RUNNING || agent.state === AgentState.STARTING) {
      throw new Error('Cannot delete a running agent. Stop the agent first.');
    }
    
    // Delete agent health records
    await this.supabase
      .from('agent_health')
      .delete()
      .eq('agent_id', agentId);
    
    // Delete agent events
    await this.supabase
      .from('agent_events')
      .delete()
      .eq('agent_id', agentId);
    
    // Delete the agent
    const { error } = await this.supabase
      .from('agents')
      .delete()
      .eq('id', agentId);
    
    if (error) {
      console.error(`Error deleting agent ${agentId}:`, error);
      throw error;
    }
    
    return true;
  }
  
  /**
   * Start an agent
   */
  async startAgent(agentId: string): Promise<{ success: boolean; message: string }> {
    await this.initializeServerClient();
    
    // Get the agent
    const agent = await this.getAgent(agentId);
    
    if (!agent) {
      return { success: false, message: `Agent with ID ${agentId} not found` };
    }
    
    // Check if agent can be started
    if (agent.state === AgentState.RUNNING || agent.state === AgentState.STARTING) {
      return { success: false, message: 'Agent is already running or starting' };
    }
    
    // For live mode, validate exchange credentials
    if (agent.mode === AgentMode.LIVE && !agent.exchangeCredentialId) {
      return { success: false, message: 'Exchange credentials are required for live mode' };
    }
    
    // Update agent state to STARTING
    await this.updateAgent(agentId, { state: AgentState.STARTING });
    
    // Log agent start event
    await this.supabase
      .from('agent_events')
      .insert({
        agent_id: agentId,
        event_type: 'start',
        details: {
          mode: agent.mode,
          timestamp: new Date().toISOString()
        },
      });
    
    // In a real implementation, this would trigger the actual agent start process
    // For this implementation, we'll simulate it by setting the state to RUNNING after a delay
    setTimeout(async () => {
      await this.updateAgent(agentId, { state: AgentState.RUNNING });
      
      // Update agent health
      await this.supabase
        .from('agent_health')
        .upsert({
          agent_id: agentId,
          status: 'healthy',
          metrics: {
            errorCount: 0,
            warningCount: 0,
            successRate: 100,
            lastPing: new Date().toISOString()
          },
        }, {
          onConflict: 'agent_id'
        });
    }, 2000);
    
    return { success: true, message: 'Agent is starting' };
  }
  
  /**
   * Stop an agent
   */
  async stopAgent(agentId: string): Promise<{ success: boolean; message: string }> {
    await this.initializeServerClient();
    
    // Get the agent
    const agent = await this.getAgent(agentId);
    
    if (!agent) {
      return { success: false, message: `Agent with ID ${agentId} not found` };
    }
    
    // Check if agent can be stopped
    if (agent.state === AgentState.STOPPED || agent.state === AgentState.STOPPING) {
      return { success: false, message: 'Agent is already stopped or stopping' };
    }
    
    // Update agent state to STOPPING
    await this.updateAgent(agentId, { state: AgentState.STOPPING });
    
    // Log agent stop event
    await this.supabase
      .from('agent_events')
      .insert({
        agent_id: agentId,
        event_type: 'stop',
        details: {
          timestamp: new Date().toISOString()
        },
      });
    
    // In a real implementation, this would trigger the actual agent stop process
    // For this implementation, we'll simulate it by setting the state to STOPPED after a delay
    setTimeout(async () => {
      await this.updateAgent(agentId, { state: AgentState.STOPPED });
    }, 2000);
    
    return { success: true, message: 'Agent is stopping' };
  }
  
  /**
   * Restart an agent
   */
  async restartAgent(agentId: string): Promise<{ success: boolean; message: string }> {
    await this.initializeServerClient();
    
    // Get the agent
    const agent = await this.getAgent(agentId);
    
    if (!agent) {
      return { success: false, message: `Agent with ID ${agentId} not found` };
    }
    
    // Stop the agent if it's running
    if (agent.state === AgentState.RUNNING || agent.state === AgentState.STARTING) {
      const stopResult = await this.stopAgent(agentId);
      
      if (!stopResult.success) {
        return stopResult;
      }
      
      // Wait a bit before starting again
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Start the agent
    return this.startAgent(agentId);
  }
  
  /**
   * Get agent health
   */
  async getAgentHealth(agentId: string): Promise<AgentHealth | null> {
    await this.initializeServerClient();
    
    const { data, error } = await this.supabase
      .from('agent_health')
      .select('*')
      .eq('agent_id', agentId)
      .single();
    
    if (error) {
      console.error(`Error fetching health for agent ${agentId}:`, error);
      return null;
    }
    
    return data;
  }
  
  /**
   * Get agent events
   */
  async getAgentEvents(agentId: string, limit = 50): Promise<any[]> {
    await this.initializeServerClient();
    
    const { data, error } = await this.supabase
      .from('agent_events')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error(`Error fetching events for agent ${agentId}:`, error);
      throw error;
    }
    
    return data || [];
  }
  
  /**
   * Map database agent to agent config
   */
  private mapDatabaseAgentToAgentConfig(dbAgent: any): AgentConfig {
    return {
      id: dbAgent.id,
      name: dbAgent.name,
      description: dbAgent.description,
      type: dbAgent.type,
      strategyId: dbAgent.strategy_id,
      mode: dbAgent.mode,
      state: dbAgent.state,
      exchangeCredentialId: dbAgent.exchange_credential_id,
      symbols: dbAgent.symbols || [],
      parameters: dbAgent.parameters || {},
      schedule: dbAgent.schedule || { enabled: false },
      userId: dbAgent.user_id,
      farmId: dbAgent.farm_id,
      createdAt: dbAgent.created_at,
      updatedAt: dbAgent.updated_at
    };
  }
}
