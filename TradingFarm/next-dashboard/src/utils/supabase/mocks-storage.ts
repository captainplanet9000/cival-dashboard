/**
 * Mock Storage System Data
 * Provides simulated data for storage management features in the Trading Farm
 */

import { v4 as uuidv4 } from 'uuid';

// Storage Status and Type enums (mimicking the ones in @/types/storage)
export enum StorageStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  ERROR = 'error'
}

export enum StorageType {
  AGENT = 'agent',
  FARM = 'farm',
  EXTERNAL = 'external'
}

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

// Initial mock data
export const mockAgentStorages: MockAgentStorage[] = [
  // TrendBot storage (agent-1)
  {
    id: 'agent-storage-1',
    name: 'TrendBot Primary Storage',
    description: 'Main storage for TrendBot trading data and models',
    agent_id: 'agent-1',
    storage_type: 'high-performance',
    capacity: 1024 * 1024 * 1024 * 2, // 2GB
    used_space: 1024 * 1024 * 512, // 512MB
    vault_account_id: 'vault-account-3',
    settings: {
      ...getDefaultAgentStorageSettings(),
      autoExpand: true,
      expansionThresholdPercent: 85
    },
    metadata: {
      lastBackupDate: '2025-03-25T12:00:00Z',
      storageClass: 'premium',
      dataRetentionDays: 90
    },
    status: StorageStatus.ACTIVE,
    created_at: '2025-02-15T10:00:00Z',
    updated_at: '2025-04-01T09:30:00Z'
  },
  // ArbitrageBot storage (agent-2)
  {
    id: 'agent-storage-2',
    name: 'ArbitrageBot Primary Storage',
    description: 'Main storage for ArbitrageBot trading data and models',
    agent_id: 'agent-2',
    storage_type: 'standard',
    capacity: 1024 * 1024 * 1024 * 1, // 1GB
    used_space: 1024 * 1024 * 300, // 300MB
    vault_account_id: 'vault-account-4',
    settings: getDefaultAgentStorageSettings(),
    metadata: {
      lastBackupDate: '2025-03-28T08:00:00Z',
      storageClass: 'standard',
      dataRetentionDays: 60
    },
    status: StorageStatus.ACTIVE,
    created_at: '2025-02-18T14:30:00Z',
    updated_at: '2025-04-01T10:15:00Z'
  },
  // MomentumMaster storage (agent-3)
  {
    id: 'agent-storage-3',
    name: 'MomentumMaster Primary Storage',
    description: 'Main storage for MomentumMaster trading data and models',
    agent_id: 'agent-3',
    storage_type: 'high-performance',
    capacity: 1024 * 1024 * 1024 * 3, // 3GB
    used_space: 1024 * 1024 * 1024 * 1.8, // 1.8GB
    vault_account_id: 'vault-account-5',
    settings: {
      ...getDefaultAgentStorageSettings(),
      autoExpand: true,
      expansionThresholdPercent: 75,
      backupEnabled: true
    },
    metadata: {
      lastBackupDate: '2025-03-31T16:00:00Z',
      storageClass: 'premium',
      dataRetentionDays: 120
    },
    status: StorageStatus.ACTIVE,
    created_at: '2025-02-20T11:45:00Z',
    updated_at: '2025-04-01T14:20:00Z'
  },
  // ElizaStrategist storage (eliza-1)
  {
    id: 'agent-storage-4',
    name: 'ElizaStrategist Primary Storage',
    description: 'High-capacity storage for ElizaOS agent knowledge base and models',
    agent_id: 'eliza-1',
    storage_type: 'high-performance',
    capacity: 1024 * 1024 * 1024 * 5, // 5GB
    used_space: 1024 * 1024 * 1024 * 2.7, // 2.7GB
    vault_account_id: 'vault-account-6',
    settings: {
      ...getDefaultAgentStorageSettings(),
      autoExpand: true,
      expansionThresholdPercent: 70,
      backupEnabled: true,
      encryptionEnabled: true,
      maxCapacity: 1024 * 1024 * 1024 * 20 // 20GB
    },
    metadata: {
      lastBackupDate: '2025-04-01T00:00:00Z',
      storageClass: 'premium-ai',
      dataRetentionDays: 180,
      encryptionLevel: 'AES-256'
    },
    status: StorageStatus.ACTIVE,
    created_at: '2025-03-01T09:00:00Z',
    updated_at: '2025-04-01T08:45:00Z'
  },
  // MarketMaker storage (agent-4)
  {
    id: 'agent-storage-5',
    name: 'MarketMaker Primary Storage',
    description: 'Fast storage for MarketMaker orderbook and trade data',
    agent_id: 'agent-4',
    storage_type: 'high-performance',
    capacity: 1024 * 1024 * 1024 * 2, // 2GB
    used_space: 1024 * 1024 * 800, // 800MB
    vault_account_id: 'vault-account-7',
    settings: {
      ...getDefaultAgentStorageSettings(),
      expansionThresholdPercent: 90,
      backupEnabled: true
    },
    metadata: {
      lastBackupDate: '2025-03-30T12:00:00Z',
      storageClass: 'low-latency',
      dataRetentionDays: 30
    },
    status: StorageStatus.ACTIVE,
    created_at: '2025-03-05T15:30:00Z',
    updated_at: '2025-04-01T11:10:00Z'
  }
];

