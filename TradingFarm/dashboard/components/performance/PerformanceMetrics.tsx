import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";

// Types
export interface PerformanceData {
  timestamp: string;
  equity: number;
  balance: number;
  drawdown: number;
  profitLoss: number;
  winRate: number;
  sharpeRatio: number;
  totalTrades: number;
  successfulTrades: number;
}

export interface PerformanceMetricsProps {
  strategyId?: string;
  exchangeId?: string;
  timeRange: string;
  isLoading?: boolean;
}

// Mock data generator (replace with actual API calls)
const generateMockData = (days: number): PerformanceData[] => {
  const data: PerformanceData[] = [];
  const now = new Date();
  
  let equity = 10000;
  let balance = 10000;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - (days - i - 1));
    
    // Random daily change between -3% and +5%
    const dailyChange = equity * (Math.random() * 0.08 - 0.03);
    equity += dailyChange;
    
    // Balance updates less frequently
    if (Math.random() > 0.7) {
      balance = equity;
    }
    
    // Calculate drawdown
    const peak = Math.max(...data.map(d => d.equity).concat([equity]));
    const drawdown = ((peak - equity) / peak) * 100;
    
    data.push({
      timestamp: date.toISOString(),
      equity,
      balance,
      drawdown,
      profitLoss: dailyChange,
      winRate: 50 + (Math.random() * 30 - 15),
      sharpeRatio: 0.8 + Math.random() * 1.2,
      totalTrades: Math.floor(Math.random() * 10) + i * 2,
      successfulTrades: Math.floor(Math.random() * 6) + i
    });
  }
  
  return data;
};

// Time range options
const timeRangeOptions = [
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
  { value: '1m', label: '1 Month' },
  { value: '3m', label: '3 Months' },
  { value: '1y', label: 'Year to Date' },
  { value: 'all', label: 'All Time' }
];

// Map time range to number of days for mock data
const timeRangeToDays = {
  '1d': 1,
  '1w': 7,
  '1m': 30,
  '3m': 90,
  '1y': 365,
  'all': 365 * 2
};

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ 
  strategyId, 
  exchangeId, 
  timeRange, 
  isLoading = false 
}) => {
  const { theme } = useTheme();
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange || '1m');
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [selectedTab, setSelectedTab] = useState('equity');
  
  useEffect(() => {
    // Fetch data based on strategyId, exchangeId, and timeRange
    // For now, use mock data
    const days = timeRangeToDays[selectedTimeRange as keyof typeof timeRangeToDays] || 30;
    const mockData = generateMockData(days);
    setPerformanceData(mockData);
  }, [strategyId, exchangeId, selectedTimeRange]);
  
  const dateFormatter = (timestamp: string) => {
    const date = new Date(timestamp);
    return selectedTimeRange === '1d' 
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString();
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };
  
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  
  const getChartColor = () => {
    return theme === 'dark' ? '#8884d8' : '#6366f1';
  };

  const getSecondaryChartColor = () => {
    return theme === 'dark' ? '#82ca9d' : '#4ade80';
  };
  
  const getNegativeChartColor = () => {
    return theme === 'dark' ? '#ff5252' : '#ef4444';
  };

  // Calculate summary metrics
  const calculateSummary = () => {
    if (!performanceData.length) return null;
    
    const first = performanceData[0];
    const last = performanceData[performanceData.length - 1];
    const totalProfitLoss = last.equity - first.equity;
    const percentChange = (totalProfitLoss / first.equity) * 100;
    const maxDrawdown = Math.max(...performanceData.map(d => d.drawdown));
    const totalTrades = last.totalTrades;
    const winRate = last.winRate;
    
    return {
      totalProfitLoss,
      percentChange,
      maxDrawdown,
      totalTrades,
      winRate
    };
  };
  
  const summary = calculateSummary();
  
  const renderSummaryCards = () => {
    if (!summary) return null;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-muted-foreground">Profit/Loss</h3>
            <p className={`text-2xl font-bold ${summary.totalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(summary.totalProfitLoss)}
            </p>
            <p className={`text-sm ${summary.percentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {summary.percentChange >= 0 ? '+' : ''}{formatPercentage(summary.percentChange)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-muted-foreground">Current Equity</h3>
            <p className="text-2xl font-bold">
              {formatCurrency(performanceData[performanceData.length - 1]?.equity || 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-muted-foreground">Max Drawdown</h3>
            <p className="text-2xl font-bold text-red-500">
              {formatPercentage(summary.maxDrawdown)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-muted-foreground">Win Rate</h3>
            <p className="text-2xl font-bold">
              {formatPercentage(summary.winRate)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-muted-foreground">Total Trades</h3>
            <p className="text-2xl font-bold">
              {summary.totalTrades}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Performance Metrics</h2>
        
        <Select 
          value={selectedTimeRange} 
          onValueChange={setSelectedTimeRange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            {timeRangeOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {renderSummaryCards()}
      
      <Card>
        <CardHeader>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid grid-cols-4 md:w-[400px]">
              <TabsTrigger value="equity">Equity</TabsTrigger>
              <TabsTrigger value="drawdown">Drawdown</TabsTrigger>
              <TabsTrigger value="trades">Trades</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <TabsContent value="equity" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getChartColor()} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={getChartColor()} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getSecondaryChartColor()} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={getSecondaryChartColor()} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={dateFormatter}
                  minTickGap={30}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value as number)}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="equity" 
                  stroke={getChartColor()} 
                  fillOpacity={1} 
                  fill="url(#colorEquity)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke={getSecondaryChartColor()} 
                  fillOpacity={1} 
                  fill="url(#colorBalance)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="drawdown" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getNegativeChartColor()} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={getNegativeChartColor()} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={dateFormatter}
                  minTickGap={30}
                />
                <YAxis 
                  tickFormatter={(value) => formatPercentage(value)}
                />
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <Tooltip 
                  formatter={(value: any) => formatPercentage(value as number)}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Area 
                  type="monotone" 
                  dataKey="drawdown" 
                  stroke={getNegativeChartColor()} 
                  fillOpacity={1} 
                  fill="url(#colorDrawdown)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="trades" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={dateFormatter}
                  minTickGap={30}
                />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tickFormatter={(value) => formatPercentage(value)}
                />
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'winRate') return formatPercentage(value as number);
                    return value;
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Legend />
                <Bar 
                  yAxisId="left" 
                  dataKey="totalTrades" 
                  fill={getChartColor()} 
                  name="Total Trades" 
                />
                <Bar 
                  yAxisId="left" 
                  dataKey="successfulTrades" 
                  fill={getSecondaryChartColor()} 
                  name="Successful Trades" 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="winRate" 
                  stroke="#ff7300" 
                  name="Win Rate" 
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="metrics" className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={dateFormatter}
                  minTickGap={30}
                />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <Tooltip 
                  formatter={(value: any) => value.toFixed(2)}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sharpeRatio" 
                  stroke={getChartColor()} 
                  name="Sharpe Ratio" 
                />
                <Line 
                  type="monotone" 
                  dataKey="winRate" 
                  stroke={getSecondaryChartColor()} 
                  name="Win Rate (%)" 
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMetrics;
