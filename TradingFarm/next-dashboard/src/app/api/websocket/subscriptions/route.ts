/**
 * WebSocket Subscriptions API Routes
 * 
 * Handles API operations for WebSocket channel subscriptions management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { WebSocketManager } from '@/lib/websocket/websocket-manager';
import { SubscriptionParams } from '@/lib/websocket/types';

const manager = new WebSocketManager();

/**
 * GET handler to retrieve all WebSocket subscriptions
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(req.url);
    
    // Get filter parameters
    const connectionId = searchParams.get('connection_id');
    const channel = searchParams.get('channel');
    
    // Build the query
    let query = supabase.from('websocket_subscriptions').select('*');
    
    // Apply filters if provided
    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }
    
    if (channel) {
      query = query.eq('channel', channel);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ subscriptions: data });
  } catch (error) {
    console.error('Error retrieving WebSocket subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve WebSocket subscriptions' },
      { status: 500 }
    );
  }
}

/**
 * POST handler to create a new WebSocket subscription
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { exchange, connectionId, params } = body;
    
    if (!exchange || !connectionId || !params) {
      return NextResponse.json(
        { error: 'Missing required fields: exchange, connectionId, params' },
        { status: 400 }
      );
    }
    
    // Validate subscription parameters
    if (!params.channel || !params.symbols || !Array.isArray(params.symbols) || params.symbols.length === 0) {
      return NextResponse.json(
        { error: 'Invalid subscription parameters: channel and symbols array are required' },
        { status: 400 }
      );
    }
    
    // Subscribe to the channel
    const success = await manager.subscribe(
      exchange,
      connectionId,
      params as SubscriptionParams
    );
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to subscribe to channel' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Subscribed to ${params.channel} for ${params.symbols.join(', ')}`,
      exchange,
      connectionId,
      channel: params.channel,
      symbols: params.symbols
    });
  } catch (error) {
    console.error('Error creating WebSocket subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create WebSocket subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler to remove a WebSocket subscription
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const exchange = searchParams.get('exchange');
    const connectionId = searchParams.get('connectionId');
    const channel = searchParams.get('channel');
    
    if (!exchange || !connectionId || !channel) {
      return NextResponse.json(
        { error: 'Missing required parameters: exchange, connectionId, channel' },
        { status: 400 }
      );
    }
    
    // Get optional symbols parameter (comma-separated list)
    const symbolsParam = searchParams.get('symbols');
    const symbols = symbolsParam ? symbolsParam.split(',') : undefined;
    
    // Unsubscribe from the channel
    const success = await manager.unsubscribe(exchange, connectionId, channel, symbols);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to unsubscribe from channel' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: symbols 
        ? `Unsubscribed from ${channel} for ${symbols.join(', ')}` 
        : `Unsubscribed from ${channel}`,
      exchange,
      connectionId,
      channel,
      symbols
    });
  } catch (error) {
    console.error('Error removing WebSocket subscription:', error);
    return NextResponse.json(
      { error: 'Failed to remove WebSocket subscription' },
      { status: 500 }
    );
  }
}
