#!/usr/bin/env node
/**
 * Process Storage Subscription Payments
 * 
 * This script automatically processes due storage subscription payments.
 * It can be run as a cron job to ensure timely payments for storage allocations.
 * 
 * Usage:
 *   npm run process-storage-payments
 * 
 * Options:
 *   --dry-run  - Run without actually processing payments (simulation mode)
 *   --verbose  - Show detailed logs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { integrationService } from '../services/integrationService';

// Load environment variables
config();

// Define CLI options
const argv = yargs(hideBin(process.argv))
  .option('dry-run', {
    description: 'Run in test mode without making actual payments',
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

// Statistics
const stats = {
  subscriptionsProcessed: 0,
  successfulPayments: 0,
  failedPayments: 0,
  totalAmount: 0
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
 * Main processing function
 */
async function processPayments() {
  log(`Starting storage payment processing ${argv.dryRun ? '(DRY RUN)' : ''}`, 'info');
  
  try {
    // Get all due subscriptions
    const spinner = ora('Fetching due subscriptions...').start();
    
    const now = new Date().toISOString();
    const { data: subscriptions, error } = await supabase
      .from('storage_subscriptions')
      .select(`
        id,
        allocation_id,
        vault_account_id,
        amount_per_period,
        period,
        next_payment_date,
        metadata
      `)
      .eq('is_active', true)
      .lte('next_payment_date', now)
      .order('next_payment_date', { ascending: true });
    
    if (error) {
      spinner.fail('Failed to fetch subscriptions');
      throw new Error(`Error fetching subscriptions: ${error.message}`);
    }
    
    spinner.succeed(`Found ${subscriptions.length} subscriptions due for payment`);
    
    if (subscriptions.length === 0) {
      log('No subscriptions currently due for payment.', 'info');
      return;
    }
    
    // Process each subscription
    if (!argv.dryRun) {
      const processingSpinner = ora('Processing payments...').start();
      
      const processed = await integrationService.processRecurringStoragePayments();
      
      processingSpinner.succeed(`Processed ${processed} storage subscription payments`);
      stats.subscriptionsProcessed = processed;
      
      // Get detailed stats
      const { data: paymentStats, error: statsError } = await supabase
        .from('storage_payment_history')
        .select(`
          status,
          amount
        `)
        .in('subscription_id', subscriptions.map(s => s.id))
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes
      
      if (statsError) {
        log(`Error fetching payment stats: ${statsError.message}`, 'error');
      } else if (paymentStats) {
        stats.successfulPayments = paymentStats.filter(p => p.status === 'completed').length;
        stats.failedPayments = paymentStats.filter(p => p.status === 'failed').length;
        stats.totalAmount = paymentStats.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0);
      }
    } else {
      // Dry run - just show what would happen
      log('DRY RUN: Would process the following subscriptions:', 'info');
      
      for (const subscription of subscriptions) {
        log(`Subscription ${subscription.id}:`, 'verbose');
        log(`  - Amount: ${subscription.amount_per_period}`, 'verbose');
        log(`  - Period: ${subscription.period}`, 'verbose');
        log(`  - Due date: ${subscription.next_payment_date}`, 'verbose');
        log(`  - Vault account: ${subscription.vault_account_id}`, 'verbose');
        
        stats.subscriptionsProcessed++;
        stats.successfulPayments++;
        stats.totalAmount += subscription.amount_per_period;
      }
    }
    
    // Print summary
    console.log('\n' + chalk.bold('Payment Processing Summary:'));
    console.log(chalk.blue(`Subscriptions processed: ${stats.subscriptionsProcessed}`));
    console.log(chalk.green(`Successful payments: ${stats.successfulPayments}`));
    console.log(chalk.red(`Failed payments: ${stats.failedPayments}`));
    console.log(chalk.yellow(`Total amount: ${stats.totalAmount}`));
    
    if (argv.dryRun) {
      log('This was a dry run. No actual payments were processed.', 'warn');
    }
  } catch (error) {
    log(`Payment processing failed: ${(error as Error).message}`, 'error');
    process.exit(1);
  }
}

// Run the payment processor
processPayments()
  .then(() => {
    log('Payment processing complete!', 'success');
    process.exit(0);
  })
  .catch((error) => {
    log(`Unhandled error during payment processing: ${error.message}`, 'error');
    process.exit(1);
  }); 