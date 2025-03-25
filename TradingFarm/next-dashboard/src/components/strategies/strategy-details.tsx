"use client"

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  LineChart, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Bot, 
  Clock, 
  ArrowUpDown, 
  BarChart2,
  PieChart,
  Sliders,
  Code,
  RefreshCw,
  Share2,
  AlertTriangle,
  ShieldAlert,
  Download,
  ListFilter,
  Plus,
  List,
  Grid,
  BookOpen,
  SlidersHorizontal,
  Brain,
  Loader2
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { strategyService } from '@/services/strategy-service'
import { Strategy } from '@/types/strategy'
import { formatDistanceToNow } from 'date-fns'
import { StrategyAgentAssignment } from './strategy-agent-assignment'
import { StrategySummaryCard } from './strategy-summary-card'
import { useSocket } from '@/providers/socket-provider'
import { TRADING_EVENTS } from '@/constants/socket-events'

// Performance history chart data
const mockPerformanceData = [
  { time: '1 Mar', value: 0 },
  { time: '5 Mar', value: 1.2 },
  { time: '10 Mar', value: 0.8 },
  { time: '15 Mar', value: 3.5 },
  { time: '20 Mar', value: 2.8 },
  { time: '25 Mar', value: 4.2 },
  { time: '30 Mar', value: 5.7 },
  { time: '5 Apr', value: 5.2 },
  { time: '10 Apr', value: 7.8 },
  { time: '15 Apr', value: 6.9 },
  { time: '20 Apr', value: 8.3 }
]

// Mock assigned agents
const mockAssignedAgents = [
  { id: 'agent-1', name: 'Alpha Trader', status: 'active', allocation: 25, performance: 7.2 },
  { id: 'agent-3', name: 'Gamma Risk Manager', status: 'paused', allocation: 15, performance: 3.8 },
]

// Mock backtest results
const mockBacktestResults = [
  { id: 'backtest-1', date: '2025-04-15', profit: 8.3, trades: 42, winRate: 64, maxDrawdown: 4.2, sharpeRatio: 1.8 },
  { id: 'backtest-2', date: '2025-04-10', profit: 7.6, trades: 38, winRate: 61, maxDrawdown: 4.8, sharpeRatio: 1.6 },
  { id: 'backtest-3', date: '2025-04-05', profit: 5.9, trades: 35, winRate: 58, maxDrawdown: 5.2, sharpeRatio: 1.4 }
]

interface StrategyDetailsProps {
  strategyId: string
}

