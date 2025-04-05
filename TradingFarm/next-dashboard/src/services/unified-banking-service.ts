import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export interface VaultAccount {
  id?: string;
  name: string;
  description?: string;
  balance?: number;
  account_type: 'master' | 'farm' | 'agent';
  parent_id?: string;
  farm_id?: string;
  agent_id?: string;
  security_level: 'standard' | 'multisig' | 'high';
  security_config?: Record<string, any>;
  status?: 'active' | 'inactive' | 'frozen';
  metadata?: Record<string, any>;
}

export interface Transaction {
  id?: string;
  transaction_type: 'deposit' | 'withdrawal' | 'transfer' | 'trade' | 'fee';
  amount: number;
  currency: string;
  source_account_id?: string;
  destination_account_id?: string;
  exchange_id?: string;
  status?: 'pending' | 'completed' | 'rejected' | 'failed';
  approval_status?: 'required' | 'approved' | 'rejected';
  approved_by?: string;
  approval_date?: Date;
  transaction_hash?: string;
  metadata?: Record<string, any>;
}

export interface TransactionApproval {
  id?: string;
  transaction_id: string;
  approver_id: string;
  approved: boolean;
  comments?: string;
}

export interface ExchangeIntegration {
  id?: string;
  name: string;
  exchange_type: string;
  status?: 'active' | 'inactive';
  credentials_id?: string;
  farm_id?: string;
  metadata?: Record<string, any>;
}

export interface AccountAlert {
  id?: string;
  account_id: string;
  alert_type: 'balance_threshold' | 'security' | 'transaction';
  threshold?: number;
  is_active?: boolean;
  notification_channels?: Record<string, any>;
}

export interface LegacyWalletMigration {
  id?: string;
  wallet_id: string;
  vault_account_id: string;
  migration_status?: 'pending' | 'completed' | 'failed';
  migration_date?: Date;
  error_details?: string;
}

export class UnifiedBankingService {
  private isMock: boolean = false;
  private mockAccounts: VaultAccount[] = [];
  private mockTransactions: Transaction[] = [];
  private mockApprovals: TransactionApproval[] = [];
  private mockExchanges: ExchangeIntegration[] = [];
  private mockAlerts: AccountAlert[] = [];
  private mockMigrations: LegacyWalletMigration[] = [];

  constructor(isMockMode: boolean = false) {
    this.isMock = isMockMode;
    
    // Initialize with sample data if in mock mode
    if (this.isMock) {
      this.initializeMockData();
    }
  }

  private initializeMockData() {
    // Retrieve from localStorage if available
    const storedAccounts = typeof window !== 'undefined' ? localStorage.getItem('mockVaultAccounts') : null;
    const storedTransactions = typeof window !== 'undefined' ? localStorage.getItem('mockTransactions') : null;
    
    if (storedAccounts) {
      this.mockAccounts = JSON.parse(storedAccounts);
    } else {
      // Create some sample accounts
      const masterAccount: VaultAccount = {
        id: uuidv4(),
        name: 'Master Account',
        description: 'Main account for all assets',
        balance: 10000,
        account_type: 'master',
        security_level: 'multisig',
        security_config: {
          required_approvals: 2
        },
        status: 'active'
      };
      
      const farmAccount: VaultAccount = {
        id: uuidv4(),
        name: 'Sample Farm Account',
        description: 'Account for trading farm operations',
        balance: 5000,
        account_type: 'farm',
        parent_id: masterAccount.id,
        security_level: 'standard',
        status: 'active'
      };
      
      const agentAccount: VaultAccount = {
        id: uuidv4(),
        name: 'Agent Account',
        description: 'Account for trading agent',
        balance: 1000,
        account_type: 'agent',
        parent_id: farmAccount.id,
        security_level: 'standard',
        status: 'active'
      };
      
      this.mockAccounts = [masterAccount, farmAccount, agentAccount];
      this.saveMockAccounts();
    }
    
    if (storedTransactions) {
      this.mockTransactions = JSON.parse(storedTransactions);
    } else {
      // Create some sample transactions
      const deposit: Transaction = {
        id: uuidv4(),
        transaction_type: 'deposit',
        amount: 1000,
        currency: 'USD',
        destination_account_id: this.mockAccounts[0]?.id,
        status: 'completed'
      };
      
      const transfer: Transaction = {
        id: uuidv4(),
        transaction_type: 'transfer',
        amount: 500,
        currency: 'USD',
        source_account_id: this.mockAccounts[0]?.id,
        destination_account_id: this.mockAccounts[1]?.id,
        status: 'completed'
      };
      
      this.mockTransactions = [deposit, transfer];
      this.saveMockTransactions();
    }
  }

