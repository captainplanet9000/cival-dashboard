/**
 * Trading Farm Deployment Verification Script
 * 
 * This script performs comprehensive validation of all strategic enhancements
 * to ensure they are properly functioning in the production environment.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

// Configuration - Override with environment variables
const config = {
  baseUrl: process.env.VERIFY_BASE_URL || 'https://tradingfarm.com',
  apiUrl: process.env.VERIFY_API_URL || 'https://api.tradingfarm.com/v1',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  timeout: parseInt(process.env.VERIFY_TIMEOUT || '30000', 10),
  logFile: process.env.VERIFY_LOG_FILE || './deployment-verification.log'
};

// Log to both console and file
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  
  console.log(logMessage);
  
  // Append to log file
  fs.appendFileSync(config.logFile, logMessage + '\n');
}

// Clear previous log file
fs.writeFileSync(config.logFile, `Trading Farm Deployment Verification - ${new Date().toISOString()}\n\n`);

log('Starting deployment verification...');
log(`Base URL: ${config.baseUrl}`);
log(`API URL: ${config.apiUrl}`);

// Create verification results object
const results = {
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  },
  categories: {},
  startTime: new Date(),
  endTime: null,
  duration: null
};

// Helper function to make HTTP requests
async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = url.startsWith('http') ? url : `${config.baseUrl}${url}`;
    const urlObj = new URL(fullUrl);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: `${urlObj.pathname}${urlObj.search}`,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: config.timeout
    };
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        let responseData;
        
        try {
          responseData = data.length > 0 ? JSON.parse(data) : {};
        } catch (e) {
          responseData = { rawData: data };
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${fullUrl} timed out after ${config.timeout}ms`));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Helper function to run a verification test
async function runTest(category, name, testFn) {
  // Initialize category if doesn't exist
  if (!results.categories[category]) {
    results.categories[category] = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
  }
  
  results.summary.total++;
  results.categories[category].total++;
  
  const test = {
    name,
    category,
    status: 'running',
    startTime: new Date(),
    endTime: null,
    duration: null,
    error: null
  };
  
  results.categories[category].tests.push(test);
  
  log(`Running test: [${category}] ${name}`, 'test');
  
  try {
    await testFn();
    
    test.status = 'passed';
    results.summary.passed++;
    results.categories[category].passed++;
    
    log(`✅ Test passed: [${category}] ${name}`, 'pass');
  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
    
    results.summary.failed++;
    results.categories[category].failed++;
    
    log(`❌ Test failed: [${category}] ${name}`, 'fail');
    log(`   Error: ${error.message}`, 'error');
    
    if (error.stack) {
      log(`   Stack: ${error.stack}`, 'debug');
    }
  }
  
  test.endTime = new Date();
  test.duration = test.endTime - test.startTime;
  
  return test.status === 'passed';
}

// Run all verification tests
async function runAllTests() {
  log('=== Verifying Core Functionality ===');
  
  // Verify main pages load correctly
  await runTest('Core', 'Main dashboard page loads', async () => {
    const response = await makeRequest('/dashboard');
    if (response.statusCode !== 200) {
      throw new Error(`Dashboard page returned status code ${response.statusCode}`);
    }
  });
  
  await runTest('Core', 'Trading terminal page loads', async () => {
    const response = await makeRequest('/dashboard/trading');
    if (response.statusCode !== 200) {
      throw new Error(`Trading terminal page returned status code ${response.statusCode}`);
    }
  });
  
  // Verify API endpoints are accessible
  await runTest('Core', 'API health endpoint is accessible', async () => {
    const response = await makeRequest('/api/health');
    if (response.statusCode !== 200) {
      throw new Error(`API health endpoint returned status code ${response.statusCode}`);
    }
    
    if (response.data.status !== 'ok') {
      throw new Error(`API health check failed: ${JSON.stringify(response.data)}`);
    }
  });
  
  log('=== Verifying Strategic Enhancements ===');
  
  // 1. Verify AI Trading Enhancements
  await runTest('AI Trading', 'AI trading page loads', async () => {
    const response = await makeRequest('/dashboard/ai-trading');
    if (response.statusCode !== 200) {
      throw new Error(`AI trading page returned status code ${response.statusCode}`);
    }
  });
  
  await runTest('AI Trading', 'AI prediction API endpoint is accessible', async () => {
    const response = await makeRequest('/api/ai/predictions');
    if (response.statusCode !== 200) {
      throw new Error(`AI prediction API endpoint returned status code ${response.statusCode}`);
    }
  });
  
  // 2. Verify Risk Management System
  await runTest('Risk Management', 'Risk management page loads', async () => {
    const response = await makeRequest('/dashboard/risk-management');
    if (response.statusCode !== 200) {
      throw new Error(`Risk management page returned status code ${response.statusCode}`);
    }
  });
  
  await runTest('Risk Management', 'Risk profile API endpoint is accessible', async () => {
    const response = await makeRequest('/api/risk/profiles');
    if (response.statusCode !== 200) {
      throw new Error(`Risk profile API endpoint returned status code ${response.statusCode}`);
    }
  });
  
  // 3. Verify Portfolio Analytics
  await runTest('Portfolio Analytics', 'Portfolio analytics page loads', async () => {
    const response = await makeRequest('/dashboard/portfolio');
    if (response.statusCode !== 200) {
      throw new Error(`Portfolio analytics page returned status code ${response.statusCode}`);
    }
  });
  
  await runTest('Portfolio Analytics', 'Performance metrics API endpoint is accessible', async () => {
    const response = await makeRequest('/api/portfolio/metrics');
    if (response.statusCode !== 200) {
      throw new Error(`Performance metrics API endpoint returned status code ${response.statusCode}`);
    }
  });
  
  // 4. Verify Mobile & Cross-Platform Compatibility
  await runTest('Mobile Compatibility', 'Responsive trading page loads', async () => {
    const response = await makeRequest('/dashboard/responsive-trading');
    if (response.statusCode !== 200) {
      throw new Error(`Responsive trading page returned status code ${response.statusCode}`);
    }
  });
  
  await runTest('Mobile Compatibility', 'Device sync API endpoint is accessible', async () => {
    const response = await makeRequest('/api/devices/sync');
    if (response.statusCode !== 200 && response.statusCode !== 401) {
      throw new Error(`Device sync API endpoint returned unexpected status code ${response.statusCode}`);
    }
  });
  
  // 5. Verify Documentation & Training
  await runTest('Documentation', 'Training center page loads', async () => {
    const response = await makeRequest('/dashboard/training');
    if (response.statusCode !== 200) {
      throw new Error(`Training center page returned status code ${response.statusCode}`);
    }
  });
  
  await runTest('Documentation', 'Risk management training module loads', async () => {
    const response = await makeRequest('/dashboard/training/risk-management');
    if (response.statusCode !== 200) {
      throw new Error(`Risk management training module returned status code ${response.statusCode}`);
    }
  });
  
  // 6. Verify Monitoring System
  await runTest('Monitoring', 'Monitoring endpoints are secured', async () => {
    const response = await makeRequest('/api/monitoring');
    if (response.statusCode !== 401) {
      throw new Error(`Monitoring endpoint should require authentication, got status code ${response.statusCode}`);
    }
  });
  
  log('=== Verification Complete ===');
  
  // Calculate final results
  results.endTime = new Date();
  results.duration = results.endTime - results.startTime;
  
  // Log summary
  log(`\nVerification completed in ${results.duration / 1000} seconds`);
  log(`Total tests: ${results.summary.total}`);
  log(`Passed: ${results.summary.passed}`);
  log(`Failed: ${results.summary.failed}`);
  log(`Skipped: ${results.summary.skipped}`);
  
  // Write detailed results to file
  const resultsFile = './deployment-verification-results.json';
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  log(`\nDetailed results written to ${resultsFile}`);
  
  // Exit with appropriate code
  if (results.summary.failed > 0) {
    log('Verification failed! Some tests did not pass.', 'error');
    process.exit(1);
  } else {
    log('Verification successful! All tests passed.', 'success');
    
    // Generate success report
    generateSuccessReport();
  }
}

// Generate HTML success report
function generateSuccessReport() {
  const reportFile = './deployment-verification-report.html';
  
  const categoryResults = Object.entries(results.categories).map(([category, data]) => {
    const tests = data.tests.map(test => {
      return `
        <tr class="${test.status === 'passed' ? 'bg-green-50' : 'bg-red-50'}">
          <td class="px-4 py-2">${test.name}</td>
          <td class="px-4 py-2 text-center">${test.status === 'passed' ? 
            '<span class="px-2 py-1 bg-green-100 text-green-800 rounded">Passed</span>' : 
            '<span class="px-2 py-1 bg-red-100 text-red-800 rounded">Failed</span>'}</td>
          <td class="px-4 py-2 text-center">${(test.duration / 1000).toFixed(2)}s</td>
          ${test.error ? `<td class="px-4 py-2 text-red-600">${test.error}</td>` : '<td class="px-4 py-2">-</td>'}
        </tr>
      `;
    }).join('');
    
    return `
      <div class="mt-6 bg-white shadow rounded-lg overflow-hidden">
        <div class="px-4 py-5 border-b border-gray-200 sm:px-6 bg-gray-50">
          <h3 class="text-lg leading-6 font-medium text-gray-900">${category}</h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500">
            ${data.passed} of ${data.total} tests passed (${Math.round((data.passed / data.total) * 100)}%)
          </p>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${tests}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
  
  const startTime = results.startTime.toLocaleString();
  const endTime = results.endTime.toLocaleString();
  const durationSeconds = (results.duration / 1000).toFixed(2);
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Trading Farm Deployment Verification Report</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 font-sans">
      <div class="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold text-gray-900">Trading Farm Deployment Verification</h1>
          <div class="text-sm text-gray-500">${new Date().toLocaleDateString()}</div>
        </div>
        
        <div class="mt-6 bg-white shadow rounded-lg overflow-hidden">
          <div class="px-4 py-5 sm:p-6">
            <h2 class="text-lg leading-6 font-medium text-gray-900">Summary</h2>
            <div class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-4">
              <div class="bg-gray-50 rounded-lg overflow-hidden shadow">
                <div class="px-4 py-5 sm:p-6">
                  <dt class="text-sm font-medium text-gray-500 truncate">Total Tests</dt>
                  <dd class="mt-1 text-3xl font-semibold text-gray-900">${results.summary.total}</dd>
                </div>
              </div>
              
              <div class="bg-green-50 rounded-lg overflow-hidden shadow">
                <div class="px-4 py-5 sm:p-6">
                  <dt class="text-sm font-medium text-green-700 truncate">Passed</dt>
                  <dd class="mt-1 text-3xl font-semibold text-green-900">${results.summary.passed}</dd>
                </div>
              </div>
              
              <div class="bg-red-50 rounded-lg overflow-hidden shadow">
                <div class="px-4 py-5 sm:p-6">
                  <dt class="text-sm font-medium text-red-700 truncate">Failed</dt>
                  <dd class="mt-1 text-3xl font-semibold text-red-900">${results.summary.failed}</dd>
                </div>
              </div>
              
              <div class="bg-yellow-50 rounded-lg overflow-hidden shadow">
                <div class="px-4 py-5 sm:p-6">
                  <dt class="text-sm font-medium text-yellow-700 truncate">Success Rate</dt>
                  <dd class="mt-1 text-3xl font-semibold text-yellow-900">${Math.round((results.summary.passed / results.summary.total) * 100)}%</dd>
                </div>
              </div>
            </div>
            
            <div class="mt-5">
              <dl class="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div class="sm:col-span-1">
                  <dt class="text-sm font-medium text-gray-500">Start Time</dt>
                  <dd class="mt-1 text-sm text-gray-900">${startTime}</dd>
                </div>
                <div class="sm:col-span-1">
                  <dt class="text-sm font-medium text-gray-500">End Time</dt>
                  <dd class="mt-1 text-sm text-gray-900">${endTime}</dd>
                </div>
                <div class="sm:col-span-1">
                  <dt class="text-sm font-medium text-gray-500">Duration</dt>
                  <dd class="mt-1 text-sm text-gray-900">${durationSeconds} seconds</dd>
                </div>
                <div class="sm:col-span-1">
                  <dt class="text-sm font-medium text-gray-500">Environment</dt>
                  <dd class="mt-1 text-sm text-gray-900">${config.baseUrl}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        
        <h2 class="mt-8 text-2xl font-bold text-gray-900">Test Results by Category</h2>
        ${categoryResults}
        
        <div class="mt-8 text-center text-sm text-gray-500">
          <p>Generated by Trading Farm Deployment Verification Script</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  fs.writeFileSync(reportFile, html);
  log(`HTML report generated at ${reportFile}`, 'success');
}

// Run the tests
runAllTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  
  if (error.stack) {
    log(`Stack: ${error.stack}`, 'debug');
  }
  
  process.exit(1);
});
