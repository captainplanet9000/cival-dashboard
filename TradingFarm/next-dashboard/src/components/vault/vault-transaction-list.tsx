'use client';

import { VaultTransaction, VaultAccount } from '@/types/vault-types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, ArrowRight, CircleDollarSign, Percent, CreditCard } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface VaultTransactionListProps {
  transactions: VaultTransaction[];
  loading: boolean;
  accounts: VaultAccount[];
  showAccount: boolean;
  limit?: number;
}

export function VaultTransactionList({
  transactions,
  loading,
  accounts,
  showAccount = true,
  limit
}: VaultTransactionListProps) {
  // Get account by id
  const getAccountById = (id: number | null) => {
    if (!id) return null;
    return accounts.find(account => account.id === id);
  };

  // Get transaction icon based on type
  const getTransactionIcon = (transaction: VaultTransaction) => {
    switch (transaction.type) {
      case 'deposit':
        return <ArrowDown className="h-4 w-4 text-green-500" />;
      case 'withdrawal':
        return <ArrowUp className="h-4 w-4 text-red-500" />;
      case 'transfer':
        return <ArrowRight className="h-4 w-4 text-blue-500" />;
      case 'fee':
        return <Percent className="h-4 w-4 text-yellow-500" />;
      case 'interest':
        return <CircleDollarSign className="h-4 w-4 text-purple-500" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  // Get transaction color based on type
  const getTransactionColor = (transaction: VaultTransaction) => {
    switch (transaction.type) {
      case 'deposit':
        return 'text-green-500';
      case 'withdrawal':
        return 'text-red-500';
      case 'transfer':
        return transaction.source_account_id ? 'text-red-500' : 'text-green-500';
      case 'fee':
        return 'text-yellow-500';
      case 'interest':
        return 'text-purple-500';
      default:
        return '';
    }
  };

  // Get transaction amount with sign
  const getTransactionAmountDisplay = (transaction: VaultTransaction) => {
    const isNegative = ['withdrawal', 'fee'].includes(transaction.type) || 
                      (transaction.type === 'transfer' && transaction.source_account_id);
    const prefix = isNegative ? '-' : '+';
    return `${prefix} ${formatCurrency(transaction.amount, transaction.currency)}`;
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'completed':
        return 'outline';
      case 'failed':
        return 'destructive';
      case 'cancelled':
        return 'default';
      default:
        return 'outline';
    }
  };

  // Get approval status badge variant
  const getApprovalStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Limit transactions if limit is provided
  const displayTransactions = limit ? transactions.slice(0, limit) : transactions;

  // Render loading state
  if (loading && !transactions.length) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  // Render empty state
  if (!transactions.length) {
    return (
      <div className="text-center py-8">
        <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            {showAccount && <TableHead>Account</TableHead>}
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayTransactions.map(transaction => {
            const account = getAccountById(transaction.account_id);
            return (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {formatDate(transaction.timestamp)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTransactionIcon(transaction)}
                    <span className="capitalize">{transaction.type}</span>
                  </div>
                </TableCell>
                {showAccount && (
                  <TableCell>
                    {account?.name || 'Unknown Account'}
                  </TableCell>
                )}
                <TableCell>
                  {transaction.note || 
                   (transaction.type === 'transfer' && transaction.destination_account_id) 
                    ? `Transfer to ${getAccountById(transaction.destination_account_id)?.name || 'account'}`
                    : (transaction.type === 'transfer' && transaction.source_account_id)
                    ? `Transfer from ${getAccountById(transaction.source_account_id)?.name || 'account'}`
                    : transaction.type}
                </TableCell>
                <TableCell className={`text-right ${getTransactionColor(transaction)}`}>
                  {getTransactionAmountDisplay(transaction)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Badge variant={getStatusBadgeVariant(transaction.status)}>
                      {transaction.status}
                    </Badge>
                    {transaction.approval_status && (
                      <Badge variant={getApprovalStatusBadgeVariant(transaction.approval_status)}>
                        {transaction.approval_status}
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
