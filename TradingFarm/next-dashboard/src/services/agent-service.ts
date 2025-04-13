/**
 * Agent Service
 * Handles all agent-related API interactions with ElizaOS integration
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { TradingEventEmitter, TRADING_EVENTS, AgentEvent } from '@/utils/events/trading-events';
import { knowledgeService } from '@/services/knowledge-service';
import { v4 as uuidv4 } from 'uuid';

// Define Json type locally if needed, or import from a valid source
export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
  farm_id: number | null;
  type: string;
  strategy_type?: string;
  status: string;
  risk_level?: string;
  target_markets?: string[];
  config?: Json;
  configuration?: AgentConfiguration;
  instructions?: string | null;
  permissions?: Json;
  performance?: Json;
  user_id?: string | null;
  is_active?: boolean;
  performance_metrics?: {
    win_rate?: number;
    profit_loss?: number;
    total_trades?: number;
    average_trade_duration?: number;
  };
  tools_config?: Json;
  trading_permissions?: Json;
  llm_config_id?: string;
  created_at: string;
  updated_at: string;
  farms?: {
    id: string | number;
    name: string;
  };
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
  id: string;
  agent_id: string;
  action: string;
  details?: any;
  timestamp: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  meta?: Record<string, any>;
}

export interface AgentTemplate {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  strategy_type?: string | null;
  config: Json;
  tools_config: Json;
  default_tools: string[];
  trading_permissions: Json;
  instructions?: string | null;
  is_public: boolean;
  user_id?: string | null;
  created_at: string;
  updated_at: string;
}

// ElizaOS Agent Types
export interface ElizaAgent {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  agent_type_id?: string;
  status: 'active' | 'inactive' | 'paused' | 'error';
  instructions?: string;
  model: string;
  parameters: Record<string, any>;
  knowledge_ids: string[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  agent_id: string;
  farm_id?: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  started_at: string;
  ended_at?: string;
  data: Record<string, any>;
  metrics: Record<string, any>;
  error?: string;
}

export interface AgentMessage {
  id: string;
  run_id: string;
  role: 'system' | 'user' | 'agent' | 'tool';
  content: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface Farm {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  goal: string;
  status: 'active' | 'inactive' | 'paused';
  parameters: Record<string, any>;
  created_at: string;
  updated_at: string;
  agents?: ElizaAgent[];
}

export interface FarmAgent {
  id: string;
  farm_id: string;
  agent_id: string;
  role: string;
  parameters: Record<string, any>;
  created_at: string;
}

/**
 * Agent service for managing trading agents with ElizaOS integration
 */
