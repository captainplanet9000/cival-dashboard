'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Wallet, ArrowUpDown, RefreshCw, PieChart } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useWalletErrorHandler } from '@/hooks/use-wallet-fallback';
import { DialogWrapper } from '@/components/ui/dialog-wrapper';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * WalletOverview Component
 * Displays wallet balances and performance metrics
 */
export function WalletOverview() {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const { data: walletData, isLoading, error, refetch } = useWalletBalances();
  const { getWalletFallbackData } = useWalletErrorHandler();
  
  // Use fallback data if there's an error or no data yet
  const displayData = error || !walletData ? getWalletFallbackData() : walletData;
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-2xl">Wallet</CardTitle>
          <CardDescription>Manage your crypto assets</CardDescription>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsConnectModalOpen(true)}
            className="flex items-center gap-1"
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Connect
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col">
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-bold">{formatCurrency(displayData.totalValue)}</h3>
            <div className={`text-sm font-medium ${displayData.performance.daily >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(displayData.performance.daily)} (24h)
            </div>
          </div>
          <Tabs defaultValue="assets" className="mt-4">
            <TabsList className="mb-2">
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>
            <TabsContent value="assets">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {displayData.balances.map((asset) => (
                    <div key={asset.asset} className="flex flex-col space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="font-medium">{asset.asset}</span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            {asset.balance} {asset.asset}
                          </span>
                        </div>
                        <span>{formatCurrency(asset.usdValue)}</span>
                      </div>
                      <Progress value={asset.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="performance">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border bg-card p-3">
                    <div className="text-sm font-medium">Daily</div>
                    <div className={`text-xl font-bold ${displayData.performance.daily >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercentage(displayData.performance.daily)}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <div className="text-sm font-medium">Weekly</div>
                    <div className={`text-xl font-bold ${displayData.performance.weekly >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercentage(displayData.performance.weekly)}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <div className="text-sm font-medium">Monthly</div>
                    <div className={`text-xl font-bold ${displayData.performance.monthly >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercentage(displayData.performance.monthly)}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <div className="text-sm font-medium">Yearly</div>
                    <div className={`text-xl font-bold ${displayData.performance.yearly >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercentage(displayData.performance.yearly)}
                    </div>
                  </div>
                </div>
                <div className="flex justify-center py-2 text-muted-foreground text-sm">
                  Detailed analytics available in the Performance section
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Button variant="outline" className="w-[48%]">
          <ArrowUpDown className="mr-2 h-4 w-4" />
          Exchange
        </Button>
        <Button className="w-[48%]">
          <Wallet className="mr-2 h-4 w-4" />
          Manage Assets
        </Button>
      </CardFooter>
      
      {/* Connect Exchange Modal - Following standardized modal pattern */}
      <DialogWrapper open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Exchange</DialogTitle>
            <DialogDescription>
              Connect your exchange account to track balances and execute trades
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="p-6 flex flex-col items-center">
                <img src="/exchanges/binance.svg" alt="Binance" className="w-12 h-12 mb-2" />
                <span>Binance</span>
              </Button>
              <Button variant="outline" className="p-6 flex flex-col items-center">
                <img src="/exchanges/coinbase.svg" alt="Coinbase" className="w-12 h-12 mb-2" />
                <span>Coinbase</span>
              </Button>
              <Button variant="outline" className="p-6 flex flex-col items-center">
                <img src="/exchanges/ftx.svg" alt="FTX" className="w-12 h-12 mb-2" />
                <span>FTX</span>
              </Button>
              <Button variant="outline" className="p-6 flex flex-col items-center">
                <img src="/exchanges/bybit.svg" alt="Bybit" className="w-12 h-12 mb-2" />
                <span>Bybit</span>
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConnectModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // This would normally save the connection
              setIsConnectModalOpen(false);
            }}>
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogWrapper>
    </Card>
  );
}
