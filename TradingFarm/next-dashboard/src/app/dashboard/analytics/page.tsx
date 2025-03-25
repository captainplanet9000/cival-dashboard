"use client"

import { useState } from 'react'
import { BarChart2, TrendingUp, Clock, Calendar, Download, Printer, Share2, Filter, ArrowLeft, ArrowRight, LineChart, ArrowUpDown, ArrowRightLeft, ChevronsUpDown, DollarSign, MoreHorizontal } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// Mock data for performance stats
const performanceStats = [
  { title: 'Total Return', value: '+28.5%', change: '+2.3%', period: 'Since Inception' },
  { title: 'Monthly Return', value: '+4.2%', change: '+0.8%', period: 'Mar 2025' },
  { title: 'Winning Trades', value: '72%', change: '+3%', period: 'Last 30 Days' },
  { title: 'Average Win', value: '+2.8%', change: '-0.3%', period: 'Per Trade' }
]

// Mock data for monthly returns
const monthlyReturns = [
  { month: 'Jan', return: 2.1 },
  { month: 'Feb', return: 3.4 },
  { month: 'Mar', return: 4.2 },
  { month: 'Apr', return: -1.3 },
  { month: 'May', return: 5.2 },
  { month: 'Jun', return: 2.7 },
  { month: 'Jul', return: 3.8 },
  { month: 'Aug', return: -0.9 },
  { month: 'Sep', return: 4.1 },
  { month: 'Oct', return: 2.9 },
  { month: 'Nov', return: 3.5 },
  { month: 'Dec', return: 5.7 }
]

// Mock data for strategy performance
const strategyPerformance = [
  { name: 'Momentum Rider', returns: 12.5, trades: 84, winRate: 76 },
  { name: 'Volatility Breakout', returns: 8.7, trades: 62, winRate: 68 },
  { name: 'Mean Reversion VWAP', returns: 10.3, trades: 92, winRate: 71 },
  { name: 'Bollinger Band Scalper', returns: 5.9, trades: 154, winRate: 63 },
  { name: 'Fibonacci Retracement', returns: 7.4, trades: 42, winRate: 69 }
]

// Mock data for asset allocation
const assetAllocation = [
  { asset: 'BTC', percentage: 35, value: 15420.50 },
  { asset: 'ETH', percentage: 25, value: 11014.65 },
  { asset: 'SOL', percentage: 15, value: 6608.79 },
  { asset: 'AVAX', percentage: 10, value: 4405.86 },
  { asset: 'USDT', percentage: 15, value: 6608.79 }
]

// Mock data for trades
const mockTrades = [
  { id: 1, symbol: 'AAPL', type: 'Long', entryPrice: 175.23, currentPrice: 180.56, pnl: '+3.23%', value: 10000.00, strategy: 'Momentum Rider', status: 'open' },
  { id: 2, symbol: 'GOOGL', type: 'Short', entryPrice: 2750.12, currentPrice: 2700.56, pnl: '-1.78%', value: 5000.00, strategy: 'Volatility Breakout', status: 'closed' },
  { id: 3, symbol: 'MSFT', type: 'Long', entryPrice: 325.67, currentPrice: 330.89, pnl: '+1.56%', value: 8000.00, strategy: 'Mean Reversion VWAP', status: 'open' },
]

