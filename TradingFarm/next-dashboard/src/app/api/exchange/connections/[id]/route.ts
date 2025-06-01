/**
 * API endpoints for managing a specific exchange connection
 * 
 * These endpoints allow retrieving, updating, and deleting
 * individual exchange connections
 */

import { NextResponse } from 'next/server';
import { ExchangeFactory } from '@/services/exchange/exchange-factory';
import { checkAuth } from '@/lib/auth/check-auth';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET: Fetch a specific exchange connection
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Check authentication
    const { user, errorResponse } = await checkAuth();
    if (!user) {
      return errorResponse;
    }
    
    const connectionId = parseInt(params.id);
    if (isNaN(connectionId)) {
      return NextResponse.json({ error: 'Invalid connection ID' }, { status: 400 });
    }
    
    // Get the exchange factory instance
    const factory = ExchangeFactory.getInstance();
    
    // Get all connections (we'll filter to find the specific one)
    const connections = await factory.listExchangeConnections();
    const connection = connections.find(conn => conn.id === connectionId);
    
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }
    
    // Return sanitized connection (without sensitive data)
    const sanitizedConnection = {
      id: connection.id,
      name: connection.name,
      exchange: connection.exchange,
      isTestnet: connection.isTestnet,
      isDefault: connection.isDefault,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt
    };
    
    return NextResponse.json({ 
      status: 'ok', 
      connection: sanitizedConnection 
    });
  } catch (error) {
    console.error('Error fetching exchange connection:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

/**
 * PATCH: Update a specific exchange connection
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    // Check authentication
    const { user, errorResponse } = await checkAuth();
    if (!user) {
      return errorResponse;
    }
    
    const connectionId = parseInt(params.id);
    if (isNaN(connectionId)) {
      return NextResponse.json({ error: 'Invalid connection ID' }, { status: 400 });
    }
    
    // Parse request body
    const body = await request.json();
    const { name, isDefault, credentials } = body;
    
    // Get the exchange factory instance
    const factory = ExchangeFactory.getInstance();
    
    // Prepare updates (only include fields that are provided)
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (isDefault !== undefined) updates.isDefault = isDefault;
    if (credentials !== undefined) updates.credentials = credentials;
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    
    // Update the connection
    const success = await factory.updateExchangeConnection(connectionId, updates);
    
    if (!success) {
      return NextResponse.json({ 
        status: 'error', 
        error: 'Failed to update exchange connection' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      status: 'ok', 
      message: 'Exchange connection updated successfully' 
    });
  } catch (error) {
    console.error('Error updating exchange connection:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

/**
 * DELETE: Delete a specific exchange connection
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // Check authentication
    const { user, errorResponse } = await checkAuth();
    if (!user) {
      return errorResponse;
    }
    
    const connectionId = parseInt(params.id);
    if (isNaN(connectionId)) {
      return NextResponse.json({ error: 'Invalid connection ID' }, { status: 400 });
    }
    
    // Get the exchange factory instance
    const factory = ExchangeFactory.getInstance();
    
    // Delete the connection
    const success = await factory.deleteExchangeConnection(connectionId);
    
    if (!success) {
      return NextResponse.json({ 
        status: 'error', 
        error: 'Failed to delete exchange connection' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      status: 'ok', 
      message: 'Exchange connection deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting exchange connection:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}
