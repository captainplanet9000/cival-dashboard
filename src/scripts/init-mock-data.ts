#!/usr/bin/env ts-node

/**
 * Initialize Mock Data
 * 
 * This script creates initial mock data for development and testing.
 * It sets up sample agents, farms, storage resources, and vault accounts.
 * This is useful for having consistent test data when starting development.
 * 
 * Usage:
 * npm run init:mocks
 */

import dotenv from 'dotenv';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import { 
  getStorageService, 
  getVaultService, 
  getIntegrationService,
  resetAllMockData
} from '../services/serviceFactory';
import { StorageType, StorageStatus } from '../types/storage';

// Load environment variables
dotenv.config();

// Test user ID
const TEST_USER_ID = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000';

// Initialize services
const storageService = getStorageService(true);
const vaultService = getVaultService(true);
const integrationService = getIntegrationService(true);

// Storage capacities
const GB = 1024 * 1024 * 1024;

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Print a step header
 */
function printStep(num: number, description: string): void {
  console.log('\n' + chalk.bgBlue.white(` STEP ${num} `) + ' ' + chalk.blue(description));
}

/**
 * Print a success message
 */
function printSuccess(message: string): void {
  console.log(chalk.green('✓ ') + message);
}

/**
 * Print an info message
 */
function printInfo(message: string): void {
  console.log(chalk.yellow('i ') + message);
}

/**
 * Initialize mock data
 */
