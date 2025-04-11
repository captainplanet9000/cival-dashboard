/**
 * Mock Data Service
 * 
 * This service provides mock data for the application when authentication fails
 * or when the backend services are not available. This ensures the application
 * can still function and demonstrate its capabilities with demo data.
 */

import { v4 as uuidv4 } from 'uuid';

// Mock Farm data
export const mockFarms = [
  { id: 1, name: 'Demo Farm 1', description: 'A demonstration trading farm for testing', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, name: 'Demo Farm 2', description: 'Algorithmic trading demonstration farm', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 3, name: 'Demo Farm 3', description: 'AI-powered trading demo environment', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

// Mock Market data
export const mockMarkets = [
  { id: 1, symbol: 'BTC/USD', name: 'Bitcoin', exchange: 'Binance', created_at: new Date().toISOString() },
  { id: 2, symbol: 'ETH/USD', name: 'Ethereum', exchange: 'Binance', created_at: new Date().toISOString() },
  { id: 3, symbol: 'SOL/USD', name: 'Solana', exchange: 'Binance', created_at: new Date().toISOString() },
  { id: 4, symbol: 'BNB/USD', name: 'Binance Coin', exchange: 'Binance', created_at: new Date().toISOString() },
  { id: 5, symbol: 'XRP/USD', name: 'Ripple', exchange: 'Binance', created_at: new Date().toISOString() },
  { id: 6, symbol: 'ADA/USD', name: 'Cardano', exchange: 'Binance', created_at: new Date().toISOString() },
];

// Mock Strategy Types
export const mockStrategyTypes = [
  'momentum',
  'mean_reversion',
  'trend_following',
  'grid_trading',
  'arbitrage',
  'market_making'
];

// Mock Risk Levels
export const mockRiskLevels = [
  'low',
  'medium',
  'high'
];

// Mock ElizaOS Agents
export const mockElizaAgents = [
  {
    id: uuidv4(),
    name: 'BTC Momentum Trader',
    description: 'AI-powered momentum trading strategy for Bitcoin',
    type: 'eliza',
    status: 'active',
    farmId: 1,
    farm_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      strategy_type: 'momentum',
      risk_level: 'medium',
      target_markets: ['BTC/USD'],
      llm: {
        provider: 'openai',
        model: 'gpt-4o',
      },
      tools: [1, 3, 4],
    }
  },
  {
    id: uuidv4(),
    name: 'ETH Grid Trader',
    description: 'Autonomous grid trading agent for Ethereum',
    type: 'eliza',
    status: 'idle',
    farmId: 2,
    farm_id: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      strategy_type: 'grid_trading',
      risk_level: 'low',
      target_markets: ['ETH/USD'],
      llm: {
        provider: 'anthropic',
        model: 'claude-3-opus',
      },
      tools: [2, 5],
    }
  },
  {
    id: uuidv4(),
    name: 'Multi-Asset Trend Follower',
    description: 'ElizaOS agent for trend following across multiple assets',
    type: 'eliza',
    status: 'paused',
    farmId: 3,
    farm_id: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      strategy_type: 'trend_following',
      risk_level: 'high',
      target_markets: ['BTC/USD', 'ETH/USD', 'SOL/USD'],
      llm: {
        provider: 'openai',
        model: 'gpt-4-turbo',
      },
      tools: [1, 2, 3, 4, 5],
    }
  },
];

// Mock Tools data
export const mockTools = [
  { id: 1, name: 'Market Analysis', description: 'Analyzes market trends and patterns', tool_type: 'analysis' },
  { id: 2, name: 'Data Visualization', description: 'Creates charts and visualizations', tool_type: 'visualization' },
  { id: 3, name: 'Order Execution', description: 'Executes trades automatically', tool_type: 'execution' },
  { id: 4, name: 'Risk Management', description: 'Monitors and manages trading risk', tool_type: 'risk' },
  { id: 5, name: 'News Sentiment', description: 'Analyzes news and social media sentiment', tool_type: 'analysis' },
];

// Mock LLM Models
export const mockLLMModels = {
  'openai': ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  'anthropic': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  'google': ['gemini-pro', 'gemini-flash'],
  'local': ['llama-3-70b', 'llama-3-8b', 'mistral-medium']
};

/**
 * Use this hook to safely fetch data with graceful fallback to mock data
 * @param fetchFunction - The actual data fetching function
 * @param mockData - Mock data to use when fetch fails
 * @returns The result of the fetch function or mock data if fetch fails
 */
export async function fetchWithMockFallback<T>(
  fetchFunction: () => Promise<T>,
  mockData: T
): Promise<T> {
  try {
    // First, try the actual fetch
    return await fetchFunction();
  } catch (error) {
    console.log('Error fetching data, using mock data instead:', error);
    return mockData;
  }
}

// Mock data service functions that simulate API calls
export const mockDataService = {
  // Farms
  getFarms: async () => mockFarms,
  getFarmById: async (id: number) => mockFarms.find(farm => farm.id === id),
  
  // Markets
  getMarkets: async () => mockMarkets,
  
  // Agents
  getElizaAgents: async () => mockElizaAgents,
  getElizaAgentById: async (id: string) => mockElizaAgents.find(agent => agent.id === id),
  createElizaAgent: async (agent: any) => {
    const newAgent = {
      ...agent,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return newAgent;
  },
  updateElizaAgent: async (id: string, updates: any) => {
    const agent = mockElizaAgents.find(a => a.id === id);
    if (!agent) throw new Error('Agent not found');
    return { ...agent, ...updates, updated_at: new Date().toISOString() };
  },
  
  // Tools
  getTools: async () => mockTools,
  
  // Strategies
  getStrategyTypes: async () => mockStrategyTypes,
  
  // Risk Levels
  getRiskLevels: async () => mockRiskLevels,
  
  // LLM Models
  getLLMModels: async () => mockLLMModels,
};
