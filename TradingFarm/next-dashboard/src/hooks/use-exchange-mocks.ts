/**
 * Mock implementations for exchange hooks
 * These are used during build to prevent errors when the actual implementations
 * are not available or have dependencies that fail during the build process.
 */

// Mock type definitions
export type ExchangeType = 'binance' | 'bybit' | 'coinbase' | 'okx';
export type ExchangeDataType = 'ticker' | 'kline' | 'orderbook' | 'trades';
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Mock OHLCV type for market data
export interface OHLCV {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Mock OrderBook types
export interface OrderBookLevel {
  price: number;
  amount: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: string;
}

// Mock hook for exchange symbols
export function useExchangeSymbols(exchange: ExchangeType) {
  const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
  
  return {
    symbols,
    isLoading: false,
    error: null,
    refreshSymbols: () => {},
  };
}

// Mock hook for market data
export function useMarketData(
  symbol: string,
  options?: {
    interval?: string;
    limit?: number;
    exchange?: ExchangeType;
    refreshInterval?: number;
  }
) {
  const mockData: OHLCV[] = [
    {
      timestamp: new Date().toISOString(),
      open: 50000,
      high: 51000,
      close: 50500,
      low: 49500,
      volume: 100
    },
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      open: 49500,
      high: 50000,
      close: 50000,
      low: 49000,
      volume: 120
    }
  ];

  return {
    data: mockData,
    isLoading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
    refresh: () => {},
  };
}

// Mock hook for exchange WebSocket
export function useExchangeWebSocket(
  exchange: ExchangeType,
  symbol: string,
  dataType: ExchangeDataType,
  options?: { interval?: string; autoConnect?: boolean }
) {
  return {
    data: null,
    isConnected: false,
    status: 'disconnected' as ConnectionState,
    error: null,
    connect: () => {},
    disconnect: () => {},
    reconnect: () => {},
  };
}

// Mock hook for orders
export function useOrders(exchange: ExchangeType, symbol?: string) {
  return {
    orders: [],
    isLoading: false,
    error: null,
    placeOrder: async () => ({ success: true, orderId: 'mock-order-id' }),
    cancelOrder: async () => ({ success: true }),
    cancelAllOrders: async () => ({ success: true, count: 0 }),
    fetchOrders: () => {},
  };
}

// Mock hook for order book
export function useOrderBook(
  symbol: string,
  exchange?: ExchangeType,
  options?: { depth?: number; refreshInterval?: number }
) {
  const mockOrderBook: OrderBook = {
    bids: [
      { price: 49900, amount: 1.5 },
      { price: 49800, amount: 2.3 },
    ],
    asks: [
      { price: 50100, amount: 1.2 },
      { price: 50200, amount: 3.1 },
    ],
    timestamp: new Date().toISOString(),
  };

  return {
    orderBook: mockOrderBook,
    isLoading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
    refresh: () => {},
  };
}

// Mock order cancellation function
export function cancelOrderById(exchangeId: number, orderId: string) {
  return Promise.resolve({ success: true });
}

// Mock exchange accounts hook
export function useExchangeAccounts() {
  return {
    accounts: [],
    isLoading: false,
    error: null,
    refreshAccounts: () => {},
  };
}

// Mock exchange credentials hook
export function useExchangeCredentials() {
  return {
    credentials: [],
    isLoading: false,
    error: null,
    fetchCredentials: () => {},
    addCredential: async () => true,
    updateCredential: async () => true,
    deleteCredential: async () => true,
    getExchangeCredential: () => null,
    getDefaultCredential: () => null,
  };
}
