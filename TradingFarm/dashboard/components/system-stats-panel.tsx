"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"

type SystemMetric = {
  name: string
  value: string | number
  change?: number
  status: 'normal' | 'warning' | 'critical'
  trend?: 'up' | 'down' | 'stable'
}

export function SystemStatsPanel() {
  const [metrics, setMetrics] = useState<SystemMetric[]>([
    {
      name: "CPU Usage",
      value: "32%",
      change: 2,
      status: "normal",
      trend: "up"
    },
    {
      name: "Memory Usage",
      value: "4.2GB/8GB",
      change: -0.5,
      status: "normal",
      trend: "down"
    },
    {
      name: "Active Agents",
      value: 5,
      status: "normal"
    },
    {
      name: "Exchange Connections",
      value: "3/4",
      status: "warning",
      trend: "stable"
    },
    {
      name: "API Requests/min",
      value: 78,
      change: 12,
      status: "normal",
      trend: "up"
    },
    {
      name: "Pending Orders",
      value: 2,
      status: "normal"
    },
    {
      name: "System Uptime",
      value: "3d 7h 22m",
      status: "normal"
    },
    {
      name: "ElizaOS Status",
      value: "Connected",
      status: "normal"
    }
  ])
  
  // Simulate real-time updates
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setMetrics(prev => prev.map(metric => {
        // Only update some metrics to simulate real changes
        if (metric.name === "CPU Usage") {
          const newValue = Math.floor(Math.random() * 15) + 25
          const prevValue = parseInt(metric.value as string)
          return {
            ...metric,
            value: `${newValue}%`,
            change: newValue - prevValue,
            trend: newValue > prevValue ? 'up' : newValue < prevValue ? 'down' : 'stable',
            status: newValue < 50 ? 'normal' : newValue < 80 ? 'warning' : 'critical'
          }
        }
        
        if (metric.name === "API Requests/min") {
          const newValue = Math.floor(Math.random() * 20) + 70
          return {
            ...metric,
            value: newValue,
            change: newValue - (metric.value as number),
            trend: newValue > (metric.value as number) ? 'up' : newValue < (metric.value as number) ? 'down' : 'stable'
          }
        }
        
        if (metric.name === "Pending Orders") {
          const newValue = Math.floor(Math.random() * 5)
          return {
            ...metric,
            value: newValue,
            status: newValue < 5 ? 'normal' : newValue < 10 ? 'warning' : 'critical'
          }
        }
        
        return metric
      }))
    }, 5000)
    
    return () => clearInterval(updateInterval)
  }, [])
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'critical': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }
  
  const getTrendIndicator = (trend?: string) => {
    if (!trend) return null
    
    switch (trend) {
      case 'up': return '↑'
      case 'down': return '↓'
      case 'stable': return '→'
      default: return null
    }
  }
  
  const getTrendColor = (trend?: string, status?: string) => {
    if (!trend) return ''
    
    if (status === 'critical') return 'text-red-400'
    if (status === 'warning') return 'text-yellow-400'
    
    switch (trend) {
      case 'up': return 'text-green-400'
      case 'down': return 'text-blue-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg">
      <div className="p-4 border-b border-slate-800">
        <h3 className="font-medium text-slate-100">System Stats</h3>
        <p className="text-xs text-slate-400">Real-time performance metrics</p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-slate-800 p-3 rounded">
            <div className="flex justify-between items-start">
              <p className="text-xs text-slate-400">{metric.name}</p>
              {metric.trend && (
                <span className={`text-xs ${getTrendColor(metric.trend, metric.status)}`}>
                  {getTrendIndicator(metric.trend)}
                  {metric.change && metric.change > 0 && '+'}
                  {metric.change}
                </span>
              )}
            </div>
            <p className={`text-lg font-medium mt-1 ${getStatusColor(metric.status)}`}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-slate-800 flex justify-between items-center">
        <p className="text-xs text-slate-400">Last updated: {new Date().toLocaleTimeString()}</p>
        <button className="text-xs text-blue-400 hover:text-blue-300">
          View Detailed Metrics
        </button>
      </div>
    </div>
  )
}
