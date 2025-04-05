'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowLeftRight,
  Shield, 
  RefreshCw, 
  FileDown, 
  MoreHorizontal, 
  ChevronRight,
  AlertTriangle,
  Link,
  Lock
} from 'lucide-react';
import { unifiedBankingService } from '@/services/unifiedBankingService';
import { VaultMaster, VaultAccount, VaultTransaction, TransactionStatus, TransactionType } from '@/types/vault';
import { AccountsOverview } from './unified/AccountsOverview';
import { TransactionsPanel } from './unified/TransactionsPanel';
import { SecurityPanel } from './unified/SecurityPanel';
import { IntegrationsPanel } from './unified/IntegrationsPanel';

interface UnifiedBankingDashboardProps {
  userId: string;
  farmId?: string;
}

export function UnifiedBankingDashboard({ userId, farmId }: UnifiedBankingDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [balanceSummary, setBalanceSummary] = useState<{
    totalBalance: number;
    allocatedToFarms: number;
    allocatedToAgents: number;
    reserveBalance: number;
    pendingTransactions: number;
  } | null>(null);
  const [masterVaults, setMasterVaults] = useState<VaultMaster[]>([]);
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<VaultTransaction[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<VaultTransaction[]>([]);
  
  useEffect(() => {
    // Store active tab in local storage
    localStorage.setItem('bankingActiveTab', activeTab);
    
    // Load data when tab changes
    loadTabData(activeTab);
  }, [activeTab]);
  
  useEffect(() => {
    loadInitialData();
  }, [userId, farmId]);
  
  // Load common data needed across multiple tabs
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load balance summary
      const summary = await unifiedBankingService.getBalanceSummary();
      setBalanceSummary(summary);
      
      // Load master vaults
      const vaults = await unifiedBankingService.getMasterVaultsByOwner(userId);
      setMasterVaults(vaults);
      
      // Load recent transactions
      const transactions = await unifiedBankingService.getTransactions({
        limit: 5
      });
      setRecentTransactions(transactions);
      
      // Load pending approvals
      const pending = await unifiedBankingService.getTransactions({
        statuses: [TransactionStatus.PENDING],
        limit: 10
      });
      setPendingApprovals(pending);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load initial banking data:', error);
      setIsLoading(false);
    }
  };
  
  // Load data specific to the active tab
  const loadTabData = async (tab: string) => {
    try {
      switch (tab) {
        case 'dashboard':
          // Dashboard data is loaded in initial data
          break;
          
        case 'accounts':
          // Load all accounts
          if (masterVaults.length > 0) {
            const allAccounts = await Promise.all(
              masterVaults.map(vault => 
                unifiedBankingService.getAccountsByMaster(vault.id)
              )
            );
            setAccounts(allAccounts.flat());
          }
          break;
          
        case 'transactions':
          // Load more transactions for transactions tab
          const transactions = await unifiedBankingService.getTransactions({
            limit: 50
          });
          setRecentTransactions(transactions);
          break;
      }
    } catch (error) {
      console.error(`Failed to load data for tab ${tab}:`, error);
    }
  };
  
  // Refresh all data
  const handleRefresh = async () => {
    await loadInitialData();
    await loadTabData(activeTab);
  };
  
  // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Show pending approvals alert if there are any
  const renderPendingApprovalsAlert = () => {
    if (pendingApprovals.length === 0) return null;
    
    return (
      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Pending Transactions</AlertTitle>
        <AlertDescription>
          You have {pendingApprovals.length} transaction{pendingApprovals.length !== 1 ? 's' : ''} requiring approval.
          <Button variant="link" onClick={() => setActiveTab('transactions')}>
            Review Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banking</h1>
          <p className="text-muted-foreground">
            Unified financial management for your trading operations
          </p>
        </div>
        <Button onClick={handleRefresh} className="gap-1">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      {renderPendingApprovalsAlert()}
      
      <div>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="dashboard">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="accounts">
              Accounts
              {pendingApprovals.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingApprovals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="transactions">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="security">
              Security
            </TabsTrigger>
            <TabsTrigger value="integrations">
              Integrations
            </TabsTrigger>
          </TabsList>
          
          <Card>
            <CardHeader className="pb-2">
              <TabsTrigger value={activeTab} disabled className="hidden">Hidden Trigger</TabsTrigger>
              <CardDescription>
                {activeTab === 'dashboard' && 'Comprehensive financial overview of your trading operations'}
                {activeTab === 'accounts' && 'Manage all accounts in a hierarchical structure from master vault to agent accounts'}
                {activeTab === 'transactions' && 'View, filter, and approve transactions across all your accounts'}
                {activeTab === 'security' && 'Configure security policies, approvals, and access controls'}
                {activeTab === 'integrations' && 'Connect and manage external exchanges and blockchain wallets'}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Balance Summary Cards */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        Total Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading || !balanceSummary ? (
                        <Skeleton className="w-full h-10" />
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {formatCurrency(balanceSummary.totalBalance)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Reserve: {formatCurrency(balanceSummary.reserveBalance)}
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        Allocated Funds
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading || !balanceSummary ? (
                        <Skeleton className="w-full h-10" />
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {formatCurrency(balanceSummary.allocatedToFarms + balanceSummary.allocatedToAgents)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Farms: {formatCurrency(balanceSummary.allocatedToFarms)} | 
                            Agents: {formatCurrency(balanceSummary.allocatedToAgents)}
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-500" />
                        Security Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <Skeleton className="w-full h-10" />
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <Lock className="h-3 w-3 mr-1" />
                              Protected
                            </Badge>
                            {pendingApprovals.length > 0 && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                {pendingApprovals.length} Pending Approvals
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Multi-signature protection enabled
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Master Vaults Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">Master Vaults</h3>
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="w-full h-20" />
                      <Skeleton className="w-full h-20" />
                    </div>
                  ) : masterVaults.length === 0 ? (
                    <Card className="bg-muted/40">
                      <CardContent className="flex flex-col items-center justify-center p-6">
                        <p className="mb-2">No master vaults found</p>
                        <Button>Create Master Vault</Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {masterVaults.map(vault => (
                        <Card key={vault.id} className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4 flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">{vault.name}</h4>
                              <div className="text-sm text-muted-foreground">
                                Total: {formatCurrency(vault.totalBalance)} | 
                                Allocated: {formatCurrency(vault.allocatedBalance)}
                              </div>
                            </div>
                            <Button variant="ghost" size="icon">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Recent Transactions */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium">Recent Transactions</h3>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('transactions')}>
                      View All
                    </Button>
                  </div>
                  
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="w-full h-12" />
                      <Skeleton className="w-full h-12" />
                      <Skeleton className="w-full h-12" />
                    </div>
                  ) : recentTransactions.length === 0 ? (
                    <Card className="bg-muted/40">
                      <CardContent className="p-6 text-center">
                        <p>No transactions found</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {recentTransactions.map(tx => (
                        <Card key={tx.id} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-3 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${getTxIconClass(tx.type)}`}>
                                {getTxIcon(tx.type)}
                              </div>
                              <div>
                                <div className="font-medium">{getTxTypeLabel(tx.type)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(tx.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-medium ${tx.type === 'deposit' ? 'text-green-600' : tx.type === 'withdrawal' ? 'text-red-600' : ''}`}>
                                {tx.type === 'withdrawal' ? '-' : tx.type === 'deposit' ? '+' : ''}
                                {formatCurrency(tx.amount)}
                              </div>
                              <Badge variant="outline" className={getStatusBadgeClass(tx.status)}>
                                {tx.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Accounts Tab */}
              <TabsContent value="accounts" className="mt-0">
                <AccountsOverview 
                  accounts={accounts}
                  masterVaults={masterVaults}
                  pendingApprovals={pendingApprovals}
                  isLoading={isLoading}
                  onRefresh={handleRefresh}
                />
              </TabsContent>
              
              {/* Transactions Tab */}
              <TabsContent value="transactions" className="mt-0">
                <TransactionsPanel
                  transactions={recentTransactions}
                  pendingApprovals={pendingApprovals}
                  isLoading={isLoading}
                  onRefresh={handleRefresh}
                />
              </TabsContent>
              
              {/* Security Tab */}
              <TabsContent value="security" className="mt-0">
                <SecurityPanel 
                  masterVaults={masterVaults}
                  accounts={accounts}
                  isLoading={isLoading}
                />
              </TabsContent>
              
              {/* Integrations Tab */}
              <TabsContent value="integrations" className="mt-0">
                <IntegrationsPanel />
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}

// Helper functions for transaction display
function getTxIcon(type: string) {
  switch (type) {
    case 'deposit':
      return <ArrowDownRight className="h-4 w-4" />;
    case 'withdrawal':
      return <ArrowUpRight className="h-4 w-4" />;
    case 'transfer':
    case 'allocation':
      return <ArrowLeftRight className="h-4 w-4" />;
    default:
      return <DollarSign className="h-4 w-4" />;
  }
}

function getTxIconClass(type: string) {
  switch (type) {
    case 'deposit':
      return 'bg-green-100 text-green-600';
    case 'withdrawal':
      return 'bg-red-100 text-red-600';
    case 'transfer':
    case 'allocation':
      return 'bg-blue-100 text-blue-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function getTxTypeLabel(type: string) {
  switch (type) {
    case 'deposit':
      return 'Deposit';
    case 'withdrawal':
      return 'Withdrawal';
    case 'transfer':
      return 'Transfer';
    case 'allocation':
      return 'Allocation';
    case 'fee':
      return 'Fee';
    case 'interest':
      return 'Interest';
    case 'reward':
      return 'Reward';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-50 text-green-700';
    case 'pending':
      return 'bg-yellow-50 text-yellow-700';
    case 'failed':
      return 'bg-red-50 text-red-700';
    case 'cancelled':
      return 'bg-gray-50 text-gray-700';
    default:
      return 'bg-blue-50 text-blue-700';
  }
} 