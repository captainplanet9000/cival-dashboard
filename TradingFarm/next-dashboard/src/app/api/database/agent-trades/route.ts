/**
 * API Routes for Agent Trades
 * Provides operations for managing AI agent trading activities
 */
import { NextRequest, NextResponse } from 'next/server';
import neonClient from '@/utils/database/neon-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const tradeId = searchParams.get('id');
    
    if (!agentId && !tradeId) {
      return NextResponse.json(
        { error: 'Either agentId or tradeId must be provided' },
        { status: 400 }
      );
    }
    
    if (tradeId) {
      // Get specific trade details
      const trade = await neonClient.getAgentTrade(tradeId);
      
      if (!trade) {
        return NextResponse.json(
          { error: 'Trade not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(trade);
    }
    
    // Get all trades for an agent
    const trades = await neonClient.getAgentTrades(agentId!);
    return NextResponse.json(trades);
  } catch (error) {
    console.error('Error fetching agent trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent trades' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.agent_id || !data.symbol || !data.entry_price || 
        !data.quantity || !data.direction || !data.status) {
      return NextResponse.json(
        { error: 'Missing required fields for trade creation' },
        { status: 400 }
      );
    }
    
    // Set default values
    const trade = {
      ...data,
      entry_time: data.entry_time || new Date().toISOString(),
      strategy_used: data.strategy_used || 'manual',
      trade_tags: data.trade_tags || []
    };
    
    const newTrade = await neonClient.createAgentTrade(trade);
    
    // Update agent stats if trade is closed
    if (trade.status === 'closed' && trade.profit_loss !== undefined) {
      try {
        const agent = await neonClient.getAgent(trade.agent_id);
        
        if (agent) {
          const totalTrades = (agent.trades ?? 0) + 1;
          const winningTrade = trade.profit_loss > 0;
          const wonTrades = winningTrade 
            ? ((agent.win_rate ?? 0) / 100) * (agent.trades ?? 0) + 1 
            : ((agent.win_rate ?? 0) / 100) * (agent.trades ?? 0);
          const newWinRate = (wonTrades / totalTrades) * 100;
          
          await neonClient.updateAgent(trade.agent_id, {
            trades: totalTrades,
            win_rate: newWinRate,
            last_trade_time: trade.exit_time || trade.entry_time
          });
        }
      } catch (statsError) {
        console.error('Error updating agent stats:', statsError);
        // Continue even if stats update fails
      }
    }
    
    return NextResponse.json(newTrade, { status: 201 });
  } catch (error) {
    console.error('Error creating agent trade:', error);
    return NextResponse.json(
      { error: 'Failed to create agent trade' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json(
        { error: 'Missing trade ID' },
        { status: 400 }
      );
    }
    
    // Check if trade exists
    const existingTrade = await neonClient.getAgentTrade(data.id);
    if (!existingTrade) {
      return NextResponse.json(
        { error: 'Trade not found' },
        { status: 404 }
      );
    }
    
    // Special handling for trade closing
    const isClosingTrade = 
      existingTrade.status === 'open' && 
      data.status === 'closed' && 
      data.exit_price !== undefined;
    
    if (isClosingTrade) {
      // Calculate profit/loss if not provided
      if (data.profit_loss === undefined) {
        const entryValue = existingTrade.entry_price * existingTrade.quantity;
        const exitValue = data.exit_price * existingTrade.quantity;
        
        if (existingTrade.direction === 'long') {
          data.profit_loss = exitValue - entryValue;
          data.profit_loss_percentage = ((exitValue / entryValue) - 1) * 100;
        } else {
          data.profit_loss = entryValue - exitValue;
          data.profit_loss_percentage = ((entryValue / exitValue) - 1) * 100;
        }
      }
      
      // Set exit time if not provided
      if (!data.exit_time) {
        data.exit_time = new Date().toISOString();
      }
    }
    
    const updatedTrade = await neonClient.updateAgentTrade(data.id, data);
    
    // Update agent stats if trade status changed to closed
    if (isClosingTrade) {
      try {
        const agent = await neonClient.getAgent(existingTrade.agent_id);
        
        if (agent) {
          const totalTrades = (agent.trades ?? 0) + 1;
          const winningTrade = data.profit_loss > 0;
          const wonTrades = winningTrade 
            ? ((agent.win_rate ?? 0) / 100) * (agent.trades ?? 0) + 1 
            : ((agent.win_rate ?? 0) / 100) * (agent.trades ?? 0);
          const newWinRate = (wonTrades / totalTrades) * 100;
          
          await neonClient.updateAgent(data.agent_id, {
            trades: totalTrades,
            win_rate: newWinRate,
            last_trade_time: data.exit_time
          });
        }
      } catch (statsError) {
        console.error('Error updating agent stats:', statsError);
        // Continue even if stats update fails
      }
    }
    
    return NextResponse.json(updatedTrade);
  } catch (error) {
    console.error('Error updating agent trade:', error);
    return NextResponse.json(
      { error: 'Failed to update agent trade' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tradeId = searchParams.get('id');
    
    if (!tradeId) {
      return NextResponse.json(
        { error: 'Missing trade ID' },
        { status: 400 }
      );
    }
    
    const success = await neonClient.deleteAgentTrade(tradeId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete trade' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent trade:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent trade' },
      { status: 500 }
    );
  }
}
