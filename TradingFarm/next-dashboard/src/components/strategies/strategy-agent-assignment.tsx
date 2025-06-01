"use client"

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, Bot, MessageSquare, Brain, Zap } from 'lucide-react'
import { strategyService } from '@/services/strategy-service'
import { Strategy } from '@/types/strategy'
import { useSocket } from '@/providers/socket-provider'
import { TRADING_EVENTS } from '@/constants/socket-events'

interface StrategyAgentAssignmentProps {
  strategyId: string
  strategyName: string
  isOpen: boolean
  onClose: () => void
}

export function StrategyAgentAssignment({
  strategyId,
  strategyName,
  isOpen,
  onClose
}: StrategyAgentAssignmentProps) {
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [riskLevel, setRiskLevel] = useState('medium')
  const [allocationPercentage, setAllocationPercentage] = useState('10')
  const { toast } = useToast()
  const { socket } = useSocket()

  // Fetch available agents
  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true)
      try {
        // Fetch agents from API or mock data
        const response = await fetch('/api/agents')
        if (response.ok) {
          const data = await response.json()
          setAgents(data)
        } else {
          // Use mock data if API fails
          setAgents([
            { id: 'agent-1', name: 'Alpha Trader', status: 'active', type: 'execution' },
            { id: 'agent-2', name: 'Beta Scanner', status: 'active', type: 'analysis' },
            { id: 'agent-3', name: 'Gamma Risk Manager', status: 'paused', type: 'risk' },
            { id: 'agent-4', name: 'Delta Portfolio', status: 'active', type: 'portfolio' },
          ])
        }
      } catch (error) {
        console.error('Error fetching agents:', error)
        // Use mock data on error
        setAgents([
          { id: 'agent-1', name: 'Alpha Trader', status: 'active', type: 'execution' },
          { id: 'agent-2', name: 'Beta Scanner', status: 'active', type: 'analysis' },
          { id: 'agent-3', name: 'Gamma Risk Manager', status: 'paused', type: 'risk' },
          { id: 'agent-4', name: 'Delta Portfolio', status: 'active', type: 'portfolio' },
        ])
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchAgents()
    }
  }, [isOpen])

  // Check or uncheck an agent
  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId) 
        : [...prev, agentId]
    )
  }

  // Handle strategy assignment
  const handleAssignStrategy = async () => {
    if (selectedAgents.length === 0) {
      toast({
        title: "No agents selected",
        description: "Please select at least one agent to assign this strategy to.",
        variant: "destructive"
      })
      return
    }

    setAssigning(true)

    try {
      // Create assignments array for all selected agents
      const assignments = selectedAgents.map(agentId => {
        const agent = agents.find(a => a.id === agentId);
        return {
          agentId,
          riskLevel: riskLevel as 'low' | 'medium' | 'high',
          allocation: parseInt(allocationPercentage, 10)
        };
      });
      
      // Use our strategy service to handle assignments
      const result = await strategyService.assignStrategyToAgents(strategyId, assignments);
      
      if (result) {
        toast({
          title: "Strategy assigned",
          description: `Successfully assigned "${strategyName}" to ${selectedAgents.length} agent(s).`,
          variant: "default"
        });
        
        // Log assignments for debug
        console.log(`Assigned strategy ${strategyId} (${strategyName}) to ${selectedAgents.length} agents with settings:`, {
          riskLevel,
          allocation: parseInt(allocationPercentage, 10)
        });
        
        onClose();
      } else {
        throw new Error("Strategy assignment failed");
      }
    } catch (error) {
      console.error('Error assigning strategy:', error);
      toast({
        title: "Assignment failed",
        description: "There was an error assigning this strategy. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAssigning(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Strategy to Agents</DialogTitle>
          <DialogDescription>
            Select which agents should use the <span className="font-semibold">{strategyName}</span> strategy for trading decisions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="risk-level">Risk Level</Label>
            <Select value={riskLevel} onValueChange={setRiskLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Risk Level</SelectLabel>
                  <SelectItem value="low">Low - Conservative</SelectItem>
                  <SelectItem value="medium">Medium - Balanced</SelectItem>
                  <SelectItem value="high">High - Aggressive</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="allocation">Allocation Percentage</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="allocation"
                type="number"
                min="1"
                max="100"
                value={allocationPercentage}
                onChange={(e) => setAllocationPercentage(e.target.value)}
                className="w-24"
              />
              <span>%</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Percentage of agent's capital to allocate to this strategy
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Available Agents</Label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading agents...</span>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-2">
                {agents.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No agents available
                  </div>
                ) : (
                  agents.map(agent => (
                    <div 
                      key={agent.id}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent"
                    >
                      <Checkbox
                        id={`agent-${agent.id}`}
                        checked={selectedAgents.includes(agent.id)}
                        onCheckedChange={() => toggleAgent(agent.id)}
                      />
                      <label
                        htmlFor={`agent-${agent.id}`}
                        className="flex items-center space-x-2 text-sm font-medium leading-none cursor-pointer flex-1"
                      >
                        {agent.type === 'execution' && <Bot className="h-4 w-4 text-green-500" />}
                        {agent.type === 'analysis' && <Brain className="h-4 w-4 text-blue-500" />}
                        {agent.type === 'risk' && <Zap className="h-4 w-4 text-yellow-500" />}
                        {agent.type === 'portfolio' && <MessageSquare className="h-4 w-4 text-purple-500" />}
                        <span>{agent.name}</span>
                        <span className="ml-auto">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                            agent.status === 'active' ? 'bg-green-100 text-green-700' :
                            agent.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {agent.status}
                          </span>
                        </span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAssignStrategy} disabled={loading || assigning || selectedAgents.length === 0}>
            {assigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>Assign Strategy</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
