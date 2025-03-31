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

export interface VaultAccount {
  id: string;
  name: string;
  type: VaultAccountType;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  address?: string; // Blockchain address if applicable
  apiKeys?: {
    key: string;
    name: string;
    permissions: string[];
    createdAt: string;
  }[];
  riskScore: number; // 0-100 scale
  allocations: {
    strategyId: string;
    percentage: number;
    amount: number;
  }[];
  securityLevel: 'standard' | 'enhanced' | 'maximum';
  accessRules: {
    whitelistedIps?: string[];
    twoFactorRequired: boolean;
    withdrawalLimit: number;
    withdrawalTimelock: number; // hours
    approvalRequired: boolean;
  };
  metadata?: Record<string, any>;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  timestamp: string;
  description?: string;
  fee?: number;
  hash?: string; // Transaction hash if blockchain transaction
  reference?: string;
  metadata?: Record<string, any>;
  relatedTransactionId?: string;
  initiatedBy: string; // User ID or system
  approvedBy?: string; // User ID if approval required
  riskAssessment?: {
    score: number; // 0-100
    flags: string[];
    isAutomated: boolean;
  };
}

export interface TransactionFilter {
  accountId?: string;
  types?: TransactionType[];
  statuses?: TransactionStatus[];
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string; // Search in description, reference, etc.
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

export interface AllocationPlan {
  id: string;
  name: string;
  accountId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  allocations: {
    strategyId: string;
    targetPercentage: number;
    currentPercentage: number;
    targetAmount: number;
    currentAmount: number;
  }[];
  rebalancingRules: {
    threshold: number; // Percentage deviation to trigger rebalance
    schedule?: string; // Cron expression for scheduled rebalancing
    maxFrequency?: number; // Max number of rebalances in time period
    timeUnit?: 'day' | 'week' | 'month';
    isAutomatic: boolean;
  };
  lastRebalanced?: string;
  nextScheduledRebalance?: string;
}

export interface SecurityPolicy {
  id: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;
  withdrawalPolicy: {
    limits: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    whitelistedAddresses: {
      address: string;
      label: string;
      limit?: number;
    }[];
    requireApprovalThreshold: number;
    cooldownPeriod: number; // hours
    notificationSettings: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  accessControl: {
    ipWhitelist: string[];
    requiredAuthMethods: ('password' | 'totp' | 'hardware_key')[];
    sessionTimeout: number; // minutes
    inactivityLockout: boolean;
  };
  alertRules: {
    unusualActivityThreshold: number;
    largeTransferThreshold: number;
    newDeviceNotification: boolean;
    failedLoginThreshold: number;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  userId: string;
  ipAddress: string;
  userAgent?: string;
  accountId?: string;
  transactionId?: string;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
} 