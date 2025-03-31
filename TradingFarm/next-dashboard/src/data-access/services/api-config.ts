/**
 * API Configuration for Trading Farm Dashboard
 * 
 * This file centralizes all API endpoints and configuration settings
 * used throughout the application.
 */

// Base API endpoints
export const API_CONFIG = {
  // Supabase
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3007',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  
  // ElizaOS
  ELIZAOS_API_URL: process.env.NEXT_PUBLIC_ELIZAOS_API_URL || 'http://localhost:3000/api',
  ELIZAOS_AGENT_PREFIX: process.env.NEXT_PUBLIC_ELIZAOS_AGENT_PREFIX || 'eliza_trading_agent_',
  
  // Trading Farm Backend
  TRADING_FARM_API_URL: process.env.NEXT_PUBLIC_TRADING_FARM_API_URL || 'http://localhost:9386/api',
  
  // Memory Systems
  COGNEE_API_KEY: process.env.NEXT_PUBLIC_COGNEE_API_KEY || '',
  GRAPHITI_API_KEY: process.env.NEXT_PUBLIC_GRAPHITI_API_KEY || '',
  
  // AI Services
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  
  // MCP Services
  MCP_NEON_ENDPOINT: process.env.NEXT_PUBLIC_MCP_NEON_ENDPOINT || 'http://localhost:3003',
  MCP_NEON_API_KEY: process.env.NEXT_PUBLIC_MCP_NEON_API_KEY || '',
  MCP_BROWSERBASE_ENDPOINT: process.env.NEXT_PUBLIC_MCP_BROWSERBASE_ENDPOINT || 'http://localhost:3004',
  MCP_HYPERLIQUID_ENDPOINT: process.env.NEXT_PUBLIC_MCP_HYPERLIQUID_ENDPOINT || 'http://localhost:3001',
  
  // Dashboard Settings
  AUTO_REFRESH_INTERVAL: parseInt(process.env.NEXT_PUBLIC_AUTO_REFRESH_INTERVAL || '30000', 10),
  DEFAULT_CURRENCY: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || 'USD',
};

// API endpoints for specific services
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_CONFIG.TRADING_FARM_API_URL}/auth/login`,
    LOGOUT: `${API_CONFIG.TRADING_FARM_API_URL}/auth/logout`,
    REGISTER: `${API_CONFIG.TRADING_FARM_API_URL}/auth/register`,
    REFRESH: `${API_CONFIG.TRADING_FARM_API_URL}/auth/refresh`,
    ME: `${API_CONFIG.TRADING_FARM_API_URL}/auth/me`,
  },
  
  DASHBOARD: {
    SUMMARY: `${API_CONFIG.TRADING_FARM_API_URL}/dashboard/summary`,
  },
  
  FARMS: {
    BASE: `${API_CONFIG.TRADING_FARM_API_URL}/farms`,
    DETAIL: (id: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/farms/${id}`,
    METRICS: (id: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/farms/${id}/metrics`,
    STRATEGIES: (id: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/farms/${id}/strategies`,
    PERFORMANCE: (id: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/farms/${id}/performance`,
    RISK_PROFILE: (id: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/farms/${id}/risk-profile`,
  },
  
  AGENTS: {
    BASE: `${API_CONFIG.TRADING_FARM_API_URL}/agents`,
    DETAIL: (id: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/agents/${id}`,
    BY_FARM: (farmId: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/farms/${farmId}/agents`,
    ACTIONS: (id: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/agents/${id}/actions`,
    MESSAGES: (id: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/agents/${id}/messages`,
  },
  
  ORDERS: {
    BASE: `${API_CONFIG.TRADING_FARM_API_URL}/orders`,
    DETAIL: (id: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/orders/${id}`,
    BY_FARM: (farmId: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/farms/${farmId}/orders`,
    BY_AGENT: (agentId: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/orders?agentId=${agentId}`,
  },
  
  TRADES: {
    BASE: `${API_CONFIG.TRADING_FARM_API_URL}/trades`,
    DETAIL: (id: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/trades/${id}`,
    BY_FARM: (farmId: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/farms/${farmId}/trades`,
    BY_AGENT: (agentId: number | string) => `${API_CONFIG.TRADING_FARM_API_URL}/trades?agentId=${agentId}`,
  },
  
  ANALYTICS: {
    PERFORMANCE: `${API_CONFIG.TRADING_FARM_API_URL}/analytics/performance`,
    TRADE_METRICS: `${API_CONFIG.TRADING_FARM_API_URL}/analytics/trade-metrics`,
    TRADE_DISTRIBUTION: `${API_CONFIG.TRADING_FARM_API_URL}/analytics/trade-distribution`,
    RISK_METRICS: `${API_CONFIG.TRADING_FARM_API_URL}/analytics/risk-metrics`,
    PNL_HISTORY: `${API_CONFIG.TRADING_FARM_API_URL}/analytics/pnl-history`,
  },
  
  ELIZAOS: {
    AGENTS: `${API_CONFIG.ELIZAOS_API_URL}/agents`,
    AGENT_DETAIL: (id: string) => `${API_CONFIG.ELIZAOS_API_URL}/agents/${id}`,
    COMMANDS: `${API_CONFIG.ELIZAOS_API_URL}/commands`,
    COMMAND_DETAIL: (id: string) => `${API_CONFIG.ELIZAOS_API_URL}/commands/${id}`,
  },
};

// API request headers
export const API_HEADERS = {
  JSON: {
    'Content-Type': 'application/json',
  },
  AUTH: (token: string) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }),
};

// Default request parameters
export const DEFAULT_PARAMS = {
  PAGE_SIZE: 20,
  TIMEOUT: 10000, // 10 seconds
};

// API version
export const API_VERSION = 'v1'; 