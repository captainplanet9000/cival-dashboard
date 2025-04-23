import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { storeExchangeCredentials } from '@/utils/exchange/exchange-credentials-service';
import { exchangeService } from '@/utils/exchange/exchange-service';

export async function POST(req: Request) {
  try {
    const { exchange, apiKey, apiSecret, passphrase, name, testnet = false } = await req.json();
    
    // Validate required fields
    if (!exchange || !apiKey || !apiSecret) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // Create Supabase client
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Test the connection before storing credentials
    try {
      // Temporarily store credentials for testing
      const tempCredentials = {
        user_id: session.user.id,
        exchange,
        name: name || exchange,
        api_key: apiKey,
        api_secret: apiSecret,
        passphrase,
        testnet,
        id: 'temp',
        uses_vault: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Initialize exchange to test connection
      const exchangeConfig = {
        id: 'temp',
        user_id: session.user.id,
        name: name || exchange,
        exchange,
        active: true,
        testnet,
        margin_enabled: false
      };
      
      // Try to connect to exchange
      // This is a workaround since we don't have a dedicated test method
      const connected = await exchangeService.initializeExchange(exchangeConfig);
      
      if (!connected) {
        throw new Error('Failed to connect to exchange');
      }
      
      // Try to fetch wallet balances as a connection test
      await exchangeService.getWalletBalances('temp');
      
      // Disconnect the temporary connection
      await exchangeService.disconnectExchange('temp');
    } catch (error: any) {
      console.error('Exchange connection error:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to connect to exchange',
        details: error.message || 'Invalid credentials or API permissions'
      }, { status: 400 });
    }
    
    // Store the credentials in the database
    try {
      const credentialId = await storeExchangeCredentials({
        user_id: session.user.id,
        exchange,
        name: name || exchange,
        api_key: apiKey,
        api_secret: apiSecret,
        passphrase,
        testnet,
        id: '',
        uses_vault: false,
        created_at: '',
        updated_at: ''
      });
      
      // Fetch initial wallet balances and store them
      await fetch('/api/wallet/refresh', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          exchangeId: credentialId 
        })
      });
      
      return NextResponse.json({
        success: true,
        message: 'Exchange credentials validated and stored successfully',
        id: credentialId
      });
    } catch (storageError: any) {
      console.error('Credential storage error:', storageError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to store credentials',
        details: storageError.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