export function StrategyDetails({ strategyId }: StrategyDetailsProps) {
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [performanceData, setPerformanceData] = useState(mockPerformanceData)
  const [assignedAgents, setAssignedAgents] = useState(mockAssignedAgents)
  const [backtestResults, setBacktestResults] = useState(mockBacktestResults)
  const [isAssigningStrategy, setIsAssigningStrategy] = useState(false)
  const [isBacktesting, setIsBacktesting] = useState(false)
  const { toast } = useToast()
  const { socket } = useSocket()
  
  // Fetch strategy details
  useEffect(() => {
    const fetchStrategy = async () => {
      setLoading(true)
      try {
        const strategies = await strategyService.getStrategies()
        const found = strategies.find((s: any) => s.id === strategyId)
        if (found) {
          setStrategy(found)
        } else {
          toast({
            title: "Strategy not found",
            description: "The requested strategy could not be found.",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error('Error fetching strategy:', error)
        toast({
          title: "Error loading strategy",
          description: "There was an error loading the strategy details.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStrategy()
  }, [strategyId, toast])

  // Listen for strategy performance updates
  useEffect(() => {
    if (!socket) return
    
    const handlePerformanceUpdate = (data: any) => {
      if (data.strategyId === strategyId) {
        setPerformanceData(prev => {
          // Add new data point
          const newData = [...prev]
          newData.push({
            time: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
            value: data.performance
          })
          // Keep only the last 20 points
          return newData.slice(-20)
        })
        
        // Update strategy performance if available
        setStrategy(prev => {
          if (!prev) return prev
          return {
            ...prev,
            performance: data.performance
          }
        })
      }
    }
    
    socket.on(TRADING_EVENTS.STRATEGY_PERFORMANCE_UPDATE, handlePerformanceUpdate)
    
    return () => {
      socket.off(TRADING_EVENTS.STRATEGY_PERFORMANCE_UPDATE, handlePerformanceUpdate)
    }
  }, [socket, strategyId])

  // Handle strategy status toggle
  const handleToggleStatus = async () => {
    if (!strategy) return
    
    const newStatus = strategy.status === 'active' ? 'paused' : 'active'
    
    try {
      await strategyService.updateStrategyStatus(strategyId, newStatus)
      
      // Update local state immediately for responsive UI
      setStrategy(prev => {
        if (!prev) return prev
        return {
          ...prev,
          status: newStatus
        }
      })
      
      toast({
        title: `Strategy ${newStatus}`,
        description: `Strategy "${strategy.name}" has been ${newStatus}.`,
        variant: "default"
      })
    } catch (error) {
      console.error('Error updating strategy status:', error)
      toast({
        title: "Status update failed",
        description: "There was an error updating the strategy status.",
        variant: "destructive"
      })
    }
  }
  
  // Run backtest
  const handleRunBacktest = async () => {
    if (!strategy) return
    
    setIsBacktesting(true)
    
    try {
      // Emit socket event for backtest
      if (socket) {
        socket.emit(TRADING_EVENTS.RUN_BACKTEST, {
          strategyId,
          params: {
            startDate: '2025-01-01',
            endDate: '2025-03-31',
            initialCapital: 10000
          }
        })
      }
      
      // Simulate backtest completion after 3 seconds
      setTimeout(() => {
        // Add new backtest result
        const newResult = {
          id: `backtest-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          profit: 9.2,
          trades: 45,
          winRate: 67,
          maxDrawdown: 3.8,
          sharpeRatio: 1.9
        }
        
        setBacktestResults(prev => [newResult, ...prev])
        
        toast({
          title: "Backtest completed",
          description: `Backtest for "${strategy.name}" has been completed successfully.`,
          variant: "default"
        })
        
        setIsBacktesting(false)
      }, 3000)
    } catch (error) {
      console.error('Error running backtest:', error)
      toast({
        title: "Backtest failed",
        description: "There was an error running the backtest.",
        variant: "destructive"
      })
      setIsBacktesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading strategy details...</span>
      </div>
    )
  }

  if (!strategy) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h3 className="text-xl font-semibold">Strategy Not Found</h3>
        <p className="text-muted-foreground text-center max-w-md">
          The requested strategy could not be found. It may have been deleted or you may not have access to it.
        </p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{strategy.name}</h2>
          <p className="text-muted-foreground">{strategy.description}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleToggleStatus}>
            {strategy.status === 'active' ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause Strategy
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Activate Strategy
              </>
            )}
          </Button>
          
          <Button variant="outline" onClick={() => setIsAssigningStrategy(true)}>
            <Bot className="mr-2 h-4 w-4" />
            Assign to Agents
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit Strategy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRunBacktest}>
                <LineChart className="mr-2 h-4 w-4" />
                Run Backtest
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Export Strategy
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Strategy
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Badge variant={strategy.status === 'active' ? 'default' : 'secondary'}>
                {strategy.status === 'active' ? 'Active' : 'Paused'}
              </Badge>
              <span className="ml-auto text-2xl font-bold">
                {typeof strategy.performance === 'number' 
                  ? `${strategy.performance > 0 ? '+' : ''}${strategy.performance.toFixed(1)}%` 
                  : strategy.performance}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Markets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {Array.isArray(strategy.markets) ? (
                strategy.markets.map((market, index) => (
                  <Badge key={index} variant="outline">{market}</Badge>
                ))
              ) : (
                <Badge variant="outline">Unknown</Badge>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{strategy.timeframe || 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <Brain className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{strategy.type || 'Custom'}</span>
              </div>
              <div className="flex items-center col-span-2">
                <Code className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Created {strategy.created ? formatDistanceToNow(new Date(strategy.created), { addSuffix: true }) : 'recently'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Assigned Agents</TabsTrigger>
          <TabsTrigger value="backtests">Backtest Results</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance History</CardTitle>
              <CardDescription>
                Historical performance over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {/* This would be a real chart component in production */}
              <div className="h-full flex items-center justify-center bg-muted/20 rounded-md">
                <div className="text-center">
                  <LineChart className="h-12 w-12 mx-auto text-primary" />
                  <p className="mt-2">Performance Chart</p>
                  <p className="text-sm text-muted-foreground">
                    {performanceData.length} data points from {performanceData[0]?.time} to {performanceData[performanceData.length-1]?.time}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                      <p className="text-2xl font-bold">64%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Profit Factor</p>
                      <p className="text-2xl font-bold">1.8</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Max Drawdown</p>
                      <p className="text-2xl font-bold">5.2%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Sharpe Ratio</p>
                      <p className="text-2xl font-bold">1.7</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-l-4 border-green-500 pl-4 py-2">
                    <p className="text-sm">Strategy activated</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4 py-2">
                    <p className="text-sm">Parameters updated</p>
                    <p className="text-xs text-muted-foreground">Yesterday</p>
                  </div>
                  <div className="border-l-4 border-purple-500 pl-4 py-2">
                    <p className="text-sm">Assigned to Alpha Trader agent</p>
                    <p className="text-xs text-muted-foreground">3 days ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="agents" className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Agents Using This Strategy</h3>
            <Button onClick={() => setIsAssigningStrategy(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Assign Agent
            </Button>
          </div>
          
          {assignedAgents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-center text-muted-foreground mb-4">
                  No agents are currently assigned to this strategy.
                </p>
                <Button onClick={() => setIsAssigningStrategy(true)}>
                  Assign Agent
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedAgents.map(agent => (
                <Card key={agent.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center">
                        <Bot className="mr-2 h-5 w-5" />
                        {agent.name}
                      </CardTitle>
                      <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                        {agent.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Allocation</span>
                        <span className="font-medium">{agent.allocation}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Performance</span>
                        <span className="font-medium">{agent.performance > 0 ? '+' : ''}{agent.performance}%</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button variant="outline" size="sm" className="w-full">
                      View Agent
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="backtests" className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Backtest Results</h3>
            <Button onClick={handleRunBacktest} disabled={isBacktesting}>
              {isBacktesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <LineChart className="mr-2 h-4 w-4" />
                  Run Backtest
                </>
              )}
            </Button>
          </div>
          
          {backtestResults.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-center text-muted-foreground mb-4">
                  No backtest results available for this strategy.
                </p>
                <Button onClick={handleRunBacktest} disabled={isBacktesting}>
                  {isBacktesting ? "Running Backtest..." : "Run Backtest"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="px-0 py-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Profit</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Trades</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Win Rate</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Drawdown</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Sharpe</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backtestResults.map((result, index) => (
                        <tr key={result.id} className={index !== backtestResults.length - 1 ? "border-b" : ""}>
                          <td className="px-4 py-3 text-sm">{result.date}</td>
                          <td className={`px-4 py-3 text-right text-sm ${result.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {result.profit > 0 ? '+' : ''}{result.profit.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-right text-sm">{result.trades}</td>
                          <td className="px-4 py-3 text-right text-sm">{result.winRate}%</td>
                          <td className="px-4 py-3 text-right text-sm">-{result.maxDrawdown}%</td>
                          <td className="px-4 py-3 text-right text-sm">{result.sharpeRatio.toFixed(1)}</td>
                          <td className="px-4 py-3 text-right text-sm">
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="parameters" className="space-y-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Parameters</CardTitle>
              <CardDescription>
                Configure the parameters used by this strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Entry Conditions</h4>
                    <div className="border rounded-md p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">RSI Period</span>
                        <span className="text-sm font-medium">14</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">RSI Oversold Threshold</span>
                        <span className="text-sm font-medium">30</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">MACD Fast Period</span>
                        <span className="text-sm font-medium">12</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">MACD Slow Period</span>
                        <span className="text-sm font-medium">26</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">MACD Signal Period</span>
                        <span className="text-sm font-medium">9</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Exit Conditions</h4>
                    <div className="border rounded-md p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Take Profit</span>
                        <span className="text-sm font-medium">3.5%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Stop Loss</span>
                        <span className="text-sm font-medium">2.0%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Trailing Stop</span>
                        <span className="text-sm font-medium">1.5%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Maximum Holding Period</span>
                        <span className="text-sm font-medium">72 hours</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Risk Management</h4>
                  <div className="border rounded-md p-4 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Position Size</span>
                        <span className="text-sm font-medium">2% of portfolio</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Max Open Positions</span>
                        <span className="text-sm font-medium">5</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Daily Drawdown Limit</span>
                        <span className="text-sm font-medium">5%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Weekly Drawdown Limit</span>
                        <span className="text-sm font-medium">10%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <Edit className="mr-2 h-4 w-4" />
                Edit Parameters
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Strategy Agent Assignment Dialog */}
      <StrategyAgentAssignment
        strategyId={strategyId}
        strategyName={strategy.name}
        isOpen={isAssigningStrategy}
        onClose={() => setIsAssigningStrategy(false)}
      />
    </div>
  )
}
