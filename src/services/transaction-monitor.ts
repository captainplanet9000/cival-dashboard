import { ethers } from 'ethers';
import { ErrorHandler } from './defi/error-handler';

// Transaction status enum
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  DROPPED = 'dropped',
  REPLACED = 'replaced'
}

// Transaction type
export interface TrackedTransaction {
  id: string;
  hash: string;
  chainId: number;
  description: string;
  status: TransactionStatus;
  submittedAt: number;
  confirmedAt?: number;
  failedAt?: number;
  protocol?: string;
  action?: string;
  blockNumber?: number;
  confirmations?: number;
  gasUsed?: string;
  gasPrice?: string;
  effectiveGasPrice?: string;
  replacedByHash?: string;
  error?: any;
}

// Transaction update callback type
export type TransactionUpdateCallback = (transaction: TrackedTransaction) => void;

/**
 * Service to monitor and track blockchain transactions
 */
export class TransactionMonitor {
  private static instance: TransactionMonitor;
  private transactions: Map<string, TrackedTransaction> = new Map();
  private providers: Map<number, ethers.providers.Provider> = new Map();
  private updateCallbacks: TransactionUpdateCallback[] = [];
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private errorHandler: ErrorHandler;
  
  // Default polling interval in milliseconds
  private defaultPollingInterval: number = 5000;
  
  // Default confirmation blocks
  private confirmationBlocks: number = 2;
  
  private constructor() {
    this.errorHandler = ErrorHandler.getInstance();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): TransactionMonitor {
    if (!TransactionMonitor.instance) {
      TransactionMonitor.instance = new TransactionMonitor();
    }
    return TransactionMonitor.instance;
  }
  
  /**
   * Set provider for a specific chain
   */
  public setProvider(chainId: number, provider: ethers.providers.Provider): void {
    this.providers.set(chainId, provider);
  }
  
  /**
   * Set confirmation blocks for transactions
   */
  public setConfirmationBlocks(blocks: number): void {
    this.confirmationBlocks = blocks;
  }
  
  /**
   * Register transaction update callback
   */
  public registerUpdateCallback(callback: TransactionUpdateCallback): void {
    this.updateCallbacks.push(callback);
  }
  
  /**
   * Clear all update callbacks
   */
  public clearUpdateCallbacks(): void {
    this.updateCallbacks = [];
  }
  
  /**
   * Track a new transaction
   */
  public trackTransaction(
    hash: string,
    chainId: number,
    description: string,
    protocol?: string,
    action?: string
  ): TrackedTransaction {
    const id = `${chainId}-${hash}`;
    
    const transaction: TrackedTransaction = {
      id,
      hash,
      chainId,
      description,
      status: TransactionStatus.PENDING,
      submittedAt: Date.now(),
      protocol,
      action
    };
    
    this.transactions.set(id, transaction);
    
    // Notify callbacks of new transaction
    this.notifyUpdateCallbacks(transaction);
    
    // Start monitoring the transaction
    this.monitorTransaction(id);
    
    return transaction;
  }
  
  /**
   * Get transaction by id or hash
   */
  public getTransaction(idOrHash: string, chainId?: number): TrackedTransaction | undefined {
    // Try to find by id first
    if (this.transactions.has(idOrHash)) {
      return this.transactions.get(idOrHash);
    }
    
    // If chainId is provided, try to find by hash
    if (chainId) {
      const id = `${chainId}-${idOrHash}`;
      return this.transactions.get(id);
    }
    
    // Otherwise search all transactions for matching hash
    for (const tx of this.transactions.values()) {
      if (tx.hash === idOrHash) {
        return tx;
      }
    }
    
    return undefined;
  }
  
  /**
   * Get all tracked transactions
   */
  public getAllTransactions(): TrackedTransaction[] {
    return Array.from(this.transactions.values());
  }
  
  /**
   * Get pending transactions
   */
  public getPendingTransactions(): TrackedTransaction[] {
    return Array.from(this.transactions.values())
      .filter(tx => tx.status === TransactionStatus.PENDING);
  }
  
  /**
   * Get confirmed transactions
   */
  public getConfirmedTransactions(): TrackedTransaction[] {
    return Array.from(this.transactions.values())
      .filter(tx => tx.status === TransactionStatus.CONFIRMED);
  }
  
  /**
   * Get failed transactions
   */
  public getFailedTransactions(): TrackedTransaction[] {
    return Array.from(this.transactions.values())
      .filter(tx => tx.status === TransactionStatus.FAILED);
  }
  
  /**
   * Clear all tracked transactions
   */
  public clearAllTransactions(): void {
    // Stop all polling intervals
    this.pollingIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.pollingIntervals.clear();
    
    // Clear transactions
    this.transactions.clear();
  }
  
  /**
   * Stop monitoring a transaction
   */
  public stopMonitoring(idOrHash: string, chainId?: number): void {
    const transaction = this.getTransaction(idOrHash, chainId);
    
    if (transaction) {
      const interval = this.pollingIntervals.get(transaction.id);
      if (interval) {
        clearInterval(interval);
        this.pollingIntervals.delete(transaction.id);
      }
    }
  }
  
