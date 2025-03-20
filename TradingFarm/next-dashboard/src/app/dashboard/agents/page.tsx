"use client"

import { useState } from 'react'
import { 
  Bot, 
  Plus, 
  Trash2, 
  Edit, 
  Play, 
  AlertCircle, 
  CheckCircle2, 
  Brain,
  Code,
  RefreshCw,
  PauseCircle,
  DatabaseBackup,
  ChevronRight,
  ChevronDown,
  LineChart,
  Settings2,
  Cpu
} from 'lucide-react'

interface Agent {
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
}

const agentData: Agent[] = [
  {
    id: 'agent-1',
    name: 'TrendMaster',
    status: 'active',
    type: 'trend',
    performance: 8.5,
    trades: 145,
    winRate: 62,
    createdAt: '2023-11-05',
    specialization: ['Bitcoin', 'Ethereum', 'Large Caps'],
    description: 'Specialized in identifying and following medium to long-term trends in major cryptocurrencies.',
    level: 'expert'
  },
  {
    id: 'agent-2',
    name: 'SwingTrader',
    status: 'active',
    type: 'reversal',
    performance: 12.3,
    trades: 93,
    winRate: 58,
    createdAt: '2023-12-10',
    specialization: ['Swing Trading', 'Volatility', 'Mid Caps'],
    description: 'Focuses on capturing price swings in volatile markets with moderate holding periods.',
    level: 'advanced'
  },
  {
    id: 'agent-3',
    name: 'StableCoin Arbitrageur',
    status: 'paused',
    type: 'arbitrage',
    performance: 3.2,
    trades: 210,
    winRate: 89,
    createdAt: '2024-01-15',
    specialization: ['Stablecoins', 'DEX Arbitrage', 'Low Risk'],
    description: 'Specialized in finding and exploiting price differences between stablecoins across exchanges.',
    level: 'expert'
  },
  {
    id: 'agent-4',
    name: 'PatternScout',
    status: 'offline',
    type: 'custom',
    performance: -2.1,
    trades: 67,
    winRate: 45,
    createdAt: '2024-02-01',
    specialization: ['Pattern Recognition', 'Small Caps', 'Short Term'],
    description: 'Uses advanced pattern recognition to identify trading opportunities in smaller cap tokens.',
    level: 'basic'
  }
]

// Agent Status Card Component
const AgentStatusCard = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-primary/10 mr-4">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Active Agents</p>
          <p className="text-2xl font-bold">2</p>
        </div>
      </div>
      
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-success/10 mr-4">
          <LineChart className="h-6 w-6 text-success" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Total Performance</p>
          <p className="text-2xl font-bold">+6.8%</p>
        </div>
      </div>
      
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-accent/10 mr-4">
          <Cpu className="h-6 w-6 text-accent" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Resource Usage</p>
          <p className="text-2xl font-bold">45%</p>
        </div>
      </div>
    </div>
  )
}

