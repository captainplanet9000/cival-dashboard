import React, { useState } from 'react';
import { useFarmPerformance } from '@/hooks/useFarmPerformance';

interface FarmPerformanceProps {
  supabaseUrl: string;
  supabaseKey: string;
  farmId: string;
}

export function FarmPerformance({
  supabaseUrl,
  supabaseKey,
  farmId
}: FarmPerformanceProps) {
  const [timeRange, setTimeRange] = useState<'1d' | '1w' | '1m' | '3m' | '1y' | 'all'>('1m');
  const [selectedStrategy, setSelectedStrategy] = useState<string>();
  const [selectedSymbol, setSelectedSymbol] = useState<string>();

  const {
    metrics,
    isLoading,
    error,
    refreshMetrics
  } = useFarmPerformance({
    supabaseUrl,
    supabaseKey,
    farmId
  });

  const handleTimeRangeChange = async (range: typeof timeRange) => {
    setTimeRange(range);
    const now = new Date();
    let startTime: Date;

    switch (range) {
      case '1d':
        startTime = new Date(now.setDate(now.getDate() - 1));
        break;
      case '1w':
        startTime = new Date(now.setDate(now.getDate() - 7));
        break;
      case '1m':
        startTime = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case '3m':
        startTime = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case '1y':
        startTime = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startTime = new Date(0); // Beginning of time for 'all'
    }

    await refreshMetrics({
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString(),
      strategyId: selectedStrategy,
      symbol: selectedSymbol
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Farm Performance</h2>

      {/* Time Range Selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(['1d', '1w', '1m', '3m', '1y', 'all'] as const).map(range => (
          <button
            key={range}
            onClick={() => handleTimeRangeChange(range)}
            className={`px-3 py-1 rounded-full text-sm ${
              timeRange === range
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {range.toUpperCase()}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading metrics...</div>
      ) : error ? (
        <div className="text-red-500 py-4">{error}</div>
      ) : metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Overview Card */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Overview</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Trades</span>
                <span className="font-medium">{metrics.total_trades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Win Rate</span>
                <span className="font-medium">{formatPercent(metrics.win_rate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Profit Factor</span>
                <span className="font-medium">{metrics.profit_factor.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* PnL Card */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Profit & Loss</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Profit</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(metrics.total_profit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Loss</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(metrics.total_loss)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Profit</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(metrics.avg_profit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Loss</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(metrics.avg_loss)}
                </span>
              </div>
            </div>
          </div>

          {/* Risk Metrics Card */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Risk Metrics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Max Drawdown</span>
                <span className="font-medium">{formatCurrency(metrics.max_drawdown)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sharpe Ratio</span>
                <span className="font-medium">{metrics.sharpe_ratio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Hold Time</span>
                <span className="font-medium">{metrics.average_hold_time_days.toFixed(1)} days</span>
              </div>
            </div>
          </div>

          {/* Trade Distribution Card */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Trade Distribution</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Long Trades</span>
                <span className="font-medium">{metrics.long_trades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Short Trades</span>
                <span className="font-medium">{metrics.short_trades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Long PnL</span>
                <span className={`font-medium ${metrics.long_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.long_pnl)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Short PnL</span>
                <span className={`font-medium ${metrics.short_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.short_pnl)}
                </span>
              </div>
            </div>
          </div>

          {/* Streaks Card */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Winning/Losing Streaks</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Max Win Streak</span>
                <span className="font-medium text-green-600">
                  {metrics.max_consecutive_wins}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Max Loss Streak</span>
                <span className="font-medium text-red-600">
                  {metrics.max_consecutive_losses}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-gray-500 py-4">No performance data available</div>
      )}
    </div>
  );
} 