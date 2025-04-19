/*
  Trading Farm Dashboard: Widget & Real-Time Extension Guide
  -----------------------------------------------------
  - To add a new widget:
    1. Add a <Widget> block in the grid layout below.
    2. Use TanStack Query for data fetching (see examples below).
    3. Use shadcn/ui components for layout, skeleton, error handling.
    4. For real-time, use useSupabaseRealtime or a websocket hook and update the query cache.
    5. For chart widgets, use AreaChartComponent, BarChartComponent, etc. from /components/ui/chart.
    6. See the "Sample Widget" at the bottom for a template.
*/
'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/utils/supabase/client';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { Card, CardContent } from '@/components/ui/card';
import { Widget } from '@/components/ui/widget';
import { BarChartComponent } from '@/components/ui/chart';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from 'react-error-boundary';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Navbar from './navbar';
import MobileNavigation from '@/components/mobile/MobileNavigation';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import PriceAlertSystem from '@/components/real-time/PriceAlertSystem';
import ExecutionNotifications from '@/components/real-time/ExecutionNotifications';
import { useSocket } from '@/providers/socket-provider';
import { usePositions } from '@/hooks/react-query/use-position-queries';
import ExchangeConnectionManager from '@/components/exchanges/ExchangeConnectionManager';
// Types for dashboard data
interface Agent {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'inactive';
  type: string;
  capabilities: string[];
  performance: {
    winRate: number;
    profitLoss: number;
  };
}

