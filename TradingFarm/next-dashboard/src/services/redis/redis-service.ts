import Redis from 'ioredis';
import { logger } from '@/utils/logger';

// Redis configuration with defaults
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

// Redis connection options
const redisOptions = {
  password: REDIS_PASSWORD,
  lazyConnect: true,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    logger.info(`Redis connection retry in ${delay}ms (attempt ${times})`);
    return delay;
  }
};

/**
 * Singleton Redis client for the application
 */
class RedisService {
  private static instance: RedisService;
  private client: Redis | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private isEnabled: boolean = REDIS_ENABLED;

  private constructor() {
    if (this.isEnabled) {
      this.initializeRedis();
    } else {
      logger.warn('Redis is disabled. Using in-memory fallbacks.');
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Initialize Redis connections
   */
  private async initializeRedis() {
    try {
      // Main client for general operations
      this.client = new Redis(REDIS_URL, redisOptions);
      // Dedicated clients for pub/sub to avoid blocking
      this.pubClient = new Redis(REDIS_URL, redisOptions);
      this.subClient = new Redis(REDIS_URL, redisOptions);

      // Connect all clients
      await this.client.connect();
      await this.pubClient.connect();
      await this.subClient.connect();

      logger.info('Redis connections established successfully');
      
      // Monitor connection status
      this.setupConnectionMonitoring();
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Monitor Redis connections
   */
  private setupConnectionMonitoring() {
    const monitorClient = (client: Redis, name: string) => {
      client.on('error', (err) => {
        logger.error(`Redis ${name} error:`, err);
      });
      
      client.on('reconnecting', () => {
        logger.info(`Redis ${name} reconnecting...`);
      });
      
      client.on('connect', () => {
        logger.info(`Redis ${name} connected`);
      });
    };

    if (this.client) monitorClient(this.client, 'main');
    if (this.pubClient) monitorClient(this.pubClient, 'publisher');
    if (this.subClient) monitorClient(this.subClient, 'subscriber');
  }

  /**
   * Get the Redis client
   */
  public getClient(): Redis | null {
    return this.client;
  }

  /**
   * Get the Redis publisher client
   */
  public getPublisher(): Redis | null {
    return this.pubClient;
  }

  /**
   * Get the Redis subscriber client
   */
  public getSubscriber(): Redis | null {
    return this.subClient;
  }

  /**
   * Check if Redis is enabled and connected
   */
  public isReady(): boolean {
    return this.isEnabled && !!this.client && this.client.status === 'ready';
  }

  /**
   * Gracefully disconnect all Redis clients
   */
  public async disconnect() {
    if (this.client) await this.client.quit();
    if (this.pubClient) await this.pubClient.quit();
    if (this.subClient) await this.subClient.quit();
    
    logger.info('Redis connections closed');
  }
}

// Export the Redis service singleton
export const redisService = RedisService.getInstance();

// Export a convenience function to get the Redis client
export const getRedisClient = () => redisService.getClient();
