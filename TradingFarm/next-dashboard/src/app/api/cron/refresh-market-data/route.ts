import { NextResponse } from 'next/server';
import { marketDataService } from '@/utils/exchange/market-data-service';
import { createServerClient } from '@/utils/supabase/server';

/**
 * API route that can be called by a cron job to refresh market data.
 * This can be triggered by a scheduling service like Vercel Cron Jobs.
 * 
 * Example cron schedule: every 1 minute
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    
    // Verify cron job secret if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== cronSecret)) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }
    
    // Get active symbols to track
    const supabase = await createServerClient();
    const { data: activeSymbols, error } = await supabase
      .from('active_trading_pairs' as any)
      .select('symbol, exchange_credential_id');
      
    // Create type-safe version of the result
    type ActivePair = { symbol: string; exchange_credential_id: number };
    
    if (error) {
      throw new Error(`Failed to fetch active trading pairs: ${error.message}`);
    }
    
    // Start the market data service if not running
    const status = marketDataService.getStatus();
    
    if (!status.isPolling) {
      await marketDataService.start();
    }
    
    // Subscribe to market data for active symbols
    const subscriptionPromises = (activeSymbols as ActivePair[] | null)?.map(async (pair) => {
      return await marketDataService.subscribeToMarketData(pair.symbol, pair.exchange_credential_id);
    }) || [];
    
    const results = await Promise.all(subscriptionPromises);
    const successCount = results.filter(Boolean).length;
    
    return NextResponse.json({
      success: true,
      message: `Subscribed to ${successCount} out of ${activeSymbols?.length || 0} symbols`,
      status: marketDataService.getStatus()
    });
    
  } catch (error: any) {
    console.error('Error in market data refresh cron job:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500 }
    );
  }
}
