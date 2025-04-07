import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { ArrowUpDown, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { api, handleApiError } from '@/lib/api';
import { VaultBalance, Transaction } from '@/types';

interface VaultBalancesProps {
  farmId: string;
}

export function VaultBalances({ farmId }: VaultBalancesProps) {
  const [balances, setBalances] = useState<VaultBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('balances');

  useEffect(() => {
    fetchData();
  }, [farmId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [balancesData, transactionsData] = await Promise.all([
        api.vault.getBalances(farmId),
        api.vault.getTransactions(farmId, { limit: 10 })
      ]);
      
      setBalances(balancesData);
      setTransactions(transactionsData);
      setError(null);
    } catch (error) {
      handleApiError(error, setError);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(numericValue);
  };

  const getTransactionTypeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'deposit':
      case 'buy':
        return 'bg-green-100 text-green-800';
      case 'withdrawal':
      case 'sell':
        return 'bg-red-100 text-red-800';
      case 'transfer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'deposit':
      case 'buy':
        return <TrendingUp className="h-4 w-4 mr-1" />;
      case 'withdrawal':
      case 'sell':
        return <TrendingDown className="h-4 w-4 mr-1" />;
      default:
        return <ArrowUpDown className="h-4 w-4 mr-1" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
        <p className="font-medium">Error loading vault data</p>
        <p>{error}</p>
        <Button 
          variant="outline" 
          className="mt-2" 
          onClick={() => fetchData()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Vault</h2>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="balances" className="space-y-4">
          {balances.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="flex flex-col items-center justify-center space-y-3 py-8">
                  <ArrowUpDown className="h-12 w-12 text-gray-400" />
                  <h3 className="text-lg font-medium">No balances found</h3>
                  <p className="text-sm text-gray-500">Your vault is currently empty</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Asset Balances</CardTitle>
                <CardDescription>Current holdings in your vault</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balances.map((balance) => (
                      <TableRow key={balance.id}>
                        <TableCell className="font-medium">{balance.asset_symbol}</TableCell>
                        <TableCell className="text-right">{formatCurrency(balance.amount)}</TableCell>
                        <TableCell className="text-right text-gray-500 text-sm">
                          {new Date(balance.last_updated).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-4">
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="flex flex-col items-center justify-center space-y-3 py-8">
                  <ArrowUpDown className="h-12 w-12 text-gray-400" />
                  <h3 className="text-lg font-medium">No transactions found</h3>
                  <p className="text-sm text-gray-500">Your transaction history is empty</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest activity in your vault</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <Badge className={getTransactionTypeStyle(tx.transaction_type)}>
                            <span className="flex items-center">
                              {getTransactionIcon(tx.transaction_type)}
                              {tx.transaction_type}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{tx.asset_symbol}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tx.amount)}</TableCell>
                        <TableCell>
                          <Badge className={getTransactionStatusStyle(tx.status)}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-gray-500 text-sm">
                          {new Date(tx.executed_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 