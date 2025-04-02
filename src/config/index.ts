import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Server configuration
const SERVER_CONFIG = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  apiPrefix: '/api',
};

// Authentication configuration
const AUTH_CONFIG = {
  jwtSecret: process.env.JWT_SECRET || 'trading-farm-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptSaltRounds: 10,
};

// Database configuration
const DATABASE_CONFIG = {
  url: process.env.DATABASE_URL,
  maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
  idleTimeoutMs: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10),
};

// Redis configuration (for caching and job queues)
const REDIS_CONFIG = {
  url: process.env.REDIS_URL,
  enabled: !!process.env.REDIS_URL,
};

// Exchange API configuration
const EXCHANGE_CONFIG = {
  bybit: {
    baseUrl: process.env.BYBIT_API_URL || 'https://api.bybit.com',
    testnet: process.env.BYBIT_TESTNET === 'true',
  },
  coinbase: {
    baseUrl: process.env.COINBASE_API_URL || 'https://api.coinbase.com',
    sandbox: process.env.COINBASE_SANDBOX === 'true',
  },
};

// AI Integration configuration
const AI_CONFIG = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-2.1',
  },
};

// Logging configuration
const LOGGING_CONFIG = {
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.LOG_FORMAT || 'json',
  directory: process.env.LOG_DIRECTORY || 'logs',
};

// Strategy execution configuration
const STRATEGY_CONFIG = {
  defaultIntervalMinutes: parseInt(process.env.DEFAULT_STRATEGY_INTERVAL || '5', 10),
  maxSimultaneousExecutions: parseInt(process.env.MAX_STRATEGY_EXECUTIONS || '50', 10),
  backtestDefaultDays: parseInt(process.env.BACKTEST_DEFAULT_DAYS || '30', 10),
};

export {
  SERVER_CONFIG,
  AUTH_CONFIG,
  DATABASE_CONFIG,
  REDIS_CONFIG,
  EXCHANGE_CONFIG,
  AI_CONFIG,
  LOGGING_CONFIG,
  STRATEGY_CONFIG,
}; 