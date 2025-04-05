"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBytes } from '@/lib/utils';
import { useState } from 'react';

interface StorageUsageChartProps {
  usageHistory: Array<{
    date: string;
    used: number;
    reserved?: number;
  }>;
  title?: string;
  description?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export default function StorageUsageChart({
  usageHistory,
  title = "Storage Usage Trends",
  description = "Historical view of storage utilization over time"
}: StorageUsageChartProps) {
  const [timeRange, setTimeRange] = useState('30d');
  
  // Filter data based on selected time range
  const filteredData = React.useMemo(() => {
    if (!usageHistory || usageHistory.length === 0) return [];
    
    if (timeRange === '7d') {
      return usageHistory.slice(-7);
    } else if (timeRange === '14d') {
      return usageHistory.slice(-14);
    } else if (timeRange === '90d') {
      // In a real app, you might fetch more data or handle this differently
      return usageHistory;
    } else {
      // Default: 30 days
      return usageHistory;
    }
  }, [usageHistory, timeRange]);
  
  // Custom tooltip to format the values as bytes
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded shadow-sm p-2 text-xs">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {entry.name}: {formatBytes(entry.value)}
            </p>
          ))}
        </div>
      );
    }
  
    return null;
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="30 days" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="14d">14 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData}
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#888" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value: string) => {
                    // Convert ISO date to MM/DD format
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value: number) => formatBytes(value, 0)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="used"
                  name="Used Space"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 1 }}
                  activeDot={{ r: 5 }}
                />
                {filteredData[0] && filteredData[0].hasOwnProperty('reserved') && (
                  <Line
                    type="monotone"
                    dataKey="reserved"
                    name="Reserved Space"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={{ r: 1 }}
                    activeDot={{ r: 5 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">No usage data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 