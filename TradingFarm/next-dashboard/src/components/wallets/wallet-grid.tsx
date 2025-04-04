'use client';

/**
 * Wallet Grid Component
 * Displays multiple wallets in a responsive grid with filtering and sorting options
 */
import React, { useState, useEffect } from 'react';
import { WalletCard, WalletCardProps } from './wallet-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  RefreshCw, 
  AlertTriangle,
  CircleDollarSign,
  WalletCards
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface WalletGridProps {
  wallets: WalletCardProps['wallet'][];
  farmId: string;
  loading?: boolean;
  onViewWalletDetails: (walletId: string) => void;
  onAddWallet: () => void;
  onRefreshAllWallets: () => void;
  onRefreshWallet: (walletId: string) => void;
}

type SortOption = 'name' | 'balance_high_to_low' | 'balance_low_to_high' | 'last_updated';

export function WalletGrid({ 
  wallets, 
  farmId, 
  loading = false,
  onViewWalletDetails, 
  onAddWallet,
  onRefreshAllWallets,
  onRefreshWallet
}: WalletGridProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('balance_high_to_low');
  const [filteredWallets, setFilteredWallets] = useState<WalletCardProps['wallet'][]>(wallets);
  
  // Filter and sort wallets when dependencies change
  useEffect(() => {
    let result = [...wallets];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        wallet => 
          wallet.name.toLowerCase().includes(term) || 
          wallet.address.toLowerCase().includes(term) ||
          (wallet.exchange && wallet.exchange.toLowerCase().includes(term)) ||
          (wallet.network && wallet.network.toLowerCase().includes(term))
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(wallet => wallet.status === filterStatus);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'balance_high_to_low':
          return b.balance - a.balance;
        case 'balance_low_to_high':
          return a.balance - b.balance;
        case 'last_updated':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        default:
          return 0;
      }
    });
    
    setFilteredWallets(result);
  }, [wallets, searchTerm, filterStatus, sortBy]);

  // Get statistics
  const getTotalBalance = () => {
    // Note: This is simplified. In a real app, you'd convert all currencies to a base currency
    const totalByType: {[key: string]: number} = {};
    
    wallets.forEach(wallet => {
      if (!totalByType[wallet.currency]) {
        totalByType[wallet.currency] = 0;
      }
      totalByType[wallet.currency] += wallet.balance;
    });
    
    return Object.entries(totalByType).map(([currency, balance]) => {
      return {
        currency,
        balance
      };
    });
  };
  
  const getAlertCount = () => {
    return wallets.reduce((count, wallet) => {
      return count + (wallet.alerts?.length || 0);
    }, 0);
  };
  
  const getWalletsByStatus = () => {
    const counts = {
      active: wallets.filter(w => w.status === 'active').length,
      inactive: wallets.filter(w => w.status === 'inactive').length,
      warning: wallets.filter(w => w.status === 'warning').length,
      error: wallets.filter(w => w.status === 'error').length
    };
    
    return counts;
  };

  // Render empty state when no wallets available
  const renderEmptyState = () => (
    <Card className="border border-dashed">
      <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px] text-center">
        <WalletCards className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No wallets found</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-6">
          {searchTerm || filterStatus !== 'all' 
            ? "Try adjusting your filters or search term"
            : "Get started by adding a wallet to track your assets and monitor performance"}
        </p>
        <Button onClick={onAddWallet}>
          <Plus className="h-4 w-4 mr-2" />
          Add Wallet
        </Button>
      </CardContent>
    </Card>
  );
  
  // Render loading skeletons
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="h-full">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48 mt-1" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between pt-2">
            <Skeleton className="h-9 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-10" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Wallet Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loading ? (
                <Skeleton className="h-7 w-full" />
              ) : getTotalBalance().length > 0 ? (
                getTotalBalance().map((item, index) => (
                  <div key={index} className="flex items-center">
                    <CircleDollarSign className="h-5 w-5 mr-2 text-primary" />
                    <span className="text-xl font-bold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: item.currency === 'BTC' || item.currency === 'ETH' ? 'USD' : item.currency,
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(item.balance)}
                      {item.currency === 'BTC' ? ' BTC' : item.currency === 'ETH' ? ' ETH' : ''}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xl font-bold text-muted-foreground">No data</div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Wallet Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Wallet Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                  <span className="text-sm">Active: {getWalletsByStatus().active}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gray-400 mr-2" />
                  <span className="text-sm">Inactive: {getWalletsByStatus().inactive}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
                  <span className="text-sm">Warning: {getWalletsByStatus().warning}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                  <span className="text-sm">Error: {getWalletsByStatus().error}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Alerts Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-full" />
            ) : (
              <div className="flex items-center">
                <AlertTriangle className={`h-5 w-5 mr-2 ${
                  getAlertCount() > 0 ? 'text-yellow-500' : 'text-green-500'
                }`} />
                <span className="text-xl font-bold">
                  {getAlertCount()} {getAlertCount() === 1 ? 'Alert' : 'Alerts'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search wallets..."
              className="pl-8 w-full sm:w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setSortBy('name')}>
                Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('balance_high_to_low')}>
                Balance (High to Low)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('balance_low_to_high')}>
                Balance (Low to High)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('last_updated')}>
                Last Updated
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefreshAllWallets}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
          <Button onClick={onAddWallet}>
            <Plus className="h-4 w-4 mr-2" />
            Add Wallet
          </Button>
        </div>
      </div>

      {/* Wallet Grid */}
      <Tabs defaultValue="grid" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
          <div className="text-sm text-muted-foreground">
            {filteredWallets.length} {filteredWallets.length === 1 ? 'wallet' : 'wallets'} found
          </div>
        </div>
        
        <TabsContent value="grid" className="mt-0">
          {loading ? (
            renderSkeletons()
          ) : filteredWallets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredWallets.map((wallet) => (
                <WalletCard
                  key={wallet.id}
                  wallet={wallet}
                  onViewDetails={onViewWalletDetails}
                  onRefreshBalance={onRefreshWallet}
                />
              ))}
            </div>
          ) : (
            renderEmptyState()
          )}
        </TabsContent>
        
        <TabsContent value="list" className="mt-0">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-48 mt-1" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-9 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredWallets.length > 0 ? (
            <div className="space-y-4">
              {filteredWallets.map((wallet) => (
                <Card key={wallet.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <WalletCards className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{wallet.name}</h3>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <span className="truncate max-w-[200px]">{wallet.address}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 ml-1"
                              onClick={() => {
                                navigator.clipboard.writeText(wallet.address);
                                toast({
                                  description: "Wallet address copied to clipboard.",
                                });
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: wallet.currency === 'BTC' || wallet.currency === 'ETH' ? 'USD' : wallet.currency,
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(wallet.balance)}
                            {wallet.currency === 'BTC' ? ' BTC' : wallet.currency === 'ETH' ? ' ETH' : ''}
                          </div>
                          {wallet.changePercent24h !== undefined && (
                            <div className={`text-xs ${
                              wallet.changePercent24h > 0 ? 'text-green-600' : 
                              wallet.changePercent24h < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {wallet.changePercent24h > 0 ? '+' : ''}{wallet.changePercent24h.toFixed(2)}%
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            wallet.status === 'active' ? 'bg-green-500' :
                            wallet.status === 'inactive' ? 'bg-gray-400' :
                            wallet.status === 'warning' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          <span className="text-xs capitalize">{wallet.status}</span>
                        </div>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => onRefreshWallet(wallet.id)}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Refresh
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onViewWalletDetails(wallet.id)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            renderEmptyState()
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