async function initMockData() {
  console.log(chalk.bgGreen.white(' INITIALIZE MOCK DATA '));
  console.log(chalk.green('Creating development environment with sample data\n'));
  
  try {
    // Reset any existing mock data
    resetAllMockData();
    printSuccess('Reset all mock data to initial state');
    
    // Step 1: Create test agents
    printStep(1, 'Creating test agents');
    
    // Create agents
    const agent1 = await createAgent('Trading Bot Alpha', 'Primary BTC/USD trading bot');
    const agent2 = await createAgent('Sentiment Analyzer', 'Social media sentiment analysis agent');
    const agent3 = await createAgent('Market Scanner', 'Scans markets for opportunities');
    
    printSuccess(`Created ${chalk.bold('3')} test agents`);
    
    // Step 2: Create test farms
    printStep(2, 'Creating test farms');
    
    // Create farms
    const farm1 = await createFarm('Bitcoin Strategy Farm', 'Bitcoin trading strategies');
    const farm2 = await createFarm('DeFi Yield Farm', 'Yield farming optimization');
    
    printSuccess(`Created ${chalk.bold('2')} test farms`);
    
    // Step 3: Create vault master
    printStep(3, 'Creating vault master account');
    
    // Create vault master
    const vaultMaster = await vaultService.createMasterVault(
      'Development Vault Master',
      'Master vault for development and testing',
      TEST_USER_ID,
      1000 // Initial balance $1000
    );
    
    printSuccess(`Created vault master with ID: ${vaultMaster.id}`);
    printInfo(`Initial balance: $${vaultMaster.balance}`);
    
    // Step 4: Create agent storage with vault integration
    printStep(4, 'Creating agent storage');
    
    // Create agent storage for each agent
    const agent1Storage = await integrationService.createAgentStorageWithVault(
      agent1.id,
      vaultMaster.id,
      'Primary Trading Storage',
      5 * GB,
      {
        description: 'Main storage for trading bot',
        storageType: 'autonomous',
        initialDeposit: 50
      }
    );
    
    const agent2Storage = await integrationService.createAgentStorageWithVault(
      agent2.id,
      vaultMaster.id,
      'Sentiment Data Storage',
      2 * GB,
      {
        description: 'Storage for sentiment analysis data',
        storageType: 'managed',
        initialDeposit: 20
      }
    );
    
    const agent3Storage = await storageService.createAgentStorage(
      agent3.id,
      'Scanner Storage',
      1 * GB,
      {
        description: 'Storage for market scanning results',
        storageType: 'basic'
      }
    );
    
    printSuccess(`Created ${chalk.bold('3')} agent storage volumes`);
    printInfo(`Total agent storage capacity: ${formatBytes(8 * GB)}`);
    
    // Step 5: Create farm storage with vault integration
    printStep(5, 'Creating farm storage');
    
    // Create farm storage for each farm
    const farm1Storage = await integrationService.createFarmStorageWithVault(
      farm1.id,
      vaultMaster.id,
      'Bitcoin Strategy Storage',
      10 * GB,
      {
        description: 'Storage for bitcoin trading strategies',
        storageType: 'centralized',
        reservedSpace: 1 * GB,
        initialDeposit: 100
      }
    );
    
    const farm2Storage = await integrationService.createFarmStorageWithVault(
      farm2.id,
      vaultMaster.id,
      'DeFi Yield Storage',
      15 * GB,
      {
        description: 'Storage for DeFi yield strategies',
        storageType: 'centralized',
        reservedSpace: 2 * GB,
        initialDeposit: 150
      }
    );
    
    printSuccess(`Created ${chalk.bold('2')} farm storage volumes`);
    printInfo(`Total farm storage capacity: ${formatBytes(25 * GB)}`);
    
    // Step 6: Create storage allocations
    printStep(6, 'Creating storage allocations');
    
    // Models to allocate storage to
    const model1Id = uuidv4();
    const model2Id = uuidv4();
    const strategyId = uuidv4();
    
    // Create allocations
    await storageService.createStorageAllocation(
      agent1Storage.storageId,
      StorageType.AGENT,
      model1Id,
      'model',
      2 * GB,
      { purpose: 'Trading model storage' }
    );
    
    await storageService.createStorageAllocation(
      agent2Storage.storageId,
      StorageType.AGENT,
      model2Id,
      'model',
      1 * GB,
      { purpose: 'Sentiment model storage' }
    );
    
    await storageService.createStorageAllocation(
      farm1Storage.storageId,
      StorageType.FARM,
      strategyId,
      'strategy',
      5 * GB,
      { purpose: 'Bitcoin trading strategy storage' }
    );
    
    printSuccess(`Created ${chalk.bold('3')} storage allocations`);
    
    // Step 7: Create some transactions for history
    printStep(7, 'Creating historical transactions');
    
    // Create a few transactions for history
    await storageService.createStorageTransaction({
      sourceId: 'external',
      sourceType: StorageType.EXTERNAL,
      destinationId: agent1Storage.storageId,
      destinationType: StorageType.AGENT,
      amount: 2 * GB,
      transactionType: 'allocation',
      description: 'Initial storage allocation'
    });
    
    await storageService.createStorageTransaction({
      sourceId: agent1Storage.storageId,
      sourceType: StorageType.AGENT,
      destinationId: agent1Storage.storageId,
      destinationType: StorageType.AGENT,
      amount: 5 * GB,
      transactionType: 'resize',
      description: 'Expanded storage capacity'
    });
    
    printSuccess(`Created ${chalk.bold('2')} historical transactions`);
    
    console.log('\n' + chalk.bgGreen.white(' INITIALIZATION COMPLETED SUCCESSFULLY '));
    console.log(chalk.green('The mock data environment is now ready for development and testing!'));
    
  } catch (error) {
    console.error('\n' + chalk.bgRed.white(' INITIALIZATION FAILED '));
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

// Helper to create an agent
async function createAgent(name: string, description: string) {
  const { createMockAgent } = await import('../__mocks__/data/agentData');
  return createMockAgent(name, description, TEST_USER_ID);
}

// Helper to create a farm
async function createFarm(name: string, description: string) {
  const { createMockFarm } = await import('../__mocks__/data/farmData');
  return createMockFarm(name, description, TEST_USER_ID);
}

// Run the initialization
initMockData(); 