  /**
   * Manually update transaction status
   */
  public updateTransactionStatus(
    idOrHash: string,
    status: TransactionStatus,
    details?: Partial<TrackedTransaction>
  ): void {
    const transaction = this.getTransaction(idOrHash);
    
    if (transaction) {
      // Update status
      transaction.status = status;
      
      // Update timestamp based on status
      if (status === TransactionStatus.CONFIRMED && !transaction.confirmedAt) {
        transaction.confirmedAt = Date.now();
      } else if (status === TransactionStatus.FAILED && !transaction.failedAt) {
        transaction.failedAt = Date.now();
      }
      
      // Update additional details
      if (details) {
        Object.assign(transaction, details);
      }
      
      // Update in map
      this.transactions.set(transaction.id, transaction);
      
      // Notify callbacks
      this.notifyUpdateCallbacks(transaction);
      
      // Stop monitoring completed transactions
      if (
        status === TransactionStatus.CONFIRMED ||
        status === TransactionStatus.FAILED ||
        status === TransactionStatus.DROPPED ||
        status === TransactionStatus.REPLACED
      ) {
        this.stopMonitoring(transaction.id);
      }
    }
  }
  
  /**
   * Remove transaction from tracking
   */
  public removeTransaction(idOrHash: string, chainId?: number): void {
    const transaction = this.getTransaction(idOrHash, chainId);
    
    if (transaction) {
      // Stop monitoring
      this.stopMonitoring(transaction.id);
      
      // Remove from map
      this.transactions.delete(transaction.id);
    }
  }
  
  /**
   * Start monitoring a transaction
   */
  private monitorTransaction(id: string): void {
    const transaction = this.transactions.get(id);
    
    if (!transaction) {
      return;
    }
    
    const provider = this.providers.get(transaction.chainId);
    
    if (!provider) {
      console.error(`No provider found for chain ID ${transaction.chainId}`);
      return;
    }
    
    // Set up polling interval
    const interval = setInterval(async () => {
      try {
        // Get transaction receipt
        const receipt = await provider.getTransactionReceipt(transaction.hash);
        
        if (receipt) {
          // Transaction is mined
          const isSuccessful = receipt.status === 1;
          
          if (isSuccessful) {
            // Check confirmations
            const currentBlock = await provider.getBlockNumber();
            const confirmations = currentBlock - receipt.blockNumber;
            
            if (confirmations >= this.confirmationBlocks) {
              // Transaction is confirmed
              this.updateTransactionStatus(id, TransactionStatus.CONFIRMED, {
                blockNumber: receipt.blockNumber,
                confirmations,
                gasUsed: receipt.gasUsed.toString(),
                effectiveGasPrice: receipt.effectiveGasPrice?.toString()
              });
            } else {
              // Update confirmations but keep as pending
              this.transactions.set(id, {
                ...transaction,
                blockNumber: receipt.blockNumber,
                confirmations,
                gasUsed: receipt.gasUsed.toString(),
                effectiveGasPrice: receipt.effectiveGasPrice?.toString()
              });
              this.notifyUpdateCallbacks(this.transactions.get(id)!);
            }
          } else {
            // Transaction failed
            this.updateTransactionStatus(id, TransactionStatus.FAILED, {
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed.toString(),
              effectiveGasPrice: receipt.effectiveGasPrice?.toString()
            });
          }
        } else {
          // Check if transaction was replaced
          // This is a simplified version - in practice, detecting replaced transactions
          // is more complex and would involve checking the nonce and mempool
          try {
            const tx = await provider.getTransaction(transaction.hash);
            if (!tx) {
              // Transaction might have been dropped or replaced
              // For now, we'll keep it as pending
              // A more sophisticated approach would involve checking for transactions with the same nonce
            }
          } catch (error) {
            console.error('Error checking transaction:', error);
          }
        }
      } catch (error) {
        this.errorHandler.handleError(
          error,
          transaction.protocol || 'TransactionMonitor',
          `MONITOR_TRANSACTION_${transaction.action || ''}`
        );
      }
    }, this.defaultPollingInterval);
    
    // Store interval for later cleanup
    this.pollingIntervals.set(id, interval);
  }
  
  /**
   * Notify all registered callbacks
   */
  private notifyUpdateCallbacks(transaction: TrackedTransaction): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(transaction);
      } catch (error) {
        console.error('Error in transaction update callback:', error);
      }
    });
  }
}

/**
 * Example usage:
 * 
 * // Initialize
 * const monitor = TransactionMonitor.getInstance();
 * 
 * // Set provider
 * monitor.setProvider(1, new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR_KEY'));
 * 
 * // Register update callback
 * monitor.registerUpdateCallback((tx) => {
 *   console.log(`Transaction ${tx.hash} status updated to ${tx.status}`);
 *   
 *   // Show notification based on status
 *   if (tx.status === TransactionStatus.CONFIRMED) {
 *     showNotification('Transaction Confirmed', tx.description);
 *   } else if (tx.status === TransactionStatus.FAILED) {
 *     showNotification('Transaction Failed', tx.description, 'error');
 *   }
 * });
 * 
 * // Track a transaction
 * const transaction = monitor.trackTransaction(
 *   '0x123abc...',
 *   1,
 *   'Swap 1 ETH for 1000 USDC',
 *   'Uniswap',
 *   'SWAP'
 * );
 * 
 * // Later, get transaction info
 * const txInfo = monitor.getTransaction(transaction.id);
 */ 