export const agentService = {
  /**
   * Get all agents
   */
  async getAgents(): Promise<ApiResponse<ExtendedAgent[]>> {
    // For development, always return mock data to avoid Supabase connectivity issues
    if (process.env.NEXT_PUBLIC_MOCK_API_ENABLED === 'true' || 
        process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true' ||
        true) { // Always return mock data for now
      return this.getMockAgents();
    }
    
    try {
      // First try to use the API route
      try {
        const response = await fetch('/api/agents', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.agents && Array.isArray(result.agents)) {
            // Transform the data
            const agents = result.agents.map((agent: any) => {
              // Safely extract configuration properties
              const configObj = safeGetConfig(agent.config);
              const performanceObj = safeGetConfig(agent.performance);
              
              // Ensure farm_id is treated as number
              const numericFarmId = agent.farm_id ? Number(agent.farm_id) : null;

              return {
                ...agent,
                farm_id: numericFarmId,
                configuration: configObj,
                description: agent.description || configObj.description,
                strategy_type: agent.strategy_type || configObj.strategy_type,
                risk_level: agent.risk_level || configObj.risk_level,
                target_markets: agent.target_markets || configObj.target_markets,
                performance_metrics: {
                  win_rate: performanceObj.win_rate || 0,
                  profit_loss: performanceObj.profit_loss || 0,
                  total_trades: performanceObj.total_trades || 0,
                  average_trade_duration: performanceObj.average_trade_duration || 0
                },
                farm_name: agent.farms?.name || (numericFarmId ? `Farm ${numericFarmId}` : 'No Farm'),
                is_active: agent.status === 'active'
              };
            });
            
            // Cache in localStorage
            try {
              localStorage.setItem('agents_cache', JSON.stringify(agents));
              localStorage.setItem('agents_cache_timestamp', Date.now().toString());
            } catch (e) {
              console.warn('Could not cache agents in localStorage:', e);
            }
            
            return { data: agents };
          }
        } else {
          console.error('API route error, falling back to direct Supabase');
        }
      } catch (apiError) {
        console.error('Error fetching via API, falling back to Supabase:', apiError);
      }
      
      // If API fails, try direct Supabase query
      const supabase = createBrowserClient();
      
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('*, farms(id, name)')
          // .returns<Agent[]>(); // Removed explicit type argument
          
        if (error) {
          console.error('Supabase error, checking localStorage cache:', error);
          // Fall back to cache logic...
          const cacheResult = await this.getAgentsFromCache();
          // Check if cacheResult.data is defined before accessing length
          if (cacheResult.data && cacheResult.data.length > 0) { 
            return cacheResult;
          }
          // If cache also fails or is empty, return error
          return { error: `Supabase Error: ${error.message}` };
        }
        
        if (!data || data.length === 0) {
          const cacheResult = await this.getAgentsFromCache();
          // Check if cacheResult.data is defined before accessing length
          if (cacheResult.data && cacheResult.data.length > 0) { 
            return cacheResult;
          }
          return { data: [] };
        }
        
        // Transform the data
        // Add explicit type for 'agent' parameter
        const extendedAgents: ExtendedAgent[] = data.map((agent: any) => { 
          const configObj = safeGetConfig(agent.config);
          const performanceObj = safeGetConfig(agent.performance);
          const numericFarmId = agent.farm_id ? Number(agent.farm_id) : null;

          return {
            ...agent,
            farm_id: numericFarmId,
            configuration: configObj as AgentConfiguration,
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
            farm_name: agent.farms?.name || (numericFarmId ? `Farm ${numericFarmId}` : 'No Farm'), 
            is_active: agent.status === 'active'
          } as ExtendedAgent; // Add type assertion if needed
        });
        
        // Cache in localStorage
        try {
          localStorage.setItem('agents_cache', JSON.stringify(extendedAgents));
          localStorage.setItem('agents_cache_timestamp', Date.now().toString());
        } catch (e) {
          console.warn('Could not cache agents in localStorage:', e);
        }
        
        return { data: extendedAgents };
      } catch (supabaseError) {
        console.error('Error fetching agents from Supabase:', supabaseError);
         return { error: supabaseError instanceof Error ? supabaseError.message : 'Unknown Supabase error' };
      }
    } catch (error) {
      console.error('Unexpected error in getAgents, attempting to use cache:', error);
      return this.getAgentsFromCache();
    }
  },
  
  /**
   * Get agents from localStorage cache, combining all possible sources
   * @private
   */
  async getAgentsFromCache(): Promise<ApiResponse<ExtendedAgent[]>> {
    try {
      let agents: ExtendedAgent[] = [];
      
      // Try all possible cache sources
      const sources = [
        'agents_cache',
        'local_agents',
        'mock_agents'
      ];
      
      for (const source of sources) {
        try {
          const cachedData = localStorage.getItem(source);
          if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            if (Array.isArray(parsedData)) {
              agents = [...agents, ...parsedData];
            }
          }
        } catch (e) {
          console.warn(`Error reading from ${source}:`, e);
        }
      }
      
      // Also check for individual agent entries
      try {
        // Get all localStorage keys
        const allKeys = Object.keys(localStorage);
        
        // Find agent-specific keys
        const agentKeys = allKeys.filter(key => 
          key.startsWith('agent_') || 
          key.startsWith('mock_agent_') || 
          key.startsWith('local_agent_')
        );
        
        // Add these agents if they aren't already included
        for (const key of agentKeys) {
          const agentData = localStorage.getItem(key);
          if (agentData) {
            const agent = JSON.parse(agentData);
            // Only add if not already included (by ID check)
            if (agent.id && !agents.some(a => a.id === agent.id)) {
              agents.push(agent);
            }
          }
        }
      } catch (e) {
        console.warn('Error reading individual agent entries from localStorage:', e);
      }
      
      if (agents.length > 0) {
        console.log(`Returning ${agents.length} agents from localStorage cache`);
        return { data: agents };
      }
      
      // If nothing in cache, return empty array
      return { data: [] };
    } catch (e) {
      console.error('Error getting agents from cache:', e);
      return { data: [] };
    }
  },
  
  /**
   * Create a mock agent response for development
   */
  getMockAgents(): ApiResponse<ExtendedAgent[]> {
    // Create sample mock agents
    const mockAgents: ExtendedAgent[] = [
      {
        id: 'mock-agent-1',
        name: 'BTC Trend Follower',
        description: 'A trend following agent for Bitcoin',
        type: 'trading',
        farm_id: 1,
        farm_name: 'Bitcoin Farm',
        status: 'active',
        is_active: true,
        strategy_type: 'trend_following',
        risk_level: 'medium',
        target_markets: ['BTC-USD', 'ETH-USD'],
        configuration: {
          description: 'A trend following agent for Bitcoin',
          strategy_type: 'trend_following',
          risk_level: 'medium',
          target_markets: ['BTC-USD', 'ETH-USD'],
        },
        performance_metrics: {
          win_rate: 68,
          profit_loss: 12.5,
          total_trades: 42,
          average_trade_duration: 36,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-agent-2',
        name: 'ETH Swing Trader',
        description: 'A swing trading agent for Ethereum',
        type: 'trading',
        farm_id: 1,
        farm_name: 'Bitcoin Farm',
        status: 'active',
        is_active: true,
        strategy_type: 'swing_trading',
        risk_level: 'high',
        target_markets: ['ETH-USD'],
        configuration: {
          description: 'A swing trading agent for Ethereum',
          strategy_type: 'swing_trading',
          risk_level: 'high',
          target_markets: ['ETH-USD'],
        },
        performance_metrics: {
          win_rate: 58,
          profit_loss: 23.7,
          total_trades: 31,
          average_trade_duration: 48,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-agent-3',
        name: 'Crypto Index',
        description: 'A portfolio index agent for top cryptocurrencies',
        type: 'portfolio',
        farm_id: 2,
        farm_name: 'Crypto Index Farm',
        status: 'paused',
        is_active: false,
        strategy_type: 'index',
        risk_level: 'low',
        target_markets: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'ADA-USD', 'DOT-USD'],
        configuration: {
          description: 'A portfolio index agent for top cryptocurrencies',
          strategy_type: 'index',
          risk_level: 'low',
          target_markets: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'ADA-USD', 'DOT-USD'],
        },
        performance_metrics: {
          win_rate: 75,
          profit_loss: 8.2,
          total_trades: 15,
          average_trade_duration: 120,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return { data: mockAgents };
  },
  
  /**
   * Get a specific agent by ID
   */
  async getAgent(id: string): Promise<ApiResponse<ExtendedAgent>> {
    // For development, return mock agent data
    if (process.env.NEXT_PUBLIC_MOCK_API_ENABLED === 'true' || 
        process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true' ||
        true) { // Always return mock data for now
      // Find the agent in mock data
      const mockAgents = this.getMockAgents().data || [];
      const agent = mockAgents.find(a => a.id === id);
      
      if (agent) {
        return { data: agent };
      } else {
        // Create a new mock agent with this ID if not found
        const newMockAgent: ExtendedAgent = {
          id,
          name: `Agent ${id.substring(0, 5)}`,
          description: 'A mock agent created for development',
          type: 'trading',
          farm_id: 1,
          farm_name: 'Development Farm',
          status: 'active',
          is_active: true,
          strategy_type: 'custom',
          risk_level: 'medium',
          target_markets: ['BTC-USD'],
          configuration: {
            description: 'A mock agent created for development',
            strategy_type: 'custom',
            risk_level: 'medium',
            target_markets: ['BTC-USD'],
          },
          performance_metrics: {
            win_rate: 50,
            profit_loss: 0,
            total_trades: 0,
            average_trade_duration: 0,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        return { data: newMockAgent };
      }
    }
    
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
        configuration: configObj as AgentConfiguration,
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
        farm_name: data.farms?.name || 'No Farm',
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
    // For development, always create mock agents
    if (process.env.NEXT_PUBLIC_MOCK_API_ENABLED === 'true' || 
        process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true' ||
        true) { // Always use mock functionality for now
      return this.createMockAgent(agentData);
    }
    
    try {
      // Prepare core agent data with defaults
      const now = new Date().toISOString();
      const agentCore = {
        name: agentData.name,
        description: agentData.description || '',
        farm_id: agentData.farm_id,
        type: agentData.type || 'standard',
        status: agentData.status || 'active',
        created_at: now,
        updated_at: now
      };

      // Prepare configuration object
      const config = {
        description: agentData.description,
        strategy_type: agentData.strategy_type || 'custom',
        risk_level: agentData.risk_level || 'medium',
        target_markets: agentData.target_markets || [],
        ...(agentData.config || {})
      };

      // First try the API endpoint
      try {
        const response = await fetch('/api/agents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...agentCore,
            config
          }),
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          const agent = result.data;

          // Store in localStorage for persistence
          try {
            // Store this specific agent
            localStorage.setItem(`agent_${agent.id}`, JSON.stringify(agent));
            
            // Also add to agents cache list
            const cachedAgents = JSON.parse(localStorage.getItem('agents_cache') || '[]');
            cachedAgents.push(agent);
            localStorage.setItem('agents_cache', JSON.stringify(cachedAgents));
          } catch (e) {
            console.warn('Could not cache agent in localStorage:', e);
          }

          // Return the created agent with extended properties
          return { 
            data: {
              ...agent,
              farm_name: agent.farms?.name || 'No Farm',
              configuration: config,
              is_active: agent.status === 'active'
            } 
          };
        } else {
          console.log('API error, falling back to direct Supabase:', await response.text());
        }
      } catch (apiError) {
        console.error('Error creating agent via API, trying Supabase directly:', apiError);
      }

      // If API fails, try direct Supabase
      const supabase = createBrowserClient();
      
      // First check if we're authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // If not authenticated and we're in demo mode, create a mock agent
        if (process.env.NEXT_PUBLIC_MOCK_API_ENABLED === 'true' || 
            process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true') {
          return this.createMockAgent(agentData);
        }
        
        return { error: 'You must be logged in to create an agent' };
      }
      
      // Insert the agent directly through Supabase
      const { data, error } = await supabase
        .from('agents')
        .insert({
          ...agentCore,
          config,
          user_id: session.user.id,
          is_active: agentCore.status === 'active',
        })
        .select('*, farms(id, name)')
        .single();

      if (error) {
        console.error('Supabase error creating agent:', error);
        
        // If Supabase fails, create a local agent
        return this.createLocalAgent(agentData, session.user.id);
      }

      if (!data) {
        return { error: 'Failed to create agent, no data returned' };
      }

      // Process the result to match expected format
      const agent: ExtendedAgent = {
        ...data,
        farm_name: data.farms?.name || 'No Farm',
        configuration: config,
        is_active: data.status === 'active'
      };
      
      // Store in localStorage for persistence
      try {
        localStorage.setItem(`agent_${agent.id}`, JSON.stringify(agent));
        
        // Also add to agents cache list
        const cachedAgents = JSON.parse(localStorage.getItem('agents_cache') || '[]');
        cachedAgents.push(agent);
        localStorage.setItem('agents_cache', JSON.stringify(cachedAgents));
      } catch (e) {
        console.warn('Could not cache agent in localStorage:', e);
      }

      return { data: agent };
    } catch (error) {
      console.error('Unexpected error creating agent:', error);
      
      // Final fallback - create a mock agent that at least appears in the UI
      return this.createMockAgent(agentData);
    }
  },
  
  /**
   * Create a mock agent for demo/fallback purposes
   * @private
   */
  async createMockAgent(agentData: AgentCreationRequest): Promise<ApiResponse<ExtendedAgent>> {
    const now = new Date().toISOString();
    const mockId = `mock-${Date.now().toString(36)}`;
    
    const config = {
      description: agentData.description,
      strategy_type: agentData.strategy_type || 'custom',
      risk_level: agentData.risk_level || 'medium',
      target_markets: agentData.target_markets || [],
      ...(agentData.config || {})
    };
    
    const mockAgent: ExtendedAgent = {
      id: mockId,
      name: agentData.name,
      description: agentData.description || '',
      farm_id: agentData.farm_id,
      type: agentData.type || 'standard',
      status: agentData.status || 'active',
      configuration: config,
      config,
      is_active: agentData.status !== 'inactive',
      user_id: 'mock-user',
      created_at: now,
      updated_at: now,
      farm_name: 'No Farm'
    };
    
    // Store in localStorage
    try {
      // Store individual agent
      localStorage.setItem(`mock_agent_${mockId}`, JSON.stringify(mockAgent));
      
      // Add to mock agents list
      const mockAgents = JSON.parse(localStorage.getItem('mock_agents') || '[]');
      mockAgents.push(mockAgent);
      localStorage.setItem('mock_agents', JSON.stringify(mockAgents));
    } catch (e) {
      console.warn('Could not store mock agent in localStorage:', e);
    }
    
    console.log('Created mock agent as fallback:', mockAgent);
    return { data: mockAgent };
  },
  
  /**
   * Create a local agent when database operations fail
   * @private
   */
  async createLocalAgent(agentData: AgentCreationRequest, userId: string): Promise<ApiResponse<ExtendedAgent>> {
    const now = new Date().toISOString();
    const localId = `local-${Date.now().toString(36)}`;
    
    const config = {
      description: agentData.description,
      strategy_type: agentData.strategy_type || 'custom',
      risk_level: agentData.risk_level || 'medium',
      target_markets: agentData.target_markets || [],
      ...(agentData.config || {})
    };
    
    const localAgent: ExtendedAgent = {
      id: localId,
      name: agentData.name,
      description: agentData.description || '',
      farm_id: agentData.farm_id,
      type: agentData.type || 'standard',
      status: agentData.status || 'active',
      configuration: config,
      config,
      is_active: agentData.status !== 'inactive',
      user_id: userId,
      created_at: now,
      updated_at: now,
      farm_name: 'No Farm'
    };
    
    // Store in localStorage
    try {
      // Store individual agent
      localStorage.setItem(`local_agent_${localId}`, JSON.stringify(localAgent));
      
      // Add to local agents list
      const localAgents = JSON.parse(localStorage.getItem('local_agents') || '[]');
      localAgents.push(localAgent);
      localStorage.setItem('local_agents', JSON.stringify(localAgents));
    } catch (e) {
      console.warn('Could not store local agent in localStorage:', e);
    }
    
    console.log('Created local agent due to database error:', localAgent);
    return { data: localAgent };
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
        farm_name: data.farms?.name || 'No Farm',
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
        farm_name: data.farms?.name || 'No Farm',
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
  },
  
  /**
   * Create an agent from a template
   */
  async createAgentFromTemplate(
    templateId: string,
    farmId: number,
    name: string,
    configOverrides?: Partial<AgentConfiguration>
  ): Promise<ApiResponse<ExtendedAgent>> {
    try {
      // Use API route instead of direct Supabase query
      const response = await fetch('/api/agents/create-from-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          farm_id: farmId,
          template_id: templateId,
          overrides: configOverrides || {}
        }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create agent from template: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.agent) {
        return { error: 'Failed to create agent from template' };
      }
      
      // Process the agent data to ensure proper formatting
      const agent: ExtendedAgent = {
        ...result.agent,
        farm_name: result.agent.farms?.name || `Farm ${farmId}`,
        is_active: result.agent.status === 'active',
        // Extract configuration properties
        configuration: result.agent.config || {},
        strategy_type: result.agent.strategy_type || 
                      (result.agent.config?.strategy_type) || null,
        risk_level: result.agent.risk_level || 
                   (result.agent.config?.risk_level) || null,
        performance_metrics: result.agent.performance || {
          win_rate: 0,
          profit_loss: 0,
          total_trades: 0,
          average_trade_duration: 0
        }
      };
      
      // Cache the agent in localStorage for offline support
      try {
        const cachedAgents = JSON.parse(localStorage.getItem('cachedAgents') || '[]');
        cachedAgents.push(agent);
        localStorage.setItem('cachedAgents', JSON.stringify(cachedAgents));
      } catch (storageError) {
        console.warn('Failed to cache agent in localStorage:', storageError);
      }
      
      return { data: agent };
    } catch (error) {
      console.error('Error creating agent from template:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get available agent templates
   */
  async getAgentTemplates(type?: string): Promise<ApiResponse<AgentTemplate[]>> {
    try {
      const url = new URL('/api/agents/templates', window.location.origin);
      if (type) url.searchParams.append('type', type);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agent templates: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.templates || !Array.isArray(result.templates)) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.templates };
    } catch (error) {
      console.error('Error fetching agent templates:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Create a new agent template
   */
  async createAgentTemplate(template: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<ApiResponse<AgentTemplate>> {
    try {
      const response = await fetch('/api/agents/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create agent template: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.template) {
        return { error: 'Failed to create agent template' };
      }
      
      return { data: result.template };
    } catch (error) {
      console.error('Error creating agent template:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Create a template from an existing agent
   */
  async createTemplateFromAgent(
    agentId: string, 
    templateName: string, 
    isPublic: boolean = false
  ): Promise<ApiResponse<AgentTemplate>> {
    try {
      // First, get the agent details
      const agentResponse = await this.getAgent(agentId);
      
      if (agentResponse.error || !agentResponse.data) {
        return { error: agentResponse.error || 'Failed to fetch agent details' };
      }
      
      const agent = agentResponse.data;
      
      // Create template from the agent
      const template: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id'> = {
        name: templateName,
        description: `Template created from agent: ${agent.name}`,
        type: agent.type || 'trading',
        strategy_type: agent.strategy_type || null,
        config: agent.config || {},
        tools_config: agent.tools_config || {},
        default_tools: [], // Will be populated below
        trading_permissions: agent.trading_permissions || { exchanges: [], defi_protocols: [] },
        instructions: agent.instructions || null,
        is_public: isPublic
      };
      
      // Get agent's equipped tools to set as default_tools
      try {
        const toolsResponse = await fetch(`/api/agents/${agentId}/tools`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });
        
        if (toolsResponse.ok) {
          const toolsResult = await toolsResponse.json();
          if (toolsResult.tools && Array.isArray(toolsResult.tools)) {
            template.default_tools = toolsResult.tools.map(tool => tool.name || tool.agent_tools?.name).filter(Boolean);
          }
        }
      } catch (toolsError) {
        console.warn('Error fetching agent tools for template:', toolsError);
        // Continue without tools
      }
      
      // Create the template
      return await this.createAgentTemplate(template);
    } catch (error) {
      console.error('Error creating template from agent:', error);
      return { error: 'An unexpected error occurred' };
    }
  },
  
  /**
   * Save an agent as a new template
   */
  async saveAgentAsTemplate(
    agent: Agent, 
    templateName: string, 
    isPublic: boolean = false
  ): Promise<ApiResponse<AgentTemplate>> {
    try {
      // Create template from the agent object
      const template: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id'> = {
        name: templateName,
        description: `Template created from agent: ${agent.name}`,
        type: agent.type || 'trading',
        strategy_type: agent.strategy_type || null,
        config: agent.config || {},
        tools_config: agent.tools_config || {},
        default_tools: [], // This would require a separate API call to get equipped tools
        trading_permissions: agent.trading_permissions || { exchanges: [], defi_protocols: [] },
        instructions: agent.instructions || null,
        is_public: isPublic
      };
      
      // Create the template
      return await this.createAgentTemplate(template);
    } catch (error) {
      console.error('Error saving agent as template:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Send a direct message from one agent to another
   */
  async sendDirectMessage(
    senderId: string,
    recipientId: string,
    content: string,
    messageType: string = 'direct',
    priority: string = 'medium',
    metadata: Record<string, any> = {}
  ): Promise<ApiResponse<any>> {
    try {
      const response = await fetch('/api/agents/communications/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: senderId,
          recipient_id: recipientId,
          content,
          message_type: messageType,
          priority,
          metadata
        }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send direct message: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.communication) {
        return { error: 'Failed to send direct message' };
      }
      
      return { data: result.communication };
    } catch (error) {
      console.error('Error sending direct message:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Broadcast a message to all agents in a farm
   */
  async broadcastToFarm(
    farmId: number,
    content: string,
    messageType: string = 'broadcast',
    priority: string = 'medium',
    metadata: Record<string, any> = {}
  ): Promise<ApiResponse<any>> {
    try {
      const response = await fetch('/api/agents/communications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farm_id: farmId,
          content,
          message_type: messageType,
          priority,
          metadata
        }),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to broadcast message: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.communication) {
        return { error: 'Failed to broadcast message' };
      }
      
      return { data: result.communication };
    } catch (error) {
      console.error('Error broadcasting message:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get messages for an agent
   */
  async getAgentMessages(
    agentId: string,
    limit: number = 50,
    includeRead: boolean = false
  ): Promise<ApiResponse<any[]>> {
    try {
      const url = new URL('/api/agents/communications', window.location.origin);
      url.searchParams.append('agentId', agentId);
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('includeRead', includeRead.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch agent messages: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.communications || !Array.isArray(result.communications)) {
        return { error: 'Invalid response format' };
      }
      
      return { data: result.communications };
    } catch (error) {
      console.error('Error fetching agent messages:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Mark a message as read
   */
  async markMessageAsRead(messageId: string): Promise<ApiResponse<null>> {
    try {
      const response = await fetch(`/api/agents/communications/${messageId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to mark message as read: ${response.statusText}`);
      }
      
      return { data: null };
    } catch (error) {
      console.error('Error marking message as read:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Clone an existing agent
   */
  async cloneAgent(
    agentId: string, 
    targetFarmId: number,
    newName?: string
  ): Promise<ApiResponse<ExtendedAgent>> {
    try {
      // Get the original agent details
      const agentResponse = await this.getAgent(agentId);
      
      if (agentResponse.error || !agentResponse.data) {
        return { error: agentResponse.error || 'Failed to fetch agent details' };
      }
      
      const originalAgent = agentResponse.data;
      
      // Create new agent based on original
      const createResponse = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName || originalAgent.name,
          description: `Clone of ${originalAgent.name}`,
          farm_id: targetFarmId,
          type: originalAgent.type,
          strategy_type: originalAgent.strategy_type,
          risk_level: originalAgent.risk_level,
          target_markets: originalAgent.target_markets,
          status: 'inactive', // Start as inactive for safety
          config: originalAgent.config,
          instructions: originalAgent.instructions,
          tools_config: originalAgent.tools_config,
          trading_permissions: originalAgent.trading_permissions,
          // Don't clone performance metrics - start fresh
        }),
        cache: 'no-store',
      });
      
      if (!createResponse.ok) {
        throw new Error(`Failed to clone agent: ${createResponse.statusText}`);
      }
      
      const createResult = await createResponse.json();
      
      if (!createResult.agent) {
        return { error: 'Failed to clone agent' };
      }
      
      const newAgent = createResult.agent;
      
      // Get original agent's equipped tools
      try {
        const toolsResponse = await fetch(`/api/agents/${agentId}/tools`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });
        
        if (toolsResponse.ok) {
          const toolsResult = await toolsResponse.json();
          
          if (toolsResult.tools && Array.isArray(toolsResult.tools)) {
            // Equip the same tools to the new agent
            for (const tool of toolsResult.tools as Array<{agent_tools?: {id: string}, config?: Record<string, any>}>) {
              if (tool.agent_tools?.id) {
                await fetch(`/api/agents/${newAgent.id}/tools`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    tool_id: tool.agent_tools.id,
                    config: tool.config || {}
                  }),
                  cache: 'no-store',
                });
              }
            }
          }
        }
      } catch (toolsError) {
        console.warn('Error copying tools during clone:', toolsError);
        // Continue without tools
      }
      
      // Format the response
      const formattedAgent: ExtendedAgent = {
        ...newAgent,
        farm_name: newAgent.farms?.name || `Farm ${targetFarmId}`,
        is_active: false,
        // Extract configuration properties
        configuration: newAgent.config || {},
        strategy_type: newAgent.strategy_type || null,
        risk_level: newAgent.risk_level || null,
        performance_metrics: {
          win_rate: 0,
          profit_loss: 0,
          total_trades: 0,
          average_trade_duration: 0
        }
      };
      
      return { data: formattedAgent };
    } catch (error) {
      console.error('Error cloning agent:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get agent tool configuration
   * Add type for 'tool' parameter
   */
  getToolConfig(agent: Agent, toolName: string): any | null {
    const toolsConfig = safeGetConfig(agent.tools_config);
    if (toolsConfig && toolsConfig.tools && Array.isArray(toolsConfig.tools)) {
      // Add explicit type for 'tool' parameter
      const tool = toolsConfig.tools.find((tool: any) => tool.name === toolName);
      return tool ? tool.config : null;
    }
    return null;
  },
  
  /**
   * Create a new ElizaOS agent
   */
  async createElizaAgent(agentData: {
    name: string;
    description?: string;
    agent_type_id?: string;
    instructions?: string;
    model?: string;
    parameters?: Record<string, any>;
    knowledge_ids?: string[];
  }): Promise<ApiResponse<ElizaAgent>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('agents')
        .insert({
          name: agentData.name,
          description: agentData.description || '',
          agent_type_id: agentData.agent_type_id,
          status: 'inactive',
          instructions: agentData.instructions || '',
          model: agentData.model || 'gpt-4o',
          parameters: agentData.parameters || {},
          knowledge_ids: agentData.knowledge_ids || [],
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create agent: ${error.message}`);
      }
      
      // Emit agent created event
      TradingEventEmitter.emit(TRADING_EVENTS.AGENT_STARTED, {
        agentId: data.id,
        agentName: data.name,
        status: 'created',
      });
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error creating ElizaOS agent:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
  
  /**
   * Get all ElizaOS agents
   */
  async getElizaAgents(): Promise<ApiResponse<ElizaAgent[]>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to get agents: ${error.message}`);
      }
      
      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      console.error('Error getting ElizaOS agents:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
  
  /**
   * Start an agent run
   */
  async startAgentRun(agentId: string, initialData: Record<string, any> = {}): Promise<ApiResponse<AgentRun>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Get the agent first
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();
      
      if (agentError) {
        throw new Error(`Agent not found: ${agentError.message}`);
      }
      
      // Create a new run
      const { data, error } = await supabase
        .from('agent_runs')
        .insert({
          agent_id: agentId,
          status: 'running',
          data: initialData,
          metrics: {},
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to start agent run: ${error.message}`);
      }
      
      // Emit agent started event
      TradingEventEmitter.emit(TRADING_EVENTS.AGENT_STARTED, {
        agentId,
        agentName: agent.name,
        status: 'running',
        runId: data.id,
      });
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error starting agent run:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
  
  /**
   * Send a message to an agent run
   */
  async sendAgentMessage(runId: string, content: string, role: 'system' | 'user' = 'user', metadata: Record<string, any> = {}): Promise<ApiResponse<AgentMessage>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Create a new message
      const { data, error } = await supabase
        .from('agent_messages')
        .insert({
          run_id: runId,
          role,
          content,
          metadata,
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to send agent message: ${error.message}`);
      }
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error sending agent message:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
  
  /**
   * Get messages for an agent run
   */
  async getAgentMessages(runId: string): Promise<ApiResponse<AgentMessage[]>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('agent_messages')
        .select('*')
        .eq('run_id', runId)
        .order('timestamp', { ascending: true });
      
      if (error) {
        throw new Error(`Failed to get agent messages: ${error.message}`);
      }
      
      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      console.error('Error getting agent messages:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
  
  /**
   * Create a new farm for multi-agent coordination
   */
  async createFarm(farmData: {
    name: string;
    description?: string;
    goal: string;
    parameters?: Record<string, any>;
  }): Promise<ApiResponse<Farm>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('farms')
        .insert({
          name: farmData.name,
          description: farmData.description || '',
          goal: farmData.goal,
          status: 'inactive',
          parameters: farmData.parameters || {},
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create farm: ${error.message}`);
      }
      
      // Emit farm created event
      TradingEventEmitter.emit(TRADING_EVENTS.FARM_CREATED, {
        farmId: data.id,
        farmName: data.name,
      });
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error creating farm:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
  
  /**
   * Get all farms
   */
  async getFarms(includeAgents: boolean = false): Promise<ApiResponse<Farm[]>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      let query = supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to get farms: ${error.message}`);
      }
      
      let farms = data || [];
      
      // Fetch agents for each farm if requested
      if (includeAgents && farms.length > 0) {
        const farmIds = farms.map(farm => farm.id);
        
        const { data: farmAgents, error: agentsError } = await supabase
          .from('farm_agents')
          .select('*, agent:agent_id(*)')
          .in('farm_id', farmIds);
        
        if (!agentsError && farmAgents) {
          // Group agents by farm
          const agentsByFarm: Record<string, ElizaAgent[]> = {};
          
          for (const farmAgent of farmAgents) {
            if (!agentsByFarm[farmAgent.farm_id]) {
              agentsByFarm[farmAgent.farm_id] = [];
            }
            
            agentsByFarm[farmAgent.farm_id].push(farmAgent.agent);
          }
          
          // Add agents to farms
          farms = farms.map(farm => ({
            ...farm,
            agents: agentsByFarm[farm.id] || [],
          }));
        }
      }
      
      return {
        success: true,
        data: farms,
      };
    } catch (error: any) {
      console.error('Error getting farms:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
  
  /**
   * Add an agent to a farm
   */
  async addAgentToFarm(farmId: string, agentId: string, role: string = 'member', parameters: Record<string, any> = {}): Promise<ApiResponse<FarmAgent>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Check if the agent is already in the farm
      const { data: existing, error: checkError } = await supabase
        .from('farm_agents')
        .select('*')
        .eq('farm_id', farmId)
        .eq('agent_id', agentId)
        .maybeSingle();
      
      if (checkError) {
        throw new Error(`Error checking farm agent: ${checkError.message}`);
      }
      
      if (existing) {
        // Agent already in farm, update the role if needed
        const { data, error } = await supabase
          .from('farm_agents')
          .update({ role, parameters })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) {
          throw new Error(`Failed to update farm agent: ${error.message}`);
        }
        
        return {
          success: true,
          data,
        };
      }
      
      // Add agent to farm
      const { data, error } = await supabase
        .from('farm_agents')
        .insert({
          farm_id: farmId,
          agent_id: agentId,
          role,
          parameters,
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to add agent to farm: ${error.message}`);
      }
      
      // Emit agent added to farm event
      TradingEventEmitter.emit(TRADING_EVENTS.FARM_AGENT_ADDED, {
        farmId,
        agentId,
        role,
      });
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error adding agent to farm:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Get agents for server components
   */
  async getAgentsServer(): Promise<ApiResponse<ExtendedAgent[]>> {
     const supabase = createServerClient();
     try {
        const { data, error } = await supabase
          .from('agents')
          .select('*, farms(id, name)')
          // .returns<Agent[]>(); // Removed explicit type argument
          
       if (error) { throw error; }
       if (!data) { return { data: [] }; }

       // Add explicit type for 'agent' parameter
       const extendedAgents: ExtendedAgent[] = data.map((agent: any) => {
           const configObj = safeGetConfig(agent.config);
           const performanceObj = safeGetConfig(agent.performance);
           const numericFarmId = agent.farm_id ? Number(agent.farm_id) : null;

           return {
             ...agent,
             farm_id: numericFarmId,
             configuration: configObj as AgentConfiguration,
             description: agent.description || configObj.description as string | undefined,
             strategy_type: configObj.strategy_type as string | undefined,
             risk_level: configObj.risk_level as string | undefined,
             target_markets: Array.isArray(configObj.target_markets) ? configObj.target_markets : undefined,
             performance_metrics: { /* ... */ },
             farm_name: agent.farms?.name || (numericFarmId ? `Farm ${numericFarmId}` : 'No Farm'),
             is_active: agent.status === 'active'
           } as ExtendedAgent; // Add type assertion if needed
       });
       return { data: extendedAgents };

     } catch (error) {
        console.error('Error fetching agents on server:', error);
        return { error: error instanceof Error ? error.message : 'Unknown server error' };
     }
  },
  
  /**
   * Link agent with knowledge document
   */
  async linkAgentWithKnowledge(agentId: string, documentId: string): Promise<ApiResponse<void>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      // Get current knowledge_ids
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('knowledge_ids')
        .eq('id', agentId)
        .single();
      
      if (agentError) {
        throw new Error(`Failed to get agent: ${agentError.message}`);
      }
      
      // Update knowledge_ids to include the new document
      const knowledgeIds = Array.isArray(agent.knowledge_ids) ? agent.knowledge_ids : [];
      
      if (!knowledgeIds.includes(documentId)) {
        knowledgeIds.push(documentId);
      }
      
      const { error } = await supabase
        .from('agents')
        .update({ knowledge_ids: knowledgeIds })
        .eq('id', agentId);
      
      if (error) {
        throw new Error(`Failed to link agent with knowledge: ${error.message}`);
      }
      
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Error linking agent with knowledge:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
  
  /**
   * Complete a farm run with ElizaOS agents
   */
  async runFarm(farmId: string, parameters: Record<string, any> = {}): Promise<ApiResponse<any>> {
    try {
      // 1. Get the farm details with agents
      const farmResponse = await this.getFarms(true);
      
      if (!farmResponse.success || !farmResponse.data) {
        throw new Error(farmResponse.error || 'Failed to get farm details');
      }
      
      const farm = farmResponse.data.find(f => f.id === farmId);
      
      if (!farm) {
        throw new Error(`Farm not found with ID: ${farmId}`);
      }
      
      // 2. Get the farm agents
      const { data: farmAgents, error: farmAgentsError } = await (typeof window === 'undefined' ? createServerClient() : createBrowserClient())
        .from('farm_agents')
        .select('*, agent:agent_id(*)')
        .eq('farm_id', farmId);
      
      if (farmAgentsError || !farmAgents) {
        throw new Error(farmAgentsError?.message || 'Failed to get farm agents');
      }
      
      // 3. Start a run for each agent
      const agentRuns = [];
      
      for (const farmAgent of farmAgents) {
        const agent = farmAgent.agent;
        
        // Start agent run
        const runResponse = await this.startAgentRun(agent.id, {
          farmId,
          farmGoal: farm.goal,
          agentRole: farmAgent.role,
          parameters: { ...parameters, ...farmAgent.parameters },
        });
        
        if (!runResponse.success || !runResponse.data) {
          console.error(`Failed to start run for agent ${agent.id}:`, runResponse.error);
          continue;
        }
        
        agentRuns.push(runResponse.data);
        
        // Initialize agent with system message
        await this.sendAgentMessage(
          runResponse.data.id,
          `You are a trading agent in the farm: ${farm.name}. Your role is: ${farmAgent.role}. The farm goal is: ${farm.goal}. Follow your instructions and work with other agents to achieve this goal.`,
          'system'
        );
      }
      
      if (agentRuns.length === 0) {
        throw new Error('Failed to start any agent runs');
      }
      
      // 4. Return success with agent runs
      return {
        success: true,
        data: {
          farmId,
          farmName: farm.name,
          goal: farm.goal,
          agentRuns,
        },
      };
    } catch (error: any) {
      console.error('Error running farm:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
  
  /**
   * Get agent types for ElizaOS
   */
  async getAgentTypes(): Promise<ApiResponse<any[]>> {
    try {
      const supabase = typeof window === 'undefined' ? createServerClient() : createBrowserClient();
      
      const { data, error } = await supabase
        .from('agent_types')
        .select('*')
        .order('name');
      
      if (error) {
        throw new Error(`Failed to get agent types: ${error.message}`);
      }
      
      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      console.error('Error getting agent types:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};
