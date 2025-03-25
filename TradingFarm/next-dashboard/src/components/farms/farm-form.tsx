"use client"

import { useState, useEffect } from 'react'
import {
  Building,
  X,
  ChevronDown,
  Users,
  AlertTriangle,
  Info,
  DollarSign,
  Plus,
  Minus
} from 'lucide-react'

interface FarmType {
  id: string
  name: string
  description: string
}

interface Agent {
  id: string
  name: string
  type: string
  performance: number
  status: 'active' | 'paused' | 'inactive'
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
}

interface FarmFormProps {
  farmTypes: FarmType[]
  availableAgents: Agent[]
  existingFarm?: Farm | null
  onClose: () => void
  onSave: (farm: Partial<Farm> & { 
    name: string; 
    type: string; 
    status: 'active' | 'paused' | 'inactive';
    agents: string[] 
  }) => void
}

export default function FarmForm({ 
  farmTypes, 
  availableAgents, 
  existingFarm, 
  onClose, 
  onSave 
}: FarmFormProps) {
  // Initialize form state
  const [formData, setFormData] = useState<{
    name: string
    type: string
    description: string
    status: 'active' | 'paused' | 'inactive'
    initialBalance: string
    balanceSymbol: string
    agents: string[]
    riskLevel: 'low' | 'medium' | 'high'
  }>({
    name: existingFarm?.name || '',
    type: existingFarm?.type || '',
    description: existingFarm?.description || '',
    status: existingFarm?.status || 'active',
    initialBalance: existingFarm?.balance?.amount || '0',
    balanceSymbol: existingFarm?.balance?.symbol || 'USDT',
    agents: existingFarm?.agents || [],
    riskLevel: 'medium'
  })
  
  // Track form validation
  const [errors, setErrors] = useState<{
    name?: string
    type?: string
    initialBalance?: string
  }>({})
  
  // Available crypto symbols for balance
  const cryptoSymbols = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'SOL']
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when field is updated
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }
  }
  
  // Handle agent selection
  const handleAgentToggle = (agentId: string) => {
    setFormData(prev => {
      if (prev.agents.includes(agentId)) {
        return {
          ...prev,
          agents: prev.agents.filter(id => id !== agentId)
        }
      } else {
        return {
          ...prev,
          agents: [...prev.agents, agentId]
        }
      }
    })
  }
  
  // Validate form
  const validateForm = () => {
    const newErrors: {
      name?: string
      type?: string
      initialBalance?: string
    } = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Farm name is required'
    }
    
    if (!formData.type) {
      newErrors.type = 'Farm type is required'
    }
    
    const balance = parseFloat(formData.initialBalance)
    if (isNaN(balance) || balance < 0) {
      newErrors.initialBalance = 'Valid balance is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      // Prepare data for API
      const farmData = {
        ...(existingFarm?.id ? { id: existingFarm.id } : {}),
        name: formData.name,
        type: formData.type,
        description: formData.description,
        status: formData.status,
        balance: {
          amount: formData.initialBalance,
          symbol: formData.balanceSymbol
        },
        agents: formData.agents,
        // These would normally come from the server in a real app
        strategies: existingFarm?.strategies || 0,
        utilization: existingFarm?.utilization || 0,
        performance: existingFarm?.performance || {
          day: 0,
          week: 0,
          month: 0,
          total: 0
        },
        createdAt: existingFarm?.createdAt || new Date().toISOString().split('T')[0]
      }
      
      onSave(farmData as any)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {existingFarm ? 'Edit Farm' : 'Create New Trading Farm'}
          </h2>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Farm Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Farm Details</h3>
            
            {/* Farm Name */}
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="name">
                Farm Name*
              </label>
              <input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full py-2 px-3 border rounded-md bg-background ${errors.name ? 'border-danger' : 'border-border'}`}
                placeholder="e.g. DCA Accumulator Farm"
              />
              {errors.name && (
                <p className="text-danger text-xs mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>
            
            {/* Farm Type */}
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="type">
                Farm Type*
              </label>
              <div className="relative">
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className={`w-full py-2 px-3 border rounded-md appearance-none bg-background pr-8 ${errors.type ? 'border-danger' : 'border-border'}`}
                >
                  <option value="">Select a farm type</option>
                  {farmTypes.map(type => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-muted-foreground" />
              </div>
              {errors.type && (
                <p className="text-danger text-xs mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {errors.type}
                </p>
              )}
            </div>
            
            {/* Farm Description */}
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full py-2 px-3 border border-border rounded-md bg-background min-h-[80px]"
                placeholder="Describe the purpose and strategy of this farm..."
              />
            </div>
          </div>
          
          {/* Funding Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Funding & Resources</h3>
            
            {/* Initial Balance */}
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="initialBalance">
                Initial Balance
              </label>
              <div className="flex">
                <input
                  id="initialBalance"
                  name="initialBalance"
                  type="number"
                  step="any"
                  min="0"
                  value={formData.initialBalance}
                  onChange={handleChange}
                  className={`flex-1 py-2 px-3 border rounded-l-md bg-background ${errors.initialBalance ? 'border-danger' : 'border-border'}`}
                  placeholder="0.00"
                />
                <div className="relative">
                  <select
                    id="balanceSymbol"
                    name="balanceSymbol"
                    value={formData.balanceSymbol}
                    onChange={handleChange}
                    className="py-2 px-3 border border-l-0 rounded-r-md appearance-none bg-background pr-8 border-border"
                  >
                    {cryptoSymbols.map(symbol => (
                      <option key={symbol} value={symbol}>
                        {symbol}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-muted-foreground" />
                </div>
              </div>
              {errors.initialBalance && (
                <p className="text-danger text-xs mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {errors.initialBalance}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <Info className="h-3 w-3 mr-1" />
                Funds will be allocated from your connected wallet
              </p>
            </div>
            
            {/* Farm Status */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Initial Status
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={formData.status === 'active'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span>Active</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="status"
                    value="paused"
                    checked={formData.status === 'paused'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span>Paused</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={formData.status === 'inactive'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span>Inactive</span>
                </label>
              </div>
            </div>
            
            {/* Risk Level */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Risk Level
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 rounded-md ${formData.riskLevel === 'low' ? 'bg-success/20 border border-success text-success' : 'border border-border'}`}
                  onClick={() => setFormData(prev => ({ ...prev, riskLevel: 'low' }))}
                >
                  Low
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 rounded-md ${formData.riskLevel === 'medium' ? 'bg-warning/20 border border-warning text-warning' : 'border border-border'}`}
                  onClick={() => setFormData(prev => ({ ...prev, riskLevel: 'medium' }))}
                >
                  Medium
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 rounded-md ${formData.riskLevel === 'high' ? 'bg-danger/20 border border-danger text-danger' : 'border border-border'}`}
                  onClick={() => setFormData(prev => ({ ...prev, riskLevel: 'high' }))}
                >
                  High
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Risk level determines strategy selection and position sizing
              </p>
            </div>
          </div>
          
          {/* Agents Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Assign Agents</h3>
              <span className="text-xs">{formData.agents.length} selected</span>
            </div>
            
            {/* Agent Selection */}
            <div className="bg-muted/30 rounded-md border border-border divide-y divide-border max-h-60 overflow-y-auto">
              {availableAgents.length > 0 ? (
                availableAgents.map(agent => (
                  <div 
                    key={agent.id} 
                    className={`p-3 flex items-center justify-between cursor-pointer ${formData.agents.includes(agent.id) ? 'bg-primary/5' : ''}`}
                    onClick={() => handleAgentToggle(agent.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.agents.includes(agent.id)}
                        onChange={() => {}} // Handled by div click
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs text-muted-foreground">{agent.type}</div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      agent.status === 'active' ? 'bg-success/20 text-success' : 
                      agent.status === 'paused' ? 'bg-warning/20 text-warning' : 
                      'bg-danger/20 text-danger'
                    }`}>
                      {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p>No agents available</p>
                </div>
              )}
            </div>
            
            {formData.agents.length === 0 && (
              <p className="text-xs text-muted-foreground flex items-center">
                <Info className="h-3 w-3 mr-1" />
                You can assign agents later if you prefer
              </p>
            )}
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {existingFarm ? 'Update Farm' : 'Create Farm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
