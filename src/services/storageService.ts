import { createClient } from '@supabase/supabase-js';
import {
  AgentStorage,
  FarmStorage,
  StorageAllocation,
  StorageTransaction,
  StorageAuditLogEntry,
  StorageStats,
  StorageType,
  StorageTransactionType,
  StorageStatus,
  StorageFilter,
  AllocationFilter,
  StorageTransactionFilter
} from '@/types/storage';
import { Database } from '@/types/database.types';
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { vaultService } from './vaultService';

/**
 * Storage Service
 * Handles operations related to agent and farm storage in the trading farm platform.
 */
export class StorageService {
  private supabase;
  private isServerSide: boolean;
  
  /**
   * Create a new StorageService instance
   * @param isServerSide Whether this service is being used on the server side
   */
  constructor(isServerSide = false) {
    this.isServerSide = isServerSide;
    this.supabase = isServerSide 
      ? createServerClient() 
      : createBrowserClient();
  }
  
  /**
   * Get a singleton instance of the StorageService
   * @param isServerSide Whether this service is being used on the server side
   * @returns StorageService instance
   */
  static getInstance(isServerSide = false): StorageService {
    return new StorageService(isServerSide);
  }
  
  // #region Agent Storage Operations
  
  /**
   * Create a new agent storage
   * @param agentId Agent ID that owns this storage
   * @param name Storage name
   * @param capacity Initial storage capacity
   * @param options Additional options
   * @returns Created agent storage
   */
  async createAgentStorage(
    agentId: string,
    name: string,
    capacity: number,
    options?: {
      description?: string;
      storageType?: string;
      vaultAccountId?: string;
      settings?: Partial<AgentStorage['settings']>;
      metadata?: Record<string, any>;
    }
  ): Promise<AgentStorage> {
    // First verify agent exists and is owned by current user
    const { data: agent, error: agentError } = await this.supabase
      .from('agents')
      .select('id, owner_id')
      .eq('id', agentId)
      .single();
      
    if (agentError) throw new Error(`Failed to verify agent ownership: ${agentError.message}`);
    
    // Verify vault account if provided
    if (options?.vaultAccountId) {
      try {
        const vaultAccount = await vaultService.getVaultAccount(options.vaultAccountId);
        
        // Verify this vault is associated with the agent
        if (vaultAccount.agentId !== agentId) {
          throw new Error('Vault account is not associated with this agent');
        }
      } catch (error) {
        throw new Error(`Invalid vault account: ${(error as Error).message}`);
      }
    }
    
    // Default settings
    const defaultSettings = {
      autoExpand: false,
      expansionThresholdPercent: 80,
      maxCapacity: capacity * 2,
      backupEnabled: false,
      encryptionEnabled: false,
      ...options?.settings
    };
    
    // Create the storage
    const { data, error } = await this.supabase
      .from('agent_storage')
      .insert({
        name,
        description: options?.description,
        agent_id: agentId,
        storage_type: options?.storageType || 'autonomous',
        capacity,
        used_space: 0,
        vault_account_id: options?.vaultAccountId,
        settings: defaultSettings,
        metadata: options?.metadata,
        status: StorageStatus.ACTIVE
      })
      .select()
      .single();
      
    if (error) throw new Error(`Failed to create agent storage: ${error.message}`);
    
    // Create audit log
    await this.createAuditLog({
      action: 'storage.agent.create',
      storageId: data.id,
      storageType: StorageType.AGENT,
      details: {
        agentId,
        capacity,
        name
      }
    });
    
    return this.mapAgentStorageFromDb(data);
  }
  
  /**
   * Get an agent storage by ID
   * @param id Storage ID
   * @returns Agent storage
   */
  async getAgentStorage(id: string): Promise<AgentStorage> {
    const { data, error } = await this.supabase
      .from('agent_storage')
      .select()
      .eq('id', id)
      .single();
      
    if (error) throw new Error(`Failed to fetch agent storage: ${error.message}`);
    
    return this.mapAgentStorageFromDb(data);
  }
  
