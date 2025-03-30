"use client";

import { useEffect, useState } from "react";
import { orderApi, tradeApi, Order, Trade } from "../../../../lib/api-client";
import Link from "next/link";

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrderData() {
      setLoading(true);
      const orderId = parseInt(params.id, 10);
      
      if (isNaN(orderId)) {
        setError("Invalid order ID");
        setLoading(false);
        return;
      }
      
      try {
        // Fetch the order details
        const orderResponse = await orderApi.getOrder(orderId);
        
        if (orderResponse.error) {
          throw new Error(orderResponse.error);
        }
        
        setOrder(orderResponse.data || null);
        
        // Fetch trades for this order
        const tradesResponse = await tradeApi.getTrades({ orderId });
        
        if (!tradesResponse.error && tradesResponse.data) {
          setTrades(tradesResponse.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order data");
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrderData();
  }, [params.id]);

  async function handleCancelOrder() {
    if (!order) return;
    
    if (confirm("Are you sure you want to cancel this order?")) {
      setLoading(true);
      const response = await orderApi.cancelOrder(order.id);
      
      if (response.error) {
        setError(response.error);
      } else {
        // Refresh order data
        const refreshedOrder = await orderApi.getOrder(order.id);
        if (!refreshedOrder.error && refreshedOrder.data) {
          setOrder(refreshedOrder.data);
        }
      }
      
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-red-800">Error Loading Order</h3>
          <p className="text-red-600">{error}</p>
          <Link href="/dashboard/orders" className="mt-4 inline-block text-blue-600 hover:underline">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold text-gray-800">Order Not Found</h3>
          <p className="mb-4 text-gray-600">The requested order could not be found.</p>
          <Link href="/dashboard/orders" className="text-blue-600 hover:underline">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Order Header */}
      <div className="mb-8 flex flex-col items-start justify-between space-y-4 sm:flex-row sm:space-y-0">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <Link href="/dashboard/orders" className="text-blue-600 hover:underline">
              Orders
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-gray-500">
            {order.side.toUpperCase()} {order.quantity} {order.symbol} @ {order.price ? `$${order.price.toFixed(2)}` : 'Market Price'}
          </p>
        </div>
        <div className="flex gap-2">
          {['new', 'open', 'partially_filled'].includes(order.status) && (
            <button 
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              onClick={handleCancelOrder}
            >
              Cancel Order
            </button>
          )}
          <Link 
            href={`/dashboard/farms/${order.farm_id}`}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View Farm
          </Link>
        </div>
      </div>

      {/* Order Details */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Order Info */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Order Information</h2>
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <p className="text-sm text-gray-500">Symbol</p>
              <p className="text-base font-medium text-gray-900">{order.symbol}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Side</p>
              <p className="text-base font-medium text-gray-900">
                <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${order.side === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {order.side.toUpperCase()}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Quantity</p>
              <p className="text-base font-medium text-gray-900">{order.quantity}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Price</p>
              <p className="text-base font-medium text-gray-900">{order.price ? `$${order.price.toFixed(2)}` : 'Market'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-base font-medium text-gray-900">
                <OrderStatusBadge status={order.status} />
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="text-base font-medium text-gray-900">
                {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Updated</p>
              <p className="text-base font-medium text-gray-900">
                {order.updated_at ? new Date(order.updated_at).toLocaleString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Farm</p>
              <p className="text-base font-medium text-gray-900">
                <Link href={`/dashboard/farms/${order.farm_id}`} className="text-blue-600 hover:underline">
                  Farm {order.farm_id}
                </Link>
              </p>
            </div>
            {order.agent_id && (
              <div>
                <p className="text-sm text-gray-500">Agent</p>
                <p className="text-base font-medium text-gray-900">
                  <Link href={`/dashboard/agents/${order.agent_id}`} className="text-blue-600 hover:underline">
                    Agent {order.agent_id}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Order Execution Visualization */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Order Execution</h2>
          <div className="flex flex-col items-center justify-center h-full">
            {order.status === 'filled' ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-500">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Order Fully Executed</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {order.quantity} {order.symbol} {order.side === 'buy' ? 'bought' : 'sold'} at {order.price ? `$${order.price.toFixed(2)}` : 'market price'}
                </p>
              </div>
            ) : order.status === 'partially_filled' ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-yellow-500">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Order Partially Filled</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {trades.reduce((acc, trade) => acc + trade.quantity, 0)} of {order.quantity} {order.symbol} executed
                </p>
              </div>
            ) : ['new', 'open'].includes(order.status) ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-500">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Order {order.status === 'new' ? 'Placed' : 'Active'}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Waiting for execution on the market
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Order {order.status.replace('_', ' ').toUpperCase()}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No execution data available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trades Section */}
      {(['filled', 'partially_filled'].includes(order.status) && trades.length > 0) && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">Execution Trades</h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Trade ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date/Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {trades.map((trade) => (
                  <tr key={trade.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      #{trade.id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{trade.quantity}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      ${trade.price ? trade.price.toFixed(2) : 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {trade.executed_at ? new Date(trade.executed_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-sm ${(trade.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${trade.profit_loss ? trade.profit_loss.toFixed(2) : '0.00'}
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