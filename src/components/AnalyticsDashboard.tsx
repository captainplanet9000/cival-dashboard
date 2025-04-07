import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { api, handleApiError } from '@/lib/api';
import { AssetPerformance, HistoricalBalance, ProfitLoss } from '@/types';
import { RefreshCw } from 'lucide-react';
import { Progress } from './ui/progress';

interface AnalyticsDashboardProps {
  farmId: string;
}

// Chart colors
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function AnalyticsDashboard({ farmId }: AnalyticsDashboardProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Analytics data
  const [assetPerformance, setAssetPerformance] = useState<AssetPerformance[]>([]);
  const [historicalBalances, setHistoricalBalances] = useState<HistoricalBalance[]>([]);
  const [profitLoss, setProfitLoss] = useState<ProfitLoss[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  
  useEffect(() => {
    fetchAnalyticsData();
  }, [farmId, timeframe]);
  
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // In a production app with complete API endpoints
      // Fetch all data in parallel for better performance
      const [assetData, balanceData, profitLossData, goalsData] = await Promise.all([
        api.analytics.getAssetPerformance(farmId),
        api.analytics.getHistoricalBalances(farmId, timeframe),
        api.analytics.getProfitLoss(farmId, 'monthly'),
        api.goals.getFarmGoals(farmId, { status: 'active' })
      ]);
      
      // If the analytics endpoints aren't fully implemented yet, 
      // use the demo data but add appropriate colors
      const processedAssetData = assetData.map((asset, index) => ({
        ...asset,
        color: COLORS[index % COLORS.length]
      }));
      
      setAssetPerformance(processedAssetData);
      setHistoricalBalances(balanceData);
      setProfitLoss(profitLossData);
      setGoals(goalsData);
      setError(null);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      
      // If we get API errors but need to show something, fall back to demo data
      // This should be removed once the API is fully implemented
      generateFallbackData();
      
      // In production, we'd want to display the error
      handleApiError(error, setError);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchAnalyticsData();
    } finally {
      setRefreshing(false);
    }
  };
  
  // Fallback data generator for development/demo purposes
  // This should be removed once the API is fully implemented
  const generateFallbackData = () => {
    // Asset performance demo data
    const assetData = [
      { symbol: 'BTC', allocation: 40, performance_7d: 5.2, performance_30d: 8.7, value: 25000, color: COLORS[0] },
      { symbol: 'ETH', allocation: 30, performance_7d: 3.8, performance_30d: 6.2, value: 18750, color: COLORS[1] },
      { symbol: 'SOL', allocation: 15, performance_7d: 7.5, performance_30d: 12.4, value: 9375, color: COLORS[2] },
      { symbol: 'USDC', allocation: 15, performance_7d: 0.1, performance_30d: 0.3, value: 9375, color: COLORS[3] },
    ];
    setAssetPerformance(assetData);
    
    // Demo historical balance data
    const balanceData: HistoricalBalance[] = [];
    const today = new Date();
    let balance = 60000; // Starting balance
    
    for (let i = 90; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Random daily fluctuation between -2% and +3%
      const change = balance * (Math.random() * 5 - 2) / 100;
      balance += change;
      
      balanceData.push({
        date: date.toISOString().split('T')[0],
        total: Math.round(balance)
      });
    }
    setHistoricalBalances(balanceData);
    
    // Demo profit/loss data
    setProfitLoss([
      { month: 'Jan', profit: 4000, loss: 2400 },
      { month: 'Feb', profit: 3000, loss: 1398 },
      { month: 'Mar', profit: 5000, loss: 3000 },
      { month: 'Apr', profit: 2780, loss: 3908 },
      { month: 'May', profit: 1890, loss: 4800 },
      { month: 'Jun', profit: 2390, loss: 3800 }
    ]);
    
    // Demo goals data
    setGoals([
      { id: '1', name: 'Profit Target', progress: 65, target: 10000, current: 6500 },
      { id: '2', name: 'Portfolio Rebalance', progress: 100, target: 100, current: 100 },
      { id: '3', name: 'Dollar Cost Average BTC', progress: 42, target: 12, current: 5 }
    ]);
  };
  
  // Filter data based on selected timeframe
  const getTimeframeData = () => {
    if (timeframe === 'all') return historicalBalances;
    
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    return historicalBalances.slice(-days);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  // Calculate total portfolio value
  const totalPortfolioValue = assetPerformance.reduce((sum, asset) => sum + asset.value, 0);
  
  // Calculate performance
  const portfolioPerformance7d = assetPerformance.reduce(
    (sum, asset) => sum + (asset.performance_7d * (asset.allocation / 100)), 
    0
  );
  
  const portfolioPerformance30d = assetPerformance.reduce(
    (sum, asset) => sum + (asset.performance_30d * (asset.allocation / 100)), 
    0
  );
  
  // Determine portfolio performance color
  const getPerformanceColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };
  
  // Get performance for display
  const getPerformanceDisplay = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Label htmlFor="timeframe" className="mr-2">Timeframe:</Label>
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as any)}>
            <SelectTrigger id="timeframe" className="w-36">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh} 
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4 mb-4">
          <p className="font-medium">Note: Using demo data</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Portfolio Value</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalPortfolioValue)}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>7-Day Performance</CardDescription>
            <CardTitle className={`text-2xl ${getPerformanceColor(portfolioPerformance7d)}`}>
              {getPerformanceDisplay(portfolioPerformance7d)}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>30-Day Performance</CardDescription>
            <CardTitle className={`text-2xl ${getPerformanceColor(portfolioPerformance30d)}`}>
              {getPerformanceDisplay(portfolioPerformance30d)}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Goals</CardDescription>
            <CardTitle className="text-2xl">{goals.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      
      <Tabs defaultValue="portfolio" className="space-y-4">
        <TabsList>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>
        
        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Asset Allocation Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
                <CardDescription>Current portfolio distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetPerformance}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="symbol"
                        label={({ name, percent }: { name: string, percent: number }) => 
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={true}
                      >
                        {assetPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Asset Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Performance</CardTitle>
                <CardDescription>Performance by asset</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Asset</th>
                        <th className="text-right py-2 px-2">Value</th>
                        <th className="text-right py-2 px-2">7D</th>
                        <th className="text-right py-2 px-2">30D</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetPerformance.map((asset) => (
                        <tr key={asset.symbol} className="border-b">
                          <td className="py-3 px-2 font-medium">{asset.symbol}</td>
                          <td className="text-right py-3 px-2">{formatCurrency(asset.value)}</td>
                          <td className={`text-right py-3 px-2 ${getPerformanceColor(asset.performance_7d)}`}>
                            {getPerformanceDisplay(asset.performance_7d)}
                          </td>
                          <td className={`text-right py-3 px-2 ${getPerformanceColor(asset.performance_30d)}`}>
                            {getPerformanceDisplay(asset.performance_30d)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Historical Balance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Historical Balance</CardTitle>
              <CardDescription>Portfolio value over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getTimeframeData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      tickFormatter={(dateStr: string) => {
                        const d = new Date(dateStr);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }} 
                    />
                    <YAxis 
                      domain={['dataMin - 5000', 'dataMax + 5000']} 
                      tickFormatter={(value: number) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      name="Portfolio Value"
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          {/* Profit/Loss Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Profit/Loss Analysis</CardTitle>
              <CardDescription>Monthly profit and loss breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitLoss}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="profit" fill="#82ca9d" name="Profit" />
                    <Bar dataKey="loss" fill="#ff8042" name="Loss" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Trading Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Trading Activity</CardTitle>
              <CardDescription>Latest executed trades</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Type</th>
                    <th className="text-left py-2 px-2">Asset</th>
                    <th className="text-right py-2 px-2">Amount</th>
                    <th className="text-right py-2 px-2">Price</th>
                    <th className="text-right py-2 px-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-2">2023-06-14</td>
                    <td className="py-3 px-2 text-green-600">Buy</td>
                    <td className="py-3 px-2">BTC</td>
                    <td className="text-right py-3 px-2">0.15</td>
                    <td className="text-right py-3 px-2">$35,420</td>
                    <td className="text-right py-3 px-2">$5,313</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2">2023-06-10</td>
                    <td className="py-3 px-2 text-red-600">Sell</td>
                    <td className="py-3 px-2">ETH</td>
                    <td className="text-right py-3 px-2">2.5</td>
                    <td className="text-right py-3 px-2">$1,850</td>
                    <td className="text-right py-3 px-2">$4,625</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2">2023-06-05</td>
                    <td className="py-3 px-2 text-green-600">Buy</td>
                    <td className="py-3 px-2">SOL</td>
                    <td className="text-right py-3 px-2">25</td>
                    <td className="text-right py-3 px-2">$22.15</td>
                    <td className="text-right py-3 px-2">$553.75</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          {goals.map((goal) => (
            <Card key={goal.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{goal.name}</CardTitle>
                  <span className="text-lg font-semibold">{goal.progress}%</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={goal.progress} className="h-2.5" />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Current: {formatCurrency(goal.current)}</span>
                    <span>Target: {formatCurrency(goal.target)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
} 
} 