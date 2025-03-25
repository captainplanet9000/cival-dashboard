"use client"

import { useState, useEffect } from 'react'
import { 
  X, 
  Calendar, 
  BarChart2, 
  Target, 
  AlertTriangle,
  Users,
  Building,
  Check
} from 'lucide-react'

interface GoalType {
  id: string
  name: string
  description: string
}

interface Farm {
  id: string
  name: string
  type: string
  balance: string
  active: boolean
}

interface Agent {
  id: string
  name: string
  specialty: string
  success_rate: number
  available: boolean
}

interface Goal {
  id?: string
  name: string
  type: string
  target: string
  timeframe: string
  deadline: string
  risk: 'low' | 'medium' | 'high'
  farms: string[]
  agents: number
  description?: string
  progress?: number
  status?: 'active' | 'completed' | 'failed'
  createdAt?: string
}

interface GoalFormProps {
  goalTypes: GoalType[]
  existingGoal?: Goal | null
  onClose: () => void
  onSave: (goal: Goal) => void
}

export default function GoalForm({ goalTypes, existingGoal, onClose, onSave }: GoalFormProps) {
  // Sample farms and agents data (would come from an API in production)
  const farms: Farm[] = [
    { id: '1', name: 'DCA Farm', type: 'Accumulation', balance: '0.25 BTC', active: true },
    { id: '2', name: 'Momentum Farm', type: 'Trend Following', balance: '1.5 ETH', active: true },
    { id: '3', name: 'Swing Trading Farm', type: 'Swing', balance: '5000 USDT', active: true },
    { id: '4', name: 'Yield Farm', type: 'Yield', balance: '10000 USDC', active: true },
    { id: '5', name: 'Arbitrage Farm', type: 'Arbitrage', balance: '3000 USDT', active: false },
    { id: '6', name: 'Scalping Farm', type: 'Scalping', balance: '0.5 ETH', active: true },
    { id: '7', name: 'Hedge Fund Farm', type: 'Hedging', balance: '7500 USDT', active: true },
  ]
  
  const agents: Agent[] = [
    { id: '1', name: 'Alpha', specialty: 'Trend Detection', success_rate: 87, available: true },
    { id: '2', name: 'Beta', specialty: 'Market Making', success_rate: 92, available: true },
    { id: '3', name: 'Gamma', specialty: 'Volatility Analysis', success_rate: 84, available: true },
    { id: '4', name: 'Delta', specialty: 'Pattern Recognition', success_rate: 89, available: true },
    { id: '5', name: 'Epsilon', specialty: 'Sentiment Analysis', success_rate: 78, available: false },
    { id: '6', name: 'Zeta', specialty: 'Risk Management', success_rate: 95, available: true },
  ]

  // Default values
  const defaultGoal: Goal = {
    name: '',
    type: goalTypes.length > 0 ? goalTypes[0].id : '',
    target: '',
    timeframe: '3 months',
    deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    risk: 'medium',
    farms: [],
    agents: 1,
    description: ''
  }

  // Initialize form state
  const [goal, setGoal] = useState<Goal>(existingGoal || defaultGoal)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Risk level descriptions for tooltip/helper text
  const riskDescriptions = {
    low: "Conservative approach with minimal potential for loss. Typically slower growth.",
    medium: "Balanced approach with moderate risk and moderate growth potential.",
    high: "Aggressive approach with potential for higher returns but also higher risk of loss."
  }

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setGoal(prev => ({ ...prev, [name]: value }))
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Handle farm selection
  const handleFarmToggle = (farmId: string) => {
    setGoal(prev => {
      const farms = [...prev.farms]
      if (farms.includes(farmId)) {
        return { ...prev, farms: farms.filter(id => id !== farmId) }
      } else {
        return { ...prev, farms: [...farms, farmId] }
      }
    })
  }

  // Handle agent selection
  const handleAgentSelection = () => {
    setGoal(prev => ({
      ...prev,
      agents: selectedAgents.length
    }))
  }

  // Toggle agent selection
  const toggleAgentSelection = (agentId: string) => {
    if (selectedAgents.includes(agentId)) {
      setSelectedAgents(prev => prev.filter(id => id !== agentId))
    } else {
      setSelectedAgents(prev => [...prev, agentId])
    }
  }

  // Effect to update agent count when selection changes
  useEffect(() => {
    handleAgentSelection()
  }, [selectedAgents])

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!goal.name.trim()) {
      newErrors.name = "Goal name is required"
    }
    
    if (!goal.target.trim()) {
      newErrors.target = "Target value is required"
    }
    
    if (!goal.timeframe.trim()) {
      newErrors.timeframe = "Timeframe is required"
    }
    
    if (!goal.deadline) {
      newErrors.deadline = "Deadline date is required"
    }
    
    if (goal.farms.length === 0) {
      newErrors.farms = "At least one farm must be selected"
    }
    
    if (selectedAgents.length === 0) {
      newErrors.agents = "At least one agent must be assigned"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      setIsSubmitting(true)
      
      // Simulate API call
      setTimeout(() => {
        // Call the onSave callback with the form data
        onSave({
          ...goal,
          id: existingGoal?.id || `goal-${Date.now()}`
        })
        
        setIsSubmitting(false)
        setSubmitSuccess(true)
        
        // Close the form after a brief success message
        setTimeout(() => {
          onClose()
        }, 1500)
      }, 800)
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card p-4 border-b border-border flex items-center justify-between z-10">
          <h2 className="text-xl font-bold">
            {existingGoal ? 'Edit Goal' : 'Create New Goal'}
          </h2>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitSuccess ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-12 w-12 bg-success/20 rounded-full flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-success" />
            </div>
            <h3 className="text-lg font-medium mb-2">Goal Successfully {existingGoal ? 'Updated' : 'Created'}</h3>
            <p className="text-muted-foreground">
              Your goal has been {existingGoal ? 'updated' : 'created'} and is now ready to be executed by the selected agents.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Goal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Goal Name</label>
                  <input
                    type="text"
                    name="name"
                    value={goal.name}
                    onChange={handleChange}
                    placeholder="e.g., Bitcoin Accumulation"
                    className={`w-full px-3 py-2 border ${errors.name ? 'border-danger' : 'border-border'} rounded-md bg-background`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Goal Type</label>
                  <select
                    name="type"
                    value={goal.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  >
                    {goalTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                <textarea
                  name="description"
                  value={goal.description}
                  onChange={handleChange}
                  placeholder="Describe your goal in more detail..."
                  className="w-full px-3 py-2 border border-border rounded-md bg-background h-20 resize-none"
                />
              </div>
            </div>
            
            {/* Target and Timeline */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Target & Timeline</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Value</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                      type="text"
                      name="target"
                      value={goal.target}
                      onChange={handleChange}
                      placeholder="e.g., 0.5 BTC or 25% ROI"
                      className={`w-full pl-10 pr-3 py-2 border ${errors.target ? 'border-danger' : 'border-border'} rounded-md bg-background`}
                    />
                  </div>
                  {errors.target && <p className="mt-1 text-xs text-danger">{errors.target}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Timeframe</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <select
                      name="timeframe"
                      value={goal.timeframe}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-3 py-2 border ${errors.timeframe ? 'border-danger' : 'border-border'} rounded-md bg-background`}
                    >
                      <option value="1 week">1 week</option>
                      <option value="2 weeks">2 weeks</option>
                      <option value="1 month">1 month</option>
                      <option value="3 months">3 months</option>
                      <option value="6 months">6 months</option>
                      <option value="12 months">12 months</option>
                    </select>
                  </div>
                  {errors.timeframe && <p className="mt-1 text-xs text-danger">{errors.timeframe}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Deadline Date</label>
                  <input
                    type="date"
                    name="deadline"
                    value={goal.deadline}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${errors.deadline ? 'border-danger' : 'border-border'} rounded-md bg-background`}
                  />
                  {errors.deadline && <p className="mt-1 text-xs text-danger">{errors.deadline}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Risk Level</label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="risk-low"
                        name="risk"
                        value="low"
                        checked={goal.risk === 'low'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <label htmlFor="risk-low" className="flex items-center">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-success/20 text-success">Low</span>
                        <span className="ml-2 text-xs text-muted-foreground">{riskDescriptions.low}</span>
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="risk-medium"
                        name="risk"
                        value="medium"
                        checked={goal.risk === 'medium'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <label htmlFor="risk-medium" className="flex items-center">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-warning/20 text-warning">Medium</span>
                        <span className="ml-2 text-xs text-muted-foreground">{riskDescriptions.medium}</span>
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="risk-high"
                        name="risk"
                        value="high"
                        checked={goal.risk === 'high'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <label htmlFor="risk-high" className="flex items-center">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-danger/20 text-danger">High</span>
                        <span className="ml-2 text-xs text-muted-foreground">{riskDescriptions.high}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Farm Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Farm Selection
              </h3>
              
              {errors.farms && <p className="text-xs text-danger mb-2">{errors.farms}</p>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {farms.map(farm => (
                  <div 
                    key={farm.id}
                    onClick={() => farm.active && handleFarmToggle(farm.id)}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${!farm.active ? 'opacity-50 cursor-not-allowed' : goal.farms.includes(farm.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{farm.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{farm.type}</span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">Balance: {farm.balance}</div>
                    {!farm.active && (
                      <div className="mt-1 text-xs text-danger flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Inactive
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Agent Assignment */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Agent Assignment
              </h3>
              
              {errors.agents && <p className="text-xs text-danger mb-2">{errors.agents}</p>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {agents.map(agent => (
                  <div 
                    key={agent.id}
                    onClick={() => agent.available && toggleAgentSelection(agent.id)}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${!agent.available ? 'opacity-50 cursor-not-allowed' : selectedAgents.includes(agent.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{agent.name}</span>
                      <span className="text-xs">{agent.success_rate}% Success</span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{agent.specialty}</div>
                    {!agent.available && (
                      <div className="mt-1 text-xs text-danger flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Unavailable
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-border flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : existingGoal ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
