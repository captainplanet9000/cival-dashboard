import { HyperliquidAdapter } from '../../utils/exchanges/hyperliquid-adapter';
import { mockServerVault, mockHyperliquidApi, restoreMocks } from '../test-utils/mock-hyperliquid';
import { OrderRequest } from '../../types/orders';

describe('HyperliquidAdapter', () => {
  beforeAll(() => {
    mockServerVault();
    mockHyperliquidApi();
  });
  afterAll(() => restoreMocks());

  it('places a market order successfully', async () => {
    const adapter = new HyperliquidAdapter();
    const credentials = { apiKey: 'test', apiSecret: 'test' };
    await adapter.connect(credentials);
    const order: OrderRequest = {
      symbol: 'BTCUSD',
      side: 'buy',
      type: 'market',
      quantity: 0.01
    };
    const result = await adapter.placeOrder(order);
    expect(result.status).toBe('filled');
    expect(result.symbol).toBe('BTCUSD');
  });

  it('handles API error gracefully', async () => {
    const adapter = new HyperliquidAdapter();
    await adapter.connect({ apiKey: 'bad', apiSecret: 'bad' });
    await expect(adapter.placeOrder({ symbol: 'BTCUSD', side: 'buy', type: 'market', quantity: 1 })).rejects.toThrow();
  });

  it('loads credentials from vault', async () => {
    const adapter = new HyperliquidAdapter();
    const credentials = await adapter.getCredentials('test-user');
    expect(credentials.apiKey).toBeDefined();
  });
});
