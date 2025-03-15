"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Search, Plus, BarChart2, Zap, Layers, Play, Pause, Edit, Copy, Trash2, FilePlus, ArrowUpDown, CheckCircle2, Star, Clock } from "lucide-react"

export interface Strategy {
  id: string
  name: string
  description: string
  status: 'active' | 'paused' | 'draft'
  type: string
  markets: string[]
  timeframe: string
  winRate: number
  profitFactor: number
  sharpeRatio: number
  trades: number
  tags: string[]
  lastEdited: string
}

export interface StrategyControlPanelProps {
  defaultStrategies?: Strategy[]
}

export function StrategyControlPanel({ defaultStrategies = [] }: StrategyControlPanelProps) {
  const [strategies, setStrategies] = React.useState<Strategy[]>(defaultStrategies.length > 0 ? defaultStrategies : [
    {
      id: "strat-1",
      name: "MACD Crossover",
      description: "Uses MACD indicator to identify market momentum shifts",
      status: "active",
      type: "trend",
      markets: ["BTC/USDT", "ETH/USDT"],
      timeframe: "4h",
      winRate: 65,
      profitFactor: 1.7,
      sharpeRatio: 1.2,
      trades: 142,
      tags: ["trend", "momentum", "btc", "eth"],
      lastEdited: "2 days ago"
    },
    {
      id: "strat-2",
      name: "RSI Reversal",
      description: "Detects overbought and oversold conditions using RSI",
      status: "paused",
      type: "reversal",
      markets: ["BTC/USDT", "SOL/USDT", "ADA/USDT"],
      timeframe: "1h",
      winRate: 58,
      profitFactor: 1.4,
      sharpeRatio: 0.9,
      trades: 217,
      tags: ["reversal", "oscillator", "btc", "sol", "ada"],
      lastEdited: "5 days ago"
    },
    {
      id: "strat-3",
      name: "Bollinger Breakout",
      description: "Identifies volatility breakouts using Bollinger Bands",
      status: "draft",
      type: "breakout",
      markets: ["ETH/USDT", "AVAX/USDT"],
      timeframe: "15m",
      winRate: 51,
      profitFactor: 1.9,
      sharpeRatio: 1.3,
      trades: 89,
      tags: ["breakout", "volatility", "eth", "avax"],
      lastEdited: "1 week ago"
    }
  ])
  
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("all")
  const [sortBy, setSortBy] = React.useState("name")
  const [sortDirection, setSortDirection] = React.useState("asc")
  
  // Filter strategies based on search and tab selection
  const filteredStrategies = strategies.filter((strategy: Strategy) => {
    const matchesSearch = 
      strategy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      strategy.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      strategy.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    if (activeTab === "all") return matchesSearch
    return matchesSearch && strategy.status === activeTab
  }).sort((a: Strategy, b: Strategy) => {
    let comparison = 0
    
    // Sort based on selected criteria
    if (sortBy === "name") {
      comparison = a.name.localeCompare(b.name)
    } else if (sortBy === "winRate") {
      comparison = a.winRate - b.winRate
    } else if (sortBy === "profitFactor") {
      comparison = a.profitFactor - b.profitFactor
    } else if (sortBy === "trades") {
      comparison = a.trades - b.trades
    }
    
    // Handle sort direction
    return sortDirection === "asc" ? comparison : -comparison
  })
  
  // Add a new strategy
  const handleAddStrategy = () => {
    const newStrategy: Strategy = {
      id: `strat-${strategies.length + 1}`,
      name: "New Strategy",
      description: "Strategy description",
      status: "draft",
      type: "custom",
      markets: ["BTC/USDT"],
      timeframe: "1h",
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      trades: 0,
      tags: ["custom"],
      lastEdited: "Just now"
    }
    
    setStrategies((prevStrategies: Strategy[]) => [...prevStrategies, newStrategy])
  }
  
  // Delete a strategy
  const handleDeleteStrategy = (id: string) => {
    setStrategies((prevStrategies: Strategy[]) => prevStrategies.filter((s: Strategy) => s.id !== id))
  }
  
  // Toggle strategy status
  const handleToggleStatus = (id: string) => {
    setStrategies((prevStrategies: Strategy[]) => 
      prevStrategies.map((s: Strategy) => {
        if (s.id === id) {
          const newStatus = s.status === 'active' ? 'paused' : 'active'
          return { ...s, status: newStatus as 'active' | 'paused' | 'draft' }
        }
        return s
      })
    )
  }
  
  // Clone a strategy
  const handleCloneStrategy = (id: string) => {
    const strategyToClone = strategies.find((s: Strategy) => s.id === id)
    if (!strategyToClone) return
    
    const clonedStrategy: Strategy = {
      ...strategyToClone,
      id: `strat-${strategies.length + 1}`,
      name: `${strategyToClone.name} (Copy)`,
      status: 'draft',
      lastEdited: 'Just now'
    }
    
    setStrategies((prevStrategies: Strategy[]) => [...prevStrategies, clonedStrategy])
  }
  
  // Handle sort change
  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // New field, default to ascending
      setSortBy(field)
      setSortDirection("asc")
    }
  }
  
  return (
    <Card className="app-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardDescription className="text-gray-500 text-xs uppercase font-medium">Trading Logic</CardDescription>
            <CardTitle className="text-xl font-semibold text-gray-900">Strategy Control Panel</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4" />
                  Add Strategy
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Strategy</DialogTitle>
                  <DialogDescription>
                    Configure your trading strategy settings
                  </DialogDescription>
                </DialogHeader>
                {/* Strategy Form Would Go Here */}
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Strategy Name</Label>
                    <Input id="name" placeholder="Enter strategy name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" placeholder="Brief description of your strategy" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="markets">Markets</Label>
                    <Input id="markets" placeholder="E.g. BTC/USDT, ETH/USDT" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeframe">Timeframe</Label>
                    <Input id="timeframe" placeholder="E.g. 1h, 4h, 1d" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input id="tags" placeholder="E.g. trend, momentum" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleAddStrategy}>
                    Create Strategy
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" className="border-gray-200 gap-1.5 text-gray-700">
              <FilePlus className="h-4 w-4" />
              Import
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search and Filter Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <div className="w-full sm:w-auto flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Search strategies..." 
                className="pl-9 bg-gray-50 border-gray-200"
              />
            </div>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto bg-gray-100">
                <TabsTrigger value="all" className="text-xs data-[state=active]:bg-white">
                  All
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs data-[state=active]:bg-white">
                  Active
                </TabsTrigger>
                <TabsTrigger value="draft" className="text-xs data-[state=active]:bg-white">
                  Draft
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Strategies List */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 grid grid-cols-12 text-xs font-medium text-gray-500 border-b border-gray-200">
              <div className="col-span-4 px-4 py-3 flex items-center gap-1 cursor-pointer" onClick={() => handleSortChange("name")}>
                Strategy
                <ArrowUpDown className="h-3 w-3" />
              </div>
              <div className="col-span-2 px-4 py-3 flex items-center gap-1 cursor-pointer" onClick={() => handleSortChange("winRate")}>
                Win Rate
                <ArrowUpDown className="h-3 w-3" />
              </div>
              <div className="col-span-2 px-4 py-3 flex items-center gap-1 cursor-pointer" onClick={() => handleSortChange("profitFactor")}>
                Profit Factor
                <ArrowUpDown className="h-3 w-3" />
              </div>
              <div className="col-span-2 px-4 py-3 flex items-center gap-1 cursor-pointer" onClick={() => handleSortChange("trades")}>
                Trades
                <ArrowUpDown className="h-3 w-3" />
              </div>
              <div className="col-span-2 px-4 py-3 text-right">
                Actions
              </div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {filteredStrategies.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  No strategies found. Create a new one to get started.
                </div>
              ) : (
                filteredStrategies.map((strategy: Strategy) => (
                  <div key={strategy.id} className="grid grid-cols-12 py-4 px-4 hover:bg-gray-50 transition-colors">
                    <div className="col-span-4 flex flex-col justify-center">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          strategy.type === 'trend' ? 'bg-blue-50' : 
                          strategy.type === 'reversal' ? 'bg-purple-50' : 
                          strategy.type === 'breakout' ? 'bg-amber-50' : 'bg-gray-50'
                        }`}>
                          {strategy.type === 'trend' ? <BarChart2 className="h-4 w-4 text-blue-600" /> : 
                           strategy.type === 'reversal' ? <ArrowUpDown className="h-4 w-4 text-purple-600" /> : 
                           strategy.type === 'breakout' ? <Zap className="h-4 w-4 text-amber-600" /> : 
                           <Layers className="h-4 w-4 text-gray-600" />}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-1.5">
                            {strategy.name}
                            <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                              strategy.status === 'active' ? 'bg-green-100 text-green-800' : 
                              strategy.status === 'paused' ? 'bg-amber-100 text-amber-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {strategy.status === 'active' ? 'Active' : 
                               strategy.status === 'paused' ? 'Paused' : 'Draft'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {strategy.markets.join(", ")} • {strategy.timeframe}
                          </div>
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {strategy.tags.map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 border-gray-200 text-gray-600">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 flex flex-col justify-center">
                      <div className="font-medium text-gray-900">{strategy.winRate}%</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Success rate
                      </div>
                    </div>
                    <div className="col-span-2 flex flex-col justify-center">
                      <div className="font-medium text-gray-900">{strategy.profitFactor.toFixed(2)}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500" />
                        Profit/Loss ratio
                      </div>
                    </div>
                    <div className="col-span-2 flex flex-col justify-center">
                      <div className="font-medium text-gray-900">{strategy.trades}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        Last: {strategy.lastEdited}
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleToggleStatus(strategy.id)}
                        className="h-8 w-8 text-gray-500 hover:text-gray-700"
                      >
                        {strategy.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-gray-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleCloneStrategy(strategy.id)}
                        className="h-8 w-8 text-gray-500 hover:text-gray-700"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteStrategy(strategy.id)}
                        className="h-8 w-8 text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
