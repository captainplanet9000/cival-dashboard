/**
 * Configuration Module
 * 
 * Centralizes configuration settings for the Supabase MCP server.
 * Loads environment variables and provides validation.
 */

require('dotenv').config();

/**
 * Server configuration
 * @type {Object}
 */
const SERVER_CONFIG = {
  // Environment settings
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.SUPABASE_MCP_PORT || '3007', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Supabase connection settings
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_API_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Feature flags
  enableDataIntegration: process.env.ENABLE_DATA_INTEGRATION === 'true',
  enableAgentCooperation: process.env.ENABLE_AGENT_COOPERATION === 'true',
  enableStrategyPersistence: process.env.ENABLE_STRATEGY_PERSISTENCE === 'true',
  enableRealtimeSync: process.env.ENABLE_REALTIME_SYNC === 'true',
  
  // Security settings
  corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  
  // ElizaOS integration
  elizaOsApiUrl: process.env.ELIZAOS_API_URL || 'http://localhost:3000/api',
  
  // Agent coordinator settings
  defaultDecisionMode: process.env.DEFAULT_DECISION_MODE || 'democratic',
  coordinatorAgentId: process.env.COORDINATOR_AGENT_ID || 'central_coordinator',
  
  // Message queue settings
  messageExpirationSecs: parseInt(process.env.MESSAGE_EXPIRATION_SECS || '86400', 10), // 24 hours
  messageHistoryRetentionDays: parseInt(process.env.MESSAGE_HISTORY_RETENTION_DAYS || '30', 10),
  cleanupIntervalMins: parseInt(process.env.CLEANUP_INTERVAL_MINS || '60', 10)
};

/**
 * Database table names
 * @type {Object}
 */
const TABLES = {
  agents: 'agent_registry',
  strategies: 'strategies',
  signals: 'signals',
  positions: 'positions',
  orders: 'orders',
  agentCooperation: 'agent_cooperation',
  messageQueue: 'message_queue',
  messageHistory: 'message_history',
  coordinatorConfig: 'coordinator_config'
};

/**
 * Supabase specific configuration
 * @type {Object}
 */
const SUPABASE_CONFIG = {
  url: process.env.SUPABASE_URL,
  apiKey: process.env.SUPABASE_API_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  databaseUrl: process.env.DATABASE_URL
};

/**
 * Validate the configuration settings
 * @returns {Array} Array of error messages, empty if valid
 */
function validateConfig() {
  const errors = [];
  
  // Check required Supabase settings
  if (!SERVER_CONFIG.supabaseUrl) {
    errors.push('SUPABASE_URL is required');
  }
  
  if (!SERVER_CONFIG.supabaseAnonKey) {
    errors.push('SUPABASE_API_KEY is required');
  }
  
  // Check for valid port
  if (isNaN(SERVER_CONFIG.port) || SERVER_CONFIG.port < 1 || SERVER_CONFIG.port > 65535) {
    errors.push('Invalid port number');
  }
  
  // Check for valid rate limit settings
  if (isNaN(SERVER_CONFIG.rateLimitMax) || SERVER_CONFIG.rateLimitMax < 1) {
    errors.push('Invalid RATE_LIMIT_MAX');
  }
  
  if (isNaN(SERVER_CONFIG.rateLimitWindowMs) || SERVER_CONFIG.rateLimitWindowMs < 1000) {
    errors.push('Invalid RATE_LIMIT_WINDOW_MS (must be at least 1000ms)');
  }
  
  // Check message queue settings
  if (isNaN(SERVER_CONFIG.messageExpirationSecs) || SERVER_CONFIG.messageExpirationSecs < 60) {
    errors.push('Invalid MESSAGE_EXPIRATION_SECS (must be at least 60 seconds)');
  }
  
  if (isNaN(SERVER_CONFIG.messageHistoryRetentionDays) || SERVER_CONFIG.messageHistoryRetentionDays < 1) {
    errors.push('Invalid MESSAGE_HISTORY_RETENTION_DAYS (must be at least 1 day)');
  }
  
  if (isNaN(SERVER_CONFIG.cleanupIntervalMins) || SERVER_CONFIG.cleanupIntervalMins < 5) {
    errors.push('Invalid CLEANUP_INTERVAL_MINS (must be at least 5 minutes)');
  }
  
  return errors;
}

module.exports = {
  SERVER_CONFIG,
  TABLES,
  SUPABASE_CONFIG,
  validateConfig
}; 