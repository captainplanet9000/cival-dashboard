#!/usr/bin/env node

/**
 * Trading Farm Dashboard Test Runner
 * 
 * This script runs all tests in sequence and aggregates results.
 * Useful for CI/CD pipelines and comprehensive local testing.
 * 
 * Usage:
 *   node src/scripts/run-all-tests.js
 * 
 * Options:
 *   --skip-e2e     Skip end-to-end tests
 *   --coverage     Generate coverage reports
 *   --verbose      Show detailed test output
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Process command line arguments
const args = process.argv.slice(2);
const skipE2E = args.includes('--skip-e2e');
const withCoverage = args.includes('--coverage');
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
 * Main function to run all tests
 */
async function runAllTests() {
  console.log(`${colors.bright}Trading Farm Dashboard Test Runner${colors.reset}`);
  console.log(`${colors.dim}$(new Date().toLocaleString())${colors.reset}`);
  
  const results = {
    unit: null,
    e2e: null
  };
  
  // Run unit and component tests
  const unitCommand = withCoverage ? 'npm run test:coverage' : 'npm run test';
  results.unit = await runCommand('Unit and Component Tests', unitCommand);
  
  // Run E2E tests if not skipped
  if (!skipE2E) {
    results.e2e = await runCommand('End-to-End Tests', 'npm run test:e2e');
  } else {
    console.log(`${colors.yellow}⚠ Skipping End-to-End Tests${colors.reset}`);
    results.e2e = { success: true, skipped: true };
  }
  
  // Show summary
  console.log(`\n${colors.bright}Test Summary:${colors.reset}`);
  console.log(`Unit/Component Tests: ${results.unit.success ? `${colors.green}PASSED${colors.reset}` : `${colors.red}FAILED${colors.reset}`}`);
  
  if (results.e2e.skipped) {
    console.log(`End-to-End Tests: ${colors.yellow}SKIPPED${colors.reset}`);
  } else {
    console.log(`End-to-End Tests: ${results.e2e.success ? `${colors.green}PASSED${colors.reset}` : `${colors.red}FAILED${colors.reset}`}`);
  }
  
  // Exit with appropriate code
  const allPassed = results.unit.success && (results.e2e.skipped || results.e2e.success);
  process.exit(allPassed ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  console.error(`${colors.red}Error running tests:${colors.reset}`, error);
  process.exit(1);
});
