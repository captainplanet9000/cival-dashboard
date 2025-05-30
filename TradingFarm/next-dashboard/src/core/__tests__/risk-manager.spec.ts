import { describe, it, expect } from 'vitest';
import { RiskManager, RiskParameters } from '@/core/risk-manager';
import { OrderRequest, Balance } from '@/types/orders';

describe('RiskManager', () => {
  const params: RiskParameters = {
    maxPositionSize: 50,
    maxLeverage: 10,
    maxDrawdown: 20,
    maxDailyLoss: 10,
    maxOrderValue: 1000,
    slippageTolerance: 0.1,
    emergencyStopEnabled: false,
    circuitBreakerEnabled: false,
  };
  const rm = new RiskManager(params);

  it('allows orders within max order value', async () => {
    const order: OrderRequest = { symbol: 'ABC', side: 'buy', type: 'limit', quantity: 5, price: 100 };
    const balances: Balance[] = [{ asset: 'USDT', free: 10000, locked: 0, total: 10000 }];
    const result = await rm.validateOrder(order, [], balances);
    expect(result.passed).toBe(true);
    expect(result.details.maxOrderValueCheck).toBe(true);
  });

  it('rejects orders exceeding max order value', async () => {
    const order: OrderRequest = { symbol: 'ABC', side: 'buy', type: 'limit', quantity: 20, price: 100 };
    const balances: Balance[] = [{ asset: 'USDT', free: 10000, locked: 0, total: 10000 }];
    const result = await rm.validateOrder(order, [], balances);
    expect(result.passed).toBe(false);
    expect(result.details.maxOrderValueCheck).toBe(false);
  });
});
