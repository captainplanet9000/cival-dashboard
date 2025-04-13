'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  BarChart, 
  Clock, 
  DollarSign,
  Percent,
  AlertTriangle,
  Check
} from "lucide-react";
import { cva } from "class-variance-authority";

// Define the styles for different metric statuses
const metricValueStyles = cva("text-2xl font-bold", {
  variants: {
    status: {
      positive: "text-green-600",
      negative: "text-red-600",
      neutral: "text-gray-900 dark:text-gray-100",
      warning: "text-amber-600",
    },
  },
  defaultVariants: {
    status: "neutral",
  },
});

// Interface for a single metric
interface Metric {
  label: string;
  value: string | number;
  status?: 'positive' | 'negative' | 'neutral' | 'warning';
  icon?: React.ReactNode;
  description?: string;
}

// Interface for the metrics cards props
interface PerformanceMetricsCardsProps {
  metrics: Metric[];
  columns?: 2 | 3 | 4;
}

export function PerformanceMetricsCards({ 
  metrics, 
  columns = 4 
}: PerformanceMetricsCardsProps) {
  // Determine the grid columns based on the props
  const gridClass = 
    columns === 2 ? "grid-cols-1 md:grid-cols-2" :
    columns === 3 ? "grid-cols-1 md:grid-cols-3" :
    "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
  
  return (
    <div className={`grid ${gridClass} gap-4`}>
      {metrics.map((metric, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {metric.label}
            </CardTitle>
            <div className="h-4 w-4 text-muted-foreground">
              {metric.icon || (
                metric.status === 'positive' ? <TrendingUp className="h-4 w-4 text-green-500" /> :
                metric.status === 'negative' ? <TrendingDown className="h-4 w-4 text-red-500" /> :
                metric.status === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-500" /> :
                <Activity className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={metricValueStyles({ status: metric.status })}>
              {typeof metric.value === 'number' ? 
                metric.value.toLocaleString(undefined, { 
                  maximumFractionDigits: 2 
                }) : 
                metric.value
              }
            </div>
            {metric.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Predefined metric sets that can be used directly
export const TradingPerformanceMetrics = ({ 
  totalTrades, 
  winRate, 
  profitLoss, 
  profitLossPercent,
  maxDrawdown,
  sharpeRatio
}: {
  totalTrades: number;
  winRate: number;
  profitLoss: number;
  profitLossPercent: number;
  maxDrawdown: number;
  sharpeRatio: number;
}) => {
  const metrics: Metric[] = [
    {
      label: "Total Trades",
      value: totalTrades,
      icon: <BarChart className="h-4 w-4" />,
      status: "neutral",
      description: `${Math.round(totalTrades / 30)} trades per day avg.`
    },
    {
      label: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      icon: <Check className="h-4 w-4" />,
      status: winRate >= 50 ? "positive" : "warning",
      description: `${Math.round(totalTrades * winRate / 100)} winning trades`
    },
    {
      label: "P&L",
      value: `$${Math.abs(profitLoss).toFixed(2)}`,
      icon: <DollarSign className="h-4 w-4" />,
      status: profitLoss >= 0 ? "positive" : "negative",
      description: `${profitLossPercent.toFixed(2)}% total return`
    },
    {
      label: "Max Drawdown",
      value: `${maxDrawdown.toFixed(2)}%`,
      icon: <TrendingDown className="h-4 w-4" />,
      status: maxDrawdown < 10 ? "positive" : maxDrawdown < 20 ? "warning" : "negative",
      description: `${sharpeRatio.toFixed(2)} Sharpe ratio`
    }
  ];
  
  return <PerformanceMetricsCards metrics={metrics} />;
};

// Risk metrics preset
export const RiskMetricsCards = ({
  sharpeRatio,
  sortinoRatio,
  calmarRatio,
  volatility
}: {
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  volatility: number;
}) => {
  const metrics: Metric[] = [
    {
      label: "Sharpe Ratio",
      value: sharpeRatio.toFixed(2),
      status: sharpeRatio > 1 ? "positive" : sharpeRatio > 0 ? "neutral" : "negative",
      description: "Risk-adjusted return"
    },
    {
      label: "Sortino Ratio",
      value: sortinoRatio.toFixed(2),
      status: sortinoRatio > 1 ? "positive" : sortinoRatio > 0 ? "neutral" : "negative",
      description: "Downside risk-adjusted return"
    },
    {
      label: "Calmar Ratio",
      value: calmarRatio.toFixed(2),
      status: calmarRatio > 0.5 ? "positive" : calmarRatio > 0 ? "neutral" : "negative",
      description: "Return relative to max drawdown"
    },
    {
      label: "Volatility",
      value: `${volatility.toFixed(2)}%`,
      status: volatility < 5 ? "positive" : volatility < 15 ? "neutral" : "warning",
      description: "Daily price volatility"
    }
  ];
  
  return <PerformanceMetricsCards metrics={metrics} />;
};
