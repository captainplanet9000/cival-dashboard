import { v4 as uuidv4 } from 'uuid';
import { 
  VaultAccountType, 
  TransactionStatus, 
  TransactionType 
} from '@/types/vault';
import { DEFAULT_USER_ID } from './agentData';

/**
 * Mock vault data for testing and development
 */

// Vault Master
export interface MockVaultMaster {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  total_balance: number;
  allocated_balance: number;
  reserve_balance: number;
  high_risk_exposure: number;
  security_score: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// Vault Account
export interface MockVaultAccount {
  id: string;
  name: string;
  description: string | null;
  master_id: string;
  account_type: string;
  currency: string;
  balance: number;
  locked_amount: number;
  risk_level: string;
  address: string | null;
  farm_id: string | null;
  agent_id: string | null;
  security_level: string;
  is_active: boolean;
  settings: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

// Vault Transaction
export interface MockVaultTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  source_id: string;
  source_type: string;
  destination_id: string;
  destination_type: string;
  status: string;
  fee: number | null;
  fee_currency: string | null;
  hash: string | null;
  reference: string | null;
  description: string | null;
  network: string | null;
  confirmations: number | null;
  approvals_required: number;
  approvals_current: number | null;
  approver_ids: string[] | null;
  metadata: Record<string, any> | null;
  initiated_by: string;
  approved_by: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

// Security Policy
export interface MockSecurityPolicy {
  id: string;
  account_id: string;
  withdrawal_rules: {
    require_approval_threshold: number;
    daily_limit: number;
    monthly_limit: number;
    allowed_addresses?: string[];
    blocked_addresses?: string[];
    timelock?: number;
  };
  access_rules: {
    allowed_ip_addresses?: string[];
    allowed_countries?: string[];
    two_factor_required: boolean;
    allowed_devices?: string[];
    device_verification: boolean;
    password_required_for_high_value_tx: boolean;
  };
  alert_rules: {
    alert_on_login: boolean;
    alert_on_high_value_tx: boolean;
    alert_on_suspicious_tx: boolean;
    alert_threshold: number;
    alert_email?: string;
    alert_phone?: string;
  };
  created_at: string;
  updated_at: string;
}

// Audit Log Entry
export interface MockVaultAuditLog {
  id: string;
  timestamp: string;
  action: string;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  account_id: string | null;
  transaction_id: string | null;
  details: Record<string, any> | null;
  severity: string;
}

// Initial arrays to store mock data
export const mockVaultMasters: MockVaultMaster[] = [];
export const mockVaultAccounts: MockVaultAccount[] = [];
export const mockVaultTransactions: MockVaultTransaction[] = [];
export const mockSecurityPolicies: MockSecurityPolicy[] = [];
export const mockVaultAuditLogs: MockVaultAuditLog[] = [];

// Create a vault master
export const createMockVaultMaster = (
  name: string,
  description: string | null = null,
  ownerId: string = DEFAULT_USER_ID,
  initialBalance: number = 0
): MockVaultMaster => {
  const now = new Date().toISOString();
  
  const newVaultMaster: MockVaultMaster = {
    id: uuidv4(),
    name,
    description,
    owner_id: ownerId,
    total_balance: initialBalance,
    allocated_balance: 0,
    reserve_balance: initialBalance,
    high_risk_exposure: 0,
    security_score: 85,
    status: 'active',
    created_at: now,
    updated_at: now
  };
  
  mockVaultMasters.push(newVaultMaster);
  return newVaultMaster;
};

// Create a vault account
export const createMockVaultAccount = (
  masterId: string,
  name: string,
  type: VaultAccountType | string,
  currency: string = 'USD',
  options?: {
    farmId?: string;
    agentId?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    securityLevel?: 'standard' | 'enhanced' | 'maximum';
    address?: string;
    initialBalance?: number;
    settings?: Record<string, any>;
    metadata?: Record<string, any>;
  }
): MockVaultAccount => {
  const now = new Date().toISOString();
  
  const newVaultAccount: MockVaultAccount = {
    id: uuidv4(),
    name,
    description: null,
    master_id: masterId,
    account_type: type,
    currency,
    balance: options?.initialBalance || 0,
    locked_amount: 0,
    risk_level: options?.riskLevel || 'medium',
    address: options?.address || null,
    farm_id: options?.farmId || null,
    agent_id: options?.agentId || null,
    security_level: options?.securityLevel || 'standard',
    is_active: true,
    settings: options?.settings || {
      twoFactorRequired: false,
      withdrawalLimit: 1000,
      withdrawalTimelock: 0,
      approvalRequired: false,
      allowExternalTransfers: true
    },
    metadata: options?.metadata || null,
    created_at: now,
    updated_at: now
  };
  
  mockVaultAccounts.push(newVaultAccount);
  
  // Update master vault balance
  if (options?.initialBalance && options.initialBalance > 0) {
    const masterVault = mockVaultMasters.find(v => v.id === masterId);
    if (masterVault) {
      masterVault.total_balance += options.initialBalance;
      masterVault.reserve_balance += options.initialBalance;
      masterVault.updated_at = now;
    }
  }
  
  // Create default security policy
  createMockSecurityPolicy(newVaultAccount.id);
  
  return newVaultAccount;
};

// Create a security policy
export const createMockSecurityPolicy = (accountId: string): MockSecurityPolicy => {
  const now = new Date().toISOString();
  
  const newPolicy: MockSecurityPolicy = {
    id: uuidv4(),
    account_id: accountId,
    withdrawal_rules: {
      require_approval_threshold: 1000,
      daily_limit: 10000,
      monthly_limit: 50000,
      allowed_addresses: [],
      blocked_addresses: [],
      timelock: 0
    },
    access_rules: {
      allowed_ip_addresses: [],
      allowed_countries: [],
      two_factor_required: false,
      allowed_devices: [],
      device_verification: false,
      password_required_for_high_value_tx: true
    },
    alert_rules: {
      alert_on_login: true,
      alert_on_high_value_tx: true,
      alert_on_suspicious_tx: true,
      alert_threshold: 5000,
      alert_email: null,
      alert_phone: null
    },
    created_at: now,
    updated_at: now
  };
  
  mockSecurityPolicies.push(newPolicy);
  return newPolicy;
};

// Create a vault transaction
export const createMockVaultTransaction = (details: {
  sourceId: string;
  sourceType: string;
  destinationId: string;
  destinationType: string;
  amount: number;
  currency: string;
  type: TransactionType | string;
  description?: string;
  reference?: string;
  network?: string;
  fee?: number;
  feeCurrency?: string;
  metadata?: Record<string, any>;
  approvalsRequired?: number;
  initiatedBy?: string;
}): MockVaultTransaction => {
  const now = new Date().toISOString();
  
  const newTransaction: MockVaultTransaction = {
    id: uuidv4(),
    type: details.type,
    amount: details.amount,
    currency: details.currency,
    source_id: details.sourceId,
    source_type: details.sourceType,
    destination_id: details.destinationId,
    destination_type: details.destinationType,
    status: TransactionStatus.PENDING,
    fee: details.fee || null,
    fee_currency: details.feeCurrency || null,
    hash: null,
    reference: details.reference || null,
    description: details.description || null,
    network: details.network || null,
    confirmations: null,
    approvals_required: details.approvalsRequired || 1,
    approvals_current: 0,
    approver_ids: [],
    metadata: details.metadata || null,
    initiated_by: details.initiatedBy || DEFAULT_USER_ID,
    approved_by: null,
    created_at: now,
    completed_at: null,
    updated_at: now
  };
  
  mockVaultTransactions.push(newTransaction);
  
  // Create audit log
  createMockVaultAuditLog({
    action: 'transaction.create',
    userId: details.initiatedBy || DEFAULT_USER_ID,
    transactionId: newTransaction.id,
    details: { 
      transactionType: details.type, 
      amount: details.amount, 
      currency: details.currency 
    },
    severity: 'info'
  });
  
  return newTransaction;
};

// Update a transaction's status
export const updateMockTransactionStatus = (
  id: string,
  status: TransactionStatus | string,
  userId: string,
  note?: string
): MockVaultTransaction => {
  const transaction = mockVaultTransactions.find(t => t.id === id);
  if (!transaction) {
    throw new Error(`Transaction with ID ${id} not found`);
  }
  
  const now = new Date().toISOString();
  
  // Update transaction
  transaction.status = status;
  transaction.updated_at = now;
  
  if (status === TransactionStatus.COMPLETED) {
    transaction.approved_by = userId;
    transaction.completed_at = now;
    transaction.approvals_current = transaction.approvals_required;
    
    // Process balance changes for internal transfers
    processCompletedMockTransaction(transaction);
  }
  
  // Create audit log
  createMockVaultAuditLog({
    action: 'transaction.status_update',
    userId,
    transactionId: id,
    details: { 
      oldStatus: transaction.status, 
      newStatus: status, 
      note 
    },
    severity: 'info'
  });
  
  return transaction;
};

// Process a completed transaction, updating account balances
const processCompletedMockTransaction = (transaction: MockVaultTransaction): void => {
  // Update source account (if internal)
  if (transaction.source_type === 'vault_account') {
    const sourceAccount = mockVaultAccounts.find(a => a.id === transaction.source_id);
    if (sourceAccount) {
      sourceAccount.balance -= transaction.amount;
      sourceAccount.updated_at = new Date().toISOString();
    }
  }
  
  // Update destination account (if internal)
  if (transaction.destination_type === 'vault_account') {
    const destAccount = mockVaultAccounts.find(a => a.id === transaction.destination_id);
    if (destAccount) {
      destAccount.balance += transaction.amount;
      destAccount.updated_at = new Date().toISOString();
    }
  }
};

// Create a vault audit log entry
export const createMockVaultAuditLog = (entry: {
  action: string;
  userId?: string;
  accountId?: string;
  transactionId?: string;
  details?: Record<string, any>;
  severity?: 'info' | 'warning' | 'critical';
  ipAddress?: string;
  userAgent?: string;
}): MockVaultAuditLog => {
  const now = new Date().toISOString();
  
  const newLogEntry: MockVaultAuditLog = {
    id: uuidv4(),
    timestamp: now,
    action: entry.action,
    user_id: entry.userId || null,
    ip_address: entry.ipAddress || null,
    user_agent: entry.userAgent || null,
    account_id: entry.accountId || null,
    transaction_id: entry.transactionId || null,
    details: entry.details || null,
    severity: entry.severity || 'info'
  };
  
  mockVaultAuditLogs.push(newLogEntry);
  return newLogEntry;
};

// Reset all vault mock data
export const resetVaultMockData = (): void => {
  mockVaultMasters.length = 0;
  mockVaultAccounts.length = 0;
  mockVaultTransactions.length = 0;
  mockSecurityPolicies.length = 0;
  mockVaultAuditLogs.length = 0;
}; 