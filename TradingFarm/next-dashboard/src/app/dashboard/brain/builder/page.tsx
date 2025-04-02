'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Plus, Trash, Code, PlayCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { createBrowserClient } from '@/utils/supabase/client';

interface Indicator {
  id: number;
  name: string;
  period: number | null;
  enabled: boolean;
}

interface StrategyFormData {
  name: string;
  description: string;
  type: string;
  riskLevel: number[];
  indicators: Indicator[];
}

export default function StrategyBuilderPage() {
  const [activeTab, setActiveTab] = React.useState('visual');
  const [strategyName, setStrategyName] = React.useState('');
  const [strategyType, setStrategyType] = React.useState('technical');
  const [strategyDescription, setStrategyDescription] = React.useState('');
  const [riskLevel, setRiskLevel] = React.useState([3]); // 1-5 scale
  const [useAI, setUseAI] = React.useState(false);
  const [codeInput, setCodeInput] = React.useState('// Define your trading strategy\n\nfunction executeStrategy(data) {\n  // Implement your strategy logic here\n  const signal = calculateSignal(data);\n  return signal;\n}\n\nfunction calculateSignal(data) {\n  // Calculate buy/sell signals\n  return { action: "hold", confidence: 0 };\n}');
  const [indicators, setIndicators] = React.useState<Indicator[]>([
    { id: 1, name: 'EMA', period: 14, enabled: true },
    { id: 2, name: 'RSI', period: 14, enabled: false },
    { id: 3, name: 'MACD', period: null, enabled: false },
  ]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [testResults, setTestResults] = React.useState(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000;

  React.useEffect(() => {
    // Establish connection to Supabase
    const connectToSupabase = async () => {
      try {
        // Test connection with a simple query
        const { data, error } = await supabase
          .from('trading_strategies')
          .select('count')
          .limit(1);
          
        if (error) {
          console.error('Supabase connection error:', error);
          
          // Check if this is a timeout error
          if (error.message?.includes('timeout') || error.message?.includes('deadline exceeded')) {
            throw new Error('Connection to Supabase timed out.');
          } else {
            throw error;
          }
        }
        
        setIsConnected(true);
        setConnectionError(null);
      } catch (error: any) {
        console.error('Failed to connect to Supabase:', error);
        
        const errorMessage = error.message || 'Unknown error occurred';
        setConnectionError(errorMessage);
        setIsConnected(false);
        
        // Attempt retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            setRetryCount((prev: number) => prev + 1);
          }, RETRY_DELAY);
        }
      }
    };
    
    connectToSupabase();
  }, [supabase, retryCount]);
  
  const handleRetryConnection = () => {
    setRetryCount(0);
  };
  
  const handleSaveStrategy = async () => {
    if (!strategyName) {
      toast({
        title: "Missing Information",
        description: "Please provide a name for your strategy",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // If we're not connected to Supabase, save to local storage
      if (!isConnected) {
        const localStrategy = {
          id: Date.now(),
          name: strategyName,
          description: strategyDescription,
          type: strategyType,
          risk_level: riskLevel[0],
          indicators: indicators.filter((indicator: Indicator) => indicator.enabled),
          code: activeTab === 'code' ? codeInput : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'draft'
        };
        
        // Get existing strategies from local storage
        const existingStrategies = JSON.parse(localStorage.getItem('offlineStrategies') || '[]');
        localStorage.setItem('offlineStrategies', JSON.stringify([...existingStrategies, localStrategy]));
        
        toast({
          title: "Strategy Saved Offline",
          description: "Your strategy has been saved locally. It will be synced when connection is restored."
        });
        
        setIsSaving(false);
        return;
      }
      
      // Save to Supabase
      const { data, error } = await supabase
        .from('trading_strategies')
        .insert([
          {
            name: strategyName,
            description: strategyDescription,
            type: strategyType,
            risk_level: riskLevel[0],
            indicators: indicators.filter((indicator: Indicator) => indicator.enabled),
            code: activeTab === 'code' ? codeInput : null,
            status: 'draft'
          }
        ]);
        
      if (error) throw error;
      
      toast({
        title: "Strategy Saved",
        description: "Your trading strategy has been saved successfully"
      });
      
      // Reset form
      setStrategyName('');
      setStrategyDescription('');
      setStrategyType('technical');
      setRiskLevel([3]);
      setCodeInput('// Define your trading strategy\n\nfunction executeStrategy(data) {\n  // Implement your strategy logic here\n  const signal = calculateSignal(data);\n  return signal;\n}\n\nfunction calculateSignal(data) {\n  // Calculate buy/sell signals\n  return { action: "hold", confidence: 0 };\n}');
      setIndicators([
        { id: 1, name: 'EMA', period: 14, enabled: true },
        { id: 2, name: 'RSI', period: 14, enabled: false },
        { id: 3, name: 'MACD', period: null, enabled: false },
      ]);
      
    } catch (error: any) {
      console.error('Error saving strategy:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save strategy",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleTestStrategy = () => {
    setIsTesting(true);
    
    // Simulate testing the strategy
    setTimeout(() => {
      setTestResults({
        success: true,
        performance: {
          winRate: 65.2,
          profitFactor: 1.8,
          sharpeRatio: 0.98,
          drawdown: 12.4
        },
        trades: [
          { date: '2023-09-01', action: 'buy', price: 24150, result: 'win', profit: 450 },
          { date: '2023-09-03', action: 'sell', price: 24600, result: 'win', profit: 450 },
          { date: '2023-09-05', action: 'buy', price: 24200, result: 'loss', profit: -350 },
          { date: '2023-09-07', action: 'sell', price: 23850, result: 'loss', profit: -350 },
          { date: '2023-09-09', action: 'buy', price: 23900, result: 'win', profit: 520 },
        ]
      });
      setIsTesting(false);
    }, 2000);
  };
  
  const generateCode = () => {
    const enabledIndicators = indicators.filter((indicator: Indicator) => indicator.enabled);
    
    return `// Auto-generated trading strategy
// Strategy: ${strategyName || 'Untitled Strategy'}
// Type: ${strategyType}
// Generated on: ${new Date().toISOString()}

function initialize() {
  // Initialize indicators
  ${enabledIndicators.map((indicator: Indicator) => {
    if (indicator.name === 'EMA') return `const ema = EMA(${indicator.period});`;
    if (indicator.name === 'RSI') return `const rsi = RSI(${indicator.period});`;
    if (indicator.name === 'MACD') return `const macd = MACD(12, 26, 9);`;
    if (indicator.name === 'Bollinger') return `const bb = BOLLINGER(20, 2);`;
    return `// Indicator: ${indicator.name}`;
  }).join('\n  ')}
  
  return {
    ${enabledIndicators.map((indicator: Indicator) => indicator.name.toLowerCase()).join(',\n    ')}
  };
}

function onTick(data, state) {
  // Your strategy logic here
  ${enabledIndicators.length === 0 ? '// No indicators selected' : ''}
  ${indicators.find((indicator: Indicator) => indicator.name === 'RSI' && indicator.enabled) ? 
    `if (state.rsi.value < 30) {\n    return { signal: 'BUY', reason: 'RSI oversold' };\n  } else if (state.rsi.value > 70) {\n    return { signal: 'SELL', reason: 'RSI overbought' };\n  }` : 
    ''}
  
  return { signal: 'NEUTRAL' };
}`;
  };

  const toggleIndicator = (id: number) => {
    setIndicators(indicators.map((indicator: Indicator) => 
      indicator.id === id ? { ...indicator, enabled: !indicator.enabled } : indicator
    ));
  };
  
  const updateIndicatorPeriod = (id: number, period: string) => {
    setIndicators(indicators.map((indicator: Indicator) => 
      indicator.id === id ? { ...indicator, period: parseInt(period) } : indicator
    ));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Strategy Builder</h1>
        <p className="text-muted-foreground">
          Create and test custom trading strategies
        </p>
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

      <Tabs defaultValue="visual" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="visual">Visual Builder</TabsTrigger>
          <TabsTrigger value="code">Code Editor</TabsTrigger>
        </TabsList>
        
        <TabsContent value="visual">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Configuration</CardTitle>
              <CardDescription>Configure your trading strategy parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="strategy-name">Strategy Name</Label>
                  <Input 
                    id="strategy-name" 
                    placeholder="Enter strategy name" 
                    value={strategyName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStrategyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strategy-type">Strategy Type</Label>
                  <Select 
                    value={strategyType} 
                    onValueChange={setStrategyType}
                  >
                    <SelectTrigger id="strategy-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="fundamental">Fundamental</SelectItem>
                      <SelectItem value="momentum">Momentum</SelectItem>
                      <SelectItem value="trend">Trend-Following</SelectItem>
                      <SelectItem value="mean-reversion">Mean Reversion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="strategy-description">Description</Label>
                <Textarea 
                  id="strategy-description" 
                  placeholder="Describe your strategy..." 
                  rows={3}
                  value={strategyDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStrategyDescription(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Indicators</Label>
                <div className="border rounded-md p-4 space-y-4">
                  <div className="flex flex-col gap-3">
                    {indicators.map((indicator: Indicator, index: number) => (
                      <div key={indicator.id} className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id={`indicator-${indicator.id}`}
                            checked={indicator.enabled}
                            onChange={() => toggleIndicator(indicator.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label htmlFor={`indicator-${indicator.id}`}>
                            {indicator.name}
                          </Label>
                        </div>
                        
                        {indicator.period !== null && (
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`period-${indicator.id}`} className="text-sm">
                              Period:
                            </Label>
                            <Input
                              id={`period-${indicator.id}`}
                              type="number"
                              value={indicator.period}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateIndicatorPeriod(indicator.id, e.target.value)}
                              className="w-16 h-8"
                              disabled={!indicator.enabled}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Indicator
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="code">
          <Card>
            <CardHeader>
              <CardTitle>Code Editor</CardTitle>
              <CardDescription>Write your strategy in JavaScript</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative rounded-md border bg-slate-950">
                  <div className="flex items-center px-4 py-2 border-b border-gray-700">
                    <Code className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">strategy.js</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-auto text-xs text-gray-400"
                      onClick={() => setCodeInput(generateCode())}
                    >
                      Generate from Visual Builder
                    </Button>
                  </div>
                  <ScrollArea className="h-96 w-full">
                    <Textarea
                      value={codeInput}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCodeInput(e.target.value)}
                      className="min-h-[400px] font-mono text-gray-300 bg-transparent border-0 resize-none"
                      placeholder="// Write your strategy code here..."
                    />
                  </ScrollArea>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={handleTestStrategy}
                    disabled={isTesting}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    {isTesting ? "Testing..." : "Test Strategy"}
                  </Button>
                </div>
                
                {testResults && (
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2">Test Results</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Win Rate: <span className="font-mono">{testResults.performance.winRate}%</span></div>
                      <div>Profit Factor: <span className="font-mono">{testResults.performance.profitFactor}</span></div>
                      <div>Sharpe Ratio: <span className="font-mono">{testResults.performance.sharpeRatio}</span></div>
                      <div>Max Drawdown: <span className="font-mono">{testResults.performance.drawdown}%</span></div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button 
          onClick={handleSaveStrategy}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Strategy"}
        </Button>
      </div>
    </div>
  );
}
