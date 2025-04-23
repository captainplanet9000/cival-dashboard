'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { AreaChart, BarChart, DonutChart, LineChart } from '@tremor/react';
import { createBrowserClient } from '@/utils/supabase/client';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, Clock, RefreshCw } from 'lucide-react';

interface PerformanceData {
  equity: {
    timestamp: string;
    value: number;
  }[];
  trades: {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    profit: number;
    profitPercent: number;
    timestamp: string;
    fees: number;
  }[];
  metrics: {
    totalValue: number;
    totalProfit: number;
    totalProfitPercent: number;
    winRate: number;
    totalTrades: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    dailyReturns: number[];
    averageWin: number;
    averageLoss: number;
  };
  assetAllocation: {
    asset: string;
    value: number;
    percentage: number;
  }[];
  monthlyPerformance: {
    month: string;
    return: number;
  }[];
}

export default function PerformanceDashboard() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [tradingAccount, setTradingAccount] = useState('all');
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  
  const supabase = createBrowserClient();

  // Load account data
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Fetch trading accounts
        const { data, error } = await supabase
          .from('trading_accounts')
          .select('id, name')
          .eq('user_id', user.id)
          .order('name', { ascending: true });
          
        if (error) throw error;
        
        setAccounts(data || []);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      }
    };
    
    fetchAccounts();
  }, []);

  // Load performance data when account or date range changes
  useEffect(() => {
    const fetchPerformanceData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        // Use RPC to get performance data
        const { data, error } = await supabase.rpc('get_performance_data', {
          p_user_id: user.id,
          p_account_id: tradingAccount === 'all' ? null : tradingAccount,
          p_start_date: dateRange.from.toISOString(),
          p_end_date: dateRange.to.toISOString()
        });
        
        if (error) throw error;
        
        setPerformanceData(data);
      } catch (error) {
        console.error('Error fetching performance data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPerformanceData();
  }, [tradingAccount, dateRange]);

  // Helper function to handle timeframe changes
  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
    
    const to = new Date();
    let from: Date;
    
    switch (value) {
      case '7d':
        from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        from = new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'ytd':
        from = new Date(to.getFullYear(), 0, 1); // January 1st of current year
        break;
      default:
        from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    setDateRange({ from, to });
  };

  // Format equity curve data for charting
  const equityCurveData = performanceData?.equity.map(point => ({
    date: new Date(point.timestamp).toLocaleDateString(),
    Equity: point.value,
  })) || [];
  
  // Format monthly performance data for charting
  const monthlyPerformanceData = performanceData?.monthlyPerformance.map(month => ({
    month: month.month,
    'Return (%)': month.return,
    performance: month.return >= 0 ? 'positive' : 'negative'
  })) || [];
  
  // Format asset allocation data for charting
  const assetAllocationData = performanceData?.assetAllocation.map(asset => ({
    name: asset.asset,
    value: asset.value,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Performance Dashboard</h2>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh Data
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Select value={tradingAccount} onValueChange={setTradingAccount}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map(account => (
                <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1">
          <DateRangePicker
            from={dateRange.from}
            to={dateRange.to}
            onSelect={setDateRange}
          />
        </div>
        
        <Tabs value={timeframe} onValueChange={handleTimeframeChange}>
          <TabsList>
            <TabsTrigger value="7d">7D</TabsTrigger>
            <TabsTrigger value="30d">30D</TabsTrigger>
            <TabsTrigger value="90d">90D</TabsTrigger>
            <TabsTrigger value="1y">1Y</TabsTrigger>
            <TabsTrigger value="ytd">YTD</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Portfolio Value" 
          value={`$${performanceData?.metrics.totalValue.toLocaleString() || '0'}`}
          description="Current value" 
          icon={<DollarSign />}
        />
        
        <MetricCard 
          title="Total Profit" 
          value={`$${performanceData?.metrics.totalProfit.toLocaleString() || '0'}`}
          description={`${performanceData?.metrics.totalProfitPercent.toFixed(2) || '0'}%`}
          icon={<TrendingUp />}
          positive={performanceData?.metrics.totalProfit ? performanceData.metrics.totalProfit > 0 : false}
        />
        
        <MetricCard 
          title="Win Rate" 
          value={`${(performanceData?.metrics.winRate || 0) * 100}%`}
          description={`${performanceData?.metrics.totalTrades || 0} trades`}
          icon={<BarChart3 />}
        />
        
        <MetricCard 
          title="Max Drawdown" 
          value={`${performanceData?.metrics.maxDrawdownPercent.toFixed(2) || '0'}%`}
          description={`$${performanceData?.metrics.maxDrawdown.toLocaleString() || '0'}`}
          icon={<TrendingDown />}
          negative
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equity Curve */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Equity Curve</CardTitle>
            <CardDescription>Portfolio value over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 w-full flex items-center justify-center bg-accent/30 animate-pulse rounded-md"></div>
            ) : equityCurveData.length > 0 ? (
              <AreaChart
                className="h-80"
                data={equityCurveData}
                index="date"
                categories={['Equity']}
                colors={['blue']}
                valueFormatter={(value) => `$${value.toLocaleString()}`}
                showLegend={false}
                showAnimation={true}
              />
            ) : (
              <div className="h-80 w-full flex items-center justify-center bg-accent/10 rounded-md">
                <p className="text-muted-foreground">No equity data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance</CardTitle>
            <CardDescription>Returns by month</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 w-full flex items-center justify-center bg-accent/30 animate-pulse rounded-md"></div>
            ) : monthlyPerformanceData.length > 0 ? (
              <BarChart
                className="h-80"
                data={monthlyPerformanceData}
                index="month"
                categories={['Return (%)']}
                colors={['blue']}
                valueFormatter={(value) => `${value.toFixed(2)}%`}
                showLegend={false}
                showAnimation={true}
                customTooltip={(props) => (
                  <div className="p-2 bg-background border rounded-md shadow-md">
                    <p className="font-medium">{props.label}</p>
                    <p className={props.payload.performance === 'positive' ? 'text-green-500' : 'text-red-500'}>
                      {props.value}
                    </p>
                  </div>
                )}
              />
            ) : (
              <div className="h-80 w-full flex items-center justify-center bg-accent/10 rounded-md">
                <p className="text-muted-foreground">No monthly data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Asset Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Distribution by asset</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 w-full flex items-center justify-center bg-accent/30 animate-pulse rounded-md"></div>
            ) : assetAllocationData.length > 0 ? (
              <DonutChart
                className="h-80"
                data={assetAllocationData}
                category="value"
                index="name"
                valueFormatter={(value) => `$${value.toLocaleString()}`}
                colors={["blue", "cyan", "indigo", "violet", "fuchsia", "red", "amber", "emerald"]}
                showAnimation={true}
                showTooltip={true}
              />
            ) : (
              <div className="h-80 w-full flex items-center justify-center bg-accent/10 rounded-md">
                <p className="text-muted-foreground">No allocation data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricsCard 
          title="Trading Performance" 
          metrics={[
            { name: 'Win Rate', value: `${((performanceData?.metrics.winRate || 0) * 100).toFixed(1)}%` },
            { name: 'Profit Factor', value: performanceData?.metrics.profitFactor.toFixed(2) || '0' },
            { name: 'Sharpe Ratio', value: performanceData?.metrics.sharpeRatio.toFixed(2) || '0' },
            { name: 'Total Trades', value: performanceData?.metrics.totalTrades.toString() || '0' },
            { name: 'Average Win', value: `$${performanceData?.metrics.averageWin.toFixed(2) || '0'}` },
            { name: 'Average Loss', value: `$${performanceData?.metrics.averageLoss.toFixed(2) || '0'}` }
          ]} 
        />
        
        <MetricsCard 
          title="Risk Metrics" 
          metrics={[
            { name: 'Max Drawdown', value: `${performanceData?.metrics.maxDrawdownPercent.toFixed(2) || '0'}%` },
            { name: 'Beta', value: '0.85' }, // Placeholder, would come from API
            { name: 'Volatility', value: '12.4%' }, // Placeholder, would come from API
            { name: 'Sortino Ratio', value: '1.32' }, // Placeholder, would come from API
            { name: 'Calmar Ratio', value: '0.98' }, // Placeholder, would come from API
            { name: 'Correlation', value: '0.72' } // Placeholder, would come from API
          ]} 
        />
        
        <MetricsCard 
          title="Account Statistics" 
          metrics={[
            { name: 'Account Value', value: `$${performanceData?.metrics.totalValue.toLocaleString() || '0'}` },
            { name: 'Cash Balance', value: '$12,450.00' }, // Placeholder, would come from API
            { name: 'Open P&L', value: '$1,230.50' }, // Placeholder, would come from API
            { name: 'Margin Used', value: '35%' }, // Placeholder, would come from API
            { name: 'Open Positions', value: '8' }, // Placeholder, would come from API
            { name: 'Buying Power', value: '$43,250.00' } // Placeholder, would come from API
          ]} 
        />
      </div>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
          <CardDescription>Latest trading activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Symbol</th>
                    <th className="px-4 py-3 text-left font-medium">Side</th>
                    <th className="px-4 py-3 text-left font-medium">Quantity</th>
                    <th className="px-4 py-3 text-left font-medium">Entry Price</th>
                    <th className="px-4 py-3 text-left font-medium">Exit Price</th>
                    <th className="px-4 py-3 text-left font-medium">Profit/Loss</th>
                    <th className="px-4 py-3 text-left font-medium">%</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-t">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="h-6 bg-muted animate-pulse rounded"></div>
                        </td>
                      </tr>
                    ))
                  ) : performanceData?.trades && performanceData.trades.length > 0 ? (
                    performanceData.trades.slice(0, 10).map((trade) => (
                      <tr key={trade.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            trade.side === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">{trade.quantity}</td>
                        <td className="px-4 py-3">${trade.entryPrice.toFixed(2)}</td>
                        <td className="px-4 py-3">${trade.exitPrice.toFixed(2)}</td>
                        <td className={`px-4 py-3 ${trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${trade.profit.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 ${trade.profitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trade.profitPercent.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(trade.timestamp).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t">
                      <td colSpan={8} className="px-4 py-3 text-center text-muted-foreground">
                        No trades available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="ml-auto">
            View All Trades
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  positive?: boolean;
  negative?: boolean;
}

function MetricCard({ title, value, description, icon, positive, negative }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${
              positive ? 'text-green-500' : negative ? 'text-red-500' : ''
            }`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`rounded-full p-2 ${
            positive ? 'bg-green-100' : negative ? 'bg-red-100' : 'bg-blue-100'
          }`}>
            {React.cloneElement(icon as React.ReactElement, { 
              className: `h-5 w-5 ${
                positive ? 'text-green-500' : negative ? 'text-red-500' : 'text-blue-500'
              }`
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricsCardProps {
  title: string;
  metrics: { name: string; value: string }[];
}

function MetricsCard({ title, metrics }: MetricsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric, index) => (
            <div key={index}>
              <p className="text-sm text-muted-foreground">{metric.name}</p>
              <p className="text-lg font-medium">{metric.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
