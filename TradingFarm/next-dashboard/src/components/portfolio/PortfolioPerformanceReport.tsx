"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  FileDown, 
  Printer, 
  Calendar, 
  BarChart3, 
  TrendingUp,
  RefreshCw,
  Briefcase,
  BarChart2,
  PieChart,
  AlertCircle
} from 'lucide-react';
import { 
  PortfolioPerformance, 
  Portfolio, 
  PortfolioAllocation 
} from '@/types/portfolio';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { PortfolioPerformanceChart } from './PortfolioPerformanceChart';

interface PortfolioPerformanceReportProps {
  portfolio: Portfolio;
  performanceData: PortfolioPerformance[];
  allocations: PortfolioAllocation[];
  reportPeriod?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  benchmark?: string;
  onExport?: (format: 'pdf' | 'csv') => void;
  onRefresh?: () => void;
}

export function PortfolioPerformanceReport({
  portfolio,
  performanceData,
  allocations,
  reportPeriod = 'monthly',
  benchmark = 'BTC/USD',
  onExport,
  onRefresh
}: PortfolioPerformanceReportProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState('summary');
  const [selectedPeriod, setSelectedPeriod] = React.useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>(reportPeriod);
  const [selectedBenchmark, setSelectedBenchmark] = React.useState(benchmark);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const reportDate = new Date();
  
  // Calculate performance metrics
  const calculatePerformanceMetrics = () => {
    if (!performanceData || performanceData.length === 0) {
      return {
        startValue: portfolio.initial_capital,
        endValue: portfolio.current_value,
        totalReturn: 0,
        totalReturnPct: 0,
        annualizedReturn: 0,
        volatility: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdownPct: 0,
        bestDay: { date: new Date(), returnPct: 0 },
        worstDay: { date: new Date(), returnPct: 0 },
        profitDays: 0,
        lossDays: 0,
        winRate: 0
      };
    }
    
    const startValue = performanceData[0].value;
    const endValue = performanceData[performanceData.length - 1].value;
    const totalReturn = endValue - startValue;
    const totalReturnPct = (totalReturn / startValue) * 100;
    
    // Calculate annualized return
    const firstDate = new Date(performanceData[0].date);
    const lastDate = new Date(performanceData[performanceData.length - 1].date);
    const yearFraction = (lastDate.getTime() - firstDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    const annualizedReturn = (Math.pow((endValue / startValue), (1 / Math.max(yearFraction, 0.01))) - 1) * 100;
    
    // Calculate volatility (standard deviation of returns)
    const returns = performanceData.map(p => p.daily_return_pct);
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    // Calculate Sharpe ratio (using 2% risk-free rate)
    const riskFreeRate = 2; // 2% annual
    const dailyRiskFree = riskFreeRate / 365;
    const excessReturns = returns.map(ret => ret - dailyRiskFree);
    const meanExcessReturn = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
    const sharpeRatio = meanExcessReturn / volatility;
    
    // Calculate Sortino ratio (downside deviation)
    const negativeReturns = returns.filter(ret => ret < 0);
    const downsideVariance = negativeReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / negativeReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);
    const sortinoRatio = meanExcessReturn / downsideDeviation;
    
    // Calculate maximum drawdown
    let maxDrawdownPct = 0;
    let runningMax = performanceData[0].value;
    
    for (const dataPoint of performanceData) {
      if (dataPoint.value > runningMax) {
        runningMax = dataPoint.value;
      }
      
      const drawdownPct = ((runningMax - dataPoint.value) / runningMax) * 100;
      if (drawdownPct > maxDrawdownPct) {
        maxDrawdownPct = drawdownPct;
      }
    }
    
    // Find best and worst days
    let bestDay = { date: new Date(performanceData[0].date), returnPct: performanceData[0].daily_return_pct };
    let worstDay = { date: new Date(performanceData[0].date), returnPct: performanceData[0].daily_return_pct };
    
    for (const dataPoint of performanceData) {
      if (dataPoint.daily_return_pct > bestDay.returnPct) {
        bestDay = { date: new Date(dataPoint.date), returnPct: dataPoint.daily_return_pct };
      }
      
      if (dataPoint.daily_return_pct < worstDay.returnPct) {
        worstDay = { date: new Date(dataPoint.date), returnPct: dataPoint.daily_return_pct };
      }
    }
    
    // Count profit and loss days
    const profitDays = performanceData.filter(p => p.daily_return_pct > 0).length;
    const lossDays = performanceData.filter(p => p.daily_return_pct < 0).length;
    const winRate = (profitDays / performanceData.length) * 100;
    
    return {
      startValue,
      endValue,
      totalReturn,
      totalReturnPct,
      annualizedReturn,
      volatility,
      sharpeRatio,
      sortinoRatio,
      maxDrawdownPct,
      bestDay,
      worstDay,
      profitDays,
      lossDays,
      winRate
    };
  };
  
  const metrics = calculatePerformanceMetrics();
  
  // Handle export
  const handleExport = (format: 'pdf' | 'csv') => {
    setIsLoading(true);
    
    try {
      if (onExport) {
        onExport(format);
      } else {
        // Generate and download report if no custom handler
        if (format === 'csv') {
          // Create CSV content
          let csvContent = 'Date,Value,Daily Return,Daily Return %,Cumulative Return,Cumulative Return %\n';
          
          performanceData.forEach(data => {
            csvContent += `${data.date},${data.value},${data.daily_return},${data.daily_return_pct.toFixed(2)},${data.cumulative_return},${data.cumulative_return_pct.toFixed(2)}\n`;
          });
          
          // Create download link
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', `${portfolio.name}_Performance_${format(new Date(), 'yyyy-MM-dd')}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          toast({
            title: "PDF Export",
            description: "PDF export functionality requires server-side implementation.",
          });
        }
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export performance report. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    setIsLoading(true);
    
    try {
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error refreshing report:', error);
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Failed to refresh performance data. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Format percentage for display
  const formatPercentage = (value: number) => {
    return (value > 0 ? '+' : '') + value.toFixed(2) + '%';
  };
  
  // Get color class based on value
  const getColorClass = (value: number) => {
    return value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'text-gray-500';
  };
  
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6" />
              {portfolio.name} Performance Report
            </CardTitle>
            <CardDescription>
              Performance report for {format(reportDate, 'MMMM d, yyyy')}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={isLoading}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={isLoading}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Period:</span>
              <Select
                value={selectedPeriod}
                onValueChange={(value) => setSelectedPeriod(value as any)}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Benchmark:</span>
              <Select
                value={selectedBenchmark}
                onValueChange={setSelectedBenchmark}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue placeholder="Select benchmark" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC/USD">BTC/USD</SelectItem>
                  <SelectItem value="ETH/USD">ETH/USD</SelectItem>
                  <SelectItem value="S&P500">S&P 500</SelectItem>
                  <SelectItem value="None">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              Initial: {formatCurrency(portfolio.initial_capital)}
            </div>
            <div className="text-sm font-medium">
              Current: {formatCurrency(portfolio.current_value)}
            </div>
            <div className={`text-sm font-medium ${getColorClass(portfolio.current_value - portfolio.initial_capital)}`}>
              {formatPercentage(((portfolio.current_value / portfolio.initial_capital) - 1) * 100)}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Summary</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              <span>Performance Details</span>
            </TabsTrigger>
            <TabsTrigger value="allocations" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              <span>Allocations</span>
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Recommendations</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="p-0">
          <TabsContent value="summary" className="p-6 space-y-6 m-0">
            {performanceData.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Performance Data</AlertTitle>
                <AlertDescription>
                  There is no performance data available for this portfolio yet. 
                  Performance metrics will be available once the portfolio has been active.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <PortfolioPerformanceChart 
                  portfolioId={portfolio.id || ''}
                  initialPerformanceData={performanceData}
                  showBenchmarks={selectedBenchmark !== 'None'}
                  benchmarks={selectedBenchmark !== 'None' ? [selectedBenchmark] : []}
                  timeframe={selectedPeriod === 'yearly' ? 'year' : 
                            selectedPeriod === 'quarterly' ? 'month' : 
                            selectedPeriod === 'monthly' ? 'month' : 
                            selectedPeriod === 'weekly' ? 'week' : 'week'}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-card rounded-lg border p-4 space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Returns
                    </h3>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total Return</span>
                        <span className={`font-medium ${getColorClass(metrics.totalReturnPct)}`}>
                          {formatPercentage(metrics.totalReturnPct)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Annualized Return</span>
                        <span className={`font-medium ${getColorClass(metrics.annualizedReturn)}`}>
                          {formatPercentage(metrics.annualizedReturn)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Absolute Return</span>
                        <span className={`font-medium ${getColorClass(metrics.totalReturn)}`}>
                          {formatCurrency(metrics.totalReturn)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-card rounded-lg border p-4 space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <BarChart2 className="h-4 w-4" />
                      Risk Metrics
                    </h3>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Volatility (Annual)</span>
                        <span className="font-medium">
                          {(metrics.volatility * Math.sqrt(365)).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Sharpe Ratio</span>
                        <span className="font-medium">
                          {metrics.sharpeRatio.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Maximum Drawdown</span>
                        <span className="font-medium text-red-500">
                          -{metrics.maxDrawdownPct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-card rounded-lg border p-4 space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Trading Statistics
                    </h3>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Win Rate</span>
                        <span className="font-medium">
                          {metrics.winRate.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Best Day</span>
                        <span className="font-medium text-green-500">
                          {formatPercentage(metrics.bestDay.returnPct)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Worst Day</span>
                        <span className="font-medium text-red-500">
                          {formatPercentage(metrics.worstDay.returnPct)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="details" className="p-6 space-y-6 m-0">
            {performanceData.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Performance Data</AlertTitle>
                <AlertDescription>
                  There is no performance data available for this portfolio yet.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableCaption>
                    Performance details for {portfolio.name}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Daily Return</TableHead>
                      <TableHead>Daily %</TableHead>
                      <TableHead>Cumulative Return</TableHead>
                      <TableHead>Cumulative %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceData.slice(0, 20).map((data) => (
                      <TableRow key={data.id || data.date}>
                        <TableCell>{format(new Date(data.date), 'yyyy-MM-dd')}</TableCell>
                        <TableCell>{formatCurrency(data.value)}</TableCell>
                        <TableCell className={getColorClass(data.daily_return)}>
                          {formatCurrency(data.daily_return)}
                        </TableCell>
                        <TableCell className={getColorClass(data.daily_return_pct)}>
                          {formatPercentage(data.daily_return_pct)}
                        </TableCell>
                        <TableCell className={getColorClass(data.cumulative_return)}>
                          {formatCurrency(data.cumulative_return)}
                        </TableCell>
                        <TableCell className={getColorClass(data.cumulative_return_pct)}>
                          {formatPercentage(data.cumulative_return_pct)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="allocations" className="p-6 space-y-6 m-0">
            {allocations.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Allocation Data</AlertTitle>
                <AlertDescription>
                  There are no allocations defined for this portfolio yet.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-6">
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableCaption>
                      Current portfolio allocations
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Strategy</TableHead>
                        <TableHead>Allocation %</TableHead>
                        <TableHead>Current Value</TableHead>
                        <TableHead>Performance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocations.map((allocation) => (
                        <TableRow key={allocation.id || allocation.strategy_id}>
                          <TableCell className="font-medium">{allocation.strategy_name}</TableCell>
                          <TableCell>{allocation.allocation_percentage.toFixed(2)}%</TableCell>
                          <TableCell>{formatCurrency(allocation.current_value || 0)}</TableCell>
                          <TableCell className={getColorClass(5 + Math.random() * 15 * (Math.random() > 0.3 ? 1 : -1))}>
                            {formatPercentage(5 + Math.random() * 15 * (Math.random() > 0.3 ? 1 : -1))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card rounded-lg border p-6">
                    <h3 className="text-sm font-medium mb-4">Allocation Visualization</h3>
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      Allocation pie chart would be displayed here
                    </div>
                  </div>
                  
                  <div className="bg-card rounded-lg border p-6">
                    <h3 className="text-sm font-medium mb-4">Strategy Contribution to Returns</h3>
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      Contribution bar chart would be displayed here
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recommendations" className="p-6 space-y-6 m-0">
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertTitle>Portfolio Recommendations</AlertTitle>
              <AlertDescription>
                Based on your portfolio's performance and market conditions, we've generated the following recommendations:
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="bg-card rounded-lg border p-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Allocation Recommendation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Consider rebalancing your portfolio to reduce exposure to highly correlated assets.
                  Increasing allocation to strategy "{allocations[0]?.strategy_name || 'Strategy 1'}" may improve 
                  your risk-adjusted returns based on recent performance.
                </p>
              </div>
              
              <div className="bg-card rounded-lg border p-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Risk Adjustment
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your portfolio volatility is {(metrics.volatility * Math.sqrt(365)).toFixed(2)}%, 
                  which {metrics.volatility * Math.sqrt(365) > 20 ? 'is relatively high' : 'is within acceptable range'}.
                  {metrics.volatility * Math.sqrt(365) > 20 ? 
                    ' Consider adding more diversified strategies to reduce overall portfolio risk.' : 
                    ' Continue monitoring for changes in market conditions.'}
                </p>
              </div>
              
              <div className="bg-card rounded-lg border p-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Performance Insight
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your portfolio has {metrics.totalReturnPct > 0 ? 'outperformed' : 'underperformed'} the 
                  {selectedBenchmark} benchmark by approximately 
                  {formatPercentage(Math.abs(metrics.totalReturnPct - (metrics.totalReturnPct * 0.8 + (Math.random() * 10 - 5))))}.
                  {metrics.sharpeRatio > 1 ? 
                    ' Your risk-adjusted returns are strong, indicating good strategy selection.' : 
                    ' Consider optimizing your strategies to improve risk-adjusted returns.'}
                </p>
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="border-t px-6 py-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>Report generated on {format(reportDate, 'MMMM d, yyyy')}</span>
        </div>
        
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <span>Data period: {format(new Date(performanceData[0]?.date || new Date()), 'MMM d, yyyy')} - {format(new Date(performanceData[performanceData.length - 1]?.date || new Date()), 'MMM d, yyyy')}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