export const mockFarmStorages: MockFarmStorage[] = [
  // Farm 1 storage
  {
    id: 'farm-storage-1',
    name: 'Primary Farm Storage',
    description: 'Main storage pool for Strategy Farm 1',
    farm_id: 'farm-1',
    storage_type: 'distributed',
    capacity: 1024 * 1024 * 1024 * 10, // 10GB
    used_space: 1024 * 1024 * 1024 * 5.5, // 5.5GB
    reserved_space: 1024 * 1024 * 1024 * 1, // 1GB reserved
    vault_account_id: 'vault-account-1',
    settings: {
      ...getDefaultFarmStorageSettings(),
      autoExpand: true,
      backupEnabled: true,
      allocationPolicy: 'priority-based'
    },
    metadata: {
      lastBackupDate: '2025-04-01T02:00:00Z',
      redundancyLevel: 'high',
      dataRetentionDays: 120,
      priorityAllocations: ['agent-1', 'eliza-1']
    },
    status: StorageStatus.ACTIVE,
    created_at: '2025-02-01T08:00:00Z',
    updated_at: '2025-04-01T07:00:00Z'
  },
  // Farm 2 storage
  {
    id: 'farm-storage-2',
    name: 'Primary Farm Storage',
    description: 'Main storage pool for Strategy Farm 2',
    farm_id: 'farm-2',
    storage_type: 'distributed',
    capacity: 1024 * 1024 * 1024 * 15, // 15GB
    used_space: 1024 * 1024 * 1024 * 8.2, // 8.2GB
    reserved_space: 1024 * 1024 * 1024 * 2, // 2GB reserved
    vault_account_id: 'vault-account-2',
    settings: {
      ...getDefaultFarmStorageSettings(),
      autoExpand: true,
      backupEnabled: true,
      encryptionEnabled: true,
      allocationPolicy: 'balanced'
    },
    metadata: {
      lastBackupDate: '2025-04-01T04:00:00Z',
      redundancyLevel: 'high',
      dataRetentionDays: 180,
      encryptionLevel: 'AES-256'
    },
    status: StorageStatus.ACTIVE,
    created_at: '2025-02-10T10:00:00Z',
    updated_at: '2025-04-01T06:30:00Z'
  },
  // Archive storage for Farm 1
  {
    id: 'farm-storage-3',
    name: 'Archive Storage',
    description: 'Long-term storage for historical data and model versions',
    farm_id: 'farm-1',
    storage_type: 'archival',
    capacity: 1024 * 1024 * 1024 * 20, // 20GB
    used_space: 1024 * 1024 * 1024 * 12.5, // 12.5GB
    reserved_space: 0, // No reserved space for archive
    vault_account_id: 'vault-account-8',
    settings: {
      ...getDefaultFarmStorageSettings(),
      autoExpand: false,
      backupEnabled: true,
      encryptionEnabled: true,
      compressionEnabled: true,
      allocationPolicy: 'on-demand'
    },
    metadata: {
      lastBackupDate: '2025-03-25T00:00:00Z',
      redundancyLevel: 'medium',
      dataRetentionDays: 365,
      compressionRatio: 0.6,
      encryptionLevel: 'AES-256'
    },
    status: StorageStatus.ACTIVE,
    created_at: '2025-02-15T14:00:00Z',
    updated_at: '2025-03-25T01:00:00Z'
  }
];

