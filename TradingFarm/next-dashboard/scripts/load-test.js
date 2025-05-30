#!/usr/bin/env node

/**
 * Trading Farm Dashboard Load Testing Script
 * 
 * This script performs load testing on the Trading Farm Dashboard
 * to identify performance bottlenecks and ensure the system can
 * handle expected production load.
 * 
 * Usage:
 *   node scripts/load-test.js [options]
 * 
 * Options:
 *   --url <url>             Base URL of the dashboard (default: http://localhost:3000)
 *   --users <number>        Number of virtual users (default: 10)
 *   --duration <seconds>    Duration of the test in seconds (default: 60)
 *   --ramp-up <seconds>     Ramp-up period in seconds (default: 5)
 *   --api-only              Test only API endpoints (default: false)
 *   --verbose               Enable verbose output (default: false)
 *   --report <filename>     Save report to file (default: load-test-report.json)
 *   --auth <token>          Authentication token for authenticated requests
 */

const { program } = require('commander');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Parse command line arguments
program
  .option('--url <url>', 'Base URL of the dashboard', 'http://localhost:3000')
  .option('--users <number>', 'Number of virtual users', '10')
  .option('--duration <seconds>', 'Duration of the test in seconds', '60')
  .option('--ramp-up <seconds>', 'Ramp-up period in seconds', '5')
  .option('--api-only', 'Test only API endpoints', false)
  .option('--verbose', 'Enable verbose output', false)
  .option('--report <filename>', 'Save report to file', 'load-test-report.json')
  .option('--auth <token>', 'Authentication token for authenticated requests')
  .parse(process.argv);

const options = program.opts();

// Convert options to the right types
const BASE_URL = options.url;
const VIRTUAL_USERS = parseInt(options.users, 10);
const DURATION_SECONDS = parseInt(options.duration, 10);
const RAMP_UP_SECONDS = parseInt(options.rampUp, 10);
const API_ONLY = options.apiOnly;
const VERBOSE = options.verbose;
const REPORT_FILE = options.report;
const AUTH_TOKEN = options.auth;

// Test endpoints
const API_ENDPOINTS = [
  // Public endpoints
  { path: '/api/health', method: 'GET', auth: false },
  { path: '/api/markets', method: 'GET', auth: false },
  
  // Authenticated endpoints
  { path: '/api/dashboard/summary', method: 'GET', auth: true },
  { path: '/api/orders', method: 'GET', auth: true },
  { path: '/api/positions', method: 'GET', auth: true },
  { path: '/api/agents', method: 'GET', auth: true },
  { path: '/api/vault/accounts', method: 'GET', auth: true },
  { path: '/api/vault/transactions', method: 'GET', auth: true },
  { path: '/api/trading/history', method: 'GET', auth: true },
  { path: '/api/user/settings', method: 'GET', auth: true },
  
  // More complex endpoints
  { path: '/api/performance/metrics', method: 'GET', auth: true },
  { path: '/api/monitoring', method: 'POST', auth: true, payload: {
    type: 'performance',
    severity: 'info',
    message: 'Load test monitoring event',
    timestamp: new Date().toISOString(),
  }},
];

const PAGE_ENDPOINTS = [
  { path: '/', auth: false },
  { path: '/dashboard', auth: true },
  { path: '/dashboard/orders', auth: true },
  { path: '/dashboard/agents', auth: true },
  { path: '/dashboard/vault', auth: true },
  { path: '/dashboard/settings', auth: true },
];

// Results storage
const results = {
  summary: {
    startTime: new Date().toISOString(),
    endTime: null,
    duration: DURATION_SECONDS,
    virtualUsers: VIRTUAL_USERS,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    minResponseTime: Number.MAX_SAFE_INTEGER,
    maxResponseTime: 0,
    throughput: 0, // requests per second
  },
  endpoints: {},
  errors: [],
};

// Start the test
console.log(chalk.blue.bold('Trading Farm Dashboard Load Test'));
console.log(chalk.blue('==============================\n'));
console.log(`Base URL: ${chalk.yellow(BASE_URL)}`);
console.log(`Virtual Users: ${chalk.yellow(VIRTUAL_USERS)}`);
console.log(`Duration: ${chalk.yellow(DURATION_SECONDS)} seconds`);
console.log(`Ramp-up: ${chalk.yellow(RAMP_UP_SECONDS)} seconds`);
console.log(`Mode: ${chalk.yellow(API_ONLY ? 'API Only' : 'Full Site')}`);
console.log(`Authentication: ${chalk.yellow(AUTH_TOKEN ? 'Yes' : 'No')}`);
console.log('\n');

