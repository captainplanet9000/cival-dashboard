import { describe, it, expect } from 'vitest';
import { TradingEngine, TradingEngineConfig } from '@/core/trading-engine';
import { ExchangeAdapter } from '@/utils/exchanges/exchange-adapter';
import { OrderRequest } from '@/types/orders';

// Mock ExchangeAdapter for paper mode
const mockAdapter: ExchangeAdapter = {
  connect: async () => ({ success: true, message: '' }),
  disconnect: async () => {},
  checkConnection: async () => true,
  getMarkets: async () => [],
  getTicker: async (symbol: string) => ({ symbol, price: 100, bid: 100, ask: 100, high: 100, low: 100, volume: 0, quoteVolume: 0, timestamp: new Date(), percentChange24h: 0 }),
  getOrderBook: async () => ({ symbol: '', bids: [], asks: [], timestamp: new Date() }),
  subscribeToTicker: async () => ({ id: '', unsubscribe: async () => {} }),
  subscribeToOrderBook: async () => ({ id: '', unsubscribe: async () => {} }),
  subscribeToTrades: async () => ({ id: '', unsubscribe: async () => {} }),
  getBalances: async () => [],
  getPositions: async () => [],
  placeOrder: async () => { throw new Error('Unexpected live execution'); },
  cancelOrder: async () => true,
  getOrder: async () => { throw new Error('Not implemented'); },
  getOpenOrders: async () => [],
  getOrderHistory: async () => [],
  getTrades: async () => [],
};

// Mock Supabase client for DB operations
const mockSupabase = {
  from: () => ({
    insert: async () => ({ data: [], error: null }),
    upsert: async () => ({ data: [], error: null }),
    update: async () => ({ data: [], error: null }),
    select: () => ({ eq: () => ({ data: [], error: null }) }),
  }),
} as any;

describe('TradingEngine (paper mode)', () => {
  const baseConfig: TradingEngineConfig = {
    farmId: 'farm1',
    strategyId: 'strat1',
    agentId: 'agent1',
    exchangeId: 'ex1',
    executionMode: 'paper',
    riskParams: {
      maxPositionSize: 100,
      maxLeverage: 10,
      maxDrawdown: 100,
      maxDailyLoss: 100,
      maxOrderValue: 1000,
      slippageTolerance: 0.1,
      emergencyStopEnabled: false,
      circuitBreakerEnabled: false,
    },
    allowedSymbols: ['ABC'],
    initialFunds: 1000,
  };

  it('executes a valid paper order successfully', async () => {
    const engine = new TradingEngine(mockAdapter, baseConfig, mockSupabase);
    const request: OrderRequest = { symbol: 'ABC', side: 'buy', type: 'limit', quantity: 2, price: 50 };
    const result = await engine.executeOrder(request);
    expect(result.success).toBe(true);
    expect(result.order).toBeDefined();
    expect(result.order?.quantity).toBe(2);
    expect(result.order?.avgPrice).toBeGreaterThan(0);
    // Verify position updated
    const position = (engine as any).positionTracker.getPosition('ABC');
    expect(position).not.toBeNull();
    expect(position?.quantity).toBe(2);
  });

  it('rejects orders exceeding max order value', async () => {
    const config: TradingEngineConfig = { ...baseConfig, riskParams: { ...baseConfig.riskParams, maxOrderValue: 10 } };
    const engine = new TradingEngine(mockAdapter, config, mockSupabase);
    const request: OrderRequest = { symbol: 'ABC', side: 'buy', type: 'limit', quantity: 1, price: 50 };
    const result = await engine.executeOrder(request);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/risk validation/);
    expect(result.riskChecks?.passed).toBe(false);
  });
});
