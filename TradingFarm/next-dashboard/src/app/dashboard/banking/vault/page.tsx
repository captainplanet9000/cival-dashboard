'use client';

import React from 'react';
import { 
  Shield, 
  Lock, 
  Key, 
  Landmark, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  AlertCircle,
  BarChart3, 
  DollarSign,
  Wallet,
  Eye,
  EyeOff,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import VaultInfoPanel from '@/components/banking/VaultInfoPanel';

export default function VaultPage() {
  const [vaultBalance, setVaultBalance] = React.useState<number>(0);
  const [securityLevel, setSecurityLevel] = React.useState<number>(85);
  const [riskScore, setRiskScore] = React.useState<number>(26);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [hideBalance, setHideBalance] = React.useState<boolean>(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  React.useEffect(() => {
    // Simulate loading vault data from Supabase
    async function loadVaultData() {
      setLoading(true);
      try {
        // This would be a real data fetch in production
        // For demo purposes, we're using mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setVaultBalance(283450.78);
        setSecurityLevel(85);
        setRiskScore(26);
      } catch (error) {
        console.error('Error loading vault data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load vault data. Please try again later.',
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadVaultData();
  }, [toast]);

  const handleRefresh = () => {
    // Reload vault data
    setLoading(true);
    setTimeout(() => {
      setVaultBalance(prev => prev + (Math.random() * 1000 - 500));
      setLoading(false);
    }, 1000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-500';
    if (score < 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSecurityColor = (level: number) => {
    if (level > 80) return 'text-green-500';
    if (level > 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const recentTransactions = [
    { id: 1, type: 'deposit', amount: 50000, date: '2025-03-28T10:15:00Z', status: 'completed' },
    { id: 2, type: 'withdrawal', amount: 12500, date: '2025-03-25T14:30:00Z', status: 'completed' },
    { id: 3, type: 'deposit', amount: 75000, date: '2025-03-20T09:45:00Z', status: 'completed' },
    { id: 4, type: 'withdrawal', amount: 5000, date: '2025-03-15T16:20:00Z', status: 'completed' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Secure Vault</h1>
          <p className="text-muted-foreground">
            Manage your secure Trading Farm vault with enhanced security and risk management.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Vault Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {hideBalance ? '••••••••' : formatCurrency(vaultBalance)}
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setHideBalance(!hideBalance)}
              >
                {hideBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date().toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Security Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`text-2xl font-bold ${getSecurityColor(securityLevel)}`}>
                {securityLevel}%
              </div>
              <Shield className={`h-5 w-5 ${getSecurityColor(securityLevel)}`} />
            </div>
            <Progress value={securityLevel} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              2FA and strong encryption enabled
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`text-2xl font-bold ${getRiskColor(riskScore)}`}>
                {riskScore}/100
              </div>
              <AlertCircle className={`h-5 w-5 ${getRiskColor(riskScore)}`} />
            </div>
            <Progress value={riskScore} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Low risk - optimal asset distribution
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:grid-cols-none md:flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Vault Allocation</CardTitle>
                <CardDescription>Asset distribution in your secure vault</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                      <span>USD (Stablecoin)</span>
                    </div>
                    <span className="font-medium">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                      <span>BTC</span>
                    </div>
                    <span className="font-medium">30%</span>
                  </div>
                  <Progress value={30} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                      <span>ETH</span>
                    </div>
                    <span className="font-medium">15%</span>
                  </div>
                  <Progress value={15} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <span>Other Assets</span>
                    </div>
                    <span className="font-medium">10%</span>
                  </div>
                  <Progress value={10} className="h-2" />
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Adjust Allocation
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your vault funds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full">
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Withdraw to Exchange
                </Button>
                <Button className="w-full" variant="outline">
                  <ArrowDownLeft className="mr-2 h-4 w-4" />
                  Deposit from Exchange
                </Button>
                <Button className="w-full" variant="outline">
                  <History className="mr-2 h-4 w-4" />
                  View Full Transaction History
                </Button>
                <Button className="w-full" variant="outline">
                  <Shield className="mr-2 h-4 w-4" />
                  Security Settings
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Vault Activity</CardTitle>
              <CardDescription>Latest transactions in your vault</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map(transaction => (
                  <div key={transaction.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center">
                      {transaction.type === 'deposit' ? (
                        <ArrowDownLeft className="h-5 w-5 mr-2 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 mr-2 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          {transaction.type === 'deposit' ? 'Deposit to Vault' : 'Withdrawal from Vault'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {new Date(transaction.date).toLocaleDateString()} at {new Date(transaction.date).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${transaction.type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>
                        {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="link" className="w-full">
                View All Transactions
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vault Transactions</CardTitle>
              <CardDescription>History of deposits and withdrawals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <History className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium">Full Transaction History</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Coming soon! Track all your vault transaction history, including deposits, withdrawals, and transfers.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vault Security</CardTitle>
              <CardDescription>Manage security settings for your vault</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-500" />
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Enabled</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              
              <div className="flex justify-between items-center border-b pb-4">
                <div className="flex items-center">
                  <Key className="h-5 w-5 mr-2 text-green-500" />
                  <div>
                    <p className="font-medium">Withdrawal Passwords</p>
                    <p className="text-sm text-muted-foreground">Enabled</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              
              <div className="flex justify-between items-center border-b pb-4">
                <div className="flex items-center">
                  <Lock className="h-5 w-5 mr-2 text-yellow-500" />
                  <div>
                    <p className="font-medium">Withdrawal Whitelisting</p>
                    <p className="text-sm text-muted-foreground">Partially Configured</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-blue-500" />
                  <div>
                    <p className="font-medium">Security Notifications</p>
                    <p className="text-sm text-muted-foreground">Email, SMS</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">
                <Shield className="mr-2 h-4 w-4" />
                Advanced Security Settings
              </Button>
            </CardFooter>
          </Card>
          
          <VaultInfoPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
