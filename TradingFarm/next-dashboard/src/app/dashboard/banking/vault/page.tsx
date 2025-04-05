'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Wallet, 
  BarChart2, 
  ChevronLeft,
  Users,
  ArrowLeftRight,
  Shield,
  Settings,
  Database,
  RefreshCw,
  ExternalLink,
  Landmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountsList } from '@/components/banking/accounts-list';
import { TransactionList } from '@/components/banking/transaction-list';
import { VaultAccount, Transaction, createUnifiedBankingService } from '@/services/unified-banking-service';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import ElizaChatInterface from '@/components/eliza/eliza-chat-interface';
import { formatCurrency } from '@/lib/utils';

export default function VaultDashboardPage() {
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  
  const { toast } = useToast();
  const bankingService = createUnifiedBankingService();
  const supabase = createBrowserClient();
  const searchParams = useSearchParams();
  
  // Fetch user and data
  useEffect(() => {
    async function getUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          
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
  
  // Fetch accounts and transactions
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all accounts
      const fetchedAccounts = await bankingService.getAccounts();
      setAccounts(fetchedAccounts);
      
      // Calculate total balance
      const total = fetchedAccounts.reduce((sum, account) => sum + (account.balance || 0), 0);
      setTotalBalance(total);
      
      // Fetch recent transactions
      const transactions = await bankingService.getTransactions();
      setRecentTransactions(transactions.slice(0, 5)); // Get 5 most recent
      
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
  
  // Get account type counts
  const getMasterAccountCount = () => accounts.filter(a => a.account_type === 'master').length;
  const getFarmAccountCount = () => accounts.filter(a => a.account_type === 'farm').length;
  const getAgentAccountCount = () => accounts.filter(a => a.account_type === 'agent').length;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/banking">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Vault Banking</h1>
          </div>
          <p className="text-muted-foreground">
            Unified banking system for all your financial operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/banking/vault/accounts">
          <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Accounts</CardTitle>
                <Wallet className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  <div>{accounts.length} total accounts</div>
                  <div className="mt-1 font-medium text-foreground">
                    {formatCurrency(totalBalance)}
                  </div>
                </div>
                <div className="text-sm text-right">
                  <div>{getMasterAccountCount()} master</div>
                  <div>{getFarmAccountCount()} farm</div>
                  <div>{getAgentAccountCount()} agent</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/banking/vault/transactions">
          <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Transactions</CardTitle>
                <ArrowLeftRight className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-sm text-muted-foreground">
                <div>
                  {recentTransactions.length > 0 
                    ? `${recentTransactions.length} recent transactions` 
                    : 'No recent transactions'}
                </div>
                <div className="mt-1 font-medium text-foreground">
                  Manage money movement
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/banking/vault/migration">
          <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Migration</CardTitle>
                <Database className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-sm text-muted-foreground">
                <div>Migrate legacy wallets</div>
                <div className="mt-1 font-medium text-foreground">
                  Transition to unified vault
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/banking/vault/settings">
          <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Settings</CardTitle>
                <Settings className="h-5 w-5 text-slate-500" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-sm text-muted-foreground">
                <div>Configure vault accounts</div>
                <div className="mt-1 font-medium text-foreground">
                  Security and preferences
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/banking/vault/account-management">
          <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Account Management</CardTitle>
                <Users className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-sm text-muted-foreground">
                <div>Manage account access and permissions</div>
                <div className="mt-1 font-medium text-foreground">
                  Control user roles and access levels
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/banking/vault/transaction-system">
          <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Transaction System</CardTitle>
                <ArrowLeftRight className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-sm text-muted-foreground">
                <div>Manage transactions and payments</div>
                <div className="mt-1 font-medium text-foreground">
                  Track and verify transactions
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/dashboard/banking/vault/migration-interface">
          <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Migration Interface</CardTitle>
                <Database className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-sm text-muted-foreground">
                <div>Migrate legacy data to unified vault</div>
                <div className="mt-1 font-medium text-foreground">
                  Transition to unified vault
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-7">
        {/* Dashboard Panels - Takes up 5/7 of the width on medium screens and up */}
        <div className="md:col-span-5 space-y-6">
          {/* Recent Accounts */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-medium">Your Accounts</CardTitle>
                  <CardDescription>
                    Overview of your vault accounts
                  </CardDescription>
                </div>
                <Link href="/dashboard/banking/vault/accounts">
                  <Button variant="outline" size="sm">
                    View All
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <AccountsList 
                filter={{}} 
                onCreateAccount={() => window.location.href = '/dashboard/banking/vault/accounts'}
              />
            </CardContent>
          </Card>
          
          {/* Recent Transactions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-medium">Recent Transactions</CardTitle>
                  <CardDescription>
                    Your latest financial activities
                  </CardDescription>
                </div>
                <Link href="/dashboard/banking/vault/transactions">
                  <Button variant="outline" size="sm">
                    View All
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <TransactionList 
                filter={{}} 
                limit={5}
                onCreateTransaction={() => window.location.href = '/dashboard/banking/vault/transactions'}
              />
            </CardContent>
          </Card>
          
          {/* Features Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="p-4">
                <div className="flex flex-col items-center text-center">
                  <Shield className="h-8 w-8 text-blue-500 mb-2" />
                  <CardTitle className="text-base">Enhanced Security</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <p className="text-sm text-center text-muted-foreground">
                  Multi-signature controls and advanced security features protect your assets
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-4">
                <div className="flex flex-col items-center text-center">
                  <Users className="h-8 w-8 text-green-500 mb-2" />
                  <CardTitle className="text-base">Team Collaboration</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <p className="text-sm text-center text-muted-foreground">
                  Shared accounts with customizable permissions for your team
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-4">
                <div className="flex flex-col items-center text-center">
                  <BarChart2 className="h-8 w-8 text-purple-500 mb-2" />
                  <CardTitle className="text-base">Performance Analytics</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <p className="text-sm text-center text-muted-foreground">
                  Track account performance and transaction history with detailed metrics
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Assistant Section - Takes up 2/7 of the width on medium screens and up */}
        <div className="md:col-span-2">
          <ElizaChatInterface
            initialContext={{
              module: 'banking-vault',
              userId: userId || '',
              farmId: farmId || '',
              view: 'dashboard',
              accountCount: accounts.length,
              balance: totalBalance
            }}
            showTitle={true}
            title="Banking Assistant"
          />
        </div>
      </div>
    </div>
  );
}
