#!/usr/bin/env node

/**
 * Trading Farm Dashboard Build Verification Script
 * 
 * This script performs a series of checks on the production build to ensure it's ready for deployment.
 * It verifies:
 * 1. Environment variable configuration
 * 2. Successful production build
 * 3. Bundle size constraints
 * 4. Static route generation
 * 5. Basic linting and type checking
 * 
 * Run this script before deployment to ensure a smooth release.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Configuration
const MAX_BUNDLE_SIZE_MB = 5; // Maximum allowed bundle size in MB
const REQUIRED_ENV_VARS = [
  'NODE_ENV',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'ENCRYPTION_SECRET',
];

// Utility functions
const logStep = (step, message) => {
  console.log(`\n${chalk.blue(`Step ${step}:`)} ${chalk.white(message)}`);
};

const logSuccess = (message) => {
  console.log(`${chalk.green('✓')} ${message}`);
};

const logWarning = (message) => {
  console.log(`${chalk.yellow('⚠')} ${message}`);
};

const logError = (message) => {
  console.log(`${chalk.red('✗')} ${message}`);
};

const runCommand = (command, options = {}) => {
  try {
    return execSync(command, { 
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
      ...options 
    });
  } catch (error) {
    if (options.allowFailure) {
      return null;
    }
    logError(`Command failed: ${command}`);
    if (error.stdout) console.log(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    throw error;
  }
};

const getDirectorySize = (directory) => {
  const files = fs.readdirSync(directory, { withFileTypes: true });
  let size = 0;

  for (const file of files) {
    const filePath = path.join(directory, file.name);
    if (file.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += fs.statSync(filePath).size;
    }
  }

  return size;
};

// Main verification process
async function verifyBuild() {
  console.log(chalk.blue.bold('\n🔍 Trading Farm Dashboard Build Verification'));
  console.log(chalk.blue('=============================================\n'));
  
  // Step 1: Verify environment variables
  logStep(1, 'Verifying environment variables');
  
  const missingEnvVars = [];
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missingEnvVars.push(envVar);
    }
  }
  
  if (missingEnvVars.length > 0) {
    logError(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    logError('Make sure to set all required environment variables before building');
    process.exit(1);
  } else {
    logSuccess('All required environment variables are set');
  }
  
  // Verify encryption secret length
  if (process.env.ENCRYPTION_SECRET && process.env.ENCRYPTION_SECRET.length !== 32) {
    logError('ENCRYPTION_SECRET must be exactly 32 characters long');
    process.exit(1);
  }
  
  // Step 2: Run linting and type checking
  logStep(2, 'Running linting and type checking');
  
  try {
    runCommand('npx eslint --max-warnings=0 src', { silent: true });
    logSuccess('ESLint check passed');
  } catch (error) {
    logWarning('ESLint check found issues. This may cause problems in production.');
    // Continue despite warnings
  }
  
  try {
    runCommand('npx tsc --noEmit', { silent: true });
    logSuccess('TypeScript check passed');
  } catch (error) {
    logWarning('TypeScript check found issues. This may cause problems in production.');
    // Continue despite warnings
  }
  
  // Step 3: Create production build
  logStep(3, 'Creating production build');
  
  try {
    // Clean previous build
    if (fs.existsSync('.next')) {
      console.log('Cleaning previous build...');
      fs.rmSync('.next', { recursive: true, force: true });
    }
    
    // Set production environment
    process.env.NODE_ENV = 'production';
    
    // Run build
    console.log('Building production bundle...');
    runCommand('npx next build');
    logSuccess('Production build successful');
  } catch (error) {
    logError('Production build failed');
    process.exit(1);
  }
  
  // Step 4: Verify bundle size
  logStep(4, 'Checking bundle size');
  
  const buildDir = path.join(process.cwd(), '.next');
  if (!fs.existsSync(buildDir)) {
    logError('Build directory not found');
    process.exit(1);
  }
  
  const totalSizeBytes = getDirectorySize(buildDir);
  const totalSizeMB = totalSizeBytes / (1024 * 1024);
  
  console.log(`Bundle size: ${totalSizeMB.toFixed(2)} MB`);
  
  if (totalSizeMB > MAX_BUNDLE_SIZE_MB) {
    logWarning(`Bundle size exceeds recommended maximum of ${MAX_BUNDLE_SIZE_MB} MB`);
    logWarning('Consider optimizing the application to reduce bundle size');
  } else {
    logSuccess(`Bundle size is within the recommended limit of ${MAX_BUNDLE_SIZE_MB} MB`);
  }
  
  // Step 5: Check for critical files in the build
  logStep(5, 'Verifying build artifacts');
  
  const criticalFiles = [
    '.next/standalone',
    '.next/static',
    '.next/server/app/dashboard/page.js',
    '.next/server/middleware.js',
  ];
  
  const missingFiles = criticalFiles.filter(file => !fs.existsSync(path.join(process.cwd(), file)));
  
  if (missingFiles.length > 0) {
    logError(`Missing critical build files: ${missingFiles.join(', ')}`);
    logError('The build is incomplete or has unexpected structure');
    process.exit(1);
  } else {
    logSuccess('All critical build files are present');
  }
  
  // Step 6: Export deployment package
  logStep(6, 'Creating deployment package');
  
  const deployDir = path.join(process.cwd(), 'deploy');
  if (fs.existsSync(deployDir)) {
    fs.rmSync(deployDir, { recursive: true, force: true });
  }
  
  fs.mkdirSync(deployDir);
  
  // Copy necessary files
  console.log('Copying build files to deployment package...');
  fs.cpSync(path.join(process.cwd(), '.next'), path.join(deployDir, '.next'), { recursive: true });
  fs.cpSync(path.join(process.cwd(), 'public'), path.join(deployDir, 'public'), { recursive: true });
  fs.copyFileSync(path.join(process.cwd(), 'package.json'), path.join(deployDir, 'package.json'));
  
  // Create minimal start script
  const startScript = `
#!/usr/bin/env node
const { execSync } = require('child_process');

// Start the Next.js server
console.log('Starting Trading Farm Dashboard...');
execSync('node .next/standalone/server.js', { stdio: 'inherit' });
`;
  
  fs.writeFileSync(path.join(deployDir, 'start.js'), startScript.trim());
  fs.chmodSync(path.join(deployDir, 'start.js'), '755');
  
  // Create readme for deployment
  const deployReadme = `
# Trading Farm Dashboard - Deployment Package

This package contains the production build of the Trading Farm Dashboard.

## Running the Application

1. Ensure all required environment variables are set (refer to .env.production.example)
2. Run the application:

\`\`\`
node start.js
\`\`\`

The application will be available at http://localhost:3000 by default.

## Environment Variables

Make sure to set all required environment variables before starting the application.

## Support

For support, contact the Trading Farm team.
`;
  
  fs.writeFileSync(path.join(deployDir, 'README.md'), deployReadme.trim());
  
  logSuccess('Deployment package created successfully at ./deploy');
  
  // Final summary
  console.log(chalk.green.bold('\n✅ Build verification completed successfully!'));
  console.log(chalk.white('The application is ready for deployment.'));
  console.log(chalk.white('Deployment package is available at ./deploy'));
}

// Run the verification process
verifyBuild().catch(error => {
  console.error(chalk.red('Build verification failed:'), error);
  process.exit(1);
});
