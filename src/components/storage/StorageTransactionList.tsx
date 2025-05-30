"use client";

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { storageService } from '@/services/storageService';
import { StorageTransaction, StorageTransactionFilter, StorageTransactionType, StorageType } from '@/types/storage';
import { formatBytes, formatDate } from '@/lib/utils';
import { ArrowDown, ArrowUp, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

interface StorageTransactionListProps {
  storageId: string;
  storageType: StorageType;
  limit?: number;
}

export default function StorageTransactionList({
  storageId,
  storageType,
  limit = 10
}: StorageTransactionListProps) {
  const [transactions, setTransactions] = useState<StorageTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [storageId, storageType]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const filter: StorageTransactionFilter = {
        sourceId: storageId,
        sourceType: storageType,
        limit
      };
      
      // Also include transactions where this storage is the destination
      const destFilter: StorageTransactionFilter = {
        destinationId: storageId,
        destinationType: storageType,
        limit
      };
      
      const sourceTransactions = await storageService.getStorageTransactions(filter);
      const destTransactions = await storageService.getStorageTransactions(destFilter);
      
      // Combine and sort by date
      const allTransactions = [...sourceTransactions, ...destTransactions]
        .filter((tx, index, self) => 
          index === self.findIndex(t => t.id === tx.id)
        )
        .sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, limit);
      
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load storage transactions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeIcon = (transaction: StorageTransaction) => {
    // Determine if this storage is the source or destination
    const isSource = transaction.sourceId === storageId && transaction.sourceType === storageType;
    
    switch (transaction.transactionType) {
      case StorageTransactionType.ALLOCATION:
        return isSource ? 
          <ArrowUp className="h-4 w-4 text-red-500" /> : 
          <ArrowDown className="h-4 w-4 text-green-500" />;
      case StorageTransactionType.DEALLOCATION:
        return isSource ? 
          <ArrowDown className="h-4 w-4 text-green-500" /> : 
          <ArrowUp className="h-4 w-4 text-red-500" />;
      case StorageTransactionType.RESIZE:
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return isSource ? 
          <ArrowUp className="h-4 w-4 text-red-500" /> : 
          <ArrowDown className="h-4 w-4 text-green-500" />;
    }
  };
  
  const getTransactionTypeLabel = (transaction: StorageTransaction) => {
    // Determine if this storage is the source or destination
    const isSource = transaction.sourceId === storageId && transaction.sourceType === storageType;
    
    switch (transaction.transactionType) {
      case StorageTransactionType.ALLOCATION:
        return isSource ? 'Allocated Out' : 'Allocated In';
      case StorageTransactionType.DEALLOCATION:
        return isSource ? 'Reclaimed' : 'Released';
      case StorageTransactionType.RESIZE:
        return 'Resized';
      default:
        return transaction.transactionType;
    }
  };
  
  const formatTransactionPartner = (transaction: StorageTransaction) => {
    // Determine if this storage is the source or destination
    const isSource = transaction.sourceId === storageId && transaction.sourceType === storageType;
    
    if (isSource) {
      if (transaction.destinationType === StorageType.EXTERNAL) {
        return 'External';
      }
      return `${transaction.destinationType.charAt(0).toUpperCase() + transaction.destinationType.slice(1)} ${transaction.destinationId.substring(0, 8)}...`;
    } else {
      if (transaction.sourceType === StorageType.EXTERNAL) {
        return 'External';
      }
      return `${transaction.sourceType.charAt(0).toUpperCase() + transaction.sourceType.slice(1)} ${transaction.sourceId.substring(0, 8)}...`;
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No storage transactions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Recent Transactions</h3>
        <Button variant="outline" size="sm" onClick={loadTransactions} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>
      
      {transactions.map(transaction => (
        <Card key={transaction.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center border-b p-4">
              <div className="mr-4">
                {getTransactionTypeIcon(transaction)}
              </div>
              <div className="flex-grow">
                <div className="font-medium">
                  {getTransactionTypeLabel(transaction)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(transaction.createdAt)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-medium">
                  {formatBytes(transaction.amount)}
                </div>
                <Badge variant="outline" className="text-xs">
                  {formatTransactionPartner(transaction)}
                </Badge>
              </div>
            </div>
            {transaction.description && (
              <div className="p-3 bg-secondary/20 text-xs">
                {transaction.description}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      
      {transactions.length >= limit && (
        <div className="text-center pt-2">
          <Button variant="link" size="sm">
            View All Transactions
          </Button>
        </div>
      )}
    </div>
  );
} 