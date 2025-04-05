#!/usr/bin/env ts-node

/**
 * Storage Integration Test Script
 * 
 * This script tests the integration between the Storage Services, Vault Services,
 * and database operations. It simulates the complete lifecycle of storage resources:
 * - Creating agent and farm storage
 * - Setting up vault integration
 * - Expanding storage capacity
 * - Creating and managing allocations
 * - Health checks and diagnostics
 * 
 * Usage:
 * npm run test:storage-integration
 * 
 * Note: This is intended to run in a test environment with test data.
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../services/storageService';
import { VaultService } from '../services/vaultService';
import { IntegrationService } from '../services/integrationService';
import { StorageType, StorageStatus } from '../types/storage';

// Load environment variables
dotenv.config();

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(chalk.red('Error: Missing Supabase credentials'));
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Initialize services
const storageService = new StorageService(supabase);
const vaultService = new VaultService(supabase);
const integrationService = new IntegrationService(supabase, storageService, vaultService);

// Test configuration
const TEST_USER_ID = process.env.TEST_USER_ID || uuidv4();
const INITIAL_CAPACITY = 1024 * 1024 * 1024; // 1GB
const EXPANSION_SIZE = 512 * 1024 * 1024; // 512MB
const ALLOCATION_SIZE = 256 * 1024 * 1024; // 256MB

// IDs to track created resources
let agentId: string;
let farmId: string;
let agentStorageId: string;
let farmStorageId: string;
let vaultMasterId: string;
let agentAllocationId: string;
let farmAllocationId: string;

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
function printStep(step: number, title: string): void {
  console.log('\n' + chalk.bgBlue.white(` STEP ${step} `) + ' ' + chalk.blue(title));
  console.log(chalk.blue('-'.repeat(50)));
}

/**
 * Print a success message
 */
function printSuccess(message: string): void {
  console.log(chalk.green('✓ ') + message);
}

/**
 * Print a failure message
 */
function printFailure(message: string): void {
  console.log(chalk.red('✗ ') + message);
}

/**
 * Print info
 */
function printInfo(message: string): void {
  console.log(chalk.yellow('i ') + message);
}

/**
 * Run the storage integration test
 */
