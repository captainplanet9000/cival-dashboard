"use client"

import { useState } from 'react'
import {
  Building,
  User,
  BarChart2,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Settings,
  Users,
  Plus,
  ChevronDown,
  ChevronRight,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  XCircle,
  Edit,
  Trash2,
  PlusCircle,
  Server,
  Wrench,
  RefreshCw,
  Cpu,
  AlertCircle,
  CheckCircle,
  Globe,
  ToggleLeft,
  ToggleRight,
  Send,
  MessageSquare,
  Info,
  AlertTriangle,
  Command,
  Database
} from 'lucide-react'

interface FarmAgent {
  id: string
  name: string
  type: string
  performance: number
  status: 'active' | 'paused' | 'inactive'
  strategies: number
  allocation: number
}

interface Strategy {
  id: string
  name: string
  type: string
  performance: number
  active: boolean
  timestamp: string
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
  goalTarget?: string // Description of goal target
  goalDeadline?: string // Deadline for goal
}

interface FarmActivityLog {
  id: string
  timestamp: string
  action: string
  details: string
  relatedAgent?: string
}

interface FarmDetailsProps {
  farm: Farm
  onClose: () => void
  onEdit?: (farm: Farm) => void
  agents?: FarmAgent[]
  mcpServers?: any[]
  toolModules?: any[]
  aiModels?: any[]
}

