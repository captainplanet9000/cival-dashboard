"use client";

// Agent Management Page
import { useState, useEffect, useCallback } from 'react'
import { useAIAgentV2 } from '@/hooks/useAIAgentV2'
import { Agent } from '@/types/agent'
import { sampleAgentData } from '@/data/sampleAgents'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Bot,
  Brain,
  Terminal,
  Settings,
  Play,
  Trash2,
  Plus,
  LineChart,
  BarChart2,
  PieChart,
  Activity,
  Cpu,
  RefreshCw,
  Zap,
  ArrowLeft
} from 'lucide-react'
import { CreateAgentForm } from '@/components/forms/create-agent-form'

const AgentsManagementPage = () => {
  const { 
    agents, 
    activeAgentId,
    setActiveAgentId,
    deleteAgent, 
    refreshAgents,
    isLoading,
    error
  } = useAIAgentV2();
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showAgentConsole, setShowAgentConsole] = useState(false);
  const [agentConsoleMinimized, setAgentConsoleMinimized] = useState(false);
  
  // Memoize handlers to prevent infinite re-renders
  const handleAgentSelect = useCallback((agent: Agent) => {
    setActiveAgentId(agent.id);
    setSelectedAgent(agent);
  }, [setActiveAgentId]);
  
  const handleDelete = useCallback(async () => {
    if (selectedAgent) {
      await deleteAgent(selectedAgent.id);
      setSelectedAgent(null);
      setDialogOpen(false);
    }
  }, [deleteAgent, selectedAgent]);
  
  const handleRefresh = useCallback(() => {
    refreshAgents();
  }, [refreshAgents]);
  
  // Open agent console - memoized to prevent re-renders
  const handleOpenConsole = useCallback(() => {
    if (selectedAgent) {
      setActiveAgentId(selectedAgent.id);
      setShowAgentConsole(true);
      setAgentConsoleMinimized(false);
    }
  }, [selectedAgent, setActiveAgentId]);
  
  // Initialize with data from the AI Agent service - only run once on mount
  useEffect(() => {
    refreshAgents();
  }, []);
  
  // Update selected agent when agents change - with proper dependency checks
  useEffect(() => {
    if (agents.length > 0 && (!selectedAgent || !agents.some((a: Agent) => a.id === selectedAgent?.id))) {
      setSelectedAgent(agents[0]);
    }
  }, [agents, selectedAgent]);

  // Use sample data as fallback when no agents are loaded
  const displayAgents = agents.length > 0 ? agents : sampleAgentData;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
        <Progress className="mt-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <div className="text-red-500">{error}</div>
        <Button onClick={refreshAgents} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Agents</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Agent List</h2>
              <p className="text-sm text-muted-foreground">Manage your AI trading agents</p>
            </div>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin-slow" />
              Refresh
            </Button>
          </div>

          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="p-4 text-left font-medium">Name</th>
                  <th className="p-4 text-left font-medium">Type</th>
                  <th className="p-4 text-left font-medium">Farm</th>
                  <th className="p-4 text-left font-medium">Model</th>
                  <th className="p-4 text-left font-medium">Status</th>
                  <th className="p-4 text-left font-medium">Performance</th>
                  <th className="p-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayAgents.map((agent: Agent) => (
                  <tr key={agent.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium">{agent.name}</td>
                    <td className="p-4 align-middle">{agent.type}</td>
                    <td className="p-4 align-middle">{agent.farm?.name || "ETH Accumulator"}</td>
                    <td className="p-4 align-middle">{agent.model || "GPT-4o"}</td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center">
                        <div className={`h-2 w-2 rounded-full mr-2 ${
                          agent.status === 'active' 
                            ? 'bg-green-500' 
                            : agent.status === 'paused' 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                        }`} />
                        <span className="capitalize">{agent.status}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <span className={`${agent.performance?.day ?? 0 > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {agent.performance?.day ?? 0 > 0 ? '+' : ''}{(agent.performance?.day ?? 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedAgent(agent);
                            // Navigate to agent details page
                          }}
                          title="Settings"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedAgent(agent);
                            // Navigate to agent performance page
                          }}
                          title="Performance"
                        >
                          <LineChart className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedAgent(agent);
                            // Start or resume agent
                          }}
                          title="Start/Resume"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedAgent(agent);
                            setDialogOpen(true);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this agent? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Agent Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              Create a new AI trading agent with your preferred configuration.
            </DialogDescription>
          </DialogHeader>
          <CreateAgentForm
            onSubmit={(data) => {
              // Handle agent creation
              setCreateDialogOpen(false);
            }}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentsManagementPage;
