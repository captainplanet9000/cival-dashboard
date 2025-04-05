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
import { CONFIG } from '@/config/mockConfig';

// Legacy wallet types (for migration support)
export interface LegacyWallet {
  id: string | number;
  name: string;
  balance: number;
  currency: string;
  address?: string;
  farm_id?: string | number;
  user_id?: string;
  wallet_type?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Unified Banking Service
 * 
 * This service consolidates all banking operations for the Trading Farm,
 * combining the functionality of VaultService and BankingService into
 * a single, consistent API.
 */
export class UnifiedBankingService {
  private supabase;
  private isServerSide: boolean;
  
  /**
   * Create a new UnifiedBankingService instance
   * @param isServerSide Whether this service is being used on the server side
   */
  constructor(isServerSide = false) {
    this.isServerSide = isServerSide;
    this.supabase = isServerSide 
      ? createServerClient() 
      : createBrowserClient();
  }
  
  /**
   * Get a singleton instance of the UnifiedBankingService
   * @param isServerSide Whether this service is being used on the server side
   * @returns UnifiedBankingService instance
   */
  static getInstance(isServerSide = false): UnifiedBankingService {
    return new UnifiedBankingService(isServerSide);
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
   * Get all master vaults for a user
   * @param ownerId The owner's user ID (defaults to current user)
   * @returns List of vaults
   */
  async getMasterVaultsByOwner(ownerId?: string): Promise<VaultMaster[]> {
    const userId = ownerId || (await this.supabase.auth.getUser()).data.user?.id;
    
    if (!userId) throw new Error('User ID is required to fetch vaults');
    
    const { data, error } = await this.supabase
      .from('vault_master')
      .select()
      .eq('owner_id', userId);
      
    if (error) throw new Error(`Failed to fetch master vaults: ${error.message}`);
    
    return data.map(this.mapMasterVaultFromDb);
  }
  
  /**
   * Get system-wide balance summary
   * @returns Balance summary across all accounts
   */
  async getBalanceSummary(): Promise<{
    totalBalance: number;
    allocatedToFarms: number;
    allocatedToAgents: number;
    reserveBalance: number;
    pendingTransactions: number;
  }> {
    // Get all master vaults
    const { data: vaultData, error: vaultError } = await this.supabase
      .from('vault_master')
      .select('id, total_balance, allocated_balance, reserve_balance');
      
    if (vaultError) throw new Error(`Failed to fetch vault data: ${vaultError.message}`);
    
    // Get account balances for farms and agents
    const { data: accountData, error: accountError } = await this.supabase
      .from('vault_accounts')
      .select('balance, type');
      
    if (accountError) throw new Error(`Failed to fetch account data: ${accountError.message}`);
    
    // Get pending transaction totals
    const { data: txData, error: txError } = await this.supabase
      .from('vault_transactions')
      .select('amount')
      .eq('status', TransactionStatus.PENDING);
      
    if (txError) throw new Error(`Failed to fetch transaction data: ${txError.message}`);
    
    // Calculate totals
    const totalBalance = vaultData.reduce((sum, vault) => sum + (vault.total_balance || 0), 0);
    const allocatedToFarms = accountData
      .filter(acc => acc.type === VaultAccountType.TRADING)
      .reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const allocatedToAgents = accountData
      .filter(acc => acc.type === VaultAccountType.STAKING)
      .reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const reserveBalance = vaultData.reduce((sum, vault) => sum + (vault.reserve_balance || 0), 0);
    const pendingTransactions = txData.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    return {
      totalBalance,
      allocatedToFarms,
      allocatedToAgents,
      reserveBalance,
      pendingTransactions,
    };
  }
  
  // #endregion
  
  // #region Account Operations
  
  /**
   * Create a new account
   * @param masterId Master vault ID
   * @param name Account name
   * @param type Account type
   * @param options Additional options
   * @returns The created account
   */
  async createAccount(
    masterId: string,
    name: string,
    type: VaultAccountType | string,
    options?: {
      currency?: string;
      initialBalance?: number;
      farmId?: string;
      agentId?: string;
      riskLevel?: 'low' | 'medium' | 'high';
      securityLevel?: 'standard' | 'enhanced' | 'maximum';
      address?: string;
      settings?: Record<string, any>;
    }
  ): Promise<VaultAccount> {
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .insert({
        master_id: masterId,
        name,
        type,
        balance: options?.initialBalance || 0,
        locked_amount: 0,
        currency: options?.currency || 'USD',
        risk_level: options?.riskLevel || 'medium',
        address: options?.address,
        farm_id: options?.farmId,
        agent_id: options?.agentId,
        security_level: options?.securityLevel || 'standard',
        is_active: true,
        settings: options?.settings || {
          twoFactorRequired: false,
          withdrawalLimit: 1000,
          withdrawalTimelock: 0,
          approvalRequired: false,
          allowExternalTransfers: true
        }
      })
      .select()
      .single();
      
    if (error) throw new Error(`Failed to create account: ${error.message}`);
    
    // If initial balance > 0, create a deposit transaction
    if (options?.initialBalance && options.initialBalance > 0) {
      await this.createTransaction({
        sourceId: masterId,
        sourceType: 'vault_master',
        destinationId: data.id,
        destinationType: 'vault_account',
        amount: options.initialBalance,
        currency: data.currency,
        type: TransactionType.ALLOCATION,
        description: `Initial allocation to ${name}`,
        status: TransactionStatus.COMPLETED
      });
      
      // Update the master vault balance
      await this.supabase
        .from('vault_master')
        .update({
          allocated_balance: this.supabase.rpc('increment', { 
            row_id: masterId,
            table_name: 'vault_master',
            column_name: 'allocated_balance',
            increment_amount: options.initialBalance
          }),
          reserve_balance: this.supabase.rpc('decrement', { 
            row_id: masterId,
            table_name: 'vault_master',
            column_name: 'reserve_balance',
            increment_amount: options.initialBalance
          })
        })
        .eq('id', masterId);
    }
    
    return this.mapVaultAccountFromDb(data);
  }
  
  /**
   * Get an account by ID
   * @param id Account ID
   * @returns The account
   */
  async getAccount(id: string): Promise<VaultAccount> {
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .select()
      .eq('id', id)
      .single();
      
    if (error) throw new Error(`Failed to fetch account: ${error.message}`);
    
    return this.mapVaultAccountFromDb(data);
  }
  
  /**
   * Get accounts by master vault ID
   * @param masterId Master vault ID
   * @returns List of accounts
   */
  async getAccountsByMaster(masterId: string): Promise<VaultAccount[]> {
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .select()
      .eq('master_id', masterId);
      
    if (error) throw new Error(`Failed to fetch accounts: ${error.message}`);
    
    return data.map(this.mapVaultAccountFromDb);
  }
  
  /**
   * Get accounts by farm ID
   * @param farmId Farm ID
   * @returns List of accounts
   */
  async getAccountsByFarm(farmId: string): Promise<VaultAccount[]> {
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .select()
      .eq('farm_id', farmId);
      
    if (error) throw new Error(`Failed to fetch farm accounts: ${error.message}`);
    
    return data.map(this.mapVaultAccountFromDb);
  }
  
  /**
   * Get accounts by agent ID
   * @param agentId Agent ID
   * @returns List of accounts
   */
  async getAccountsByAgent(agentId: string): Promise<VaultAccount[]> {
    const { data, error } = await this.supabase
      .from('vault_accounts')
      .select()
      .eq('agent_id', agentId);
      
    if (error) throw new Error(`Failed to fetch agent accounts: ${error.message}`);
    
    return data.map(this.mapVaultAccountFromDb);
  }
  
  /**
   * Get account balance details
   * @param accountId Account ID
   * @returns Balance details
   */
  async getAccountBalance(accountId: string): Promise<VaultBalance> {
    // Get account details
    const account = await this.getAccount(accountId);
    
    // Get pending transactions
    const { data: pendingTxns, error } = await this.supabase
      .from('vault_transactions')
      .select('amount, source_id, destination_id')
      .or(`source_id.eq.${accountId},destination_id.eq.${accountId}`)
      .eq('status', TransactionStatus.PENDING);
      
    if (error) throw new Error(`Failed to fetch pending transactions: ${error.message}`);
    
    // Calculate pending amounts
    const pendingOut = pendingTxns
      .filter(tx => tx.source_id === accountId)
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const pendingIn = pendingTxns
      .filter(tx => tx.destination_id === accountId)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    return {
      accountId,
      total: account.balance,
      available: account.balance - account.lockedAmount - pendingOut,
      locked: account.lockedAmount,
      pending: pendingIn - pendingOut,
      currency: account.currency,
      lastUpdated: new Date().toISOString(),
      historicalData: await this.getAccountBalanceHistory(accountId)
    };
  }
  
  /**
   * Get historical balance data for an account
   * @param accountId Account ID
   * @returns Array of historical balance points
   */
  private async getAccountBalanceHistory(accountId: string): Promise<{ timestamp: string, balance: number }[]> {
    // In a real implementation, this would fetch from a time-series table or calculate from transactions
    // For this example, we'll generate some mock data
    const now = new Date();
    const history = [];
    
    // Generate 30 days of data
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      history.push({
        timestamp: date.toISOString(),
        // Random variation around the current balance for demo purposes
        balance: 10000 + Math.random() * 5000
      });
    }
    
    return history;
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
    status?: TransactionStatus;
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
        status: details.status || TransactionStatus.PENDING
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
    
    // If the transaction is already completed, process the balance changes
    if (details.status === TransactionStatus.COMPLETED) {
      await this.processCompletedTransaction(data);
    }
    
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
   * Get transactions with filtering
   * @param filter Filter criteria
   * @returns List of transactions
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
   * Process a completed transaction, updating account balances
   * @param transaction The transaction to process
   */
  private async processCompletedTransaction(transaction: any): Promise<void> {
    // Update source account balance if it's a vault account
    if (transaction.source_type === 'vault_account') {
      await this.supabase
        .from('vault_accounts')
        .update({
          balance: this.supabase.rpc('decrement', { 
            row_id: transaction.source_id,
            table_name: 'vault_accounts',
            column_name: 'balance',
            increment_amount: transaction.amount
          })
        })
        .eq('id', transaction.source_id);
    }
    
    // Update destination account balance if it's a vault account
    if (transaction.destination_type === 'vault_account') {
      await this.supabase
        .from('vault_accounts')
        .update({
          balance: this.supabase.rpc('increment', { 
            row_id: transaction.destination_id,
            table_name: 'vault_accounts',
            column_name: 'balance',
            increment_amount: transaction.amount
          })
        })
        .eq('id', transaction.destination_id);
    }
    
    // Update master vault balance if needed
    if (transaction.source_type === 'vault_master' || transaction.destination_type === 'vault_master') {
      // For brevity, we're simplifying this logic. In a real implementation,
      // you would need to handle various scenarios like transfers between vaults.
      // This would also update allocated_balance, reserve_balance, etc.
    }
  }
  
  // #endregion
  
  // #region Wallet Migration Support
  
  /**
   * Migrate a legacy wallet to a vault account
   * @param legacyWallet The legacy wallet to migrate
   * @param masterId The master vault ID to assign the new account to
   * @returns The newly created vault account
   */
  async migrateLegacyWallet(
    legacyWallet: LegacyWallet, 
    masterId: string
  ): Promise<VaultAccount> {
    // Determine the account type based on wallet type or other properties
    let accountType: VaultAccountType;
    
    if (legacyWallet.wallet_type === 'trading') {
      accountType = VaultAccountType.TRADING;
    } else if (legacyWallet.wallet_type === 'staking') {
      accountType = VaultAccountType.STAKING;
    } else if (legacyWallet.wallet_type === 'reserve') {
      accountType = VaultAccountType.RESERVE;
    } else {
      accountType = VaultAccountType.TRADING; // Default type
    }
    
    // Create a new vault account
    const account = await this.createAccount(
      masterId,
      legacyWallet.name,
      accountType,
      {
        initialBalance: legacyWallet.balance,
        currency: legacyWallet.currency || 'USD',
        farmId: legacyWallet.farm_id?.toString(),
        address: legacyWallet.address,
        settings: {
          migratedFromLegacy: true,
          legacyWalletId: legacyWallet.id.toString(),
          migrationDate: new Date().toISOString()
        }
      }
    );
    
    // Create an audit log entry for the migration
    await this.createAuditLog({
      action: 'wallet.migration',
      accountId: account.id,
      details: { 
        legacyWalletId: legacyWallet.id,
        originalBalance: legacyWallet.balance,
        migratedBalance: account.balance
      },
      severity: 'info'
    });
    
    return account;
  }
  
  // #endregion
  
  // #region Security Operations
  
  /**
   * Get security policy for an account
   * @param accountId Account ID
   * @returns Security policy
   */
  async getSecurityPolicy(accountId: string): Promise<SecurityPolicy> {
    const { data, error } = await this.supabase
      .from('security_policies')
      .select()
      .eq('account_id', accountId)
      .single();
      
    if (error) {
      // If no policy exists, create a default one
      if (error.code === 'PGRST116') {
        return this.createDefaultSecurityPolicy(accountId);
      }
      throw new Error(`Failed to fetch security policy: ${error.message}`);
    }
    
    return this.mapSecurityPolicyFromDb(data);
  }
  
  /**
   * Create a default security policy for an account
   * @param accountId Account ID
   * @returns Default security policy
   */
  private async createDefaultSecurityPolicy(accountId: string): Promise<SecurityPolicy> {
    const defaultPolicy = {
      account_id: accountId,
      withdrawal_rules: {
        requireApprovalThreshold: 1000,
        dailyLimit: 10000,
        monthlyLimit: 50000,
        allowedAddresses: [],
        blockedAddresses: [],
        timelock: 0
      },
      access_rules: {
        allowedIpAddresses: [],
        allowedCountries: [],
        twoFactorRequired: false,
        allowedDevices: [],
        deviceVerification: false,
        passwordRequiredForHighValueTx: true
      },
      alert_rules: {
        alertOnLogin: true,
        alertOnHighValueTx: true,
        alertOnSuspiciousTx: true,
        alertThreshold: 5000,
        alertEmail: null,
        alertPhone: null
      }
    };
    
    const { data, error } = await this.supabase
      .from('security_policies')
      .insert(defaultPolicy)
      .select()
      .single();
      
    if (error) throw new Error(`Failed to create default security policy: ${error.message}`);
    
    return this.mapSecurityPolicyFromDb(data);
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
    // Get existing policy first
    const existingPolicy = await this.getSecurityPolicy(accountId);
    
    // Build update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    
    // Handle withdrawal rules updates
    if (updates.withdrawalRules) {
      updateData.withdrawal_rules = {
        ...existingPolicy.withdrawalRules,
        ...updates.withdrawalRules
      };
    }
    
    // Handle access rules updates
    if (updates.accessRules) {
      updateData.access_rules = {
        ...existingPolicy.accessRules,
        ...updates.accessRules
      };
    }
    
    // Handle alert rules updates
    if (updates.alertRules) {
      updateData.alert_rules = {
        ...existingPolicy.alertRules,
        ...updates.alertRules
      };
    }
    
    // Update the policy
    const { data, error } = await this.supabase
      .from('security_policies')
      .update(updateData)
      .eq('account_id', accountId)
      .select()
      .single();
      
    if (error) throw new Error(`Failed to update security policy: ${error.message}`);
    
    return this.mapSecurityPolicyFromDb(data);
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
    const user = entry.userId 
      ? { data: { user: { id: entry.userId } } }
      : await this.supabase.auth.getUser();
    
    const { data, error } = await this.supabase
      .from('audit_logs')
      .insert({
        timestamp: new Date().toISOString(),
        action: entry.action,
        user_id: user.data.user?.id,
        account_id: entry.accountId,
        transaction_id: entry.transactionId,
        details: entry.details,
        severity: entry.severity || 'info',
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent
      })
      .select('id')
      .single();
      
    if (error) throw new Error(`Failed to create audit log: ${error.message}`);
    
    return data.id;
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
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select()
      .eq('account_id', accountId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);
    
    return data.map(this.mapAuditLogFromDb);
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
export const unifiedBankingService = new UnifiedBankingService(); 