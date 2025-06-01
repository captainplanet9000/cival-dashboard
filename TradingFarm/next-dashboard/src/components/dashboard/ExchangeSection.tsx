import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink } from 'lucide-react';
import { exchangeService } from '@/services/serviceFactory';

interface ExchangeSectionProps {
  farmId: string;
}

export function ExchangeSection({ farmId }: ExchangeSectionProps) {
  const [connections, setConnections] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExchangeData() {
      setLoading(true);
      setError(null);
      
      try {
        // Get exchange connections for this farm
        const connectionData = await exchangeService.getExchangeConnections(farmId);
        
        // Get complete data for each connection
        const completeConnections = await Promise.all(
          connectionData.map(async (connection: any) => {
            return await exchangeService.getCompleteExchangeData(connection.id);
          })
        );
        
        // Get market data for common markets
        const marketData = await exchangeService.getMarkets();
        const topMarkets = marketData.slice(0, 5); // Get top 5 markets
        
        setConnections(completeConnections);
        setMarkets(topMarkets);
      } catch (err) {
        console.error('Failed to fetch exchange data:', err);
        setError('Unable to load exchange information. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchExchangeData();
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

  // Helper to format crypto amount with abbreviated suffix
  const formatCryptoAmount = (amount: number) => {
    if (amount === 0) return '0';
    
    if (amount < 0.0001) {
      return amount.toExponential(4);
    }
    
    if (amount < 1) {
      return amount.toFixed(6);
    }
    
    if (amount < 1000) {
      return amount.toFixed(4);
    }
    
    const suffixes = ['', 'K', 'M', 'B', 'T'];
    const suffixIndex = Math.floor(Math.log10(amount) / 3);
    const shortAmount = amount / Math.pow(10, suffixIndex * 3);
    
    return `${shortAmount.toFixed(2)}${suffixes[suffixIndex]}`;
  };

  if (loading) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Exchanges</CardTitle>
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
          <CardTitle>Exchanges</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Exchange Connections Section */}
      <Card>
        <CardHeader>
          <CardTitle>Exchange Connections</CardTitle>
          <CardDescription>Connected trading accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="text-muted-foreground">No exchange connections found.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exchange</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map((connection) => {
                    // Calculate total balance across all currencies
                    const totalBalance = connection.balances && connection.balances.reduce(
                      (sum: number, balance: any) => sum + (balance.usdValue || 0), 
                      0
                    );
                    
                    return (
                      <TableRow key={connection.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {connection.exchange_name}
                            {connection.is_testnet && (
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                                TestNet
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{connection.account_name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={connection.status === 'active' ? 'default' : 'secondary'}
                            className={connection.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                          >
                            {connection.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(totalBalance || 0)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Market Overview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Market Overview</CardTitle>
          <CardDescription>Latest market data</CardDescription>
        </CardHeader>
        <CardContent>
          {markets.length === 0 ? (
            <p className="text-muted-foreground">No market data available.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Market</TableHead>
                    <TableHead className="text-right">Last Price</TableHead>
                    <TableHead className="text-right">24h Change</TableHead>
                    <TableHead className="text-right">24h Volume</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {markets.map((market) => {
                    const priceChangePercent = ((market.last_price - market.prev_day_close) / market.prev_day_close) * 100;
                    const isPositive = priceChangePercent >= 0;
                    
                    return (
                      <TableRow key={market.id}>
                        <TableCell className="font-medium flex items-center gap-1">
                          {market.name}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(market.last_price)}
                        </TableCell>
                        <TableCell className={`text-right ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(market.volume_24h)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Asset Distribution Section */}
      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Asset Distribution</CardTitle>
            <CardDescription>Current holdings across exchanges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">USD Value</TableHead>
                    <TableHead>Distribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Aggregate and display assets across all connections */}
                  {connections.flatMap(conn => conn.balances || [])
                    .reduce((acc: any[], balance: any) => {
                      const existing = acc.find(b => b.asset === balance.asset);
                      if (existing) {
                        existing.amount += balance.amount;
                        existing.usdValue += balance.usdValue;
                      } else {
                        acc.push({ ...balance });
                      }
                      return acc;
                    }, [])
                    .sort((a: any, b: any) => b.usdValue - a.usdValue)
                    .slice(0, 5) // Show top 5 assets
                    .map((balance: any) => {
                      // Calculate total value across all assets
                      const totalValue = connections.flatMap(conn => conn.balances || [])
                        .reduce((sum, b) => sum + (b.usdValue || 0), 0);
                      
                      // Calculate percentage of total
                      const percentage = totalValue ? (balance.usdValue / totalValue) * 100 : 0;
                      
                      return (
                        <TableRow key={balance.asset}>
                          <TableCell className="font-medium">{balance.asset}</TableCell>
                          <TableCell className="text-right">
                            {formatCryptoAmount(balance.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(balance.usdValue)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  }
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
