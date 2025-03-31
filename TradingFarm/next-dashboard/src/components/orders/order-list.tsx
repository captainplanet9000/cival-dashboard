"use client";

import { useState, useEffect } from 'react';
import { api } from '../../lib/api-client';
import { formatCurrency, formatDate, formatApiError } from '../../lib/api-utils';
import Link from 'next/link';

/**
 * Order interface matching the backend model
 */
export interface Order {
  id: number;
  farm_id: number;
  agent_id?: number;
  exchange: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
  status: 'pending' | 'open' | 'filled' | 'partially_filled' | 'canceled' | 'rejected' | 'expired';
  quantity: number;
  filled_quantity?: number;
  remaining_quantity?: number;
  price?: number;
  stop_price?: number;
  average_fill_price?: number;
  total_value?: number;
  filled_value?: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  external_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Order list properties
 */
interface OrderListProps {
  farmId?: number;
  agentId?: number;
  limit?: number;
  showFilters?: boolean;
  showPagination?: boolean;
  className?: string;
}

/**
 * Order list component for displaying orders with filtering and pagination
 */
export function OrderList({
  farmId,
  agentId,
  limit = 10,
  showFilters = true,
  showPagination = true,
  className = '',
}: OrderListProps) {
  // State for order data
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for pagination
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // State for filters
  const [symbol, setSymbol] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [side, setSide] = useState<string>('');
  const [orderType, setOrderType] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Available symbols for filtering
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);

  // Fetch order data from API
  useEffect(() => {
    async function fetchOrders() {
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
        if (status) params.status = status;
        if (orderType) params.type = orderType;
        
        // Fetch orders
        const response = await api.getOrders(params);
        
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          setOrders(response.data);
          
          // Update pagination info if available
          if (response.pagination) {
            setTotalOrders(response.pagination.total);
            setTotalPages(Math.ceil(response.pagination.total / limit));
          }
          
          // Extract unique symbols for filter dropdown
          if (response.data.length > 0) {
            const symbols = [...new Set(response.data.map(order => order.symbol))];
            setAvailableSymbols(symbols);
          }
        }
      } catch (err) {
        setError(formatApiError(err));
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrders();
  }, [farmId, agentId, page, limit, symbol, status, side, orderType, sortBy, sortOrder]);

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
   * Status badge component
   */
  const StatusBadge = ({ status }: { status: Order['status'] }) => {
    const statusStyles: Record<Order['status'], string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      open: 'bg-blue-100 text-blue-800',
      filled: 'bg-green-100 text-green-800',
      partially_filled: 'bg-indigo-100 text-indigo-800',
      canceled: 'bg-gray-100 text-gray-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-600',
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  /**
   * Render loading state
   */
  if (loading && orders.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-8 text-center ${className}`}>
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading orders...</p>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error && orders.length === 0) {
    return (
      <div className={`bg-red-50 border border-red-200 text-red-700 p-4 rounded ${className}`}>
        <p className="font-medium">Error loading orders</p>
        <p>{error}</p>
      </div>
    );
  }

  /**
   * Render empty state
   */
  if (orders.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-8 text-center ${className}`}>
        <p className="text-gray-500">No orders found</p>
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
          
          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="open">Open</option>
              <option value="filled">Filled</option>
              <option value="partially_filled">Partially Filled</option>
              <option value="canceled">Canceled</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          
          {/* Side filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Side</label>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            >
              <option value="">All</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          
          {/* Order type filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            >
              <option value="">All Types</option>
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="stop">Stop</option>
              <option value="stop_limit">Stop Limit</option>
              <option value="trailing_stop">Trailing Stop</option>
            </select>
          </div>
        </div>
      )}
      
      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('created_at')}>
                Date <SortIndicator field="created_at" />
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('symbol')}>
                Symbol <SortIndicator field="symbol" />
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('side')}>
                Side <SortIndicator field="side" />
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('type')}>
                Type <SortIndicator field="type" />
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('status')}>
                Status <SortIndicator field="status" />
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('quantity')}>
                Quantity <SortIndicator field="quantity" />
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('price')}>
                Price <SortIndicator field="price" />
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exchange
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(order.created_at, { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link href={`/dashboard/market-data?symbol=${order.symbol}`} className="text-primary hover:underline">
                    {order.symbol}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.side === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {order.side.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {order.type.replace('_', ' ').toUpperCase()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {order.quantity.toLocaleString('en-US', { maximumFractionDigits: 8 })}
                  {order.filled_quantity !== undefined && order.filled_quantity > 0 && (
                    <span className="text-xs text-gray-400 ml-1">
                      ({order.filled_quantity.toLocaleString('en-US', { maximumFractionDigits: 8 })} filled)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  {order.price 
                    ? formatCurrency(order.price, 'USD', { maximumFractionDigits: 8 })
                    : (order.type === 'market' ? 'Market Price' : '-')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {order.exchange}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {/* Only show cancel button for open or pending orders */}
                  {(order.status === 'open' || order.status === 'pending' || order.status === 'partially_filled') && (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to cancel this ${order.symbol} ${order.side} order?`)) {
                          api.cancelOrder(order.id)
                            .then(() => {
                              // Refresh orders after cancel
                              setOrders(orders.map(o => 
                                o.id === order.id ? { ...o, status: 'canceled' } : o
                              ));
                            })
                            .catch(err => {
                              alert(`Failed to cancel order: ${formatApiError(err)}`);
                            });
                        }
                      }}
                      className="text-red-600 hover:text-red-800 font-medium text-xs"
                    >
                      Cancel
                    </button>
                  )}
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
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalOrders)} of {totalOrders} orders
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
export default OrderList; 