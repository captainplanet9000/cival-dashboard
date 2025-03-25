"use client"

import { useState } from "react"
import { useAccount, usePublicClient } from "wagmi"
import { formatEther } from "viem"
import { Agent } from "@/components/agents/agent-details"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Bot, 
  ArrowUp, 
  ArrowDown, 
  Wallet, 
  Plus, 
  ArrowUpDown, 
  BarChart,
  RefreshCw,
  ArrowLeftRight,
  Loader2
} from "lucide-react"
import { AgentFundingModal } from "./agent-funding-modal"

interface AgentWalletDashboardProps {
  agents: Agent[]
  onAgentFunded?: (agent: Agent, amount: string, txHash: string) => void
}

export function AgentWalletDashboard({ 
  agents,
  onAgentFunded
}: AgentWalletDashboardProps) {
  const { isConnected } = useAccount()
  const publicClient = usePublicClient()
  
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [fundingModalOpen, setFundingModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("active")
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Get agents by status
  const activeAgents = agents.filter(agent => agent.status === 'active')
  const pausedAgents = agents.filter(agent => agent.status === 'paused')
  const offlineAgents = agents.filter(agent => agent.status === 'offline')
  
  // Filter agents based on active tab
  const filteredAgents = 
    activeTab === "active" ? activeAgents :
    activeTab === "paused" ? pausedAgents :
    activeTab === "offline" ? offlineAgents : 
    agents
  
  // Open funding modal for a specific agent
  const handleFundAgent = (agent: Agent) => {
    setSelectedAgent(agent)
    setFundingModalOpen(true)
  }
  
  // Refresh agent wallet balances
  const refreshAgentBalances = async () => {
    if (!isConnected) return
    
    setIsRefreshing(true)
    
    try {
      // In a real implementation, this would check on-chain balances
      // For demo purposes, we're just simulating a refresh
      await new Promise(resolve => setTimeout(resolve, 1500))
    } catch (error) {
      console.error("Error refreshing agent balances:", error)
    } finally {
      setIsRefreshing(false)
    }
  }
  
  // Handle successful funding
  const handleFundingSuccess = (amount: string, txHash: string) => {
    if (selectedAgent && onAgentFunded) {
      onAgentFunded(selectedAgent, amount, txHash)
    }
  }
  
  // Calculate total balance across all agents
  const totalAllocated = agents.reduce((sum, agent) => sum + agent.balance, 0)
  
  // Calculate total performance stats
  const profitableAgents = agents.filter(agent => agent.performance > 0).length
  const losingAgents = agents.filter(agent => agent.performance < 0).length
  
  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Agent Wallets
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={refreshAgentBalances}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="all">All ({agents.length})</TabsTrigger>
                <TabsTrigger value="active">Active ({activeAgents.length})</TabsTrigger>
                <TabsTrigger value="paused">Paused ({pausedAgents.length})</TabsTrigger>
                <TabsTrigger value="offline">Offline ({offlineAgents.length})</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value={activeTab} className="pt-0 px-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="border-none shadow-none bg-muted/30">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      Total Allocated
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">{totalAllocated.toFixed(4)} ETH</div>
                  </CardContent>
                </Card>
                
                <Card className="border-none shadow-none bg-muted/30">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      Profitable Agents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-1">
                      <ArrowUp className="h-4 w-4 text-green-500" />
                      <span className="text-2xl font-bold">{profitableAgents}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-none shadow-none bg-muted/30">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      Losing Agents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-1">
                      <ArrowDown className="h-4 w-4 text-red-500" />
                      <span className="text-2xl font-bold">{losingAgents}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Agent List */}
              <div className="space-y-4 mb-6">
                {filteredAgents.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">No agents in this category</p>
                  </div>
                ) : (
                  filteredAgents.map(agent => (
                    <Card key={agent.id} className="overflow-hidden">
                      <div className={`h-1 w-full ${
                        agent.status === 'active' ? 'bg-green-500' : 
                        agent.status === 'paused' ? 'bg-orange-500' : 'bg-slate-500'
                      }`} />
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              agent.type === 'trend' ? 'bg-blue-500/10 text-blue-500' : 
                              agent.type === 'reversal' ? 'bg-purple-500/10 text-purple-500' : 
                              agent.type === 'arbitrage' ? 'bg-green-500/10 text-green-500' : 
                              'bg-orange-500/10 text-orange-500'
                            }`}>
                              <Bot className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-medium">{agent.name}</h3>
                              <p className="text-xs text-muted-foreground capitalize">{agent.type} Agent</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${
                              agent.performance > 0 ? 'text-green-500' : 
                              agent.performance < 0 ? 'text-red-500' : 'text-muted-foreground'
                            }`}>
                              {agent.performance > 0 ? '+' : ''}{agent.performance.toFixed(2)}%
                            </p>
                            
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleFundAgent(agent)}
                              disabled={!isConnected}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Wallet Balance</p>
                            <div className="flex items-center gap-1 font-medium">
                              <Wallet className="h-3 w-3 text-primary" />
                              <span>{agent.balance.toFixed(4)} ETH</span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Position Value</p>
                            <div className="flex items-center gap-1 font-medium">
                              <ArrowLeftRight className="h-3 w-3 text-primary" />
                              <span>{(agent.balance * 0.75).toFixed(4)} ETH</span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Available</p>
                            <div className="flex items-center gap-1 font-medium">
                              <ArrowUpDown className="h-3 w-3 text-primary" />
                              <span>{(agent.balance * 0.25).toFixed(4)} ETH</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground">Capital Utilization</p>
                            <p className="text-xs font-medium">75%</p>
                          </div>
                          <Progress value={75} className="h-1" />
                        </div>
                        
                        <div className="flex justify-between mt-4">
                          <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                            <BarChart className="h-3 w-3" />
                            View Analytics
                          </Button>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="text-xs h-7">
                              Withdraw
                            </Button>
                            <Button size="sm" className="text-xs h-7">
                              Fund Agent
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {selectedAgent && (
        <AgentFundingModal
          agent={selectedAgent}
          open={fundingModalOpen}
          onOpenChange={setFundingModalOpen}
          onSuccess={handleFundingSuccess}
        />
      )}
    </>
  )
}
