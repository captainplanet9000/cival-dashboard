import { OrderManager } from './order-manager';
import { MockExchangeAdapter } from './mock-exchange-adapter';

describe('OrderManager Integration', () => {
  let orderManager: OrderManager;
  let mockAdapter: MockExchangeAdapter;

  beforeEach(() => {
    mockAdapter = new MockExchangeAdapter();
    orderManager = new OrderManager({
      adapters: { mock: mockAdapter },
    });
  });

  it('should place an order and receive status update', async () => {
    const order = await orderManager.placeOrder({
      exchange: 'mock',
      symbol: 'BTCUSD',
      side: 'buy',
      quantity: 0.1,
      price: 50000,
      type: 'limit',
    });
    expect(order.status).toBeDefined();
    expect(order.exchange).toBe('mock');
  });

  it('should modify and cancel an order', async () => {
    const order = await orderManager.placeOrder({
      exchange: 'mock',
      symbol: 'BTCUSD',
      side: 'buy',
      quantity: 0.1,
      price: 50000,
      type: 'limit',
    });
    const modified = await orderManager.modifyOrder(order.id, { price: 51000 });
    expect(modified.price).toBe(51000);
    const cancelled = await orderManager.cancelOrder(order.id);
    expect(cancelled.status).toBe('cancelled');
  });
});
