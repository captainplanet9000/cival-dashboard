/**
 * Final Verification Script for Trading Farm
 * 
 * Performs a comprehensive verification of all Trading Farm components
 * before production launch, ensuring everything is configured correctly
 * and functioning as expected.
 * 
 * Enhanced for Production Phase 6 - Final verification and launch readiness
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');
const chalk = require('chalk');
// Fix for newer versions of chalk
const chalkColors = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

// Support for styling combinations
Object.keys(chalkColors).forEach(color => {
  chalkColors[color].bold = (text) => `\x1b[1m${chalkColors[color](text)}\x1b[0m`;
});

// Use this if chalk import fails
function safeChalk(color) {
  try {
    return chalk[color] || chalkColors[color];
  } catch (e) {
    return chalkColors[color] || ((text) => text);
  }
}
const { performance } = require('perf_hooks');
const WebSocket = require('ws');
const crypto = require('crypto');
const zlib = require('zlib');

// Load environment variables
dotenv.config({ path: '.env.production' });

// Configuration
const config = {
  // Base URLs
  dashboardUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  vaultUrl: process.env.VAULT_URL || 'http://localhost:9387',
  
  // Supabase
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Required environment variables
  requiredEnvVars: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ENCRYPTION_SECRET',
    'NEXT_PUBLIC_APP_URL',
    'VAULT_URL',
    'NODE_ENV'
  ],
  
  // Critical files to verify
  criticalFiles: [
    'next.config.js',
    'package.json',
    'tsconfig.json',
    '.env.production',
    'src/types/database.types.ts'
  ],
  
  // API endpoints to verify
  apiEndpoints: [
    '/api/health',
    '/api/auth/session',
    '/api/agents',
    '/api/trading/symbols',
    '/api/vault/status',
    '/api/monitoring/metrics',
    '/api/monitoring/health',
    '/api/risk/parameters',
    '/api/agents/controller/status'
  ],
  
  // Database tables to verify
  requiredTables: [
    'agents',
    'agent_health',
    'agent_events',
    'strategies',
    'exchange_credentials',
    'wallet_balances',
    'metrics',
    'alerts',
    'risk_parameters',
    'trades',
    'performance_metrics',
    'monitoring_events',
    'system_health',
    'user_sessions'
  ],
  
  // Critical files for advanced features
  advancedFeatureFiles: [
    'src/lib/trading/risk-manager.ts',
    'src/lib/agents/agent-controller.ts',
    'src/utils/security/self-validation.ts',
    'src/utils/performance/query-cache-config.ts',
    'src/utils/performance/websocket-optimizer.ts',
    'src/components/virtualized/VirtualizedTable.tsx',
    'src/lib/monitoring/monitoring-service.ts',
    'src/lib/testing/performance-tester.ts',
    'src/middleware.ts',
    'src/app/api/cache-config.ts'
  ],
  
  // Performance benchmarks
  performanceBenchmarks: {
    apiResponseTime: 500, // ms
    pageLoadTime: 3000,   // ms
    dataFetchTime: 1000,  // ms
    maxCpuUsage: 80,      // percentage
    maxMemoryUsage: 85    // percentage
  }
};

// Results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

/**
 * Record a test result
 */
function recordResult(category, name, passed, message, details = null, critical = true) {
  const result = {
    category,
    name,
    passed,
    message,
    details,
    critical,
    timestamp: new Date().toISOString()
  };
  
  results.details.push(result);
  
  if (passed) {
    results.passed++;
    console.log(safeChalk('green')(`✓ [${category}] ${name}: ${message}`));
  } else {
    if (critical) {
      results.failed++;
      console.log(safeChalk('red')(`✗ [${category}] ${name}: ${message}`));
      if (details) {
        console.log(safeChalk('gray')(`  Details: ${JSON.stringify(details)}`));
      }
    } else {
      results.warnings++;
      console.log(safeChalk('yellow')(`⚠ [${category}] ${name}: ${message}`));
      if (details) {
        console.log(safeChalk('gray')(`  Details: ${JSON.stringify(details)}`));
      }
    }
  }
}

/**
 * Verify environment variables
 */
