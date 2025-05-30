'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BacktestResult } from '@/lib/strategy/types';
import { AreaChart, BarChart, LineChart } from '@tremor/react';

interface BacktestResultsChartProps {
  result: BacktestResult;
}

export default function BacktestResultsChart({ result }: BacktestResultsChartProps) {
  const [chartType, setChartType] = useState<'equity' | 'drawdown' | 'monthly' | 'daily'>('equity');
  
  // Format equity curve data for charting
  const equityCurveData = result.performance.equityCurve.map(point => ({
    date: new Date(point.timestamp).toLocaleDateString(),
    Equity: point.equity,
    // Add a baseline of initial capital
    'Initial Capital': result.config.initialCapital,
  }));
  
  // Calculate drawdown series
  const drawdownData = [];
  let peak = result.config.initialCapital;
  
  for (const point of result.performance.equityCurve) {
    if (point.equity > peak) {
      peak = point.equity;
    }
    const drawdown = ((peak - point.equity) / peak) * 100;
    drawdownData.push({
      date: new Date(point.timestamp).toLocaleDateString(),
      'Drawdown (%)': drawdown.toFixed(2),
    });
  }
  
  // Calculate monthly returns
  const monthlyReturns: Record<string, number> = {};
  let previousMonthEquity = result.config.initialCapital;
  let currentMonth = '';
  
  for (const point of result.performance.equityCurve) {
    const date = new Date(point.timestamp);
    const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (month !== currentMonth) {
      if (currentMonth !== '') {
        const monthlyReturn = ((point.equity - previousMonthEquity) / previousMonthEquity) * 100;
        monthlyReturns[currentMonth] = monthlyReturn;
      }
      currentMonth = month;
      previousMonthEquity = point.equity;
    }
  }
  
  // Format monthly returns for charting
  const monthlyReturnsData = Object.entries(monthlyReturns).map(([month, value]) => ({
    month,
    'Return (%)': parseFloat(value.toFixed(2)),
    color: value >= 0 ? 'positive' : 'negative',
  }));
  
  // Format daily returns
  const dailyReturnsData = result.performance.dailyReturns.map((value, index) => ({
    day: `Day ${index + 1}`,
    'Return (%)': parseFloat((value * 100).toFixed(2)),
    color: value >= 0 ? 'positive' : 'negative',
  }));
  
  // Get trade markers to overlay on equity chart
  const tradeMarkers = result.trades
    .filter(trade => trade.exitTime)
    .map(trade => {
      const entryDate = new Date(trade.entryTime).toLocaleDateString();
      const exitDate = new Date(trade.exitTime!).toLocaleDateString();
      const profit = trade.profit || 0;
      
      return {
        date: exitDate,
        [profit > 0 ? 'Win' : 'Loss']: profit > 0 ? profit : Math.abs(profit),
      };
    });
  
  return (
    <div className="space-y-4">
      <Tabs
        value={chartType}
        onValueChange={(value) => setChartType(value as any)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="equity">Equity Curve</TabsTrigger>
          <TabsTrigger value="drawdown">Drawdown</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Returns</TabsTrigger>
          <TabsTrigger value="daily">Daily Returns</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <Card className="p-4">
        {chartType === 'equity' && (
          <AreaChart
            className="h-80"
            data={equityCurveData}
            index="date"
            categories={['Equity', 'Initial Capital']}
            colors={['blue', 'gray']}
            valueFormatter={(value) => `$${value.toLocaleString()}`}
            showLegend={true}
            autoMinValue={false}
            showAnimation={true}
            showGridLines={true}
            startEndOnly={equityCurveData.length > 30}
            showTooltip={true}
            showXAxis={true}
            showYAxis={true}
          />
        )}
        
        {chartType === 'drawdown' && (
          <AreaChart
            className="h-80"
            data={drawdownData}
            index="date"
            categories={['Drawdown (%)']}
            colors={['red']}
            valueFormatter={(value) => `${value}%`}
            autoMinValue={true}
            showAnimation={true}
            showGridLines={true}
            startEndOnly={drawdownData.length > 30}
          />
        )}
        
        {chartType === 'monthly' && (
          <BarChart
            className="h-80"
            data={monthlyReturnsData}
            index="month"
            categories={['Return (%)']}
            colors={['blue']}
            valueFormatter={(value) => `${value}%`}
            showAnimation={true}
            showGridLines={true}
            customTooltip={(props) => (
              <div className="p-2 bg-background border rounded-md shadow-md">
                <p className="font-medium">{props.label}</p>
                <p className={props.payload.color === 'positive' ? 'text-green-500' : 'text-red-500'}>
                  {props.value}%
                </p>
              </div>
            )}
          />
        )}
        
        {chartType === 'daily' && (
          <LineChart
            className="h-80"
            data={dailyReturnsData.slice(0, 30)} // Show only first 30 days to avoid overcrowding
            index="day"
            categories={['Return (%)']}
            colors={['blue']}
            valueFormatter={(value) => `${value}%`}
            showAnimation={true}
            showGridLines={true}
            showLegend={false}
            startEndOnly={dailyReturnsData.length > 15}
          />
        )}
      </Card>
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-background p-3 rounded-md border">
          <p className="text-sm text-muted-foreground">Total Return</p>
          <p className={`text-xl font-bold ${result.performance.netProfitPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {result.performance.netProfitPercent.toFixed(2)}%
          </p>
        </div>
        <div className="bg-background p-3 rounded-md border">
          <p className="text-sm text-muted-foreground">Max Drawdown</p>
          <p className="text-xl font-bold text-red-500">
            {result.performance.maxDrawdownPercent.toFixed(2)}%
          </p>
        </div>
        <div className="bg-background p-3 rounded-md border">
          <p className="text-sm text-muted-foreground">Profit Factor</p>
          <p className="text-xl font-bold">
            {result.performance.profitFactor.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
