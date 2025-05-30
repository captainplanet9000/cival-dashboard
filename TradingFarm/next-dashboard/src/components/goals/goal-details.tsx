"use client"

import { useState } from 'react'
import { 
  ArrowRight, 
  Calendar, 
  Target, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp,
  Users,
  Building,
  AlertTriangle,
  Edit3,
  RefreshCw,
  Pause,
  Play,
  X,
  Clock,
  BarChart2
} from 'lucide-react'

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

interface Farm {
  id: string
  name: string
  type: string
}

interface GoalDetailsProps {
  goal: Goal
  farms: Farm[]
  onEdit: (goal: Goal) => void
  onClose: () => void
}

export default function GoalDetails({ goal, farms, onEdit, onClose }: GoalDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  
  // Sample performance data for the charts
  const performanceData = [
    { date: '2025-01-10', value: 0 },
    { date: '2025-01-20', value: 5 },
    { date: '2025-01-30', value: 12 },
    { date: '2025-02-10', value: 18 },
    { date: '2025-02-20', value: 25 },
    { date: '2025-03-01', value: 30 },
    { date: '2025-03-10', value: 42 },
    { date: '2025-03-20', value: goal.progress },
  ]
  
  // Sample recent activities
  const recentActivities = [
    { id: '1', action: 'Trade executed', details: 'BTC/USDT buy at $65,250', timestamp: '2025-03-18 14:32', success: true },
    { id: '2', action: 'Position closed', details: 'ETH/USDT sell at $3,480', timestamp: '2025-03-15 09:45', success: true },
    { id: '3', action: 'Strategy adjusted', details: 'Reduced risk parameter to 0.8', timestamp: '2025-03-12 16:20', success: true },
    { id: '4', action: 'Trade executed', details: 'SOL/USDT buy at $143.75', timestamp: '2025-03-10 11:15', success: false },
    { id: '5', action: 'Agent reassigned', details: 'Agent Delta added to goal', timestamp: '2025-03-05 10:00', success: true },
  ]
  
  // Risk level colors
  const getRiskColor = (risk: string) => {
    switch(risk) {
      case 'low': return 'bg-success/20 text-success'
      case 'medium': return 'bg-warning/20 text-warning'
      case 'high': return 'bg-danger/20 text-danger'
      default: return 'bg-muted text-muted-foreground'
    }
  }
  
  // Status colors
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-primary/20 text-primary'
      case 'completed': return 'bg-success/20 text-success'
      case 'failed': return 'bg-danger/20 text-danger'
      default: return 'bg-muted text-muted-foreground'
    }
  }
  
  // Progress bar color based on progress percentage
  const getProgressColor = (progress: number) => {
    if (progress < 30) return 'bg-danger'
    if (progress < 70) return 'bg-warning'
    return 'bg-success'
  }
  
  // Calculate days remaining
  const calculateDaysRemaining = () => {
    const deadlineDate = new Date(goal.deadline)
    const today = new Date()
    
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays > 0 ? diffDays : 0
  }
  
  const daysRemaining = calculateDaysRemaining()
  
  return (
    <div className="dashboard-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
        <h2 className="text-xl font-bold">{goal.name}</h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onEdit(goal)} 
            className="p-2 rounded-md hover:bg-muted"
            title="Edit Goal"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button 
            onClick={onClose} 
            className="p-2 rounded-md hover:bg-muted"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'overview' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'performance' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'activity' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
      </div>
      
      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Goal Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Goal Details</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{goal.type.charAt(0).toUpperCase() + goal.type.slice(1)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Target</span>
                  <div className="flex items-center">
                    <Target className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">{goal.target}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Timeframe</span>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">{goal.timeframe}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Deadline</span>
                  <span className="font-medium">{new Date(goal.deadline).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Risk Level</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getRiskColor(goal.risk)}`}>
                    {goal.risk.charAt(0).toUpperCase() + goal.risk.slice(1)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(goal.status)}`}>
                    {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created On</span>
                  <span className="font-medium">{new Date(goal.createdAt).toLocaleDateString()}</span>
                </div>
                
                {goal.description && (
                  <div className="pt-2">
                    <h4 className="text-sm font-medium mb-1">Description:</h4>
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Progress</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{goal.progress}% Complete</span>
                    <span className="text-sm text-muted-foreground">Target: {goal.target}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${getProgressColor(goal.progress)}`}
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="border border-border rounded-md p-4 text-center">
                    <h4 className="text-sm text-muted-foreground mb-1">Days Remaining</h4>
                    <div className="flex items-center justify-center">
                      <Clock className="h-4 w-4 mr-2 text-warning" />
                      <span className="text-xl font-bold">{daysRemaining}</span>
                    </div>
                  </div>
                  
                  <div className="border border-border rounded-md p-4 text-center">
                    <h4 className="text-sm text-muted-foreground mb-1">Agents Assigned</h4>
                    <div className="flex items-center justify-center">
                      <Users className="h-4 w-4 mr-2 text-primary" />
                      <span className="text-xl font-bold">{goal.agents}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Assigned Farms</h4>
                  <div className="space-y-2">
                    {goal.farms.map(farmId => {
                      const farm = farms.find(f => f.id === farmId)
                      return farm ? (
                        <div key={farm.id} className="border border-border rounded-md p-2 flex items-center justify-between">
                          <span className="font-medium">{farm.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            {farm.type}
                          </span>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            {goal.status === 'active' ? (
              <button className="btn-outline flex items-center">
                <Pause className="h-4 w-4 mr-2" />
                Pause Goal
              </button>
            ) : (
              <button className="btn-outline flex items-center">
                <Play className="h-4 w-4 mr-2" />
                Resume Goal
              </button>
            )}
            
            <button className="btn-outline flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </button>
            
            <button className="btn-outline flex items-center">
              <BarChart2 className="h-4 w-4 mr-2" />
              View Analytics
            </button>
          </div>
        </div>
      )}
      
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Performance Metrics</h3>
          
          {/* Placeholder for charts - in a real app, use a charting library */}
          <div className="border border-border rounded-md p-4 h-64 flex items-center justify-center">
            <div className="w-full h-full relative">
              <div className="absolute left-0 bottom-0 text-xs text-muted-foreground">Jan</div>
              <div className="absolute left-1/4 bottom-0 text-xs text-muted-foreground">Feb</div>
              <div className="absolute left-1/2 bottom-0 text-xs text-muted-foreground">Mar</div>
              <div className="absolute right-0 bottom-0 text-xs text-muted-foreground">Apr</div>
              
              <div className="absolute left-0 bottom-8 text-xs text-muted-foreground">0%</div>
              <div className="absolute left-0 bottom-1/2 text-xs text-muted-foreground">50%</div>
              <div className="absolute left-0 top-8 text-xs text-muted-foreground">100%</div>
              
              <div className="w-full h-[1px] absolute left-0 bottom-8 bg-border"></div>
              <div className="w-full h-[1px] absolute left-0 bottom-1/2 bg-border"></div>
              <div className="w-full h-[1px] absolute left-0 top-8 bg-border"></div>
              
              {/* Simple line chart visualization */}
              <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                <polyline
                  points="0,50 12.5,47.5 25,44 37.5,41 50,37.5 62.5,35 75,29 87.5,25 100,25"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary"
                />
              </svg>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-border rounded-md p-4">
              <h4 className="text-sm text-muted-foreground mb-1">Current ROI</h4>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-success" />
                <span className="text-xl font-bold">+18.5%</span>
              </div>
            </div>
            
            <div className="border border-border rounded-md p-4">
              <h4 className="text-sm text-muted-foreground mb-1">Success Rate</h4>
              <div className="flex items-center">
                <span className="text-xl font-bold">76%</span>
                <span className="text-xs text-muted-foreground ml-2">(19/25 trades)</span>
              </div>
            </div>
            
            <div className="border border-border rounded-md p-4">
              <h4 className="text-sm text-muted-foreground mb-1">Required Rate</h4>
              <div className="flex items-center">
                <span className="text-xl font-bold">+2.3%</span>
                <span className="text-xs text-muted-foreground ml-2">monthly</span>
              </div>
            </div>
          </div>
          
          <div className="border border-border rounded-md p-4">
            <h4 className="text-sm font-medium mb-4">Performance Breakdown</h4>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Trading Performance</span>
                  <span className="text-sm font-medium">+12.2%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-success h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Risk Management</span>
                  <span className="text-sm font-medium">92/100</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Timing Accuracy</span>
                  <span className="text-sm font-medium">78%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-warning h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Resource Efficiency</span>
                  <span className="text-sm font-medium">85%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Recent Activity</h3>
          
          <div className="space-y-4">
            {recentActivities.map(activity => (
              <div key={activity.id} className="border border-border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`h-2 w-2 rounded-full mr-2 ${activity.success ? 'bg-success' : 'bg-danger'}`}></div>
                    <span className="font-medium">{activity.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{activity.details}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center pt-4">
            <button className="btn-outline">
              View All Activity
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