export const mockStorageAllocations: MockStorageAllocation[] = [
  // Farm 1 to TrendBot allocation
  {
    id: 'allocation-1',
    storage_id: 'farm-storage-1',
    storage_type: StorageType.FARM,
    allocated_to_id: 'agent-1',
    allocated_to_type: 'agent',
    amount: 1024 * 1024 * 1024 * 0.5, // 500MB
    purpose: 'Strategy data storage',
    start_date: '2025-02-15T10:00:00Z',
    end_date: null,
    is_active: true,
    metadata: {
      priority: 'high',
      autoRenew: true
    },
    created_at: '2025-02-15T10:00:00Z',
    updated_at: '2025-02-15T10:00:00Z'
  },
  // Farm 1 to ElizaStrategist allocation
  {
    id: 'allocation-2',
    storage_id: 'farm-storage-1',
    storage_type: StorageType.FARM,
    allocated_to_id: 'eliza-1',
    allocated_to_type: 'agent',
    amount: 1024 * 1024 * 1024 * 1, // 1GB
    purpose: 'AI model and knowledge base storage',
    start_date: '2025-03-01T09:00:00Z',
    end_date: null,
    is_active: true,
    metadata: {
      priority: 'critical',
      autoRenew: true,
      minimumIOPS: 5000
    },
    created_at: '2025-03-01T09:00:00Z',
    updated_at: '2025-03-01T09:00:00Z'
  },
  // Farm 2 to MarketMaker allocation
  {
    id: 'allocation-3',
    storage_id: 'farm-storage-2',
    storage_type: StorageType.FARM,
    allocated_to_id: 'agent-4',
    allocated_to_type: 'agent',
    amount: 1024 * 1024 * 1024 * 0.8, // 800MB
    purpose: 'Order book and trade data storage',
    start_date: '2025-03-05T15:30:00Z',
    end_date: null,
    is_active: true,
    metadata: {
      priority: 'high',
      autoRenew: true,
      minimumIOPS: 10000,
      latencyRequirement: 'ultra-low'
    },
    created_at: '2025-03-05T15:30:00Z',
    updated_at: '2025-03-05T15:30:00Z'
  }
];

