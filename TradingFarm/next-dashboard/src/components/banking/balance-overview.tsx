'use client';

import * as React from 'react';
import { DollarSign, Wallet, LineChart, RefreshCw, ArrowDown, ArrowUp, Search, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { VaultBalance, VaultCurrency, getVaultBalances } from '@/services/vault-service';
import Image from 'next/image';

export interface BalanceOverviewProps {
  userId: string;
  onDeposit?: (currencyId: string) => void;
  onWithdraw?: (currencyId: string) => void;
  className?: string;
}

type AssetType = 'ALL' | 'FIAT' | 'CRYPTO' | 'STABLE';
type SortOption = 'value-desc' | 'value-asc' | 'name-asc' | 'name-desc';

export function BalanceOverview({ 
  userId, 
  onDeposit,
  onWithdraw,
  className 
}: BalanceOverviewProps) {
  const [loading, setLoading] = React.useState(true);
  const [balances, setBalances] = React.useState<VaultBalance[]>([]);
  const [filteredBalances, setFilteredBalances] = React.useState<VaultBalance[]>([]);
  const [showZeroBalances, setShowZeroBalances] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [assetFilter, setAssetFilter] = React.useState<AssetType>('ALL');
  const [sortOption, setSortOption] = React.useState<SortOption>('value-desc');
  const [totalValue, setTotalValue] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);

  // Load balances
  const loadBalances = React.useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = await getVaultBalances(userId);
      setBalances(result);
      
      // Calculate total value
      const total = result.reduce((sum, balance) => sum + balance.usd_value, 0);
      setTotalValue(total);
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  // Apply filters, search, and sorting
  React.useEffect(() => {
    let filtered = [...balances];
    
    // Filter by asset type
    if (assetFilter !== 'ALL') {
      filtered = filtered.filter(balance => 
        balance.currency.type === assetFilter
      );
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(balance => 
        balance.currency.name.toLowerCase().includes(query) || 
        balance.currency.code.toLowerCase().includes(query)
      );
    }
    
    // Filter zero balances
    if (!showZeroBalances) {
      filtered = filtered.filter(balance => balance.total > 0);
    }
    
    // Sort balances
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'value-desc':
          return b.usd_value - a.usd_value;
        case 'value-asc':
          return a.usd_value - b.usd_value;
        case 'name-asc':
          return a.currency.name.localeCompare(b.currency.name);
        case 'name-desc':
          return b.currency.name.localeCompare(a.currency.name);
        default:
          return 0;
      }
    });
    
    setFilteredBalances(filtered);
  }, [balances, assetFilter, searchQuery, showZeroBalances, sortOption]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBalances();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatValue = (balance: VaultBalance) => {
    const { currency, total } = balance;
    const { symbol, decimals } = currency;
    
    return `${symbol}${total.toFixed(decimals)}`;
  };

  const renderLoadingState = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 border rounded-md">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Assets Overview</CardTitle>
            <CardDescription>
              Manage your vault assets
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Sort & Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setSortOption('value-desc')}>
                  {sortOption === 'value-desc' && '✓ '}Value (High to Low)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('value-asc')}>
                  {sortOption === 'value-asc' && '✓ '}Value (Low to High)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('name-asc')}>
                  {sortOption === 'name-asc' && '✓ '}Name (A to Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('name-desc')}>
                  {sortOption === 'name-desc' && '✓ '}Name (Z to A)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Show Zero Balances</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setShowZeroBalances(!showZeroBalances)}>
                  {showZeroBalances ? '✓ Showing' : '□ Hidden'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                <DollarSign className="h-8 w-8 text-green-500 mb-2" />
                <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                <div className="text-sm text-muted-foreground">Total Value</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="text-sm text-muted-foreground">Currencies</div>
                  <div className="text-2xl font-bold">{balances.filter(b => b.total > 0).length}</div>
                </div>
                <Wallet className="h-8 w-8 text-blue-500" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="text-sm text-muted-foreground">Change (24h)</div>
                  <div className="text-2xl font-bold text-green-500">+2.8%</div>
                </div>
                <LineChart className="h-8 w-8 text-purple-500" />
              </CardContent>
            </Card>
          </div>
          
          <div className="flex items-center justify-between">
            <Tabs defaultValue="ALL" className="w-full">
              <TabsList>
                <TabsTrigger value="ALL" onClick={() => setAssetFilter('ALL')}>
                  All
                </TabsTrigger>
                <TabsTrigger value="FIAT" onClick={() => setAssetFilter('FIAT')}>
                  Fiat
                </TabsTrigger>
                <TabsTrigger value="CRYPTO" onClick={() => setAssetFilter('CRYPTO')}>
                  Crypto
                </TabsTrigger>
                <TabsTrigger value="STABLE" onClick={() => setAssetFilter('STABLE')}>
                  Stablecoins
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search assets..." 
              className="pl-9" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="border rounded-md">
            {loading ? (
              renderLoadingState()
            ) : filteredBalances.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No assets found. {!showZeroBalances && 'Try showing zero balances.'}
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="space-y-1 p-1">
                  {filteredBalances.map((balance) => (
                    <div 
                      key={balance.currency_id} 
                      className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        {balance.currency.icon_url ? (
                          <div className="w-8 h-8 relative rounded-full overflow-hidden">
                            <Image 
                              src={balance.currency.icon_url} 
                              alt={balance.currency.code}
                              fill
                              style={{ objectFit: "cover" }}
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold">
                              {balance.currency.code.substring(0, 2)}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{balance.currency.name}</div>
                          <div className="text-xs text-muted-foreground">{balance.currency.code}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium">{formatValue(balance)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(balance.usd_value)}
                          </div>
                        </div>
                        
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onDeposit?.(balance.currency_id)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onWithdraw?.(balance.currency_id)}
                            disabled={balance.available <= 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" onClick={() => setShowZeroBalances(!showZeroBalances)}>
          {showZeroBalances ? 'Hide Zero Balances' : 'Show Zero Balances'}
        </Button>
        <div className="flex space-x-2">
          <Button 
            variant="default" 
            size="sm"
            onClick={() => onDeposit?.('')}
          >
            <ArrowDown className="mr-2 h-4 w-4" />
            Deposit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onWithdraw?.('')}
          >
            <ArrowUp className="mr-2 h-4 w-4" />
            Withdraw
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
