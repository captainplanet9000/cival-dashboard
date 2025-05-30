/**
 * Supabase Client Module
 * 
 * Establishes and manages the connection to Supabase.
 * Provides utility methods for database operations.
 */

const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_CONFIG } = require('./config');
const logger = require('./logger');

// Create Supabase client instance
let supabaseClient = null;

/**
 * Initialize the Supabase client
 * @returns {Object} Supabase client instance
 */
function initializeClient() {
  try {
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.apiKey) {
      throw new Error('Supabase URL and API key are required');
    }

    supabaseClient = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.apiKey
    );

    logger.info('Supabase client initialized successfully');
    return supabaseClient;
  } catch (error) {
    logger.error(`Error initializing Supabase client: ${error.message}`);
    throw error;
  }
}

/**
 * Get the Supabase client instance
 * @returns {Object} Supabase client instance
 */
function getClient() {
  if (!supabaseClient) {
    return initializeClient();
  }
  return supabaseClient;
}

/**
 * Test the Supabase connection
 * @returns {Promise<Object>} Connection status object with connected and error properties
 */
async function testConnection() {
  try {
    const client = getClient();
    
    // Try a simple query that's expected to fail but shows we have connectivity
    const { error } = await client
      .from('non_existent_table')
      .select('id')
      .limit(1);
    
    // If we get a "relation does not exist" error, that's actually good
    // It shows we connected successfully but the table doesn't exist
    if (error && error.message.includes('does not exist')) {
      logger.info('Supabase connection test successful');
      return { connected: true, error: null };
    }
    
    // If there's no error, we somehow succeeded, but that's unlikely
    if (!error) {
      logger.info('Supabase connection test successful');
      return { connected: true, error: null };
    }
    
    // Any other error might indicate an actual connection problem
    logger.error(`Supabase connection test failed with unexpected error: ${error.message}`);
    return { connected: false, error: error.message };
    
  } catch (error) {
    logger.error(`Supabase connection test failed: ${error.message}`);
    return { connected: false, error: error.message };
  }
}

/**
 * Perform a database query with error handling and logging
 * @param {Function} queryFn The query function to execute
 * @returns {Promise<Object>} Query result with data and error properties
 */
async function executeQuery(queryFn) {
  try {
    const client = getClient();
    const result = await queryFn(client);
    
    if (result.error) {
      logger.error(`Database query error: ${result.error.message}`);
    }
    
    return result;
  } catch (error) {
    logger.error(`Error executing database query: ${error.message}`);
    return { data: null, error };
  }
}

module.exports = {
  initializeClient,
  getClient,
  testConnection,
  executeQuery
}; 