// Initialize the results for each endpoint
const endpoints = API_ONLY ? API_ENDPOINTS : [...API_ENDPOINTS, ...PAGE_ENDPOINTS];
endpoints.forEach(endpoint => {
  const key = `${endpoint.method || 'GET'} ${endpoint.path}`;
  results.endpoints[key] = {
    requests: 0,
    successful: 0,
    failed: 0,
    totalTime: 0,
    minTime: Number.MAX_SAFE_INTEGER,
    maxTime: 0,
    avgTime: 0,
  };
});

/**
 * Make a request to an endpoint and record the results
 * @param {Object} endpoint Endpoint configuration
 * @param {number} userId Virtual user ID
 * @returns {Promise<Object>} Response details
 */
async function makeRequest(endpoint, userId) {
  const key = `${endpoint.method || 'GET'} ${endpoint.path}`;
  const url = `${BASE_URL}${endpoint.path}`;
  const method = endpoint.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': `TradingFarmLoadTest/1.0 (Virtual User ${userId})`,
  };
  
  // Add authentication if required and available
  if (endpoint.auth && AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: endpoint.payload ? JSON.stringify(endpoint.payload) : undefined,
    });
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Record results
    results.endpoints[key].requests++;
    results.summary.totalRequests++;
    
    if (response.ok) {
      results.endpoints[key].successful++;
      results.summary.successfulRequests++;
      
      // Update response time stats
      results.endpoints[key].totalTime += responseTime;
      results.endpoints[key].minTime = Math.min(results.endpoints[key].minTime, responseTime);
      results.endpoints[key].maxTime = Math.max(results.endpoints[key].maxTime, responseTime);
      
      results.summary.minResponseTime = Math.min(results.summary.minResponseTime, responseTime);
      results.summary.maxResponseTime = Math.max(results.summary.maxResponseTime, responseTime);
      
      if (VERBOSE) {
        console.log(chalk.green(`✓ User ${userId}: ${method} ${endpoint.path} - ${Math.round(responseTime)}ms`));
      }
    } else {
      results.endpoints[key].failed++;
      results.summary.failedRequests++;
      
      const errorBody = await response.text();
      const error = {
        endpoint: key,
        statusCode: response.status,
        statusText: response.statusText,
        response: errorBody.substring(0, 200), // Truncate long responses
        time: new Date().toISOString(),
      };
      
      results.errors.push(error);
      
      if (VERBOSE) {
        console.log(chalk.red(`✗ User ${userId}: ${method} ${endpoint.path} - ${response.status} ${response.statusText}`));
      }
    }
    
    return {
      success: response.ok,
      responseTime,
      statusCode: response.status,
    };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Record error
    results.endpoints[key].requests++;
    results.endpoints[key].failed++;
    results.summary.totalRequests++;
    results.summary.failedRequests++;
    
    results.errors.push({
      endpoint: key,
      message: error.message,
      stack: error.stack,
      time: new Date().toISOString(),
    });
    
    if (VERBOSE) {
      console.log(chalk.red(`✗ User ${userId}: ${method} ${endpoint.path} - ${error.message}`));
    }
    
    return {
      success: false,
      responseTime,
      error: error.message,
    };
  }
}

/**
 * Run a virtual user's test cycle
 * @param {number} userId Virtual user ID
 * @returns {Promise<void>}
 */
async function runUserCycle(userId) {
  // Shuffle endpoints to simulate realistic user behavior
  const shuffledEndpoints = [...endpoints].sort(() => Math.random() - 0.5);
  
  for (const endpoint of shuffledEndpoints) {
    await makeRequest(endpoint, userId);
    
    // Add a small delay between requests to simulate user behavior
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
  }
}

/**
 * Run the load test
 */