  private saveMockAccounts() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mockVaultAccounts', JSON.stringify(this.mockAccounts));
    }
  }
  
  private saveMockTransactions() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mockTransactions', JSON.stringify(this.mockTransactions));
    }
  }

  // *** ACCOUNT MANAGEMENT ***
  
  async createAccount(accountData: VaultAccount): Promise<VaultAccount> {
    if (this.isMock) {
      const newAccount: VaultAccount = {
        ...accountData,
        id: uuidv4(),
        balance: accountData.balance || 0,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      this.mockAccounts.push(newAccount);
      this.saveMockAccounts();
      return newAccount;
    } else {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('vault_accounts')
        .insert([accountData])
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create account: ${error.message}`);
      }
      
      return data;
    }
  }
  
  async getAccounts(filters: { 
    account_type?: string;
    parent_id?: string;
    farm_id?: string;
    agent_id?: string;
  } = {}): Promise<VaultAccount[]> {
    if (this.isMock) {
      return this.mockAccounts.filter(account => {
        let match = true;
        
        if (filters.account_type && account.account_type !== filters.account_type) {
          match = false;
        }
        
        if (filters.parent_id && account.parent_id !== filters.parent_id) {
          match = false;
        }
        
        if (filters.farm_id && account.farm_id !== filters.farm_id) {
          match = false;
        }
        
        if (filters.agent_id && account.agent_id !== filters.agent_id) {
          match = false;
        }
        
        return match;
      });
    } else {
      const supabase = createBrowserClient();
      let query = supabase.from('vault_accounts').select('*');
      
      if (filters.account_type) {
        query = query.eq('account_type', filters.account_type);
      }
      
      if (filters.parent_id) {
        query = query.eq('parent_id', filters.parent_id);
      }
      
      if (filters.farm_id) {
        query = query.eq('farm_id', filters.farm_id);
      }
      
      if (filters.agent_id) {
        query = query.eq('agent_id', filters.agent_id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to fetch accounts: ${error.message}`);
      }
      
      return data || [];
    }
  }
  
  async getAccountById(accountId: string): Promise<VaultAccount | null> {
    if (this.isMock) {
      const account = this.mockAccounts.find(acc => acc.id === accountId);
      return account || null;
    } else {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('vault_accounts')
        .select('*')
        .eq('id', accountId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        throw new Error(`Failed to fetch account: ${error.message}`);
      }
      
      return data;
    }
  }
  
  async updateAccount(accountId: string, updates: Partial<VaultAccount>): Promise<VaultAccount> {
    if (this.isMock) {
      const index = this.mockAccounts.findIndex(acc => acc.id === accountId);
      
      if (index === -1) {
        throw new Error(`Account with ID ${accountId} not found`);
      }
      
      const updatedAccount = {
        ...this.mockAccounts[index],
        ...updates,
        updated_at: new Date()
      };
      
      this.mockAccounts[index] = updatedAccount;
      this.saveMockAccounts();
      
      return updatedAccount;
    } else {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('vault_accounts')
        .update(updates)
        .eq('id', accountId)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to update account: ${error.message}`);
      }
      
      return data;
    }
  }

  // *** TRANSACTION MANAGEMENT ***
  
  async createTransaction(transactionData: Transaction): Promise<Transaction> {
    if (this.isMock) {
      const newTransaction: Transaction = {
        ...transactionData,
        id: uuidv4(),
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // For mock mode, let's simulate the transaction processing
      if (newTransaction.transaction_type === 'transfer' && 
          newTransaction.source_account_id && 
          newTransaction.destination_account_id) {
        
        // Check if source account has enough balance
        const sourceAccount = this.mockAccounts.find(acc => acc.id === newTransaction.source_account_id);
        if (sourceAccount && sourceAccount.balance !== undefined && sourceAccount.balance >= newTransaction.amount) {
          // Update source account balance
          const sourceIndex = this.mockAccounts.findIndex(acc => acc.id === newTransaction.source_account_id);
          this.mockAccounts[sourceIndex].balance! -= newTransaction.amount;
          
          // Update destination account balance
          const destIndex = this.mockAccounts.findIndex(acc => acc.id === newTransaction.destination_account_id);
          this.mockAccounts[destIndex].balance! += newTransaction.amount;
          
          newTransaction.status = 'completed';
          this.saveMockAccounts();
        } else {
          newTransaction.status = 'failed';
        }
      } else if (newTransaction.transaction_type === 'deposit' && newTransaction.destination_account_id) {
        // Handle deposit
        const destIndex = this.mockAccounts.findIndex(acc => acc.id === newTransaction.destination_account_id);
        this.mockAccounts[destIndex].balance! += newTransaction.amount;
        newTransaction.status = 'completed';
        this.saveMockAccounts();
      } else if (newTransaction.transaction_type === 'withdrawal' && newTransaction.source_account_id) {
        // Handle withdrawal
        const sourceAccount = this.mockAccounts.find(acc => acc.id === newTransaction.source_account_id);
        if (sourceAccount && sourceAccount.balance !== undefined && sourceAccount.balance >= newTransaction.amount) {
          const sourceIndex = this.mockAccounts.findIndex(acc => acc.id === newTransaction.source_account_id);
          this.mockAccounts[sourceIndex].balance! -= newTransaction.amount;
          newTransaction.status = 'completed';
          this.saveMockAccounts();
        } else {
          newTransaction.status = 'failed';
        }
      }
      
      this.mockTransactions.push(newTransaction);
      this.saveMockTransactions();
      
      return newTransaction;
    } else {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('unified_transactions')
        .insert([transactionData])
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create transaction: ${error.message}`);
      }
      
      return data;
    }
  }
  
  async getTransactions(filters: {
    transaction_type?: string;
    source_account_id?: string;
    destination_account_id?: string;
    status?: string;
  } = {}): Promise<Transaction[]> {
    if (this.isMock) {
      return this.mockTransactions.filter(transaction => {
        let match = true;
        
        if (filters.transaction_type && transaction.transaction_type !== filters.transaction_type) {
          match = false;
        }
        
        if (filters.source_account_id && transaction.source_account_id !== filters.source_account_id) {
          match = false;
        }
        
        if (filters.destination_account_id && transaction.destination_account_id !== filters.destination_account_id) {
          match = false;
        }
        
        if (filters.status && transaction.status !== filters.status) {
          match = false;
        }
        
        return match;
      });
    } else {
      const supabase = createBrowserClient();
      let query = supabase.from('unified_transactions').select('*');
      
      if (filters.transaction_type) {
        query = query.eq('transaction_type', filters.transaction_type);
      }
      
      if (filters.source_account_id) {
        query = query.eq('source_account_id', filters.source_account_id);
      }
      
      if (filters.destination_account_id) {
        query = query.eq('destination_account_id', filters.destination_account_id);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to fetch transactions: ${error.message}`);
      }
      
      return data || [];
    }
  }
  
  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    if (this.isMock) {
      const transaction = this.mockTransactions.find(tx => tx.id === transactionId);
      return transaction || null;
    } else {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('unified_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        throw new Error(`Failed to fetch transaction: ${error.message}`);
      }
      
      return data;
    }
  }
  
  async approveTransaction(transactionId: string, approverId: string, approve: boolean, comments?: string): Promise<TransactionApproval> {
    if (this.isMock) {
      // Check if transaction exists
      const transaction = this.mockTransactions.find(tx => tx.id === transactionId);
      if (!transaction) {
        throw new Error(`Transaction with ID ${transactionId} not found`);
      }
      
      // Check if approval already exists
      const existingApprovalIndex = this.mockApprovals.findIndex(
        approval => approval.transaction_id === transactionId && approval.approver_id === approverId
      );
      
      let approval: TransactionApproval;
      
      if (existingApprovalIndex >= 0) {
        // Update existing approval
        approval = {
          ...this.mockApprovals[existingApprovalIndex],
          approved: approve,
          comments
        };
        this.mockApprovals[existingApprovalIndex] = approval;
      } else {
        // Create new approval
        approval = {
          id: uuidv4(),
          transaction_id: transactionId,
          approver_id: approverId,
          approved: approve,
          comments
        };
        this.mockApprovals.push(approval);
      }
      
      // Check if we have enough approvals to process the transaction
      if (approve) {
        const approvalCount = this.mockApprovals.filter(
          a => a.transaction_id === transactionId && a.approved
        ).length;
        
        // In mock mode, we'll assume 2 approvals are required for multi-sig
        if (approvalCount >= 2) {
          const txIndex = this.mockTransactions.findIndex(tx => tx.id === transactionId);
          if (txIndex >= 0) {
            // Process the transaction
            const tx = this.mockTransactions[txIndex];
            
            if (tx.transaction_type === 'transfer' && tx.source_account_id && tx.destination_account_id) {
              // Update source account balance
              const sourceIndex = this.mockAccounts.findIndex(acc => acc.id === tx.source_account_id);
              this.mockAccounts[sourceIndex].balance! -= tx.amount;
              
              // Update destination account balance
              const destIndex = this.mockAccounts.findIndex(acc => acc.id === tx.destination_account_id);
              this.mockAccounts[destIndex].balance! += tx.amount;
              
              // Update transaction status
              this.mockTransactions[txIndex].status = 'completed';
              this.mockTransactions[txIndex].approval_status = 'approved';
              this.mockTransactions[txIndex].approved_by = approverId;
              
              this.saveMockAccounts();
              this.saveMockTransactions();
            }
          }
        }
      }
      
      return approval;
    } else {
      const supabase = createBrowserClient();
      
      // Check if approval already exists
      const { data: existingApproval } = await supabase
        .from('transaction_approvals')
        .select('*')
        .eq('transaction_id', transactionId)
        .eq('approver_id', approverId)
        .maybeSingle();
      
      let result;
      
      if (existingApproval) {
        // Update existing approval
        const { data, error } = await supabase
          .from('transaction_approvals')
          .update({
            approved: approve,
            comments,
            approval_date: new Date()
          })
          .eq('id', existingApproval.id)
          .select()
          .single();
          
        if (error) {
          throw new Error(`Failed to update approval: ${error.message}`);
        }
        
        result = data;
      } else {
        // Create new approval
        const { data, error } = await supabase
          .from('transaction_approvals')
          .insert([{
            transaction_id: transactionId,
            approver_id: approverId,
            approved: approve,
            comments
          }])
          .select()
          .single();
        
        if (error) {
          throw new Error(`Failed to create approval: ${error.message}`);
        }
        
        result = data;
      }
      
      return result;
    }
  }

  // *** EXCHANGE INTEGRATION ***
  
  async addExchangeIntegration(integrationData: ExchangeIntegration): Promise<ExchangeIntegration> {
    if (this.isMock) {
      const newIntegration: ExchangeIntegration = {
        ...integrationData,
        id: uuidv4(),
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      this.mockExchanges.push(newIntegration);
      return newIntegration;
    } else {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('exchange_integrations')
        .insert([integrationData])
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to add exchange integration: ${error.message}`);
      }
      
      return data;
    }
  }
  
  async getExchangeIntegrations(farmId?: string): Promise<ExchangeIntegration[]> {
    if (this.isMock) {
      if (farmId) {
        return this.mockExchanges.filter(integration => integration.farm_id === farmId);
      }
      return this.mockExchanges;
    } else {
      const supabase = createBrowserClient();
      let query = supabase.from('exchange_integrations').select('*');
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to fetch exchange integrations: ${error.message}`);
      }
      
      return data || [];
    }
  }

  // *** ACCOUNT ALERTS ***
  
  async createAccountAlert(alertData: AccountAlert): Promise<AccountAlert> {
    if (this.isMock) {
      const newAlert: AccountAlert = {
        ...alertData,
        id: uuidv4(),
        is_active: alertData.is_active !== undefined ? alertData.is_active : true,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      this.mockAlerts.push(newAlert);
      return newAlert;
    } else {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('account_alerts')
        .insert([alertData])
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create account alert: ${error.message}`);
      }
      
      return data;
    }
  }
  
  async getAccountAlerts(accountId: string): Promise<AccountAlert[]> {
    if (this.isMock) {
      return this.mockAlerts.filter(alert => alert.account_id === accountId);
    } else {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('account_alerts')
        .select('*')
        .eq('account_id', accountId);
      
      if (error) {
        throw new Error(`Failed to fetch account alerts: ${error.message}`);
      }
      
      return data || [];
    }
  }

  // *** LEGACY WALLET MIGRATION ***
  
  async migrateLegacyWallet(walletId: string, vaultAccountId: string): Promise<LegacyWalletMigration> {
    if (this.isMock) {
      const migration: LegacyWalletMigration = {
        id: uuidv4(),
        wallet_id: walletId,
        vault_account_id: vaultAccountId,
        migration_status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Simulate migration process
      setTimeout(() => {
        const index = this.mockMigrations.findIndex(m => m.id === migration.id);
        if (index >= 0) {
          this.mockMigrations[index] = {
            ...this.mockMigrations[index],
            migration_status: 'completed',
            migration_date: new Date(),
            updated_at: new Date()
          };
        }
      }, 2000);
      
      this.mockMigrations.push(migration);
      return migration;
    } else {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('legacy_wallet_migrations')
        .insert([{
          wallet_id: walletId,
          vault_account_id: vaultAccountId,
          migration_status: 'pending'
        }])
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to initiate legacy wallet migration: ${error.message}`);
      }
      
      return data;
    }
  }
  
  async getMigrationStatus(migrationId: string): Promise<LegacyWalletMigration | null> {
    if (this.isMock) {
      const migration = this.mockMigrations.find(m => m.id === migrationId);
      return migration || null;
    } else {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('legacy_wallet_migrations')
        .select('*')
        .eq('id', migrationId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        throw new Error(`Failed to fetch migration status: ${error.message}`);
      }
      
      return data;
    }
  }

  // *** SERVER-SIDE OPERATIONS ***
  
  static async createServerService(): Promise<UnifiedBankingService> {
    // This method is for server components
    const service = new UnifiedBankingService(false);
    return service;
  }

  // Server-side methods for processing operations
  static async processTransaction(transactionId: string): Promise<boolean> {
    try {
      const supabase = await createServerClient();
      const { data, error } = await supabase.rpc('process_transaction', {
        transaction_id: transactionId
      });
      
      if (error) {
        console.error('Error processing transaction:', error);
        return false;
      }
      
      return data;
    } catch (error) {
      console.error('Error processing transaction:', error);
      return false;
    }
  }
  
  // Add additional methods as needed
}

// Helper function to determine if we should use mock mode
export function createUnifiedBankingService(): UnifiedBankingService {
  const forceMockMode = process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true';
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  
  return new UnifiedBankingService(forceMockMode || isDemoMode);
}

export default createUnifiedBankingService;
