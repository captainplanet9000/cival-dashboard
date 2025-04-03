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
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    
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
    
    const supabase = await createServerClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Query the agent
    const { data: agent, error } = await supabase
      .from('agents')
      .select(`
        *,
        farms:farm_id (
          id,
          name
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching agent ${id}:`, error);
      
      // Fallback to mock data
      const mockAgent = mockAgents.find(agent => agent.id === id);
      
      if (!mockAgent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(mockAgent);
    }
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(agent);
  } catch (error) {
    console.error(`Error fetching agent ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agents/[id]
 * Updates a specific agent
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const updateData = await request.json();
    
    // Verify input
    if (!updateData) {
      return NextResponse.json(
        { error: 'No update data provided' },
        { status: 400 }
      );
    }
    
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
        ...updateData,
        updated_at: new Date().toISOString()
      };
      
      return NextResponse.json(mockAgents[mockAgentIndex]);
    }
    
    const supabase = await createServerClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Update the agent
    const { data: updatedAgent, error } = await supabase
      .from('agents')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
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
      console.error(`Error updating agent ${id}:`, error);
      return NextResponse.json(
        { error: 'Failed to update agent' },
        { status: 500 }
      );
    }
    
    if (!updatedAgent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error(`Error updating agent ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/[id]
 * Deletes a specific agent
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    
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
    
    const supabase = await createServerClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Delete the agent
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting agent ${id}:`, error);
      return NextResponse.json(
        { error: 'Failed to delete agent' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, message: 'Agent deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting agent ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}