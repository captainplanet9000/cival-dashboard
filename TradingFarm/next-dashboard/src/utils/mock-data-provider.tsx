'use client';

/**
 * Mock Data Provider
 * 
 * This component provides mock data for dashboard widgets in development mode,
 * ensuring they can render correctly without requiring backend connections.
 */

import * as React from 'react';
const { createContext, useContext } = React;
type ReactNode = React.ReactNode;

// Types for mock data
interface MockTradingData {
  positions: any[];
  trades: any[];
  orders: any[];
  balances: Record<string, number>;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
    allTime: number;
  };
}

interface MockAgentData {
  agents: any[];
  strategies: any[];
  executedTrades: any[];
  insights: any[];
}

interface MockData {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar: string;
  };
  trading: MockTradingData;
  agents: MockAgentData;
  system: {
    status: 'online' | 'degraded' | 'maintenance';
    alerts: any[];
    notifications: any[];
    lastUpdated: string;
  };
}

// Mock data for development
const MOCK_DATA: MockData = {
  user: {
    id: 'user-001',
    email: 'trader@tradingfarm.com',
    name: 'Demo Trader',
    role: 'admin',
    avatar: 'https://i.pravatar.cc/150?u=trader',
  },
  trading: {
    positions: [
      { id: 'pos-1', symbol: 'BTC/USD', size: 0.5, entryPrice: 58000, currentPrice: 60000, pnl: 1000, pnlPercentage: 3.45 },
      { id: 'pos-2', symbol: 'ETH/USD', size: 5, entryPrice: 3000, currentPrice: 3200, pnl: 1000, pnlPercentage: 6.67 },
      { id: 'pos-3', symbol: 'SOL/USD', size: 20, entryPrice: 140, currentPrice: 145, pnl: 100, pnlPercentage: 3.57 },
    ],
    trades: [
      { id: 'trade-1', symbol: 'BTC/USD', side: 'buy', size: 0.2, price: 59000, timestamp: new Date(Date.now() - 3600000).toISOString(), pnl: 200 },
      { id: 'trade-2', symbol: 'ETH/USD', side: 'sell', size: 2, price: 3100, timestamp: new Date(Date.now() - 7200000).toISOString(), pnl: -100 },
      { id: 'trade-3', symbol: 'SOL/USD', side: 'buy', size: 10, price: 142, timestamp: new Date(Date.now() - 10800000).toISOString(), pnl: 30 },
    ],
    orders: [
      { id: 'order-1', symbol: 'BTC/USD', side: 'buy', type: 'limit', size: 0.1, price: 57000, status: 'open', createdAt: new Date(Date.now() - 1800000).toISOString() },
      { id: 'order-2', symbol: 'ETH/USD', side: 'sell', type: 'stop', size: 1, price: 2900, status: 'open', createdAt: new Date(Date.now() - 3600000).toISOString() },
    ],
    balances: {
      'USD': 50000,
      'BTC': 1.2,
      'ETH': 15,
      'SOL': 100,
    },
    performance: {
      daily: 2.3,
      weekly: 5.7,
      monthly: 12.4,
      yearly: 67.8,
      allTime: 134.2,
    },
  },
  agents: {
    agents: [
      { id: 'agent-1', name: 'Trend Follower', status: 'active', performance: 12.3, lastTrade: new Date(Date.now() - 3600000).toISOString() },
      { id: 'agent-2', name: 'Mean Reversion', status: 'active', performance: 8.7, lastTrade: new Date(Date.now() - 7200000).toISOString() },
      { id: 'agent-3', name: 'Volatility Harvester', status: 'paused', performance: 15.2, lastTrade: new Date(Date.now() - 86400000).toISOString() },
    ],
    strategies: [
      { id: 'strat-1', name: 'Daily Momentum', description: 'Follows daily momentum signals', performance: 14.3 },
      { id: 'strat-2', name: 'Scalping', description: 'Short-term price movement exploitation', performance: 9.1 },
      { id: 'strat-3', name: 'Swing Trading', description: 'Multi-day position holding based on trends', performance: 19.7 },
    ],
    executedTrades: [
      { id: 'agtrade-1', agentId: 'agent-1', symbol: 'BTC/USD', side: 'buy', size: 0.1, price: 59500, timestamp: new Date(Date.now() - 3600000).toISOString(), pnl: 50 },
      { id: 'agtrade-2', agentId: 'agent-2', symbol: 'ETH/USD', side: 'sell', size: 1, price: 3150, timestamp: new Date(Date.now() - 7200000).toISOString(), pnl: 75 },
      { id: 'agtrade-3', agentId: 'agent-1', symbol: 'SOL/USD', side: 'buy', size: 5, price: 143, timestamp: new Date(Date.now() - 10800000).toISOString(), pnl: 10 },
    ],
    insights: [
      { id: 'insight-1', title: 'BTC showing bullish divergence', description: 'Technical indicators suggest potential upward movement', createdAt: new Date(Date.now() - 3600000).toISOString(), source: 'Technical Analysis' },
      { id: 'insight-2', title: 'Market volatility increasing', description: 'VIX and crypto volatility indices rising', createdAt: new Date(Date.now() - 7200000).toISOString(), source: 'Market Analysis' },
    ],
  },
  system: {
    status: 'online',
    alerts: [
      { id: 'alert-1', level: 'info', message: 'System update scheduled for tomorrow', timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: 'alert-2', level: 'warning', message: 'Increased market volatility detected', timestamp: new Date(Date.now() - 7200000).toISOString() },
    ],
    notifications: [
      { id: 'notif-1', title: 'Trade Executed', message: 'BTC/USD buy order filled', read: false, timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: 'notif-2', title: 'New Strategy Available', message: 'Check out the new Mean Reversion strategy', read: true, timestamp: new Date(Date.now() - 86400000).toISOString() },
    ],
    lastUpdated: new Date().toISOString(),
  },
};

// Create the context
type MockDataContextType = {
  data: MockData;
  refreshData: () => void;
};

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

export function MockDataProvider({ children }: { children: ReactNode }) {
  // Function to regenerate some data to simulate updates
  const refreshData = () => {
    console.log('Refreshing mock data');
    // In a real implementation, this would update parts of the mock data
  };

  return (
    <MockDataContext.Provider value={{ data: MOCK_DATA, refreshData }}>
      {children}
    </MockDataContext.Provider>
  );
}

// Hook to use the mock data
export function useMockData() {
  const context = useContext(MockDataContext);
  if (context === undefined) {
    throw new Error('useMockData must be used within a MockDataProvider');
  }
  return context;
}

// Utility function to get mock data for specific widgets
export function getMockDataForWidget(widgetName: string) {
  switch (widgetName) {
    case 'tradingPositions':
      return MOCK_DATA.trading.positions;
    case 'tradingHistory':
      return MOCK_DATA.trading.trades;
    case 'activeAgents':
      return MOCK_DATA.agents.agents;
    case 'systemStatus':
      return MOCK_DATA.system;
    case 'performance':
      return MOCK_DATA.trading.performance;
    case 'balances':
      return MOCK_DATA.trading.balances;
    default:
      return null;
  }
}
