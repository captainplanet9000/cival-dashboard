/**
 * API endpoint to test exchange connectivity
 * 
 * This endpoint is used by the Exchange Credential Manager component
 * to test API connections before saving credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExchangeFactory } from '@/services/exchange/exchange-factory';
import { checkAuth } from '@/lib/auth/check-auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await checkAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { exchangeId, isTestnet, credentials } = body;
    
    if (!exchangeId || typeof isTestnet !== 'boolean' || !credentials) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }
    
    // Get the exchange factory instance
    const factory = ExchangeFactory.getInstance();
    
    // Test the connection
    const success = await factory.testConnection(exchangeId, isTestnet, credentials);
    
    if (success) {
      return NextResponse.json({ status: 'ok', message: 'Connection successful' });
    } else {
      return NextResponse.json({ 
        status: 'error', 
        error: 'Failed to connect to exchange. Please check your credentials and try again.' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error testing exchange connection:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}
