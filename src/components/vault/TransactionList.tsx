"use client";

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { vaultService } from '@/services/vaultService';
import { VaultTransaction, TransactionStatus, TransactionType, TransactionFilter } from '@/types/vault';
import { formatCurrency } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, RefreshCw, CheckCircle2, AlertCircle, Eye, Clock, X, Check, Search, Filter, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

interface TransactionListProps {
  accountId: string;
  userId: string;
  onUpdate?: () => void;
}

export default function TransactionList({ accountId, userId, onUpdate }: TransactionListProps) {
  const [transactions, setTransactions] = useState<VaultTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<VaultTransaction | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [filter, setFilter] = useState<TransactionFilter>({
    accountId,
    limit: 50
  });
  
  useEffect(() => {
    fetchTransactions();
  }, [accountId, filter]);
  
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await vaultService.getTransactions({
        ...filter,
        accountId // Always ensure the accountId is used
      });
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error fetching transactions",
        description: "Could not load transactions. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleApproveTransaction = async () => {
    if (!selectedTransaction) return;
    
    try {
      await vaultService.updateTransactionStatus(
        selectedTransaction.id,
        TransactionStatus.COMPLETED,
        userId,
        approvalNote
      );
      setIsApproveDialogOpen(false);
      setSelectedTransaction(null);
      setApprovalNote('');
      fetchTransactions();
      if (onUpdate) onUpdate();
      
      toast({
        title: "Transaction approved",
        description: "The transaction has been successfully approved.",
      });
    } catch (error) {
      console.error('Error approving transaction:', error);
      toast({
        title: "Error approving transaction",
        description: "Could not approve the transaction. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleRejectTransaction = async () => {
    if (!selectedTransaction) return;
    
    try {
      await vaultService.updateTransactionStatus(
        selectedTransaction.id,
        TransactionStatus.CANCELLED,
        userId,
        rejectNote
      );
      setIsRejectDialogOpen(false);
      setSelectedTransaction(null);
      setRejectNote('');
      fetchTransactions();
      if (onUpdate) onUpdate();
      
      toast({
        title: "Transaction rejected",
        description: "The transaction has been cancelled.",
      });
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      toast({
        title: "Error rejecting transaction",
        description: "Could not reject the transaction. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleTypeFilterChange = (value: string) => {
    if (value === 'all') {
      setFilter(prev => ({ ...prev, types: undefined }));
    } else {
      setFilter(prev => ({ ...prev, types: [value as TransactionType] }));
    }
  };
  
  const handleStatusFilterChange = (value: string) => {
    if (value === 'all') {
      setFilter(prev => ({ ...prev, statuses: undefined }));
    } else {
      setFilter(prev => ({ ...prev, statuses: [value as TransactionStatus] }));
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(prev => ({ ...prev, search: e.target.value || undefined }));
  };
  
  const getTransactionTypeIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.DEPOSIT:
        return <ArrowDownRight className="w-4 h-4 text-green-500" />;
      case TransactionType.WITHDRAWAL:
        return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case TransactionType.TRANSFER:
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case TransactionType.ALLOCATION:
        return <RefreshCw className="w-4 h-4 text-purple-500" />;
      case TransactionType.FEE:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case TransactionType.INTEREST:
      case TransactionType.REWARD:
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };
  
  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.COMPLETED:
        return <Badge variant="outline" className="bg-green-100 text-green-600">Completed</Badge>;
      case TransactionStatus.PENDING:
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-600">Pending</Badge>;
      case TransactionStatus.PROCESSING:
        return <Badge variant="outline" className="bg-blue-100 text-blue-600">Processing</Badge>;
      case TransactionStatus.FAILED:
        return <Badge variant="outline" className="bg-red-100 text-red-600">Failed</Badge>;
      case TransactionStatus.CANCELLED:
        return <Badge variant="outline" className="bg-gray-100 text-gray-600">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  const getTransactionAmount = (transaction: VaultTransaction) => {
    const isPositive = 
      transaction.type === TransactionType.DEPOSIT || 
      transaction.type === TransactionType.INTEREST || 
      transaction.type === TransactionType.REWARD ||
      (transaction.type === TransactionType.TRANSFER && transaction.destinationId === accountId);
    
    return (
      <div className={`text-right ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 justify-between mb-4">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-8 w-full sm:w-[300px]"
            onChange={handleSearchChange}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select onValueChange={handleTypeFilterChange} defaultValue="all">
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value={TransactionType.DEPOSIT}>Deposits</SelectItem>
              <SelectItem value={TransactionType.WITHDRAWAL}>Withdrawals</SelectItem>
              <SelectItem value={TransactionType.TRANSFER}>Transfers</SelectItem>
              <SelectItem value={TransactionType.ALLOCATION}>Allocations</SelectItem>
              <SelectItem value={TransactionType.FEE}>Fees</SelectItem>
              <SelectItem value={TransactionType.INTEREST}>Interest</SelectItem>
              <SelectItem value={TransactionType.REWARD}>Rewards</SelectItem>
            </SelectContent>
          </Select>
          
          <Select onValueChange={handleStatusFilterChange} defaultValue="all">
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={TransactionStatus.PENDING}>Pending</SelectItem>
              <SelectItem value={TransactionStatus.PROCESSING}>Processing</SelectItem>
              <SelectItem value={TransactionStatus.COMPLETED}>Completed</SelectItem>
              <SelectItem value={TransactionStatus.FAILED}>Failed</SelectItem>
              <SelectItem value={TransactionStatus.CANCELLED}>Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" className="shrink-0">
            <Filter className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="icon" className="shrink-0">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {transactions.length === 0 ? (
        <div className="text-center py-12 border rounded-md bg-secondary/10">
          <p className="text-muted-foreground mb-2">No transactions found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or create a new transaction</p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map(transaction => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="p-2 rounded-full bg-secondary">
                        {getTransactionTypeIcon(transaction.type)}
                      </div>
                      <span className="ml-2 text-xs font-medium hidden sm:inline">
                        {transaction.type}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium truncate max-w-[200px]">
                        {transaction.description || `${transaction.type} Transaction`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.reference || (transaction.sourceType === 'vault_account' && transaction.destinationType === 'vault_account' ? 'Internal Transfer' : transaction.sourceType === 'vault_account' ? 'Outgoing' : 'Incoming')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-xs">
                        {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(transaction.createdAt), 'h:mm a')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(transaction.status)}
                  </TableCell>
                  <TableCell>
                    {getTransactionAmount(transaction)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {transaction.status === TransactionStatus.PENDING && (
                        <>
                          <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-50"
                                title="Approve Transaction"
                                onClick={() => setSelectedTransaction(transaction)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approve Transaction</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to approve this {transaction.type.toLowerCase()} transaction for {formatCurrency(transaction.amount, transaction.currency)}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="grid gap-2 py-4">
                                <label htmlFor="note" className="text-sm font-medium">
                                  Add a note (optional)
                                </label>
                                <Input
                                  id="note"
                                  value={approvalNote}
                                  onChange={(e) => setApprovalNote(e.target.value)}
                                  placeholder="Reason for approval"
                                />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleApproveTransaction}>
                                  Approve
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                title="Reject Transaction"
                                onClick={() => setSelectedTransaction(transaction)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject Transaction</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to reject this {transaction.type.toLowerCase()} transaction for {formatCurrency(transaction.amount, transaction.currency)}?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="grid gap-2 py-4">
                                <label htmlFor="rejectNote" className="text-sm font-medium">
                                  Add a note (optional)
                                </label>
                                <Input
                                  id="rejectNote"
                                  value={rejectNote}
                                  onChange={(e) => setRejectNote(e.target.value)}
                                  placeholder="Reason for rejection"
                                />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={handleRejectTransaction}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Reject
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 