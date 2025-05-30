"use client"

import { useState } from 'react'
import Link from 'next/link'
import { 
  Bot, 
  ChevronLeft,
  Terminal,
  Settings,
  LineChart,
  BarChart2,
  PieChart,
  Cpu,
  Zap,
  Activity,
  Database,
  RefreshCw,
  Play,
  Pause,
  FileText,
  Eye,
  Brain,
  BarChart,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  ArrowUpRight,
  ChevronRight,
  Wallet,
  Server,
  Wrench,
  Sliders,
  Plus,
  Trash
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAIAgentV2, type AIAgentV2 } from '@/context/ai-agent-v2-context'

// Define types for better TypeScript support
interface AgentStats {
  totalAssetsAccumulated: string;
  valueUSD: number;
  avgProfit: number;
  maxDrawdown: number;
}

interface AgentTool {
  name: string;
  status: string;
  lastUsed: string;
  usageLevel: string;
}

interface AgentStrategy {
  name: string;
  source: string;
  performance: string;
}

interface AgentModelSettings {
  model: string;
  temperature: number;
  context: string;
  topP: number;
  fallbackModel: string;
  switchingRules: string;
}

interface AgentModelUsage {
  responseTime: string;
  tokensUsed24h: string;
  cost24h: number;
  monthlyBudget: number;
  budgetUsed: number;
}

interface AgentFarm {
  name: string;
  goal: string;
  progress: number;
}

interface AgentDetails extends AIAgentV2 {
  id: string;
  name: string;
  status: string;
  type: string;
  performance: number;
  performance24h: number;
  performance7d: number;
  performance30d: number;
  trades: number;
  winRate: number;
  createdAt: string;
  farm: AgentFarm;
  model: string;
  capabilities: string[];
  tools: AgentTool[];
  strategies: AgentStrategy[];
  description: string;
  modelSettings: AgentModelSettings;
  modelUsage: AgentModelUsage;
  health: number;
  uptime: string;
  lastAction: string;
  memoryUsage: string;
  apiCalls24h: number;
  version: string;
  stats: AgentStats;
}

