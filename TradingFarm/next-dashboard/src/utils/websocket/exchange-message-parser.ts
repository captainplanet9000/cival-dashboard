/**
 * Exchange Message Parser
 * 
 * Standardizes messages from different exchanges into a common format.
 * Acts as a translation layer between exchange-specific message formats
 * and the application's standardized format.
 */

import { 
  ExchangeId, 
  ParsedMessage,
  WebSocketMessage,
  OrderBookData,
  TradeData,
  TickerData,
  CandleData,
  MessageType
} from './websocket-types';
import { parseHyperliquidRawMessage } from './hyperliquid-websocket';

export class ExchangeMessageParser {
  /**
   * Parse a raw message from any supported exchange
   */
  parseMessage(exchange: ExchangeId, message: WebSocketMessage): ParsedMessage | null {
    try {
      // Most exchanges send messages as strings that need to be parsed
      const data = typeof message.data === 'string' 
        ? JSON.parse(message.data) 
        : message.data;
      
      // Call the appropriate parser based on exchange
      switch (exchange) {
        case 'binance':
          return this.parseBinanceMessage(data);
        case 'coinbase':
          return this.parseCoinbaseMessage(data);
        case 'kraken':
          return this.parseKrakenMessage(data);
        case 'kucoin':
          return this.parseKucoinMessage(data);
        case 'bybit':
          return this.parseBybitMessage(data);
        case 'hyperliquid':
          return parseHyperliquidRawMessage(data);
        default:
          console.warn(`Unsupported exchange: ${exchange}`);
          return null;
      }
    } catch (error) {
      console.error(`[ExchangeParser] Error parsing message:`, error);
      return null;
    }
  }

  /**
   * Parse a message from Binance
   */
  private parseBinanceMessage(data: any): ParsedMessage | null {
    // Binance has different message structures based on the stream type
    if (data.e === 'trade') {
      // Single trade
      return {
        type: MessageType.Trade,
        exchange: 'binance',
        symbol: data.s.toLowerCase(),
        timestamp: data.T,
        data: {
          id: data.t.toString(),
          price: parseFloat(data.p),
          amount: parseFloat(data.q),
          side: data.m ? 'sell' : 'buy', // m is true for sell, false for buy (market maker)
          time: data.T
        } as TradeData,
        raw: data
      };
    } else if (data.e === 'depthUpdate') {
      // Order book update
      return {
        type: MessageType.OrderBook,
        exchange: 'binance',
        symbol: data.s.toLowerCase(),
        timestamp: data.E,
        data: {
          bids: data.b.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
          asks: data.a.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
          lastUpdateId: data.u
        } as OrderBookData,
        raw: data
      };
    } else if (data.e === 'kline') {
      // Kline/Candle
      const kline = data.k;
      return {
        type: MessageType.Candle,
        exchange: 'binance',
        symbol: data.s.toLowerCase(),
        timestamp: data.E,
        data: {
          time: kline.t,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
          volume: parseFloat(kline.v),
          interval: kline.i,
          isClosed: kline.x
        } as CandleData,
        raw: data
      };
    } else if (data.e === '24hrTicker') {
      // 24hr ticker
      return {
        type: MessageType.Ticker,
        exchange: 'binance',
        symbol: data.s.toLowerCase(),
        timestamp: data.E,
        data: {
          price: parseFloat(data.c),
          priceChange: parseFloat(data.p),
          priceChangePercent: parseFloat(data.P),
          volume: parseFloat(data.v),
          quoteVolume: parseFloat(data.q),
          high: parseFloat(data.h),
          low: parseFloat(data.l)
        } as TickerData,
        raw: data
      };
    }
    
    // Return the message as is if we don't have a specific parser
    return {
      type: MessageType.Raw,
      exchange: 'binance',
      symbol: data.s?.toLowerCase() || 'unknown',
      timestamp: data.E || data.T || Date.now(),
      data: data,
      raw: data
    };
  }

