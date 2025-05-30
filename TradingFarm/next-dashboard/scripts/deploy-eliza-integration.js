#!/usr/bin/env node

/**
 * ElizaOS Integration Deployment Script
 * 
 * This script automates the deployment of ElizaOS integration to production.
 * It applies the necessary migrations and generates TypeScript types.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Log utility for better output formatting
const log = {
  info: (message) => console.log(`\n📝 ${message}`),
  success: (message) => console.log(`\n✅ ${message}`),
  error: (message, error) => {
    console.error(`\n❌ ${message}`);
    if (error) {
      console.error(error.message || error);
      if (error.stack) console.error(error.stack);
    }
    return false;
  },
  step: (message) => console.log(`\n🔍 STEP: ${message}`),
  warning: (message) => console.log(`\n⚠️ ${message}`),
  divider: () => console.log('\n' + '='.repeat(50) + '\n')
};

// Configuration
const config = {
  migrationFiles: [
    '20250401_production_eliza_integration.sql',
    '20250401_comprehensive_agent_responses_fix.sql'
  ],
  typeOutputFile: path.join(process.cwd(), 'src', 'types', 'database.types.ts'),
};

// Main function
async function deployElizaIntegration() {
  log.divider();
  console.log('🚀 ELIZAOS INTEGRATION - PRODUCTION DEPLOYMENT');
  log.divider();

  // Apply migrations using Supabase CLI
  try {
    log.step('Applying migrations');
    
    // Verify that all migration files exist
    for (const migrationFile of config.migrationFiles) {
      const filePath = path.join(process.cwd(), 'supabase', 'migrations', migrationFile);
      
      if (!fs.existsSync(filePath)) {
        return log.error(`Migration file not found: ${migrationFile}`);
      }
    }
    
    // Run the migration command
    log.info('Running migrations with Supabase CLI');
    try {
      execSync('npx supabase migration up', {
        stdio: 'inherit'
      });
      log.success('Successfully applied migrations');
    } catch (migrationError) {
      // If CLI fails, try manually applying the migrations via the SQL Editor
      log.warning('Migration via CLI failed. You may need to manually apply the migrations.');
      log.info('Instructions to manually apply migrations:');
      
      for (const migrationFile of config.migrationFiles) {
        const filePath = path.join(process.cwd(), 'supabase', 'migrations', migrationFile);
        log.info(`1. Open SQL Editor in Supabase Dashboard`);
        log.info(`2. Copy content from ${filePath}`);
        log.info(`3. Paste and execute in SQL Editor`);
      }
      
      // Ask user to confirm if they've manually applied migrations
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('\nHave you manually applied the migrations? (yes/no) ', resolve);
      });
      
      readline.close();
      
      if (answer.toLowerCase() !== 'yes') {
        return log.error('Migrations must be applied before continuing.');
      }
    }
  } catch (error) {
    return log.error('Failed to apply migrations', error);
  }

  // Generate TypeScript types
  try {
    log.step('Generating TypeScript types');
    
    try {
      log.info('Generating types with Supabase CLI');
      execSync('npx supabase gen types typescript --local > ' + config.typeOutputFile, {
        stdio: 'inherit'
      });
      log.success(`Successfully generated types at: ${config.typeOutputFile}`);
    } catch (typeGenError) {
      log.warning('Type generation via CLI failed. Attempting alternative method...');
      
      // Try to use a simpler approach with the Supabase SQL editor
      log.info('Instructions to manually generate types:');
      log.info('1. Open SQL Editor in Supabase Dashboard');
      log.info('2. Run: SELECT * FROM public.schema_exports()');
      log.info('3. Copy output and save to src/types/database.types.ts');
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('\nHave you manually generated the types? (yes/no) ', resolve);
      });
      
      readline.close();
      
      if (answer.toLowerCase() !== 'yes') {
        return log.error('TypeScript types must be generated before continuing.');
      }
    }
  } catch (error) {
    return log.error('Failed to generate TypeScript types', error);
  }

  log.divider();
  log.success('ELIZAOS INTEGRATION SUCCESSFULLY DEPLOYED TO PRODUCTION');
  log.divider();
  
  log.info('Next steps:');
  log.info('1. Build and deploy the Next.js application with the updated ElizaOS components');
  log.info('2. Test the ElizaOS integration from the production environment');
  log.info('3. Monitor for any issues with the agent command workflow');
  
  return true;
}

// Check if running directly
if (require.main === module) {
  deployElizaIntegration().catch(error => {
    log.error('Unhandled error during deployment', error);
    process.exit(1);
  });
}

module.exports = { deployElizaIntegration };
