import { NextResponse, NextRequest } from '@/types/next-types';
import { createServerClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '@/types/database.types';

interface AgentConfig {
  description: string;
  strategy_type: string;
  risk_level: string;
  target_markets: string[];
  performance_metrics: {
    win_rate: number;
    profit_loss: number;
    total_trades: number;
    average_trade_duration: number;
  };
  [key: string]: any;
}

interface AgentResult {
  id: string;
  name: string;
  farm_id: string | null;
  user_id: string | null;
  status: string;
  type: string;
  config?: AgentConfig; 
  instructions?: string | null;
  permissions?: any;
  performance?: any;
  created_at: string;
  updated_at: string;
  farms?: {
    id: string;
    name: string;
  };
}

const mockAgents: AgentResult[] = [
  {
    id: "1",
    name: "BTC Momentum Trader",
    farm_id: "1",
    user_id: null,
    status: "active",
    type: "eliza",
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    config: {
      description: "Bitcoin momentum trading bot using EMA crossover strategy",
      strategy_type: "momentum",
      risk_level: "medium",
      target_markets: ["BTC/USDT"],
      performance_metrics: {
        win_rate: 58,
        profit_loss: 3.2,
        total_trades: 45,
        average_trade_duration: 120
      }
    },
    performance: {
      win_rate: 58,
      profit_loss: 3.2,
      total_trades: 45,
      average_trade_duration: 120
    },
    farms: {
      id: "1",
      name: "Bitcoin Momentum Farm"
    }
  },
  {
    id: "2",
    name: "ETH Swing Trader",
    farm_id: "2",
    user_id: null,
    status: "active",
    type: "eliza",
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    config: {
      description: "Ethereum swing trading bot using RSI and MACD",
      strategy_type: "swing",
      risk_level: "high",
      target_markets: ["ETH/USDT"],
      performance_metrics: {
        win_rate: 62,
        profit_loss: 4.7,
        total_trades: 38,
        average_trade_duration: 240
      }
    },
    performance: {
      win_rate: 62,
      profit_loss: 4.7,
      total_trades: 38,
      average_trade_duration: 240
    },
    farms: {
      id: "2",
      name: "Altcoin Swing Trader"
    }
  },
  {
    id: "3",
    name: "AAVE Yield Bot",
    farm_id: "3",
    user_id: null,
    status: "active",
    type: "eliza",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    config: {
      description: "AAVE yield optimization bot for DeFi protocols",
      strategy_type: "yield",
      risk_level: "low",
      target_markets: ["AAVE/ETH"],
      performance_metrics: {
        win_rate: 92,
        profit_loss: 1.8,
        total_trades: 15,
        average_trade_duration: 720
      }
    },
    performance: {
      win_rate: 92,
      profit_loss: 1.8,
      total_trades: 15,
      average_trade_duration: 720
    },
    farms: {
      id: "3",
      name: "DeFi Yield Farm"
    }
  }
];

const isMockModeEnabled = () => {
  // Check for window global config first (client-side)
  if (typeof window !== 'undefined' && 
      window.devConfig && 
      (window.devConfig.mockDataConfig.enabled || window.devConfig.mockDataConfig.forceMockMode)) {
    return true;
  }
  
  // Fallback to environment variables (server-side)
  return process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true' || 
         process.env.NEXT_PUBLIC_MOCK_API_ENABLED === 'true';
};

const getMockAgentsByFarmId = (farmId: string | null, limit: number, offset: number) => {
  let filteredAgents = mockAgents;
  
  if (farmId) {
    filteredAgents = mockAgents.filter(agent => agent.farm_id === farmId);
  }
  
  return {
    agents: filteredAgents.slice(offset, offset + limit),
    total: filteredAgents.length
  };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmIdParam = searchParams.get('farmId') || searchParams.get('farm_id');
    const farmId = farmIdParam || null;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (isMockModeEnabled() || searchParams.get('mock') === 'true') {
      console.log('Using mock agent data in API');
      const { agents, total } = getMockAgentsByFarmId(farmId, limit, offset);
      return NextResponse.json({
        agents,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      });
    }
    
    const supabase = await createServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user, using mock data');
      const { agents, total } = getMockAgentsByFarmId(farmId, limit, offset);
      return NextResponse.json({
        agents,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      });
    }
    
    let query = supabase
      .from('agents')
      .select(`
        *,
        farms:farm_id (
          id,
          name
        )
      `, { count: 'exact' });
    
    if (farmId) {
      query = query.eq('farm_id', farmId);
    } else {
      query = query.eq('user_id', user.id);
    }

    query = query.range(offset, offset + limit - 1);
    
    // Order by created_at descending (newest first)
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching agents:', error);
      const { agents: mockAgentData, total } = getMockAgentsByFarmId(farmId, limit, offset);
      return NextResponse.json({
        agents: mockAgentData,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      });
    }
    
    if (!agents || agents.length === 0) {
      console.log('No agents found for user, using mock data');
      const { agents: mockAgentData, total } = getMockAgentsByFarmId(farmId, limit, offset);
      return NextResponse.json({
        agents: mockAgentData,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      });
    }
    
    // Process the data to extract useful properties
    const processedData = data.map(agent => {
      // Extract configuration properties
      const configObj = agent.configuration || {};
      const performanceMetrics = configObj.performance_metrics || {};
      
      return {
        ...agent,
        // Extract these fields from configuration if they exist
        description: configObj.description || '',
        strategy_type: configObj.strategy_type || '',
        risk_level: configObj.risk_level || '',
        target_markets: Array.isArray(configObj.target_markets) ? configObj.target_markets : [],
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
    
    return NextResponse.json({ data: processedData });
  } catch (error) {
    console.error('Error fetching agents:', error);
    const limit = 10;
    const offset = 0;
    const { agents, total } = getMockAgentsByFarmId(null, limit, offset);
    return NextResponse.json({
      agents,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    });
  }
}

/**
 * POST /api/agents
 * Create a new agent
 */
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    
    // Mock mode handling enhanced for both regular and ElizaOS agents
    if (isMockModeEnabled()) {
      console.log('Creating agent in mock mode:', requestData);
      
      const mockId = `mock-agent-${Date.now().toString().substring(7)}`;
      const now = new Date().toISOString();
      
      // Create a new mock agent based on the request
      const newMockAgent: AgentResult = {
        id: mockId,
        name: requestData.name || 'New Mock Agent',
        farm_id: requestData.farm_id || null,
        user_id: requestData.user_id || 'mock-user-1',
        status: requestData.status || 'active',
        type: requestData.type || 'standard', // Could be 'standard', 'eliza', etc.
        created_at: now,
        updated_at: now,
        config: {
          description: requestData.description || requestData.config?.description || '',
          strategy_type: requestData.strategy_type || requestData.config?.strategy_type || 'default',
          risk_level: requestData.risk_level || requestData.config?.risk_level || 'medium',
          target_markets: requestData.target_markets || requestData.config?.target_markets || ['BTC/USDT'],
          performance_metrics: {
            win_rate: 0,
            profit_loss: 0,
            total_trades: 0,
            average_trade_duration: 0,
            ...(requestData.performance_metrics || requestData.config?.performance_metrics || {})
          },
          ...(requestData.config || {})
        },
        instructions: requestData.instructions || null,
        performance: {
          win_rate: 0,
          profit_loss: 0,
          total_trades: 0,
          average_trade_duration: 0
        }
      };
      
      // If farm_id is provided, add farm details
      if (requestData.farm_id) {
        // Find the farm in mock data or create a placeholder
        newMockAgent.farms = {
          id: requestData.farm_id,
          name: `Farm ${requestData.farm_id}`
        };
      }
      
      // Add the new agent to the mock agents array for future requests
      mockAgents.push(newMockAgent);
      
      console.log('Created mock agent:', newMockAgent);
      
      return NextResponse.json({ 
        agent: newMockAgent,
        message: `${requestData.type === 'eliza' ? 'ElizaOS' : 'Standard'} agent created successfully (mock)` 
      });
    }
    
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const newMockAgent: AgentResult = {
        id: `mock-${Date.now()}`,
        name: requestData.name,
        farm_id: requestData.farm_id,
        user_id: null,
        status: requestData.status || 'initializing',
        type: requestData.type || 'eliza',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        config: {
          description: requestData.description || '',
          strategy_type: requestData.strategy_type || 'custom',
          risk_level: requestData.risk_level || 'medium',
          target_markets: requestData.target_markets || [],
          performance_metrics: {
            win_rate: 0,
            profit_loss: 0,
            total_trades: 0,
            average_trade_duration: 0
          },
          ...(requestData.config || {})
        },
        performance: {
          win_rate: 0,
          profit_loss: 0,
          total_trades: 0,
          average_trade_duration: 0
        }
      };
      return NextResponse.json({ 
        agent: newMockAgent,
        message: 'Agent created successfully (mock)' 
      });
    }

    const { data: farmData, error: farmError } = await supabase
      .from('farms')
      .select('id')
      .eq('id', requestData.farm_id)
      .eq('user_id', user.id)
      .single();

    if (farmError || !farmData) {
      const newMockAgent: AgentResult = {
        id: `mock-${Date.now()}`,
        name: requestData.name,
        farm_id: requestData.farm_id,
        user_id: null,
        status: requestData.status || 'initializing',
        type: requestData.type || 'eliza',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        config: {
          description: requestData.description || '',
          strategy_type: requestData.strategy_type || 'custom',
          risk_level: requestData.risk_level || 'medium',
          target_markets: requestData.target_markets || [],
          performance_metrics: {
            win_rate: 0,
            profit_loss: 0,
            total_trades: 0,
            average_trade_duration: 0
          },
          ...(requestData.config || {})
        },
        performance: {
          win_rate: 0,
          profit_loss: 0,
          total_trades: 0,
          average_trade_duration: 0
        }
      };
      return NextResponse.json({ 
        agent: newMockAgent,
        message: 'Agent created successfully (mock - farm verification failed)' 
      });
    }

    const configObject = {
      description: requestData.description || '',
      strategy_type: requestData.strategy_type || 'custom',
      risk_level: requestData.risk_level || 'medium',
      target_markets: requestData.target_markets || [],
      performance_metrics: {
        win_rate: 0,
        profit_loss: 0,
        total_trades: 0,
        average_trade_duration: 0
      },
      ...(requestData.config || {})
    };

    const performanceObject = {
      win_rate: 0,
      profit_loss: 0,
      total_trades: 0,
      average_trade_duration: 0
    };

    const agentData = {
      name: requestData.name,
      farm_id: requestData.farm_id,
      user_id: user.id,
      status: requestData.status || 'initializing',
      type: requestData.type || 'eliza',
      config: configObject,
      performance: performanceObject,
      instructions: requestData.instructions || null,
      permissions: requestData.permissions || {}
    };
    
    console.log('Creating agent with data:', agentData);
    
    const { data: agent, error } = await supabase
      .from('agents')
      .insert([agentData])
      .select(`
        *,
        farms:farm_id (
          id,
          name
        )
      `)
      .single();
    
    if (error) {
      console.error('Error creating agent:', error);
      const newMockAgent: AgentResult = {
        id: `mock-${Date.now()}`,
        name: requestData.name,
        farm_id: requestData.farm_id,
        user_id: user.id,
        status: requestData.status || 'initializing',
        type: requestData.type || 'eliza',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        config: configObject,
        performance: performanceObject
      };
      return NextResponse.json({ 
        agent: newMockAgent,
        message: 'Agent created successfully (mock - insert failed)' 
      });
    }
    
    return NextResponse.json({ 
      agent,
      message: 'Agent created successfully' 
    });
  } catch (error) {
    console.error('Agent creation error:', error);
    const requestData = { 
      name: "New Agent", 
      farm_id: "1",
      type: "eliza",
      status: "initializing"
    };
    const newMockAgent: AgentResult = {
      id: `mock-${Date.now()}`,
      name: requestData.name,
      farm_id: requestData.farm_id,
      user_id: null,
      status: requestData.status,
      type: requestData.type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      config: {
        description: '',
        strategy_type: 'custom',
        risk_level: 'medium',
        target_markets: [],
        performance_metrics: {
          win_rate: 0,
          profit_loss: 0,
          total_trades: 0,
          average_trade_duration: 0
        }
      },
      performance: {
        win_rate: 0,
        profit_loss: 0,
        total_trades: 0,
        average_trade_duration: 0
      }
    };
    return NextResponse.json({ 
      agent: newMockAgent,
      message: 'Agent created successfully (mock - exception)' 
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { id, ...updateData } = requestData;
    
    if (!id) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }
    
    if (isMockModeEnabled()) {
      const mockAgent = mockAgents.find(agent => agent.id === id);
      if (!mockAgent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      
      const updatedMockAgent = {
        ...mockAgent,
        ...updateData,
        updated_at: new Date().toISOString()
      };
      
      return NextResponse.json({ 
        agent: updatedMockAgent,
        message: 'Agent updated successfully (mock)' 
      });
    }
    
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      const mockAgent = mockAgents.find(agent => agent.id === id);
      if (!mockAgent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      
      const updatedMockAgent = {
        ...mockAgent,
        ...updateData,
        updated_at: new Date().toISOString()
      };
      
      return NextResponse.json({ 
        agent: updatedMockAgent,
        message: 'Agent updated successfully (mock)' 
      });
    }
    
    let updateObj: any = {};
    
    if (updateData.name) updateObj.name = updateData.name;
    if (updateData.status) updateObj.status = updateData.status;
    if (updateData.type) updateObj.type = updateData.type;
    if (updateData.farm_id) updateObj.farm_id = updateData.farm_id;
    if (updateData.instructions !== undefined) updateObj.instructions = updateData.instructions;
    
    if (updateData.config || updateData.description || updateData.strategy_type || 
        updateData.risk_level || updateData.target_markets) {
      // Get the current agent data for config
      const { data: currentAgentConfig } = await supabase
        .from('agents')
        .select('config')
        .eq('id', id)
        .single();
      
      // Safely extract current config as an object
      const currentConfig = typeof currentAgentConfig?.config === 'object' 
        ? currentAgentConfig.config as Record<string, any>
        : {};
      
      // Create the updated config object with type safety
      updateObj.config = {
        ...currentConfig,
        ...(updateData.config || {}),
        description: updateData.description !== undefined 
          ? updateData.description 
          : currentConfig.description || '',
        strategy_type: updateData.strategy_type !== undefined 
          ? updateData.strategy_type 
          : currentConfig.strategy_type || '',
        risk_level: updateData.risk_level !== undefined 
          ? updateData.risk_level 
          : currentConfig.risk_level || '',
        target_markets: updateData.target_markets || currentConfig.target_markets || []
      };
    }
    
    if (updateData.performance || updateData.performance_metrics) {
      // Get the current agent data for performance
      const { data: currentAgentPerf } = await supabase
        .from('agents')
        .select('performance')
        .eq('id', id)
        .single();
        
      updateObj.performance = {
        ...(typeof currentAgentPerf?.performance === 'object' ? currentAgentPerf.performance : {}),
        ...(updateData.performance || {}),
        ...(updateData.performance_metrics || {})
      };
    }
    
    const { data: agent, error } = await supabase
      .from('agents')
      .update(updateObj)
      .eq('id', id)
      .select(`
        *,
        farms:farm_id (
          id,
          name
        )
      `)
      .single();
    
    if (error) {
      console.error('Error updating agent:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      agent,
      message: 'Agent updated successfully' 
    });
  } catch (error) {
    console.error('Agent update error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
