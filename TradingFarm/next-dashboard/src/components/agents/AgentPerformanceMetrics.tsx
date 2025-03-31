"use client"

import { useState } from 'react'
import { 
  LineChart, 
  BarChart, 
  TrendingUp, 
  Calendar, 
  Clock, 
  DollarSign,
  Award,
  Zap,
  RefreshCw
} from 'lucide-react'

interface PerformanceMetricsProps {
  agentId: string;
  agentName: string;
  trades: number;
  winRate: number;
  performance: number;
  timeActive: string;
  avgTradeHoldTime: string;
  successiveWins: number;
  profitFactor: number;
}

/**
 * A comprehensive performance metrics display for trading agents
 * Displays key performance indicators and trading statistics
 */
export const AgentPerformanceMetrics = ({
  agentId,
  agentName,
  trades,
  winRate,
  performance,
  timeActive,
  avgTradeHoldTime,
  successiveWins,
  profitFactor
}: PerformanceMetricsProps) => {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'all'>('week')
  
  // This would typically come from an API based on the timeframe
  // For now, we're using static data
  const performanceData = {
    day: [0.2, 0.5, -0.3, 0.8, 1.2, 0.4, -0.6, 0.9, 1.1, 0.7, 0.3, 0.5],
    week: [1.2, 2.1, -0.8, 1.5, 2.3, -1.2, 0.9, 1.7],
    month: [3.2, 5.1, -2.3, 4.2, 3.8, -1.5, 2.9, 4.1, 1.2, -0.8, 3.5, 2.7],
    all: [5.2, 8.7, -3.1, 6.5, 12.3, -4.2, 7.8, 9.2, 11.5, -2.8, 8.4, 10.1]
  }

  return (
    <div className="space-y-6 p-4 rounded-lg border bg-card">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-semibold flex items-center">
          <LineChart className="mr-2 h-5 w-5 text-primary" />
          Performance Metrics
        </h3>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => setTimeframe('day')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeframe === 'day' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Day
          </button>
          <button 
            onClick={() => setTimeframe('week')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeframe === 'week' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Week
          </button>
          <button 
            onClick={() => setTimeframe('month')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeframe === 'month' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Month
          </button>
          <button 
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeframe === 'all' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            All
          </button>
        </div>
      </div>
      
      {/* Performance Chart */}
      <div className="w-full h-48 bg-muted/30 rounded-md relative">
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          {/* This would be replaced with an actual chart component */}
          <div className="flex flex-col items-center">
            <LineChart className="h-10 w-10 mb-2" />
            <p className="text-sm">Performance chart visualization</p>
            <p className="text-xs mt-1">Based on {trades} trades over {timeframe}</p>
          </div>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/20 p-3 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Win Rate</h4>
            <Award className="h-4 w-4 text-success" />
          </div>
          <p className="text-2xl font-bold">{winRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            {winRate > 50 ? 'Above average' : 'Below average'}
          </p>
        </div>
        
        <div className="bg-muted/20 p-3 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Total Return</h4>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold">
            <span className={performance >= 0 ? 'text-success' : 'text-destructive'}>
              {performance >= 0 ? '+' : ''}{performance}%
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Based on completed trades
          </p>
        </div>
        
        <div className="bg-muted/20 p-3 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Profit Factor</h4>
            <DollarSign className="h-4 w-4 text-warning" />
          </div>
          <p className="text-2xl font-bold">{profitFactor.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ratio of profits to losses
          </p>
        </div>
        
        <div className="bg-muted/20 p-3 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Successive Wins</h4>
            <Zap className="h-4 w-4 text-success" />
          </div>
          <p className="text-2xl font-bold">{successiveWins}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Longest winning streak
          </p>
        </div>
      </div>
      
      {/* Additional Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center">
          <div className="p-2 rounded-full bg-muted/30 mr-3">
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{trades}</p>
            <p className="text-xs text-muted-foreground">Total Trades</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="p-2 rounded-full bg-muted/30 mr-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{avgTradeHoldTime}</p>
            <p className="text-xs text-muted-foreground">Avg Hold Time</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="p-2 rounded-full bg-muted/30 mr-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{timeActive}</p>
            <p className="text-xs text-muted-foreground">Time Active</p>
          </div>
        </div>
      </div>
      
      <div className="pt-2 border-t flex justify-between items-center">
        <button className="inline-flex items-center text-sm text-primary hover:underline">
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh Data
        </button>
        
        <button className="inline-flex items-center text-sm text-primary hover:underline">
          View Detailed Analytics →
        </button>
      </div>
    </div>
  )
}

export default AgentPerformanceMetrics; 