export default function FarmDetails({ farm, onClose, onEdit, agents, mcpServers, toolModules, aiModels }: FarmDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  
  // Use props or fallback to sample data
  const farmAgents = agents || [
    { id: 'a1', name: 'Alpha Trader', type: 'DCA', performance: 12.4, status: 'active', strategies: 3, allocation: 15 },
    { id: 'a2', name: 'Beta Hunter', type: 'Grid', performance: 8.7, status: 'active', strategies: 2, allocation: 25 },
    { id: 'a3', name: 'Gamma Scout', type: 'Momentum', performance: -2.3, status: 'paused', strategies: 1, allocation: 10 },
    { id: 'a4', name: 'Delta Watcher', type: 'Arbitrage', performance: 5.1, status: 'active', strategies: 4, allocation: 20 },
    { id: 'a5', name: 'Epsilon Maker', type: 'Market Making', performance: 9.2, status: 'active', strategies: 2, allocation: 30 }
  ]
  
  const farmMcpServers = mcpServers || [
    { 
      id: 'mcp1',
      name: 'Market Data MCP',
      type: 'Data Provider',
      category: 'Market Data',
      status: 'active',
      endpoint: 'https://api.market-data.com',
      lastUsed: '2h ago'
    },
    // More sample MCPs
  ]
  
  const farmToolModules = toolModules || [
    {
      id: 'tool1',
      name: 'TradingView Signals',
      type: 'Signal Provider',
      category: 'Technical Analysis',
      version: '2.1.0',
      status: 'active',
      lastUpdated: '3d ago',
      capabilities: ['Signal Generation', 'Pattern Recognition']
    },
    // More sample tools
  ]
  
  const farmAiModels = aiModels || [
    {
      id: 'ai1',
      name: 'Claude Instant',
      provider: 'Anthropic',
      type: 'primary',
      usage: '23k tokens/day',
      costPerToken: 0.00013,
      performance: {
        strategyAnalysis: 8.4,
        decisionQuality: 7.9,
        speed: 9.1,
        costEfficiency: 8.5,
        roiImpact: 7.2
      }
    },
    // More sample AI models
  ]
  
  // Sample strategies data
  const strategies: Strategy[] = [
    {
      id: '1',
      name: 'BTC DCA Strategy',
      type: 'Accumulation',
      performance: 5.8,
      active: true,
      timestamp: '2025-01-20'
    },
    {
      id: '2',
      name: 'ETH Momentum Follow',
      type: 'Trend Following',
      performance: 12.2,
      active: true,
      timestamp: '2025-01-15'
    },
    {
      id: '3',
      name: 'LINK Swing Trade',
      type: 'Swing',
      performance: -3.5,
      active: false,
      timestamp: '2025-01-10'
    }
  ]
  
  // Sample activity logs
  const activityLogs: FarmActivityLog[] = [
    {
      id: '1',
      timestamp: '2025-02-15T14:32:10Z',
      action: 'Agent Assignment',
      details: 'Beta Agent assigned to farm',
      relatedAgent: 'Beta Agent'
    },
    {
      id: '2',
      timestamp: '2025-02-14T10:15:45Z',
      action: 'Strategy Paused',
      details: 'LINK Swing Trade strategy paused'
    },
    {
      id: '3',
      timestamp: '2025-02-12T08:22:30Z',
      action: 'Fund Allocation',
      details: 'Added 0.25 BTC to farm balance'
    },
    {
      id: '4',
      timestamp: '2025-02-10T16:45:12Z',
      action: 'Agent Deassigned',
      details: 'Gamma Agent removed from farm',
      relatedAgent: 'Gamma Agent'
    },
    {
      id: '5',
      timestamp: '2025-02-08T09:11:25Z',
      action: 'Strategy Added',
      details: 'BTC DCA Strategy added to farm'
    }
  ]
  
  // Function to get performance class based on value
  const getPerformanceClass = (value: number) => {
    if (value > 0) return 'text-success'
    if (value < 0) return 'text-danger'
    return 'text-muted-foreground'
  }
  
  // Function to get performance icon based on value
  const getPerformanceIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="h-3 w-3 mr-1" />
    if (value < 0) return <ArrowDownRight className="h-3 w-3 mr-1" />
    return null
  }
  
  // Farm utilization color
  const getUtilizationColor = (utilization: number) => {
    if (utilization < 30) return 'bg-danger'
    if (utilization < 70) return 'bg-warning'
    return 'bg-success'
  }
  
  // Function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  // Function to format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-primary/10 p-2 rounded-full mr-3">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center">
                {farm.name}
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full 
                  ${farm.status === 'active' ? 'bg-success/20 text-success' : 
                    farm.status === 'paused' ? 'bg-warning/20 text-warning' : 
                    'bg-danger/20 text-danger'}`}>
                  {farm.status.charAt(0).toUpperCase() + farm.status.slice(1)}
                </span>
              </h2>
              <p className="text-sm text-muted-foreground">
                {farm.type} Farm • Created on {formatDate(farm.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onEdit && onEdit(farm)}
              className="p-2 rounded-full hover:bg-muted"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-border overflow-x-auto">
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'overview' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'agents' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('agents')}
          >
            Agents & Strategies
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'goals' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('goals')}
          >
            Goals
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'tools' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('tools')}
          >
            Tools & MCP
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'ai-models' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('ai-models')}
          >
            AI Models
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'exchanges' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('exchanges')}
          >
            Exchanges
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'brain' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('brain')}
          >
            Brain
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'command' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('command')}
          >
            Command Console
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'settings' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'performance' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'activity' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="dashboard-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Farm Balance</h3>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold mr-2">{farm.balance.amount}</span>
                    <span className="text-sm">{farm.balance.symbol}</span>
                  </div>
                </div>
                
                <div className="dashboard-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Performance</h3>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div className={`flex items-baseline ${getPerformanceClass(farm.performance.total)}`}>
                    <span className="text-2xl font-bold mr-2">
                      {getPerformanceIcon(farm.performance.total)}
                      {farm.performance.total}%
                    </span>
                    <span className="text-xs text-muted-foreground">since creation</span>
                  </div>
                </div>
                
                <div className="dashboard-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Fund Utilization</h3>
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline">
                      <span className="text-2xl font-bold mr-2">{farm.utilization}%</span>
                      <span className="text-xs text-muted-foreground">of funds deployed</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getUtilizationColor(farm.utilization)}`}
                        style={{ width: `${farm.utilization}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Performance Periods */}
              <div className="dashboard-card p-4">
                <h3 className="text-sm font-medium mb-4">Performance Periods</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">24 Hours</p>
                    <p className={`text-lg font-medium flex items-center ${getPerformanceClass(farm.performance.day)}`}>
                      {getPerformanceIcon(farm.performance.day)}
                      {farm.performance.day}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">7 Days</p>
                    <p className={`text-lg font-medium flex items-center ${getPerformanceClass(farm.performance.week)}`}>
                      {getPerformanceIcon(farm.performance.week)}
                      {farm.performance.week}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">30 Days</p>
                    <p className={`text-lg font-medium flex items-center ${getPerformanceClass(farm.performance.month)}`}>
                      {getPerformanceIcon(farm.performance.month)}
                      {farm.performance.month}%
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Farm Description */}
              <div className="dashboard-card p-4">
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <p className="text-muted-foreground text-sm">
                  {farm.description || 'No description provided for this farm. Add a description to help team members understand this farm\'s purpose and strategy.'}
                </p>
              </div>
              
              {/* Quick Actions */}
              <div className="dashboard-card p-4">
                <h3 className="text-sm font-medium mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button className="btn-outline-sm flex items-center justify-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>Manage Agents</span>
                  </button>
                  <button className="btn-outline-sm flex items-center justify-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>Add Funds</span>
                  </button>
                  <button className="btn-outline-sm flex items-center justify-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>View Analytics</span>
                  </button>
                  <button className="btn-outline-sm flex items-center justify-center gap-1">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Agents & Strategies Tab */}
          {activeTab === 'agents' && (
            <div className="space-y-6">
              {/* Assigned Agents */}
              <div className="dashboard-card">
                <div className="flex items-center justify-between mb-4 p-4 border-b border-border">
                  <h3 className="text-lg font-medium">Farm Agents</h3>
                  <button className="btn-outline btn-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Agent
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-medium text-muted-foreground">
                        <th className="p-3">Name</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Performance</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Strategies</th>
                        <th className="p-3">Allocation</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmAgents.map(agent => (
                        <tr key={agent.id} className="border-b border-border">
                          <td className="p-3">
                            <div className="font-medium">{agent.name}</div>
                          </td>
                          <td className="p-3 text-sm">{agent.type}</td>
                          <td className="p-3">
                            <div className="flex items-center">
                              {agent.performance >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-success mr-2" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-destructive mr-2" />
                              )}
                              <span className={agent.performance >= 0 ? 'text-success' : 'text-destructive'}>
                                {agent.performance >= 0 ? '+' : ''}{agent.performance}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              agent.status === 'active' ? 'bg-success/20 text-success' :
                              agent.status === 'paused' ? 'bg-warning/20 text-warning' :
                              'bg-destructive/20 text-destructive'
                            }`}>
                              <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                              {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                            </span>
                          </td>
                          <td className="p-3 text-sm">{agent.strategies}</td>
                          <td className="p-3">
                            <div className="flex items-center">
                              <div className="w-16 bg-muted h-1.5 rounded-full overflow-hidden mr-2">
                                <div className="bg-primary h-full rounded-full" style={{ width: `${agent.allocation}%` }} />
                              </div>
                              <span className="text-xs">{agent.allocation}%</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-1 justify-end">
                              <button className="p-1 rounded hover:bg-muted">
                                <Settings className="h-4 w-4 text-muted-foreground" />
                              </button>
                              <button className="p-1 rounded hover:bg-muted">
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Active Strategies */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Farm Strategies</h3>
                  <button className="btn-outline-sm flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Strategy
                  </button>
                </div>
                
                {strategies.length > 0 ? (
                  <div className="dashboard-card overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-xs font-medium text-left text-muted-foreground p-3">Strategy</th>
                          <th className="text-xs font-medium text-left text-muted-foreground p-3">Type</th>
                          <th className="text-xs font-medium text-left text-muted-foreground p-3">Status</th>
                          <th className="text-xs font-medium text-left text-muted-foreground p-3">Performance</th>
                          <th className="text-xs font-medium text-left text-muted-foreground p-3">Added</th>
                          <th className="text-xs font-medium text-left text-muted-foreground p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {strategies.map(strategy => (
                          <tr key={strategy.id} className="border-b border-border">
                            <td className="p-3">
                              <div className="flex items-center">
                                <div className="bg-primary/10 p-1.5 rounded-full mr-2">
                                  <Activity className="h-4 w-4 text-primary" />
                                </div>
                                <span className="font-medium">{strategy.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-sm">{strategy.type}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 text-xs rounded-full 
                                ${strategy.active ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                {strategy.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`flex items-center text-sm ${getPerformanceClass(strategy.performance)}`}>
                                {getPerformanceIcon(strategy.performance)}
                                {strategy.performance}%
                              </span>
                            </td>
                            <td className="p-3 text-sm">
                              {formatDate(strategy.timestamp)}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <button className="p-1 rounded-md hover:bg-muted">
                                  <Settings className="h-4 w-4" />
                                </button>
                                <button className="p-1 rounded-md hover:bg-muted">
                                  <Trash2 className="h-4 w-4 text-danger" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="dashboard-card p-6 text-center">
                    <div className="bg-muted/30 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
                      <Activity className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h4 className="text-medium font-medium mb-1">No Strategies Added</h4>
                    <p className="text-sm text-muted-foreground mb-4">This farm doesn't have any strategies yet.</p>
                    <button className="btn-outline-sm mx-auto">Add Strategy</button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="dashboard-card p-4">
                <h3 className="text-sm font-medium mb-4">Performance Overview</h3>
                <div className="h-60 flex items-center justify-center">
                  <p className="text-muted-foreground">Performance chart will be implemented in the next phase</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="dashboard-card p-4">
                  <h3 className="text-sm font-medium mb-2">Primary Metric</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Return</span>
                    <span className={`font-medium ${getPerformanceClass(farm.performance.total)}`}>
                      {farm.performance.total}%
                    </span>
                  </div>
                </div>
                
                <div className="dashboard-card p-4">
                  <h3 className="text-sm font-medium mb-2">Risk Metrics</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Risk Level</span>
                      <span className="font-medium">Medium</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Volatility</span>
                      <span className="font-medium">8.5%</span>
                    </div>
                  </div>
                </div>
                
                <div className="dashboard-card p-4">
                  <h3 className="text-sm font-medium mb-2">Comparative</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">vs. Market</span>
                      <span className={`font-medium ${getPerformanceClass(5.2)}`}>+5.2%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">vs. Other Farms</span>
                      <span className={`font-medium ${getPerformanceClass(2.8)}`}>+2.8%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Activity Log Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div className="dashboard-card">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-medium">Recent Activity</h3>
                </div>
                
                <div className="divide-y divide-border">
                  {activityLogs.map(log => (
                    <div key={log.id} className="p-4">
                      <div className="flex items-start">
                        <div className="bg-primary/10 p-2 rounded-full mr-3">
                          {log.action.includes('Agent') ? (
                            <User className="h-4 w-4 text-primary" />
                          ) : log.action.includes('Strategy') ? (
                            <Activity className="h-4 w-4 text-primary" />
                          ) : log.action.includes('Fund') ? (
                            <DollarSign className="h-4 w-4 text-primary" />
                          ) : (
                            <Settings className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{log.action}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                          {log.relatedAgent && (
                            <div className="mt-2 px-2 py-1 bg-muted/50 rounded-md inline-flex items-center">
                              <User className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span className="text-xs">{log.relatedAgent}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Goal Progress Overview */}
              <div className="dashboard-card p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Goal Progress</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {farm.goalDeadline ? `Target: ${formatDate(farm.goalDeadline)}` : 'No deadline set'}
                    </span>
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">{farm.goalTarget || 'Accumulation Goal'}</span>
                    <span className="text-sm font-bold">{farm.goalProgress || 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-2 bg-primary rounded-full" 
                      style={{ width: `${farm.goalProgress || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Start</span>
                    <span className="text-xs text-muted-foreground">Current</span>
                    <span className="text-xs text-muted-foreground">Target</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Initial Value</div>
                    <div className="text-lg font-medium">$85,000</div>
                    <div className="text-xs text-muted-foreground">Starting capital</div>
                  </div>
                  
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Current Value</div>
                    <div className="text-lg font-medium">${parseFloat(farm.balance.amount).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">As of today</div>
                  </div>
                  
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Target Value</div>
                    <div className="text-lg font-medium">$250,000</div>
                    <div className="text-xs text-muted-foreground">To complete goal</div>
                  </div>
                </div>
              </div>
              
              {/* Goal Projections */}
              <div className="dashboard-card p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Goal Projections</h3>
                  <button className="p-1.5 rounded-md hover:bg-muted">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                
                <div className="h-60 bg-muted/30 rounded-md flex items-center justify-center mb-4">
                  <span className="text-sm text-muted-foreground">Goal projection chart will display here</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Conservative</div>
                    <div className="text-lg font-medium text-warning">Nov 2025</div>
                    <div className="text-xs text-muted-foreground">At 4% monthly growth</div>
                  </div>
                  
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Expected</div>
                    <div className="text-lg font-medium text-success">Aug 2025</div>
                    <div className="text-xs text-muted-foreground">At 8% monthly growth</div>
                  </div>
                  
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Aggressive</div>
                    <div className="text-lg font-medium text-success">Jun 2025</div>
                    <div className="text-xs text-muted-foreground">At 12% monthly growth</div>
                  </div>
                </div>
              </div>
              
              {/* Brain Recommendations */}
              <div className="dashboard-card p-5">
                <h3 className="text-lg font-medium mb-4">Brain Recommendations</h3>
                
                <div className="space-y-3">
                  <div className="p-3 border border-border rounded-lg">
                    <div className="flex items-start">
                      <div className="bg-success/10 p-2 rounded-full mr-3">
                        <TrendingUp className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Increase DCA Allocation</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Increasing DCA allocation by 15% could accelerate goal timeline by approximately 35 days based on current market conditions.
                        </p>
                        <div className="flex mt-2">
                          <button className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80 mr-2">
                            Apply
                          </button>
                          <button className="text-xs text-muted-foreground hover:text-foreground">
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 border border-border rounded-lg">
                    <div className="flex items-start">
                      <div className="bg-warning/10 p-2 rounded-full mr-3">
                        <Activity className="h-4 w-4 text-warning" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Add Volatility Strategy</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Current market conditions show increased volatility. Adding a volatility-based strategy could capture additional 7-9% returns.
                        </p>
                        <div className="flex mt-2">
                          <button className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80 mr-2">
                            Apply
                          </button>
                          <button className="text-xs text-muted-foreground hover:text-foreground">
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Tools & MCP Tab */}
          {activeTab === 'tools' && (
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* MCP Server Integration */}
              <div className="dashboard-card p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">MCP Server Integration</h3>
                  <button className="btn-outline btn-sm flex items-center text-xs">
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Add MCP Server
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-xs font-medium">Server</th>
                        <th className="text-left p-2 text-xs font-medium">Type</th>
                        <th className="text-left p-2 text-xs font-medium">Status</th>
                        <th className="text-left p-2 text-xs font-medium">Last Used</th>
                        <th className="text-left p-2 text-xs font-medium">Usage</th>
                        <th className="text-left p-2 text-xs font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmMcpServers.map(server => (
                        <tr key={server.id} className="border-b border-border">
                          <td className="p-2">
                            <div className="flex items-center">
                              <div className="bg-primary/10 p-1.5 rounded-full mr-3">
                                <Server className="h-3 w-3 text-primary" />
                              </div>
                              <div>
                                <div className="text-sm font-medium">{server.name}</div>
                                <div className="text-xs text-muted-foreground">{server.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <span className="text-xs">{server.type}</span>
                          </td>
                          <td className="p-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">
                              <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                              Active
                            </span>
                          </td>
                          <td className="p-2">
                            <span className="text-xs">{server.lastUsed}</span>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center">
                              <div className="w-16 bg-muted h-1.5 rounded-full overflow-hidden mr-2">
                                <div className="bg-primary h-full rounded-full" style={{ width: '45%' }} />
                              </div>
                              <span className="text-xs">45%</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center space-x-1">
                              <button className="p-1 rounded hover:bg-muted" title="Configure">
                                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button className="p-1 rounded hover:bg-muted" title="Disconnect">
                                <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Tool Module Integration */}
              <div className="dashboard-card p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Tool Module Integration</h3>
                  <button className="btn-outline btn-sm flex items-center text-xs">
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Add Tool Module
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {farmToolModules.map(tool => (
                    <div key={tool.id} className="p-3 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="bg-primary/10 p-1.5 rounded-md mr-3">
                            <Wrench className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium">{tool.name}</h4>
                            <p className="text-xs text-muted-foreground">{tool.version}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">
                          Active
                        </span>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Last used: {tool.lastUpdated}</span>
                        <div className="flex items-center gap-1">
                          <button className="p-1 rounded hover:bg-muted" title="Configure">
                            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button className="p-1 rounded hover:bg-muted" title="Remove">
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="btn-outline w-full flex items-center justify-center text-sm">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Browse More Tools
                </button>
              </div>
            </div>
          )}
          
          {/* AI Models Tab */}
          {activeTab === 'ai-models' && (
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Current AI Model Configuration */}
              <div className="dashboard-card p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">AI Model Configuration</h3>
                  <div className="flex items-center">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md mr-2">
                      <Globe className="h-3 w-3 inline mr-1" />
                      OpenRouter
                    </span>
                    <button className="btn-outline btn-sm flex items-center text-xs">
                      <Settings className="h-3 w-3 mr-1" />
                      Config
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Primary Model */}
                  {farmAiModels.map(model => (
                    <div key={model.id} className="border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/30 p-3 border-b border-border">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{model.name}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">
                            Active
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center mb-4">
                          <div className="bg-primary/10 p-2 rounded-md mr-3">
                            <Cpu className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{model.name}</h4>
                            <p className="text-xs text-muted-foreground">{model.provider}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Cost Per Token:</span>
                            <span>${model.costPerToken}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Monthly Usage:</span>
                            <span>{model.usage}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">ROI Impact:</span>
                            <span className="text-success">{model.performance.roiImpact}%</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-muted-foreground">Performance</span>
                              <span className="text-xs font-medium">{model.performance.strategyAnalysis}/100</span>
                            </div>
                            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                              <div className="bg-primary h-full rounded-full" style={{ width: `${model.performance.strategyAnalysis}%` }} />
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-muted-foreground">Cost Efficiency</span>
                              <span className="text-xs font-medium">{model.performance.costEfficiency}/100</span>
                            </div>
                            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                              <div className="bg-primary h-full rounded-full" style={{ width: `${model.performance.costEfficiency}%` }} />
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button className="btn-outline btn-sm text-xs">Change Model</button>
                          <button className="btn-outline btn-sm text-xs">Advanced Settings</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Model Performance & Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Model Performance Metrics */}
                <div className="dashboard-card p-5">
                  <h3 className="text-lg font-medium mb-4">Performance Metrics</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Strategy Analysis</span>
                        <span className="text-sm font-medium">95/100</span>
                      </div>
                      <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                        <div className="bg-success h-full rounded-full" style={{ width: '95%' }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Excellent analysis of market conditions and trading opportunities
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Decision Quality</span>
                        <span className="text-sm font-medium">89/100</span>
                      </div>
                      <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                        <div className="bg-success h-full rounded-full" style={{ width: '89%' }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Strong trading decisions based on comprehensive analysis
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Execution Speed</span>
                        <span className="text-sm font-medium">76/100</span>
                      </div>
                      <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                        <div className="bg-warning h-full rounded-full" style={{ width: '76%' }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Response time acceptable but could be improved
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Cost Efficiency</span>
                        <span className="text-sm font-medium">78/100</span>
                      </div>
                      <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                        <div className="bg-warning h-full rounded-full" style={{ width: '78%' }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Good ROI relative to model costs
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Budget Management */}
                <div className="dashboard-card p-5">
                  <h3 className="text-lg font-medium mb-4">Budget Management</h3>
                  
                  <div className="mb-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Monthly Budget</span>
                      <span className="text-sm font-medium">$500.00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="w-full bg-muted h-2 rounded-full overflow-hidden mr-3">
                        <div className="bg-primary h-full rounded-full" style={{ width: '68.6%' }} />
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap">$343.17 used</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Budget resets in 8 days
                    </p>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Primary Model (Claude 3 Opus)</span>
                      <span className="font-medium">$328.45</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Fallback Model (GPT-4 Turbo)</span>
                      <span className="font-medium">$14.72</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Monthly Projection</span>
                      <span>$412.00</span>
                    </div>
                  </div>
                  
                  <div className="p-3 border border-border rounded-lg bg-warning/10">
                    <div className="flex items-start">
                      <AlertCircle className="h-4 w-4 text-warning mr-2 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium">Budget Alert</h4>
                        <p className="text-xs mt-1">
                          Claude 3 Opus usage is 15% higher than last month. Consider adjusting settings or switching to a more cost-efficient model for non-critical tasks.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Model Switching Rules */}
              <div className="dashboard-card p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Model Switching Rules</h3>
                  <button className="btn-outline btn-sm flex items-center text-xs">
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Add Rule
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="p-3 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-success mr-2" />
                        <h4 className="text-sm font-medium">Budget Threshold Rule</h4>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-muted-foreground mr-2">Active</span>
                        <ToggleRight className="h-4 w-8 text-primary" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Switch to fallback model when monthly budget exceeds 90% threshold
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span>Current: 68.6% of budget</span>
                      <span className="text-success">Not triggered</span>
                    </div>
                  </div>
                  
                  <div className="p-3 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-success mr-2" />
                        <h4 className="text-sm font-medium">Performance Rule</h4>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-muted-foreground mr-2">Active</span>
                        <ToggleRight className="h-4 w-8 text-primary" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Use primary model only for critical strategy decisions and market analysis
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span>Last applied: 45 min ago</span>
                      <span className="text-success">Working as expected</span>
                    </div>
                  </div>
                  
                  <div className="p-3 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-success mr-2" />
                        <h4 className="text-sm font-medium">Response Time Rule</h4>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-muted-foreground mr-2">Active</span>
                        <ToggleRight className="h-4 w-8 text-primary" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Switch to fallback model if primary model response time exceeds 5 seconds
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span>Average response: 3.2 seconds</span>
                      <span className="text-success">Not triggered</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Exchange Connections Tab */}
          {activeTab === 'exchanges' && (
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Exchange Connections */}
              <div className="dashboard-card p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Exchange Connections</h3>
                  <button className="btn-outline btn-sm flex items-center text-xs">
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Add Exchange
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-xs font-medium">Exchange</th>
                        <th className="text-left p-2 text-xs font-medium">Type</th>
                        <th className="text-left p-2 text-xs font-medium">Status</th>
                        <th className="text-left p-2 text-xs font-medium">Last Used</th>
                        <th className="text-left p-2 text-xs font-medium">Usage</th>
                        <th className="text-left p-2 text-xs font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="bg-primary/10 p-1.5 rounded-full mr-3">
                              <Server className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">Binance</div>
                              <div className="text-xs text-muted-foreground">Spot Trading</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">Centralized</span>
                        </td>
                        <td className="p-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">
                            <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                            Active
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">12 min ago</span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="w-16 bg-muted h-1.5 rounded-full overflow-hidden mr-2">
                              <div className="bg-primary h-full rounded-full" style={{ width: '45%' }} />
                            </div>
                            <span className="text-xs">45%</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center space-x-1">
                            <button className="p-1 rounded hover:bg-muted" title="Configure">
                              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button className="p-1 rounded hover:bg-muted" title="Disconnect">
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="bg-primary/10 p-1.5 rounded-full mr-3">
                              <Server className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">Kraken</div>
                              <div className="text-xs text-muted-foreground">Futures Trading</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">Centralized</span>
                        </td>
                        <td className="p-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">
                            <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                            Active
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">35 min ago</span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="w-16 bg-muted h-1.5 rounded-full overflow-hidden mr-2">
                              <div className="bg-primary h-full rounded-full" style={{ width: '22%' }} />
                            </div>
                            <span className="text-xs">22%</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center space-x-1">
                            <button className="p-1 rounded hover:bg-muted" title="Configure">
                              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button className="p-1 rounded hover:bg-muted" title="Disconnect">
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="bg-primary/10 p-1.5 rounded-full mr-3">
                              <Server className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">Huobi</div>
                              <div className="text-xs text-muted-foreground">Spot Trading</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">Centralized</span>
                        </td>
                        <td className="p-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning">
                            <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                            Limited
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">2 hrs ago</span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="w-16 bg-muted h-1.5 rounded-full overflow-hidden mr-2">
                              <div className="bg-warning h-full rounded-full" style={{ width: '80%' }} />
                            </div>
                            <span className="text-xs">80%</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center space-x-1">
                            <button className="p-1 rounded hover:bg-muted" title="Configure">
                              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button className="p-1 rounded hover:bg-muted" title="Disconnect">
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* Brain Strategies Tab */}
          {activeTab === 'brain' && (
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Brain Strategies */}
              <div className="dashboard-card p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Brain Strategies</h3>
                  <button className="btn-outline btn-sm flex items-center text-xs">
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Add Strategy
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-xs font-medium">Strategy</th>
                        <th className="text-left p-2 text-xs font-medium">Type</th>
                        <th className="text-left p-2 text-xs font-medium">Status</th>
                        <th className="text-left p-2 text-xs font-medium">Last Used</th>
                        <th className="text-left p-2 text-xs font-medium">Usage</th>
                        <th className="text-left p-2 text-xs font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="bg-primary/10 p-1.5 rounded-full mr-3">
                              <Activity className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">Mean Reversion</div>
                              <div className="text-xs text-muted-foreground">Statistical Arbitrage</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">Quantitative</span>
                        </td>
                        <td className="p-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">
                            <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                            Active
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">12 min ago</span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="w-16 bg-muted h-1.5 rounded-full overflow-hidden mr-2">
                              <div className="bg-primary h-full rounded-full" style={{ width: '45%' }} />
                            </div>
                            <span className="text-xs">45%</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center space-x-1">
                            <button className="p-1 rounded hover:bg-muted" title="Configure">
                              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button className="p-1 rounded hover:bg-muted" title="Disconnect">
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="bg-primary/10 p-1.5 rounded-full mr-3">
                              <Activity className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">Trend Following</div>
                              <div className="text-xs text-muted-foreground">Momentum Trading</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">Quantitative</span>
                        </td>
                        <td className="p-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">
                            <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                            Active
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">35 min ago</span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="w-16 bg-muted h-1.5 rounded-full overflow-hidden mr-2">
                              <div className="bg-primary h-full rounded-full" style={{ width: '22%' }} />
                            </div>
                            <span className="text-xs">22%</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center space-x-1">
                            <button className="p-1 rounded hover:bg-muted" title="Configure">
                              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button className="p-1 rounded hover:bg-muted" title="Disconnect">
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="bg-primary/10 p-1.5 rounded-full mr-3">
                              <Activity className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">Statistical Arbitrage</div>
                              <div className="text-xs text-muted-foreground">Market Making</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">Quantitative</span>
                        </td>
                        <td className="p-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning">
                            <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                            Limited
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">2 hrs ago</span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="w-16 bg-muted h-1.5 rounded-full overflow-hidden mr-2">
                              <div className="bg-warning h-full rounded-full" style={{ width: '80%' }} />
                            </div>
                            <span className="text-xs">80%</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center space-x-1">
                            <button className="p-1 rounded hover:bg-muted" title="Configure">
                              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button className="p-1 rounded hover:bg-muted" title="Disconnect">
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* Farm Settings Tab */}
          {activeTab === 'settings' && (
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Farm Settings */}
              <div className="dashboard-card p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Farm Settings</h3>
                  <button className="btn-outline btn-sm flex items-center text-xs">
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Add Setting
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-xs font-medium">Setting</th>
                        <th className="text-left p-2 text-xs font-medium">Type</th>
                        <th className="text-left p-2 text-xs font-medium">Value</th>
                        <th className="text-left p-2 text-xs font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="bg-primary/10 p-1.5 rounded-full mr-3">
                              <Settings className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">Risk Tolerance</div>
                              <div className="text-xs text-muted-foreground">Risk Management</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">Slider</span>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">Medium</span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center space-x-1">
                            <button className="p-1 rounded hover:bg-muted" title="Edit">
                              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button className="p-1 rounded hover:bg-muted" title="Remove">
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="bg-primary/10 p-1.5 rounded-full mr-3">
                              <Settings className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">Leverage</div>
                              <div className="text-xs text-muted-foreground">Position Sizing</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">Input</span>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">2x</span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center space-x-1">
                            <button className="p-1 rounded hover:bg-muted" title="Edit">
                              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button className="p-1 rounded hover:bg-muted" title="Remove">
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="bg-primary/10 p-1.5 rounded-full mr-3">
                              <Settings className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">Stop Loss</div>
                              <div className="text-xs text-muted-foreground">Risk Management</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">Input</span>
                        </td>
                        <td className="p-2">
                          <span className="text-xs">5%</span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center space-x-1">
                            <button className="p-1 rounded hover:bg-muted" title="Edit">
                              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button className="p-1 rounded hover:bg-muted" title="Remove">
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* ElizaOS Command Console Tab */}
          {activeTab === 'command' && (
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* ElizaOS Command Console */}
              <div className="dashboard-card p-5 flex flex-col h-[500px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">ElizaOS Command Console</h3>
                  <div className="flex items-center">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md mr-2">
                      <Globe className="h-3 w-3 inline mr-1" />
                      ElizaOS Connected
                    </span>
                    <button className="btn-outline btn-sm flex items-center text-xs">
                      <Settings className="h-3 w-3 mr-1" />
                      Config
                    </button>
                  </div>
                </div>
                
                {/* Quick Command Buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button className="btn-outline btn-xs flex items-center text-xs">
                    <Command className="h-3 w-3 mr-1" />
                    BTC Price
                  </button>
                  <button className="btn-outline btn-xs flex items-center text-xs">
                    <Database className="h-3 w-3 mr-1" />
                    Portfolio
                  </button>
                  <button className="btn-outline btn-xs flex items-center text-xs">
                    <User className="h-3 w-3 mr-1" />
                    Agents
                  </button>
                  <button className="btn-outline btn-xs flex items-center text-xs">
                    <Activity className="h-3 w-3 mr-1" />
                    Strategies
                  </button>
                  <button className="btn-outline btn-xs flex items-center text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Farm Performance
                  </button>
                </div>
                
                {/* Messages Container */}
                <div className="flex-1 border border-border rounded-md mb-4 p-4 overflow-y-auto">
                  <div className="space-y-4">
                    {/* System Message */}
                    <div className="flex items-start">
                      <div className="bg-primary/10 p-1.5 rounded-full mr-2 mt-0.5">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-muted p-3 rounded-lg text-sm">
                          <p className="text-xs text-muted-foreground mb-1">ElizaOS • System</p>
                          <p>Welcome to the Trading Farm Command Console. How can I assist you with farm "{farm.name}" today?</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Command Message */}
                    <div className="flex items-start justify-end">
                      <div className="flex-1 flex justify-end">
                        <div className="bg-primary/10 p-3 rounded-lg text-sm max-w-[80%]">
                          <p className="text-xs text-primary mb-1">You • Command</p>
                          <p>Show me the current BTC price</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Knowledge Response */}
                    <div className="flex items-start">
                      <div className="bg-blue-500/10 p-1.5 rounded-full mr-2 mt-0.5">
                        <Info className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-muted p-3 rounded-lg text-sm">
                          <p className="text-xs text-blue-500 mb-1">ElizaOS • Knowledge Response</p>
                          <p>The current BTC price is $73,428.52, up 2.3% in the last 24 hours. The 24h trading volume is $32.4B.</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Command Message */}
                    <div className="flex items-start justify-end">
                      <div className="flex-1 flex justify-end">
                        <div className="bg-primary/10 p-3 rounded-lg text-sm max-w-[80%]">
                          <p className="text-xs text-primary mb-1">You • Command</p>
                          <p>What's the performance of this farm over the last week?</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Analysis Response */}
                    <div className="flex items-start">
                      <div className="bg-green-500/10 p-1.5 rounded-full mr-2 mt-0.5">
                        <Activity className="h-3.5 w-3.5 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-muted p-3 rounded-lg text-sm">
                          <p className="text-xs text-green-500 mb-1">ElizaOS • Analysis</p>
                          <p>{farm.name} has performed well over the past week with a return of {farm.performance.week}%. This outperforms the market average by 1.2%. The top performing strategy was "BTC DCA Strategy" with a 5.8% return.</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Alert Message */}
                    <div className="flex items-start">
                      <div className="bg-warning/10 p-1.5 rounded-full mr-2 mt-0.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-muted p-3 rounded-lg text-sm">
                          <p className="text-xs text-warning mb-1">ElizaOS • Alert</p>
                          <p>I've detected unusual market volatility in the LINK market. Consider reviewing the "LINK Swing Trade" strategy settings to optimize for current conditions.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Input Area */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      placeholder="Type a command or question..." 
                      className="w-full p-2 pr-10 border border-border rounded-md bg-background"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                      Type / for commands
                    </div>
                  </div>
                  <button className="btn-primary p-2 rounded-md">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div className="p-4 border-t border-border flex justify-between">
            <button className="btn-outline-sm" onClick={onClose}>
              Close
            </button>
            
            <div className="flex gap-2">
              {farm.status === 'active' ? (
                <button className="btn-outline-sm text-warning">
                  Pause Farm
                </button>
              ) : farm.status === 'paused' ? (
                <button className="btn-outline-sm text-success">
                  Resume Farm
                </button>
              ) : null}
              
              <button className="btn-primary">
                Manage Farm
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
