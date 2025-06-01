'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface PerformanceChartProps {
  equityCurve: { timestamp: number; equity: number }[];
  initialCapital: number;
}

export function PerformanceChart({
  equityCurve,
  initialCapital
}: PerformanceChartProps) {
  // Prepare data for the chart
  const chartData = equityCurve.map(point => ({
    date: new Date(point.timestamp).toLocaleDateString(),
    equity: point.equity,
    // Calculate percentage change from initial capital
    percentChange: ((point.equity - initialCapital) / initialCapital) * 100
  }));
  
  // If no data, show a placeholder
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }
  
  // Find the min and max equity values for chart scaling
  const minEquity = Math.min(...chartData.map(d => d.equity));
  const maxEquity = Math.max(...chartData.map(d => d.equity));
  const equityDomain = [minEquity * 0.95, maxEquity * 1.05]; // Add some padding
  
  // Find the min and max percent changes for chart scaling
  const minPercent = Math.min(...chartData.map(d => d.percentChange));
  const maxPercent = Math.max(...chartData.map(d => d.percentChange));
  const percentDomain = [minPercent * 1.1, maxPercent * 1.1]; // Add some padding
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(value, index) => {
            // Show fewer ticks for better readability
            return index % Math.ceil(chartData.length / 10) === 0 ? value : '';
          }}
        />
        <YAxis 
          yAxisId="left"
          domain={equityDomain}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          domain={percentDomain}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${value.toFixed(1)}%`}
        />
        <Tooltip 
          formatter={(value: number, name: string) => {
            if (name === 'equity') {
              return [`$${value.toLocaleString()}`, 'Account Value'];
            } else {
              return [`${value.toFixed(2)}%`, 'Return'];
            }
          }}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <ReferenceLine 
          y={initialCapital} 
          yAxisId="left" 
          stroke="#666" 
          strokeDasharray="3 3" 
          label={{ 
            value: 'Initial Capital',
            position: 'insideBottomRight',
            fill: '#666',
            fontSize: 12
          }}
        />
        <ReferenceLine 
          y={0} 
          yAxisId="right" 
          stroke="#666" 
          strokeDasharray="3 3" 
        />
        <Line 
          yAxisId="left"
          type="monotone" 
          dataKey="equity" 
          stroke="#8884d8" 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
          name="equity"
        />
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="percentChange" 
          stroke="#82ca9d" 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
          name="percentChange"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
