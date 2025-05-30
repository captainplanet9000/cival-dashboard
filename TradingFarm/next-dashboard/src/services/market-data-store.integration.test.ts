import { MarketDataStore } from './market-data-store';
import { MockExchangeAdapter } from './mock-exchange-adapter';

describe('MarketDataStore Integration', () => {
  let marketDataStore: MarketDataStore;
  let mockAdapter: MockExchangeAdapter;

  beforeEach(() => {
    mockAdapter = new MockExchangeAdapter();
    marketDataStore = new MarketDataStore({ adapters: { mock: mockAdapter } });
  });

  it('should aggregate order book data', async () => {
    await marketDataStore.subscribeOrderBook('mock', 'BTCUSD');
    const orderBook = marketDataStore.getOrderBook('mock', 'BTCUSD');
    expect(orderBook).toBeDefined();
    expect(orderBook.bids).toBeInstanceOf(Array);
    expect(orderBook.asks).toBeInstanceOf(Array);
  });
});
