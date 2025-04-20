/*
  Trading Farm Dashboard: Multi-Chain Integration
  -----------------------------------------------------
  - Feature Highlights:
    1. Multi-chain wallet support (ETH, Sonic, Sui, Solana)
    2. Unified portfolio view across all chains
    3. Cross-chain bridge interface
    4. ElizaOS AI agent integration
    5. Risk management and unified transaction feed
    6. Consistent UI for all blockchain operations
*/
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Widget } from '@/components/ui/widget';
import { BarChartComponent } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Cpu, Bot, Brain, ArrowUpDown, Wallet, Database, Layers, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from 'react-error-boundary';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Navbar } from './navbar';
import MobileNavigation from '@/components/mobile/MobileNavigation';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import PriceAlertSystem from '@/components/real-time/PriceAlertSystem';
import ExecutionNotifications from '@/components/real-time/ExecutionNotifications';
import ExchangeConnectionManager from '@/components/exchanges/ExchangeConnectionManager';

// Import Multi-Chain Components
import { UnifiedWalletConnector, WalletProvider } from '@/components/wallets/UnifiedWalletConnector';
import { MultiChainPortfolio } from '@/components/portfolio/MultiChainPortfolio';
import { UnifiedTransactionFeed } from '@/components/transactions/UnifiedTransactionFeed';
import { MultichainBridge } from '@/components/bridge/MultichainBridge';