async function verifyEnvironment() {
  console.log(safeChalk('blue')('\n📋 Verifying environment variables...'));
  
  // Check required env vars
  config.requiredEnvVars.forEach(envVar => {
    const exists = process.env[envVar] !== undefined;
    const value = process.env[envVar];
    
    recordResult(
      'Environment',
      envVar,
      exists && value?.length > 0,
      exists && value?.length > 0
        ? `${envVar} is set correctly`
        : `${envVar} is missing or empty`,
      null,
      true
    );
  });
  
  // Check encryption secret length
  if (process.env.ENCRYPTION_SECRET) {
    const hasValidLength = process.env.ENCRYPTION_SECRET.length === 32;
    recordResult(
      'Environment',
      'ENCRYPTION_SECRET Length',
      hasValidLength,
      hasValidLength
        ? 'ENCRYPTION_SECRET has valid length (32 characters)'
        : `ENCRYPTION_SECRET has invalid length (${process.env.ENCRYPTION_SECRET.length} characters, expected 32)`,
      null,
      true
    );
  }
}

/**
 * Verify critical files
 */
async function verifyCriticalFiles() {
  console.log(safeChalk('blue')('\n📂 Verifying critical files...'));
  
  config.criticalFiles.forEach(filePath => {
    const fullPath = path.resolve(process.cwd(), filePath);
    const exists = fs.existsSync(fullPath);
    
    recordResult(
      'Files',
      filePath,
      exists,
      exists
        ? `${filePath} exists`
        : `${filePath} is missing`,
      null,
      true
    );
    
    if (exists) {
      // Verify file contents for sensitive files
      if (filePath === 'next.config.js') {
        const content = fs.readFileSync(fullPath, 'utf8');
        const hasProductionConfig = content.includes('reactStrictMode');
        
        recordResult(
          'Files',
          'next.config.js Configuration',
          hasProductionConfig,
          hasProductionConfig
            ? 'next.config.js has production configuration'
            : 'next.config.js may be missing production configuration',
          null,
          false
        );
      }
      
      if (filePath === 'src/types/database.types.ts') {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Check for key tables in the generated types
        const hasTables = config.requiredTables.every(table => 
          content.includes(`${table}:`) || content.includes(`"${table}"`)
        );
        
        recordResult(
          'Files',
          'database.types.ts',
          hasTables,
          hasTables
            ? 'database.types.ts has all required table types'
            : 'database.types.ts may be missing some table type definitions',
          null,
          true
        );
      }
    }
  });
}

/**
 * Verify build process
 */
async function verifyBuild() {
  console.log(safeChalk('blue')('\n🔨 Verifying build process...'));
  
  try {
    // Run a production build
    console.log(safeChalk('yellow')('Running production build (this may take a few minutes)...'));
    execSync('npm run build', { stdio: 'pipe' });
    
    recordResult(
      'Build',
      'Production Build',
      true,
      'Production build completed successfully',
      null,
      true
    );
    
    // Check for .next directory
    const nextDirExists = fs.existsSync(path.resolve(process.cwd(), '.next'));
    recordResult(
      'Build',
      '.next Directory',
      nextDirExists,
      nextDirExists
        ? '.next directory was created'
        : '.next directory is missing after build',
      null,
      true
    );
    
    // Check for critical build files
    if (nextDirExists) {
      const buildFiles = [
        '.next/BUILD_ID',
        '.next/build-manifest.json',
        '.next/server/pages-manifest.json'
      ];
      
      buildFiles.forEach(file => {
        const exists = fs.existsSync(path.resolve(process.cwd(), file));
        recordResult(
          'Build',
          file,
          exists,
          exists
            ? `${file} exists`
            : `${file} is missing`,
          null,
          false
        );
      });
    }
  } catch (error) {
    recordResult(
      'Build',
      'Production Build',
      false,
      'Production build failed',
      { error: error.message },
      true
    );
  }
}

/**
 * Verify database connection and schema
 */
