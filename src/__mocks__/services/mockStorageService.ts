import { v4 as uuidv4 } from 'uuid';
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
import { CONFIG, simulateLatency, simulateFailure } from '@/config/mockConfig';
import {
  mockAgentStorages,
  mockFarmStorages,
  mockStorageAllocations,
  mockStorageTransactions,
  mockStorageAuditLogs,
  createMockAgentStorage,
  createMockFarmStorage,
  createMockStorageAllocation,
  createMockStorageTransaction,
  createMockStorageAuditLog,
  MockAgentStorage,
  MockFarmStorage,
  MockStorageAllocation,
  MockStorageTransaction,
  MockStorageAuditLog
} from '../data/storageData';
import { mockAgents } from '../data/agentData';
import { mockFarms } from '../data/farmData';

// Helper to convert from mock data to service interface
const mapAgentStorageFromDb = (data: MockAgentStorage): AgentStorage => {
  return {
    id: data.id,
    name: data.name,
    description: data.description || undefined,
    agentId: data.agent_id,
    storageType: data.storage_type,
    capacity: data.capacity,
    usedSpace: data.used_space,
    vaultAccountId: data.vault_account_id || undefined,
    settings: data.settings,
    metadata: data.metadata || undefined,
    status: data.status as StorageStatus | string,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

const mapFarmStorageFromDb = (data: MockFarmStorage): FarmStorage => {
  return {
    id: data.id,
    name: data.name,
    description: data.description || undefined,
    farmId: data.farm_id,
    storageType: data.storage_type,
    capacity: data.capacity,
    usedSpace: data.used_space,
    reservedSpace: data.reserved_space,
    vaultAccountId: data.vault_account_id || undefined,
    settings: data.settings,
    metadata: data.metadata || undefined,
    status: data.status as StorageStatus | string,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

const mapStorageAllocationFromDb = (data: MockStorageAllocation): StorageAllocation => {
  return {
    id: data.id,
    storageId: data.storage_id,
    storageType: data.storage_type as StorageType,
    allocatedToId: data.allocated_to_id,
    allocatedToType: data.allocated_to_type,
    amount: data.amount,
    purpose: data.purpose || undefined,
    startDate: data.start_date,
    endDate: data.end_date || undefined,
    isActive: data.is_active,
    metadata: data.metadata || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

const mapStorageTransactionFromDb = (data: MockStorageTransaction): StorageTransaction => {
  return {
    id: data.id,
    sourceId: data.source_id,
    sourceType: data.source_type as StorageType,
    destinationId: data.destination_id,
    destinationType: data.destination_type as StorageType,
    amount: data.amount,
    transactionType: data.transaction_type as StorageTransactionType,
    status: data.status as 'pending' | 'completed' | 'failed' | 'cancelled',
    description: data.description || undefined,
    vaultTransactionId: data.vault_transaction_id || undefined,
    metadata: data.metadata || undefined,
    initiatedBy: data.initiated_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

const mapStorageAuditLogFromDb = (data: MockStorageAuditLog): StorageAuditLogEntry => {
  return {
    id: data.id,
    timestamp: data.timestamp,
    action: data.action,
    storageId: data.storage_id || undefined,
    storageType: data.storage_type as StorageType | undefined,
    transactionId: data.transaction_id || undefined,
    userId: data.user_id || undefined,
    details: data.details || undefined,
    severity: data.severity as 'info' | 'warning' | 'critical',
    ipAddress: data.ip_address || undefined,
    userAgent: data.user_agent || undefined
  };
};

/**
 * Mock Storage Service
 * Simulates the storage service for development and testing
 */
export class MockStorageService {
  private isServerSide: boolean;
  
  constructor(isServerSide = false) {
    this.isServerSide = isServerSide;
  }
  
  /**
   * Get a singleton instance of the StorageService
   * @param isServerSide Whether this service is being used on the server side
   * @returns StorageService instance
   */
  static getInstance(isServerSide = false): MockStorageService {
    return new MockStorageService(isServerSide);
  }
  
  // #region Agent Storage Operations
  
  /**
   * Create a new agent storage
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
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to create agent storage');
    
    // Verify agent exists
    const agent = mockAgents.find(a => a.id === agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Create the storage
    const newStorage = createMockAgentStorage(
      agentId,
      name,
      capacity,
      {
        description: options?.description,
        storageType: options?.storageType,
        vaultAccountId: options?.vaultAccountId,
        settings: options?.settings || undefined,
        metadata: options?.metadata || undefined
      }
    );
    
    return mapAgentStorageFromDb(newStorage);
  }
  
  /**
   * Get an agent storage by ID
   */
  async getAgentStorage(id: string): Promise<AgentStorage> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to fetch agent storage');
    
    const storage = mockAgentStorages.find(s => s.id === id);
    if (!storage) {
      throw new Error(`Agent storage with ID ${id} not found`);
    }
    
    return mapAgentStorageFromDb(storage);
  }
  
  /**
   * Get all storage for an agent
   */
  async getAgentStorageByAgent(agentId: string): Promise<AgentStorage[]> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to fetch agent storage');
    
    const storages = mockAgentStorages.filter(s => s.agent_id === agentId);
    return storages.map(mapAgentStorageFromDb);
  }
  
  /**
   * Update agent storage properties
   */
  async updateAgentStorage(
    id: string, 
    updates: Partial<AgentStorage>
  ): Promise<AgentStorage> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to update agent storage');
    
    const storage = mockAgentStorages.find(s => s.id === id);
    if (!storage) {
      throw new Error(`Agent storage with ID ${id} not found`);
    }
    
    const now = new Date().toISOString();
    
    // Update basic properties
    if (updates.name !== undefined) storage.name = updates.name;
    if (updates.description !== undefined) storage.description = updates.description || null;
    if (updates.storageType !== undefined) storage.storage_type = updates.storageType;
    if (updates.status !== undefined) storage.status = updates.status;
    if (updates.settings !== undefined) storage.settings = updates.settings;
    if (updates.metadata !== undefined) storage.metadata = updates.metadata || null;
    if (updates.vaultAccountId !== undefined) storage.vault_account_id = updates.vaultAccountId || null;
    
    // Handle capacity changes
    if (updates.capacity !== undefined) {
      const oldCapacity = storage.capacity;
      storage.capacity = updates.capacity;
      
      // Create transaction record for resize
      createMockStorageTransaction({
        sourceId: id,
        sourceType: StorageType.AGENT,
        destinationId: id,
        destinationType: StorageType.AGENT,
        amount: updates.capacity, // The new total capacity
        transactionType: StorageTransactionType.RESIZE,
        description: `Resized agent storage to ${updates.capacity}`
      });
      
      // Create audit log
      createMockStorageAuditLog({
        action: 'storage.agent.resize',
        storageId: id,
        storageType: StorageType.AGENT,
        details: {
          oldCapacity,
          newCapacity: updates.capacity
        }
      });
    }
    
    storage.updated_at = now;
    
    // Create audit log for the update
    createMockStorageAuditLog({
      action: 'storage.agent.update',
      storageId: id,
      storageType: StorageType.AGENT,
      details: {
        updates: Object.keys(updates).join(',')
      }
    });
    
    return mapAgentStorageFromDb(storage);
  }
  
  /**
   * Delete an agent storage
   */
  async deleteAgentStorage(id: string): Promise<boolean> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to delete agent storage');
    
    const storageIndex = mockAgentStorages.findIndex(s => s.id === id);
    if (storageIndex === -1) {
      throw new Error(`Agent storage with ID ${id} not found`);
    }
    
    // Check for active allocations
    const hasActiveAllocations = mockStorageAllocations.some(
      a => a.storage_id === id && a.storage_type === StorageType.AGENT && a.is_active
    );
    
    if (hasActiveAllocations) {
      throw new Error('Cannot delete storage with active allocations. Deallocate all space first.');
    }
    
    // Get storage for audit log
    const storage = mockAgentStorages[storageIndex];
    
    // Remove the storage
    mockAgentStorages.splice(storageIndex, 1);
    
    // Create audit log
    createMockStorageAuditLog({
      action: 'storage.agent.delete',
      storageType: StorageType.AGENT,
      details: {
        agentId: storage.agent_id,
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
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to create farm storage');
    
    // Verify farm exists
    const farm = mockFarms.find(f => f.id === farmId);
    if (!farm) {
      throw new Error(`Farm with ID ${farmId} not found`);
    }
    
    // Create the storage
    const newStorage = createMockFarmStorage(
      farmId,
      name,
      capacity,
      {
        description: options?.description,
        storageType: options?.storageType,
        vaultAccountId: options?.vaultAccountId,
        reservedSpace: options?.reservedSpace,
        settings: options?.settings || undefined,
        metadata: options?.metadata || undefined
      }
    );
    
    return mapFarmStorageFromDb(newStorage);
  }
  
  /**
   * Get a farm storage by ID
   */
  async getFarmStorage(id: string): Promise<FarmStorage> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to fetch farm storage');
    
    const storage = mockFarmStorages.find(s => s.id === id);
    if (!storage) {
      throw new Error(`Farm storage with ID ${id} not found`);
    }
    
    return mapFarmStorageFromDb(storage);
  }
  
  /**
   * Get all storage for a farm
   */
  async getFarmStorageByFarm(farmId: string): Promise<FarmStorage[]> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to fetch farm storage');
    
    const storages = mockFarmStorages.filter(s => s.farm_id === farmId);
    return storages.map(mapFarmStorageFromDb);
  }
  
  /**
   * Update farm storage properties
   */
  async updateFarmStorage(
    id: string, 
    updates: Partial<FarmStorage>
  ): Promise<FarmStorage> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to update farm storage');
    
    const storage = mockFarmStorages.find(s => s.id === id);
    if (!storage) {
      throw new Error(`Farm storage with ID ${id} not found`);
    }
    
    const now = new Date().toISOString();
    
    // Update basic properties
    if (updates.name !== undefined) storage.name = updates.name;
    if (updates.description !== undefined) storage.description = updates.description || null;
    if (updates.storageType !== undefined) storage.storage_type = updates.storageType;
    if (updates.status !== undefined) storage.status = updates.status;
    if (updates.settings !== undefined) storage.settings = updates.settings;
    if (updates.metadata !== undefined) storage.metadata = updates.metadata || null;
    if (updates.vaultAccountId !== undefined) storage.vault_account_id = updates.vaultAccountId || null;
    
    // Handle capacity changes
    if (updates.capacity !== undefined) {
      const oldCapacity = storage.capacity;
      storage.capacity = updates.capacity;
      
      // Create transaction record for resize
      createMockStorageTransaction({
        sourceId: id,
        sourceType: StorageType.FARM,
        destinationId: id,
        destinationType: StorageType.FARM,
        amount: updates.capacity, // The new total capacity
        transactionType: StorageTransactionType.RESIZE,
        description: `Resized farm storage to ${updates.capacity}`
      });
      
      // Create audit log
      createMockStorageAuditLog({
        action: 'storage.farm.resize',
        storageId: id,
        storageType: StorageType.FARM,
        details: {
          oldCapacity,
          newCapacity: updates.capacity
        }
      });
    }
    
    // Handle reserved space changes
    if (updates.reservedSpace !== undefined) {
      // Make sure we don't over-reserve
      if (updates.reservedSpace > storage.capacity - storage.used_space) {
        throw new Error('Cannot reserve more space than available');
      }
      
      const oldReserved = storage.reserved_space;
      storage.reserved_space = updates.reservedSpace;
      
      // Create reservation transaction
      const txType = updates.reservedSpace > oldReserved
        ? StorageTransactionType.RESERVE
        : StorageTransactionType.RELEASE;
      
      const amount = Math.abs(updates.reservedSpace - oldReserved);
      
      createMockStorageTransaction({
        sourceId: id,
        sourceType: StorageType.FARM,
        destinationId: id,
        destinationType: StorageType.FARM,
        amount,
        transactionType: txType,
        description: `${txType === StorageTransactionType.RESERVE ? 'Reserved' : 'Released'} ${amount} storage space`
      });
    }
    
    storage.updated_at = now;
    
    // Create audit log for the update
    createMockStorageAuditLog({
      action: 'storage.farm.update',
      storageId: id,
      storageType: StorageType.FARM,
      details: {
        updates: Object.keys(updates).join(',')
      }
    });
    
    return mapFarmStorageFromDb(storage);
  }
  
  /**
   * Delete a farm storage
   */
  async deleteFarmStorage(id: string): Promise<boolean> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to delete farm storage');
    
    const storageIndex = mockFarmStorages.findIndex(s => s.id === id);
    if (storageIndex === -1) {
      throw new Error(`Farm storage with ID ${id} not found`);
    }
    
    // Check for active allocations
    const hasActiveAllocations = mockStorageAllocations.some(
      a => a.storage_id === id && a.storage_type === StorageType.FARM && a.is_active
    );
    
    if (hasActiveAllocations) {
      throw new Error('Cannot delete storage with active allocations. Deallocate all space first.');
    }
    
    // Get storage for audit log
    const storage = mockFarmStorages[storageIndex];
    
    // Remove the storage
    mockFarmStorages.splice(storageIndex, 1);
    
    // Create audit log
    createMockStorageAuditLog({
      action: 'storage.farm.delete',
      storageType: StorageType.FARM,
      details: {
        farmId: storage.farm_id,
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
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to create storage allocation');
    
    // Verify storage exists and has enough space
    if (storageType === StorageType.AGENT) {
      const storage = mockAgentStorages.find(s => s.id === storageId);
      if (!storage) {
        throw new Error(`Agent storage with ID ${storageId} not found`);
      }
      
      if (storage.used_space + amount > storage.capacity) {
        throw new Error('Insufficient storage space available');
      }
    } else if (storageType === StorageType.FARM) {
      const storage = mockFarmStorages.find(s => s.id === storageId);
      if (!storage) {
        throw new Error(`Farm storage with ID ${storageId} not found`);
      }
      
      if (storage.used_space + amount > storage.capacity - storage.reserved_space) {
        throw new Error('Insufficient storage space available');
      }
    } else {
      throw new Error(`Invalid storage type: ${storageType}`);
    }
    
    // Create the allocation
    const allocation = createMockStorageAllocation(
      storageId,
      storageType,
      allocatedToId,
      allocatedToType,
      amount,
      {
        purpose: options?.purpose,
        startDate: options?.startDate,
        endDate: options?.endDate,
        metadata: options?.metadata
      }
    );
    
    return mapStorageAllocationFromDb(allocation);
  }
  
  /**
   * Update a storage allocation
   */
  async updateStorageAllocation(id: string, isActive: boolean): Promise<StorageAllocation> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to update allocation status');
    
    const allocation = mockStorageAllocations.find(a => a.id === id);
    if (!allocation) {
      throw new Error(`Allocation with ID ${id} not found`);
    }
    
    // Only proceed if state is changing
    if (allocation.is_active === isActive) {
      return mapStorageAllocationFromDb(allocation);
    }
    
    // Update allocation status
    const oldStatus = allocation.is_active;
    allocation.is_active = isActive;
    allocation.updated_at = new Date().toISOString();
    
    // Update storage used space
    if (oldStatus && !isActive) {
      // Deactivating - free up space
      if (allocation.storage_type === 'agent_storage') {
        const storage = mockAgentStorages.find(s => s.id === allocation.storage_id);
        if (storage) {
          storage.used_space -= allocation.amount;
          storage.updated_at = new Date().toISOString();
        }
      } else if (allocation.storage_type === 'farm_storage') {
        const storage = mockFarmStorages.find(s => s.id === allocation.storage_id);
        if (storage) {
          storage.used_space -= allocation.amount;
          storage.updated_at = new Date().toISOString();
        }
      }
      
      // Create transaction for deallocation
      createMockStorageTransaction({
        sourceId: allocation.allocated_to_id,
        sourceType: StorageType.EXTERNAL, // Simplification
        destinationId: allocation.storage_id,
        destinationType: allocation.storage_type as StorageType,
        amount: allocation.amount,
        transactionType: StorageTransactionType.DEALLOCATION,
        description: `Deallocated ${allocation.amount} storage from ${allocation.allocated_to_type} ${allocation.allocated_to_id}`
      });
    } else if (!oldStatus && isActive) {
      // Activating - use space
      if (allocation.storage_type === 'agent_storage') {
        const storage = mockAgentStorages.find(s => s.id === allocation.storage_id);
        if (storage) {
          // Check if there's enough space
          if (storage.used_space + allocation.amount > storage.capacity) {
            throw new Error('Insufficient storage space available');
          }
          storage.used_space += allocation.amount;
          storage.updated_at = new Date().toISOString();
        }
      } else if (allocation.storage_type === 'farm_storage') {
        const storage = mockFarmStorages.find(s => s.id === allocation.storage_id);
        if (storage) {
          // Check if there's enough space
          if (storage.used_space + allocation.amount > storage.capacity - storage.reserved_space) {
            throw new Error('Insufficient storage space available');
          }
          storage.used_space += allocation.amount;
          storage.updated_at = new Date().toISOString();
        }
      }
      
      // Create transaction for reallocation
      createMockStorageTransaction({
        sourceId: allocation.storage_id,
        sourceType: allocation.storage_type as StorageType,
        destinationId: allocation.allocated_to_id,
        destinationType: StorageType.EXTERNAL, // Simplification
        amount: allocation.amount,
        transactionType: StorageTransactionType.ALLOCATION,
        description: `Reallocated ${allocation.amount} storage to ${allocation.allocated_to_type} ${allocation.allocated_to_id}`
      });
    }
    
    return mapStorageAllocationFromDb(allocation);
  }
  
  /**
   * Get a storage allocation by ID
   */
  async getStorageAllocation(id: string): Promise<StorageAllocation> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to fetch storage allocation');
    
    const allocation = mockStorageAllocations.find(a => a.id === id);
    if (!allocation) {
      throw new Error(`Allocation with ID ${id} not found`);
    }
    
    return mapStorageAllocationFromDb(allocation);
  }
  
  /**
   * Get allocations based on filter criteria
   */
  async getStorageAllocations(filter: AllocationFilter = {}): Promise<StorageAllocation[]> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to fetch storage allocations');
    
    let filteredAllocations = [...mockStorageAllocations];
    
    // Apply filters
    if (filter.storageId) {
      filteredAllocations = filteredAllocations.filter(a => a.storage_id === filter.storageId);
    }
    
    if (filter.storageType) {
      filteredAllocations = filteredAllocations.filter(a => a.storage_type === filter.storageType);
    }
    
    if (filter.allocatedToId) {
      filteredAllocations = filteredAllocations.filter(a => a.allocated_to_id === filter.allocatedToId);
    }
    
    if (filter.allocatedToType) {
      filteredAllocations = filteredAllocations.filter(a => a.allocated_to_type === filter.allocatedToType);
    }
    
    if (filter.isActive !== undefined) {
      filteredAllocations = filteredAllocations.filter(a => a.is_active === filter.isActive);
    }
    
    if (filter.purpose) {
      filteredAllocations = filteredAllocations.filter(a => a.purpose === filter.purpose);
    }
    
    if (filter.fromDate) {
      filteredAllocations = filteredAllocations.filter(a => new Date(a.start_date) >= new Date(filter.fromDate!));
    }
    
    if (filter.toDate) {
      filteredAllocations = filteredAllocations.filter(a => new Date(a.start_date) <= new Date(filter.toDate!));
    }
    
    // Apply pagination
    if (filter.offset) {
      filteredAllocations = filteredAllocations.slice(filter.offset);
    }
    
    if (filter.limit) {
      filteredAllocations = filteredAllocations.slice(0, filter.limit);
    }
    
    return filteredAllocations.map(mapStorageAllocationFromDb);
  }
  
  // #endregion
  
  // #region Transaction Operations
  
  /**
   * Create a storage transaction
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
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to create storage transaction');
    
    const transaction = createMockStorageTransaction({
      sourceId: details.sourceId,
      sourceType: details.sourceType,
      destinationId: details.destinationId,
      destinationType: details.destinationType,
      amount: details.amount,
      transactionType: details.transactionType,
      description: details.description,
      vaultTransactionId: details.vaultTransactionId,
      metadata: details.metadata,
      initiatedBy: 'system'
    });
    
    return mapStorageTransactionFromDb(transaction);
  }
  
  /**
   * Get a storage transaction by ID
   */
  async getStorageTransaction(id: string): Promise<StorageTransaction> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to fetch storage transaction');
    
    const transaction = mockStorageTransactions.find(t => t.id === id);
    if (!transaction) {
      throw new Error(`Transaction with ID ${id} not found`);
    }
    
    return mapStorageTransactionFromDb(transaction);
  }
  
  /**
   * Get transactions based on filter criteria
   */
  async getStorageTransactions(filter: StorageTransactionFilter = {}): Promise<StorageTransaction[]> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to fetch storage transactions');
    
    let filteredTransactions = [...mockStorageTransactions];
    
    // Apply filters
    if (filter.sourceId) {
      filteredTransactions = filteredTransactions.filter(t => t.source_id === filter.sourceId);
    }
    
    if (filter.sourceType) {
      filteredTransactions = filteredTransactions.filter(t => t.source_type === filter.sourceType);
    }
    
    if (filter.destinationId) {
      filteredTransactions = filteredTransactions.filter(t => t.destination_id === filter.destinationId);
    }
    
    if (filter.destinationType) {
      filteredTransactions = filteredTransactions.filter(t => t.destination_type === filter.destinationType);
    }
    
    if (filter.transactionType) {
      filteredTransactions = filteredTransactions.filter(t => t.transaction_type === filter.transactionType);
    }
    
    if (filter.status) {
      filteredTransactions = filteredTransactions.filter(t => t.status === filter.status);
    }
    
    if (filter.fromDate) {
      filteredTransactions = filteredTransactions.filter(t => new Date(t.created_at) >= new Date(filter.fromDate!));
    }
    
    if (filter.toDate) {
      filteredTransactions = filteredTransactions.filter(t => new Date(t.created_at) <= new Date(filter.toDate!));
    }
    
    if (filter.minAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter(t => t.amount >= filter.minAmount!);
    }
    
    if (filter.maxAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter(t => t.amount <= filter.maxAmount!);
    }
    
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      filteredTransactions = filteredTransactions.filter(t => 
        (t.description && t.description.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply pagination
    if (filter.offset) {
      filteredTransactions = filteredTransactions.slice(filter.offset);
    }
    
    if (filter.limit) {
      filteredTransactions = filteredTransactions.slice(0, filter.limit);
    }
    
    return filteredTransactions.map(mapStorageTransactionFromDb);
  }
  
  // #endregion
  
  // #region Stats and Health Checks
  
  /**
   * Get agent storage statistics
   */
  async getAgentStorageStats(agentId: string): Promise<StorageStats> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to get agent storage stats');
    
    const storages = mockAgentStorages.filter(s => s.agent_id === agentId);
    
    if (storages.length === 0) {
      throw new Error(`No storage found for agent ${agentId}`);
    }
    
    const totalCapacity = storages.reduce((sum, s) => sum + s.capacity, 0);
    const totalUsed = storages.reduce((sum, s) => sum + s.used_space, 0);
    
    // Count allocations for this agent's storage
    const allocationCount = mockStorageAllocations.filter(
      a => storages.some(s => s.id === a.storage_id) && a.is_active
    ).length;
    
    const utilizationPercentage = totalCapacity > 0 
      ? (totalUsed / totalCapacity) * 100 
      : 0;
    
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
      availableSpace: totalCapacity - totalUsed,
      utilizationPercentage,
      allocationCount,
      storageHealth,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Get farm storage statistics
   */
  async getFarmStorageStats(farmId: string): Promise<StorageStats> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to get farm storage stats');
    
    const storages = mockFarmStorages.filter(s => s.farm_id === farmId);
    
    if (storages.length === 0) {
      throw new Error(`No storage found for farm ${farmId}`);
    }
    
    const totalCapacity = storages.reduce((sum, s) => sum + s.capacity, 0);
    const totalUsed = storages.reduce((sum, s) => sum + s.used_space, 0);
    const totalReserved = storages.reduce((sum, s) => sum + s.reserved_space, 0);
    
    // Count allocations for this farm's storage
    const allocationCount = mockStorageAllocations.filter(
      a => storages.some(s => s.id === a.storage_id) && a.is_active
    ).length;
    
    const utilizationPercentage = totalCapacity > 0 
      ? (totalUsed / totalCapacity) * 100 
      : 0;
    
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
      availableSpace: totalCapacity - totalUsed - totalReserved,
      utilizationPercentage,
      allocationCount,
      storageHealth,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Create an audit log entry
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
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to create audit log');
    
    const logEntry = createMockStorageAuditLog({
      action: entry.action,
      storageId: entry.storageId,
      storageType: entry.storageType,
      transactionId: entry.transactionId,
      details: entry.details,
      severity: entry.severity,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent
    });
    
    return logEntry.id;
  }
  
  /**
   * Get storage audit logs
   */
  async getStorageAuditLogs(
    storageId: string,
    storageType: StorageType,
    limit = 50,
    offset = 0
  ): Promise<StorageAuditLogEntry[]> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to fetch audit logs');
    
    let logs = mockStorageAuditLogs.filter(
      log => log.storage_id === storageId && log.storage_type === storageType
    );
    
    // Sort by timestamp, newest first
    logs = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Apply pagination
    logs = logs.slice(offset, offset + limit);
    
    return logs.map(mapStorageAuditLogFromDb);
  }
  
  /**
   * Run health check on agent storage
   */
  async runAgentStorageHealthCheck(id: string): Promise<{
    status: 'good' | 'warning' | 'critical';
    details: {
      consistencyCheck: boolean;
      performanceIssues: boolean;
      encryptionStatus: boolean;
      backupStatus: boolean;
      utilizationStatus: 'good' | 'warning' | 'critical';
      recentErrors: number;
      recommendations: string[];
    };
  }> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to run health check');
    
    const storage = mockAgentStorages.find(s => s.id === id);
    if (!storage) {
      throw new Error(`Agent storage with ID ${id} not found`);
    }
    
    // Generate a realistic health report
    const utilizationPercent = (storage.used_space / storage.capacity) * 100;
    let utilizationStatus: 'good' | 'warning' | 'critical' = 'good';
    
    if (utilizationPercent > 90) {
      utilizationStatus = 'critical';
    } else if (utilizationPercent > 75) {
      utilizationStatus = 'warning';
    }
    
    // Get settings
    const encryptionEnabled = storage.settings.encryptionEnabled || false;
    const backupEnabled = storage.settings.backupEnabled || false;
    
    // Count recent errors
    const recentErrors = mockStorageAuditLogs.filter(
      log => log.storage_id === id && 
      log.severity === 'critical' && 
      new Date(log.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days
    ).length;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (utilizationStatus === 'critical') {
      recommendations.push('Expand storage capacity as soon as possible.');
    } else if (utilizationStatus === 'warning') {
      recommendations.push('Consider expanding storage capacity soon.');
    }
    
    if (!encryptionEnabled) {
      recommendations.push('Enable encryption for better security.');
    }
    
    if (!backupEnabled) {
      recommendations.push('Enable regular backups to prevent data loss.');
    }
    
    if (storage.status !== StorageStatus.ACTIVE) {
      recommendations.push(`Resolve issues with storage status: ${storage.status}`);
    }
    
    // Determine overall status
    let status: 'good' | 'warning' | 'critical';
    
    if (utilizationStatus === 'critical' || recentErrors > 3 || storage.status === StorageStatus.MAINTENANCE) {
      status = 'critical';
    } else if (utilizationStatus === 'warning' || recentErrors > 0 || !encryptionEnabled || !backupEnabled) {
      status = 'warning';
    } else {
      status = 'good';
    }
    
    // Create an audit log entry for the health check
    createMockStorageAuditLog({
      action: 'storage.health.check',
      storageId: id,
      storageType: StorageType.AGENT,
      details: {
        status,
        utilizationPercent,
        recentErrors
      },
      severity: 'info'
    });
    
    return {
      status,
      details: {
        consistencyCheck: true,
        performanceIssues: recentErrors > 0,
        encryptionStatus: encryptionEnabled,
        backupStatus: backupEnabled,
        utilizationStatus,
        recentErrors,
        recommendations
      }
    };
  }
  
  /**
   * Run health check on farm storage
   */
  async runFarmStorageHealthCheck(id: string): Promise<{
    status: 'good' | 'warning' | 'critical';
    details: {
      consistencyCheck: boolean;
      performanceIssues: boolean;
      encryptionStatus: boolean;
      backupStatus: boolean;
      utilizationStatus: 'good' | 'warning' | 'critical';
      reservationStatus: 'good' | 'warning' | 'critical';
      recentErrors: number;
      recommendations: string[];
    };
  }> {
    await simulateLatency('storage');
    simulateFailure('storage', 'Failed to run health check');
    
    const storage = mockFarmStorages.find(s => s.id === id);
    if (!storage) {
      throw new Error(`Farm storage with ID ${id} not found`);
    }
    
    // Generate a realistic health report
    const utilizationPercent = (storage.used_space / storage.capacity) * 100;
    let utilizationStatus: 'good' | 'warning' | 'critical' = 'good';
    
    if (utilizationPercent > 90) {
      utilizationStatus = 'critical';
    } else if (utilizationPercent > 75) {
      utilizationStatus = 'warning';
    }
    
    // Reservation status
    const reservationPercent = (storage.reserved_space / storage.capacity) * 100;
    let reservationStatus: 'good' | 'warning' | 'critical' = 'good';
    
    if (reservationPercent > 50) {
      reservationStatus = 'critical';
    } else if (reservationPercent > 30) {
      reservationStatus = 'warning';
    }
    
    // Get settings
    const encryptionEnabled = storage.settings.encryptionEnabled || false;
    const backupEnabled = storage.settings.backupEnabled || false;
    
    // Count recent errors
    const recentErrors = mockStorageAuditLogs.filter(
      log => log.storage_id === id && 
      log.severity === 'critical' && 
      new Date(log.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days
    ).length;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (utilizationStatus === 'critical') {
      recommendations.push('Expand storage capacity as soon as possible.');
    } else if (utilizationStatus === 'warning') {
      recommendations.push('Consider expanding storage capacity soon.');
    }
    
    if (reservationStatus === 'critical') {
      recommendations.push('High reservation percentage may limit efficient space allocation. Consider reducing reservations.');
    }
    
    if (!encryptionEnabled) {
      recommendations.push('Enable encryption for better security.');
    }
    
    if (!backupEnabled) {
      recommendations.push('Enable regular backups to prevent data loss.');
    }
    
    if (storage.status !== StorageStatus.ACTIVE) {
      recommendations.push(`Resolve issues with storage status: ${storage.status}`);
    }
    
    // Determine overall status
    let status: 'good' | 'warning' | 'critical';
    
    if (utilizationStatus === 'critical' || reservationStatus === 'critical' || recentErrors > 3 || storage.status === StorageStatus.MAINTENANCE) {
      status = 'critical';
    } else if (utilizationStatus === 'warning' || reservationStatus === 'warning' || recentErrors > 0 || !encryptionEnabled || !backupEnabled) {
      status = 'warning';
    } else {
      status = 'good';
    }
    
    // Create an audit log entry for the health check
    createMockStorageAuditLog({
      action: 'storage.health.check',
      storageId: id,
      storageType: StorageType.FARM,
      details: {
        status,
        utilizationPercent,
        reservationPercent,
        recentErrors
      },
      severity: 'info'
    });
    
    return {
      status,
      details: {
        consistencyCheck: true,
        performanceIssues: recentErrors > 0,
        encryptionStatus: encryptionEnabled,
        backupStatus: backupEnabled,
        utilizationStatus,
        reservationStatus,
        recentErrors,
        recommendations
      }
    };
  }
}

// Export a singleton instance for easy access
export const mockStorageService = new MockStorageService(); 