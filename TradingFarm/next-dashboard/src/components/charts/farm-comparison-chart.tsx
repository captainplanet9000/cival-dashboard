'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

// Farm data interface for charts
interface FarmPerformanceData {
  id: string | number;
  name: string;
  roi: number;
  winRate: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  volatility?: number;
  profitFactor?: number;
  trades?: number;
  color?: string;
}

// Component props
interface FarmComparisonChartProps {
  farms: FarmPerformanceData[];
  title?: string;
  description?: string;
  className?: string;
  period?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Standard color palette
const COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
];

// Custom tooltip component for enhanced visualizations
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 p-2 border rounded-md shadow-sm">
        <p className="font-medium">{label || payload[0].payload.name}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value.toFixed(2)}${entry.unit || ''}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Farm performance comparison chart component using Recharts
 * Enables comparison of different performance metrics across multiple farms
 */
export function FarmComparisonChart({
  farms,
  title = 'Farm Performance Comparison',
  description = 'Compare key metrics across multiple trading farms',
  className = '',
  period = 'Last 30 days',
  dateRange,
}: FarmComparisonChartProps) {
  // If no data is provided, show empty state
  if (!farms || farms.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No farm performance data available</p>
        </CardContent>
      </Card>
    );
  }

  // Assign colors to farms if not provided
  const enhancedFarms = farms.map((farm, index) => ({
    ...farm,
    color: farm.color || COLORS[index % COLORS.length],
  }));

  // Prepare data for different chart types
  const barData = [...enhancedFarms].sort((a, b) => b.roi - a.roi);
  
  // Data for radar chart - normalized values for better visualization
  const radarData = enhancedFarms.map(farm => {
    // Normalize metrics to 0-100 scale for radar chart
    const normalizedWinRate = Math.min(100, farm.winRate * 100);
    const normalizedRoi = Math.min(100, farm.roi * 10); // Scale ROI (10% becomes 100)
    const normalizedSharpe = farm.sharpeRatio ? Math.min(100, farm.sharpeRatio * 33.3) : 50; // Scale Sharpe (3.0 becomes 100)
    const normalizedDrawdown = farm.maxDrawdown ? 100 - Math.min(100, Math.abs(farm.maxDrawdown) * 200) : 50; // Invert so less drawdown is better
    const normalizedVolatility = farm.volatility ? 100 - Math.min(100, farm.volatility * 200) : 50; // Invert so less volatility is better
    
    return {
      metric: farm.name,
      'Win Rate': normalizedWinRate,
      'ROI': normalizedRoi,
      'Sharpe Ratio': normalizedSharpe,
      'Drawdown Resistance': normalizedDrawdown,
      'Stability': normalizedVolatility,
      color: farm.color,
    };
  });
  
  // Data for scatter chart (ROI vs Win Rate)
  const scatterData = enhancedFarms.map(farm => ({
    name: farm.name,
    roi: farm.roi * 100, // Convert to percentage for display
    winRate: farm.winRate * 100, // Convert to percentage for display
    trades: farm.trades || 50, // Default value if not provided
    color: farm.color,
  }));
  
  // Data for composed chart (multiple metrics side by side)
  const composedData = [
    { name: 'ROI (%)', ...enhancedFarms.reduce((acc, farm) => ({ ...acc, [farm.name]: farm.roi * 100 }), {}) },
    { name: 'Win Rate (%)', ...enhancedFarms.reduce((acc, farm) => ({ ...acc, [farm.name]: farm.winRate * 100 }), {}) },
    { name: 'Sharpe Ratio', ...enhancedFarms.reduce((acc, farm) => ({ ...acc, [farm.name]: farm.sharpeRatio || 0 }), {}) },
    { name: 'Max Drawdown (%)', ...enhancedFarms.reduce((acc, farm) => ({ ...acc, [farm.name]: farm.maxDrawdown ? farm.maxDrawdown * 100 : 0 }), {}) },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description}
          {dateRange && (
            <span className="block mt-1">
              {format(dateRange.start, 'MMM d, yyyy')} - {format(dateRange.end, 'MMM d, yyyy')}
            </span>
          )}
          {!dateRange && period && <span className="block mt-1">{period}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="bar">ROI</TabsTrigger>
            <TabsTrigger value="radar">Metrics</TabsTrigger>
            <TabsTrigger value="scatter">Risk/Reward</TabsTrigger>
            <TabsTrigger value="composed">Comparison</TabsTrigger>
          </TabsList>
          
          {/* ROI Bar Chart */}
          <TabsContent value="bar" className="mt-0">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{
                    top: 20,
                    right: 30,
                    left: 100,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => `${(value * 100).toFixed(1)}%`} 
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    scale="band" 
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, 'ROI']}
                    labelFormatter={(label) => `Farm: ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="roi" 
                    name="Return on Investment" 
                    radius={[0, 4, 4, 0]}
                  >
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          {/* Radar Chart for Multiple Metrics */}
          <TabsContent value="radar" className="mt-0">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData[0]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  
                  {enhancedFarms.map((farm, index) => (
                    <Radar
                      key={`radar-${farm.id}`}
                      name={farm.name}
                      dataKey={farm.name}
                      stroke={farm.color}
                      fill={farm.color}
                      fillOpacity={0.2}
                    />
                  ))}
                  
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          {/* Scatter Plot for Risk/Reward */}
          <TabsContent value="scatter" className="mt-0">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{
                    top: 20,
                    right: 30,
                    bottom: 20,
                    left: 20,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="winRate" 
                    name="Win Rate" 
                    label={{ 
                      value: 'Win Rate (%)', 
                      position: 'insideBottomRight', 
                      offset: -5 
                    }}
                    domain={[0, 100]}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="roi" 
                    name="ROI" 
                    label={{ 
                      value: 'ROI (%)', 
                      angle: -90, 
                      position: 'insideLeft' 
                    }}
                    domain={[0, 'dataMax + 5']}
                  />
                  <ZAxis 
                    type="number" 
                    dataKey="trades" 
                    range={[50, 250]} 
                    name="Number of Trades" 
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(2)}${name === 'trades' ? '' : '%'}`,
                      name === 'roi' ? 'ROI' : name === 'winRate' ? 'Win Rate' : 'Trades'
                    ]}
                  />
                  <Legend />
                  
                  {enhancedFarms.map((farm, index) => (
                    <Scatter 
                      key={`scatter-${farm.id}`}
                      name={farm.name} 
                      data={[scatterData[index]]}
                      fill={farm.color}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          {/* Composed Chart for Side-by-Side Comparison */}
          <TabsContent value="composed" className="mt-0">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={composedData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" scale="band" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  {enhancedFarms.map((farm, index) => (
                    <Bar 
                      key={`bar-${farm.id}`}
                      dataKey={farm.name} 
                      name={farm.name}
                      barSize={20}
                      fill={farm.color}
                    />
                  ))}
                  
                  {/* Add line for average values */}
                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="#8884d8"
                    name="Average"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
