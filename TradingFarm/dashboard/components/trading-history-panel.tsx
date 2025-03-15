"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

type HistoryItem = {
  id: string
  type: 'order' | 'position' | 'fill' | 'cancellation' | 'cost'
  symbol: string
  status: 'success' | 'partial' | 'failure'
  description: string
  timestamp: Date
  details: Record<string, any>
}

export function TradingHistoryPanel() {
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([
    {
      id: "ord-1234",
      type: "order",
      symbol: "BTC/USDT",
      status: "success",
      description: "Market buy order executed",
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      details: {
        orderId: "ord-1234",
        side: "buy",
        type: "market",
        amount: 0.25,
        price: 41250.50,
        cost: 10312.63,
        fees: 5.16,
        slippage: 0.02
      }
    },
    {
      id: "pos-5678",
      type: "position",
      symbol: "ETH/USDT",
      status: "success",
      description: "Position opened",
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      details: {
        positionId: "pos-5678",
        side: "long",
        entryPrice: 2250.75,
        amount: 2.5,
        leverage: 1,
        stopLoss: 2150.00,
        takeProfit: 2400.00
      }
    },
    {
      id: "fill-9012",
      type: "fill",
      symbol: "SOL/USDT",
      status: "partial",
      description: "Limit sell partially filled",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      details: {
        orderId: "ord-3456",
        side: "sell",
        type: "limit",
        amount: 50,
        amountFilled: 30,
        amountRemaining: 20,
        price: 103.25,
        averageFillPrice: 103.28,
        filledCost: 3098.40,
        fees: 1.55
      }
    },
    {
      id: "can-3456",
      type: "cancellation",
      symbol: "LINK/USDT",
      status: "success",
      description: "Limit buy order cancelled",
      timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
      details: {
        orderId: "ord-7890",
        reason: "user_requested",
        side: "buy",
        type: "limit",
        amount: 100,
        price: 15.75,
        timeInForce: "GTC"
      }
    },
    {
      id: "cost-7890",
      type: "cost",
      symbol: "Various",
      status: "success",
      description: "Daily cost analysis",
      timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      details: {
        period: "1d",
        totalTradeCount: 28,
        totalVolume: 135000,
        totalFees: 67.50,
        averageSlippage: 0.025,
        feesPercentage: 0.05,
        largestCostCategory: "exchange_fees"
      }
    }
  ])

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'success': return 'history-item-success'
      case 'partial': return 'history-item-partial'
      case 'failure': return 'history-item-failure'
      default: return ''
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order': return '📋'
      case 'position': return '📊'
      case 'fill': return '✅'
      case 'cancellation': return '❌'
      case 'cost': return '💰'
      default: return '🔄'
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString()
  }

  const viewItemDetails = (item: HistoryItem) => {
    setSelectedItem(item)
  }

  const renderItemDetails = () => {
    if (!selectedItem) return null

    return (
      <div className="bg-slate-800 p-3 rounded-md mt-3">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-slate-100">
            {getTypeIcon(selectedItem.type)} {selectedItem.description}
          </h4>
          <button 
            onClick={() => setSelectedItem(null)}
            className="text-slate-400 hover:text-slate-200"
          >
            ×
          </button>
        </div>
        
        <div className="text-xs text-slate-300 mb-3">
          {selectedItem.symbol} • {formatTimestamp(selectedItem.timestamp)}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(selectedItem.details).map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <span className="text-xs text-slate-400 capitalize">
                {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
              </span>
              <span className="text-sm text-slate-200">
                {typeof value === 'number' && key.includes('price') ? 
                  `$${value.toFixed(2)}` : value.toString()}
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-3 pt-3 border-t border-slate-700">
          <button className="w-full py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200">
            View in Trading History Explorer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-xs text-slate-400">
          Recent Activity
        </div>
        <button className="text-xs text-blue-400 hover:text-blue-300">
          View All History
        </button>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {historyItems.map(item => (
          <div 
            key={item.id}
            className={`history-item ${getStatusClass(item.status)} cursor-pointer hover:bg-slate-800 p-2 rounded transition-colors`}
            onClick={() => viewItemDetails(item)}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="mr-2">{getTypeIcon(item.type)}</span>
                <div>
                  <p className="text-sm text-slate-200">{item.description}</p>
                  <p className="text-xs text-slate-400">
                    {item.symbol} • {formatTimestamp(item.timestamp)}
                  </p>
                </div>
              </div>
              <div className="text-xs font-medium">
                {item.type === 'order' && item.details.side === 'buy' && (
                  <span className="text-green-400">+${item.details.cost.toFixed(2)}</span>
                )}
                {item.type === 'order' && item.details.side === 'sell' && (
                  <span className="text-red-400">-${item.details.cost.toFixed(2)}</span>
                )}
                {item.type === 'position' && (
                  <span className={item.details.side === 'long' ? 'text-green-400' : 'text-red-400'}>
                    {item.details.side === 'long' ? 'LONG' : 'SHORT'}
                  </span>
                )}
                {item.type === 'fill' && (
                  <span className="text-blue-400">{(item.details.amountFilled / item.details.amount * 100).toFixed(0)}%</span>
                )}
                {item.type === 'cancellation' && (
                  <span className="text-orange-400">CANCELLED</span>
                )}
                {item.type === 'cost' && (
                  <span className="text-purple-400">${item.details.totalFees}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {renderItemDetails()}
      
      <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
        <span>Trading History Framework v0.1.0</span>
        <button className="text-blue-400 hover:text-blue-300">
          Advanced Analysis
        </button>
      </div>
    </div>
  )
}
