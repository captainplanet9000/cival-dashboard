/**
 * Vault Banking Client
 * 
 * Provides an interface for interacting with the Vault Banking System
 * Handles account management, transactions, and balance tracking
 */

import { ApiGateway, ApiServiceType, ApiResponse } from '../api-gateway';
import { MonitoringService } from '../monitoring-service';

// Account types
export type AccountType = 'main' | 'trading' | 'savings' | 'staking';
export type Currency = 'USD' | 'BTC' | 'ETH' | 'USDT' | 'USDC' | string;
export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'interest' | 'reward';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'canceled';

// Account structure
export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balances: AccountBalance[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

// Account balance
export interface AccountBalance {
  currency: Currency;
  available: number;
  locked: number;
  total: number;
  updatedAt: string;
}

// Transaction
export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  currency: Currency;
  amount: number;
  fee: number;
  status: TransactionStatus;
  timestamp: string;
  description?: string;
  metadata?: Record<string, any>;
}

// Transaction request
export interface TransactionRequest {
  accountId: string;
  type: TransactionType;
  currency: Currency;
  amount: number;
  description?: string;
  metadata?: Record<string, any>;
}

// Account summary
export interface AccountSummary {
  totalBalance: number; // In USD equivalent
  accounts: {
    id: string;
    name: string;
    type: AccountType;
    balance: number; // In USD equivalent
  }[];
}

export class VaultBankingClient {
  private static instance: VaultBankingClient;
  private apiGateway: ApiGateway;
  private accounts: Map<string, Account> = new Map();
  
  private constructor() {
    this.apiGateway = ApiGateway.getInstance();
  }
  
  // Singleton pattern
  public static getInstance(): VaultBankingClient {
    if (!VaultBankingClient.instance) {
      VaultBankingClient.instance = new VaultBankingClient();
    }
    return VaultBankingClient.instance;
  }
  
