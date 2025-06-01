'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Download,
  FileDown,
  FileUp,
  Filter,
  Plus,
  RefreshCw,
  Search,
  ArrowLeftRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Transaction, createUnifiedBankingService } from '@/services/unified-banking-service';
import { TransactionList } from '@/components/banking/transaction-list';
import { useToast } from '@/components/ui/use-toast';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { toast } = useToast();
  const bankingService = createUnifiedBankingService();

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const fetchedTransactions = await bankingService.getTransactions();
      setTransactions(fetchedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTransactions();
  }, []);
  
  const filteredTransactions = transactions.filter((transaction: Transaction) => {
    // Apply tab filter
    if (activeTab !== 'all' && transaction.transaction_type !== mapTabToType(activeTab)) {
      return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (transaction.id && transaction.id.toLowerCase().includes(query)) ||
        (transaction.source_account_id && transaction.source_account_id.toLowerCase().includes(query)) ||
        (transaction.destination_account_id && transaction.destination_account_id.toLowerCase().includes(query)) ||
        transaction.currency.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Helper function to map tab values to transaction types
  const mapTabToType = (tab: string): string => {
    switch (tab) {
      case 'deposit': return 'deposit';
      case 'withdrawal': return 'withdrawal';
      case 'transfer': return 'transfer';
      case 'trade': return 'trade';
      case 'fee': return 'fee';
      default: return '';
    }
  };
  
  const openNewTransactionModal = () => {
    toast({
      title: 'Coming Soon',
      description: 'Transaction creation functionality will be available soon.',
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/funding">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          </div>
          <p className="text-muted-foreground mt-1">View and manage all your financial transactions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => fetchTransactions()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="default" size="sm" onClick={openNewTransactionModal}>
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        </div>
      </div>
      
      {/* Transaction Summary */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground">All-time transaction count</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deposits</CardTitle>
            <FileDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions.filter(t => t.transaction_type === 'deposit').length}
            </div>
            <p className="text-xs text-muted-foreground">Incoming funds</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Withdrawals</CardTitle>
            <FileUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions.filter(t => t.transaction_type === 'withdrawal').length}
            </div>
            <p className="text-xs text-muted-foreground">Outgoing funds</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Transactions List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-medium">Transaction History</CardTitle>
              <CardDescription>Complete record of all financial transactions</CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  className="pl-8 h-9 w-full sm:w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Transaction Type Tabs */}
          <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="deposit">Deposits</TabsTrigger>
              <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
              <TabsTrigger value="transfer">Transfers</TabsTrigger>
              <TabsTrigger value="trade">Trades</TabsTrigger>
              <TabsTrigger value="fee">Fees</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Transaction List Component */}
          <TransactionList 
            filter={{ transaction_type: activeTab !== 'all' ? mapTabToType(activeTab) : undefined }} 
            transactions={filteredTransactions}
            onCreateTransaction={openNewTransactionModal}
          />
          
          {/* Empty state when no transactions match filters */}
          {filteredTransactions.length === 0 && !loading && (
            <div className="text-center py-12">
              <ArrowLeftRight className="mx-auto h-12 w-12 text-muted-foreground opacity-30" />
              <h3 className="mt-4 text-lg font-medium">No transactions found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by creating your first transaction.'}
              </p>
              <Button variant="outline" className="mt-4" onClick={openNewTransactionModal}>
                <Plus className="mr-2 h-4 w-4" />
                New Transaction
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
