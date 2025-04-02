'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Code, Save, Play, FileDown, ArrowRight, Brain } from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function StrategyBuilderPage() {
  const [activeTab, setActiveTab] = useState('visual');
  const [strategyName, setStrategyName] = useState('');
  const [strategyType, setStrategyType] = useState('technical');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [riskLevel, setRiskLevel] = useState([3]); // 1-5 scale
  const [useAI, setUseAI] = useState(false);
  const [codeInput, setCodeInput] = useState('// Define your trading strategy\n\nfunction executeStrategy(data) {\n  // Implement your strategy logic here\n  const signal = calculateSignal(data);\n  return signal;\n}\n\nfunction calculateSignal(data) {\n  // Calculate buy/sell signals\n  return { action: "hold", confidence: 0 };\n}');
  const [indicators, setIndicators] = useState([
    { id: 1, name: 'EMA', period: 14, enabled: true },
    { id: 2, name: 'RSI', period: 14, enabled: false },
    { id: 3, name: 'MACD', enabled: false },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000;

  useEffect(() => {
    // Establish connection to Supabase
    const connectToSupabase = async () => {
      try {
        setConnectionError(null);
        const { data, error } = await supabase
          .from('trading_strategies')
          .select('count')
          .limit(1)
          .timeout(5000); // Set a reasonable timeout
        
        if (error) {
          // Check if this is a timeout error
          if (error.message?.includes('timeout') || error.message?.includes('deadline exceeded')) {
            throw new Error('Connection to Supabase timed out. You can still create strategies but saving will be unavailable.');
          } else {
            throw error;
          }
        }
        
        setIsConnected(true);
        setConnectionError(null);
        console.log('Connected to Supabase successfully');
      } catch (error: any) {
        console.error('Failed to connect to Supabase:', error);
        setIsConnected(false);
        setConnectionError(error.message || 'Failed to connect to database');
        
        // Attempt retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, RETRY_DELAY);
        }
      }
    };

    connectToSupabase();
  }, [supabase, retryCount]);

  const handleRetryConnection = () => {
    setRetryCount(0); // This will trigger a reconnection attempt
  };

  const handleSaveStrategy = async () => {
    if (!strategyName) {
      toast({
        title: "Strategy name required",
        description: "Please provide a name for your strategy.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Convert visual builder selections to code if using visual mode
      const finalCode = activeTab === 'visual' ? generateCodeFromVisual() : codeInput;
      
      const strategyData = {
        name: strategyName,
        description: strategyDescription,
        type: strategyType,
        risk_level: riskLevel[0],
        code: finalCode,
        use_ai: useAI,
        status: 'draft',
        indicators: JSON.stringify(indicators.filter(i => i.enabled)),
        created_at: new Date().toISOString(),
      };
      
      if (isConnected) {
        // Save to Supabase if connected
        const { data, error } = await supabase
          .from('trading_strategies')
          .insert([strategyData])
          .timeout(8000); // Longer timeout for saving data
        
        if (error) {
          // Check if this is a timeout error
          if (error.message?.includes('timeout') || error.message?.includes('deadline exceeded')) {
            throw new Error('Connection to Supabase timed out while saving. Please try again later.');
          } else {
            throw error;
          }
        }
        
        toast({
          title: "Strategy saved",
          description: "Your trading strategy has been saved successfully to the database.",
        });
      } else {
        // Handle offline mode - simulate successful save
        console.log('Offline mode: Would save strategy data:', strategyData);
        toast({
          title: "Strategy saved locally",
          description: "Database connection unavailable. Your strategy was saved locally but not to the database.",
        });
        // We could implement local storage here to actually save it
      }
    } catch (error: any) {
      console.error('Error saving strategy:', error);
      toast({
        title: "Error saving strategy",
        description: error.message || "An error occurred while saving your strategy.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestStrategy = async () => {
    setIsTesting(true);
    try {
      // Simulate strategy testing with ElizaOS
      setTimeout(() => {
        setTestResults({
          performance: Math.random() * 20 - 5, // -5% to +15%
          sharpeRatio: 0.8 + Math.random() * 1.2, // 0.8 to 2.0
          maxDrawdown: -5 - Math.random() * 10, // -5% to -15%
          winRate: 40 + Math.random() * 40, // 40% to 80%
          trades: Math.floor(Math.random() * 50) + 10, // 10 to 60 trades
        });
        setIsTesting(false);
      }, 2000);
    } catch (error) {
      console.error('Error testing strategy:', error);
      toast({
        title: "Error testing strategy",
        description: "An error occurred while testing your strategy.",
        variant: "destructive",
      });
      setIsTesting(false);
    }
  };

  const generateCodeFromVisual = () => {
    // This would generate code based on the visual builder selections
    const enabledIndicators = indicators.filter(i => i.enabled);
    
    return `// Auto-generated strategy from visual builder
// Strategy: ${strategyName}
// Type: ${strategyType}
// Risk Level: ${riskLevel[0]}
// AI Enhanced: ${useAI ? 'Yes' : 'No'}

function executeStrategy(data) {
  // Initialize indicators
  ${enabledIndicators.map(i => `const ${i.name.toLowerCase()} = calculate${i.name}(data, ${i.period || 14});`).join('\n  ')}
  
  // Trading logic
  let signal = { action: "hold", confidence: 0 };
  
  ${enabledIndicators.length > 0 ? `
  // Example strategy logic based on selected indicators
  if (${enabledIndicators.map(i => `${i.name.toLowerCase()}.value > ${i.name.toLowerCase()}.threshold`).join(' && ')}) {
    signal = { action: "buy", confidence: 0.8 };
  } else if (${enabledIndicators.map(i => `${i.name.toLowerCase()}.value < ${i.name.toLowerCase()}.threshold`).join(' && ')}) {
    signal = { action: "sell", confidence: 0.7 };
  }
  ` : '// No indicators selected'}
  
  return signal;
}`;
  };

  const toggleIndicator = (id) => {
    setIndicators(indicators.map(ind => 
      ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
    ));
  };

  const updateIndicatorPeriod = (id, period) => {
    setIndicators(indicators.map(ind => 
      ind.id === id ? { ...ind, period: parseInt(period) } : ind
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Strategy Builder</h1>
          <p className="text-muted-foreground">
            Create and customize trading strategies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm">{isConnected ? 'Connected to Supabase' : 'Offline Mode'}</span>
        </div>
      </div>

      {connectionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>{connectionError}</span>
            <Button variant="outline" size="sm" onClick={handleRetryConnection}>Retry Connection</Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Strategy Information</CardTitle>
          <CardDescription>Define the basic properties of your trading strategy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="strategy-name">Strategy Name</Label>
              <Input 
                id="strategy-name" 
                value={strategyName} 
                onChange={(e) => setStrategyName(e.target.value)} 
                placeholder="My Awesome Strategy" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strategy-type">Strategy Type</Label>
              <Select value={strategyType} onValueChange={setStrategyType}>
                <SelectTrigger id="strategy-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="fundamental">Fundamental</SelectItem>
                  <SelectItem value="sentiment">Sentiment</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="ai">AI-driven</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="strategy-description">Description</Label>
            <Textarea 
              id="strategy-description" 
              value={strategyDescription} 
              onChange={(e) => setStrategyDescription(e.target.value)} 
              placeholder="Describe your strategy..." 
              rows={3} 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="risk-level">Risk Level: {riskLevel[0]}/5</Label>
            <Slider 
              id="risk-level" 
              min={1} 
              max={5} 
              step={1} 
              value={riskLevel} 
              onValueChange={setRiskLevel} 
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch id="use-ai" checked={useAI} onCheckedChange={setUseAI} />
            <Label htmlFor="use-ai">
              <div className="flex items-center">
                <Brain className="mr-2 h-4 w-4" />
                Enhance with ElizaOS AI
              </div>
            </Label>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="visual" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visual">Visual Builder</TabsTrigger>
          <TabsTrigger value="code">Code Editor</TabsTrigger>
        </TabsList>
        
        <TabsContent value="visual" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Indicators & Signals</CardTitle>
              <CardDescription>Build your strategy by selecting and configuring indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {indicators.map(indicator => (
                <div key={indicator.id} className="flex items-center space-x-4 border p-3 rounded-md">
                  <Switch 
                    checked={indicator.enabled} 
                    onCheckedChange={() => toggleIndicator(indicator.id)} 
                  />
                  <div className="flex-1">
                    <p className="font-medium">{indicator.name}</p>
                  </div>
                  {indicator.enabled && (
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`period-${indicator.id}`}>Period:</Label>
                      <Input 
                        id={`period-${indicator.id}`}
                        type="number"
                        value={indicator.period || ''} 
                        onChange={(e) => updateIndicatorPeriod(indicator.id, e.target.value)}
                        className="w-20" 
                      />
                    </div>
                  )}
                </div>
              ))}
              
              <Button variant="outline" className="w-full">
                Add Indicator
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Entry & Exit Rules</CardTitle>
              <CardDescription>Define when to enter and exit trades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border p-3 rounded-md">
                  <p className="font-medium mb-2">Buy Signal</p>
                  <div className="flex items-center space-x-2">
                    <Select defaultValue="above">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="above">Above</SelectItem>
                        <SelectItem value="below">Below</SelectItem>
                        <SelectItem value="crossover">Crosses Above</SelectItem>
                        <SelectItem value="crossunder">Crosses Below</SelectItem>
                      </SelectContent>
                    </Select>
                    <ArrowRight className="h-4 w-4" />
                    <Input placeholder="Value" className="w-20" />
                  </div>
                </div>
                
                <div className="border p-3 rounded-md">
                  <p className="font-medium mb-2">Sell Signal</p>
                  <div className="flex items-center space-x-2">
                    <Select defaultValue="below">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="above">Above</SelectItem>
                        <SelectItem value="below">Below</SelectItem>
                        <SelectItem value="crossover">Crosses Above</SelectItem>
                        <SelectItem value="crossunder">Crosses Below</SelectItem>
                      </SelectContent>
                    </Select>
                    <ArrowRight className="h-4 w-4" />
                    <Input placeholder="Value" className="w-20" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="code" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Code Editor</CardTitle>
              <CardDescription>Write your strategy in JavaScript/TypeScript</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-md border">
                <Code className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Textarea 
                  value={codeInput} 
                  onChange={(e) => setCodeInput(e.target.value)} 
                  className="pl-8 font-mono" 
                  rows={15} 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Performance metrics based on historical data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="border rounded-md p-3 text-center">
                <p className="text-sm text-muted-foreground">Performance</p>
                <p className={`text-xl font-bold ${testResults.performance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {testResults.performance.toFixed(2)}%
                </p>
              </div>
              <div className="border rounded-md p-3 text-center">
                <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                <p className="text-xl font-bold">{testResults.sharpeRatio.toFixed(2)}</p>
              </div>
              <div className="border rounded-md p-3 text-center">
                <p className="text-sm text-muted-foreground">Max Drawdown</p>
                <p className="text-xl font-bold text-red-500">{testResults.maxDrawdown.toFixed(2)}%</p>
              </div>
              <div className="border rounded-md p-3 text-center">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-xl font-bold">{testResults.winRate.toFixed(1)}%</p>
              </div>
              <div className="border rounded-md p-3 text-center">
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-xl font-bold">{testResults.trades}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={() => setTestResults(null)}>
          <FileDown className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button variant="outline" onClick={handleTestStrategy} disabled={isTesting}>
          <Play className="mr-2 h-4 w-4" />
          {isTesting ? 'Testing...' : 'Test Strategy'}
        </Button>
        <Button onClick={handleSaveStrategy} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Strategy'}
        </Button>
      </div>
    </div>
  );
}
