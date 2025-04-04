/**
 * Queue System Initializer
 * Central module for initializing all queue processors and components
 */
import { QueueService, QueueNames } from './queue-service';
import { initializeMarketSyncProcessors } from './processors/market-sync-processor';
import { initializeTradeExecutionProcessors } from './processors/trade-execution-processor';
import { initializeAnalyticsProcessors } from './processors/analytics-processor';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import express from 'express';

/**
 * Initialize all queue processors
 */
export function initializeQueueProcessors() {
  console.log('Initializing queue processors...');
  
  // Initialize processors for each queue type
  initializeMarketSyncProcessors();
  initializeTradeExecutionProcessors();
  initializeAnalyticsProcessors();
  
  console.log('Queue processors initialized');
}

/**
 * Set up Bull Board monitoring UI
 * This provides an external monitoring UI accessible at the specified path
 */
export function setupBullBoard(app: express.Application, path: string = '/admin/queues') {
  // Get all queue instances
  const queues = Object.values(QueueNames).map(queueName => {
    const queue = QueueService.getQueue(queueName);
    return queue ? new BullAdapter(queue) : null;
  }).filter(Boolean);
  
  // Create Bull Board adapter
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(path);
  
  // Create Bull Board
  createBullBoard({
    queues,
    serverAdapter,
  });
  
  // Add Bull Board to Express app
  app.use(path, serverAdapter.getRouter());
  
  console.log(`Bull board UI available at ${path}`);
}

/**
 * Initialize the queue system with retry policies and error handling
 */
export function initializeQueueSystem() {
  // Set up global error handler for all queues
  Object.values(QueueNames).forEach(queueName => {
    const queue = QueueService.getQueue(queueName);
    
    if (queue) {
      // Listen for errors
      queue.on('error', (error) => {
        console.error(`Error in queue ${queueName}:`, error);
      });
      
      // Listen for failed jobs
      queue.on('failed', (job, err) => {
        console.error(`Job ${job.id} in queue ${queueName} failed:`, err);
        
        // Log additional job details for troubleshooting
        console.error(`Job details:`, {
          name: job.name,
          timestamp: job.timestamp,
          attemptsMade: job.attemptsMade,
          data: job.data,
        });
      });
      
      // Listen for stalled jobs
      queue.on('stalled', (jobId) => {
        console.warn(`Job ${jobId} in queue ${queueName} is stalled`);
      });
      
      // Optionally, listen for completed jobs for metrics
      queue.on('completed', (job) => {
        if (job.finishedOn && job.processedOn) {
          const processingTime = job.finishedOn - job.processedOn;
          
          // Log processing times for performance monitoring
          if (processingTime > 5000) { // More than 5 seconds
            console.warn(`Job ${job.id} in queue ${queueName} took ${processingTime}ms to complete`);
          }
        }
      });
    }
  });
  
  // Initialize all processors
  initializeQueueProcessors();
  
  console.log('Queue system initialized successfully');
}
