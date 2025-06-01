import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { getExchangeCredentials } from '@/utils/exchange/exchange-credentials-service';
import { exchangeService } from '@/utils/exchange/exchange-service';

export async function POST(req: Request) {
  try {
    const { exchangeId } = await req.json();
    
    // Validate required fields
    if (!exchangeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing exchangeId' 
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
    
    // Get exchange credentials
    try {
      const credentials = await getExchangeCredentials(exchangeId);
      
      // Ensure the user owns these credentials
      if (credentials.user_id !== session.user.id) {
        return NextResponse.json({ 
          success: false, 
          error: 'Unauthorized access to exchange credentials' 
        }, { status: 403 });
      }
      
      // Initialize exchange if not already connected
      if (!exchangeService.isExchangeConnected(exchangeId)) {
        const exchangeConfig = {
          id: exchangeId,
          user_id: session.user.id,
          name: credentials.name,
          exchange: credentials.exchange,
          active: true,
          testnet: credentials.testnet || false,
          margin_enabled: false
        };
        
        const connected = await exchangeService.initializeExchange(exchangeConfig);
        
        if (!connected) {
          throw new Error('Failed to connect to exchange');
        }
      }
      
      // Fetch wallet balances
      const balances = await exchangeService.getWalletBalances(exchangeId);
      
      // Clear previous balances for this exchange/user combination
      await supabase
        .from('wallet_balances')
        .delete()
        .eq('user_id', session.user.id)
        .eq('exchange', credentials.exchange);
      
      // Store balances in database
      if (balances && balances.length > 0) {
        const balanceEntries = balances
          .filter(b => parseFloat(b.walletBalance) > 0)
          .map(balance => ({
            user_id: session.user.id,
            exchange: credentials.exchange,
            currency: balance.coin,
            free: parseFloat(balance.availableToWithdraw) || 0,
            locked: parseFloat(balance.walletBalance) - parseFloat(balance.availableToWithdraw) || 0,
            updated_at: new Date().toISOString()
          }));
        
        if (balanceEntries.length > 0) {
          const { error: insertError } = await supabase
            .from('wallet_balances')
            .insert(balanceEntries);
          
          if (insertError) {
            console.error('Error inserting wallet balances:', insertError);
            throw new Error(`Failed to store wallet balances: ${insertError.message}`);
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Wallet balances refreshed successfully',
        balanceCount: balances.length
      });
    } catch (error: any) {
      console.error('Error refreshing wallet balances:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to refresh wallet balances',
        details: error.message
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
