"use client";

import { useState, useEffect } from 'react';
import { api } from '../../lib/api-client';
import { formatCurrency, formatPercentage, formatDate } from '../../lib/api-utils';
import Link from 'next/link';

/**
 * Trade interface matching the backend model
 */
export interface Trade {
  id: number;
  order_id: number;
  farm_id: number;
  agent_id?: number;
  exchange: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  fee?: number;
  fee_currency?: string;
  total_value: number;
  profit_loss?: number;
  profit_loss_percent?: number;
  executed_at: string;
  strategy_id?: number;
  external_id?: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    trade_type?: 'entry' | 'exit' | 'partial';
    position_id?: number;
    exit_reason?: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'manual' | 'signal' | 'liquidation';
    market_conditions?: Record<string, any>;
    tags?: string[];
    is_backtest?: boolean;
  };
}

/**
 * Trade list properties
 */
interface TradeListProps {
  farmId?: number;
  agentId?: number;
  limit?: number;
  showFilters?: boolean;
  showPagination?: boolean;
  className?: string;
}

/**
 * Trade list component for displaying trades with filtering and pagination
 */
export function TradeList({
  farmId,
  agentId,
  limit = 10,
  showFilters = true,
  showPagination = true,
  className = '',
}: TradeListProps) {
  // State for trade data
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for pagination
  const [page, setPage] = useState(1);
  const [totalTrades, setTotalTrades] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // State for filters
  const [symbol, setSymbol] = useState<string>('');
  const [side, setSide] = useState<'' | 'buy' | 'sell'>('');
  const [dateRange, setDateRange] = useState<string>('7d'); // '1d', '7d', '30d', '90d', 'all'
  const [sortBy, setSortBy] = useState<string>('executed_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Available symbols for filtering
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);

  // Fetch trade data from API
  useEffect(() => {
    async function fetchTrades() {
      try {
        setLoading(true);
        
        // Build query parameters
        const params: Record<string, any> = {
          limit,
          offset: (page - 1) * limit,
          sort_by: sortBy,
          sort_order: sortOrder,
        };
        
        // Add optional filters
        if (farmId) params.farm_id = farmId;
        if (agentId) params.agent_id = agentId;
        if (symbol) params.symbol = symbol;
        if (side) params.side = side;
        
        // Add date range filter if not 'all'
        if (dateRange !== 'all') {
          const days = parseInt(dateRange.replace('d', ''));
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - days);
          params.from_date = fromDate.toISOString().split('T')[0];
        }
        
        // Fetch trades
        const response = await api.getTrades(params);
        
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          setTrades(response.data);
          
          // Update pagination info if available
          if (response.pagination) {
            setTotalTrades(response.pagination.total);
            setTotalPages(Math.ceil(response.pagination.total / limit));
          }
          
          // Extract unique symbols for filter dropdown
          if (response.data.length > 0) {
            const symbols = [...new Set(response.data.map(trade => trade.symbol))];
            setAvailableSymbols(symbols);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trades');
      } finally {
        setLoading(false);
      }
    }
    
    fetchTrades();
  }, [farmId, agentId, page, limit, symbol, side, dateRange, sortBy, sortOrder]);

  /**
   * Handle sort change
   */
  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field with default desc order
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  /**
   * Sort indicator component
   */
  const SortIndicator = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    
    return (
      <span className="ml-1">
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  /**
   * Render loading state
   */
  if (loading && trades.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-8 text-center ${className}`}>
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading trades...</p>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error && trades.length === 0) {
    return (
      <div className={`bg-red-50 border border-red-200 text-red-700 p-4 rounded ${className}`}>
        <p className="font-medium">Error loading trades</p>
        <p>{error}</p>
      </div>
    );
  }

  /**
   * Render empty state
   */
  if (trades.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-8 text-center ${className}`}>
        <p className="text-gray-500">No trades found</p>
        {showFilters && (
          <p className="mt-2 text-sm text-gray-400">
            Try adjusting your filters to see more results
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Filter controls */}
      {showFilters && (
        <div className="p-4 border-b grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Symbol filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            >
              <option value="">All Symbols</option>
              {availableSymbols.map(sym => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </div>
          
          {/* Side filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Side</label>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value as '' | 'buy' | 'sell')}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            >
              <option value="">All</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          
          {/* Date range filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          {/* Sort filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            >
              <option value="executed_at-desc">Date (Newest)</option>
              <option value="executed_at-asc">Date (Oldest)</option>
              <option value="price-desc">Price (Highest)</option>
              <option value="price-asc">Price (Lowest)</option>
              <option value="total_value-desc">Value (Highest)</option>
              <option value="total_value-asc">Value (Lowest)</option>
              {/* Show profit/loss options only when data might have closed trades */}
              {trades.some(t => t.profit_loss !== undefined) && (
                <>
                  <option value="profit_loss-desc">P&L (Highest)</option>
                  <option value="profit_loss-asc">P&L (Lowest)</option>
                </>
              )}
            </select>
          </div>
        </div>
      )}
      
      {/* Trade Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('executed_at')}>
                Date <SortIndicator field="executed_at" />
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('symbol')}>
                Symbol <SortIndicator field="symbol" />
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('side')}>
                Side <SortIndicator field="side" />
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('price')}>
                Price <SortIndicator field="price" />
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('quantity')}>
                Quantity <SortIndicator field="quantity" />
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('total_value')}>
                Value <SortIndicator field="total_value" />
              </th>
              {trades.some(t => t.profit_loss !== undefined) && (
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('profit_loss')}>
                  P&L <SortIndicator field="profit_loss" />
                </th>
              )}
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exchange
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(trade.executed_at, { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link href={`/dashboard/market-data?symbol=${trade.symbol}`} className="text-primary hover:underline">
                    {trade.symbol}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    trade.side === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {trade.side.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  {formatCurrency(trade.price, 'USD', { maximumFractionDigits: 8 })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {trade.quantity.toLocaleString('en-US', { maximumFractionDigits: 8 })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  {formatCurrency(trade.total_value)}
                </td>
                {trades.some(t => t.profit_loss !== undefined) && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    {trade.profit_loss !== undefined ? (
                      <span className={`${trade.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                        {formatCurrency(trade.profit_loss)}
                        {trade.profit_loss_percent !== undefined && (
                          <span className="text-xs ml-1">
                            ({trade.profit_loss_percent >= 0 ? '+' : ''}{formatPercentage(trade.profit_loss_percent)})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {trade.exchange}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalTrades)} of {totalTrades} trades
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className={`px-3 py-1 rounded text-sm ${
                page <= 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Previous
            </button>
            
            {/* Page number buttons */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Calculate page numbers to show
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (page > 3) {
                    pageNum = page - 3 + i;
                  }
                  if (page > totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  }
                }
                
                if (pageNum <= totalPages) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 rounded text-sm ${
                        page === pageNum ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                return null;
              })}
            </div>
            
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className={`px-3 py-1 rounded text-sm ${
                page >= totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Default export for the component
 */
export default TradeList; 