export const mockStorageTransactions: MockStorageTransaction[] = [
  // Initial allocation transaction for TrendBot
  {
    id: 'transaction-1',
    source_id: 'farm-storage-1',
    source_type: StorageType.FARM,
    destination_id: 'agent-storage-1',
    destination_type: StorageType.AGENT,
    amount: 1024 * 1024 * 1024 * 0.5, // 500MB
    transaction_type: 'allocation',
    status: 'completed',
    description: 'Initial storage allocation for TrendBot',
    vault_transaction_id: 'vault-tx-1',
    metadata: {
      authorization: 'auto',
      allocationId: 'allocation-1'
    },
    initiated_by: 'system',
    created_at: '2025-02-15T10:00:00Z',
    updated_at: '2025-02-15T10:00:00Z'
  },
  // Initial allocation transaction for ElizaStrategist
  {
    id: 'transaction-2',
    source_id: 'farm-storage-1',
    source_type: StorageType.FARM,
    destination_id: 'agent-storage-4',
    destination_type: StorageType.AGENT,
    amount: 1024 * 1024 * 1024 * 1, // 1GB
    transaction_type: 'allocation',
    status: 'completed',
    description: 'Initial storage allocation for ElizaStrategist',
    vault_transaction_id: 'vault-tx-2',
    metadata: {
      authorization: 'auto',
      allocationId: 'allocation-2'
    },
    initiated_by: 'system',
    created_at: '2025-03-01T09:00:00Z',
    updated_at: '2025-03-01T09:00:00Z'
  },
  // Storage expansion for ElizaStrategist
  {
    id: 'transaction-3',
    source_id: 'farm-storage-1',
    source_type: StorageType.FARM,
    destination_id: 'agent-storage-4',
    destination_type: StorageType.AGENT,
    amount: 1024 * 1024 * 1024 * 0.5, // 500MB
    transaction_type: 'expansion',
    status: 'completed',
    description: 'Storage expansion for ElizaStrategist - reaching 70% threshold',
    vault_transaction_id: 'vault-tx-3',
    metadata: {
      authorization: 'auto',
      thresholdReached: '70%',
      autoExpanded: true
    },
    initiated_by: 'system',
    created_at: '2025-03-15T14:22:00Z',
    updated_at: '2025-03-15T14:22:00Z'
  },
  // Storage allocation for MarketMaker
  {
    id: 'transaction-4',
    source_id: 'farm-storage-2',
    source_type: StorageType.FARM,
    destination_id: 'agent-storage-5',
    destination_type: StorageType.AGENT,
    amount: 1024 * 1024 * 1024 * 0.8, // 800MB
    transaction_type: 'allocation',
    status: 'completed',
    description: 'Initial storage allocation for MarketMaker',
    vault_transaction_id: 'vault-tx-4',
    metadata: {
      authorization: 'auto',
      allocationId: 'allocation-3'
    },
    initiated_by: 'system',
    created_at: '2025-03-05T15:30:00Z',
    updated_at: '2025-03-05T15:30:00Z'
  },
  // Backup transaction for Farm 1
  {
    id: 'transaction-5',
    source_id: 'farm-storage-1',
    source_type: StorageType.FARM,
    destination_id: 'external-backup-1',
    destination_type: StorageType.EXTERNAL,
    amount: 1024 * 1024 * 1024 * 5.5, // 5.5GB
    transaction_type: 'backup',
    status: 'completed',
    description: 'Scheduled weekly backup of Farm 1 storage',
    vault_transaction_id: 'vault-tx-5',
    metadata: {
      backupType: 'full',
      compressionRatio: 0.65,
      encryptionEnabled: true,
      retentionPeriod: '4 weeks'
    },
    initiated_by: 'system',
    created_at: '2025-04-01T02:00:00Z',
    updated_at: '2025-04-01T02:30:00Z'
  }
];

