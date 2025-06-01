/**
 * Trading Farm Production Launch Script
 * 
 * This script coordinates the final launch sequence for the Trading Farm dashboard
 * after all verification checks have passed.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.production' });

// Configuration
const config = {
  projectRoot: process.cwd(),
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  deploymentProvider: 'railway', // or 'vercel', 'netlify', etc.
  requiredFiles: [
    '.env.production',
    'next.config.js',
    'package.json',
    'scripts/final-verification.js',
    'docs/production-runbook.md'
  ],
  launchSteps: [
    { id: 'backup', name: 'Create database backup', required: true },
    { id: 'verify', name: 'Run final verification', required: true },
    { id: 'build', name: 'Build production application', required: true },
    { id: 'migrate', name: 'Apply database migrations', required: true },
    { id: 'deploy', name: 'Deploy application', required: true },
    { id: 'smoke-test', name: 'Run smoke tests', required: true },
    { id: 'monitor', name: 'Initiate enhanced monitoring', required: false }
  ],
  // Launch checklist items that need manual confirmation
  launchChecklist: [
    'All critical features tested and working',
    'Production environment variables configured',
    'Database backups configured',
    'SSL certificates valid and installed',
    'Monitoring alerts configured',
    'DNS settings prepared',
    'Rollback plan documented and tested',
    'Team notified of deployment time',
    'Change management process followed'
  ]
};

// Track progress
const launchState = {
  startTime: new Date(),
  completedSteps: [],
  currentStep: null,
  success: null,
  logs: [],
  verification: {
    passed: false,
    warnings: 0,
    critical: 0
  }
};

/**
 * Log a message to console and record in launch log
 */
function logMessage(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, message, type };
  launchState.logs.push(logEntry);
  
  switch (type) {
    case 'info':
      console.log(chalk.blue(`[INFO] ${message}`));
      break;
    case 'success':
      console.log(chalk.green(`[SUCCESS] ${message}`));
      break;
    case 'warning':
      console.log(chalk.yellow(`[WARNING] ${message}`));
      break;
    case 'error':
      console.log(chalk.red(`[ERROR] ${message}`));
      break;
    default:
      console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

/**
 * Check prerequisites before starting launch
 */
async function checkPrerequisites() {
  logMessage('Checking launch prerequisites...', 'info');
  
  let allPassed = true;
  
  // Check for required files
  for (const file of config.requiredFiles) {
    const filePath = path.join(config.projectRoot, file);
    if (!fs.existsSync(filePath)) {
      logMessage(`Required file missing: ${file}`, 'error');
      allPassed = false;
    }
  }
  
  // Check for valid production URL
  if (!config.appUrl || !config.appUrl.startsWith('http')) {
    logMessage('Invalid or missing NEXT_PUBLIC_APP_URL in .env.production', 'error');
    allPassed = false;
  }
  
  // Check for production NODE_ENV
  try {
    if (process.env.NODE_ENV !== 'production') {
      logMessage('NODE_ENV is not set to "production"', 'warning');
      // Not a failure, but warn
    }
  } catch (error) {
    logMessage(`Could not check NODE_ENV: ${error.message}`, 'error');
  }
  
  // Check for proper Git state (no uncommitted changes)
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim() !== '') {
      logMessage('Uncommitted changes in Git repository. Commit or stash changes before launch.', 'warning');
      // Not a failure, but warn
    }
  } catch (error) {
    logMessage(`Could not check Git status: ${error.message}`, 'warning');
  }
  
  return allPassed;
}

/**
 * Get user confirmation for launch checklist
 */
