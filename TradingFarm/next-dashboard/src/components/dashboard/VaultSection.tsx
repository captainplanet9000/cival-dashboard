import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowUpCircle, ArrowDownCircle, RefreshCcw } from 'lucide-react';
import { vaultService } from '@/services/serviceFactory';

interface VaultSectionProps {
  farmId: string;
}

export function VaultSection({ farmId }: VaultSectionProps) {
  const [vaults, setVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVaultData() {
      setLoading(true);
      setError(null);
      
      try {
        // Get vaults for this farm
        const vaultData = await vaultService.getVaultsByFarmId(farmId);
        
        // For each vault, get complete data including accounts and transactions
        const completeVaults = await Promise.all(
          vaultData.map(async (vault: any) => {
            return await vaultService.getCompleteVaultData(vault.id);
          })
        );
        
        setVaults(completeVaults);
      } catch (err) {
        console.error('Failed to fetch vault data:', err);
        setError('Unable to load vault information. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchVaultData();
  }, [farmId]);

  // Helper to format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Helper to get transaction icon based on type
  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'deposit':
        return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      case 'transfer':
        return <RefreshCcw className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Vaults</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Vaults</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (vaults.length === 0) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Vaults</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No vaults found for this farm.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {vaults.map((vault) => (
        <Card key={vault.id} className="col-span-3">
          <CardHeader>
            <CardTitle>{vault.name}</CardTitle>
            <CardDescription>{vault.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-medium mb-2">Accounts</h3>
            <div className="rounded-md border mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vault.accounts && vault.accounts.map((account: any) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>{account.account_type}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(account.balance, account.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <h3 className="text-lg font-medium mb-2">Recent Transactions</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vault.recentTransactions && vault.recentTransactions.slice(0, 5).map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(tx.type)}
                          <span>{tx.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(tx.amount, tx.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
