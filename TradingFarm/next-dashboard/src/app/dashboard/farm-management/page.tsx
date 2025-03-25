"use client"

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { FarmCommandCenter } from '@/components/farm-management/farm-command-center'
import { FarmTable } from '@/components/farm-management/farm-table'
import { FarmCommandShortcuts } from '@/components/farm-management/farm-command-shortcuts'
import { useSocket } from "@/providers/socket-provider"
import { FarmManagementProvider } from '@/components/farm-management/farm-management-provider'
import { FarmManagementHeader } from '@/components/farm-management/farm-management-header'
import { useFarmManagement } from '@/components/farm-management/farm-management-provider'
import { CommandCenter } from '@/components/real-time/command-center'
import { 
  Command, 
  Play, 
  Pause, 
  Plus, 
  Database, 
  Brain, 
  MessageSquare, 
  Activity, 
  ChevronRight,
  FileText,
  Server,
  Cpu,
  BarChart3
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FarmStatus } from '@/types/farm-management'

// Farm Status Card Component
const FarmStatusCard = () => {
  const { farmData, stats = { 
    farms: { 
      activeFarms: 0, 
      totalFarms: 0,
      pausedFarms: 0,
      errorFarms: 0
    },
    messageBus: {
      load: 0,
      successRate: 0,
      messagesProcessed24h: 0
    },
    strategyDocuments: {
      totalCount: 0,
      byType: {}
    },
    infrastructure: {
      cpuUtilization: 0,
      memoryUtilization: 0,
      networkUtilization: 0
    }
  }} = useFarmManagement();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Farm Status Card */}
      <div className="border rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Active Farms</h3>
            <div className="mt-2 flex items-center">
              <span className="text-2xl font-bold">{stats?.farms?.activeFarms || 0}</span>
              <span className="text-sm text-muted-foreground ml-2">/ {stats?.farms?.totalFarms || 0}</span>
            </div>
          </div>
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <Database className="h-5 w-5 text-green-500 dark:text-green-400" />
          </div>
        </div>
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-green-500 h-2.5 rounded-full" 
              style={{ 
                width: `${stats?.farms?.totalFarms > 0 ? (stats?.farms?.activeFarms / stats?.farms?.totalFarms) * 100 : 0}%` 
              }}
            ></div>
          </div>
        </div>
        <div className="mt-2 flex justify-between items-center text-xs text-muted-foreground">
          <div>{stats?.farms?.pausedFarms || 0} Paused</div>
          <div>{stats?.farms?.errorFarms || 0} Error</div>
        </div>
      </div>
      
      {/* Paused Farms Card */}
      <div className="border rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Paused Farms</h3>
            <div className="mt-2 flex items-center">
              <span className="text-2xl font-bold">{stats?.farms?.pausedFarms || 0}</span>
              <span className="text-sm text-muted-foreground ml-2">/ {stats?.farms?.totalFarms || 0}</span>
            </div>
          </div>
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <Pause className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
          </div>
        </div>
      </div>
      
      {/* Message Bus Card */}
      <div className="border rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Message Bus</h3>
            <div className="mt-2 flex items-center">
              <span className="text-2xl font-bold">{stats?.messageBus?.load || 0}%</span>
              <span className="text-sm text-muted-foreground ml-2">Throughput</span>
            </div>
          </div>
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <MessageSquare className="h-5 w-5 text-purple-500 dark:text-purple-400" />
          </div>
        </div>
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${
                stats?.messageBus?.load > 80 ? 'bg-red-500' : 
                stats?.messageBus?.load > 60 ? 'bg-yellow-500' : 
                'bg-purple-500'
              }`} 
              style={{ width: `${stats?.messageBus?.load}%` }}
            ></div>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <div>Last sync: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>
      
      {/* Strategy Documents Card */}
      <div className="border rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Knowledge Base</h3>
            <div className="mt-2 flex items-center">
              <span className="text-2xl font-bold">{stats?.strategyDocuments?.totalCount || 0}</span>
              <span className="text-sm text-muted-foreground ml-2">Documents</span>
            </div>
          </div>
          <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
            <FileText className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="h-1.5 bg-green-200 dark:bg-green-900 rounded-full">
            <div className="bg-green-500 h-1.5 rounded-full w-[65%]"></div>
          </div>
          <div className="h-1.5 bg-blue-200 dark:bg-blue-900 rounded-full">
            <div className="bg-blue-500 h-1.5 rounded-full w-[42%]"></div>
          </div>
          <div className="h-1.5 bg-purple-200 dark:bg-purple-900 rounded-full">
            <div className="bg-purple-500 h-1.5 rounded-full w-[78%]"></div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div className="text-muted-foreground">Strategy</div>
          <div className="text-muted-foreground">Market</div>
          <div className="text-muted-foreground">Trading</div>
        </div>
      </div>
    </div>
  )
}

// Create Farm Component
const CreateFarmForm = ({ onCancel }: { onCancel: () => void }) => {
  const { toast } = useToast()
  const { refreshFarms } = useFarmManagement()
  const [name, setName] = useState('')
  const [bossmanModel, setBossmanModel] = useState('ElizaOS-Advanced')
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/farm-management/farms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          status: 'active',
          bossman: {
            model: bossmanModel,
            status: 'idle'
          }
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create farm')
      }
      
      await refreshFarms()
      
      toast({
        title: "Farm created",
        description: "The farm has been created successfully",
      })
      
      onCancel()
    } catch (error) {
      console.error('Error creating farm:', error)
      toast({
        title: "Error",
        description: "Failed to create farm. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Farm Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Enter farm name"
          required
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="bossmanModel" className="text-sm font-medium">
          BossMan Model
        </label>
        <select
          id="bossmanModel"
          value={bossmanModel}
          onChange={(e) => setBossmanModel(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="ElizaOS-Basic">ElizaOS Basic</option>
          <option value="ElizaOS-Advanced">ElizaOS Advanced</option>
          <option value="ElizaOS-Expert">ElizaOS Expert</option>
        </select>
      </div>
      
      <div className="flex justify-end space-x-2 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Farm'}
        </Button>
      </div>
    </form>
  )
}

// Message Bus Activity Component
const MessageBusActivity = () => {
  const [timeframe, setTimeframe] = useState('today')
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Message Bus Activity</CardTitle>
          <div className="flex items-center">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="text-xs rounded border border-border bg-background px-2 py-1"
            >
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
            </select>
          </div>
        </div>
        <CardDescription>Inter-farm communication metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span>Farm-to-Farm</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span>BossMan Broadcasts</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-amber-500"></div>
              <span>Agent Communications</span>
            </div>
          </div>
          
          <div className="h-64 w-full flex items-center justify-center bg-muted/10 rounded-lg border border-dashed text-sm text-muted-foreground">
            <div className="text-center">
              <Database className="mx-auto h-8 w-8 opacity-30 mb-2" />
              <p>Interactive message visualization requires WebSocket connection</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold">1,284</div>
              <div className="text-xs text-muted-foreground">Messages Sent</div>
            </div>
            <div>
              <div className="text-lg font-bold">42</div>
              <div className="text-xs text-muted-foreground">Broadcasts</div>
            </div>
            <div>
              <div className="text-lg font-bold">98.2%</div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Strategy Knowledge Base Component
const StrategyKnowledgeBase = () => {
  const documents = [
    { id: 1, type: 'Strategy', title: 'RSI Breakout Pattern', updatedAt: '2025-03-18T14:22:00Z' },
    { id: 2, type: 'Market', title: 'BTC-ETH Correlation Analysis', updatedAt: '2025-03-19T09:15:00Z' },
    { id: 3, type: 'Trading', title: 'Optimal Position Sizing', updatedAt: '2025-03-20T11:30:00Z' },
    { id: 4, type: 'Strategy', title: 'Multi-timeframe MACD', updatedAt: '2025-03-20T16:45:00Z' },
    { id: 5, type: 'Market', title: 'Liquidity Pool Dynamics', updatedAt: '2025-03-21T08:10:00Z' },
  ]
  
  const typeDistribution = {
    Strategy: 42,
    Market: 36,
    Trading: 28,
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Strategy Knowledge Base</CardTitle>
          <Button variant="outline" size="sm" className="h-8">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Document
          </Button>
        </div>
        <CardDescription>Strategy documents and knowledge base</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            {Object.entries(typeDistribution).map(([type, count]) => (
              <div key={type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{type}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div 
                    className={`h-2 rounded-full ${
                      type === 'Strategy' ? 'bg-green-500' : 
                      type === 'Market' ? 'bg-blue-500' : 
                      'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min(count, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="rounded-md border">
            <div className="bg-muted/50 px-4 py-2 text-sm font-medium">
              Recent Documents
            </div>
            <div className="divide-y">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-4 py-2">
                  <div>
                    <div className="font-medium">{doc.title}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Badge variant="outline" className="mr-2 px-1 text-xs">
                        {doc.type}
                      </Badge>
                      <span>
                        Updated {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Database className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">Vector DB Performance</div>
            <div>
              <span className="font-medium">12ms</span>
              <span className="text-xs text-muted-foreground ml-1">avg. query time</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="outline" size="sm" className="w-full">
          View All Documents
        </Button>
      </CardFooter>
    </Card>
  )
}

