#!/usr/bin/env node

/**
 * Trading Farm Dashboard Unit Test Runner
 * 
 * This script runs all unit and component tests only.
 * It excludes e2e tests to avoid conflicts between Vitest and Playwright.
 * 
 * Usage:
 *   node src/scripts/run-unit-tests.js
 * 
 * Options:
 *   --coverage     Generate coverage reports
 *   --watch        Run in watch mode
 *   --verbose      Show detailed test output
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Process command line arguments
const args = process.argv.slice(2);
const withCoverage = args.includes('--coverage');
const watchMode = args.includes('--watch');
const verbose = args.includes('--verbose');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

/**
 * Run a command with formatted output
 */
async function runCommand(name, command) {
  console.log(`\n${colors.bright}${colors.cyan}Running ${name}...${colors.reset}\n`);
  
  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(command);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (verbose) {
      console.log(stdout);
      if (stderr) console.error(stderr);
    }
    
    console.log(`${colors.green}✓ ${name} completed successfully ${colors.dim}(${duration}s)${colors.reset}`);
    return { success: true, duration };
  } catch (error) {
    console.error(`${colors.red}✗ ${name} failed${colors.reset}`);
    console.error(error.stderr || error.message);
    return { success: false, error };
  }
}

/**
 * Main function to run unit tests
 */
async function runUnitTests() {
  console.log(`${colors.bright}Trading Farm Dashboard Unit Test Runner${colors.reset}`);
  console.log(`${colors.dim}${new Date().toLocaleString()}${colors.reset}`);
  
  // Build the command based on options
  let command = 'npx vitest';
  
  if (watchMode) {
    command += ' watch';
  } else {
    command += ' run';
  }
  
  command += ' --exclude e2e/** --exclude src/e2e/** --exclude __tests__/services/**';
  
  if (withCoverage) {
    command += ' --coverage';
  }
  
  // Run the tests
  const result = await runCommand('Unit and Component Tests', command);
  
  // Show summary
  console.log(`\n${colors.bright}Test Summary:${colors.reset}`);
  console.log(`Unit/Component Tests: ${result.success ? `${colors.green}PASSED${colors.reset}` : `${colors.red}FAILED${colors.reset}`}`);
  
  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Run the tests
runUnitTests().catch(error => {
  console.error(`${colors.red}Error running tests:${colors.reset}`, error);
  process.exit(1);
});
