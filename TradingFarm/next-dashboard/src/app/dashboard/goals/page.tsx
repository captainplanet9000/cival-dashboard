"use client"

import { useState } from 'react'
import { 
  Target, 
  Plus, 
  Calendar, 
  TrendingUp, 
  BarChart2, 
  Edit3, 
  Trash2, 
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Filter,
  AlertTriangle
} from 'lucide-react'
import GoalForm from '@/components/goals/goal-form'
import GoalDetails from '@/components/goals/goal-details'

// Share the same interface across components
interface GoalType {
  id: string
  name: string
  description: string
}

interface Goal {
  id: string
  name: string
  type: string
  target: string
  progress: number
  timeframe: string
  deadline: string
  status: 'active' | 'completed' | 'failed'
  risk: 'low' | 'medium' | 'high'
  farms: string[]
  agents: number
  createdAt: string
  description?: string
}

// Simple farm interface for use with goal details
interface Farm {
  id: string
  name: string
  type: string
}

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState('active')
  const [showNewGoalForm, setShowNewGoalForm] = useState(false)
  const [goalFilter, setGoalFilter] = useState('')
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [showGoalDetails, setShowGoalDetails] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  
  // Sample goal types
  const goalTypes: GoalType[] = [
    { 
      id: 'accumulation', 
      name: 'Accumulation',
      description: 'Acquire a specific amount of a particular asset over time' 
    },
    { 
      id: 'profit', 
      name: 'Profit Target',
      description: 'Achieve a specific profit percentage or amount' 
    },
    { 
      id: 'risk-reward', 
      name: 'Risk-Reward',
      description: 'Optimize risk-reward ratio with specific parameters' 
    },
    { 
      id: 'dca', 
      name: 'Dollar Cost Average',
      description: 'Systematically invest at regular intervals' 
    },
    { 
      id: 'hedging', 
      name: 'Portfolio Hedging',
      description: 'Protect portfolio value during market downturns' 
    }
  ]
  
  // Sample farms data for goal details
  const sampleFarms: Farm[] = [
    { id: '1', name: 'DCA Farm', type: 'Accumulation' },
    { id: '2', name: 'Momentum Farm', type: 'Trend Following' },
    { id: '3', name: 'Swing Trading Farm', type: 'Swing' },
    { id: '4', name: 'Yield Farm', type: 'Yield' },
    { id: '5', name: 'Arbitrage Farm', type: 'Arbitrage' },
    { id: '6', name: 'Scalping Farm', type: 'Scalping' },
    { id: '7', name: 'Hedge Fund Farm', type: 'Hedging' },
  ]
  
  // Sample goals
  const goals: Goal[] = [
    {
      id: '1',
      name: 'Bitcoin Accumulation',
      type: 'accumulation',
      target: '0.5 BTC',
      progress: 65,
      timeframe: '6 months',
      deadline: '2025-09-15',
      status: 'active',
      risk: 'medium',
      farms: ['DCA Farm', 'Momentum Farm'],
      agents: 2,
      createdAt: '2025-01-10'
    },
    {
      id: '2',
      name: 'ETH Profit Target',
      type: 'profit',
      target: '25% ROI',
      progress: 82,
      timeframe: '3 months',
      deadline: '2025-06-20',
      status: 'active',
      risk: 'high',
      farms: ['Swing Trading Farm'],
      agents: 3,
      createdAt: '2025-03-05'
    },
    {
      id: '3',
      name: 'USDT Reserve Building',
      type: 'accumulation',
      target: '$10,000 USDT',
      progress: 40,
      timeframe: '12 months',
      deadline: '2026-01-01',
      status: 'active',
      risk: 'low',
      farms: ['Yield Farm', 'Arbitrage Farm'],
      agents: 4,
      createdAt: '2025-02-12'
    },
    {
      id: '4',
      name: 'SOL Trading Challenge',
      type: 'risk-reward',
      target: '3:1 Risk-Reward',
      progress: 100,
      timeframe: '2 months',
      deadline: '2025-03-01',
      status: 'completed',
      risk: 'medium',
      farms: ['Scalping Farm'],
      agents: 2,
      createdAt: '2025-01-02'
    },
    {
      id: '5',
      name: 'Portfolio Hedge',
      type: 'hedging',
      target: 'Protect 75% of Value',
      progress: 32,
      timeframe: '6 months',
      deadline: '2025-08-30',
      status: 'active',
      risk: 'low',
      farms: ['Hedge Fund Farm'],
      agents: 5,
      createdAt: '2025-03-01'
    }
  ]
  
  // Filter goals based on status
  const filteredGoals = goals.filter(goal => {
    if (activeTab === 'all') return true
    if (activeTab === 'active') return goal.status === 'active'
    if (activeTab === 'completed') return goal.status === 'completed'
    if (activeTab === 'failed') return goal.status === 'failed'
    return false
  }).filter(goal => {
    if (!goalFilter) return true
    return (
      goal.name.toLowerCase().includes(goalFilter.toLowerCase()) ||
      goal.type.toLowerCase().includes(goalFilter.toLowerCase())
    )
  })
  
  // Function to get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-primary/20 text-primary'
      case 'completed':
        return 'bg-success/20 text-success'
      case 'failed':
        return 'bg-danger/20 text-danger'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }
  
  // Function to get risk badge class
  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-success/20 text-success'
      case 'medium':
        return 'bg-warning/20 text-warning'
      case 'high':
        return 'bg-danger/20 text-danger'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }
  
  // Function to toggle goal details
  const toggleGoalDetails = (goal: Goal) => {
    if (selectedGoal && selectedGoal.id === goal.id && showGoalDetails) {
      setShowGoalDetails(false)
      setSelectedGoal(null)
    } else {
      setSelectedGoal(goal)
      setShowGoalDetails(true)
    }
  }
  
  // Function to handle editing a goal
  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setShowGoalDetails(false)
    setShowNewGoalForm(true)
  }
  
  // Function to save a goal (create or update)
  const handleSaveGoal = (goal: Partial<Goal> & { name: string; type: string; target: string; timeframe: string; deadline: string; risk: 'low' | 'medium' | 'high'; farms: string[]; agents: number; }) => {
    // In a real app, this would save to an API
    console.log('Saving goal:', goal)
    setShowNewGoalForm(false)
    
    // For demo purposes, we'll just close the form
    // In a real app, you would update the goals list
  }
  
  return (
    <div className="p-6 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Goal-Based Trading</h1>
          <p className="text-muted-foreground">Set, monitor, and achieve your trading goals through targeted strategies</p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => {
            setEditingGoal(null)
            setShowNewGoalForm(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Create New Goal
        </button>
      </div>
      
      {/* Goals Dashboard */}
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Trading Goals</h2>
          
          {/* Goal Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter goals..."
                className="pl-8 pr-4 py-2 text-sm rounded-md border border-border bg-background"
                value={goalFilter}
                onChange={(e) => setGoalFilter(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        {/* Goal Tabs */}
        <div className="flex border-b border-border mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'active' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('active')}
          >
            Active
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'completed' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'failed' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('failed')}
          >
            Failed
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'all' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('all')}
          >
            All Goals
          </button>
        </div>
        
        {/* Goals List */}
        <div className="space-y-4">
          {filteredGoals.length > 0 ? (
            filteredGoals.map(goal => (
              <div key={goal.id} className="border border-border rounded-md overflow-hidden">
                <div 
                  className={`p-4 cursor-pointer hover:bg-muted/30 ${selectedGoal?.id === goal.id ? 'bg-muted/30' : ''}`}
                  onClick={() => toggleGoalDetails(goal)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-primary/10 p-2 rounded-full mr-3">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{goal.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Target: {goal.target} • Timeframe: {goal.timeframe}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className={`px-2 py-0.5 text-xs rounded-full mr-3 ${getStatusBadgeClass(goal.status)}`}>
                        {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full mr-3 ${getRiskBadgeClass(goal.risk)}`}>
                        {goal.risk.charAt(0).toUpperCase() + goal.risk.slice(1)} Risk
                      </span>
                      <ChevronDown className={`h-5 w-5 transition-transform ${selectedGoal?.id === goal.id && showGoalDetails ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{goal.progress}% Complete</span>
                      <span className="text-sm text-muted-foreground">Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          goal.progress < 30 ? 'bg-danger' : 
                          goal.progress < 70 ? 'bg-warning' : 
                          'bg-success'
                        }`}
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {/* Goal Details Section */}
                {selectedGoal?.id === goal.id && showGoalDetails && (
                  <GoalDetails 
                    goal={goal}
                    farms={sampleFarms}
                    onEdit={handleEditGoal}
                    onClose={() => setShowGoalDetails(false)}
                  />
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="bg-muted/30 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No Goals Found</h3>
              <p>No goals match your current filter criteria.</p>
              <button 
                className="mt-4 px-4 py-2 border border-border rounded-md hover:bg-muted"
                onClick={() => {
                  setGoalFilter('')
                  setActiveTab('all')
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Goal Creation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Goal Performance */}
        <div className="dashboard-card">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <BarChart2 className="mr-2 h-5 w-5" />
            Goal Performance
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Success Rate</div>
                <div className="text-sm text-muted-foreground">
                  {goals.filter(g => g.status === 'completed').length} of {goals.length} goals completed
                </div>
              </div>
              <div className="text-2xl font-bold text-success">
                {Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100)}%
              </div>
            </div>
            
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-success" 
                style={{ width: `${(goals.filter(g => g.status === 'completed').length / goals.length) * 100}%` }}
              ></div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 pt-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground">Active</div>
                <div className="text-xl font-bold">{goals.filter(g => g.status === 'active').length}</div>
              </div>
              <div className="text-center p-3 bg-success/10 rounded-lg">
                <div className="text-sm text-success">Completed</div>
                <div className="text-xl font-bold">{goals.filter(g => g.status === 'completed').length}</div>
              </div>
              <div className="text-center p-3 bg-danger/10 rounded-lg">
                <div className="text-sm text-danger">Failed</div>
                <div className="text-xl font-bold">{goals.filter(g => g.status === 'failed').length}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Goal Types */}
        <div className="dashboard-card">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Target className="mr-2 h-5 w-5" />
            Goal Types
          </h2>
          
          <div className="space-y-4">
            {goalTypes.map(type => (
              <div 
                key={type.id}
                className="flex items-center p-3 border border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => {
                  setEditingGoal(null)
                  setShowNewGoalForm(true)
                }}
              >
                <div className={`p-2 rounded-md mr-3 ${
                  type.id === 'accumulation' ? 'bg-primary/10' :
                  type.id === 'profit' ? 'bg-success/10' :
                  type.id === 'risk-reward' ? 'bg-warning/10' :
                  type.id === 'dca' ? 'bg-blue-500/10' :
                  'bg-purple-500/10'
                }`}>
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{type.name}</div>
                  <div className="text-sm text-muted-foreground">{type.description}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* New Goal Form Modal */}
      {showNewGoalForm && (
        <GoalForm 
          goalTypes={goalTypes}
          existingGoal={editingGoal}
          onClose={() => {
            setShowNewGoalForm(false)
            setEditingGoal(null)
          }}
          onSave={handleSaveGoal}
        />
      )}
    </div>
  )
}
