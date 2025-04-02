import Queue, { Job, QueueOptions } from 'bull';
import { Redis } from 'ioredis';
import { logger } from '../logging/winston-service';

// Queue Types
export type JobType = 
  | 'backtest'
  | 'strategy-execution'
  | 'market-data-fetch'
  | 'generate-report'
  | 'email-notification'
  | 'ai-model-training';

export interface JobData {
  id: string;
  type: JobType;
  params: Record<string, any>;
  userId?: string;
  createdAt: Date;
}

/**
 * Bull Queue Service for handling background jobs
 * Provides a centralized interface for scheduling and processing jobs
 */
export class BullQueueService {
  private static instance: BullQueueService;
  private queues: Map<JobType, Queue.Queue<JobData>> = new Map();

  private constructor() {
    // Initialize queues
    this.initializeQueues();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): BullQueueService {
    if (!BullQueueService.instance) {
      BullQueueService.instance = new BullQueueService();
    }
    return BullQueueService.instance;
  }

  /**
   * Initialize job queues
   */
  private initializeQueues(): void {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    const defaultOptions: QueueOptions = {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    };

    // Create queues for each job type
    this.createQueue('backtest', defaultOptions);
    this.createQueue('strategy-execution', defaultOptions);
    this.createQueue('market-data-fetch', defaultOptions);
    this.createQueue('generate-report', defaultOptions);
    this.createQueue('email-notification', defaultOptions);
    this.createQueue('ai-model-training', defaultOptions);

    logger.info('Bull job queues initialized successfully');
  }

  /**
   * Create a new queue
   */
  private createQueue(type: JobType, options: QueueOptions): void {
    const queue = new Queue<JobData>(type, options);
    
    // Set up event handlers for logging
    queue.on('completed', (job: Job<JobData>) => {
      logger.info(`Job ${job.id} of type ${job.data.type} completed successfully`);
    });

    queue.on('failed', (job: Job<JobData>, err: Error) => {
      logger.error(`Job ${job.id} of type ${job.data.type} failed: ${err.message}`, { 
        jobId: job.id,
        jobType: job.data.type,
        error: err.stack 
      });
    });

    queue.on('stalled', (jobId: string) => {
      logger.warn(`Job ${jobId} stalled`);
    });

    this.queues.set(type, queue);
  }

  /**
   * Add a job to the queue
   */
  public async addJob(
    type: JobType, 
    data: Omit<JobData, 'createdAt'>, 
    options?: Queue.JobOptions
  ): Promise<Job<JobData>> {
    const queue = this.queues.get(type);
    
    if (!queue) {
      throw new Error(`Queue for job type ${type} not found`);
    }

    const jobData: JobData = {
      ...data,
      createdAt: new Date(),
    };

    return queue.add(jobData, options);
  }

  /**
   * Process jobs of a specific type with a handler function
   */
  public processJobs(
    type: JobType, 
    concurrency: number, 
    handler: (job: Job<JobData>) => Promise<any>
  ): void {
    const queue = this.queues.get(type);
    
    if (!queue) {
      throw new Error(`Queue for job type ${type} not found`);
    }

    queue.process(concurrency, handler);
    logger.info(`Job processor registered for ${type} with concurrency ${concurrency}`);
  }

  /**
   * Get a queue by type
   */
  public getQueue(type: JobType): Queue.Queue<JobData> | undefined {
    return this.queues.get(type);
  }

  /**
   * Get count of jobs by state
   */
  public async getJobCounts(type: JobType): Promise<Queue.JobCounts> {
    const queue = this.queues.get(type);
    
    if (!queue) {
      throw new Error(`Queue for job type ${type} not found`);
    }

    return queue.getJobCounts();
  }

  /**
   * Clear a queue
   */
  public async clearQueue(type: JobType): Promise<void> {
    const queue = this.queues.get(type);
    
    if (!queue) {
      throw new Error(`Queue for job type ${type} not found`);
    }

    await queue.empty();
    logger.info(`Queue ${type} cleared`);
  }

  /**
   * Shutdown all queues gracefully
   */
  public async shutdown(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map(queue => queue.close());
    await Promise.all(closePromises);
    logger.info('All Bull job queues shut down gracefully');
  }
}

// Export singleton instance
export const bullQueueService = BullQueueService.getInstance();
