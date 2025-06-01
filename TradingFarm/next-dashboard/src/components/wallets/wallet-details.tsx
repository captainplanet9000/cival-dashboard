'use client';

/**
 * Wallet Details Component
 * Displays comprehensive information about a single wallet
 */
import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Copy, 
  ExternalLink, 
  AlertTriangle,
  Clock,
  Wallet as WalletIcon,
  BarChart4,
  LineChart,
  History,
  PiggyBank,
  Settings,
  RefreshCcw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { WalletTransactionHistory } from './wallet-transaction-history';
import { WalletBalanceChart } from './wallet-balance-chart';
import { WalletAlerts } from './wallet-alerts';

export interface WalletDetailsProps {
  wallet: {
    id: string;
    name: string;
    address: string;
    exchange?: string;
    network?: string;
    balance: number;
    currency: string;
    lastUpdated: string;
    changePercent24h?: number;
    status: 'active' | 'inactive' | 'warning' | 'error';
    createdAt: string;
    balanceHistory?: {
      date: string;
      balance: number;
    }[];
    alerts?: {
      id: string;
      type: 'low_balance' | 'suspicious_activity' | 'large_withdrawal' | 'large_deposit' | 'other';
      message: string;
      timestamp: string;
      resolved?: boolean;
    }[];
    transactions?: {
      id: string;
      type: 'deposit' | 'withdrawal' | 'transfer' | 'trade' | 'fee' | 'other';
      amount: number;
      currency: string;
      timestamp: string;
      status: 'completed' | 'pending' | 'failed';
      txHash?: string;
      destination?: string;
      source?: string;
      fee?: number;
      feeCurrency?: string;
      note?: string;
    }[];
    settings?: {
      lowBalanceThreshold?: number;
      alertsEnabled: boolean;
      autoRefresh: boolean;
      refreshInterval?: number;
    };
  };
  onRefresh: () => void;
  onEditSettings: () => void;
  onUpdateName: (name: string) => void;
  onResolveAlert: (alertId: string) => void;
}