// Create Agent Component
const CreateAgentForm = ({ onCancel }: { onCancel: () => void }) => {
  return (
    <div className="space-y-4 py-4">
      <div>
        <label htmlFor="agent-name" className="block text-sm font-medium mb-1">Agent Name</label>
        <input 
          type="text" 
          id="agent-name" 
          className="form-input w-full" 
          placeholder="Enter a descriptive name"
        />
      </div>
      
      <div>
        <label htmlFor="agent-type" className="block text-sm font-medium mb-1">Agent Type</label>
        <select id="agent-type" className="form-select w-full">
          <option value="trend">Trend Following</option>
          <option value="reversal">Reversal</option>
          <option value="arbitrage">Arbitrage</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      
      <div>
        <label htmlFor="agent-description" className="block text-sm font-medium mb-1">Description</label>
        <textarea 
          id="agent-description" 
          className="form-input w-full" 
          placeholder="Describe what this agent does"
          rows={3}
        ></textarea>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Specializations</label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center">
            <input type="checkbox" id="spec-bitcoin" className="h-4 w-4 mr-2" />
            <label htmlFor="spec-bitcoin" className="text-sm">Bitcoin</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="spec-ethereum" className="h-4 w-4 mr-2" />
            <label htmlFor="spec-ethereum" className="text-sm">Ethereum</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="spec-large-caps" className="h-4 w-4 mr-2" />
            <label htmlFor="spec-large-caps" className="text-sm">Large Caps</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="spec-mid-caps" className="h-4 w-4 mr-2" />
            <label htmlFor="spec-mid-caps" className="text-sm">Mid Caps</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="spec-small-caps" className="h-4 w-4 mr-2" />
            <label htmlFor="spec-small-caps" className="text-sm">Small Caps</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="spec-stablecoins" className="h-4 w-4 mr-2" />
            <label htmlFor="spec-stablecoins" className="text-sm">Stablecoins</label>
          </div>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Agent Level</label>
        <div className="flex space-x-4">
          <div className="flex items-center">
            <input type="radio" id="level-basic" name="agent-level" className="h-4 w-4 mr-2" />
            <label htmlFor="level-basic" className="text-sm">Basic</label>
          </div>
          <div className="flex items-center">
            <input type="radio" id="level-advanced" name="agent-level" className="h-4 w-4 mr-2" checked />
            <label htmlFor="level-advanced" className="text-sm">Advanced</label>
          </div>
          <div className="flex items-center">
            <input type="radio" id="level-expert" name="agent-level" className="h-4 w-4 mr-2" />
            <label htmlFor="level-expert" className="text-sm">Expert</label>
          </div>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Import From Template</label>
        <select className="form-select w-full">
          <option value="">Select a template (optional)</option>
          <option value="trend-following">Trend Following Template</option>
          <option value="reversal">Reversal Strategy Template</option>
          <option value="arbitrage">DEX Arbitrage Template</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Natural Language Instructions</label>
        <textarea 
          className="form-input w-full" 
          placeholder="Provide instructions in natural language for ElizaOS"
          rows={4}
        ></textarea>
        <p className="text-xs text-muted-foreground mt-1">
          ElizaOS can interpret natural language to create agent behavior.
        </p>
      </div>
      
      <div className="pt-4 flex justify-end space-x-2">
        <button className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary">
          Create Agent
        </button>
      </div>
    </div>
  )
}