// Integrated Farm Management Page
export default function FarmManagementPage() {
  const [activeTab, setActiveTab] = useState<string>("visual");
  const { isConnected, isSimulating, toggleSimulation } = useSocket();

  return (
    <div className="flex flex-col h-full">
      <FarmManagementProvider>
        <FarmManagementHeader 
          connected={isConnected} 
          simulationMode={isSimulating}
          onToggleSimulation={toggleSimulation}
        />

        <Tabs defaultValue="visual" className="flex-1 overflow-hidden flex flex-col" onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-4">
            <TabsTrigger value="visual" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Visual Management</span>
            </TabsTrigger>
            <TabsTrigger value="command" className="flex items-center gap-2">
              <Command className="h-4 w-4" />
              <span>Command Center</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="visual" className="flex-1 overflow-auto">
            <div className="space-y-6" data-component-name="FarmManagementPage">
              {/* Farm Status Card */}
              <FarmStatusCard />
              
              {/* Filter and Create section */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="relative w-full sm:w-64">
                  <MessageSquare className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter farms..."
                    className="pl-9 pr-4 py-2 w-full rounded-md border border-border bg-background"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Farm
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create a new Farm</DialogTitle>
                      </DialogHeader>
                      <CreateFarmForm onCancel={() => {}} />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Farm Table */}
              <FarmTable />
              
              {/* Analytics Dashboard Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Farm Performance */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">Farm Performance</CardTitle>
                    <Button variant="ghost" size="sm" className="h-8">
                      <Activity className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-muted/30 rounded-md flex items-center justify-center mb-4">
                      <div className="text-center">
                        <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Performance metrics visualization</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Best Performer:</span>
                        <span className="font-medium">BTC Foundation (+9.9%)</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Most Efficient:</span>
                        <span className="font-medium">SONIC Harvester (+9.1%)</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Needs Attention:</span>
                        <span className="font-medium">SUI Accelerator (+2.1%)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Goal Progress */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">Goal Progress</CardTitle>
                    <Button variant="ghost" size="sm" className="h-8">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>SONIC Accumulation</span>
                          <span className="font-medium">78.2%</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div className="bg-green-500 h-full rounded-full" style={{ width: '78.2%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>BTC Foundation</span>
                          <span className="font-medium">56.8%</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div className="bg-green-500 h-full rounded-full" style={{ width: '56.8%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>SOL Accelerator</span>
                          <span className="font-medium">42.4%</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div className="bg-green-500 h-full rounded-full" style={{ width: '42.4%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>ETH Accumulator</span>
                          <span className="font-medium">34.7%</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div className="bg-yellow-500 h-full rounded-full" style={{ width: '34.7%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>SUI Accelerator</span>
                          <span className="font-medium">23.1%</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div className="bg-red-500 h-full rounded-full" style={{ width: '23.1%' }}></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Additional Farm Management Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">Agent Deployment</CardTitle>
                    <Badge variant="outline" className="text-xs">15 Active</Badge>
                  </CardHeader>
                  <CardContent>
                    <h4 className="text-sm font-medium mb-3">Top Performing Agents:</h4>
                    <ul className="space-y-2 mb-4">
                      <li className="text-sm flex justify-between">
                        <span>Volatility Hunter (BTC):</span>
                        <span className="text-green-500">+16.2%</span>
                      </li>
                      <li className="text-sm flex justify-between">
                        <span>SONIC Hunter (SONIC):</span>
                        <span className="text-green-500">+12.8%</span>
                      </li>
                      <li className="text-sm flex justify-between">
                        <span>Market Maker Pro (BTC):</span>
                        <span className="text-green-500">+9.7%</span>
                      </li>
                    </ul>

                    <h4 className="text-sm font-medium mb-3">Agent Distribution:</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="text-sm flex justify-between">
                        <span>Trading Assistant:</span>
                        <span>5</span>
                      </div>
                      <div className="text-sm flex justify-between">
                        <span>DCA Bot:</span>
                        <span>3</span>
                      </div>
                      <div className="text-sm flex justify-between">
                        <span>Grid Trader:</span>
                        <span>3</span>
                      </div>
                      <div className="text-sm flex justify-between">
                        <span>Market Maker:</span>
                        <span>2</span>
                      </div>
                      <div className="text-sm flex justify-between">
                        <span>Arbitrage Bot:</span>
                        <span>2</span>
                      </div>
                    </div>
                    
                    <Button className="w-full mt-4" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Agent
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">Brain Integration</CardTitle>
                    <Button variant="ghost" size="sm" className="h-8">
                      <Brain className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <h4 className="text-sm font-medium mb-3">Active Strategies:</h4>
                    <ul className="space-y-2 mb-4">
                      <li className="text-sm flex justify-between">
                        <span>MA Strategy:</span>
                        <span>5 farms</span>
                      </li>
                      <li className="text-sm flex justify-between">
                        <span>Grid Trading:</span>
                        <span>3 farms</span>
                      </li>
                      <li className="text-sm flex justify-between">
                        <span>DCA Strategy:</span>
                        <span>4 farms</span>
                      </li>
                    </ul>

                    <h4 className="text-sm font-medium mb-3">Brain Recommendations:</h4>
                    <ul className="space-y-2">
                      <li className="text-sm">
                        <div className="font-medium flex items-center">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                          SUI Accelerator: Add Grid Trading
                        </div>
                      </li>
                      <li className="text-sm">
                        <div className="font-medium flex items-center">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                          ETH Accumulator: Increase DCA allocation
                        </div>
                      </li>
                      <li className="text-sm">
                        <div className="font-medium flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          BTC Foundation: Strategy optimized
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MessageBusActivity />
                <StrategyKnowledgeBase />
              </div>

              {/* MCP Servers and LLM Models Integration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <h2 className="text-xl font-semibold col-span-full mb-2">Model Context Protocol Integration</h2>
                {/* MCP Servers */}
                <Card className="border-2 border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-primary/5">
                    <div className="flex items-center">
                      <Server className="h-5 w-5 mr-2 text-primary" />
                      <CardTitle className="text-lg font-semibold">Tools & MCP Servers</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs bg-primary/10">8 Active</Badge>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Server Status:</span>
                        <span className="text-sm text-green-500 font-medium">Healthy</span>
                      </div>
                      
                      <h4 className="text-sm font-medium mb-2">Active MCP Servers:</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border rounded-md p-2 bg-green-500/5">
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                            <span className="text-sm">TradingView Signals</span>
                          </div>
                          <span className="text-xs text-muted-foreground">5 Farms</span>
                        </div>
                        <div className="flex items-center justify-between border rounded-md p-2 bg-green-500/5">
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                            <span className="text-sm">Bybit Exchange</span>
                          </div>
                          <span className="text-xs text-muted-foreground">3 Farms</span>
                        </div>
                        <div className="flex items-center justify-between border rounded-md p-2 bg-yellow-500/5">
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2"></div>
                            <span className="text-sm">Binance Exchange</span>
                          </div>
                          <span className="text-xs text-muted-foreground">4 Farms</span>
                        </div>
                        <div className="flex items-center justify-between border rounded-md p-2 bg-green-500/5">
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                            <span className="text-sm">MEV Protection</span>
                          </div>
                          <span className="text-xs text-muted-foreground">2 Farms</span>
                        </div>
                      </div>
                      
                      <h4 className="text-sm font-medium mt-4 mb-2">Available Updates:</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>TradingView Signals v2.3</span>
                          <Button variant="outline" size="sm" className="h-7 text-xs">Update</Button>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>MEV Protection v1.5</span>
                          <Button variant="outline" size="sm" className="h-7 text-xs">Update</Button>
                        </div>
                      </div>
                      
                      <Button className="w-full mt-4" variant="secondary">
                        <Plus className="h-4 w-4 mr-2" />
                        Add MCP Server
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* LLM Models */}
                <Card className="border-2 border-blue-500/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-blue-500/5">
                    <div className="flex items-center">
                      <Brain className="h-5 w-5 mr-2 text-blue-500" />
                      <CardTitle className="text-lg font-semibold">AI Models (OpenRouter)</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8">
                      <Cpu className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Monthly Usage:</span>
                        <span className="font-medium">$237.50 / $500.00</span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: '47.5%' }}></div>
                      </div>
                      
                      <h4 className="text-sm font-medium mt-4 mb-2">Model Allocation:</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Claude-3 Opus</span>
                          <div className="flex items-center">
                            <span className="text-xs text-muted-foreground mr-2">Primary</span>
                            <Badge variant="secondary" className="text-xs">2 Agents</Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Claude-3 Sonnet</span>
                          <div className="flex items-center">
                            <span className="text-xs text-muted-foreground mr-2">Fallback</span>
                            <Badge variant="secondary" className="text-xs">3 Agents</Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">GPT-4o</span>
                          <div className="flex items-center">
                            <span className="text-xs text-muted-foreground mr-2">Primary</span>
                            <Badge variant="secondary" className="text-xs">5 Agents</Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Mistral Large</span>
                          <div className="flex items-center">
                            <span className="text-xs text-muted-foreground mr-2">Fallback</span>
                            <Badge variant="secondary" className="text-xs">4 Agents</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <h4 className="text-sm font-medium mt-4 mb-2">Performance Metrics:</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Fastest Response:</span>
                          <span className="font-medium">GPT-4o (0.8s avg)</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Most Accurate:</span>
                          <span className="font-medium">Claude-3 Opus (97.8%)</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Most Cost-Efficient:</span>
                          <span className="font-medium">Mistral Large</span>
                        </div>
                      </div>
                      
                      <Button className="w-full mt-4" variant="secondary">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Optimize Model Allocation
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Python Trading Libraries Integration */}
              <div className="mt-10">
                <h2 className="text-xl font-semibold mb-4">Python Trading Libraries Integration</h2>
                
                {/* Architecture Diagram */}
                <Card className="mb-6 border-2 border-green-500/20">
                  <CardHeader className="bg-green-500/5">
                    <CardTitle className="text-lg font-semibold">Integration Architecture</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="w-full flex flex-col items-center p-4 bg-muted/20 rounded-md">
                      {/* Row 1: Dashboard */}
                      <div className="border-2 rounded-md w-[350px] py-3 px-4 text-center font-medium bg-card">
                        Next.js Dashboard (Frontend)
                      </div>
                      
                      {/* Connection Line */}
                      <div className="h-10 border-l-2 relative">
                        <div className="absolute -left-16 top-3 text-xs text-muted-foreground">
                          API / WebSockets
                        </div>
                        <div className="absolute w-8 border-t-2 -left-4 top-5"></div>
                        <div className="absolute w-8 border-t-2 -right-4 top-5"></div>
                      </div>
                      
                      {/* Row 2: MCP Server */}
                      <div className="border-2 rounded-md w-[350px] py-3 px-4 text-center font-medium bg-card">
                        Python Libraries MCP Server
                      </div>
                      
                      {/* Connection Line */}
                      <div className="h-10 border-l-2"></div>
                      
                      {/* Row 3: Trading Libraries Box */}
                      <div className="border-2 rounded-md w-[350px] py-3 px-4 bg-card">
                        <div className="font-medium text-center mb-2">Trading Libraries</div>
                        <div className="grid grid-cols-2 gap-2">
                          <Badge className="justify-center bg-blue-500/10 hover:bg-blue-500/20 text-blue-500">OpenBB</Badge>
                          <Badge className="justify-center bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500">Pandas</Badge>
                          <Badge className="justify-center bg-green-500/10 hover:bg-green-500/20 text-green-500">NumPy</Badge>
                          <Badge className="justify-center bg-purple-500/10 hover:bg-purple-500/20 text-purple-500">Zipline</Badge>
                          <Badge className="justify-center bg-orange-500/10 hover:bg-orange-500/20 text-orange-500">AlphaLens</Badge>
                          <Badge className="justify-center bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500">VectorBT</Badge>
                          <Badge className="justify-center bg-pink-500/10 hover:bg-pink-500/20 text-pink-500">Riskfolio</Badge>
                          <Badge className="justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500">IBAPI</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Library Modules */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {/* Module 1: OpenBB */}
                  <Card className="border border-blue-500/20">
                    <CardHeader className="bg-blue-500/5 pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md">OpenBB Module</CardTitle>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500">Market Data</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <p className="text-sm text-muted-foreground mb-3">Market data retrieval and financial research</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span>Status:</span>
                          <Badge variant="outline" className="bg-green-500/10 text-green-500">Active</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Farm Usage:</span>
                          <span>6 Farms</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Data Sources:</span>
                          <span>7 Connected</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-3 text-xs">
                        Configure Data Sources
                      </Button>
                    </CardContent>
                  </Card>
                  
                  {/* Module 2: Technical Analysis */}
                  <Card className="border border-yellow-500/20">
                    <CardHeader className="bg-yellow-500/5 pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md">Technical Analysis</CardTitle>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Pandas/NumPy</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <p className="text-sm text-muted-foreground mb-3">Indicators and signals generation</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span>Status:</span>
                          <Badge variant="outline" className="bg-green-500/10 text-green-500">Active</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Custom Indicators:</span>
                          <span>12 Registered</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Compute Usage:</span>
                          <span>Medium</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-3 text-xs">
                        Manage Indicators
                      </Button>
                    </CardContent>
                  </Card>
                  
                  {/* Module 3: Backtesting */}
                  <Card className="border border-purple-500/20">
                    <CardHeader className="bg-purple-500/5 pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md">Backtesting Module</CardTitle>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500">Zipline/VectorBT</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <p className="text-sm text-muted-foreground mb-3">Strategy validation and performance testing</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span>Status:</span>
                          <Badge variant="outline" className="bg-green-500/10 text-green-500">Active</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Recent Tests:</span>
                          <span>8 Completed</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>CPU Allocation:</span>
                          <span>4 Cores</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-3 text-xs">
                        Run Backtest
                      </Button>
                    </CardContent>
                  </Card>
                  
                  {/* Module 4: Portfolio */}
                  <Card className="border border-pink-500/20">
                    <CardHeader className="bg-pink-500/5 pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md">Portfolio Module</CardTitle>
                        <Badge variant="outline" className="bg-pink-500/10 text-pink-500">Riskfolio</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <p className="text-sm text-muted-foreground mb-3">Optimization and risk management</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span>Status:</span>
                          <Badge variant="outline" className="bg-green-500/10 text-green-500">Active</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Risk Models:</span>
                          <span>4 Deployed</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Optimization:</span>
                          <span>Daily</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-3 text-xs">
                        Adjust Risk Parameters
                      </Button>
                    </CardContent>
                  </Card>
                  
                  {/* Module 5: Execution */}
                  <Card className="border border-red-500/20">
                    <CardHeader className="bg-red-500/5 pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md">Execution Module</CardTitle>
                        <Badge variant="outline" className="bg-red-500/10 text-red-500">IBAPI</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <p className="text-sm text-muted-foreground mb-3">Order execution and management</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span>Status:</span>
                          <Badge variant="outline" className="bg-green-500/10 text-green-500">Active</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Orders Today:</span>
                          <span>18 Executed</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Connection:</span>
                          <span>Stable</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-3 text-xs">
                        View Order Book
                      </Button>
                    </CardContent>
                  </Card>
                  
                  {/* Technical Requirements */}
                  <Card className="border border-gray-500/20">
                    <CardHeader className="bg-gray-500/5 pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md">Technical Setup</CardTitle>
                        <Badge variant="outline">Infrastructure</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <p className="text-sm text-muted-foreground mb-3">Environment and infrastructure requirements</p>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                          <span>Docker container deployed</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                          <span>Redis caching configured</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                          <span>Shared storage mounted</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2"></div>
                          <span>API authentication pending</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-3 text-xs">
                        System Configuration
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Actions */}
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline">
                    Update Libraries
                  </Button>
                  <Button variant="default">
                    Deploy to All Farms
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="command" className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <CommandCenter 
                  defaultWelcomeMessage="Welcome to the Farm Management Command Center. I'm ElizaOS, your farm management assistant. How can I help you today?"
                  commandContext="farm-management"
                  placeholderText="Type a command or ask about farm management..."
                />
              </div>
              <div className="md:col-span-1">
                <FarmCommandShortcuts className="h-full" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </FarmManagementProvider>
    </div>
  );
}
