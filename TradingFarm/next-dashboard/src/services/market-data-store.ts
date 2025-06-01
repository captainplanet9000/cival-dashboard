// Market Data Store
// Aggregates and normalizes live market data from all exchanges
import { ExchangeType } from './exchange-service';
import { ExchangeDataType } from './exchange-websocket-service';
import unifiedWebSocketManager, { WebSocketEvent } from './unified-websocket-manager';

interface OrderBookLevel {
  price: number;
  quantity: number;
}

interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

interface Ticker {
  price: number;
  volume: number;
  timestamp: number;
}

interface Trade {
  price: number;
  quantity: number;
  side: string;
  timestamp: number;
}

class MarketDataStore {
  private orderBooks: Map<string, OrderBook> = new Map();
  private tickers: Map<string, Ticker> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private maxTradeCache = 100;

  constructor() {
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners() {
    Object.values(ExchangeType).forEach((exchange) => {
      unifiedWebSocketManager.addCallback(
        exchange as ExchangeType,
        ExchangeDataType.ORDERBOOK,
        (event: WebSocketEvent) => {
          const key = `${exchange}:${event.data.symbol}`;
          this.orderBooks.set(key, {
            bids: event.data.bids.map((b: any) => ({ price: b[0], quantity: b[1] })),
            asks: event.data.asks.map((a: any) => ({ price: a[0], quantity: a[1] })),
            timestamp: Date.now()
          });
        }
      );
      unifiedWebSocketManager.addCallback(
        exchange as ExchangeType,
        ExchangeDataType.TICKER,
        (event: WebSocketEvent) => {
          const key = `${exchange}:${event.data.symbol}`;
          this.tickers.set(key, {
            price: event.data.price,
            volume: event.data.volume,
            timestamp: Date.now()
          });
        }
      );
      unifiedWebSocketManager.addCallback(
        exchange as ExchangeType,
        ExchangeDataType.TRADES,
        (event: WebSocketEvent) => {
          const key = `${exchange}:${event.data[0]?.symbol}`;
          const tradeArr = this.trades.get(key) || [];
          event.data.forEach((trade: any) => {
            tradeArr.push({
              price: trade.price,
              quantity: trade.quantity,
              side: trade.side,
              timestamp: Date.now()
            });
          });
          // Keep only the latest N trades
          this.trades.set(key, tradeArr.slice(-this.maxTradeCache));
        }
      );
    });
  }

  getOrderBook(exchange: ExchangeType, symbol: string): OrderBook | undefined {
    return this.orderBooks.get(`${exchange}:${symbol}`);
  }

  getTicker(exchange: ExchangeType, symbol: string): Ticker | undefined {
    return this.tickers.get(`${exchange}:${symbol}`);
  }

  getTrades(exchange: ExchangeType, symbol: string): Trade[] {
    return this.trades.get(`${exchange}:${symbol}`) || [];
  }
}

const marketDataStore = new MarketDataStore();
export default marketDataStore;
