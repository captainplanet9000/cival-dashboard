"use client"

import { useState } from 'react'
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
const DashboardOverview = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-primary/10 mr-4">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Active Trades</p>
          <p className="text-2xl font-bold">24</p>
        </div>
      </div>
      
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-success/10 mr-4">
          <TrendingUp className="h-6 w-6 text-success" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Performance (24h)</p>
          <p className="text-2xl font-bold text-success">+3.8%</p>
        </div>
      </div>
      
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-warning/10 mr-4">
          <AlertOctagon className="h-6 w-6 text-warning" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Risk Level</p>
          <p className="text-2xl font-bold">Medium</p>
        </div>
      </div>
      
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-accent/10 mr-4">
          <Wallet className="h-6 w-6 text-accent" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Total Funds</p>
          <p className="text-2xl font-bold">$125,430</p>
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
const ActiveTradesSection = () => {
  const trades = [
    {
      id: 'trade-1',
      market: 'BTC/USDT',
      type: 'Long',
      entryPrice: 64250,
      currentPrice: 64785,
      pnl: '+0.83%',
      status: 'profit',
      time: '2h 15m'
    },
    {
      id: 'trade-2',
      market: 'ETH/USDT',
      type: 'Short',
      entryPrice: 3450,
      currentPrice: 3380,
      pnl: '+2.03%',
      status: 'profit',
      time: '5h 32m'
    },
    {
      id: 'trade-3',
      market: 'SOL/USDT',
      type: 'Long',
      entryPrice: 142.5,
      currentPrice: 138.75,
      pnl: '-2.63%',
      status: 'loss',
      time: '1h 48m'
    },
    {
      id: 'trade-4',
      market: 'XRP/USDT',
      type: 'Short',
      entryPrice: 0.548,
      currentPrice: 0.562,
      pnl: '-2.55%',
      status: 'loss',
      time: '4h 5m'
    }
  ]

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
            {trades.map((trade) => (
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
                <td className={trade.status === 'profit' ? 'text-success' : 'text-danger'}>
                  {trade.pnl}
                </td>
                <td>{trade.time}</td>
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
const GoalProgressSection = () => {
  const goals = [
    {
      id: 'goal-1',
      name: 'Acquire 10,000 SUI',
      progress: 65,
      target: '10,000 SUI',
      current: '6,500 SUI',
      deadline: 'Mar 30, 2025'
    },
    {
      id: 'goal-2',
      name: '20% Monthly Profit',
      progress: 42,
      target: '20%',
      current: '8.4%',
      deadline: 'Apr 15, 2025'
    }
  ]

  return (
    <div className="dashboard-card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Goal Progress</h2>
        <button className="btn-primary text-sm">
          New Goal
        </button>
      </div>
      
      <div className="space-y-4">
        {goals.map((goal) => (
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
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Trading Farm Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your trading activity, manage farms, and track performance.
        </p>
      </div>
      
      <DashboardOverview />
      <MasterControlPanel />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <ActiveTradesSection />
        </div>
        <div>
          <GoalProgressSection />
        </div>
      </div>
    </div>
  )
}
