"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, Bot, Brain, BarChart2, TrendingUp, TrendingDown, 
  RefreshCw, MessageSquare, Zap, Lock, Database, 
  LayoutDashboard, ExternalLink, AlertTriangle, Globe
} from "lucide-react";
import Link from "next/link";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ExtendedAgent, agentService } from "@/services/agent-service";
import { useSocket } from "@/providers/socket-provider";

interface SystemStatus {
  llmIntegration: boolean;
  elizaIntegration: boolean;
  exchangeConnections: {
    bybit: boolean;
    coinbase: boolean;
    hyperliquid: boolean;
  };
  databaseConnection: boolean;
  agentsActive: number;
  totalAgents: number;
}

interface ApiUsage {
  service: string;
  used: number;
  limit: number;
  cost: number;
}

export default function OverviewPage() {
  const { toast } = useToast();
  const { isConnected } = useSocket();
  const supabase = createBrowserClient();
  
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<ExtendedAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    llmIntegration: false,
    elizaIntegration: false,
    exchangeConnections: {
      bybit: false,
      coinbase: false,
      hyperliquid: false
    },
    databaseConnection: false,
    agentsActive: 0,
    totalAgents: 0
  });
  
  const [apiUsage, setApiUsage] = useState<ApiUsage[]>([
    { service: "OpenRouter", used: 0, limit: 1000, cost: 0 },
    { service: "Google Gemini", used: 0, limit: 500, cost: 0 },
    { service: "MarketStack", used: 0, limit: 100, cost: 0 },
    { service: "Eleven Labs", used: 0, limit: 50, cost: 0 }
  ]);
  
  // Fetch agents
  useEffect(() => {
    fetchAgents();
    checkSystemStatus();
  }, []);
  
  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const fetchedAgents = await agentService.getAgents();
      setAgents(fetchedAgents || []);
      
      // Count agents with LLM capability
      const agentsWithLlm = fetchedAgents.filter(agent => 
        agent.capabilities?.includes('llm') || agent.capabilities?.includes('chat')
      ).length;
      
      setSystemStatus(prev => ({
        ...prev,
        agentsActive: agentsWithLlm,
        totalAgents: fetchedAgents.length
      }));
      
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load agents',
        variant: 'destructive'
      });
    } finally {
      setLoadingAgents(false);
    }
  };
  
  const checkSystemStatus = async () => {
    setLoading(true);
    try {
      // Check database connection
      const { data, error } = await supabase.from('api_service_providers').select('count');
      if (!error) {
        setSystemStatus(prev => ({
          ...prev,
          databaseConnection: true
        }));
        
        // If we have API providers, consider LLM integration active
        if (data && data.length > 0) {
          setSystemStatus(prev => ({
            ...prev,
            llmIntegration: true
          }));
          
          // Mock fetch API usage (would be real in production)
          fetchApiUsage();
        }
      }
      
      // Check Eliza integration (mock check for demo)
      const elizaActive = Boolean(localStorage.getItem('elizaIntegrationActive'));
      setSystemStatus(prev => ({
        ...prev,
        elizaIntegration: elizaActive
      }));
      
      // Mock exchange connection status
      setSystemStatus(prev => ({
        ...prev,
        exchangeConnections: {
          bybit: true,
          coinbase: Math.random() > 0.5,
          hyperliquid: Math.random() > 0.7
        }
      }));
      
    } catch (error) {
      console.error('Error checking system status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchApiUsage = () => {
    // This would be a real API call in production
    // Mocking for demo
    setApiUsage([
      { service: "OpenRouter", used: 327, limit: 1000, cost: 0.43 },
      { service: "Google Gemini", used: 158, limit: 500, cost: 0.12 },
      { service: "MarketStack", used: 47, limit: 100, cost: 0.08 },
      { service: "Eleven Labs", used: 12, limit: 50, cost: 0.22 }
    ]);
  };
  
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Trading Farm Overview</h1>
        <Button onClick={() => { checkSystemStatus(); fetchAgents(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* System Status Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            System Status
          </CardTitle>
          <CardDescription>
            Current status of Trading Farm components and integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatusCard 
              title="LLM Integration" 
              status={systemStatus.llmIntegration} 
              icon={<MessageSquare className="h-5 w-5" />}
              description="OpenRouter, Claude, GPT-4o, and other language models"
              href="/dashboard/agents/llm-configuration"
            />
            <StatusCard 
              title="ElizaOS Integration" 
              status={systemStatus.elizaIntegration} 
              icon={<Brain className="h-5 w-5" />}
              description="AI agent framework with knowledge management"
              href="/dashboard/eliza"
            />
            <StatusCard 
              title="Database Connection" 
              status={systemStatus.databaseConnection} 
              icon={<Database className="h-5 w-5" />}
              description="Supabase PostgreSQL database with vector capabilities"
            />
            <StatusCard 
              title="Agent Network" 
              status={systemStatus.agentsActive > 0} 
              icon={<Bot className="h-5 w-5" />}
              description={`${systemStatus.agentsActive} of ${systemStatus.totalAgents} agents active with LLM capability`}
              href="/dashboard/agents"
            />
            <StatusCard 
              title="Exchange: Bybit" 
              status={systemStatus.exchangeConnections.bybit} 
              icon={<Globe className="h-5 w-5" />}
              description="Primary trading exchange connection"
              href="/dashboard/exchange"
            />
            <StatusCard 
              title="WebSocket Connection" 
              status={isConnected} 
              icon={<Zap className="h-5 w-5" />}
              description="Real-time data and order updates"
            />
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Features */}
      <Tabs defaultValue="llm" className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="llm">LLM Integration</TabsTrigger>
          <TabsTrigger value="eliza">ElizaOS</TabsTrigger>
          <TabsTrigger value="agents">Trading Agents</TabsTrigger>
          <TabsTrigger value="api">API Services</TabsTrigger>
        </TabsList>
        
        {/* LLM Integration Tab */}
        <TabsContent value="llm">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                LLM Integration
              </CardTitle>
              <CardDescription>
                Leverage powerful language models in your trading agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md">Available Models</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <ModelBadge name="Claude 3 Opus" provider="Anthropic" tier="premium" />
                        <ModelBadge name="GPT-4o" provider="OpenAI" tier="premium" />
                        <ModelBadge name="Claude 3 Sonnet" provider="Anthropic" tier="standard" />
                        <ModelBadge name="Gemini Pro" provider="Google" tier="standard" />
                        <ModelBadge name="Llama 3 70B" provider="Meta" tier="standard" />
                        <ModelBadge name="DeepSeek Coder" provider="DeepSeek" tier="specialized" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md">LLM Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        <li className="flex items-center text-sm">
                          <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                          Market analysis with specialized context
                        </li>
                        <li className="flex items-center text-sm">
                          <Lock className="mr-2 h-4 w-4 text-amber-500" />
                          Secure API key management
                        </li>
                        <li className="flex items-center text-sm">
                          <Bot className="mr-2 h-4 w-4 text-blue-500" />
                          Agent-specific model selection
                        </li>
                        <li className="flex items-center text-sm">
                          <BarChart2 className="mr-2 h-4 w-4 text-purple-500" />
                          Usage tracking and cost management
                        </li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button asChild className="w-full">
                        <Link href="/dashboard/agents/llm-configuration">
                          Configure LLM Settings
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* ElizaOS Tab */}
        <TabsContent value="eliza">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="mr-2 h-5 w-5" />
                ElizaOS Integration
              </CardTitle>
              <CardDescription>
                Advanced AI agent framework with knowledge management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md">Knowledge Base</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Market Analysis Documents</span>
                        <span className="font-semibold">42</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Strategy Frameworks</span>
                        <span className="font-semibold">18</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Risk Management Protocols</span>
                        <span className="font-semibold">7</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Trading Algorithms</span>
                        <span className="font-semibold">15</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/dashboard/brain/knowledge">
                        Manage Knowledge Base
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md">Command Console</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p>Issue natural language commands to your Trading Farm:</p>
                      <div className="bg-muted p-2 rounded-md text-xs font-mono">
                        <div>$ show portfolio summary</div>
                        <div>$ analyze market sentiment for BTC</div>
                        <div>$ execute trade strategy alpha-3</div>
                        <div>$ get vault balance</div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link href="/dashboard/command-console">
                        Open Command Console
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Agents Tab */}
        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="mr-2 h-5 w-5" />
                Trading Agents
              </CardTitle>
              <CardDescription>
                AI-powered agents for automated trading strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadingAgents ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : agents.length > 0 ? (
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {agents.map((agent) => (
                        <Card key={agent.id} className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-semibold">{agent.name}</h3>
                              <p className="text-xs text-muted-foreground">{agent.description || 'No description'}</p>
                              <div className="flex space-x-2 mt-1">
                                {agent.capabilities?.includes('llm') && (
                                  <Badge variant="outline">LLM Enabled</Badge>
                                )}
                                {agent.status === 'active' && (
                                  <Badge variant="outline">Active</Badge>
                                )}
                              </div>
                            </div>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/dashboard/agents/${agent.id}`}>
                                View
                              </Link>
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No agents found</p>
                    <Button asChild>
                      <Link href="/dashboard/agents">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Agent
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/agents/llm-configuration">
                  Configure Agent LLM Settings
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* API Services Tab */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ExternalLink className="mr-2 h-5 w-5" />
                API Services
              </CardTitle>
              <CardDescription>
                External services integration and usage metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiUsage.map((api) => (
                  <div key={api.service} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{api.service}</div>
                      <div className="text-sm">
                        ${api.cost.toFixed(2)} | {api.used} / {api.limit}
                      </div>
                    </div>
                    <Progress value={(api.used / api.limit) * 100} />
                  </div>
                ))}
                
                <Card className="mt-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md">Available Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <ServiceBadge name="OpenRouter" category="LLM" />
                      <ServiceBadge name="Google Services" category="LLM" />
                      <ServiceBadge name="Eleven Labs" category="Voice" />
                      <ServiceBadge name="MarketStack" category="Market Data" />
                      <ServiceBadge name="CoinAPI" category="Crypto Data" />
                      <ServiceBadge name="Bybit API" category="Exchange" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// StatusCard Component
interface StatusCardProps {
  title: string;
  status: boolean;
  icon?: React.ReactNode;
  description?: string;
  href?: string;
}

function StatusCard({ title, status, icon, description, href }: StatusCardProps) {
  const content = (
    <div className="p-4 border rounded-lg flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          {icon}
          <h3 className="font-medium ml-2">{title}</h3>
        </div>
        {status ? (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            Inactive
          </Badge>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
  
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  
  return content;
}

// ModelBadge Component
interface ModelBadgeProps {
  name: string;
  provider: string;
  tier: 'standard' | 'premium' | 'specialized';
}

function ModelBadge({ name, provider, tier }: ModelBadgeProps) {
  const tierColors = {
    standard: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    premium: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    specialized: "bg-amber-500/10 text-amber-500 border-amber-500/20"
  };
  
  return (
    <div className="flex justify-between items-center p-2 rounded-md border">
      <div>
        <div className="font-medium text-sm">{name}</div>
        <div className="text-xs text-muted-foreground">{provider}</div>
      </div>
      <Badge variant="outline" className={tierColors[tier]}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </Badge>
    </div>
  );
}

// ServiceBadge Component
interface ServiceBadgeProps {
  name: string;
  category: string;
}

function ServiceBadge({ name, category }: ServiceBadgeProps) {
  return (
    <div className="flex flex-col justify-center items-center p-2 border rounded-md">
      <div className="text-sm font-medium">{name}</div>
      <Badge variant="outline" className="mt-1 text-xs">
        {category}
      </Badge>
    </div>
  );
}
