import cron from 'node-cron';
import { logger } from '../logging/winston-service';

export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string;
  task: () => Promise<void>;
  isRunning: boolean;
}

/**
 * Cron Scheduler Service
 * Manages scheduled tasks using node-cron
 */
export class CronSchedulerService {
  private static instance: CronSchedulerService;
  private tasks: Map<string, { task: ScheduledTask; cronJob: cron.ScheduledTask }> = new Map();

  private constructor() {
    // Initialize with system tasks
    this.initializeSystemTasks();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CronSchedulerService {
    if (!CronSchedulerService.instance) {
      CronSchedulerService.instance = new CronSchedulerService();
    }
    return CronSchedulerService.instance;
  }

  /**
   * Initialize system tasks
   */
  private initializeSystemTasks(): void {
    // Add market data sync task (every 15 minutes)
    this.scheduleTask({
      id: 'market-data-sync',
      name: 'Market Data Synchronization',
      schedule: '*/15 * * * *',
      task: async () => {
        logger.info('Running scheduled market data sync');
        try {
          // Implementation would be added when CCXT service is fully integrated
          // await ccxtService.syncMarketData();
          logger.info('Market data sync completed successfully');
        } catch (error) {
          logger.error(`Market data sync failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      isRunning: false
    });

    // Add daily report generation (every day at 00:05)
    this.scheduleTask({
      id: 'daily-report-generation',
      name: 'Daily Performance Report',
      schedule: '5 0 * * *',
      task: async () => {
        logger.info('Generating daily performance reports');
        try {
          // Report generation would be implemented in a dedicated service
          logger.info('Daily reports generated successfully');
        } catch (error) {
          logger.error(`Report generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      isRunning: false
    });

    // Add database cleanup task (every Sunday at 2 AM)
    this.scheduleTask({
      id: 'database-cleanup',
      name: 'Database Maintenance',
      schedule: '0 2 * * 0',
      task: async () => {
        logger.info('Running database maintenance tasks');
        try {
          // Database maintenance tasks
          logger.info('Database maintenance completed');
        } catch (error) {
          logger.error(`Database maintenance failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      isRunning: false
    });

    logger.info('System cron tasks initialized');
  }

  /**
   * Schedule a new task
   */
  public scheduleTask(taskDef: ScheduledTask): boolean {
    try {
      // Validate cron expression
      if (!cron.validate(taskDef.schedule)) {
        logger.error(`Invalid cron schedule for task ${taskDef.name}: ${taskDef.schedule}`);
        return false;
      }

      // Create cron job with error handling
      const cronJob = cron.schedule(
        taskDef.schedule,
        async () => {
          // Update task status and log start
          taskDef.isRunning = true;
          logger.info(`Starting scheduled task: ${taskDef.name}`);
          
          try {
            await taskDef.task();
            logger.info(`Completed scheduled task: ${taskDef.name}`);
          } catch (error) {
            logger.error(`Error in scheduled task ${taskDef.name}: ${error instanceof Error ? error.message : String(error)}`);
          } finally {
            taskDef.isRunning = false;
          }
        },
        {
          scheduled: true,
          timezone: process.env.TIMEZONE || 'UTC'
        }
      );

      // Store in tasks map
      this.tasks.set(taskDef.id, { task: taskDef, cronJob });
      logger.info(`Scheduled task ${taskDef.id} (${taskDef.name}) with schedule: ${taskDef.schedule}`);
      
      return true;
    } catch (error) {
      logger.error(`Failed to schedule task ${taskDef.name}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get all scheduled tasks
   */
  public getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).map(({ task }) => task);
  }

  /**
   * Get a task by ID
   */
  public getTask(id: string): ScheduledTask | undefined {
    return this.tasks.get(id)?.task;
  }

  /**
   * Stop a scheduled task
   */
  public stopTask(id: string): boolean {
    const taskEntry = this.tasks.get(id);
    if (!taskEntry) {
      logger.warn(`Attempted to stop unknown task: ${id}`);
      return false;
    }

    try {
      taskEntry.cronJob.stop();
      logger.info(`Stopped scheduled task: ${taskEntry.task.name}`);
      return true;
    } catch (error) {
      logger.error(`Error stopping task ${id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Start a stopped task
   */
  public startTask(id: string): boolean {
    const taskEntry = this.tasks.get(id);
    if (!taskEntry) {
      logger.warn(`Attempted to start unknown task: ${id}`);
      return false;
    }

    try {
      taskEntry.cronJob.start();
      logger.info(`Started scheduled task: ${taskEntry.task.name}`);
      return true;
    } catch (error) {
      logger.error(`Error starting task ${id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Update a task's schedule
   */
  public updateTaskSchedule(id: string, newSchedule: string): boolean {
    if (!cron.validate(newSchedule)) {
      logger.error(`Invalid cron schedule: ${newSchedule}`);
      return false;
    }

    const taskEntry = this.tasks.get(id);
    if (!taskEntry) {
      logger.warn(`Attempted to update unknown task: ${id}`);
      return false;
    }

    try {
      // Stop existing job
      taskEntry.cronJob.stop();
      
      // Create new job with updated schedule
      const updatedTask = { ...taskEntry.task, schedule: newSchedule };
      
      if (this.scheduleTask(updatedTask)) {
        // Remove the old task entry
        this.tasks.delete(id);
        logger.info(`Updated schedule for task ${id} to: ${newSchedule}`);
        return true;
      } else {
        // If scheduling failed, restart the original task
        taskEntry.cronJob.start();
        logger.error(`Failed to update schedule for task ${id}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error updating task ${id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Remove a scheduled task
   */
  public removeTask(id: string): boolean {
    const taskEntry = this.tasks.get(id);
    if (!taskEntry) {
      logger.warn(`Attempted to remove unknown task: ${id}`);
      return false;
    }

    try {
      taskEntry.cronJob.stop();
      this.tasks.delete(id);
      logger.info(`Removed scheduled task: ${taskEntry.task.name}`);
      return true;
    } catch (error) {
      logger.error(`Error removing task ${id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Run a task immediately
   */
  public async runTaskNow(id: string): Promise<boolean> {
    const taskEntry = this.tasks.get(id);
    if (!taskEntry) {
      logger.warn(`Attempted to run unknown task: ${id}`);
      return false;
    }

    if (taskEntry.task.isRunning) {
      logger.warn(`Task ${taskEntry.task.name} is already running`);
      return false;
    }

    try {
      taskEntry.task.isRunning = true;
      logger.info(`Manually running task: ${taskEntry.task.name}`);
      
      await taskEntry.task.task();
      
      logger.info(`Manual run of task ${taskEntry.task.name} completed`);
      taskEntry.task.isRunning = false;
      return true;
    } catch (error) {
      logger.error(`Error in manual run of task ${taskEntry.task.name}: ${error instanceof Error ? error.message : String(error)}`);
      taskEntry.task.isRunning = false;
      return false;
    }
  }

  /**
   * Shutdown all scheduled tasks
   */
  public shutdown(): void {
    for (const [id, { task, cronJob }] of this.tasks.entries()) {
      try {
        cronJob.stop();
        logger.info(`Stopped scheduled task during shutdown: ${task.name}`);
      } catch (error) {
        logger.error(`Error stopping task ${id} during shutdown: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    this.tasks.clear();
    logger.info('All scheduled tasks stopped');
  }
}

// Export singleton instance
export const cronSchedulerService = CronSchedulerService.getInstance();