async function runStorageIntegrationTest() {
  console.log(chalk.bgGreen.white(' STORAGE INTEGRATION TEST '));
  console.log(chalk.green('Testing integration between storage, vault, and database services\n'));
  
  try {
    // Step 1: Create test agent and farm
    printStep(1, 'Creating test agent and farm');
    
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        name: `Test Agent ${new Date().toISOString()}`,
        description: 'Test agent for storage integration tests',
        owner_id: TEST_USER_ID
      })
      .select()
      .single();
      
    if (agentError) throw new Error(`Failed to create test agent: ${agentError.message}`);
    agentId = agent.id;
    printSuccess(`Created test agent with ID: ${agentId}`);
    
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .insert({
        name: `Test Farm ${new Date().toISOString()}`,
        description: 'Test farm for storage integration tests',
        owner_id: TEST_USER_ID
      })
      .select()
      .single();
      
    if (farmError) throw new Error(`Failed to create test farm: ${farmError.message}`);
    farmId = farm.id;
    printSuccess(`Created test farm with ID: ${farmId}`);
    
    // Step 2: Create a vault master account
    printStep(2, 'Creating vault master account');
    
    const vaultMaster = await vaultService.createVaultMaster({
      name: `Test Master ${new Date().toISOString()}`,
      currency: 'USD',
      ownerId: TEST_USER_ID,
      initialBalance: 100,
      description: 'Test vault master for storage integration tests'
    });
    
    vaultMasterId = vaultMaster.id;
    printSuccess(`Created vault master with ID: ${vaultMasterId} and balance: $${vaultMaster.balance}`);
    
    // Step 3: Create agent storage with vault integration
    printStep(3, 'Creating agent storage with vault integration');
    
    const agentStorageResult = await integrationService.createAgentStorageWithVault(
      agentId,
      vaultMasterId,
      'Test Agent Storage',
      INITIAL_CAPACITY,
      {
        description: 'Agent storage for integration tests',
        storageType: 'managed',
        initialDeposit: 20
      }
    );
    
    agentStorageId = agentStorageResult.storageId;
    printSuccess(`Created agent storage with ID: ${agentStorageId}`);
    printSuccess(`Created associated vault account: ${agentStorageResult.vaultAccountId}`);
    printInfo(`Initial capacity: ${formatBytes(INITIAL_CAPACITY)}`);
    
    // Step 4: Create farm storage with vault integration
    printStep(4, 'Creating farm storage with vault integration');
    
    const farmStorageResult = await integrationService.createFarmStorageWithVault(
      farmId,
      vaultMasterId,
      'Test Farm Storage',
      INITIAL_CAPACITY,
      {
        description: 'Farm storage for integration tests',
        storageType: 'centralized',
        reservedSpace: INITIAL_CAPACITY / 10, // 10% reserved
        initialDeposit: 30
      }
    );
    
    farmStorageId = farmStorageResult.storageId;
    printSuccess(`Created farm storage with ID: ${farmStorageId}`);
    printSuccess(`Created associated vault account: ${farmStorageResult.vaultAccountId}`);
    printInfo(`Initial capacity: ${formatBytes(INITIAL_CAPACITY)}`);
    printInfo(`Reserved space: ${formatBytes(INITIAL_CAPACITY / 10)}`);
    
    // Step 5: Create storage allocations
    printStep(5, 'Creating storage allocations');
    
    // Create agent allocation
    const agentAllocation = await storageService.createStorageAllocation({
      storageId: agentStorageId,
      storageType: StorageType.AGENT,
      allocatedToId: uuidv4(), // Simulating allocation to model
      allocatedToType: 'model',
      amount: ALLOCATION_SIZE,
      purpose: 'Test model storage',
      isActive: true
    });
    
    agentAllocationId = agentAllocation.id;
    printSuccess(`Created agent allocation with ID: ${agentAllocationId}`);
    printInfo(`Allocated ${formatBytes(ALLOCATION_SIZE)} to model`);
    
    // Create farm allocation
    const farmAllocation = await storageService.createStorageAllocation({
      storageId: farmStorageId,
      storageType: StorageType.FARM,
      allocatedToId: uuidv4(), // Simulating allocation to strategy
      allocatedToType: 'strategy',
      amount: ALLOCATION_SIZE,
      purpose: 'Test strategy storage',
      isActive: true
    });
    
    farmAllocationId = farmAllocation.id;
    printSuccess(`Created farm allocation with ID: ${farmAllocationId}`);
    printInfo(`Allocated ${formatBytes(ALLOCATION_SIZE)} to strategy`);
    
    // Step 6: Expand storage capacity
    printStep(6, 'Testing storage expansion');
    
    // Expand agent storage
    await integrationService.expandStorageWithPayment(
      agentStorageId,
      StorageType.AGENT,
      EXPANSION_SIZE,
      0.02 // $0.02 per unit cost
    );
    
    const updatedAgentStorage = await storageService.getAgentStorage(agentStorageId);
    printSuccess(`Expanded agent storage to ${formatBytes(updatedAgentStorage.capacity)}`);
    
    // Step 7: Run health checks
    printStep(7, 'Running health checks');
    
    // Agent storage health check
    const agentHealthCheck = await storageService.runAgentStorageHealthCheck(agentStorageId);
    printSuccess(`Agent storage health: ${agentHealthCheck.status.toUpperCase()}`);
    printInfo(`Recommendations: ${agentHealthCheck.details.recommendations.length}`);
    
    // Farm storage health check
    const farmHealthCheck = await storageService.runFarmStorageHealthCheck(farmStorageId);
    printSuccess(`Farm storage health: ${farmHealthCheck.status.toUpperCase()}`);
    printInfo(`Recommendations: ${farmHealthCheck.details.recommendations.length}`);
    
    // Step 8: Get usage statistics
    printStep(8, 'Retrieving usage statistics');
    
    const agentStats = await storageService.getAgentStorageStats(agentId);
    printSuccess('Retrieved agent storage statistics');
    printInfo(`Total capacity: ${formatBytes(agentStats.totalCapacity)}`);
    printInfo(`Total used: ${formatBytes(agentStats.totalUsed)}`);
    printInfo(`Utilization: ${agentStats.utilizationPercentage.toFixed(2)}%`);
    
    const farmStats = await storageService.getFarmStorageStats(farmId);
    printSuccess('Retrieved farm storage statistics');
    printInfo(`Total capacity: ${formatBytes(farmStats.totalCapacity)}`);
    printInfo(`Total used: ${formatBytes(farmStats.totalUsed)}`);
    printInfo(`Total reserved: ${formatBytes(farmStats.totalReserved)}`);
    printInfo(`Utilization: ${farmStats.utilizationPercentage.toFixed(2)}%`);
    
    // Step 9: Clean up (optional, comment out if you want to keep test data)
    printStep(9, 'Cleaning up test data');
    
    // Deactivate allocations
    await storageService.updateStorageAllocation(agentAllocationId, false);
    await storageService.updateStorageAllocation(farmAllocationId, false);
    printSuccess('Deactivated storage allocations');
    
    // Update storage status to inactive
    await storageService.updateAgentStorage(agentStorageId, { status: StorageStatus.INACTIVE });
    await storageService.updateFarmStorage(farmStorageId, { status: StorageStatus.INACTIVE });
    printSuccess('Marked storage volumes as inactive');
    
    console.log('\n' + chalk.bgGreen.white(' TEST COMPLETED SUCCESSFULLY '));
    
  } catch (error) {
    console.error('\n' + chalk.bgRed.white(' TEST FAILED '));
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}

// Run the test
runStorageIntegrationTest(); 