export default function AgentsManagementPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  
  const toggleAgentDetails = (agentId: string) => {
    if (expandedAgent === agentId) {
      setExpandedAgent(null)
    } else {
      setExpandedAgent(agentId)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Agent Management</h1>
        <p className="text-muted-foreground">
          Create, monitor and manage your trading agents
        </p>
      </div>
      
      <AgentStatusCard />
      
      <div className="dashboard-card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Your Agents</h2>
          <button 
            className="btn-primary flex items-center"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </button>
        </div>
        
        {showCreateForm && (
          <div className="mb-6 border rounded-md p-4 bg-muted/20">
            <h3 className="text-lg font-semibold mb-4">Create New Agent</h3>
            <CreateAgentForm onCancel={() => setShowCreateForm(false)} />
          </div>
        )}
        
        <div className="space-y-4">
          {agentData.map((agent) => (
            <div key={agent.id} className="border rounded-md overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30"
                onClick={() => toggleAgentDetails(agent.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${
                    agent.status === 'active' ? 'bg-success/10' : 
                    agent.status === 'paused' ? 'bg-warning/10' : 'bg-danger/10'
                  }`}>
                    <Bot className={`h-5 w-5 ${
                      agent.status === 'active' ? 'text-success' : 
                      agent.status === 'paused' ? 'text-warning' : 'text-danger'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-medium">{agent.name}</h3>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span className={`inline-block h-2 w-2 rounded-full mr-1 ${
                        agent.status === 'active' ? 'bg-success' : 
                        agent.status === 'paused' ? 'bg-warning' : 'bg-danger'
                      }`}></span>
                      <span className="capitalize">{agent.status}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm font-medium">Type</p>
                    <p className="text-sm capitalize">{agent.type}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium">Performance</p>
                    <p className={`text-sm ${agent.performance >= 0 ? 'text-success' : 'text-danger'}`}>
                      {agent.performance >= 0 ? '+' : ''}{agent.performance}%
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium">Win Rate</p>
                    <p className="text-sm">{agent.winRate}%</p>
                  </div>
                  
                  {expandedAgent === agent.id ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              {expandedAgent === agent.id && (
                <div className="p-4 border-t bg-muted/10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center">
                        <Brain className="h-4 w-4 mr-1 text-muted-foreground" />
                        Specialization
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {agent.specialization.map((spec, idx) => (
                          <span key={idx} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center">
                        <LineChart className="h-4 w-4 mr-1 text-muted-foreground" />
                        Statistics
                      </p>
                      <div className="text-sm space-y-1">
                        <p>Total Trades: {agent.trades}</p>
                        <p>Success Rate: {agent.winRate}%</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1 text-muted-foreground" />
                        Level
                      </p>
                      <p className="text-sm capitalize flex items-center">
                        <span className={`inline-block h-2 w-2 rounded-full mr-1 ${
                          agent.level === 'basic' ? 'bg-muted' : 
                          agent.level === 'advanced' ? 'bg-warning' : 'bg-success'
                        }`}></span>
                        {agent.level}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium flex items-center mb-1">
                      <AlertCircle className="h-4 w-4 mr-1 text-muted-foreground" />
                      Description
                    </p>
                    <p className="text-sm bg-muted/20 p-2 rounded-md">{agent.description}</p>
                  </div>
                  
                  <div className="flex justify-between">
                    <div className="flex space-x-2">
                      <button className="btn-outline-sm flex items-center">
                        <Code className="mr-1 h-3 w-3" />
                        Code View
                      </button>
                      <button className="btn-outline-sm flex items-center">
                        <Settings2 className="mr-1 h-3 w-3" />
                        Configure
                      </button>
                    </div>
                    
                    <div className="flex space-x-2">
                      {agent.status === 'active' ? (
                        <button className="btn-warning-sm flex items-center">
                          <PauseCircle className="mr-1 h-3 w-3" />
                          Pause
                        </button>
                      ) : agent.status === 'paused' ? (
                        <button className="btn-success-sm flex items-center">
                          <Play className="mr-1 h-3 w-3" />
                          Resume
                        </button>
                      ) : (
                        <button className="btn-success-sm flex items-center">
                          <Play className="mr-1 h-3 w-3" />
                          Activate
                        </button>
                      )}
                      
                      <button className="btn-outline-sm flex items-center">
                        <DatabaseBackup className="mr-1 h-3 w-3" />
                        Backup
                      </button>
                      
                      <button className="btn-ghost-sm flex items-center">
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </button>
                      
                      <button className="btn-danger-sm flex items-center">
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="dashboard-card">
        <h2 className="text-xl font-bold mb-4">Natural Language Instructions</h2>
        <div className="bg-muted/20 p-4 rounded-md">
          <p className="text-sm mb-2">Use natural language to control your agents through ElizaOS:</p>
          <div className="space-y-2">
            <p className="text-sm bg-primary/5 p-2 rounded-md">"Create a trend-following agent for Bitcoin that trades on 4-hour timeframes with a maximum drawdown of 10%"</p>
            <p className="text-sm bg-primary/5 p-2 rounded-md">"Adjust all agents to reduce risk during high market volatility"</p>
            <p className="text-sm bg-primary/5 p-2 rounded-md">"Optimize the SwingTrader agent for better performance in ranging markets"</p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ElizaOS will interpret these instructions and configure your agents accordingly.
          </p>
        </div>
      </div>
    </div>
  )
}
