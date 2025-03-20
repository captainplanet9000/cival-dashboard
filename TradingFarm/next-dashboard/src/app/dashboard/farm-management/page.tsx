"use client"

import { useState } from 'react'
import { 
  Database, 
  Plus, 
  Trash2, 
  Edit, 
  ArrowUpDown, 
  AlertOctagon, 
  CheckCircle2, 
  Activity,
  Users,
  RefreshCw,
  BarChart2,
  DollarSign,
  ChevronRight,
  ChevronDown
} from 'lucide-react'

interface Farm {
  id: string
  name: string
  status: 'active' | 'paused' | 'stopped'
  agents: number
  strategies: number
  capital: number
  pnl: number
  pnlPercentage: number
  createdAt: string
  risk: 'low' | 'medium' | 'high'
}

const farmData: Farm[] = [
  {
    id: 'farm-1',
    name: 'Bitcoin Momentum',
    status: 'active',
    agents: 3,
    strategies: 2,
    capital: 25000,
    pnl: 1250,
    pnlPercentage: 5,
    createdAt: '2023-10-15',
    risk: 'medium'
  },
  {
    id: 'farm-2',
    name: 'Ethereum Swing',
    status: 'active',
    agents: 2,
    strategies: 1,
    capital: 15000,
    pnl: 1800,
    pnlPercentage: 12,
    createdAt: '2023-11-05',
    risk: 'high'
  },
  {
    id: 'farm-3',
    name: 'Stablecoin Arbitrage',
    status: 'paused',
    agents: 4,
    strategies: 3,
    capital: 50000,
    pnl: 950,
    pnlPercentage: 1.9,
    createdAt: '2023-12-20',
    risk: 'low'
  },
  {
    id: 'farm-4',
    name: 'Altcoin Breakout',
    status: 'stopped',
    agents: 2,
    strategies: 2,
    capital: 10000,
    pnl: -450,
    pnlPercentage: -4.5,
    createdAt: '2024-01-10',
    risk: 'high'
  }
]

// Farm Status Card Component
const FarmStatusCard = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-primary/10 mr-4">
          <Database className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Active Farms</p>
          <p className="text-2xl font-bold">2</p>
        </div>
      </div>
      
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-success/10 mr-4">
          <DollarSign className="h-6 w-6 text-success" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Total Capital</p>
          <p className="text-2xl font-bold">$100,000</p>
        </div>
      </div>
      
      <div className="dashboard-card flex items-center">
        <div className="p-3 rounded-full bg-accent/10 mr-4">
          <Users className="h-6 w-6 text-accent" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Total Agents</p>
          <p className="text-2xl font-bold">11</p>
        </div>
      </div>
    </div>
  )
}

// Create Farm Component
const CreateFarmForm = ({ onCancel }: { onCancel: () => void }) => {
  return (
    <div className="space-y-4 py-4">
      <div>
        <label htmlFor="farm-name" className="block text-sm font-medium mb-1">Farm Name</label>
        <input 
          type="text" 
          id="farm-name" 
          className="form-input w-full" 
          placeholder="Enter a descriptive name"
        />
      </div>
      
      <div>
        <label htmlFor="farm-description" className="block text-sm font-medium mb-1">Description</label>
        <textarea 
          id="farm-description" 
          className="form-input w-full" 
          placeholder="Enter a brief description"
          rows={3}
        ></textarea>
      </div>
      
      <div>
        <label htmlFor="farm-capital" className="block text-sm font-medium mb-1">Initial Capital</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <span className="text-muted-foreground">$</span>
          </div>
          <input 
            type="text" 
            id="farm-capital" 
            className="form-input w-full pl-8" 
            placeholder="0.00"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Risk Level</label>
        <div className="flex space-x-4">
          <div className="flex items-center">
            <input type="radio" id="risk-low" name="risk-level" className="h-4 w-4 mr-2" />
            <label htmlFor="risk-low" className="text-sm">Low</label>
          </div>
          <div className="flex items-center">
            <input type="radio" id="risk-medium" name="risk-level" className="h-4 w-4 mr-2" checked />
            <label htmlFor="risk-medium" className="text-sm">Medium</label>
          </div>
          <div className="flex items-center">
            <input type="radio" id="risk-high" name="risk-level" className="h-4 w-4 mr-2" />
            <label htmlFor="risk-high" className="text-sm">High</label>
          </div>
        </div>
      </div>
      
      <div className="pt-4 flex justify-end space-x-2">
        <button className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary">
          Create Farm
        </button>
      </div>
    </div>
  )
}

