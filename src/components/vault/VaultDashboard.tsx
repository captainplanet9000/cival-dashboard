"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VaultAccount, Transaction, VaultBalance, TransactionStatus, TransactionType } from '@/types/vault-banking';
import { vaultBankingService } from '@/data-access/services/vault-banking-service';
import { Skeleton } from "@/components/ui/skeleton";
import TransactionList from './TransactionList';
import AccountBalanceChart from './AccountBalanceChart';
import { AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, Eye, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface VaultDashboardProps {
  userId: string;
  selectedAccountId?: string;
}

export default function VaultDashboard({ userId, selectedAccountId }: VaultDashboardProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<VaultAccount | null>(null);
  const [accountBalance, setAccountBalance] = useState<VaultBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [securityScore, setSecurityScore] = useState(0);
  const [pendingActions, setPendingActions] = useState<Transaction[]>([]);
  
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const fetchedAccounts = await vaultBankingService.getAccounts(userId);
        setAccounts(fetchedAccounts);
        
        // Set the active account
        if (selectedAccountId && fetchedAccounts.some(a => a.id === selectedAccountId)) {
          const selected = fetchedAccounts.find(a => a.id === selectedAccountId) || null;
          setActiveAccount(selected);
        } else if (fetchedAccounts.length > 0) {
          setActiveAccount(fetchedAccounts[0]);
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAccounts();
  }, [userId, selectedAccountId]);
  
  useEffect(() => {
    if (activeAccount) {
      const fetchAccountData = async () => {
        try {
          setLoading(true);
          
          // Fetch account balance
          const balance = await vaultBankingService.getBalance(activeAccount.id);
          setAccountBalance(balance);
          
          // Fetch recent transactions
          const recentTransactions = await vaultBankingService.getTransactions({
            accountId: activeAccount.id,
            limit: 10
          });
          setTransactions(recentTransactions);
          
          // Fetch pending actions
          const pendingTxs = await vaultBankingService.getTransactions({
            accountId: activeAccount.id,
            statuses: [TransactionStatus.PENDING]
          });
          setPendingActions(pendingTxs);
          
          // Calculate security score
          calculateSecurityScore(activeAccount);
        } catch (error) {
          console.error('Error fetching account data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchAccountData();
    }
  }, [activeAccount]);
  
  const calculateSecurityScore = (account: VaultAccount) => {
    let score = 0;
    
    // Basic account security
    if (account.securityLevel === 'maximum') score += 40;
    else if (account.securityLevel === 'enhanced') score += 25;
    else score += 10;
    
    // Access rules
    if (account.accessRules.twoFactorRequired) score += 20;
    if (account.accessRules.whitelistedIps && account.accessRules.whitelistedIps.length > 0) score += 15;
    if (account.accessRules.approvalRequired) score += 15;
    
    // Risk score (lower is better)
    score += Math.max(0, 10 - account.riskScore / 10);
    
    setSecurityScore(score);
  };
  
  const handleSelectAccount = (account: VaultAccount) => {
    setActiveAccount(account);
    router.push(`/dashboard/vault/${account.id}`);
  };
  
  const handleRefresh = async () => {
    if (!activeAccount) return;
    
    try {
      setLoading(true);
      
      // Refresh account data
      const account = await vaultBankingService.getAccount(activeAccount.id);
      setActiveAccount(account);
      
      // Refresh account balance
      const balance = await vaultBankingService.getBalance(activeAccount.id);
      setAccountBalance(balance);
      
      // Refresh transactions
      const recentTransactions = await vaultBankingService.getTransactions({
        accountId: activeAccount.id,
        limit: 10
      });
      setTransactions(recentTransactions);
      
      // Refresh pending actions
      const pendingTxs = await vaultBankingService.getTransactions({
        accountId: activeAccount.id,
        statuses: [TransactionStatus.PENDING]
      });
      setPendingActions(pendingTxs);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'maximum': return 'text-green-500 bg-green-100';
      case 'enhanced': return 'text-blue-500 bg-blue-100';
      case 'standard': return 'text-yellow-500 bg-yellow-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };
  
  const getTransactionStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.COMPLETED: return 'bg-green-100 text-green-600';
      case TransactionStatus.PENDING: return 'bg-yellow-100 text-yellow-600';
      case TransactionStatus.PROCESSING: return 'bg-blue-100 text-blue-600';
      case TransactionStatus.FAILED: return 'bg-red-100 text-red-600';
      case TransactionStatus.CANCELLED: return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
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
  
  if (loading && !activeAccount) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
        <Skeleton className="h-64 w-full mt-4" />
      </div>
    );
  }
  
  if (accounts.length === 0 && !loading) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No Vault Accounts</CardTitle>
          <CardDescription>You don't have any vault accounts yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first vault account to start managing your funds securely.
          </p>
          <Button onClick={() => router.push('/dashboard/vault/new')}>
            Create Vault Account
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Vault Banking</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => router.push('/dashboard/vault/new')}>
            New Account
          </Button>
        </div>
      </div>
      
      {/* Account selector */}
      <div className="flex overflow-x-auto pb-2 space-x-2 scrollbar-hide">
        {accounts.map(account => (
          <Card 
            key={account.id} 
            className={`min-w-[220px] cursor-pointer transition-all ${activeAccount?.id === account.id ? 'ring-2 ring-primary' : 'hover:bg-secondary/10'}`}
            onClick={() => handleSelectAccount(account)}
          >
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium line-clamp-1">{account.name}</CardTitle>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={getSecurityLevelColor(account.securityLevel)}>
                  {account.securityLevel}
                </Badge>
                {!account.isActive && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="py-2">
              <p className="text-xl font-bold">{formatCurrency(account.balance, account.currency)}</p>
              <p className="text-xs text-muted-foreground">{account.type}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {activeAccount && accountBalance && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">
              Transactions
              {pendingActions.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingActions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(accountBalance.total, accountBalance.currency)}</div>
                  <p className="text-xs text-muted-foreground">
                    Available: {formatCurrency(accountBalance.available, accountBalance.currency)}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {pendingActions.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pendingActions.length > 0 
                      ? `${formatCurrency(pendingActions.reduce((sum, t) => sum + t.amount, 0), accountBalance.currency)} pending` 
                      : 'No pending transactions'}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Security Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {securityScore}/100
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full mt-2">
                    <div 
                      className={`h-2 rounded-full ${
                        securityScore > 70 ? 'bg-green-500' : securityScore > 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${securityScore}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Balance History</CardTitle>
                <CardDescription>Last 30 days of account activity</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <AccountBalanceChart 
                  data={accountBalance.historicalData || []}
                  currency={accountBalance.currency}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Latest activity in your account</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('transactions')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No transactions found</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {transactions.slice(0, 5).map(transaction => (
                      <div key={transaction.id} className="flex items-center justify-between py-2 border-b">
                        <div className="flex items-center">
                          <div className="mr-3 p-2 rounded-full bg-secondary">
                            {getTransactionTypeIcon(transaction.type)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{transaction.description || transaction.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${
                            transaction.type === TransactionType.DEPOSIT || 
                            transaction.type === TransactionType.INTEREST || 
                            transaction.type === TransactionType.REWARD
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {transaction.type === TransactionType.DEPOSIT || 
                             transaction.type === TransactionType.INTEREST || 
                             transaction.type === TransactionType.REWARD
                              ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
                          </p>
                          <Badge variant="outline" className={getTransactionStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t bg-secondary/10 flex justify-between">
                <p className="text-sm text-muted-foreground">
                  Total: <span className="font-medium">{transactions.length}</span> transactions
                </p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('transactions')}>
                  See All Transactions
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>View and manage all your transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingActions.length > 0 && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Pending Actions Required</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          You have {pendingActions.length} transaction{pendingActions.length !== 1 ? 's' : ''} that require your attention
                        </p>
                        <Button size="sm" variant="secondary" onClick={() => {}}>
                          Review Pending Actions
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                <TransactionList 
                  accountId={activeAccount.id}
                  userId={userId}
                  onUpdate={handleRefresh}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
                <CardDescription>Review and enhance your account security</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h3 className="text-lg font-medium flex items-center mb-2">
                    <Shield className="w-5 h-5 mr-2 text-blue-500" />
                    Security Overview
                  </h3>
                  <div className="flex items-center mb-4">
                    <div className="mr-4">
                      <div className="text-3xl font-bold">
                        {securityScore}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Security Score
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-secondary h-3 rounded-full">
                        <div 
                          className={`h-3 rounded-full ${
                            securityScore > 70 ? 'bg-green-500' : securityScore > 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${securityScore}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Weak</span>
                        <span>Good</span>
                        <span>Excellent</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Security Settings</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center justify-between">
                        <span className="text-sm">Two-Factor Authentication</span>
                        <Badge variant={activeAccount.accessRules.twoFactorRequired ? "default" : "outline"}>
                          {activeAccount.accessRules.twoFactorRequired ? "Enabled" : "Disabled"}
                        </Badge>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-sm">Withdrawal Approval</span>
                        <Badge variant={activeAccount.accessRules.approvalRequired ? "default" : "outline"}>
                          {activeAccount.accessRules.approvalRequired ? "Required" : "Not Required"}
                        </Badge>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-sm">IP Whitelist</span>
                        <Badge variant={activeAccount.accessRules.whitelistedIps && activeAccount.accessRules.whitelistedIps.length > 0 ? "default" : "outline"}>
                          {activeAccount.accessRules.whitelistedIps && activeAccount.accessRules.whitelistedIps.length > 0 
                            ? `${activeAccount.accessRules.whitelistedIps.length} IPs` 
                            : "Not Set"}
                        </Badge>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-sm">Withdrawal Time Lock</span>
                        <Badge variant="outline">
                          {activeAccount.accessRules.withdrawalTimelock} hours
                        </Badge>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Withdrawal Limits</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Daily Limit</p>
                        <p className="text-lg font-medium">{formatCurrency(activeAccount.accessRules.withdrawalLimit, activeAccount.currency)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Weekly Limit</p>
                        <p className="text-lg font-medium">{formatCurrency(activeAccount.accessRules.withdrawalLimit * 5, activeAccount.currency)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly Limit</p>
                        <p className="text-lg font-medium">{formatCurrency(activeAccount.accessRules.withdrawalLimit * 20, activeAccount.currency)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button onClick={() => router.push(`/dashboard/vault/${activeAccount.id}/security`)}>
                    Manage Security Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your vault account settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium mb-1">Account Name</h3>
                      <p>{activeAccount.name}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-1">Account Type</h3>
                      <p>{activeAccount.type}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-1">Currency</h3>
                      <p>{activeAccount.currency}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-1">Status</h3>
                      <Badge variant={activeAccount.isActive ? "default" : "destructive"}>
                        {activeAccount.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  
                  {activeAccount.address && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Blockchain Address</h3>
                      <div className="font-mono text-xs bg-secondary/20 p-2 rounded">
                        {activeAccount.address}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium mb-1">Created At</h3>
                    <p>{new Date(activeAccount.createdAt).toLocaleString()}</p>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium mb-2">Danger Zone</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline">
                        Edit Account
                      </Button>
                      <Button variant="destructive">
                        {activeAccount.isActive ? "Deactivate Account" : "Activate Account"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 