export const mockStorageAuditLogs: MockStorageAuditLog[] = [
  // Storage creation log for Farm 1
  {
    id: 'audit-1',
    timestamp: '2025-02-01T08:00:00Z',
    action: 'storage_created',
    storage_id: 'farm-storage-1',
    storage_type: StorageType.FARM,
    transaction_id: null,
    user_id: 'mock-user-1',
    details: {
      capacity: 1024 * 1024 * 1024 * 10,
      settings: getDefaultFarmStorageSettings()
    },
    severity: 'info',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  // Storage allocation log for TrendBot
  {
    id: 'audit-2',
    timestamp: '2025-02-15T10:00:00Z',
    action: 'allocation_created',
    storage_id: 'farm-storage-1',
    storage_type: StorageType.FARM,
    transaction_id: 'transaction-1',
    user_id: 'mock-user-1',
    details: {
      allocated_to: 'agent-1',
      amount: 1024 * 1024 * 1024 * 0.5,
      allocation_id: 'allocation-1'
    },
    severity: 'info',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  // Storage expansion log for ElizaStrategist
  {
    id: 'audit-3',
    timestamp: '2025-03-15T14:22:00Z',
    action: 'storage_expanded',
    storage_id: 'agent-storage-4',
    storage_type: StorageType.AGENT,
    transaction_id: 'transaction-3',
    user_id: null,
    details: {
      previous_capacity: 1024 * 1024 * 1024 * 4.5,
      new_capacity: 1024 * 1024 * 1024 * 5,
      expansion_amount: 1024 * 1024 * 1024 * 0.5,
      auto_expanded: true,
      threshold_reached: '70%'
    },
    severity: 'info',
    ip_address: null,
    user_agent: null
  },
  // Backup log for Farm 1
  {
    id: 'audit-4',
    timestamp: '2025-04-01T02:00:00Z',
    action: 'backup_created',
    storage_id: 'farm-storage-1',
    storage_type: StorageType.FARM,
    transaction_id: 'transaction-5',
    user_id: null,
    details: {
      backup_type: 'full',
      destination: 'external-backup-1',
      size: 1024 * 1024 * 1024 * 5.5,
      duration_seconds: 1800,
      compression_ratio: 0.65
    },
    severity: 'info',
    ip_address: null,
    user_agent: null
  },
  // Storage health warning for MomentumMaster
  {
    id: 'audit-5',
    timestamp: '2025-03-31T09:15:00Z',
    action: 'health_warning',
    storage_id: 'agent-storage-3',
    storage_type: StorageType.AGENT,
    transaction_id: null,
    user_id: null,
    details: {
      warning_type: 'capacity',
      capacity_used_percent: 85,
      recommendation: 'Consider increasing storage capacity or cleaning up unused data.'
    },
    severity: 'warning',
    ip_address: null,
    user_agent: null
  }
];

// Helper functions
export function getAgentStorageById(storageId: string) {
  return mockAgentStorages.find(storage => storage.id === storageId) || null;
}

export function getFarmStorageById(storageId: string) {
  return mockFarmStorages.find(storage => storage.id === storageId) || null;
}

export function getAgentStoragesByAgentId(agentId: string) {
  return mockAgentStorages.filter(storage => storage.agent_id === agentId);
}

export function getFarmStoragesByFarmId(farmId: string) {
  return mockFarmStorages.filter(storage => storage.farm_id === farmId);
}

export function getStorageAllocationsByStorageId(storageId: string, storageType: StorageType) {
  return mockStorageAllocations.filter(
    allocation => allocation.storage_id === storageId && allocation.storage_type === storageType
  );
}

export function getStorageAllocationsByAllocatedTo(allocatedToId: string, allocatedToType: string) {
  return mockStorageAllocations.filter(
    allocation => allocation.allocated_to_id === allocatedToId && allocation.allocated_to_type === allocatedToType
  );
}

export function getStorageTransactionsByStorageId(storageId: string, storageType: StorageType) {
  return mockStorageTransactions.filter(
    transaction => 
      (transaction.source_id === storageId && transaction.source_type === storageType) ||
      (transaction.destination_id === storageId && transaction.destination_type === storageType)
  );
}

export function getStorageAuditLogsByStorageId(storageId: string, storageType: StorageType) {
  return mockStorageAuditLogs.filter(
    log => log.storage_id === storageId && log.storage_type === storageType
  );
}

export function getStorageHealthStatus(storageId: string, storageType: StorageType) {
  let storage;
  
  if (storageType === StorageType.AGENT) {
    storage = getAgentStorageById(storageId);
  } else if (storageType === StorageType.FARM) {
    storage = getFarmStorageById(storageId);
  }
  
  if (!storage) return null;
  
  const usedPercent = (storage.used_space / storage.capacity) * 100;
  
  let healthStatus = {
    status: 'healthy',
    usedSpacePercent: usedPercent,
    remainingSpace: storage.capacity - storage.used_space,
    warnings: [],
    recommendations: [],
    lastUpdated: storage.updated_at
  };
  
  // Check for capacity issues
  if (usedPercent > 90) {
    healthStatus.status = 'critical';
    healthStatus.warnings.push('Storage capacity critically low');
    healthStatus.recommendations.push('Increase storage capacity immediately or reduce storage usage');
  } else if (usedPercent > 75) {
    healthStatus.status = 'warning';
    healthStatus.warnings.push('Storage capacity running low');
    healthStatus.recommendations.push('Consider increasing storage capacity or cleaning up unused data');
  }
  
  // Check for recent errors in audit logs
  const recentErrorLogs = mockStorageAuditLogs.filter(
    log => log.storage_id === storageId && 
           log.storage_type === storageType &&
           log.severity === 'critical' &&
           new Date(log.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Within last 7 days
  );
  
  if (recentErrorLogs.length > 0) {
    healthStatus.status = 'error';
    healthStatus.warnings.push(`${recentErrorLogs.length} critical error(s) in the last 7 days`);
    healthStatus.recommendations.push('Review audit logs and resolve reported errors');
  }
  
  return healthStatus;
}
