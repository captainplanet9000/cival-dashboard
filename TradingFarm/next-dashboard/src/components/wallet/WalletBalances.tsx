'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { ConnectExchangeModal } from '@/components/exchange/ConnectExchangeModal';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Plus, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

interface WalletBalance {
  id: number;
  user_id: string;
  exchange: string;
  currency: string;
  free: number;
  locked: number;
  updated_at: string;
}

interface Exchange {
  id: string;
  name: string;
  exchange: string;
  testnet: boolean;
}

export function WalletBalances() {
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();
  
  // Initialize balances and realtime subscription
  useEffect(() => {
    let balanceSubscription: RealtimeChannel;
    
    async function initializeBalances() {
      try {
        setLoading(true);
        
        // Fetch exchanges
        const { data: exchangeData, error: exchangeError } = await supabase
          .from('exchange_credentials')
          .select('id, name, exchange, testnet');
        
        if (exchangeError) throw exchangeError;
        setExchanges(exchangeData || []);
        
        // Fetch balances
        const { data: balanceData, error: balanceError } = await supabase
          .from('wallet_balances')
          .select('*')
          .order('exchange', { ascending: true })
          .order('currency', { ascending: true });
        
        if (balanceError) throw balanceError;
        setBalances(balanceData || []);
        
        // Set up realtime subscription
        balanceSubscription = supabase
          .channel('wallet_balances_changes')
          .on('postgres_changes', 
              { event: '*', schema: 'public', table: 'wallet_balances' }, 
              payload => {
                if (payload.eventType === 'INSERT') {
                  setBalances(current => [...current, payload.new as WalletBalance]);
                } else if (payload.eventType === 'UPDATE') {
                  setBalances(current => 
                    current.map(balance => 
                      balance.id === payload.new.id ? payload.new as WalletBalance : balance
                    )
                  );
                } else if (payload.eventType === 'DELETE') {
                  setBalances(current => 
                    current.filter(balance => balance.id !== payload.old.id)
                  );
                }
              })
          .subscribe();
      } catch (error) {
        console.error('Error fetching wallet balances:', error);
        toast({
          title: 'Error',
          description: 'Failed to load wallet balances',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    
    initializeBalances();
    
    return () => {
      // Clean up subscription
      if (balanceSubscription) {
        supabase.removeChannel(balanceSubscription);
      }
    };
  }, [supabase, toast]);
  
  const refreshBalances = async (exchangeId?: string) => {
    try {
      setRefreshing(true);
      
      if (exchangeId) {
        // Refresh specific exchange
        const response = await fetch('/api/wallet/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exchangeId }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to refresh balances');
        }
        
        toast({
          title: 'Balances Refreshed',
          description: 'Exchange balances have been updated',
        });
      } else {
        // Refresh all exchanges
        for (const exchange of exchanges) {
          await fetch('/api/wallet/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exchangeId: exchange.id }),
          });
        }
        
        toast({
          title: 'All Balances Refreshed',
          description: 'All exchange balances have been updated',
        });
      }
    } catch (error: any) {
      console.error('Error refreshing balances:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to refresh balances',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  // Calculate total balance in USD (placeholder - would need price data for accurate totals)
  const totalBalance = balances.reduce((sum, balance) => {
    // In a real app, you'd convert to USD based on current rates
    return sum + balance.free + balance.locked;
  }, 0);
  
  // Group balances by exchange
  const balancesByExchange = balances.reduce((groups, balance) => {
    const key = balance.exchange;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(balance);
    return groups;
  }, {} as Record<string, WalletBalance[]>);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Wallet Balances</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => refreshBalances()} 
            disabled={refreshing || exchanges.length === 0}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
          <ConnectExchangeModal />
        </div>
      </div>
      
      {exchanges.length === 0 && !loading ? (
        <Card>
          <CardHeader>
            <CardTitle>No Exchanges Connected</CardTitle>
            <CardDescription>
              Connect an exchange to see your wallet balances
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <ConnectExchangeModal />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Balance</CardTitle>
              <CardDescription>
                Estimated value across all exchanges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? 'Loading...' : `$${totalBalance.toFixed(2)}`}
              </div>
            </CardContent>
          </Card>
          
          {Object.entries(balancesByExchange).map(([exchange, exchangeBalances]) => {
            const exchangeInfo = exchanges.find(e => e.exchange === exchange);
            return (
              <Card key={exchange}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-xl">{exchange}</CardTitle>
                    <CardDescription>
                      {exchangeInfo?.name}
                      {exchangeInfo?.testnet && (
                        <Badge variant="outline" className="ml-2 bg-yellow-100">
                          Testnet
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => refreshBalances(exchangeInfo?.id)}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Currency</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right">In Use</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exchangeBalances.map((balance) => (
                        <TableRow key={`${balance.exchange}-${balance.currency}`}>
                          <TableCell className="font-medium">{balance.currency}</TableCell>
                          <TableCell className="text-right">{balance.free.toFixed(6)}</TableCell>
                          <TableCell className="text-right">{balance.locked.toFixed(6)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {(balance.free + balance.locked).toFixed(6)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  Last updated: {new Date(exchangeBalances[0]?.updated_at).toLocaleString()}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
