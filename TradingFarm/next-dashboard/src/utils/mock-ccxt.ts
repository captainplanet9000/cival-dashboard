/**
 * Mock CCXT library implementation for build purposes
 * This allows the codebase to build without requiring the actual CCXT package
 */

export type Order = {
  id: string;
  datetime: string;
  timestamp: number;
  status: string;
  symbol: string;
  type: string;
  timeInForce?: string;
  side: string;
  price: number;
  average?: number;
  amount: number;
  filled: number;
  remaining: number;
  cost?: number;
  trades?: any[];
  fee?: {
    currency: string;
    cost: number;
    rate?: number;
  };
  info?: any;
};

export type Ticker = {
  symbol: string;
  info: any;
  timestamp: number;
  datetime: string;
  high: number;
  low: number;
  bid: number;
  bidVolume?: number;
  ask: number;
  askVolume?: number;
  vwap?: number;
  open?: number;
  close?: number;
  last?: number;
  previousClose?: number;
  change?: number;
  percentage?: number;
  average?: number;
  baseVolume?: number;
  quoteVolume?: number;
};

export type Balance = {
  free: Record<string, number>;
  used: Record<string, number>;
  total: Record<string, number>;
  info?: any;
};

export type Market = {
  id: string;
  symbol: string;
  base: string;
  quote: string;
  baseId: string;
  quoteId: string;
  active: boolean;
  precision: {
    price: number;
    amount: number;
    cost?: number;
  };
  limits: {
    amount: {
      min: number;
      max?: number;
    };
    price: {
      min: number;
      max?: number;
    };
    cost: {
      min: number;
      max?: number;
    };
  };
  info: any;
};

// Mock CCXT Exchange class
class Exchange {
  apiKey: string | undefined;
  secret: string | undefined;
  enableRateLimit: boolean;
  options: Record<string, any> = {};
  id: string;
  markets: Record<string, Market> = {};

  constructor(config: any = {}) {
    this.apiKey = config.apiKey;
    this.secret = config.secret;
    this.enableRateLimit = config.enableRateLimit || false;
    this.options = config.options || {};
    this.id = 'exchange';
  }

  async loadMarkets(): Promise<Record<string, Market>> {
    this.markets = {
      'BTC/USDT': {
        id: 'BTCUSDT',
        symbol: 'BTC/USDT',
        base: 'BTC',
        quote: 'USDT',
        baseId: 'BTC',
        quoteId: 'USDT',
        active: true,
        precision: {
          price: 2,
          amount: 8
        },
        limits: {
          amount: {
            min: 0.0001,
            max: 1000.0
          },
          price: {
            min: 0.01,
            max: 1000000.0
          },
          cost: {
            min: 10.0,
            max: 1000000.0
          }
        },
        info: {}
      },
      'ETH/USDT': {
        id: 'ETHUSDT',
        symbol: 'ETH/USDT',
        base: 'ETH',
        quote: 'USDT',
        baseId: 'ETH',
        quoteId: 'USDT',
        active: true,
        precision: {
          price: 2,
          amount: 8
        },
        limits: {
          amount: {
            min: 0.001,
            max: 1000.0
          },
          price: {
            min: 0.01,
            max: 100000.0
          },
          cost: {
            min: 10.0,
            max: 1000000.0
          }
        },
        info: {}
      }
    };
    return this.markets;
  }

  async fetchMarkets(): Promise<Market[]> {
    await this.loadMarkets();
    return Object.values(this.markets);
  }

  async fetchTicker(symbol: string): Promise<Ticker> {
    const now = new Date();
    return {
      symbol,
      info: {},
      timestamp: now.getTime(),
      datetime: now.toISOString(),
      high: 30000,
      low: 29000,
      bid: 29500,
      bidVolume: 1.5,
      ask: 29550,
      askVolume: 2.3,
      vwap: 29750,
      open: 29200,
      close: 29500,
      last: 29500,
      previousClose: 29100,
      change: 400,
      percentage: 1.37,
      average: 29350,
      baseVolume: 1000,
      quoteVolume: 29750000
    };
  }

  async fetchBalance(): Promise<Balance> {
    return {
      free: { BTC: 1.0, USDT: 50000.0, ETH: 10.0 },
      used: { BTC: 0.5, USDT: 25000.0, ETH: 5.0 },
      total: { BTC: 1.5, USDT: 75000.0, ETH: 15.0 },
      info: {}
    };
  }

  async fetchOrders(symbol?: string, since?: number, limit?: number, params?: any): Promise<Order[]> {
    return [
      this.createMockOrder('12345', symbol || 'BTC/USDT', 'limit', 'buy', 29500, 1.0, 'closed'),
      this.createMockOrder('12346', symbol || 'BTC/USDT', 'limit', 'sell', 30000, 0.5, 'open')
    ];
  }

  async fetchOpenOrders(symbol?: string, since?: number, limit?: number, params?: any): Promise<Order[]> {
    return [
      this.createMockOrder('12346', symbol || 'BTC/USDT', 'limit', 'sell', 30000, 0.5, 'open')
    ];
  }

  async fetchOrderStatus(id: string, symbol?: string, params?: any): Promise<string> {
    return id === '12345' ? 'closed' : 'open';
  }

  async createOrder(symbol: string, type: string, side: string, amount: number, price?: number, params?: any): Promise<Order> {
    return this.createMockOrder(Math.random().toString(36).substring(7), symbol, type, side, price || 0, amount, 'open');
  }

  async cancelOrder(id: string, symbol?: string, params?: any): Promise<any> {
    return { id, symbol, status: 'canceled' };
  }

  private createMockOrder(id: string, symbol: string, type: string, side: string, price: number, amount: number, status: string): Order {
    const now = new Date();
    const timestamp = now.getTime();
    const datetime = now.toISOString();
    const filled = status === 'closed' ? amount : 0;
    const remaining = status === 'closed' ? 0 : amount;
    
    return {
      id,
      datetime,
      timestamp,
      status,
      symbol,
      type,
      timeInForce: 'GTC',
      side,
      price,
      average: price,
      amount,
      filled,
      remaining,
      cost: price * amount,
      trades: [],
      fee: {
        currency: symbol.split('/')[1],
        cost: price * amount * 0.001,
        rate: 0.001
      },
      info: {}
    };
  }
}

// Mock Binance exchange
class Binance extends Exchange {
  constructor(config: any = {}) {
    super(config);
    this.id = 'binance';
  }

  async fetchOHLCV(symbol: string, timeframe: string = '1h', since?: number, limit?: number, params?: any): Promise<number[][]> {
    // Returns mock OHLCV data: [timestamp, open, high, low, close, volume]
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    
    // Generate some random OHLCV data
    return Array(limit || 100).fill(0).map((_, i) => {
      const timestamp = now - ((limit || 100) - i) * hour;
      const open = 29000 + Math.random() * 2000;
      const high = open + Math.random() * 500;
      const low = open - Math.random() * 500;
      const close = low + Math.random() * (high - low);
      const volume = 100 + Math.random() * 900;
      
      return [timestamp, open, high, low, close, volume];
    });
  }
}

// Type definitions
export type ExchangeId = 'binance' | 'kucoin' | 'ftx' | 'bybit';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop-limit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'open' | 'closed' | 'canceled' | 'expired' | 'rejected';

// Mock CCXT module
const ccxt = {
  binance: Binance,
  Exchange,
  // Add other exchanges as needed
};

export default ccxt;
