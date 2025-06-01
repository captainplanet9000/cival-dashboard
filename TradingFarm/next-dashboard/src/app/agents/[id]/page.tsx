"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AgentMonitorDashboard } from '@/components/agents/agent-monitor-dashboard';
import { AgentCommandConsole } from '@/components/agents/agent-command-console';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSocket } from '@/providers/socket-provider';
import { TRADING_EVENTS } from '@/constants/socket-events';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Bot, 
  Settings, 
  Activity,
  Trash2, 
  AlertTriangle, 
  LineChart,
  Clock,
  RefreshCw,
  Terminal,
  MessageSquare
} from 'lucide-react';

export default function AgentPage() {
  const params = useParams();
  const { socket } = useSocket();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const agentId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  
  useEffect(() => {
    // In a real app, fetch the agent data from the API
    const fetchAgentData = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Sample agent data
        setAgent({
          id: agentId,
          name: "Trend Navigator",
          status: "active",
          specialization: ["trend_following"]
        });
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching agent data:", error);
        setError("Failed to load agent data. Please try again.");
        setLoading(false);
      }
    };
    
    fetchAgentData();
  }, [agentId]);
  
  if (error) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/agents">Agents</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>Error</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <Button asChild>
          <Link href="/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/agents">Agents</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>
            {loading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              agent?.name || "Agent Details"
            )}
          </BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button asChild variant="outline" size="sm" className="mr-2">
            <Link href="/agents">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          
          <h1 className="text-2xl font-bold">
            {loading ? <Skeleton className="h-8 w-64" /> : agent?.name}
            {agent?.status && (
              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                agent.status === 'active' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300' 
                  : agent.status === 'paused'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-300'
              }`}>
                {agent.status}
              </span>
            )}
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/agents/${agentId}/edit`}>
              <Settings className="mr-2 h-4 w-4" />
              Edit Agent
            </Link>
          </Button>
          
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">
            <Activity className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="command">
            <Terminal className="h-4 w-4 mr-2" />
            Command Console
          </TabsTrigger>
          <TabsTrigger value="instructions">
            <MessageSquare className="h-4 w-4 mr-2" />
            Instructions
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <AgentMonitorDashboard agentId={agentId} />
          )}
        </TabsContent>
        
        <TabsContent value="command" className="space-y-4">
          <div className="bg-background rounded-lg border min-h-[600px]">
            <AgentCommandConsole agentId={agentId} agentName={agent?.name} />
          </div>
        </TabsContent>
        
        <TabsContent value="instructions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Agent Instructions
              </CardTitle>
              <CardDescription>
                Natural language instructions that guide the agent's behavior and decision-making process.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md bg-muted p-4">
                    <h3 className="text-sm font-medium mb-2">Trading Instructions</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      <li>Focus on strong trends only, avoid trading in consolidation phases</li>
                      <li>Exit positions when RSI indicates overbought/oversold conditions</li>
                      <li>Maintain position sizing within risk parameters, max 5% per trade</li>
                      <li>Prioritize technical analysis over news-based triggers</li>
                    </ul>
                  </div>
                  
                  <div className="rounded-md bg-muted p-4">
                    <h3 className="text-sm font-medium mb-2">Risk Management</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      <li>Set stop loss at key support/resistance levels</li>
                      <li>Use trailing stops when in profit beyond 2%</li>
                      <li>Close all positions if drawdown exceeds 10%</li>
                      <li>Reduce position size after two consecutive losses</li>
                    </ul>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Edit Instructions
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Agent History
              </CardTitle>
              <CardDescription>
                Historical performance and configuration changes for this agent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Detailed agent history view is under development.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
