"use client"

import { useState } from 'react'
import { ArrowUpDown, ExternalLink, Filter, Plus, MoreHorizontal, ChevronsUpDown, DollarSign, ArrowRightLeft } from 'lucide-react'

// Mock data for trades
const mockTrades = [
  {
    id: 'trade-001',
    symbol: 'BTC/USDT',
    type: 'Long',
    entryPrice: 66542.80,
    currentPrice: 67982.35,
    size: 0.15,
    pnl: '+3.67%',
    value: 10197.35,
    status: 'open',
    timestamp: '2025-03-19T14:30:00Z',
    strategy: 'Momentum Rider'
  },
  {
    id: 'trade-002',
    symbol: 'ETH/USDT',
    type: 'Long',
    entryPrice: 3521.45,
    currentPrice: 3492.30,
    size: 1.2,
    pnl: '-0.83%',
    value: 4190.76,
    status: 'open',
    timestamp: '2025-03-19T15:45:00Z',
    strategy: 'Volatility Breakout'
  },
  {
    id: 'trade-003',
    symbol: 'SOL/USDT',
    type: 'Short',
    entryPrice: 142.35,
    currentPrice: 138.65,
    size: 25,
    pnl: '+2.60%',
    value: 3466.25,
    status: 'open',
    timestamp: '2025-03-19T16:15:00Z',
    strategy: 'Mean Reversion VWAP'
  },
  {
    id: 'trade-004',
    symbol: 'ETH/USDT',
    type: 'Long',
    entryPrice: 3498.25,
    currentPrice: 3492.30,
    size: 0.8,
    pnl: '-0.17%',
    value: 2793.84,
    status: 'closed',
    timestamp: '2025-03-18T12:30:00Z',
    strategy: 'Bollinger Band Scalper'
  },
  {
    id: 'trade-005',
    symbol: 'BTC/USDT',
    type: 'Short',
    entryPrice: 65782.40,
    currentPrice: 67982.35,
    size: 0.12,
    pnl: '-3.35%',
    value: 8157.88,
    status: 'closed',
    timestamp: '2025-03-18T10:15:00Z',
    strategy: 'Momentum Rider'
  }
]

export default function TradesPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Trades</h1>
        <p className="text-muted-foreground">
          View and manage your active and historical trades
        </p>
      </div>
      
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
                <th className="text-left py-3 px-4 font-medium">Size</th>
                <th className="text-left py-3 px-4 font-medium">Entry Price</th>
                <th className="text-left py-3 px-4 font-medium">Current Price</th>
                <th className="text-left py-3 px-4 font-medium">PnL</th>
                <th className="text-left py-3 px-4 font-medium">Strategy</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="border-b border-border">
                  <td className="py-3 px-4 font-medium">{trade.symbol}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trade.type === 'Long' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-danger/10 text-danger'
                    }`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">{trade.size}</td>
                  <td className="py-3 px-4">${trade.entryPrice.toFixed(2)}</td>
                  <td className="py-3 px-4">${trade.currentPrice.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={trade.pnl.startsWith('+') ? 'text-success' : 'text-danger'}>
                      {trade.pnl}
                    </span>
                  </td>
                  <td className="py-3 px-4">{trade.strategy}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trade.status === 'open' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="p-1 hover:bg-muted rounded-md" title="View details">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button className="p-1 hover:bg-muted rounded-md" title="More options">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredTrades.length === 0 && (
            <div className="text-center p-8">
              <p className="text-muted-foreground">No trades found matching your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
