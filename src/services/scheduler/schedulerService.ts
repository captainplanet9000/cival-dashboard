import cron from 'node-cron';
import logger from '../../utils/logger';
import { STRATEGY_CONFIG } from '../../config';
import * as queueService from '../queue/queueService';

// Track all scheduled tasks
const scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

// Validate that cron expressions are valid
export function isValidCronExpression(expression: string): boolean {
  return cron.validate(expression);
}

/**
 * Schedule a task to run periodically using a cron expression
 * @param taskId Unique identifier for the task
 * @param cronExpression Cron expression for scheduling
 * @param callback Function to execute when the task runs
 * @param options Optional configuration for the task
 * @returns The scheduled task
 */
export function scheduleTask(
  taskId: string,
  cronExpression: string,
  callback: () => void,
  options: { timezone?: string } = {}
): cron.ScheduledTask {
  // Validate cron expression
  if (!isValidCronExpression(cronExpression)) {
    throw new Error(`Invalid cron expression: ${cronExpression}`);
  }

  // Cancel existing task with same ID if it exists
  if (scheduledTasks.has(taskId)) {
    cancelTask(taskId);
  }

  // Schedule the task
  const task = cron.schedule(
    cronExpression,
    async () => {
      try {
        logger.info(`Running scheduled task: ${taskId}`);
        await callback();
        logger.info(`Completed scheduled task: ${taskId}`);
      } catch (error: any) {
        logger.error(`Error in scheduled task ${taskId}:`, {
          error: error.message,
          stack: error.stack,
        });
      }
    },
    {
      scheduled: true,
      timezone: options.timezone,
    }
  );

  // Store the task
  scheduledTasks.set(taskId, task);
  logger.info(`Scheduled task: ${taskId} with cron: ${cronExpression}`);

  return task;
}

/**
 * Cancel a scheduled task
 * @param taskId Unique identifier for the task
 * @returns true if the task was found and canceled, false otherwise
 */
export function cancelTask(taskId: string): boolean {
  const task = scheduledTasks.get(taskId);
  if (task) {
    task.stop();
    scheduledTasks.delete(taskId);
    logger.info(`Canceled scheduled task: ${taskId}`);
    return true;
  }
  return false;
}

/**
 * Get all scheduled tasks
 * @returns Map of task IDs to scheduled tasks
 */
export function getAllTasks(): Map<string, cron.ScheduledTask> {
  return scheduledTasks;
}

/**
 * Stop all scheduled tasks
 */
export function stopAllTasks(): void {
  scheduledTasks.forEach((task, taskId) => {
    task.stop();
    logger.info(`Stopped scheduled task: ${taskId}`);
  });
  scheduledTasks.clear();
  logger.info('All scheduled tasks stopped');
}

// Initialize default scheduled tasks
export function initializeDefaultTasks(): void {
  logger.info('Initializing default scheduled tasks');

  // Daily market data fetch (midnight every day)
  scheduleTask('daily-market-data', '0 0 * * *', async () => {
    await queueService.queueDataFetch({
      type: 'daily-market-data',
      exchanges: ['bybit', 'coinbase'],
      timeframes: ['1d'],
    });
  });

  // Hourly market data fetch
  scheduleTask('hourly-market-data', '0 * * * *', async () => {
    await queueService.queueDataFetch({
      type: 'hourly-market-data',
      exchanges: ['bybit', 'coinbase'],
      timeframes: ['1h'],
    });
  });

  // System health check (every 15 minutes)
  scheduleTask('system-health-check', '*/15 * * * *', async () => {
    await queueService.queueDataFetch({
      type: 'system-health-check',
    });
  });

  // Clean old cache data (every day at 1 AM)
  scheduleTask('cache-cleanup', '0 1 * * *', async () => {
    await queueService.queueDataFetch({
      type: 'cache-cleanup',
    });
  });

  logger.info('Default scheduled tasks initialized');
}

export default {
  scheduleTask,
  cancelTask,
  getAllTasks,
  stopAllTasks,
  isValidCronExpression,
  initializeDefaultTasks,
}; 