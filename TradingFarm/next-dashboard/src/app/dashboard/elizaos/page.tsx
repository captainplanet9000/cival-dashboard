npm run dev'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  Loader2,
  Bot,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  User,
  Building,
  Cpu
} from "lucide-react";
import { useTheme } from "next-themes";
import { LineChart, BarChart, PieChart } from '@/components/charts';
import CommandConsole from '@/components/elizaos/command-console';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchFarms, fetchPortfolio, usePlaceOrder } from '@/services/queries';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';

// Fetch farms from Supabase with tuned cache and stale times
const { data: farms = [], isLoading: farmsLoading, error: farmsError } = useQuery<any[]>({
  queryKey: ['farms'],
  queryFn: fetchFarms,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 30 * 60 * 1000, // 30 minutes
});

// Select farm from dropdown
const [selectedFarmId, setSelectedFarmId] = useState<string>('');

const queryClient = useQueryClient();

// Prefetch portfolio data on farm hover
const handleFarmHover = (farmId: string) => {
  queryClient.prefetchQuery(['portfolio', farmId], () => fetchPortfolio(farmId));
};

// Fetch portfolio for selected farm with tuned cache
const { data: portfolio, isLoading: portfolioLoading, error: portfolioError } = useQuery<any>({
  queryKey: ['portfolio', selectedFarmId],
  queryFn: () => fetchPortfolio(selectedFarmId),
  enabled: !!selectedFarmId,
  staleTime: 60 * 1000, // 1 minute
  cacheTime: 10 * 60 * 1000, // 10 minutes
});

// Infinite scroll for trades
// --- TypeScript Interfaces for Strong Type Safety ---
export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  status: string;
  created_at: string;
}
export interface Alert {
  id: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  created_at: string;
}
export interface Position {
  id: string;
  symbol: string;
  size: number;
  entry_price: number;
  pnl: number;
  updated_at: string;
}

// --- Trades Infinite Scroll ---
const fetchTrades = async ({ pageParam = 0 }: { pageParam?: number }) => {
  // Replace with real API call for trades
  return fetch(`/api/trades?farmId=${selectedFarmId}&offset=${pageParam}&limit=20`).then(res => res.json());
};
const {
  data: tradesPages,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading: tradesLoading,
  isError: tradesError,
} = useInfiniteQuery<{ trades: Trade[]; nextOffset?: number }, Error>({
  queryKey: ['trades', selectedFarmId],
  queryFn: fetchTrades,
  getNextPageParam: (lastPage) => lastPage?.nextOffset,
  enabled: !!selectedFarmId,
});

// --- Alerts Infinite Scroll ---
const fetchAlerts = async ({ pageParam = 0 }: { pageParam?: number }) => {
  // Replace with real API call for alerts
  return fetch(`/api/alerts?farmId=${selectedFarmId}&offset=${pageParam}&limit=20`).then(res => res.json());
};
const {
  data: alertsPages,
  fetchNextPage: fetchNextAlerts,
  hasNextPage: hasNextAlerts,
  isFetchingNextPage: isFetchingNextAlerts,
  isLoading: alertsLoading,
  isError: alertsError,
} = useInfiniteQuery<{ alerts: Alert[]; nextOffset?: number }, Error>({
  queryKey: ['alerts', selectedFarmId],
  queryFn: fetchAlerts,
  getNextPageParam: (lastPage) => lastPage?.nextOffset,
  enabled: !!selectedFarmId,
});

// --- Positions Infinite Scroll ---
const fetchPositions = async ({ pageParam = 0 }: { pageParam?: number }) => {
  // Replace with real API call for positions
  return fetch(`/api/positions?farmId=${selectedFarmId}&offset=${pageParam}&limit=20`).then(res => res.json());
};
const {
  data: positionsPages,
  fetchNextPage: fetchNextPositions,
  hasNextPage: hasNextPositions,
  isFetchingNextPage: isFetchingNextPositions,
  isLoading: positionsLoading,
  isError: positionsError,
} = useInfiniteQuery<{ positions: Position[]; nextOffset?: number }, Error>({
  queryKey: ['positions', selectedFarmId],
  queryFn: fetchPositions,
  getNextPageParam: (lastPage) => lastPage?.nextOffset,
  enabled: !!selectedFarmId,
});




