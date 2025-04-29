#!/usr/bin/env node

/**
 * Trading Farm Dashboard - Post-Launch Monitoring Script
 * 
 * This script provides intensive monitoring during the initial hours/days after launch.
 * It checks system health, performance metrics, error rates, and user activity.
 * 
 * Features:
 * - Periodic health checks of all critical endpoints
 * - Performance metric collection and anomaly detection
 * - Error rate monitoring with alerting thresholds
 * - User activity tracking
 * - Database connection monitoring
 * - Resource utilization checking
 * 
 * Usage: node post-launch-monitor.js --duration=24h --interval=5m
 */

const fetch = require('node-fetch');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { program } = require('commander');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.production' });

// Parse command line arguments
program
  .option('-d, --duration <duration>', 'Monitoring duration (e.g., 24h)', '24h')
  .option('-i, --interval <interval>', 'Check interval (e.g., 5m)', '5m')
  .option('-t, --threshold <number>', 'Error threshold for alerts (percent)', '5')
  .option('-o, --output <file>', 'Output log file', 'post-launch-monitoring.log')
  .option('--slack-webhook <url>', 'Slack webhook URL for alerts')
  .option('--email <email>', 'Email for alerts')
  .parse(process.argv);

const options = program.opts();

// Configuration
const config = {
  app: {
    name: 'Trading Farm Dashboard',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
  },
  monitoring: {
    durationMs: parseDuration(options.duration),
    intervalMs: parseDuration(options.interval),
    errorThresholdPercent: parseInt(options.threshold, 10),
    outputFile: options.output,
    slackWebhook: options.slackWebhook || process.env.SLACK_WEBHOOK_URL,
    alertEmail: options.email || process.env.ALERT_EMAIL
  },
  endpoints: [
    { name: 'Health Check', path: '/api/health', expectedStatus: 200 },
    { name: 'Dashboard Data', path: '/api/dashboard/summary', expectedStatus: 200 },
    { name: 'User Profile', path: '/api/user/profile', expectedStatus: 200 },
    { name: 'Positions', path: '/api/positions', expectedStatus: 200 },
    { name: 'Orders', path: '/api/orders', expectedStatus: 200 },
    { name: 'Agents', path: '/api/agents', expectedStatus: 200 },
    { name: 'Vault Accounts', path: '/api/vault/accounts', expectedStatus: 200 },
    { name: 'Market Data', path: '/api/markets/data', expectedStatus: 200 },
  ]
};

// Monitoring state
const state = {
  startTime: new Date(),
  endTime: new Date(Date.now() + config.monitoring.durationMs),
  iterations: 0,
  checks: {
    total: 0,
    successful: 0,
    failed: 0
  },
  endpoints: {},
  alerts: [],
  performance: {
    responseTimeMs: [],
  },
  errors: {}
};

// Initialize endpoint stats
config.endpoints.forEach(endpoint => {
  state.endpoints[endpoint.path] = {
    checks: 0,
    successful: 0,
    failed: 0,
    responseTimeMs: [],
    lastStatus: null,
    lastResponse: null,
    lastChecked: null,
    consecutiveFailures: 0
  };
});

// Utility Functions
function parseDuration(duration) {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1), 10);
  
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      console.warn(`Unknown duration unit: ${unit}, defaulting to seconds`);
      return value * 1000;
  }
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function logMessage(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  
  // Log to console with color
  switch (type) {
    case 'info':
      console.log(chalk.blue(logEntry));
      break;
    case 'success':
      console.log(chalk.green(logEntry));
      break;
    case 'warning':
      console.log(chalk.yellow(logEntry));
      break;
    case 'error':
      console.log(chalk.red(logEntry));
      break;
    case 'critical':
      console.log(chalk.bgRed.white(logEntry));
      break;
    default:
      console.log(logEntry);
  }
  
  // Append to log file
  fs.appendFileSync(
    path.join(process.cwd(), config.monitoring.outputFile),
    `${logEntry}\n`
  );
  
  // If critical or error, add to alerts
  if (type === 'critical' || type === 'error') {
    state.alerts.push({
      timestamp,
      type,
      message
    });
    
    // Send alert if configured
    sendAlert(message, type);
  }
}