async function verifyDatabase() {
  console.log(safeChalk('blue')('\n📝 Verifying database connection and schema...'));
  
  if (!config.supabaseUrl || !config.supabaseKey) {
    recordResult(
      'Database',
      'Connection Configuration',
      false,
      'Missing Supabase URL or key in environment variables',
      null,
      true
    );
    return;
  }
  
  try {
    // Create Supabase client
    const supabase = createClient(config.supabaseUrl, config.supabaseKey);
    
    // Test connection
    const { data: tables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      recordResult(
        'Database',
        'Connection',
        false,
        'Failed to connect to database',
        { error: tablesError.message },
        true
      );
      return;
    }
    
    recordResult(
      'Database',
      'Connection',
      true,
      'Successfully connected to database',
      null,
      true
    );
    
    // Verify required tables
    const tableNames = tables.map(t => t.tablename);
    
    config.requiredTables.forEach(table => {
      const exists = tableNames.includes(table);
      recordResult(
        'Database',
        `Table: ${table}`,
        exists,
        exists
          ? `Table '${table}' exists`
          : `Table '${table}' is missing`,
        null,
        true
      );
    });
    
    // Check RLS policies
    const { data: rlsPolicies, error: rlsError } = await supabase
      .rpc('check_rls_coverage');
    
    if (rlsError) {
      recordResult(
        'Database',
        'RLS Policies',
        false,
        'Failed to check RLS policies',
        { error: rlsError.message },
        false
      );
    } else {
      const tablesWithoutRls = rlsPolicies.filter(policy => !policy.has_rls);
      
      recordResult(
        'Database',
        'RLS Policies',
        tablesWithoutRls.length === 0,
        tablesWithoutRls.length === 0
          ? 'All tables have RLS policies'
          : `Some tables are missing RLS policies`,
        tablesWithoutRls.length > 0
          ? { tablesWithoutRls: tablesWithoutRls.map(t => t.table_name) }
          : null,
        true
      );
    }
  } catch (error) {
    recordResult(
      'Database',
      'Verification',
      false,
      'Database verification failed with an exception',
      { error: error.message },
      true
    );
  }
}

/**
 * Verify API endpoints
 */