// --- UI/UX POLISH ---

// Farm Selector UI
const FarmSelector = () => (
  <div className="mb-4">
    <label className="block mb-1 font-semibold">Select Farm:</label>
    <select
      className="w-full border rounded px-2 py-1"
      value={selectedFarmId}
      onChange={e => setSelectedFarmId(e.target.value)}
      disabled={farmsLoading}
    >
      <option value="" disabled>Select a farm...</option>
      {farms.map((farm: any) => (
        <option key={farm.id} value={farm.id}>{farm.name}</option>
      ))}
    </select>
    {farmsLoading && <div className="flex items-center gap-2 mt-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></span> Loading farms...</div>}
    {farmsError && <div className="text-red-500 mt-2">Error loading farms.</div>}
  </div>
);

// Portfolio Details UI
const PortfolioDetails = () => {
  if (portfolioLoading) return <div className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></span> Loading portfolio...</div>;
  if (portfolioError) return <div className="text-red-500">Error loading portfolio.</div>;
  if (!portfolio) return <div>No portfolio data.</div>;
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Portfolio Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div>Total Value: ${portfolio.totalValue?.toLocaleString()}</div>
        <div>Daily P&L: {portfolio.dailyPnL} ({portfolio.dailyPnLPercentage}%)</div>
        <div>Weekly P&L: {portfolio.weeklyPnL} ({portfolio.weeklyPnLPercentage}%)</div>
        <div>Monthly P&L: {portfolio.monthlyPnL} ({portfolio.monthlyPnLPercentage}%)</div>
        <div className="mt-2 font-semibold">Asset Allocation:</div>
        <ul>
          {(portfolio.assets || []).map((asset: any) => (
            <li key={asset.asset}>{asset.asset}: {asset.allocation}% (Perf: {asset.performance}%)</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

// --- Trades Table with Infinite Scroll and Load More ---
const TradesTable = () => {
  if (tradesLoading) return <div className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></span> Loading trades...</div>;
  if (tradesError) return <div className="text-red-500">Error loading trades.</div>;
  const trades = tradesPages?.pages.flatMap(page => page.trades) ?? [];
  if (trades.length === 0) return <div>No trades yet.</div>;
  return (
    <div className="mb-6">
      <h3 className="font-bold mb-2">Recent Trades</h3>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Symbol</th>
            <th className="p-2">Side</th>
            <th className="p-2">Amount</th>
            <th className="p-2">Price</th>
            <th className="p-2">Status</th>
            <th className="p-2">Time</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade: Trade) => (
            <tr key={trade.id} className="border-t">
              <td className="p-2">{trade.symbol}</td>
              <td className="p-2 capitalize">{trade.side}</td>
              <td className="p-2">{trade.amount}</td>
              <td className="p-2">{trade.price}</td>
              <td className="p-2">{trade.status}</td>
              <td className="p-2">{new Date(trade.created_at).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasNextPage && (
        <button
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
          {isFetchingNextPage ? 'Loading more...' : 'Load More'}
        </button>
      )}
    </div>
  );
};

// --- Alerts List with Infinite Scroll and Load More ---
const AlertsList = () => {
  if (alertsLoading) return <div className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></span> Loading alerts...</div>;
  if (alertsError) return <div className="text-red-500">Error loading alerts.</div>;
  const alerts = alertsPages?.pages.flatMap(page => page.alerts) ?? [];
  if (alerts.length === 0) return <div>No alerts.</div>;
  return (
    <div className="mb-6">
      <h3 className="font-bold mb-2">Alerts</h3>
      <ul>
        {alerts.map((alert: Alert) => (
          <li key={alert.id} className={`p-2 border-b ${alert.level === 'error' ? 'text-red-600' : alert.level === 'warning' ? 'text-yellow-700' : 'text-gray-700'}`}>{alert.message} <span className="text-xs text-gray-400">({new Date(alert.created_at).toLocaleTimeString()})</span></li>
        ))}
      </ul>
      {hasNextAlerts && (
        <button
          className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-yellow-300 flex items-center gap-2"
          onClick={() => fetchNextAlerts()}
          disabled={isFetchingNextAlerts}
        >
          {isFetchingNextAlerts && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
          {isFetchingNextAlerts ? 'Loading more...' : 'Load More'}
        </button>
      )}
    </div>
  );
};

// --- Positions List with Infinite Scroll and Load More ---
const PositionsList = () => {
  if (positionsLoading) return <div className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></span> Loading positions...</div>;
  if (positionsError) return <div className="text-red-500">Error loading positions.</div>;
  const positions = positionsPages?.pages.flatMap(page => page.positions) ?? [];
  if (positions.length === 0) return <div>No open positions.</div>;
  return (
    <div className="mb-6">
      <h3 className="font-bold mb-2">Open Positions</h3>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Symbol</th>
            <th className="p-2">Size</th>
            <th className="p-2">Entry Price</th>
            <th className="p-2">PnL</th>
            <th className="p-2">Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos: Position) => (
            <tr key={pos.id} className="border-t">
              <td className="p-2">{pos.symbol}</td>
              <td className="p-2">{pos.size}</td>
              <td className="p-2">{pos.entry_price}</td>
              <td className={`p-2 ${pos.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{pos.pnl}</td>
              <td className="p-2">{new Date(pos.updated_at).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasNextPositions && (
        <button
          className="mt-3 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-purple-300 flex items-center gap-2"
          onClick={() => fetchNextPositions()}
          disabled={isFetchingNextPositions}
        >
          {isFetchingNextPositions && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>}
          {isFetchingNextPositions ? 'Loading more...' : 'Load More'}
        </button>
      )}
    </div>
  );
};

// --- EXTEND MUTATIONS ---
import { useEditFarm, useUpdateGoal, useCancelOrder } from '@/services/queries';
const editFarm = useEditFarm();
const updateGoal = useUpdateGoal();
const cancelOrder = useCancelOrder();

// Example UI for editing a farm
const handleEditFarm = (farmId: string, updates: any) => editFarm.mutate({ farmId, updates });
// Example UI for updating a goal
const handleUpdateGoal = (goalId: string, updates: any) => updateGoal.mutate({ goalId, updates });
// Example UI for cancelling an order
const handleCancelOrder = (orderId: string) => cancelOrder.mutate({ orderId });

// --- ADVANCED REAL-TIME ---
useEffect(() => {
  const supabase = createBrowserClient();
  // Listen for trades
  const tradesChannel = supabase
    .channel('public:trades')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => {
      if (selectedFarmId) queryClient.invalidateQueries(['portfolio', selectedFarmId]);
      queryClient.invalidateQueries(['trades']);
    })
    .subscribe();
  // Listen for positions
  const positionsChannel = supabase
    .channel('public:positions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, () => {
      if (selectedFarmId) queryClient.invalidateQueries(['portfolio', selectedFarmId]);
      queryClient.invalidateQueries(['positions']);
    })
    .subscribe();
  // Listen for alerts
  const alertsChannel = supabase
    .channel('public:alerts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
      queryClient.invalidateQueries(['alerts']);
    })
    .subscribe();
  return () => {
    supabase.removeChannel(tradesChannel);
    supabase.removeChannel(positionsChannel);
    supabase.removeChannel(alertsChannel);
  };
}, [selectedFarmId, queryClient]);


// Real-time updates for portfolio
const queryClient = useQueryClient();
useEffect(() => {
  const supabase = createBrowserClient();
  const channel = supabase
    .channel('public:portfolio')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolio' }, () => {
      if (selectedFarmId) queryClient.invalidateQueries(['portfolio', selectedFarmId]);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [selectedFarmId, queryClient]);

// Place order mutation with optimistic update
const { mutate: placeOrder, isLoading: orderLoading, error: orderError } = usePlaceOrder();
const handlePlaceOrder = (order: any) => {
  placeOrder(order, {
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries(['portfolio', selectedFarmId]);
      const prevPortfolio = queryClient.getQueryData(['portfolio', selectedFarmId]);
      // Optimistically update portfolio (example: add pending order)
      queryClient.setQueryData(['portfolio', selectedFarmId], (old: any) => ({
        ...old,
        pendingOrders: [...(old?.pendingOrders || []), newOrder],
      }));
      return { prevPortfolio };
    },
    onError: (err, newOrder, context) => {
      if (context?.prevPortfolio) {
        queryClient.setQueryData(['portfolio', selectedFarmId], context.prevPortfolio);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries(['portfolio', selectedFarmId]);
    },
  });
};
    'farm-1': {
      totalValue: 125890,
      dailyPnL: 3240,
      dailyPnLPercentage: 2.4,
      weeklyPnL: 9875,
      weeklyPnLPercentage: 8.1,
      monthlyPnL: 32400,
      monthlyPnLPercentage: 28.5,
      assets: [
        { asset: 'BTC', allocation: 35, performance: 12.5 },
        { asset: 'ETH', allocation: 25, performance: 8.2 },
        { asset: 'SOL', allocation: 15, performance: 24.8 },
        { asset: 'AVAX', allocation: 10, performance: 15.3 },
        { asset: 'BNB', allocation: 8, performance: 5.1 },
        { asset: 'Others', allocation: 7, performance: 4.3 },
      ]
    },
    'farm-2': {
      totalValue: 87250,
      dailyPnL: 4120,
      dailyPnLPercentage: 4.9,
      weeklyPnL: 11240,
      weeklyPnLPercentage: 14.2,
      monthlyPnL: 27800,
      monthlyPnLPercentage: 35.9,
      assets: [
        { asset: 'BTC', allocation: 40, performance: 15.2 },
        { asset: 'ETH', allocation: 30, performance: 10.5 },
        { asset: 'SOL', allocation: 20, performance: 28.7 },
        { asset: 'DOGE', allocation: 10, performance: 22.3 },
      ]
    },
    'farm-3': {
      totalValue: 215400,
      dailyPnL: 1580,
      dailyPnLPercentage: 0.7,
      weeklyPnL: 5950,
      weeklyPnLPercentage: 2.8,
      monthlyPnL: 18700,
      monthlyPnLPercentage: 9.5,
      assets: [
        { asset: 'BTC', allocation: 25, performance: 5.8 },
        { asset: 'ETH', allocation: 15, performance: 3.2 },
        { asset: 'USD-T', allocation: 30, performance: 0.1 },
        { asset: 'USD-C', allocation: 30, performance: 0.1 },
      ]
    },
    'farm-4': {
      totalValue: 68450,
      dailyPnL: 890,
      dailyPnLPercentage: 1.3,
      weeklyPnL: 3840,
      weeklyPnLPercentage: 5.9,
      monthlyPnL: 12760,
      monthlyPnLPercentage: 22.8,
      assets: [
        { asset: 'ETH', allocation: 20, performance: 8.2 },
        { asset: 'AAVE', allocation: 25, performance: 12.4 },
        { asset: 'MKR', allocation: 15, performance: 9.8 },
        { asset: 'UNI', allocation: 20, performance: 15.2 },
        { asset: 'COMP', allocation: 20, performance: 11.5 },
      ]
    }
  };
  
  return {
    data: farmData[farmId as keyof typeof farmData] || farmData['farm-1'],
    isLoading: false
  };
};

const useMarketData = () => ({
  data: {
    btc: { price: 51890, change24h: 3.2 },
    eth: { price: 3120, change24h: 2.8 },
    sol: { price: 145, change24h: 5.4 },
    bnb: { price: 420, change24h: -1.2 },
  },
  isLoading: false
});

const useAgentsData = (farmId: string) => {
  // Mock different agents for different farms
  const farmAgents = {
    'farm-1': [
      { id: '1', name: 'Market Analyst', status: 'active', lastActive: '2m ago', description: 'Analyzes market trends and patterns', winRate: 65 },
      { id: '2', name: 'Trend Follower', status: 'active', lastActive: '5m ago', description: 'Follows market momentum', winRate: 58 },
      { id: '3', name: 'Risk Manager', status: 'idle', lastActive: '15m ago', description: 'Monitors and limits exposure', winRate: 72 },
      { id: '4', name: 'Portfolio Optimizer', status: 'active', lastActive: '3m ago', description: 'Balances portfolio allocation', winRate: 61 },
    ],
    'farm-2': [
      { id: '1', name: 'Volatility Trader', status: 'active', lastActive: '1m ago', description: 'Capitalizes on price swings', winRate: 55 },
      { id: '2', name: 'Breakout Hunter', status: 'active', lastActive: '8m ago', description: 'Identifies pattern breakouts', winRate: 62 },
      { id: '3', name: 'News Analyzer', status: 'active', lastActive: '4m ago', description: 'Reacts to market news', winRate: 59 },
    ],
    'farm-3': [
      { id: '1', name: 'Hedging Agent', status: 'active', lastActive: '7m ago', description: 'Minimizes downside risk', winRate: 78 },
      { id: '2', name: 'Stable Coin Optimizer', status: 'active', lastActive: '12m ago', description: 'Manages stablecoin yields', winRate: 82 },
    ],
    'farm-4': [
      { id: '1', name: 'Yield Harvester', status: 'active', lastActive: '3m ago', description: 'Optimizes DeFi yields', winRate: 71 },
      { id: '2', name: 'Liquidity Provider', status: 'active', lastActive: '10m ago', description: 'Manages LP positions', winRate: 68 },
      { id: '3', name: 'Arbitrage Hunter', status: 'idle', lastActive: '25m ago', description: 'Finds cross-protocol opportunities', winRate: 64 },
    ]
  };
  
  return {
    data: farmAgents[farmId as keyof typeof farmAgents] || farmAgents['farm-1'],
    isLoading: false
  };
};

export default function ElizaOSCentricDashboard() {
  // All hooks and state as before
  // (selectedFarmId, setSelectedFarmId, queries, etc)

  return (
    <main className="container mx-auto px-4 py-8 flex flex-col items-center min-h-screen">
      {/* ElizaOS Terminal Centered */}
      <div className="w-full max-w-2xl flex flex-col items-center mb-10">
        <h2 className="text-2xl font-bold mb-4 text-center">ElizaOS Terminal</h2>
        <Card className="w-full">
          <CardContent className="p-0">
            <CommandConsole farmId={selectedFarmId} height="full" className="mx-auto" />
          </CardContent>
        </Card>
      </div>
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <FarmSelector />
        <PortfolioDetails />
        <TradesTable />
        <PositionsList />
        <AlertsList />
      </div>
    </main>
  );
}
  const [farmId, setFarmId] = React.useState('farm-1');
  const [activeTab, setActiveTab] = React.useState('farms'); // farms or agents
  const { toast } = useToast();
  const { theme } = useTheme();
  const { data: portfolioData, isLoading: isLoadingPortfolio } = usePortfolioData(farmId);
  const { data: marketData, isLoading: isLoadingMarket } = useMarketData();
  const { data: agentsData, isLoading: isLoadingAgents } = useAgentsData(farmId);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Handle farm change
  const handleFarmChange = (id: string) => {
    setFarmId(id);
    toast({
      title: "Farm Changed",
      description: `Switched to ${farms.find(farm => farm.id === id)?.name}`
    });
  };

  // Handle refresh
  const handleRefresh = () => {
    toast({
      title: "Refreshing data",
      description: "Updating dashboard with the latest information"
    });
  };

  // Portfolio allocation data for chart
  const portfolioAllocationData = {
    labels: portfolioData.assets.map(a => a.asset),
    datasets: [
      {
        label: 'Allocation (%)',
        data: portfolioData.assets.map(a => a.allocation),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Market performance chart data (weekly)
  const marketPerformanceData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'BTC Price',
        data: [50200, 50800, 51200, 50600, 52000, 53500, 53000],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.3,
      },
      {
        label: 'ETH Price',
        data: [2700, 2750, 2780, 2760, 2850, 2900, 2880],
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        tension: 0.3,
      },
    ],
  };

  // Agent performance data
  const agentPerformanceData = {
    labels: agentsData.map(agent => agent.name),
    datasets: [
      {
        label: 'Win Rate (%)',
        data: agentsData.map(agent => agent.winRate || 0),
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
      },
    ],
  };

  return (
    <div className="min-h-screen w-full flex flex-col p-4 bg-background overflow-hidden">
      {/* Page Header */}
      <div className="w-full mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-3 mb-2 gap-4">
          <div>
            <h1 className="text-2xl font-bold">ElizaOS Command Center</h1>
            <p className="text-sm text-muted-foreground">Interact with your trading farm through the ElizaOS AI interface</p>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
            <div className="w-full md:w-auto">
              <div className="flex space-x-1 w-full md:w-auto">
                <Button 
                  variant={activeTab === "farms" ? "default" : "outline"} 
                  className="flex-1 flex items-center justify-center" 
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("farms");
                  }}
                  type="button"
                >
                  <Building className="mr-1 h-4 w-4" /> Farms
                </Button>
                <Button 
                  variant={activeTab === "agents" ? "default" : "outline"} 
                  className="flex-1 flex items-center justify-center" 
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("agents");
                  }}
                  type="button"
                >
                  <Cpu className="mr-1 h-4 w-4" /> Agents
                </Button>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content Container */}
      <div className="w-full flex-1 flex flex-col space-y-6 overflow-hidden">
        {/* ElizaOS Command Console - Main Focal Point */}
        <div className="w-full border rounded-md shadow-md overflow-hidden bg-card">
          <div className="bg-muted/30 p-3 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-primary" />
              <h2 className="font-medium">ElizaOS Command Console</h2>
            </div>
            <div className="flex items-center w-full md:w-auto">
              {activeTab === 'farms' && (
                <div className="flex items-center mr-4 w-full md:w-auto">
                  <select 
                    value={farmId}
                    onChange={(e) => handleFarmChange(e.target.value)}
                    className="bg-transparent border rounded-md p-1 text-sm w-full md:w-auto"
                  >
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>{farm.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <Badge variant="outline" className="ml-2 py-1">
                <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5 inline-block"></span>
                {activeTab === 'farms' ? 'Farm:' : 'Agent Mode'} {activeTab === 'farms' ? farms.find(f => f.id === farmId)?.name : ''}
              </Badge>
            </div>
          </div>
          <div className="h-[45vh] min-h-[350px] overflow-hidden">
            {/* Command Console Component */}
            <CommandConsole 
              farmId={farmId} 
              height="full" 
              autoScroll={true} 
              className="border-0 shadow-none h-full w-full flex-1 flex flex-col"
            />
          </div>
        </div>

        {/* Scrollable Dashboard Widgets */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto pr-1 space-y-6 dashboard-content-area pb-6 w-full"
          style={{
            maxHeight: 'calc(55vh - 2rem)',
            scrollbarWidth: 'thin',
            scrollbarColor: theme === 'dark' ? '#4b5563 #1f2937' : '#d1d5db #f3f4f6'
          }}
        >
          <div className="w-full space-y-6">
            {/* Conditional rendering of content based on active tab */}
            {activeTab === "farms" && (
              <div className="mt-0 w-full">
              {/* Top Row Widgets */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Portfolio Summary Widget */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Portfolio Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingPortfolio ? (
                      <div className="flex h-32 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-col p-2">
                          <span className="text-xs text-muted-foreground">Total Value</span>
                          <span className="text-2xl font-bold">${portfolioData.totalValue.toLocaleString()}</span>
                          <span className="text-xs text-green-500 flex items-center">
                            <ArrowUp className="h-3 w-3 mr-1" /> 
                            {portfolioData.dailyPnLPercentage}% (24h)
                          </span>
                        </div>
                        <div className="flex flex-col p-2">
                          <span className="text-xs text-muted-foreground">Daily P&L</span>
                          <span className="text-2xl font-bold text-green-500">+${portfolioData.dailyPnL.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">Since yesterday</span>
                        </div>
                        <div className="flex flex-col p-2">
                          <span className="text-xs text-muted-foreground">Weekly P&L</span>
                          <span className="text-2xl font-bold text-green-500">+${portfolioData.weeklyPnL.toLocaleString()}</span>
                          <span className="text-xs text-green-500 flex items-center">
                            <ArrowUp className="h-3 w-3 mr-1" /> 
                            {portfolioData.weeklyPnLPercentage}%
                          </span>
                        </div>
                        <div className="flex flex-col p-2">
                          <span className="text-xs text-muted-foreground">Monthly P&L</span>
                          <span className="text-2xl font-bold text-green-500">+${portfolioData.monthlyPnL.toLocaleString()}</span>
                          <span className="text-xs text-green-500 flex items-center">
                            <ArrowUp className="h-3 w-3 mr-1" /> 
                            {portfolioData.monthlyPnLPercentage}%
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Portfolio Allocation Widget */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Portfolio Allocation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[180px] flex items-center justify-center">
                      <PieChart 
                        data={portfolioAllocationData}
                        options={{
                          plugins: {
                            legend: {
                              position: 'right',
                            }
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Middle Row Widgets */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Market Performance Widget */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Market Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] flex items-center justify-center">
                      <LineChart 
                        data={marketPerformanceData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: false,
                            },
                          },
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                {/* Agent Performance Widget */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Agent Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] flex items-center justify-center">
                      <BarChart 
                        data={agentPerformanceData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          indexAxis: 'y',
                          plugins: {
                            legend: {
                              display: false,
                            },
                          },
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Trades Widget */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Recent Trades</CardTitle>
                </CardHeader>
                <CardContent>
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
                        <tr className="border-b">
                          <td className="p-2">13:25:44</td>
                          <td className="p-2">BTC/USD</td>
                          <td className="p-2 text-green-500">Buy</td>
                          <td className="p-2">$52,890</td>
                          <td className="p-2">0.05 BTC</td>
                          <td className="p-2">$2,644.50</td>
                          <td className="p-2">Trend Follower</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2">12:18:32</td>
                          <td className="p-2">ETH/USD</td>
                          <td className="p-2 text-green-500">Buy</td>
                          <td className="p-2">$2,890</td>
                          <td className="p-2">1.2 ETH</td>
                          <td className="p-2">$3,468.00</td>
                          <td className="p-2">Market Analyst</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2">11:42:15</td>
                          <td className="p-2">SOL/USD</td>
                          <td className="p-2 text-red-500">Sell</td>
                          <td className="p-2">$134.80</td>
                          <td className="p-2">10 SOL</td>
                          <td className="p-2">$1,348.00</td>
                          <td className="p-2">Portfolio Optimizer</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2">09:30:08</td>
                          <td className="p-2">BNB/USD</td>
                          <td className="p-2 text-red-500">Sell</td>
                          <td className="p-2">$410.50</td>
                          <td className="p-2">2.5 BNB</td>
                          <td className="p-2">$1,026.25</td>
                          <td className="p-2">Risk Manager</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              </div>
            )}

            {/* Agents Tab Content */}
            {activeTab === "agents" && (
              <div className="mt-0 w-full space-y-6">
              {/* Agents List */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Active Agents</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAgents ? (
                    <div className="flex h-32 items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {agentsData.map(agent => (
                        <div key={agent.id} className="border rounded-md p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-lg">{agent.name}</h3>
                              <p className="text-sm text-muted-foreground">{agent.description}</p>
                            </div>
                            <Badge className={agent.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}>
                              {agent.status === 'active' ? 'Active' : 'Idle'}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Win Rate: <span className="font-medium">{agent.winRate}%</span></span>
                            <span>Last Active: <span className="font-medium">{agent.lastActive}</span></span>
                          </div>
                          <div className="pt-2">
                            <Button variant="outline" size="sm" className="w-full">
                              <User className="h-4 w-4 mr-2" /> Chat with Agent
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Agent Performance Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Agent Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] flex items-center justify-center">
                    <BarChart 
                      data={agentPerformanceData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
