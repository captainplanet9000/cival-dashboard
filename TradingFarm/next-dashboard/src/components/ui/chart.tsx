"use client"

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { useTheme } from 'next-themes';

// Will export components at the end of the file

// Color palette that works well in both light and dark modes
const CHART_COLORS = {
  light: [
    '#2563eb', // blue
    '#16a34a', // green
    '#ea580c', // orange
    '#9333ea', // purple
    '#e11d48', // rose
    '#0891b2', // cyan
    '#9C27B0', // violet
    '#FFBB28', // amber
  ],
  dark: [
    '#60a5fa', // lighter blue
    '#4ade80', // lighter green
    '#fb923c', // lighter orange
    '#c084fc', // lighter purple
    '#fb7185', // lighter rose
    '#22d3ee', // lighter cyan
    '#CE93D8', // lighter violet
    '#FFC547', // lighter amber
  ],
};

interface ChartCardProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, description, className, children }: ChartCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-0 pt-2">
        {children}
      </CardContent>
    </Card>
  );
}

interface LineChartProps {
  data: any[];
  height?: number;
  lines: {
    dataKey: string;
    name?: string;
    color?: string;
    strokeWidth?: number;
  }[];
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  xAxisDataKey?: string;
  yAxisWidth?: number;
  className?: string;
  compact?: boolean;
}

export function LineChartComponent({
  data,
  height = 300,
  lines,
  showXAxis = true,
  showYAxis = true,
  showGrid = true,
  showLegend = true,
  xAxisDataKey = "name",
  yAxisWidth = 50,
  className,
  compact = false,
}: LineChartProps) {
  const { theme } = useTheme();
  const colorMode = theme === 'dark' ? 'dark' : 'light';
  const colors = CHART_COLORS[colorMode];

  if (!data || data.length === 0) {
    return <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground">No data available</div>;
  }

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={compact ? { top: 5, right: 5, bottom: 5, left: 5 } : { top: 10, right: 30, bottom: 30, left: 10 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={colorMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />}
          {showXAxis && <XAxis dataKey={xAxisDataKey} stroke={colorMode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />}
          {showYAxis && <YAxis width={yAxisWidth} stroke={colorMode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />}
          <Tooltip 
            contentStyle={{ 
              backgroundColor: colorMode === 'dark' ? '#333' : '#fff',
              borderColor: colorMode === 'dark' ? '#555' : '#ddd',
              color: colorMode === 'dark' ? '#fff' : '#333',
            }} 
          />
          {showLegend && <Legend />}
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
              stroke={line.color || colors[index % colors.length]}
              strokeWidth={line.strokeWidth || 2}
              activeDot={{ r: 6 }}
              dot={compact ? false : { r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface BarChartProps {
  data: any[];
  height?: number;
  bars: {
    dataKey: string;
    name?: string;
    color?: string;
    stackId?: string;
  }[];
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  xAxisDataKey?: string;
  yAxisWidth?: number;
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

export function BarChartComponent({
  data,
  height = 300,
  bars,
  showXAxis = true,
  showYAxis = true,
  showGrid = true,
  showLegend = true,
  xAxisDataKey = "name",
  yAxisWidth = 50,
  layout = 'horizontal',
  className,
}: BarChartProps) {
  const { theme } = useTheme();
  const colorMode = theme === 'dark' ? 'dark' : 'light';
  const colors = CHART_COLORS[colorMode];

  if (!data || data.length === 0) {
    return <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground">No data available</div>;
  }

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart 
          data={data} 
          layout={layout}
          margin={{ top: 10, right: 30, bottom: 30, left: 10 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={colorMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />}
          {showXAxis && <XAxis 
            dataKey={layout === 'horizontal' ? xAxisDataKey : undefined} 
            type={layout === 'horizontal' ? 'category' : 'number'} 
            stroke={colorMode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} 
          />}
          {showYAxis && <YAxis 
            width={yAxisWidth} 
            dataKey={layout === 'vertical' ? xAxisDataKey : undefined}
            type={layout === 'vertical' ? 'category' : 'number'}
            stroke={colorMode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} 
          />}
          <Tooltip 
            contentStyle={{ 
              backgroundColor: colorMode === 'dark' ? '#333' : '#fff',
              borderColor: colorMode === 'dark' ? '#555' : '#ddd',
              color: colorMode === 'dark' ? '#fff' : '#333',
            }} 
          />
          {showLegend && <Legend />}
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name || bar.dataKey}
              fill={bar.color || colors[index % colors.length]}
              stackId={bar.stackId}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface AreaChartProps {
  data: any[];
  height?: number;
  areas: {
    dataKey: string;
    name?: string;
    color?: string;
    stackId?: string;
    fill?: string;
  }[];
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  xAxisDataKey?: string;
  yAxisWidth?: number;
  className?: string;
}

export function AreaChartComponent({
  data,
  height = 300,
  areas,
  showXAxis = true,
  showYAxis = true,
  showGrid = true,
  showLegend = true,
  xAxisDataKey = "name",
  yAxisWidth = 50,
  className,
}: AreaChartProps) {
  const { theme } = useTheme();
  const colorMode = theme === 'dark' ? 'dark' : 'light';
  const colors = CHART_COLORS[colorMode];

  if (!data || data.length === 0) {
    return <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground">No data available</div>;
  }

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={colorMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />}
          {showXAxis && <XAxis dataKey={xAxisDataKey} stroke={colorMode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />}
          {showYAxis && <YAxis width={yAxisWidth} stroke={colorMode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />}
          <Tooltip 
            contentStyle={{ 
              backgroundColor: colorMode === 'dark' ? '#333' : '#fff',
              borderColor: colorMode === 'dark' ? '#555' : '#ddd',
              color: colorMode === 'dark' ? '#fff' : '#333',
            }} 
          />
          {showLegend && <Legend />}
          {areas.map((area, index) => (
            <Area
              key={area.dataKey}
              type="monotone"
              dataKey={area.dataKey}
              name={area.name || area.dataKey}
              stroke={area.color || colors[index % colors.length]}
              fill={area.fill || `${area.color || colors[index % colors.length]}40`}
              stackId={area.stackId}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PieChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
  outerRadius?: number | string;
  innerRadius?: number | string;
  showLabel?: boolean;
  showLegend?: boolean;
  className?: string;
}

export function PieChartComponent({
  data,
  height = 300,
  outerRadius = '70%',
  innerRadius = 0,
  showLabel = true,
  showLegend = true,
  className,
}: PieChartProps) {
  const { theme } = useTheme();
  const colorMode = theme === 'dark' ? 'dark' : 'light';
  const colors = CHART_COLORS[colorMode];

  if (!data || data.length === 0) {
    return <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground">No data available</div>;
  }

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={showLabel}
            label={showLabel ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%` : undefined}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
            ))}
          </Pie>
          {showLegend && <Legend />}
          <Tooltip 
            formatter={(value) => [`${value}`, 'Value']}
            contentStyle={{ 
              backgroundColor: colorMode === 'dark' ? '#333' : '#fff',
              borderColor: colorMode === 'dark' ? '#555' : '#ddd',
              color: colorMode === 'dark' ? '#fff' : '#333',
            }} 
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
