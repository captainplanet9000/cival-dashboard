import { vaultService } from './vaultService';
import { storageService } from './storageService';
import { TransactionType } from '@/types/vault';
import { StorageType, StorageTransactionType } from '@/types/storage';
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';

/**
 * Integration Service
 * Handles integration between vault and storage systems
 */
export class IntegrationService {
  private supabase;
  private isServerSide: boolean;
  
  /**
   * Create a new IntegrationService instance
   * @param isServerSide Whether this service is being used on the server side
   */
  constructor(isServerSide = false) {
    this.isServerSide = isServerSide;
    this.supabase = isServerSide 
      ? createServerClient() 
      : createBrowserClient();
  }
  
  /**
   * Get a singleton instance of the IntegrationService
   * @param isServerSide Whether this service is being used on the server side
   * @returns IntegrationService instance
   */
  static getInstance(isServerSide = false): IntegrationService {
    return new IntegrationService(isServerSide);
  }
  
  /**
   * Create agent storage with associated vault account
   * @param agentId Agent ID
   * @param masterId Vault master ID
   * @param name Storage name
   * @param capacity Initial storage capacity
   * @param options Additional options
   * @returns Agent storage ID and vault account ID
   */
  async createAgentStorageWithVault(
    agentId: string,
    masterId: string,
    name: string,
    capacity: number,
    options?: {
      description?: string;
      currency?: string;
      storageType?: string;
      initialDeposit?: number;
    }
  ): Promise<{ storageId: string; vaultAccountId: string }> {
    // First create the vault account
    const vaultAccount = await vaultService.createVaultAccount(
      masterId,
      `Storage Account: ${name}`,
      'reserve',
      options?.currency || 'USD',
      {
        agentId,
        riskLevel: 'low',
        securityLevel: 'enhanced'
      }
    );
    
    // If initial deposit is specified, fund the account
    if (options?.initialDeposit && options.initialDeposit > 0) {
      await vaultService.deposit(
        vaultAccount.id,
        options.initialDeposit,
        vaultAccount.currency,
        'external',
        'initial_funding',
        {
          description: `Initial funding for ${name} storage account`,
          metadata: {
            purpose: 'storage_initialization',
            agentId
          }
        }
      );
    }
    
    // Create the agent storage with the vault account
    const agentStorage = await storageService.createAgentStorage(
      agentId,
      name,
      capacity,
      {
        description: options?.description,
        storageType: options?.storageType,
        vaultAccountId: vaultAccount.id,
        settings: {
          autoExpand: false,
          expansionThresholdPercent: 80,
          maxCapacity: capacity * 2,
          backupEnabled: true,
          encryptionEnabled: true
        },
        metadata: {
          associatedVaultAccount: vaultAccount.id,
          initialCapacity: capacity
        }
      }
    );
    
    return {
      storageId: agentStorage.id,
      vaultAccountId: vaultAccount.id
    };
  }
  
  /**
   * Create farm storage with associated vault account
   * @param farmId Farm ID
   * @param masterId Vault master ID
   * @param name Storage name
   * @param capacity Initial storage capacity
   * @param options Additional options
   * @returns Farm storage ID and vault account ID
   */
  async createFarmStorageWithVault(
    farmId: string,
    masterId: string,
    name: string,
    capacity: number,
    options?: {
      description?: string;
      currency?: string;
      storageType?: string;
      reservedSpace?: number;
      initialDeposit?: number;
    }
  ): Promise<{ storageId: string; vaultAccountId: string }> {
    // First create the vault account
    const vaultAccount = await vaultService.createVaultAccount(
      masterId,
      `Storage Account: ${name}`,
      'reserve',
      options?.currency || 'USD',
      {
        farmId,
        riskLevel: 'low',
        securityLevel: 'enhanced'
      }
    );
    
    // If initial deposit is specified, fund the account
    if (options?.initialDeposit && options.initialDeposit > 0) {
      await vaultService.deposit(
        vaultAccount.id,
        options.initialDeposit,
        vaultAccount.currency,
        'external',
        'initial_funding',
        {
          description: `Initial funding for ${name} storage account`,
          metadata: {
            purpose: 'storage_initialization',
            farmId
          }
        }
      );
    }
    
    // Create the farm storage with the vault account
    const farmStorage = await storageService.createFarmStorage(
      farmId,
      name,
      capacity,
      {
        description: options?.description,
        storageType: options?.storageType,
        vaultAccountId: vaultAccount.id,
        reservedSpace: options?.reservedSpace,
        settings: {
          autoExpand: false,
          expansionThresholdPercent: 80,
          maxCapacity: capacity * 2,
          backupEnabled: true,
          encryptionEnabled: true,
          allocationPolicy: 'balanced'
        },
        metadata: {
          associatedVaultAccount: vaultAccount.id,
          initialCapacity: capacity
        }
      }
    );
    
    return {
      storageId: farmStorage.id,
      vaultAccountId: vaultAccount.id
    };
  }
  
