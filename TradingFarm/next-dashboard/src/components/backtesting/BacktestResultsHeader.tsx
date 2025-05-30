"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BacktestResult } from '@/types/backtesting';
import { useToast } from '@/components/ui/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Share2, 
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Clock
} from 'lucide-react';

interface BacktestResultsHeaderProps {
  result: BacktestResult;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function BacktestResultsHeader({ result, onRefresh, isRefreshing = false }: BacktestResultsHeaderProps) {
  const { toast } = useToast();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  const handleExport = () => {
    // In a real app, this would generate a CSV or JSON file
    toast({
      title: "Export Started",
      description: "Your backtest results are being prepared for download.",
    });
  };

  const handleShare = () => {
    // In a real app, this would generate a shareable link
    toast({
      title: "Share Link Generated",
      description: "Copy and share this link to your backtest results.",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getProfitLossColor = (value: number) => {
    return value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'text-gray-500';
  };

  const getProfitLossIcon = (value: number) => {
    return value > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : value < 0 ? (
      <TrendingDown className="h-4 w-4 text-red-500" />
    ) : (
      <ArrowUpDown className="h-4 w-4 text-gray-500" />
    );
  };

  return (
    <Card className="border-b shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold">Backtest Results</CardTitle>
              <Badge variant={result.status === 'completed' ? 'default' : 
                             result.status === 'failed' ? 'destructive' : 
                             'secondary'} 
                    className="ml-2">
                <div className="flex items-center gap-1">
                  {getStatusIcon(result.status)}
                  <span className="uppercase text-xs">{result.status}</span>
                </div>
              </Badge>
            </div>
            <CardDescription>
              {result.total_trades} trades from {new Date(result.created_at).toLocaleDateString()}
            </CardDescription>
          </div>

          <div className="flex gap-2 mt-4 md:mt-0">
            {result.status === 'completed' && (
              <>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </>
            )}
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh} 
                disabled={isRefreshing || result.status === 'completed'}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {/* Total Return */}
          <div className="bg-background rounded-lg p-4 border">
            <div className="flex justify-between items-start">
              <div className="text-sm font-medium text-muted-foreground">Total Return</div>
              {getProfitLossIcon(result.profit_loss)}
            </div>
            <div className={`text-2xl font-bold mt-2 ${getProfitLossColor(result.profit_loss)}`}>
              {formatCurrency(result.profit_loss)}
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-background rounded-lg p-4 border">
            <div className="text-sm font-medium text-muted-foreground">Win Rate</div>
            <div className="text-2xl font-bold mt-2">
              {formatPercentage(result.win_rate)}
            </div>
          </div>

          {/* Sharpe Ratio */}
          <div className="bg-background rounded-lg p-4 border">
            <div className="text-sm font-medium text-muted-foreground">Sharpe Ratio</div>
            <div className="text-2xl font-bold mt-2">
              {result.sharpe_ratio.toFixed(2)}
            </div>
          </div>

          {/* Max Drawdown */}
          <div className="bg-background rounded-lg p-4 border">
            <div className="text-sm font-medium text-muted-foreground">Max Drawdown</div>
            <div className="text-2xl font-bold mt-2 text-red-500">
              {formatPercentage(result.max_drawdown)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