  /**
   * Parse a message from Coinbase
   */
  private parseCoinbaseMessage(data: any): ParsedMessage | null {
    if (data.type === 'match' || data.type === 'last_match') {
      // Trade match
      const symbol = data.product_id.toLowerCase();
      return {
        type: MessageType.Trade,
        exchange: 'coinbase',
        symbol,
        timestamp: new Date(data.time).getTime(),
        data: {
          id: data.trade_id.toString(),
          price: parseFloat(data.price),
          amount: parseFloat(data.size),
          side: data.side,
          time: new Date(data.time).getTime()
        } as TradeData,
        raw: data
      };
    } else if (data.type === 'l2update') {
      // Order book update
      const symbol = data.product_id.toLowerCase();
      
      return {
        type: MessageType.OrderBook,
        exchange: 'coinbase',
        symbol,
        timestamp: new Date(data.time).getTime(),
        data: {
          bids: data.changes
            .filter((change: string[]) => change[0] === 'buy')
            .map((change: string[]) => [parseFloat(change[1]), parseFloat(change[2])]),
          asks: data.changes
            .filter((change: string[]) => change[0] === 'sell')
            .map((change: string[]) => [parseFloat(change[1]), parseFloat(change[2])]),
          lastUpdateId: new Date(data.time).getTime()
        } as OrderBookData,
        raw: data
      };
    } else if (data.type === 'ticker') {
      // Ticker update
      const symbol = data.product_id.toLowerCase();
      
      return {
        type: MessageType.Ticker,
        exchange: 'coinbase',
        symbol,
        timestamp: new Date(data.time).getTime(),
        data: {
          price: parseFloat(data.price),
          priceChange: 0, // Coinbase doesn't provide this in the ticker
          priceChangePercent: 0, // Coinbase doesn't provide this in the ticker
          volume: parseFloat(data.volume_24h || '0'),
          quoteVolume: 0, // Coinbase doesn't provide this in the ticker
          high: parseFloat(data.high_24h || '0'),
          low: parseFloat(data.low_24h || '0')
        } as TickerData,
        raw: data
      };
    }
    
    // Return the message as is if we don't have a specific parser
    return {
      type: MessageType.Raw,
      exchange: 'coinbase',
      symbol: data.product_id?.toLowerCase() || 'unknown',
      timestamp: data.time ? new Date(data.time).getTime() : Date.now(),
      data: data,
      raw: data
    };
  }

  /**
   * Parse a message from Kraken
   */
  private parseKrakenMessage(data: any): ParsedMessage | null {
    // Kraken has a specific format where the first element is usually the channel name
    if (Array.isArray(data)) {
      const channelName = data[2];
      const pair = data[3];
      
      if (channelName === 'trade') {
        // Trades message
        const trades = data[1];
        // Return the most recent trade
        const trade = trades[0];
        
        return {
          type: MessageType.Trade,
          exchange: 'kraken',
          symbol: pair.toLowerCase(),
          timestamp: Math.floor(parseFloat(trade[2]) * 1000),
          data: {
            id: new Date().getTime().toString(), // Kraken doesn't provide trade ID in WebSocket
            price: parseFloat(trade[0]),
            amount: parseFloat(trade[1]),
            side: trade[3] === 's' ? 'sell' : 'buy',
            time: Math.floor(parseFloat(trade[2]) * 1000)
          } as TradeData,
          raw: data
        };
      } else if (channelName === 'book') {
        // Order book message
        const book = data[1];
        const timestamp = Date.now();
        
        // Kraken book updates can have asks, bids, or both
        const orderBookData: OrderBookData = {
          bids: [],
          asks: [],
          lastUpdateId: timestamp
        };
        
        if (book.bs) {
          orderBookData.bids = book.bs.map((bid: string[]) => 
            [parseFloat(bid[0]), parseFloat(bid[1])]
          );
        }
        
        if (book.as) {
          orderBookData.asks = book.as.map((ask: string[]) => 
            [parseFloat(ask[0]), parseFloat(ask[1])]
          );
        }
        
        return {
          type: MessageType.OrderBook,
          exchange: 'kraken',
          symbol: pair.toLowerCase(),
          timestamp,
          data: orderBookData,
          raw: data
        };
      } else if (channelName === 'ohlc') {
        // Candle message
        const ohlc = data[1];
        
        return {
          type: MessageType.Candle,
          exchange: 'kraken',
          symbol: pair.toLowerCase(),
          timestamp: Math.floor(parseFloat(ohlc[0]) * 1000),
          data: {
            time: Math.floor(parseFloat(ohlc[0]) * 1000),
            open: parseFloat(ohlc[1]),
            high: parseFloat(ohlc[2]),
            low: parseFloat(ohlc[3]),
            close: parseFloat(ohlc[4]),
            volume: parseFloat(ohlc[6]),
            interval: ohlc[7], // This might be different from our standard intervals
            isClosed: ohlc[8] === 1
          } as CandleData,
          raw: data
        };
      } else if (channelName === 'ticker') {
        // Ticker message
        const ticker = data[1];
        
        return {
          type: MessageType.Ticker,
          exchange: 'kraken',
          symbol: pair.toLowerCase(),
          timestamp: Date.now(),
          data: {
            price: parseFloat(ticker.c[0]),
            priceChange: 0, // Kraken doesn't provide this directly
            priceChangePercent: 0, // Kraken doesn't provide this directly
            volume: parseFloat(ticker.v[1]),
            quoteVolume: 0, // Kraken doesn't provide this directly
            high: parseFloat(ticker.h[1]),
            low: parseFloat(ticker.l[1])
          } as TickerData,
          raw: data
        };
      }
    }
    
    // Return the message as is if we don't have a specific parser
    return {
      type: MessageType.Raw,
      exchange: 'kraken',
      symbol: 'unknown',
      timestamp: Date.now(),
      data: data,
      raw: data
    };
  }

