import { describe, it, expect } from 'vitest';
import { PositionTracker } from '@/core/position-tracker';
import { Order } from '@/types/orders';

describe('PositionTracker', () => {
  it('initializes paper balances correctly and updates position on paper order', async () => {
    const pt = new PositionTracker('farm1', 'strat1', 1000);
    // Create a filled paper order
    const now = new Date();
    const order: Order = {
      id: 'test1',
      clientOrderId: 'c1',
      symbol: 'ABC',
      side: 'buy',
      type: 'limit',
      status: 'filled',
      price: 10,
      avgPrice: 10,
      quantity: 2,
      filledQuantity: 2,
      remainingQuantity: 0,
      createdAt: now,
      updatedAt: now,
      closePosition: false,
      reduceOnly: false,
      stopPrice: undefined,
      timeInForce: 'GTC',
    };

    const pos = await pt.updatePosition(order);
    expect(pos.symbol).toBe('ABC');
    expect(pos.side).toBe('long');
    expect(pos.quantity).toBe(2);
    expect(pos.entryPrice).toBe(10);

    // Paper balances remain unchanged
    const balances = pt.getPaperBalances();
    expect(balances.find(b => b.asset === 'USDT')?.total).toBe(1000);

    // getPositions returns the updated position
    const positions = await pt.getPositions();
    expect(positions).toHaveLength(1);
    expect(positions[0].symbol).toBe('ABC');
  });
});
