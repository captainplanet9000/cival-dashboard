#!/usr/bin/env node

/**
 * Banking System Migration Script
 * 
 * This script migrates data from the legacy wallet system to the new unified
 * vault-based banking system. It performs the following operations:
 * 
 * 1. Creates a master vault for each farm if one doesn't exist
 * 2. Migrates all legacy wallets to vault accounts
 * 3. Recreates transaction history in the new system
 * 4. Sets up security policies for all accounts
 * 5. Validates the migration with balance checks
 * 
 * Usage:
 *   npm run migrate:banking
 *   
 * Options:
 *   --dry-run       Show what would be migrated without making changes
 *   --farm=<id>     Migrate only the specified farm
 *   --verbose       Show detailed logs
 */

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/utils/supabase/server';
import { unifiedBankingService, LegacyWallet } from '@/services/unifiedBankingService';
import { VaultAccountType } from '@/types/vault';
import chalk from 'chalk';
import ora from 'ora';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('dry-run', {
    type: 'boolean',
    description: 'Show migration plan without making changes',
    default: false
  })
  .option('farm', {
    type: 'string',
    description: 'Migrate only a specific farm'
  })
  .option('verbose', {
    type: 'boolean',
    description: 'Show detailed logs',
    default: false
  })
  .help()
  .parse();

// Initialize supabase client
const supabase = createServerClient();