async function runLoadTest() {
  console.log(chalk.yellow('Starting load test...'));
  
  const startTime = performance.now();
  const userPromises = [];
  
  // Start virtual users with a ramp-up
  for (let i = 0; i < VIRTUAL_USERS; i++) {
    // Calculate delay based on ramp-up period
    const delay = (RAMP_UP_SECONDS * 1000 / VIRTUAL_USERS) * i;
    
    // Start a virtual user after the delay
    const userPromise = new Promise(async (resolve) => {
      await new Promise(r => setTimeout(r, delay));
      
      const userId = i + 1;
      console.log(chalk.blue(`Starting virtual user ${userId}`));
      
      // Run user cycles until the test duration is reached
      const endTime = startTime + (DURATION_SECONDS * 1000);
      while (performance.now() < endTime) {
        await runUserCycle(userId);
      }
      
      console.log(chalk.blue(`Virtual user ${userId} completed`));
      resolve();
    });
    
    userPromises.push(userPromise);
  }
  
  // Wait for all virtual users to complete
  await Promise.all(userPromises);
  
  // Calculate final stats
  results.summary.endTime = new Date().toISOString();
  const actualDuration = (performance.now() - startTime) / 1000;
  results.summary.throughput = results.summary.totalRequests / actualDuration;
  
  let totalResponseTime = 0;
  for (const key in results.endpoints) {
    const endpoint = results.endpoints[key];
    if (endpoint.successful > 0) {
      endpoint.avgTime = endpoint.totalTime / endpoint.successful;
      totalResponseTime += endpoint.totalTime;
    }
  }
  
  if (results.summary.successfulRequests > 0) {
    results.summary.avgResponseTime = totalResponseTime / results.summary.successfulRequests;
  }
  
  // Output results
  console.log('\n');
  console.log(chalk.green.bold('Load Test Completed'));
  console.log(chalk.green('==============================\n'));
  console.log(`Total Requests: ${chalk.yellow(results.summary.totalRequests)}`);
  console.log(`Successful: ${chalk.green(results.summary.successfulRequests)}`);
  console.log(`Failed: ${chalk.red(results.summary.failedRequests)}`);
  console.log(`Avg Response Time: ${chalk.yellow(Math.round(results.summary.avgResponseTime))}ms`);
  console.log(`Min Response Time: ${chalk.yellow(Math.round(results.summary.minResponseTime))}ms`);
  console.log(`Max Response Time: ${chalk.yellow(Math.round(results.summary.maxResponseTime))}ms`);
  console.log(`Throughput: ${chalk.yellow(Math.round(results.summary.throughput))} req/sec`);
  
  console.log('\n');
  console.log(chalk.blue.bold('Endpoint Performance'));
  console.log(chalk.blue('==============================\n'));
  
  // Sort endpoints by average response time (slowest first)
  const sortedEndpoints = Object.entries(results.endpoints)
    .sort(([, a], [, b]) => b.avgTime - a.avgTime)
    .slice(0, 10); // Top 10
  
  for (const [key, endpoint] of sortedEndpoints) {
    console.log(`${chalk.yellow(key)}`);
    console.log(`  Requests: ${endpoint.requests}`);
    console.log(`  Success Rate: ${Math.round((endpoint.successful / endpoint.requests) * 100)}%`);
    console.log(`  Avg Time: ${Math.round(endpoint.avgTime)}ms`);
    console.log(`  Min Time: ${Math.round(endpoint.minTime)}ms`);
    console.log(`  Max Time: ${Math.round(endpoint.maxTime)}ms`);
    console.log();
  }
  
  // Show errors if any
  if (results.errors.length > 0) {
    console.log(chalk.red.bold('Errors'));
    console.log(chalk.red('==============================\n'));
    
    const errorCounts = {};
    results.errors.forEach(error => {
      const key = `${error.endpoint}: ${error.statusCode || error.message}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    for (const [error, count] of Object.entries(errorCounts)) {
      console.log(`${chalk.red(error)} - ${count} occurrences`);
    }
    
    console.log('\n');
  }
  
  // Save report
  fs.writeFileSync(
    path.join(process.cwd(), REPORT_FILE),
    JSON.stringify(results, null, 2)
  );
  
  console.log(chalk.green(`Report saved to ${REPORT_FILE}`));
}

// Run the load test
runLoadTest().catch(error => {
  console.error(chalk.red('Load test failed:'), error);
  process.exit(1);
});
