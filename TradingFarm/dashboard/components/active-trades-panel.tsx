"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Trade = {
  id: string
  symbol: string
  side: 'long' | 'short'
  entryPrice: number
  currentPrice: number
  size: number
  leverage: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  timeOpen: Date
  strategy: string
  stopLoss: number | null
  takeProfit: number | null
  actions: string[]
  isElizaOSManaged: boolean
}

export function ActiveTradesPanel() {
  const [trades, setTrades] = React.useState<Trade[]>([
    {
      id: "trade-001",
      symbol: "BTC/USDT",
      side: "long",
      entryPrice: 41250.75,
      currentPrice: 41872.50,
      size: 0.25,
      leverage: 1,
      unrealizedPnl: 155.44,
      unrealizedPnlPercent: 1.51,
      timeOpen: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      strategy: "Moving Average Crossover",
      stopLoss: 40625.25,
      takeProfit: 42500.00,
      actions: ["close", "update_sl_tp", "add", "reduce"],
      isElizaOSManaged: true
    },
    {
      id: "trade-002",
      symbol: "ETH/USDT",
      side: "long",
      entryPrice: 2250.75,
      currentPrice: 2285.25,
      size: 2.5,
      leverage: 1,
      unrealizedPnl: 86.25,
      unrealizedPnlPercent: 1.53,
      timeOpen: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
      strategy: "RSI Reversal Strategy",
      stopLoss: 2175.50,
      takeProfit: 2350.00,
      actions: ["close", "update_sl_tp", "add", "reduce"],
      isElizaOSManaged: false
    },
    {
      id: "trade-003",
      symbol: "SOL/USDT",
      side: "short",
      entryPrice: 108.25,
      currentPrice: 103.75,
      size: 50,
      leverage: 1,
      unrealizedPnl: 225.00,
      unrealizedPnlPercent: 4.16,
      timeOpen: new Date(Date.now() - 1000 * 60 * 60 * 24), // 24 hours ago
      strategy: "MACD Histogram Strategy",
      stopLoss: 110.50,
      takeProfit: 95.75,
      actions: ["close", "update_sl_tp", "add", "reduce"],
      isElizaOSManaged: true
    },
    {
      id: "trade-004",
      symbol: "LINK/USDT",
      side: "long",
      entryPrice: 15.75,
      currentPrice: 15.32,
      size: 100,
      leverage: 1,
      unrealizedPnl: -43.00,
      unrealizedPnlPercent: -2.73,
      timeOpen: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
      strategy: "ElizaOS ML Predictor",
      stopLoss: 14.90,
      takeProfit: 17.25,
      actions: ["close", "update_sl_tp", "add", "reduce"],
      isElizaOSManaged: true
    }
  ])

  const [selectedTrade, setSelectedTrade] = React.useState<Trade | null>(null)
  const [isTradeActionModalOpen, setIsTradeActionModalOpen] = React.useState(false)
  const [expandedTradeId, setExpandedTradeId] = React.useState<string | null>(null)

  const toggleExpandTrade = (tradeId: string) => {
    if (expandedTradeId === tradeId) {
      setExpandedTradeId(null)
    } else {
      setExpandedTradeId(tradeId)
    }
  }

  const formatDuration = (date: Date) => {
    const durationMs = Date.now() - date.getTime()
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const openTradeActionModal = (trade: Trade) => {
    setSelectedTrade(trade)
    setIsTradeActionModalOpen(true)
  }

  const closeTradeActionModal = () => {
    setIsTradeActionModalOpen(false)
    setSelectedTrade(null)
  }

  const closeTrade = (tradeId: string) => {
    // In a real app, this would send an API request to close the trade
    setTrades((prev: Trade[]) => prev.filter((trade: Trade) => trade.id !== tradeId))
    closeTradeActionModal()
  }

  const renderTradeActionModal = () => {
    if (!selectedTrade || !isTradeActionModalOpen) return null

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 rounded-lg w-full max-w-md">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Trade Actions</h2>
                <div className="flex items-center mt-1">
                  <span className="text-sm text-slate-400">{selectedTrade.symbol}</span>
                  <span className={`ml-2 text-sm ${selectedTrade.side === 'long' ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedTrade.side.toUpperCase()}
                  </span>
                </div>
              </div>
              <button 
                onClick={closeTradeActionModal}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-slate-800 p-3 rounded">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-slate-400">Entry Price</p>
                    <p className="text-base font-medium text-slate-200">${selectedTrade.entryPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Current Price</p>
                    <p className="text-base font-medium text-slate-200">${selectedTrade.currentPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Size</p>
                    <p className="text-base font-medium text-slate-200">{selectedTrade.size}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">PnL</p>
                    <p className={`text-base font-medium ${selectedTrade.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${selectedTrade.unrealizedPnl.toFixed(2)} ({selectedTrade.unrealizedPnlPercent.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <button 
                  className="w-full py-2 bg-red-500/80 hover:bg-red-600 rounded text-sm font-medium text-white"
                  onClick={() => closeTrade(selectedTrade.id)}
                >
                  Close Trade
                </button>
                
                <button className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium text-slate-200">
                  Modify Stop Loss/Take Profit
                </button>
                
                <button className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium text-slate-200">
                  Add to Position
                </button>
                
                <button className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium text-slate-200">
                  Reduce Position
                </button>
                
                {selectedTrade.isElizaOSManaged && (
                  <button className="w-full py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded text-sm font-medium text-blue-400">
                    Request ElizaOS Analysis
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Active Trades</h2>
          <p className="text-sm text-slate-400">Monitor and manage your open positions</p>
        </div>
        <div className="text-sm text-slate-400">
          Total PnL: {
            trades.reduce((total: number, trade: Trade) => total + trade.unrealizedPnl, 0).toFixed(2)
          }
        </div>
      </div>
      
      <div className="space-y-3">
        {trades.map((trade: Trade) => (
          <div key={trade.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div 
              className="px-4 py-3 flex justify-between items-center cursor-pointer"
              onClick={() => toggleExpandTrade(trade.id)}
            >
              <div className="flex items-center space-x-3">
                <div className={`trade-indicator ${trade.side === 'long' ? 'bg-green-500' : 'bg-red-500'} w-2 h-10 rounded-full`}></div>
                <div>
                  <div className="flex items-center">
                    <h3 className="font-medium text-slate-100">{trade.symbol}</h3>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${trade.side === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {trade.side.toUpperCase()}
                    </span>
                    {trade.isElizaOSManaged && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                        ElizaOS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatDuration(trade.timeOpen)} • {trade.strategy}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`font-medium ${trade.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.unrealizedPnl >= 0 ? '+' : ''}{trade.unrealizedPnlPercent.toFixed(2)}%
                </p>
                <p className="text-xs text-slate-400">
                  ${trade.unrealizedPnl.toFixed(2)}
                </p>
              </div>
            </div>
            
            {expandedTradeId === trade.id && (
              <div className="px-4 py-3 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-slate-400">Entry Price</p>
                    <p className="text-sm font-medium text-slate-200">${trade.entryPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Current Price</p>
                    <p className="text-sm font-medium text-slate-200">${trade.currentPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Stop Loss</p>
                    <p className="text-sm font-medium text-slate-200">
                      {trade.stopLoss ? `$${trade.stopLoss.toFixed(2)}` : 'None'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Take Profit</p>
                    <p className="text-sm font-medium text-slate-200">
                      {trade.takeProfit ? `$${trade.takeProfit.toFixed(2)}` : 'None'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Size</p>
                    <p className="text-sm font-medium text-slate-200">{trade.size}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Leverage</p>
                    <p className="text-sm font-medium text-slate-200">{trade.leverage}x</p>
                  </div>
                </div>
                
                {trade.isElizaOSManaged && (
                  <div className="bg-blue-900/20 border border-blue-800/30 rounded p-2 mb-3">
                    <p className="text-xs text-blue-400">
                      ElizaOS Forecast: {
                        trade.unrealizedPnl >= 0 
                          ? "High probability of continued momentum. Consider trailing stop." 
                          : "Temporary retracement detected. AI suggests hold position."
                      }
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2">
                  <button 
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200"
                    onClick={(e) => {
                      e.stopPropagation()
                      openTradeActionModal(trade)
                    }}
                  >
                    Actions
                  </button>
                  <button 
                    className="px-3 py-1.5 bg-red-500/80 hover:bg-red-600 rounded text-xs text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTrade(trade.id)
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {trades.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col items-center justify-center">
            <p className="text-slate-400 mb-2">No active trades</p>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white">
              Open New Trade
            </button>
          </div>
        )}
      </div>
      
      {renderTradeActionModal()}
    </div>
  )
}
