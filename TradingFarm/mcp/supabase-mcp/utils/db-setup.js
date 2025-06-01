/**
 * Database Setup Utility
 * 
 * Manages database migrations and ensures required tables exist in Supabase.
 * Automatically creates missing tables and indexes on server startup.
 */

const { getClient } = require('../supabase-client');
const logger = require('../logger');
const { getTaskAssignmentTableSQL, getWorkflowTableSQL } = require('../models/agent-coordinator-model');
const { getMessageQueueTableSQL, getMessageSubscriptionTableSQL } = require('../models/message-queue-model');
const { getCooperationTableSQL } = require('../models/cooperation-model');

/**
 * Initialize the database structure
 * @returns {Promise<boolean>} Success status
 */
async function initializeDatabase() {
  try {
    logger.info('Starting database initialization...');
    
    // Get Supabase client
    const supabase = getClient();
    
    // Check if extension is available (for UUID generation)
    await enableExtensions(supabase);
    
    // Create agent cooperation table if it doesn't exist
    await executeSQL(supabase, getCooperationTableSQL());
    
    // Create task assignment table if it doesn't exist
    await executeSQL(supabase, getTaskAssignmentTableSQL());
    
    // Create workflow table if it doesn't exist
    await executeSQL(supabase, getWorkflowTableSQL());
    
    // Create message queue table if it doesn't exist
    await executeSQL(supabase, getMessageQueueTableSQL());
    
    // Create message subscription table if it doesn't exist
    await executeSQL(supabase, getMessageSubscriptionTableSQL());
    
    logger.info('Database initialization completed successfully');
    return true;
  } catch (error) {
    logger.error(`Database initialization failed: ${error.message}`);
    throw error;
  }
}

/**
 * Enable required PostgreSQL extensions
 * @param {Object} supabase - Supabase client
 * @returns {Promise<void>}
 */
async function enableExtensions(supabase) {
  try {
    // Enable the UUID extension
    await supabase.rpc('install_uuid_extension');
    logger.info('UUID extension enabled');
  } catch (error) {
    // If the function doesn't exist, create it first
    try {
      await supabase.rpc('create_uuid_extension_function');
      await supabase.rpc('install_uuid_extension');
      logger.info('Created and called UUID extension function');
    } catch (innerError) {
      // If that also fails, try direct SQL
      try {
        await executeSQL(supabase, 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        logger.info('Enabled UUID extension via direct SQL');
      } catch (sqlError) {
        logger.warn(`Could not enable UUID extension: ${sqlError.message}`);
        logger.warn('Continuing without UUID extension - some features may not work correctly');
      }
    }
  }
}

/**
 * Execute raw SQL
 * @param {Object} supabase - Supabase client
 * @param {string} sql - SQL to execute
 * @returns {Promise<Object>} Query result
 */
async function executeSQL(supabase, sql) {
  try {
    const result = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (result.error) {
      throw new Error(`SQL execution failed: ${result.error.message}`);
    }
    
    return result.data;
  } catch (error) {
    // If the function doesn't exist, try creating it
    try {
      await supabase.rpc('create_execute_sql_function');
      const retryResult = await supabase.rpc('execute_sql', { sql_query: sql });
      
      if (retryResult.error) {
        throw retryResult.error;
      }
      
      return retryResult.data;
    } catch (innerError) {
      logger.error(`Failed to execute SQL: ${innerError.message}`);
      logger.error(`SQL was: ${sql.substring(0, 100)}...`);
      throw innerError;
    }
  }
}

module.exports = {
  initializeDatabase,
  executeSQL
}; 