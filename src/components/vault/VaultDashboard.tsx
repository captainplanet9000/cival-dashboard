"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, Eye, RefreshCw, Shield, AlertTriangle, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { VaultMaster, VaultAccount, VaultBalance, TransactionStatus, TransactionType, VaultTransaction } from '@/types/vault';
import { vaultService } from '@/services/vaultService';
import TransactionList from './TransactionList';
import AccountBalanceChart from './AccountBalanceChart';
import { toast } from '@/components/ui/use-toast';

interface VaultDashboardProps {
  userId: string;
  selectedAccountId?: string;
}

export default function VaultDashboard({ userId, selectedAccountId }: VaultDashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [masterVault, setMasterVault] = useState<VaultMaster | null>(null);
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<VaultAccount | null>(null);
  const [accountBalance, setAccountBalance] = useState<VaultBalance | null>(null);
  const [transactions, setTransactions] = useState<VaultTransaction[]>([]);
  const [pendingActions, setPendingActions] = useState<VaultTransaction[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [securityScore, setSecurityScore] = useState(75); // Default score

  useEffect(() => {
    loadUserVaults();
  }, [userId]);

  useEffect(() => {
    if (selectedAccountId && accounts.length > 0) {
      const account = accounts.find(a => a.id === selectedAccountId);
      if (account) {
        setActiveAccount(account);
      }
    }
  }, [selectedAccountId, accounts]);

  useEffect(() => {
    if (activeAccount) {
      loadAccountData(activeAccount.id);
    }
  }, [activeAccount]);

  const loadUserVaults = async () => {
    try {
      setLoading(true);
      
      // Get user's master vaults
      const vaults = await vaultService.getUserMasterVaults();
      
      if (vaults.length === 0) {
        // User has no vaults, create one
        const newVault = await vaultService.createMasterVault('My Vault', 'Primary vault for financial operations');
        setMasterVault(newVault);
        
        // Create a default trading account
        await vaultService.createVaultAccount(
          newVault.id, 
          'Main Trading Account', 
          'trading', 
          'USD'
        );
        
        // Reload accounts
        const accounts = await vaultService.getVaultAccountsByMaster(newVault.id);
        setAccounts(accounts);
        
        if (accounts.length > 0) {
          setActiveAccount(accounts[0]);
        }
      } else {
        // User has vaults, use the first one
        setMasterVault(vaults[0]);
        
        // Get accounts for this vault
        const accounts = await vaultService.getVaultAccountsByMaster(vaults[0].id);
        setAccounts(accounts);
        
        if (accounts.length > 0) {
          // If there's a selected account ID, use it; otherwise use the first account
          if (selectedAccountId) {
            const selected = accounts.find(a => a.id === selectedAccountId);
            setActiveAccount(selected || accounts[0]);
          } else {
            setActiveAccount(accounts[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading vaults:', error);
      toast({
        title: "Error loading vaults",
        description: "Could not load your vault data. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAccountData = async (accountId: string) => {
    try {
      setLoading(true);
      
      // Get account balance
      const balance = await vaultService.getBalance(accountId);
      setAccountBalance(balance);
      
      // Get recent transactions
      const txs = await vaultService.getTransactions({
        accountId,
        limit: 10
      });
      setTransactions(txs);
      
      // Get pending actions
      const pendingTxs = await vaultService.getTransactions({
        accountId,
        statuses: [TransactionStatus.PENDING]
      });
      setPendingActions(pendingTxs);
    } catch (error) {
      console.error('Error loading account data:', error);
      toast({
        title: "Error loading account data",
        description: "Could not load account details. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      setActiveAccount(account);
      router.push(`/dashboard/vault/${accountId}`);
    }
  };

  const handleRefresh = async () => {
    if (!activeAccount) return;
    
    try {
      setLoading(true);
      
      // Refresh account data
      const account = await vaultService.getVaultAccount(activeAccount.id);
      setActiveAccount(account);
      
      // Refresh account balance
      const balance = await vaultService.getBalance(activeAccount.id);
      setAccountBalance(balance);
      
      // Refresh transactions
      const recentTransactions = await vaultService.getTransactions({
        accountId: activeAccount.id,
        limit: 10
      });
      setTransactions(recentTransactions);
      
      // Refresh pending actions
      const pendingTxs = await vaultService.getTransactions({
        accountId: activeAccount.id,
        statuses: [TransactionStatus.PENDING]
      });
      setPendingActions(pendingTxs);

      toast({
        title: "Refreshed",
        description: "Account data has been refreshed.",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh account data. Please try again.",
        variant: "destructive"
      });
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

  const handleCreateAccount = () => {
    router.push('/dashboard/vault/new-account');
  };

  const handleCreateTransaction = (type: 'deposit' | 'withdraw' | 'transfer') => {
    if (!activeAccount) return;
    router.push(`/dashboard/vault/transaction/new?type=${type}&accountId=${activeAccount.id}`);
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
          <Button onClick={handleCreateAccount}>
            Create Vault Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vault Dashboard</h1>
          <p className="text-muted-foreground">Manage your funds and transactions securely</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={activeAccount?.id} onValueChange={handleAccountChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Accounts</SelectLabel>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button onClick={handleCreateAccount}>
            <Plus className="h-4 w-4 mr-2" />
            New Account
          </Button>
        </div>
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
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" onClick={() => handleCreateTransaction('deposit')} className="flex-1">
                <ArrowDownRight className="h-4 w-4 mr-2" />
                Deposit
              </Button>
              <Button variant="outline" onClick={() => handleCreateTransaction('withdraw')} className="flex-1">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
              <Button variant="outline" onClick={() => handleCreateTransaction('transfer')} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Transfer
              </Button>
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
                              {new Date(transaction.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
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
            <TransactionList 
              accountId={activeAccount.id} 
              userId={userId} 
              onUpdate={handleRefresh}
            />
          </TabsContent>
          
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage the security of your vault account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Security Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge className={getSecurityLevelColor(activeAccount.securityLevel)}>
                        {activeAccount.securityLevel.charAt(0).toUpperCase() + activeAccount.securityLevel.slice(1)}
                      </Badge>
                      <p className="text-sm mt-2">
                        {activeAccount.securityLevel === 'maximum' && 'All security features are enabled.'}
                        {activeAccount.securityLevel === 'enhanced' && 'Advanced security features are enabled.'}
                        {activeAccount.securityLevel === 'standard' && 'Basic security features are enabled.'}
                      </p>
                      <Button variant="outline" size="sm" className="mt-4">
                        Upgrade Security
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Access Control</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Two-Factor Authentication</span>
                          <Badge variant={activeAccount.settings.twoFactorRequired ? "success" : "outline"}>
                            {activeAccount.settings.twoFactorRequired ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Transaction Approvals</span>
                          <Badge variant={activeAccount.settings.approvalRequired ? "success" : "outline"}>
                            {activeAccount.settings.approvalRequired ? "Required" : "Optional"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Withdrawal Timelock</span>
                          <span className="text-sm font-medium">{activeAccount.settings.withdrawalTimelock} hours</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="mt-4">
                        Manage Access Controls
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Withdrawal Limits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Single Transaction Limit</span>
                        <span className="text-sm font-medium">{formatCurrency(activeAccount.settings.withdrawalLimit, activeAccount.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Daily Limit</span>
                        <span className="text-sm font-medium">{formatCurrency(activeAccount.settings.withdrawalLimit * 2, activeAccount.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Monthly Limit</span>
                        <span className="text-sm font-medium">{formatCurrency(activeAccount.settings.withdrawalLimit * 30, activeAccount.currency)}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-4">
                      Adjust Limits
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Security Activity Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">Recent security events for this account</p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 p-2 rounded bg-secondary/30">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Successful login from your usual device</p>
                          <p className="text-xs text-muted-foreground">Today, 10:45 AM</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2 rounded bg-secondary/30">
                        <Clock className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Withdrawal time lock enforced</p>
                          <p className="text-xs text-muted-foreground">Yesterday, 3:22 PM</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-2 rounded bg-secondary/30">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Large transaction flagged for review</p>
                          <p className="text-xs text-muted-foreground">Jan 15, 2023, 11:30 AM</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-4">
                      View Full Activity Log
                    </Button>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your vault account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Account Information</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="text-sm font-medium">{activeAccount.name}</div>
                      
                      <div className="text-sm text-muted-foreground">Type</div>
                      <div className="text-sm font-medium capitalize">{activeAccount.type}</div>
                      
                      <div className="text-sm text-muted-foreground">Currency</div>
                      <div className="text-sm font-medium">{activeAccount.currency}</div>
                      
                      <div className="text-sm text-muted-foreground">Risk Level</div>
                      <div className="text-sm font-medium capitalize">{activeAccount.riskLevel}</div>
                      
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="text-sm font-medium">{activeAccount.isActive ? 'Active' : 'Inactive'}</div>
                      
                      <div className="text-sm text-muted-foreground">Created</div>
                      <div className="text-sm">{new Date(activeAccount.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Linked Information</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm text-muted-foreground">Address</div>
                      <div className="text-sm font-medium truncate">{activeAccount.address || 'No address'}</div>
                      
                      <div className="text-sm text-muted-foreground">Farm ID</div>
                      <div className="text-sm">{activeAccount.farmId || 'Not linked to a farm'}</div>
                      
                      <div className="text-sm text-muted-foreground">Agent ID</div>
                      <div className="text-sm">{activeAccount.agentId || 'Not linked to an agent'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button variant="outline">Edit Account Information</Button>
                  <Button variant={activeAccount.isActive ? "destructive" : "default"}>
                    {activeAccount.isActive ? 'Deactivate Account' : 'Activate Account'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 