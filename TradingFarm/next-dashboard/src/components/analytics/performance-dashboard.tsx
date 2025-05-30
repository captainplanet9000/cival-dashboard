"use client";

import { useState, useEffect } from 'react';
import { api } from '../../lib/api-client';
import { formatCurrency, formatPercentage, formatDate } from '../../lib/api-utils';

/**
 * Performance data interface matching the backend model
 */
interface PerformanceData {
  summary: {
    total_profit_loss: number;
    win_rate: number;
    profit_factor: number;
    max_drawdown: number;
    sharpe_ratio?: number;
    total_trades: number;
    successful_trades: number;
    failed_trades: number;
    average_win: number;
    average_loss: number;
    largest_win: number;
    largest_loss: number;
    start_date: string;
    end_date: string;
  };
  time_series: {
    date: string;
    equity: number;
    drawdown: number;
    trades_count: number;
    profit_loss: number;
  }[];
  by_symbol: {
    symbol: string;
    trades_count: number;
    win_rate: number;
    profit_loss: number;
    average_win: number;
    average_loss: number;
  }[];
  by_strategy?: {
    strategy: string;
    trades_count: number;
    win_rate: number;
    profit_loss: number;
    average_win: number;
    average_loss: number;
  }[];
  monthly_performance: {
    month: string;
    trades_count: number;
    win_rate: number;
    profit_loss: number;
  }[];
}

/**
 * Performance dashboard properties
 */
interface PerformanceDashboardProps {
  farmId?: number;
  agentId?: number;
  startDate?: string;
  endDate?: string;
  className?: string;
}

/**
 * Performance dashboard component for displaying trade analytics
 */
