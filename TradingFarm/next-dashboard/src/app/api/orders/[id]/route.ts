import { NextResponse } from 'next/server';
import { orderService } from '../../../../data-access/services';

interface RouteParams {
  params: {
    id: string;
  }
}

/**
 * GET /api/orders/[id]
 * Returns a specific order by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const orderId = Number(id);
    
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }
    
    const order = await orderService.findById(orderId);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: order });
  } catch (error) {
    console.error(`Error fetching order ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orders/[id]
 * Updates a specific order (limited fields that can be updated)
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const orderId = Number(id);
    
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }
    
    const orderData = await request.json();
    
    // Only allow updating specific fields
    const allowedFields = ['metadata', 'notes'];
    const updateData: Record<string, any> = {};
    
    Object.keys(orderData).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = orderData[key];
      }
    });
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    const updatedOrder = await orderService.update(orderId, updateData);
    
    if (!updatedOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: updatedOrder });
  } catch (error) {
    console.error(`Error updating order ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/[id]
 * Cancels an order
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const orderId = Number(id);
    
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }
    
    const canceledOrder = await orderService.cancelOrder(orderId);
    
    if (!canceledOrder) {
      return NextResponse.json(
        { error: 'Order not found or could not be canceled' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      data: canceledOrder,
      message: 'Order canceled successfully'
    });
  } catch (error) {
    console.error(`Error canceling order ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
} 