  /**
   * Parse a message from KuCoin
   */
  private parseKucoinMessage(data: any): ParsedMessage | null {
    // KuCoin messages have a specific structure with a 'type' field
    if (data.type === 'message') {
      const subject = data.subject;
      const topic = data.topic;
      const messageData = data.data;
      
      // Extract the symbol from the topic
      const topicParts = topic.split(':');
      const symbol = topicParts[1]?.toLowerCase() || 'unknown';
      
      if (subject === 'trade.l3match') {
        // Trade message
        return {
          type: MessageType.Trade,
          exchange: 'kucoin',
          symbol,
          timestamp: messageData.time,
          data: {
            id: messageData.tradeId,
            price: parseFloat(messageData.price),
            amount: parseFloat(messageData.size),
            side: messageData.side.toLowerCase(),
            time: messageData.time
          } as TradeData,
          raw: data
        };
      } else if (subject === 'trade.snapshot') {
        // Order book snapshot
        return {
          type: MessageType.OrderBook,
          exchange: 'kucoin',
          symbol,
          timestamp: messageData.time,
          data: {
            bids: messageData.bids.map((bid: string[]) => 
              [parseFloat(bid[0]), parseFloat(bid[1])]
            ),
            asks: messageData.asks.map((ask: string[]) => 
              [parseFloat(ask[0]), parseFloat(ask[1])]
            ),
            lastUpdateId: messageData.sequence
          } as OrderBookData,
          raw: data
        };
      } else if (subject === 'trade.l2update') {
        // Order book update
        return {
          type: MessageType.OrderBook,
          exchange: 'kucoin',
          symbol,
          timestamp: messageData.time,
          data: {
            bids: messageData.changes.bids.map((bid: string[]) => 
              [parseFloat(bid[0]), parseFloat(bid[1])]
            ),
            asks: messageData.changes.asks.map((ask: string[]) => 
              [parseFloat(ask[0]), parseFloat(ask[1])]
            ),
            lastUpdateId: messageData.sequence
          } as OrderBookData,
          raw: data
        };
      } else if (subject === 'market.kline') {
        // Candle message
        const candle = messageData.candles;
        
        return {
          type: MessageType.Candle,
          exchange: 'kucoin',
          symbol,
          timestamp: parseInt(candle[0]),
          data: {
            time: parseInt(candle[0]),
            open: parseFloat(candle[1]),
            close: parseFloat(candle[2]),
            high: parseFloat(candle[3]),
            low: parseFloat(candle[4]),
            volume: parseFloat(candle[5]),
            interval: topicParts[2] || '1m', // Interval from topic
            isClosed: true // KuCoin sends complete candles
          } as CandleData,
          raw: data
        };
      } else if (subject === 'trade.ticker') {
        // Ticker message
        return {
          type: MessageType.Ticker,
          exchange: 'kucoin',
          symbol,
          timestamp: messageData.time,
          data: {
            price: parseFloat(messageData.price),
            priceChange: parseFloat(messageData.changePrice),
            priceChangePercent: parseFloat(messageData.changeRate) * 100,
            volume: parseFloat(messageData.vol),
            quoteVolume: parseFloat(messageData.volValue),
            high: parseFloat(messageData.high),
            low: parseFloat(messageData.low)
          } as TickerData,
          raw: data
        };
      }
    }
    
    // Return the message as is if we don't have a specific parser
    return {
      type: MessageType.Raw,
      exchange: 'kucoin',
      symbol: 'unknown',
      timestamp: Date.now(),
      data: data,
      raw: data
    };
  }

