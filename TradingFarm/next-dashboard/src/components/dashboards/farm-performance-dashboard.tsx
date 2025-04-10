'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FarmPerformanceChart } from '@/components/charts/farm-performance-chart';
import { FarmComparisonChart } from '@/components/charts/farm-comparison-chart';
import { AssetAllocationChart } from '@/components/charts/asset-allocation-chart';
import { TransactionsTable, Transaction } from '@/components/tables/transactions-table';
import { Calendar, RefreshCw, TrendingUp, TrendingDown, BarChart4 } from 'lucide-react';
import { 
  getStandardDateRanges, 
  formatDateRange, 
  formatDate 
} from '@/utils/date-utils';
import { useSearchParams, useRouter } from 'next/navigation';

// Farm data interface
interface Farm {
  id: string | number;
  name: string;
  description?: string;
  roi: number;
  winRate: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  volatility?: number;
  profitFactor?: number;
  trades?: number;
  startDate: string;
  balance: number;
  performance_data?: {
    dates: string[];
    values: number[];
  };
  color?: string;
}

// Asset data for allocation chart
interface AssetAllocation {
  name: string;
  value: number;
  color?: string;
}

// Dashboard props interface
interface FarmPerformanceDashboardProps {
  farms: Farm[];
  selectedFarmId?: string | number;
  transactions?: Transaction[];
  assetAllocation?: AssetAllocation[];
  className?: string;
  isLoading?: boolean;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
  onFarmChange?: (farmId: string | number) => void;
  onRefreshData?: () => void;
}

/**
 * Farm Performance Dashboard component
 * Integrates multiple visualization components to provide a comprehensive view of farm performance
 */