// Import from our mock providers
import { MockDataProvider, useMockData, useMockQuery } from '@/providers/mock-data-provider';
import { useSupabaseRealtime, useSocket, usePositions } from '@/hooks/use-mock-hooks';
import { EmergencyStopButton, ManualTradeButton, RebalanceButton } from '@/components/agents/ManualControls';
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
  const { isConnected: socketConnected } = useSocket();
  const { getMockData } = useMockData();

  // --- Market Overview ---
  const { data: marketOverview, isLoading: loadingMarket, error: errorMarket, isConnected: marketConnected } = useMockQuery({
    queryKey: ['marketOverview'],
    mockData: getMockData('marketOverview')
  });

  // --- Top Performing Assets ---
  const { data: topAssets, isLoading: loadingTopAssets, error: errorTopAssets, isConnected: assetsConnected } = useMockQuery({
    queryKey: ['topAssets'],
    mockData: getMockData('topAssets')
  });

  // --- Recent Trades ---
  const { data: trades, isLoading: loadingTrades, error: errorTrades, isConnected: tradesConnected } = useMockQuery({
    queryKey: ['recentTrades'],
    mockData: getMockData('recentTrades')
  });

  // --- Agents ---
  const { data: agents, isLoading: loadingAgents, error: errorAgents, isConnected: agentsConnected } = useMockQuery({
    queryKey: ['agents'],
    mockData: getMockData('agents')
  });
  
  // Simulate refetch function
  const refetchAgents = () => console.log('Refetching agents...');
  // --- Open Orders ---
  const { isConnected: ordersConnected } = useSupabaseRealtime('orders', ['openOrders']);
  const { data: openOrders, isLoading: loadingOpenOrders, error: errorOpenOrders, isConnected: ordersDataConnected } = useMockQuery({
    queryKey: ['openOrders'],
    mockData: getMockData('openOrders')
  });

  // --- PNL Metrics ---
  const { data: pnlMetrics, isLoading: loadingPnl, error: errorPnl } = useMockQuery({
    queryKey: ['pnlMetrics'],
    mockData: getMockData('pnlMetrics')
  });

  // --- Open Positions ---
  const { data: openPositionsData, isLoading: loadingPositions, error: errorPositions } = usePositions({ status: 'open' });
  const { isConnected: positionsConnected } = useSupabaseRealtime('positions', ['openPositions']);

  return (
    <MockDataProvider>
      <WalletProvider>
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
                <ErrorBoundary fallback={<div className="p-4 text-red-500">Something went wrong in the dashboard</div>}>
                  <div className="p-4 flex justify-between items-center border-b">
                    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Dashboard", href: "/dashboard" }]} />
                    <div className="flex items-center gap-4">
                      <Card className="bg-primary/10 border-primary/20">
                        <CardContent className="flex items-center p-2">
                          <Cpu className="h-5 w-5 mr-2 text-primary" />
                          <span className="text-sm">Multi-Chain Mode</span>
                        </CardContent>
                      </Card>
                      <UnifiedWalletConnector />
                      <ThemeToggle />
                    </div>
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
                                <EmergencyStopButton agentId={agent.id} />
                                <ManualTradeButton agentId={agent.id} />
                                <RebalanceButton agentId={agent.id} />
                                <button className="px-2 py-1 text-sm bg-blue-500 text-white rounded" onClick={() => window.open(`/api/agents/${agent.id}/logs`, '_blank')}>View Logs</button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Widget>
                  </div>
                      </ErrorBoundary>
                    </div>
                  </Widget>
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
                        <EmergencyStopButton agentId={agent.id} />
                        <ManualTradeButton agentId={agent.id} />
                        <RebalanceButton agentId={agent.id} />
                        <button className="px-2 py-1 text-sm bg-blue-500 text-white rounded" onClick={() => window.open(`/api/agents/${agent.id}/logs`, '_blank')}>View Logs</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Widget>
          </div>
              </TabsContent>
              
              {/* Portfolio Tab - Multi-Chain Portfolio */}
              <TabsContent value="portfolio" className="space-y-4">
                <MultiChainPortfolio vaultId="main-vault" />
                <UnifiedTransactionFeed vaultId="main-vault" />
              </TabsContent>
              
              {/* Bridge Tab */}
              <TabsContent value="bridge" className="flex justify-center">
                <div className="w-full max-w-3xl">
                  <MultichainBridge vaultId="main-vault" />
                </div>
              </TabsContent>
              
              {/* AI Agents Tab - ElizaOS Integration */}
              <TabsContent value="ai-agents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Trading Agents</CardTitle>
                    <CardDescription>ElizaOS powered intelligent trading agents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-6">
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Active Agents */}
                        <Card className="bg-muted/50">
                          <CardContent className="p-6">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium">Active Agents</h3>
                                <Bot className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <p className="text-3xl font-bold">3</p>
                              <p className="text-xs text-muted-foreground">2 trading / 1 risk monitoring</p>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Total Decisions */}
                        <Card className="bg-muted/50">
                          <CardContent className="p-6">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium">Total Decisions</h3>
                                <Brain className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <p className="text-3xl font-bold">127</p>
                              <p className="text-xs text-muted-foreground">Last 24 hours</p>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Success Rate */}
                        <Card className="bg-muted/50">
                          <CardContent className="p-6">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium">Success Rate</h3>
                                <Cpu className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <p className="text-3xl font-bold">92.3%</p>
                              <p className="text-xs text-muted-foreground">+2.1% from last week</p>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Memory Storage */}
                        <Card className="bg-muted/50">
                          <CardContent className="p-6">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium">Memory Storage</h3>
                                <Database className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <p className="text-3xl font-bold">245 MB</p>
                              <p className="text-xs text-muted-foreground">Vector DB + Knowledge Graph</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-md">
                      <div className="flex items-start gap-3">
                        <Bot className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium">ElizaOS Integration Active</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Trading Farm is now powered by ElizaOS AI framework, providing multi-agent coordination,
                            memory storage, and advanced decision making capabilities across multiple chains.
                          </p>
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm">Configure Agents</Button>
                            <Button variant="outline" size="sm">View Memory</Button>
                            <Button variant="default" size="sm">Launch Agent Studio</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
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
                </TabsContent>
              </Tabs>
            </div>
        </ErrorBoundary>
      </div>
    </WalletProvider>
    </MockDataProvider>
  );
}              