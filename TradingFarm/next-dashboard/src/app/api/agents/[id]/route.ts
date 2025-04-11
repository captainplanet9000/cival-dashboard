import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

interface RouteParams {
  params: {
    id: string;
  }
}

// Mock agents for fallback when database isn't available
const mockAgents = [
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
  return process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true' || 
         process.env.NEXT_PUBLIC_MOCK_API_ENABLED === 'true';
};

/**
 * GET /api/agents/[id]
 * Returns a specific agent by ID
 */
export async function GET(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // If we're in mock mode, return mock data
    if (isMockModeEnabled()) {
      const mockAgent = mockAgents.find(agent => agent.id === id);
      
      if (!mockAgent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(mockAgent);
    }
    
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Check for user authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - User not authenticated' },
        { status: 401 }
      );
    }
    
    // Fetch the agent
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === '22P02' ? 400 : 500 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Check if user has access to this agent
    if (data.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this agent' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Unexpected error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agents/[id]
 * Updates a specific agent
 */
export async function PATCH(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const updates = await request.json();
    
    // If we're in mock mode, simulate an update
    if (isMockModeEnabled()) {
      const mockAgentIndex = mockAgents.findIndex(agent => agent.id === id);
      
      if (mockAgentIndex === -1) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }
      
      // Update the mock agent
      mockAgents[mockAgentIndex] = {
        ...mockAgents[mockAgentIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      return NextResponse.json(mockAgents[mockAgentIndex]);
    }
    
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Check for user authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - User not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify the agent exists and belongs to the user
    const { data: agent, error: fetchError } = await supabase
      .from('agents')
      .select('user_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: fetchError.code === '22P02' ? 400 : 500 }
      );
    }
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Check if user has access to this agent
    if (agent.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this agent' },
        { status: 403 }
      );
    }
    
    // Add updated_at timestamp
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // Don't allow changing user_id
    if (updatedData.user_id) {
      delete updatedData.user_id;
    }
    
    // Update the agent
    const { data, error } = await supabase
      .from('agents')
      .update(updatedData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Unexpected error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/[id]
 * Deletes a specific agent
 */
export async function DELETE(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // If we're in mock mode, simulate a delete
    if (isMockModeEnabled()) {
      const mockAgentIndex = mockAgents.findIndex(agent => agent.id === id);
      
      if (mockAgentIndex === -1) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }
      
      // Remove the agent from the mock data
      mockAgents.splice(mockAgentIndex, 1);
      
      return NextResponse.json(
        { success: true, message: 'Agent deleted successfully' },
        { status: 200 }
      );
    }
    
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Check for user authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - User not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify the agent exists and belongs to the user
    const { data: agent, error: fetchError } = await supabase
      .from('agents')
      .select('user_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: fetchError.code === '22P02' ? 400 : 500 }
      );
    }
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Check if user has access to this agent
    if (agent.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this agent' },
        { status: 403 }
      );
    }
    
    // Delete the agent
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, message: 'Agent deleted successfully' }
    );
    
  } catch (error) {
    console.error('Unexpected error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}