// Time period options
const timePeriods = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'YTD', value: 'ytd' },
  { label: 'All', value: 'all' }
]

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  
  // Filter trades based on search term and status
  const filteredTrades = mockTrades.filter(trade => {
    const matchesSearch = trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         trade.strategy.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === null || trade.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Trades</h1>
        <p className="text-muted-foreground">
          Comprehensive performance metrics and trading analytics
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="trades" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span>Trades</span>
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab Content */}
        <TabsContent value="analytics" className="mt-4 space-y-6">
          {/* Time Period Selector */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {timePeriods.map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={`px-3 py-1 text-sm rounded-md ${
                    selectedPeriod === period.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {period.label}
                </button>
              ))}
              <button className="flex items-center gap-1 px-3 py-1 text-sm rounded-md bg-muted text-muted-foreground hover:bg-muted/80">
                <Calendar className="h-4 w-4" />
                <span>Custom</span>
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 px-3 py-1 text-sm rounded-md border border-border hover:bg-muted">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button className="flex items-center gap-1 px-3 py-1 text-sm rounded-md border border-border hover:bg-muted">
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
              <button className="flex items-center gap-1 px-3 py-1 text-sm rounded-md border border-border hover:bg-muted">
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
          
          {/* Performance Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {performanceStats.map((stat, index) => (
              <div key={index} className="dashboard-card">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                  <div className="flex items-end justify-between">
                    <span className={`text-2xl font-bold ${
                      stat.value.startsWith('+') ? 'text-success' : 
                      stat.value.startsWith('-') ? 'text-danger' : ''
                    }`}>{stat.value}</span>
                    <div className="flex flex-col items-end">
                      <span className={`text-sm ${
                        stat.change.startsWith('+') ? 'text-success' : 
                        stat.change.startsWith('-') ? 'text-danger' : ''
                      }`}>{stat.change}</span>
                      <span className="text-xs text-muted-foreground">{stat.period}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Main Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Chart */}
            <div className="lg:col-span-2 dashboard-card">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between">
                  <h3 className="text-lg font-medium">Performance Chart</h3>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80">
                      <TrendingUp className="h-3 w-3" />
                      <span>Portfolio</span>
                    </button>
                    <button className="flex items-center gap-1 px-2 py-1 text-xs rounded-md">
                      <BarChart2 className="h-3 w-3" />
                      <span>Benchmark</span>
                    </button>
                  </div>
                </div>
                
                {/* Placeholder for Performance Chart */}
                <div className="relative aspect-[16/9] w-full bg-muted/30 rounded-md flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <BarChart2 className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Performance Chart Visualization</p>
                    <p className="text-xs text-muted-foreground">TradingView Lightweight Charts Component</p>
                  </div>
                </div>
                
                {/* Chart Period Navigation */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Mar 2024 - Mar 2025</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded-md hover:bg-muted">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button className="p-1 rounded-md hover:bg-muted">
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Monthly Returns */}
            <div className="dashboard-card">
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-medium">Monthly Returns (%)</h3>
                
                {/* Monthly Returns Bar Chart */}
                <div className="space-y-2">
                  {monthlyReturns.map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.month}</span>
                        <span className={item.return >= 0 ? 'text-success' : 'text-danger'}>
                          {item.return > 0 ? '+' : ''}{item.return.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${item.return >= 0 ? 'bg-success' : 'bg-danger'}`}
                          style={{ 
                            width: `${Math.abs(item.return) * 5}%`, 
                            marginLeft: item.return < 0 ? 'auto' : '0' 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Strategy Performance */}
          <div className="dashboard-card">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Strategy Performance</h3>
                <button className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-muted">
                  <Filter className="h-3 w-3" />
                  <span>Filter</span>
                </button>
              </div>
              
              {/* Strategy Performance Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium">Strategy</th>
                      <th className="text-right py-2 px-3 font-medium">Return (%)</th>
                      <th className="text-right py-2 px-3 font-medium">Trades</th>
                      <th className="text-right py-2 px-3 font-medium">Win Rate (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategyPerformance.map((strategy, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="py-2 px-3">{strategy.name}</td>
                        <td className="py-2 px-3 text-right text-success">+{strategy.returns.toFixed(1)}%</td>
                        <td className="py-2 px-3 text-right">{strategy.trades}</td>
                        <td className="py-2 px-3 text-right">{strategy.winRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Asset Allocation */}
          <div className="dashboard-card">
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-medium">Asset Allocation</h3>
              
              {/* Asset Allocation Chart Placeholder */}
              <div className="flex-1 aspect-square max-w-[200px] mx-auto bg-muted/30 rounded-full flex items-center justify-center">
                <div className="text-center">
                  <span className="text-xs text-muted-foreground">Donut Chart Component</span>
                </div>
              </div>
              
              {/* Asset Allocation Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium">Asset</th>
                      <th className="text-right py-2 px-3 font-medium">Allocation (%)</th>
                      <th className="text-right py-2 px-3 font-medium">Value ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetAllocation.map((asset, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="py-2 px-3">{asset.asset}</td>
                        <td className="py-2 px-3 text-right">{asset.percentage}%</td>
                        <td className="py-2 px-3 text-right">${asset.value.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Trades Tab Content */}
        <TabsContent value="trades" className="mt-4 space-y-6">
          {/* Trade Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="dashboard-card">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">Total Active Trades</span>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">3</span>
                  <span className="text-sm text-success">+3 today</span>
                </div>
              </div>
            </div>
            
            <div className="dashboard-card">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">Portfolio Value</span>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">$17,854.36</span>
                  <span className="text-sm text-success">+$532.92 (24h)</span>
                </div>
              </div>
            </div>
            
            <div className="dashboard-card">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">Overall PnL (24h)</span>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-success">+1.85%</span>
                  <span className="flex items-center text-sm text-success">
                    <ChevronsUpDown className="h-4 w-4 mr-1" />
                    0.35%
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Controls and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-2">
              <button className="btn-primary flex items-center">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Manual Trade
              </button>
              <button className="btn-ghost flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </button>
            </div>
            
            <div className="relative flex-1 sm:max-w-xs">
              <input
                type="text"
                placeholder="Search trades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input w-full"
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setSelectedStatus(null)}
              className={`px-3 py-1 text-sm rounded-full ${
                selectedStatus === null 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              All
            </button>
            <button 
              onClick={() => setSelectedStatus('open')}
              className={`px-3 py-1 text-sm rounded-full ${
                selectedStatus === 'open' 
                  ? 'bg-success/20 text-success border border-success/30' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              Open
            </button>
            <button 
              onClick={() => setSelectedStatus('closed')}
              className={`px-3 py-1 text-sm rounded-full ${
                selectedStatus === 'closed' 
                  ? 'bg-muted/50 text-muted-foreground border border-muted/30' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              Closed
            </button>
          </div>
          
          {/* Trades Table */}
          <div className="dashboard-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">
                      <div className="flex items-center">
                        Symbol
                        <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">Entry</th>
                    <th className="text-left py-3 px-4 font-medium">Current</th>
                    <th className="text-left py-3 px-4 font-medium">PnL</th>
                    <th className="text-left py-3 px-4 font-medium">Value</th>
                    <th className="text-left py-3 px-4 font-medium">Strategy</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-border hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center mr-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                          </div>
                          {trade.symbol}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          trade.type === 'Long' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-danger/10 text-danger'
                        }`}>
                          {trade.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">${trade.entryPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className="py-3 px-4">${trade.currentPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className="py-3 px-4">
                        <span className={`${
                          trade.pnl.startsWith('+') ? 'text-success' : 'text-danger'
                        } font-medium`}>
                          {trade.pnl}
                        </span>
                      </td>
                      <td className="py-3 px-4">${trade.value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className="py-3 px-4 text-sm">{trade.strategy}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <button className="p-2 hover:bg-muted rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
