"use client";

import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Area, 
  AreaChart
} from 'recharts';
import { Card } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';

interface AccountBalanceChartProps {
  data: {
    timestamp: string;
    balance: number;
  }[];
  currency: string;
}

export default function AccountBalanceChart({ data, currency }: AccountBalanceChartProps) {
  // If data is empty, return placeholdere
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No balance history available</p>
      </div>
    );
  }
  
  // Sort data by timestamp
  const sortedData = [...data].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // Format data for the chart
  const chartData = sortedData.map(item => ({
    date: item.timestamp,
    balance: item.balance,
    formattedDate: format(new Date(item.timestamp), 'MMM d')
  }));
  
  // Calculate min and max values for better axis scaling
  const minBalance = Math.min(...chartData.map(d => d.balance));
  const maxBalance = Math.max(...chartData.map(d => d.balance));
  const yAxisMin = Math.max(0, minBalance * 0.95);
  const yAxisMax = maxBalance * 1.05;
  
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };
  
  const formatTooltipValue = (value: number) => {
    return `${value.toLocaleString()} ${currency}`;
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="bg-background p-3 border shadow-sm">
          <p className="font-medium">{format(new Date(label), 'MMM d, yyyy')}</p>
          <p className="text-sm text-primary">
            Balance: <span className="font-medium">{formatTooltipValue(payload[0].value)}</span>
          </p>
        </Card>
      );
    }
    return null;
  };
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={chartData}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 0,
        }}
      >
        <defs>
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis 
          dataKey="date" 
          tickFormatter={(value) => format(new Date(value), 'MMM d')}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          minTickGap={30}
        />
        <YAxis 
          domain={[yAxisMin, yAxisMax]}
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area 
          type="monotone" 
          dataKey="balance" 
          stroke="#0ea5e9" 
          strokeWidth={2}
          fill="url(#balanceGradient)" 
          animationDuration={1000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
} 