// Main migration function
async function migrateToUnifiedBanking() {
  console.log(chalk.blue.bold('==================================='));
  console.log(chalk.blue.bold('Unified Banking Migration Tool'));
  console.log(chalk.blue.bold('==================================='));
  console.log();
  
  if (argv['dry-run']) {
    console.log(chalk.yellow('Running in DRY RUN mode - no changes will be made'));
    console.log();
  }
  
  // Step 1: Load farms
  const farmSpinner = ora('Loading farms').start();
  let farms;
  
  try {
    const { data, error } = await supabase
      .from('farms')
      .select('id, name, user_id, created_at');
      
    if (error) throw error;
    
    // Filter by farm ID if specified
    if (argv.farm) {
      farms = data.filter(farm => farm.id === argv.farm);
      if (farms.length === 0) {
        throw new Error(`Farm with ID ${argv.farm} not found`);
      }
      farmSpinner.succeed(`Loaded farm: ${farms[0].name}`);
    } else {
      farms = data;
      farmSpinner.succeed(`Loaded ${farms.length} farms`);
    }
  } catch (error) {
    farmSpinner.fail(`Failed to load farms: ${error.message}`);
    process.exit(1);
  }
  
  // Step 2: Process each farm
  for (const farm of farms) {
    console.log();
    console.log(chalk.green.bold(`Processing farm: ${farm.name} (${farm.id})`));
    
    // Step 2.1: Create or get master vault
    let masterVault;
    const vaultSpinner = ora('Creating master vault').start();
    
    try {
      if (!argv['dry-run']) {
        // Check if master vault already exists
        const { data, error } = await supabase
          .from('vault_master')
          .select()
          .eq('farm_id', farm.id)
          .maybeSingle();
          
        if (data) {
          // Master vault already exists
          masterVault = data;
          vaultSpinner.succeed(`Found existing master vault: ${masterVault.name}`);
        } else {
          // Create new master vault
          masterVault = await unifiedBankingService.createMasterVault(
            `${farm.name} Master Vault`,
            `Unified vault for ${farm.name}`,
            farm.user_id
          );
          vaultSpinner.succeed(`Created new master vault: ${masterVault.name}`);
        }
      } else {
        vaultSpinner.succeed(`Would create master vault for: ${farm.name}`);
      }
    } catch (error) {
      vaultSpinner.fail(`Failed to create master vault: ${error.message}`);
      console.log(chalk.yellow('Skipping this farm and continuing with next'));
      continue;
    }
    
    // Step 2.2: Get legacy wallets
    const walletsSpinner = ora('Loading legacy wallets').start();
    let legacyWallets: LegacyWallet[] = [];
    
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('farm_id', farm.id);
        
      if (error) throw error;
      
      legacyWallets = data;
      walletsSpinner.succeed(`Loaded ${legacyWallets.length} legacy wallets`);
    } catch (error) {
      walletsSpinner.fail(`Failed to load legacy wallets: ${error.message}`);
      continue;
    }
    
    // Step 2.3: Migrate each wallet
    console.log(chalk.blue('Migrating wallets to vault accounts:'));
    
    for (const wallet of legacyWallets) {
      const walletSpinner = ora(`Migrating wallet: ${wallet.name}`).start();
      
      try {
        if (!argv['dry-run']) {
          // Migrate the wallet
          await unifiedBankingService.migrateLegacyWallet(wallet, masterVault.id);
          walletSpinner.succeed(`Migrated: ${wallet.name} with balance ${wallet.balance} ${wallet.currency}`);
        } else {
          walletSpinner.succeed(`Would migrate: ${wallet.name} with balance ${wallet.balance} ${wallet.currency}`);
        }
      } catch (error) {
        walletSpinner.fail(`Failed to migrate wallet ${wallet.name}: ${error.message}`);
      }
    }
    
    // Step 2.4: Migrate transaction history
    const txSpinner = ora('Migrating transaction history').start();
    
    try {
      if (!argv['dry-run']) {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('farm_id', farm.id);
          
        if (error) throw error;
        
        // For each transaction, create an equivalent transaction in the new system
        let migratedCount = 0;
        
        for (const tx of data) {
          // This is just a simplified example; you would need more sophisticated mapping
          try {
            await unifiedBankingService.createTransaction({
              sourceId: tx.source_id || 'external',
              sourceType: tx.source_type || 'legacy_wallet',
              destinationId: tx.destination_id || 'external',
              destinationType: tx.destination_type || 'legacy_wallet',
              amount: tx.amount,
              currency: tx.currency || 'USD',
              type: mapTransactionType(tx.type),
              description: `[Migrated] ${tx.description || tx.type}`,
              reference: tx.reference,
              network: tx.network,
              fee: tx.fee,
              metadata: {
                legacy_tx_id: tx.id,
                migration_date: new Date().toISOString(),
                original_data: tx
              },
              status: mapTransactionStatus(tx.status),
              approvalsRequired: 0
            });
            
            migratedCount++;
          } catch (error) {
            if (argv.verbose) {
              console.log(`  Error migrating transaction ${tx.id}: ${error.message}`);
            }
          }
        }
        
        txSpinner.succeed(`Migrated ${migratedCount} of ${data.length} transactions`);
      } else {
        const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('farm_id', farm.id);
          
        txSpinner.succeed(`Would migrate ${count} transactions`);
      }
    } catch (error) {
      txSpinner.fail(`Failed to migrate transactions: ${error.message}`);
    }
    
    // Step 2.5: Perform validation
    console.log(chalk.blue('Validating migration:'));
    
    if (!argv['dry-run']) {
      // Validate balances
      const balanceSpinner = ora('Validating balances').start();
      
      try {
        // Calculate total balance from legacy system
        const { data: legacyData } = await supabase
          .from('wallets')
          .select('balance')
          .eq('farm_id', farm.id);
          
        const legacyTotal = legacyData.reduce((sum, w) => sum + (w.balance || 0), 0);
        
        // Get balance from new system
        const { data: newData } = await supabase
          .from('vault_accounts')
          .select('balance')
          .eq('farm_id', farm.id);
          
        const newTotal = newData.reduce((sum, a) => sum + (a.balance || 0), 0);
        
        // Check if balances match
        const difference = Math.abs(legacyTotal - newTotal);
        const tolerance = 0.001; // Small tolerance for floating point issues
        
        if (difference <= tolerance) {
          balanceSpinner.succeed(`Balances match: Legacy=${legacyTotal}, New=${newTotal}`);
        } else {
          balanceSpinner.warn(`Balance mismatch: Legacy=${legacyTotal}, New=${newTotal}, Diff=${difference}`);
        }
      } catch (error) {
        balanceSpinner.fail(`Balance validation failed: ${error.message}`);
      }
    }
    
    console.log(chalk.green.bold(`Completed migration for farm: ${farm.name}`));
  }
  
  console.log();
  console.log(chalk.blue.bold('==================================='));
  console.log(chalk.green.bold('Migration Complete'));
  console.log(chalk.blue.bold('==================================='));
}

// Helper functions
function mapTransactionType(legacyType: string): string {
  // Map legacy transaction types to new ones
  const typeMap: Record<string, string> = {
    'deposit': 'deposit',
    'withdrawal': 'withdrawal',
    'transfer': 'transfer',
    'allocation': 'allocation',
    'fee': 'fee',
    'reward': 'reward',
    'interest': 'interest',
    'trade': 'allocation'
  };
  
  return typeMap[legacyType.toLowerCase()] || 'transfer';
}

function mapTransactionStatus(legacyStatus: string): string {
  // Map legacy statuses to new ones
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'completed': 'completed',
    'failed': 'failed',
    'cancelled': 'cancelled',
    'processing': 'processing',
    // Add any other legacy statuses here
  };
  
  return statusMap[legacyStatus.toLowerCase()] || 'completed';
}

// Run the migration
migrateToUnifiedBanking().catch(error => {
  console.error(chalk.red('Migration failed:'), error);
  process.exit(1);
}); 