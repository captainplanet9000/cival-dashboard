/**
 * Mock Trading Orders and Executions
 * Data for simulating the trading activities in the Trading Farm
 */

// Mock trading orders
export const mockOrders = [
  {
    id: 'order-1001',
    farm_id: 'farm-1',
    agent_id: 'agent-1',
    market: 'BTC-USD',
    type: 'market',
    side: 'buy',
    amount: 0.15,
    price: null,
    status: 'filled',
    created_at: '2025-04-01T08:30:00Z',
    updated_at: '2025-04-01T08:30:15Z',
    filled_amount: 0.15,
    avg_fill_price: 60250,
    total_cost: 9037.5,
    metadata: {
      strategy: 'trend_following',
      signal_strength: 0.85,
      execution_reason: 'momentum_breakout'
    }
  },
  {
    id: 'order-1002',
    farm_id: 'farm-1',
    agent_id: 'eliza-1',
    market: 'ETH-USD',
    type: 'limit',
    side: 'buy',
    amount: 2.5,
    price: 1950,
    status: 'open',
    created_at: '2025-04-01T09:45:00Z',
    updated_at: '2025-04-01T09:45:10Z',
    filled_amount: 0,
    avg_fill_price: null,
    total_cost: 0,
    metadata: {
      strategy: 'support_level',
      signal_strength: 0.72,
      execution_reason: 'price_target'
    }
  },
  {
    id: 'order-1003',
    farm_id: 'farm-1',
    agent_id: 'eliza-3',
    market: 'SOL-USD',
    type: 'market',
    side: 'sell',
    amount: 25,
    price: null,
    status: 'filled',
    created_at: '2025-03-31T14:45:00Z',
    updated_at: '2025-03-31T14:45:30Z',
    filled_amount: 25,
    avg_fill_price: 122.50,
    total_cost: 3062.5,
    metadata: {
      strategy: 'swing_trading',
      signal_strength: 0.68,
      execution_reason: 'take_profit'
    }
  },
  {
    id: 'order-1004',
    farm_id: 'farm-2',
    agent_id: 'agent-5',
    market: 'BTC-USD',
    type: 'stop',
    side: 'sell',
    amount: 0.1,
    price: 59000,
    status: 'open',
    created_at: '2025-04-01T10:15:00Z',
    updated_at: '2025-04-01T10:15:15Z',
    filled_amount: 0,
    avg_fill_price: null,
    total_cost: 0,
    metadata: {
      strategy: 'hedging',
      signal_strength: 0.65,
      execution_reason: 'risk_management'
    }
  },
  {
    id: 'order-1005',
    farm_id: 'farm-2',
    agent_id: 'eliza-5',
    market: 'BTC-USD',
    type: 'market',
    side: 'buy',
    amount: 0.05,
    price: null,
    status: 'filled',
    created_at: '2025-04-01T11:32:00Z',
    updated_at: '2025-04-01T11:32:25Z',
    filled_amount: 0.05,
    avg_fill_price: 59950,
    total_cost: 2997.5,
    metadata: {
      strategy: 'arbitrage',
      signal_strength: 0.92,
      execution_reason: 'price_discrepancy'
    }
  },
  {
    id: 'order-1006',
    farm_id: 'farm-2',
    agent_id: 'eliza-5',
    market: 'BTC-USD',
    type: 'market',
    side: 'sell',
    amount: 0.05,
    price: null,
    status: 'filled',
    created_at: '2025-04-01T11:32:30Z',
    updated_at: '2025-04-01T11:32:45Z',
    filled_amount: 0.05,
    avg_fill_price: 60150,
    total_cost: 3007.5,
    metadata: {
      strategy: 'arbitrage',
      signal_strength: 0.92,
      execution_reason: 'price_discrepancy'
    }
  },
  {
    id: 'order-1007',
    farm_id: 'farm-1',
    agent_id: 'agent-3',
    market: 'ETH-USD',
    type: 'market',
    side: 'buy',
    amount: 1.0,
    price: null,
    status: 'filled',
    created_at: '2025-04-01T00:01:00Z',
    updated_at: '2025-04-01T00:01:10Z',
    filled_amount: 1.0,
    avg_fill_price: 2005.50,
    total_cost: 2005.50,
    metadata: {
      strategy: 'dca',
      signal_strength: 1.0,
      execution_reason: 'scheduled_purchase'
    }
  },
  {
    id: 'order-1008',
    farm_id: 'farm-2',
    agent_id: 'agent-4',
    market: 'USDC-USD',
    type: 'market',
    side: 'buy',
    amount: 5000,
    price: null,
    status: 'filled',
    created_at: '2025-03-30T16:20:00Z',
    updated_at: '2025-03-30T16:20:15Z',
    filled_amount: 5000,
    avg_fill_price: 1.0,
    total_cost: 5000,
    metadata: {
      strategy: 'yield',
      signal_strength: 0.88,
      execution_reason: 'yield_opportunity'
    }
  }
];

