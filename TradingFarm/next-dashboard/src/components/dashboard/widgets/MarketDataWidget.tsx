/**
 * Market Data Widget for Trading Farm Dashboard
 * Displays real-time market data with proper error handling and loading states
 */
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMarketData, MarketDataParams } from '@/hooks/queries/use-market-data';
import { DashboardWidgetState } from '@/components/ui/dashboard-states';
import { Button } from '@/components/ui/button-standardized';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketDataWidgetProps {
  title?: string;
  description?: string;
  params?: MarketDataParams;
  className?: string;
}

/**
 * Widget for displaying market data in the dashboard
 * Uses the useMarketData hook for data fetching with React Query
 */
export function MarketDataWidget({
  title = 'Market Overview',
  description = 'Real-time crypto market data',
  params,
  className,
}: MarketDataWidgetProps) {
  const [selectedExchange, setSelectedExchange] = React.useState<string | undefined>(
    params?.exchange || undefined
  );
  
  const {
    data: marketData,
    isLoading,
    isError,
    error,
    refetch,
  } = useMarketData({
    ...params,
    exchange: selectedExchange,
  });

  // Format currency with proper decimals based on price value
  const formatCurrency = (value: number) => {
    if (value < 0.01) return `$${value.toFixed(6)}`;
    if (value < 1) return `$${value.toFixed(4)}`;
    if (value < 1000) return `$${value.toFixed(2)}`;
    if (value < 10000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="px-6 py-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => refetch()}
          className="ml-auto"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">Refresh market data</span>
        </Button>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <DashboardWidgetState
          data={marketData}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketData?.map((item) => (
                  <TableRow key={item.symbol}>
                    <TableCell className="font-medium">{item.symbol}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <Badge
                          variant={item.change24h >= 0 ? "success" : "destructive"}
                          className={cn(
                            "rounded-sm font-mono",
                            item.change24h >= 0 ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-red-100 text-red-800 hover:bg-red-100"
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
                    <TableCell className="text-right">
                      {formatCurrency(item.volume24h)}
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

export default MarketDataWidget;