export default function FarmManagementPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [expandedFarm, setExpandedFarm] = useState<string | null>(null)
  
  const toggleFarmDetails = (farmId: string) => {
    if (expandedFarm === farmId) {
      setExpandedFarm(null)
    } else {
      setExpandedFarm(farmId)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Farm Management</h1>
        <p className="text-muted-foreground">
          Create, monitor and manage your trading farms
        </p>
      </div>
      
      <FarmStatusCard />
      
      <div className="dashboard-card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Your Farms</h2>
          <button 
            className="btn-primary flex items-center"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Farm
          </button>
        </div>
        
        {showCreateForm && (
          <div className="mb-6 border rounded-md p-4 bg-muted/20">
            <h3 className="text-lg font-semibold mb-4">Create New Farm</h3>
            <CreateFarmForm onCancel={() => setShowCreateForm(false)} />
          </div>
        )}
        
        <div className="space-y-4">
          {farmData.map((farm) => (
            <div key={farm.id} className="border rounded-md overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30"
                onClick={() => toggleFarmDetails(farm.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${
                    farm.status === 'active' ? 'bg-success/10' : 
                    farm.status === 'paused' ? 'bg-warning/10' : 'bg-danger/10'
                  }`}>
                    <Database className={`h-5 w-5 ${
                      farm.status === 'active' ? 'text-success' : 
                      farm.status === 'paused' ? 'text-warning' : 'text-danger'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-medium">{farm.name}</h3>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span className={`inline-block h-2 w-2 rounded-full mr-1 ${
                        farm.status === 'active' ? 'bg-success' : 
                        farm.status === 'paused' ? 'bg-warning' : 'bg-danger'
                      }`}></span>
                      <span className="capitalize">{farm.status}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm font-medium">Capital</p>
                    <p className="text-sm">${farm.capital.toLocaleString()}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium">P&L</p>
                    <p className={`text-sm ${farm.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      {farm.pnl >= 0 ? '+' : ''}{farm.pnlPercentage}% (${Math.abs(farm.pnl).toLocaleString()})
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium">Agents</p>
                    <p className="text-sm">{farm.agents}</p>
                  </div>
                  
                  {expandedFarm === farm.id ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              {expandedFarm === farm.id && (
                <div className="p-4 border-t bg-muted/10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center">
                        <Activity className="h-4 w-4 mr-1 text-muted-foreground" />
                        Risk Level
                      </p>
                      <div className="flex items-center">
                        <span className={`inline-block h-2 w-2 rounded-full mr-1 ${
                          farm.risk === 'low' ? 'bg-success' : 
                          farm.risk === 'medium' ? 'bg-warning' : 'bg-danger'
                        }`}></span>
                        <span className="text-sm capitalize">{farm.risk}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center">
                        <BarChart2 className="h-4 w-4 mr-1 text-muted-foreground" />
                        Strategies
                      </p>
                      <p className="text-sm">{farm.strategies} active strategies</p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1 text-muted-foreground" />
                        Created
                      </p>
                      <p className="text-sm">{farm.createdAt}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <div className="flex space-x-2">
                      <button className="btn-outline-sm flex items-center">
                        <Users className="mr-1 h-3 w-3" />
                        Manage Agents
                      </button>
                      <button className="btn-outline-sm flex items-center">
                        <BarChart2 className="mr-1 h-3 w-3" />
                        Strategies
                      </button>
                    </div>
                    
                    <div className="flex space-x-2">
                      {farm.status === 'active' ? (
                        <button className="btn-warning-sm flex items-center">
                          <AlertOctagon className="mr-1 h-3 w-3" />
                          Pause
                        </button>
                      ) : farm.status === 'paused' ? (
                        <button className="btn-success-sm flex items-center">
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Resume
                        </button>
                      ) : null}
                      
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
        <h2 className="text-xl font-bold mb-4">Farm Analytics</h2>
        <div className="border rounded-md p-4 text-center">
          <p className="text-muted-foreground">Select a farm above to view detailed analytics</p>
        </div>
      </div>
    </div>
  )
}
