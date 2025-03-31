'use client';

import * as React from 'react';
import { 
  ArrowDown, 
  ArrowUp, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Filter,
  CalendarClock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { VaultTransaction, getTransactionHistory } from '@/services/vault-service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface TransactionHistoryProps {
  userId: string;
  limit?: number;
  currencyId?: string;
  onViewTransaction?: (transaction: VaultTransaction) => void;
  className?: string;
}

export function TransactionHistory({ 
  userId, 
  limit = 25,
  currencyId,
  onViewTransaction,
  className 
}: TransactionHistoryProps) {
  const [loading, setLoading] = React.useState(true);
  const [transactions, setTransactions] = React.useState<VaultTransaction[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [typeFilter, setTypeFilter] = React.useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = React.useState<string | undefined>(undefined);

  const pageSize = limit;
  const totalPages = Math.ceil(totalCount / pageSize);

  const loadTransactions = React.useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = await getTransactionHistory(
        userId,
        pageSize,
        page * pageSize,
        currencyId,
        typeFilter,
        statusFilter
      );
      
      setTransactions(result.transactions);
      setTotalCount(result.total);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, pageSize, page, currencyId, typeFilter, statusFilter]);

  React.useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleRefresh = () => {
    loadTransactions();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <ArrowDown className="h-4 w-4 text-green-500" />;
      case 'WITHDRAWAL':
        return <ArrowUp className="h-4 w-4 text-red-500" />;
      case 'TRANSFER':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'FEE':
        return <ArrowUp className="h-4 w-4 text-orange-500" />;
      case 'REWARD':
        return <ArrowDown className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const formatAmount = (transaction: VaultTransaction) => {
    const prefix = transaction.type === 'DEPOSIT' || transaction.type === 'REWARD' ? '+' : '-';
    const symbol = transaction.currency?.symbol || '';
    return `${prefix}${symbol}${Math.abs(transaction.amount).toFixed(transaction.currency?.decimals || 2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'FAILED':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'CANCELLED':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return '';
    }
  };

  const renderLoadingState = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>View your recent transactions</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Select value={typeFilter || ''} onValueChange={(value) => setTypeFilter(value || undefined)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="DEPOSIT">Deposits</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
                <SelectItem value="TRANSFER">Transfers</SelectItem>
                <SelectItem value="FEE">Fees</SelectItem>
                <SelectItem value="REWARD">Rewards</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter || ''} onValueChange={(value) => setStatusFilter(value || undefined)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Button size="icon" variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          renderLoadingState()
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id}
                    className="cursor-pointer"
                    onClick={() => onViewTransaction?.(transaction)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        {getTypeIcon(transaction.type)}
                        <span className="ml-2">{transaction.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`flex items-center gap-1 ${getStatusColor(transaction.status)}`}>
                        {getStatusIcon(transaction.status)}
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={transaction.type === 'DEPOSIT' || transaction.type === 'REWARD' ? 'text-green-500' : 'text-red-500'}>
                      {formatAmount(transaction)}
                    </TableCell>
                    <TableCell>{transaction.currency?.code || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CalendarClock className="mr-1 h-4 w-4 text-muted-foreground" />
                        <span title={new Date(transaction.created_at).toLocaleString()}>
                          {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.description || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 0}
          >
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
