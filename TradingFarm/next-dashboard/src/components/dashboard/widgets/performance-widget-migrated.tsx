'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart } from '@/components/charts/pie-chart';
import { queryKeys } from '@/utils/react-query/query-keys';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api-service';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { getCacheTimeForEntity } from '@/utils/react-query/enhanced-cache-config';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoCircledIcon } from '@radix-ui/react-icons';

interface PerformanceData {
  winRate: number;
  profitLoss: number;
  totalTrades: number;
  profitFactor: number;
  performanceByCategory: {
    name: string;
    value: number;
    color: string;
  }[];
}

interface PerformanceWidgetProps {
  farmId: string;
  period?: '1d' | '1w' | '1m' | '3m' | 'all';
}

/**
 * Performance Widget - Migrated to TanStack Query
 * 
 * This component shows performance metrics for a farm, including win rate,
 * profit/loss, and trade distribution.
 * 
 * Migration changes:
 * - Replaced useState/useEffect with useQuery
 * - Removed manual loading and error states
 * - Added refetch capability
 * - Configured caching with domain-specific settings
 * - Added proper error handling
 */
export function PerformanceWidgetMigrated({ farmId, period = '1m' }: PerformanceWidgetProps) {
  // 1. TanStack Query implementation - replaces useState/useEffect fetching pattern
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.dashboard.performance(farmId, { period })._def,
    queryFn: () => apiService.get<PerformanceData>(
      `/api/farms/${farmId}/performance?period=${period}`
    ).then(res => res.data),
    // 2. Domain-specific cache configuration
    ...getCacheTimeForEntity('dashboard-performance'),
    // 3. Optimized refetching behavior
    refetchOnWindowFocus: false,
    refetchInterval: period === '1d' ? 60 * 1000 : false, // Auto-refresh for daily view
  });

  // 4. Render different UI states based on query results
  if (isLoading) {
    return (
      <Card className="col-span-1 md:col-span-2 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">Performance Metrics</CardTitle>
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-3">
            <Skeleton className="h-[250px] rounded-md" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-12 rounded-md" />
              <Skeleton className="h-12 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 md:col-span-2 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">Performance Metrics</CardTitle>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 w-8 p-0" 
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <InfoCircledIcon className="h-4 w-4" />
            <AlertTitle>Error loading performance data</AlertTitle>
            <AlertDescription>
              {error instanceof Error 
                ? error.message 
                : 'Failed to load performance data. Please try again.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 md:col-span-2 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">
          Performance Metrics
          {isFetching && <span className="ml-2 text-xs text-muted-foreground">(refreshing...)</span>}
        </CardTitle>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 w-8 p-0" 
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="h-[250px]">
            <PieChart 
              data={data?.performanceByCategory || []} 
              title="Trade Distribution"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border p-3">
              <div className="text-2xl font-bold">
                {data?.winRate ? `${data.winRate.toFixed(2)}%` : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
            </div>
            <div className="rounded-md border p-3">
              <div className={`text-2xl font-bold ${data?.profitLoss && data.profitLoss > 0 ? 'text-green-500' : data?.profitLoss && data.profitLoss < 0 ? 'text-red-500' : ''}`}>
                {data?.profitLoss ? `$${data.profitLoss.toFixed(2)}` : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">Profit/Loss</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-2xl font-bold">
                {data?.totalTrades || 0}
              </div>
              <div className="text-xs text-muted-foreground">Total Trades</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-2xl font-bold">
                {data?.profitFactor ? data.profitFactor.toFixed(2) : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">Profit Factor</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
