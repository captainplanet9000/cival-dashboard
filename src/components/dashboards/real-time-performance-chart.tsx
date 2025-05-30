'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ResponsiveContainer 
} from 'recharts';
import { format, subHours, subDays } from 'date-fns';
import { Activity, TrendingUp, BarChart2 } from 'lucide-react';

interface PerformanceChartProps {
  farmId?: string;
  agentId?: string;
  timeframe?: 'hour' | 'day' | 'week' | 'month';
  height?: number;
  aspectRatio?: number;
}

interface DataPoint {
  timestamp: number;
  value: number;
  [key: string]: any;
}

export function RealTimePerformanceChart({
  farmId,
  agentId,
  timeframe = 'day',
  height = 350,
  aspectRatio = 16/9
}: PerformanceChartProps) {
  const [activeMetric, setActiveMetric] = useState<'trades' | 'win-rate' | 'response-time'>('trades');
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [multiSeriesData, setMultiSeriesData] = useState<any[]>([]);
  
  // Load initial data and set up WebSocket connection
  useEffect(() => {
    // Generate initial data based on timeframe
    generateMockData();
    
    // In a real implementation, this would connect to a WebSocket
    const wsInterval = setInterval(() => {
      // Add a new data point every few seconds to simulate real-time updates
      addNewDataPoint();
    }, 5000);
    
    return () => {
      clearInterval(wsInterval);
    };
  }, [timeframe, activeMetric, farmId, agentId]);
  
  // Generate mock data based on timeframe
  const generateMockData = () => {
    const now = new Date();
    const data: DataPoint[] = [];
    const multiData: any[] = [];
    
    // Generate different date ranges based on timeframe
    let startDate: Date;
    let step: number;
    let dataPoints: number;
    
    switch(timeframe) {
      case 'hour':
        startDate = subHours(now, 1);
        step = 60 * 1000; // 1 minute in ms
        dataPoints = 60; // 60 points for the hour
        break;
      case 'week':
        startDate = subDays(now, 7);
        step = 6 * 60 * 60 * 1000; // 6 hours in ms
        dataPoints = 28; // 4 points per day * 7 days
        break;
      case 'month':
        startDate = subDays(now, 30);
        step = 24 * 60 * 60 * 1000; // 1 day in ms
        dataPoints = 30; // 30 days
        break;
      case 'day':
      default:
        startDate = subDays(now, 1);
        step = 60 * 60 * 1000; // 1 hour in ms
        dataPoints = 24; // 24 hours
    }
    
    // Generate data with appropriate time intervals
    for (let i = 0; i < dataPoints; i++) {
      const timestamp = startDate.getTime() + (i * step);
      
      // Different mock data generators based on active metric
      if (activeMetric === 'trades') {
        data.push({
          timestamp,
          value: Math.floor(5 + Math.random() * 10),
          profit: Math.random() > 0.3 ? (100 + Math.random() * 150) : -(50 + Math.random() * 100)
        });
        
        multiData.push({
          timestamp,
          buys: Math.floor(2 + Math.random() * 7),
          sells: Math.floor(2 + Math.random() * 7),
          name: format(timestamp, timeframe === 'hour' ? 'HH:mm' : timeframe === 'day' ? 'HH:mm' : 'MM/dd')
        });
      } else if (activeMetric === 'win-rate') {
        data.push({
          timestamp,
          value: 40 + Math.random() * 50
        });
        
        multiData.push({
          timestamp,
          overall: 40 + Math.random() * 50,
          short: 35 + Math.random() * 55,
          long: 45 + Math.random() * 45,
          name: format(timestamp, timeframe === 'hour' ? 'HH:mm' : timeframe === 'day' ? 'HH:mm' : 'MM/dd')
        });
      } else if (activeMetric === 'response-time') {
        data.push({
          timestamp,
          value: 50 + Math.random() * 200
        });
        
        multiData.push({
          timestamp,
          api: 50 + Math.random() * 100,
          database: 30 + Math.random() * 120,
          network: 20 + Math.random() * 70,
          name: format(timestamp, timeframe === 'hour' ? 'HH:mm' : timeframe === 'day' ? 'HH:mm' : 'MM/dd')
        });
      }
    }
    
    setChartData(data);
    setMultiSeriesData(multiData);
  };
  
  // Add a new data point to simulate real-time updates
  const addNewDataPoint = () => {
    const now = new Date();
    
    // Create new data point based on active metric
    let newPoint: DataPoint;
    let newMultiPoint: any;
    
    if (activeMetric === 'trades') {
      newPoint = {
        timestamp: now.getTime(),
        value: Math.floor(5 + Math.random() * 10),
        profit: Math.random() > 0.3 ? (100 + Math.random() * 150) : -(50 + Math.random() * 100)
      };
      
      newMultiPoint = {
        timestamp: now.getTime(),
        buys: Math.floor(2 + Math.random() * 7),
        sells: Math.floor(2 + Math.random() * 7),
        name: format(now, timeframe === 'hour' ? 'HH:mm' : timeframe === 'day' ? 'HH:mm' : 'MM/dd')
      };
    } else if (activeMetric === 'win-rate') {
      newPoint = {
        timestamp: now.getTime(),
        value: 40 + Math.random() * 50
      };
      
      newMultiPoint = {
        timestamp: now.getTime(),
        overall: 40 + Math.random() * 50,
        short: 35 + Math.random() * 55,
        long: 45 + Math.random() * 45,
        name: format(now, timeframe === 'hour' ? 'HH:mm' : timeframe === 'day' ? 'HH:mm' : 'MM/dd')
      };
    } else {
      newPoint = {
        timestamp: now.getTime(),
        value: 50 + Math.random() * 200
      };
      
      newMultiPoint = {
        timestamp: now.getTime(),
        api: 50 + Math.random() * 100,
        database: 30 + Math.random() * 120,
        network: 20 + Math.random() * 70,
        name: format(now, timeframe === 'hour' ? 'HH:mm' : timeframe === 'day' ? 'HH:mm' : 'MM/dd')
      };
    }
    
    // Update state with new data points (remove oldest to maintain same number of points)
    setChartData(prevData => [...prevData.slice(1), newPoint]);
    setMultiSeriesData(prevData => [...prevData.slice(1), newMultiPoint]);
  };
  
  // Format timestamp for display in charts
  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    switch(timeframe) {
      case 'hour':
        return format(date, 'HH:mm');
      case 'day':
        return format(date, 'HH:mm');
      case 'week':
        return format(date, 'EEE');
      case 'month':
        return format(date, 'dd MMM');
      default:
        return format(date, 'HH:mm');
    }
  };
  
  // Get chart title based on active metric
  const getChartTitle = () => {
    switch(activeMetric) {
      case 'trades':
        return 'Trade Execution Volume';
      case 'win-rate':
        return 'Win Rate Percentage';
      case 'response-time':
        return 'System Response Time (ms)';
      default:
        return 'Performance Metrics';
    }
  };
  
  // Get Y-axis label based on active metric
  const getYAxisLabel = () => {
    switch(activeMetric) {
      case 'trades':
        return 'Count';
      case 'win-rate':
        return 'Percentage (%)';
      case 'response-time':
        return 'Milliseconds (ms)';
      default:
        return 'Value';
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{getChartTitle()}</CardTitle>
        <CardDescription>
          {farmId ? `Farm ID: ${farmId}` : 'All Farms'} 
          {agentId ? ` • Agent ID: ${agentId}` : ''}
          {' • '}
          {timeframe === 'hour' ? 'Last Hour' : 
           timeframe === 'day' ? 'Last 24 Hours' : 
           timeframe === 'week' ? 'Last 7 Days' : 
           'Last 30 Days'}
        </CardDescription>
        
        <Tabs
          value={activeMetric}
          onValueChange={(value) => setActiveMetric(value as 'trades' | 'win-rate' | 'response-time')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trades" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              <span>Trades</span>
            </TabsTrigger>
            <TabsTrigger value="win-rate" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Win Rate</span>
            </TabsTrigger>
            <TabsTrigger value="response-time" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Response Time</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent>
        <div style={{ width: '100%', height }}>
          {activeMetric === 'trades' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={multiSeriesData}
                margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Number of Trades', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value: number) => [`${value} trades`, '']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Legend />
                <Bar dataKey="buys" name="Buy Orders" fill="#22c55e" />
                <Bar dataKey="sells" name="Sell Orders" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
          
          {activeMetric === 'win-rate' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={multiSeriesData}
                margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis 
                  label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="overall" 
                  name="Overall Win Rate"
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="long" 
                  name="Long Positions" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="short" 
                  name="Short Positions" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          
          {activeMetric === 'response-time' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={multiSeriesData}
                margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
              >
                <defs>
                  <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorDb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorNetwork" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ffc658" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)} ms`, '']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="api" 
                  name="API Response" 
                  stroke="#8884d8" 
                  fillOpacity={1} 
                  fill="url(#colorApi)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="database" 
                  name="Database Queries" 
                  stroke="#82ca9d" 
                  fillOpacity={1} 
                  fill="url(#colorDb)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="network" 
                  name="Network Latency" 
                  stroke="#ffc658" 
                  fillOpacity={1} 
                  fill="url(#colorNetwork)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 