/**
 * Supabase Connection Test Script
 * 
 * This script tests the connection to Supabase using the credentials from .env file.
 * Run this script with: node test-connection.js
 */

require('dotenv').config();
const { initializeClient, testConnection } = require('./supabase-client');
const { SUPABASE_CONFIG } = require('./config');
const logger = require('./logger');

// Display configuration (without sensitive values)
console.log('Testing Supabase connection with:');
console.log(`- URL: ${SUPABASE_CONFIG.url}`);
console.log(`- API Key: ${SUPABASE_CONFIG.apiKey ? '✓ Set' : '✗ Not set'}`);
console.log(`- Service Key: ${SUPABASE_CONFIG.serviceKey ? '✓ Set' : '✗ Not set'}`);
console.log(`- Database URL: ${SUPABASE_CONFIG.databaseUrl ? '✓ Set' : '✗ Not set'}`);
console.log('-----------------------------------');

// Test the connection
async function runTest() {
  try {
    console.log('Initializing Supabase client...');
    const client = initializeClient();
    
    if (!client) {
      throw new Error('Failed to initialize Supabase client');
    }
    
    console.log('Client initialized, testing connection...');
    const connectionResult = await testConnection();
    
    if (connectionResult) {
      console.log('✅ Connection test successful! The Supabase MCP is properly configured.');
    } else {
      console.error('❌ Connection test failed. Please check your credentials.');
    }
  } catch (error) {
    console.error(`❌ Error during test: ${error.message}`);
    process.exit(1);
  }
}

runTest(); 