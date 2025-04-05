'use client';

import { useState, useEffect } from 'react';
import { ArrowLeftRight, RefreshCw, ChevronLeft, Eye, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TransactionList } from '@/components/banking/transaction-list';
import { TransactionForm } from '@/components/banking/transaction-form';
import { AccountsList } from '@/components/banking/accounts-list';
import { VaultAccount, Transaction, TransactionApproval, createUnifiedBankingService } from '@/services/unified-banking-service';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import ElizaChatInterface from '@/components/eliza/eliza-chat-interface';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function VaultTransactionsPage() {
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactionType, setTransactionType] = useState<string>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<Transaction[]>([]);
  const [userCanApprove, setUserCanApprove] = useState(false);
  
  const { toast } = useToast();
  const bankingService = createUnifiedBankingService();
  const supabase = createBrowserClient();
  
  // Fetch user and farm data
  useEffect(() => {
    async function getUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          setUserCanApprove(true); // In a real app, you'd check if user has approval rights
          
          // Get user's primary farm
          const { data: farms } = await supabase
            .from('farms')
            .select('id, name')
            .eq('user_id', user.id);
          
          if (farms && farms.length > 0) {
            setFarmId(farms[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    }
    
    getUserData();
  }, []);
  
  // Load accounts and transactions
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all accounts
      const fetchedAccounts = await bankingService.getAccounts();
      setAccounts(fetchedAccounts);
      
      // Fetch pending approvals
      const pendingTransactions = await bankingService.getTransactions({ 
        approval_status: 'required'
      });
      setPendingApprovals(pendingTransactions);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const handleCreateTransaction = async (transactionData: Transaction) => {
    try {
      await bankingService.createTransaction(transactionData);
      
      toast({
        title: 'Success',
        description: 'Transaction submitted successfully',
      });
      
      setShowTransactionDialog(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to create transaction. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const handleTransactionSelect = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };
  
  const handleApproveTransaction = async (approve: boolean) => {
    if (!selectedTransaction || !selectedTransaction.id || !userId) {
      return;
    }
    
    try {
      await bankingService.approveTransaction(
        selectedTransaction.id,
        userId,
        approve,
        approve ? 'Approved' : 'Rejected'
      );
      
      toast({
        title: approve ? 'Approved' : 'Rejected',
        description: `Transaction ${approve ? 'approved' : 'rejected'} successfully`,
      });
      
      setShowTransactionDetails(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error approving transaction:', error);
      toast({
        title: 'Error',
        description: `Failed to ${approve ? 'approve' : 'reject'} transaction`,
        variant: 'destructive',
      });
    }
  };
  
  // Helper function to find account by ID
  const getAccountName = (accountId?: string): string => {
    if (!accountId) return 'Unknown';
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : 'Unknown';
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/banking/vault">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          </div>
          <p className="text-muted-foreground">
            View and manage all financial transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowTransactionDialog(true)}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-7">
        {/* Transactions Section - Takes up 5/7 of the width on medium screens and up */}
        <div className="md:col-span-5 space-y-6">
          {/* Pending Approvals Card */}
          {pendingApprovals.length > 0 && userCanApprove && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-amber-500" />
                  Pending Approvals
                </CardTitle>
                <CardDescription>
                  Transactions requiring your approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingApprovals.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between border-b pb-3">
                      <div>
                        <div className="font-medium">{transaction.transaction_type.toUpperCase()}</div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.transaction_type === 'transfer' ? (
                            <>From: {getAccountName(transaction.source_account_id)} → To: {getAccountName(transaction.destination_account_id)}</>
                          ) : transaction.transaction_type === 'withdrawal' ? (
                            <>From: {getAccountName(transaction.source_account_id)}</>
                          ) : (
                            <>To: {getAccountName(transaction.destination_account_id)}</>
                          )}
                        </div>
                        <div className="text-sm font-mono">
                          {formatCurrency(transaction.amount)} {transaction.currency}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleTransactionSelect(transaction)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Transactions List */}
          <Tabs 
            defaultValue="all" 
            onValueChange={setTransactionType}
            className="w-full"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Transactions</TabsTrigger>
              <TabsTrigger value="deposit">Deposits</TabsTrigger>
              <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
              <TabsTrigger value="transfer">Transfers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="m-0">
              <TransactionList 
                filter={{}} 
                onTransactionSelect={handleTransactionSelect}
                onCreateTransaction={() => setShowTransactionDialog(true)}
              />
            </TabsContent>
            
            <TabsContent value="deposit" className="m-0">
              <TransactionList 
                filter={{ transaction_type: 'deposit' }} 
                onTransactionSelect={handleTransactionSelect}
                onCreateTransaction={() => setShowTransactionDialog(true)}
              />
            </TabsContent>
            
            <TabsContent value="withdrawal" className="m-0">
              <TransactionList 
                filter={{ transaction_type: 'withdrawal' }} 
                onTransactionSelect={handleTransactionSelect}
                onCreateTransaction={() => setShowTransactionDialog(true)}
              />
            </TabsContent>
            
            <TabsContent value="transfer" className="m-0">
              <TransactionList 
                filter={{ transaction_type: 'transfer' }} 
                onTransactionSelect={handleTransactionSelect}
                onCreateTransaction={() => setShowTransactionDialog(true)}
              />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Assistant Section - Takes up 2/7 of the width on medium screens and up */}
        <div className="md:col-span-2">
          <ElizaChatInterface
            initialContext={{
              module: 'banking-vault',
              userId: userId || '',
              farmId: farmId || '',
              view: 'transactions'
            }}
            showTitle={true}
            title="Banking Assistant"
          />
        </div>
      </div>
      
      {/* Transaction Details Dialog */}
      <Dialog open={showTransactionDetails} onOpenChange={setShowTransactionDetails}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              View transaction information
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Type</h3>
                  <p className="font-medium">
                    <Badge 
                      variant="outline"
                      className={
                        selectedTransaction.transaction_type === 'deposit' ? 'bg-green-100' :
                        selectedTransaction.transaction_type === 'withdrawal' ? 'bg-red-100' :
                        'bg-blue-100'
                      }
                    >
                      {selectedTransaction.transaction_type.toUpperCase()}
                    </Badge>
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <p className="font-medium">
                    <Badge 
                      variant="outline"
                      className={
                        selectedTransaction.approval_status === 'required' ? 'bg-amber-100' :
                        selectedTransaction.status === 'completed' ? 'bg-green-100' :
                        selectedTransaction.status === 'failed' ? 'bg-red-100' :
                        'bg-slate-100'
                      }
                    >
                      {selectedTransaction.approval_status === 'required' 
                        ? 'Pending Approval' 
                        : selectedTransaction.status?.toUpperCase()}
                    </Badge>
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Amount</h3>
                <p className="text-xl font-medium font-mono">{formatCurrency(selectedTransaction.amount)} {selectedTransaction.currency}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {selectedTransaction.source_account_id && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">From Account</h3>
                    <p className="font-medium">{getAccountName(selectedTransaction.source_account_id)}</p>
                    <p className="text-xs text-muted-foreground">{selectedTransaction.source_account_id}</p>
                  </div>
                )}
                
                {selectedTransaction.destination_account_id && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">To Account</h3>
                    <p className="font-medium">{getAccountName(selectedTransaction.destination_account_id)}</p>
                    <p className="text-xs text-muted-foreground">{selectedTransaction.destination_account_id}</p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Transaction ID</h3>
                  <p className="text-xs font-mono">{selectedTransaction.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Date</h3>
                  <p className="font-medium">
                    {selectedTransaction.created_at 
                      ? formatDate(new Date(selectedTransaction.created_at)) 
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
              
              {selectedTransaction.metadata?.memo && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Memo</h3>
                  <p className="text-sm">{selectedTransaction.metadata.memo}</p>
                </div>
              )}
              
              {/* Approval actions */}
              {selectedTransaction.approval_status === 'required' && userCanApprove && (
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => handleApproveTransaction(false)}>
                    Reject
                  </Button>
                  <Button onClick={() => handleApproveTransaction(true)}>
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* New Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Transaction</DialogTitle>
            <DialogDescription>
              Move funds between your accounts
            </DialogDescription>
          </DialogHeader>
          
          <TransactionForm 
            accounts={accounts}
            onSubmit={handleCreateTransaction}
            onCancel={() => setShowTransactionDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
