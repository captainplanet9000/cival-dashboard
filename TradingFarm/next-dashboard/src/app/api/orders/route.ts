import { NextResponse } from 'next/server';
import { orderService } from '../../../data-access/services';

/**
 * GET /api/orders
 * Returns a list of orders, optionally filtered by query parameters
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const agentId = searchParams.get('agentId');
    const status = searchParams.get('status');
    const limit = Number(searchParams.get('limit') || '20');
    const offset = Number(searchParams.get('offset') || '0');
    
    const options: any = {
      limit,
      offset,
      filters: {}
    };
    
    // Apply filters if provided
    if (farmId) {
      options.filters.farm_id = Number(farmId);
    }
    
    if (agentId) {
      options.filters.agent_id = Number(agentId);
    }
    
    if (status) {
      // Handle comma-separated status values
      options.filters.status = status.includes(',') 
        ? status.split(',') 
        : status;
    }
    
    const orders = await orderService.findAll(options);
    
    return NextResponse.json({ 
      data: orders,
      pagination: {
        limit,
        offset,
        total: await orderService.count(options.filters)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Creates a new order
 */
export async function POST(request: Request) {
  try {
    const orderData = await request.json();
    
    // Basic validation
    if (!orderData.farm_id || !orderData.symbol || !orderData.side || !orderData.quantity) {
      return NextResponse.json(
        { error: 'Missing required order fields (farm_id, symbol, side, quantity)' },
        { status: 400 }
      );
    }
    
    const newOrder = await orderService.create(orderData);
    
    return NextResponse.json({ data: newOrder }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
} 