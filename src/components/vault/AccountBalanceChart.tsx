"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface AccountBalanceChartProps {
  data: {
    timestamp: string;
    balance: number;
  }[];
  currency: string;
}

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <Card className="shadow-md border">
        <CardContent className="p-3">
          <p className="text-sm font-medium">{new Date(label).toLocaleDateString()}</p>
          <p className="text-sm">
            Balance: <span className="font-medium">{formatCurrency(payload[0].value as number, payload[0].payload.currency)}</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
};

// Date formatter for the X-axis
const formatDate = (timestamp: string) => {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Balance chart component
export default function AccountBalanceChart({ data, currency }: AccountBalanceChartProps) {
  // Process data to ensure chronological order and add currency
  const chartData = data
    .map(item => ({
      ...item,
      currency,
      date: new Date(item.timestamp).getTime() // Convert to timestamp for sorting
    }))
    .sort((a, b) => a.date - b.date)
    .map(item => ({
      timestamp: item.timestamp,
      balance: item.balance,
      currency: item.currency
    }));

  // Get min and max for Y-axis domain
  const balances = chartData.map(d => d.balance);
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  
  // Add a buffer of 5% to the domain for better visualization
  const yDomainMin = minBalance - (maxBalance - minBalance) * 0.05;
  const yDomainMax = maxBalance + (maxBalance - minBalance) * 0.05;

  return (
    <div className="w-full h-full">
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No balance history data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 10,
              right: 10,
              left: 10,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatDate}
              tick={{ fontSize: 12 }}
              tickMargin={10}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value, currency, 0)}
              tick={{ fontSize: 12 }}
              domain={[yDomainMin, yDomainMax]}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
} 