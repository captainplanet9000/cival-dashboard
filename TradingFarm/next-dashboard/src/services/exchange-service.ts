/**
 * Exchange Service - Core service for interacting with cryptocurrency exchanges
 * This service provides a unified interface for accessing different exchanges.
 */
import { createServerClient } from '@/utils/supabase/server';
import { BybitApiService } from './exchanges/bybit-api-service';
import { CoinbaseApiService } from './exchanges/coinbase-api-service';
import { HyperliquidApiService } from './exchanges/hyperliquid-api-service';

export type ExchangeType = 'bybit' | 'coinbase' | 'hyperliquid' | 'mock';

export type MarketDataParams = {
  symbol: string;
  interval?: string;
  limit?: number;
};

export type OrderParams = {
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  quantity: number;
  price?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  reduceOnly?: boolean;
};

export interface ExchangeService {
  getMarketData(params: MarketDataParams): Promise<any>;
  getOrderBook(symbol: string): Promise<any>;
  getAccountBalance(): Promise<any>;
  placeOrder(params: OrderParams): Promise<any>;
  cancelOrder(orderId: string, symbol: string): Promise<any>;
  getActiveOrders(symbol?: string): Promise<any>;
  getOrderHistory(symbol?: string): Promise<any>;
  getExchangeInfo(): Promise<any>;
  getServerTime(): Promise<any>;
}

/**
 * Factory function to create an exchange service based on the exchange type
 */
export async function createExchangeService(
  exchange: ExchangeType,
  userId?: string
): Promise<ExchangeService> {
  // If no userId is provided, try to get it from the server client
  if (!userId) {
    try {
      const supabase = await createServerClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id;
    } catch (error) {
      console.error('Error getting user ID:', error);
    }
  }

  // Get API credentials from the database for the specific user and exchange
  const credentials = await getExchangeCredentials(exchange, userId);

  // Create the appropriate exchange service based on the exchange type
  switch (exchange) {
    case 'bybit':
      return new BybitApiService(credentials);
    case 'coinbase':
      return new CoinbaseApiService(credentials);
    case 'hyperliquid':
      return new HyperliquidApiService(credentials);
    case 'mock':
    default:
      return new MockExchangeService();
  }
}

/**
 * Get exchange API credentials from the database for a specific user and exchange
 */
async function getExchangeCredentials(exchange: ExchangeType, userId?: string) {
  if (!userId) {
    return null;
  }

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('exchange_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('exchange', exchange)
      .single();

    if (error) {
      console.error(`Error fetching ${exchange} credentials:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching ${exchange} credentials:`, error);
    return null;
  }
}

/**
 * Mock Exchange Service for development and testing
 */
class MockExchangeService implements ExchangeService {
  async getMarketData(params: MarketDataParams) {
    return {
      symbol: params.symbol,
      data: Array(params.limit || 100).fill(0).map((_, i) => ({
        time: new Date(Date.now() - i * 60000).toISOString(),
        open: 50000 + Math.random() * 1000,
        high: 51000 + Math.random() * 1000,
        low: 49000 + Math.random() * 1000,
        close: 50500 + Math.random() * 1000,
        volume: Math.random() * 100
      }))
    };
  }

  async getOrderBook(symbol: string) {
    return {
      symbol,
      bids: Array(10).fill(0).map((_, i) => ([50000 - i * 10, Math.random() * 10])),
      asks: Array(10).fill(0).map((_, i) => ([50000 + i * 10, Math.random() * 10]))
    };
  }

  async getAccountBalance() {
    return {
      balances: [
        { asset: 'BTC', free: 1.234, locked: 0.1 },
        { asset: 'ETH', free: 15.678, locked: 1.5 },
        { asset: 'USDT', free: 10000, locked: 5000 }
      ]
    };
  }

  async placeOrder(params: OrderParams) {
    return {
      orderId: `mock-order-${Date.now()}`,
      symbol: params.symbol,
      side: params.side,
      orderType: params.orderType,
      quantity: params.quantity,
      price: params.price || 50000,
      status: 'FILLED',
      transactTime: Date.now()
    };
  }

  async cancelOrder(orderId: string, symbol: string) {
    return {
      orderId,
      symbol,
      status: 'CANCELED'
    };
  }

  async getActiveOrders(symbol?: string) {
    return {
      orders: Array(5).fill(0).map((_, i) => ({
        orderId: `mock-order-${i}`,
        symbol: symbol || 'BTCUSDT',
        side: i % 2 === 0 ? 'Buy' : 'Sell',
        orderType: 'Limit',
        quantity: 0.1 + i * 0.1,
        price: 50000 + i * 100,
        status: 'NEW',
        time: Date.now() - i * 60000
      }))
    };
  }

  async getOrderHistory(symbol?: string) {
    return {
      orders: Array(10).fill(0).map((_, i) => ({
        orderId: `mock-order-history-${i}`,
        symbol: symbol || 'BTCUSDT',
        side: i % 2 === 0 ? 'Buy' : 'Sell',
        orderType: i % 3 === 0 ? 'Market' : 'Limit',
        quantity: 0.1 + i * 0.05,
        price: 50000 + i * 50,
        status: 'FILLED',
        time: Date.now() - i * 3600000
      }))
    };
  }

  async getExchangeInfo() {
    return {
      symbols: [
        { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' },
        { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING' },
        { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', status: 'TRADING' }
      ]
    };
  }

  async getServerTime() {
    return { serverTime: Date.now() };
  }
}
