export enum VaultAccountType {
  TRADING = 'trading',
  RESERVE = 'reserve',
  SETTLEMENT = 'settlement',
  STAKING = 'staking',
  YIELD = 'yield'
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  ALLOCATION = 'allocation',
  FEE = 'fee',
  INTEREST = 'interest',
  REWARD = 'reward'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface VaultMaster {
  id: string;
  name: string;
  description?: string;
  totalBalance: number;
  allocatedBalance: number;
  reserveBalance: number;
  highRiskExposure: number;
  securityScore: number;
  status: 'active' | 'frozen' | 'closed';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultAccount {
  id: string;
  masterId: string;
  name: string;
  type: VaultAccountType;
  balance: number;
  lockedAmount: number;
  currency: string;
  riskLevel: 'low' | 'medium' | 'high';
  address?: string;
  farmId?: string;
  agentId?: string;
  securityLevel: 'standard' | 'enhanced' | 'maximum';
  isActive: boolean;
  settings: {
    withdrawalLimit: number;
    withdrawalTimelock: number;
    approvalRequired: boolean;
    twoFactorRequired: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VaultTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  sourceId: string;
  sourceType: string;
  destinationId: string;
  destinationType: string;
  status: TransactionStatus;
  fee?: number;
  feeCurrency?: string;
  hash?: string;
  reference?: string;
  description?: string;
  network?: string;
  confirmations?: number;
  approvalsRequired: number;
  approvalsCurrent: number;
  approverIds: string[];
  metadata?: Record<string, any>;
  initiatedBy: string;
  approvedBy?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
}

export interface VaultBalance {
  accountId: string;
  total: number;
  available: number;
  locked: number;
  pending: number;
  currency: string;
  lastUpdated: string;
  historicalData?: {
    timestamp: string;
    balance: number;
  }[];
}

export interface TransactionFilter {
  accountId?: string;
  types?: TransactionType[];
  statuses?: TransactionStatus[];
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SecurityPolicy {
  id: string;
  accountId: string;
  withdrawalRules: {
    limits: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    whitelistedAddresses: string[];
    requireApprovalThreshold: number;
    cooldownPeriod: number;
  };
  accessRules: {
    ipWhitelist: string[];
    requiredAuthMethods: string[];
    sessionTimeout: number;
    inactivityLockout: boolean;
  };
  alertRules: {
    unusualActivityThreshold: number;
    largeTransferThreshold: number;
    newDeviceNotification: boolean;
    failedLoginThreshold: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  accountId?: string;
  transactionId?: string;
  details?: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
} 