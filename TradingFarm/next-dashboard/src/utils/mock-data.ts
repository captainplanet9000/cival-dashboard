/**
 * Mock data utilities for Trading Farm Dashboard
 * 
 * This file provides mock data for development purposes when backend services
 * are not available or for testing the UI without real data.
 */

// Market Overview Data
export const mockMarketOverview = [
  { 
    symbol: 'BTC/USDT', 
    price: '64,243.50', 
    change24h: 2.45,
    volume: '2.4B',
  },
  { 
    symbol: 'ETH/USDT', 
    price: '3,102.75', 
    change24h: 1.20,
    volume: '1.2B',
  },
  { 
    symbol: 'SOL/USDT', 
    price: '142.30', 
    change24h: -0.75,
    volume: '423M',
  },
  { 
    symbol: 'BNB/USDT', 
    price: '610.50', 
    change24h: 0.35,
    volume: '178M',
  }
];

// Top Performing Assets
export const mockTopAssets = [
  { asset: 'AVAX', performance: 15.7 },
  { asset: 'MATIC', performance: 12.3 },
  { asset: 'DOT', performance: 9.8 },
  { asset: 'LINK', performance: 8.5 },
  { asset: 'ADA', performance: 7.2 }
];

// Recent Trades
export const mockTrades = [
  {
    id: '1',
    executed_at: new Date(Date.now() - 120000).toISOString(),
    pair: 'BTC/USDT',
    side: 'buy',
    price: 64253.25,
    amount: 0.15,
    value: 9637.99,
    agent_name: 'TrendFollower'
  },
  {
    id: '2',
    executed_at: new Date(Date.now() - 300000).toISOString(),
    pair: 'ETH/USDT',
    side: 'sell',
    price: 3104.80,
    amount: 1.5,
    value: 4657.20,
    agent_name: 'MeanReversion'
  },
  {
    id: '3',
    executed_at: new Date(Date.now() - 900000).toISOString(),
    pair: 'SOL/USDT',
    side: 'buy',
    price: 142.15,
    amount: 10,
    value: 1421.50,
    agent_name: 'VolatilityHarvester'
  }
];

// Open Orders
export const mockOpenOrders = [
  {
    id: '101',
    createdAt: new Date(Date.now() - 600000).toISOString(),
    symbol: 'BTC/USDT',
    side: 'buy',
    quantity: 0.2,
    price: 64000,
    filledQuantity: 0
  },
  {
    id: '102',
    createdAt: new Date(Date.now() - 1200000).toISOString(),
    symbol: 'ETH/USDT',
    side: 'sell',
    quantity: 2,
    price: 3150,
    filledQuantity: 0.5
  }
];

// PNL Metrics
export const mockPnlMetrics = {
  unrealizedPnl: 4327.65,
  realizedPnl: 12835.50,
  totalValue: 165428.75
};

// Agents
export const mockAgents = [
  {
    id: '1',
    name: 'TrendFollower',
    status: 'active',
    type: 'Momentum',
    capabilities: ['Trend Detection', 'Auto Position Sizing'],
    win_rate: 72,
    profit_loss: 6430.50
  },
  {
    id: '2',
    name: 'MeanReversion',
    status: 'active',
    type: 'Technical',
    capabilities: ['Range-Based Trading', 'Quick Execution'],
    win_rate: 65,
    profit_loss: 3215.25
  },
  {
    id: '3',
    name: 'VolatilityHarvester',
    status: 'paused',
    type: 'Options',
    capabilities: ['Risk Management', 'Strategy Switching'],
    win_rate: 58,
    profit_loss: 4105.80
  }
];

// Open Positions
export const mockOpenPositions = {
  positions: [
    {
      id: '201',
      symbol: 'BTC/USDT',
      direction: 'long',
      size: 0.5,
      entryPrice: 63250.75,
      unrealizedPnl: 496.38,
      agentId: '1'
    },
    {
      id: '202',
      symbol: 'ETH/USDT',
      direction: 'short',
      size: 4.0,
      entryPrice: 3205.50,
      unrealizedPnl: 410.00,
      agentId: '2'
    }
  ]
};
