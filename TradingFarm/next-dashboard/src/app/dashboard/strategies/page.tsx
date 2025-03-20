"use client"

import { useState } from 'react'
import { LineChart, Plus, Filter, ArrowUpDown, Info, MoreHorizontal, Play, Pause, Edit, Copy, Trash2 } from 'lucide-react'

// Mock data for strategies
const mockStrategies = [
  {
    id: 'strat-001',
    name: 'Momentum Rider',
    description: 'Follows market momentum with adaptive entry and exit points',
    status: 'active',
    type: 'trend',
    timeframe: '4h',
    performance: '+8.3%',
    lastUpdated: '2025-03-15T10:30:00Z'
  },
  {
    id: 'strat-002',
    name: 'Volatility Breakout',
    description: 'Captures price breakouts during high volatility periods',
    status: 'paused',
    type: 'breakout',
    timeframe: '1h',
    performance: '+4.2%',
    lastUpdated: '2025-03-18T14:15:00Z'
  },
  {
    id: 'strat-003',
    name: 'Mean Reversion VWAP',
    description: 'Trades reversions to VWAP with oversold/overbought filters',
    status: 'active',
    type: 'mean-reversion',
    timeframe: '15m',
    performance: '+5.7%',
    lastUpdated: '2025-03-19T09:45:00Z'
  },
  {
    id: 'strat-004',
    name: 'Bollinger Band Scalper',
    description: 'Scalps price movements between Bollinger Bands',
    status: 'inactive',
    type: 'scalping',
    timeframe: '5m',
    performance: '-1.2%',
    lastUpdated: '2025-03-14T16:20:00Z'
  }
]

export default function StrategiesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  
  // Filter strategies based on search term and status
  const filteredStrategies = mockStrategies.filter(strategy => {
    const matchesSearch = strategy.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         strategy.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === null || strategy.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })
  
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
          <button className="btn-primary flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            New Strategy
          </button>
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
          onClick={() => setSelectedStatus('paused')}
          className={`px-3 py-1 text-sm rounded-full ${
            selectedStatus === 'paused' 
              ? 'bg-warning/20 text-warning border border-warning/30' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Paused
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
      </div>
      
      {/* Strategies Table */}
      <div className="dashboard-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium">
                  <div className="flex items-center">
                    Strategy
                    <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground" />
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-medium">Type</th>
                <th className="text-left py-3 px-4 font-medium">Timeframe</th>
                <th className="text-left py-3 px-4 font-medium">Performance</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStrategies.map((strategy) => (
                <tr key={strategy.id} className="border-b border-border">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{strategy.name}</div>
                      <div className="text-sm text-muted-foreground">{strategy.description}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">{strategy.type}</td>
                  <td className="py-3 px-4">{strategy.timeframe}</td>
                  <td className="py-3 px-4">
                    <span className={strategy.performance.startsWith('+') ? 'text-success' : 'text-danger'}>
                      {strategy.performance}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      strategy.status === 'active' 
                        ? 'bg-success/10 text-success' 
                        : strategy.status === 'paused'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {strategy.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    {strategy.status === 'active' ? (
                      <button className="p-1 hover:bg-muted rounded-md" title="Pause strategy">
                        <Pause className="h-4 w-4" />
                      </button>
                    ) : (
                      <button className="p-1 hover:bg-muted rounded-md" title="Start strategy">
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    <button className="p-1 hover:bg-muted rounded-md" title="Edit strategy">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-1 hover:bg-muted rounded-md" title="Duplicate strategy">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button className="p-1 hover:bg-muted rounded-md" title="Delete strategy">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredStrategies.length === 0 && (
            <div className="text-center p-8">
              <p className="text-muted-foreground">No strategies found matching your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
