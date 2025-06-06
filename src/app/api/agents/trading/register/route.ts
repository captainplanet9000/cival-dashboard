import { NextRequest, NextResponse } from 'next/server';
import supabaseService from '@/lib/services/supabase-service';
import { checkAuth } from '@/lib/auth/checkAuth';

// API key authentication for agent requests


export async function POST(req: NextRequest) {
  try {
    const session = await checkAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      agentId, 
      maxTradeSize = 10000,
      maxPositionSize = 50000,
      maxDailyTrades = 100,
      allowedSymbols = ['BTC', 'ETH', 'SOL'],
      allowedStrategies = ['momentum', 'mean_reversion', 'arbitrage'],
      riskLevel = 'moderate'
    } = body;

    // Validate agent ID
    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    // Check if agent already exists in Supabase
    const existing = await supabaseService.getAgentTradingPermission(agentId).catch(() => null);
    if (existing) {
      return NextResponse.json({ error: 'Agent already registered' }, { status: 409 });
    }

    // Create agent trading permissions in Supabase
    const agent = await supabaseService.createAgentTradingPermission({
      agent_id: agentId,
      user_id: session.user.id,
      account_id: session.user.id,
      max_trade_size: maxTradeSize,
      max_position_size: maxPositionSize,
      max_daily_trades: maxDailyTrades,
      allowed_symbols: allowedSymbols,
      allowed_strategies: allowedStrategies,
      risk_level: riskLevel,
      is_active: true,
      trades_today: 0,
      position_value: 0
    });

    return NextResponse.json({
      success: true,
      agent: {
        agentId: agent.agent_id,
        permissions: {
          maxTradeSize: agent.max_trade_size,
          maxPositionSize: agent.max_position_size,
          maxDailyTrades: agent.max_daily_trades,
          allowedSymbols: agent.allowed_symbols,
          allowedStrategies: agent.allowed_strategies,
          riskLevel: agent.risk_level
        },
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Agent registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register agent' }, 
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await checkAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all registered agents for the user from Supabase
    const agents = await supabaseService.getAgentTradingPermissions(session.user.id);

    return NextResponse.json({
      agents: agents.map(agent => ({
        agentId: agent.agent_id,
        permissions: {
          maxTradeSize: agent.max_trade_size,
          maxPositionSize: agent.max_position_size,
          maxDailyTrades: agent.max_daily_trades,
          allowedSymbols: agent.allowed_symbols,
          allowedStrategies: agent.allowed_strategies,
          riskLevel: agent.risk_level
        },
        status: agent.is_active ? 'active' : 'inactive',
        tradesToday: agent.trades_today,
        positionValue: agent.position_value,
        createdAt: agent.created_at
      }))
    });

  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' }, 
      { status: 500 }
    );
  }
}
