"use client"

import { useState } from 'react'
import {
  Bot,
  LineChart,
  Activity,
  Settings,
  Brain,
  Code,
  Briefcase,
  BarChart2,
  PieChart,
  Zap,
  Cpu,
  ChevronDown,
  XCircle,
  Shield,
  MessageSquare,
  Users,
  PlusCircle,
  Terminal,
  Edit,
  RotateCw
} from 'lucide-react'

interface AgentPerformance {
  daily: number
  weekly: number
  monthly: number
  allTime: number
  trades: {
    won: number
    lost: number
    total: number
  }
  profitFactor: number
  avgDuration: string
}

export interface AgentSettings {
  riskLevel: 'low' | 'medium' | 'high'
  maxDrawdown: number
  positionSizing: number
  tradesPerDay: number
  automationLevel: 'semi' | 'full'
  timeframes: string[]
  indicators: string[]
}

interface AgentInstruction {
  id: string
  content: string
  createdAt: string
  enabled: boolean
  category: 'general' | 'risk' | 'market' | 'timing' | 'strategy'
  impact: 'low' | 'medium' | 'high'
}

interface AgentTransaction {
  id: string
  type: 'deposit' | 'withdraw' | 'trade'
  amount: number
  timestamp: string
  txHash: string
  status: 'pending' | 'completed' | 'failed'
}

export interface Agent {
  id: string
  name: string
  status: 'active' | 'paused' | 'offline'
  type: 'trend' | 'reversal' | 'arbitrage' | 'custom'
  performance: number
  trades: number
  winRate: number
  createdAt: string
  specialization: string[]
  description: string
  level: 'basic' | 'advanced' | 'expert'
  detailedPerformance?: AgentPerformance
  settings?: AgentSettings
  instructions?: AgentInstruction[]
  assignedFarms?: string[]
  walletAddress: string
  balance: number
  transactions: AgentTransaction[]
}

interface AgentDetailsProps {
  agent: Agent
  onClose: () => void
  onEdit: (agent: Agent) => void
}

