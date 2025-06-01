"use client";

import { useEffect, useState } from "react";
import { orderService, Order } from "@/services/order-service";
import Link from "next/link";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    farmId: 'all',
    agentId: 'all'
  });

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      
      const params: any = {
        limit: 50,
        offset: 0
      };
      
      // Apply filters if not set to 'all'
      if (filters.farmId !== 'all') {
        params.farmId = filters.farmId;
      }
      
      if (filters.agentId !== 'all') {
        params.agentId = filters.agentId;
      }
      
      if (filters.status !== 'all') {
        params.status = filters.status;
      }
      
      const response = await orderService.getOrders(params);
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setOrders(response.data);
      }
      
      setLoading(false);
    }

    fetchOrders();
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
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-red-800">Error Loading Orders</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500">Manage and monitor your trading orders</p>
        </div>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          + Create Order
        </button>
      </div>

      {/* Filter section */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="status-filter"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="open">Open</option>
              <option value="filled">Filled</option>
              <option value="partially_filled">Partially Filled</option>
              <option value="canceled">Canceled</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
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
          <div className="ml-auto flex items-end">
            <button 
              className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
              onClick={() => setFilters({ status: 'all', farmId: 'all', agentId: 'all' })}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Orders table */}
      {orders.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Side</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Farm</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    <Link href={`/dashboard/orders/${order.id}`} className="text-blue-600 hover:underline">
                      #{order.id}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{order.symbol}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${order.side === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {order.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{order.quantity}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    ${order.price ? order.price.toFixed(2) : 'Market'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <Link href={`/dashboard/farms/${order.farm_id}`} className="text-blue-600 hover:underline">
                      Farm {order.farm_id}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <Link href={`/dashboard/orders/${order.id}`} className="text-blue-600 hover:text-blue-900">
                        View
                      </Link>
                      {['new', 'open', 'partially_filled'].includes(order.status) && (
                        <button 
                          className="text-red-600 hover:text-red-900"
                          onClick={() => {
                            if (confirm('Are you sure you want to cancel this order?')) {
                              orderService.cancelOrder(order.id);
                              // Reload orders after cancellation
                              setTimeout(() => {
                                setFilters({ ...filters });
                              }, 500);
                            }
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <h3 className="mb-1 text-lg font-medium text-gray-900">No Orders Found</h3>
          <p className="mb-4 text-sm text-gray-500">Adjust your filters or create a new order</p>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Create Order
          </button>
        </div>
      )}
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  let bgColor, textColor;
  
  switch (status) {
    case 'new':
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-800';
      break;
    case 'open':
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
      break;
    case 'filled':
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      break;
    case 'partially_filled':
      bgColor = 'bg-indigo-100';
      textColor = 'text-indigo-800';
      break;
    case 'canceled':
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-800';
      break;
    case 'rejected':
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
      break;
    case 'expired':
      bgColor = 'bg-orange-100';
      textColor = 'text-orange-800';
      break;
    default:
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-800';
  }
  
  return (
    <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${bgColor} ${textColor}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}