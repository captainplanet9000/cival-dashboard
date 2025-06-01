'use client';

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, differenceInDays } from 'date-fns';

// Interface for performance data point
interface PerformanceDataPoint {
  date: string;
  profit: number;
  balance: number;
  transactions: number;
  roi: number;
}

// Chart props
interface FarmPerformanceChartProps {
  farmId: number;
  performanceData: PerformanceDataPoint[];
  pieData?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  className?: string;
  showControls?: boolean;
}

// Generate sample data if no data is provided
const generateSampleData = (days = 30) => {
  const data: PerformanceDataPoint[] = [];
  let balance = 10000;
  
  for (let i = days; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dailyProfit = Math.random() * 500 - 150; // Random profit between -150 and 350
    balance += dailyProfit;
    
    data.push({
      date: format(date, 'MMM dd'),
      profit: parseFloat(dailyProfit.toFixed(2)),
      balance: parseFloat(balance.toFixed(2)),
      transactions: Math.floor(Math.random() * 10),
      roi: parseFloat(((balance - 10000) / 10000 * 100).toFixed(2))
    });
  }
  
  return data;
};

// Standard color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

/**
 * Farm performance chart component using Recharts
 */
export function FarmPerformanceChart({
  farmId,
  performanceData = [],
  pieData = [],
  className = '',
  showControls = true
}: FarmPerformanceChartProps) {
  // Use sample data if no data is provided
  const data = performanceData.length > 0 ? performanceData : generateSampleData();
  
  // State for time range and chart type
  const [timeRange, setTimeRange] = React.useState('30d');
  const [chartType, setChartType] = React.useState('balance');
  
  // Filter data based on time range
  const filteredData = React.useMemo(() => {
    if (timeRange === 'all') return data;
    
    const days = parseInt(timeRange.replace('d', ''));
    return data.slice(Math.max(0, data.length - days - 1));
  }, [data, timeRange]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle>Performance Chart</CardTitle>
            <CardDescription>
              Visual representation of farm performance metrics
            </CardDescription>
          </div>
          
          {showControls && (
            <div className="flex space-x-2 mt-2 sm:mt-0">
              <Select
                value={timeRange}
                onValueChange={setTimeRange}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="line" className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="line">Line</TabsTrigger>
              <TabsTrigger value="area">Area</TabsTrigger>
              <TabsTrigger value="bar">Bar</TabsTrigger>
              {pieData.length > 0 && (
                <TabsTrigger value="pie">Distribution</TabsTrigger>
              )}
            </TabsList>
            
            {showControls && (
              <Select
                value={chartType}
                onValueChange={setChartType}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Data Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance">Balance</SelectItem>
                  <SelectItem value="profit">Profit</SelectItem>
                  <SelectItem value="roi">ROI %</SelectItem>
                  <SelectItem value="transactions">Transactions</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          <TabsContent value="line" className="mt-0">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={filteredData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => {
                      if (chartType === 'roi') return [`${value}%`, 'ROI'];
                      if (chartType === 'transactions') return [value, 'Transactions'];
                      return [`$${value.toLocaleString()}`, chartType === 'profit' ? 'Profit' : 'Balance'];
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={chartType}
                    stroke={chartType === 'profit' ? '#00C49F' : chartType === 'roi' ? '#8884d8' : '#0088FE'}
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="area" className="mt-0">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => {
                      if (chartType === 'roi') return [`${value}%`, 'ROI'];
                      if (chartType === 'transactions') return [value, 'Transactions'];
                      return [`$${value.toLocaleString()}`, chartType === 'profit' ? 'Profit' : 'Balance'];
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey={chartType}
                    stroke={chartType === 'profit' ? '#00C49F' : chartType === 'roi' ? '#8884d8' : '#0088FE'}
                    fill={chartType === 'profit' ? 'rgba(0, 196, 159, 0.2)' : chartType === 'roi' ? 'rgba(136, 132, 216, 0.2)' : 'rgba(0, 136, 254, 0.2)'}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="bar" className="mt-0">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => {
                      if (chartType === 'roi') return [`${value}%`, 'ROI'];
                      if (chartType === 'transactions') return [value, 'Transactions'];
                      return [`$${value.toLocaleString()}`, chartType === 'profit' ? 'Profit' : 'Balance'];
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey={chartType}
                    fill={chartType === 'profit' ? '#00C49F' : chartType === 'roi' ? '#8884d8' : '#0088FE'}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          {pieData.length > 0 && (
            <TabsContent value="pie" className="mt-0">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={130}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
