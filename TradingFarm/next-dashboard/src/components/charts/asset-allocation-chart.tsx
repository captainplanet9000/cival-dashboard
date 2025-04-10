'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Treemap,
  TreemapChart,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Asset allocation item interface
interface AssetItem {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

// Component props
interface AssetAllocationChartProps {
  data: AssetItem[];
  title?: string;
  description?: string;
  className?: string;
  currencySymbol?: string;
  showPercentages?: boolean;
  showLegend?: boolean;
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
  '#84cc16', // Lime
  '#14b8a6', // Teal
];

// Custom tooltip component for different chart types
const CustomTooltip = ({ active, payload, currencySymbol = '$' }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/95 p-2 border rounded-md shadow-sm">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          {`Value: ${currencySymbol}${data.value.toLocaleString()}`}
        </p>
        {data.percentage !== undefined && (
          <p className="text-sm text-muted-foreground">
            {`Percentage: ${data.percentage.toFixed(2)}%`}
          </p>
        )}
      </div>
    );
  }
  return null;
};

/**
 * Asset allocation chart component using Recharts
 * Displays asset distribution in multiple formats (pie, bar, treemap)
 */
export function AssetAllocationChart({
  data,
  title = 'Asset Allocation',
  description = 'Distribution of assets by value',
  className = '',
  currencySymbol = '$',
  showPercentages = true,
  showLegend = true,
}: AssetAllocationChartProps) {
  // If no data is provided, show empty state
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No allocation data available</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate total and percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Prepare chart data with percentages and colors
  const chartData = data.map((item, index) => ({
    ...item,
    percentage: (item.value / total) * 100,
    color: item.color || COLORS[index % COLORS.length],
  }));

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pie" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="pie">Pie</TabsTrigger>
            <TabsTrigger value="bar">Bar</TabsTrigger>
            <TabsTrigger value="treemap">Treemap</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pie" className="mt-0">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={showPercentages}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={showPercentages ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%` : false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
                  {showLegend && (
                    <Legend
                      formatter={(value, entry, index) => (
                        <span className="text-sm font-medium">{value}</span>
                      )}
                    />
                  )}
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="bar" className="mt-0">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 30,
                    left: 50, // More space for asset names
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    scale="band" 
                    tick={{ 
                      fontSize: 12,
                      width: 120,
                      wordWrap: 'break-word'
                    }}
                  />
                  <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
                  <Bar dataKey="value">
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="treemap" className="mt-0">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={chartData}
                  dataKey="value"
                  ratio={4/3}
                  stroke="#fff"
                  nameKey="name"
                  content={<CustomizedContent currencySymbol={currencySymbol} />}
                >
                  <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
                </Treemap>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Optional summary at the bottom */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Total Value</div>
            <div className="text-xl font-bold">{currencySymbol}{total.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Asset Count</div>
            <div className="text-xl font-bold">{data.length}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Custom content component for Treemap
const CustomizedContent = ({ root, depth, x, y, width, height, index, colors, name, value, currencySymbol = '$' }: any) => {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: depth < 2 ? COLORS[index % COLORS.length] : '#ffffff00',
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      {width > 50 && height > 25 ? (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          style={{
            fontWeight: 'bold',
            textShadow: '0px 0px 2px rgba(0, 0, 0, 0.8)',
          }}
        >
          {name}
        </text>
      ) : null}
      {width > 70 && height > 40 ? (
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          fill="#fff"
          fontSize={10}
          style={{
            textShadow: '0px 0px 2px rgba(0, 0, 0, 0.8)',
          }}
        >
          {currencySymbol}{value.toLocaleString()}
        </text>
      ) : null}
    </g>
  );
};