async function verifyApiEndpoints() {
  console.log(safeChalk('blue')('\n🔍 Verifying API endpoints...'));
  
  // Start local server if needed
  let localServerProcess = null;
  
  try {
    if (config.dashboardUrl.includes('localhost')) {
      console.log(safeChalk('yellow')('Starting local server for API testing...'));
      localServerProcess = require('child_process').spawn(
        'npm',
        ['run', 'start'],
        { stdio: 'ignore', detached: true }
      );
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    // Test each endpoint
    for (const endpoint of config.apiEndpoints) {
      try {
        const url = `${config.dashboardUrl}${endpoint}`;
        const response = await axios.get(url, { 
          validateStatus: () => true,
          timeout: 10000
        });
        
        // For auth endpoints, 401 is acceptable as it means auth is working
        const isAuthEndpoint = endpoint.includes('/auth/');
        const isSuccessful = response.status < 500 && (response.status < 400 || (isAuthEndpoint && response.status === 401));
        
        recordResult(
          'API',
          endpoint,
          isSuccessful,
          isSuccessful
            ? `Endpoint ${endpoint} is responding correctly (status: ${response.status})`
            : `Endpoint ${endpoint} returned error status: ${response.status}`,
          { status: response.status },
          true
        );
      } catch (error) {
        recordResult(
          'API',
          endpoint,
          false,
          `Failed to connect to endpoint ${endpoint}`,
          { error: error.message },
          true
        );
      }
    }
  } finally {
    // Clean up local server if started
    if (localServerProcess) {
      process.kill(-localServerProcess.pid);
    }
  }
}

/**
 * Verify Vault Banking System connection
 */
async function verifyVaultBanking() {
  console.log(safeChalk('blue')('\n💰 Verifying Vault Banking System...'));
  
  if (!config.vaultUrl) {
    recordResult(
      'Vault',
      'Connection Configuration',
      false,
      'Missing Vault Banking URL in environment variables',
      null,
      true
    );
    return;
  }
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${config.vaultUrl}/api/health`, {
      validateStatus: () => true,
      timeout: 10000
    });
    
    const isHealthy = healthResponse.status === 200;
    
    recordResult(
      'Vault',
      'Health Endpoint',
      isHealthy,
      isHealthy
        ? 'Vault Banking health endpoint is responding correctly'
        : `Vault Banking health endpoint returned status: ${healthResponse.status}`,
      { status: healthResponse.status },
      true
    );
    
    // Test version endpoint to verify API compatibility
    try {
      const versionResponse = await axios.get(`${config.vaultUrl}/api/version`, {
        validateStatus: () => true,
        timeout: 5000
      });
      
      const version = versionResponse.data?.version;
      
      recordResult(
        'Vault',
        'API Version',
        !!version,
        version
          ? `Vault Banking API version: ${version}`
          : 'Failed to retrieve Vault Banking API version',
        { version },
        false
      );
    } catch (error) {
      recordResult(
        'Vault',
        'API Version',
        false,
        'Failed to retrieve Vault Banking API version',
        { error: error.message },
        false
      );
    }
  } catch (error) {
    recordResult(
      'Vault',
      'Connection',
      false,
      'Failed to connect to Vault Banking System',
      { error: error.message },
      true
    );
  }
}

/**
 * Verify security configuration
 */
async function verifySecurity() {
  console.log(safeChalk('blue')('\n🔒 Verifying security configuration...'));
  
  // Verify encryption secret configuration
  const hasEncryptionSecret = !!process.env.ENCRYPTION_SECRET;
  const validEncryptionSecret = hasEncryptionSecret && process.env.ENCRYPTION_SECRET.length === 32;
  
  recordResult(
    'Security',
    'Encryption Secret',
    validEncryptionSecret,
    validEncryptionSecret
      ? 'Encryption secret is configured correctly'
      : hasEncryptionSecret
        ? 'Encryption secret has invalid length'
        : 'Encryption secret is missing',
    null,
    true
  );
  
  // Check for security headers in middleware.ts
  try {
    const middlewarePath = path.resolve(process.cwd(), 'src/middleware.ts');
    
    if (fs.existsSync(middlewarePath)) {
      const content = fs.readFileSync(middlewarePath, 'utf8');
      
      const hasSecurityHeaders = [
        'X-XSS-Protection',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Content-Security-Policy'
      ].every(header => content.includes(header));
      
      recordResult(
        'Security',
        'Security Headers',
        hasSecurityHeaders,
        hasSecurityHeaders
          ? 'Security headers are configured in middleware'
          : 'Security headers may be missing in middleware',
        null,
        true
      );
      
      // Check for authentication in middleware
      const hasAuth = content.includes('supabase.auth.getSession');
      
      recordResult(
        'Security',
        'Authentication Middleware',
        hasAuth,
        hasAuth
          ? 'Authentication is implemented in middleware'
          : 'Authentication check may be missing in middleware',
        null,
        true
      );
      
      // Check for rate limiting
      const hasRateLimit = content.includes('rate limit') || content.includes('rateLimit');
      
      recordResult(
        'Security',
        'Rate Limiting',
        hasRateLimit,
        hasRateLimit
          ? 'Rate limiting is implemented in middleware'
          : 'Rate limiting may be missing in middleware',
        null,
        true
      );
    } else {
      recordResult(
        'Security',
        'Middleware',
        false,
        'middleware.ts file is missing',
        null,
        true
      );
    }
  } catch (error) {
    recordResult(
      'Security',
      'Middleware Check',
      false,
      'Failed to check middleware configuration',
      { error: error.message },
      false
    );
  }
}

/**
 * Generate verification report
 */
async function generateReport() {
  console.log(safeChalk('blue')('\n📃 Generating verification report...'));
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.passed + results.failed + results.warnings,
      passed: results.passed,
      failed: results.failed,
      warnings: results.warnings,
      passRate: Math.round((results.passed / (results.passed + results.failed)) * 100)
    },
    results: results.details,
    goNoGoDecision: results.failed === 0 ? 'GO' : 'NO-GO'
  };
  
  // Write report to file
  const reportPath = path.resolve(process.cwd(), 'verification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(chalk.green(`\nVerification report saved to: ${reportPath}`));
  
  // Generate HTML report
  const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trading Farm Verification Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #1a365d;
    }
    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-item {
      background: #f7fafc;
      border-radius: 5px;
      padding: 20px;
      flex: 1;
      min-width: 200px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .summary-item h3 {
      margin-top: 0;
    }
    .result-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .result-table th, .result-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #ddd;
      text-align: left;
    }
    .result-table th {
      background-color: #f7fafc;
      font-weight: 600;
    }
    .passed {
      color: #22543d;
      background-color: #f0fff4;
    }
    .failed {
      color: #822727;
      background-color: #fff5f5;
    }
    .warning {
      color: #744210;
      background-color: #fffff0;
    }
    .decision {
      padding: 20px;
      border-radius: 5px;
      font-weight: bold;
      text-align: center;
      font-size: 24px;
      margin: 20px 0;
    }
    .go {
      background-color: #f0fff4;
      color: #22543d;
      border: 2px solid #68d391;
    }
    .no-go {
      background-color: #fff5f5;
      color: #822727;
      border: 2px solid #fc8181;
    }
  </style>
</head>
<body>
  <h1>Trading Farm Verification Report</h1>
  <p>Generated on: ${new Date().toLocaleString()}</p>
  
  <div class="decision ${report.goNoGoDecision === 'GO' ? 'go' : 'no-go'}">
    Final Decision: ${report.goNoGoDecision}
  </div>
  
  <div class="summary">
    <div class="summary-item">
      <h3>Test Results</h3>
      <p><strong>Total Checks:</strong> ${report.summary.total}</p>
      <p><strong>Passed:</strong> ${report.summary.passed}</p>
      <p><strong>Failed:</strong> ${report.summary.failed}</p>
      <p><strong>Warnings:</strong> ${report.summary.warnings}</p>
      <p><strong>Pass Rate:</strong> ${report.summary.passRate}%</p>
    </div>
  </div>
  
  <h2>Critical Issues</h2>
  
  <table class="result-table">
    <thead>
      <tr>
        <th>Category</th>
        <th>Name</th>
        <th>Status</th>
        <th>Message</th>
      </tr>
    </thead>
    <tbody>
      ${report.results
        .filter(r => !r.passed && r.critical)
        .map(result => `
          <tr class="failed">
            <td>${result.category}</td>
            <td>${result.name}</td>
            <td>Failed</td>
            <td>${result.message}</td>
          </tr>
        `).join('')}
    </tbody>
  </table>
  
  ${report.results.filter(r => !r.passed && r.critical).length === 0 ? 
    '<p>No critical issues found. System is ready for production.</p>' : ''}
  
  <h2>Warnings</h2>
  
  <table class="result-table">
    <thead>
      <tr>
        <th>Category</th>
        <th>Name</th>
        <th>Status</th>
        <th>Message</th>
      </tr>
    </thead>
    <tbody>
      ${report.results
        .filter(r => !r.passed && !r.critical)
        .map(result => `
          <tr class="warning">
            <td>${result.category}</td>
            <td>${result.name}</td>
            <td>Warning</td>
            <td>${result.message}</td>
          </tr>
        `).join('')}
    </tbody>
  </table>
  
  ${report.results.filter(r => !r.passed && !r.critical).length === 0 ? 
    '<p>No warnings found.</p>' : ''}
  
  <h2>All Results</h2>
  
  <table class="result-table">
    <thead>
      <tr>
        <th>Category</th>
        <th>Name</th>
        <th>Status</th>
        <th>Message</th>
      </tr>
    </thead>
    <tbody>
      ${report.results.map(result => `
        <tr class="${result.passed ? 'passed' : result.critical ? 'failed' : 'warning'}">
          <td>${result.category}</td>
          <td>${result.name}</td>
          <td>${result.passed ? 'Passed' : result.critical ? 'Failed' : 'Warning'}</td>
          <td>${result.message}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;
  
  // Write HTML report to file
  const htmlReportPath = path.resolve(process.cwd(), 'verification-report.html');
  fs.writeFileSync(htmlReportPath, htmlReport);
  
  console.log(chalk.green(`HTML report saved to: ${htmlReportPath}`));
  
  // Print summary
  console.log(chalk.blue('\n📋 Verification Summary:'));
  console.log(chalk.white(`Total Checks: ${report.summary.total}`));
  console.log(chalk.green(`Passed: ${report.summary.passed}`));
  console.log(chalk.red(`Failed: ${report.summary.failed}`));
  console.log(chalk.yellow(`Warnings: ${report.summary.warnings}`));
  console.log(chalk.white(`Pass Rate: ${report.summary.passRate}%`));
  
  console.log(chalk.blue(`\n🚦 Final Decision: ${report.goNoGoDecision === 'GO' ? chalk.green('GO') : chalk.red('NO-GO')}`));
  
  if (report.goNoGoDecision === 'NO-GO') {
    console.log(chalk.red('\nCritical issues must be resolved before proceeding to production:'));
    report.results
      .filter(r => !r.passed && r.critical)
      .forEach(issue => {
        console.log(chalk.red(`- [${issue.category}] ${issue.name}: ${issue.message}`));
      });
  }
  
  if (report.results.filter(r => !r.passed && !r.critical).length > 0) {
    console.log(chalk.yellow('\nWarnings to consider:'));
    report.results
      .filter(r => !r.passed && !r.critical)
      .forEach(issue => {
        console.log(chalk.yellow(`- [${issue.category}] ${issue.name}: ${issue.message}`));
      });
  }
  
  return report;
}

/**
 * Main verification function
 */
async function runVerification() {
  console.log(chalk.blue('🚀 Starting Trading Farm Final Verification'));
  console.log(chalk.blue('==========================================='));
  
  try {
    // Run all verification steps
    await verifyEnvironment();
    await verifyCriticalFiles();
    await verifyBuild();
    await verifyDatabase();
    await verifyApiEndpoints();
    await verifyVaultBanking();
    await verifySecurity();
    
    // Generate final report
    const report = generateReport();
    
    process.exit(report.goNoGoDecision === 'GO' ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('Verification failed with an unhandled exception:'));
    console.error(error);
    process.exit(1);
  }
}

/**
 * Verify advanced features we've implemented
 */
async function verifyAdvancedFeatures() {
  console.log(safeChalk('blue')('\n🚀 Verifying advanced features implementation...'));
  
  // Check if all required files exist
  config.advancedFeatureFiles.forEach(filePath => {
    const fullPath = path.resolve(process.cwd(), filePath);
    const exists = fs.existsSync(fullPath);
    
    recordResult(
      'Advanced Features',
      filePath,
      exists,
      exists
        ? `${filePath} exists`
        : `${filePath} is missing`,
      null,
      true
    );
  });
  
  // Check Risk Management API
  try {
    const response = await axios.get(`${config.dashboardUrl}/api/risk/parameters`, {
      headers: { 'x-verification': 'production-check' }
    });
    
    recordResult(
      'Advanced Features',
      'Risk Management API',
      response.status === 200,
      response.status === 200
        ? 'Risk Management API is operational'
        : `Risk Management API returned unexpected status: ${response.status}`,
      response.data,
      true
    );
  } catch (error) {
    recordResult(
      'Advanced Features',
      'Risk Management API',
      false,
      `Risk Management API failed: ${error.message}`,
      error.response?.data || null,
      true
    );
  }
  
  // Check Agent Controller API
  try {
    const response = await axios.get(`${config.dashboardUrl}/api/agents/controller/status`, {
      headers: { 'x-verification': 'production-check' }
    });
    
    recordResult(
      'Advanced Features',
      'Agent Controller API',
      response.status === 200,
      response.status === 200
        ? 'Agent Controller API is operational'
        : `Agent Controller API returned unexpected status: ${response.status}`,
      response.data,
      true
    );
  } catch (error) {
    recordResult(
      'Advanced Features',
      'Agent Controller API',
      false,
      `Agent Controller API failed: ${error.message}`,
      error.response?.data || null,
      true
    );
  }
  
  // Check Monitoring Service
  try {
    const response = await axios.get(`${config.dashboardUrl}/api/monitoring/health`, {
      headers: { 'x-verification': 'production-check' }
    });
    
    recordResult(
      'Advanced Features',
      'Monitoring Service',
      response.status === 200 && response.data.status === 'ok',
      response.status === 200 && response.data.status === 'ok'
        ? 'Monitoring Service is healthy'
        : `Monitoring Service health check failed`,
      response.data,
      true
    );
  } catch (error) {
    recordResult(
      'Advanced Features',
      'Monitoring Service',
      false,
      `Monitoring Service health check failed: ${error.message}`,
      error.response?.data || null,
      true
    );
  }
}

/**
 * Verify performance under load
 */
async function verifyPerformance() {
  console.log(safeChalk('blue')('\n⚡ Verifying performance metrics...'));
  
  // API response time test
  try {
    const start = performance.now();
    const response = await axios.get(`${config.dashboardUrl}/api/monitoring/metrics`);
    const duration = performance.now() - start;
    
    recordResult(
      'Performance',
      'API Response Time',
      duration < config.performanceBenchmarks.apiResponseTime,
      duration < config.performanceBenchmarks.apiResponseTime
        ? `API responded in ${duration.toFixed(2)}ms (below ${config.performanceBenchmarks.apiResponseTime}ms threshold)`
        : `API responded in ${duration.toFixed(2)}ms (exceeds ${config.performanceBenchmarks.apiResponseTime}ms threshold)`,
      { duration, threshold: config.performanceBenchmarks.apiResponseTime },
      false
    );
  } catch (error) {
    recordResult(
      'Performance',
      'API Response Time',
      false,
      `API response time test failed: ${error.message}`,
      null,
      false
    );
  }
  
  // WebSocket data transmission test
  try {
    return new Promise((resolve, reject) => {
      const wsUrl = config.dashboardUrl.replace('http', 'ws') + '/api/ws';
      const ws = new WebSocket(wsUrl);
      let messageReceived = false;
      let compressionWorks = false;
      let startTime = 0;
      let endTime = 0;
      
      // Set a timeout for the test
      const timeout = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        recordResult(
          'Performance',
          'WebSocket Performance',
          false,
          'WebSocket test timed out',
          null,
          false
        );
        resolve();
      }, 5000);
      
      ws.on('open', () => {
        startTime = performance.now();
        // Send a sample message to test compression
        const testData = { type: 'performance_test', payload: { data: 'x'.repeat(1000) } };
        ws.send(JSON.stringify(testData));
      });
      
      ws.on('message', (data) => {
        messageReceived = true;
        endTime = performance.now();
        
        try {
          // Try to decompress if it's compressed
          let parsedData;
          try {
            const decompressed = zlib.inflateSync(data);
            parsedData = JSON.parse(decompressed.toString());
            compressionWorks = true;
          } catch (e) {
            // If decompression fails, try parsing as JSON
            parsedData = JSON.parse(data.toString());
          }
          
          // Clear timeout and close connection
          clearTimeout(timeout);
          ws.close();
          
          const duration = endTime - startTime;
          
          recordResult(
            'Performance',
            'WebSocket Performance',
            duration < config.performanceBenchmarks.dataFetchTime,
            duration < config.performanceBenchmarks.dataFetchTime
              ? `WebSocket round-trip took ${duration.toFixed(2)}ms (below ${config.performanceBenchmarks.dataFetchTime}ms threshold)`
              : `WebSocket round-trip took ${duration.toFixed(2)}ms (exceeds ${config.performanceBenchmarks.dataFetchTime}ms threshold)`,
            { 
              duration, 
              threshold: config.performanceBenchmarks.dataFetchTime,
              compressionWorking: compressionWorks 
            },
            false
          );
          
          resolve();
        } catch (error) {
          ws.close();
          clearTimeout(timeout);
          
          recordResult(
            'Performance',
            'WebSocket Performance',
            false,
            `WebSocket data parsing failed: ${error.message}`,
            null,
            false
          );
          
          resolve();
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        
        recordResult(
          'Performance',
          'WebSocket Performance',
          false,
          `WebSocket connection failed: ${error.message}`,
          null,
          false
        );
        
        resolve();
      });
    });
  } catch (error) {
    recordResult(
      'Performance',
      'WebSocket Performance',
      false,
      `WebSocket test error: ${error.message}`,
      null,
      false
    );
  }
  
  // Check server resource usage
  try {
    const response = await axios.get(`${config.dashboardUrl}/api/monitoring/metrics`);
    
    if (response.data.system && response.data.system.cpu && response.data.system.memory) {
      const cpuUsage = response.data.system.cpu.usage;
      const memoryUsage = response.data.system.memory.usagePercent;
      
      recordResult(
        'Performance',
        'CPU Usage',
        cpuUsage < config.performanceBenchmarks.maxCpuUsage,
        cpuUsage < config.performanceBenchmarks.maxCpuUsage
          ? `CPU usage is ${cpuUsage.toFixed(2)}% (below ${config.performanceBenchmarks.maxCpuUsage}% threshold)`
          : `CPU usage is ${cpuUsage.toFixed(2)}% (exceeds ${config.performanceBenchmarks.maxCpuUsage}% threshold)`,
        { usage: cpuUsage, threshold: config.performanceBenchmarks.maxCpuUsage },
        false
      );
      
      recordResult(
        'Performance',
        'Memory Usage',
        memoryUsage < config.performanceBenchmarks.maxMemoryUsage,
        memoryUsage < config.performanceBenchmarks.maxMemoryUsage
          ? `Memory usage is ${memoryUsage.toFixed(2)}% (below ${config.performanceBenchmarks.maxMemoryUsage}% threshold)`
          : `Memory usage is ${memoryUsage.toFixed(2)}% (exceeds ${config.performanceBenchmarks.maxMemoryUsage}% threshold)`,
        { usage: memoryUsage, threshold: config.performanceBenchmarks.maxMemoryUsage },
        false
      );
    } else {
      recordResult(
        'Performance',
        'System Resources',
        false,
        'System resource metrics not available',
        response.data,
        false
      );
    }
  } catch (error) {
    recordResult(
      'Performance',
      'System Resources',
      false,
      `Failed to get system resource metrics: ${error.message}`,
      null,
      false
    );
  }
}

