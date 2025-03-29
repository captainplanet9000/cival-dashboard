"use client";

import { useEffect, useState } from "react";
import { tradeApi } from "../../../../lib/api-client";
import Link from "next/link";

interface TradeMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  totalProfitLoss: number;
  averageProfitLoss: number;
  maxProfit: number;
  maxLoss: number;
  profitLossRatio: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  averageWinAmount: number;
  averageLossAmount: number;
  volumeDistribution: {
    [symbol: string]: number;
  };
  performanceByMonth: {
    month: string;
    totalProfitLoss: number;
    winRate: number;
  }[];
}

export default function TradeMetricsPage() {
  const [metrics, setMetrics] = useState<TradeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    farmId: 'all',
    agentId: 'all',
    symbol: '',
    period: '30d' // '7d', '30d', '90d', '1y', 'all'
  });

  useEffect(() => {
    async function fetchTradeMetrics() {
      setLoading(true);
      
      const params: any = {};
      
      // Apply filters if not set to 'all'
      if (filters.farmId !== 'all') {
        params.farmId = Number(filters.farmId);
      }
      
      if (filters.agentId !== 'all') {
        params.agentId = Number(filters.agentId);
      }
      
      if (filters.symbol) {
        params.symbol = filters.symbol;
      }
      
      // Period filter
      if (filters.period !== 'all') {
        params.period = filters.period;
      }
      
      try {
        const response = await tradeApi.getTradeMetrics(params);
        
        if (response.error) {
          throw new Error(response.error);
        } else if (response.data) {
          setMetrics(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trade metrics");
      } finally {
        setLoading(false);
      }
    }

    fetchTradeMetrics();
  }, [filters]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Analyzing trade data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-red-800">Error Loading Trade Metrics</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">No trade metrics available</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trade Metrics & Analysis</h1>
          <p className="text-gray-500">In-depth analysis of your trading performance</p>
        </div>
        <Link 
          href="/dashboard/trades" 
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          View Trades
        </Link>
      </div>

      {/* Filter section */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label htmlFor="farm-filter" className="block text-sm font-medium text-gray-700">Farm</label>
            <select
              id="farm-filter"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              value={filters.farmId}
              onChange={(e) => handleFilterChange('farmId', e.target.value)}
            >
              <option value="all">All Farms</option>
              <option value="1">Farm 1</option>
              <option value="2">Farm 2</option>
              <option value="3">Farm 3</option>
            </select>
          </div>
          <div>
            <label htmlFor="agent-filter" className="block text-sm font-medium text-gray-700">Agent</label>
            <select
              id="agent-filter"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              value={filters.agentId}
              onChange={(e) => handleFilterChange('agentId', e.target.value)}
            >
              <option value="all">All Agents</option>
              <option value="1">Agent 1</option>
              <option value="2">Agent 2</option>
              <option value="3">Agent 3</option>
            </select>
          </div>
          <div>
            <label htmlFor="symbol-filter" className="block text-sm font-medium text-gray-700">Symbol</label>
            <input
              id="symbol-filter"
              type="text"
              placeholder="e.g. BTC/USDT"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              value={filters.symbol}
              onChange={(e) => handleFilterChange('symbol', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="period-filter" className="block text-sm font-medium text-gray-700">Time Period</label>
            <select
              id="period-filter"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              value={filters.period}
              onChange={(e) => handleFilterChange('period', e.target.value)}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="ml-auto flex items-end">
            <button 
              className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
              onClick={() => setFilters({ farmId: 'all', agentId: 'all', symbol: '', period: '30d' })}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main metrics grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Total Trades"
          value={metrics.totalTrades.toString()}
          subtitle={`${metrics.winningTrades} winning / ${metrics.losingTrades} losing`}
          trend="neutral"
        />
        <MetricCard 
          title="Win Rate"
          value={`${metrics.winRate.toFixed(2)}%`}
          subtitle={`Target: >50%`}
          trend={metrics.winRate > 50 ? "up" : "down"}
        />
        <MetricCard 
          title="Profit Factor"
          value={metrics.profitFactor.toFixed(2)}
          subtitle={`Target: >1.5`}
          trend={metrics.profitFactor > 1.5 ? "up" : metrics.profitFactor > 1 ? "neutral" : "down"}
        />
        <MetricCard 
          title="Total P&L"
          value={`$${metrics.totalProfitLoss.toFixed(2)}`}
          subtitle={`Avg: $${metrics.averageProfitLoss.toFixed(2)} per trade`}
          trend={metrics.totalProfitLoss > 0 ? "up" : "down"}
        />
      </div>

      {/* Secondary metrics grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Trade Performance Stats */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Trade Performance</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Max Profit</p>
                <p className="text-sm font-medium text-green-600">${metrics.maxProfit.toFixed(2)}</p>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-green-500" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Average Win</p>
                <p className="text-sm font-medium text-green-600">${metrics.averageWinAmount.toFixed(2)}</p>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div 
                  className="h-full rounded-full bg-green-500" 
                  style={{ width: `${(metrics.averageWinAmount / metrics.maxProfit) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Average Loss</p>
                <p className="text-sm font-medium text-red-600">${Math.abs(metrics.averageLossAmount).toFixed(2)}</p>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div 
                  className="h-full rounded-full bg-red-500" 
                  style={{ width: `${(Math.abs(metrics.averageLossAmount) / Math.abs(metrics.maxLoss)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Max Loss</p>
                <p className="text-sm font-medium text-red-600">${Math.abs(metrics.maxLoss).toFixed(2)}</p>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-red-500" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Profit/Loss Ratio</p>
                <p className={`text-sm font-medium ${metrics.profitLossRatio >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.profitLossRatio.toFixed(2)}:1
                </p>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {metrics.profitLossRatio >= 2 ? 'Excellent' : 
                  metrics.profitLossRatio >= 1.5 ? 'Good' : 
                  metrics.profitLossRatio >= 1 ? 'Acceptable' : 'Needs Improvement'}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Consecutive Wins/Losses</p>
                <p className="text-sm font-medium text-gray-900">
                  <span className="text-green-600">{metrics.consecutiveWins}</span>
                  <span className="text-gray-400"> / </span>
                  <span className="text-red-600">{metrics.consecutiveLosses}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Volume Distribution */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Volume Distribution</h2>
          {Object.keys(metrics.volumeDistribution).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(metrics.volumeDistribution)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([symbol, volume], index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{symbol}</p>
                      <p className="text-sm text-gray-500">{Math.round(volume * 100) / 100} units</p>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div 
                        className="h-full rounded-full bg-blue-500" 
                        style={{ width: `${(volume / Object.entries(metrics.volumeDistribution)[0][1]) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              }
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center">
              <p className="text-gray-500">No volume data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Performance */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-medium text-gray-900">Monthly Performance</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">P&L</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Win Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {metrics.performanceByMonth.length > 0 ? (
                metrics.performanceByMonth.map((month, index) => (
                  <tr key={index}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {month.month}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-sm ${month.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${month.totalProfitLoss.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {(month.winRate * 100).toFixed(1)}%
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                          <div 
                            className={`h-full rounded-full ${month.totalProfitLoss >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, Math.abs(month.totalProfitLoss / 10))}%` }}
                          ></div>
                        </div>
                        <span className={`ml-2 text-xs font-medium ${month.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {month.totalProfitLoss >= 0 ? 'Profit' : 'Loss'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No monthly performance data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium text-gray-900">Trading Recommendations</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <RecommendationCard 
            title="Risk Management"
            status={metrics.profitLossRatio >= 1.5 ? "good" : metrics.profitLossRatio >= 1 ? "fair" : "poor"}
            recommendations={[
              metrics.profitLossRatio < 1 ? "Reduce position sizes to limit losses" : null,
              metrics.maxLoss < -500 ? "Consider implementing tighter stop losses" : null,
              metrics.consecutiveLosses > 5 ? "Implement a trading break after consecutive losses" : null,
              "Maintain risk per trade at 1-2% of account"
            ].filter(Boolean) as string[]}
          />
          <RecommendationCard 
            title="Performance Optimization"
            status={metrics.winRate >= 60 ? "good" : metrics.winRate >= 50 ? "fair" : "poor"}
            recommendations={[
              metrics.winRate < 50 ? "Review entry criteria for greater accuracy" : null,
              metrics.averageWinAmount < Math.abs(metrics.averageLossAmount) ? "Let profits run longer" : null,
              metrics.profitFactor < 1 ? "Focus on improving overall profit factor" : null,
              "Continue tracking performance metrics"
            ].filter(Boolean) as string[]}
          />
          <RecommendationCard 
            title="Market Selection"
            status="info"
            recommendations={
              Object.entries(metrics.volumeDistribution)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([symbol]) => `Consider focusing on ${symbol} trading`)
                .concat(["Diversify across multiple markets", "Watch for correlation between positions"])
            }
          />
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  trend: "up" | "down" | "neutral";
}

function MetricCard({ title, value, subtitle, trend }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {trend === "up" && (
          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">↑</span>
        )}
        {trend === "down" && (
          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">↓</span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

interface RecommendationCardProps {
  title: string;
  status: "good" | "fair" | "poor" | "info";
  recommendations: string[];
}

function RecommendationCard({ title, status, recommendations }: RecommendationCardProps) {
  let statusColor;
  let statusIcon;
  
  switch (status) {
    case "good":
      statusColor = "text-green-500";
      statusIcon = (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
      break;
    case "fair":
      statusColor = "text-yellow-500";
      statusIcon = (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
      break;
    case "poor":
      statusColor = "text-red-500";
      statusIcon = (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
      break;
    case "info":
    default:
      statusColor = "text-blue-500";
      statusIcon = (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center space-x-2">
        <span className={statusColor}>{statusIcon}</span>
        <h3 className="text-md font-medium text-gray-900">{title}</h3>
      </div>
      <ul className="mt-3 space-y-2">
        {recommendations.map((recommendation, index) => (
          <li key={index} className="flex items-start space-x-2">
            <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-600">
              {index + 1}
            </span>
            <span className="text-sm text-gray-700">{recommendation}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}