"use client";

import { useState, useRef } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Check, RefreshCw, Copy, FileCode, Code, BrainCircuit } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface NaturalLanguageStrategyCreatorProps {
  onSuccess: () => void;
}

export function NaturalLanguageStrategyCreator({ onSuccess }: NaturalLanguageStrategyCreatorProps) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-4");
  const [generationStatus, setGenerationStatus] = useState<"idle" | "generating" | "completed" | "error">("idle");
  const [generatedStrategy, setGeneratedStrategy] = useState<{
    name: string;
    description: string;
    type: string;
    code: string;
    parameters: Record<string, any>;
  } | null>(null);
  const [currentTab, setCurrentTab] = useState("prompt");
  const promptExamples = [
    "Create a simple moving average crossover strategy for Bitcoin that buys when the 10-period SMA crosses above the 30-period SMA and sells when it crosses below.",
    "Design a RSI-based mean reversion strategy for Ethereum that buys when RSI is below 30 and sells when it's above 70.",
    "Build a volume-weighted breakout strategy that enters a position when price breaks above the 20-day high on above-average volume.",
    "Create a grid trading strategy for stable coin pairs that places buy orders at 0.5% intervals below current price and sell orders at 0.5% intervals above.",
    "Design a momentum strategy that identifies the top 3 performing assets over the last 7 days and rotates the portfolio accordingly."
  ];
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Mutation for creating a strategy from natural language
  const createNLStrategy = useMutation({
    mutationFn: async (promptText: string) => {
      // First, create entry in nl_strategy_definitions
      const { data: nlData, error: nlError } = await supabase
        .from('nl_strategy_definitions')
        .insert({
          prompt: promptText,
          model_used: model,
          status: 'pending'
        })
        .select('id')
        .single();
        
      if (nlError) throw nlError;
      
      // In a real implementation, this would call an AI service
      // For this demo, we'll simulate the AI response with predefined strategies
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate a sample strategy based on keywords in the prompt
      let strategyType = "trend_following";
      if (promptText.toLowerCase().includes("mean reversion") || promptText.toLowerCase().includes("rsi")) {
        strategyType = "mean_reversion";
      } else if (promptText.toLowerCase().includes("grid")) {
        strategyType = "grid_trading";
      } else if (promptText.toLowerCase().includes("momentum")) {
        strategyType = "momentum";
      } else if (promptText.toLowerCase().includes("breakout")) {
        strategyType = "breakout";
      }
      
      // Generate sample code based on the strategy type
      let strategyCode = '';
      let strategyParams = {};
      let strategyName = '';
      let strategyDescription = '';
      
      if (strategyType === "trend_following") {
        strategyName = "ElizaOS Generated SMA Crossover Strategy";
        strategyDescription = "A simple moving average crossover strategy that generates signals based on the crossover of fast and slow moving averages.";
        strategyCode = `// ElizaOS Generated SMA Crossover Strategy
// Generated based on user prompt: "${promptText}"

/**
 * Simple Moving Average Crossover Strategy
 * - Buys when fast SMA crosses above slow SMA
 * - Sells when fast SMA crosses below slow SMA
 */

function initialize() {
  this.fastPeriod = this.params.fastPeriod || 10;
  this.slowPeriod = this.params.slowPeriod || 30;
  this.positionSize = this.params.positionSize || 1.0;
  this.symbolsToTrade = this.params.symbols || ["BTC/USDT"];
  
  // Log initialization
  console.log(\`Strategy initialized with fast period: \${this.fastPeriod}, slow period: \${this.slowPeriod}\`);
}

function onTick(tick) {
  // Skip if not a symbol we're trading
  if (!this.symbolsToTrade.includes(tick.symbol)) return;
  
  // Get price history for the symbol
  const prices = this.getPriceHistory(tick.symbol, this.slowPeriod + 10);
  if (prices.length < this.slowPeriod) {
    console.log("Not enough price history for analysis");
    return;
  }
  
  // Calculate SMAs
  const fastSMA = calculateSMA(prices, this.fastPeriod);
  const slowSMA = calculateSMA(prices, this.slowPeriod);
  
  // Get previous values for crossover detection
  const prevPrices = prices.slice(0, -1);
  const prevFastSMA = calculateSMA(prevPrices, this.fastPeriod);
  const prevSlowSMA = calculateSMA(prevPrices, this.slowPeriod);
  
  // Detect crossover up (buy signal)
  if (prevFastSMA <= prevSlowSMA && fastSMA > slowSMA) {
    this.signal("entry", tick.symbol, tick.price, this.positionSize, {
      reason: "SMA crossover up",
      fastSMA: fastSMA,
      slowSMA: slowSMA
    });
  }
  
  // Detect crossover down (sell signal)
  if (prevFastSMA >= prevSlowSMA && fastSMA < slowSMA) {
    this.signal("exit", tick.symbol, tick.price, this.positionSize, {
      reason: "SMA crossover down",
      fastSMA: fastSMA,
      slowSMA: slowSMA
    });
  }
}

// Helper function to calculate Simple Moving Average
function calculateSMA(prices, period) {
  if (prices.length < period) return 0;
  
  const sum = prices.slice(-period).reduce((total, price) => total + price, 0);
  return sum / period;
}

// Function to get price history
function getPriceHistory(symbol, lookback) {
  // In a real implementation, this would fetch historical prices
  // For demo purposes, we're assuming this is handled by the system
  return this.priceHistory[symbol] || [];
}`;

        strategyParams = {
          fastPeriod: 10,
          slowPeriod: 30,
          positionSize: 1.0,
          symbols: ["BTC/USDT"]
        };
      } else if (strategyType === "mean_reversion") {
        strategyName = "ElizaOS Generated RSI Mean Reversion Strategy";
        strategyDescription = "A mean reversion strategy that uses RSI to identify overbought and oversold conditions for trading entry and exit points.";
        strategyCode = `// ElizaOS Generated RSI Mean Reversion Strategy
// Generated based on user prompt: "${promptText}"

/**
 * RSI Mean Reversion Strategy
 * - Buys when RSI is below oversold threshold
 * - Sells when RSI is above overbought threshold
 */

function initialize() {
  this.rsiPeriod = this.params.rsiPeriod || 14;
  this.oversoldThreshold = this.params.oversoldThreshold || 30;
  this.overboughtThreshold = this.params.overboughtThreshold || 70;
  this.positionSize = this.params.positionSize || 1.0;
  this.symbolsToTrade = this.params.symbols || ["ETH/USDT"];
  
  // Log initialization
  console.log(\`Strategy initialized with RSI period: \${this.rsiPeriod}, oversold: \${this.oversoldThreshold}, overbought: \${this.overboughtThreshold}\`);
}

function onTick(tick) {
  // Skip if not a symbol we're trading
  if (!this.symbolsToTrade.includes(tick.symbol)) return;
  
  // Get price history for the symbol
  const prices = this.getPriceHistory(tick.symbol, this.rsiPeriod + 10);
  if (prices.length < this.rsiPeriod + 1) {
    console.log("Not enough price history for RSI calculation");
    return;
  }
  
  // Calculate RSI
  const rsi = calculateRSI(prices, this.rsiPeriod);
  console.log(\`Current RSI for \${tick.symbol}: \${rsi}\`);
  
  // Check for oversold condition (buy signal)
  if (rsi < this.oversoldThreshold) {
    this.signal("entry", tick.symbol, tick.price, this.positionSize, {
      reason: "RSI oversold",
      rsi: rsi
    });
  }
  
  // Check for overbought condition (sell signal)
  if (rsi > this.overboughtThreshold) {
    this.signal("exit", tick.symbol, tick.price, this.positionSize, {
      reason: "RSI overbought",
      rsi: rsi
    });
  }
}

// Helper function to calculate RSI
function calculateRSI(prices, period) {
  if (prices.length <= period) return 50;
  
  let gains = 0;
  let losses = 0;
  
  // Calculate price changes and separate gains and losses
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  // Calculate average gain and loss
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  // Handle division by zero
  if (avgLoss === 0) return 100;
  
  // Calculate RS and RSI
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Function to get price history
function getPriceHistory(symbol, lookback) {
  // In a real implementation, this would fetch historical prices
  // For demo purposes, we're assuming this is handled by the system
  return this.priceHistory[symbol] || [];
}`;

        strategyParams = {
          rsiPeriod: 14,
          oversoldThreshold: 30,
          overboughtThreshold: 70,
          positionSize: 1.0,
          symbols: ["ETH/USDT"]
        };
      }
      
      // Create the actual strategy
      const { data: strategyData, error: strategyError } = await supabase
        .from('strategies')
        .insert({
          name: strategyName,
          description: strategyDescription,
          type: strategyType,
          version: "1.0.0",
          parameters: strategyParams,
          content: strategyCode,
          is_active: false,
          is_deployed: false
        })
        .select('id')
        .single();
        
      if (strategyError) throw strategyError;
      
      // Update the nl_strategy_definition with the generated strategy ID
      const { error: updateError } = await supabase
        .from('nl_strategy_definitions')
        .update({
          generated_strategy_id: strategyData.id,
          status: 'completed',
          response: { 
            name: strategyName,
            description: strategyDescription,
            type: strategyType,
            parameters: strategyParams
          }
        })
        .eq('id', nlData.id);
        
      if (updateError) throw updateError;
      
      return {
        name: strategyName,
        description: strategyDescription,
        type: strategyType,
        code: strategyCode,
        parameters: strategyParams
      };
    },
    onMutate: () => {
      setGenerationStatus("generating");
    },
    onSuccess: (data) => {
      setGeneratedStrategy(data);
      setGenerationStatus("completed");
      setCurrentTab("review");
      toast({
        title: "Strategy Generated",
        description: "AI has successfully generated a strategy based on your description",
      });
    },
    onError: (error: any) => {
      setGenerationStatus("error");
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate strategy",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!prompt.trim()) {
      toast({
        title: "Empty Prompt",
        description: "Please enter a description of the strategy you want to create",
        variant: "destructive",
      });
      return;
    }
    
    createNLStrategy.mutate(prompt);
  };

  const handleUseExample = (example: string) => {
    setPrompt(example);
    if (promptRef.current) {
      promptRef.current.focus();
    }
  };

  const handleAccept = () => {
    if (generationStatus === "completed") {
      onSuccess();
    }
  };

  const handleRegenerateClick = () => {
    setGenerationStatus("idle");
    setGeneratedStrategy(null);
    setCurrentTab("prompt");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Strategy code has been copied to your clipboard",
    });
  };

  return (
    <div className="space-y-4">
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prompt" disabled={generationStatus === "generating"}>
            <Sparkles className="w-4 h-4 mr-2" />
            Write Prompt
          </TabsTrigger>
          <TabsTrigger 
            value="review" 
            disabled={generationStatus !== "completed" || !generatedStrategy}
          >
            <FileCode className="w-4 h-4 mr-2" />
            Review Strategy
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="prompt" className="space-y-4">
          <div className="space-y-2">
            <Textarea
              ref={promptRef}
              placeholder="Describe the trading strategy you want to create in detail. For example: 'Create a moving average crossover strategy for Bitcoin that...'"
              className="min-h-[150px]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={generationStatus === "generating"}
            />
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Model:</span>
                <Select 
                  value={model} 
                  onValueChange={setModel}
                  disabled={generationStatus === "generating"}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="claude-3">Claude 3</SelectItem>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleSubmit}
                disabled={generationStatus === "generating" || !prompt.trim()}
              >
                {generationStatus === "generating" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    Generate Strategy
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Example Prompts</h4>
            <div className="grid grid-cols-1 gap-2">
              {promptExamples.map((example, index) => (
                <Button 
                  key={index} 
                  variant="outline" 
                  className="justify-start h-auto py-2 px-4 text-left"
                  onClick={() => handleUseExample(example)}
                  disabled={generationStatus === "generating"}
                >
                  <span className="truncate">{example}</span>
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="review" className="space-y-4">
          {generatedStrategy && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium">Strategy Name</h4>
                    <Input 
                      value={generatedStrategy.name} 
                      disabled 
                      className="bg-muted/50"
                    />
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium">Strategy Type</h4>
                    <Input 
                      value={generatedStrategy.type} 
                      disabled 
                      className="bg-muted/50"
                    />
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Description</h4>
                  <Textarea 
                    value={generatedStrategy.description} 
                    disabled 
                    className="h-[105px] bg-muted/50"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium">Strategy Code</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedStrategy.code)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                </div>
                <div className="relative">
                  <pre className="p-4 rounded-md bg-muted/50 overflow-x-auto text-sm">
                    <code>{generatedStrategy.code}</code>
                  </pre>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Parameters</h4>
                <div className="rounded-md bg-muted/50 p-4">
                  <pre>{JSON.stringify(generatedStrategy.parameters, null, 2)}</pre>
                </div>
              </div>
              
              <div className="flex justify-between pt-2">
                <Button 
                  variant="outline"
                  onClick={handleRegenerateClick}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
                
                <Button onClick={handleAccept}>
                  <Check className="h-4 w-4 mr-2" />
                  Accept Strategy
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
