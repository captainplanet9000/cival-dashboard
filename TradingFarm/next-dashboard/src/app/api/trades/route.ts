import { NextResponse } from 'next/server';
import { tradeService } from '../../../data-access/services';

/**
 * GET /api/trades
 * Returns a list of trades, optionally filtered by query parameters
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const agentId = searchParams.get('agentId');
    const orderId = searchParams.get('orderId');
    const symbol = searchParams.get('symbol');
    const limit = Number(searchParams.get('limit') || '20');
    const offset = Number(searchParams.get('offset') || '0');
    
    // Handle specific filter type
    if (farmId) {
      const trades = await tradeService.findByFarmId(Number(farmId));
      return NextResponse.json({ data: trades });
    }
    
    if (agentId) {
      const trades = await tradeService.findByAgentId(Number(agentId));
      return NextResponse.json({ data: trades });
    }
    
    if (orderId) {
      const trades = await tradeService.findByOrderId(Number(orderId));
      return NextResponse.json({ data: trades });
    }
    
    if (symbol) {
      const trades = await tradeService.findBySymbol(symbol);
      return NextResponse.json({ data: trades });
    }
    
    // Get recent trades if no specific filter
    const recentTrades = await tradeService.getRecentTrades(limit, offset);
    
    return NextResponse.json({ 
      data: recentTrades,
      pagination: {
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
} 