async function confirmLaunchChecklist() {
  console.log(chalk.blue.bold('\n📋 PRODUCTION LAUNCH CHECKLIST'));
  console.log(chalk.gray('Please verify the following items before proceeding:'));
  
  const questions = config.launchChecklist.map((item, index) => ({
    type: 'confirm',
    name: `checklist_${index}`,
    message: `✓ ${item}?`,
    default: false
  }));
  
  const answers = await inquirer.prompt(questions);
  
  // Check if all items are confirmed
  const allConfirmed = Object.values(answers).every(answer => answer === true);
  
  if (!allConfirmed) {
    logMessage('Not all checklist items were confirmed. Please resolve pending items before launching.', 'error');
    return false;
  }
  
  // Final confirmation
  const { confirmLaunch } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmLaunch',
      message: chalk.yellow.bold('🚀 Are you absolutely sure you want to launch to production?'),
      default: false
    }
  ]);
  
  return confirmLaunch;
}

/**
 * Create database backup
 */
async function createDatabaseBackup() {
  logMessage('Creating database backup...', 'info');
  launchState.currentStep = 'backup';
  
  try {
    const backupDir = path.join(config.projectRoot, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `trading-farm-${timestamp}.sql`;
    const backupPath = path.join(backupDir, backupName);
    
    // Run Supabase backup command
    execSync(`npx supabase db dump --db-url "${process.env.SUPABASE_DB_URL}" > "${backupPath}"`, {
      stdio: 'inherit'
    });
    
    logMessage(`Database backup created at: ${backupPath}`, 'success');
    launchState.completedSteps.push('backup');
    return true;
  } catch (error) {
    logMessage(`Database backup failed: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Run final verification
 */
async function runFinalVerification() {
  logMessage('Running final verification...', 'info');
  launchState.currentStep = 'verify';
  
  try {
    // Run verification script
    const output = execSync('npm run verify:production', {
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    // Parse verification output to determine success
    const hasCriticalIssues = output.includes('VERIFICATION FAILED');
    const warningCount = (output.match(/\[WARNING\]/g) || []).length;
    
    launchState.verification = {
      passed: !hasCriticalIssues,
      warnings: warningCount,
      critical: hasCriticalIssues ? 1 : 0, // exact count not important, just whether there are any
      output: output
    };
    
    if (hasCriticalIssues) {
      logMessage('Final verification failed. Fix critical issues before proceeding.', 'error');
      console.log(chalk.red(output));
      return false;
    }
    
    if (warningCount > 0) {
      logMessage(`Final verification passed with ${warningCount} warnings. Review the output for details.`, 'warning');
    } else {
      logMessage('Final verification passed without any issues!', 'success');
    }
    
    launchState.completedSteps.push('verify');
    return true;
  } catch (error) {
    logMessage(`Final verification failed to run: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Build production application
 */
async function buildProductionApp() {
  logMessage('Building production application...', 'info');
  launchState.currentStep = 'build';
  
  try {
    // Make sure we're using production next.config.js
    const nextConfigPath = path.join(config.projectRoot, 'next.config.js');
    const nextConfigBackupPath = `${nextConfigPath}.backup`;
    
    // Backup current next.config.js if not already done
    if (!fs.existsSync(nextConfigBackupPath)) {
      fs.copyFileSync(nextConfigPath, nextConfigBackupPath);
      logMessage('Backed up next.config.js', 'info');
    }
    
    // Run the production build
    execSync('npm run build:prod', {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    logMessage('Production build completed successfully', 'success');
    launchState.completedSteps.push('build');
    return true;
  } catch (error) {
    logMessage(`Production build failed: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Apply database migrations
 */
async function applyDatabaseMigrations() {
  logMessage('Applying database migrations...', 'info');
  launchState.currentStep = 'migrate';
  
  try {
    execSync('npm run migrate:prod', {
      stdio: 'inherit'
    });
    
    logMessage('Database migrations applied successfully', 'success');
    launchState.completedSteps.push('migrate');
    return true;
  } catch (error) {
    logMessage(`Database migration failed: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Deploy application
 */
async function deployApplication() {
  logMessage('Deploying application...', 'info');
  launchState.currentStep = 'deploy';
  
  try {
    let deployCommand;
    
    switch (config.deploymentProvider.toLowerCase()) {
      case 'railway':
        deployCommand = 'railway up --detach';
        break;
      case 'vercel':
        deployCommand = 'vercel --prod';
        break;
      case 'netlify':
        deployCommand = 'netlify deploy --prod';
        break;
      case 'docker':
        deployCommand = 'docker build -t trading-farm:latest . && docker push trading-farm:latest';
        break;
      default:
        throw new Error(`Unknown deployment provider: ${config.deploymentProvider}`);
    }
    
    execSync(deployCommand, {
      stdio: 'inherit'
    });
    
    logMessage(`Application deployed successfully to ${config.deploymentProvider}`, 'success');
    launchState.completedSteps.push('deploy');
    return true;
  } catch (error) {
    logMessage(`Deployment failed: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Run smoke tests
 */
async function runSmokeTests() {
  logMessage('Running smoke tests...', 'info');
  launchState.currentStep = 'smoke-test';
  
  try {
    // Simple smoke test - check if app is responding
    const axios = require('axios');
    const healthResponse = await axios.get(`${config.appUrl}/api/health`);
    
    if (healthResponse.status !== 200 || healthResponse.data.status !== 'ok') {
      throw new Error(`Health check failed: ${JSON.stringify(healthResponse.data)}`);
    }
    
    // Check login page
    const loginResponse = await axios.get(`${config.appUrl}/login`);
    if (loginResponse.status !== 200) {
      throw new Error(`Login page check failed with status: ${loginResponse.status}`);
    }
    
    logMessage('Smoke tests passed successfully', 'success');
    launchState.completedSteps.push('smoke-test');
    return true;
  } catch (error) {
    logMessage(`Smoke tests failed: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Initiate enhanced monitoring
 */
async function initiateEnhancedMonitoring() {
  logMessage('Initiating enhanced monitoring...', 'info');
  launchState.currentStep = 'monitor';
  
  try {
    // Enable detailed logging and monitoring
    await axios.post(`${config.appUrl}/api/monitoring/configure`, {
      level: 'enhanced',
      alertThreshold: 'sensitive',
      duration: '24h' // Enhanced monitoring for 24 hours post-launch
    }, {
      headers: {
        Authorization: `Bearer ${process.env.MONITORING_API_KEY}`
      }
    });
    
    logMessage('Enhanced monitoring enabled for 24 hours', 'success');
    launchState.completedSteps.push('monitor');
    return true;
  } catch (error) {
    logMessage(`Failed to enable enhanced monitoring: ${error.message}`, 'warning');
    // Not critical, so return true
    return true;
  }
}

/**
 * Generate launch report
 */
async function generateLaunchReport() {
  const reportDir = path.join(config.projectRoot, 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `launch-report-${timestamp}.json`);
  
  // Calculate duration
  const endTime = new Date();
  const durationMs = endTime - launchState.startTime;
  const durationMinutes = Math.floor(durationMs / 60000);
  const durationSeconds = Math.floor((durationMs % 60000) / 1000);
  
  // Add summary info
  const report = {
    ...launchState,
    endTime,
    duration: `${durationMinutes}m ${durationSeconds}s`,
    deploymentProvider: config.deploymentProvider,
    appUrl: config.appUrl
  };
  
  // Write report to file
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logMessage(`Launch report generated at: ${reportPath}`, 'info');
  
  // Also generate a human-readable summary
  const summaryPath = path.join(reportDir, `launch-summary-${timestamp}.md`);
  
  const summaryContent = `# Trading Farm Launch Summary
  
## Overview
- **Launch Date:** ${launchState.startTime.toISOString()}
- **Completion Date:** ${endTime.toISOString()}
- **Duration:** ${durationMinutes}m ${durationSeconds}s
- **Status:** ${launchState.success ? '✅ Successful' : '❌ Failed'}
- **Deployment Provider:** ${config.deploymentProvider}
- **Application URL:** ${config.appUrl}

## Steps Completed
${config.launchSteps.map(step => {
  const completed = launchState.completedSteps.includes(step.id);
  return `- ${completed ? '✅' : '❌'} ${step.name} ${step.required ? '(Required)' : '(Optional)'}`;
}).join('\n')}

## Verification Results
- **Passed:** ${launchState.verification.passed ? 'Yes' : 'No'}
- **Warnings:** ${launchState.verification.warnings}
- **Critical Issues:** ${launchState.verification.critical}

## Next Steps
1. Monitor the application closely for the next 24 hours
2. Review any warnings from the verification process
3. Schedule a post-launch review meeting
4. Document any lessons learned

## References
- **Production Runbook:** [View Runbook](../docs/production-runbook.md)
- **Detailed Launch Log:** [View Log](${reportPath})
`;

  fs.writeFileSync(summaryPath, summaryContent);
  logMessage(`Launch summary generated at: ${summaryPath}`, 'info');
  
  return { reportPath, summaryPath };
}

/**
 * Main launch sequence
 */
async function launch() {
  console.log(chalk.blue.bold('🚀 TRADING FARM PRODUCTION LAUNCH'));
  console.log(chalk.gray(`Starting launch sequence at: ${launchState.startTime.toISOString()}`));
  console.log(chalk.gray(`Deployment provider: ${config.deploymentProvider}`));
  console.log(chalk.gray(`Target URL: ${config.appUrl}`));
  console.log(chalk.gray('-'.repeat(50)));
  
  try {
    // Check prerequisites
    const prerequisitesOk = await checkPrerequisites();
    if (!prerequisitesOk) {
      logMessage('Prerequisites check failed. Fix issues before proceeding.', 'error');
      launchState.success = false;
      await generateLaunchReport();
      return false;
    }
    
    // Get confirmation
    const confirmed = await confirmLaunchChecklist();
    if (!confirmed) {
      logMessage('Launch cancelled by user', 'info');
      return false;
    }
    
    // Execute launch steps
    const steps = [
      { func: createDatabaseBackup, id: 'backup' },
      { func: runFinalVerification, id: 'verify' },
      { func: buildProductionApp, id: 'build' },
      { func: applyDatabaseMigrations, id: 'migrate' },
      { func: deployApplication, id: 'deploy' },
      { func: runSmokeTests, id: 'smoke-test' },
      { func: initiateEnhancedMonitoring, id: 'monitor' }
    ];
    
    for (const step of steps) {
      const stepSuccess = await step.func();
      
      // If a required step fails, abort the launch
      if (!stepSuccess && config.launchSteps.find(s => s.id === step.id).required) {
        logMessage(`Launch aborted due to failure in required step: ${step.id}`, 'error');
        launchState.success = false;
        await generateLaunchReport();
        return false;
      }
    }
    
    // All steps completed
    logMessage('🎉 LAUNCH COMPLETED SUCCESSFULLY!', 'success');
    launchState.success = true;
    
    // Generate report
    const { summaryPath } = await generateLaunchReport();
    
    // Final instructions
    console.log(chalk.green.bold('\n✅ TRADING FARM IS NOW LIVE'));
    console.log(chalk.blue(`📊 Launch summary: ${summaryPath}`));
    console.log(chalk.yellow(`\n🔔 Important next steps:`));
    console.log(chalk.gray(`1. Monitor the application for the next 24 hours`));
    console.log(chalk.gray(`2. Test critical user flows manually`));
    console.log(chalk.gray(`3. Notify all stakeholders of successful launch`));
    console.log(chalk.gray(`4. Review and follow the production runbook`));
    
    return true;
  } catch (error) {
    logMessage(`Unexpected error during launch: ${error.message}`, 'error');
    console.error(error.stack);
    launchState.success = false;
    await generateLaunchReport();
    return false;
  }
}

// Execute launch if run directly
if (require.main === module) {
  launch().catch(error => {
    console.error(chalk.red(`Fatal error: ${error.message}`));
    process.exit(1);
  });
}

module.exports = { launch };
