import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const farmId = searchParams.get('farmId');
    const agentId = searchParams.get('agentId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    
    // Generate mock orders data
    const generateMockOrders = (count: number) => {
      const orders = [];
      const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD', 'ADA/USD'];
      const orderStatuses = ['open', 'filled', 'canceled', 'rejected', 'partial'];
      const orderTypes = ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'];
      const sides = ['buy', 'sell'];
      
      for (let i = 0; i < count; i++) {
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const orderStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
        const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
        const side = sides[Math.floor(Math.random() * sides.length)];
        const price = symbol.includes('BTC') 
          ? 50000 + (Math.random() * 10000)
          : symbol.includes('ETH')
            ? 3000 + (Math.random() * 500)
            : 10 + (Math.random() * 100);
        const amount = symbol.includes('BTC') 
          ? 0.1 + (Math.random() * 0.5)
          : symbol.includes('ETH')
            ? 1 + (Math.random() * 5)
            : 10 + (Math.random() * 50);
        
        const order = {
          id: `order-${Date.now()}-${i}`,
          farmId: farmId || `farm-${Math.floor(Math.random() * 3) + 1}`,
          agentId: agentId || (Math.random() > 0.5 ? `agent-${Math.floor(Math.random() * 3) + 1}` : null),
          symbol,
          status: status || orderStatus,
          type: type || orderType,
          side,
          price: parseFloat(price.toFixed(2)),
          amount: parseFloat(amount.toFixed(6)),
          filled: orderStatus === 'filled' ? amount : orderStatus === 'partial' ? amount * Math.random() : 0,
          remaining: orderStatus === 'filled' ? 0 : orderStatus === 'partial' ? amount * (1 - Math.random()) : amount,
          cost: parseFloat((price * amount).toFixed(2)),
          fee: parseFloat((price * amount * 0.001).toFixed(2)),
          created: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
          updated: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString(),
          exchange: Math.random() > 0.5 ? 'Binance' : Math.random() > 0.5 ? 'Coinbase' : 'Kraken',
          elizaOSData: Math.random() > 0.3 ? {
            confidence: parseFloat((0.7 + Math.random() * 0.3).toFixed(2)),
            reasoning: "Entry based on bullish divergence and support level",
            model: Math.random() > 0.5 ? 'gpt-4' : 'claude-3'
          } : null
        };
        
        orders.push(order);
      }
      
      return orders;
    };
    
    // Filter logic
    let orders = generateMockOrders(100);
    
    if (farmId) {
      orders = orders.filter(order => order.farmId === farmId);
    }
    
    if (agentId) {
      orders = orders.filter(order => order.agentId === agentId);
    }
    
    if (status) {
      orders = orders.filter(order => order.status === status);
    }
    
    if (type) {
      orders = orders.filter(order => order.type === type);
    }
    
    // Sort by created date (newest first)
    orders.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    
    // Apply pagination
    const paginatedOrders = orders.slice(offset, offset + limit);
    
    // Return response with metadata
    return NextResponse.json({
      orders: paginatedOrders,
      total: orders.length,
      limit,
      offset,
      hasMore: offset + limit < orders.length
    });
  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders data' },
      { status: 500 }
    );
  }
}
