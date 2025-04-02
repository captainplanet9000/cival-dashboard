import Bull from 'bull';
import { REDIS_CONFIG } from '../../config';
import logger from '../../utils/logger';

// Initialize queue options
const bullOptions = {
  redis: REDIS_CONFIG.url || undefined,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100, // Keep only the last 100 completed jobs
    removeOnFail: 200, // Keep only the last 200 failed jobs
  },
};

// Create queue instances
const backtestQueue = new Bull('backtest', bullOptions);
const strategyQueue = new Bull('strategy', bullOptions);
const dataFetchQueue = new Bull('data-fetch', bullOptions);
const alertQueue = new Bull('alerts', bullOptions);

// Setup error handling for all queues
const queues = [backtestQueue, strategyQueue, dataFetchQueue, alertQueue];
queues.forEach((queue) => {
  queue.on('error', (error) => {
    logger.error(`Queue ${queue.name} error:`, error);
  });

  queue.on('failed', (job, error) => {
    logger.error(`Job ${job.id} in queue ${queue.name} failed:`, {
      jobId: job.id,
      queue: queue.name,
      error: error.message,
      stack: error.stack,
      data: job.data,
      attempts: job.attemptsMade,
    });
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} in queue ${queue.name} stalled`, {
      jobId: job.id,
      queue: queue.name,
    });
  });
});

// Log queue initialization
logger.info('Bull job queues initialized', {
  queues: queues.map((q) => q.name),
  redisEnabled: !!REDIS_CONFIG.url,
});

/**
 * Queue a backtest job
 */
export async function queueBacktest(data: any, options?: Bull.JobOptions): Promise<Bull.Job<any>> {
  return backtestQueue.add(data, options);
}

/**
 * Queue a strategy execution job
 */
export async function queueStrategyExecution(data: any, options?: Bull.JobOptions): Promise<Bull.Job<any>> {
  return strategyQueue.add(data, options);
}

/**
 * Queue a data fetch job
 */
export async function queueDataFetch(data: any, options?: Bull.JobOptions): Promise<Bull.Job<any>> {
  return dataFetchQueue.add(data, options);
}

/**
 * Queue an alert job
 */
export async function queueAlert(data: any, options?: Bull.JobOptions): Promise<Bull.Job<any>> {
  return alertQueue.add(data, options);
}

/**
 * Get active jobs for a specific queue
 */
export async function getActiveJobs(queueName: string): Promise<Bull.Job[]> {
  const queue = queues.find((q) => q.name === queueName);
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }
  return queue.getActive();
}

/**
 * Process backtest jobs
 */
export function processBacktests(handler: Bull.ProcessCallbackFunction<any>): void {
  backtestQueue.process(handler);
}

/**
 * Process strategy execution jobs
 */
export function processStrategyExecutions(handler: Bull.ProcessCallbackFunction<any>): void {
  strategyQueue.process(handler);
}

/**
 * Process data fetch jobs
 */
export function processDataFetch(handler: Bull.ProcessCallbackFunction<any>): void {
  dataFetchQueue.process(handler);
}

/**
 * Process alert jobs
 */
export function processAlerts(handler: Bull.ProcessCallbackFunction<any>): void {
  alertQueue.process(handler);
}

/**
 * Shutdown all queues gracefully
 */
export async function shutdownQueues(): Promise<void> {
  logger.info('Shutting down Bull job queues');
  const closePromises = queues.map((queue) => queue.close());
  await Promise.all(closePromises);
  logger.info('All Bull job queues closed');
}

export {
  backtestQueue,
  strategyQueue,
  dataFetchQueue,
  alertQueue,
}; 