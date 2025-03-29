"use client";

import { useEffect, useState } from "react";
import { tradeApi, Trade } from "../../../lib/api-client";
import Link from "next/link";

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    symbol: '',
    farmId: 'all',
    agentId: 'all',
    dateRange: '7d' // '24h', '7d', '30d', '90d', 'all'
  });

  useEffect(() => {
    async function fetchTrades() {
      setLoading(true);
      
      const params: any = {
        limit: 100,
        offset: 0
      };
      
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
      
      // Date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        let daysAgo;
        
        switch (filters.dateRange) {
          case '24h':
            daysAgo = 1;
            break;
          case '7d':
            daysAgo = 7;
            break;
          case '30d':
            daysAgo = 30;
            break;
          case '90d':
            daysAgo = 90;
            break;
          default:
            daysAgo = 0;
        }
        
        if (daysAgo > 0) {
          const startDate = new Date();
          startDate.setDate(now.getDate() - daysAgo);
          params.startDate = startDate.toISOString();
        }
      }
      
      const response = await tradeApi.getTrades(params);
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setTrades(response.data);
      }
      
      setLoading(false);
    }

    fetchTrades();
  }, [filters]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Calculate performance metrics
  const calculateTradeSummary = () => {
    if (trades.length === 0) return null;
    
    const totalTrades = trades.length;
    const winningTrades = trades.filter(trade => (trade.profit_loss || 0) > 0).length;
    const losingTrades = trades.filter(trade => (trade.profit_loss || 0) < 0).length;
    const breakEvenTrades = totalTrades - winningTrades - losingTrades;
    
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    const totalProfitLoss = trades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0);
    const totalWinnings = trades.filter(trade => (trade.profit_loss || 0) > 0)
      .reduce((sum, trade) => sum + (trade.profit_loss || 0), 0);
    const totalLosses = Math.abs(trades.filter(trade => (trade.profit_loss || 0) < 0)
      .reduce((sum, trade) => sum + (trade.profit_loss || 0), 0));
    
    const profitFactor = totalLosses > 0 ? totalWinnings / totalLosses : totalWinnings > 0 ? Infinity : 0;
    
    const averageProfitLoss = totalTrades > 0 ? totalProfitLoss / totalTrades : 0;
    
    return {
      totalTrades,
      winningTrades,
      losingTrades,
      breakEvenTrades,
      winRate,
      totalProfitLoss,
      profitFactor,
      averageProfitLoss
    };
  };

  const tradeSummary = calculateTradeSummary();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading trades data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-red-800">Error Loading Trades</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trade History</h1>
          <p className="text-gray-500">View and analyze past trades</p>
        </div>
        <Link 
          href="/dashboard/analytics/trade-metrics" 
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Advanced Analytics
        </Link>
      </div>

      {/* Filter section */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
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
            <label htmlFor="date-range-filter" className="block text-sm font-medium text-gray-700">Time Period</label>
            <select
              id="date-range-filter"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="ml-auto flex items-end">
            <button 
              className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
              onClick={() => setFilters({ symbol: '', farmId: 'all', agentId: 'all', dateRange: '7d' })}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Trade performance summary */}
      {tradeSummary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Total Trades</p>
            <p className="text-2xl font-bold text-gray-900">{tradeSummary.totalTrades}</p>
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-xs font-medium text-green-500">{tradeSummary.winningTrades} winning</span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs font-medium text-red-500">{tradeSummary.losingTrades} losing</span>
              {tradeSummary.breakEvenTrades > 0 && (
                <>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs font-medium text-gray-500">{tradeSummary.breakEvenTrades} break-even</span>
                </>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Win Rate</p>
            <p className="text-2xl font-bold text-gray-900">{tradeSummary.winRate.toFixed(2)}%</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div 
                className="h-full rounded-full bg-green-500" 
                style={{ width: `${tradeSummary.winRate}%` }}
              ></div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Total P&L</p>
            <p className={`text-2xl font-bold ${tradeSummary.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${tradeSummary.totalProfitLoss.toFixed(2)}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Avg per trade: ${tradeSummary.averageProfitLoss.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Profit Factor</p>
            <p className="text-2xl font-bold text-gray-900">
              {tradeSummary.profitFactor === Infinity ? '∞' : tradeSummary.profitFactor.toFixed(2)}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {tradeSummary.profitFactor >= 2 ? 'Excellent' : 
                tradeSummary.profitFactor >= 1.5 ? 'Good' : 
                tradeSummary.profitFactor >= 1 ? 'Profitable' : 'Unprofitable'}
            </p>
          </div>
        </div>
      )}

      {/* Trades table */}
      {trades.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date/Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Side</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">P&L</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {trades.map((trade) => (
                <tr key={trade.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    #{trade.id}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {trade.executed_at ? new Date(trade.executed_at).toLocaleString() : 
                      trade.created_at ? new Date(trade.created_at).toLocaleString() : 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{trade.symbol}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${trade.side === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {trade.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{trade.quantity}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    ${trade.price ? trade.price.toFixed(2) : 'N/A'}
                  </td>
                  <td className={`whitespace-nowrap px-6 py-4 text-sm ${(trade.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${trade.profit_loss ? trade.profit_loss.toFixed(2) : '0.00'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <Link href={`/dashboard/orders/${trade.order_id}`} className="text-blue-600 hover:underline">
                      #{trade.order_id}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <h3 className="mb-1 text-lg font-medium text-gray-900">No Trades Found</h3>
          <p className="mb-4 text-sm text-gray-500">Try adjusting your filters or check back later</p>
        </div>
      )}
    </div>
  );
}