'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VaultMaster, VaultBalanceSummary } from '@/types/vault-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, CreditCard, DollarSign, Landmark, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface VaultOverviewProps {
  vaults: VaultMaster[];
  balanceSummary: VaultBalanceSummary[];
  loading: boolean;
  onRefresh: () => void;
}

export default function VaultOverview({ 
  vaults, 
  balanceSummary, 
  loading,
  onRefresh
}: VaultOverviewProps) {
  // Helper function to get an icon for a currency
  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case 'USD':
      case 'USDT':
      case 'USDC':
        return <DollarSign className="h-6 w-6 text-green-500" />;
      case 'BTC':
        return <Wallet className="h-6 w-6 text-orange-500" />;
      case 'ETH':
        return <CreditCard className="h-6 w-6 text-blue-500" />;
      default:
        return <Landmark className="h-6 w-6 text-gray-500" />;
    }
  };
  
  // Get sorted currencies by value
  const sortedBalances = [...balanceSummary].sort((a, b) => 
    (b.usd_value || 0) - (a.usd_value || 0)
  );
  
  const totalValue = balanceSummary.reduce((sum, item) => sum + (item.usd_value || 0), 0);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="portfolio" className="w-full">
        <TabsList>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="vaults">Vaults</TabsTrigger>
        </TabsList>
        
        <TabsContent value="portfolio" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Distribution</CardTitle>
              <CardDescription>Your portfolio by asset type</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {sortedBalances.map((balance) => (
                    <div key={balance.currency} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCurrencyIcon(balance.currency)}
                          <div>
                            <div className="font-medium">{balance.currency}</div>
                            <div className="text-sm text-muted-foreground">
                              {balance.account_count} account{balance.account_count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            ${(balance.usd_value || 0).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {balance.total_balance.toLocaleString('en-US', {
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 8,
                            })} {balance.currency}
                          </div>
                        </div>
                      </div>
                      <Progress 
                        value={totalValue ? ((balance.usd_value || 0) / totalValue) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                  ))}
                  
                  {sortedBalances.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No assets found in your vaults.</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={onRefresh}
                      >
                        Refresh
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Liquidity Overview</CardTitle>
              <CardDescription>Available vs. reserved balance</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {balanceSummary.map((balance) => {
                    const availablePercentage = balance.total_balance 
                      ? (balance.available_balance / balance.total_balance) * 100 
                      : 0;
                    
                    return (
                      <div key={balance.currency} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{balance.currency}</div>
                          <div className="text-sm text-muted-foreground">
                            {availablePercentage.toFixed(2)}% Available
                          </div>
                        </div>
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div 
                            className="bg-primary" 
                            style={{ width: `${availablePercentage}%` }} 
                          />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            Available: {balance.available_balance.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 8,
                            })}
                          </div>
                          <div>
                            Reserved: {balance.reserved_balance.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 8,
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {balanceSummary.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No balance data available.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="vaults" className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-60" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {vaults.map((vault) => (
                <Card key={vault.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{vault.name}</CardTitle>
                        <CardDescription>{vault.description || 'No description'}</CardDescription>
                      </div>
                      <Badge variant={vault.status === 'active' ? 'default' : 'secondary'}>
                        {vault.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {vault.accounts?.map((account) => (
                        <div key={account.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                          <div className="flex items-center gap-4">
                            {getCurrencyIcon(account.currency)}
                            <div>
                              <div className="font-medium">{account.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {account.account_type} account
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-medium">
                                {account.balance.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 8,
                                })} {account.currency}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Available: {(account.balance - account.reserved_balance).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 8,
                                })}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                      
                      {(!vault.accounts || vault.accounts.length === 0) && (
                        <div className="p-4 text-center text-muted-foreground">
                          No accounts in this vault
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {vaults.length === 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>No Vaults Found</CardTitle>
                    <CardDescription>Create your first vault to get started</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-4">
                      You don't have any vaults yet. Create one to start managing your assets.
                    </p>
                    <Button onClick={onRefresh}>Refresh</Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
