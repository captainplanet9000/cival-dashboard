'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Wallet, 
  ChevronLeft, 
  Plus, 
  ArrowLeftRight, 
  Search,
  Filter,
  RefreshCw,
  Download
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
import { AccountsList } from '@/components/banking/accounts-list';
import { BalanceOverview } from '@/components/banking/balance-overview';
import { VaultAccount, createUnifiedBankingService } from '@/services/unified-banking-service';
import { useToast } from '@/components/ui/use-toast';

export default function AccountsAndBalancesPage() {
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { toast } = useToast();
  const bankingService = createUnifiedBankingService();
  
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const fetchedAccounts = await bankingService.getAccounts();
      setAccounts(fetchedAccounts);
      
      // Calculate total balance
      const total = fetchedAccounts.reduce((sum, account) => sum + (account.balance || 0), 0);
      setTotalBalance(total);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load accounts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAccounts();
  }, []);
  
  // Filter handling moved to the AccountsList component directly for better compatibility
  
  const openAddAccountModal = () => {
    // Implementation for adding a new account
    toast({
      title: 'Coming Soon',
      description: 'Account creation functionality will be available soon.',
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
            <h1 className="text-2xl font-bold tracking-tight">Accounts & Balances</h1>
          </div>
          <p className="text-muted-foreground mt-1">Manage your exchange accounts and view consolidated balances</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => fetchAccounts()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="default" size="sm" onClick={openAddAccountModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>
      
      {/* Balance Overview */}
      {/* Balance Overview - Component needs to be adjusted for proper props */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Across {accounts.length} accounts</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Accounts Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-medium">Your Accounts</CardTitle>
              <CardDescription>View and manage all your connected accounts</CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search accounts..."
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
          {/* Account Type Tabs */}
          <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Accounts</TabsTrigger>
              <TabsTrigger value="master">Master</TabsTrigger>
              <TabsTrigger value="farm">Farm</TabsTrigger>
              <TabsTrigger value="agent">Agent</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Account List Component */}
          <AccountsList 
            filter={{ 
              account_type: activeTab !== 'all' ? activeTab : undefined,
              ...(searchQuery ? { search: searchQuery } : {})
            }} 
            onCreateAccount={openAddAccountModal}
          />
          
          {/* Empty state when no accounts match filters */}
          {accounts.length === 0 && !loading && (
            <div className="text-center py-12">
              <Wallet className="mx-auto h-12 w-12 text-muted-foreground opacity-30" />
              <h3 className="mt-4 text-lg font-medium">No accounts found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by adding your first account.'}
              </p>
              <Button variant="outline" className="mt-4" onClick={openAddAccountModal}>
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
