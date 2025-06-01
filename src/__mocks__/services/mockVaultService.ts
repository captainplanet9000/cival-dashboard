import { v4 as uuidv4 } from 'uuid';
import { 
  VaultMaster,
  VaultAccount, 
  VaultTransaction, 
  VaultBalance,
  TransactionStatus, 
  TransactionType,
  VaultAccountType,
  TransactionFilter,
  SecurityPolicy,
  AuditLogEntry
} from '@/types/vault';
import { CONFIG, simulateLatency, simulateFailure } from '@/config/mockConfig';
import {
  mockVaultMasters,
  mockVaultAccounts,
  mockVaultTransactions,
  mockSecurityPolicies,
  mockVaultAuditLogs,
  createMockVaultMaster,
  createMockVaultAccount,
  createMockVaultTransaction,
  createMockSecurityPolicy,
  createMockVaultAuditLog,
  updateMockTransactionStatus,
  MockVaultMaster,
  MockVaultAccount,
  MockVaultTransaction,
  MockSecurityPolicy,
  MockVaultAuditLog
} from '../data/vaultData';
import { DEFAULT_USER_ID } from '../data/agentData';

// Helper to convert from mock data to service interface
const mapVaultMasterFromDb = (data: MockVaultMaster): VaultMaster => {
  return {
    id: data.id,
    name: data.name,
    description: data.description || undefined,
    totalBalance: data.total_balance,
    allocatedBalance: data.allocated_balance,
    reserveBalance: data.reserve_balance,
    highRiskExposure: data.high_risk_exposure,
    securityScore: data.security_score,
    status: data.status as 'active' | 'frozen' | 'closed',
    ownerId: data.owner_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

const mapVaultAccountFromDb = (data: MockVaultAccount): VaultAccount => {
  return {
    id: data.id,
    masterId: data.master_id,
    name: data.name,
    type: data.account_type as VaultAccountType | string,
    balance: data.balance,
    lockedAmount: data.locked_amount,
    currency: data.currency,
    riskLevel: data.risk_level as 'low' | 'medium' | 'high',
    address: data.address || undefined,
    farmId: data.farm_id || undefined,
    agentId: data.agent_id || undefined,
    securityLevel: data.security_level as 'standard' | 'enhanced' | 'maximum',
    isActive: data.is_active,
    settings: data.settings || {
      twoFactorRequired: false,
      withdrawalLimit: 1000,
      withdrawalTimelock: 0,
      approvalRequired: false,
      allowExternalTransfers: true
    },
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

const mapVaultTransactionFromDb = (data: MockVaultTransaction): VaultTransaction => {
  return {
    id: data.id,
    type: data.type as TransactionType | string,
    amount: data.amount,
    currency: data.currency,
    sourceId: data.source_id,
    sourceType: data.source_type,
    destinationId: data.destination_id,
    destinationType: data.destination_type,
    status: data.status as TransactionStatus | string,
    fee: data.fee || undefined,
    feeCurrency: data.fee_currency || undefined,
    hash: data.hash || undefined,
    reference: data.reference || undefined,
    description: data.description || undefined,
    network: data.network || undefined,
    confirmations: data.confirmations || undefined,
    approvalsRequired: data.approvals_required,
    approvalsCurrent: data.approvals_current || undefined,
    approverIds: data.approver_ids || [],
    metadata: data.metadata || undefined,
    initiatedBy: data.initiated_by,
    approvedBy: data.approved_by || undefined,
    createdAt: data.created_at,
    completedAt: data.completed_at || undefined,
    updatedAt: data.updated_at
  };
};

const mapSecurityPolicyFromDb = (data: MockSecurityPolicy): SecurityPolicy => {
  return {
    id: data.id,
    accountId: data.account_id,
    withdrawalRules: {
      requireApprovalThreshold: data.withdrawal_rules.require_approval_threshold,
      dailyLimit: data.withdrawal_rules.daily_limit,
      monthlyLimit: data.withdrawal_rules.monthly_limit,
      allowedAddresses: data.withdrawal_rules.allowed_addresses,
      blockedAddresses: data.withdrawal_rules.blocked_addresses,
      timelock: data.withdrawal_rules.timelock
    },
    accessRules: {
      allowedIpAddresses: data.access_rules.allowed_ip_addresses,
      allowedCountries: data.access_rules.allowed_countries,
      twoFactorRequired: data.access_rules.two_factor_required,
      allowedDevices: data.access_rules.allowed_devices,
      deviceVerification: data.access_rules.device_verification,
      passwordRequiredForHighValueTx: data.access_rules.password_required_for_high_value_tx
    },
    alertRules: {
      alertOnLogin: data.alert_rules.alert_on_login,
      alertOnHighValueTx: data.alert_rules.alert_on_high_value_tx,
      alertOnSuspiciousTx: data.alert_rules.alert_on_suspicious_tx,
      alertThreshold: data.alert_rules.alert_threshold,
      alertEmail: data.alert_rules.alert_email === null ? undefined : data.alert_rules.alert_email,
      alertPhone: data.alert_rules.alert_phone === null ? undefined : data.alert_rules.alert_phone
    },
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

const mapAuditLogFromDb = (data: MockVaultAuditLog): AuditLogEntry => {
  return {
    id: data.id,
    timestamp: data.timestamp,
    action: data.action,
    userId: data.user_id || undefined,
    ipAddress: data.ip_address || undefined,
    userAgent: data.user_agent || undefined,
    accountId: data.account_id || undefined,
    transactionId: data.transaction_id || undefined,
    details: data.details || undefined,
    severity: data.severity as 'info' | 'warning' | 'critical'
  };
};

/**
 * Mock Vault Service
 * Simulates the vault service for development and testing
 */
export class MockVaultService {
  private isServerSide: boolean;
  
  constructor(isServerSide = false) {
    this.isServerSide = isServerSide;
  }
  
  /**
   * Get a singleton instance of the VaultService
   * @param isServerSide Whether this service is being used on the server side
   * @returns VaultService instance
   */
  static getInstance(isServerSide = false): MockVaultService {
    return new MockVaultService(isServerSide);
  }
  
  // #region Master Vault Operations
  
  /**
   * Create a new master vault
   * @param name The name of the vault
   * @param description Optional description
   * @param ownerId Optional owner ID (defaults to current user)
   * @param initialBalance Optional initial balance
   * @returns The created vault
   */
  async createMasterVault(
    name: string, 
    description?: string, 
    ownerId?: string,
    initialBalance: number = 0
  ): Promise<VaultMaster> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to create master vault');
    
    const userId = ownerId || DEFAULT_USER_ID;
    
    const newVault = createMockVaultMaster(
      name,
      description || null,
      userId,
      initialBalance
    );
    
    return mapVaultMasterFromDb(newVault);
  }
  
  /**
   * Get a master vault by ID
   * @param id The vault ID
   * @returns The vault
   */
  async getMasterVault(id: string): Promise<VaultMaster> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to fetch master vault');
    
    const vault = mockVaultMasters.find(v => v.id === id);
    if (!vault) {
      throw new Error(`Master vault with ID ${id} not found`);
    }
    
    return mapVaultMasterFromDb(vault);
  }
  
  /**
   * Get all master vaults for a user
   * @param ownerId The owner's user ID (defaults to current user)
   * @returns List of vaults
   */
  async getMasterVaultsByOwner(ownerId?: string): Promise<VaultMaster[]> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to fetch master vaults');
    
    const userId = ownerId || DEFAULT_USER_ID;
    
    const vaults = mockVaultMasters.filter(v => v.owner_id === userId);
    return vaults.map(mapVaultMasterFromDb);
  }
  
  /**
   * Update a master vault
   * @param id The vault ID
   * @param updates The updates to apply
   * @returns The updated vault
   */
  async updateMasterVault(
    id: string, 
    updates: Partial<VaultMaster>
  ): Promise<VaultMaster> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to update master vault');
    
    const vault = mockVaultMasters.find(v => v.id === id);
    if (!vault) {
      throw new Error(`Master vault with ID ${id} not found`);
    }
    
    const now = new Date().toISOString();
    
    // Update fields
    if (updates.name !== undefined) vault.name = updates.name;
    if (updates.description !== undefined) vault.description = updates.description || null;
    if (updates.status !== undefined) vault.status = updates.status;
    
    vault.updated_at = now;
    
    // Create audit log entry
    createMockVaultAuditLog({
      action: 'vault.master.update',
      userId: DEFAULT_USER_ID,
      details: { updates: Object.keys(updates).join(',') }
    });
    
    return mapVaultMasterFromDb(vault);
  }
  
  // #endregion
  
  // #region Vault Account Operations
  
  /**
   * Create a new vault account
   * @param masterId Master vault ID
   * @param name Account name
   * @param type Account type
   * @param currency Currency code
   * @param options Additional options
   * @returns The created account
   */
  async createVaultAccount(
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
  ): Promise<VaultAccount> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to create vault account');
    
    // Verify master vault exists
    const masterVault = mockVaultMasters.find(v => v.id === masterId);
    if (!masterVault) {
      throw new Error(`Master vault with ID ${masterId} not found`);
    }
    
    const newAccount = createMockVaultAccount(
      masterId,
      name,
      type,
      currency,
      {
        farmId: options?.farmId,
        agentId: options?.agentId,
        riskLevel: options?.riskLevel,
        securityLevel: options?.securityLevel,
        address: options?.address,
        initialBalance: options?.initialBalance,
        settings: options?.settings,
        metadata: options?.metadata
      }
    );
    
    return mapVaultAccountFromDb(newAccount);
  }
  
  /**
   * Get a vault account by ID
   * @param id Account ID
   * @returns The account
   */
  async getVaultAccount(id: string): Promise<VaultAccount> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to fetch vault account');
    
    const account = mockVaultAccounts.find(a => a.id === id);
    if (!account) {
      throw new Error(`Vault account with ID ${id} not found`);
    }
    
    return mapVaultAccountFromDb(account);
  }
  
  /**
   * Get all accounts in a master vault
   * @param masterId Master vault ID
   * @returns List of accounts
   */
  async getVaultAccountsByMaster(masterId: string): Promise<VaultAccount[]> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to fetch vault accounts');
    
    const accounts = mockVaultAccounts.filter(a => a.master_id === masterId);
    return accounts.map(mapVaultAccountFromDb);
  }
  
  /**
   * Get account by farm ID
   * @param farmId Farm ID
   * @returns The account
   */
  async getVaultAccountByFarm(farmId: string): Promise<VaultAccount> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to fetch vault account');
    
    const account = mockVaultAccounts.find(a => a.farm_id === farmId);
    if (!account) {
      throw new Error(`Vault account for farm ${farmId} not found`);
    }
    
    return mapVaultAccountFromDb(account);
  }
  
  /**
   * Get account by agent ID
   * @param agentId Agent ID
   * @returns The account
   */
  async getVaultAccountByAgent(agentId: string): Promise<VaultAccount> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to fetch vault account');
    
    const account = mockVaultAccounts.find(a => a.agent_id === agentId);
    if (!account) {
      throw new Error(`Vault account for agent ${agentId} not found`);
    }
    
    return mapVaultAccountFromDb(account);
  }
  
  /**
   * Update a vault account
   * @param id Account ID
   * @param updates The updates to apply
   * @returns The updated account
   */
  async updateVaultAccount(id: string, updates: Partial<VaultAccount>): Promise<VaultAccount> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to update vault account');
    
    const account = mockVaultAccounts.find(a => a.id === id);
    if (!account) {
      throw new Error(`Vault account with ID ${id} not found`);
    }
    
    const now = new Date().toISOString();
    
    // Update fields
    if (updates.name !== undefined) account.name = updates.name;
    if (updates.type !== undefined) account.account_type = updates.type;
    if (updates.riskLevel !== undefined) account.risk_level = updates.riskLevel;
    if (updates.isActive !== undefined) account.is_active = updates.isActive;
    if (updates.securityLevel !== undefined) account.security_level = updates.securityLevel;
    if (updates.address !== undefined) account.address = updates.address || null;
    if (updates.settings !== undefined) account.settings = updates.settings;
    
    account.updated_at = now;
    
    // Create audit log
    createMockVaultAuditLog({
      action: 'vault.account.update',
      accountId: id,
      details: { updates: Object.keys(updates).join(',') }
    });
    
    return mapVaultAccountFromDb(account);
  }
  
  // #endregion
  
  // #region Transaction Operations
  
  /**
   * Create a transaction
   * @param details Transaction details
   * @returns The created transaction
   */
  async createTransaction(details: {
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
  }): Promise<VaultTransaction> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to create transaction');
    
    // Validate if source/destination accounts exist if they are vault accounts
    if (details.sourceType === 'vault_account') {
      const sourceAccount = mockVaultAccounts.find(a => a.id === details.sourceId);
      if (!sourceAccount) {
        throw new Error(`Source account ${details.sourceId} not found`);
      }
      
      if (details.amount > sourceAccount.balance) {
        throw new Error('Insufficient balance in source account');
      }
    }
    
    if (details.destinationType === 'vault_account') {
      const destAccount = mockVaultAccounts.find(a => a.id === details.destinationId);
      if (!destAccount) {
        throw new Error(`Destination account ${details.destinationId} not found`);
      }
    }
    
    const transaction = createMockVaultTransaction({
      sourceId: details.sourceId,
      sourceType: details.sourceType,
      destinationId: details.destinationId,
      destinationType: details.destinationType,
      amount: details.amount,
      currency: details.currency,
      type: details.type,
      description: details.description,
      reference: details.reference,
      network: details.network,
      fee: details.fee,
      feeCurrency: details.feeCurrency,
      metadata: details.metadata,
      approvalsRequired: details.approvalsRequired,
      initiatedBy: details.initiatedBy
    });
    
    return mapVaultTransactionFromDb(transaction);
  }
  
  // Create a helper for common deposit/withdraw code to ensure type safety 
  private createSafeTransaction(details: {
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
  }): Promise<VaultTransaction> {
    // Ensure proper type conversion here
    const transactionType = typeof details.type === 'string' 
      ? details.type as TransactionType 
      : details.type;
    
    return this.createTransaction({
      ...details,
      type: transactionType
    });
  }
  
  /**
   * Deposit funds into a vault account
   */
  async deposit(
    accountId: string,
    amount: number,
    currency: string,
    sourceType: string,
    sourceId: string,
    options?: {
      description?: string;
      reference?: string;
      network?: string;
      fee?: number;
      feeCurrency?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<VaultTransaction> {
    return this.createSafeTransaction({
      sourceId,
      sourceType,
      destinationId: accountId,
      destinationType: 'vault_account',
      amount,
      currency,
      type: TransactionType.DEPOSIT,
      description: options?.description || `Deposit to ${accountId}`,
      reference: options?.reference,
      network: options?.network,
      fee: options?.fee,
      feeCurrency: options?.feeCurrency,
      metadata: options?.metadata
    });
  }
  
  /**
   * Withdraw funds from a vault account
   */
  async withdraw(
    accountId: string,
    amount: number,
    currency: string,
    destinationType: string,
    destinationId: string,
    options?: {
      description?: string;
      reference?: string;
      network?: string;
      fee?: number;
      feeCurrency?: string;
      metadata?: Record<string, any>;
      approvalsRequired?: number;
    }
  ): Promise<VaultTransaction> {
    // Check if the account has sufficient funds
    const account = await this.getVaultAccount(accountId);
    
    if (account.balance - account.lockedAmount < amount) {
      throw new Error('Insufficient available funds for withdrawal');
    }
    
    // Get security policy for withdrawal limits
    const securityPolicy = await this.getSecurityPolicy(accountId);
    
    // Check if approval is required based on amount
    const requiresApproval = amount >= securityPolicy.withdrawalRules.requireApprovalThreshold;
    const approvalsRequired = requiresApproval 
      ? options?.approvalsRequired || 1 
      : 0;
    
    // Create the withdrawal transaction
    return this.createSafeTransaction({
      sourceId: accountId,
      sourceType: 'vault_account',
      destinationId,
      destinationType,
      amount,
      currency,
      type: TransactionType.WITHDRAWAL,
      description: options?.description || `Withdrawal from ${accountId}`,
      reference: options?.reference,
      network: options?.network,
      fee: options?.fee,
      feeCurrency: options?.feeCurrency,
      metadata: options?.metadata,
      approvalsRequired
    });
  }
  
  /**
   * Transfer funds between vault accounts
   */
  async transfer(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    currency: string,
    options?: {
      description?: string;
      reference?: string;
      metadata?: Record<string, any>;
      approvalsRequired?: number;
    }
  ): Promise<VaultTransaction> {
    // Check if source account has sufficient funds
    const account = await this.getVaultAccount(fromAccountId);
    
    if (account.balance - account.lockedAmount < amount) {
      throw new Error('Insufficient available funds for transfer');
    }
    
    // Create the transfer transaction
    return this.createSafeTransaction({
      sourceId: fromAccountId,
      sourceType: 'vault_account',
      destinationId: toAccountId,
      destinationType: 'vault_account',
      amount,
      currency,
      type: TransactionType.TRANSFER,
      description: options?.description || `Transfer from ${fromAccountId} to ${toAccountId}`,
      reference: options?.reference,
      metadata: options?.metadata,
      approvalsRequired: options?.approvalsRequired || 1
    });
  }
  
  /**
   * Get a transaction by ID
   * @param id Transaction ID
   * @returns The transaction
   */
  async getTransaction(id: string): Promise<VaultTransaction> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to fetch transaction');
    
    const transaction = mockVaultTransactions.find(t => t.id === id);
    if (!transaction) {
      throw new Error(`Transaction with ID ${id} not found`);
    }
    
    return mapVaultTransactionFromDb(transaction);
  }
  
  /**
   * Get transactions matching filter criteria
   * @param filter Filter criteria
   * @returns List of transactions
   */
  async getTransactions(filter: TransactionFilter = {}): Promise<VaultTransaction[]> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to fetch transactions');
    
    let filteredTransactions = [...mockVaultTransactions];
    
    // Apply filters
    if (filter.accountId) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.source_id === filter.accountId || t.destination_id === filter.accountId
      );
    }
    
    if (filter.types && filter.types.length > 0) {
      filteredTransactions = filteredTransactions.filter(t => 
        filter.types!.includes(t.type as string)
      );
    }
    
    if (filter.statuses && filter.statuses.length > 0) {
      filteredTransactions = filteredTransactions.filter(t => 
        filter.statuses!.includes(t.status as string)
      );
    }
    
    if (filter.fromDate) {
      filteredTransactions = filteredTransactions.filter(t => 
        new Date(t.created_at) >= new Date(filter.fromDate!)
      );
    }
    
    if (filter.toDate) {
      filteredTransactions = filteredTransactions.filter(t => 
        new Date(t.created_at) <= new Date(filter.toDate!)
      );
    }
    
    if (filter.minAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.amount >= filter.minAmount!
      );
    }
    
    if (filter.maxAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.amount <= filter.maxAmount!
      );
    }
    
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      filteredTransactions = filteredTransactions.filter(t => 
        (t.description && t.description.toLowerCase().includes(searchTerm)) ||
        (t.reference && t.reference.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply pagination
    if (filter.offset) {
      filteredTransactions = filteredTransactions.slice(filter.offset);
    }
    
    if (filter.limit) {
      filteredTransactions = filteredTransactions.slice(0, filter.limit);
    }
    
    return filteredTransactions.map(mapVaultTransactionFromDb);
  }
  
  /**
   * Approve a transaction
   * @param id Transaction ID
   * @param userId User ID of the approver
   * @param note Optional note
   * @returns The updated transaction
   */
  async approveTransaction(id: string, userId: string, note?: string): Promise<VaultTransaction> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to approve transaction');
    
    const transaction = mockVaultTransactions.find(t => t.id === id);
    if (!transaction) {
      throw new Error(`Transaction with ID ${id} not found`);
    }
    
    if (transaction.status !== TransactionStatus.PENDING) {
      throw new Error(`Transaction is not in pending status: ${transaction.status}`);
    }
    
    // Update approval count
    transaction.approvals_current = (transaction.approvals_current || 0) + 1;
    transaction.approver_ids = transaction.approver_ids || [];
    transaction.approver_ids.push(userId);
    
    // Check if we have enough approvals to complete
    if (transaction.approvals_current >= transaction.approvals_required) {
      const updated = updateMockTransactionStatus(
        id,
        TransactionStatus.COMPLETED,
        userId,
        note || 'Transaction approved'
      );
      
      return mapVaultTransactionFromDb(updated);
    }
    
    transaction.updated_at = new Date().toISOString();
    
    // Create audit log
    createMockVaultAuditLog({
      action: 'transaction.approval',
      userId,
      transactionId: id,
      details: { 
        approvals: transaction.approvals_current,
        required: transaction.approvals_required,
        note 
      },
      severity: 'info'
    });
    
    return mapVaultTransactionFromDb(transaction);
  }
  
  /**
   * Cancel a transaction
   * @param id Transaction ID
   * @param userId User ID
   * @param reason Optional reason
   * @returns The updated transaction
   */
  async cancelTransaction(id: string, userId: string, reason?: string): Promise<VaultTransaction> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to cancel transaction');
    
    const transaction = mockVaultTransactions.find(t => t.id === id);
    if (!transaction) {
      throw new Error(`Transaction with ID ${id} not found`);
    }
    
    if (transaction.status !== TransactionStatus.PENDING) {
      throw new Error(`Transaction cannot be cancelled: ${transaction.status}`);
    }
    
    const updated = updateMockTransactionStatus(
      id,
      TransactionStatus.CANCELLED,
      userId,
      reason || 'Transaction cancelled'
    );
    
    return mapVaultTransactionFromDb(updated);
  }
  
  // #endregion
  
  // #region Security Policies
  
  /**
   * Get security policy for an account
   * @param accountId Account ID
   * @returns Security policy
   */
  async getSecurityPolicy(accountId: string): Promise<SecurityPolicy> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to fetch security policy');
    
    const policy = mockSecurityPolicies.find(p => p.account_id === accountId);
    if (!policy) {
      throw new Error(`Security policy for account ${accountId} not found`);
    }
    
    return mapSecurityPolicyFromDb(policy);
  }
  
  /**
   * Update security policy
   * @param accountId Account ID
   * @param updates Updates to apply
   * @returns Updated security policy
   */
  async updateSecurityPolicy(
    accountId: string, 
    updates: Partial<SecurityPolicy>
  ): Promise<SecurityPolicy> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to update security policy');
    
    const policy = mockSecurityPolicies.find(p => p.account_id === accountId);
    if (!policy) {
      throw new Error(`Security policy for account ${accountId} not found`);
    }
    
    const now = new Date().toISOString();
    
    // Update fields
    if (updates.withdrawalRules) {
      if (updates.withdrawalRules.requireApprovalThreshold !== undefined) {
        policy.withdrawal_rules.require_approval_threshold = updates.withdrawalRules.requireApprovalThreshold;
      }
      if (updates.withdrawalRules.dailyLimit !== undefined) {
        policy.withdrawal_rules.daily_limit = updates.withdrawalRules.dailyLimit;
      }
      if (updates.withdrawalRules.monthlyLimit !== undefined) {
        policy.withdrawal_rules.monthly_limit = updates.withdrawalRules.monthlyLimit;
      }
      if (updates.withdrawalRules.allowedAddresses) {
        policy.withdrawal_rules.allowed_addresses = updates.withdrawalRules.allowedAddresses;
      }
      if (updates.withdrawalRules.blockedAddresses) {
        policy.withdrawal_rules.blocked_addresses = updates.withdrawalRules.blockedAddresses;
      }
      if (updates.withdrawalRules.timelock !== undefined) {
        policy.withdrawal_rules.timelock = updates.withdrawalRules.timelock;
      }
    }
    
    if (updates.accessRules) {
      if (updates.accessRules.allowedIpAddresses) {
        policy.access_rules.allowed_ip_addresses = updates.accessRules.allowedIpAddresses;
      }
      if (updates.accessRules.allowedCountries) {
        policy.access_rules.allowed_countries = updates.accessRules.allowedCountries;
      }
      if (updates.accessRules.twoFactorRequired !== undefined) {
        policy.access_rules.two_factor_required = updates.accessRules.twoFactorRequired;
      }
      if (updates.accessRules.allowedDevices) {
        policy.access_rules.allowed_devices = updates.accessRules.allowedDevices;
      }
      if (updates.accessRules.deviceVerification !== undefined) {
        policy.access_rules.device_verification = updates.accessRules.deviceVerification;
      }
      if (updates.accessRules.passwordRequiredForHighValueTx !== undefined) {
        policy.access_rules.password_required_for_high_value_tx = updates.accessRules.passwordRequiredForHighValueTx;
      }
    }
    
    if (updates.alertRules) {
      if (updates.alertRules.alertOnLogin !== undefined) {
        policy.alert_rules.alert_on_login = updates.alertRules.alertOnLogin;
      }
      if (updates.alertRules.alertOnHighValueTx !== undefined) {
        policy.alert_rules.alert_on_high_value_tx = updates.alertRules.alertOnHighValueTx;
      }
      if (updates.alertRules.alertOnSuspiciousTx !== undefined) {
        policy.alert_rules.alert_on_suspicious_tx = updates.alertRules.alertOnSuspiciousTx;
      }
      if (updates.alertRules.alertThreshold !== undefined) {
        policy.alert_rules.alert_threshold = updates.alertRules.alertThreshold;
      }
      if (updates.alertRules.alertEmail !== undefined) {
        policy.alert_rules.alert_email = updates.alertRules.alertEmail || null;
      }
      if (updates.alertRules.alertPhone !== undefined) {
        policy.alert_rules.alert_phone = updates.alertRules.alertPhone || null;
      }
    }
    
    policy.updated_at = now;
    
    // Create audit log
    createMockVaultAuditLog({
      action: 'security.policy.update',
      accountId: accountId,
      details: {
        updates: JSON.stringify({
          withdrawalRules: updates.withdrawalRules ? Object.keys(updates.withdrawalRules) : [],
          accessRules: updates.accessRules ? Object.keys(updates.accessRules) : [],
          alertRules: updates.alertRules ? Object.keys(updates.alertRules) : []
        })
      }
    });
    
    return mapSecurityPolicyFromDb(policy);
  }
  
  // #endregion
  
  // #region Balance Operations
  
  /**
   * Get account balance details
   * @param accountId Account ID
   * @returns Balance details
   */
  async getAccountBalance(accountId: string): Promise<VaultBalance> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to fetch account balance');
    
    const account = mockVaultAccounts.find(a => a.id === accountId);
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    // Get pending transactions
    const pendingTransactions = mockVaultTransactions.filter(t => 
      (t.source_id === accountId || t.destination_id === accountId) && 
      t.status === TransactionStatus.PENDING
    );
    
    // Calculate pending amounts
    const pendingOut = pendingTransactions
      .filter(t => t.source_id === accountId)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const pendingIn = pendingTransactions
      .filter(t => t.destination_id === accountId)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const balance: VaultBalance = {
      accountId,
      total: account.balance,
      available: account.balance - account.locked_amount - pendingOut,
      locked: account.locked_amount,
      pending: pendingIn - pendingOut,
      currency: account.currency,
      lastUpdated: new Date().toISOString()
    };
    
    return balance;
  }
  
  /**
   * Lock a portion of an account's balance
   * @param accountId Account ID
   * @param amount Amount to lock
   * @param reason Reason for locking
   * @returns Updated account
   */
  async lockFunds(accountId: string, amount: number, reason: string): Promise<VaultAccount> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to lock funds');
    
    const account = mockVaultAccounts.find(a => a.id === accountId);
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    if (account.balance - account.locked_amount < amount) {
      throw new Error('Insufficient available balance to lock');
    }
    
    account.locked_amount += amount;
    account.updated_at = new Date().toISOString();
    
    // Create audit log
    createMockVaultAuditLog({
      action: 'vault.funds.lock',
      accountId,
      details: {
        amount,
        reason,
        newLockedAmount: account.locked_amount
      }
    });
    
    return mapVaultAccountFromDb(account);
  }
  
  /**
   * Unlock a portion of an account's locked balance
   * @param accountId Account ID
   * @param amount Amount to unlock
   * @param reason Reason for unlocking
   * @returns Updated account
   */
  async unlockFunds(accountId: string, amount: number, reason: string): Promise<VaultAccount> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to unlock funds');
    
    const account = mockVaultAccounts.find(a => a.id === accountId);
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    if (account.locked_amount < amount) {
      throw new Error('Cannot unlock more than locked amount');
    }
    
    account.locked_amount -= amount;
    account.updated_at = new Date().toISOString();
    
    // Create audit log
    createMockVaultAuditLog({
      action: 'vault.funds.unlock',
      accountId,
      details: {
        amount,
        reason,
        newLockedAmount: account.locked_amount
      }
    });
    
    return mapVaultAccountFromDb(account);
  }
  
  // #endregion
  
  // #region Audit Logs
  
  /**
   * Create an audit log entry
   * @param entry Audit log details
   * @returns Log entry ID
   */
  async createAuditLog(entry: {
    action: string;
    userId?: string;
    accountId?: string;
    transactionId?: string;
    details?: Record<string, any>;
    severity?: 'info' | 'warning' | 'critical';
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to create audit log');
    
    const logEntry = createMockVaultAuditLog({
      action: entry.action,
      userId: entry.userId,
      accountId: entry.accountId,
      transactionId: entry.transactionId,
      details: entry.details,
      severity: entry.severity,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent
    });
    
    return logEntry.id;
  }
  
  /**
   * Get audit logs for an account
   * @param accountId Account ID
   * @param limit Maximum number of logs
   * @param offset Offset for pagination
   * @returns List of audit logs
   */
  async getAccountAuditLogs(
    accountId: string,
    limit = 50,
    offset = 0
  ): Promise<AuditLogEntry[]> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to fetch audit logs');
    
    let logs = mockVaultAuditLogs.filter(log => log.account_id === accountId);
    
    // Sort by timestamp, newest first
    logs = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Apply pagination
    logs = logs.slice(offset, offset + limit);
    
    return logs.map(mapAuditLogFromDb);
  }
  
  /**
   * Get system audit logs
   * @param limit Maximum number of logs
   * @param offset Offset for pagination
   * @returns List of audit logs
   */
  async getSystemAuditLogs(
    limit = 50,
    offset = 0
  ): Promise<AuditLogEntry[]> {
    await simulateLatency('vault');
    simulateFailure('vault', 'Failed to fetch system audit logs');
    
    // Sort by timestamp, newest first
    let logs = [...mockVaultAuditLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Apply pagination
    logs = logs.slice(offset, offset + limit);
    
    return logs.map(mapAuditLogFromDb);
  }
}

// Export a singleton instance for easy access
export const mockVaultService = new MockVaultService(); 