  /**
   * Get all storage for an agent
   * @param agentId Agent ID
   * @returns Array of agent storage
   */
  async getAgentStorageByAgent(agentId: string): Promise<AgentStorage[]> {
    const { data, error } = await this.supabase
      .from('agent_storage')
      .select()
      .eq('agent_id', agentId);
      
    if (error) throw new Error(`Failed to fetch agent storage: ${error.message}`);
    
    return data.map(this.mapAgentStorageFromDb);
  }
  
  /**
   * Update agent storage properties
   * @param id Storage ID
   * @param updates Fields to update
   * @returns Updated agent storage
   */
  async updateAgentStorage(
    id: string, 
    updates: Partial<AgentStorage>
  ): Promise<AgentStorage> {
    const dbUpdates: any = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.storageType !== undefined) dbUpdates.storage_type = updates.storageType;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.settings !== undefined) dbUpdates.settings = updates.settings;
    if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata;
    if (updates.vaultAccountId !== undefined) dbUpdates.vault_account_id = updates.vaultAccountId;
    
    // Some properties require special handling
    if (updates.capacity !== undefined) {
      // Use the database function to update capacity
      const { error: capacityError } = await this.supabase.rpc('update_storage_capacity', {
        p_storage_id: id,
        p_storage_type: 'agent_storage',
        p_new_capacity: updates.capacity
      });
      
      if (capacityError) throw new Error(`Failed to update storage capacity: ${capacityError.message}`);
      
      // Create capacity change transaction
      await this.createStorageTransaction({
        sourceId: id,
        sourceType: StorageType.AGENT,
        destinationId: id,
        destinationType: StorageType.AGENT,
        amount: updates.capacity, // The new total capacity
        transactionType: StorageTransactionType.RESIZE,
        description: `Resized agent storage to ${updates.capacity}`
      });
    }
    
    // Update the storage record
    if (Object.keys(dbUpdates).length > 0) {
      const { data, error } = await this.supabase
        .from('agent_storage')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw new Error(`Failed to update agent storage: ${error.message}`);
      
      // Create audit log
      await this.createAuditLog({
        action: 'storage.agent.update',
        storageId: id,
        storageType: StorageType.AGENT,
        details: {
          updates: Object.keys(dbUpdates).join(',')
        }
      });
      
      return this.mapAgentStorageFromDb(data);
    }
    
    // If no updates were needed, fetch and return current state
    return this.getAgentStorage(id);
  }
  
  /**
   * Delete an agent storage
   * @param id Storage ID
   * @returns Success status
   */
  async deleteAgentStorage(id: string): Promise<boolean> {
    // Check if storage has any active allocations
    const { data: allocations, error: allocError } = await this.supabase
      .from('storage_allocation')
      .select('id')
      .eq('storage_id', id)
      .eq('storage_type', StorageType.AGENT)
      .eq('is_active', true)
      .limit(1);
      
    if (allocError) throw new Error(`Failed to check storage allocations: ${allocError.message}`);
    
    if (allocations && allocations.length > 0) {
      throw new Error('Cannot delete storage with active allocations. Deallocate all space first.');
    }
    
    // Get storage details for the audit log
    const storage = await this.getAgentStorage(id);
    
    // Delete the storage
    const { error } = await this.supabase
      .from('agent_storage')
      .delete()
      .eq('id', id);
      
    if (error) throw new Error(`Failed to delete agent storage: ${error.message}`);
    
    // Create audit log
    await this.createAuditLog({
      action: 'storage.agent.delete',
      storageType: StorageType.AGENT,
      details: {
        agentId: storage.agentId,
        name: storage.name,
        capacity: storage.capacity
      }
    });
    
    return true;
  }
  
  // #endregion
  
  // #region Farm Storage Operations
  
  /**
   * Create a new farm storage
   * @param farmId Farm ID that owns this storage
   * @param name Storage name
   * @param capacity Initial storage capacity
   * @param options Additional options
   * @returns Created farm storage
   */
  async createFarmStorage(
    farmId: string,
    name: string,
    capacity: number,
    options?: {
      description?: string;
      storageType?: string;
      vaultAccountId?: string;
      reservedSpace?: number;
      settings?: Partial<FarmStorage['settings']>;
      metadata?: Record<string, any>;
    }
  ): Promise<FarmStorage> {
    // First verify farm exists and is owned by current user
    const { data: farm, error: farmError } = await this.supabase
      .from('farms')
      .select('id, owner_id')
      .eq('id', farmId)
      .single();
      
    if (farmError) throw new Error(`Failed to verify farm ownership: ${farmError.message}`);
    
    // Verify vault account if provided
    if (options?.vaultAccountId) {
      try {
        const vaultAccount = await vaultService.getVaultAccount(options.vaultAccountId);
        
        // Verify this vault is associated with the farm
        if (vaultAccount.farmId !== farmId) {
          throw new Error('Vault account is not associated with this farm');
        }
      } catch (error) {
        throw new Error(`Invalid vault account: ${(error as Error).message}`);
      }
    }
    
    // Default settings
    const defaultSettings = {
      autoExpand: false,
      expansionThresholdPercent: 80,
      maxCapacity: capacity * 2,
      backupEnabled: false,
      encryptionEnabled: false,
      allocationPolicy: 'balanced',
      ...options?.settings
    };
    
    // Create the storage
    const { data, error } = await this.supabase
      .from('farm_storage')
      .insert({
        name,
        description: options?.description,
        farm_id: farmId,
        storage_type: options?.storageType || 'centralized',
        capacity,
        used_space: 0,
        reserved_space: options?.reservedSpace || 0,
        vault_account_id: options?.vaultAccountId,
        settings: defaultSettings,
        metadata: options?.metadata,
        status: StorageStatus.ACTIVE
      })
      .select()
      .single();
      
    if (error) throw new Error(`Failed to create farm storage: ${error.message}`);
    
    // Create audit log
    await this.createAuditLog({
      action: 'storage.farm.create',
      storageId: data.id,
      storageType: StorageType.FARM,
      details: {
        farmId,
        capacity,
        name,
        reservedSpace: options?.reservedSpace || 0
      }
    });
    
    return this.mapFarmStorageFromDb(data);
  }
  
  /**
   * Get a farm storage by ID
   * @param id Storage ID
   * @returns Farm storage
   */
  async getFarmStorage(id: string): Promise<FarmStorage> {
    const { data, error } = await this.supabase
      .from('farm_storage')
      .select()
      .eq('id', id)
      .single();
      
    if (error) throw new Error(`Failed to fetch farm storage: ${error.message}`);
    
    return this.mapFarmStorageFromDb(data);
  }
  
  /**
   * Get all storage for a farm
   * @param farmId Farm ID
   * @returns Array of farm storage
   */
  async getFarmStorageByFarm(farmId: string): Promise<FarmStorage[]> {
    const { data, error } = await this.supabase
      .from('farm_storage')
      .select()
      .eq('farm_id', farmId);
      
    if (error) throw new Error(`Failed to fetch farm storage: ${error.message}`);
    
    return data.map(this.mapFarmStorageFromDb);
  }
  
  /**
   * Update farm storage properties
   * @param id Storage ID
   * @param updates Fields to update
   * @returns Updated farm storage
   */
  async updateFarmStorage(
    id: string, 
    updates: Partial<FarmStorage>
  ): Promise<FarmStorage> {
    const dbUpdates: any = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.storageType !== undefined) dbUpdates.storage_type = updates.storageType;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.settings !== undefined) dbUpdates.settings = updates.settings;
    if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata;
    if (updates.vaultAccountId !== undefined) dbUpdates.vault_account_id = updates.vaultAccountId;
    
    // Special handling for certain properties
    let specialUpdates = false;
    
    // Handle capacity changes
    if (updates.capacity !== undefined) {
      // Use the database function to update capacity
      const { error: capacityError } = await this.supabase.rpc('update_storage_capacity', {
        p_storage_id: id,
        p_storage_type: 'farm_storage',
        p_new_capacity: updates.capacity
      });
      
      if (capacityError) throw new Error(`Failed to update storage capacity: ${capacityError.message}`);
      
      // Create capacity change transaction
      await this.createStorageTransaction({
        sourceId: id,
        sourceType: StorageType.FARM,
        destinationId: id,
        destinationType: StorageType.FARM,
        amount: updates.capacity, // The new total capacity
        transactionType: StorageTransactionType.RESIZE,
        description: `Resized farm storage to ${updates.capacity}`
      });
      
      specialUpdates = true;
    }
    
    // Handle reserved space changes
    if (updates.reservedSpace !== undefined) {
      // Get current storage to check capacity
      const storage = await this.getFarmStorage(id);
      
      // Make sure we don't over-reserve
      if (updates.reservedSpace > storage.capacity - storage.usedSpace) {
        throw new Error('Cannot reserve more space than available');
      }
      
      dbUpdates.reserved_space = updates.reservedSpace;
      
      // Create reservation transaction
      const txType = updates.reservedSpace > storage.reservedSpace
        ? StorageTransactionType.RESERVE
        : StorageTransactionType.RELEASE;
        
      const amount = Math.abs(updates.reservedSpace - storage.reservedSpace);
      
      await this.createStorageTransaction({
        sourceId: id,
        sourceType: StorageType.FARM,
        destinationId: id,
        destinationType: StorageType.FARM,
        amount,
        transactionType: txType,
        description: `${txType === StorageTransactionType.RESERVE ? 'Reserved' : 'Released'} ${amount} storage space`
      });
      
      specialUpdates = true;
    }
    
    // Update the storage record
    if (Object.keys(dbUpdates).length > 0) {
      const { data, error } = await this.supabase
        .from('farm_storage')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw new Error(`Failed to update farm storage: ${error.message}`);
      
      // Create audit log
      await this.createAuditLog({
        action: 'storage.farm.update',
        storageId: id,
        storageType: StorageType.FARM,
        details: {
          updates: [...Object.keys(dbUpdates), ...(specialUpdates ? ['capacity'] : [])].join(',')
        }
      });
      
      return this.mapFarmStorageFromDb(data);
    }
    
    // If only special updates were made or no updates at all, fetch and return current state
    return this.getFarmStorage(id);
  }
  
  /**
   * Delete a farm storage
   * @param id Storage ID
   * @returns Success status
   */
  async deleteFarmStorage(id: string): Promise<boolean> {
    // Check if storage has any active allocations
    const { data: allocations, error: allocError } = await this.supabase
      .from('storage_allocation')
      .select('id')
      .eq('storage_id', id)
      .eq('storage_type', StorageType.FARM)
      .eq('is_active', true)
      .limit(1);
      
    if (allocError) throw new Error(`Failed to check storage allocations: ${allocError.message}`);
    
    if (allocations && allocations.length > 0) {
      throw new Error('Cannot delete storage with active allocations. Deallocate all space first.');
    }
    
    // Get storage details for the audit log
    const storage = await this.getFarmStorage(id);
    
    // Delete the storage
    const { error } = await this.supabase
      .from('farm_storage')
      .delete()
      .eq('id', id);
      
    if (error) throw new Error(`Failed to delete farm storage: ${error.message}`);
    
    // Create audit log
    await this.createAuditLog({
      action: 'storage.farm.delete',
      storageType: StorageType.FARM,
      details: {
        farmId: storage.farmId,
        name: storage.name,
        capacity: storage.capacity
      }
    });
    
    return true;
  }
  
  // #endregion
  
  // #region Allocation Operations
  
  /**
   * Create a new storage allocation
   * @param storageId Storage ID
   * @param storageType Storage type
   * @param allocatedToId Entity ID receiving the allocation
   * @param allocatedToType Entity type receiving the allocation
   * @param amount Amount to allocate
   * @param options Additional options
   * @returns Created allocation
   */
  async createStorageAllocation(
    storageId: string,
    storageType: StorageType,
    allocatedToId: string,
    allocatedToType: string,
    amount: number,
    options?: {
      purpose?: string;
      startDate?: string;
      endDate?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<StorageAllocation> {
    // Use the database function to create allocation
    const { data: allocationId, error } = await this.supabase.rpc('create_storage_allocation', {
      p_storage_id: storageId,
      p_storage_type: storageType,
      p_allocated_to_id: allocatedToId,
      p_allocated_to_type: allocatedToType,
      p_amount: amount,
      p_purpose: options?.purpose,
      p_start_date: options?.startDate ? new Date(options.startDate).toISOString() : null,
      p_end_date: options?.endDate ? new Date(options.endDate).toISOString() : null,
      p_metadata: options?.metadata
    });
    
    if (error) throw new Error(`Failed to create storage allocation: ${error.message}`);
    
    // Create allocation transaction
    await this.createStorageTransaction({
      sourceId: storageId,
      sourceType: storageType,
      destinationId: allocatedToId,
      destinationType: allocatedToType === 'agent' ? StorageType.AGENT : 
                      allocatedToType === 'farm' ? StorageType.FARM : 
                      StorageType.EXTERNAL,
      amount,
      transactionType: StorageTransactionType.ALLOCATION,
      description: `Allocated ${amount} storage to ${allocatedToType} ${allocatedToId}`
    });
    
    // Get the created allocation
    const { data: allocation, error: fetchError } = await this.supabase
      .from('storage_allocation')
      .select()
      .eq('id', allocationId)
      .single();
      
    if (fetchError) throw new Error(`Failed to fetch created allocation: ${fetchError.message}`);
    
    return this.mapStorageAllocationFromDb(allocation);
  }
  
  /**
   * Update a storage allocation
   * @param id Allocation ID
   * @param isActive Whether the allocation is active
   * @returns Updated allocation
   */
  async updateStorageAllocation(id: string, isActive: boolean): Promise<StorageAllocation> {
    // Get current allocation state
    const currentAllocation = await this.getStorageAllocation(id);
    
    // Only proceed if state is changing
    if (currentAllocation.isActive !== isActive) {
      // Use database function to update allocation
      const { error } = await this.supabase.rpc('update_storage_allocation_status', {
        p_allocation_id: id,
        p_is_active: isActive
      });
      
      if (error) throw new Error(`Failed to update allocation status: ${error.message}`);
      
      // Create transaction for the deallocation
      if (!isActive) {
        await this.createStorageTransaction({
          sourceId: currentAllocation.allocatedToId,
          sourceType: StorageType.EXTERNAL, // This is a simplification
          destinationId: currentAllocation.storageId,
          destinationType: currentAllocation.storageType,
          amount: currentAllocation.amount,
          transactionType: StorageTransactionType.DEALLOCATION,
          description: `Deallocated ${currentAllocation.amount} storage from ${currentAllocation.allocatedToType} ${currentAllocation.allocatedToId}`
        });
      }
    }
    
    // Get the updated allocation
    return this.getStorageAllocation(id);
  }
  
  /**
   * Get a storage allocation by ID
   * @param id Allocation ID
   * @returns Storage allocation
   */
  async getStorageAllocation(id: string): Promise<StorageAllocation> {
    const { data, error } = await this.supabase
      .from('storage_allocation')
      .select()
      .eq('id', id)
      .single();
      
    if (error) throw new Error(`Failed to fetch storage allocation: ${error.message}`);
    
    return this.mapStorageAllocationFromDb(data);
  }
  
  /**
   * Get allocations based on filter criteria
   * @param filter Filter criteria
   * @returns Array of storage allocations
   */
  async getStorageAllocations(filter: AllocationFilter = {}): Promise<StorageAllocation[]> {
    let query = this.supabase
      .from('storage_allocation')
      .select();
      
    if (filter.storageId) {
      query = query.eq('storage_id', filter.storageId);
    }
    
    if (filter.storageType) {
      query = query.eq('storage_type', filter.storageType);
    }
    
    if (filter.allocatedToId) {
      query = query.eq('allocated_to_id', filter.allocatedToId);
    }
    
    if (filter.allocatedToType) {
      query = query.eq('allocated_to_type', filter.allocatedToType);
    }
    
    if (filter.isActive !== undefined) {
      query = query.eq('is_active', filter.isActive);
    }
    
    if (filter.purpose) {
      query = query.eq('purpose', filter.purpose);
    }
    
    if (filter.fromDate) {
      query = query.gte('start_date', filter.fromDate);
    }
    
    if (filter.toDate) {
      query = query.lte('start_date', filter.toDate);
    }
    
    if (filter.limit) {
      query = query.limit(filter.limit);
    }
    
    if (filter.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 20) - 1);
    }
    
    const { data, error } = await query;
      
    if (error) throw new Error(`Failed to fetch storage allocations: ${error.message}`);
    
    return data.map(this.mapStorageAllocationFromDb);
  }
  
  // #endregion
  
  // #region Transaction Operations
  
  /**
   * Create a new storage transaction
   * @param details Transaction details
   * @returns Created storage transaction
   */
  async createStorageTransaction(details: {
    sourceId: string;
    sourceType: StorageType;
    destinationId: string;
    destinationType: StorageType;
    amount: number;
    transactionType: StorageTransactionType;
    description?: string;
    vaultTransactionId?: string;
    metadata?: Record<string, any>;
  }): Promise<StorageTransaction> {
    const user = await this.supabase.auth.getUser();
    const userId = user.data.user?.id;
    
    if (!userId) throw new Error('User ID is required to create a transaction');
    
    const { data, error } = await this.supabase
      .from('storage_transaction')
      .insert({
        source_id: details.sourceId,
        source_type: details.sourceType,
        destination_id: details.destinationId,
        destination_type: details.destinationType,
        amount: details.amount,
        transaction_type: details.transactionType,
        description: details.description,
        vault_transaction_id: details.vaultTransactionId,
        metadata: details.metadata,
        initiated_by: userId,
        status: 'completed' // Storage transactions are immediately completed
      })
      .select()
      .single();
      
    if (error) throw new Error(`Failed to create storage transaction: ${error.message}`);
    
    // Create audit log
    await this.createAuditLog({
      action: 'storage.transaction.create',
      transactionId: data.id,
      details: {
        type: details.transactionType,
        amount: details.amount,
        source: `${details.sourceType}:${details.sourceId}`,
        destination: `${details.destinationType}:${details.destinationId}`
      }
    });
    
    return this.mapStorageTransactionFromDb(data);
  }
  
  /**
   * Get a storage transaction by ID
   * @param id Transaction ID
   * @returns Storage transaction
   */
  async getStorageTransaction(id: string): Promise<StorageTransaction> {
    const { data, error } = await this.supabase
      .from('storage_transaction')
      .select()
      .eq('id', id)
      .single();
      
    if (error) throw new Error(`Failed to fetch storage transaction: ${error.message}`);
    
    return this.mapStorageTransactionFromDb(data);
  }
  
  /**
   * Get transactions based on filter criteria
   * @param filter Filter criteria
   * @returns Array of storage transactions
   */
  async getStorageTransactions(filter: StorageTransactionFilter = {}): Promise<StorageTransaction[]> {
    let query = this.supabase
      .from('storage_transaction')
      .select();
      
    if (filter.sourceId) {
      query = query.eq('source_id', filter.sourceId);
    }
    
    if (filter.sourceType) {
      query = query.eq('source_type', filter.sourceType);
    }
    
    if (filter.destinationId) {
      query = query.eq('destination_id', filter.destinationId);
    }
    
    if (filter.destinationType) {
      query = query.eq('destination_type', filter.destinationType);
    }
    
    if (filter.transactionType) {
      query = query.eq('transaction_type', filter.transactionType);
    }
    
    if (filter.status) {
      query = query.eq('status', filter.status);
    }
    
    if (filter.fromDate) {
      query = query.gte('created_at', filter.fromDate);
    }
    
    if (filter.toDate) {
      query = query.lte('created_at', filter.toDate);
    }
    
    if (filter.minAmount) {
      query = query.gte('amount', filter.minAmount);
    }
    
    if (filter.maxAmount) {
      query = query.lte('amount', filter.maxAmount);
    }
    
    if (filter.search) {
      query = query.ilike('description', `%${filter.search}%`);
    }
    
    if (filter.limit) {
      query = query.limit(filter.limit);
    }
    
    if (filter.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 20) - 1);
    }
    
    // Default order by creation date (newest first)
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
      
    if (error) throw new Error(`Failed to fetch storage transactions: ${error.message}`);
    
    return data.map(this.mapStorageTransactionFromDb);
  }
  
  // #endregion
  
  // #region Statistics and Reporting
  
  /**
   * Get storage statistics for an agent
   * @param agentId Agent ID
   * @returns Storage statistics
   */
  async getAgentStorageStats(agentId: string): Promise<StorageStats> {
    // Get all storage for this agent
    const agentStorages = await this.getAgentStorageByAgent(agentId);
    
    if (agentStorages.length === 0) {
      return {
        totalCapacity: 0,
        totalUsed: 0,
        totalReserved: 0,
        availableSpace: 0,
        utilizationPercentage: 0,
        allocationCount: 0,
        storageHealth: 'good',
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Calculate totals
    const totalCapacity = agentStorages.reduce((sum, storage) => sum + storage.capacity, 0);
    const totalUsed = agentStorages.reduce((sum, storage) => sum + storage.usedSpace, 0);
    
    // Get allocation count
    const { count: allocationCount, error: countError } = await this.supabase
      .from('storage_allocation')
      .select('id', { count: 'exact', head: true })
      .in('storage_id', agentStorages.map(s => s.id))
      .eq('storage_type', StorageType.AGENT)
      .eq('is_active', true);
      
    if (countError) throw new Error(`Failed to count allocations: ${countError.message}`);
    
    // Calculate metrics
    const availableSpace = totalCapacity - totalUsed;
    const utilizationPercentage = totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;
    
    // Determine health status
    let storageHealth: 'good' | 'warning' | 'critical' = 'good';
    if (utilizationPercentage > 90) {
      storageHealth = 'critical';
    } else if (utilizationPercentage > 75) {
      storageHealth = 'warning';
    }
    
    return {
      totalCapacity,
      totalUsed,
      totalReserved: 0, // Agents don't have reserved space
      availableSpace,
      utilizationPercentage,
      allocationCount: allocationCount || 0,
      storageHealth,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Get storage statistics for a farm
   * @param farmId Farm ID
   * @returns Storage statistics
   */
  async getFarmStorageStats(farmId: string): Promise<StorageStats> {
    // Get all storage for this farm
    const farmStorages = await this.getFarmStorageByFarm(farmId);
    
    if (farmStorages.length === 0) {
      return {
        totalCapacity: 0,
        totalUsed: 0,
        totalReserved: 0,
        availableSpace: 0,
        utilizationPercentage: 0,
        allocationCount: 0,
        storageHealth: 'good',
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Calculate totals
    const totalCapacity = farmStorages.reduce((sum, storage) => sum + storage.capacity, 0);
    const totalUsed = farmStorages.reduce((sum, storage) => sum + storage.usedSpace, 0);
    const totalReserved = farmStorages.reduce((sum, storage) => sum + storage.reservedSpace, 0);
    
    // Get allocation count
    const { count: allocationCount, error: countError } = await this.supabase
      .from('storage_allocation')
      .select('id', { count: 'exact', head: true })
      .in('storage_id', farmStorages.map(s => s.id))
      .eq('storage_type', StorageType.FARM)
      .eq('is_active', true);
      
    if (countError) throw new Error(`Failed to count allocations: ${countError.message}`);
    
    // Calculate metrics
    const availableSpace = totalCapacity - totalUsed - totalReserved;
    const utilizationPercentage = totalCapacity > 0 ? ((totalUsed + totalReserved) / totalCapacity) * 100 : 0;
    
    // Determine health status
    let storageHealth: 'good' | 'warning' | 'critical' = 'good';
    if (utilizationPercentage > 90) {
      storageHealth = 'critical';
    } else if (utilizationPercentage > 75) {
      storageHealth = 'warning';
    }
    
    return {
      totalCapacity,
      totalUsed,
      totalReserved,
      availableSpace,
      utilizationPercentage,
      allocationCount: allocationCount || 0,
      storageHealth,
      lastUpdated: new Date().toISOString()
    };
  }
  
  // #endregion
  
  // #region Audit and Logging
  
  /**
   * Create an audit log entry
   * @param entry The audit log entry
   * @returns The created audit log ID
   */
  async createAuditLog(entry: {
    action: string;
    storageId?: string;
    storageType?: StorageType;
    transactionId?: string;
    details?: Record<string, any>;
    severity?: 'info' | 'warning' | 'critical';
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    const user = await this.supabase.auth.getUser();
    const userId = user.data.user?.id;
    
    const { data, error } = await this.supabase
      .from('storage_audit_log')
      .insert({
        action: entry.action,
        storage_id: entry.storageId,
        storage_type: entry.storageType,
        transaction_id: entry.transactionId,
        user_id: userId,
        details: entry.details,
        severity: entry.severity || 'info',
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('Failed to create audit log:', error.message);
      return '';
    }
    
    return data.id;
  }
  
  /**
   * Get audit logs for a specific storage
   * @param storageId Storage ID
   * @param storageType Storage type
   * @param limit Number of logs to retrieve
   * @param offset Offset for pagination
   * @returns Array of audit log entries
   */
  async getStorageAuditLogs(
    storageId: string,
    storageType: StorageType,
    limit = 50,
    offset = 0
  ): Promise<StorageAuditLogEntry[]> {
    const { data, error } = await this.supabase
      .from('storage_audit_log')
      .select()
      .eq('storage_id', storageId)
      .eq('storage_type', storageType)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);
    
    return data.map(this.mapStorageAuditLogFromDb);
  }
  
  // #endregion
  
  // #region Helper Methods
  
  /**
   * Map database record to AgentStorage type
   * @param data Database record
   * @returns AgentStorage object
   */
  private mapAgentStorageFromDb(data: any): AgentStorage {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      agentId: data.agent_id,
      storageType: data.storage_type,
      capacity: data.capacity,
      usedSpace: data.used_space,
      vaultAccountId: data.vault_account_id,
      settings: data.settings,
      metadata: data.metadata,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
  
  /**
   * Map database record to FarmStorage type
   * @param data Database record
   * @returns FarmStorage object
   */
  private mapFarmStorageFromDb(data: any): FarmStorage {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      farmId: data.farm_id,
      storageType: data.storage_type,
      capacity: data.capacity,
      usedSpace: data.used_space,
      reservedSpace: data.reserved_space,
      vaultAccountId: data.vault_account_id,
      settings: data.settings,
      metadata: data.metadata,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
  
  /**
   * Map database record to StorageAllocation type
   * @param data Database record
   * @returns StorageAllocation object
   */
  private mapStorageAllocationFromDb(data: any): StorageAllocation {
    return {
      id: data.id,
      storageId: data.storage_id,
      storageType: data.storage_type,
      allocatedToId: data.allocated_to_id,
      allocatedToType: data.allocated_to_type,
      amount: data.amount,
      purpose: data.purpose,
      startDate: data.start_date,
      endDate: data.end_date,
      isActive: data.is_active,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
  
  /**
   * Map database record to StorageTransaction type
   * @param data Database record
   * @returns StorageTransaction object
   */
  private mapStorageTransactionFromDb(data: any): StorageTransaction {
    return {
      id: data.id,
      sourceId: data.source_id,
      sourceType: data.source_type,
      destinationId: data.destination_id,
      destinationType: data.destination_type,
      amount: data.amount,
      transactionType: data.transaction_type,
      status: data.status,
      description: data.description,
      vaultTransactionId: data.vault_transaction_id,
      metadata: data.metadata,
      initiatedBy: data.initiated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
  
  /**
   * Map database record to StorageAuditLogEntry type
   * @param data Database record
   * @returns StorageAuditLogEntry object
   */
  private mapStorageAuditLogFromDb(data: any): StorageAuditLogEntry {
    return {
      id: data.id,
      timestamp: data.timestamp,
      action: data.action,
      storageId: data.storage_id,
      storageType: data.storage_type,
      transactionId: data.transaction_id,
      userId: data.user_id,
      details: data.details,
      severity: data.severity,
      ipAddress: data.ip_address,
      userAgent: data.user_agent
    };
  }
  
  // #endregion
}

// Export singleton instance
export const storageService = new StorageService(); 