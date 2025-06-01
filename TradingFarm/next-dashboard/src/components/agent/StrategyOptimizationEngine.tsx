"use client";

import React, { useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ScatterChart, Scatter, ZAxis
} from "recharts";
import {
  Settings, PlayCircle, Pause, RefreshCw, Clock, LineChart as LineChartIcon, 
  Check, AlertTriangle, BookOpen, Sigma, Save, PlusCircle, FileDown, BarChart2
} from "lucide-react";

interface StrategyOptimizationEngineProps {
  strategyId?: string;
  farmId?: string;
}

interface StrategyParameter {
  id: string;
  name: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  default: number;
  optimized_value?: number;
  unit?: string;
}

interface OptimizationResult {
  id: string;
  strategy_id: string;
  parameters: Record<string, number>;
  performance_metrics: {
    profit_factor: number;
    sharpe_ratio: number;
    max_drawdown: number;
    total_return: number;
    win_rate: number;
  };
  created_at: string;
  optimization_time: number;
  status: 'completed' | 'failed' | 'in_progress';
}

export function StrategyOptimizationEngine({ strategyId, farmId }: StrategyOptimizationEngineProps) {
  const [activeTab, setActiveTab] = useState("parameters");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Fetch strategy parameters
  const { data: parameters = [], isLoading: isLoadingParameters } = useQuery({
    queryKey: ["strategy-parameters", strategyId],
    queryFn: async () => {
      // For demo purposes, we'll use mock data
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return [
        {
          id: "param-1",
          name: "Fast MA Period",
          description: "Period length for the fast moving average",
          value: 8,
          min: 2,
          max: 50,
          step: 1,
          default: 10,
          unit: "candles"
        },
        {
          id: "param-2",
          name: "Slow MA Period",
          description: "Period length for the slow moving average",
          value: 21,
          min: 5,
          max: 200,
          step: 1,
          default: 20,
          unit: "candles"
        },
        {
          id: "param-3",
          name: "Signal Threshold",
          description: "Minimum threshold for signal generation",
          value: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
          default: 0.5,
          unit: "%"
        },
        {
          id: "param-4",
          name: "Risk Per Trade",
          description: "Maximum risk per trade as a percentage of account",
          value: 1.5,
          min: 0.1,
          max: 5,
          step: 0.1,
          default: 1,
          unit: "%"
        },
        {
          id: "param-5",
          name: "Profit Target",
          description: "Target profit as a multiple of risk",
          value: 2,
          min: 0.5,
          max: 5,
          step: 0.1,
          default: 2,
          unit: "R"
        }
      ] as StrategyParameter[];
    },
    refetchOnWindowFocus: false,
  });

  // Fetch optimization results
  const { data: optimizationResults = [], isLoading: isLoadingResults } = useQuery({
    queryKey: ["optimization-results", strategyId],
    queryFn: async () => {
      // For demo purposes, we'll use mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return [
        {
          id: "result-1",
          strategy_id: strategyId || "strategy-1",
          parameters: {
            "param-1": 6,
            "param-2": 24,
            "param-3": 0.55,
            "param-4": 1.2,
            "param-5": 2.5
          },
          performance_metrics: {
            profit_factor: 1.85,
            sharpe_ratio: 1.4,
            max_drawdown: 12.3,
            total_return: 42.7,
            win_rate: 62.5
          },
          created_at: "2025-04-11T15:23:45Z",
          optimization_time: 358,
          status: 'completed'
        },
        {
          id: "result-2",
          strategy_id: strategyId || "strategy-1",
          parameters: {
            "param-1": 9,
            "param-2": 18,
            "param-3": 0.4,
            "param-4": 1.5,
            "param-5": 2.2
          },
          performance_metrics: {
            profit_factor: 1.72,
            sharpe_ratio: 1.3,
            max_drawdown: 15.6,
            total_return: 38.2,
            win_rate: 58.7
          },
          created_at: "2025-04-10T12:15:22Z",
          optimization_time: 423,
          status: 'completed'
        },
        {
          id: "result-3",
          strategy_id: strategyId || "strategy-1",
          parameters: {
            "param-1": 7,
            "param-2": 28,
            "param-3": 0.6,
            "param-4": 1.0,
            "param-5": 2.8
          },
          performance_metrics: {
            profit_factor: 2.1,
            sharpe_ratio: 1.6,
            max_drawdown: 10.2,
            total_return: 48.9,
            win_rate: 65.3
          },
          created_at: "2025-04-08T09:45:12Z",
          optimization_time: 315,
          status: 'completed'
        }
      ] as OptimizationResult[];
    },
    refetchOnWindowFocus: false,
  });

  // Backtest performance data for visualization
  const backtestData = Array.from({ length: 50 }, (_, i) => ({
    day: i + 1,
    strategy: (1 + Math.sin(i / 5) * 0.03 + i * 0.006) * 100,
    benchmark: (1 + Math.cos(i / 7) * 0.02 + i * 0.003) * 100,
  }));

  // Parameter optimization scatter data
  const paramOptimizationData = Array.from({ length: 30 }, (_, i) => ({
    x: 5 + Math.random() * 25,
    y: 10 + Math.random() * 50,
    z: Math.random() * 100,
    profit: 20 + Math.random() * 60,
  }));

  // Handle parameter change
  const handleParameterChange = (parameterId: string, value: number) => {
    // In a real implementation, you would update the parameter value in state
    toast({
      title: "Parameter updated",
      description: `Parameter value has been updated to ${value}`,
    });
  };

  // Start optimization process
  const handleStartOptimization = () => {
    setIsOptimizing(true);
    setOptimizationProgress(0);
    
    // Simulate optimization progress
    const interval = setInterval(() => {
      setOptimizationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsOptimizing(false);
          
          toast({
            title: "Optimization completed",
            description: "Strategy parameters have been optimized successfully",
          });
          
          return 100;
        }
        return prev + 5;
      });
    }, 500);
  };

  // Apply optimization result
  const handleApplyResult = (resultId: string) => {
    const result = optimizationResults.find(r => r.id === resultId);
    if (!result) return;
    
    toast({
      title: "Optimization applied",
      description: "The selected optimization parameters have been applied",
    });
  };

  // Get selected result
  const selectedResult = optimizationResults.find(r => r.id === selectedResultId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Strategy Optimization</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {isOptimizing ? (
            <Button variant="outline" onClick={() => setIsOptimizing(false)}>
              <Pause className="h-4 w-4 mr-1" />
              Stop Optimization
            </Button>
          ) : (
            <Button onClick={handleStartOptimization}>
              <PlayCircle className="h-4 w-4 mr-1" />
              Start Optimization
            </Button>
          )}
        </div>
      </div>
      
      {isOptimizing && (
        <Card className="border-primary/50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Optimization in progress...</span>
                <span className="text-sm">{optimizationProgress}%</span>
              </div>
              <Progress value={optimizationProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Optimizing parameters using genetic algorithm and historical data...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="parameters" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span>Parameters</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-1">
            <BarChart2 className="h-4 w-4" />
            <span>Results</span>
          </TabsTrigger>
          <TabsTrigger value="visualization" className="flex items-center gap-1">
            <LineChartIcon className="h-4 w-4" />
            <span>Visualization</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="parameters" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Parameters</CardTitle>
              <CardDescription>
                Configure and optimize strategy parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingParameters ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-5 w-1/3 bg-muted rounded-md animate-pulse" />
                      <div className="h-4 w-2/3 bg-muted/60 rounded-md animate-pulse" />
                      <div className="h-8 bg-muted rounded-md animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                parameters.map(param => (
                  <div key={param.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base" htmlFor={param.id}>{param.name}</Label>
                        <p className="text-sm text-muted-foreground">{param.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input 
                          id={`${param.id}-value`}
                          type="number"
                          value={param.value}
                          onChange={(e) => handleParameterChange(param.id, Number(e.target.value))}
                          className="w-20"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                        />
                        {param.unit && <span className="text-sm text-muted-foreground">{param.unit}</span>}
                      </div>
                    </div>
                    <Slider
                      id={param.id}
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      defaultValue={[param.value]}
                      onValueChange={(vals) => handleParameterChange(param.id, vals[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Min: {param.min}{param.unit}</span>
                      <span>Default: {param.default}{param.unit}</span>
                      <span>Max: {param.max}{param.unit}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="auto-optimize" />
                <Label htmlFor="auto-optimize">Auto-optimize based on market conditions</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reset to Default
                </Button>
                <Button size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  Save Parameters
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="results" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Results</CardTitle>
              <CardDescription>
                View and compare different optimization runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingResults ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="h-5 w-1/3 bg-muted rounded-md animate-pulse mb-2" />
                        <div className="h-4 w-2/3 bg-muted/60 rounded-md animate-pulse mb-3" />
                        <div className="grid grid-cols-5 gap-2">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <div key={j} className="h-10 bg-muted rounded-md animate-pulse" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {optimizationResults.map(result => (
                      <div 
                        key={result.id}
                        className={`p-4 border rounded-lg cursor-pointer hover:bg-accent/20 ${
                          selectedResultId === result.id ? 'bg-accent border-accent' : ''
                        }`}
                        onClick={() => setSelectedResultId(result.id)}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-primary/5">Optimization #{result.id.split('-')[1]}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(result.created_at).toLocaleDateString()} ({result.optimization_time}s)
                            </span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyResult(result.id);
                            }}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Apply
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-2 mb-2">
                          <div className="bg-muted/50 p-2 rounded text-center">
                            <div className="text-xs text-muted-foreground">Return</div>
                            <div className="font-medium">{result.performance_metrics.total_return.toFixed(1)}%</div>
                          </div>
                          <div className="bg-muted/50 p-2 rounded text-center">
                            <div className="text-xs text-muted-foreground">Profit Factor</div>
                            <div className="font-medium">{result.performance_metrics.profit_factor.toFixed(2)}</div>
                          </div>
                          <div className="bg-muted/50 p-2 rounded text-center">
                            <div className="text-xs text-muted-foreground">Sharpe</div>
                            <div className="font-medium">{result.performance_metrics.sharpe_ratio.toFixed(2)}</div>
                          </div>
                          <div className="bg-muted/50 p-2 rounded text-center">
                            <div className="text-xs text-muted-foreground">Drawdown</div>
                            <div className="font-medium">{result.performance_metrics.max_drawdown.toFixed(1)}%</div>
                          </div>
                          <div className="bg-muted/50 p-2 rounded text-center">
                            <div className="text-xs text-muted-foreground">Win Rate</div>
                            <div className="font-medium">{result.performance_metrics.win_rate.toFixed(1)}%</div>
                          </div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          Parameter changes: 
                          {Object.entries(result.parameters).map(([paramId, value]) => {
                            const param = parameters.find(p => p.id === paramId);
                            return param ? (
                              <span key={paramId} className="mx-1">
                                {param.name}: {value}{param.unit}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-end">
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-1" />
                Export Results
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="visualization" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Visualization</CardTitle>
              <CardDescription>
                Visual analysis of strategy performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">Strategy Performance</h4>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={backtestData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(2)}%`, 'Value']}
                          labelFormatter={(label) => `Day ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="strategy" 
                          name="Optimized Strategy" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="benchmark" 
                          name="Benchmark" 
                          stroke="#9ca3af" 
                          strokeWidth={1.5}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Parameter Sensitivity</h4>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                          <XAxis 
                            dataKey="x" 
                            name="Fast MA Period" 
                            unit=" candles"
                          />
                          <YAxis 
                            dataKey="y" 
                            name="Slow MA Period" 
                            unit=" candles"
                          />
                          <ZAxis 
                            dataKey="profit" 
                            range={[20, 200]} 
                            name="Profit" 
                            unit="%" 
                          />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }}
                            formatter={(value: any, name: string) => {
                              if (name === 'Profit') return [`${value.toFixed(2)}%`, name];
                              return [`${value}`, name];
                            }}
                          />
                          <Scatter 
                            name="Parameters" 
                            data={paramOptimizationData} 
                            fill="#2563eb"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Comparative Metrics</h4>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={optimizationResults.map(result => ({
                            name: `Result #${result.id.split('-')[1]}`,
                            return: result.performance_metrics.total_return,
                            sharpe: result.performance_metrics.sharpe_ratio * 10,
                            drawdown: -result.performance_metrics.max_drawdown,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: number, name: string) => {
                              if (name === 'return') return [`${value.toFixed(2)}%`, 'Return'];
                              if (name === 'sharpe') return [`${(value / 10).toFixed(2)}`, 'Sharpe Ratio'];
                              if (name === 'drawdown') return [`${(-value).toFixed(2)}%`, 'Max Drawdown'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="return" name="Return %" fill="#2563eb" />
                          <Bar dataKey="sharpe" name="Sharpe Ratio" fill="#16a34a" />
                          <Bar dataKey="drawdown" name="Max Drawdown %" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
