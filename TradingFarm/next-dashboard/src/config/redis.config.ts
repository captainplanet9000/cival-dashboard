/**
 * Redis Configuration for ElizaOS Integration
 * 
 * This file contains all the configuration settings for Redis
 * used by the ElizaOS Trading Agent System integration.
 */

import { logger } from '@/utils/logger';

// Environment variable access with defaults
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  const value = process.env[key] || defaultValue;
  return value;
};

// Redis connection configuration
export const redisConfig = {
  // Whether Redis is enabled for the application
  enabled: getEnvVar('REDIS_ENABLED', 'false') === 'true',
  
  // Redis connection URL
  url: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
  
  // Redis password (if any)
  password: getEnvVar('REDIS_PASSWORD', ''),
  
  // Connection timeout in milliseconds
  connectionTimeout: parseInt(getEnvVar('REDIS_TIMEOUT', '10000'), 10),
  
  // Redis key prefixes for different components
  keyPrefix: {
    // ElizaOS agent command queue
    commandQueue: 'elizaos:cmd:queue:',
    
    // ElizaOS agent command results
    commandResult: 'elizaos:cmd:result:',
    
    // ElizaOS agent knowledge base
    knowledge: 'elizaos:knowledge:',
    
    // ElizaOS agent coordination
    coordination: 'elizaos:coord:',
    
    // ElizaOS agent state
    agentState: 'elizaos:state:',
    
    // Socket.IO adapters
    socket: 'socket-io:',
  },
  
  // Default TTL values (in seconds)
  defaultTTL: {
    // Command queue items (1 hour)
    command: 60 * 60,
    
    // Command results (24 hours)
    result: 60 * 60 * 24,
    
    // Knowledge items (7 days)
    knowledge: 60 * 60 * 24 * 7,
    
    // Coordination requests (5 minutes)
    coordination: 60 * 5,
    
    // Agent state (30 minutes)
    state: 60 * 30,
  },
  
  // Pub/Sub channels
  channels: {
    // Main coordination channel
    coordination: 'elizaos:coordination',
    
    // Agent channel prefix
    agent: 'elizaos:agent:',
    
    // Market data channel prefix
    market: 'market:',
    
    // Trading events channel
    trading: 'trading:events',
    
    // System events channel
    system: 'system:events',
  },
  
  // Redis connection options
  options: {
    // Enable auto-reconnect
    reconnectOnError: true,
    
    // Max reconnect attempts
    maxReconnectAttempts: 10,
    
    // Initial retry delay in ms
    reconnectDelay: 100,
    
    // Enable TCP keepalive
    enableKeepAlive: true,
    
    // Keepalive delay in ms
    keepAliveDelay: 30000,
  },
  
  // Check if Redis is available and log status
  initialize: async (): Promise<boolean> => {
    if (!redisConfig.enabled) {
      logger.info('Redis is disabled. Using in-memory fallbacks for ElizaOS integration.');
      return false;
    }
    
    try {
      const Redis = (await import('ioredis')).default;
      const client = new Redis(redisConfig.url, {
        password: redisConfig.password,
        connectionTimeout: redisConfig.connectionTimeout,
        lazyConnect: true,
      });
      
      await client.connect();
      logger.info('✅ Redis connection successful. ElizaOS integration using Redis.');
      
      const info = await client.info();
      logger.debug('Redis server info:', info);
      
      await client.quit();
      return true;
    } catch (error) {
      logger.error('❌ Redis connection failed:', error);
      logger.warn('⚠️ ElizaOS integration will use in-memory fallbacks.');
      return false;
    }
  }
};

export default redisConfig;