// Mock order executions (fills)
export const mockOrderExecutions = [
  {
    id: 'exec-10001',
    order_id: 'order-1001',
    amount: 0.15,
    price: 60250,
    fee: 13.55,
    timestamp: '2025-04-01T08:30:13Z',
    exchange: 'coinbase'
  },
  {
    id: 'exec-10002',
    order_id: 'order-1003',
    amount: 25,
    price: 122.50,
    fee: 7.65,
    timestamp: '2025-03-31T14:45:22Z',
    exchange: 'binance'
  },
  {
    id: 'exec-10003',
    order_id: 'order-1005',
    amount: 0.05,
    price: 59950,
    fee: 3.00,
    timestamp: '2025-04-01T11:32:18Z',
    exchange: 'kraken'
  },
  {
    id: 'exec-10004',
    order_id: 'order-1006',
    amount: 0.05,
    price: 60150,
    fee: 3.01,
    timestamp: '2025-04-01T11:32:37Z',
    exchange: 'binance'
  },
  {
    id: 'exec-10005',
    order_id: 'order-1007',
    amount: 1.0,
    price: 2005.50,
    fee: 5.01,
    timestamp: '2025-04-01T00:01:08Z',
    exchange: 'coinbase'
  },
  {
    id: 'exec-10006',
    order_id: 'order-1008',
    amount: 5000,
    price: 1.0,
    fee: 5.00,
    timestamp: '2025-03-30T16:20:12Z',
    exchange: 'kraken'
  }
];

// Mock trade history with aggregated daily results
export const mockTradeHistory = [
  {
    date: '2025-04-01',
    farm_id: 'farm-1',
    trades_executed: 10,
    volume: 24500,
    profit_loss: 250.75,
    profit_loss_percent: 1.02,
    fees: 36.75,
    by_market: {
      'BTC-USD': {
        trades_executed: 4,
        volume: 15000,
        profit_loss: 175.50
      },
      'ETH-USD': {
        trades_executed: 3,
        volume: 6000,
        profit_loss: 45.25
      },
      'SOL-USD': {
        trades_executed: 3,
        volume: 3500,
        profit_loss: 30.00
      }
    }
  },
  {
    date: '2025-03-31',
    farm_id: 'farm-1',
    trades_executed: 8,
    volume: 18750,
    profit_loss: 320.50,
    profit_loss_percent: 1.71,
    fees: 28.12,
    by_market: {
      'BTC-USD': {
        trades_executed: 2,
        volume: 9000,
        profit_loss: 135.00
      },
      'ETH-USD': {
        trades_executed: 2,
        volume: 4000,
        profit_loss: 80.00
      },
      'SOL-USD': {
        trades_executed: 4,
        volume: 5750,
        profit_loss: 105.50
      }
    }
  },
  {
    date: '2025-04-01',
    farm_id: 'farm-2',
    trades_executed: 6,
    volume: 15250,
    profit_loss: 145.25,
    profit_loss_percent: 0.95,
    fees: 22.88,
    by_market: {
      'BTC-USD': {
        trades_executed: 3,
        volume: 12000,
        profit_loss: 120.00
      },
      'ETH-USD': {
        trades_executed: 1,
        volume: 2000,
        profit_loss: 15.25
      },
      'SOL-USD': {
        trades_executed: 2,
        volume: 1250,
        profit_loss: 10.00
      }
    }
  },
  {
    date: '2025-03-31',
    farm_id: 'farm-2',
    trades_executed: 4,
    volume: 9500,
    profit_loss: -75.25,
    profit_loss_percent: -0.79,
    fees: 14.25,
    by_market: {
      'BTC-USD': {
        trades_executed: 2,
        volume: 6000,
        profit_loss: -60.00
      },
      'ETH-USD': {
        trades_executed: 1,
        volume: 2500,
        profit_loss: -15.25
      },
      'SOL-USD': {
        trades_executed: 1,
        volume: 1000,
        profit_loss: 0.00
      }
    }
  }
];

// Mock pending orders currently on the books
export const mockPendingOrders = [
  {
    id: 'order-1002',
    farm_id: 'farm-1',
    agent_id: 'eliza-1',
    market: 'ETH-USD',
    type: 'limit',
    side: 'buy',
    amount: 2.5,
    price: 1950,
    status: 'open',
    created_at: '2025-04-01T09:45:00Z',
    updated_at: '2025-04-01T09:45:10Z'
  },
  {
    id: 'order-1004',
    farm_id: 'farm-2',
    agent_id: 'agent-5',
    market: 'BTC-USD',
    type: 'stop',
    side: 'sell',
    amount: 0.1,
    price: 59000,
    status: 'open',
    created_at: '2025-04-01T10:15:00Z',
    updated_at: '2025-04-01T10:15:15Z'
  },
  {
    id: 'order-1009',
    farm_id: 'farm-1',
    agent_id: 'agent-1',
    market: 'SOL-USD',
    type: 'limit',
    side: 'buy',
    amount: 20,
    price: 115.50,
    status: 'open',
    created_at: '2025-04-01T14:30:00Z',
    updated_at: '2025-04-01T14:30:15Z'
  },
  {
    id: 'order-1010',
    farm_id: 'farm-2',
    agent_id: 'eliza-3',
    market: 'ETH-USD',
    type: 'limit',
    side: 'sell',
    amount: 3.5,
    price: 2100,
    status: 'open',
    created_at: '2025-04-01T15:20:00Z',
    updated_at: '2025-04-01T15:20:10Z'
  }
];

// Helper functions
export function getOrdersByFarmId(farmId: string) {
  return mockOrders.filter(order => order.farm_id === farmId);
}

export function getOrdersByAgentId(agentId: string) {
  return mockOrders.filter(order => order.agent_id === agentId);
}

export function getOrderExecutionsByOrderId(orderId: string) {
  return mockOrderExecutions.filter(execution => execution.order_id === orderId);
}

export function getTradeHistoryByFarmId(farmId: string) {
  return mockTradeHistory.filter(history => history.farm_id === farmId);
}

export function getPendingOrdersByFarmId(farmId: string) {
  return mockPendingOrders.filter(order => order.farm_id === farmId);
}

export function getOrderById(orderId: string) {
  return mockOrders.find(order => order.id === orderId);
}
