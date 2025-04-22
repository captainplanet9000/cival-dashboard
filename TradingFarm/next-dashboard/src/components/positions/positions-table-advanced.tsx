'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MoreHorizontal,
  Eye,
  RefreshCw,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  DollarSign,
  BarChart2,
  ShoppingCart,
  FileCog,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  Filter
} from 'lucide-react';
import { formatDate } from '@/utils/date-utils';
import { useToast } from '@/components/ui/use-toast';
import { reconcilePosition } from '@/app/actions/position-actions';
import { 
  usePositions, 
  PositionsFilter, 
  SortDirection, 
  PositionSortField 
} from '@/hooks/react-query/use-position-queries';

export default function PositionsTableAdvanced() {
  const router = useRouter();
  const { toast } = useToast();
  const [processingPosition, setProcessingPosition] = useState<string | null>(null);
  
  // Filtering and Pagination State
  const [filters, setFilters] = useState<PositionsFilter>({
    page: 1,
    pageSize: 10,
    sort: {
      field: 'created_at',
      direction: 'desc'
    }
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<{
    exchanges: string[];
    side?: 'long' | 'short';
    minPnl?: number;
    maxPnl?: number;
    hasDiscrepancy?: boolean;
  }>({
    exchanges: []
  });
  
  // Fetch positions data with TanStack Query
  const { 
    data, 
    isLoading, 
    isError, 
    refetch, 
    error 
  } = usePositions(filters);
  
  const positions = data?.positions || [];
  const totalPages = data?.totalPages || 1;
  const totalPositions = data?.totalPositions || 0;
  
  // Available exchange options - normally would come from API but mocked here
  const exchangeOptions = ['Binance', 'Coinbase', 'FTX', 'Kraken', 'Kucoin'];
  
  // Function to handle position reconciliation
  const handleReconcilePosition = async (positionId: string) => {
    try {
      setProcessingPosition(positionId);
      const result = await reconcilePosition(positionId);
      
      if (result.success) {
        toast({
          title: 'Position reconciled',
          description: 'The position has been successfully reconciled with the exchange.',
        });
        refetch();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reconcile position',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setProcessingPosition(null);
    }
  };
  
  // Function to create a new order for a symbol
  const handleCreateOrder = (position: any) => {
    const baseParams = new URLSearchParams({
      farm_id: position.farm_id,
      symbol: position.symbol
    });
    
    if (position.agent_id) baseParams.append('agent_id', position.agent_id);
    
    // Redirect to create order page
    router.push(`/trading/orders/create?${baseParams.toString()}`);
  };
  
  // View position details
  const handleViewPosition = (positionId: string) => {
    router.push(`/trading/positions/${positionId}`);
  };
  
  // Position analysis
  const handleAnalyzePosition = (positionId: string) => {
    router.push(`/trading/positions/${positionId}/analysis`);
  };
  
  // Apply search filter
  const applySearch = () => {
    if (searchTerm.trim()) {
      setFilters(prev => ({
        ...prev,
        page: 1, // Reset to first page when searching
        search: searchTerm.trim()
      }));
    } else {
      setFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters.search;
        return { ...newFilters, page: 1 };
      });
    }
  };
  
  // Apply all filters
  const applyFilters = () => {
    const newFilters: PositionsFilter = {
      ...filters,
      page: 1, // Reset to first page when filtering
      exchanges: appliedFilters.exchanges.length > 0 ? appliedFilters.exchanges : undefined,
      side: appliedFilters.side,
      pnlRange: (appliedFilters.minPnl !== undefined || appliedFilters.maxPnl !== undefined) ? {
        min: appliedFilters.minPnl,
        max: appliedFilters.maxPnl
      } : undefined,
      reconciliationStatus: appliedFilters.hasDiscrepancy ? 'discrepancy' : undefined
    };
    
    setFilters(newFilters);
    setShowFilter(false);
  };
  
  // Reset all filters
  const resetFilters = () => {
    setAppliedFilters({ exchanges: [] });
    setSearchTerm('');
    setFilters({
      page: 1,
      pageSize: 10,
      sort: {
        field: 'created_at',
        direction: 'desc'
      }
    });
    setShowFilter(false);
  };
  
  // Function to toggle exchange selection
  const toggleExchange = (exchange: string) => {
    setAppliedFilters(prev => {
      const exchanges = [...prev.exchanges];
      const index = exchanges.indexOf(exchange);
      
      if (index >= 0) {
        exchanges.splice(index, 1);
      } else {
        exchanges.push(exchange);
      }
      
      return { ...prev, exchanges };
    });
  };
  
  // Function to handle sorting
  const handleSort = (field: PositionSortField) => {
    setFilters(prev => {
      const direction: SortDirection = 
        prev.sort?.field === field && prev.sort.direction === 'asc' 
          ? 'desc' 
          : 'asc';
      
      return {
        ...prev,
        sort: { field, direction }
      };
    });
  };
  
  // Pagination functions
  const handlePrevPage = () => {
    if (filters.page && filters.page > 1) {
      setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }));
    }
  };
  
  const handleNextPage = () => {
    if (filters.page && filters.page < totalPages) {
      setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }));
    }
  };
  
  const handlePageSizeChange = (size: string) => {
    setFilters(prev => ({ ...prev, page: 1, pageSize: parseInt(size) }));
  };
  
  // Helper functions
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };
  
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  
  const getPnlClass = (value: number) => {
    return value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : '';
  };
  
  // Function to get the badge color based on reconciliation status
  const getReconciliationBadge = (status?: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <RefreshCw className="mr-1 h-3 w-3" />
            Verified
          </Badge>
        );
      case 'discrepancy':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Discrepancy
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Unknown
          </Badge>
        );
    }
  };
  
  // Get sort direction indicator
  const getSortIndicator = (field: PositionSortField) => {
    if (filters.sort?.field !== field) return null;
    
    return filters.sort.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4" /> 
      : <ChevronDown className="h-4 w-4" />;
  };
  
  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.exchanges && filters.exchanges.length > 0) count++;
    if (filters.side) count++;
    if (filters.pnlRange) count++;
    if (filters.reconciliationStatus) count++;
    return count;
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Positions</CardTitle>
              <CardDescription>
                Manage your trading positions across all exchanges
              </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Input
                  placeholder="Search symbol or exchange..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applySearch()}
                  className="min-w-[200px] pr-8"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-0 top-0"
                  onClick={applySearch}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilter(!showFilter)}
                className="relative"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {getActiveFilterCount() > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Filter Panel */}
          {showFilter && (
            <div className="bg-card border rounded-md p-4 mt-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium">Filter Positions</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowFilter(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <Label>Exchanges</Label>
                  <div className="space-y-2">
                    {exchangeOptions.map(exchange => (
                      <div key={exchange} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`exchange-${exchange}`} 
                          checked={appliedFilters.exchanges.includes(exchange)}
                          onCheckedChange={() => toggleExchange(exchange)}
                        />
                        <label
                          htmlFor={`exchange-${exchange}`}
                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {exchange}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>Position Side</Label>
                  <Select
                    value={appliedFilters.side || ''}
                    onValueChange={(value) => setAppliedFilters(prev => ({ 
                      ...prev, 
                      side: value ? (value as 'long' | 'short') : undefined 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any side" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any-side">Any side</SelectItem>
                      <SelectItem value="long">Long only</SelectItem>
                      <SelectItem value="short">Short only</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Label>Reconciliation</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="discrepancy" 
                      checked={appliedFilters.hasDiscrepancy}
                      onCheckedChange={(checked) => 
                        setAppliedFilters(prev => ({ 
                          ...prev, 
                          hasDiscrepancy: !!checked 
                        }))
                      }
                    />
                    <label
                      htmlFor="discrepancy"
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Show only positions with discrepancies
                    </label>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>P&L Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Min P&L</Label>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={appliedFilters.minPnl ?? ''}
                        onChange={e => setAppliedFilters(prev => ({ 
                          ...prev, 
                          minPnl: e.target.value ? parseFloat(e.target.value) : undefined 
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max P&L</Label>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={appliedFilters.maxPnl ?? ''}
                        onChange={e => setAppliedFilters(prev => ({ 
                          ...prev, 
                          maxPnl: e.target.value ? parseFloat(e.target.value) : undefined 
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset
                </Button>
                <Button variant="default" size="sm" onClick={applyFilters}>
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {isError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="font-medium text-lg mb-2">Failed to load positions</h3>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('symbol')}
                          className="flex items-center space-x-1 font-medium"
                        >
                          Symbol
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                          {getSortIndicator('symbol')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('side')}
                          className="flex items-center space-x-1 font-medium"
                        >
                          Side
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                          {getSortIndicator('side')}
                        </Button>
                      </TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Entry Price</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>Market Value</TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('unrealized_pnl')}
                          className="flex items-center space-x-1 font-medium"
                        >
                          P&L
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                          {getSortIndicator('unrealized_pnl')}
                        </Button>
                      </TableHead>
                      <TableHead>Exchange</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      // Loading skeleton
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          {Array.from({ length: 10 }).map((_, cellIndex) => (
                            <TableCell key={cellIndex}>
                              <div className="h-5 bg-muted animate-pulse rounded"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : positions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <Filter className="h-10 w-10 mb-2" />
                            <p>No positions found</p>
                            <p className="text-sm">Try adjusting your filters</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      positions.map((position) => (
                        <TableRow key={position.id}>
                          <TableCell className="font-medium">{position.symbol}</TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              position.side === 'long' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {position.side === 'long' ? (
                                <ChevronUp className="h-4 w-4 mr-1" />
                              ) : (
                                <ChevronDown className="h-4 w-4 mr-1" />
                              )}
                              {position.side.toUpperCase()}
                            </div>
                          </TableCell>
                          <TableCell>{position.quantity}</TableCell>
                          <TableCell>{formatCurrency(position.entry_price)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{formatCurrency(position.current_price)}</span>
                              <span className={`text-xs ${
                                position.current_price > position.entry_price 
                                  ? 'text-green-600' 
                                  : position.current_price < position.entry_price 
                                    ? 'text-red-600' 
                                    : 'text-muted-foreground'
                              }`}>
                                {position.current_price > position.entry_price ? '▲' : position.current_price < position.entry_price ? '▼' : ''}
                                {Math.abs(
                                  ((position.current_price - position.entry_price) / position.entry_price) * 100
                                ).toFixed(2)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(position.market_value)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={getPnlClass(position.unrealized_pnl)}>
                                {formatCurrency(position.unrealized_pnl)}
                              </span>
                              <span className={`text-xs ${getPnlClass(position.unrealized_pnl_percentage)}`}>
                                {formatPercentage(position.unrealized_pnl_percentage)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{position.exchange}</TableCell>
                          <TableCell>{getReconciliationBadge(position.reconciliation_status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={processingPosition === position.id}>
                                  {processingPosition === position.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewPosition(position.id)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={() => handleCreateOrder(position)}>
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  Create Order
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => handleAnalyzePosition(position.id)}>
                                  <BarChart2 className="mr-2 h-4 w-4" />
                                  Analyze Position
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={() => handleReconcilePosition(position.id)}>
                                  <FileCog className="mr-2 h-4 w-4" />
                                  Reconcile
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing{' '}
                  <span className="font-medium">
                    {positions.length > 0 ? (filters.page || 1) * (filters.pageSize || 10) - (filters.pageSize || 10) + 1 : 0}
                  </span>
                  {' '}-{' '}
                  <span className="font-medium">
                    {Math.min((filters.page || 1) * (filters.pageSize || 10), totalPositions)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{totalPositions}</span> positions
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm">Show</Label>
                    <Select 
                      value={filters.pageSize?.toString() || '10'} 
                      onValueChange={handlePageSizeChange}
                    >
                      <SelectTrigger className="w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePrevPage}
                      disabled={!filters.page || filters.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {filters.page || 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNextPage}
                      disabled={!filters.page || filters.page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
