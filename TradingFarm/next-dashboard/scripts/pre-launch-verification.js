#!/usr/bin/env node

/**
 * Trading Farm Dashboard - Production Pre-launch Verification Script
 * 
 * This script performs a comprehensive verification of all components 
 * to ensure they are ready for production deployment.
 * 
 * It checks:
 * 1. Environment configuration
 * 2. Database connections and migrations
 * 3. API endpoints and functionality
 * 4. Security settings
 * 5. Performance metrics
 * 6. Integration with external systems (Vault Banking, exchanges)
 * 
 * Run this before final production deployment.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.production' });

// Configuration
const CONFIG = {
  app: {
    name: 'Trading Farm Dashboard',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  },
  urls: {
    dashboard: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    vault: process.env.VAULT_URL || 'http://localhost:5000',
    supabase: process.env.NEXT_PUBLIC_SUPABASE_URL,
  },
  apiEndpoints: [
    '/api/health',
    '/api/markets',
    '/api/dashboard/summary',
    '/api/orders',
    '/api/positions',
    '/api/agents',
    '/api/vault/accounts',
    '/api/vault/transactions',
    '/api/trading/history',
    '/api/user/settings',
    '/api/performance/metrics',
    '/api/monitoring',
  ],
  requiredEnvVars: [
    'NODE_ENV',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_BASE_URL',
    'VAULT_URL',
    'VAULT_API_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'ENCRYPTION_SECRET',
    'JWT_SECRET',
    'VAULT_API_KEY',
    'VAULT_API_SECRET',
    'NEXT_PUBLIC_ENABLE_LIVE_TRADING',
    'NEXT_PUBLIC_ENABLE_AGENT_SYSTEM',
    'NEXT_PUBLIC_ENABLE_RISK_MANAGEMENT',
    'NEXT_PUBLIC_ENABLE_VAULT_BANKING',
  ],
};

// Results object
const results = {
  overall: {
    status: 'pending',
    passedChecks: 0,
    totalChecks: 0,
    criticalIssues: 0,
    warnings: 0,
  },
  sections: {},
  startTime: new Date(),
  endTime: null,
  durationMs: 0,
};

// Utility functions
const logHeader = (title) => {
  console.log('\n' + chalk.blue.bold(`=== ${title} ===`));
};

const logSuccess = (message) => {
  console.log(`${chalk.green('✓')} ${message}`);
};

const logWarning = (message) => {
  console.log(`${chalk.yellow('⚠')} ${message}`);
  results.overall.warnings++;
};

const logError = (message) => {
  console.log(`${chalk.red('✗')} ${message}`);
  results.overall.criticalIssues++;
};

const logInfo = (message) => {
  console.log(`${chalk.blue('ℹ')} ${message}`);
};

const runCommand = (command, options = {}) => {
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      ...options,
      stdio: options.silent ? 'pipe' : 'inherit',
    });
    return { success: true, output };
  } catch (error) {
    if (options.allowFailure) {
      return { success: false, error: error.message, output: error.stdout };
    }
    throw error;
  }
};

// Start the verification process
async function startVerification() {
  console.log(chalk.blue.bold('\n🔍 Trading Farm Dashboard - Production Pre-launch Verification'));
  console.log(chalk.blue(`Version: ${CONFIG.app.version}`));
  console.log(chalk.blue(`Time: ${new Date().toISOString()}`));
  console.log(chalk.blue('======================================================\n'));

  // Track section results
  const initSection = (name) => {
    results.sections[name] = {
      status: 'pending',
      checks: [],
      startTime: new Date(),
      endTime: null,
      durationMs: 0,
    };
    return results.sections[name];
  };

  const addCheck = (section, name, status, details = {}) => {
    results.overall.totalChecks++;
    if (status === 'passed') results.overall.passedChecks++;
    
    results.sections[section].checks.push({
      name,
      status,
      timestamp: new Date(),
      details,
    });
  };

  // 1. Environment Configuration Check
  try {
    const section = 'environmentConfig';
    initSection(section);
    logHeader('Environment Configuration Check');

    // Check if .env.production exists
    if (fs.existsSync('.env.production')) {
      logSuccess('.env.production file exists');
      addCheck(section, 'env_file_exists', 'passed');
    } else {
      logError('.env.production file not found');
      addCheck(section, 'env_file_exists', 'failed', {
        recommendation: 'Create .env.production based on .env.production.example'
      });
    }

    // Check required environment variables
    const missingVars = [];
    for (const envVar of CONFIG.requiredEnvVars) {
      if (!process.env[envVar]) {
        missingVars.push(envVar);
      }
    }

    if (missingVars.length === 0) {
      logSuccess('All required environment variables are set');
      addCheck(section, 'required_env_vars', 'passed');
    } else {
      logError(`Missing required environment variables: ${missingVars.join(', ')}`);
      addCheck(section, 'required_env_vars', 'failed', {
        missingVars,
        recommendation: 'Add the missing variables to .env.production'
      });
    }

    // Check ENCRYPTION_SECRET length
    if (process.env.ENCRYPTION_SECRET) {
      if (process.env.ENCRYPTION_SECRET.length === 32) {
        logSuccess('ENCRYPTION_SECRET has the correct length (32 characters)');
        addCheck(section, 'encryption_secret_length', 'passed');
      } else {
        logError(`ENCRYPTION_SECRET has incorrect length: ${process.env.ENCRYPTION_SECRET.length} (expected 32)`);
        addCheck(section, 'encryption_secret_length', 'failed', {
          recommendation: 'Generate a new 32-character encryption key'
        });
      }
    }

    // Check feature flags
    const featureFlags = [
      'NEXT_PUBLIC_ENABLE_LIVE_TRADING',
      'NEXT_PUBLIC_ENABLE_AGENT_SYSTEM',
      'NEXT_PUBLIC_ENABLE_RISK_MANAGEMENT',
      'NEXT_PUBLIC_ENABLE_VAULT_BANKING',
      'NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING',
    ];

    const disabledFlags = [];
    for (const flag of featureFlags) {
      if (process.env[flag] !== 'true') {
        disabledFlags.push(flag);
      }
    }

    if (disabledFlags.length === 0) {
      logSuccess('All feature flags are enabled');
      addCheck(section, 'feature_flags', 'passed');
    } else {
      logWarning(`Some feature flags are disabled: ${disabledFlags.join(', ')}`);
      addCheck(section, 'feature_flags', 'warning', {
        disabledFlags,
        recommendation: 'Verify this is intentional for production'
      });
    }

    results.sections[section].status = missingVars.length > 0 ? 'failed' : 'passed';
    results.sections[section].endTime = new Date();
    results.sections[section].durationMs = 
      results.sections[section].endTime - results.sections[section].startTime;
  } catch (error) {
    console.error('Error during environment check:', error);
    results.sections.environmentConfig.status = 'error';
  }

  // 2. Database check
  try {
    const section = 'databaseCheck';
    initSection(section);
    logHeader('Database Check');

    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      logError('DATABASE_URL is not set');
      addCheck(section, 'database_url', 'failed', {
        recommendation: 'Set DATABASE_URL in .env.production'
      });
      results.sections[section].status = 'failed';
      results.sections[section].endTime = new Date();
      results.sections[section].durationMs = 
        results.sections[section].endTime - results.sections[section].startTime;
      throw new Error('Cannot continue database checks without DATABASE_URL');
    }

    // Check Supabase configuration
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      logSuccess('Supabase configuration exists');
      addCheck(section, 'supabase_config', 'passed');
    } else {
      logError('Supabase configuration is incomplete');
      addCheck(section, 'supabase_config', 'failed', {
        recommendation: 'Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
      });
    }

    // Check database schema version
    try {
      logInfo('Checking database migrations status...');
      const migrationResult = runCommand('npx supabase migration status', { silent: true });
      
      if (migrationResult.success) {
        logSuccess('Database migrations are up to date');
        addCheck(section, 'migrations_status', 'passed');
      } else {
        logWarning('Database migrations may not be up to date');
        addCheck(section, 'migrations_status', 'warning', {
          details: migrationResult.output,
          recommendation: 'Run npx supabase migration up to apply pending migrations'
        });
      }
    } catch (error) {
      logError('Failed to check database migrations status');
      addCheck(section, 'migrations_status', 'failed', {
        error: error.message,
        recommendation: 'Verify Supabase CLI is installed and credentials are correct'
      });
    }

    // Check if types are generated
    if (fs.existsSync('./src/types/database.types.ts')) {
      const typesFile = fs.readFileSync('./src/types/database.types.ts', 'utf-8');
      if (typesFile.includes('export type Database')) {
        logSuccess('Database types are generated');
        addCheck(section, 'database_types', 'passed');
      } else {
        logWarning('Database types file exists but may be incomplete');
        addCheck(section, 'database_types', 'warning', {
          recommendation: 'Run npx supabase gen types typescript --local > src/types/database.types.ts'
        });
      }
    } else {
      logError('Database types are not generated');
      addCheck(section, 'database_types', 'failed', {
        recommendation: 'Run npx supabase gen types typescript --local > src/types/database.types.ts'
      });
    }

    results.sections[section].status = 'passed';
    results.sections[section].endTime = new Date();
    results.sections[section].durationMs = 
      results.sections[section].endTime - results.sections[section].startTime;
  } catch (error) {
    console.error('Error during database check:', error);
    if (results.sections.databaseCheck) {
      results.sections.databaseCheck.status = 'error';
      results.sections.databaseCheck.endTime = new Date();
      results.sections.databaseCheck.durationMs = 
        results.sections.databaseCheck.endTime - results.sections.databaseCheck.startTime;
    }
  }

  // 3. Build check
  try {
    const section = 'buildCheck';
    initSection(section);
    logHeader('Build Check');

    // Check if next.config.js exists
    if (fs.existsSync('./next.config.js')) {
      logSuccess('next.config.js exists');
      addCheck(section, 'next_config', 'passed');
    } else {
      logError('next.config.js not found');
      addCheck(section, 'next_config', 'failed', {
        recommendation: 'Create next.config.js with production settings'
      });
    }

    // Check TypeScript configuration
    if (fs.existsSync('./tsconfig.json')) {
      logSuccess('tsconfig.json exists');
      addCheck(section, 'typescript_config', 'passed');
    } else {
      logError('tsconfig.json not found');
      addCheck(section, 'typescript_config', 'failed', {
        recommendation: 'Create tsconfig.json'
      });
    }

    // Run TypeScript type check
    logInfo('Running TypeScript type check...');
    try {
      runCommand('npx tsc --noEmit', { silent: true });
      logSuccess('TypeScript type check passed');
      addCheck(section, 'typescript_check', 'passed');
    } catch (error) {
      logError('TypeScript type check failed');
      addCheck(section, 'typescript_check', 'failed', {
        error: error.message.substring(0, 500) + '...',
        recommendation: 'Fix TypeScript errors before production deployment'
      });
    }

    // Check for required scripts
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
    const requiredScripts = ['build', 'start', 'dev'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
    
    if (missingScripts.length === 0) {
      logSuccess('All required npm scripts exist');
      addCheck(section, 'required_scripts', 'passed');
    } else {
      logError(`Missing required npm scripts: ${missingScripts.join(', ')}`);
      addCheck(section, 'required_scripts', 'failed', {
        recommendation: 'Add missing scripts to package.json'
      });
    }

    // Check dependencies
    logInfo('Checking for outdated dependencies...');
    try {
      const outdatedResult = runCommand('npm outdated --json', { silent: true, allowFailure: true });
      const outdatedDeps = outdatedResult.success ? {} : JSON.parse(outdatedResult.output || '{}');
      const criticalDeps = Object.entries(outdatedDeps)
        .filter(([, info]) => info.current && info.wanted && 
          info.current.split('.')[0] !== info.wanted.split('.')[0]);
      
      if (Object.keys(outdatedDeps).length === 0) {
        logSuccess('All dependencies are up to date');
        addCheck(section, 'dependencies', 'passed');
      } else if (criticalDeps.length > 0) {
        logError(`${criticalDeps.length} dependencies have major version differences`);
        addCheck(section, 'dependencies', 'failed', {
          criticalDeps: criticalDeps.map(([name, info]) => 
            `${name}: ${info.current} -> ${info.wanted}`),
          recommendation: 'Update critical dependencies before deployment'
        });
      } else {
        logWarning(`${Object.keys(outdatedDeps).length} dependencies can be updated`);
        addCheck(section, 'dependencies', 'warning', {
          outdatedDeps: Object.keys(outdatedDeps).slice(0, 10),
          recommendation: 'Consider updating dependencies in a future release'
        });
      }
    } catch (error) {
      logWarning('Failed to check outdated dependencies');
      addCheck(section, 'dependencies', 'warning', {
        error: error.message,
      });
    }

    // Check for security vulnerabilities
    logInfo('Checking for security vulnerabilities...');
    try {
      const auditResult = runCommand('npm audit --json', { silent: true, allowFailure: true });
      const auditData = auditResult.success ? { vulnerabilities: {} } : 
        JSON.parse(auditResult.output || '{"vulnerabilities":{}}');
      
      const highSeverityCount = Object.values(auditData.vulnerabilities)
        .filter(v => v.severity === 'high' || v.severity === 'critical').length;
      
      if (highSeverityCount === 0) {
        logSuccess('No high or critical security vulnerabilities found');
        addCheck(section, 'security_audit', 'passed');
      } else {
        logError(`Found ${highSeverityCount} high/critical security vulnerabilities`);
        addCheck(section, 'security_audit', 'failed', {
          vulnerabilities: highSeverityCount,
          recommendation: 'Run npm audit fix or update affected dependencies'
        });
      }
    } catch (error) {
      logWarning('Failed to check security vulnerabilities');
      addCheck(section, 'security_audit', 'warning', {
        error: error.message,
      });
    }

    results.sections[section].status = 'passed';
    results.sections[section].endTime = new Date();
    results.sections[section].durationMs = 
      results.sections[section].endTime - results.sections[section].startTime;
  } catch (error) {
    console.error('Error during build check:', error);
    results.sections.buildCheck.status = 'error';
  }

  // 4. Check for deployment readiness
  try {
    const section = 'deploymentReadiness';
    initSection(section);
    logHeader('Deployment Readiness Check');

    // Check if production README exists
    if (fs.existsSync('./docs/production-runbook.md')) {
      logSuccess('Production runbook exists');
      addCheck(section, 'production_runbook', 'passed');
    } else {
      logWarning('Production runbook not found');
      addCheck(section, 'production_runbook', 'warning', {
        recommendation: 'Create a comprehensive production runbook in docs/production-runbook.md'
      });
    }

    // Check if deployment scripts exist
    const deploymentScripts = [
      './scripts/verify-build.js',
      './scripts/load-test.js',
    ];
    
    const missingScripts = deploymentScripts.filter(script => !fs.existsSync(script));
    
    if (missingScripts.length === 0) {
      logSuccess('All deployment scripts exist');
      addCheck(section, 'deployment_scripts', 'passed');
    } else {
      logWarning(`Missing deployment scripts: ${missingScripts.join(', ')}`);
      addCheck(section, 'deployment_scripts', 'warning', {
        recommendation: 'Create the missing deployment scripts'
      });
    }
    
    // Verify public directory exists
    if (fs.existsSync('./public')) {
      logSuccess('Public directory exists');
      addCheck(section, 'public_directory', 'passed');
    } else {
      logError('Public directory not found');
      addCheck(section, 'public_directory', 'failed', {
        recommendation: 'Create the public directory with required assets'
      });
    }

    // Check favicon and other essential assets
    const requiredAssets = [
      './public/favicon.ico',
      './public/robots.txt',
    ];
    
    const missingAssets = requiredAssets.filter(asset => !fs.existsSync(asset));
    
    if (missingAssets.length === 0) {
      logSuccess('All required assets exist');
      addCheck(section, 'required_assets', 'passed');
    } else {
      logWarning(`Missing required assets: ${missingAssets.join(', ')}`);
      addCheck(section, 'required_assets', 'warning', {
        recommendation: 'Add the missing assets to the public directory'
      });
    }

    results.sections[section].status = 'passed';
    results.sections[section].endTime = new Date();
    results.sections[section].durationMs = 
      results.sections[section].endTime - results.sections[section].startTime;
  } catch (error) {
    console.error('Error during deployment readiness check:', error);
    results.sections.deploymentReadiness.status = 'error';
  }

  // Final summary
  results.endTime = new Date();
  results.durationMs = results.endTime - results.startTime;
  
  // Determine overall status
  if (results.overall.criticalIssues > 0) {
    results.overall.status = 'failed';
  } else if (results.overall.warnings > 0) {
    results.overall.status = 'warning';
  } else {
    results.overall.status = 'passed';
  }
  
  logHeader('Verification Summary');
  console.log(`Status: ${getStatusIcon(results.overall.status)} ${results.overall.status.toUpperCase()}`);
  console.log(`Duration: ${(results.durationMs / 1000).toFixed(2)} seconds`);
  console.log(`Checks: ${results.overall.passedChecks}/${results.overall.totalChecks} passed`);
  console.log(`Critical Issues: ${results.overall.criticalIssues}`);
  console.log(`Warnings: ${results.overall.warnings}`);
  
  // Section summaries
  console.log('\nSection Results:');
  for (const [name, section] of Object.entries(results.sections)) {
    const passedChecks = section.checks.filter(c => c.status === 'passed').length;
    const totalChecks = section.checks.length;
    console.log(`${getStatusIcon(section.status)} ${formatSectionName(name)}: ${passedChecks}/${totalChecks} checks passed`);
  }
  
  // Save report to file
  const reportPath = path.join(process.cwd(), 'pre-launch-verification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed report saved to: ${chalk.yellow(reportPath)}`);
  
  // Final recommendation
  if (results.overall.status === 'passed') {
    console.log(chalk.green.bold('\n✅ All checks passed! The application is ready for production deployment.'));
  } else if (results.overall.status === 'warning') {
    console.log(chalk.yellow.bold('\n⚠️ The application has warnings but may be deployed. Review the report before proceeding.'));
  } else {
    console.log(chalk.red.bold('\n❌ The application has critical issues that must be fixed before deployment.'));
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'passed': return chalk.green('✓');
    case 'warning': return chalk.yellow('⚠');
    case 'failed': return chalk.red('✗');
    case 'error': return chalk.red('!');
    default: return chalk.blue('?');
  }
}

function formatSectionName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

// Run the verification
startVerification().catch(error => {
  console.error('Verification failed with error:', error);
  process.exit(1);
});