/**
 * Verify database migrations are up to date
 */
async function verifyDatabaseMigrations() {
  console.log(safeChalk('blue')('\n🔄 Verifying database migrations...'));
  
  try {
    // Check for migration directory
    const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
    const migrationsDirExists = fs.existsSync(migrationsDir);
    
    recordResult(
      'Database Migrations',
      'Migrations Directory',
      migrationsDirExists,
      migrationsDirExists
        ? 'Migrations directory exists'
        : 'Migrations directory is missing',
      null,
      true
    );
    
    if (migrationsDirExists) {
      // Count migration files
      const migrationFiles = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
      
      recordResult(
        'Database Migrations',
        'Migration Files',
        migrationFiles.length > 0,
        migrationFiles.length > 0
          ? `Found ${migrationFiles.length} migration files`
          : 'No migration files found',
        { files: migrationFiles },
        true
      );
      
      // Check migration status if supabase CLI is available
      try {
        const migrationStatus = execSync('npx supabase migration list', { encoding: 'utf8' });
        
        // Check for pending migrations
        const hasPendingMigrations = migrationStatus.includes('Pending');
        
        recordResult(
          'Database Migrations',
          'Migration Status',
          !hasPendingMigrations,
          !hasPendingMigrations
            ? 'All migrations are applied'
            : 'There are pending migrations that need to be applied',
          { status: migrationStatus },
          true
        );
      } catch (error) {
        recordResult(
          'Database Migrations',
          'Migration Status Check',
          false,
          `Failed to check migration status: ${error.message}`,
          null,
          false
        );
      }
    }
    
    // Connect to database and check schema version
    if (config.supabaseUrl && config.supabaseKey) {
      const supabase = createClient(config.supabaseUrl, config.supabaseKey);
      
      // Check if we can query the schema version
      try {
        const { data, error } = await supabase
          .rpc('get_schema_version')
          .single();
        
        if (error) throw error;
        
        recordResult(
          'Database Migrations',
          'Schema Version',
          !!data,
          data
            ? `Schema version: ${data.version}`
            : 'Could not determine schema version',
          { version: data?.version },
          false
        );
      } catch (error) {
        // This might fail if the get_schema_version function doesn't exist, which is not critical
        recordResult(
          'Database Migrations',
          'Schema Version',
          false,
          `Could not check schema version: ${error.message}`,
          null,
          false
        );
      }
    }
  } catch (error) {
    recordResult(
      'Database Migrations',
      'Migration Verification',
      false,
      `Failed to verify migrations: ${error.message}`,
      null,
      true
    );
  }
}

