import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { 
  VaultAccount, 
  Transaction, 
  TransactionType, 
  TransactionStatus, 
  VaultAccountType,
  VaultBalance,
  TransactionFilter,
  AllocationPlan,
  SecurityPolicy,
  AuditLogEntry
} from '../../types/vault-banking';

class VaultBankingService {
  private supabase;
  private encryptionKey: string | undefined;
  private transactionCache: Map<string, Transaction> = new Map();
  
  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    
    this.encryptionKey = process.env.VAULT_ENCRYPTION_KEY;
  }
  
  /**
   * Get all vault accounts for a user
   */
  public async getAccounts(userId: string): Promise<VaultAccount[]> {
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching vault accounts:', error);
      throw new Error(`Failed to fetch vault accounts: ${error.message}`);
    }
    
    // Transform DB response to match our interface
    return (data || []).map(this.mapDbAccountToVaultAccount);
  }
  
  /**
   * Get a specific vault account by ID
   */
  public async getAccount(accountId: string): Promise<VaultAccount> {
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .select('*')
      .eq('id', accountId)
      .single();
    
    if (error) {
      console.error(`Error fetching vault account ${accountId}:`, error);
      throw new Error(`Failed to fetch vault account: ${error.message}`);
    }
    
    return this.mapDbAccountToVaultAccount(data);
  }
  
  /**
   * Create a new vault account
   */
  public async createAccount(userId: string, account: Partial<VaultAccount>): Promise<VaultAccount> {
    const now = new Date().toISOString();
    const newAccount = {
      id: uuidv4(),
      user_id: userId,
      name: account.name || 'New Vault Account',
      type: account.type || VaultAccountType.TRADING,
      balance: account.balance || 0,
      currency: account.currency || 'USD',
      is_active: account.isActive !== undefined ? account.isActive : true,
      created_at: now,
      updated_at: now,
      address: account.address,
      api_keys: account.apiKeys || [],
      risk_score: account.riskScore || 0,
      allocations: account.allocations || [],
      security_level: account.securityLevel || 'standard',
      access_rules: account.accessRules || {
        twoFactorRequired: false,
        withdrawalLimit: 10000,
        withdrawalTimelock: 24,
        approvalRequired: false
      },
      metadata: account.metadata || {}
    };
    
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .insert([newAccount])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating vault account:', error);
      throw new Error(`Failed to create vault account: ${error.message}`);
    }
    
    // Create audit log entry
    await this.createAuditLog({
      action: 'account_created',
      userId,
      accountId: newAccount.id,
      details: { accountType: account.type },
      severity: 'info'
    });
    
    return this.mapDbAccountToVaultAccount(data);
  }
  
  /**
   * Update an existing vault account
   */
  public async updateAccount(accountId: string, updates: Partial<VaultAccount>): Promise<VaultAccount> {
    const { data: existingAccount } = await this.supabase
      .from('vault_accounts')
      .select('*')
      .eq('id', accountId)
      .single();
    
    if (!existingAccount) {
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    const updatedAccount = {
      updated_at: new Date().toISOString(),
      name: updates.name !== undefined ? updates.name : existingAccount.name,
      type: updates.type || existingAccount.type,
      balance: updates.balance !== undefined ? updates.balance : existingAccount.balance,
      currency: updates.currency || existingAccount.currency,
      is_active: updates.isActive !== undefined ? updates.isActive : existingAccount.is_active,
      address: updates.address !== undefined ? updates.address : existingAccount.address,
      api_keys: updates.apiKeys || existingAccount.api_keys,
      risk_score: updates.riskScore !== undefined ? updates.riskScore : existingAccount.risk_score,
      allocations: updates.allocations || existingAccount.allocations,
      security_level: updates.securityLevel || existingAccount.security_level,
      access_rules: updates.accessRules || existingAccount.access_rules,
      metadata: updates.metadata || existingAccount.metadata
    };
    
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .update(updatedAccount)
      .eq('id', accountId)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating vault account ${accountId}:`, error);
      throw new Error(`Failed to update vault account: ${error.message}`);
    }
    
    // Create audit log entry
    await this.createAuditLog({
      action: 'account_updated',
      userId: existingAccount.user_id,
      accountId,
      details: { updates: Object.keys(updates) },
      severity: 'info'
    });
    
    return this.mapDbAccountToVaultAccount(data);
  }
  
  /**
   * Create a new transaction
   */
  public async createTransaction(transaction: Partial<Transaction>, userId: string): Promise<Transaction> {
    if (!transaction.accountId) {
      throw new Error('Account ID is required for transaction');
    }
    
    // Validate the transaction
    await this.validateTransaction(transaction, userId);
    
    const now = new Date().toISOString();
    const newTransaction = {
      id: uuidv4(),
      account_id: transaction.accountId,
      type: transaction.type || TransactionType.DEPOSIT,
      amount: transaction.amount || 0,
      currency: transaction.currency || 'USD',
      status: TransactionType.DEPOSIT === transaction.type 
        ? TransactionStatus.COMPLETED 
        : TransactionStatus.PENDING,
      timestamp: now,
      description: transaction.description || '',
      fee: transaction.fee || 0,
      hash: transaction.hash,
      reference: transaction.reference || `TRX-${Date.now()}`,
      metadata: transaction.metadata || {},
      related_transaction_id: transaction.relatedTransactionId,
      initiated_by: userId,
      approved_by: null,
      risk_assessment: {
        score: 0,
        flags: [],
        isAutomated: true
      }
    };
    
    // Perform risk assessment on the transaction
    const riskAssessment = await this.assessTransactionRisk(newTransaction);
    newTransaction.risk_assessment = riskAssessment;
    
    // If high risk, mark for review
    if (riskAssessment.score > 70) {
      newTransaction.status = TransactionStatus.PENDING;
    }
    
    const { data, error } = await this.supabase
      .from('transactions')
      .insert([newTransaction])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating transaction:', error);
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
    
    // Update account balance for completed transactions
    if (newTransaction.status === TransactionStatus.COMPLETED) {
      await this.updateAccountBalance(transaction.accountId, transaction);
    }
    
    // Create audit log entry
    await this.createAuditLog({
      action: 'transaction_created',
      userId,
      accountId: transaction.accountId,
      transactionId: newTransaction.id,
      details: { 
        type: transaction.type,
        amount: transaction.amount,
        status: newTransaction.status
      },
      severity: riskAssessment.score > 70 ? 'warning' : 'info'
    });
    
    const mappedTransaction = this.mapDbTransactionToTransaction(data);
    this.transactionCache.set(mappedTransaction.id, mappedTransaction);
    
    return mappedTransaction;
  }
  
  /**
   * Get transactions with optional filtering
   */
  public async getTransactions(filter: TransactionFilter = {}): Promise<Transaction[]> {
    let query = this.supabase
      .from('transactions')
      .select('*');
    
    // Apply filters
    if (filter.accountId) {
      query = query.eq('account_id', filter.accountId);
    }
    
    if (filter.types && filter.types.length) {
      query = query.in('type', filter.types);
    }
    
    if (filter.statuses && filter.statuses.length) {
      query = query.in('status', filter.statuses);
    }
    
    if (filter.fromDate) {
      query = query.gte('timestamp', filter.fromDate);
    }
    
    if (filter.toDate) {
      query = query.lte('timestamp', filter.toDate);
    }
    
    if (filter.minAmount !== undefined) {
      query = query.gte('amount', filter.minAmount);
    }
    
    if (filter.maxAmount !== undefined) {
      query = query.lte('amount', filter.maxAmount);
    }
    
    if (filter.search) {
      query = query.or(`description.ilike.%${filter.search}%,reference.ilike.%${filter.search}%`);
    }
    
    // Order by timestamp, newest first
    query = query.order('timestamp', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching transactions:', error);
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
    
    return (data || []).map(this.mapDbTransactionToTransaction);
  }
  
  /**
   * Get transaction by ID
   */
  public async getTransaction(transactionId: string): Promise<Transaction> {
    // Check cache first
    const cached = this.transactionCache.get(transactionId);
    if (cached) {
      return cached;
    }
    
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();
    
    if (error) {
      console.error(`Error fetching transaction ${transactionId}:`, error);
      throw new Error(`Failed to fetch transaction: ${error.message}`);
    }
    
    const transaction = this.mapDbTransactionToTransaction(data);
    this.transactionCache.set(transactionId, transaction);
    
    return transaction;
  }
  
  /**
   * Update transaction status
   */
  public async updateTransactionStatus(
    transactionId: string, 
    status: TransactionStatus, 
    userId: string,
    notes?: string
  ): Promise<Transaction> {
    const { data: existingTransaction } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();
    
    if (!existingTransaction) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }
    
    // Check if the status change is valid
    if (!this.isValidStatusTransition(existingTransaction.status, status)) {
      throw new Error(`Invalid status transition from ${existingTransaction.status} to ${status}`);
    }
    
    const updates = {
      status,
      updated_at: new Date().toISOString(),
      approved_by: status === TransactionStatus.COMPLETED ? userId : existingTransaction.approved_by,
      metadata: {
        ...existingTransaction.metadata,
        statusHistory: [
          ...(existingTransaction.metadata?.statusHistory || []),
          {
            from: existingTransaction.status,
            to: status,
            timestamp: new Date().toISOString(),
            userId,
            notes
          }
        ]
      }
    };
    
    const { data, error } = await this.supabase
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating transaction ${transactionId}:`, error);
      throw new Error(`Failed to update transaction: ${error.message}`);
    }
    
    // If transaction is now completed, update account balance
    if (status === TransactionStatus.COMPLETED && existingTransaction.status !== TransactionStatus.COMPLETED) {
      await this.updateAccountBalance(existingTransaction.account_id, existingTransaction);
    }
    
    // Create audit log entry
    await this.createAuditLog({
      action: 'transaction_status_updated',
      userId,
      accountId: existingTransaction.account_id,
      transactionId,
      details: { 
        previousStatus: existingTransaction.status,
        newStatus: status,
        notes
      },
      severity: 'info'
    });
    
    const transaction = this.mapDbTransactionToTransaction(data);
    this.transactionCache.set(transactionId, transaction);
    
    return transaction;
  }
  
  /**
   * Get the balance for an account
   */
  public async getBalance(accountId: string): Promise<VaultBalance> {
    const { data: account, error } = await this.supabase
      .from('vault_accounts')
      .select('*')
      .eq('id', accountId)
      .single();
    
    if (error) {
      console.error(`Error fetching account ${accountId}:`, error);
      throw new Error(`Failed to fetch account: ${error.message}`);
    }
    
    // Get pending transactions
    const { data: pendingTransactions } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .eq('status', TransactionStatus.PENDING);
    
    // Calculate pending amounts
    const pendingAmount = (pendingTransactions || []).reduce((sum, tx) => {
      if (tx.type === TransactionType.DEPOSIT) {
        return sum + tx.amount;
      } else if (tx.type === TransactionType.WITHDRAWAL) {
        return sum - tx.amount;
      }
      return sum;
    }, 0);
    
    // Get historical balance data
    const { data: historyData } = await this.supabase
      .from('balance_history')
      .select('*')
      .eq('account_id', accountId)
      .order('timestamp', { ascending: false })
      .limit(30);
    
    const balance: VaultBalance = {
      accountId,
      total: account.balance,
      available: account.balance - (account.locked_amount || 0),
      locked: account.locked_amount || 0,
      pending: pendingAmount,
      currency: account.currency,
      lastUpdated: account.updated_at,
      historicalData: (historyData || []).map(h => ({
        timestamp: h.timestamp,
        balance: h.balance
      }))
    };
    
    return balance;
  }
  
  /**
   * Create or update an allocation plan
   */
  public async saveAllocationPlan(plan: Partial<AllocationPlan>, userId: string): Promise<AllocationPlan> {
    const now = new Date().toISOString();
    
    if (!plan.accountId) {
      throw new Error('Account ID is required for allocation plan');
    }
    
    // Check if account exists
    const { data: account } = await this.supabase
      .from('vault_accounts')
      .select('id')
      .eq('id', plan.accountId)
      .single();
    
    if (!account) {
      throw new Error(`Account with ID ${plan.accountId} not found`);
    }
    
    // Normalize allocations to ensure they sum to 100%
    let allocations = [...(plan.allocations || [])];
    const totalPercentage = allocations.reduce((sum, alloc) => sum + alloc.targetPercentage, 0);
    
    if (totalPercentage !== 100 && allocations.length > 0) {
      // Adjust percentages to sum to 100%
      allocations = allocations.map(alloc => ({
        ...alloc,
        targetPercentage: (alloc.targetPercentage / totalPercentage) * 100
      }));
    }
    
    const planData = {
      id: plan.id || uuidv4(),
      name: plan.name || 'Allocation Plan',
      account_id: plan.accountId,
      is_active: plan.isActive !== undefined ? plan.isActive : true,
      created_at: plan.id ? undefined : now,
      updated_at: now,
      allocations,
      rebalancing_rules: plan.rebalancingRules || {
        threshold: 5,
        isAutomatic: false
      },
      last_rebalanced: plan.lastRebalanced,
      next_scheduled_rebalance: plan.nextScheduledRebalance
    };
    
    let result;
    
    if (plan.id) {
      // Update existing plan
      const { data, error } = await this.supabase
        .from('allocation_plans')
        .update(planData)
        .eq('id', plan.id)
        .select()
        .single();
      
      if (error) {
        console.error(`Error updating allocation plan ${plan.id}:`, error);
        throw new Error(`Failed to update allocation plan: ${error.message}`);
      }
      
      result = data;
    } else {
      // Create new plan
      const { data, error } = await this.supabase
        .from('allocation_plans')
        .insert([planData])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating allocation plan:', error);
        throw new Error(`Failed to create allocation plan: ${error.message}`);
      }
      
      result = data;
    }
    
    // Create audit log entry
    await this.createAuditLog({
      action: plan.id ? 'allocation_plan_updated' : 'allocation_plan_created',
      userId,
      accountId: plan.accountId,
      details: { 
        planId: result.id,
        planName: result.name,
        allocationCount: allocations.length
      },
      severity: 'info'
    });
    
    return this.mapDbPlanToAllocationPlan(result);
  }
  
  /**
   * Perform a rebalance operation
   */
  public async rebalance(planId: string, userId: string): Promise<AllocationPlan> {
    // Get the plan
    const { data: plan } = await this.supabase
      .from('allocation_plans')
      .select('*')
      .eq('id', planId)
      .single();
    
    if (!plan) {
      throw new Error(`Allocation plan with ID ${planId} not found`);
    }
    
    // Get account balance
    const { data: account } = await this.supabase
      .from('vault_accounts')
      .select('*')
      .eq('id', plan.account_id)
      .single();
    
    if (!account) {
      throw new Error(`Account with ID ${plan.account_id} not found`);
    }
    
    const totalBalance = account.balance;
    
    // Calculate current allocations and determine needed adjustments
    const updatedAllocations = plan.allocations.map(alloc => {
      const targetAmount = (alloc.targetPercentage / 100) * totalBalance;
      const currentAmount = alloc.currentAmount || 0;
      const currentPercentage = (currentAmount / totalBalance) * 100;
      const difference = targetAmount - currentAmount;
      
      return {
        ...alloc,
        targetAmount,
        currentAmount: targetAmount, // After rebalance, current = target
        currentPercentage: alloc.targetPercentage,
        adjustment: difference
      };
    });
    
    // Create rebalance transactions
    const transactions = updatedAllocations
      .filter(alloc => Math.abs(alloc.adjustment) > 0.01) // Ignore very small adjustments
      .map(alloc => ({
        account_id: plan.account_id,
        type: TransactionType.ALLOCATION,
        amount: Math.abs(alloc.adjustment),
        currency: account.currency,
        status: TransactionStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        description: `Rebalance allocation for strategy ${alloc.strategyId}`,
        initiated_by: userId,
        metadata: {
          allocationType: alloc.adjustment > 0 ? 'increase' : 'decrease',
          strategyId: alloc.strategyId,
          planId
        }
      }));
    
    if (transactions.length > 0) {
      // Insert all rebalance transactions
      const { error } = await this.supabase
        .from('transactions')
        .insert(transactions);
      
      if (error) {
        console.error('Error creating rebalance transactions:', error);
        throw new Error(`Failed to create rebalance transactions: ${error.message}`);
      }
    }
    
    // Update the plan with new allocation values
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('allocation_plans')
      .update({
        allocations: updatedAllocations,
        last_rebalanced: now,
        updated_at: now,
        next_scheduled_rebalance: this.calculateNextRebalanceDate(plan.rebalancing_rules)
      })
      .eq('id', planId)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating allocation plan ${planId}:`, error);
      throw new Error(`Failed to update allocation plan: ${error.message}`);
    }
    
    // Create audit log entry
    await this.createAuditLog({
      action: 'allocation_rebalanced',
      userId,
      accountId: plan.account_id,
      details: { 
        planId,
        transactionCount: transactions.length,
        totalAllocated: totalBalance
      },
      severity: 'info'
    });
    
    return this.mapDbPlanToAllocationPlan(data);
  }
  
  /**
   * Get security policy for an account
   */
  public async getSecurityPolicy(accountId: string): Promise<SecurityPolicy> {
    const { data, error } = await this.supabase
      .from('security_policies')
      .select('*')
      .eq('account_id', accountId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Policy doesn't exist, create default
        return this.createDefaultSecurityPolicy(accountId);
      }
      
      console.error(`Error fetching security policy for account ${accountId}:`, error);
      throw new Error(`Failed to fetch security policy: ${error.message}`);
    }
    
    return this.mapDbPolicyToSecurityPolicy(data);
  }
  
  /**
   * Update security policy
   */
  public async updateSecurityPolicy(
    accountId: string, 
    policy: Partial<SecurityPolicy>, 
    userId: string
  ): Promise<SecurityPolicy> {
    // Get existing policy or create default if it doesn't exist
    let existingPolicy;
    try {
      existingPolicy = await this.getSecurityPolicy(accountId);
    } catch (error) {
      existingPolicy = await this.createDefaultSecurityPolicy(accountId);
    }
    
    const updates = {
      updated_at: new Date().toISOString(),
      withdrawal_policy: policy.withdrawalPolicy || existingPolicy.withdrawalPolicy,
      access_control: policy.accessControl || existingPolicy.accessControl,
      alert_rules: policy.alertRules || existingPolicy.alertRules
    };
    
    const { data, error } = await this.supabase
      .from('security_policies')
      .update(updates)
      .eq('id', existingPolicy.id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating security policy ${existingPolicy.id}:`, error);
      throw new Error(`Failed to update security policy: ${error.message}`);
    }
    
    // Create audit log entry
    await this.createAuditLog({
      action: 'security_policy_updated',
      userId,
      accountId,
      details: { 
        policyId: existingPolicy.id,
        updatedSections: Object.keys(policy)
      },
      severity: 'warning' // Security changes are important
    });
    
    return this.mapDbPolicyToSecurityPolicy(data);
  }
  
  /**
   * Get audit logs
   */
  public async getAuditLogs(
    options: {
      accountId?: string;
      userId?: string;
      actions?: string[];
      fromDate?: string;
      toDate?: string;
      severity?: ('info' | 'warning' | 'critical')[];
      limit?: number;
    } = {}
  ): Promise<AuditLogEntry[]> {
    let query = this.supabase
      .from('audit_logs')
      .select('*');
    
    if (options.accountId) {
      query = query.eq('account_id', options.accountId);
    }
    
    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }
    
    if (options.actions && options.actions.length) {
      query = query.in('action', options.actions);
    }
    
    if (options.fromDate) {
      query = query.gte('timestamp', options.fromDate);
    }
    
    if (options.toDate) {
      query = query.lte('timestamp', options.toDate);
    }
    
    if (options.severity && options.severity.length) {
      query = query.in('severity', options.severity);
    }
    
    query = query.order('timestamp', { ascending: false });
    
    if (options.limit) {
      query = query.limit(options.limit);
    } else {
      query = query.limit(100); // Default limit
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching audit logs:', error);
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }
    
    return (data || []).map(this.mapDbLogToAuditLogEntry);
  }
  
  /**
   * Create audit log entry
   */
  private async createAuditLog({
    action,
    userId,
    ipAddress = '0.0.0.0',
    userAgent,
    accountId,
    transactionId,
    details,
    severity = 'info'
  }: {
    action: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    accountId?: string;
    transactionId?: string;
    details: Record<string, any>;
    severity?: 'info' | 'warning' | 'critical';
  }): Promise<void> {
    const logEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      action,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      account_id: accountId,
      transaction_id: transactionId,
      details,
      severity
    };
    
    const { error } = await this.supabase
      .from('audit_logs')
      .insert([logEntry]);
    
    if (error) {
      console.error('Error creating audit log:', error);
      // Don't throw here, just log the error
    }
  }
  
  /**
   * Create a default security policy for an account
   */
  private async createDefaultSecurityPolicy(accountId: string): Promise<SecurityPolicy> {
    const now = new Date().toISOString();
    const defaultPolicy = {
      id: uuidv4(),
      account_id: accountId,
      created_at: now,
      updated_at: now,
      withdrawal_policy: {
        limits: {
          daily: 10000,
          weekly: 50000,
          monthly: 100000
        },
        whitelistedAddresses: [],
        requireApprovalThreshold: 5000,
        cooldownPeriod: 24,
        notificationSettings: {
          email: true,
          sms: false,
          push: true
        }
      },
      access_control: {
        ipWhitelist: [],
        requiredAuthMethods: ['password', 'totp'],
        sessionTimeout: 30,
        inactivityLockout: true
      },
      alert_rules: {
        unusualActivityThreshold: 0.8,
        largeTransferThreshold: 5000,
        newDeviceNotification: true,
        failedLoginThreshold: 3
      }
    };
    
    const { data, error } = await this.supabase
      .from('security_policies')
      .insert([defaultPolicy])
      .select()
      .single();
    
    if (error) {
      console.error(`Error creating security policy for account ${accountId}:`, error);
      throw new Error(`Failed to create security policy: ${error.message}`);
    }
    
    return this.mapDbPolicyToSecurityPolicy(data);
  }
  
  /**
   * Update account balance based on transaction
   */
  private async updateAccountBalance(
    accountId: string, 
    transaction: Partial<Transaction>
  ): Promise<void> {
    const { data: account } = await this.supabase
      .from('vault_accounts')
      .select('balance, currency')
      .eq('id', accountId)
      .single();
    
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    if (account.currency !== transaction.currency) {
      throw new Error(`Transaction currency (${transaction.currency}) doesn't match account currency (${account.currency})`);
    }
    
    let balanceChange = 0;
    
    switch (transaction.type) {
      case TransactionType.DEPOSIT:
        balanceChange = transaction.amount || 0;
        break;
      case TransactionType.WITHDRAWAL:
        balanceChange = -(transaction.amount || 0);
        break;
      case TransactionType.TRANSFER:
        // For transfers, check if this account is source or destination
        if (transaction.metadata?.sourceAccountId === accountId) {
          balanceChange = -(transaction.amount || 0);
        } else if (transaction.metadata?.destinationAccountId === accountId) {
          balanceChange = transaction.amount || 0;
        }
        break;
      case TransactionType.FEE:
        balanceChange = -(transaction.amount || 0);
        break;
      case TransactionType.INTEREST:
      case TransactionType.REWARD:
        balanceChange = transaction.amount || 0;
        break;
      default:
        balanceChange = 0;
    }
    
    const newBalance = account.balance + balanceChange;
    
    // Update the account balance
    const { error } = await this.supabase
      .from('vault_accounts')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);
    
    if (error) {
      console.error(`Error updating account balance for ${accountId}:`, error);
      throw new Error(`Failed to update account balance: ${error.message}`);
    }
    
    // Add to balance history
    await this.supabase
      .from('balance_history')
      .insert([{
        account_id: accountId,
        timestamp: new Date().toISOString(),
        balance: newBalance,
        change: balanceChange,
        transaction_id: transaction.id
      }]);
  }
  
  /**
   * Validate a transaction
   */
  private async validateTransaction(
    transaction: Partial<Transaction>, 
    userId: string
  ): Promise<void> {
    if (!transaction.accountId) {
      throw new Error('Account ID is required');
    }
    
    if (!transaction.amount || transaction.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Get the account
    const { data: account } = await this.supabase
      .from('vault_accounts')
      .select('*')
      .eq('id', transaction.accountId)
      .single();
    
    if (!account) {
      throw new Error(`Account with ID ${transaction.accountId} not found`);
    }
    
    // Get security policy
    let securityPolicy;
    try {
      securityPolicy = await this.getSecurityPolicy(transaction.accountId);
    } catch (error) {
      securityPolicy = await this.createDefaultSecurityPolicy(transaction.accountId);
    }
    
    // Check for withdrawals
    if (transaction.type === TransactionType.WITHDRAWAL) {
      // Check account balance
      if (account.balance < transaction.amount) {
        throw new Error('Insufficient funds for withdrawal');
      }
      
      // Check withdrawal limits
      const withdrawalLimits = securityPolicy.withdrawalPolicy.limits;
      
      // Get recent withdrawals
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: recentWithdrawals } = await this.supabase
        .from('transactions')
        .select('amount, timestamp')
        .eq('account_id', transaction.accountId)
        .eq('type', TransactionType.WITHDRAWAL)
        .eq('status', TransactionStatus.COMPLETED)
        .gte('timestamp', thirtyDaysAgo);
      
      // Calculate totals for each time period
      const dailyTotal = (recentWithdrawals || [])
        .filter(w => new Date(w.timestamp) >= new Date(oneDayAgo))
        .reduce((sum, w) => sum + w.amount, 0);
      
      const weeklyTotal = (recentWithdrawals || [])
        .filter(w => new Date(w.timestamp) >= new Date(sevenDaysAgo))
        .reduce((sum, w) => sum + w.amount, 0);
      
      const monthlyTotal = (recentWithdrawals || [])
        .reduce((sum, w) => sum + w.amount, 0);
      
      // Check if this withdrawal would exceed limits
      if (dailyTotal + transaction.amount > withdrawalLimits.daily) {
        throw new Error(`This withdrawal would exceed your daily limit of ${withdrawalLimits.daily}`);
      }
      
      if (weeklyTotal + transaction.amount > withdrawalLimits.weekly) {
        throw new Error(`This withdrawal would exceed your weekly limit of ${withdrawalLimits.weekly}`);
      }
      
      if (monthlyTotal + transaction.amount > withdrawalLimits.monthly) {
        throw new Error(`This withdrawal would exceed your monthly limit of ${withdrawalLimits.monthly}`);
      }
      
      // Check approval threshold
      if (transaction.amount >= securityPolicy.withdrawalPolicy.requireApprovalThreshold) {
        // Mark for approval, but don't throw an error
        console.log(`Withdrawal of ${transaction.amount} requires approval`);
      }
      
      // Check whitelist if address is provided
      if (transaction.metadata?.toAddress) {
        const whitelistedAddresses = securityPolicy.withdrawalPolicy.whitelistedAddresses;
        const isWhitelisted = whitelistedAddresses.some(
          wa => wa.address === transaction.metadata?.toAddress
        );
        
        if (!isWhitelisted && whitelistedAddresses.length > 0) {
          throw new Error(`Address ${transaction.metadata?.toAddress} is not in your whitelist`);
        }
      }
    }
  }
  
  /**
   * Assess the risk of a transaction
   */
  private async assessTransactionRisk(transaction: any): Promise<Transaction['riskAssessment']> {
    const flags: string[] = [];
    let score = 0;
    
    // Get security policy
    let securityPolicy;
    try {
      securityPolicy = await this.getSecurityPolicy(transaction.account_id);
    } catch (error) {
      securityPolicy = await this.createDefaultSecurityPolicy(transaction.account_id);
    }
    
    // Check for large amounts
    if (transaction.amount >= securityPolicy.alertRules.largeTransferThreshold) {
      flags.push('large_amount');
      score += 30;
    }
    
    // Check transaction type (withdrawals are higher risk)
    if (transaction.type === TransactionType.WITHDRAWAL) {
      flags.push('withdrawal');
      score += 10;
      
      // Check for non-whitelisted address
      if (
        transaction.metadata?.toAddress && 
        securityPolicy.withdrawalPolicy.whitelistedAddresses.length > 0 &&
        !securityPolicy.withdrawalPolicy.whitelistedAddresses.some(
          wa => wa.address === transaction.metadata?.toAddress
        )
      ) {
        flags.push('non_whitelisted_address');
        score += 40;
      }
    }
    
    // Get account's recent transaction history to look for unusual patterns
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentTransactions } = await this.supabase
      .from('transactions')
      .select('amount, type, timestamp')
      .eq('account_id', transaction.account_id)
      .gte('timestamp', sevenDaysAgo)
      .order('timestamp', { ascending: false })
      .limit(20);
    
    // Calculate average transaction amount
    if (recentTransactions && recentTransactions.length > 0) {
      const avgAmount = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0) / recentTransactions.length;
      
      // Check if this transaction is significantly larger than average
      if (transaction.amount > avgAmount * 3) {
        flags.push('unusual_amount');
        score += 20;
      }
      
      // Check for unusual transaction frequency
      const lastTransactionTime = new Date(recentTransactions[0].timestamp).getTime();
      const currentTime = new Date().getTime();
      const timeSinceLastTransaction = (currentTime - lastTransactionTime) / (1000 * 60 * 60); // in hours
      
      if (timeSinceLastTransaction < 1 && recentTransactions.length > 5) {
        flags.push('high_frequency');
        score += 15;
      }
    }
    
    // Cap score at 100
    score = Math.min(score, 100);
    
    return {
      score,
      flags,
      isAutomated: true
    };
  }
  
  /**
   * Check if a status transition is valid
   */
  private isValidStatusTransition(from: TransactionStatus, to: TransactionStatus): boolean {
    // Define valid transitions
    const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
      [TransactionStatus.PENDING]: [TransactionStatus.PROCESSING, TransactionStatus.COMPLETED, TransactionStatus.CANCELLED],
      [TransactionStatus.PROCESSING]: [TransactionStatus.COMPLETED, TransactionStatus.FAILED],
      [TransactionStatus.COMPLETED]: [],
      [TransactionStatus.FAILED]: [TransactionStatus.PENDING],
      [TransactionStatus.CANCELLED]: []
    };
    
    return validTransitions[from].includes(to);
  }
  
  /**
   * Calculate next rebalance date based on rules
   */
  private calculateNextRebalanceDate(rules: AllocationPlan['rebalancingRules']): string | undefined {
    if (!rules.schedule) {
      return undefined;
    }
    
    // This is a simplified implementation
    // In a real app, you'd parse the cron expression properly
    const now = new Date();
    let nextRebalance: Date;
    
    if (rules.schedule === 'daily') {
      nextRebalance = new Date(now);
      nextRebalance.setDate(nextRebalance.getDate() + 1);
    } else if (rules.schedule === 'weekly') {
      nextRebalance = new Date(now);
      nextRebalance.setDate(nextRebalance.getDate() + 7);
    } else if (rules.schedule === 'monthly') {
      nextRebalance = new Date(now);
      nextRebalance.setMonth(nextRebalance.getMonth() + 1);
    } else {
      return undefined;
    }
    
    return nextRebalance.toISOString();
  }
  
  /**
   * Map database account record to VaultAccount interface
   */
  private mapDbAccountToVaultAccount(dbAccount: any): VaultAccount {
    return {
      id: dbAccount.id,
      name: dbAccount.name,
      type: dbAccount.type,
      balance: dbAccount.balance,
      currency: dbAccount.currency,
      isActive: dbAccount.is_active,
      createdAt: dbAccount.created_at,
      updatedAt: dbAccount.updated_at,
      address: dbAccount.address,
      apiKeys: dbAccount.api_keys,
      riskScore: dbAccount.risk_score,
      allocations: dbAccount.allocations || [],
      securityLevel: dbAccount.security_level,
      accessRules: dbAccount.access_rules,
      metadata: dbAccount.metadata
    };
  }
  
  /**
   * Map database transaction record to Transaction interface
   */
  private mapDbTransactionToTransaction(dbTransaction: any): Transaction {
    return {
      id: dbTransaction.id,
      accountId: dbTransaction.account_id,
      type: dbTransaction.type,
      amount: dbTransaction.amount,
      currency: dbTransaction.currency,
      status: dbTransaction.status,
      timestamp: dbTransaction.timestamp,
      description: dbTransaction.description,
      fee: dbTransaction.fee,
      hash: dbTransaction.hash,
      reference: dbTransaction.reference,
      metadata: dbTransaction.metadata,
      relatedTransactionId: dbTransaction.related_transaction_id,
      initiatedBy: dbTransaction.initiated_by,
      approvedBy: dbTransaction.approved_by,
      riskAssessment: dbTransaction.risk_assessment
    };
  }
  
  /**
   * Map database allocation plan to AllocationPlan interface
   */
  private mapDbPlanToAllocationPlan(dbPlan: any): AllocationPlan {
    return {
      id: dbPlan.id,
      name: dbPlan.name,
      accountId: dbPlan.account_id,
      isActive: dbPlan.is_active,
      createdAt: dbPlan.created_at,
      updatedAt: dbPlan.updated_at,
      allocations: dbPlan.allocations || [],
      rebalancingRules: dbPlan.rebalancing_rules,
      lastRebalanced: dbPlan.last_rebalanced,
      nextScheduledRebalance: dbPlan.next_scheduled_rebalance
    };
  }
  
  /**
   * Map database security policy to SecurityPolicy interface
   */
  private mapDbPolicyToSecurityPolicy(dbPolicy: any): SecurityPolicy {
    return {
      id: dbPolicy.id,
      accountId: dbPolicy.account_id,
      createdAt: dbPolicy.created_at,
      updatedAt: dbPolicy.updated_at,
      withdrawalPolicy: dbPolicy.withdrawal_policy,
      accessControl: dbPolicy.access_control,
      alertRules: dbPolicy.alert_rules
    };
  }
  
  /**
   * Map database audit log to AuditLogEntry interface
   */
  private mapDbLogToAuditLogEntry(dbLog: any): AuditLogEntry {
    return {
      id: dbLog.id,
      timestamp: dbLog.timestamp,
      action: dbLog.action,
      userId: dbLog.user_id,
      ipAddress: dbLog.ip_address,
      userAgent: dbLog.user_agent,
      accountId: dbLog.account_id,
      transactionId: dbLog.transaction_id,
      details: dbLog.details,
      severity: dbLog.severity
    };
  }
}

// Export singleton instance
export const vaultBankingService = new VaultBankingService(); 