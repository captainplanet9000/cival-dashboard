"use client"

import React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MasterControlPanel } from "@/components/master-control-panel"
import { StrategyControlPanel } from "@/components/strategy-control-panel"
import { ActiveTradesPanel } from "@/components/active-trades-panel"
import { DashboardHeader } from "@/components/dashboard-header"
import { 
  ChevronDown, 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Percent
} from "lucide-react"

export default function Dashboard() {
  const [timeframe, setTimeframe] = React.useState("1M")
  const profitLoss = 12.8
  const isProfitable = profitLoss > 0
  
  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader />
      
      <main className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Trading Dashboard</h1>
            <p className="text-slate-400">Monitor your trading performance and system metrics</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-400">Timeframe</div>
            <div className="bg-slate-900 border border-slate-800 rounded-md flex">
              {["1D", "1W", "1M", "3M", "YTD", "1Y"].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeframe(period)}
                  className={`px-3 py-1.5 text-sm font-medium ${timeframe === period ? 'bg-blue-900 text-blue-300' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  {period}
                </button>
              ))}
              <button className="px-2 py-1.5 text-slate-400 hover:bg-slate-800">
                <Calendar className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Portfolio Value</p>
                <h3 className="text-2xl font-semibold text-slate-100">$528,976.82</h3>
                <div className={`flex items-center text-xs ${isProfitable ? 'text-green-600' : 'text-red-600'} mt-1`}>
                  {isProfitable ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  <span>{isProfitable ? '+' : ''}{profitLoss}% vs prev.</span>
                </div>
              </div>
              <div className="bg-blue-900 p-2 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-300" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-400 mb-1">Active Strategies</p>
                <h3 className="text-2xl font-semibold text-slate-100">14</h3>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  <span>+2 this week</span>
                </div>
              </div>
              <div className="bg-purple-900 p-2 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-300" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-400 mb-1">Win Rate</p>
                <h3 className="text-2xl font-semibold text-slate-100">64.2%</h3>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  <span>+2.5% vs prev.</span>
                </div>
              </div>
              <div className="bg-green-900 p-2 rounded-lg">
                <Percent className="h-5 w-5 text-green-300" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-400 mb-1">Open Positions</p>
                <h3 className="text-2xl font-semibold text-slate-100">7</h3>
                <div className="flex items-center text-xs text-blue-600 mt-1">
                  <span>Across 5 markets</span>
                </div>
              </div>
              <div className="bg-amber-900 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-300" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm mb-6">
          <div className="border-b border-slate-800 p-4">
            <Tabs defaultValue="master-control" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="master-control" className="text-sm">Master Control</TabsTrigger>
                <TabsTrigger value="strategy-control" className="text-sm">Strategy Control</TabsTrigger>
                <TabsTrigger value="active-trades" className="text-sm">Active Trades</TabsTrigger>
              </TabsList>
              
              <TabsContent value="master-control" className="mt-0">
                <MasterControlPanel />
              </TabsContent>
              
              <TabsContent value="strategy-control" className="mt-0">
                <StrategyControlPanel />
              </TabsContent>
              
              <TabsContent value="active-trades" className="mt-0">
                <ActiveTradesPanel />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        <div className="text-xs text-slate-400 text-center mt-8">
          ElizaOS Trading Farm Dashboard &copy; 2025
        </div>
      </main>
    </div>
  )
}