export function PerformanceDashboard({
  farmId,
  agentId,
  startDate,
  endDate,
  className = '',
}: PerformanceDashboardProps) {
  // State for performance data
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date range state
  const [dateRange, setDateRange] = useState<'1w' | '1m' | '3m' | '6m' | '1y' | 'all'>('3m');
  const [customRange, setCustomRange] = useState({
    start: startDate || '',
    end: endDate || ''
  });

  // Fetch performance data from API
  useEffect(() => {
    async function fetchPerformanceData() {
      try {
        setLoading(true);
        
        // Build query parameters
        const params: Record<string, any> = {};
        
        // Add entity filters
        if (farmId) params.farm_id = farmId;
        if (agentId) params.agent_id = agentId;
        
        // Add date range
        if (customRange.start && customRange.end) {
          // Using custom date range
          params.start_date = customRange.start;
          params.end_date = customRange.end;
        } else {
          // Using predefined range
          const now = new Date();
          let fromDate = new Date();
          
          switch (dateRange) {
            case '1w':
              fromDate.setDate(now.getDate() - 7);
              break;
            case '1m':
              fromDate.setMonth(now.getMonth() - 1);
              break;
            case '3m':
              fromDate.setMonth(now.getMonth() - 3);
              break;
            case '6m':
              fromDate.setMonth(now.getMonth() - 6);
              break;
            case '1y':
              fromDate.setFullYear(now.getFullYear() - 1);
              break;
            case 'all':
            default:
              // Don't set date filters for "all time"
              break;
          }
          
          if (dateRange !== 'all') {
            params.start_date = fromDate.toISOString().split('T')[0];
            params.end_date = now.toISOString().split('T')[0];
          }
        }
        
        // Fetch performance data
        const response = await api.getPerformanceAnalytics(params);
        
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          setData(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load performance data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPerformanceData();
  }, [farmId, agentId, dateRange, customRange.start, customRange.end]);

  /**
   * Handle date range change
   */
  const handleDateRangeChange = (range: '1w' | '1m' | '3m' | '6m' | '1y' | 'all') => {
    setDateRange(range);
    // Clear custom range when using predefined ranges
    setCustomRange({ start: '', end: '' });
  };

  /**
   * Render loading state
   */
  if (loading && !data) {
    return (
      <div className={`bg-white rounded-lg shadow p-8 text-center ${className}`}>
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading performance data...</p>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error && !data) {
    return (
      <div className={`bg-red-50 border border-red-200 text-red-700 p-4 rounded ${className}`}>
        <p className="font-medium">Error loading performance data</p>
        <p>{error}</p>
      </div>
    );
  }

  /**
   * Render empty state
   */
  if (!data) {
    return (
      <div className={`bg-white rounded-lg shadow p-8 text-center ${className}`}>
        <p className="text-gray-500">No performance data available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Date range selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-medium text-gray-700">Time Period:</h3>
          
          <div className="flex flex-wrap">
            <button
              onClick={() => handleDateRangeChange('1w')}
              className={`px-3 py-1 text-sm rounded-l ${
                dateRange === '1w' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              1W
            </button>
            <button
              onClick={() => handleDateRangeChange('1m')}
              className={`px-3 py-1 text-sm ${
                dateRange === '1m' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              1M
            </button>
            <button
              onClick={() => handleDateRangeChange('3m')}
              className={`px-3 py-1 text-sm ${
                dateRange === '3m' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              3M
            </button>
            <button
              onClick={() => handleDateRangeChange('6m')}
              className={`px-3 py-1 text-sm ${
                dateRange === '6m' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              6M
            </button>
            <button
              onClick={() => handleDateRangeChange('1y')}
              className={`px-3 py-1 text-sm ${
                dateRange === '1y' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              1Y
            </button>
            <button
              onClick={() => handleDateRangeChange('all')}
              className={`px-3 py-1 text-sm rounded-r ${
                dateRange === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            <div>
              <label htmlFor="start-date" className="sr-only">Start Date</label>
              <input
                id="start-date"
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <span className="text-gray-500">to</span>
            <div>
              <label htmlFor="end-date" className="sr-only">End Date</label>
              <input
                id="end-date"
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <button
              onClick={() => {
                if (customRange.start && customRange.end) {
                  // Reset date range button selection when using custom range
                  setDateRange('3m');
                }
              }}
              disabled={!customRange.start || !customRange.end}
              className="px-3 py-1 text-sm bg-gray-800 text-white rounded disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
      
      {/* Performance summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Performance Summary</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard 
            title="Total P&L" 
            value={formatCurrency(data.summary.total_profit_loss)}
            valueClass={data.summary.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}
          />
          <StatCard 
            title="Win Rate" 
            value={formatPercentage(data.summary.win_rate)}
          />
          <StatCard 
            title="Profit Factor" 
            value={data.summary.profit_factor.toFixed(2)}
            tooltip="Gross profit divided by gross loss"
          />
          <StatCard 
            title="Max Drawdown" 
            value={formatPercentage(data.summary.max_drawdown)}
            valueClass="text-red-600"
          />
          {data.summary.sharpe_ratio !== undefined && (
            <StatCard 
              title="Sharpe Ratio" 
              value={data.summary.sharpe_ratio.toFixed(2)}
              tooltip="Risk-adjusted return measure"
            />
          )}
          <StatCard 
            title="Total Trades" 
            value={data.summary.total_trades.toString()}
          />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <StatCard 
            title="Successful Trades" 
            value={data.summary.successful_trades.toString()}
            subtitle={`${formatPercentage(data.summary.win_rate)} win rate`}
            valueClass="text-green-600"
          />
          <StatCard 
            title="Failed Trades" 
            value={data.summary.failed_trades.toString()}
            subtitle={`${formatPercentage(100 - data.summary.win_rate)} loss rate`}
            valueClass="text-red-600"
          />
          <StatCard 
            title="Average Win" 
            value={formatCurrency(data.summary.average_win)}
            valueClass="text-green-600"
          />
          <StatCard 
            title="Average Loss" 
            value={formatCurrency(Math.abs(data.summary.average_loss))}
            valueClass="text-red-600"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <StatCard 
            title="Largest Win" 
            value={formatCurrency(data.summary.largest_win)}
            valueClass="text-green-600"
          />
          <StatCard 
            title="Largest Loss" 
            value={formatCurrency(Math.abs(data.summary.largest_loss))}
            valueClass="text-red-600"
          />
          <StatCard 
            title="Trading Period" 
            value={`${formatDate(data.summary.start_date, { dateStyle: 'medium' })} - ${formatDate(data.summary.end_date, { dateStyle: 'medium' })}`}
            valueClass="text-gray-700"
          />
        </div>
      </div>
      
      {/* Performance by symbol */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">Performance by Symbol</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trades
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Win Rate
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P&L
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Win
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Loss
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.by_symbol.map((item) => (
                <tr key={item.symbol} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                    {item.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.trades_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatPercentage(item.win_rate)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(item.profit_loss)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {formatCurrency(item.average_win)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    {formatCurrency(Math.abs(item.average_loss))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Monthly performance */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">Monthly Performance</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trades
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Win Rate
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P&L
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.monthly_performance.map((item) => (
                <tr key={item.month} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                    {formatMonthYear(item.month)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.trades_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatPercentage(item.win_rate)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(item.profit_loss)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Strategy performance (if available) */}
      {data.by_strategy && data.by_strategy.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium">Performance by Strategy</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Strategy
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trades
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Win
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Loss
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.by_strategy.map((item) => (
                  <tr key={item.strategy} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                      {item.strategy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.trades_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatPercentage(item.win_rate)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      item.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(item.profit_loss)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(item.average_win)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {formatCurrency(Math.abs(item.average_loss))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to format month-year string (YYYY-MM to Month Year)
 */
function formatMonthYear(dateString: string): string {
  const [year, month] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Statistic card component
 */
interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  tooltip?: string;
  valueClass?: string;
}

function StatCard({ title, value, subtitle, tooltip, valueClass = '' }: StatCardProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg" title={tooltip}>
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className={`text-xl font-semibold mt-1 ${valueClass}`}>{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

/**
 * Default export for the component
 */
export default PerformanceDashboard; 