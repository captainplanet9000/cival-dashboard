import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { createExchangeService, ExchangeType, MarketDataParams } from '@/services/exchange-service';
import { z } from 'zod';

// Schema for validating market data requests
const marketDataSchema = z.object({
  exchange: z.enum(['bybit', 'coinbase', 'hyperliquid', 'mock']),
  symbol: z.string(),
  interval: z.string().optional(),
  limit: z.number().optional(),
});

/**
 * GET endpoint to fetch market data from an exchange
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchange = searchParams.get('exchange') as ExchangeType || 'mock';
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = searchParams.get('interval') || '1h';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    
    // Validate parameters
    const validation = marketDataSchema.safeParse({
      exchange,
      symbol,
      interval,
      limit
    });
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: validation.error.format() },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Check for authentication (optional for public market data)
    const { data: { user } } = await supabase.auth.getUser();
    let userId = user?.id;
    
    // Create the exchange service
    const exchangeService = await createExchangeService(exchange, userId);
    
    // Fetch market data
    const params: MarketDataParams = {
      symbol,
      interval,
      limit
    };
    
    const marketData = await exchangeService.getMarketData(params);
    
    // Cache the market data in Redis or similar if available
    
    return NextResponse.json({
      exchange,
      symbol,
      interval,
      data: marketData
    });
  } catch (error) {
    console.error('Error in GET /api/exchanges/market-data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for batch market data requests
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Check for authentication (optional for public market data)
    const { data: { user } } = await supabase.auth.getUser();
    let userId = user?.id;
    
    // Parse and validate the request body
    const body = await request.json();
    const symbols = body.symbols || [];
    const exchange = body.exchange as ExchangeType || 'mock';
    const interval = body.interval || '1h';
    const limit = body.limit || 100;
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or missing symbols array' },
        { status: 400 }
      );
    }
    
    // Create the exchange service
    const exchangeService = await createExchangeService(exchange, userId);
    
    // Fetch market data for all symbols
    const results = await Promise.all(
      symbols.map(async (symbol: string) => {
        try {
          const params: MarketDataParams = {
            symbol,
            interval,
            limit
          };
          
          const marketData = await exchangeService.getMarketData(params);
          
          return {
            symbol,
            data: marketData
          };
        } catch (error) {
          console.error(`Error fetching market data for ${symbol}:`, error);
          return {
            symbol,
            error: 'Failed to fetch market data'
          };
        }
      })
    );
    
    return NextResponse.json({
      exchange,
      interval,
      results
    });
  } catch (error) {
    console.error('Error in POST /api/exchanges/market-data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
