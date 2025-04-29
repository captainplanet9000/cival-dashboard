'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, CalendarClock, AlertTriangle, CheckCircle2, RotateCw } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils';
import { RebalancingTransaction, Portfolio } from '@/types/portfolio';

interface PortfolioMaintenanceProps {
  portfolioId?: string;
}

export default function PortfolioMaintenance({ portfolioId }: PortfolioMaintenanceProps) {
  const [transactions, setTransactions] = React.useState<RebalancingTransaction[]>([]);
  const [portfolios, setPortfolios] = React.useState<Portfolio[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [executing, setExecuting] = React.useState(false);
  const [maintenanceStatus, setMaintenanceStatus] = React.useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  const supabase = createBrowserClient();

  // Load transactions
  React.useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true);
        
        // Fetch pending rebalancing transactions
        const { data: txData, error: txError } = await supabase
          .from('rebalancing_transactions')
          .select(`
            *,
            portfolios(id, name, user_id),
            strategies(id, name)
          `)
          .eq('status', 'pending')
          .order('date', { ascending: false });
        
        if (txError) throw txError;
        
        // If portfolioId is provided, filter transactions for this portfolio only
        let filteredTransactions = txData;
        if (portfolioId) {
          filteredTransactions = txData.filter(tx => tx.portfolio_id === portfolioId);
        }
        
        setTransactions(filteredTransactions || []);
        
        // Fetch portfolios that need maintenance
        const { data: portfolioData, error: portfolioError } = await supabase
          .from('portfolios')
          .select('*')
          .eq('rebalance_notification', true)
          .eq('status', 'active');
        
        if (portfolioError) throw portfolioError;
        
        setPortfolios(portfolioData || []);
      } catch (error) {
        console.error('Error fetching maintenance data:', error);
        setError('Failed to load maintenance data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchTransactions();
    
    // Set up a subscription for real-time updates
    const transactionsSubscription = supabase
      .channel('rebalancing_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rebalancing_transactions' }, 
        () => fetchTransactions()
      )
      .subscribe();
      
    const portfoliosSubscription = supabase
      .channel('portfolio_changes')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'portfolios' }, 
        () => fetchTransactions()
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(transactionsSubscription);
      supabase.removeChannel(portfoliosSubscription);
    };
  }, [portfolioId, supabase]);

  // Manually trigger rebalancing check
  const triggerRebalanceCheck = async () => {
    try {
      setMaintenanceStatus('running');
      
      const response = await fetch('/api/portfolio/maintenance/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ portfolioId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check for rebalancing needs');
      }
      
      const data = await response.json();
      setMaintenanceStatus('completed');
      
      // Refetch transactions
      router.refresh();
    } catch (error) {
      console.error('Error triggering rebalance check:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setMaintenanceStatus('error');
    }
  };

  // Execute pending transactions
  const executeTransactions = async (txIds?: string[]) => {
    try {
      setExecuting(true);
      
      const transactionsToExecute = txIds || transactions.map((tx: RebalancingTransaction) => tx.id);
      
      if (transactionsToExecute.length === 0) {
        throw new Error('No transactions to execute');
      }
      
      const response = await fetch('/api/portfolio/maintenance/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionIds: transactionsToExecute }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute transactions');
      }
      
      // Refresh the page to show updated statuses
      router.refresh();
    } catch (error) {
      console.error('Error executing transactions:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setExecuting(false);
    }
  };

  // Get badge for transaction status
  const getStatusBadge = (status: string): React.ReactNode => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50">Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get badge for transaction action
  const getActionBadge = (action: string): React.ReactNode => {
    switch (action) {
      case 'buy':
        return <Badge className="bg-green-100 text-green-800">Buy</Badge>;
      case 'sell':
        return <Badge className="bg-red-100 text-red-800">Sell</Badge>;
      default:
        return <Badge>{action}</Badge>;
    }
  };

  // Get badge for transaction reason
  const getReasonBadge = (reason: string): React.ReactNode => {
    switch (reason) {
      case 'threshold':
        return <Badge variant="outline" className="bg-blue-50">Threshold</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="bg-purple-50">Scheduled</Badge>;
      case 'manual':
        return <Badge variant="outline">Manual</Badge>;
      default:
        return <Badge variant="outline">{reason}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Portfolio Maintenance</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={triggerRebalanceCheck}
            disabled={maintenanceStatus === 'running'}
          >
            {maintenanceStatus === 'running' ? (
              <>
                <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check for Rebalancing
              </>
            )}
          </Button>
        </CardTitle>
        <CardDescription>
          Manage and execute automatic portfolio maintenance tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {maintenanceStatus === 'completed' && (
          <Alert className="mb-4 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>Maintenance Check Complete</AlertTitle>
            <AlertDescription>
              Portfolio maintenance check has been completed successfully.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              Pending Transactions 
              {transactions.length > 0 && (
                <Badge variant="secondary" className="ml-2">{transactions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="portfolios">
              Portfolios for Maintenance
              {portfolios.length > 0 && (
                <Badge variant="secondary" className="ml-2">{portfolios.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending">
            {loading ? (
              <div className="py-8 text-center">
                <Progress value={60} className="w-1/2 mx-auto mb-4" />
                <p className="text-muted-foreground">Loading transactions...</p>
              </div>
            ) : transactions.length > 0 ? (
              <>
                <div className="flex justify-end mb-4">
                  <Button 
                    onClick={() => executeTransactions()} 
                    disabled={executing || transactions.length === 0}
                  >
                    {executing ? (
                      <>
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Execute All
                      </>
                    )}
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Portfolio</TableHead>
                        <TableHead>Strategy</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Previous %</TableHead>
                        <TableHead>New %</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Execute</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx: RebalancingTransaction) => (
                        <TableRow key={tx.id ?? 'temp-' + Math.random()}>
                          <TableCell className="font-medium">
                            {tx.portfolios?.name ?? 'Unknown'}
                          </TableCell>
                          <TableCell>{tx.strategies?.name || 'Unknown'}</TableCell>
                          <TableCell>{getActionBadge(tx.action)}</TableCell>
                          <TableCell>{formatCurrency(tx.amount)}</TableCell>
                          <TableCell>{formatPercentage(tx.previous_allocation)}</TableCell>
                          <TableCell>{formatPercentage(tx.new_allocation)}</TableCell>
                          <TableCell>{getReasonBadge(tx.reason)}</TableCell>
                          <TableCell>{formatDate(new Date(tx.date))}</TableCell>
                          <TableCell>{getStatusBadge(tx.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => executeTransactions([tx.id])} 
                              disabled={executing}
                            >
                              Execute
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="py-8 text-center">
                <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-xl font-medium mb-2">No Pending Transactions</p>
                <p className="text-muted-foreground mb-4">
                  There are no pending rebalancing transactions.
                </p>
                <Button 
                  variant="outline" 
                  onClick={triggerRebalanceCheck}
                  disabled={maintenanceStatus === 'running'}
                >
                  Check for Rebalancing
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="portfolios">
            {loading ? (
              <div className="py-8 text-center">
                <Progress value={60} className="w-1/2 mx-auto mb-4" />
                <p className="text-muted-foreground">Loading portfolios...</p>
              </div>
            ) : portfolios.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Portfolio Name</TableHead>
                      <TableHead>Rebalancing Frequency</TableHead>
                      <TableHead>Current Value</TableHead>
                      <TableHead>Last Rebalanced</TableHead>
                      <TableHead>Next Rebalance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolios.map((portfolio: Portfolio) => (
                      <TableRow key={portfolio.id}>
                        <TableCell className="font-medium">{portfolio.name}</TableCell>
                        <TableCell className="capitalize">{portfolio.rebalancing_frequency}</TableCell>
                        <TableCell>{formatCurrency(portfolio.current_value)}</TableCell>
                        <TableCell>
                          {portfolio.last_rebalanced 
                            ? formatDate(new Date(portfolio.last_rebalanced)) 
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          {portfolio.next_rebalance 
                            ? formatDate(new Date(portfolio.next_rebalance)) 
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              router.push(`/dashboard/portfolio?id=${portfolio.id}`);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-xl font-medium mb-2">No Portfolios Need Maintenance</p>
                <p className="text-muted-foreground">
                  All portfolios are currently in line with their target allocations.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
