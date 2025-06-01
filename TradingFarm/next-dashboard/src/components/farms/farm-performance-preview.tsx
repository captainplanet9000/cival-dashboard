'use client';

import React from 'react';
import Link from 'next/link';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart2, TrendingUp, TrendingDown, Percent, ExternalLink } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface FarmPerformancePreviewProps {
  farm: {
    id: string;
    name: string;
    description?: string;
    balance?: number;
    roi?: number;
    win_rate?: number;
    performance_data?: {
      dates: string[];
      values: number[];
    };
    recentTransactions?: Array<{
      date: string;
      type: string;
      amount: number;
    }>;
  };
  className?: string;
  showDetails?: boolean;
}

// Generate sample performance data if none provided
const generateSampleData = (days = 14) => {
  const data = [];
  const today = new Date();
  let value = 10000;
  
  for (let i = days; i >= 0; i--) {
    const date = subDays(today, i);
    // Generate somewhat realistic price movement
    const changePercent = (Math.random() * 3 - 1) / 100; // -1% to 2% daily change
    value = value * (1 + changePercent);
    
    data.push({
      date: format(date, 'MMM dd'),
      value,
    });
  }
  
  return data;
};

// Create sample transaction data
const generateSampleTransactions = (count = 5) => {
  const transactions = [];
  const today = new Date();
  const types = ['DEPOSIT', 'TRADE', 'WITHDRAWAL', 'TRADE', 'TRADE'];
  
  for (let i = 0; i < count; i++) {
    const date = subDays(today, i);
    const isPositive = types[i] === 'DEPOSIT' || (types[i] === 'TRADE' && Math.random() > 0.3);
    const amount = isPositive 
      ? Math.floor(Math.random() * 2000) + 100 
      : -Math.floor(Math.random() * 1000) - 50;
    
    transactions.push({
      date: format(date, 'MMM dd'),
      type: types[i],
      amount,
    });
  }
  
  return transactions;
};

export function FarmPerformancePreview({ farm, className = '', showDetails = true }: FarmPerformancePreviewProps) {
  // Use provided data or generate sample data
  const performanceData = farm.performance_data 
    ? farm.performance_data.dates.map((date, index) => ({ 
        date: format(new Date(date), 'MMM dd'),
        value: farm.performance_data.values[index]
      }))
    : generateSampleData();
  
  const transactionData = farm.recentTransactions || generateSampleTransactions();
  
  // Calculate metrics
  const roi = farm.roi !== undefined ? farm.roi : Math.random() * 0.2 - 0.05; // -5% to 15%
  const winRate = farm.win_rate !== undefined ? farm.win_rate : 0.5 + Math.random() * 0.3; // 50% to 80%
  
  // Get overall trend for styling
  const firstValue = performanceData[0]?.value || 0;
  const lastValue = performanceData[performanceData.length - 1]?.value || 0;
  const isPositiveTrend = lastValue >= firstValue;
  const trendColor = isPositiveTrend ? 'text-green-500' : 'text-red-500';
  const trendIcon = isPositiveTrend ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  
  // Calculate percentage change
  const percentChange = firstValue ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{farm.name}</CardTitle>
            <CardDescription className="line-clamp-1">
              {farm.description || 'Trading farm performance overview'}
            </CardDescription>
          </div>
          <Badge variant={isPositiveTrend ? 'default' : 'destructive'} className="flex items-center gap-1">
            {trendIcon}
            {percentChange.toFixed(2)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Line Chart */}
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={isPositiveTrend ? '#10b981' : '#ef4444'} 
                strokeWidth={2}
                dot={false}
              />
              <Tooltip 
                formatter={(value) => [`$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, 'Value']}
                labelFormatter={(label) => label}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Key Metrics Grid */}
        {showDetails && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-md">
              <div className="flex items-center text-muted-foreground mb-1">
                <Percent className="h-3 w-3 mr-1" /> ROI
              </div>
              <div className={`text-lg font-bold ${roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {(roi * 100).toFixed(2)}%
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-md">
              <div className="flex items-center text-muted-foreground mb-1">
                <BarChart2 className="h-3 w-3 mr-1" /> Win Rate
              </div>
              <div className="text-lg font-bold">
                {(winRate * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        )}
        
        {/* Recent Transactions */}
        {showDetails && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
            <div className="space-y-1 text-sm">
              {transactionData.slice(0, 3).map((tx, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{tx.date}</span>
                    <span>{tx.type}</span>
                  </div>
                  <span className={tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline" className="w-full" asChild>
          <Link href={`/dashboard/farms/${farm.id}/performance`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Detailed Performance
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
