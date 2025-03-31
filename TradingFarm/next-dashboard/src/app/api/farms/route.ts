import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // In a production environment, we would validate the user ID and permissions
    // and query actual farm data from Supabase
    
    // Mock farm data
    const farms = [
      {
        id: 'farm-1',
        name: 'Bitcoin Trading Farm',
        description: 'Automated Bitcoin trading strategies',
        createdAt: new Date().toISOString(),
        status: 'active',
        metrics: {
          totalProfit: 12580.45,
          profitLast24h: 345.21,
          profitLast7d: 2245.87,
          tradeCount: 178,
          successRate: 0.68,
          avgHoldingTime: '3.2h'
        },
        exchanges: [
          { name: 'Binance', status: 'connected', apiKeyLastFour: '7X92' },
          { name: 'Coinbase', status: 'connected', apiKeyLastFour: '3F21' }
        ],
        agentCount: 2,
        strategyCount: 2
      },
      {
        id: 'farm-2',
        name: 'Ethereum Yield Strategy',
        description: 'Yield optimization for Ethereum assets',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        metrics: {
          totalProfit: 8750.32,
          profitLast24h: -120.45,
          profitLast7d: 1120.63,
          tradeCount: 93,
          successRate: 0.62,
          avgHoldingTime: '5.7h'
        },
        exchanges: [
          { name: 'Binance', status: 'connected', apiKeyLastFour: '8P31' }
        ],
        agentCount: 1,
        strategyCount: 1
      },
      {
        id: 'farm-3',
        name: 'Arbitrage Scanner',
        description: 'Cross-exchange arbitrage opportunities',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'paused',
        metrics: {
          totalProfit: 4250.18,
          profitLast24h: 0,
          profitLast7d: 0,
          tradeCount: 65,
          successRate: 0.55,
          avgHoldingTime: '0.3h'
        },
        exchanges: [
          { name: 'Binance', status: 'connected', apiKeyLastFour: '7X92' },
          { name: 'Kraken', status: 'connected', apiKeyLastFour: '5F19' },
          { name: 'OKX', status: 'connected', apiKeyLastFour: '2G87' }
        ],
        agentCount: 1,
        strategyCount: 1
      }
    ];

    // Pagination
    const paginatedFarms = farms.slice(offset, offset + limit);
    
    // Return the response with proper metadata
    return NextResponse.json({
      farms: paginatedFarms,
      total: farms.length,
      limit,
      offset,
      hasMore: offset + limit < farms.length
    });
  } catch (error) {
    console.error('Farms API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch farms data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { error: 'Farm name is required' },
        { status: 400 }
      );
    }
    
    // In production, we would create the farm in the database
    
    // Return mock response with generated ID
    const newFarm = {
      id: `farm-${Date.now()}`,
      name: data.name,
      description: data.description || '',
      createdAt: new Date().toISOString(),
      status: 'active',
      metrics: {
        totalProfit: 0,
        profitLast24h: 0,
        profitLast7d: 0,
        tradeCount: 0,
        successRate: 0,
        avgHoldingTime: '0h'
      },
      exchanges: [],
      agentCount: 0,
      strategyCount: 0
    };
    
    return NextResponse.json({ farm: newFarm });
  } catch (error) {
    console.error('Farm creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create farm' },
      { status: 500 }
    );
  }
}
