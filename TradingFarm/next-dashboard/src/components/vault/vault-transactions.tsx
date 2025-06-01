'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VaultTransaction, VaultTransactionFilter, PaginatedResponse } from '@/types/vault-types';
import { getVaultTransactions, approveTransaction } from '@/services/vault-service';
import { format } from 'date-fns';

interface VaultTransactionsProps {
  userId: string;
  filter: VaultTransactionFilter;
  onFilterChange: (filter: VaultTransactionFilter) => void;
  onRefresh: () => void;
}

export default function VaultTransactions({ 
  userId, 
  filter, 
  onFilterChange, 
  onRefresh 
}: VaultTransactionsProps) {
  const [transactions, setTransactions] = useState<VaultTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTransaction, setSelectedTransaction] = useState<VaultTransaction | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterState, setFilterState] = useState<VaultTransactionFilter>(filter);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [userId, filter, page, pageSize]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const result: PaginatedResponse<VaultTransaction> = await getVaultTransactions(
        userId,
        filter,
        page,
        pageSize
      );
      
      setTransactions(result.data);
      setTotalPages(result.totalPages);
      setTotalCount(result.total);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTransaction = (transaction: VaultTransaction) => {
    setSelectedTransaction(transaction);
    setViewDialogOpen(true);
  };

  const handleApproveTransaction = (transaction: VaultTransaction) => {
    setSelectedTransaction(transaction);
    setApprovalDialogOpen(true);
  };

  const handleApproveSubmit = async (action: 'approved' | 'rejected') => {
    if (!selectedTransaction) return;
    
    setIsSubmitting(true);
    try {
      const result = await approveTransaction(userId, {
        transaction_id: selectedTransaction.id,
        action,
        comment: approvalComment
      });
      
      if (result.error) {
        console.error('Error approving transaction:', result.error);
      } else {
        setApprovalDialogOpen(false);
        setApprovalComment('');
        loadTransactions();
        onRefresh();
      }
    } catch (error) {
      console.error('Unexpected error during approval:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyFilter = () => {
    onFilterChange(filterState);
    setFilterOpen(false);
  };

  const resetFilter = () => {
    const resetFilter: VaultTransactionFilter = {};
    setFilterState(resetFilter);
    onFilterChange(resetFilter);
    setFilterOpen(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'transfer':
        return <ArrowLeftRight className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string, approval_status: string) => {
    if (approval_status === 'pending') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Awaiting Approval</Badge>;
    }
    
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch (error) {
      return dateString;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }) + ' ' + currency;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transactions</h2>
          <p className="text-muted-foreground">View and manage your transaction history</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
                {Object.keys(filter).length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {Object.keys(filter).length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Filter Transactions</h4>
                  <p className="text-sm text-muted-foreground">
                    Narrow down transactions by specific criteria
                  </p>
                </div>
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="type">Type</Label>
                    <Select 
                      value={filterState.type as string || ''} 
                      onValueChange={(value) => setFilterState({...filterState, type: value || undefined})}
                    >
                      <SelectTrigger id="type" className="col-span-2">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-types">All types</SelectItem>
                        <SelectItem value="deposit">Deposits</SelectItem>
                        <SelectItem value="withdrawal">Withdrawals</SelectItem>
                        <SelectItem value="transfer">Transfers</SelectItem>
                        <SelectItem value="fee">Fees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={filterState.status as string || ''} 
                      onValueChange={(value) => setFilterState({...filterState, status: value || undefined})}
                    >
                      <SelectTrigger id="status" className="col-span-2">
                        <SelectValue placeholder="Any status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any-status">Any status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="approval">Approval</Label>
                    <Select 
                      value={filterState.approval_status || ''} 
                      onValueChange={(value) => setFilterState({...filterState, approval_status: value || undefined})}
                    >
                      <SelectTrigger id="approval" className="col-span-2">
                        <SelectValue placeholder="Any approval status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any-status">Any status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="not_required">Not Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="min-amount">Min Amount</Label>
                    <Input
                      id="min-amount"
                      type="number"
                      placeholder="0.00"
                      className="col-span-2"
                      value={filterState.min_amount || ''}
                      onChange={(e) => setFilterState({
                        ...filterState, 
                        min_amount: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      placeholder="e.g. BTC"
                      className="col-span-2"
                      value={filterState.currency || ''}
                      onChange={(e) => setFilterState({
                        ...filterState, 
                        currency: e.target.value || undefined
                      })}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={resetFilter}>
                    Reset
                  </Button>
                  <Button size="sm" onClick={applyFilter}>
                    Apply Filter
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button variant="outline" size="sm" onClick={loadTransactions}>
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {totalCount} transaction{totalCount !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-20" />
                </div>
              ))}
            </div>
          ) : (
            transactions.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(transaction.type)}
                            <span className="capitalize">{transaction.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(transaction.timestamp)}
                        </TableCell>
                        <TableCell className={transaction.type === 'withdrawal' ? 'text-red-600' : transaction.type === 'deposit' ? 'text-green-600' : ''}>
                          {transaction.type === 'withdrawal' ? '-' : transaction.type === 'deposit' ? '+' : ''}
                          {formatAmount(transaction.amount, transaction.currency)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status, transaction.approval_status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleViewTransaction(transaction)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {transaction.approval_status === 'pending' && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleApproveTransaction(transaction)}
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No transactions found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {Object.keys(filter).length > 0 
                    ? 'Try adjusting the filter criteria' 
                    : 'Create an account and make your first transaction'}
                </p>
              </div>
            )
          )}
        </CardContent>
        {transactions.length > 0 && (
          <CardFooter className="flex items-center justify-between border-t px-6 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {transactions.length} of {totalCount} transactions
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* View Transaction Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              {selectedTransaction && (
                <Badge className="mt-1">
                  {selectedTransaction.reference_id || `ID: ${selectedTransaction.id}`}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {getTypeIcon(selectedTransaction.type)}
                  <span className="font-medium capitalize">{selectedTransaction.type}</span>
                </div>
                {getStatusBadge(selectedTransaction.status, selectedTransaction.approval_status)}
              </div>
              
              <div className="text-center py-4">
                <div className="text-3xl font-bold">
                  {formatAmount(selectedTransaction.amount, selectedTransaction.currency)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(selectedTransaction.timestamp)}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account</span>
                  <span>{selectedTransaction.account?.name || 'Unknown Account'}</span>
                </div>
                
                {selectedTransaction.type === 'transfer' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">From</span>
                      <span>{selectedTransaction.source_account?.name || selectedTransaction.external_source || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">To</span>
                      <span>{selectedTransaction.destination_account?.name || selectedTransaction.external_destination || 'Unknown'}</span>
                    </div>
                  </>
                )}
                
                {selectedTransaction.fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee</span>
                    <span>{formatAmount(selectedTransaction.fee, selectedTransaction.fee_currency || selectedTransaction.currency)}</span>
                  </div>
                )}
                
                {selectedTransaction.tx_hash && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction Hash</span>
                    <span className="truncate max-w-[200px]">{selectedTransaction.tx_hash}</span>
                  </div>
                )}
                
                {selectedTransaction.note && (
                  <div className="pt-2">
                    <div className="text-muted-foreground mb-1">Note</div>
                    <div className="text-sm bg-muted p-2 rounded">{selectedTransaction.note}</div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Approval</DialogTitle>
            <DialogDescription>
              Review and approve or reject this transaction
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium capitalize">{selectedTransaction.type}</div>
                  <Badge>{selectedTransaction.currency}</Badge>
                </div>
                
                <div className="text-2xl font-bold mb-2">
                  {formatAmount(selectedTransaction.amount, selectedTransaction.currency)}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Date:</div>
                  <div>{formatDate(selectedTransaction.timestamp)}</div>
                  
                  <div className="text-muted-foreground">Account:</div>
                  <div>{selectedTransaction.account?.name || 'Unknown'}</div>
                  
                  {(selectedTransaction.external_source || selectedTransaction.source_account_id) && (
                    <>
                      <div className="text-muted-foreground">From:</div>
                      <div>{selectedTransaction.source_account?.name || selectedTransaction.external_source || 'Unknown'}</div>
                    </>
                  )}
                  
                  {(selectedTransaction.external_destination || selectedTransaction.destination_account_id) && (
                    <>
                      <div className="text-muted-foreground">To:</div>
                      <div>{selectedTransaction.destination_account?.name || selectedTransaction.external_destination || 'Unknown'}</div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="comment">Comment (Optional)</Label>
                <Input 
                  id="comment" 
                  placeholder="Add a comment about your decision"
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button 
              variant="destructive" 
              onClick={() => handleApproveSubmit('rejected')}
              disabled={isSubmitting}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button 
              onClick={() => handleApproveSubmit('approved')}
              disabled={isSubmitting}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
