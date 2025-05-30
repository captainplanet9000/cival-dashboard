/**
 * Bull Queue Configuration
 * Centralizes all Bull queue configurations for the Trading Farm Dashboard
 */
import Bull from 'bull';

// Redis connection configuration - reuse Redis Cloud connection
export const REDIS_CONFIG: Bull.QueueOptions = {
  redis: {
    host: process.env.REDIS_HOST || 'redis-14325.c60.us-west-1-2.ec2.redns.redis-cloud.com',
    port: parseInt(process.env.REDIS_PORT || '14325', 10),
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD || 'ri5RqGg7aYiwQ4hQn809DFZPoVA18j2b',
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    connectTimeout: 10000,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Initial delay in ms
    },
    removeOnComplete: {
      age: 60 * 60 * 24 * 7, // Remove jobs after 1 week
      count: 1000, // Keep the latest 1000 completed jobs
    },
    removeOnFail: {
      age: 60 * 60 * 24 * 14, // Keep failed jobs for 2 weeks
      count: 500, // Keep the latest 500 failed jobs
    },
  },
  settings: {
    // Maximum number of jobs processed concurrently by each worker
    concurrency: 10,
    // Max number of retries for a stalled job
    stalledInterval: 30000, // 30 seconds
    maxStalledCount: 3,
  },
};

// Queue names
export enum QueueNames {
  DATA_PROCESSING = 'data-processing',
  TRADE_EXECUTION = 'trade-execution',
  MARKET_SYNC = 'market-sync',
  NOTIFICATION = 'notification',
  REPORT_GENERATION = 'report-generation',
  POSITION_RECONCILIATION = 'position-reconciliation',
  AGENT_TASKS = 'agent-tasks',
}

// Queue configuration map with specific settings for each queue
export const QUEUE_CONFIGS: Record<QueueNames, Bull.QueueOptions> = {
  [QueueNames.DATA_PROCESSING]: {
    ...REDIS_CONFIG,
    settings: {
      ...REDIS_CONFIG.settings,
      concurrency: 5, // Limit concurrency for data processing
    },
  },
  [QueueNames.TRADE_EXECUTION]: {
    ...REDIS_CONFIG,
    defaultJobOptions: {
      ...REDIS_CONFIG.defaultJobOptions,
      attempts: 5, // More retries for trade execution
      timeout: 60000, // 1 minute timeout
      priority: 1, // High priority
    },
  },
  [QueueNames.MARKET_SYNC]: {
    ...REDIS_CONFIG,
    settings: {
      ...REDIS_CONFIG.settings,
      concurrency: 2, // Lower concurrency for market syncing
    },
  },
  [QueueNames.NOTIFICATION]: {
    ...REDIS_CONFIG,
    defaultJobOptions: {
      ...REDIS_CONFIG.defaultJobOptions,
      attempts: 10, // More retries for notifications
      timeout: 10000, // 10 second timeout
    },
  },
  [QueueNames.REPORT_GENERATION]: {
    ...REDIS_CONFIG,
    defaultJobOptions: {
      ...REDIS_CONFIG.defaultJobOptions,
      timeout: 300000, // 5 minute timeout for reports
    },
  },
  [QueueNames.POSITION_RECONCILIATION]: {
    ...REDIS_CONFIG,
    defaultJobOptions: {
      ...REDIS_CONFIG.defaultJobOptions,
      attempts: 5,
      timeout: 120000, // 2 minute timeout
    },
  },
  [QueueNames.AGENT_TASKS]: {
    ...REDIS_CONFIG,
    settings: {
      ...REDIS_CONFIG.settings,
      concurrency: 3, // Limit concurrency for agent tasks
    },
  },
};
