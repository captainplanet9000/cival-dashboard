import { BybitAdapter } from '@/utils/exchanges/bybit-adapter';
import { mockBybitApi, restoreMocks } from '@/tests/test-utils/mock-bybit';
import { ExchangeCredentials } from '@/utils/exchanges/exchange-adapter';
import { OrderRequest } from '@/types/orders';
import { delay } from '@/tests/test-utils/mock-common';

jest.mock('@/utils/server-vault', () => ({
  ServerVaultService: jest.fn().mockImplementation(() => ({
    getApiCredentials: jest.fn().mockImplementation((userId: string) => {
      if (userId === 'bad') {
        return Promise.resolve({ apiKey: 'bad', apiSecret: 'bad' });
      }
      return Promise.resolve({ 
        apiKey: 'test-api-key', 
        apiSecret: 'test-api-secret',
        subaccount: '',
      });
    })
  }))
}));

describe('BybitAdapter', () => {
  let adapter: BybitAdapter;
  const testCredentials: ExchangeCredentials = {
    apiKey: 'test',
    apiSecret: 'test',
    passphrase: '',
  };

  beforeEach(() => {
    adapter = new BybitAdapter();
    mockBybitApi();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  afterAll(() => {
    restoreMocks();
  });

  it('connects successfully', async () => {
    const result = await adapter.connect(testCredentials);
    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
  });

  it('gets balances successfully', async () => {
    await adapter.connect(testCredentials);
    const balances = await adapter.getBalances();
    expect(balances).toHaveLength(2); // From mocked response
    expect(balances[0].asset).toBe('USDT');
    expect(balances[0].free).toBe(10000);
  });
  
  it('places a market order successfully', async () => {
    await adapter.connect(testCredentials);
    const order: OrderRequest = {
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      quantity: 0.01
    };
    const result = await adapter.placeOrder(order);
    expect(result.status).toBe('filled');
    expect(result.symbol).toBe('BTCUSDT');
    expect(result.id).toBe('mock-order-id');
  });

  it('handles API error gracefully', async () => {
    await adapter.connect({ apiKey: 'bad', apiSecret: 'bad', subaccount: '' });
    await expect(adapter.placeOrder({ 
      symbol: 'BTCUSDT', 
      side: 'buy', 
      type: 'market', 
      quantity: 1 
    })).rejects.toThrow();
  });
  
  it('gets ticker data', async () => {
    await adapter.connect(testCredentials);
    const ticker = await adapter.getTicker('BTCUSDT');
    expect(ticker.symbol).toBe('BTCUSDT');
    expect(ticker.price).toBe(50000);
    expect(ticker.bid).toBe(49990);
    expect(ticker.ask).toBe(50010);
  });

  it('loads credentials from vault', async () => {
    const credentials = await adapter.getCredentials('test-user');
    expect(credentials.apiKey).toBe('test-api-key');
    expect(credentials.apiSecret).toBe('test-api-secret');
  });
  
  it('subscribes to ticker updates', async () => {
    await adapter.connect(testCredentials);
    const callback = jest.fn();
    const subscription = await adapter.subscribeTicker('BTCUSDT', callback);
    
    // Wait for the mock websocket to emit data
    await delay(100);
    
    expect(subscription).toBeDefined();
    expect(subscription.unsubscribe).toBeDefined();
    // The mock should have called our callback at least once
    expect(callback).toHaveBeenCalled();
  });
});
