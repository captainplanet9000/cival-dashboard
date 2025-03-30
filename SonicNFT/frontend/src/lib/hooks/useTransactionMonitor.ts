import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { usePublicClient, useWaitForTransaction } from 'wagmi';

// Interface for transaction details
interface TransactionState {
  hash: `0x${string}`;
  description: string;
  status: 'pending' | 'success' | 'error' | 'confirmed';
  timestamp: number;
}

/**
 * Hook to monitor transactions and show toast notifications
 */
export function useTransactionMonitor() {
  const [transactions, setTransactions] = useState<TransactionState[]>([]);
  const publicClient = usePublicClient();
  
  // Add a new transaction to monitor
  const monitorTransaction = (hash: `0x${string}`, description: string = 'Transaction') => {
    setTransactions(prev => [
      ...prev,
      { 
        hash, 
        description, 
        status: 'pending', 
        timestamp: Date.now() 
      }
    ]);
    
    // Show initial toast
    toast.info(`${description} submitted`, {
      autoClose: false,
      toastId: hash,
    });
    
    return hash;
  };
  
  // Process each transaction with useWaitForTransaction
  const pendingTx = transactions.find(tx => tx.status === 'pending');
  
  const { isSuccess, isError } = useWaitForTransaction({
    hash: pendingTx?.hash,
    enabled: !!pendingTx,
    onSuccess: () => {
      if (pendingTx) {
        // Update transaction status
        setTransactions(prev => 
          prev.map(tx => 
            tx.hash === pendingTx.hash ? { ...tx, status: 'success' } : tx
          )
        );
        
        // Show success toast
        toast.update(pendingTx.hash, {
          render: `${pendingTx.description} successful!`,
          type: toast.TYPE.SUCCESS,
          autoClose: 5000,
        });
        
        // Get transaction receipt and confirmation count
        (async () => {
          try {
            const receipt = await publicClient.getTransactionReceipt({ hash: pendingTx.hash });
            if (receipt && receipt.blockNumber) {
              const latestBlock = await publicClient.getBlockNumber();
              const confirmations = latestBlock - receipt.blockNumber;
              
              if (confirmations >= 3) {
                setTransactions(prev =>
                  prev.map(tx =>
                    tx.hash === pendingTx.hash ? { ...tx, status: 'confirmed' } : tx
                  )
                );
              }
            }
          } catch (error) {
            console.error('Error getting receipt:', error);
          }
        })();
      }
    },
    onError: (error) => {
      if (pendingTx) {
        // Update transaction status
        setTransactions(prev => 
          prev.map(tx => 
            tx.hash === pendingTx.hash ? { ...tx, status: 'error' } : tx
          )
        );
        
        // Show error toast
        toast.update(pendingTx.hash, {
          render: `${pendingTx.description} failed: ${error.message}`,
          type: toast.TYPE.ERROR,
          autoClose: 8000,
        });
      }
    },
  });
  
  // Clean up old transactions periodically (keep only last 24 hours)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      setTransactions(prev => prev.filter(tx => 
        tx.timestamp > oneDayAgo || tx.status === 'pending'
      ));
    }, 60 * 60 * 1000); // Run every hour
    
    return () => clearInterval(cleanupInterval);
  }, []);
  
  return {
    monitorTransaction,
    transactions,
    pendingTransactions: transactions.filter(tx => tx.status === 'pending'),
    successfulTransactions: transactions.filter(tx => tx.status === 'success' || tx.status === 'confirmed'),
    failedTransactions: transactions.filter(tx => tx.status === 'error'),
    clearCompletedTransactions: () => {
      setTransactions(prev => prev.filter(tx => tx.status === 'pending'));
    },
  };
}

export default useTransactionMonitor; 