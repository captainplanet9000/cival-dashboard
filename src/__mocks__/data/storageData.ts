import { v4 as uuidv4 } from 'uuid';
import { StorageStatus, StorageType } from '@/types/storage';

/**
 * Mock storage data for testing and development
 */

// Agent Storage
export interface MockAgentStorage {
  id: string;
  name: string;
  description: string | null;
  agent_id: string;
  storage_type: string;
  capacity: number;
  used_space: number;
  vault_account_id: string | null;
  settings: Record<string, any>;
  metadata: Record<string, any> | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// Farm Storage
export interface MockFarmStorage {
  id: string;
  name: string;
  description: string | null;
  farm_id: string;
  storage_type: string;
  capacity: number;
  used_space: number;
  reserved_space: number;
  vault_account_id: string | null;
  settings: Record<string, any>;
  metadata: Record<string, any> | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// Storage Allocation
export interface MockStorageAllocation {
  id: string;
  storage_id: string;
  storage_type: string;
  allocated_to_id: string;
  allocated_to_type: string;
  amount: number;
  purpose: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

// Storage Transaction
export interface MockStorageTransaction {
  id: string;
  source_id: string;
  source_type: string;
  destination_id: string;
  destination_type: string;
  amount: number;
  transaction_type: string;
  status: string;
  description: string | null;
  vault_transaction_id: string | null;
  metadata: Record<string, any> | null;
  initiated_by: string;
  created_at: string;
  updated_at: string;
}

// Storage Audit Log
export interface MockStorageAuditLog {
  id: string;
  timestamp: string;
  action: string;
  storage_id: string | null;
  storage_type: string | null;
  transaction_id: string | null;
  user_id: string | null;
  details: Record<string, any> | null;
  severity: string;
  ip_address: string | null;
  user_agent: string | null;
}

// Initial arrays to store mock data
export const mockAgentStorages: MockAgentStorage[] = [];
export const mockFarmStorages: MockFarmStorage[] = [];
export const mockStorageAllocations: MockStorageAllocation[] = [];
export const mockStorageTransactions: MockStorageTransaction[] = [];
export const mockStorageAuditLogs: MockStorageAuditLog[] = [];

// Helper to generate default storage settings
export const getDefaultAgentStorageSettings = () => ({
  autoExpand: false,
  expansionThresholdPercent: 80,
  maxCapacity: 1024 * 1024 * 1024 * 10, // 10GB
  backupEnabled: false,
  encryptionEnabled: false
});

export const getDefaultFarmStorageSettings = () => ({
  autoExpand: false,
  expansionThresholdPercent: 80,
  maxCapacity: 1024 * 1024 * 1024 * 50, // 50GB
  backupEnabled: false,
  encryptionEnabled: false,
  allocationPolicy: 'balanced'
});

// Create an agent storage
export const createMockAgentStorage = (
  agentId: string,
  name: string,
  capacity: number = 1024 * 1024 * 1024, // 1GB
  options?: {
    description?: string;
    storageType?: string;
    vaultAccountId?: string;
    settings?: Record<string, any>;
    metadata?: Record<string, any>;
    status?: string;
  }
): MockAgentStorage => {
  const now = new Date().toISOString();
  
  const newStorage: MockAgentStorage = {
    id: uuidv4(),
    name,
    description: options?.description || null,
    agent_id: agentId,
    storage_type: options?.storageType || 'autonomous',
    capacity,
    used_space: 0,
    vault_account_id: options?.vaultAccountId || null,
    settings: options?.settings || getDefaultAgentStorageSettings(),
    metadata: options?.metadata || null,
    status: options?.status || StorageStatus.ACTIVE,
    created_at: now,
    updated_at: now
  };
  
  mockAgentStorages.push(newStorage);
  
  // Create an audit log entry
  createMockStorageAuditLog({
    action: 'storage.agent.create',
    storageId: newStorage.id,
    storageType: StorageType.AGENT,
    details: {
      agentId,
      capacity,
      name
    }
  });
  
  return newStorage;
};

// Create a farm storage
export const createMockFarmStorage = (
  farmId: string,
  name: string,
  capacity: number = 1024 * 1024 * 1024 * 5, // 5GB
  options?: {
    description?: string;
    storageType?: string;
    vaultAccountId?: string;
    reservedSpace?: number;
    settings?: Record<string, any>;
    metadata?: Record<string, any>;
    status?: string;
  }
): MockFarmStorage => {
  const now = new Date().toISOString();
  
  const newStorage: MockFarmStorage = {
    id: uuidv4(),
    name,
    description: options?.description || null,
    farm_id: farmId,
    storage_type: options?.storageType || 'centralized',
    capacity,
    used_space: 0,
    reserved_space: options?.reservedSpace || 0,
    vault_account_id: options?.vaultAccountId || null,
    settings: options?.settings || getDefaultFarmStorageSettings(),
    metadata: options?.metadata || null,
    status: options?.status || StorageStatus.ACTIVE,
    created_at: now,
    updated_at: now
  };
  
  mockFarmStorages.push(newStorage);
  
  // Create an audit log entry
  createMockStorageAuditLog({
    action: 'storage.farm.create',
    storageId: newStorage.id,
    storageType: StorageType.FARM,
    details: {
      farmId,
      capacity,
      name,
      reservedSpace: options?.reservedSpace || 0
    }
  });
  
  return newStorage;
};

// Create a storage allocation
export const createMockStorageAllocation = (
  storageId: string,
  storageType: StorageType,
  allocatedToId: string,
  allocatedToType: string,
  amount: number,
  options?: {
    purpose?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    metadata?: Record<string, any>;
  }
): MockStorageAllocation => {
  const now = new Date().toISOString();
  
  const newAllocation: MockStorageAllocation = {
    id: uuidv4(),
    storage_id: storageId,
    storage_type: storageType,
    allocated_to_id: allocatedToId,
    allocated_to_type: allocatedToType,
    amount,
    purpose: options?.purpose || null,
    start_date: options?.startDate || now,
    end_date: options?.endDate || null,
    is_active: options?.isActive !== undefined ? options.isActive : true,
    metadata: options?.metadata || null,
    created_at: now,
    updated_at: now
  };
  
  mockStorageAllocations.push(newAllocation);
  
  // Update used space in the storage
  if (newAllocation.is_active) {
    if (storageType === StorageType.AGENT) {
      const storage = mockAgentStorages.find(s => s.id === storageId);
      if (storage) {
        storage.used_space += amount;
        storage.updated_at = now;
      }
    } else if (storageType === StorageType.FARM) {
      const storage = mockFarmStorages.find(s => s.id === storageId);
      if (storage) {
        storage.used_space += amount;
        storage.updated_at = now;
      }
    }
  }
  
  // Create a transaction record
  createMockStorageTransaction({
    sourceId: storageId,
    sourceType: storageType,
    destinationId: allocatedToId,
    destinationType: allocatedToType === 'agent' ? StorageType.AGENT : 
                    allocatedToType === 'farm' ? StorageType.FARM : 
                    StorageType.EXTERNAL,
    amount,
    transactionType: 'allocation',
    description: `Allocated ${amount} storage to ${allocatedToType} ${allocatedToId}`
  });
  
  return newAllocation;
};

// Create a storage transaction
export const createMockStorageTransaction = (details: {
  sourceId: string;
  sourceType: StorageType;
  destinationId: string;
  destinationType: StorageType;
  amount: number;
  transactionType: string;
  description?: string;
  vaultTransactionId?: string;
  metadata?: Record<string, any>;
  initiatedBy?: string;
}): MockStorageTransaction => {
  const now = new Date().toISOString();
  
  const newTransaction: MockStorageTransaction = {
    id: uuidv4(),
    source_id: details.sourceId,
    source_type: details.sourceType,
    destination_id: details.destinationId,
    destination_type: details.destinationType,
    amount: details.amount,
    transaction_type: details.transactionType,
    status: 'completed',
    description: details.description || null,
    vault_transaction_id: details.vaultTransactionId || null,
    metadata: details.metadata || null,
    initiated_by: details.initiatedBy || 'system',
    created_at: now,
    updated_at: now
  };
  
  mockStorageTransactions.push(newTransaction);
  return newTransaction;
};

// Create a storage audit log entry
export const createMockStorageAuditLog = (entry: {
  action: string;
  storageId?: string;
  storageType?: StorageType;
  transactionId?: string;
  userId?: string;
  details?: Record<string, any>;
  severity?: 'info' | 'warning' | 'critical';
  ipAddress?: string;
  userAgent?: string;
}): MockStorageAuditLog => {
  const now = new Date().toISOString();
  
  const newLogEntry: MockStorageAuditLog = {
    id: uuidv4(),
    timestamp: now,
    action: entry.action,
    storage_id: entry.storageId || null,
    storage_type: entry.storageType || null,
    transaction_id: entry.transactionId || null,
    user_id: entry.userId || null,
    details: entry.details || null,
    severity: entry.severity || 'info',
    ip_address: entry.ipAddress || null,
    user_agent: entry.userAgent || null
  };
  
  mockStorageAuditLogs.push(newLogEntry);
  return newLogEntry;
};

// Reset all storage mock data
export const resetStorageMockData = (): void => {
  mockAgentStorages.length = 0;
  mockFarmStorages.length = 0;
  mockStorageAllocations.length = 0;
  mockStorageTransactions.length = 0;
  mockStorageAuditLogs.length = 0;
}; 