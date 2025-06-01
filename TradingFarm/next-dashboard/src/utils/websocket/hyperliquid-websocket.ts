/**
 * HyperLiquid WebSocket Implementation
 * 
 * Provides WebSocket connection functionality specific to HyperLiquid exchange.
 * Includes formatters and parsers for HyperLiquid's specific message formats.
 */

import {
  ConnectionOptions,
  Subscription,
  WebSocketMessage,
  MessageType,
  OrderBookData,
  TradeData,
  TickerData,
  CandleData,
  ParsedMessage
} from './websocket-types';

// Import MessageDirection directly as it's exported as a type
import type { MessageDirection } from './websocket-types';

// Define direction values as constants since MessageDirection is a type
const MESSAGE_DIRECTION = {
  inbound: 'inbound' as MessageDirection,
  outbound: 'outbound' as MessageDirection
};

/**
 * Create connection options for HyperLiquid WebSocket
 */
export function createHyperliquidWebSocketOptions(baseOptions?: Partial<ConnectionOptions>): ConnectionOptions {
  return {
    url: 'wss://api.hyperliquid.xyz/ws',
    exchange: 'hyperliquid',
    name: 'HyperLiquid Market Data',
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectInterval: 5000,
    heartbeatInterval: 30000,
    formatters: {
      parseMessage: parseHyperliquidMessage,
      formatSubscription: formatHyperliquidSubscription,
      formatHeartbeat: formatHyperliquidHeartbeat
    },
    ...baseOptions
  };
}

/**
 * Format subscription message for HyperLiquid
 */
export function formatHyperliquidSubscription(subscription: Subscription): any {
  const { channel, symbols } = subscription;
  
  // HyperLiquid has different subscription message formats based on the channel
  switch (channel) {
    case 'ticker':
      return {
        op: 'subscribe',
        channel: 'tickers',
        args: symbols.length > 0 ? symbols : ['*']
      };
    
    case 'trades':
      return {
        op: 'subscribe',
        channel: 'trades',
        args: symbols.length > 0 ? symbols : ['*']
      };
    
    case 'orderbook':
      // Define the subscription object for level2 orderbook
      return {
        op: 'subscribe',
        channel: 'l2Book',
        args: symbols.length > 0 ? symbols : ['*']
      };
    
    case 'candles':
      // Candle subscription (if supported)
      return {
        op: 'subscribe',
        channel: 'candles',
        args: symbols.map(symbol => `${symbol}:1m`) // Default to 1-minute candles
      };
    
    case 'user':
      // User-specific data like balances, orders, etc.
      return {
        op: 'subscribe',
        channel: 'user',
        args: symbols.length > 0 ? symbols : ['*']
      };
    
    default:
      return {
        op: 'subscribe',
        channel: channel,
        args: symbols.length > 0 ? symbols : ['*']
      };
  }
}

/**
 * Format heartbeat message for HyperLiquid
 */
export function formatHyperliquidHeartbeat(): any {
  return {
    op: 'ping',
    data: Date.now()
  };
}

/**
 * Parse a message from HyperLiquid
 */
export function parseHyperliquidMessage(data: any): WebSocketMessage {
  const timestamp = Date.now();
  let messageType = MessageType.Raw;
  let channel = '';
  let symbols: string[] = [];
  
  // Parse the message based on its structure
  let parsedData: any = typeof data === 'string' ? JSON.parse(data) : data;
  
  // Handle different message types
  if (parsedData.channel) {
    channel = parsedData.channel;
    
    // Update message type based on channel
    switch (parsedData.channel) {
      case 'tickers':
        messageType = MessageType.Ticker;
        break;
      case 'trades':
        messageType = MessageType.Trade;
        break;
      case 'l2Book':
        messageType = MessageType.OrderBook;
        break;
      case 'candles':
        messageType = MessageType.Candle;
        break;
      case 'user':
        // Determine specific user message type
        if (parsedData.data?.orders) {
          messageType = MessageType.OrderUpdate;
        } else if (parsedData.data?.balances) {
          messageType = MessageType.BalanceUpdate;
        } else if (parsedData.data?.positions) {
          messageType = MessageType.PositionUpdate;
        }
        break;
      default:
        messageType = MessageType.Raw;
        break;
    }
    
    // Extract symbols from the message if available
    if (parsedData.data && typeof parsedData.data === 'object') {
      const dataObj = parsedData.data;
      if (dataObj.coin) {
        symbols = [dataObj.coin];
      } else if (Array.isArray(dataObj) && dataObj.length > 0 && dataObj[0].coin) {
        symbols = dataObj.map((item: any) => item.coin);
      }
    }
  } else if (parsedData.op === 'pong') {
    messageType = MessageType.Heartbeat;
  } else if (parsedData.error) {
    messageType = MessageType.Error;
  }
  
  // Format the response
  return {
    exchange: 'hyperliquid',
    timestamp,
    type: messageType,
    direction: MESSAGE_DIRECTION.inbound,
    channel,
    symbols,
    data: parsedData,
    raw: data
  };
}

/**
 * Convert raw HyperLiquid WebSocket message to standardized format
 */
