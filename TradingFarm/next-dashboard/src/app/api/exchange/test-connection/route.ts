/**
 * API endpoint to test exchange connectivity
 * 
 * This endpoint is used by the Exchange Credential Manager component
 * to test API connections before saving credentials or to validate
 * existing stored credentials.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { createExchangeConnector } from '@/lib/exchange/connector-factory';
import { exchangeCredentialsService, ExchangeCredential } from '@/utils/supabase/exchange-credentials';

export async function POST(request: Request) {
  try {
    // Create a Supabase client
    const supabase = await createServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { exchange, credentialId } = body;
    
    if (!exchange) {
      return NextResponse.json({ 
        success: false, 
        message: 'Exchange name is required' 
      }, { status: 400 });
    }
    
    // If a specific credentialId is provided, get it from the database
    if (credentialId) {
      const { data: credential, error } = await exchangeCredentialsService.getById(
        supabase,
        session.user.id,
        credentialId
      );
      
      if (error || !credential) {
        return NextResponse.json({ 
          success: false, 
          message: 'Credential not found' 
        }, { status: 404 });
      }
      
      // Create an exchange connector instance
      const connector = createExchangeConnector(exchange, {
        useTestnet: credential.is_testnet
      });
      
      // Test the connection
      try {
        const connected = await connector.connect({
          apiKey: credential.api_key,
          secretKey: credential.api_secret,
          passphrase: credential.api_passphrase || undefined
        });
        
        if (connected) {
          return NextResponse.json({ 
            success: true, 
            message: `Successfully connected to ${exchange.toUpperCase()}` 
          });
        } else {
          return NextResponse.json({ 
            success: false, 
            message: `Failed to connect to ${exchange.toUpperCase()}. Please check your credentials.` 
          });
        }
      } catch (connError) {
        console.error(`Connection error for ${exchange}:`, connError);
        return NextResponse.json({ 
          success: false, 
          message: connError instanceof Error ? 
            `Connection error: ${connError.message}` : 
            `Failed to connect to ${exchange.toUpperCase()}` 
        });
      }
    } else {
      // No credentialId provided, testing with provided credentials in request body
      const { apiKey, secretKey, passphrase, useTestnet = false } = body;
      
      if (!apiKey || !secretKey) {
        return NextResponse.json({ 
          success: false, 
          message: 'API key and secret are required' 
        }, { status: 400 });
      }
      
      // Create an exchange connector instance
      const connector = createExchangeConnector(exchange, { useTestnet });
      
      // Test the connection
      try {
        const connected = await connector.connect({
          apiKey,
          secretKey,
          passphrase
        });
        
        if (connected) {
          return NextResponse.json({ 
            success: true, 
            message: `Successfully connected to ${exchange.toUpperCase()}` 
          });
        } else {
          return NextResponse.json({ 
            success: false, 
            message: `Failed to connect to ${exchange.toUpperCase()}. Please check your credentials.` 
          });
        }
      } catch (connError) {
        console.error(`Connection error for ${exchange}:`, connError);
        return NextResponse.json({ 
          success: false, 
          message: connError instanceof Error ? 
            `Connection error: ${connError.message}` : 
            `Failed to connect to ${exchange.toUpperCase()}` 
        });
      }
    }
  } catch (error) {
    console.error('Error testing exchange connection:', error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}
