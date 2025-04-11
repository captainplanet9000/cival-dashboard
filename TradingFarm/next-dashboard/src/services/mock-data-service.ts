/**
 * Mock Data Service
 * 
 * Provides fallback data when API calls fail or during development
 */

/**
 * Mock ElizaOS agents for fallback
 */
export const mockElizaAgents = [
  {
    id: 'eliza-1',
    name: 'Market Analyst',
    description: 'Analyzes market trends and opportunities',
    status: 'active',
    type: 'analytical',
    strategy_type: 'trend_following',
    risk_level: 'medium',
    target_markets: ['BTC/USD', 'ETH/USD'],
    execution_mode: 'dry-run',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_fallback: true,
    performance: {
      trades: 24,
      win_rate: 67,
      profit_loss: 8.2
    }
  },
  {
    id: 'eliza-2',
    name: 'DeFi Explorer',
    description: 'Specializes in DeFi protocols and yield opportunities',
    status: 'active',
    type: 'research',
    strategy_type: 'arbitrage',
    risk_level: 'medium',
    target_markets: ['ETH/USD', 'SOL/USD'],
    execution_mode: 'dry-run',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_fallback: true,
    performance: {
      trades: 16,
      win_rate: 72,
      profit_loss: 5.9
    }
  },
  {
    id: 'eliza-3',
    name: 'Trading Assistant',
    description: 'Executes trades based on strategy signals',
    status: 'paused',
    type: 'trading',
    strategy_type: 'breakout',
    risk_level: 'high',
    target_markets: ['BTC/USD', 'SOL/USD'],
    execution_mode: 'dry-run',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_fallback: true,
    performance: {
      trades: 35,
      win_rate: 58,
      profit_loss: 12.3
    }
  }
];

/**
 * Mock farms data
 */
export const mockFarms = [
  {
    id: 999,
    name: 'Development Farm',
    description: 'A mock farm for development purposes',
    user_id: 'demo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'active',
    config: {
      default_risk_level: 'medium',
      auto_balance: true
    }
  },
  {
    id: 998,
    name: 'Test Farm',
    description: 'A test farm for development purposes',
    user_id: 'demo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'active',
    config: {
      default_risk_level: 'low',
      auto_balance: false
    }
  }
];

/**
 * Mock markets data
 */
export const mockMarkets = [
  {
    id: 1,
    symbol: 'BTC/USD',
    base_currency: 'BTC',
    quote_currency: 'USD',
    exchange_id: 'bybit',
    is_active: true
  },
  {
    id: 2,
    symbol: 'ETH/USD',
    base_currency: 'ETH',
    quote_currency: 'USD',
    exchange_id: 'bybit',
    is_active: true
  },
  {
    id: 3,
    symbol: 'SOL/USD',
    base_currency: 'SOL',
    quote_currency: 'USD',
    exchange_id: 'bybit',
    is_active: true
  },
  {
    id: 4,
    symbol: 'BNB/USD',
    base_currency: 'BNB',
    quote_currency: 'USD',
    exchange_id: 'binance',
    is_active: true
  },
  {
    id: 5,
    symbol: 'XRP/USD',
    base_currency: 'XRP',
    quote_currency: 'USD',
    exchange_id: 'binance',
    is_active: true
  }
];

/**
 * Mock tools data
 */
export const mockTools = [
  {
    id: 'market_data',
    name: 'Market Data',
    description: 'Access to real-time and historical market data',
    category: 'data',
    permissions: ['read'],
    config: {}
  },
  {
    id: 'trading',
    name: 'Trading',
    description: 'Place and manage orders',
    category: 'action',
    permissions: ['write'],
    config: {}
  },
  {
    id: 'analysis',
    name: 'Analysis',
    description: 'Perform technical and fundamental analysis',
    category: 'compute',
    permissions: ['read'],
    config: {}
  },
  {
    id: 'news',
    name: 'News',
    description: 'Access to news and social media data',
    category: 'data',
    permissions: ['read'],
    config: {}
  },
  {
    id: 'notification',
    name: 'Notification',
    description: 'Send notifications to users',
    category: 'action',
    permissions: ['write'],
    config: {}
  },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Access to economic calendar data',
    category: 'data',
    permissions: ['read'],
    config: {}
  }
];

/**
 * Mock strategy types
 */
export const mockStrategyTypes = [
  { id: 1, name: 'momentum' },
  { id: 2, name: 'trend_following' },
  { id: 3, name: 'mean_reversion' },
  { id: 4, name: 'breakout' },
  { id: 5, name: 'market_making' },
  { id: 6, name: 'arbitrage' }
];

/**
 * Mock risk levels
 */
export const mockRiskLevels = [
  { id: 1, name: 'low' },
  { id: 2, name: 'medium' },
  { id: 3, name: 'high' }
];

/**
 * Mock agents data
 */
export const mockAgents = [
  {
    id: 'mock-1',
    name: 'Demo Bitcoin Trader',
    description: 'A demo agent for trading Bitcoin',
    farm_id: 999,
    farm_name: 'Development Farm',
    type: 'trading',
    strategy_type: 'momentum',
    risk_level: 'medium',
    status: 'active',
    execution_mode: 'dry-run',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'demo',
    config: {
      target_markets: ['BTC/USD'],
      capital_allocation: 10,
      leverage: 1,
      auto_start: true
    },
    performance: {
      trades: 25,
      win_rate: 68,
      profit_loss: 4.2
    }
  },
  {
    id: 'mock-2',
    name: 'Demo Ethereum Analyst',
    description: 'A demo agent for analyzing Ethereum',
    farm_id: 999,
    farm_name: 'Development Farm',
    type: 'analytical',
    strategy_type: 'trend_following',
    risk_level: 'low',
    status: 'paused',
    execution_mode: 'dry-run',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'demo',
    config: {
      target_markets: ['ETH/USD'],
      capital_allocation: 5,
      leverage: 1,
      auto_start: false
    },
    performance: {
      trades: 12,
      win_rate: 75,
      profit_loss: 2.8
    }
  }
];

/**
 * Mock AI models
 */
export const mockModels = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Latest GPT-4 model optimized for agent use',
    capabilities: ['reasoning', 'analysis', 'conversation'],
    contextSize: 128000,
    isAvailable: true
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'High-performance Claude model for complex tasks',
    capabilities: ['reasoning', 'analysis', 'research'],
    contextSize: 200000,
    isAvailable: true
  },
  {
    id: 'local-llama',
    name: 'Local Llama',
    provider: 'local',
    description: 'Self-hosted Llama model for privacy',
    capabilities: ['reasoning', 'conversation'],
    contextSize: 32000,
    isAvailable: process.env.NODE_ENV === 'development'
  }
];
