'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, BarChart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface BacktestResultsTableProps {
  results: any[];
  onSelectResult: (result: any) => void;
  selectedResultId?: string;
  isLoading?: boolean;
}

export function BacktestResultsTable({
  results,
  onSelectResult,
  selectedResultId,
  isLoading = false
}: BacktestResultsTableProps) {
  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Get period duration in a readable format
  const getPeriodDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      // Less than a day
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays < 30) {
      // Days
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffDays < 365) {
      // Months
      const diffMonths = Math.round(diffDays / 30);
      return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
    } else {
      // Years
      const diffYears = Math.round(diffDays / 365);
      return `${diffYears} year${diffYears !== 1 ? 's' : ''}`;
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4 p-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }
  
  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          No backtest results available
        </p>
        <p className="text-sm">
          Configure parameters and run a backtest to see results here
        </p>
      </div>
    );
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Profit</TableHead>
            <TableHead>Initial Capital</TableHead>
            <TableHead>Max Drawdown</TableHead>
            <TableHead>Trades</TableHead>
            <TableHead>Win Rate</TableHead>
            <TableHead>Sharpe</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => {
            const winRate = ((result.winningTrades / result.trades) * 100).toFixed(1);
            
            return (
              <TableRow 
                key={result.id} 
                className={selectedResultId === result.id ? 'bg-primary/10' : ''}
              >
                <TableCell>
                  {formatDate(result.startTime)}
                </TableCell>
                <TableCell>
                  {getPeriodDuration(result.startTime, result.endTime)}
                </TableCell>
                <TableCell className={result.profitPercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {result.profitPercent.toFixed(2)}%
                </TableCell>
                <TableCell>${result.initialCapital.toLocaleString()}</TableCell>
                <TableCell className="text-red-500">
                  {result.maxDrawdownPercent.toFixed(2)}%
                </TableCell>
                <TableCell>{result.trades}</TableCell>
                <TableCell>
                  {Number.isNaN(Number(winRate)) ? 'N/A' : `${winRate}%`}
                </TableCell>
                <TableCell>
                  {result.sharpeRatio ? result.sharpeRatio.toFixed(2) : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onSelectResult(result)}
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
