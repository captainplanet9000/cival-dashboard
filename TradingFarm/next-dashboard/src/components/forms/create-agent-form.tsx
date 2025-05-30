"use client";

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Agent } from '@/types/agent'

// Agent types for selection
const AGENT_TYPES = [
  { value: "Algorithmic", label: "Algorithmic Trader" },
  { value: "Dollar Cost Avg", label: "Dollar Cost Average" },
  { value: "MEV", label: "MEV Strategy" },
  { value: "Arbitrage", label: "Arbitrage" },
  { value: "Fundamental", label: "Fundamental Analysis" },
  { value: "Grid", label: "Grid Trading" },
  { value: "Custom", label: "Custom Strategy" },
]

// AI Models
const AI_MODELS = [
  { value: "GPT-4o", label: "GPT-4o" },
  { value: "Claude-3-Opus", label: "Claude 3 Opus" },
  { value: "Claude-3-Sonnet", label: "Claude 3 Sonnet" },
  { value: "Claude-3-Haiku", label: "Claude 3 Haiku" },
  { value: "Llama-3-70b", label: "Llama 3 70B" },
  { value: "Gemini-Pro", label: "Gemini Pro" },
]

// Sample farms for selection
const FARMS = [
  { id: "farm-1", name: "Crypto Alpha" },
  { id: "farm-2", name: "Long Term" },
  { id: "farm-3", name: "MEV Special" },
  { id: "farm-4", name: "DeFi Yields" },
]

interface CreateAgentFormProps {
  onSubmit: (data: Omit<Agent, 'id' | 'status'>) => void;
  onCancel: () => void;
}

export function CreateAgentForm({ onSubmit, onCancel }: CreateAgentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'Algorithmic',
    model: 'GPT-4o',
    farmId: '',
    description: ''
  })
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Find farm name based on id
      const selectedFarm = FARMS.find(farm => farm.id === formData.farmId)
      
      // Prepare agent data
      const newAgent: Omit<Agent, 'id' | 'status'> = {
        name: formData.name,
        type: formData.type,
        model: formData.model,
        description: formData.description,
        farm: selectedFarm ? { 
          id: selectedFarm.id, 
          name: selectedFarm.name 
        } : undefined,
        // Default values for new agent
        performance: {
          day: 0,
          week: 0,
          month: 0,
          winRate: 0,
          avgProfit: 0
        },
        capabilities: [],
        tools: [],
        trades: [],
        AIModelConfig: {
          primary: formData.model,
          fallback: "Claude-3-Haiku",
          maxBudget: 25,
          usedBudget: 0,
          avgTokensPerRequest: 0,
          promptTemplate: "Standard Trading"
        },
        settings: {
          general: {
            timeZone: "UTC",
            notifications: true,
            reportFrequency: "daily",
          },
          trading: {
            maxTradeSize: 1000,
            stopLoss: 2.5,
            takeProfit: 5.0,
            leverageAllowed: false,
          },
          automation: {
            active: true,
            tradingHours: "all",
            maxDailyTrades: 10,
          }
        }
      }
      
      // Submit to parent
      onSubmit(newAgent)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Agent Name</Label>
          <Input 
            id="name"
            name="name"
            placeholder="Enter agent name" 
            value={formData.name}
            onChange={handleChange}
            required
          />
          <p className="text-sm text-gray-500">
            Choose a unique name for your AI trading agent
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Agent Type</Label>
          <Select 
            value={formData.type}
            onValueChange={(value) => handleSelectChange('type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select agent type" />
            </SelectTrigger>
            <SelectContent>
              {AGENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            The type of trading strategy this agent will use
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">AI Model</Label>
          <Select 
            value={formData.model}
            onValueChange={(value) => handleSelectChange('model', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select AI model" />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            The AI model that will power this agent
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="farmId">Trading Farm</Label>
          <Select 
            value={formData.farmId}
            onValueChange={(value) => handleSelectChange('farmId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a farm" />
            </SelectTrigger>
            <SelectContent>
              {FARMS.map((farm) => (
                <SelectItem key={farm.id} value={farm.id}>
                  {farm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            The trading farm this agent will be assigned to
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Input 
            id="description"
            name="description"
            placeholder="Brief description of this agent" 
            value={formData.description}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Agent"}
        </Button>
      </div>
    </form>
  )
}