  /**
   * Parse a message from Bybit
   */
  private parseBybitMessage(data: any): ParsedMessage | null {
    // Bybit has a specific structure with a 'topic' field
    if (data.topic) {
      const topic = data.topic;
      const messageData = data.data;
      const timestamp = data.ts || Date.now();
      
      // Extract the symbol from the topic
      const topicParts = topic.split('.');
      let symbol = 'unknown';
      
      // Extract symbol from topic
      if (topic.includes('trade')) {
        symbol = topicParts[1].toLowerCase();
      } else {
        for (const part of topicParts) {
          if (part.includes('USDT') || part.includes('BTC') || part.includes('ETH')) {
            symbol = part.toLowerCase();
            break;
          }
        }
      }
      
      if (topic.includes('trade')) {
        // Trade message
        const trade = Array.isArray(messageData) ? messageData[0] : messageData;
        
        return {
          type: MessageType.Trade,
          exchange: 'bybit',
          symbol,
          timestamp,
          data: {
            id: trade.id || trade.trade_id || timestamp.toString(),
            price: parseFloat(trade.price),
            amount: parseFloat(trade.size || trade.qty || '0'),
            side: (trade.side || '').toLowerCase(),
            time: trade.timestamp || trade.trade_time_ms || timestamp
          } as TradeData,
          raw: data
        };
      } else if (topic.includes('orderbook')) {
        // Order book message
        return {
          type: MessageType.OrderBook,
          exchange: 'bybit',
          symbol,
          timestamp,
          data: {
            bids: (messageData.b || messageData.bids || []).map((bid: any[]) => 
              Array.isArray(bid) 
                ? [parseFloat(bid[0]), parseFloat(bid[1])]
                : [parseFloat(bid.price), parseFloat(bid.size)]
            ),
            asks: (messageData.a || messageData.asks || []).map((ask: any[]) => 
              Array.isArray(ask) 
                ? [parseFloat(ask[0]), parseFloat(ask[1])]
                : [parseFloat(ask.price), parseFloat(ask.size)]
            ),
            lastUpdateId: messageData.seq || timestamp
          } as OrderBookData,
          raw: data
        };
      } else if (topic.includes('kline')) {
        // Candle message
        const candle = Array.isArray(messageData) ? messageData[0] : messageData;
        
        return {
          type: MessageType.Candle,
          exchange: 'bybit',
          symbol,
          timestamp,
          data: {
            time: candle.start || timestamp,
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
            volume: parseFloat(candle.volume),
            interval: topicParts[2] || '1m', // Extract interval from topic
            isClosed: candle.confirm || false
          } as CandleData,
          raw: data
        };
      } else if (topic.includes('ticker')) {
        // Ticker message
        const ticker = Array.isArray(messageData) ? messageData[0] : messageData;
        
        return {
          type: MessageType.Ticker,
          exchange: 'bybit',
          symbol,
          timestamp,
          data: {
            price: parseFloat(ticker.last_price || ticker.lastPrice || '0'),
            priceChange: parseFloat(ticker.price_24h_change || ticker.change || '0'),
            priceChangePercent: parseFloat(ticker.percent_change_24h || ticker.change_rate || '0'),
            volume: parseFloat(ticker.volume_24h || ticker.volume || '0'),
            quoteVolume: parseFloat(ticker.turnover_24h || ticker.turnover || '0'),
            high: parseFloat(ticker.high_price_24h || ticker.high || '0'),
            low: parseFloat(ticker.low_price_24h || ticker.low || '0')
          } as TickerData,
          raw: data
        };
      }
    }
    
    // Return the message as is if we don't have a specific parser
    return {
      type: MessageType.Raw,
      exchange: 'bybit',
      symbol: 'unknown',
      timestamp: Date.now(),
      data: data,
      raw: data
    };
  }
}
