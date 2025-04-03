"use client"

import React from 'react'
import { LineChart, Plus, Filter, ArrowUpDown, Info, MoreHorizontal, Play, Pause, Edit, Copy, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { StrategyCard, StrategyStatus, StrategyMetric } from '@/components/ui/strategy-card'

// Mock data for strategies
const mockStrategies = [
  {
    id: 'strat-001',
    name: 'Momentum Rider',
    description: 'Follows market momentum with adaptive entry and exit points',
    status: 'active' as StrategyStatus,
    exchange: 'Bybit',
    pair: 'BTC/USDT',
    profitLoss: 8.3,
    type: 'trend',
    timeframe: '4h',
    metrics: [
      { name: 'Win Rate', value: '68%', status: 'positive' },
      { name: 'Avg. Trade', value: '+2.1%', status: 'positive' },
      { name: 'Max Drawdown', value: '-5.3%', status: 'neutral' },
      { name: 'Sharpe', value: '1.8', status: 'positive' }
    ] as StrategyMetric[],
    lastRun: '2025-03-15T10:30:00Z',
    runCount: 42,
    isElizaEnabled: true
  },
  {
    id: 'strat-002',
    name: 'Volatility Breakout',
    description: 'Captures price breakouts during high volatility periods',
    status: 'inactive' as StrategyStatus,
    exchange: 'Coinbase',
    pair: 'ETH/USDT',
    profitLoss: 4.2,
    type: 'breakout',
    timeframe: '1h',
    metrics: [
      { name: 'Win Rate', value: '52%', status: 'neutral' },
      { name: 'Avg. Trade', value: '+3.5%', status: 'positive' },
      { name: 'Max Drawdown', value: '-8.7%', status: 'negative' },
      { name: 'Sharpe', value: '1.2', status: 'neutral' }
    ] as StrategyMetric[],
    lastRun: '2025-03-18T14:15:00Z',
    runCount: 27,
    isElizaEnabled: false
  },
  {
    id: 'strat-003',
    name: 'Mean Reversion VWAP',
    description: 'Trades reversions to VWAP with oversold/overbought filters',
    status: 'active' as StrategyStatus,
    exchange: 'Binance',
    pair: 'SOL/USDT',
    profitLoss: 5.7,
    type: 'mean-reversion',
    timeframe: '15m',
    metrics: [
      { name: 'Win Rate', value: '61%', status: 'positive' },
      { name: 'Avg. Trade', value: '+1.8%', status: 'positive' },
      { name: 'Max Drawdown', value: '-4.1%', status: 'neutral' },
      { name: 'Sharpe', value: '1.5', status: 'positive' }
    ] as StrategyMetric[],
    lastRun: '2025-03-19T09:45:00Z',
    runCount: 36,
    isElizaEnabled: true
  },
  {
    id: 'strat-004',
    name: 'Bollinger Band Scalper',
    description: 'Scalps price movements between Bollinger Bands',
    status: 'error' as StrategyStatus,
    exchange: 'Kraken',
    pair: 'XRP/USDT',
    profitLoss: -1.2,
    type: 'scalping',
    timeframe: '5m',
    metrics: [
      { name: 'Win Rate', value: '48%', status: 'negative' },
      { name: 'Avg. Trade', value: '-0.5%', status: 'negative' },
      { name: 'Max Drawdown', value: '-9.3%', status: 'negative' },
      { name: 'Sharpe', value: '0.7', status: 'negative' }
    ] as StrategyMetric[],
    lastRun: '2025-03-14T16:20:00Z',
    runCount: 15,
    isElizaEnabled: false
  },
  {
    id: 'strat-005',
    name: 'AI Sentiment Trader',
    description: 'Uses ElizaOS to analyze market sentiment and execute trades based on social media trends',
    status: 'optimizing' as StrategyStatus,
    exchange: 'FTX',
    pair: 'AVAX/USDT',
    profitLoss: 12.5,
    type: 'ai',
    timeframe: '1d',
    metrics: [
      { name: 'Win Rate', value: '72%', status: 'positive' },
      { name: 'Avg. Trade', value: '+4.2%', status: 'positive' },
      { name: 'Max Drawdown', value: '-6.8%', status: 'neutral' },
      { name: 'Sharpe', value: '2.1', status: 'positive' }
    ] as StrategyMetric[],
    lastRun: '2025-03-20T08:10:00Z',
    runCount: 18,
    isElizaEnabled: true
  },
  {
    id: 'strat-006',
    name: 'Grid Trading Bot',
    description: 'Places buy and sell orders at regular intervals to profit from sideways markets',
    status: 'backtest' as StrategyStatus,
    exchange: 'Kucoin',
    pair: 'DOT/USDT',
    profitLoss: 3.7,
    type: 'grid',
    timeframe: '6h',
    metrics: [
      { name: 'Win Rate', value: '58%', status: 'neutral' },
      { name: 'Avg. Trade', value: '+1.2%', status: 'positive' },
      { name: 'Max Drawdown', value: '-3.9%', status: 'neutral' },
      { name: 'Sharpe', value: '1.4', status: 'neutral' }
    ] as StrategyMetric[],
    lastRun: '2025-03-17T12:25:00Z',
    runCount: 22,
    isElizaEnabled: false
  }
]

export default function StrategiesPage() {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedStatus, setSelectedStatus] = React.useState<string | null>(null)
  
  // Filter strategies based on search term and status
  const filteredStrategies = mockStrategies.filter(strategy => {
    const matchesSearch = strategy.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         strategy.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === null || strategy.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })
  
  // Strategy action handlers
  const handleStart = (id: string) => {
    console.log(`Starting strategy ${id}`)
    // Add implementation to start strategy
  }

  const handleStop = (id: string) => {
    console.log(`Stopping strategy ${id}`)
    // Add implementation to stop strategy
  }

  const handleEdit = (id: string) => {
    console.log(`Editing strategy ${id}`)
    // Add implementation to navigate to strategy editor
  }

  const handleBacktest = (id: string) => {
    console.log(`Backtesting strategy ${id}`)
    // Add implementation to start backtest
  }

  const handleOptimize = (id: string) => {
    console.log(`Optimizing strategy ${id}`)
    // Add implementation to start optimization
  }

  const handleDuplicate = (id: string) => {
    console.log(`Duplicating strategy ${id}`)
    // Add implementation to duplicate strategy
  }

  const handleDelete = (id: string) => {
    console.log(`Deleting strategy ${id}`)
    // Add implementation to delete strategy
  }

  const handleElizaToggle = (id: string, enabled: boolean) => {
    console.log(`Setting ElizaOS to ${enabled ? 'enabled' : 'disabled'} for strategy ${id}`)
    // Add implementation to toggle ElizaOS
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Strategies</h1>
        <p className="text-muted-foreground">
          Create, manage, and optimize your trading strategies
        </p>
      </div>
      
      {/* Controls and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <Link href="/dashboard/strategies/builder" className="btn-primary flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            New Strategy
          </Link>
          <button className="btn-ghost flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </button>
        </div>
        
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            placeholder="Search strategies..."
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
          onClick={() => setSelectedStatus('active')}
          className={`px-3 py-1 text-sm rounded-full ${
            selectedStatus === 'active' 
              ? 'bg-success/20 text-success border border-success/30' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Active
        </button>
        <button 
          onClick={() => setSelectedStatus('inactive')}
          className={`px-3 py-1 text-sm rounded-full ${
            selectedStatus === 'inactive' 
              ? 'bg-muted/50 text-muted-foreground border border-muted/30' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Inactive
        </button>
        <button 
          onClick={() => setSelectedStatus('error')}
          className={`px-3 py-1 text-sm rounded-full ${
            selectedStatus === 'error' 
              ? 'bg-destructive/20 text-destructive border border-destructive/30' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Error
        </button>
        <button 
          onClick={() => setSelectedStatus('optimizing')}
          className={`px-3 py-1 text-sm rounded-full ${
            selectedStatus === 'optimizing' 
              ? 'bg-purple-500/20 text-purple-500 border border-purple-500/30' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Optimizing
        </button>
        <button 
          onClick={() => setSelectedStatus('backtest')}
          className={`px-3 py-1 text-sm rounded-full ${
            selectedStatus === 'backtest' 
              ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Backtesting
        </button>
      </div>
      
      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStrategies.map((strategy) => (
          <StrategyCard 
            key={strategy.id}
            id={strategy.id}
            name={strategy.name}
            description={strategy.description}
            status={strategy.status}
            exchange={strategy.exchange}
            pair={strategy.pair}
            profitLoss={strategy.profitLoss}
            metrics={strategy.metrics}
            lastRun={strategy.lastRun}
            runCount={strategy.runCount}
            isElizaEnabled={strategy.isElizaEnabled}
            onStart={() => handleStart(strategy.id)}
            onStop={() => handleStop(strategy.id)}
            onEdit={() => handleEdit(strategy.id)}
            onBacktest={() => handleBacktest(strategy.id)}
            onOptimize={() => handleOptimize(strategy.id)}
            onDuplicate={() => handleDuplicate(strategy.id)}
            onDelete={() => handleDelete(strategy.id)}
            onElizaToggle={(enabled) => handleElizaToggle(strategy.id, enabled)}
          />
        ))}

        {filteredStrategies.length === 0 && (
          <div className="dashboard-card col-span-full text-center p-8">
            <p className="text-muted-foreground">No strategies found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
