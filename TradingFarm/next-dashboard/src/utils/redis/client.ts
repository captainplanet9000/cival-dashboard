import Redis from 'ioredis';
import { TRADING_EVENTS } from '@/constants/events';

// Environment variables with fallbacks
const REDIS_URL = process.env.REDIS_URL || 'redis://default:IVBKBkEZFyYvR1mL3krjDEYTkmvC0S57@redis-14637.c289.us-west-1-2.ec2.redns.redis-cloud.com:14637';

// Alternative configuration using individual connection parameters
const REDIS_HOST = process.env.REDIS_HOST || 'redis-14637.c289.us-west-1-2.ec2.redns.redis-cloud.com';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '14637', 10);
const REDIS_USERNAME = process.env.REDIS_USERNAME || 'default';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'IVBKBkEZFyYvR1mL3krjDEYTkmvC0S57';

// Redis client options
const options = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  username: REDIS_USERNAME,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    // Exponential backoff with cap
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  connectTimeout: 10000, // 10 seconds
  // Redis Stack (v7.4.2) specific features
  enableAutoPipelining: true, 
  enableOfflineQueue: true,
  // Log connection events in development
  showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
};

// Singleton pattern for Redis client
let client: Redis | null = null;

/**
 * Get a Redis client instance (singleton)
 */
export function getRedisClient(): Redis {
  if (!client) {
    // Use URL string if available, otherwise use individual connection parameters
    client = REDIS_URL ? new Redis(REDIS_URL, options) : new Redis(options);
    
    // Setup event handlers
    client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    
    client.on('connect', () => {
      console.log('Connected to Redis');
    });
    
    client.on('ready', () => {
      console.log('Redis client ready');
    });
    
    client.on('close', () => {
      console.log('Redis connection closed');
    });
  }
  
  return client;
}

/**
 * Close the Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    console.log('Redis connection closed gracefully');
  }
}

/**
 * Create a new unique Redis client (for cases where you need a separate connection)
 */
export function createNewRedisClient(): Redis {
  const newClient = new Redis(REDIS_URL, options);
  return newClient;
}
