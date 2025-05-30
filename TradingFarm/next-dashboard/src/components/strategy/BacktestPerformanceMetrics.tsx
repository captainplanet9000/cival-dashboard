'use client';

import React from 'react';
import { BacktestPerformance } from '@/lib/strategy/types';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface BacktestPerformanceMetricsProps {
  performance: BacktestPerformance;
}

export default function BacktestPerformanceMetrics({ performance }: BacktestPerformanceMetricsProps) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
          <TabsTrigger value="trades">Trade Stats</TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Net Profit"
              value={`$${performance.netProfit.toLocaleString()}`}
              subtitle={`${performance.netProfitPercent.toFixed(2)}%`}
              positive={performance.netProfit > 0}
            />
            <MetricCard
              title="Profit Factor"
              value={performance.profitFactor.toFixed(2)}
              subtitle="Gross Profit / Gross Loss"
              positive={performance.profitFactor > 1}
            />
            <MetricCard
              title="Win Rate"
              value={`${(performance.winRate * 100).toFixed(1)}%`}
              subtitle={`${performance.winningTrades} of ${performance.totalTrades} trades`}
              positive={performance.winRate > 0.5}
            />
            <MetricCard
              title="Max Drawdown"
              value={`${performance.maxDrawdownPercent.toFixed(2)}%`}
              subtitle={`$${performance.maxDrawdown.toLocaleString()}`}
              positive={false}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="returns" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Return"
              value={`${performance.netProfitPercent.toFixed(2)}%`}
              subtitle={`$${performance.netProfit.toLocaleString()}`}
              positive={performance.netProfit > 0}
            />
            <MetricCard
              title="ROI"
              value={`${performance.roi.toFixed(2)}%`}
              subtitle="Return on Investment"
              positive={performance.roi > 0}
            />
            {performance.cagr !== undefined && (
              <MetricCard
                title="CAGR"
                value={`${(performance.cagr * 100).toFixed(2)}%`}
                subtitle="Compound Annual Growth Rate"
                positive={performance.cagr > 0}
              />
            )}
            <MetricCard
              title="Profit per Day"
              value={`$${performance.profitPerDay.toFixed(2)}`}
              subtitle="Average daily profit"
              positive={performance.profitPerDay > 0}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="risk" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Sharpe Ratio"
              value={performance.sharpeRatio.toFixed(2)}
              subtitle="Risk-adjusted return"
              positive={performance.sharpeRatio > 1}
            />
            <MetricCard
              title="Sortino Ratio"
              value={performance.sortinoRatio.toFixed(2)}
              subtitle="Downside risk-adjusted return"
              positive={performance.sortinoRatio > 1}
            />
            <MetricCard
              title="Max Drawdown"
              value={`${performance.maxDrawdownPercent.toFixed(2)}%`}
              subtitle={`$${performance.maxDrawdown.toLocaleString()}`}
              positive={false}
            />
            <MetricCard
              title="Total Fees"
              value={`$${performance.totalFees.toLocaleString()}`}
              subtitle="Commission & slippage"
              positive={false}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="trades" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Trades"
              value={performance.totalTrades.toString()}
              subtitle={`${performance.tradesPerDay.toFixed(1)} trades per day`}
            />
            <MetricCard
              title="Win Rate"
              value={`${(performance.winRate * 100).toFixed(1)}%`}
              subtitle={`${performance.winningTrades} winning, ${performance.losingTrades} losing`}
              positive={performance.winRate > 0.5}
            />
            <MetricCard
              title="Avg Win"
              value={`$${performance.averageWin.toFixed(2)}`}
              subtitle="Per winning trade"
              positive={true}
            />
            <MetricCard
              title="Avg Loss"
              value={`$${performance.averageLoss.toFixed(2)}`}
              subtitle="Per losing trade"
              positive={false}
            />
          </div>
          
          <div className="grid grid-cols-2 mt-4 gap-4">
            <MetricCard
              title="Avg Duration"
              value={`${performance.averageDurationHours.toFixed(1)} hours`}
              subtitle="Average trade duration"
            />
            <MetricCard
              title="Win/Loss Ratio"
              value={(performance.averageWin / (performance.averageLoss || 1)).toFixed(2)}
              subtitle="Avg Win / Avg Loss"
              positive={performance.averageWin > performance.averageLoss}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  positive?: boolean;
}

function MetricCard({ title, value, subtitle, positive }: MetricCardProps) {
  return (
    <Card className="p-4">
      <div className="text-muted-foreground text-sm">{title}</div>
      <div 
        className={`text-xl font-bold mt-1 ${
          positive === undefined 
            ? '' 
            : positive 
              ? 'text-green-500'
              : 'text-red-500'
        }`}
      >
        {value}
      </div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </Card>
  );
}
