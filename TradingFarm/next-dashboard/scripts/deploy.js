#!/usr/bin/env node

/**
 * Automated deployment script for Trading Farm Dashboard
 * This script handles production builds and deployment to various environments
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const ENVIRONMENTS = ['development', 'staging', 'production'];
const BUILD_DIR = path.join(__dirname, '..', '.next');
const ENV_DIR = path.join(__dirname, '..', 'env');
const DEFAULT_ENV = 'staging';

// Setup interactive console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colored console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Banner
console.log(`
${colors.cyan}╔══════════════════════════════════════════════╗
║         TRADING FARM DASHBOARD DEPLOY          ║
╚══════════════════════════════════════════════╝${colors.reset}
`);

// Main deploy function
async function deploy() {
  // Get deployment environment
  const environment = await getDeploymentEnvironment();
  console.log(`\n${colors.magenta}→ Selected environment: ${colors.white}${environment}${colors.reset}\n`);
  
  try {
    // Verify environment configuration
    await verifyEnvironmentConfig(environment);
    
    // Run pre-deployment checks
    await runPreDeploymentChecks();
    
    // Build application
    await buildApplication(environment);
    
    // Run post-build validations
    await runPostBuildValidations();
    
    // Deploy to selected environment
    await deployToEnvironment(environment);
    
    // Run post-deployment verifications
    await runPostDeploymentVerifications(environment);
    
    console.log(`\n${colors.green}✓ Deployment to ${environment} completed successfully!${colors.reset}\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n${colors.red}✗ Deployment failed: ${error.message}${colors.reset}\n`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Get deployment environment from arguments or prompt user
async function getDeploymentEnvironment() {
  // Check for environment argument
  const envArg = process.argv.find(arg => ENVIRONMENTS.includes(arg));
  if (envArg) return envArg;
  
  // If not provided, prompt user
  return new Promise((resolve) => {
    rl.question(`${colors.yellow}? Select deployment environment [${ENVIRONMENTS.join('/')}] (default: ${DEFAULT_ENV}): ${colors.reset}`, (answer) => {
      const env = answer.trim().toLowerCase();
      if (!env) return resolve(DEFAULT_ENV);
      if (ENVIRONMENTS.includes(env)) return resolve(env);
      
      console.log(`${colors.red}Invalid environment. Using default: ${DEFAULT_ENV}${colors.reset}`);
      resolve(DEFAULT_ENV);
    });
  });
}

// Verify environment configuration files exist
async function verifyEnvironmentConfig(environment) {
  const envFile = path.join(ENV_DIR, `.env.${environment}`);
  
  console.log(`${colors.yellow}→ Verifying environment configuration...${colors.reset}`);
  
  if (!fs.existsSync(envFile)) {
    throw new Error(`Environment file not found: ${envFile}`);
  }
  
  // Copy environment file to .env for build process
  fs.copyFileSync(envFile, path.join(__dirname, '..', '.env'));
  
  console.log(`${colors.green}✓ Environment configuration verified${colors.reset}`);
}

// Run pre-deployment checks (tests, linting, type checking)
async function runPreDeploymentChecks() {
  console.log(`${colors.yellow}→ Running pre-deployment checks...${colors.reset}`);
  
  try {
    // Run type checking
    console.log(`${colors.blue}  Running TypeScript type check${colors.reset}`);
    execSync('npm run type-check', { stdio: 'inherit' });
    
    // Run linting
    console.log(`${colors.blue}  Running linting${colors.reset}`);
    execSync('npm run lint', { stdio: 'inherit' });
    
    // Run tests
    console.log(`${colors.blue}  Running tests${colors.reset}`);
    execSync('npm run test', { stdio: 'inherit' });
    
    console.log(`${colors.green}✓ All pre-deployment checks passed${colors.reset}`);
  } catch (error) {
    throw new Error(`Pre-deployment check failed: ${error.message}`);
  }
}

// Build application for production
async function buildApplication(environment) {
  console.log(`${colors.yellow}→ Building application for ${environment}...${colors.reset}`);
  
  // Remove previous build if exists
  if (fs.existsSync(BUILD_DIR)) {
    console.log(`${colors.blue}  Removing existing build${colors.reset}`);
    fs.rmdirSync(BUILD_DIR, { recursive: true });
  }
  
  try {
    // Set environment variables for build
    process.env.NODE_ENV = environment === 'development' ? 'development' : 'production';
    
    // Run build
    console.log(`${colors.blue}  Running build process${colors.reset}`);
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log(`${colors.green}✓ Build completed successfully${colors.reset}`);
  } catch (error) {
    throw new Error(`Build failed: ${error.message}`);
  }
}

// Validate build output
async function runPostBuildValidations() {
  console.log(`${colors.yellow}→ Validating build output...${colors.reset}`);
  
  if (!fs.existsSync(BUILD_DIR)) {
    throw new Error('Build directory not found. Build may have failed silently.');
  }
  
  // Check for critical files in build output
  const requiredFiles = ['server/pages/index.html', 'server/pages/_app.js'];
  for (const file of requiredFiles) {
    const filePath = path.join(BUILD_DIR, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Required file not found in build: ${file}`);
    }
  }
  
  console.log(`${colors.green}✓ Build validation passed${colors.reset}`);
}

// Deploy to the selected environment
async function deployToEnvironment(environment) {
  console.log(`${colors.yellow}→ Deploying to ${environment}...${colors.reset}`);
  
  // Different deployment methods based on environment
  switch(environment) {
    case 'development':
      // For local development, just report success
      console.log(`${colors.blue}  Development deployment is local only${colors.reset}`);
      break;
      
    case 'staging':
      // Deploy to staging server
      console.log(`${colors.blue}  Deploying to staging server${colors.reset}`);
      try {
        // Note: In a real setup, this would use the appropriate deployment command
        // For example, using Vercel CLI:
        // execSync('vercel --prod', { stdio: 'inherit' });
        console.log(`${colors.blue}  [Simulated] Deploying to staging server${colors.reset}`);
        
        // Log deployment metadata
        logDeploymentMetadata(environment);
      } catch (error) {
        throw new Error(`Staging deployment failed: ${error.message}`);
      }
      break;
      
    case 'production':
      // Production deployment requires confirmation
      await confirmProductionDeployment();
      
      console.log(`${colors.blue}  Deploying to production server${colors.reset}`);
      try {
        // Note: In a real setup, this would use the appropriate deployment command
        // For example, using Netlify CLI:
        // execSync('netlify deploy --prod', { stdio: 'inherit' });
        console.log(`${colors.blue}  [Simulated] Deploying to production server${colors.reset}`);
        
        // Log deployment metadata
        logDeploymentMetadata(environment);
      } catch (error) {
        throw new Error(`Production deployment failed: ${error.message}`);
      }
      break;
  }
  
  console.log(`${colors.green}✓ Deployment to ${environment} executed successfully${colors.reset}`);
}

// Confirm production deployment
async function confirmProductionDeployment() {
  return new Promise((resolve, reject) => {
    rl.question(`${colors.red}! Are you sure you want to deploy to PRODUCTION? (yes/no): ${colors.reset}`, (answer) => {
      const response = answer.trim().toLowerCase();
      
      if (response === 'yes') {
        resolve();
      } else {
        reject(new Error('Production deployment cancelled.'));
      }
    });
  });
}

// Log deployment metadata for tracking
function logDeploymentMetadata(environment) {
  const metadata = {
    environment,
    timestamp: new Date().toISOString(),
    version: require(path.join(__dirname, '..', 'package.json')).version,
    deployedBy: process.env.USER || 'unknown'
  };
  
  // Create deployment logs directory if it doesn't exist
  const deployLogsDir = path.join(__dirname, '..', 'deploy-logs');
  if (!fs.existsSync(deployLogsDir)) {
    fs.mkdirSync(deployLogsDir, { recursive: true });
  }
  
  // Write deployment metadata to log file
  const logFile = path.join(deployLogsDir, `deploy-${environment}-${Date.now()}.json`);
  fs.writeFileSync(logFile, JSON.stringify(metadata, null, 2));
  
  console.log(`${colors.blue}  Deployment metadata logged to: ${logFile}${colors.reset}`);
}

// Run post-deployment verifications
async function runPostDeploymentVerifications(environment) {
  console.log(`${colors.yellow}→ Running post-deployment verifications...${colors.reset}`);
  
  // In a real setup, this would:
  // 1. Ping the deployed application to verify it's running
  // 2. Run smoke tests against the deployed instance
  // 3. Verify critical paths are working
  
  // For this demo, we'll just simulate success
  console.log(`${colors.blue}  [Simulated] Verifying application is responding${colors.reset}`);
  console.log(`${colors.blue}  [Simulated] Running smoke tests${colors.reset}`);
  console.log(`${colors.blue}  [Simulated] Checking critical paths${colors.reset}`);
  
  console.log(`${colors.green}✓ Post-deployment verifications passed${colors.reset}`);
}

// Start deployment process
deploy();