export default function DashboardPage() {
  // Supabase client
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const queryClient = useQueryClient();
  const { isConnected: socketConnected } = useSocket();
  // --- Market Overview ---
  const { data: marketOverview, isLoading: loadingMarket, error: errorMarket } = useQuery({
    queryKey: ['marketOverview'],
    queryFn: async () => {
      // Try to get from Supabase; fallback to exchange API if needed
      const { data, error } = await supabase.rpc('get_market_overview');
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });
  // --- Top Performing Assets ---
  const { data: topAssets, isLoading: loadingTopAssets, error: errorTopAssets } = useQuery({
    queryKey: ['topAssets'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_performing_assets');
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });
  // --- Recent Trades ---
  const { data: trades, isLoading: loadingTrades, error: errorTrades } = useQuery({
    queryKey: ['recentTrades'],
    queryFn: async () => {
      const { data, error } = await supabase.from('trades').select('*').order('executed_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });
  // Subscriptions now handled in connection status hooks below
  // --- Agents ---
  const { data: agents, isLoading: loadingAgents, error: errorAgents, refetch: refetchAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agents').select('*');
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });
  // --- Market Alerts ---
  // Assume PriceAlertSystem and ExecutionNotifications use their own hooks for real-time data
  // --- Connection Status ---
  const { isConnected: tradesConnected } = useSupabaseRealtime('trades', ['recentTrades']);
  const { isConnected: agentsConnected } = useSupabaseRealtime('agents', ['agents']);
  const { isConnected: marketConnected } = useSupabaseRealtime('market_tickers', ['marketOverview']);
  const { isConnected: assetsConnected } = useSupabaseRealtime('asset_performance', ['topAssets']);
  const { isConnected: ordersConnected } = useSupabaseRealtime('orders', ['openOrders']);
  const { data: openOrders, isLoading: loadingOpenOrders, error: errorOpenOrders } = useQuery({
    queryKey: ['openOrders'],
    queryFn: async () => {
      const res = await fetch('/api/trading/orders');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch open orders');
      return json.orders;
    },
    refetchInterval: 5000,
  });
  const { data: pnlMetrics, isLoading: loadingPnl, error: errorPnl } = useQuery({
    queryKey: ['pnlMetrics'],
    queryFn: async () => {
      const res = await fetch('/api/trading/pnl');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch P&L metrics');
      return json.metrics;
    },
    refetchInterval: 10000,
  });
  const { data: openPositionsData, isLoading: loadingPositions, error: errorPositions } = usePositions({ status: 'open' });
  const { isConnected: positionsConnected } = useSupabaseRealtime('positions', ['openPositions']);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <MobileNavigation />
      <div className="container mx-auto px-2 py-6">
        <div className="flex items-center justify-between mb-4">
          <Breadcrumbs />
          <ThemeToggle />
        </div>
        <ErrorBoundary fallback={<div className="text-red-500">Error loading dashboard.</div>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Market Overview */}
            <Widget title={<span className="flex items-center">Market Overview {marketConnected ? <span className="ml-2 h-2 w-2 rounded-full bg-green-500 inline-block" title="Live" /> : <span className="ml-2 h-2 w-2 rounded-full bg-red-500 inline-block" title="Disconnected" />}</span>} width="full" height="medium">
              {loadingMarket ? (
                <Skeleton className="h-48 w-full rounded" />
              ) : errorMarket ? (
                <div className="text-red-500">{errorMarket.message}</div>
              ) : (
                <div className="p-1">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {marketOverview?.map((asset: any) => (
                      <Card key={asset.symbol} className="bg-muted/40">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-muted-foreground">{asset.symbol}</p>
                              <h3 className="text-xl font-bold">{asset.price}</h3>
                              <p className={`text-xs ${asset.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>{asset.change24h}% (24h)</p>
                            </div>
                            <div className={`p-1.5 rounded ${asset.change24h >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}> 
                              {asset.change24h > 0 ? <ArrowUp className="h-5 w-5 text-green-500" /> : asset.change24h < 0 ? <ArrowDown className="h-5 w-5 text-red-500" /> : <ArrowRight className="h-5 w-5 text-muted-foreground" />}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </Widget>
            {/* Top Performing Assets */}
            <Widget title={<span className="flex items-center">Top Performing Assets {assetsConnected ? <span className="ml-2 h-2 w-2 rounded-full bg-green-500 inline-block" title="Live" /> : <span className="ml-2 h-2 w-2 rounded-full bg-red-500 inline-block" title="Disconnected" />}</span>} width="full" height="small">
              {loadingTopAssets ? (
                <Skeleton className="h-36 w-full rounded" />
              ) : errorTopAssets ? (
                <div className="text-red-500">{errorTopAssets.message}</div>
              ) : (
                <div className="p-1">
                  {/* Bar chart for top performing assets (7d performance) */}
                  <BarChartComponent
                    data={topAssets?.map((a: any) => ({ asset: a.asset, performance: a.performance })) || []}
                    height={150}
                    bars={[{ dataKey: 'performance', name: 'Performance %' }]}
                    xAxisDataKey="asset"
                    layout="vertical"
                    showLegend={false}
                    showGrid={true}
                    className="w-full"
                  />
                </div>
              )}
            </Widget>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Recent Trades */}
            <Widget title={<span className="flex items-center">Recent Trades {tradesConnected ? <span className="ml-2 h-2 w-2 rounded-full bg-green-500 inline-block" title="Live" /> : <span className="ml-2 h-2 w-2 rounded-full bg-red-500 inline-block" title="Disconnected" />}</span>} width="full" height="small">
              {loadingTrades ? (
                <Skeleton className="h-36 w-full rounded" />
              ) : errorTrades ? (
                <div className="text-red-500">{errorTrades.message}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Pair</th>
                        <th className="text-left p-2">Side</th>
                        <th className="text-left p-2">Price</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Value</th>
                        <th className="text-left p-2">Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades?.map((trade: any) => (
                        <tr key={trade.id} className="border-b">
                          <td className="p-2">{trade.executed_at ? new Date(trade.executed_at).toLocaleTimeString() : '-'}</td>
                          <td className="p-2">{trade.pair ?? trade.symbol ?? '-'}</td>
                          <td className={`p-2 ${trade.side?.toLowerCase() === 'buy' ? 'text-green-500' : 'text-red-500'}`}>{trade.side ? (trade.side.charAt(0).toUpperCase() + trade.side.slice(1)) : '-'}</td>
                          <td className="p-2">{trade.price ?? '-'}</td>
                          <td className="p-2">{trade.amount ?? trade.quantity ?? '-'}</td>
                          <td className="p-2">{trade.value ?? (trade.price && (trade.amount ?? trade.quantity) ? (trade.price * (trade.amount ?? trade.quantity)).toFixed(2) : '-')}</td>
                          <td className="p-2">{trade.agent_name ?? trade.agent_id ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Widget>
            {/* Market Alerts */}
            <Widget title={<span className="flex items-center">Market Alerts {socketConnected ? <span className="ml-2 h-2 w-2 rounded-full bg-green-500 inline-block" title="Live" /> : <span className="ml-2 h-2 w-2 rounded-full bg-red-500 inline-block" title="Disconnected" />}</span>} width="full" height="small">
              <div className="p-1">
                <ErrorBoundary fallback={<div className="text-red-500">Error loading alerts.</div>}>
                  <div className="bg-muted/30 p-2 rounded-md">
                    <PriceAlertSystem />
                    <ExecutionNotifications />
                  </div>
                </ErrorBoundary>
              </div>
            </Widget>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Open Orders */}
            <Widget title={<span className="flex items-center">Open Orders {ordersConnected ? <span className="ml-2 h-2 w-2 rounded-full bg-green-500 inline-block" title="Live" /> : <span className="ml-2 h-2 w-2 rounded-full bg-red-500 inline-block" title="Disconnected" />}</span>} width="full" height="small">
              {loadingOpenOrders ? (
                <Skeleton className="h-36 w-full rounded" />
              ) : errorOpenOrders ? (
                <div className="text-red-500">{errorOpenOrders.message}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Symbol</th>
                        <th className="text-left p-2">Side</th>
                        <th className="text-left p-2">Quantity</th>
                        <th className="text-left p-2">Price</th>
                        <th className="text-left p-2">Filled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openOrders?.map((order: any) => (
                        <tr key={order.id} className="border-b">
                          <td className="p-2">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : '-'}</td>
                          <td className="p-2">{order.symbol}</td>
                          <td className={`p-2 ${order.side.toLowerCase() === 'buy' ? 'text-green-500' : 'text-red-500'}`}>{order.side.charAt(0).toUpperCase()+order.side.slice(1)}</td>
                          <td className="p-2">{order.quantity}</td>
                          <td className="p-2">{order.price ?? '-'}</td>
                          <td className="p-2">{order.filledQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Widget>
            {/* P/L & Risk Metrics */}
            <Widget title="P/L & Risk Metrics" width="full" height="small">
              {loadingPnl ? (
                <Skeleton className="h-36 w-full rounded" />
              ) : errorPnl ? (
                <div className="text-red-500">{errorPnl.message}</div>
              ) : (
                <div className="p-2 space-y-1">
                  <div>Unrealized P/L: {pnlMetrics?.unrealizedPnl.toFixed(2)}</div>
                  <div>Realized P/L: {pnlMetrics?.realizedPnl.toFixed(2)}</div>
                  <div>Total Value: {pnlMetrics?.totalValue.toFixed(2)}</div>
                </div>
              )}
            </Widget>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {/* Agent List */}
            <Widget title={<span className="flex items-center">Agents {agentsConnected ? <span className="ml-2 h-2 w-2 rounded-full bg-green-500 inline-block" title="Live" /> : <span className="ml-2 h-2 w-2 rounded-full bg-red-500 inline-block" title="Disconnected" />}</span>} width="full" height="medium">
              {loadingAgents ? (
                <Skeleton className="h-36 w-full rounded" />
              ) : errorAgents ? (
                <div className="text-red-500">{errorAgents.message}</div>
              ) : (
                <ul className="space-y-2">
                  {agents?.map((agent: any) => (
                    <li key={agent.id} className="p-4 rounded bg-muted/30 flex flex-col">
                      <span className="font-semibold">{agent.name ?? `Agent ${agent.id}`}</span>
                      <span className="text-xs text-muted-foreground">Status: {agent.status ?? '-'}</span>
                      <span className="text-xs text-muted-foreground">Type: {agent.type ?? '-'}</span>
                      <span className="text-xs">Win Rate: {agent.win_rate ?? agent.performance?.winRate ?? '-'}</span>
                      <span className="text-xs">P/L: {agent.profit_loss ?? agent.performance?.profitLoss ?? '-'}</span>
                      <span className="text-xs">Capabilities: {Array.isArray(agent.capabilities) ? agent.capabilities.join(', ') : '-'}</span>
                      <div className="mt-2 flex space-x-2">
                        {agent.status === 'paused' ? (
                          <button className="px-2 py-1 text-sm bg-green-500 text-white rounded" onClick={async () => { await fetch(`/api/agents/${agent.id}/control`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'resume' }) }); refetchAgents(); }}>Resume</button>
                        ) : (
                          <button className="px-2 py-1 text-sm bg-yellow-500 text-white rounded" onClick={async () => { await fetch(`/api/agents/${agent.id}/control`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'pause' }) }); refetchAgents(); }}>Pause</button>
                        )}
                        <button className="px-2 py-1 text-sm bg-red-500 text-white rounded" onClick={async () => { await fetch(`/api/agents/${agent.id}/control`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'shutdown' }) }); refetchAgents(); }}>Stop</button>
                        <button className="px-2 py-1 text-sm bg-blue-500 text-white rounded" onClick={() => window.open(`/api/agents/${agent.id}/logs`, '_blank')}>View Logs</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Widget>
          </div>
          <div className="grid grid-cols-1 gap-6 mt-6">
            {/* Open Positions */}
            <Widget title={<span className="flex items-center">Open Positions {positionsConnected ? <span className="ml-2 h-2 w-2 rounded-full bg-green-500 inline-block" title="Live" /> : <span className="ml-2 h-2 w-2 rounded-full bg-red-500 inline-block" title="Disconnected" />}</span>} width="full" height="medium">
              {loadingPositions ? (
                <Skeleton className="h-36 w-full rounded" />
              ) : errorPositions ? (
                <div className="text-red-500">{errorPositions.message}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Symbol</th>
                        <th className="text-left p-2">Side</th>
                        <th className="text-left p-2">Size</th>
                        <th className="text-left p-2">Entry Price</th>
                        <th className="text-left p-2">Unrealized P/L</th>
                        <th className="text-left p-2">Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openPositionsData?.positions.map((pos: any) => (
                        <tr key={pos.id} className="border-b">
                          <td className="p-2">{pos.symbol}</td>
                          <td className={`p-2 ${pos.direction === 'long' ? 'text-green-500' : 'text-red-500'}`}>{pos.direction.charAt(0).toUpperCase() + pos.direction.slice(1)}</td>
                          <td className="p-2">{pos.size.toFixed(2)}</td>
                          <td className="p-2">{pos.entryPrice.toFixed(2)}</td>
                          <td className="p-2">{pos.unrealizedPnl?.toFixed(2) ?? '-'}</td>
                          <td className="p-2">{pos.agentId ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Widget>
          </div>
          <div className="grid grid-cols-1 gap-6 mt-6">
            {/* Exchange Connections */}
            <Widget title="Exchange Connections" width="full" height="medium">
              <ExchangeConnectionManager />
            </Widget>
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}              