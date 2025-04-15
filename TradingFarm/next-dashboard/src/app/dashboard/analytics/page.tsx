"use client"

import { useState } from 'react'
import { BarChart2, TrendingUp, Clock, Calendar, Download, Printer, Share2, Filter, ArrowLeft, ArrowRight } from 'lucide-react'

import { useQuery } from '@tanstack/react-query';
import { fetchPerformanceStats, fetchMonthlyReturns } from '@/services/queries';

const { data: performanceStats = [], isLoading: statsLoading, error: statsError } = useQuery<any[]>({
  queryKey: ['performanceStats'],
  queryFn: fetchPerformanceStats,
});

const { data: monthlyReturns = [], isLoading: returnsLoading, error: returnsError } = useQuery<any[]>({
  queryKey: ['monthlyReturns'],
  queryFn: fetchMonthlyReturns,
});

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
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive performance metrics and trading analytics
        </p>
      </div>
      
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
      
      {/* Strategy Performance and Asset Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>
    </div>
  )
}
