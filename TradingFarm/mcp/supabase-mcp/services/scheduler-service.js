/**
 * Scheduler Service
 * 
 * Manages background tasks and scheduled operations for the Supabase MCP server.
 * Handles message queue cleanup, regular database maintenance, and other periodic tasks.
 */

const cron = require('node-cron');
const logger = require('../logger');
const messageQueueService = require('./message-queue-service');
const { SERVER_CONFIG } = require('../config');

// Scheduled tasks
const tasks = [];

/**
 * Task to clean up expired messages
 * Runs every 5 minutes
 */
const messageCleanupTask = cron.schedule('*/5 * * * *', async () => {
  try {
    logger.info('Running scheduled task: message cleanup');
    const count = await messageQueueService.cleanupExpiredMessages();
    logger.info(`Message cleanup complete: ${count} messages cleaned up`);
  } catch (error) {
    logger.error(`Error in message cleanup task: ${error.message}`);
  }
}, {
  scheduled: false
});

/**
 * Task to ping the database to keep connections alive
 * Runs every 15 minutes
 */
const pingDatabaseTask = cron.schedule('*/15 * * * *', async () => {
  try {
    logger.debug('Running scheduled task: database ping');
    const supabase = require('../supabase-client').getClient();
    
    // Simple query to keep connection alive
    const { data, error } = await supabase.from('pg_stat_activity').select('count(*)', { count: 'exact' }).limit(1);
    
    if (error) {
      logger.warn(`Database ping failed: ${error.message}`);
    } else {
      logger.debug('Database ping successful');
    }
  } catch (error) {
    logger.error(`Error in database ping task: ${error.message}`);
  }
}, {
  scheduled: false
});

/**
 * Task to perform database health check
 * Runs once per day at 3 AM
 */
const databaseHealthCheckTask = cron.schedule('0 3 * * *', async () => {
  try {
    logger.info('Running scheduled task: database health check');
    const supabase = require('../supabase-client').getClient();
    
    // Check table sizes
    const { data: tableSizes, error: tableSizesError } = await supabase.rpc('get_table_sizes');
    
    if (tableSizesError) {
      logger.warn(`Failed to get table sizes: ${tableSizesError.message}`);
    } else {
      // Log table sizes
      if (tableSizes && tableSizes.length > 0) {
        logger.info('Database table sizes:');
        tableSizes.forEach(table => {
          logger.info(`  ${table.table_name}: ${table.size_pretty}`);
        });
      }
    }
    
    // Check message queue stats
    const { data: queueStats, error: queueStatsError } = await supabase
      .from('message_queue')
      .select('status, count(*)', { count: 'exact' })
      .group('status');
    
    if (queueStatsError) {
      logger.warn(`Failed to get message queue stats: ${queueStatsError.message}`);
    } else {
      // Log queue stats
      if (queueStats && queueStats.length > 0) {
        logger.info('Message queue stats:');
        queueStats.forEach(stat => {
          logger.info(`  ${stat.status}: ${stat.count} messages`);
        });
      }
    }
    
    logger.info('Database health check complete');
  } catch (error) {
    logger.error(`Error in database health check task: ${error.message}`);
  }
}, {
  scheduled: false
});

/**
 * Start all scheduled tasks
 */
function startScheduledTasks() {
  // Register all tasks
  tasks.push(messageCleanupTask);
  tasks.push(pingDatabaseTask);
  tasks.push(databaseHealthCheckTask);
  
  // Start all tasks
  tasks.forEach(task => task.start());
  
  logger.info(`Started ${tasks.length} scheduled tasks`);
}

/**
 * Stop all scheduled tasks
 */
function stopScheduledTasks() {
  tasks.forEach(task => task.stop());
  logger.info(`Stopped ${tasks.length} scheduled tasks`);
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received');
  stopScheduledTasks();
  logger.info('Scheduled tasks stopped, shutting down');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received');
  stopScheduledTasks();
  logger.info('Scheduled tasks stopped, shutting down');
  process.exit(0);
});

module.exports = {
  startScheduledTasks,
  stopScheduledTasks
}; 