function sendAlert(message, level) {
  // Send to Slack if webhook is configured
  if (config.monitoring.slackWebhook) {
    try {
      fetch(config.monitoring.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `[${level.toUpperCase()}] ${config.app.name}: ${message}`
        })
      }).catch(err => console.error('Failed to send Slack alert:', err));
    } catch (error) {
      console.error('Error sending Slack alert:', error);
    }
  }
  
  // Send email alert if configured
  if (config.monitoring.alertEmail) {
    // Implementation would depend on email service
    console.log(`Would send email to ${config.monitoring.alertEmail}`);
  }
}

async function checkEndpoint(endpoint) {
  const url = `${config.app.url}${endpoint.path}`;
  const startTime = Date.now();
  let responseTime = 0;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `TradingFarmMonitor/${config.app.version}`
      },
      timeout: 30000 // 30 second timeout
    });
    
    responseTime = Date.now() - startTime;
    
    const endpointState = state.endpoints[endpoint.path];
    endpointState.lastChecked = new Date();
    endpointState.lastStatus = response.status;
    endpointState.responseTimeMs.push(responseTime);
    endpointState.checks++;
    
    if (response.status === endpoint.expectedStatus) {
      endpointState.successful++;
      endpointState.consecutiveFailures = 0;
      state.checks.successful++;
      
      try {
        // Try to parse response for additional checks
        const data = await response.json();
        endpointState.lastResponse = data;
      } catch (err) {
        // Not all endpoints return JSON, so this is not critical
      }
      
      return {
        success: true,
        status: response.status,
        responseTime
      };
    } else {
      endpointState.failed++;
      endpointState.consecutiveFailures++;
      state.checks.failed++;
      
      const errorMessage = `Endpoint ${endpoint.path} returned status ${response.status} (expected ${endpoint.expectedStatus})`;
      
      // Log as error on first failure, critical on consecutive failures
      if (endpointState.consecutiveFailures > 2) {
        logMessage(errorMessage, 'critical');
      } else {
        logMessage(errorMessage, 'error');
      }
      
      return {
        success: false,
        status: response.status,
        responseTime,
        error: errorMessage
      };
    }
  } catch (error) {
    responseTime = Date.now() - startTime;
    
    const endpointState = state.endpoints[endpoint.path];
    endpointState.lastChecked = new Date();
    endpointState.lastStatus = 'ERROR';
    endpointState.responseTimeMs.push(responseTime);
    endpointState.checks++;
    endpointState.failed++;
    endpointState.consecutiveFailures++;
    state.checks.failed++;
    
    const errorMessage = `Failed to check endpoint ${endpoint.path}: ${error.message}`;
    
    // Log as error on first failure, critical on consecutive failures
    if (endpointState.consecutiveFailures > 2) {
      logMessage(errorMessage, 'critical');
    } else {
      logMessage(errorMessage, 'error');
    }
    
    return {
      success: false,
      status: 'ERROR',
      responseTime,
      error: errorMessage
    };
  }
}

async function checkSystemHealth() {
  // Check database connections if possible
  try {
    // This would typically call a database status endpoint
    const dbHealth = await fetch(`${config.app.url}/api/system/database/health`);
    if (dbHealth.ok) {
      const data = await dbHealth.json();
      if (data && data.connections && data.maxConnections) {
        const connectionPercent = (data.connections / data.maxConnections) * 100;
        if (connectionPercent > 80) {
          logMessage(`Database connection usage is high: ${connectionPercent.toFixed(1)}%`, 'warning');
        }
      }
    }
  } catch (error) {
    // Database health endpoint may not exist, so don't treat as critical
  }
  
  // Check memory usage if possible
  try {
    const memoryHealth = await fetch(`${config.app.url}/api/system/memory`);
    if (memoryHealth.ok) {
      const data = await memoryHealth.json();
      if (data && data.usedMemoryPercent && data.usedMemoryPercent > 85) {
        logMessage(`Memory usage is high: ${data.usedMemoryPercent.toFixed(1)}%`, 'warning');
      }
    }
  } catch (error) {
    // Memory health endpoint may not exist, so don't treat as critical
  }
}