  /**
   * Get all accounts for the current user
   */
  public async getAccounts(): Promise<ApiResponse<Account[]>> {
    try {
      const response = await this.apiGateway.serviceRequest<Account[]>(
        ApiServiceType.VAULT,
        '/accounts',
        {
          method: 'GET',
          requireAuth: true,
          useCache: true,
          cacheTime: 60000 // Cache for 1 minute
        }
      );
      
      // Update accounts cache
      if (response.data) {
        response.data.forEach(account => {
          this.accounts.set(account.id, account);
        });
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to get accounts from Vault Banking',
        data: { error }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get a specific account by ID
   */
  public async getAccount(accountId: string): Promise<ApiResponse<Account>> {
    try {
      // Check cache first
      const cachedAccount = this.accounts.get(accountId);
      if (cachedAccount) {
        return {
          data: cachedAccount,
          error: null,
          status: 200,
          cached: true
        };
      }
      
      const response = await this.apiGateway.serviceRequest<Account>(
        ApiServiceType.VAULT,
        `/accounts/${accountId}`,
        {
          method: 'GET',
          requireAuth: true
        }
      );
      
      // Update cache
      if (response.data) {
        this.accounts.set(accountId, response.data);
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get account ${accountId} from Vault Banking`,
        data: { error, accountId }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Create a new account
   */
  public async createAccount(
    name: string,
    type: AccountType,
    initialBalances?: { currency: Currency, amount: number }[]
  ): Promise<ApiResponse<Account>> {
    try {
      const response = await this.apiGateway.serviceRequest<Account>(
        ApiServiceType.VAULT,
        '/accounts',
        {
          method: 'POST',
          body: { name, type, initialBalances },
          requireAuth: true
        }
      );
      
      // Update cache
      if (response.data) {
        this.accounts.set(response.data.id, response.data);
        
        MonitoringService.logEvent({
          type: 'info',
          message: `Created new Vault Banking account: ${name}`,
          data: { accountId: response.data.id, type }
        });
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to create Vault Banking account',
        data: { error, name, type }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Update an account
   */
  public async updateAccount(
    accountId: string,
    updates: { name?: string, metadata?: Record<string, any> }
  ): Promise<ApiResponse<Account>> {
    try {
      const response = await this.apiGateway.serviceRequest<Account>(
        ApiServiceType.VAULT,
        `/accounts/${accountId}`,
        {
          method: 'PATCH',
          body: updates,
          requireAuth: true
        }
      );
      
      // Update cache
      if (response.data) {
        this.accounts.set(accountId, response.data);
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to update Vault Banking account ${accountId}`,
        data: { error, accountId, updates }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get account balance
   */
  public async getAccountBalance(
    accountId: string,
    currency?: Currency
  ): Promise<ApiResponse<AccountBalance[]>> {
    try {
      let path = `/accounts/${accountId}/balance`;
      if (currency) {
        path += `?currency=${currency}`;
      }
      
      const response = await this.apiGateway.serviceRequest<AccountBalance[]>(
        ApiServiceType.VAULT,
        path,
        {
          method: 'GET',
          requireAuth: true,
          useCache: true,
          cacheTime: 30000 // Cache for 30 seconds
        }
      );
      
      // Update cache if we have the full account
      if (response.data && this.accounts.has(accountId)) {
        const account = this.accounts.get(accountId)!;
        account.balances = response.data;
        this.accounts.set(accountId, account);
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get balance for account ${accountId}`,
        data: { error, accountId, currency }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get account summary with total balance
   */
  public async getAccountSummary(): Promise<ApiResponse<AccountSummary>> {
    try {
      const response = await this.apiGateway.serviceRequest<AccountSummary>(
        ApiServiceType.VAULT,
        '/accounts/summary',
        {
          method: 'GET',
          requireAuth: true,
          useCache: true,
          cacheTime: 60000 // Cache for 1 minute
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to get account summary from Vault Banking',
        data: { error }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Create a transaction
   */
  public async createTransaction(
    transaction: TransactionRequest
  ): Promise<ApiResponse<Transaction>> {
    try {
      const response = await this.apiGateway.serviceRequest<Transaction>(
        ApiServiceType.VAULT,
        '/transactions',
        {
          method: 'POST',
          body: transaction,
          requireAuth: true
        }
      );
      
      // Invalidate account cache
      if (response.data) {
        this.accounts.delete(transaction.accountId);
        
        MonitoringService.logEvent({
          type: 'transaction',
          message: `Created ${transaction.type} transaction for ${transaction.amount} ${transaction.currency}`,
          data: { 
            transactionId: response.data.id, 
            accountId: transaction.accountId,
            type: transaction.type,
            amount: transaction.amount,
            currency: transaction.currency
          }
        });
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to create transaction',
        data: { error, transaction }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get transaction history
   */
  public async getTransactionHistory(
    accountId?: string,
    limit: number = 50,
    offset: number = 0,
    startDate?: string,
    endDate?: string,
    types?: TransactionType[]
  ): Promise<ApiResponse<Transaction[]>> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());
      
      if (accountId) {
        queryParams.append('accountId', accountId);
      }
      
      if (startDate) {
        queryParams.append('startDate', startDate);
      }
      
      if (endDate) {
        queryParams.append('endDate', endDate);
      }
      
      if (types && types.length > 0) {
        queryParams.append('types', types.join(','));
      }
      
      const response = await this.apiGateway.serviceRequest<Transaction[]>(
        ApiServiceType.VAULT,
        `/transactions?${queryParams.toString()}`,
        {
          method: 'GET',
          requireAuth: true
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to get transaction history',
        data: { error, accountId, limit, offset }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Get a specific transaction
   */
  public async getTransaction(transactionId: string): Promise<ApiResponse<Transaction>> {
    try {
      const response = await this.apiGateway.serviceRequest<Transaction>(
        ApiServiceType.VAULT,
        `/transactions/${transactionId}`,
        {
          method: 'GET',
          requireAuth: true
        }
      );
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: `Failed to get transaction ${transactionId}`,
        data: { error, transactionId }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
  
  /**
   * Transfer funds between accounts
   */
  public async transferFunds(
    fromAccountId: string,
    toAccountId: string,
    currency: Currency,
    amount: number,
    description?: string
  ): Promise<ApiResponse<Transaction>> {
    try {
      const response = await this.apiGateway.serviceRequest<Transaction>(
        ApiServiceType.VAULT,
        '/transactions/transfer',
        {
          method: 'POST',
          body: {
            fromAccountId,
            toAccountId,
            currency,
            amount,
            description
          },
          requireAuth: true
        }
      );
      
      // Invalidate account caches
      if (response.data) {
        this.accounts.delete(fromAccountId);
        this.accounts.delete(toAccountId);
      }
      
      return response;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to transfer funds',
        data: { error, fromAccountId, toAccountId, currency, amount }
      });
      
      return {
        data: null,
        error: error as Error,
        status: 500
      };
    }
  }
}
