import { CoinbaseAdapter } from '../../utils/exchanges/coinbase-adapter';
import { mockServerVault, mockCoinbaseApi, restoreMocks } from '../test-utils/mock-coinbase';
import { OrderRequest } from '../../types/orders';

describe('CoinbaseAdapter', () => {
  beforeAll(() => {
    mockServerVault();
    mockCoinbaseApi();
  });
  afterAll(() => restoreMocks());

  it('places a market order successfully', async () => {
    const adapter = new CoinbaseAdapter();
    const credentials = { apiKey: 'test', apiSecret: 'test', passphrase: 'test' };
    await adapter.connect(credentials);
    const order: OrderRequest = {
      symbol: 'BTC-USD',
      side: 'buy',
      type: 'market',
      quantity: 0.01
    };
    const result = await adapter.placeOrder(order);
    expect(result.status).toBe('filled');
    expect(result.symbol).toBe('BTC-USD');
  });

  it('handles API error gracefully', async () => {
    const adapter = new CoinbaseAdapter();
    await adapter.connect({ apiKey: 'bad', apiSecret: 'bad', passphrase: 'bad' });
    await expect(adapter.placeOrder({ symbol: 'BTC-USD', side: 'buy', type: 'market', quantity: 1 })).rejects.toThrow();
  });

  it('loads credentials from vault', async () => {
    const adapter = new CoinbaseAdapter();
    const credentials = await adapter.getCredentials('test-user');
    expect(credentials.apiKey).toBeDefined();
  });
});
