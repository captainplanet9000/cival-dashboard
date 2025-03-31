#!/usr/bin/env node

/**
 * Connection Test Script
 * 
 * This script tests connections to all configured services in the Trading Farm environment.
 * It validates that the environment variables are set correctly and that the services
 * are reachable.
 * 
 * Usage:
 *   npm run test:connections
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Import required libraries
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Configuration from environment variables
const config = {
  // Supabase
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  
  // ElizaOS
  elizaOsApiUrl: process.env.NEXT_PUBLIC_ELIZAOS_API_URL,
  
  // Trading Farm Backend
  tradingFarmApiUrl: process.env.NEXT_PUBLIC_TRADING_FARM_API_URL,
  
  // MCP Services
  mcpNeonEndpoint: process.env.NEXT_PUBLIC_MCP_NEON_ENDPOINT,
  mcpBrowserbaseEndpoint: process.env.NEXT_PUBLIC_MCP_BROWSERBASE_ENDPOINT,
  mcpHyperliquidEndpoint: process.env.NEXT_PUBLIC_MCP_HYPERLIQUID_ENDPOINT,
  
  // GraphQL
  graphqlApiUrl: process.env.NEXT_PUBLIC_GRAPHQL_API_URL
};

async function testEndpoint(name, url, options = {}) {
  try {
    console.log(`Testing ${name} endpoint: ${url}`);
    const response = await fetch(url, options);
    const statusOk = response.status >= 200 && response.status < 300;
    
    if (statusOk) {
      console.log(`✅ ${name} connection successful (${response.status} ${response.statusText})`);
      return true;
    } else {
      console.error(`❌ ${name} connection failed: ${response.status} ${response.statusText}`);
      try {
        const errorBody = await response.text();
        console.error(`Response: ${errorBody.substring(0, 200)}${errorBody.length > 200 ? '...' : ''}`);
      } catch (e) {
        // Ignore error parsing response
      }
      return false;
    }
  } catch (error) {
    console.error(`❌ ${name} connection error:`, error.message);
    return false;
  }
}

async function testSupabaseConnection() {
  try {
    console.log(`Testing Supabase connection: ${config.supabaseUrl}`);
    
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      console.error('❌ Supabase URL or Anon Key not set in environment variables');
      return false;
    }
    
    const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data, error } = await supabase.from('farms').select('count').limit(1);
    
    if (error) {
      console.error('❌ Supabase connection error:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    return false;
  }
}

async function testGraphqlConnection() {
  try {
    console.log(`Testing GraphQL endpoint: ${config.graphqlApiUrl}`);
    
    if (!config.graphqlApiUrl) {
      console.error('❌ GraphQL API URL not set in environment variables');
      return false;
    }
    
    const query = `
      query TestConnection {
        __schema {
          queryType {
            name
          }
        }
      }
    `;
    
    const response = await fetch(config.graphqlApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL connection error:', result.errors[0].message);
      return false;
    }
    
    console.log('✅ GraphQL connection successful');
    return true;
  } catch (error) {
    console.error('❌ GraphQL connection error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('===== Testing Trading Farm Service Connections =====\n');
  
  // Test environment variable presence
  console.log('Checking environment variables...');
  let missingVars = [];
  
  for (const [key, value] of Object.entries(config)) {
    if (!value) {
      missingVars.push(key);
    }
  }
  
  if (missingVars.length > 0) {
    console.warn('⚠️ Missing environment variables:', missingVars.join(', '));
    console.warn('Some connection tests may fail. Please set these variables in .env.local');
  } else {
    console.log('✅ All required environment variables are set');
  }
  
  console.log('\n');
  
  // Test Supabase connection
  const supabaseSuccess = await testSupabaseConnection();
  
  // Test ElizaOS API
  const elizaOsSuccess = await testEndpoint(
    'ElizaOS API', 
    `${config.elizaOsApiUrl}/health`
  );
  
  // Test Trading Farm API
  const tradingFarmSuccess = await testEndpoint(
    'Trading Farm API', 
    `${config.tradingFarmApiUrl}/health`
  );
  
  // Test MCP endpoints
  const neonSuccess = await testEndpoint(
    'Neon MCP', 
    `${config.mcpNeonEndpoint}/health`
  );
  
  const browserbaseSuccess = await testEndpoint(
    'Browserbase MCP', 
    `${config.mcpBrowserbaseEndpoint}/health`
  );
  
  const hyperliquidSuccess = await testEndpoint(
    'Hyperliquid MCP', 
    `${config.mcpHyperliquidEndpoint}/health`
  );
  
  // Test GraphQL connection
  const graphqlSuccess = await testGraphqlConnection();
  
  // Summary
  console.log('\n===== Connection Test Summary =====');
  console.log(`Supabase:         ${supabaseSuccess ? '✅ Connected' : '❌ Failed'}`);
  console.log(`ElizaOS API:      ${elizaOsSuccess ? '✅ Connected' : '❌ Failed'}`);
  console.log(`Trading Farm API: ${tradingFarmSuccess ? '✅ Connected' : '❌ Failed'}`);
  console.log(`Neon MCP:         ${neonSuccess ? '✅ Connected' : '❌ Failed'}`);
  console.log(`Browserbase MCP:  ${browserbaseSuccess ? '✅ Connected' : '❌ Failed'}`);
  console.log(`Hyperliquid MCP:  ${hyperliquidSuccess ? '✅ Connected' : '❌ Failed'}`);
  console.log(`GraphQL API:      ${graphqlSuccess ? '✅ Connected' : '❌ Failed'}`);
  
  const totalTests = 7;
  const passedTests = [
    supabaseSuccess, 
    elizaOsSuccess,
    tradingFarmSuccess,
    neonSuccess,
    browserbaseSuccess,
    hyperliquidSuccess,
    graphqlSuccess
  ].filter(Boolean).length;
  
  console.log(`\nPassed ${passedTests}/${totalTests} connection tests`);
  
  if (passedTests === totalTests) {
    console.log('\n✅ All connections successful! The Trading Farm dashboard is properly configured.');
    return 0;
  } else {
    console.error('\n❌ Some connections failed. Please check the configuration and service availability.');
    return 1;
  }
}

// Run the tests
runTests()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Test script error:', error);
    process.exit(1);
  }); 