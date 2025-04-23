/**
 * API endpoint for fetching market data
 * 
 * This endpoint provides real-time and historical market data
 * from connected exchanges for use in the Trading Farm dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExchangeFactory } from '@/services/exchange/exchange-factory';
import { createServerClient } from '@/utils/supabase/server';
import { checkAuth } from '@/lib/auth/check-auth';

/**
 * GET: Fetch market data for a symbol
 * 
 * Query parameters:
 * - exchange: Exchange ID (e.g., 'coinbase', 'hyperliquid')
 * - symbol: Trading pair (e.g., 'BTC/USD')
 * - forceRefresh: Whether to force fresh data from the exchange (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await checkAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const exchange = searchParams.get('exchange');
    const symbol = searchParams.get('symbol');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    if (!exchange || !symbol) {
      return NextResponse.json({ 
        error: 'Missing required parameters: exchange and symbol'
      }, { status: 400 });
    }
    
    // Get the exchange factory instance
    const factory = ExchangeFactory.getInstance();
    
    // Try to get an exchange instance
    // Use a read-only instance since we're just fetching market data
    const exchangeInstance = factory.getExchange(exchange);
    
    // Fetch the market data
    const marketData = await exchangeInstance.getTicker(symbol);
    
    // Also fetch orderbook data if available
    let orderbook;
    try {
      orderbook = await exchangeInstance.getOrderBook(symbol, 10);
    } catch (e) {
      // Orderbook might not be available, so continue without it
      console.warn(`Failed to fetch orderbook for ${symbol} on ${exchange}`, e);
    }
    
    // Store the data in the database for historical analysis
    try {
      const supabase = await createServerClient();
      
      await supabase
        .from('market_data')
        .insert({
          exchange_id: exchange,
          symbol,
          timestamp: new Date(marketData.timestamp).toISOString(),
          bid: marketData.bid,
          ask: marketData.ask,
          last: marketData.price,
          high: marketData.high24h,
          low: marketData.low24h,
          base_volume: marketData.volume24h,
          raw_data: JSON.stringify({
            orderbook: orderbook,
            additional: marketData
          })
        });
    } catch (dbError) {
      // Log database error but don't fail the request
      console.error('Failed to store market data in database:', dbError);
    }
    
    return NextResponse.json({ 
      status: 'ok', 
      data: {
        ...marketData,
        orderbook
      }
    });
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

/**
 * POST: Fetch historical market data for a symbol
 * 
 * Request body:
 * - exchange: Exchange ID
 * - symbol: Trading pair
 * - interval: Time interval (e.g., '1h', '1d')
 * - startTime: Start time in milliseconds
 * - endTime: End time in milliseconds
 * - limit: Maximum number of candles to return
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
    const { exchange, symbol, interval, startTime, endTime, limit = 500 } = body;
    
    if (!exchange || !symbol || !interval) {
      return NextResponse.json({ 
        error: 'Missing required parameters: exchange, symbol, and interval'
      }, { status: 400 });
    }
    
    // Get the exchange factory instance
    const factory = ExchangeFactory.getInstance();
    
    // Try to get an exchange instance
    const exchangeInstance = factory.getExchange(exchange);
    
    // Fetch the candlestick data
    const candles = await exchangeInstance.getCandles(
      symbol,
      interval,
      limit,
      startTime,
      endTime
    );
    
    return NextResponse.json({ 
      status: 'ok', 
      data: candles
    });
  } catch (error) {
    console.error('Error fetching historical market data:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}
