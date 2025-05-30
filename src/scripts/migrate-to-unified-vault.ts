#!/usr/bin/env node
/**
 * Wallet to Unified Vault System Migration Script
 * 
 * This script migrates data from the old wallet system to the new unified vault system.
 * It creates master vaults for users, transfers wallets to vault accounts, and migrates
 * transactions to the new format.
 * 
 * Usage:
 *   npm run migrate-vault
 * 
 * Options:
 *   --user-id  - Migrate a specific user's wallets
 *   --dry-run  - Run without making any changes (test mode)
 *   --verbose  - Show detailed logs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { vaultService } from '../services/vaultService';

// Load environment variables
config();

// Define CLI options
const argv = yargs(hideBin(process.argv))
  .option('user-id', {
    description: 'Migrate only the specified user ID',
    type: 'string',
  })
  .option('dry-run', {
    description: 'Run in test mode without making changes',
    type: 'boolean',
    default: false,
  })
  .option('verbose', {
    description: 'Show detailed logs',
    type: 'boolean',
    default: false,
  })
  .help()
  .alias('help', 'h')
  .parse();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Migration statistics
const stats = {
  usersProcessed: 0,
  masterVaultsCreated: 0,
  accountsCreated: 0,
  transactionsMigrated: 0,
  errors: 0
};

/**
 * Log a message with color based on level
 */
function log(message: string, level: 'info' | 'success' | 'error' | 'warn' | 'verbose' = 'info') {
  if (level === 'verbose' && !argv.verbose) return;
  
  switch (level) {
    case 'success':
      console.log(chalk.green('✓ ' + message));
      break;
    case 'error':
      console.log(chalk.red('✗ ' + message));
      break;
    case 'warn':
      console.log(chalk.yellow('⚠ ' + message));
      break;
    case 'verbose':
      console.log(chalk.gray('  - ' + message));
      break;
    default:
      console.log(chalk.blue('ℹ ' + message));
      break;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  log(`Starting migration to unified vault system (${argv.dryRun ? 'DRY RUN' : 'LIVE'})`, 'info');
  
  try {
    // Get all users
    const spinner = ora('Fetching users...').start();
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      spinner.fail('Failed to fetch users');
      log(`Error fetching users: ${error.message}`, 'error');
      return;
    }
    
    const filteredUsers = argv.userId 
      ? users.users.filter(user => user.id === argv.userId)
      : users.users;
    
    spinner.succeed(`Found ${filteredUsers.length} users to process`);
    
    // Process each user
    for (const user of filteredUsers) {
      log(`Processing user: ${user.email || user.id}`, 'info');
      
      try {
        // Find all wallets for this user
        const { data: wallets, error: walletError } = await supabase
          .from('wallets')
          .select('*')
          .eq('owner_id', user.id);
        
        if (walletError) {
          log(`Error fetching wallets for user ${user.id}: ${walletError.message}`, 'error');
          stats.errors++;
          continue;
        }
        
        if (!wallets || wallets.length === 0) {
          log(`User ${user.email || user.id} has no wallets to migrate`, 'warn');
          continue;
        }
        
        log(`Found ${wallets.length} wallets for user ${user.email || user.id}`, 'verbose');
        
        if (!argv.dryRun) {
          // Migrate wallets to the new vault system
          const migrationSpinner = ora('Migrating wallets...').start();
          const migrationResult = await vaultService.migrateWallets(user.id);
          
          stats.masterVaultsCreated++;
          stats.accountsCreated += migrationResult.accountsCreated;
          stats.transactionsMigrated += migrationResult.transactionsMigrated;
          
          migrationSpinner.succeed(`Migrated ${migrationResult.accountsCreated} accounts and ${migrationResult.transactionsMigrated} transactions`);
        } else {
          log(`Would migrate ${wallets.length} wallets (DRY RUN)`, 'success');
        }
        
        stats.usersProcessed++;
      } catch (error) {
        log(`Error processing user ${user.id}: ${(error as Error).message}`, 'error');
        stats.errors++;
      }
    }
    
    // Print summary
    console.log('\n' + chalk.bold('Migration Summary:'));
    console.log(chalk.blue(`Users processed: ${stats.usersProcessed}`));
    console.log(chalk.green(`Master vaults created: ${stats.masterVaultsCreated}`));
    console.log(chalk.green(`Accounts created: ${stats.accountsCreated}`));
    console.log(chalk.green(`Transactions migrated: ${stats.transactionsMigrated}`));
    console.log(chalk.red(`Errors: ${stats.errors}`));
    
    if (argv.dryRun) {
      log('This was a dry run. No changes were made to the database.', 'warn');
    }
  } catch (error) {
    log(`Migration failed: ${(error as Error).message}`, 'error');
    process.exit(1);
  }
}

// Run the migration
migrate()
  .then(() => {
    log('Migration complete!', 'success');
    process.exit(0);
  })
  .catch((error) => {
    log(`Unhandled error during migration: ${error.message}`, 'error');
    process.exit(1);
  }); 