/**
 * Exchange WebSocket Endpoint API
 * 
 * Generates WebSocket connection details for different exchanges
 * Part of Phase 1 Live Trading implementation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { createLogger } from '@/lib/logging';
import { ExchangeError, ExchangeErrorType } from '@/lib/exchange/error-handling';

const logger = createLogger('api:websocket-endpoint');

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { exchangeId, connectionId, channel, testnet = false } = body;
    
    // Validate request
    if (!exchangeId) {
      return NextResponse.json(
        { error: 'Missing exchangeId parameter' },
        { status: 400 }
      );
    }
    
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Missing connectionId parameter' },
        { status: 400 }
      );
    }
    
    if (!channel) {
      return NextResponse.json(
        { error: 'Missing channel parameter' },
        { status: 400 }
      );
    }
    
    // Get supabase client
    const supabase = createServerClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('exchange_configs')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();
    
    if (connectionError) {
      logger.error('Error fetching connection', { connectionError });
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    // Get encrypted credentials
    const { data: credentials, error: credentialsError } = await supabase
      .from('exchange_credentials')
      .select('api_key, api_secret, api_passphrase, encrypted_data')
      .eq('connection_id', connectionId)
      .eq('user_id', user.id)
      .single();
    
    if (credentialsError) {
      logger.error('Error fetching credentials', { credentialsError });
      return NextResponse.json(
        { error: 'Credentials not found' },
        { status: 404 }
      );
    }
    
    // Generate WebSocket details based on exchange
    const wsDetails = generateWebSocketDetails(
      exchangeId,
      channel,
      testnet,
      credentials
    );
    
    // Log the request
    logger.info('WebSocket endpoint requested', {
      exchangeId,
      channel,
      testnet,
      userId: user.id
    });
    
    return NextResponse.json(wsDetails);
  } catch (error) {
    if (error instanceof ExchangeError) {
      logger.error('Exchange error', { error });
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }
    
    logger.error('Unexpected error', { error });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate WebSocket connection details for different exchanges
 */
function generateWebSocketDetails(
  exchangeId: string,
  channel: string,
  testnet: boolean,
  credentials: any
): { url: string; subscriptionMessage?: any } {
  switch (exchangeId.toLowerCase()) {
    case 'coinbase': {
      // Coinbase WebSocket
      const baseUrl = 'wss://ws-feed.exchange.coinbase.com';
      
      // Create subscription message
      const subscriptionMessage = {
        type: 'subscribe',
        product_ids: ['BTC-USD', 'ETH-USD'],
        channels: [channel]
      };
      
      // Add authentication if we have credentials
      if (credentials.api_key && credentials.api_secret) {
        // In a production environment, we would implement proper authentication
        // For now, just note that authentication would be applied here
        // Using the CoinbasePro authentication method
      }
      
      return {
        url: baseUrl,
        subscriptionMessage
      };
    }
    
    case 'hyperliquid': {
      // Hyperliquid WebSocket
      const baseUrl = testnet
        ? 'wss://api.hyperliquid-testnet.xyz/ws'
        : 'wss://api.hyperliquid.xyz/ws';
      
      let subscriptionMessage: any;
      
      switch (channel) {
        case 'marketData':
          subscriptionMessage = {
            method: 'subscribe',
            subscription: { type: 'marketData', coin: 'BTC' }
          };
          break;
        case 'trades':
          subscriptionMessage = {
            method: 'subscribe',
            subscription: { type: 'trades', coin: 'BTC' }
          };
          break;
        case 'orderbook':
          subscriptionMessage = {
            method: 'subscribe',
            subscription: { type: 'l2Book', coin: 'BTC' }
          };
          break;
        case 'userEvents':
          // User events require authentication
          if (!credentials.api_key || !credentials.api_secret) {
            throw new ExchangeError(
              'Authentication required for user events channel',
              ExchangeErrorType.AUTHENTICATION_FAILED,
              'hyperliquid'
            );
          }
          
          subscriptionMessage = {
            method: 'subscribe',
            subscription: { type: 'userEvents', user: 'your_user_id' }
          };
          break;
        default:
          throw new ExchangeError(
            `Unsupported channel: ${channel}`,
            ExchangeErrorType.INVALID_ORDER,
            'hyperliquid'
          );
      }
      
      return {
        url: baseUrl,
        subscriptionMessage
      };
    }
    
    case 'bybit': {
      // Bybit WebSocket
      const baseUrl = testnet
        ? 'wss://stream-testnet.bybit.com/v5/public/spot'
        : 'wss://stream.bybit.com/v5/public/spot';
      
      // Subscription format depends on channel
      const topics = [];
      
      switch (channel) {
        case 'orderbook.50':
          topics.push('orderbook.50.BTCUSDT');
          break;
        case 'trade':
          topics.push('publicTrade.BTCUSDT');
          break;
        case 'ticker':
          topics.push('tickers.BTCUSDT');
          break;
        case 'kline.1m':
          topics.push('kline.1m.BTCUSDT');
          break;
        default:
          throw new ExchangeError(
            `Unsupported channel: ${channel}`,
            ExchangeErrorType.INVALID_ORDER,
            'bybit'
          );
      }
      
      const subscriptionMessage = {
        op: 'subscribe',
        args: topics
      };
      
      return {
        url: baseUrl,
        subscriptionMessage
      };
    }
    
    case 'binance': {
      // Binance WebSocket
      const baseUrl = testnet
        ? 'wss://testnet.binance.vision/ws'
        : 'wss://stream.binance.com:9443/ws';
      
      let stream: string;
      
      switch (channel) {
        case 'ticker':
          stream = 'btcusdt@ticker';
          break;
        case 'depth':
          stream = 'btcusdt@depth20@100ms';
          break;
        case 'trade':
          stream = 'btcusdt@trade';
          break;
        case 'kline':
          stream = 'btcusdt@kline_1m';
          break;
        default:
          throw new ExchangeError(
            `Unsupported channel: ${channel}`,
            ExchangeErrorType.INVALID_ORDER,
            'binance'
          );
      }
      
      const subscriptionMessage = {
        method: 'SUBSCRIBE',
        params: [stream],
        id: 1
      };
      
      return {
        url: baseUrl,
        subscriptionMessage
      };
    }
    
    default:
      throw new ExchangeError(
        `Unsupported exchange: ${exchangeId}`,
        ExchangeErrorType.INVALID_ORDER,
        exchangeId
      );
  }
}