  /**
   * Expand storage capacity with associated financial transaction
   * @param storageId Storage ID
   * @param storageType Storage type
   * @param additionalCapacity Capacity to add
   * @param costPerUnit Cost per unit of storage
   * @returns Updated storage capacity and transaction ID
   */
  async expandStorageWithPayment(
    storageId: string,
    storageType: StorageType,
    additionalCapacity: number,
    costPerUnit: number
  ): Promise<{ newCapacity: number; transactionId: string }> {
    // Get current storage info
    let currentCapacity: number;
    let vaultAccountId: string | undefined;
    
    if (storageType === StorageType.AGENT) {
      const storage = await storageService.getAgentStorage(storageId);
      currentCapacity = storage.capacity;
      vaultAccountId = storage.vaultAccountId;
    } else if (storageType === StorageType.FARM) {
      const storage = await storageService.getFarmStorage(storageId);
      currentCapacity = storage.capacity;
      vaultAccountId = storage.vaultAccountId;
    } else {
      throw new Error(`Invalid storage type: ${storageType}`);
    }
    
    // Calculate total cost
    const totalCost = additionalCapacity * costPerUnit;
    
    // Verify vault account exists
    if (!vaultAccountId) {
      throw new Error('Storage has no associated vault account for payment');
    }
    
    // Verify sufficient funds
    const balance = await vaultService.getBalance(vaultAccountId);
    if (balance.available < totalCost) {
      throw new Error(`Insufficient funds. Need ${totalCost} but only ${balance.available} available.`);
    }
    
    // Create the financial transaction
    const vaultTransaction = await vaultService.createTransaction({
      sourceId: vaultAccountId,
      sourceType: 'vault_account',
      destinationId: 'storage_provider',
      destinationType: 'external',
      amount: totalCost,
      currency: balance.currency,
      type: TransactionType.FEE,
      description: `Payment for ${additionalCapacity} storage capacity expansion`,
      metadata: {
        purpose: 'storage_expansion',
        storageId,
        storageType,
        additionalCapacity,
        costPerUnit
      }
    });
    
    // Update storage capacity
    const newCapacity = currentCapacity + additionalCapacity;
    if (storageType === StorageType.AGENT) {
      await storageService.updateAgentStorage(storageId, { capacity: newCapacity });
    } else if (storageType === StorageType.FARM) {
      await storageService.updateFarmStorage(storageId, { capacity: newCapacity });
    }
    
    // Record the storage transaction linked to the vault transaction
    await storageService.createStorageTransaction({
      sourceId: 'storage_provider',
      sourceType: StorageType.EXTERNAL,
      destinationId: storageId,
      destinationType: storageType,
      amount: additionalCapacity,
      transactionType: StorageTransactionType.RESIZE,
      description: `Expanded storage capacity by ${additionalCapacity} units`,
      vaultTransactionId: vaultTransaction.id,
      metadata: {
        costPerUnit,
        totalCost,
        previousCapacity: currentCapacity,
        newCapacity
      }
    });
    
    // Approve the financial transaction
    const user = await this.supabase.auth.getUser();
    await vaultService.updateTransactionStatus(
      vaultTransaction.id,
      'completed',
      user.data.user?.id || 'system',
      'Automatic approval for storage expansion payment'
    );
    
    return {
      newCapacity,
      transactionId: vaultTransaction.id
    };
  }
  
