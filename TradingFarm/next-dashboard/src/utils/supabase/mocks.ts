/**
 * Mock Supabase Data
 * This provides fallback data when working without a Supabase connection
 */

import { User } from '@supabase/supabase-js';

// Mock user data
export const mockUsers: User[] = [
  {
    id: 'mock-user-1',
    email: 'demo@tradingfarm.com',
    app_metadata: {
      provider: 'email',
    },
    user_metadata: {
      full_name: 'Demo User',
    },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as unknown as User,
];

// Mock farm data
export const mockFarms = [
  {
    id: 'farm-1',
    name: 'Alpha Trading',
    owner_id: 'mock-user-1',
    description: 'Algo trading farm with multi-asset strategies',
    status: 'active',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z',
    settings: {
      theme: 'dark',
      notifications: true,
    },
    subscription_level: 'pro',
  },
  {
    id: 'farm-2',
    name: 'Beta Strategies',
    owner_id: 'mock-user-1',
    description: 'Experimental strategies with ML-based signals',
    status: 'active',
    created_at: '2025-02-20T00:00:00Z',
    updated_at: '2025-03-28T00:00:00Z',
    settings: {
      theme: 'light',
      notifications: true,
    },
    subscription_level: 'basic',
  },
];

// Mock layouts data
export const mockLayouts = [
  {
    id: 1,
    farm_id: 'farm-1',
    name: 'Default Dashboard',
    layout: {
      desktop: [
        { i: 'portfolio-overview', x: 0, y: 0, w: 12, h: 10 },
        { i: 'performance-chart', x: 0, y: 10, w: 8, h: 20 },
        { i: 'recent-alerts', x: 8, y: 10, w: 4, h: 20 },
      ],
      mobile: [
        { i: 'portfolio-overview', x: 0, y: 0, w: 12, h: 10 },
        { i: 'performance-chart', x: 0, y: 10, w: 12, h: 20 },
        { i: 'recent-alerts', x: 0, y: 30, w: 12, h: 20 },
      ],
    },
    is_default: true,
    created_at: '2025-03-01T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z',
  },
];

// Mock agents data
export const mockAgents = [
  {
    id: 'agent-1',
    farm_id: 'farm-1',
    name: 'TrendBot',
    description: 'Trend following strategy specialist',
    status: 'active',
    type: 'trading',
    capabilities: ['market_analysis', 'trade_execution', 'risk_management'],
    model: 'gpt-4',
    created_at: '2025-03-10T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z',
    configuration: {
      personality: 'analytical',
      risk_tolerance: 'medium',
      allowed_markets: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
    },
  },
  {
    id: 'agent-2',
    farm_id: 'farm-1',
    name: 'MarketInsight',
    description: 'Market analysis and research assistant',
    status: 'active',
    type: 'research',
    capabilities: ['market_analysis', 'sentiment_analysis', 'report_generation'],
    model: 'claude-3-sonnet',
    created_at: '2025-03-15T00:00:00Z',
    updated_at: '2025-03-30T00:00:00Z',
    configuration: {
      data_sources: ['news', 'social_media', 'technical_indicators'],
      update_frequency: 'hourly',
    },
  },
];

// Mock vault data
export const mockVaultMaster = [
  {
    id: 1,
    owner_id: 'mock-user-1',
    name: 'Primary Vault',
    description: 'Main trading vault for Alpha farm',
    type: 'trading',
    status: 'active',
    farm_id: 'farm-1',
    created_at: '2025-01-20T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z',
    requires_approval: true,
    approval_threshold: 2,
    accounts: [
      {
        id: 101,
        vault_id: 1,
        name: 'BTC Holdings',
        currency: 'BTC',
        balance: 1.25,
        reserved_balance: 0,
        account_type: 'asset',
        status: 'active',
      },
      {
        id: 102,
        vault_id: 1,
        name: 'ETH Holdings',
        currency: 'ETH',
        balance: 15.75,
        reserved_balance: 0,
        account_type: 'asset',
        status: 'active',
      },
      {
        id: 103,
        vault_id: 1,
        name: 'USD Reserve',
        currency: 'USD',
        balance: 25000,
        reserved_balance: 1000,
        account_type: 'fiat',
        status: 'active',
      },
    ],
  },
  {
    id: 2,
    owner_id: 'mock-user-1',
    name: 'Stablecoin Vault',
    description: 'Stablecoin holdings for Beta farm',
    type: 'reserve',
    status: 'active',
    farm_id: 'farm-2',
    created_at: '2025-02-25T00:00:00Z',
    updated_at: '2025-03-28T00:00:00Z',
    requires_approval: false,
    approval_threshold: 1,
    accounts: [
      {
        id: 201,
        vault_id: 2,
        name: 'USDC Holdings',
        currency: 'USDC',
        balance: 10000,
        reserved_balance: 0,
        account_type: 'stablecoin',
        status: 'active',
      },
      {
        id: 202,
        vault_id: 2,
        name: 'USDT Holdings',
        currency: 'USDT',
        balance: 5000,
        reserved_balance: 0,
        account_type: 'stablecoin',
        status: 'active',
      },
    ],
  },
];

// Mock vault transactions
export const mockVaultTransactions = [
  {
    id: 1001,
    account_id: 101,
    reference_id: 'tx-btc-1001',
    type: 'deposit',
    amount: 0.5,
    currency: 'BTC',
    status: 'completed',
    approval_status: 'approved',
    timestamp: '2025-03-15T10:30:00Z',
    note: 'Initial deposit',
  },
  {
    id: 1002,
    account_id: 103,
    reference_id: 'tx-usd-1002',
    type: 'withdrawal',
    amount: 5000,
    currency: 'USD',
    status: 'completed',
    approval_status: 'approved',
    timestamp: '2025-03-20T14:45:00Z',
    note: 'Capital allocation',
  },
  {
    id: 1003,
    account_id: 102,
    reference_id: 'tx-eth-1003',
    type: 'deposit',
    amount: 5.5,
    currency: 'ETH',
    status: 'completed',
    approval_status: 'approved',
    timestamp: '2025-03-25T09:15:00Z',
    note: 'Strategy funding',
  },
  {
    id: 1004,
    account_id: 101,
    reference_id: 'tx-btc-1004',
    type: 'transfer',
    amount: 0.1,
    currency: 'BTC',
    status: 'pending',
    approval_status: 'pending',
    timestamp: '2025-04-02T16:20:00Z',
    note: 'Transfer to exchange',
  },
];

// Mock balance summaries
export const mockBalanceSummary = [
  {
    currency: 'BTC',
    total_balance: 1.25,
    usd_value: 75000,
    last_updated: '2025-04-03T00:00:00Z',
  },
  {
    currency: 'ETH',
    total_balance: 15.75,
    usd_value: 31500,
    last_updated: '2025-04-03T00:00:00Z',
  },
  {
    currency: 'USD',
    total_balance: 25000,
    usd_value: 25000,
    last_updated: '2025-04-03T00:00:00Z',
  },
  {
    currency: 'USDC',
    total_balance: 10000,
    usd_value: 10000,
    last_updated: '2025-04-03T00:00:00Z',
  },
  {
    currency: 'USDT',
    total_balance: 5000,
    usd_value: 5000,
    last_updated: '2025-04-03T00:00:00Z',
  },
];

// Mock market data
export const mockMarkets = [
  {
    id: 'BTC-USD',
    base_currency: 'BTC',
    quote_currency: 'USD',
    price: 60000,
    change_24h: 2.5,
    volume_24h: 1200000000,
    high_24h: 61500,
    low_24h: 59000,
    last_updated: '2025-04-03T00:00:00Z',
  },
  {
    id: 'ETH-USD',
    base_currency: 'ETH',
    quote_currency: 'USD',
    price: 2000,
    change_24h: 1.8,
    volume_24h: 600000000,
    high_24h: 2050,
    low_24h: 1950,
    last_updated: '2025-04-03T00:00:00Z',
  },
  {
    id: 'SOL-USD',
    base_currency: 'SOL',
    quote_currency: 'USD',
    price: 120,
    change_24h: 3.2,
    volume_24h: 300000000,
    high_24h: 125,
    low_24h: 115,
    last_updated: '2025-04-03T00:00:00Z',
  },
];

// Helper function to simulate table query responses
export function mockTableResponse<T>(data: T[], delay = 500) {
  return new Promise<{ data: T[]; error: null }>(resolve => {
    setTimeout(() => {
      resolve({ data, error: null });
    }, delay);
  });
}

// Helper function to simulate error responses
export function mockErrorResponse(message = 'Mock error', delay = 500) {
  return new Promise<{ data: null; error: { message: string } }>(resolve => {
    setTimeout(() => {
      resolve({ data: null, error: { message } });
    }, delay);
  });
}
