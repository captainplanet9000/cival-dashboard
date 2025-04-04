/**
 * Queue Service
 * Centralized service for managing all Bull queues in the Trading Farm Dashboard
 */
import Bull, { Queue, Job, JobStatus } from 'bull';
import { QueueNames, QUEUE_CONFIGS } from './config';

// Type definitions for job data and return values
export interface JobData {
  [key: string]: any;
}

export interface JobOptions extends Bull.JobOptions {}

export interface JobCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

// Map to store queue instances
const queueInstances: Map<QueueNames, Queue<JobData>> = new Map();

/**
 * Queue Service class for managing all background job queues
 */
export class QueueService {
  /**
   * Initialize a specific queue
   * @param queueName Name of the queue to initialize
   */
  static getQueue(queueName: QueueNames): Queue<JobData> {
    if (!queueInstances.has(queueName)) {
      const queueConfig = QUEUE_CONFIGS[queueName];
      const queue = new Bull(queueName, queueConfig);
      
      // Set up global error handling
      queue.on('error', (error) => {
        console.error(`Error in queue ${queueName}:`, error);
      });
      
      // Log failed jobs
      queue.on('failed', (job, error) => {
        console.error(`Job ${job.id} in queue ${queueName} failed:`, error);
      });

      // Monitor stalled jobs
      queue.on('stalled', (job) => {
        console.warn(`Job ${job.id} in queue ${queueName} stalled`);
      });

      queueInstances.set(queueName, queue);
    }
    
    return queueInstances.get(queueName)!;
  }

  /**
   * Initialize all queues
   */
  static initializeAllQueues(): Map<QueueNames, Queue<JobData>> {
    // Initialize all queues defined in QueueNames enum
    Object.values(QueueNames).forEach(queueName => {
      this.getQueue(queueName as QueueNames);
    });
    
    return queueInstances;
  }

  /**
   * Add a job to a queue
   * @param queueName Name of the queue
   * @param jobName Name of the job
   * @param data Job data
   * @param options Job options
   */
  static async addJob<T extends JobData>(
    queueName: QueueNames,
    jobName: string,
    data: T,
    options?: JobOptions
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    return queue.add(jobName, data, options);
  }

  /**
   * Process jobs in a queue
   * @param queueName Name of the queue
   * @param jobName Name of the job
   * @param processor Job processor function
   */
  static registerProcessor<T extends JobData, R>(
    queueName: QueueNames,
    jobName: string,
    processor: (job: Job<T>) => Promise<R>
  ): void {
    const queue = this.getQueue(queueName);
    queue.process(jobName, async (job) => {
      try {
        return await processor(job as Job<T>);
      } catch (error) {
        console.error(`Error processing job ${job.id} in queue ${queueName}:`, error);
        throw error;
      }
    });
  }

  /**
   * Get all jobs of a specific status in a queue
   * @param queueName Name of the queue
   * @param status Job status
   * @param start Start index
   * @param end End index
   */
  static async getJobs<T extends JobData>(
    queueName: QueueNames,
    status: JobStatus,
    start = 0,
    end = 100
  ): Promise<Job<T>[]> {
    const queue = this.getQueue(queueName);
    return queue.getJobs([status], start, end) as Promise<Job<T>[]>;
  }

  /**
   * Get job counts for a queue
   * @param queueName Name of the queue
   */
  static async getJobCounts(queueName: QueueNames): Promise<JobCounts> {
    const queue = this.getQueue(queueName);
    return queue.getJobCounts() as Promise<JobCounts>;
  }

  /**
   * Get job counts for all queues
   */
  static async getAllJobCounts(): Promise<Record<QueueNames, JobCounts>> {
    const result: Partial<Record<QueueNames, JobCounts>> = {};
    
    for (const queueName of Object.values(QueueNames)) {
      result[queueName as QueueNames] = await this.getJobCounts(queueName as QueueNames);
    }
    
    return result as Record<QueueNames, JobCounts>;
  }

  /**
   * Clear a queue (remove all jobs)
   * @param queueName Name of the queue
   */
  static async clearQueue(queueName: QueueNames): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.empty();
  }

  /**
   * Pause a queue
   * @param queueName Name of the queue
   */
  static async pauseQueue(queueName: QueueNames): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
  }

  /**
   * Resume a queue
   * @param queueName Name of the queue
   */
  static async resumeQueue(queueName: QueueNames): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
  }

  /**
   * Retry a failed job
   * @param queueName Name of the queue
   * @param jobId Job ID
   */
  static async retryJob(queueName: QueueNames, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    
    if (job) {
      await job.retry();
    } else {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }
  }

  /**
   * Clean up completed jobs
   * @param queueName Name of the queue
   * @param grace Grace period in seconds
   */
  static async cleanQueue(queueName: QueueNames, grace = 5000): Promise<number> {
    const queue = this.getQueue(queueName);
    return queue.clean(grace, 'completed');
  }

  /**
   * Close all queue connections
   */
  static async closeAllQueues(): Promise<void> {
    const closePromises = Array.from(queueInstances.values()).map(queue => queue.close());
    await Promise.all(closePromises);
    queueInstances.clear();
  }
}
