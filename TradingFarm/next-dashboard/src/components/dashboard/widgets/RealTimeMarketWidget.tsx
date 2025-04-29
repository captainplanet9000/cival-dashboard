/**
 * Real-time Market Data Widget for Trading Farm Dashboard
 * Features optimized rendering, visual price updates, and performance optimizations
 */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button-standardized';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, ArrowUp, Search, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardWidgetState } from '@/components/ui/dashboard-states';
import { useRealTimeMarketData } from '@/hooks/queries/use-real-time-market-data';
import { debounce } from '@/utils/debounce';

interface RealTimeMarketWidgetProps {
  title?: string;
  description?: string;
  className?: string;
  symbols?: string[];
  exchange?: string;
  initialLimit?: number;
  onSymbolClick?: (symbol: string) => void;
}

/**
 * Widget for displaying real-time market data with price animations
 * Uses memoization, virtualization, and optimistic UI updates for performance
 */
export function RealTimeMarketWidget({
  title = 'Market Overview',
  description = 'Real-time market prices and changes',
  className,
  symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'BNB/USD'],
  exchange = 'binance',
  initialLimit = 10,
  onSymbolClick,
}: RealTimeMarketWidgetProps) {
  // State for search and animations
  const [searchTerm, setSearchTerm] = useState('');
  const [priceAnimations, setPriceAnimations] = useState<Record<string, 'up' | 'down' | null>>({});
  const animationTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  // Use optimized real-time data hook
  const {
    data: marketData,
    isLoading,
    isError,
    error,
    refetch,
  } = useRealTimeMarketData({
    symbols,
    exchange,
    throttleMs: 300, // Throttle updates to prevent UI jank
    onUpdate: (data) => {
      // When price updates, trigger animation
      if (data.isLive) {
        triggerPriceAnimation(data.symbol, data.price);
      }
    },
  });
  
  // Create a debounced search function to prevent excessive filtering
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchTerm(term.toLowerCase());
    }, 300),
    []
  );
  
  // Filter market data based on search term (memoized to prevent unnecessary calculations)
  const filteredMarketData = useMemo(() => {
    if (!searchTerm) return marketData;
    return marketData.filter(
      (item) => 
        item.symbol.toLowerCase().includes(searchTerm) || 
        item.price.toString().includes(searchTerm)
    );
  }, [marketData, searchTerm]);
  
  // Trigger price animation with CSS transitions for visual feedback
  const triggerPriceAnimation = (symbol: string, newPrice: number) => {
    // Get the previous price if available
    const previousItem = marketData.find(item => item.symbol === symbol);
    if (!previousItem) return;
    
    // Determine if price went up or down
    const direction = newPrice > previousItem.price ? 'up' : 
                     newPrice < previousItem.price ? 'down' : null;
    
    // Don't animate if price didn't change
    if (!direction) return;
    
    // Clear any existing animation timer
    if (animationTimersRef.current[symbol]) {
      clearTimeout(animationTimersRef.current[symbol]);
    }
    
    // Set the animation direction
    setPriceAnimations(prev => ({
      ...prev,
      [symbol]: direction
    }));
    
    // Clear the animation after a short delay
    animationTimersRef.current[symbol] = setTimeout(() => {
      setPriceAnimations(prev => ({
        ...prev,
        [symbol]: null
      }));
      delete animationTimersRef.current[symbol];
    }, 1000);
  };
  
  // Clean up animation timers on unmount
  useEffect(() => {
    return () => {
      Object.values(animationTimersRef.current).forEach(timer => {
        clearTimeout(timer);
      });
    };
  }, []);
  
  // Format currency with appropriate decimal places
  const formatCurrency = (value: number) => {
    if (value < 0.01) return `$${value.toFixed(6)}`;
    if (value < 1) return `$${value.toFixed(4)}`;
    if (value < 1000) return `$${value.toFixed(2)}`;
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="px-6 py-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative w-[180px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search symbols..."
              className="pl-8 h-9"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="sr-only">Filters</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => refetch()}
            className="h-9 w-9"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Refresh data</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <DashboardWidgetState
          data={filteredMarketData}
          isLoading={isLoading}
          isError={isError}
          error={error as Error}
          onRetry={() => refetch()}
        >
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">24h Change</TableHead>
                  <TableHead className="text-right">24h Volume</TableHead>
                  <TableHead className="text-right">24h High/Low</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMarketData.map((item) => (
                  <TableRow 
                    key={item.symbol}
                    className={onSymbolClick ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={onSymbolClick ? () => onSymbolClick(item.symbol) : undefined}
                  >
                    <TableCell className="font-medium">{item.symbol}</TableCell>
                    <TableCell className={cn(
                      "text-right font-mono transition-colors duration-1000",
                      priceAnimations[item.symbol] === 'up' && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
                      priceAnimations[item.symbol] === 'down' && "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                    )}>
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <Badge
                          variant={item.change24h >= 0 ? "success" : "destructive"}
                          className={cn(
                            "rounded-sm font-mono",
                            item.change24h >= 0 ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400" : 
                                                 "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400"
                          )}
                        >
                          {item.change24h >= 0 ? (
                            <ArrowUp className="mr-1 h-3 w-3" />
                          ) : (
                            <ArrowDown className="mr-1 h-3 w-3" />
                          )}
                          {Math.abs(item.change24h).toFixed(2)}%
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatCurrency(item.volume24h)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-xs text-muted-foreground font-mono">
                        <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(item.high24h)}</span>
                        {' / '}
                        <span className="text-red-600 dark:text-red-400">{formatCurrency(item.low24h)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DashboardWidgetState>
      </CardContent>
    </Card>
  );
}

export default RealTimeMarketWidget;