  /**
   * Allocate storage with recurring payment
   * @param storageId Storage ID to allocate from
   * @param storageType Type of storage
   * @param allocatedToId Entity receiving allocation
   * @param allocatedToType Type of entity
   * @param amount Amount to allocate
   * @param costPerUnit Cost per unit per billing period
   * @param vaultAccountId Vault account for payments
   * @param options Additional options
   * @returns Allocation ID and subscription ID
   */
  async allocateStorageWithSubscription(
    storageId: string,
    storageType: StorageType,
    allocatedToId: string,
    allocatedToType: string,
    amount: number,
    costPerUnit: number,
    vaultAccountId: string,
    options?: {
      purpose?: string;
      recurringPaymentInterval?: 'daily' | 'weekly' | 'monthly';
      startDate?: string;
      endDate?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ allocationId: string; subscriptionId: string }> {
    // Get vault account currency
    const vaultAccount = await vaultService.getVaultAccount(vaultAccountId);
    
    // Calculate total cost per period
    const totalCostPerPeriod = amount * costPerUnit;
    
    // Verify sufficient funds for at least the first payment
    const balance = await vaultService.getBalance(vaultAccountId);
    if (balance.available < totalCostPerPeriod) {
      throw new Error(`Insufficient funds for initial payment. Need ${totalCostPerPeriod} but only ${balance.available} available.`);
    }
    
    // Create the allocation
    const allocation = await storageService.createStorageAllocation(
      storageId,
      storageType,
      allocatedToId,
      allocatedToType,
      amount,
      {
        purpose: options?.purpose,
        startDate: options?.startDate,
        endDate: options?.endDate,
        metadata: {
          ...options?.metadata,
          paymentInfo: {
            vaultAccountId,
            costPerUnit,
            totalCostPerPeriod,
            recurringPaymentInterval: options?.recurringPaymentInterval || 'monthly'
          }
        }
      }
    );
    
    // Create the initial payment
    const vaultTransaction = await vaultService.createTransaction({
      sourceId: vaultAccountId,
      sourceType: 'vault_account',
      destinationId: 'storage_provider',
      destinationType: 'external',
      amount: totalCostPerPeriod,
      currency: vaultAccount.currency,
      type: TransactionType.FEE,
      description: `Initial payment for ${amount} storage allocation`,
      metadata: {
        purpose: 'storage_allocation',
        storageId,
        storageType,
        allocatedAmount: amount,
        costPerUnit,
        allocationId: allocation.id
      }
    });
    
    // Approve the financial transaction
    const user = await this.supabase.auth.getUser();
    await vaultService.updateTransactionStatus(
      vaultTransaction.id,
      'completed',
      user.data.user?.id || 'system',
      'Automatic approval for storage allocation payment'
    );
    
    // Create a subscription record in the database
    const { data: subscription, error } = await this.supabase
      .from('storage_subscriptions')
      .insert({
        allocation_id: allocation.id,
        vault_account_id: vaultAccountId,
        amount_per_period: totalCostPerPeriod,
        period: options?.recurringPaymentInterval || 'monthly',
        is_active: true,
        last_payment_date: new Date().toISOString(),
        next_payment_date: this.calculateNextPaymentDate(options?.recurringPaymentInterval || 'monthly'),
        metadata: {
          costPerUnit,
          allocatedStorage: amount,
          storageId,
          storageType
        }
      })
      .select()
      .single();
      
    if (error) throw new Error(`Failed to create subscription: ${error.message}`);
    
    return {
      allocationId: allocation.id,
      subscriptionId: subscription.id
    };
  }
  
  /**
   * Cancel a storage allocation and associated subscription
   * @param allocationId Allocation ID
   * @returns Success status
   */
  async cancelStorageAllocationAndSubscription(allocationId: string): Promise<boolean> {
    // Get the subscription associated with this allocation
    const { data: subscription, error } = await this.supabase
      .from('storage_subscriptions')
      .select()
      .eq('allocation_id', allocationId)
      .eq('is_active', true)
      .single();
      
    if (error) {
      // If no subscription found, just deactivate the allocation
      await storageService.updateStorageAllocation(allocationId, false);
      return true;
    }
    
    // Deactivate the subscription
    const { error: updateError } = await this.supabase
      .from('storage_subscriptions')
      .update({
        is_active: false,
        end_date: new Date().toISOString()
      })
      .eq('id', subscription.id);
      
    if (updateError) throw new Error(`Failed to deactivate subscription: ${updateError.message}`);
    
    // Deactivate the allocation
    await storageService.updateStorageAllocation(allocationId, false);
    
    // Record a final transaction
    const vaultTransaction = await vaultService.createTransaction({
      sourceId: subscription.vault_account_id,
      sourceType: 'vault_account',
      destinationId: 'storage_provider',
      destinationType: 'external',
      amount: 0, // No charge for cancellation
      currency: 'USD', // Default
      type: TransactionType.FEE,
      description: `Cancellation of storage allocation subscription`,
      metadata: {
        purpose: 'subscription_cancellation',
        allocationId,
        subscriptionId: subscription.id,
        finalPaymentDate: subscription.last_payment_date
      }
    });
    
    return true;
  }
  
  /**
   * Get storage allocations with payment information
   * @param entityId ID of the entity (agent or farm)
   * @param entityType Type of entity
   * @returns List of allocations with payment details
   */
  async getStorageAllocationsWithPayments(
    entityId: string,
    entityType: 'agent' | 'farm'
  ): Promise<Array<any>> {
    // Get all allocations for this entity
    const allocations = await storageService.getStorageAllocations({
      allocatedToId: entityId,
      allocatedToType: entityType,
      isActive: true
    });
    
    // Get subscriptions for these allocations
    const { data: subscriptions, error } = await this.supabase
      .from('storage_subscriptions')
      .select()
      .in('allocation_id', allocations.map(a => a.id))
      .eq('is_active', true);
      
    if (error) throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    
    // Create a map of allocation IDs to subscriptions
    const subscriptionMap = new Map();
    (subscriptions || []).forEach(sub => {
      subscriptionMap.set(sub.allocation_id, sub);
    });
    
    // Combine allocation and subscription data
    return allocations.map(allocation => {
      const subscription = subscriptionMap.get(allocation.id);
      
      return {
        ...allocation,
        paymentInfo: subscription ? {
          subscriptionId: subscription.id,
          vaultAccountId: subscription.vault_account_id,
          amountPerPeriod: subscription.amount_per_period,
          period: subscription.period,
          lastPaymentDate: subscription.last_payment_date,
          nextPaymentDate: subscription.next_payment_date
        } : null
      };
    });
  }
  
  /**
   * Process recurring payments for storage subscriptions
   * @returns Number of transactions processed
   */
  async processRecurringStoragePayments(): Promise<number> {
    const now = new Date().toISOString();
    
    // Find subscriptions that need payment
    const { data: dueSubscriptions, error } = await this.supabase
      .from('storage_subscriptions')
      .select()
      .eq('is_active', true)
      .lte('next_payment_date', now);
      
    if (error) throw new Error(`Failed to fetch due subscriptions: ${error.message}`);
    
    if (!dueSubscriptions || dueSubscriptions.length === 0) {
      return 0;
    }
    
    let processedCount = 0;
    
    // Process each due subscription
    for (const subscription of dueSubscriptions) {
      try {
        // Verify vault account has sufficient funds
        const balance = await vaultService.getBalance(subscription.vault_account_id);
        
        if (balance.available < subscription.amount_per_period) {
          // If insufficient funds, mark as failed payment but keep subscription active
          await this.supabase
            .from('storage_payment_history')
            .insert({
              subscription_id: subscription.id,
              amount: subscription.amount_per_period,
              status: 'failed',
              failure_reason: 'insufficient_funds',
              due_date: subscription.next_payment_date
            });
            
          // Update next payment date to retry in 24 hours
          await this.supabase
            .from('storage_subscriptions')
            .update({
              next_payment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', subscription.id);
            
          continue;
        }
        
        // Create and process payment
        const vaultTransaction = await vaultService.createTransaction({
          sourceId: subscription.vault_account_id,
          sourceType: 'vault_account',
          destinationId: 'storage_provider',
          destinationType: 'external',
          amount: subscription.amount_per_period,
          currency: balance.currency,
          type: TransactionType.FEE,
          description: `Recurring payment for storage allocation`,
          metadata: {
            purpose: 'storage_subscription',
            subscriptionId: subscription.id,
            allocationId: subscription.allocation_id,
            billingPeriod: subscription.period
          }
        });
        
        // Auto-approve the transaction
        await vaultService.updateTransactionStatus(
          vaultTransaction.id,
          'completed',
          'system',
          'Automatic approval for scheduled storage payment'
        );
        
        // Record payment in history
        await this.supabase
          .from('storage_payment_history')
          .insert({
            subscription_id: subscription.id,
            transaction_id: vaultTransaction.id,
            amount: subscription.amount_per_period,
            status: 'completed',
            payment_date: now
          });
          
        // Update subscription with new payment dates
        const nextPaymentDate = this.calculateNextPaymentDate(subscription.period, new Date(now));
        
        await this.supabase
          .from('storage_subscriptions')
          .update({
            last_payment_date: now,
            next_payment_date: nextPaymentDate
          })
          .eq('id', subscription.id);
          
        processedCount++;
      } catch (error) {
        console.error(`Failed to process payment for subscription ${subscription.id}:`, error);
        
        // Record failed payment
        await this.supabase
          .from('storage_payment_history')
          .insert({
            subscription_id: subscription.id,
            amount: subscription.amount_per_period,
            status: 'failed',
            failure_reason: (error as Error).message,
            due_date: subscription.next_payment_date
          });
      }
    }
    
    return processedCount;
  }
  
  /**
   * Calculate the next payment date based on current date and billing period
   * @param period Billing period (daily, weekly, monthly)
   * @param fromDate Starting date (defaults to now)
   * @returns Next payment date as ISO string
   */
  private calculateNextPaymentDate(
    period: 'daily' | 'weekly' | 'monthly',
    fromDate = new Date()
  ): string {
    const date = new Date(fromDate);
    
    switch (period) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
    }
    
    return date.toISOString();
  }
}

// Export singleton instance
export const integrationService = new IntegrationService(); 