export default function AgentDetailsPage({ params }: { params: { id: string } }) {
  const agentContext = useAIAgentV2()
  const [activeTab, setActiveTab] = useState('overview')
  
  // Find the agent with the matching ID
  const agent = agentContext.agents?.find(a => a.id === params.id) as AgentDetails || {
    id: "agent-ts01",
    name: "TrendSurfer Pro",
    status: "active",
    type: "Trading Assistant",
    performance: 8.4,
    performance24h: 3.2,
    performance7d: 8.4,
    performance30d: 27.8,
    trades: 42,
    winRate: 73.2,
    createdAt: "2025-03-10T00:00:00Z",
    farm: { name: "ETH Accumulator", goal: "1,000 ETH", progress: 34.7 },
    model: "GPT-4o",
    capabilities: [
      "Market Analysis",
      "Trading Signals", 
      "Risk Assessment",
      "Pattern Recognition",
      "Strategy Creation"
    ],
    tools: [
      { name: "TradingView API", status: "active", lastUsed: "2 minutes ago", usageLevel: "High" },
      { name: "DEX Aggregator", status: "active", lastUsed: "5 minutes ago", usageLevel: "Medium" },
      { name: "Flashbots MEV", status: "active", lastUsed: "2 minutes ago", usageLevel: "High" },
      { name: "Risk Calculator", status: "active", lastUsed: "8 minutes ago", usageLevel: "Low" }
    ],
    strategies: [
      { name: "MA Strategy", source: "Brain", performance: "A+" },
      { name: "RSI Reversal", source: "Brain", performance: "B" }
    ],
    description: "Advanced trend following agent with adaptive parameter tuning and multi-timeframe analysis",
    modelSettings: {
      model: "GPT-4o",
      temperature: 0.2,
      context: "16K tokens",
      topP: 0.95,
      fallbackModel: "Claude 3 Sonnet",
      switchingRules: "Auto-switch if primary error or >2s latency"
    },
    modelUsage: {
      responseTime: "425ms",
      tokensUsed24h: "2.4M",
      cost24h: 9.87,
      monthlyBudget: 50.00,
      budgetUsed: 28.73
    },
    health: 98,
    uptime: "14d 7h 32m",
    lastAction: "2 minutes ago",
    memoryUsage: "532 MB",
    apiCalls24h: 4732,
    version: "2.3.4",
    stats: {
      totalAssetsAccumulated: "38.54 ETH",
      valueUSD: 152437,
      avgProfit: 348,
      maxDrawdown: 3.7
    }
  }

  // Recent trades data (placeholder/demo)
  const recentTrades = [
    { time: "2025-03-24 14:32", exchange: "Binance", action: "BUY", asset: "ETH", amount: "0.75 ETH", price: "$3,945.20", pl: null },
    { time: "2025-03-24 13:15", exchange: "dYdX", action: "SELL", asset: "ETH", amount: "0.42 ETH", price: "$3,963.75", pl: "+$48.30" },
    { time: "2025-03-24 11:47", exchange: "Uniswap", action: "SWAP", asset: "USDC", amount: "5,000 USDC", price: "1.27 ETH", pl: null },
    { time: "2025-03-24 10:23", exchange: "Binance", action: "BUY", asset: "ETH", amount: "0.68 ETH", price: "$3,942.18", pl: null },
    { time: "2025-03-24 08:51", exchange: "dYdX", action: "SELL", asset: "ETH", amount: "0.50 ETH", price: "$3,967.54", pl: "+$95.82" }
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header with breadcrumb and back button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            Trading Farm Dashboard
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Link href="/dashboard/agents" className="text-muted-foreground hover:text-foreground">
            Agents
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span>{agent.name}</span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/agents">
            <ChevronLeft className="h-4 w-4 mr-2" />
            BACK
          </Link>
        </Button>
      </div>

      {/* Agent title and console button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{agent.name}</h1>
        <Button>
          <Terminal className="h-4 w-4 mr-2" />
          OPEN CONSOLE
        </Button>
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="performance" className="flex-1">Performance</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
          <TabsTrigger value="ai-models" className="flex-1">AI Models</TabsTrigger>
          <TabsTrigger value="tools" className="flex-1">Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Overview tab content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Agent Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>AGENT DETAILS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span>{agent.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span>{agent.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span>{agent.version}</span>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-1">Description:</p>
                  <p>{agent.description}</p>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  EDIT DETAILS
                </Button>
              </CardContent>
            </Card>

            {/* Farm Assignment Card */}
            <Card>
              <CardHeader>
                <CardTitle>FARM ASSIGNMENT</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Farm:</span>
                    <span>{agent.farm?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Goal:</span>
                    <span>{agent.farm?.goal}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Progress:</span>
                    <span>{agent.farm?.progress}%</span>
                  </div>
                  <Progress value={agent.farm?.progress} className="h-2 mt-1" />
                </div>

                <div>
                  <p className="text-muted-foreground mb-1">Capital Allocation:</p>
                  <ul className="space-y-1">
                    <li>$56,532 (20% of farm)</li>
                    <li>Max Leverage: 2.5x</li>
                  </ul>
                </div>

                <div>
                  <p className="text-muted-foreground mb-1">Other Agents in Farm:</p>
                  <ul className="space-y-1">
                    <li>DCA Master</li>
                    <li>Grid Trader Deluxe</li>
                    <li>Smart Breakout</li>
                  </ul>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  CHANGE FARM
                </Button>
              </CardContent>
            </Card>

            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>STATUS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Current Status:</span>
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                      <span>Active</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uptime:</span>
                    <span>{agent.uptime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Action:</span>
                    <span>{agent.lastAction}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Health:</span>
                    <span>{agent.health}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Memory Usage:</span>
                    <span>{agent.memoryUsage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">API Calls (24h):</span>
                    <span>{agent.apiCalls24h.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token Usage (24h):</span>
                    <span>{agent.modelUsage.tokensUsed24h}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm">REFRESH STATUS</Button>
                  <Button variant="outline" size="sm">EXECUTE TASK</Button>
                  <Button variant="outline" size="sm">PAUSE AGENT</Button>
                  <Button variant="outline" size="sm">VIEW LOGS</Button>
                  <Button variant="outline" size="sm">BACKUP CONFIGURATION</Button>
                </div>
              </CardContent>
            </Card>

            {/* Capabilities Card */}
            <Card>
              <CardHeader>
                <CardTitle>CAPABILITIES</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  {agent.capabilities?.map((capability, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{capability}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="font-medium mt-4 mb-2">TOOLS ENABLED</p>
                  <div className="space-y-1">
                    {agent.tools?.map((tool, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{tool.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  MANAGE CAPABILITIES
                </Button>
              </CardContent>
            </Card>

            {/* Brain Strategies Card */}
            <Card>
              <CardHeader>
                <CardTitle>BRAIN STRATEGIES</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-muted-foreground mb-1">Primary Strategy:</p>
                  <div className="space-y-1 ml-2">
                    <div className="flex items-center">
                      <Brain className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">{agent.strategies?.[0].name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Source:</span>
                      <span>{agent.strategies?.[0].source}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Performance:</span>
                      <span className="text-green-500">{agent.strategies?.[0].performance}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-1">Secondary Strategy:</p>
                  <div className="space-y-1 ml-2">
                    <div className="flex items-center">
                      <Brain className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">{agent.strategies?.[1].name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Source:</span>
                      <span>{agent.strategies?.[1].source}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Performance:</span>
                      <span className="text-green-500">{agent.strategies?.[1].performance}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    VIEW ALL STRATEGIES
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    ADD STRATEGY
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Trading Performance Card */}
            <Card>
              <CardHeader>
                <CardTitle>TRADING PERFORMANCE</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">24h:</span>
                    <span className="text-green-500">+{agent.performance24h}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">7d:</span>
                    <span className="text-green-500">+{agent.performance7d}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">30d:</span>
                    <span className="text-green-500">+{agent.performance30d}%</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Win Rate:</span>
                    <span>{agent.winRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trades:</span>
                    <span>{agent.trades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Profit:</span>
                    <span>${agent.stats.avgProfit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Drawdown:</span>
                    <span>{agent.stats.maxDrawdown}%</span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-muted-foreground mb-1">Total Assets Accumulated:</p>
                  <div className="space-y-1 ml-2">
                    <div className="flex justify-between font-medium">
                      <span>{agent.stats.totalAssetsAccumulated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Value:</span>
                      <span>${agent.stats.valueUSD.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  VIEW DETAILED STATS
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* LLM Model Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>LLM MODEL CONFIGURATION</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-medium">Current Model: {agent.modelSettings.model} (OpenRouter)</span>
                    <Button variant="outline" size="sm">CHANGE MODEL</Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <p className="font-medium mb-2">Model Settings:</p>
                    <p className="font-medium mb-2">Usage Statistics:</p>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Temperature:</span>
                        <span>{agent.modelSettings.temperature}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Context:</span>
                        <span>{agent.modelSettings.context}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Top P:</span>
                        <span>{agent.modelSettings.topP}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Response Time:</span>
                        <span>{agent.modelUsage.responseTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tokens Used (24h):</span>
                        <span>{agent.modelUsage.tokensUsed24h}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost (24h):</span>
                        <span>${agent.modelUsage.cost24h}</span>
                      </div>
                    </div>

                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fallback Model:</span>
                        <span>{agent.modelSettings.fallbackModel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Switching Rules:</span>
                        <span className="text-sm">{agent.modelSettings.switchingRules}</span>
                      </div>
                    </div>

                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Budget:</span>
                        <span>${agent.modelUsage.monthlyBudget.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Used:</span>
                          <span>${agent.modelUsage.budgetUsed.toFixed(2)} ({((agent.modelUsage.budgetUsed / agent.modelUsage.monthlyBudget) * 100).toFixed(1)}%)</span>
                        </div>
                        <Progress 
                          value={(agent.modelUsage.budgetUsed / agent.modelUsage.monthlyBudget) * 100} 
                          className="h-2 mt-1" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <Button variant="outline" size="sm" className="flex-1">OPTIMIZE MODEL SETTINGS</Button>
                    <Button variant="outline" size="sm" className="flex-1">CONFIGURE FALLBACKS</Button>
                    <Button variant="outline" size="sm" className="flex-1">SET BUDGET</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Trades */}
          <Card>
            <CardHeader>
              <CardTitle>RECENT TRADES</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium">Time</th>
                      <th className="text-left py-2 px-4 font-medium">Exchange</th>
                      <th className="text-left py-2 px-4 font-medium">Action</th>
                      <th className="text-left py-2 px-4 font-medium">Asset</th>
                      <th className="text-left py-2 px-4 font-medium">Amount</th>
                      <th className="text-left py-2 px-4 font-medium">Price</th>
                      <th className="text-left py-2 px-4 font-medium">P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTrades.map((trade, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2 px-4">{trade.time}</td>
                        <td className="py-2 px-4">{trade.exchange}</td>
                        <td className="py-2 px-4">
                          <Badge variant={
                            trade.action === 'BUY' ? 'success' : 
                            trade.action === 'SELL' ? 'destructive' : 
                            'outline'
                          }>
                            {trade.action}
                          </Badge>
                        </td>
                        <td className="py-2 px-4">{trade.asset}</td>
                        <td className="py-2 px-4">{trade.amount}</td>
                        <td className="py-2 px-4">{trade.price}</td>
                        <td className="py-2 px-4 text-green-500">{trade.pl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between mt-4">
                <Button variant="outline" size="sm">VIEW ALL TRADES</Button>
                <Button variant="outline" size="sm">EXPORT DATA</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          {/* Performance tab content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Performance Metrics Card */}
            <Card>
              <CardHeader>
                <CardTitle>PERFORMANCE METRICS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">24h Performance:</span>
                    <span className="text-green-500">+{agent.performance24h}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">7d Performance:</span>
                    <span className="text-green-500">+{agent.performance7d}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">30d Performance:</span>
                    <span className="text-green-500">+{agent.performance30d}%</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Win Rate:</span>
                    <span>{agent.winRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trades:</span>
                    <span>{agent.trades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Profit:</span>
                    <span>${agent.stats.avgProfit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Drawdown:</span>
                    <span>{agent.stats.maxDrawdown}%</span>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  VIEW DETAILED STATS
                </Button>
              </CardContent>
            </Card>

            {/* Performance Chart Card */}
            <Card>
              <CardHeader>
                <CardTitle>PERFORMANCE CHART</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <LineChart className="h-full w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          {/* Settings tab content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* General Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle>GENERAL SETTINGS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Agent Name</label>
                    <input 
                      type="text" 
                      defaultValue={agent.name}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary" 
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Agent Type</label>
                    <select className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="Trading Assistant">Trading Assistant</option>
                      <option value="Market Analyzer">Market Analyzer</option>
                      <option value="Strategy Executor">Strategy Executor</option>
                      <option value="Portfolio Manager">Portfolio Manager</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea 
                      defaultValue={agent.description}
                      rows={4}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary" 
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Status</label>
                    <select className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>
                
                <Button size="sm" className="w-full">
                  SAVE GENERAL SETTINGS
                </Button>
              </CardContent>
            </Card>

            {/* Trading Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle>TRADING SETTINGS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Max Position Size</label>
                    <div className="flex">
                      <input 
                        type="number" 
                        defaultValue="5000"
                        className="w-full px-3 py-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-primary" 
                      />
                      <span className="px-3 py-2 border border-l-0 rounded-r bg-muted">USD</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Risk Level</label>
                    <div className="flex items-center gap-4">
                      <input type="range" min="1" max="10" defaultValue="5" className="w-full" />
                      <span className="min-w-[2rem] text-center">5</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Allowed Assets</label>
                    <div className="flex flex-wrap gap-2">
                      <Badge>BTC</Badge>
                      <Badge>ETH</Badge>
                      <Badge>LINK</Badge>
                      <Badge>SOL</Badge>
                      <Badge>AAVE</Badge>
                      <Badge className="bg-muted text-muted-foreground">+ Add</Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Max Trades per Day</label>
                      <input 
                        type="number" 
                        defaultValue="20"
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary" 
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Stop Loss (%)</label>
                      <input 
                        type="number" 
                        defaultValue="5"
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary" 
                      />
                    </div>
                  </div>
                </div>
                
                <Button size="sm" className="w-full">
                  SAVE TRADING SETTINGS
                </Button>
              </CardContent>
            </Card>

            {/* Notification Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle>NOTIFICATION SETTINGS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Trade Executions</label>
                    <div className="flex items-center">
                      <input type="checkbox" defaultChecked id="trade-exec" className="mr-2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Performance Alerts</label>
                    <div className="flex items-center">
                      <input type="checkbox" defaultChecked id="perf-alerts" className="mr-2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Error Notifications</label>
                    <div className="flex items-center">
                      <input type="checkbox" defaultChecked id="error-notif" className="mr-2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Daily Summaries</label>
                    <div className="flex items-center">
                      <input type="checkbox" id="daily-summary" className="mr-2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Market Opportunities</label>
                    <div className="flex items-center">
                      <input type="checkbox" defaultChecked id="market-opps" className="mr-2" />
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 pb-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Notification Channels</label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        <input type="checkbox" defaultChecked id="email-channel" className="mr-2" />
                        <label htmlFor="email-channel">Email</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="sms-channel" className="mr-2" />
                        <label htmlFor="sms-channel">SMS</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" defaultChecked id="app-channel" className="mr-2" />
                        <label htmlFor="app-channel">In-App</label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button size="sm" className="w-full">
                  SAVE NOTIFICATION SETTINGS
                </Button>
              </CardContent>
            </Card>

            {/* Automation Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle>AUTOMATION SETTINGS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Auto-Rebalance Portfolio</label>
                    <div className="flex items-center">
                      <input type="checkbox" defaultChecked id="auto-rebalance" className="mr-2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Auto-Adjust to Market Conditions</label>
                    <div className="flex items-center">
                      <input type="checkbox" defaultChecked id="market-adjust" className="mr-2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Auto-Upgrade Models</label>
                    <div className="flex items-center">
                      <input type="checkbox" id="auto-upgrade" className="mr-2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Self-Optimization</label>
                    <div className="flex items-center">
                      <input type="checkbox" defaultChecked id="self-optimize" className="mr-2" />
                    </div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Schedule Active Hours</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-muted-foreground">Start Time</label>
                        <input 
                          type="time" 
                          defaultValue="00:00"
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary" 
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-muted-foreground">End Time</label>
                        <input 
                          type="time" 
                          defaultValue="23:59"
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button size="sm" className="w-full">
                  SAVE AUTOMATION SETTINGS
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-models">
          {/* AI Models tab content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* OpenRouter Configuration Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>OPENROUTER CONFIGURATION</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="font-medium">Status: Connected</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      REFRESH
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      CONFIGURE
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">API Key Status:</span>
                      <span className="text-green-500">Valid</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Balance:</span>
                      <span>${(150.23).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost Last 7 Days:</span>
                      <span>${(42.16).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Model:</span>
                      <span>{agent.modelSettings.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fallback Model:</span>
                      <span>{agent.modelSettings.fallbackModel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last API Call:</span>
                      <span>2 minutes ago</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Monthly Budget: ${agent.modelUsage.monthlyBudget.toFixed(2)}</span>
                    <span>${agent.modelUsage.budgetUsed.toFixed(2)} used ({((agent.modelUsage.budgetUsed / agent.modelUsage.monthlyBudget) * 100).toFixed(1)}%)</span>
                  </div>
                  <Progress 
                    value={(agent.modelUsage.budgetUsed / agent.modelUsage.monthlyBudget) * 100} 
                    className="h-2 mt-1" 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Usage Statistics Card */}
            <Card>
              <CardHeader>
                <CardTitle>USAGE STATISTICS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Response Time:</span>
                    <span>{agent.modelUsage.responseTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tokens Used (24h):</span>
                    <span>{agent.modelUsage.tokensUsed24h}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost (24h):</span>
                    <span>${agent.modelUsage.cost24h.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token Usage by Type (24h):</span>
                  </div>
                  <div className="space-y-2 mt-2">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Prompt Tokens</span>
                        <span>1.8M</span>
                      </div>
                      <Progress value={75} className="h-2 mt-1" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Completion Tokens</span>
                        <span>600K</span>
                      </div>
                      <Progress value={25} className="h-2 mt-1" />
                    </div>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full mt-2">
                  VIEW DETAILED ANALYTICS
                </Button>
              </CardContent>
            </Card>

            {/* Model Comparison Table Card */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>AVAILABLE MODELS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-medium">Model</th>
                        <th className="text-left py-2 px-4 font-medium">Provider</th>
                        <th className="text-left py-2 px-4 font-medium">Context Size</th>
                        <th className="text-left py-2 px-4 font-medium">Cost (1K tokens)</th>
                        <th className="text-left py-2 px-4 font-medium">Avg Response</th>
                        <th className="text-left py-2 px-4 font-medium">Performance</th>
                        <th className="text-left py-2 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b bg-secondary/20">
                        <td className="py-2 px-4 font-medium">GPT-4o</td>
                        <td className="py-2 px-4">OpenAI</td>
                        <td className="py-2 px-4">128K</td>
                        <td className="py-2 px-4">$0.005</td>
                        <td className="py-2 px-4">425ms</td>
                        <td className="py-2 px-4">
                          <Badge>A+</Badge>
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant="outline">Current</Badge>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Claude 3 Sonnet</td>
                        <td className="py-2 px-4">Anthropic</td>
                        <td className="py-2 px-4">200K</td>
                        <td className="py-2 px-4">$0.003</td>
                        <td className="py-2 px-4">510ms</td>
                        <td className="py-2 px-4">
                          <Badge>A</Badge>
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant="outline">Fallback</Badge>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Claude 3 Opus</td>
                        <td className="py-2 px-4">Anthropic</td>
                        <td className="py-2 px-4">200K</td>
                        <td className="py-2 px-4">$0.015</td>
                        <td className="py-2 px-4">780ms</td>
                        <td className="py-2 px-4">
                          <Badge>A+</Badge>
                        </td>
                        <td className="py-2 px-4">
                          <Button variant="outline" size="sm">SELECT</Button>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Mistral Large</td>
                        <td className="py-2 px-4">Mistral AI</td>
                        <td className="py-2 px-4">32K</td>
                        <td className="py-2 px-4">$0.0027</td>
                        <td className="py-2 px-4">620ms</td>
                        <td className="py-2 px-4">
                          <Badge>B+</Badge>
                        </td>
                        <td className="py-2 px-4">
                          <Button variant="outline" size="sm">SELECT</Button>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">GPT-3.5 Turbo</td>
                        <td className="py-2 px-4">OpenAI</td>
                        <td className="py-2 px-4">16K</td>
                        <td className="py-2 px-4">$0.0015</td>
                        <td className="py-2 px-4">380ms</td>
                        <td className="py-2 px-4">
                          <Badge>B</Badge>
                        </td>
                        <td className="py-2 px-4">
                          <Button variant="outline" size="sm">SELECT</Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Model Parameters Card */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>MODEL PARAMETERS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between">
                        <label className="text-sm font-medium">Temperature</label>
                        <span>{agent.modelSettings.temperature}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        defaultValue={agent.modelSettings.temperature}
                        className="w-full" 
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>More Deterministic</span>
                        <span>More Creative</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between">
                        <label className="text-sm font-medium">Top P</label>
                        <span>{agent.modelSettings.topP}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        defaultValue={agent.modelSettings.topP}
                        className="w-full" 
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>More Focused</span>
                        <span>More Diverse</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Max Tokens Per Response</label>
                      <input 
                        type="number" 
                        defaultValue="4096"
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary" 
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Frequency Penalty</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="range" 
                          min="0" 
                          max="2" 
                          step="0.1" 
                          defaultValue="0.5"
                          className="flex-1" 
                        />
                        <span className="min-w-[2rem] text-center">0.5</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Presence Penalty</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="range" 
                          min="0" 
                          max="2" 
                          step="0.1" 
                          defaultValue="0.2"
                          className="flex-1" 
                        />
                        <span className="min-w-[2rem] text-center">0.2</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">System Prompt Template</label>
                        <select className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary">
                          <option>Trading Analysis Expert</option>
                          <option>Risk Management Specialist</option>
                          <option>Market Trend Analyzer</option>
                          <option>Custom Template</option>
                        </select>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Edit System Prompt</label>
                        <textarea 
                          rows={5}
                          defaultValue="You are an expert trading assistant specialized in cryptocurrency markets. Analyze market conditions, provide detailed insights, and execute trades according to predefined strategies while managing risk effectively."
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary" 
                        />
                      </div>
                    </div>
                    
                    <Button className="mt-4 w-full">
                      SAVE MODEL PARAMETERS
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tools">
          {/* Tools tab content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Tools Card */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>ACTIVE TOOLS</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  ADD TOOL
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-medium">Tool Name</th>
                        <th className="text-left py-2 px-4 font-medium">Type</th>
                        <th className="text-left py-2 px-4 font-medium">Status</th>
                        <th className="text-left py-2 px-4 font-medium">Last Used</th>
                        <th className="text-left py-2 px-4 font-medium">Usage</th>
                        <th className="text-left py-2 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agent.tools?.map((tool, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2 px-4 font-medium">{tool.name}</td>
                          <td className="py-2 px-4">
                            {tool.name.includes('API') ? 'External API' : 
                             tool.name.includes('MEV') ? 'Protocol' : 'Utility'}
                          </td>
                          <td className="py-2 px-4">
                            <div className="flex items-center">
                              <div className={`h-2 w-2 rounded-full ${tool.status === 'active' ? 'bg-green-500' : 'bg-gray-400'} mr-2`}></div>
                              <span>{tool.status === 'active' ? 'Active' : 'Inactive'}</span>
                            </div>
                          </td>
                          <td className="py-2 px-4">{tool.lastUsed}</td>
                          <td className="py-2 px-4">
                            <Badge variant={
                              tool.usageLevel === 'High' ? 'default' : 
                              tool.usageLevel === 'Medium' ? 'secondary' : 
                              'outline'
                            }>
                              {tool.usageLevel}
                            </Badge>
                          </td>
                          <td className="py-2 px-4">
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="icon">
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end mt-4">
                  <Button variant="outline" size="sm">
                    MANAGE ALL TOOLS
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tool Usage Statistics Card */}
            <Card>
              <CardHeader>
                <CardTitle>TOOL USAGE STATISTICS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-muted-foreground mb-2">API Calls (Last 24h)</p>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>TradingView API</span>
                        <span>2,432</span>
                      </div>
                      <Progress value={75} className="h-2 mt-1" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>DEX Aggregator</span>
                        <span>1,245</span>
                      </div>
                      <Progress value={42} className="h-2 mt-1" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Flashbots MEV</span>
                        <span>872</span>
                      </div>
                      <Progress value={28} className="h-2 mt-1" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Risk Calculator</span>
                        <span>183</span>
                      </div>
                      <Progress value={8} className="h-2 mt-1" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-2">API Response Times (ms)</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>TradingView API</span>
                      <span>128ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DEX Aggregator</span>
                      <span>245ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Flashbots MEV</span>
                      <span>98ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk Calculator</span>
                      <span>42ms</span>
                    </div>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  VIEW DETAILED ANALYTICS
                </Button>
              </CardContent>
            </Card>

            {/* MCP Servers Card */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>MCP SERVERS</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  ADD SERVER
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-medium">Server Name</th>
                        <th className="text-left py-2 px-4 font-medium">Provider</th>
                        <th className="text-left py-2 px-4 font-medium">Status</th>
                        <th className="text-left py-2 px-4 font-medium">Capabilities</th>
                        <th className="text-left py-2 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Trading Data MCP</td>
                        <td className="py-2 px-4">Internal</td>
                        <td className="py-2 px-4">
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                            <span>Active</span>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline">Market Data</Badge>
                            <Badge variant="outline">History</Badge>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="icon">
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Analysis MCP</td>
                        <td className="py-2 px-4">Internal</td>
                        <td className="py-2 px-4">
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                            <span>Active</span>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline">Technical Analysis</Badge>
                            <Badge variant="outline">Strategy</Badge>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="icon">
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium">Exchange MCP</td>
                        <td className="py-2 px-4">External</td>
                        <td className="py-2 px-4">
                          <div className="flex items-center">
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                            <span>Active</span>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline">Order Management</Badge>
                            <Badge variant="outline">Execution</Badge>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="icon">
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Tool Permissions Card */}
            <Card>
              <CardHeader>
                <CardTitle>TOOL PERMISSIONS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-medium">External API Access</span>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" defaultChecked id="external-api" className="mr-2" />
                      <label htmlFor="external-api">Enabled</label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-medium">Order Execution</span>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" defaultChecked id="order-exec" className="mr-2" />
                      <label htmlFor="order-exec">Enabled</label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-medium">Risk Management Tools</span>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" defaultChecked id="risk-tools" className="mr-2" />
                      <label htmlFor="risk-tools">Enabled</label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-medium">Auto-Strategy Creation</span>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" id="auto-strategy" className="mr-2" />
                      <label htmlFor="auto-strategy">Enabled</label>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="font-medium mb-2">Max Order Limits</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Single Order Limit:</span>
                      <span>$5,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily Order Limit:</span>
                      <span>$50,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Level of Approval:</span>
                      <span>Medium</span>
                    </div>
                  </div>
                </div>
                
                <Button size="sm" className="w-full">
                  UPDATE PERMISSIONS
                </Button>
              </CardContent>
            </Card>

            {/* Available Upgrades Card */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>AVAILABLE TOOL UPGRADES</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Advanced MEV Protection</h3>
                      <Badge>New</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Enhanced protection against front-running and sandwich attacks with improved block prediction.</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Compatible:</span>
                      <span className="text-sm text-green-500">Yes</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      INSTALL UPGRADE
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Multi-Exchange Connector</h3>
                      <Badge>Premium</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Connect to 15+ exchanges simultaneously with unified order management and smart routing.</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Compatible:</span>
                      <span className="text-sm text-green-500">Yes</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      UPGRADE ($29/mo)
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Advanced Strategy Builder</h3>
                      <Badge>Beta</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Create complex trading strategies with visual editor and backtest against historical data.</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Compatible:</span>
                      <span className="text-sm text-green-500">Yes</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      JOIN BETA
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
