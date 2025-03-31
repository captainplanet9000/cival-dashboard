'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bot, Brain, BookOpen, HardDrive, AlertCircle, ArrowLeft, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { createAgent, updateAgent } from '@/app/actions/agent-actions';
import { getStrategyById } from '@/app/actions/strategy-actions';
import { useWebSocket } from '@/components/websocket-provider';

export default function DeployStrategyPage() {
  const params = useParams();
  const strategyId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { isConnected } = useWebSocket();
  
  const [strategy, setStrategy] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  
  const [agentName, setAgentName] = React.useState('');
  const [riskTolerance, setRiskTolerance] = React.useState('medium');
  const [maxPositionSize, setMaxPositionSize] = React.useState('1000');
  const [enableAI, setEnableAI] = React.useState(true);
  const [agentInstructions, setAgentInstructions] = React.useState('');
  const [autoExecution, setAutoExecution] = React.useState(false);
  const [enableKnowledgeBase, setEnableKnowledgeBase] = React.useState(true);
  const [exchangeConfig, setExchangeConfig] = React.useState({
    exchange: 'binance',
    apiKey: '',
    apiSecret: '',
    testnet: true
  });
  
  // Fetch strategy details
  React.useEffect(() => {
    const fetchStrategy = async () => {
      if (strategyId) {
        try {
          const result = await getStrategyById(strategyId);
          if (result.success && result.data) {
            setStrategy(result.data);
            // Set default agent name based on strategy
            setAgentName(`${result.data.name} Agent`);
            // Set default instructions based on strategy description
            if (result.data.description) {
              setAgentInstructions(
                `Execute the strategy "${result.data.name}" with the following objectives:\n` +
                `- ${result.data.description}\n` +
                '- Monitor market conditions for favorable entry points\n' +
                '- Manage risk according to the configured risk parameters\n' +
                '- Report performance metrics and insights'
              );
            }
          } else {
            toast.error(`Error fetching strategy: ${result.error}`);
          }
        } catch (error) {
          console.error('Error fetching strategy:', error);
          toast.error('Failed to load strategy details');
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchStrategy();
  }, [strategyId]);
  
  // Handle saving the agent configuration
  const handleSave = async () => {
    if (!strategy) return;
    
    if (!agentName) {
      toast.error('Please enter an agent name');
      return;
    }
    
    setSaving(true);
    
    try {
      // Prepare agent data
      const agentData = {
        name: agentName,
        strategy_id: strategyId,
        is_active: false,
        risk_profile: {
          risk_tolerance: riskTolerance,
          max_position_size: parseFloat(maxPositionSize),
          auto_execution: autoExecution,
        },
        exchange_config: exchangeConfig,
        ai_config: {
          enabled: enableAI,
          instructions: agentInstructions,
          use_knowledge_base: enableKnowledgeBase,
        },
        capital_allocation: 0, // Initially zero until explicitly allocated
        metadata: {
          created_from_builder: true,
          strategy_version: strategy.version
        }
      };
      
      // Save agent
      const result = await createAgent(agentData);
      
      if (result.success) {
        toast.success('Agent configuration saved successfully');
        // Navigate to the agent detail page
        router.push(`/dashboard/agents/${result.data.id}`);
      } else {
        toast.error(`Failed to create agent: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Failed to save agent configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!strategy) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center p-6">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">Strategy Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The requested strategy could not be found or you don't have permission to access it.
              </p>
              <Button onClick={() => router.push('/dashboard/strategies')}>
                Back to Strategies
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Deploy Strategy as Agent</h1>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="ml-auto"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Configuration</CardTitle>
              <CardDescription>
                Configure the basic settings for your trading agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Agent Name</Label>
                  <Input
                    id="agent-name"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="Enter a name for this agent"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="risk-tolerance">Risk Tolerance</Label>
                  <Select 
                    value={riskTolerance} 
                    onValueChange={setRiskTolerance}
                  >
                    <SelectTrigger id="risk-tolerance">
                      <SelectValue placeholder="Select risk tolerance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-position">Maximum Position Size</Label>
                  <Input
                    id="max-position"
                    type="number"
                    value={maxPositionSize}
                    onChange={(e) => setMaxPositionSize(e.target.value)}
                    placeholder="Enter maximum position size"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-execution">Auto Execution</Label>
                    <Switch
                      id="auto-execution"
                      checked={autoExecution}
                      onCheckedChange={setAutoExecution}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Allow the agent to execute trades automatically
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Exchange Configuration</CardTitle>
              <CardDescription>
                Connect your agent to a cryptocurrency exchange
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exchange">Exchange</Label>
                  <Select 
                    value={exchangeConfig.exchange} 
                    onValueChange={(value) => setExchangeConfig({...exchangeConfig, exchange: value})}
                  >
                    <SelectTrigger id="exchange">
                      <SelectValue placeholder="Select exchange" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="binance">Binance</SelectItem>
                      <SelectItem value="coinbase">Coinbase</SelectItem>
                      <SelectItem value="ftx">FTX</SelectItem>
                      <SelectItem value="kraken">Kraken</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="testnet">Use Testnet</Label>
                    <Switch
                      id="testnet"
                      checked={exchangeConfig.testnet}
                      onCheckedChange={(value) => setExchangeConfig({...exchangeConfig, testnet: value})}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use test environment (recommended for new strategies)
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    value={exchangeConfig.apiKey}
                    onChange={(e) => setExchangeConfig({...exchangeConfig, apiKey: e.target.value})}
                    placeholder="Enter exchange API key"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="api-secret">API Secret</Label>
                  <Input
                    id="api-secret"
                    type="password"
                    value={exchangeConfig.apiSecret}
                    onChange={(e) => setExchangeConfig({...exchangeConfig, apiSecret: e.target.value})}
                    placeholder="Enter exchange API secret"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>ElizaOS AI Configuration</CardTitle>
              <CardDescription>
                Configure the AI capabilities for this trading agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable-ai">Enable ElizaOS AI</Label>
                  <p className="text-sm text-muted-foreground">
                    Leverage AI for enhanced trading decisions
                  </p>
                </div>
                <Switch
                  id="enable-ai"
                  checked={enableAI}
                  onCheckedChange={setEnableAI}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="knowledge-base">Use Knowledge Base</Label>
                  <Switch
                    id="knowledge-base"
                    checked={enableKnowledgeBase}
                    onCheckedChange={setEnableKnowledgeBase}
                    disabled={!enableAI}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Allow agent to access and utilize the trading knowledge base
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agent-instructions">Agent Instructions</Label>
                <Textarea
                  id="agent-instructions"
                  value={agentInstructions}
                  onChange={(e) => setAgentInstructions(e.target.value)}
                  placeholder="Provide specific instructions for this agent"
                  className="min-h-[150px]"
                  disabled={!enableAI}
                />
                <p className="text-sm text-muted-foreground">
                  Natural language instructions for ElizaOS to follow when executing this strategy
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Strategy Name</h3>
                  <p>{strategy.name}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Description</h3>
                  <p className="text-sm text-muted-foreground">{strategy.description || 'No description provided'}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Type</h3>
                  <p className="text-sm">{strategy.type || 'Custom'}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Version</h3>
                  <p className="text-sm">{strategy.version || '1.0'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>ElizaOS Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{isConnected ? 'Connected to ElizaOS' : 'Disconnected from ElizaOS'}</span>
              </div>
              
              {!isConnected && (
                <p className="text-sm text-amber-500 mb-4">
                  ElizaOS connection is required for AI-powered trading. Check your WebSocket connection.
                </p>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Brain className="h-5 w-5 mr-2 text-blue-500" />
                  <span>AI Capabilities</span>
                </div>
                <p className="text-sm text-muted-foreground pl-7">
                  Market analysis, performance optimization, risk management
                </p>
              </div>
              
              <div className="space-y-2 mt-4">
                <div className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-amber-500" />
                  <span>Knowledge Base</span>
                </div>
                <p className="text-sm text-muted-foreground pl-7">
                  Trading strategies, market patterns, historical analysis
                </p>
              </div>
              
              <div className="space-y-2 mt-4">
                <div className="flex items-center">
                  <HardDrive className="h-5 w-5 mr-2 text-green-500" />
                  <span>Operational Model</span>
                </div>
                <p className="text-sm text-muted-foreground pl-7">
                  Semi-autonomous with human oversight and instruction-based execution
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
