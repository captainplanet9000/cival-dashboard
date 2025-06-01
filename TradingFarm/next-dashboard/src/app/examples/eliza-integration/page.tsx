'use client';

import React from 'react';
import ElizaCommandConsole from '@/components/eliza/ElizaCommandConsole';
import KnowledgeManager from '@/components/eliza/KnowledgeManager';
import { elizaClient, AgentConfiguration } from '@/utils/eliza/eliza-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, Database, Settings, TerminalSquare, 
  Brain, ArrowRight, BarChart3, Zap, Info
} from 'lucide-react';

export default function ElizaIntegrationExample() {
  interface Agent {
    id: number; 
    name: string; 
    description: string | null;
    type?: string;
    configuration?: {
      strategy?: string;
      risk_level?: string;
      markets?: string[];
      eliza?: {
        connected?: boolean;
        capabilities?: string[];
      }
    }
  }

  interface Farm {
    id: number;
    name: string;
    description: string | null;
  }

  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [farms, setFarms] = React.useState<Farm[]>([]);
  const [selectedAgentId, setSelectedAgentId] = React.useState<number | null>(null);
  const [selectedFarmId, setSelectedFarmId] = React.useState<number | null>(null);
  const [isCreatingAgent, setIsCreatingAgent] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load farms
      const farmsResponse = await fetch('/api/supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rpc',
          params: {
            fn: 'get_farms',
            args: [],
            databaseName: 'neondb',
            projectId: 'default'
          }
        })
      });
      
      const farmsResult = await farmsResponse.json();
      
      if (farmsResult.success && farmsResult.data) {
        setFarms(farmsResult.data);
        
        if (farmsResult.data.length > 0) {
          setSelectedFarmId(farmsResult.data[0].id);
          
          // Load agents for this farm
          await loadAgentsForFarm(farmsResult.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAgentsForFarm = async (farmId: number) => {
    try {
      const agentsResponse = await fetch('/api/supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rpc',
          params: {
            fn: 'get_agents',
            args: [farmId],
            databaseName: 'neondb',
            projectId: 'default'
          }
        })
      });
      
      const agentsResult = await agentsResponse.json();
      
      if (agentsResult.success && agentsResult.data) {
        setAgents(agentsResult.data);
        
        if (agentsResult.data.length > 0) {
          setSelectedAgentId(agentsResult.data[0].id);
        } else {
          setSelectedAgentId(null);
        }
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const createDemoAgent = async () => {
    setIsCreatingAgent(true);
    
    try {
      // Create a new agent
      const agentsResponse = await fetch('/api/supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rpc',
          params: {
            fn: 'create_test_agent',
            args: [
              selectedFarmId,
              'Trading Bot Alpha',
              'An automated trading bot that uses MACD and RSI indicators',
              'eliza_ai',
              JSON.stringify({"strategy": "mean_reversion", "risk_level": "medium", "markets": ["BTC/USD", "ETH/USD"]})
            ],
            databaseName: 'neondb',
            projectId: 'default'
          }
        })
      });
      
      const agentResult = await agentsResponse.json();
      
      if (agentResult.success && agentResult.data) {
        const newAgentId = agentResult.data[0].id;
        
        // Connect to ElizaOS
        const elizaResponse = await elizaClient.connectAgent(
          newAgentId,
          'full',
          ['market_data', 'portfolio_query', 'trading_execution', 'knowledge_access']
        );
        
        // Store some knowledge for this agent
        await elizaClient.storeKnowledge(
          'Mean Reversion Trading Strategy',
          'Mean reversion is a mathematical concept that suggests that asset prices and returns eventually normalize back to the average or mean. In financial markets, this theory suggests that when asset prices deviate significantly from their historical average, they will tend to move back toward that average over time.\n\nKey concepts:\n- Look for assets that have deviated significantly from their moving average\n- Wait for signs of reversal before entering a position\n- Set stop-loss orders to manage risk\n- Take profit when the price returns to the mean',
          ['strategy', 'mean_reversion', 'trading'],
          [newAgentId]
        );
        
        await elizaClient.storeKnowledge(
          'Market Analysis: Bitcoin Volatility',
          `Bitcoin has historically demonstrated high volatility, with significant price movements in short timeframes. This volatility presents both opportunities and risks for traders.

Key insights:
- Bitcoin's volatility has decreased over time as market cap has grown
- Typical intraday volatility ranges from 1-3%
- Major news events can trigger volatility spikes of 10% or more
- Weekend trading tends to show higher volatility with lower liquidity`,
          ['market_analysis', 'bitcoin', 'volatility'],
          [newAgentId]
        );
        
        // Reload agents
        await loadAgentsForFarm(selectedFarmId!);
        setSelectedAgentId(newAgentId);
      }
    } catch (error) {
      console.error('Error creating demo agent:', error);
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const currentAgent = agents.find(agent => agent.id === selectedAgentId);
  
  const renderAgentItem = (agent: Agent) => {
    return (
      <div
        key={agent.id}
        className={`p-3 border rounded mb-2 cursor-pointer hover:bg-gray-100 
          ${selectedAgentId === agent.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
        onClick={() => setSelectedAgentId(agent.id)}
      >
        <h4 className="text-sm font-medium mb-1">{agent.name}</h4>
        <p className="text-sm">{agent.description}</p>
      </div>
    );
  };

  const renderFarmItem = (farm: Farm) => {
    return (
      <div
        key={farm.id}
        className={`p-3 border rounded mb-2 cursor-pointer hover:bg-gray-100 
          ${selectedFarmId === farm.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
        onClick={() => setSelectedFarmId(farm.id)}
      >
        <h4 className="text-sm font-medium mb-1">{farm.name}</h4>
        <p className="text-sm">{farm.description}</p>
      </div>
    );
  };

  const renderAgent = (agent: Agent) => {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {agent.name}
          </CardTitle>
          <CardDescription>
            {agent.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Strategy</h4>
              <p className="text-sm">
                {agent.configuration?.strategy || 'Not configured'}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-1">Risk Level</h4>
              <p className="text-sm">
                {agent.configuration?.risk_level || 'Not configured'}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-1">Markets</h4>
              <div className="flex flex-wrap gap-1">
                {agent.configuration?.markets?.map((market: string) => (
                  <span key={market} className="px-2 py-0.5 text-xs bg-muted rounded-full">
                    {market}
                  </span>
                )) || 'No markets configured'}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-1">ElizaOS Connection</h4>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${agent.configuration?.eliza?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <p className="text-sm">
                  {agent.configuration?.eliza?.connected ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            
            {agent.configuration?.eliza?.connected && (
              <div>
                <h4 className="text-sm font-medium mb-1">ElizaOS Capabilities</h4>
                <div className="flex flex-wrap gap-1">
                  {agent.configuration?.eliza?.capabilities?.map((cap: string) => (
                    <span key={cap} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                      {cap.replace('_', ' ')}
                    </span>
                  )) || 'No capabilities configured'}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">ElizaOS Integration</h1>
          <p className="text-muted-foreground">
            AI-powered trading agents with knowledge management and natural language commands
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <select
              className="rounded-md border border-input px-3 py-2 bg-background"
              value={selectedFarmId || ''}
              onChange={(e) => {
                const farmId = parseInt(e.target.value);
                setSelectedFarmId(farmId);
                loadAgentsForFarm(farmId);
              }}
            >
              {farms.map(farm => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
            
            <select
              className="rounded-md border border-input px-3 py-2 bg-background"
              value={selectedAgentId || ''}
              onChange={(e) => setSelectedAgentId(parseInt(e.target.value))}
              disabled={agents.length === 0}
            >
              {agents.length === 0 ? (
                <option>No agents available</option>
              ) : (
                agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))
              )}
            </select>
          </div>
          
          <Button
            onClick={createDemoAgent}
            disabled={isCreatingAgent || !selectedFarmId}
          >
            <Zap className="h-4 w-4 mr-2" />
            Create Demo Agent
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-[600px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : selectedAgentId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column for agent information */}
          <div className="space-y-6">
            {renderAgent(currentAgent!)}
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  ElizaOS Integration Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <p>
                    ElizaOS provides AI-powered capabilities for your trading agents through:
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MessageCircle className="h-4 w-4 mt-0.5" />
                      <p><strong>Command Console</strong> - Interact with your agent using natural language</p>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Database className="h-4 w-4 mt-0.5" />
                      <p><strong>Knowledge Management</strong> - Store and retrieve trading strategies and market insights</p>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <BarChart3 className="h-4 w-4 mt-0.5" />
                      <p><strong>Trading Analytics</strong> - Get AI-powered insights on portfolio performance</p>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <TerminalSquare className="h-4 w-4 mt-0.5" />
                      <p><strong>Command Execution</strong> - Execute trading operations through simple commands</p>
                    </div>
                  </div>
                  
                  <p>
                    Try asking the agent about its strategy, market analysis, or portfolio performance through the command console.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Middle and right columns for command console and knowledge manager */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="command-console">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="command-console" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Command Console
                </TabsTrigger>
                <TabsTrigger value="knowledge-manager" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Knowledge Manager
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="command-console" className="mt-0">
                <div className="h-[600px]">
                  <ElizaCommandConsole 
                    agentId={selectedAgentId} 
                    farmId={selectedFarmId!} 
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="knowledge-manager" className="mt-0">
                <div className="h-[600px]">
                  <KnowledgeManager 
                    agentId={selectedAgentId} 
                    farmId={selectedFarmId} 
                    allowEdit={true}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/40">
          <Brain className="h-12 w-12 mb-4 text-muted-foreground" />
          <h2 className="text-xl font-medium mb-2">No Agent Selected</h2>
          <p className="text-muted-foreground text-center mb-6">
            Select a farm and agent or create a demo agent to see the ElizaOS integration in action.
          </p>
          
          <Button onClick={createDemoAgent} disabled={isCreatingAgent || !selectedFarmId}>
            <Zap className="h-4 w-4 mr-2" />
            Create Demo Agent
          </Button>
        </div>
      )}
    </div>
  );
}