export function WalletDetails({ 
  wallet, 
  onRefresh, 
  onEditSettings, 
  onUpdateName,
  onResolveAlert 
}: WalletDetailsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Copy wallet address to clipboard
  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
    toast({
      description: "Wallet address copied to clipboard.",
    });
  };

  // Format currency with appropriate symbol
  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'BTC' || currency === 'ETH' ? 'USD' : currency,
      minimumFractionDigits: currency === 'BTC' || currency === 'ETH' ? 8 : 2,
      maximumFractionDigits: currency === 'BTC' || currency === 'ETH' ? 8 : 2,
    });
    
    // Handle special cases for crypto
    if (currency === 'BTC') {
      return `₿${amount.toFixed(8)}`;
    } else if (currency === 'ETH') {
      return `Ξ${amount.toFixed(6)}`;
    }
    
    return formatter.format(amount);
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Get transaction stats
  const getTransactionStats = () => {
    if (!wallet.transactions || wallet.transactions.length === 0) {
      return {
        totalDeposits: 0,
        totalWithdrawals: 0,
        netFlow: 0,
        completedCount: 0,
        pendingCount: 0,
        failedCount: 0
      };
    }

    const stats = wallet.transactions.reduce((acc, tx) => {
      // Process transaction types
      if (tx.type === 'deposit') {
        acc.totalDeposits += tx.amount;
      } else if (tx.type === 'withdrawal') {
        acc.totalWithdrawals += tx.amount;
      }

      // Process transaction statuses
      if (tx.status === 'completed') {
        acc.completedCount++;
      } else if (tx.status === 'pending') {
        acc.pendingCount++;
      } else if (tx.status === 'failed') {
        acc.failedCount++;
      }

      return acc;
    }, {
      totalDeposits: 0,
      totalWithdrawals: 0,
      netFlow: 0,
      completedCount: 0,
      pendingCount: 0,
      failedCount: 0
    });

    // Calculate net flow
    stats.netFlow = stats.totalDeposits - stats.totalWithdrawals;

    return stats;
  };

  // Transaction statistics
  const txStats = getTransactionStats();

  return (
    <div className="space-y-6">
      {/* Wallet Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{wallet.name}</CardTitle>
                <Badge className={getStatusColor(wallet.status)}>
                  <span className="capitalize">{wallet.status}</span>
                </Badge>
              </div>
              <CardDescription className="mt-1 flex items-center">
                <span className="font-mono truncate max-w-[180px] sm:max-w-[300px] md:max-w-[400px]">
                  {wallet.address}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 ml-1" 
                  onClick={copyAddress}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {wallet.exchange && (
                  <Badge variant="outline" className="ml-2">
                    {wallet.exchange}
                  </Badge>
                )}
                {wallet.network && (
                  <Badge variant="outline" className="ml-2">
                    {wallet.network}
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" onClick={onEditSettings}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-1">
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Current Balance</div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">
                  {formatCurrency(wallet.balance, wallet.currency)}
                </div>
                {wallet.changePercent24h !== undefined && (
                  <div className={`flex items-center text-sm font-medium ${
                    wallet.changePercent24h > 0 ? 'text-green-600' : 
                    wallet.changePercent24h < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {wallet.changePercent24h > 0 ? (
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                    ) : wallet.changePercent24h < 0 ? (
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                    ) : null}
                    {Math.abs(wallet.changePercent24h).toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Last Updated</div>
                <div className="font-medium">
                  {formatDistanceToNow(new Date(wallet.lastUpdated), { addSuffix: true })}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Created On</div>
                <div className="font-medium">
                  {format(new Date(wallet.createdAt), 'MMM d, yyyy')}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Pending Alerts</div>
                <div className="font-medium">
                  {wallet.alerts ? wallet.alerts.filter(a => !a.resolved).length : 0}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        {/* Active Alerts Summary */}
        {wallet.alerts && wallet.alerts.filter(a => !a.resolved).length > 0 && (
          <CardFooter className="pt-3 pb-4">
            <Alert variant="warning" className="w-full">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Active Alerts</AlertTitle>
              <AlertDescription>
                There {wallet.alerts.filter(a => !a.resolved).length === 1 ? 'is' : 'are'} {wallet.alerts.filter(a => !a.resolved).length} active alert{wallet.alerts.filter(a => !a.resolved).length !== 1 ? 's' : ''} for this wallet. Check the Alerts tab for details.
              </AlertDescription>
            </Alert>
          </CardFooter>
        )}
      </Card>

      {/* Wallet Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 sm:grid-cols-5 w-full">
          <TabsTrigger value="overview">
            <WalletIcon className="h-4 w-4 mr-2 md:mr-1" />
            <span className="hidden md:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="balance">
            <BarChart4 className="h-4 w-4 mr-2 md:mr-1" />
            <span className="hidden md:inline">Balance</span>
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <History className="h-4 w-4 mr-2 md:mr-1" />
            <span className="hidden md:inline">Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-2 md:mr-1" />
            <span className="hidden md:inline">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="hidden sm:flex">
            <Settings className="h-4 w-4 mr-2 md:mr-1" />
            <span className="hidden md:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab Content */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Current Balance</div>
                      <div className="font-medium">
                        {formatCurrency(wallet.balance, wallet.currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">24h Change</div>
                      <div className={`font-medium ${
                        wallet.changePercent24h && wallet.changePercent24h > 0 ? 'text-green-600' : 
                        wallet.changePercent24h && wallet.changePercent24h < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {wallet.changePercent24h ? (
                          <>
                            {wallet.changePercent24h > 0 ? '+' : ''}
                            {wallet.changePercent24h.toFixed(2)}%
                          </>
                        ) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="font-medium capitalize">{wallet.status}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Network</div>
                      <div className="font-medium">{wallet.network || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Active Since</div>
                      <div className="font-medium">
                        {format(new Date(wallet.createdAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Exchange</div>
                      <div className="font-medium">{wallet.exchange || 'N/A'}</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <div className="text-sm font-medium mb-2">Transaction Summary</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-sm text-muted-foreground">Total Deposits</div>
                        <div className="font-medium text-green-600">
                          {formatCurrency(txStats.totalDeposits, wallet.currency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Total Withdrawals</div>
                        <div className="font-medium text-red-600">
                          {formatCurrency(txStats.totalWithdrawals, wallet.currency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Net Flow</div>
                        <div className={`font-medium ${
                          txStats.netFlow > 0 ? 'text-green-600' : 
                          txStats.netFlow < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {formatCurrency(txStats.netFlow, wallet.currency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Pending Transactions</div>
                        <div className="font-medium">
                          {txStats.pendingCount}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Mini Balance Chart */}
                  <div>
                    <div className="text-sm font-medium mb-2">Balance History (30 Days)</div>
                    <div className="h-32">
                      {wallet.balanceHistory ? (
                        <WalletBalanceChart 
                          data={wallet.balanceHistory.slice(-30)} 
                          currency={wallet.currency}
                          minimal={true}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          No historical data available
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Recent Transactions */}
                  <div>
                    <div className="text-sm font-medium mb-2">Recent Transactions</div>
                    {wallet.transactions && wallet.transactions.length > 0 ? (
                      <div className="space-y-2">
                        {wallet.transactions.slice(0, 3).map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <div className="flex items-center gap-2">
                              {tx.type === 'deposit' ? (
                                <ArrowDownRight className="h-4 w-4 text-green-500" />
                              ) : tx.type === 'withdrawal' ? (
                                <ArrowUpRight className="h-4 w-4 text-red-500" />
                              ) : (
                                <History className="h-4 w-4 text-blue-500" />
                              )}
                              <div>
                                <div className="text-sm font-medium capitalize">{tx.type}</div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(tx.timestamp), 'MMM d, h:mm a')}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-medium ${
                                tx.type === 'deposit' ? 'text-green-600' : 
                                tx.type === 'withdrawal' ? 'text-red-600' : ''
                              }`}>
                                {tx.type === 'deposit' ? '+' : tx.type === 'withdrawal' ? '-' : ''}
                                {formatCurrency(tx.amount, tx.currency)}
                              </div>
                              <div className="text-xs">
                                <Badge variant="outline" className="text-xs">
                                  {tx.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No transaction history available
                      </div>
                    )}
                    {wallet.transactions && wallet.transactions.length > 3 && (
                      <div className="mt-2 text-center">
                        <Button 
                          variant="link" 
                          onClick={() => setActiveTab('transactions')} 
                          className="text-xs h-auto p-0"
                        >
                          View all {wallet.transactions.length} transactions
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Balance Tab Content */}
        <TabsContent value="balance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Balance History</CardTitle>
              <CardDescription>Track your wallet balance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {wallet.balanceHistory && wallet.balanceHistory.length > 0 ? (
                  <WalletBalanceChart 
                    data={wallet.balanceHistory} 
                    currency={wallet.currency}
                    minimal={false}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No historical data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab Content */}
        <TabsContent value="transactions" className="mt-6">
          <WalletTransactionHistory transactions={wallet.transactions || []} currency={wallet.currency} />
        </TabsContent>

        {/* Alerts Tab Content */}
        <TabsContent value="alerts" className="mt-6">
          <WalletAlerts alerts={wallet.alerts || []} onResolveAlert={onResolveAlert} />
        </TabsContent>

        {/* Settings Tab Content */}
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Settings</CardTitle>
              <CardDescription>Configure alerts and notification preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wallet.settings ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Alert Settings</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Alerts Enabled</span>
                          <span className="text-sm font-medium">{wallet.settings.alertsEnabled ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Low Balance Threshold</span>
                          <span className="text-sm font-medium">
                            {wallet.settings.lowBalanceThreshold 
                              ? formatCurrency(wallet.settings.lowBalanceThreshold, wallet.currency) 
                              : 'Not set'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-2">Refresh Settings</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Auto Refresh</span>
                          <span className="text-sm font-medium">{wallet.settings.autoRefresh ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Refresh Interval</span>
                          <span className="text-sm font-medium">
                            {wallet.settings.refreshInterval 
                              ? `${wallet.settings.refreshInterval} minutes` 
                              : 'Not set'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No settings configured
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={onEditSettings}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