export function parseHyperliquidRawMessage(data: any): ParsedMessage | null {
  try {
    // Normalize the data format
    const messageData = typeof data === 'string' ? JSON.parse(data) : data;
    
    if (!messageData || !messageData.channel) {
      return null;
    }
    
    const channel = messageData.channel;
    const timestamp = Date.now();
    
    // Handle different channel types
    switch (channel) {
      case 'tickers': {
        // Ticker update
        if (!messageData.data || typeof messageData.data !== 'object') {
          return null;
        }
        
        const ticker = messageData.data;
        const symbol = ticker.coin || 'unknown';
        
        return {
          type: MessageType.Ticker,
          exchange: 'hyperliquid',
          symbol: symbol.toLowerCase(),
          timestamp,
          data: {
            price: parseFloat(ticker.markPrice || ticker.lastPrice || '0'),
            priceChange: parseFloat(ticker.change24h || '0'),
            priceChangePercent: parseFloat(ticker.changePercent24h || '0'),
            volume: parseFloat(ticker.volume24h || '0'),
            quoteVolume: parseFloat(ticker.quoteVolume24h || '0'),
            high: parseFloat(ticker.high24h || '0'),
            low: parseFloat(ticker.low24h || '0'),
            timestamp: ticker.timestamp || timestamp
          } as TickerData,
          raw: messageData
        };
      }
      
      case 'trades': {
        // Trade update
        if (!messageData.data || !Array.isArray(messageData.data) || messageData.data.length === 0) {
          return null;
        }
        
        const trade = messageData.data[0]; // Get the most recent trade
        const symbol = trade.coin || 'unknown';
        
        return {
          type: MessageType.Trade,
          exchange: 'hyperliquid',
          symbol: symbol.toLowerCase(),
          timestamp,
          data: {
            id: trade.tid || trade.tradeId || timestamp.toString(),
            price: parseFloat(trade.px || trade.price || '0'),
            amount: parseFloat(trade.sz || trade.size || '0'),
            side: trade.side === 'B' ? 'buy' : 'sell',
            time: trade.time || timestamp,
            maker: trade.maker || false,
            taker: !trade.maker || true
          } as TradeData,
          raw: messageData
        };
      }
      
      case 'l2Book': {
        // Order book update
        if (!messageData.data || typeof messageData.data !== 'object') {
          return null;
        }
        
        const book = messageData.data;
        const symbol = book.coin || 'unknown';
        
        // Process bids and asks
        const bids = Array.isArray(book.bids) 
          ? book.bids.map((bid: any[]) => [parseFloat(bid[0]), parseFloat(bid[1])])
          : [];
          
        const asks = Array.isArray(book.asks) 
          ? book.asks.map((ask: any[]) => [parseFloat(ask[0]), parseFloat(ask[1])])
          : [];
          
        return {
          type: MessageType.OrderBook,
          exchange: 'hyperliquid',
          symbol: symbol.toLowerCase(),
          timestamp,
          data: {
            bids,
            asks,
            lastUpdateId: book.updateId || timestamp
          } as OrderBookData,
          raw: messageData
        };
      }
      
      case 'candles': {
        // Candle update
        if (!messageData.data || !Array.isArray(messageData.data) || messageData.data.length === 0) {
          return null;
        }
        
        const candle = messageData.data[0]; // Get the most recent candle
        const symbolParts = candle.symbol.split(':');
        const symbol = symbolParts[0] || 'unknown';
        const interval = symbolParts.length > 1 ? symbolParts[1] : '1m';
        
        return {
          type: MessageType.Candle,
          exchange: 'hyperliquid',
          symbol: symbol.toLowerCase(),
          timestamp,
          data: {
            time: candle.time || timestamp,
            open: parseFloat(candle.open || '0'),
            high: parseFloat(candle.high || '0'),
            low: parseFloat(candle.low || '0'),
            close: parseFloat(candle.close || '0'),
            volume: parseFloat(candle.volume || '0'),
            interval,
            isClosed: candle.complete || false,
            quoteVolume: parseFloat(candle.quoteVolume || '0')
          } as CandleData,
          raw: messageData
        };
      }
      
      case 'user': {
        // User-specific data (orders, balances, positions)
        if (!messageData.data || typeof messageData.data !== 'object') {
          return null;
        }
        
        const userData = messageData.data;
        
        // Determine which type of user data it is
        if (userData.orders) {
          return {
            type: MessageType.OrderUpdate,
            exchange: 'hyperliquid',
            symbol: userData.coin || 'unknown',
            timestamp,
            data: userData.orders,
            raw: messageData
          };
        } else if (userData.balances) {
          return {
            type: MessageType.BalanceUpdate,
            exchange: 'hyperliquid',
            symbol: 'USD', // Default for balance updates
            timestamp,
            data: userData.balances,
            raw: messageData
          };
        } else if (userData.positions) {
          return {
            type: MessageType.PositionUpdate,
            exchange: 'hyperliquid',
            symbol: userData.coin || 'unknown',
            timestamp,
            data: userData.positions,
            raw: messageData
          };
        }
      }
    }
    
    // Default fallback for unrecognized messages
    return {
      type: MessageType.Raw,
      exchange: 'hyperliquid',
      symbol: 'unknown',
      timestamp,
      data: messageData,
      raw: messageData
    };
  } catch (error) {
    console.error('[HyperLiquidParser] Error parsing message:', error);
    return null;
  }
}
