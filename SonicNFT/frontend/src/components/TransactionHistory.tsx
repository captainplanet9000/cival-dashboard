import React, { useState } from 'react';
import { useTransactionMonitor } from '@/lib/hooks';
import { ExternalLink, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useNetwork } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';

const TransactionHistory = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { chain } = useNetwork();
  const { 
    transactions, 
    pendingTransactions, 
    successfulTransactions,
    failedTransactions,
    clearCompletedTransactions 
  } = useTransactionMonitor();
  
  // Hide component if no transactions
  if (transactions.length === 0) {
    return null;
  }
  
  // Get block explorer URL
  const getExplorerUrl = (hash: `0x${string}`) => {
    if (!chain?.blockExplorers?.default.url) return '#';
    return `${chain.blockExplorers.default.url}/tx/${hash}`;
  };
  
  return (
    <motion.div 
      className="sonic-card mt-8 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className="p-4 flex justify-between items-center cursor-pointer hover:bg-sonic-card/80"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <RefreshCw size={16} className="mr-2 text-sonic-primary" />
          <h3 className="font-medium text-sonic-text">
            Transaction History
            <span className="ml-2 text-sm bg-sonic-primary/10 text-sonic-primary px-2 py-0.5 rounded-full">
              {transactions.length}
            </span>
          </h3>
        </div>
        <button className="text-sonic-muted hover:text-sonic-text">
          {isExpanded ? 'Hide' : 'Show'}
        </button>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {pendingTransactions.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-sonic-text mb-2">Pending</h4>
                  <ul className="space-y-2">
                    {pendingTransactions.map((tx) => (
                      <li 
                        key={tx.hash} 
                        className="bg-sonic-card/50 p-3 rounded-lg flex justify-between items-center"
                      >
                        <div className="flex items-center">
                          <Clock size={16} className="text-amber-500 mr-2 animate-pulse" />
                          <span className="text-sonic-text text-sm">{tx.description}</span>
                        </div>
                        <a 
                          href={getExplorerUrl(tx.hash)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sonic-primary hover:underline text-xs flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View <ExternalLink size={12} className="ml-1" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {successfulTransactions.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-sonic-text mb-2">Completed</h4>
                  <ul className="space-y-2">
                    {successfulTransactions.map((tx) => (
                      <li 
                        key={tx.hash} 
                        className="bg-sonic-card/50 p-3 rounded-lg flex justify-between items-center"
                      >
                        <div className="flex items-center">
                          <CheckCircle size={16} className="text-green-500 mr-2" />
                          <span className="text-sonic-text text-sm">{tx.description}</span>
                        </div>
                        <a 
                          href={getExplorerUrl(tx.hash)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sonic-primary hover:underline text-xs flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View <ExternalLink size={12} className="ml-1" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {failedTransactions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-sonic-text mb-2">Failed</h4>
                  <ul className="space-y-2">
                    {failedTransactions.map((tx) => (
                      <li 
                        key={tx.hash} 
                        className="bg-sonic-card/50 p-3 rounded-lg flex justify-between items-center"
                      >
                        <div className="flex items-center">
                          <XCircle size={16} className="text-red-500 mr-2" />
                          <span className="text-sonic-text text-sm">{tx.description}</span>
                        </div>
                        <a 
                          href={getExplorerUrl(tx.hash)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sonic-primary hover:underline text-xs flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View <ExternalLink size={12} className="ml-1" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {(successfulTransactions.length > 0 || failedTransactions.length > 0) && (
                <div className="mt-4 pt-3 border-t border-sonic-secondary/10 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearCompletedTransactions();
                    }}
                    className="text-xs text-sonic-muted hover:text-sonic-primary"
                  >
                    Clear completed transactions
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TransactionHistory; 