async function checkUserActivity() {
  try {
    const activityResponse = await fetch(`${config.app.url}/api/analytics/active-users`);
    if (activityResponse.ok) {
      const data = await activityResponse.json();
      logMessage(`Current active users: ${data.activeUsers || 'unknown'}`, 'info');
    }
  } catch (error) {
    // User activity endpoint may not exist
  }
}

function calculateMetrics() {
  // Calculate overall success rate
  const successRate = state.checks.total === 0 ? 100 : 
    (state.checks.successful / state.checks.total) * 100;
  
  // Calculate average response times for each endpoint
  const endpointMetrics = {};
  Object.entries(state.endpoints).forEach(([path, data]) => {
    if (data.responseTimeMs.length > 0) {
      const avgResponseTime = data.responseTimeMs.reduce((sum, time) => sum + time, 0) / data.responseTimeMs.length;
      const successRate = data.checks === 0 ? 100 : (data.successful / data.checks) * 100;
      
      endpointMetrics[path] = {
        avgResponseTime: avgResponseTime.toFixed(2),
        successRate: successRate.toFixed(2),
        checks: data.checks
      };
    }
  });
  
  return {
    overallSuccessRate: successRate.toFixed(2),
    endpointMetrics,
    checkCount: state.checks.total,
    alertCount: state.alerts.length,
    runtime: formatDuration(Date.now() - state.startTime.getTime()),
    remainingTime: formatDuration(state.endTime.getTime() - Date.now())
  };
}

function printStatusReport() {
  const metrics = calculateMetrics();
  
  console.log('\n' + chalk.blue.bold('========== MONITORING STATUS REPORT =========='));
  console.log(chalk.blue(`Time: ${new Date().toISOString()}`));
  console.log(chalk.blue(`Iteration: ${state.iterations}`));
  console.log(chalk.blue(`Running for: ${metrics.runtime}`));
  console.log(chalk.blue(`Remaining: ${metrics.remainingTime}`));
  console.log(chalk.blue(`Success Rate: ${metrics.overallSuccessRate}%`));
  console.log(chalk.blue(`Total Checks: ${metrics.checkCount}`));
  console.log(chalk.blue(`Alerts: ${metrics.alertCount}`));
  
  console.log('\n' + chalk.blue('Endpoint Status:'));
  Object.entries(metrics.endpointMetrics).forEach(([path, data]) => {
    const successColor = parseFloat(data.successRate) >= 95 ? chalk.green : 
                         parseFloat(data.successRate) >= 90 ? chalk.yellow : chalk.red;
                         
    console.log(`  ${path}: ${successColor(`${data.successRate}%`)} success, ${data.avgResponseTime}ms avg response`);
  });
  
  console.log(chalk.blue('==========================================\n'));
  
  // If success rate is below threshold, send alert
  if (parseFloat(metrics.overallSuccessRate) < (100 - config.monitoring.errorThresholdPercent)) {
    logMessage(`System health degraded: ${metrics.overallSuccessRate}% success rate`, 'critical');
  }
}

async function saveMetrics() {
  const metrics = calculateMetrics();
  const reportData = {
    timestamp: new Date().toISOString(),
    metrics,
    state: {
      iterations: state.iterations,
      checks: state.checks,
      alerts: state.alerts,
    }
  };
  
  try {
    // Write to metrics file
    fs.writeFileSync(
      path.join(process.cwd(), 'monitoring-metrics.json'),
      JSON.stringify(reportData, null, 2)
    );
  } catch (error) {
    logMessage(`Failed to save metrics: ${error.message}`, 'error');
  }
}

