"use client"

import { useState } from 'react'
import { 
  Building, 
  CircleDollarSign, 
  Package, 
  ArrowUpRight,
  ArrowDownRight, 
  ChevronDown, 
  ChevronLeft,
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  RefreshCw,
  Edit,
  PlusCircle,
  Activity,
  Trash2,
  Server,
  Wrench,
  Brain,
  Target,
  Landmark,
  BarChart2,
  LineChart,
  Settings,
  User
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import FarmDetails from '@/components/farms/farm-details'
import FarmForm from '@/components/farms/farm-form'
import { Badge } from '@/components/ui/badge'

interface FarmType {
  id: string
  name: string
  description: string
}

interface FarmAgent {
  id: string
  name: string
  type: string
  performance: number
  status: 'active' | 'paused' | 'inactive'
  strategies: number
  allocation: number
}

interface MCPServer {
  id: string
  name: string
  type: string
  category: string
  endpoint: string
  status: "active" | "inactive" | "error"
  farms: string[]
  lastUsed: string
  rateLimit: {
    maxCalls: number
    period: "second" | "minute" | "hour" | "day"
    currentUsage: number
  }
  functions: {
    name: string
    enabled: boolean
    permissions: string[]
  }[]
}

interface ToolModule {
  id: string
  name: string
  type: string
  category: string
  version: string
  status: "active" | "inactive" | "update-available"
  farms: string[]
  lastUpdated: string
  capabilities: string[]
  permissions: string[]
}

interface AIModel {
  id: string
  name: string
  provider: "OpenRouter" | "OpenAI" | "Anthropic" | "Other"
  type: "primary" | "fallback"
  usage: string
  costPerToken: number
  performance: {
    strategyAnalysis: number
    decisionQuality: number
    speed: number
    costEfficiency: number
    roiImpact: number
  }
  settings: {
    temperature: number
    maxTokens: number
    topP: number
  }
}

interface Farm {
  id: string
  name: string
  type: string
  status: 'active' | 'paused' | 'inactive'
  balance: {
    amount: string
    symbol: string
  }
  performance: {
    day: number
    week: number
    month: number
    total: number
  }
  agents: string[]
  strategies: number
  utilization: number
  createdAt: string
  description?: string
  mcpServers?: string[] // IDs of connected MCP servers
  toolModules?: string[] // IDs of integrated tool modules
  aiModels?: string[] // IDs of configured AI models
  goalProgress?: number // Percentage of goal completion
}

export default function FarmsPage() {
  // State for farm filtering and details
  const [farmFilter, setFarmFilter] = useState('')
  const [serverFilter, setServerFilter] = useState('')
  const [toolFilter, setToolFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [isFarmSelected, setIsFarmSelected] = useState(false)
  
  // Tab navigation
  const [activeTab, setActiveTab] = useState('active')
  const [dashboardTab, setDashboardTab] = useState('farms')
  
  // Modal state
  const [showFarmModal, setShowFarmModal] = useState(false)
  const [showFarmDetails, setShowFarmDetails] = useState(false)
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null)
  const [activeDetailTab, setActiveDetailTab] = useState('overview')

  // Sample farm data
  const farms: Farm[] = [
    {
      id: '1',
      name: 'DCA Farm',
      type: 'Accumulation',
      status: 'active',
      balance: {
        amount: '0.75',
        symbol: 'BTC'
      },
      performance: {
        day: 1.2,
        week: 3.5,
        month: 8.2,
        total: 22.5
      },
      agents: ['Alpha', 'Beta'],
      strategies: 3,
      utilization: 85,
      createdAt: '2025-01-15',
      mcpServers: ['1'],
      toolModules: ['1'],
      aiModels: ['1'],
      goalProgress: 65
    },
    {
      id: '2',
      name: 'Momentum Farm',
      type: 'Trend Following',
      status: 'active',
      balance: {
        amount: '15000',
        symbol: 'USDT'
      },
      performance: {
        day: -0.5,
        week: 2.8,
        month: 12.5,
        total: 35.2
      },
      agents: ['Delta', 'Gamma', 'Zeta'],
      strategies: 4,
      utilization: 92,
      createdAt: '2025-02-10',
      mcpServers: ['1', '2'],
      toolModules: ['1', '2'],
      aiModels: ['1'],
      goalProgress: 78
    },
    {
      id: '3',
      name: 'Swing Trading Farm',
      type: 'Swing',
      status: 'active',
      balance: {
        amount: '2.5',
        symbol: 'ETH'
      },
      performance: {
        day: 2.1,
        week: 5.7,
        month: 18.3,
        total: 42.6
      },
      agents: ['Beta', 'Zeta'],
      strategies: 2,
      utilization: 78,
      createdAt: '2025-01-22',
      mcpServers: ['2'],
      toolModules: ['2'],
      aiModels: ['2'],
      goalProgress: 42
    },
    {
      id: '4',
      name: 'Yield Farm',
      type: 'Yield',
      status: 'paused',
      balance: {
        amount: '25000',
        symbol: 'USDC'
      },
      performance: {
        day: 0.2,
        week: 1.2,
        month: 5.8,
        total: 18.5
      },
      agents: ['Alpha'],
      strategies: 5,
      utilization: 62,
      createdAt: '2024-12-05',
      mcpServers: [],
      toolModules: ['1'],
      aiModels: [],
      goalProgress: 30
    },
    {
      id: '5',
      name: 'Arbitrage Farm',
      type: 'Arbitrage',
      status: 'inactive',
      balance: {
        amount: '0.5',
        symbol: 'BTC'
      },
      performance: {
        day: 0,
        week: 0,
        month: 8.5,
        total: 32.7
      },
      agents: [],
      strategies: 3,
      utilization: 0,
      createdAt: '2024-11-15',
      mcpServers: [],
      toolModules: [],
      aiModels: [],
      goalProgress: 0
    }
  ]
  
  // Sample farm types
  const farmTypes: FarmType[] = [
    { id: '1', name: 'Accumulation', description: 'Dollar-cost averaging approach to accumulate assets over time' },
    { id: '2', name: 'Trend Following', description: 'Follows market momentum to capitalize on established trends' },
    { id: '3', name: 'Swing', description: 'Takes advantage of price swings within medium-term trends' },
    { id: '4', name: 'Yield', description: 'Focuses on generating passive income through staking and lending' },
    { id: '5', name: 'Arbitrage', description: 'Exploits price differences between markets for low-risk returns' },
    { id: '6', name: 'Grid Trading', description: 'Places buy and sell orders at set intervals to profit from range-bound markets' }
  ]
  
  // Sample agents
  const agents: FarmAgent[] = [
    { id: '1', name: 'Alpha Agent', type: 'DCA', performance: 8.2, status: 'active', strategies: 3, allocation: 50 },
    { id: '2', name: 'Beta Agent', type: 'Momentum', performance: 12.5, status: 'active', strategies: 4, allocation: 75 },
    { id: '3', name: 'Gamma Agent', type: 'Swing', performance: -2.3, status: 'paused', strategies: 2, allocation: 25 },
    { id: '4', name: 'Delta Agent', type: 'Yield', performance: 5.4, status: 'active', strategies: 5, allocation: 100 },
    { id: '5', name: 'Epsilon Agent', type: 'Arbitrage', performance: 3.8, status: 'inactive', strategies: 3, allocation: 0 },
    { id: '6', name: 'Zeta Agent', type: 'Grid', performance: 7.1, status: 'active', strategies: 4, allocation: 50 }
  ]
  
  // Sample MCP servers
  const mcpServers: MCPServer[] = [
    { 
      id: '1', 
      name: 'MCP Server 1', 
      type: 'Mainnet', 
      category: 'Public', 
      endpoint: 'https://mcp-server-1.com', 
      status: 'active', 
      farms: ['1', '2'], 
      lastUsed: '2025-01-15', 
      rateLimit: { 
        maxCalls: 100, 
        period: 'minute', 
        currentUsage: 50 
      }, 
      functions: [
        { name: 'Function 1', enabled: true, permissions: ['read', 'write'] },
        { name: 'Function 2', enabled: false, permissions: ['read'] }
      ] 
    },
    { 
      id: '2', 
      name: 'MCP Server 2', 
      type: 'Testnet', 
      category: 'Private', 
      endpoint: 'https://mcp-server-2.com', 
      status: 'inactive', 
      farms: ['3'], 
      lastUsed: '2025-01-20', 
      rateLimit: { 
        maxCalls: 50, 
        period: 'hour', 
        currentUsage: 20 
      }, 
      functions: [
        { name: 'Function 3', enabled: true, permissions: ['read', 'write', 'delete'] },
        { name: 'Function 4', enabled: false, permissions: ['read'] }
      ] 
    }
  ]

  // Sample tool modules
  const toolModules: ToolModule[] = [
    { 
      id: '1', 
      name: 'Tool Module 1', 
      type: 'Technical Analysis', 
      category: 'Public', 
      version: '1.0.0', 
      status: 'active', 
      farms: ['1', '2'], 
      lastUpdated: '2025-01-15', 
      capabilities: ['charting', 'indicators'], 
      permissions: ['read', 'write'] 
    },
    { 
      id: '2', 
      name: 'Tool Module 2', 
      type: 'Machine Learning', 
      category: 'Private', 
      version: '2.0.0', 
      status: 'inactive', 
      farms: ['3'], 
      lastUpdated: '2025-01-20', 
      capabilities: ['prediction', 'optimization'], 
      permissions: ['read', 'write', 'delete'] 
    }
  ]

  // Sample AI models
  const aiModels: AIModel[] = [
    { 
      id: '1', 
      name: 'AI Model 1', 
      provider: 'OpenRouter', 
      type: 'primary', 
      usage: 'Strategy optimization', 
      costPerToken: 0.01, 
      performance: { 
        strategyAnalysis: 8.5, 
        decisionQuality: 9.2, 
        speed: 7.8, 
        costEfficiency: 8.1, 
        roiImpact: 9.5 
      }, 
      settings: { 
        temperature: 0.7, 
        maxTokens: 100, 
        topP: 0.9 
      } 
    },
    { 
      id: '2', 
      name: 'AI Model 2', 
      provider: 'Anthropic', 
      type: 'fallback', 
      usage: 'Risk management', 
      costPerToken: 0.02, 
      performance: { 
        strategyAnalysis: 7.9, 
        decisionQuality: 8.5, 
        speed: 8.2, 
        costEfficiency: 7.5, 
        roiImpact: 8.8 
      }, 
      settings: { 
        temperature: 0.6, 
        maxTokens: 50, 
        topP: 0.8 
      } 
    }
  ]

  // Filter farms based on status and search query
  const filteredFarms = farms.filter(farm => {
    if (activeTab === 'all') return true
    if (activeTab === 'active') return farm.status === 'active'
    if (activeTab === 'paused') return farm.status === 'paused'
    if (activeTab === 'inactive') return farm.status === 'inactive'
    return false
  }).filter(farm => {
    if (!farmFilter) return true
    return (
      farm.name.toLowerCase().includes(farmFilter.toLowerCase()) ||
      farm.type.toLowerCase().includes(farmFilter.toLowerCase())
    )
  })
  
  // Utility functions
  function getStatusBadgeClass(status: string) {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-600';
      case 'paused':
        return 'bg-amber-500/20 text-amber-600';
      case 'inactive':
        return 'bg-gray-500/20 text-gray-600';
      default:
        return 'bg-gray-500/20 text-gray-600';
    }
  }

  function getPerformanceClass(value: number) {
    if (value > 0) return 'text-success';
    if (value < 0) return 'text-destructive';
    return 'text-muted-foreground';
  }

  function getUtilizationColor(value: number) {
    if (value < 30) return 'bg-green-500';
    if (value < 70) return 'bg-amber-500';
    return 'bg-red-500';
  }

  function getProgressColor(value: number) {
    if (value > 75) return 'bg-green-500';
    if (value > 40) return 'bg-amber-500';
    return 'bg-red-500';
  }
  
  // Calculate summary statistics
  const activeFarms = farms.filter(farm => farm.status === 'active').length;
  const totalFarms = farms.length;
  const activePercentage = Math.round((activeFarms / totalFarms) * 100);
  
  // Calculate goal progress average
  const averageGoalProgress = Math.round(
    farms.reduce((acc, farm) => acc + (farm.goalProgress || 0), 0) / 
    farms.filter(farm => farm.goalProgress !== undefined).length
  );
  
  // Sample asset data (in a real application, this would come from an API)
  const totalAssetValue = 1246530;
  const assetCollectionPercentage = 70.2;
  
  // Sample treasury data
  const treasuryValue = 842500;
  const treasuryGrowthPercentage = 40.1;
  const completedGoals = 2;
  
  return (
    <div className="space-y-8">
      {/* Dynamic page heading based on whether a farm is selected */}
      <div className="flex items-center justify-between pb-6">
        {selectedFarm ? (
          <>
            <div className="flex items-center">
              <button 
                className="mr-3 p-2 rounded-full hover:bg-muted flex items-center justify-center" 
                onClick={() => setSelectedFarm(null)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  {selectedFarm.name}
                </h2>
                <p className="text-muted-foreground">
                  {selectedFarm.type} Farm • {selectedFarm.goalProgress || 0}% Goal Progress • {selectedFarm.agents.length} Agents
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Farm
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Agent
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Activity className="h-4 w-4 mr-2" />
                    View Activity
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Farm
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Farm Management</h2>
              <p className="text-muted-foreground">
                Manage your trading farms and monitor their performance
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Farm
            </Button>
          </>
        )}
      </div>

      {/* If a farm is selected, show farm details */}
      {selectedFarm ? (
        <FarmDetails 
          farm={selectedFarm} 
          agents={agents.filter(agent => selectedFarm.agents.includes(agent.id))}
          mcpServers={mcpServers.filter(server => selectedFarm.mcpServers?.includes(server.id))}
          toolModules={toolModules.filter(tool => selectedFarm.toolModules?.includes(tool.id))}
          aiModels={aiModels.filter(model => selectedFarm.aiModels?.includes(model.id))}
          onClose={() => setSelectedFarm(null)}
        />
      ) : (
        <>
          {/* Overview Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Farms Card */}
            <div className="dashboard-card p-6 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium">Active Farms</h3>
                <Building className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold mr-2">
                  {activeFarms} / {totalFarms}
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full" 
                    style={{ 
                      width: `${activePercentage}%` 
                    }}
                  />
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {activePercentage}% • All farms online
                </div>
              </div>
            </div>

            {/* Goal Progress Card */}
            <div className="dashboard-card p-6 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium">Goal Progress</h3>
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold mr-2">
                  {averageGoalProgress}%
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${getProgressColor(averageGoalProgress)}`} 
                    style={{ 
                      width: `${averageGoalProgress}%` 
                    }}
                  />
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  1 At Risk • {farms.filter(f => (f.goalProgress || 0) > 50).length} On Track
                </div>
              </div>
            </div>

            {/* Asset Collection Card */}
            <div className="dashboard-card p-6 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium">Asset Collection</h3>
                <CircleDollarSign className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold mr-2">
                  ${totalAssetValue.toLocaleString()}
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full" 
                    style={{ 
                      width: `${assetCollectionPercentage}%` 
                    }}
                  />
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {assetCollectionPercentage}% • 5 Assets
                </div>
              </div>
            </div>

            {/* Treasury Growth Card */}
            <div className="dashboard-card p-6 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium">Treasury Growth</h3>
                <Landmark className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold mr-2">
                  ${treasuryValue.toLocaleString()}
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full" 
                    style={{ 
                      width: `${treasuryGrowthPercentage}%` 
                    }}
                  />
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {treasuryGrowthPercentage}% • {completedGoals} Completed goals
                </div>
              </div>
            </div>
          </div>

          {/* Filter and Create section */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter farms..."
                className="pl-9 pr-4 py-2 w-full rounded-md border border-border bg-background"
                value={farmFilter}
                onChange={(e) => setFarmFilter(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Active Farms Table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden mb-8">
            <div className="p-4 bg-muted/30 border-b border-border">
              <h3 className="text-lg font-semibold">Active Farms</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-sm font-semibold">Farm</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold">Goal</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold">Progress</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold">Agents</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold">Capital</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold">Performance</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFarms.map(farm => (
                    <tr 
                      key={farm.id} 
                      className="border-b border-border hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedFarm(farm)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{farm.name}</div>
                        <div className="text-xs text-muted-foreground">Target: {farm.type === 'Accumulation' ? `Accumulate ${farm.balance.symbol}` : farm.type}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(farm.status)}`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                          {farm.status.charAt(0).toUpperCase() + farm.status.slice(1)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{farm.type}</div>
                        <div className="text-xs text-muted-foreground">
                          {farm.strategies} strategies
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">{farm.goalProgress || 0}%</div>
                          <div className="w-20 bg-secondary h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${getProgressColor(farm.goalProgress || 0)}`}
                              style={{ width: `${farm.goalProgress || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{farm.agents.length}</div>
                        <div className="text-xs text-muted-foreground">
                          {agents
                            .filter(agent => farm.agents.includes(agent.id))
                            .map(agent => agent.name.split(' ')[0])
                            .join(', ')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">${parseFloat(farm.balance.amount).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{farm.balance.symbol}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`text-sm font-medium flex items-center ${getPerformanceClass(farm.performance.month)}`}>
                          {farm.performance.month >= 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {farm.performance.month}%
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded-md hover:bg-muted" title="Dashboard">
                            <LineChart className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button className="p-1.5 rounded-md hover:bg-muted" title="Settings">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button className="p-1.5 rounded-md hover:bg-muted" title="Agents">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button 
                            className="p-1.5 rounded-md hover:bg-muted" 
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Delete action here
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border text-sm text-muted-foreground">
              {filteredFarms.length} farms total
              <button className="float-right text-primary hover:underline">Refresh</button>
            </div>
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Farm Performance */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-semibold">Farm Performance</h3>
                <Button variant="ghost" size="sm">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
              <div className="p-6">
                <div className="h-64 bg-muted/30 rounded-md flex items-center justify-center mb-4">
                  <div className="text-center">
                    <BarChart2 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Bar chart showing performance metrics</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Best Performer:</span>
                    <span className="font-medium">BTC Foundation (+9.9%)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Most Efficient:</span>
                    <span className="font-medium">SONIC Harvester (+9.1%)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Needs Attention:</span>
                    <span className="font-medium">SUI Accelerator (+2.1%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Goal Progress */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-semibold">Goal Progress Across Farms</h3>
                <Button variant="ghost" size="sm">
                  <Target className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </div>
              <div className="p-6">
                <div className="h-64 bg-muted/30 rounded-md flex items-center justify-center mb-4">
                  <div className="text-center">
                    <LineChart className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Multi-line chart showing goal progress</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">On Track:</span>
                    <span className="font-medium">SONIC (78.2%), BTC (56.8%), SOL (42.4%)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Behind:</span>
                    <span className="font-medium">ETH (34.7%)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">At Risk:</span>
                    <span className="font-medium">SUI (23.1%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Deployment and Brain Integration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Agent Deployment */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-lg font-semibold">Agent Deployment</h3>
              </div>
              <div className="p-6">
                <h4 className="text-sm font-medium mb-3">Top Performing Agents:</h4>
                <ul className="space-y-2 mb-6">
                  <li className="text-sm flex justify-between">
                    <span>Volatility Hunter (BTC):</span>
                    <span className="text-success">+16.2%</span>
                  </li>
                  <li className="text-sm flex justify-between">
                    <span>SONIC Hunter (SONIC):</span>
                    <span className="text-success">+12.8%</span>
                  </li>
                  <li className="text-sm flex justify-between">
                    <span>Market Maker Pro (BTC):</span>
                    <span className="text-success">+9.7%</span>
                  </li>
                </ul>

                <h4 className="text-sm font-medium mb-3">Agent Distribution:</h4>
                <ul className="space-y-2">
                  <li className="text-sm flex justify-between">
                    <span>Trading Assistant:</span>
                    <span>5</span>
                  </li>
                  <li className="text-sm flex justify-between">
                    <span>DCA Bot:</span>
                    <span>3</span>
                  </li>
                  <li className="text-sm flex justify-between">
                    <span>Grid Trader:</span>
                    <span>3</span>
                  </li>
                  <li className="text-sm flex justify-between">
                    <span>Market Maker:</span>
                    <span>2</span>
                  </li>
                  <li className="text-sm flex justify-between">
                    <span>Arbitrage Bot:</span>
                    <span>2</span>
                  </li>
                </ul>
                
                <Button className="w-full mt-6" variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  Manage Agents
                </Button>
              </div>
            </div>

            {/* Brain Integration */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-lg font-semibold">Brain Integration</h3>
              </div>
              <div className="p-6">
                <h4 className="text-sm font-medium mb-3">Active Strategies:</h4>
                <ul className="space-y-2 mb-6">
                  <li className="text-sm flex justify-between">
                    <span>MA Strategy:</span>
                    <span>5 farms</span>
                  </li>
                  <li className="text-sm flex justify-between">
                    <span>Grid Trading:</span>
                    <span>3 farms</span>
                  </li>
                  <li className="text-sm flex justify-between">
                    <span>DCA Strategy:</span>
                    <span>4 farms</span>
                  </li>
                </ul>

                <h4 className="text-sm font-medium mb-3">Strategy Performance:</h4>
                <ul className="space-y-2 mb-6">
                  <li className="text-sm flex justify-between">
                    <span>Grid Trading:</span>
                    <span className="text-success">+18.4% ROI</span>
                  </li>
                  <li className="text-sm flex justify-between">
                    <span>Volatility-Based:</span>
                    <span className="text-success">+15.2% ROI</span>
                  </li>
                  <li className="text-sm flex justify-between">
                    <span>Arbitrage:</span>
                    <span className="text-success">+14.8% ROI</span>
                  </li>
                </ul>

                <h4 className="text-sm font-medium mb-3">Brain Recommendations:</h4>
                <ul className="space-y-2">
                  <li className="text-sm">SUI Accelerator: Add Grid Trading</li>
                  <li className="text-sm">ETH Accumulator: Increase DCA allocation</li>
                </ul>
                
                <Button className="w-full mt-6" variant="outline">
                  <Brain className="h-4 w-4 mr-2" />
                  Apply Brain Optimizations
                </Button>
              </div>
            </div>
          </div>

          {/* Tools & MCP Status and Treasury Integration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tools & MCP Status */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-lg font-semibold">Tools & MCP Status</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-sm">Active Tools:</span>
                    <span className="text-sm font-medium">24/35</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active MCP Servers:</span>
                    <span className="text-sm font-medium">8/12</span>
                  </div>
                </div>

                <h4 className="text-sm font-medium mb-3">Recent Upgrades:</h4>
                <ul className="space-y-3">
                  <li className="text-sm">
                    <div className="font-medium">MEV Protection Bundle</div>
                    <div className="text-xs text-muted-foreground">Added to: ETH, BTC farms</div>
                  </li>
                  <li className="text-sm">
                    <div className="font-medium">TradingView Signals MCP</div>
                    <div className="text-xs text-muted-foreground">Added to: All farms</div>
                  </li>
                </ul>
                
                <Button className="w-full mt-6" variant="outline">
                  <Wrench className="h-4 w-4 mr-2" />
                  Manage Tools & MCP
                </Button>
              </div>
            </div>

            {/* Treasury Integration */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-lg font-semibold">Treasury Integration</h3>
              </div>
              <div className="p-6">
                <h4 className="text-sm font-medium mb-3">Completed Goals:</h4>
                <ul className="space-y-2 mb-6">
                  <li className="text-sm">
                    <div className="font-medium">DOT Accumulation: 5,000 DOT</div>
                  </li>
                  <li className="text-sm">
                    <div className="font-medium">AVAX Profit Target: $156,750</div>
                  </li>
                </ul>

                <h4 className="text-sm font-medium mb-3">Upcoming Transfers:</h4>
                <ul className="space-y-2 mb-6">
                  <li className="text-sm">
                    <div className="font-medium">SONIC: ~$62,300</div>
                    <div className="text-xs text-muted-foreground">Est. Jul 2025</div>
                  </li>
                  <li className="text-sm">
                    <div className="font-medium">BTC: ~$272,000</div>
                    <div className="text-xs text-muted-foreground">Est. Aug 2025</div>
                  </li>
                </ul>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Treasury Value:</span>
                    <span className="text-sm font-medium">$842,500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Projected End-of-Year:</span>
                    <span className="text-sm font-medium">$1.74M</span>
                  </div>
                </div>
                
                <Button className="w-full mt-6" variant="outline">
                  <Landmark className="h-4 w-4 mr-2" />
                  View Treasury
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
