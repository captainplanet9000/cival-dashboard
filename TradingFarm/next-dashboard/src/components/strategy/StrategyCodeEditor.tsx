"use client";

import { useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, AlertTriangle, Code, Info, Loader2, Play, Save } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  type: string;
  version: string;
  parameters: Record<string, any>;
  is_active: boolean;
  is_deployed: boolean;
  performance_metrics: Record<string, any>;
  content: string | null;
  created_at: string;
  updated_at: string;
}

interface StrategyCodeEditorProps {
  strategy: Strategy;
  onSuccess: () => void;
}

export function StrategyCodeEditor({ strategy, onSuccess }: StrategyCodeEditorProps) {
  const [code, setCode] = useState<string>(strategy.content || getDefaultCode(strategy.type));
  const [validationResults, setValidationResults] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  
  const { toast } = useToast();
  const supabase = createBrowserClient();
  
  // Helper to get default code template based on strategy type
  function getDefaultCode(type: string): string {
    switch(type) {
      case "trend_following":
        return `/**
 * Trend Following Strategy
 * Type: ${type}
 * Version: ${strategy.version}
 * 
 * Parameters:
 * - fastPeriod: ${strategy.parameters.fastPeriod || 10}
 * - slowPeriod: ${strategy.parameters.slowPeriod || 30}
 * - positionSize: ${strategy.parameters.positionSize || 1.0}
 * - symbols: ["${(strategy.parameters.symbols || ["BTC/USDT"]).join('", "')}"]
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
      case "mean_reversion":
        return `/**
 * Mean Reversion Strategy
 * Type: ${type}
 * Version: ${strategy.version}
 * 
 * Parameters:
 * - rsiPeriod: ${strategy.parameters.rsiPeriod || 14}
 * - oversoldThreshold: ${strategy.parameters.oversoldThreshold || 30}
 * - overboughtThreshold: ${strategy.parameters.overboughtThreshold || 70}
 * - positionSize: ${strategy.parameters.positionSize || 1.0}
 * - symbols: ["${(strategy.parameters.symbols || ["ETH/USDT"]).join('", "')}"]
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
      default:
        return `/**
 * Custom Trading Strategy
 * Type: ${type}
 * Version: ${strategy.version}
 * 
 * This is a template for a custom trading strategy.
 * Implement the initialize and onTick functions below.
 */

function initialize() {
  // Initialize strategy parameters from this.params
  // Example:
  // this.period = this.params.period || 14;
  // this.threshold = this.params.threshold || 1.5;
  
  // Log initialization
  console.log("Strategy initialized with parameters:", this.params);
}

function onTick(tick) {
  // This function is called for each new price update
  // Implement your trading logic here
  
  // Example: Generate a signal
  // this.signal("entry", tick.symbol, tick.price, 1.0, {
  //   reason: "Signal reason",
  //   additionalData: "Any relevant data"
  // });
}

// Add your helper functions here
`;
    }
  }
  
  // Save code update
  const updateCodeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('strategies')
        .update({
          content: code
        })
        .eq('id', strategy.id);
        
      if (error) throw error;
      
      return { success: true };
    },
    onSuccess: () => {
      onSuccess();
      toast({
        title: "Code Updated",
        description: "Strategy code has been successfully updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update strategy code",
        variant: "destructive",
      });
    }
  });
  
  // Validate code (simplified version - in a real app this would call a backend service)
  const validateCodeMutation = useMutation({
    mutationFn: async () => {
      // Simulate API call to validate code
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Perform basic validation checks
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Check for initialize function
      if (!code.includes("function initialize()")) {
        errors.push("Missing initialize() function");
      }
      
      // Check for onTick function
      if (!code.includes("function onTick(")) {
        errors.push("Missing onTick() function");
      }
      
      // Check for potential syntax errors (simplified check)
      try {
        // This is a simple check, not a full syntax validation
        new Function(code);
      } catch (e: any) {
        errors.push(`Syntax error: ${e.message}`);
      }
      
      // Check for best practices
      if (!code.includes("console.log")) {
        warnings.push("Consider adding logging statements for better debugging");
      }
      
      if (code.includes("while (true)") || code.includes("for (;;)")) {
        warnings.push("Infinite loops detected which may cause the strategy to hang");
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    },
    onSuccess: (data) => {
      setValidationResults(data);
      toast({
        title: data.isValid ? "Validation Successful" : "Validation Failed",
        description: data.isValid 
          ? "Your code looks valid and ready to use" 
          : `Found ${data.errors.length} errors and ${data.warnings.length} warnings`,
        variant: data.isValid ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Validation Failed",
        description: error.message || "Failed to validate code",
        variant: "destructive",
      });
    }
  });
  
  // Test run the strategy (this would normally call a backend service)
  const testRunMutation = useMutation({
    mutationFn: async () => {
      // First check if code is valid
      await validateCodeMutation.mutateAsync();
      
      // Simulate API call to run a backtest
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return { success: true, message: "Strategy test completed successfully" };
    },
    onSuccess: (data) => {
      toast({
        title: "Test Run Completed",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Run Failed",
        description: error.message || "Failed to run strategy test",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="editor">
            <Code className="w-4 h-4 mr-2" />
            Code Editor
          </TabsTrigger>
          <TabsTrigger value="validation">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Validation Results
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="editor" className="space-y-4">
          <div className="relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-[400px] p-4 border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              spellCheck={false}
            />
          </div>
          
          <div className="flex justify-between">
            <div className="space-x-2">
              <Button 
                variant="outline" 
                onClick={() => validateCodeMutation.mutate()}
                disabled={validateCodeMutation.isPending}
              >
                {validateCodeMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <AlertCircle className="mr-2 h-4 w-4" />
                )}
                Validate Code
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => testRunMutation.mutate()}
                disabled={testRunMutation.isPending}
              >
                {testRunMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Test Run
              </Button>
            </div>
            
            <Button 
              onClick={() => updateCodeMutation.mutate()}
              disabled={updateCodeMutation.isPending}
            >
              {updateCodeMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Code Editor Help</AlertTitle>
            <AlertDescription>
              <p className="text-sm mt-1">
                Your strategy must include these functions:
              </p>
              <ul className="text-sm list-disc list-inside mt-1 ml-2">
                <li><code className="text-xs font-mono">initialize()</code> - Called once when the strategy starts</li>
                <li><code className="text-xs font-mono">onTick(tick)</code> - Called for each price update</li>
              </ul>
              <p className="text-sm mt-2">
                Use <code className="text-xs font-mono">this.signal(type, symbol, price, size, metadata)</code> to generate trading signals.
              </p>
            </AlertDescription>
          </Alert>
        </TabsContent>
        
        <TabsContent value="validation" className="space-y-4">
          {validationResults ? (
            <div className="space-y-4">
              <Alert variant={validationResults.isValid ? "default" : "destructive"}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {validationResults.isValid ? "Code is Valid" : "Validation Failed"}
                </AlertTitle>
                <AlertDescription>
                  {validationResults.isValid 
                    ? "Your code passes all validation checks and is ready to use."
                    : "Your code contains errors that need to be fixed before it can be used."}
                </AlertDescription>
              </Alert>
              
              {validationResults.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Errors</h4>
                  <div className="bg-destructive/10 rounded-md p-3">
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {validationResults.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {validationResults.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Warnings</h4>
                  <div className="bg-amber-100 rounded-md p-3">
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {validationResults.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <h4 className="font-medium">Next Steps</h4>
                <div className="bg-muted rounded-md p-3">
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {validationResults.isValid ? (
                      <>
                        <li>Your code is ready to use.</li>
                        <li>Consider running a test to validate its behavior.</li>
                        <li>When ready, save your changes and deploy the strategy.</li>
                      </>
                    ) : (
                      <>
                        <li>Fix the errors listed above.</li>
                        <li>Address warnings for better strategy performance.</li>
                        <li>Validate your code again after making changes.</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Validation Results Yet</h3>
              <p className="text-muted-foreground mb-4">
                Click the "Validate Code" button to check your strategy code for errors.
              </p>
              <Button 
                onClick={() => validateCodeMutation.mutate()}
                disabled={validateCodeMutation.isPending}
              >
                {validateCodeMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <AlertCircle className="mr-2 h-4 w-4" />
                )}
                Validate Code
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