export default function AgentDetails({ agent, onClose, onEdit }: AgentDetailsProps) {
  const [activeTab, setActiveTab] = useState('performance')
  
  // Sample detailed performance data
  const performanceData: AgentPerformance = agent.detailedPerformance || {
    daily: 0.8,
    weekly: 2.3,
    monthly: agent.performance,
    allTime: agent.performance * 1.5,
    trades: {
      won: Math.floor(agent.trades * (agent.winRate / 100)),
      lost: Math.floor(agent.trades * (1 - agent.winRate / 100)),
      total: agent.trades
    },
    profitFactor: 1.75,
    avgDuration: '4h 26m'
  }
  
  // Sample agent settings
  const settings: AgentSettings = agent.settings || {
    riskLevel: 'medium',
    maxDrawdown: 15,
    positionSizing: 5,
    tradesPerDay: 3,
    automationLevel: 'full',
    timeframes: ['1h', '4h', 'Daily'],
    indicators: ['MACD', 'RSI', 'Moving Averages', 'Volume Profile']
  }
  
  // Sample agent instructions
  const instructions: AgentInstruction[] = agent.instructions || [
    {
      id: '1',
      content: 'Focus on Bitcoin trading during high volatility periods only',
      createdAt: '2025-02-10',
      enabled: true,
      category: 'market' as const,
      impact: 'medium' as const
    },
    {
      id: '2',
      content: 'Limit trading to 5% of portfolio per position',
      createdAt: '2025-02-15',
      enabled: false,
      category: 'risk' as const,
      impact: 'high' as const
    },
    {
      id: '3',
      content: 'Use EMA crossover strategy for entry signals',
      createdAt: '2025-03-01',
      enabled: true,
      category: 'strategy' as const,
      impact: 'high' as const
    }
  ]
  
  // Agent's assigned farms
  const assignedFarms = agent.assignedFarms || ['DCA Farm', 'Momentum Farm']
  
  // Performance text color class based on value
  const getPerformanceClass = (value: number) => {
    if (value > 0) return 'text-success'
    if (value < 0) return 'text-danger'
    return 'text-muted-foreground'
  }
  
  // Level badge color
  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'basic': return 'badge-muted'
      case 'advanced': return 'badge-info'
      case 'expert': return 'badge-success'
      default: return 'badge-muted'
    }
  }
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-primary/10 p-2 rounded-full mr-3">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center">
                <h2 className="text-xl font-bold">{agent.name}</h2>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full 
                  ${agent.status === 'active' ? 'badge-success' : 
                    agent.status === 'paused' ? 'badge-warning' : 
                    'badge-danger'}`}
                >
                  {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                </span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getLevelBadgeClass(agent.level)}`}>
                  {agent.level.charAt(0).toUpperCase() + agent.level.slice(1)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {agent.type.charAt(0).toUpperCase() + agent.type.slice(1)} Agent • Created on {new Date(agent.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onEdit(agent)}
              className="p-2 rounded-full hover:bg-muted"
              aria-label="Edit agent"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted"
              aria-label="Close"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'performance' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'settings' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'instructions' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('instructions')}
          >
            Instructions
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'farms' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('farms')}
          >
            Assigned Farms
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="dashboard-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Trades</h3>
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bold">{performanceData.trades.total}</div>
                </div>
                
                <div className="dashboard-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Win Rate</h3>
                    <BarChart2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bold">{agent.winRate}%</div>
                </div>
                
                <div className="dashboard-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Profit Factor</h3>
                    <PieChart className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bold">{performanceData.profitFactor}</div>
                </div>
                
                <div className="dashboard-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Avg Duration</h3>
                    <Cpu className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bold">{performanceData.avgDuration}</div>
                </div>
              </div>
              
              {/* Performance Periods */}
              <div className="dashboard-card p-4">
                <h3 className="text-sm font-medium mb-4">Performance Periods</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Daily</p>
                    <p className={`text-lg font-medium ${getPerformanceClass(performanceData.daily)}`}>
                      {performanceData.daily > 0 ? '+' : ''}{performanceData.daily}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Weekly</p>
                    <p className={`text-lg font-medium ${getPerformanceClass(performanceData.weekly)}`}>
                      {performanceData.weekly > 0 ? '+' : ''}{performanceData.weekly}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Monthly</p>
                    <p className={`text-lg font-medium ${getPerformanceClass(performanceData.monthly)}`}>
                      {performanceData.monthly > 0 ? '+' : ''}{performanceData.monthly}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">All Time</p>
                    <p className={`text-lg font-medium ${getPerformanceClass(performanceData.allTime)}`}>
                      {performanceData.allTime > 0 ? '+' : ''}{performanceData.allTime}%
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Performance Chart Placeholder */}
              <div className="dashboard-card p-4">
                <h3 className="text-sm font-medium mb-2">Performance Chart</h3>
                <div className="h-60 flex items-center justify-center bg-muted/20 rounded-md">
                  <p className="text-muted-foreground">Performance chart will be implemented in the next phase</p>
                </div>
              </div>
              
              {/* Trade Distribution */}
              <div className="dashboard-card p-4">
                <h3 className="text-sm font-medium mb-4">Trade Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <p className="text-sm">Win/Loss Ratio</p>
                      <p className="text-sm font-medium">
                        {performanceData.trades.won} : {performanceData.trades.lost}
                      </p>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-success"
                        style={{ width: `${(performanceData.trades.won / performanceData.trades.total) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>Won ({((performanceData.trades.won / performanceData.trades.total) * 100).toFixed(1)}%)</span>
                      <span>Lost ({((performanceData.trades.lost / performanceData.trades.total) * 100).toFixed(1)}%)</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <p className="text-sm">Specialization Metrics</p>
                    </div>
                    <div className="space-y-2">
                      {agent.specialization.map((spec, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <p className="text-sm">{spec}</p>
                          <div className="flex items-center">
                            <div className="h-2 w-20 bg-muted rounded-full overflow-hidden mr-2">
                              <div 
                                className="h-full bg-primary"
                                style={{ width: `${Math.random() * 80 + 20}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {Math.floor(Math.random() * 20 + 10)} trades
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Agent Description */}
              <div className="dashboard-card p-4">
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <p className="text-muted-foreground text-sm">{agent.description}</p>
              </div>
              
              {/* Risk Settings */}
              <div className="dashboard-card p-4">
                <h3 className="text-sm font-medium mb-4">Risk Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm mb-2">Risk Level</p>
                    <div className="flex items-center space-x-2">
                      <button
                        className={`flex-1 py-2 px-3 rounded-md text-sm ${settings.riskLevel === 'low' ? 'bg-success/20 border border-success text-success' : 'border border-border'}`}
                      >
                        Low
                      </button>
                      <button
                        className={`flex-1 py-2 px-3 rounded-md text-sm ${settings.riskLevel === 'medium' ? 'bg-warning/20 border border-warning text-warning' : 'border border-border'}`}
                      >
                        Medium
                      </button>
                      <button
                        className={`flex-1 py-2 px-3 rounded-md text-sm ${settings.riskLevel === 'high' ? 'bg-danger/20 border border-danger text-danger' : 'border border-border'}`}
                      >
                        High
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm mb-2">Maximum Drawdown</p>
                    <div className="flex items-center">
                      <input
                        type="range"
                        min="5"
                        max="30"
                        value={settings.maxDrawdown}
                        className="flex-1 mr-2"
                        readOnly
                      />
                      <span className="text-sm font-medium w-12 text-right">{settings.maxDrawdown}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <p className="text-sm mb-2">Position Sizing</p>
                    <div className="flex items-center">
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={settings.positionSizing}
                        className="flex-1 mr-2"
                        readOnly
                      />
                      <span className="text-sm font-medium w-12 text-right">{settings.positionSizing}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm mb-2">Trades Per Day</p>
                    <div className="flex items-center">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={settings.tradesPerDay}
                        className="flex-1 mr-2"
                        readOnly
                      />
                      <span className="text-sm font-medium w-12 text-right">{settings.tradesPerDay}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Technical Settings */}
              <div className="dashboard-card p-4">
                <h3 className="text-sm font-medium mb-4">Technical Configuration</h3>
                
                <div className="mb-4">
                  <p className="text-sm mb-2">Automation Level</p>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="auto-semi"
                        checked={settings.automationLevel === 'semi'}
                        className="mr-2"
                        readOnly
                      />
                      <label htmlFor="auto-semi" className="text-sm">Semi-Automated</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="auto-full"
                        checked={settings.automationLevel === 'full'}
                        className="mr-2"
                        readOnly
                      />
                      <label htmlFor="auto-full" className="text-sm">Fully Automated</label>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm mb-2">Timeframes</p>
                    <div className="flex flex-wrap gap-2">
                      {settings.timeframes.map((timeframe, index) => (
                        <span key={index} className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
                          {timeframe}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm mb-2">Indicators</p>
                    <div className="flex flex-wrap gap-2">
                      {settings.indicators.map((indicator, index) => (
                        <span key={index} className="px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs">
                          {indicator}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Instructions Tab */}
          {activeTab === 'instructions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Natural Language Instructions</h3>
                <button className="btn-outline-sm flex items-center gap-1">
                  <PlusCircle className="h-4 w-4" />
                  Add Instruction
                </button>
              </div>
              
              <div className="dashboard-card p-4 mb-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Use natural language instructions to guide your agent's behavior. These instructions will be processed by the AI to adjust trading decisions.
                </p>
                
                <div className="space-y-3">
                  {instructions.map((instruction) => (
                    <div key={instruction.id} className="p-3 border border-border rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className={`h-3 w-3 rounded-full mr-2 ${instruction.enabled ? 'bg-success' : 'bg-muted'}`}></div>
                          <p className="text-xs text-muted-foreground">Added {new Date(instruction.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-1 rounded-md hover:bg-muted">
                            <Edit className="h-3 w-3" />
                          </button>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={instruction.enabled} className="sr-only peer" readOnly />
                            <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success"></div>
                          </label>
                        </div>
                      </div>
                      <p className="text-sm">{instruction.content}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Terminal Interface */}
              <div className="dashboard-card overflow-hidden">
                <div className="border-b border-border p-2 flex items-center">
                  <Terminal className="h-4 w-4 mr-2 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Command Terminal</h3>
                </div>
                <div className="bg-muted/30 p-4 max-h-60 overflow-y-auto font-mono text-sm">
                  <p className="text-muted-foreground mb-2"># Enter commands to directly control agent behavior</p>
                  <div className="mb-2">
                    <span className="text-success">system &gt;</span> Agent {agent.name} connected. Ready for instructions.
                  </div>
                  <div className="flex items-center">
                    <span className="text-primary mr-2">&gt;</span>
                    <input 
                      type="text" 
                      className="bg-transparent flex-1 outline-none border-none focus:ring-0 text-sm" 
                      placeholder="Type your command here..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Assigned Farms Tab */}
          {activeTab === 'farms' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Assigned Trading Farms</h3>
                <button className="btn-outline-sm flex items-center gap-1">
                  <PlusCircle className="h-4 w-4" />
                  Assign to Farm
                </button>
              </div>
              
              {assignedFarms.length > 0 ? (
                <div className="dashboard-card">
                  {assignedFarms.map((farm, index) => (
                    <div key={index} className={`p-4 flex items-center justify-between ${index !== assignedFarms.length - 1 ? 'border-b border-border' : ''}`}>
                      <div className="flex items-center">
                        <div className="bg-primary/10 p-2 rounded-full mr-3">
                          <Briefcase className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{farm}</p>
                          <p className="text-xs text-muted-foreground">Last activity: 2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="btn-outline-sm">View Farm</button>
                        <button className="btn-outline-sm text-danger">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-card p-6 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <h4 className="font-medium mb-1">Not Assigned to Any Farms</h4>
                  <p className="text-sm text-muted-foreground mb-4">This agent is not currently assigned to any trading farms.</p>
                  <button className="btn-outline-sm">Assign to Farm</button>
                </div>
              )}
              
              <div className="dashboard-card p-4">
                <h3 className="text-sm font-medium mb-4">Farm Performance Impact</h3>
                <div className="space-y-4">
                  {assignedFarms.map((farm, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <p className="text-sm">{farm}</p>
                        <p className={`text-sm ${getPerformanceClass(Math.random() * 20 - 5)}`}>
                          {(Math.random() * 20 - 5).toFixed(1)}% contribution
                        </p>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary"
                          style={{ width: `${Math.random() * 80 + 20}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-between">
          <button className="btn-outline-sm" onClick={onClose}>
            Close
          </button>
          
          <div className="flex gap-2">
            {agent.status === 'active' ? (
              <button className="btn-outline-sm text-warning">
                Pause Agent
              </button>
            ) : agent.status === 'paused' ? (
              <button className="btn-outline-sm text-success">
                Resume Agent
              </button>
            ) : (
              <button className="btn-outline-sm text-success">
                Activate Agent
              </button>
            )}
            
            <button className="btn-primary flex items-center gap-1">
              <RotateCw className="h-4 w-4" />
              Sync Agent
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
