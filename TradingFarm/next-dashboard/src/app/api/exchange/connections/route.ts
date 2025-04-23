/**
 * API endpoints for managing exchange connections
 * 
 * These endpoints allow listing, creating, updating, and deleting
 * exchange connections for live trading
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExchangeFactory } from '@/services/exchange/exchange-factory';
import { checkAuth } from '@/lib/auth/check-auth';

/**
 * GET: List all exchange connections for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await checkAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the exchange factory instance
    const factory = ExchangeFactory.getInstance();
    
    // Get all connections
    const connections = await factory.listExchangeConnections();
    
    // Return sanitized connections (without sensitive data)
    const sanitizedConnections = connections.map(conn => ({
      id: conn.id,
      name: conn.name,
      exchange: conn.exchange,
      isTestnet: conn.isTestnet,
      isDefault: conn.isDefault,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt
    }));
    
    return NextResponse.json({ 
      status: 'ok', 
      connections: sanitizedConnections 
    });
  } catch (error) {
    console.error('Error listing exchange connections:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

/**
 * POST: Create a new exchange connection
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await checkAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { name, exchange, isTestnet, credentials, isDefault = false } = body;
    
    if (!name || !exchange || typeof isTestnet !== 'boolean' || !credentials) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }
    
    // Get the exchange factory instance
    const factory = ExchangeFactory.getInstance();
    
    // Store the connection
    const connectionId = await factory.storeExchangeConnection(
      name,
      exchange,
      isTestnet,
      credentials,
      isDefault
    );
    
    if (!connectionId) {
      return NextResponse.json({ 
        status: 'error', 
        error: 'Failed to store exchange connection' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      status: 'ok', 
      connectionId,
      message: 'Exchange connection created successfully' 
    });
  } catch (error) {
    console.error('Error creating exchange connection:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}
