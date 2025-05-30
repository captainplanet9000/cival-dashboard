/**
 * WebSocket Connections API Routes
 * 
 * Handles API operations for WebSocket connections management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { WebSocketManager } from '@/lib/websocket/websocket-manager';
import { WebSocketConfig } from '@/lib/websocket/types';

const manager = new WebSocketManager();

/**
 * GET handler to retrieve all WebSocket connections
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(req.url);
    
    // Get filter parameters
    const exchange = searchParams.get('exchange');
    const status = searchParams.get('status');
    const userId = searchParams.get('user_id');
    
    // Build the query
    let query = supabase.from('websocket_connections').select('*');
    
    // Apply filters if provided
    if (exchange) {
      query = query.eq('exchange', exchange);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ connections: data });
  } catch (error) {
    console.error('Error retrieving WebSocket connections:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve WebSocket connections' },
      { status: 500 }
    );
  }
}

/**
 * POST handler to create a new WebSocket connection
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { exchange, config } = body;
    
    if (!exchange || !config || !config.connectionId || !config.url) {
      return NextResponse.json(
        { error: 'Missing required fields: exchange, config.connectionId, config.url' },
        { status: 400 }
      );
    }
    
    // Connect to the exchange
    const success = await manager.connectToExchange(exchange, config as WebSocketConfig);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to connect to exchange' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Connected to ${exchange}`,
      connectionId: config.connectionId
    });
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    return NextResponse.json(
      { error: 'Failed to create WebSocket connection' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler to disconnect a WebSocket connection
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const exchange = searchParams.get('exchange');
    const connectionId = searchParams.get('connectionId');
    
    if (!exchange || !connectionId) {
      return NextResponse.json(
        { error: 'Missing required parameters: exchange, connectionId' },
        { status: 400 }
      );
    }
    
    // Disconnect from the exchange
    const success = await manager.disconnectFromExchange(exchange, connectionId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to disconnect from exchange' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Disconnected from ${exchange}`,
      connectionId
    });
  } catch (error) {
    console.error('Error disconnecting WebSocket connection:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect WebSocket connection' },
      { status: 500 }
    );
  }
}