async function runMonitoringIteration() {
  state.iterations++;
  state.checks.total += config.endpoints.length;
  
  logMessage(`Starting monitoring iteration ${state.iterations}`, 'info');
  
  // Check all endpoints
  const endpointPromises = config.endpoints.map(endpoint => checkEndpoint(endpoint));
  await Promise.all(endpointPromises);
  
  // Check system health
  await checkSystemHealth();
  
  // Check user activity
  await checkUserActivity();
  
  // Print status report every few iterations
  if (state.iterations % 5 === 0 || state.iterations === 1) {
    printStatusReport();
    await saveMetrics();
  }
}

async function startMonitoring() {
  // Clear log file
  fs.writeFileSync(
    path.join(process.cwd(), config.monitoring.outputFile),
    `# Trading Farm Dashboard Post-Launch Monitoring\n` +
    `# Started: ${state.startTime.toISOString()}\n` +
    `# Duration: ${formatDuration(config.monitoring.durationMs)}\n` +
    `# Interval: ${formatDuration(config.monitoring.intervalMs)}\n\n`
  );
  
  logMessage(`Starting post-launch monitoring for ${formatDuration(config.monitoring.durationMs)} at ${formatDuration(config.monitoring.intervalMs)} intervals`, 'info');
  logMessage(`Monitoring ${config.endpoints.length} endpoints on ${config.app.url}`, 'info');
  
  // Initial check
  await runMonitoringIteration();
  
  // Setup interval
  const intervalId = setInterval(async () => {
    try {
      // Check if monitoring duration has elapsed
      if (Date.now() >= state.endTime.getTime()) {
        clearInterval(intervalId);
        await endMonitoring();
        return;
      }
      
      await runMonitoringIteration();
    } catch (error) {
      logMessage(`Error during monitoring iteration: ${error.message}`, 'error');
    }
  }, config.monitoring.intervalMs);
  
  // Handle process termination
  process.on('SIGINT', async () => {
    clearInterval(intervalId);
    logMessage('Monitoring interrupted by user', 'warning');
    await endMonitoring();
    process.exit(0);
  });
}

async function endMonitoring() {
  logMessage('Monitoring completed', 'info');
  
  // Generate final report
  await saveMetrics();
  printStatusReport();
  
  const metrics = calculateMetrics();
  
  logMessage(`Final success rate: ${metrics.overallSuccessRate}%`, 'info');
  logMessage(`Total checks performed: ${metrics.checkCount}`, 'info');
  logMessage(`Total alerts generated: ${metrics.alertCount}`, 'info');
  
  if (metrics.alertCount > 0) {
    logMessage('Review alerts in the log file for details', 'warning');
  }
  
  logMessage(`Detailed log available at: ${config.monitoring.outputFile}`, 'info');
  logMessage(`Metrics saved to: monitoring-metrics.json`, 'info');
}

// Main function
async function main() {
  console.log(chalk.blue.bold('=== Trading Farm Dashboard Post-Launch Monitoring ==='));
  console.log(`Monitoring Duration: ${formatDuration(config.monitoring.durationMs)}`);
  console.log(`Check Interval: ${formatDuration(config.monitoring.intervalMs)}`);
  console.log(`Error Threshold: ${config.monitoring.errorThresholdPercent}%`);
  console.log(`Target URL: ${config.app.url}`);
  console.log(`Output Log: ${config.monitoring.outputFile}`);
  console.log(`Alerts: ${config.monitoring.slackWebhook ? 'Slack' : ''}${config.monitoring.alertEmail ? ' Email' : ''}${!config.monitoring.slackWebhook && !config.monitoring.alertEmail ? 'None configured' : ''}`);
  console.log(chalk.blue('====================================================='));
  
  await startMonitoring();
}

// Run if script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red(`Fatal error: ${error.message}`));
    process.exit(1);
  });
}

module.exports = {
  startMonitoring,
  checkEndpoint,
  calculateMetrics,
  config,
  state
};
