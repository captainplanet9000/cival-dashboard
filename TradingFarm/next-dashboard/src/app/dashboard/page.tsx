"use client"

import { useEffect, useState } from "react";
import { dashboardApi, DashboardData } from "../../lib/api-client";
import { 
  Activity, 
  TrendingUp, 
  AlertOctagon, 
  Zap, 
  Brain, 
  ShieldAlert, 
  RefreshCw, 
  ArrowUpDown,
  DollarSign,
  Wallet,
  ChevronRight
} from 'lucide-react'

// Dashboard Overview Section
const DashboardOverview = ({ data }: { data: DashboardData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-primary/10 mr-4">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Active Trades</p>
          <p className="text-2xl font-bold">{data.activeTrades.length}</p>
        </div>
      </div>
      
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-success/10 mr-4">
          <TrendingUp className="h-6 w-6 text-success" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Performance (24h)</p>
          <p className="text-2xl font-bold text-success">+{data.performance24h.toFixed(2)}%</p>
        </div>
      </div>
      
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-warning/10 mr-4">
          <AlertOctagon className="h-6 w-6 text-warning" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Risk Level</p>
          <p className="text-2xl font-bold">{data.riskLevel}</p>
        </div>
      </div>
      
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-accent/10 mr-4">
          <Wallet className="h-6 w-6 text-accent" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Total Funds</p>
          <p className="text-2xl font-bold">${data.totalFunds.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

// Master Control Panel Component
const MasterControlPanel = () => {
  // Toggle states for system controls
  const [systemControls, setSystemControls] = useState({
    autoTrading: false,
    elizaOSIntegration: true,
    riskManager: true,
    marketScanner: false
  })

  const toggleControl = (control: keyof typeof systemControls) => {
    setSystemControls(prev => ({
      ...prev,
      [control]: !prev[control]
    }))
  }

  return (
    <div className="dashboard-card mb-6">
      <h2 className="text-xl font-bold mb-4">Master Control Panel</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System Controls */}
        <div className="bg-background p-4 rounded-md border border-border">
          <h3 className="text-md font-medium mb-3 flex items-center">
            <Zap className="mr-2 h-4 w-4 text-primary" />
            System Controls
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <RefreshCw className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>Auto-Trading</span>
              </div>
              <button 
                onClick={() => toggleControl('autoTrading')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  systemControls.autoTrading ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    systemControls.autoTrading ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Brain className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>ElizaOS Integration</span>
              </div>
              <button 
                onClick={() => toggleControl('elizaOSIntegration')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  systemControls.elizaOSIntegration ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    systemControls.elizaOSIntegration ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ShieldAlert className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>Risk Manager</span>
              </div>
              <button 
                onClick={() => toggleControl('riskManager')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  systemControls.riskManager ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    systemControls.riskManager ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>Market Scanner</span>
              </div>
              <button 
                onClick={() => toggleControl('marketScanner')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  systemControls.marketScanner ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    systemControls.marketScanner ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
        
        {/* Farm Status */}
        <div className="bg-background p-4 rounded-md border border-border">
          <h3 className="text-md font-medium mb-3 flex items-center">
            <Wallet className="mr-2 h-4 w-4 text-primary" />
            Wallet Status
          </h3>
          
          <div className="mb-4">
            <button className="btn-primary flex items-center justify-center w-full mb-2">
              <Wallet className="mr-2 h-4 w-4" />
              Connect MetaMask
            </button>
            <p className="text-xs text-muted-foreground text-center">Connect your wallet to manage funds</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-success mr-2"></div>
                <span className="text-sm">Ethereum</span>
              </div>
              <span className="text-sm font-medium">0.00 ETH</span>
            </div>
            
            <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-warning mr-2"></div>
                <span className="text-sm">Solana</span>
              </div>
              <span className="text-sm font-medium">0.00 SOL</span>
            </div>
            
            <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-accent mr-2"></div>
                <span className="text-sm">Sui</span>
              </div>
              <span className="text-sm font-medium">0.00 SUI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Active Trades Section
const ActiveTradesSection = ({ data }: { data: DashboardData }) => {
  return (
    <div className="dashboard-card mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Active Trades</h2>
        <button className="btn-ghost text-sm flex items-center">
          View All <ChevronRight className="ml-1 h-4 w-4" />
        </button>
      </div>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Market</th>
              <th>Type</th>
              <th>Entry Price</th>
              <th>Current Price</th>
              <th>P&L</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.activeTrades.map((trade) => (
              <tr key={trade.id}>
                <td className="font-medium">{trade.market}</td>
                <td>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                    trade.type === 'Long' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                  }`}>
                    {trade.type}
                  </span>
                </td>
                <td>${trade.entryPrice.toLocaleString()}</td>
                <td>${trade.currentPrice.toLocaleString()}</td>
                <td className={trade.pnl > 0 ? 'text-success' : 'text-danger'}>
                  {trade.pnl.toFixed(2)}%
                </td>
                <td>{trade.duration}</td>
                <td>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 rounded-md hover:bg-muted">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button className="p-1 rounded-md hover:bg-muted">
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                    <button className="p-1 rounded-md hover:bg-muted text-danger">
                      <AlertOctagon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Goal Progress Section
const GoalProgressSection = ({ data }: { data: DashboardData }) => {
  return (
    <div className="dashboard-card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Goal Progress</h2>
        <button className="btn-primary text-sm">
          New Goal
        </button>
      </div>
      
      <div className="space-y-4">
        {data.goals.map((goal) => (
          <div key={goal.id} className="bg-background p-4 rounded-md border border-border">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">{goal.name}</h3>
              <span className="text-sm text-muted-foreground">Deadline: {goal.deadline}</span>
            </div>
            
            <div className="mb-2">
              <div className="w-full bg-muted rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${goal.progress}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span>Current: {goal.current}</span>
              <span>Target: {goal.target}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      const response = await dashboardApi.getDashboardSummary(1); // User ID 1
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setData(response.data);
      }
      
      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-red-800">Error Loading Dashboard</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">No dashboard data available</div>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500">Welcome to your Trading Farm Dashboard</p>
      </header>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard 
          title="Total Farms"
          value={data.totalFarms}
          description="All farms"
          trend="neutral"
        />
        <StatCard 
          title="Active Farms"
          value={data.activeFarms}
          description={`${Math.round((data.activeFarms / data.totalFarms) * 100)}% active`}
          trend={data.activeFarms > data.totalFarms / 2 ? "up" : "down"}
        />
        <StatCard 
          title="Total Agents"
          value={data.totalAgents}
          description="All agents"
          trend="neutral"
        />
        <StatCard 
          title="Active Agents"
          value={data.activeAgents}
          description={`${Math.round((data.activeAgents / data.totalAgents) * 100)}% active`}
          trend={data.activeAgents > data.totalAgents / 2 ? "up" : "down"}
        />
      </div>

      {/* Performance metrics */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">Performance Metrics</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard 
            title="Win Rate"
            value={`${(data.overallPerformance.win_rate * 100).toFixed(2)}%`}
            trend={data.overallPerformance.win_rate > 0.5 ? "up" : "down"}
          />
          <MetricCard 
            title="Profit Factor"
            value={data.overallPerformance.profit_factor.toFixed(2)}
            trend={data.overallPerformance.profit_factor > 1 ? "up" : "down"}
          />
          <MetricCard 
            title="Total Trades"
            value={data.overallPerformance.total_trades.toString()}
            trend="neutral"
          />
          <MetricCard 
            title="Total P&L"
            value={`$${data.overallPerformance.total_profit_loss.toFixed(2)}`}
            trend={data.overallPerformance.total_profit_loss > 0 ? "up" : "down"}
          />
        </div>
      </div>

      {/* TVL Card */}
      <div className="mb-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-2 text-lg font-semibold text-gray-800">Total Value Locked</h3>
          <p className="text-3xl font-bold text-gray-900">${data.totalValueLocked.toLocaleString()}</p>
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-blue-500" style={{ width: '75%' }}></div>
            </div>
            <p className="mt-2 text-sm text-gray-500">75% of capacity</p>
          </div>
        </div>
      </div>

      {/* Recent trades and top agents */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-800">Recent Trades</h2>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Symbol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Side</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.recentTrades.length > 0 ? (
                  data.recentTrades.slice(0, 5).map((trade, index) => (
                    <tr key={index}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">{trade.symbol}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${trade.side === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">${trade.price?.toFixed(2)}</td>
                      <td className={`whitespace-nowrap px-4 py-3 text-sm ${(trade.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${(trade.profit_loss || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-center text-sm text-gray-500">No recent trades</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-800">Top Performing Agents</h2>
          <div className="space-y-4">
            {data.topPerformingAgents.length > 0 ? (
              data.topPerformingAgents.map((agent, index) => (
                <div key={index} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{agent.name}</h3>
                      <p className="text-sm text-gray-500">{agent.agent_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Win Rate: {(agent.performance_metrics?.win_rate * 100).toFixed(2)}%</p>
                      <p className="text-sm text-gray-500">PF: {agent.performance_metrics?.profit_factor.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-gray-500">
                No agents data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Market Summary */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">Market Summary</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Market</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">24h Change</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.marketSummary.trending.slice(0, 5).map((market, index) => (
                <tr key={index}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">{market.symbol}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">${market.price?.toFixed(2)}</td>
                  <td className={`whitespace-nowrap px-4 py-3 text-sm ${(market.change_24h || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(market.change_24h || 0) >= 0 ? '+' : ''}{(market.change_24h || 0).toFixed(2)}%
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">${(market.volume_24h || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  trend: "up" | "down" | "neutral";
}

function StatCard({ title, value, description, trend }: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-1 text-sm font-medium text-gray-500">{title}</h3>
      <p className="mb-2 text-3xl font-bold text-gray-900">{value}</p>
      <div className="flex items-center">
        {trend === "up" && (
          <svg className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        )}
        {trend === "down" && (
          <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        <span className="ml-1 text-sm text-gray-500">{description}</span>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  trend: "up" | "down" | "neutral";
}

function MetricCard({ title, value, trend }: MetricCardProps) {
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
    </div>
  );
}