// Update the main verification function to include our new verifications
async function runVerification() {
  console.log(safeChalk('blue').bold('🔍 STARTING TRADING FARM FINAL VERIFICATION'));
  console.log(safeChalk('gray')(`Time: ${new Date().toISOString()}`));
  console.log(safeChalk('gray')(`Environment: ${process.env.NODE_ENV || 'development'}`));
  console.log(safeChalk('gray')(`Dashboard URL: ${config.dashboardUrl}`));
  console.log(safeChalk('gray')('-'.repeat(50)));
  
  try {
    // Core verifications
    await verifyEnvironment();
    await verifyCriticalFiles();
    await verifyBuild();
    await verifyDatabase();
    await verifyApiEndpoints();
    await verifyVaultBanking();
    await verifySecurity();
    
    // New advanced verifications
    await verifyAdvancedFeatures();
    await verifyPerformance();
    await verifyDatabaseMigrations();
    
    // Generate report
    await generateReport();
    
    // Final summary
    const totalTests = results.passed + results.failed + results.warnings;
    const passRate = ((results.passed / totalTests) * 100).toFixed(2);
    
    console.log(safeChalk('gray')('-'.repeat(50)));
    console.log(safeChalk('blue').bold('📊 VERIFICATION SUMMARY'));
    console.log(safeChalk('green')(`✓ Passed: ${results.passed}`));
    console.log(safeChalk('yellow')(`⚠ Warnings: ${results.warnings}`));
    console.log(safeChalk('red')(`✗ Failed: ${results.failed}`));
    console.log(safeChalk('blue')(`Pass Rate: ${passRate}%`));
    
    if (results.failed === 0) {
      console.log(safeChalk('green').bold('\n✅ VERIFICATION PASSED - READY FOR PRODUCTION'));
      
      if (results.warnings > 0) {
        console.log(safeChalk('yellow')(`Note: ${results.warnings} warnings were found. Review the report for details.`));
      }
    } else {
      console.log(safeChalk('red').bold(`\n❌ VERIFICATION FAILED - ${results.failed} CRITICAL ISSUES FOUND`));
      console.log(safeChalk('red')('Fix all critical issues before proceeding with production deployment.'));
    }
  } catch (error) {
    console.error(safeChalk('red')(`Verification process error: ${error.message}`));
    console.error(error.stack);
  }
}

// Add to package.json scripts
try {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Check if we have a verify:production script
  if (!packageJson.scripts['verify:production']) {
    packageJson.scripts['verify:production'] = 'NODE_ENV=production node scripts/final-verification.js';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(safeChalk('gray')('Added verify:production script to package.json'));
  }
} catch (error) {
  console.log(safeChalk('yellow')(`Note: Could not update package.json - ${error.message}`));
}

// Run the verification
runVerification();
