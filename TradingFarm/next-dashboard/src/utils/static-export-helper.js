// Static export helper 
// Provides fallback data and utilities for static export

export const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';

// Mock data for static export 
export const mockDashboardData = {
  balance: 10000,
  portfolioValue: 15000,
  profitLoss: 5000,
  profitLossPercentage: 50,
  trades: 120,
  winRate: 68,
  assets: [
    { name: 'Bitcoin', symbol: 'BTC', value: 8000, allocation: 53 },
    { name: 'Ethereum', symbol: 'ETH', value: 4000, allocation: 27 },
    { name: 'Solana', symbol: 'SOL', value: 2000, allocation: 13 },
    { name: 'USD Coin', symbol: 'USDC', value: 1000, allocation: 7 },
  ]
};

export const mockTradingData = {
  recentTrades: [
    { id: 1, pair: 'BTC/USDT', type: 'buy', amount: 0.5, price: 60000, timestamp: new Date().toISOString() },
    { id: 2, pair: 'ETH/USDT', type: 'sell', amount: 2, price: 2000, timestamp: new Date().toISOString() },
  ],
  openOrders: [
    { id: 101, pair: 'BTC/USDT', type: 'limit', side: 'buy', amount: 0.1, price: 58000, timestamp: new Date().toISOString() },
  ],
  marketData: {
    BTC: { price: 60000, change24h: 2.5 },
    ETH: { price: 2000, change24h: 1.8 },
    SOL: { price: 100, change24h: 5.2 },
  }
};

// Helper to determine if code should run in static export
export function onlyInDynamicSite(fn) {
  return (...args) => {
    if (isStaticExport) {
      console.log('Operation skipped in static export mode');
      return null;
    }
    return fn(...args);
  };
}

// Helper to get static fallback data
export function getStaticFallbackData(dataType) {
  switch(dataType) {
    case 'dashboard':
      return mockDashboardData;
    case 'trading':
      return mockTradingData;
    default:
      return {};
  }
}

export default {
  isStaticExport,
  mockDashboardData,
  mockTradingData,
  onlyInDynamicSite,
  getStaticFallbackData
};
