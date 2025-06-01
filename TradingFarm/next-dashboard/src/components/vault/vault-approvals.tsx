'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Filter,
  RefreshCw,
  Clock
} from 'lucide-react';
import { getVaultPendingApprovals, approveTransaction } from '@/services/vault-service';
import { VaultTransaction } from '@/types/vault-types';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VaultApprovalsProps {
  userId: string;
  onRefresh: () => void;
}

export default function VaultApprovals({ userId, onRefresh }: VaultApprovalsProps) {
  const [pendingApprovals, setPendingApprovals] = useState<VaultTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<VaultTransaction | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPendingApprovals();
  }, [userId]);

  const loadPendingApprovals = async () => {
    setLoading(true);
    try {
      const result = await getVaultPendingApprovals(userId);
      setPendingApprovals(result);
    } catch (error) {
      console.error('Error loading pending approvals:', error);
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
        loadPendingApprovals();
        onRefresh();
      }
    } catch (error) {
      console.error('Unexpected error during approval:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }) + ' ' + currency;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch (error) {
      return dateString;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Deposit</Badge>;
      case 'withdrawal':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Withdrawal</Badge>;
      case 'transfer':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Transfer</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return 'No deadline';
    
    const expiry = new Date(expiresAt);
    const now = new Date();
    
    if (expiry < now) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    const diffMs = expiry.getTime() - now.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHrs < 24) {
      return <Badge variant="destructive">{diffHrs}h remaining</Badge>;
    } else {
      const days = Math.floor(diffHrs / 24);
      return <Badge variant="outline">{days}d remaining</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Pending Approvals</h2>
          <p className="text-muted-foreground">Transactions requiring your verification</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPendingApprovals}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval Requests</CardTitle>
          <CardDescription>
            {pendingApprovals.length} transaction{pendingApprovals.length !== 1 ? 's' : ''} awaiting your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-[120px]" />
                </div>
              ))}
            </div>
          ) : pendingApprovals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Vault</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Time Remaining</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getTypeIcon(transaction.type)}
                        <span className="text-sm text-muted-foreground">
                          {formatDate(transaction.timestamp)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {transaction.vault?.name || 'Unknown Vault'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.account?.name || 'Unknown Account'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatAmount(transaction.amount, transaction.currency)}
                      </div>
                      {transaction.fee > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Fee: {formatAmount(transaction.fee, transaction.fee_currency || transaction.currency)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {transaction.created_by_user?.name || 'System'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.approval_initiator || 'Auto-generated'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {getTimeRemaining(transaction.approval_deadline)}
                      </div>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleApproveTransaction(transaction)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setApprovalDialogOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium mb-2">No pending approvals</h3>
              <p className="text-muted-foreground">
                All transactions have been approved or don't require your verification
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={loadPendingApprovals}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Again
              </Button>
            </div>
          )}
        </CardContent>
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
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="font-medium capitalize">{selectedTransaction.type}</div>
                  <Badge>{selectedTransaction.approval_status}</Badge>
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
                    <span className="text-muted-foreground">Vault</span>
                    <span>{selectedTransaction.vault?.name || 'Unknown Vault'}</span>
                  </div>
                  
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
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created By</span>
                    <span>{selectedTransaction.created_by_user?.name || 'System'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approval Deadline</span>
                    <span>{selectedTransaction.approval_deadline ? formatDate(selectedTransaction.approval_deadline) : 'No deadline'}</span>
                  </div>
                  
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
                  
                  {selectedTransaction.approval_logs && selectedTransaction.approval_logs.length > 0 && (
                    <div className="pt-2">
                      <div className="text-muted-foreground mb-1">Approval History</div>
                      <div className="space-y-2">
                        {selectedTransaction.approval_logs.map((log, idx) => (
                          <div key={idx} className="text-sm bg-muted p-2 rounded">
                            <div className="flex justify-between">
                              <span>{log.user.name}</span>
                              <span>{log.action}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(log.timestamp)}
                            </div>
                            {log.comment && (
                              <div className="mt-1 text-xs">{log.comment}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
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
                  
                  <div className="text-muted-foreground">Vault:</div>
                  <div>{selectedTransaction.vault?.name || 'Unknown'}</div>
                  
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
