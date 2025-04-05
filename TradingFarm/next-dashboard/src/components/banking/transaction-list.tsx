'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, ArrowUpDown, Plus, RefreshCcw, ArrowLeftRight } from 'lucide-react';
import { Transaction, createUnifiedBankingService } from '@/services/unified-banking-service';
import { formatCurrency, formatDate } from '@/lib/utils';

interface TransactionListProps {
  filter?: {
    transaction_type?: string;
    source_account_id?: string;
    destination_account_id?: string;
    status?: string;
  };
  onTransactionSelect?: (transaction: Transaction) => void;
  onCreateTransaction?: () => void;
  limit?: number;
}

export function TransactionList({
  filter = {},
  onTransactionSelect,
  onCreateTransaction,
  limit
}: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [typeFilter, setTypeFilter] = useState<string>(filter.transaction_type || 'all');
  
  const bankingService = createUnifiedBankingService();
  
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Combine the component filter with any additional filters
      const combinedFilter = { ...filter };
      if (typeFilter !== 'all') {
        combinedFilter.transaction_type = typeFilter;
      }
      const fetchedTransactions = await bankingService.getTransactions(combinedFilter);
      setTransactions(fetchedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTransactions();
  }, [filter, typeFilter]);
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to desc for most recent first
    }
  };
  
  const sortedTransactions = [...transactions]
    .sort((a, b) => {
      const aValue = a[sortField as keyof Transaction];
      const bValue = b[sortField as keyof Transaction];
      
      // Handle date comparison - assumes created_at is a string or Date
      if (sortField === 'created_at') {
        const aDate = aValue ? new Date(aValue as any).getTime() : 0;
        const bDate = bValue ? new Date(bValue as any).getTime() : 0;
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      // Handle number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // Fallback for null or undefined values
      if (aValue === undefined || aValue === null) return sortDirection === 'asc' ? -1 : 1;
      if (bValue === undefined || bValue === null) return sortDirection === 'asc' ? 1 : -1;
      
      return 0;
    })
    .slice(0, limit); // Apply limit if specified
  
  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Badge variant="outline" className="bg-green-100">↓ Deposit</Badge>;
      case 'withdrawal':
        return <Badge variant="outline" className="bg-red-100">↑ Withdrawal</Badge>;
      case 'transfer':
        return <Badge variant="outline" className="bg-blue-100">↔ Transfer</Badge>;
      case 'trade':
        return <Badge variant="outline" className="bg-purple-100">↕ Trade</Badge>;
      case 'fee':
        return <Badge variant="outline" className="bg-amber-100">Fee</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  const getStatusBadge = (status?: string, approvalStatus?: string) => {
    if (approvalStatus === 'required') {
      return <Badge variant="outline" className="bg-amber-100">Approval Required</Badge>;
    }
    
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100">Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100">Completed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100">Rejected</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-100">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>View and manage your financial transactions</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Select
              value={typeFilter}
              onValueChange={setTypeFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="withdrawal">Withdrawals</SelectItem>
                <SelectItem value="transfer">Transfers</SelectItem>
                <SelectItem value="trade">Trades</SelectItem>
                <SelectItem value="fee">Fees</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchTransactions}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
            {onCreateTransaction && (
              <Button onClick={onCreateTransaction}>
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                New Transaction
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px] cursor-pointer" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center">
                      Date
                      {sortField === 'created_at' && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('amount')}>
                    <div className="flex items-center">
                      Amount
                      {sortField === 'amount' && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>From/To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {transaction.created_at ? formatDate(new Date(transaction.created_at)) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {getTransactionTypeIcon(transaction.transaction_type)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      {transaction.currency}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {transaction.transaction_type === 'deposit' ? (
                        <span className="text-sm">To: {transaction.destination_account_id?.substring(0, 8)}...</span>
                      ) : transaction.transaction_type === 'withdrawal' ? (
                        <span className="text-sm">From: {transaction.source_account_id?.substring(0, 8)}...</span>
                      ) : (
                        <span className="text-sm">
                          {transaction.source_account_id?.substring(0, 8)}... → {transaction.destination_account_id?.substring(0, 8)}...
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(transaction.status, transaction.approval_status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => onTransactionSelect && onTransactionSelect(transaction)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          {limit && transactions.length > limit 
            ? `Showing ${limit} of ${transactions.length} transactions`
            : `Showing ${transactions.length} transactions`}
        </div>
      </CardFooter>
    </Card>
  );
}