export function FarmPerformanceDashboard({
  farms,
  selectedFarmId,
  transactions = [],
  assetAllocation = [],
  className = '',
  isLoading = false,
  onDateRangeChange,
  onFarmChange,
  onRefreshData,
}: FarmPerformanceDashboardProps) {
  // Get standard date ranges
  const dateRanges = getStandardDateRanges();
  
  // State for the selected date range
  const [selectedRange, setSelectedRange] = useState<string>('Last 30 Days');
  const [dateRange, setDateRange] = useState({
    startDate: dateRanges.find(range => range.label === 'Last 30 Days')?.startDate || new Date(),
    endDate: dateRanges.find(range => range.label === 'Last 30 Days')?.endDate || new Date(),
  });

  // Find the selected farm
  const selectedFarm = farms.find(farm => farm.id === selectedFarmId) || farms[0];
  
  // Function to handle date range change
  const handleDateRangeChange = (rangeLabel: string) => {
    const range = dateRanges.find(r => r.label === rangeLabel);
    if (range) {
      setSelectedRange(rangeLabel);
      setDateRange({
        startDate: range.startDate,
        endDate: range.endDate,
      });
      
      if (onDateRangeChange) {
        onDateRangeChange(range.startDate, range.endDate);
      }
    }
  };
  
  // Function to handle farm change
  const handleFarmChange = (farmId: string) => {
    if (onFarmChange) {
      onFarmChange(farmId);
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    if (onRefreshData) {
      onRefreshData();
    }
  };
  
  // Calculate quick stats
  const totalTrades = transactions.filter(t => t.type.toUpperCase() === 'TRADE').length;
  const profitTrades = transactions.filter(t => t.type.toUpperCase() === 'TRADE' && t.amount > 0).length;
  const lossTrades = transactions.filter(t => t.type.toUpperCase() === 'TRADE' && t.amount < 0).length;
  const winRate = totalTrades > 0 ? (profitTrades / totalTrades) * 100 : 0;
  
  // Calculate profit/loss
  const totalProfitLoss = transactions
    .filter(t => t.type.toUpperCase() === 'TRADE')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  // Early return if no data is available
  if (farms.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-xl font-semibold mb-2">No farms available</p>
            <p className="text-muted-foreground">Create a farm to view performance data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Farm Performance</h1>
          <p className="text-muted-foreground">
            {formatDateRange(dateRange.startDate, dateRange.endDate)}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range selector */}
          <Select
            value={selectedRange}
            onValueChange={handleDateRangeChange}
          >
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {dateRanges.map((range) => (
                <SelectItem key={range.label} value={range.label}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Farm selector */}
          <Select
            value={selectedFarm?.id?.toString()}
            onValueChange={handleFarmChange}
          >
            <SelectTrigger className="w-[180px]">
              <BarChart4 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select farm" />
            </SelectTrigger>
            <SelectContent>
              {farms.map((farm) => (
                <SelectItem key={farm.id.toString()} value={farm.id.toString()}>
                  {farm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Refresh button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      {/* Quick stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Balance
            </CardTitle>
            <BarChart4 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedFarm?.balance.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              As of {formatDate(new Date(), 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              ROI
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(selectedFarm?.roi * 100).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedRange}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Win Rate
            </CardTitle>
            <div className="h-4 w-4 text-muted-foreground">%</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {winRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {profitTrades} / {totalTrades} trades
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Profit/Loss
            </CardTitle>
            {totalProfitLoss >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalProfitLoss.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedRange}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main dashboard content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
        </TabsList>
        
        {/* Overview tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Farm performance chart */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Performance Trend</CardTitle>
                <CardDescription>
                  Performance over {selectedRange.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {selectedFarm && selectedFarm.performance_data && (
                  <FarmPerformanceChart
                    data={{
                      dates: selectedFarm.performance_data.dates,
                      values: selectedFarm.performance_data.values,
                    }}
                    dateRange={{
                      start: dateRange.startDate,
                      end: dateRange.endDate,
                    }}
                  />
                )}
              </CardContent>
            </Card>
            
            {/* Asset allocation */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
                <CardDescription>
                  Current distribution of assets
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <AssetAllocationChart
                  data={assetAllocation}
                  showPercentages={true}
                  showLegend={true}
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Recent transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Latest 5 transactions for {selectedFarm?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionsTable
                transactions={transactions.slice(0, 5)}
                showActions={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Performance tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Detailed performance analysis for {selectedFarm?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px]">
              <FarmComparisonChart
                farms={[selectedFarm].filter(Boolean) as Farm[]}
                period={selectedRange}
                dateRange={{
                  start: dateRange.startDate,
                  end: dateRange.endDate,
                }}
              />
            </CardContent>
          </Card>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* Performance metrics comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Farm Comparison</CardTitle>
                <CardDescription>
                  Compare performance across all farms
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <FarmComparisonChart
                  farms={farms}
                  period={selectedRange}
                  dateRange={{
                    start: dateRange.startDate,
                    end: dateRange.endDate,
                  }}
                />
              </CardContent>
            </Card>
            
            {/* Detailed metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
                <CardDescription>
                  Detailed performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Return on Investment', value: `${(selectedFarm?.roi * 100).toFixed(2)}%` },
                    { label: 'Win Rate', value: `${(selectedFarm?.winRate * 100).toFixed(2)}%` },
                    { label: 'Sharpe Ratio', value: selectedFarm?.sharpeRatio?.toFixed(2) || 'N/A' },
                    { label: 'Max Drawdown', value: selectedFarm?.maxDrawdown ? `${(selectedFarm.maxDrawdown * 100).toFixed(2)}%` : 'N/A' },
                    { label: 'Volatility', value: selectedFarm?.volatility ? `${(selectedFarm.volatility * 100).toFixed(2)}%` : 'N/A' },
                    { label: 'Profit Factor', value: selectedFarm?.profitFactor?.toFixed(2) || 'N/A' },
                    { label: 'Total Trades', value: totalTrades.toString() },
                    { label: 'Profit Trades', value: profitTrades.toString() },
                    { label: 'Loss Trades', value: lossTrades.toString() },
                  ].map((metric, index) => (
                    <div key={index} className="flex justify-between items-center pb-2 border-b">
                      <span className="font-medium">{metric.label}</span>
                      <span className="font-mono">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Transactions tab */}
        <TabsContent value="transactions" className="space-y-4">
          <TransactionsTable
            transactions={transactions}
            title={`${selectedFarm?.name} Transactions`}
            description={`Transaction history for ${selectedRange.toLowerCase()}`}
            showActions={true}
          />
        </TabsContent>
        
        {/* Allocation tab */}
        <TabsContent value="allocation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Allocation</CardTitle>
              <CardDescription>
                Current distribution of assets across instruments and markets
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px]">
              <AssetAllocationChart
                data={assetAllocation}
                showPercentages={true}
                showLegend={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
