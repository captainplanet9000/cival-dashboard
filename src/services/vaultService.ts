import { createClient } from '@supabase/supabase-js';
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
import { Database } from '@/types/database.types';
import { createServerClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Unified Vault Service
 * Handles all vault operations including accounts, transactions, balances,
 * and security policies.
 */
export class VaultService {
  private supabase;
  private isServerSide: boolean;
  
  /**
   * Create a new VaultService instance
   * @param isServerSide Whether this service is being used on the server side
   */
  constructor(isServerSide = false) {
    this.isServerSide = isServerSide;
    this.supabase = isServerSide 
      ? createServerClient() 
      : createBrowserClient();
  }
  
  /**
   * Get a singleton instance of the VaultService
   * @param isServerSide Whether this service is being used on the server side
   * @returns VaultService instance
   */
  static getInstance(isServerSide = false): VaultService {
    return new VaultService(isServerSide);
  }
  
  // #region Master Vault Operations
  
  /**
   * Create a new master vault
   * @param name The name of the vault
   * @param description Optional description
   * @param ownerId Optional owner ID (defaults to current user)
   * @returns The created vault
   */
  async createMasterVault(name: string, description?: string, ownerId?: string): Promise<VaultMaster> {
    const userId = ownerId || (await this.supabase.auth.getUser()).data.user?.id;
    
    if (!userId) throw new Error('User ID is required to create a vault');
    
    const { data, error } = await this.supabase
      .from('vault_master')
      .insert({
        name,
        description,
        owner_id: userId
      })
      .select()
      .single();
      
    if (error) throw new Error(`Failed to create master vault: ${error.message}`);
    
    return this.mapMasterVaultFromDb(data);
  }
  
  /**
   * Get a master vault by ID
   * @param id The vault ID
   * @returns The vault
   */
  async getMasterVault(id: string): Promise<VaultMaster> {
    const { data, error } = await this.supabase
      .from('vault_master')
      .select()
      .eq('id', id)
      .single();
      
    if (error) throw new Error(`Failed to fetch master vault: ${error.message}`);
    
    return this.mapMasterVaultFromDb(data);
  }
  
  /**
   * Get all master vaults for the current user
   * @returns Array of vaults
   */
  async getUserMasterVaults(): Promise<VaultMaster[]> {
    const { data, error } = await this.supabase
      .from('vault_master')
      .select();
      
    if (error) throw new Error(`Failed to fetch user vaults: ${error.message}`);
    
    return data.map(this.mapMasterVaultFromDb);
  }
  
  /**
   * Update a master vault
   * @param id The vault ID
   * @param updates The fields to update
   * @returns The updated vault
   */
  async updateMasterVault(id: string, updates: Partial<VaultMaster>): Promise<VaultMaster> {
    const dbUpdates: any = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    
    const { data, error } = await this.supabase
      .from('vault_master')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw new Error(`Failed to update master vault: ${error.message}`);
    
    return this.mapMasterVaultFromDb(data);
  }
  
  // #endregion
  
  // #region Vault Account Operations
  
  /**
   * Create a new vault account
   * @param masterId Master vault ID
   * @param name Account name
   * @param type Account type
   * @param currency Currency code (default: USD)
   * @param options Additional options
   * @returns The created account
   */
  async createVaultAccount(
    masterId: string, 
    name: string, 
    type: VaultAccountType, 
    currency: string = 'USD',
    options?: {
      farmId?: string;
      agentId?: string;
      riskLevel?: 'low' | 'medium' | 'high';
      securityLevel?: 'standard' | 'enhanced' | 'maximum';
      address?: string;
    }
  ): Promise<VaultAccount> {
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .insert({
        master_id: masterId,
        name,
        type,
        currency,
        risk_level: options?.riskLevel || 'medium',
        security_level: options?.securityLevel || 'standard',
        farm_id: options?.farmId,
        agent_id: options?.agentId,
        address: options?.address
      })
      .select()
      .single();
      
    if (error) throw new Error(`Failed to create vault account: ${error.message}`);
    
    // Create default security policy
    await this.createSecurityPolicy(data.id);
    
    return this.mapVaultAccountFromDb(data);
  }
  
  /**
   * Get a vault account by ID
   * @param id Account ID
   * @returns The account
   */
  async getVaultAccount(id: string): Promise<VaultAccount> {
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .select()
      .eq('id', id)
      .single();
      
    if (error) throw new Error(`Failed to fetch vault account: ${error.message}`);
    
    return this.mapVaultAccountFromDb(data);
  }
  
  /**
   * Get all accounts in a master vault
   * @param masterId Master vault ID
   * @returns Array of accounts
   */
  async getVaultAccountsByMaster(masterId: string): Promise<VaultAccount[]> {
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .select()
      .eq('master_id', masterId);
      
    if (error) throw new Error(`Failed to fetch vault accounts: ${error.message}`);
    
    return data.map(this.mapVaultAccountFromDb);
  }
  
  /**
   * Get vault accounts by farm ID
   * @param farmId Farm ID
   * @returns Array of accounts
   */
  async getVaultAccountsByFarm(farmId: string): Promise<VaultAccount[]> {
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .select()
      .eq('farm_id', farmId);
      
    if (error) throw new Error(`Failed to fetch farm accounts: ${error.message}`);
    
    return data.map(this.mapVaultAccountFromDb);
  }
  
  /**
   * Get vault accounts by agent ID
   * @param agentId Agent ID
   * @returns Array of accounts
   */
  async getVaultAccountsByAgent(agentId: string): Promise<VaultAccount[]> {
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .select()
      .eq('agent_id', agentId);
      
    if (error) throw new Error(`Failed to fetch agent accounts: ${error.message}`);
    
    return data.map(this.mapVaultAccountFromDb);
  }
  
  /**
   * Update a vault account
   * @param id Account ID
   * @param updates The fields to update
   * @returns The updated account
   */
  async updateVaultAccount(id: string, updates: Partial<VaultAccount>): Promise<VaultAccount> {
    const dbUpdates: any = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    if (updates.riskLevel !== undefined) dbUpdates.risk_level = updates.riskLevel;
    if (updates.securityLevel !== undefined) dbUpdates.security_level = updates.securityLevel;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.farmId !== undefined) dbUpdates.farm_id = updates.farmId;
    if (updates.agentId !== undefined) dbUpdates.agent_id = updates.agentId;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.settings !== undefined) dbUpdates.settings = updates.settings;
    
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw new Error(`Failed to update vault account: ${error.message}`);
    
    return this.mapVaultAccountFromDb(data);
  }
  
  /**
   * Update locked amount for an account
   * @param id Account ID
   * @param lockedAmount New locked amount
   * @returns The updated account
   */
  async updateLockedAmount(id: string, lockedAmount: number): Promise<VaultAccount> {
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .update({ locked_amount: lockedAmount })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw new Error(`Failed to update locked amount: ${error.message}`);
    
    return this.mapVaultAccountFromDb(data);
  }
  
  // #endregion
  
  // #region Transaction Operations
  
  /**
   * Create a new transaction
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
    type: TransactionType;
    description?: string;
    reference?: string;
    network?: string;
    fee?: number;
    feeCurrency?: string;
    metadata?: Record<string, any>;
    approvalsRequired?: number;
  }): Promise<VaultTransaction> {
    const user = await this.supabase.auth.getUser();
    const userId = user.data.user?.id;
    
    if (!userId) throw new Error('User ID is required to create a transaction');
    
    const { data, error } = await this.supabase
      .from('vault_transactions')
      .insert({
        source_id: details.sourceId,
        source_type: details.sourceType,
        destination_id: details.destinationId,
        destination_type: details.destinationType,
        amount: details.amount,
        currency: details.currency,
        type: details.type,
        description: details.description,
        reference: details.reference,
        network: details.network,
        fee: details.fee,
        fee_currency: details.feeCurrency,
        metadata: details.metadata,
        approvals_required: details.approvalsRequired || 1,
        initiated_by: userId,
        status: TransactionStatus.PENDING
      })
      .select()
      .single();
      
    if (error) throw new Error(`Failed to create transaction: ${error.message}`);
    
    // Create audit log
    await this.createAuditLog({
      action: 'transaction.create',
      userId,
      transactionId: data.id,
      details: { transactionType: details.type, amount: details.amount, currency: details.currency },
      severity: 'info'
    });
    
    return this.mapTransactionFromDb(data);
  }
  
  /**
   * Get a transaction by ID
   * @param id Transaction ID
   * @returns The transaction
   */
  async getTransaction(id: string): Promise<VaultTransaction> {
    const { data, error } = await this.supabase
      .from('vault_transactions')
      .select()
      .eq('id', id)
      .single();
      
    if (error) throw new Error(`Failed to fetch transaction: ${error.message}`);
    
    return this.mapTransactionFromDb(data);
  }
  
  /**
   * Get transactions based on filter criteria
   * @param filter Filter criteria
   * @returns Array of transactions
   */
  async getTransactions(filter: TransactionFilter = {}): Promise<VaultTransaction[]> {
    let query = this.supabase
      .from('vault_transactions')
      .select();
      
    if (filter.accountId) {
      query = query.or(`source_id.eq.${filter.accountId},destination_id.eq.${filter.accountId}`);
    }
    
    if (filter.types && filter.types.length > 0) {
      query = query.in('type', filter.types);
    }
    
    if (filter.statuses && filter.statuses.length > 0) {
      query = query.in('status', filter.statuses);
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
      query = query.or(`description.ilike.%${filter.search}%,reference.ilike.%${filter.search}%`);
    }

    if (filter.limit) {
      query = query.limit(filter.limit);
    }

    if (filter.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1);
    }

    // Default ordering
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
      
    if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);
    
    return data.map(this.mapTransactionFromDb);
  }
  
  /**
   * Update a transaction's status
   * @param id Transaction ID
   * @param status New status
   * @param userId User making the update
   * @param note Optional note about the update
   * @returns The updated transaction
   */
  async updateTransactionStatus(
    id: string, 
    status: TransactionStatus, 
    userId: string,
    note?: string
  ): Promise<VaultTransaction> {
    // Get the current transaction
    const { data: currentTx, error: fetchError } = await this.supabase
      .from('vault_transactions')
      .select()
      .eq('id', id)
      .single();
      
    if (fetchError) throw new Error(`Failed to fetch transaction: ${fetchError.message}`);
    
    // Determine if we need to update balances
    const shouldUpdateBalances = 
      status === TransactionStatus.COMPLETED && 
      currentTx.status !== TransactionStatus.COMPLETED;
    
    // Update transaction status
    const updateData: any = { 
      status, 
      updated_at: new Date().toISOString() 
    };
    
    if (status === TransactionStatus.COMPLETED) {
      updateData.approved_by = userId;
      updateData.completed_at = new Date().toISOString();
      updateData.approvals_current = currentTx.approvals_required;
    }
    
    const { data, error } = await this.supabase
      .from('vault_transactions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw new Error(`Failed to update transaction status: ${error.message}`);
    
    // Create audit log
    await this.createAuditLog({
      action: 'transaction.status_update',
      userId,
      transactionId: id,
      details: { 
        oldStatus: currentTx.status, 
        newStatus: status, 
        note 
      },
      severity: 'info'
    });
    
    // If completed, update account balances
    if (shouldUpdateBalances) {
      await this.processCompletedTransaction(data);
    }
    
    return this.mapTransactionFromDb(data);
  }
  
  /**
   * Process a transaction that has been completed, updating account balances
   * @param transaction The completed transaction
   */
  private async processCompletedTransaction(transaction: any): Promise<void> {
    // Update source account (if internal)
    if (transaction.source_type === 'vault_account') {
      const { error: sourceError } = await this.supabase.rpc('update_vault_account_balance', {
        p_account_id: transaction.source_id,
        p_change_amount: -transaction.amount,
        p_transaction_id: transaction.id
      });
      
      if (sourceError) throw new Error(`Failed to update source account: ${sourceError.message}`);
    }
    
    // Update destination account (if internal)
    if (transaction.destination_type === 'vault_account') {
      const { error: destError } = await this.supabase.rpc('update_vault_account_balance', {
        p_account_id: transaction.destination_id,
        p_change_amount: transaction.amount,
        p_transaction_id: transaction.id
      });
      
      if (destError) throw new Error(`Failed to update destination account: ${destError.message}`);
    }
  }
  
  /**
   * Deposit funds into a vault account
   * @param accountId Account ID
   * @param amount Amount to deposit
   * @param currency Currency code
   * @param sourceType Source type (e.g., 'external_wallet', 'exchange')
   * @param sourceId Source ID
   * @param options Additional options
   * @returns The created transaction
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
    return this.createTransaction({
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
   * @param accountId Account ID
   * @param amount Amount to withdraw
   * @param currency Currency code
   * @param destinationType Destination type (e.g., 'external_wallet', 'exchange')
   * @param destinationId Destination ID
   * @param options Additional options
   * @returns The created transaction
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
    // First check if the account has sufficient funds
    const account = await this.getVaultAccount(accountId);
    
    if (account.balance - account.lockedAmount < amount) {
      throw new Error('Insufficient available funds for withdrawal');
    }
    
    // Then check security policy for withdrawal limits
    const securityPolicy = await this.getSecurityPolicy(accountId);
    
    // Check if approval is required based on amount
    const requiresApproval = amount >= securityPolicy.withdrawalRules.requireApprovalThreshold;
    const approvalsRequired = requiresApproval 
      ? options?.approvalsRequired || 1 
      : 0;
    
    // Create the withdrawal transaction
    return this.createTransaction({
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
   * @param fromAccountId Source account ID
   * @param toAccountId Destination account ID
   * @param amount Amount to transfer
   * @param currency Currency code
   * @param options Additional options
   * @returns The created transaction
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
    return this.createTransaction({
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
   * Allocate funds to a specific purpose (e.g., trading strategy)
   * @param accountId Account ID
   * @param amount Amount to allocate
   * @param currency Currency code
   * @param purpose Purpose of allocation (e.g., 'strategy_1')
   * @param options Additional options
   * @returns The created transaction
   */
  async allocate(
    accountId: string,
    amount: number,
    currency: string,
    purpose: string,
    options?: {
      description?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<VaultTransaction> {
    // Note: For allocations, we use the same account as source and destination
    // but record it as a special transaction type
    return this.createTransaction({
      sourceId: accountId,
      sourceType: 'vault_account',
      destinationId: accountId,
      destinationType: 'vault_account',
      amount,
      currency,
      type: TransactionType.ALLOCATION,
      description: options?.description || `Allocation for ${purpose}`,
      metadata: {
        ...options?.metadata,
        purpose,
        allocation_type: 'internal'
      }
    });
  }
  
  // #endregion
  
  // #region Balance Operations
  
  /**
   * Get the current balance for an account
   * @param accountId Account ID
   * @returns The account balance
   */
  async getBalance(accountId: string): Promise<VaultBalance> {
    const { data: account, error } = await this.supabase
      .from('vault_accounts')
      .select()
      .eq('id', accountId)
      .single();
    
    if (error) throw new Error(`Failed to fetch account: ${error.message}`);
    
    // Get pending transactions
    const { data: pendingTransactions } = await this.supabase
      .from('vault_transactions')
      .select()
      .or(`source_id.eq.${accountId},destination_id.eq.${accountId}`)
      .eq('status', TransactionStatus.PENDING);
    
    // Calculate pending amounts
    const pendingAmount = (pendingTransactions || []).reduce((sum, tx) => {
      if (tx.destination_id === accountId && tx.source_id !== accountId) {
        return sum + tx.amount; // Incoming
      } else if (tx.source_id === accountId && tx.destination_id !== accountId) {
        return sum - tx.amount; // Outgoing
      }
      return sum; // Internal transfer (no net change)
    }, 0);
    
    // Get historical balance data
    const { data: historyData } = await this.supabase
      .from('vault_balance_history')
      .select()
      .eq('account_id', accountId)
      .order('timestamp', { ascending: false })
      .limit(30);
    
    return {
      accountId,
      total: account.balance,
      available: account.balance - account.locked_amount,
      locked: account.locked_amount,
      pending: pendingAmount,
      currency: account.currency,
      lastUpdated: account.updated_at,
      historicalData: (historyData || []).map(h => ({
        timestamp: h.timestamp,
        balance: h.balance
      }))
    };
  }
  
  /**
   * Get balance history for an account
   * @param accountId Account ID
   * @param limit Number of records to retrieve
   * @param fromDate Start date
   * @param toDate End date
   * @returns Array of balance history records
   */
  async getBalanceHistory(
    accountId: string, 
    limit = 30,
    fromDate?: string,
    toDate?: string
  ): Promise<{ timestamp: string; balance: number }[]> {
    let query = this.supabase
      .from('vault_balance_history')
      .select()
      .eq('account_id', accountId)
      .order('timestamp', { ascending: false });
    
    if (fromDate) {
      query = query.gte('timestamp', fromDate);
    }
    
    if (toDate) {
      query = query.lte('timestamp', toDate);
    }
    
    query = query.limit(limit);
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Failed to fetch balance history: ${error.message}`);
    
    return data.map(item => ({
      timestamp: item.timestamp,
      balance: item.balance
    }));
  }
  
  // #endregion
  
  // #region Security Operations
  
  /**
   * Get the security policy for an account
   * @param accountId Account ID
   * @returns The security policy
   */
  async getSecurityPolicy(accountId: string): Promise<SecurityPolicy> {
    const { data, error } = await this.supabase
      .from('vault_security_policies')
      .select()
      .eq('account_id', accountId)
      .single();
      
    if (error) {
      // If policy doesn't exist, create default
      if (error.code === 'PGRST116') {
        return this.createSecurityPolicy(accountId);
      }
      throw new Error(`Failed to fetch security policy: ${error.message}`);
    }
    
    return this.mapSecurityPolicyFromDb(data);
  }
  
  /**
   * Create a default security policy for an account
   * @param accountId Account ID
   * @returns The created security policy
   */
  async createSecurityPolicy(accountId: string): Promise<SecurityPolicy> {
    const { data, error } = await this.supabase
      .from('vault_security_policies')
      .insert({
        account_id: accountId
      })
      .select()
      .single();
      
    if (error) throw new Error(`Failed to create security policy: ${error.message}`);
    
    return this.mapSecurityPolicyFromDb(data);
  }
  
  /**
   * Update a security policy
   * @param accountId Account ID
   * @param updates The fields to update
   * @returns The updated security policy
   */
  async updateSecurityPolicy(
    accountId: string, 
    updates: Partial<SecurityPolicy>
  ): Promise<SecurityPolicy> {
    // Convert from camelCase to snake_case
    const dbUpdates: any = {};
    
    if (updates.withdrawalRules) {
      dbUpdates.withdrawal_rules = updates.withdrawalRules;
    }
    
    if (updates.accessRules) {
      dbUpdates.access_rules = updates.accessRules;
    }
    
    if (updates.alertRules) {
      dbUpdates.alert_rules = updates.alertRules;
    }
    
    const { data, error } = await this.supabase
      .from('vault_security_policies')
      .update(dbUpdates)
      .eq('account_id', accountId)
      .select()
      .single();
      
    if (error) throw new Error(`Failed to update security policy: ${error.message}`);
    
    return this.mapSecurityPolicyFromDb(data);
  }
  
  // #endregion
  
  // #region Audit and Logging
  
  /**
   * Create an audit log entry
   * @param entry The audit log entry
   * @returns The created audit log entry
   */
  async createAuditLog(entry: {
    action: string;
    userId: string;
    accountId?: string;
    transactionId?: string;
    details?: Record<string, any>;
    severity?: 'info' | 'warning' | 'critical';
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLogEntry> {
    const { data, error } = await this.supabase
      .from('vault_audit_logs')
      .insert({
        action: entry.action,
        user_id: entry.userId,
        account_id: entry.accountId,
        transaction_id: entry.transactionId,
        details: entry.details,
        severity: entry.severity || 'info',
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent
      })
      .select()
      .single();
      
    if (error) throw new Error(`Failed to create audit log: ${error.message}`);
    
    return this.mapAuditLogFromDb(data);
  }
  
  /**
   * Get audit logs for a user
   * @param userId User ID
   * @param limit Number of records to retrieve
   * @param offset Offset for pagination
   * @returns Array of audit log entries
   */
  async getUserAuditLogs(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<AuditLogEntry[]> {
    const { data, error } = await this.supabase
      .from('vault_audit_logs')
      .select()
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);
    
    return data.map(this.mapAuditLogFromDb);
  }
  
  /**
   * Get audit logs for an account
   * @param accountId Account ID
   * @param limit Number of records to retrieve
   * @param offset Offset for pagination
   * @returns Array of audit log entries
   */
  async getAccountAuditLogs(
    accountId: string,
    limit = 50,
    offset = 0
  ): Promise<AuditLogEntry[]> {
    const { data, error } = await this.supabase
      .from('vault_audit_logs')
      .select()
      .eq('account_id', accountId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);
    
    return data.map(this.mapAuditLogFromDb);
  }
  
  // #endregion
  
  // #region Migration and Compatibility
  
  /**
   * Migrate existing wallets to the new vault system
   * @param userId User ID
   * @returns Statistics about the migration
   */
  async migrateWallets(userId: string): Promise<{
    masterVaultId: string;
    accountsCreated: number;
    transactionsMigrated: number;
  }> {
    // Create a master vault for the user
    const masterVault = await this.createMasterVault(
      'Migrated Master Vault',
      'Automatically created during wallet migration',
      userId
    );
    
    // Find all existing wallets for this user
    const { data: wallets, error: walletError } = await this.supabase
      .from('wallets')
      .select()
      .eq('owner_id', userId);
      
    if (walletError) throw new Error(`Failed to fetch wallets: ${walletError.message}`);
    
    if (!wallets || wallets.length === 0) {
      return {
        masterVaultId: masterVault.id,
        accountsCreated: 0,
        transactionsMigrated: 0
      };
    }
    
    // Create vault accounts for each wallet
    const accountMap = new Map<string, string>(); // old wallet ID -> new account ID
    
    for (const wallet of wallets) {
      const account = await this.createVaultAccount(
        masterVault.id,
        wallet.name,
        VaultAccountType.TRADING,
        wallet.currency,
        {
          farmId: wallet.farm_id,
          address: wallet.address,
          riskLevel: this.mapRiskLevel(wallet.status)
        }
      );
      
      // Update account balance
      if (wallet.balance > 0) {
        await this.supabase.rpc('update_vault_account_balance', {
          p_account_id: account.id,
          p_change_amount: wallet.balance,
          p_transaction_id: null
        });
      }
      
      accountMap.set(wallet.id, account.id);
    }
    
    // Migrate wallet transactions
    let transactionCount = 0;
    
    for (const [oldWalletId, newAccountId] of accountMap.entries()) {
      const { data: transactions, error: txError } = await this.supabase
        .from('wallet_transactions')
        .select()
        .eq('wallet_id', oldWalletId);
        
      if (txError) continue;
      
      if (!transactions || transactions.length === 0) continue;
      
      for (const tx of transactions) {
        const mapped = await this.migrateTransaction(tx, newAccountId, accountMap);
        if (mapped) transactionCount++;
      }
    }
    
    return {
      masterVaultId: masterVault.id,
      accountsCreated: accountMap.size,
      transactionsMigrated: transactionCount
    };
  }
  
  /**
   * Migrate a single transaction to the new vault system
   * @param oldTx The old transaction
   * @param newAccountId The new account ID
   * @param accountMap Map of old wallet IDs to new account IDs
   * @returns Whether the transaction was successfully migrated
   */
  private async migrateTransaction(
    oldTx: any, 
    newAccountId: string,
    accountMap: Map<string, string>
  ): Promise<boolean> {
    try {
      const txType = this.mapTransactionType(oldTx.type);
      
      // For external transactions (deposits/withdrawals)
      if (txType === TransactionType.DEPOSIT) {
        await this.createTransaction({
          sourceId: oldTx.source || 'external',
          sourceType: 'external_wallet',
          destinationId: newAccountId,
          destinationType: 'vault_account',
          amount: oldTx.amount,
          currency: oldTx.currency,
          type: txType,
          description: oldTx.note || `Migrated ${txType}`,
          reference: oldTx.tx_hash,
          fee: oldTx.fee,
          feeCurrency: oldTx.fee_currency,
          metadata: {
            migrated: true,
            original_id: oldTx.id,
            migration_date: new Date().toISOString()
          }
        });
        
        return true;
      } 
      else if (txType === TransactionType.WITHDRAWAL) {
        await this.createTransaction({
          sourceId: newAccountId,
          sourceType: 'vault_account',
          destinationId: oldTx.destination || 'external',
          destinationType: 'external_wallet',
          amount: oldTx.amount,
          currency: oldTx.currency,
          type: txType,
          description: oldTx.note || `Migrated ${txType}`,
          reference: oldTx.tx_hash,
          fee: oldTx.fee,
          feeCurrency: oldTx.fee_currency,
          metadata: {
            migrated: true,
            original_id: oldTx.id,
            migration_date: new Date().toISOString()
          }
        });
        
        return true;
      }
      // For internal transfers between wallets
      else if (txType === TransactionType.TRANSFER && oldTx.source && oldTx.destination) {
        const destAccountId = accountMap.get(oldTx.destination);
        
        if (destAccountId) {
          await this.createTransaction({
            sourceId: newAccountId,
            sourceType: 'vault_account',
            destinationId: destAccountId,
            destinationType: 'vault_account',
            amount: oldTx.amount,
            currency: oldTx.currency,
            type: txType,
            description: oldTx.note || `Migrated ${txType}`,
            reference: oldTx.tx_hash,
            fee: oldTx.fee,
            feeCurrency: oldTx.fee_currency,
            metadata: {
              migrated: true,
              original_id: oldTx.id,
              migration_date: new Date().toISOString()
            }
          });
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Failed to migrate transaction:', error);
      return false;
    }
  }
  
  /**
   * Map old wallet status to new risk level
   * @param status Old wallet status
   * @returns Risk level
   */
  private mapRiskLevel(status?: string): 'low' | 'medium' | 'high' {
    if (!status) return 'medium';
    
    switch (status.toLowerCase()) {
      case 'safe':
      case 'conservative':
        return 'low';
      case 'active':
      case 'trading':
        return 'medium';
      case 'high_risk':
      case 'aggressive':
        return 'high';
      default:
        return 'medium';
    }
  }
  
  /**
   * Map old transaction type to new transaction type
   * @param type Old transaction type
   * @returns Transaction type
   */
  private mapTransactionType(type?: string): TransactionType {
    if (!type) return TransactionType.TRANSFER;
    
    switch (type.toLowerCase()) {
      case 'deposit':
        return TransactionType.DEPOSIT;
      case 'withdrawal':
        return TransactionType.WITHDRAWAL;
      case 'transfer':
        return TransactionType.TRANSFER;
      case 'trade':
        return TransactionType.ALLOCATION;
      case 'fee':
        return TransactionType.FEE;
      case 'interest':
      case 'reward':
        return TransactionType.INTEREST;
      default:
        return TransactionType.TRANSFER;
    }
  }
  
  // #endregion
  
  // #region Helper Methods
  
  /**
   * Map database record to VaultMaster type
   * @param data Database record
   * @returns VaultMaster object
   */
  private mapMasterVaultFromDb(data: any): VaultMaster {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      totalBalance: data.total_balance,
      allocatedBalance: data.allocated_balance,
      reserveBalance: data.reserve_balance,
      highRiskExposure: data.high_risk_exposure,
      securityScore: data.security_score,
      status: data.status,
      ownerId: data.owner_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
  
  /**
   * Map database record to VaultAccount type
   * @param data Database record
   * @returns VaultAccount object
   */
  private mapVaultAccountFromDb(data: any): VaultAccount {
    return {
      id: data.id,
      masterId: data.master_id,
      name: data.name,
      type: data.type,
      balance: data.balance,
      lockedAmount: data.locked_amount,
      currency: data.currency,
      riskLevel: data.risk_level,
      address: data.address,
      farmId: data.farm_id,
      agentId: data.agent_id,
      securityLevel: data.security_level,
      isActive: data.is_active,
      settings: data.settings,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
  
  /**
   * Map database record to VaultTransaction type
   * @param data Database record
   * @returns VaultTransaction object
   */
  private mapTransactionFromDb(data: any): VaultTransaction {
    return {
      id: data.id,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      sourceId: data.source_id,
      sourceType: data.source_type,
      destinationId: data.destination_id,
      destinationType: data.destination_type,
      status: data.status,
      fee: data.fee,
      feeCurrency: data.fee_currency,
      hash: data.hash,
      reference: data.reference,
      description: data.description,
      network: data.network,
      confirmations: data.confirmations,
      approvalsRequired: data.approvals_required,
      approvalsCurrent: data.approvals_current,
      approverIds: data.approver_ids || [],
      metadata: data.metadata,
      initiatedBy: data.initiated_by,
      approvedBy: data.approved_by,
      createdAt: data.created_at,
      completedAt: data.completed_at,
      updatedAt: data.updated_at
    };
  }
  
  /**
   * Map database record to SecurityPolicy type
   * @param data Database record
   * @returns SecurityPolicy object
   */
  private mapSecurityPolicyFromDb(data: any): SecurityPolicy {
    return {
      id: data.id,
      accountId: data.account_id,
      withdrawalRules: data.withdrawal_rules,
      accessRules: data.access_rules,
      alertRules: data.alert_rules,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
  
  /**
   * Map database record to AuditLogEntry type
   * @param data Database record
   * @returns AuditLogEntry object
   */
  private mapAuditLogFromDb(data: any): AuditLogEntry {
    return {
      id: data.id,
      timestamp: data.timestamp,
      action: data.action,
      userId: data.user_id,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      accountId: data.account_id,
      transactionId: data.transaction_id,
      details: data.details,
      severity: data.severity
    };
  }
  
  // #endregion
}

// Export singleton instance
export const vaultService = new VaultService(); 