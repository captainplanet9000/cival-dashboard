import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { exchangeService } from '@/utils/exchange/exchange-service';
import { marketDataService } from '@/utils/exchange/market-data-service';

/**
 * API endpoint to manually refresh market data for specific symbols
 */
export async function POST(req: Request) {
  try {
    const { symbols } = await req.json();
    
    // Validate symbols parameter
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Valid symbols array is required' 
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
    
    // Get the first available exchange credential for the user
    const { data: credentials, error: credError } = await supabase
      .from('exchange_credentials')
      .select('id, exchange, testnet')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .limit(1);
    
    if (credError || !credentials || credentials.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active exchange credentials found' 
      }, { status: 404 });
    }
    
    const exchangeId = credentials[0].id;
    
    // Check if the exchange is connected, or connect it
    if (!exchangeService.isExchangeConnected(exchangeId)) {
      const exchangeConfig = {
        id: exchangeId,
        user_id: session.user.id,
        name: credentials[0].exchange,
        exchange: credentials[0].exchange,
        active: true,
        testnet: credentials[0].testnet || false,
        margin_enabled: false
      };
      
      const connected = await exchangeService.initializeExchange(exchangeConfig);
      
      if (!connected) {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to connect to exchange' 
        }, { status: 500 });
      }
    }
    
    // Fetch market data for each symbol
    const results = await Promise.all(
      symbols.map(async (symbol: string) => {
        try {
          // First try to use the market data service if it's running
          if (marketDataService.getStatus().isPolling) {
            await marketDataService.subscribeToMarketData(symbol, exchangeId);
            return { symbol, success: true };
          }
          
          // Otherwise fetch data directly
          const marketDataList = await exchangeService.getMarketData(exchangeId, symbol);
          
          if (!marketDataList || marketDataList.length === 0) {
            return { symbol, success: false, error: 'No market data available' };
          }
          
          const marketData = marketDataList[0];
          
          // Store in database
          await supabase
            .from('market_data')
            .upsert({
              symbol: marketData.symbol,
              last_price: marketData.lastPrice,
              bid_price: marketData.bidPrice,
              ask_price: marketData.askPrice,
              high_24h: marketData.high24h,
              low_24h: marketData.low24h,
              volume_24h: marketData.volume24h,
              price_change_percent: marketData.priceChangePercent,
              timestamp: marketData.timestamp || new Date().toISOString()
            }, {
              onConflict: 'symbol'
            });
          
          return { symbol, success: true };
        } catch (error: any) {
          console.error(`Error fetching market data for ${symbol}:`, error);
          return { symbol, success: false, error: error.message };
        }
      })
    );
    
    // Count successes
    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Successfully refreshed ${successCount} out of ${symbols.length} symbols`,
      results
    });
    
  } catch (error: any) {
    console.error('Error in market data refresh endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
