import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { MarketDataService, TimeInterval } from '@/services/market-data-service';
import { z } from 'zod';

// Schema for validating market data requests
const marketDataSchema = z.object({
  symbol: z.string(),
  interval: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']).optional(),
  limit: z.number().min(1).max(1000).optional(),
  source: z.enum(['coinapi', 'marketstack', 'exchange', 'cache']).optional(),
  exchange: z.string().optional(),
});

// Schema for validating order book requests
const orderBookSchema = z.object({
  symbol: z.string(),
  exchange: z.string().optional(),
});

/**
 * GET endpoint to fetch market data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type') || 'ohlcv';
    
    // Validate parameters based on the data type
    switch (dataType) {
      case 'ohlcv':
        return await handleOHLCVRequest(searchParams);
      case 'orderbook':
        return await handleOrderBookRequest(searchParams);
      case 'summary':
        return await handleMarketSummaryRequest(searchParams);
      case 'search':
        return await handleSymbolSearchRequest(searchParams);
      default:
        return NextResponse.json(
          { error: 'Invalid data type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in GET /api/market-data:', error);
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
    const body = await request.json();
    const { dataType, symbols, options } = body;
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or missing symbols array' },
        { status: 400 }
      );
    }
    
    switch (dataType) {
      case 'ohlcv':
        if (symbols.length > 10) {
          return NextResponse.json(
            { error: 'Too many symbols for batch OHLCV request (max 10)' },
            { status: 400 }
          );
        }
        
        const ohlcvResults = await Promise.all(
          symbols.map(async (symbol: string) => {
            try {
              const data = await MarketDataService.getOHLCV({
                symbol,
                interval: options?.interval,
                limit: options?.limit,
                source: options?.source,
                exchange: options?.exchange,
              });
              
              return {
                symbol,
                data
              };
            } catch (error) {
              console.error(`Error fetching OHLCV data for ${symbol}:`, error);
              return {
                symbol,
                error: 'Failed to fetch OHLCV data'
              };
            }
          })
        );
        
        return NextResponse.json({ results: ohlcvResults });
      
      case 'summary':
        const summaries = await MarketDataService.getMarketSummaries(
          symbols,
          options?.source || 'coinapi'
        );
        
        return NextResponse.json({ summaries });
      
      default:
        return NextResponse.json(
          { error: 'Invalid data type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in POST /api/market-data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}

/**
 * Handle OHLCV data requests
 */
async function handleOHLCVRequest(searchParams: URLSearchParams) {
  const symbol = searchParams.get('symbol');
  const interval = searchParams.get('interval') as TimeInterval || '1h';
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
  const source = searchParams.get('source') || 'coinapi';
  const exchange = searchParams.get('exchange');
  
  const validation = marketDataSchema.safeParse({
    symbol,
    interval,
    limit,
    source,
    exchange
  });
  
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid parameters', details: validation.error.format() },
      { status: 400 }
    );
  }
  
  const data = await MarketDataService.getOHLCV({
    symbol: symbol!,
    interval,
    limit,
    source: source as any,
    exchange
  });
  
  return NextResponse.json({
    symbol,
    interval,
    source,
    data
  });
}

/**
 * Handle order book data requests
 */
async function handleOrderBookRequest(searchParams: URLSearchParams) {
  const symbol = searchParams.get('symbol');
  const exchange = searchParams.get('exchange');
  
  const validation = orderBookSchema.safeParse({
    symbol,
    exchange
  });
  
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid parameters', details: validation.error.format() },
      { status: 400 }
    );
  }
  
  const orderBook = await MarketDataService.getOrderBook(symbol!, exchange || undefined);
  
  if (!orderBook) {
    return NextResponse.json(
      { error: 'Failed to fetch order book data' },
      { status: 500 }
    );
  }
  
  return NextResponse.json(orderBook);
}

/**
 * Handle market summary requests
 */
async function handleMarketSummaryRequest(searchParams: URLSearchParams) {
  const symbolsParam = searchParams.get('symbols');
  
  if (!symbolsParam) {
    return NextResponse.json(
      { error: 'Symbols parameter is required' },
      { status: 400 }
    );
  }
  
  const symbols = symbolsParam.split(',');
  const source = searchParams.get('source') || 'coinapi';
  
  const summaries = await MarketDataService.getMarketSummaries(
    symbols,
    source as any
  );
  
  return NextResponse.json({
    symbols,
    source,
    summaries
  });
}

/**
 * Handle symbol search requests
 */
async function handleSymbolSearchRequest(searchParams: URLSearchParams) {
  const query = searchParams.get('query');
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
  
  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }
  
  const symbols = await MarketDataService.searchSymbols(query, limit);
  
  return NextResponse.json({
    query,
    symbols
  });
}
