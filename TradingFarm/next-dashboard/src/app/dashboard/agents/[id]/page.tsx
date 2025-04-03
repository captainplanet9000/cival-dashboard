"use client";

import React from "react";
import { nanoid } from "nanoid";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { CommandTerminal, CommandMessage } from "@/components/ui/command-terminal";
import { Chart } from "@/components/ui/chart";
import { 
  ArrowLeft, 
  Bot, 
  Terminal, 
  BarChart, 
  FileText, 
  History, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertCircle,
  Info
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DEMO_MODE, demoAgents } from "@/utils/demo-data";
import { elizaService } from "@/services/eliza-service";

// Placeholder for agent service (would be implemented in a real app)
const getAgent = async (id: string) => {
  // In demo mode, return a demo agent
  if (DEMO_MODE || process.env.NODE_ENV === 'development') {
    const agent = demoAgents.find(a => a.id.toString() === id) || demoAgents[0];
    return {
      data: agent,
      error: null
    };
  }
  
  // In production, fetch from Supabase
  return {
    data: null,
    error: "Agent not found"
  };
};

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { id } = params;
  const agentId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '1';
  
  const [agent, setAgent] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("dashboard");
  const [commandMessages, setCommandMessages] = React.useState<CommandMessage[]>([]);
  const [isProcessingCommand, setIsProcessingCommand] = React.useState(false);
  const [performanceData, setPerformanceData] = React.useState<any>(null);
  
  // Agent performance chart configuration
  const chartOptions = {
    chart: {
      height: 280,
      type: 'area',
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      },
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    colors: ['#4f46e5', '#10b981'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeFormatter: {
          year: 'yyyy',
          month: 'MMM dd',
          day: 'MMM dd',
          hour: 'HH:mm'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: function(value: number) {
          return value.toFixed(2) + '%';
        }
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
    tooltip: {
      x: {
        format: 'MMM dd, yyyy'
      }
    }
  };
  
  // Fetch agent data
  React.useEffect(() => {
    const fetchAgent = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Simulate network delay in demo mode
        if (DEMO_MODE || process.env.NODE_ENV === 'development') {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const { data, error } = await getAgent(agentId);
        
        if (error) {
          setError(error);
          toast({
            title: "Error",
            description: `Failed to load agent: ${error}`,
            variant: "destructive"
          });
        } else if (data) {
          setAgent(data);
          
          // Generate welcome message for the command console
          setCommandMessages([{
            id: nanoid(),
            content: `Connected to Agent "${data.name}" (ID: ${data.id}). Type 'help' for available commands.`,
            timestamp: new Date(),
            type: "system",
            source: "system"
          }]);
          
          // Generate mock performance data
          generatePerformanceData();
          
          toast({
            title: "Agent Loaded",
            description: `Successfully loaded agent "${data.name}"`
          });
        } else {
          setError("Agent not found");
          toast({
            title: "Error",
            description: "Agent not found",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error fetching agent:", error);
        setError("Failed to load agent");
        toast({
          title: "Error",
          description: "Failed to load agent",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAgent();
  }, [agentId, toast]);
  
  // Generate mock performance data for the chart
  const generatePerformanceData = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const performanceSeries = [];
    const benchmarkSeries = [];
    
    // Agent performance (simulated)
    let agentValue = 0;
    let benchmarkValue = 0;
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      
      // Agent has more volatility but better performance
      const agentChange = (Math.random() * 2 - 0.8 + 0.4); // Slightly positive bias
      agentValue += agentChange;
      
      // Benchmark is smoother but lower performance
      const benchmarkChange = (Math.random() * 1.2 - 0.5 + 0.2); // Less volatile, slight positive bias
      benchmarkValue += benchmarkChange;
      
      performanceSeries.push([date.getTime(), parseFloat(agentValue.toFixed(2))]);
      benchmarkSeries.push([date.getTime(), parseFloat(benchmarkValue.toFixed(2))]);
    }
    
    setPerformanceData({
      series: [
        {
          name: 'Agent Performance',
          data: performanceSeries
        },
        {
          name: 'Market Benchmark',
          data: benchmarkSeries
        }
      ],
      options: chartOptions
    });
  };
  
  // Process agent-specific commands
  const handleSendCommand = async (command: string) => {
    setIsProcessingCommand(true);
    
    try {
      // Augment the command with agent context
      const agentCommand = `agent ${agentId} ${command}`;
      
      // Process the command through ElizaOS service
      const updatedMessages = await elizaService.processCommand(agentCommand);
      
      // Remove the first message which is the user command
      // We'll create our own with the original command for better UX
      const commandMessages = updatedMessages.slice(1);
      
      // Add user command as first message
      setCommandMessages(prev => [
        ...prev, 
        {
          id: nanoid(),
          content: command,
          timestamp: new Date(),
          type: 'command',
          source: 'user'
        },
        ...commandMessages
      ]);
    } catch (error) {
      console.error("Error processing command:", error);
      
      // Add error message
      setCommandMessages(prev => [
        ...prev,
        {
          id: nanoid(),
          content: `Error processing command: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
          type: "alert",
          source: "system"
        }
      ]);
      
      toast({
        title: "Command Error",
        description: "Failed to process command",
        variant: "destructive"
      });
    } finally {
      setIsProcessingCommand(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-6 w-full max-w-md mb-8" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48 md:col-span-1" />
          <Skeleton className="h-48 md:col-span-2" />
          <Skeleton className="h-96 md:col-span-3" />
        </div>
      </div>
    );
  }
  
  if (error || !agent) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Agent not found"}. Please try again or select a different agent.
          </AlertDescription>
        </Alert>
        
        <Button asChild>
          <Link href="/dashboard/agents">View All Agents</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb navigation */}
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard/agents">Agents</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink>{agent.name}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
          <p className="text-muted-foreground">Trading Agent Management</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={agent.status === 'active' ? "success" : agent.status === 'paused' ? "warning" : "secondary"}
          >
            {agent.status}
          </Badge>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
      
      {/* Agent overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agent Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">ID:</dt>
                <dd className="text-sm">{agent.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Type:</dt>
                <dd className="text-sm">{agent.role}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Status:</dt>
                <dd className="text-sm">{agent.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Farm:</dt>
                <dd className="text-sm">
                  <Link href={`/dashboard/farms/${agent.farm_id}`} className="text-blue-600 hover:underline">
                    Farm {agent.farm_id}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Strategy:</dt>
                <dd className="text-sm">
                  <Link href={`/dashboard/brain/strategies/${agent.strategy_id}`} className="text-blue-600 hover:underline">
                    Strategy {agent.strategy_id}
                  </Link>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">30-Day Return</span>
                <div className="flex items-center">
                  <span className={agent.performance > 0 ? "text-green-600" : "text-red-600"}>
                    {agent.performance > 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </span>
                  <span className={`text-lg font-bold ${agent.performance > 0 ? "text-green-600" : "text-red-600"}`}>
                    {agent.performance > 0 ? '+' : ''}{agent.performance}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Transactions</span>
                <span className="text-sm font-medium">267</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Win Rate</span>
                <span className="text-sm font-medium">68%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Risk Score</span>
                <span className="text-sm font-medium">Medium (4.2)</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">BTC-USD</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline">Long</Badge>
                  <span className="text-sm font-medium">0.35 BTC</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">ETH-USD</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline">Long</Badge>
                  <span className="text-sm font-medium">4.2 ETH</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">SOL-USD</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline">Short</Badge>
                  <span className="text-sm font-medium">75 SOL</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs for agent content */}
      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="console">
            <Terminal className="h-4 w-4 mr-2" />
            Command Console
          </TabsTrigger>
          <TabsTrigger value="instructions">
            <FileText className="h-4 w-4 mr-2" />
            Instructions
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>
        
        {/* Dashboard tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Chart</CardTitle>
              <CardDescription>30-day performance compared to market</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceData ? (
                <Chart 
                  type="area"
                  series={performanceData.series}
                  options={performanceData.options}
                  height={280}
                />
              ) : (
                <Skeleton className="h-[280px] w-full" />
              )}
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Most recent trading activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm font-medium">BTC-USD Long</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Buy 0.15 BTC
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm font-medium">SOL-USD Short</p>
                      <p className="text-xs text-muted-foreground">5 hours ago</p>
                    </div>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Sell 75 SOL
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm font-medium">ETH-USD Long</p>
                      <p className="text-xs text-muted-foreground">12 hours ago</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Buy 2.5 ETH
                    </Badge>
                  </div>
                  <Button variant="outline" className="w-full">
                    View All Transactions
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Agent Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Profit Factor</p>
                      <p className="text-lg font-bold">2.36</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
                      <p className="text-lg font-bold">1.84</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Drawdown (Max)</p>
                      <p className="text-lg font-bold">7.2%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Win/Loss Ratio</p>
                      <p className="text-lg font-bold">2.13</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Avg Trade Duration</p>
                      <p className="text-lg font-bold">16.2h</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Avg Profit per Trade</p>
                      <p className="text-lg font-bold">1.37%</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Full Performance Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Command Console tab */}
        <TabsContent value="console" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>ElizaOS Agent Console</AlertTitle>
            <AlertDescription>
              Use natural language commands to interact with this trading agent.
              Try commands like "status", "positions", "strategy", or "performance".
            </AlertDescription>
          </Alert>
          
          <CommandTerminal
            title={`${agent.name} Command Console`}
            messages={commandMessages}
            onSendCommand={handleSendCommand}
            isLoading={isProcessingCommand}
            fullWidth={true}
            maxHeight="500px"
          />
        </TabsContent>
        
        {/* Instructions tab */}
        <TabsContent value="instructions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Instructions</CardTitle>
              <CardDescription>Trading rules and parameters for this agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Trading Strategy</h3>
                <p className="text-muted-foreground mt-1">
                  This agent implements a momentum-based trading strategy focusing on large-cap cryptocurrencies.
                  It uses multiple timeframe analysis with RSI, MACD, and volume indicators to identify trend strength
                  and potential reversal points.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Trading Parameters</h3>
                <dl className="mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <dt className="text-sm font-medium text-muted-foreground">Risk Percentage</dt>
                    <dd className="text-sm">2% per trade</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <dt className="text-sm font-medium text-muted-foreground">Timeframes</dt>
                    <dd className="text-sm">1H, 4H, 1D</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <dt className="text-sm font-medium text-muted-foreground">Position Sizing</dt>
                    <dd className="text-sm">ATR-based</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <dt className="text-sm font-medium text-muted-foreground">Max Open Positions</dt>
                    <dd className="text-sm">5</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <dt className="text-sm font-medium text-muted-foreground">Allowed Assets</dt>
                    <dd className="text-sm">BTC, ETH, SOL, AVAX, DOT</dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Exit Rules</h3>
                <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-1">
                  <li>Take profit at 3.5x ATR</li>
                  <li>Stop loss at 1.5x ATR</li>
                  <li>Trailing stop activated after 2x ATR profit</li>
                  <li>Time-based exit after 72 hours of sideways price action</li>
                </ul>
              </div>
              
              <Button variant="outline">
                Edit Instructions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* History tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent History</CardTitle>
              <CardDescription>Performance history and key events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Recent Actions</h3>
                  <div className="border-l-2 border-muted pl-4 space-y-6">
                    <div className="relative">
                      <div className="absolute -left-[25px] top-1 h-4 w-4 rounded-full bg-primary"></div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Executed Trade</p>
                        <p className="text-xs text-muted-foreground">Apr 2, 2025 at 14:32</p>
                        <p className="text-sm mt-1">Bought 0.15 BTC at $61,240 with stop loss at $59,850</p>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[25px] top-1 h-4 w-4 rounded-full bg-primary"></div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Strategy Update</p>
                        <p className="text-xs text-muted-foreground">Apr 1, 2025 at 18:19</p>
                        <p className="text-sm mt-1">Updated risk parameters from 1.5% to 2% per trade based on reduced market volatility</p>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[25px] top-1 h-4 w-4 rounded-full bg-primary"></div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Performance Alert</p>
                        <p className="text-xs text-muted-foreground">Mar 30, 2025 at 09:44</p>
                        <p className="text-sm mt-1">Exceeded performance target with 30-day return of 12.8%</p>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[25px] top-1 h-4 w-4 rounded-full bg-primary"></div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Executed Trade</p>
                        <p className="text-xs text-muted-foreground">Mar 28, 2025 at 22:15</p>
                        <p className="text-sm mt-1">Shorted 75 SOL at $142.80 with stop loss at $149.75</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  View Complete History
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
