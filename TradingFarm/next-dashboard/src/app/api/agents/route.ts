import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Mock agent data
    const agents = [
      {
        id: 'agent-1',
        name: 'BTC Momentum Trader',
        farmId: 'farm-1',
        description: 'An AI-powered agent that trades Bitcoin based on momentum indicators',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        metrics: {
          totalTrades: 87,
          profitableTrades: 52,
          successRate: 0.59,
          totalProfit: 3520.42,
          profitLast24h: 125.75,
          avgHoldingTime: '4.2h'
        },
        model: 'gpt-4',
        parameters: {
          risk: 'medium',
          timeframe: '1h',
          tradingPair: 'BTC/USD',
          maxPositionSize: 0.5,
          stopLoss: 2.5,
          takeProfit: 4.0
        },
        exchange: {
          name: 'Binance',
          status: 'connected'
        },
        strategy: {
          name: 'Momentum',
          description: 'Uses RSI and MACD for momentum-based entries and exits'
        },
        elizaOSIntegration: {
          enabled: true,
          commandCount: 156,
          lastCommand: 'Analyze market sentiment for BTC',
          lastCommandTime: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        }
      },
      {
        id: 'agent-2',
        name: 'ETH Grid Trader',
        farmId: 'farm-1',
        description: 'An AI-powered agent that implements grid trading strategy for Ethereum',
        status: 'active',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastActive: new Date().toISOString(),
        metrics: {
          totalTrades: 132,
          profitableTrades: 89,
          successRate: 0.67,
          totalProfit: 2945.18,
          profitLast24h: 85.32,
          avgHoldingTime: '1.8h'
        },
        model: 'claude-3',
        parameters: {
          risk: 'low',
          timeframe: '4h',
          tradingPair: 'ETH/USD',
          maxPositionSize: 2.0,
          gridLevels: 10,
          gridSpacing: 1.5
        },
        exchange: {
          name: 'Coinbase',
          status: 'connected'
        },
        strategy: {
          name: 'Grid Trading',
          description: 'Places buy and sell orders at regular price intervals'
        },
        elizaOSIntegration: {
          enabled: true,
          commandCount: 98,
          lastCommand: 'Update grid levels based on recent volatility',
          lastCommandTime: new Date(Date.now() - 45 * 60 * 1000).toISOString()
        }
      },
      {
        id: 'agent-3',
        name: 'Arbitrage Scanner',
        farmId: 'farm-3',
        description: 'Scans for arbitrage opportunities across multiple exchanges',
        status: 'paused',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        lastActive: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        metrics: {
          totalTrades: 65,
          profitableTrades: 58,
          successRate: 0.89,
          totalProfit: 1250.32,
          profitLast24h: 0,
          avgHoldingTime: '0.3h'
        },
        model: 'gpt-4',
        parameters: {
          risk: 'high',
          minSpread: 0.5,
          maxSlippage: 0.2,
          maxPositionSize: 0.25
        },
        exchanges: [
          { name: 'Binance', status: 'connected' },
          { name: 'Kraken', status: 'connected' },
          { name: 'OKX', status: 'connected' }
        ],
        strategy: {
          name: 'Arbitrage',
          description: 'Exploits price differences between exchanges'
        },
        elizaOSIntegration: {
          enabled: true,
          commandCount: 42,
          lastCommand: 'Monitor liquidity levels across exchanges',
          lastCommandTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    ];
    
    // Filter by farmId if provided
    const filteredAgents = farmId 
      ? agents.filter(agent => agent.farmId === farmId)
      : agents;
    
    // Apply pagination
    const paginatedAgents = filteredAgents.slice(offset, offset + limit);
    
    // Return the response with proper metadata
    return NextResponse.json({
      agents: paginatedAgents,
      total: filteredAgents.length,
      limit,
      offset,
      hasMore: offset + limit < filteredAgents.length
    });
  } catch (error) {
    console.error('Agents API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.farmId) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'Agent name and farmId are required'
        },
        { status: 400 }
      );
    }
    
    // In production, we would create the agent in the database with proper validation
    
    // Return mock response with generated ID
    const newAgent = {
      id: `agent-${Date.now()}`,
      name: data.name,
      farmId: data.farmId,
      description: data.description || '',
      status: 'inactive', // Start as inactive
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      metrics: {
        totalTrades: 0,
        profitableTrades: 0,
        successRate: 0,
        totalProfit: 0,
        profitLast24h: 0,
        avgHoldingTime: '0h'
      },
      model: data.model || 'gpt-4',
      parameters: data.parameters || {},
      exchange: data.exchange || null,
      strategy: data.strategy || null,
      elizaOSIntegration: {
        enabled: true,
        commandCount: 0,
        lastCommand: null,
        lastCommandTime: null
      }
    };
    
    return NextResponse.json({ agent: newAgent });
  } catch (error) {
    console.error('Agent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
