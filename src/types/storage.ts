export enum StorageType {
  AGENT = 'agent_storage',
  FARM = 'farm_storage',
  EXTERNAL = 'external'
}

export enum StorageTransactionType {
  ALLOCATION = 'allocation',
  DEALLOCATION = 'deallocation',
  TRANSFER = 'transfer',
  RESIZE = 'resize',
  RESERVE = 'reserve',
  RELEASE = 'release'
}

export enum StorageStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  FULL = 'full',
  MAINTENANCE = 'maintenance'
}

export interface AgentStorage {
  id: string;
  name: string;
  description?: string;
  agentId: string;
  storageType: string;
  capacity: number;
  usedSpace: number;
  vaultAccountId?: string;
  settings: {
    autoExpand?: boolean;
    expansionThresholdPercent?: number;
    maxCapacity?: number;
    backupEnabled?: boolean;
    encryptionEnabled?: boolean;
  };
  metadata?: Record<string, any>;
  status: StorageStatus | string;
  createdAt: string;
  updatedAt: string;
}

export interface FarmStorage {
  id: string;
  name: string;
  description?: string;
  farmId: string;
  storageType: string;
  capacity: number;
  usedSpace: number;
  reservedSpace: number;
  vaultAccountId?: string;
  settings: {
    autoExpand?: boolean;
    expansionThresholdPercent?: number;
    maxCapacity?: number;
    backupEnabled?: boolean;
    encryptionEnabled?: boolean;
    allocationPolicy?: 'first-come' | 'priority' | 'balanced';
  };
  metadata?: Record<string, any>;
  status: StorageStatus | string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageAllocation {
  id: string;
  storageId: string;
  storageType: StorageType;
  allocatedToId: string;
  allocatedToType: string;
  amount: number;
  purpose?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface StorageTransaction {
  id: string;
  sourceId: string;
  sourceType: StorageType;
  destinationId: string;
  destinationType: StorageType;
  amount: number;
  transactionType: StorageTransactionType;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  vaultTransactionId?: string;
  metadata?: Record<string, any>;
  initiatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageAuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  storageId?: string;
  storageType?: StorageType;
  transactionId?: string;
  userId?: string;
  details?: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
  ipAddress?: string;
  userAgent?: string;
}

export interface StorageStats {
  totalCapacity: number;
  totalUsed: number;
  totalReserved: number;
  availableSpace: number;
  utilizationPercentage: number;
  allocationCount: number;
  storageHealth: 'good' | 'warning' | 'critical';
  lastUpdated: string;
}

export interface StorageFilter {
  agentId?: string;
  farmId?: string;
  storageType?: StorageType;
  status?: StorageStatus | string;
  minCapacity?: number;
  maxCapacity?: number;
  minUtilization?: number;
  maxUtilization?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AllocationFilter {
  storageId?: string;
  storageType?: StorageType;
  allocatedToId?: string;
  allocatedToType?: string;
  isActive?: boolean;
  purpose?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface StorageTransactionFilter {
  sourceId?: string;
  sourceType?: StorageType;
  destinationId?: string;
  destinationType?: StorageType;
  transactionType?: StorageTransactionType;
  status?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  limit?: number;
  offset?: number;
} 