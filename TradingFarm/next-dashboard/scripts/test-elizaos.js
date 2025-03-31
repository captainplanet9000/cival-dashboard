#!/usr/bin/env node

/**
 * ElizaOS Integration Test Runner
 * 
 * This script runs the ElizaOS integration test to verify
 * the connection and functionality with the ElizaOS API.
 * 
 * Usage:
 *   npm run test:elizaos
 *   node scripts/test-elizaos.js
 */

// Setup environment
require('dotenv').config();

// Set default values for testing if not in environment
if (!process.env.NEXT_PUBLIC_ELIZAOS_API_URL) {
  console.log('Setting default ElizaOS API URL for testing: http://localhost:3000/api');
  process.env.NEXT_PUBLIC_ELIZAOS_API_URL = 'http://localhost:3000/api';
}

// For TypeScript
require('ts-node').register({
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
    esModuleInterop: true,
  },
});

// Run the test script
console.log('Starting ElizaOS integration test...');
require('../src/scripts/test-elizaos-integration')
  .default()
  .then(() => {
    console.log('ElizaOS integration test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('ElizaOS integration test failed:', error);
    process.exit(1);
  }); 