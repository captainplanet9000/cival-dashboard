"use client";

import React, { useState } from "react";
import { BacktestParameters } from "./BacktestParameters";
import { StrategyComparisonChart } from "./StrategyComparisonChart";
import { RiskMetricsDisplay } from "./RiskMetricsDisplay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Play, Pause, Save, Download, Copy, AlertTriangle, CheckCircle,
  BarChart2, LineChart, Share2, History, FileText, RefreshCw
} from "lucide-react";

interface StrategyBacktestSuiteProps {
  onSaveBacktest?: (data: any) => void;
  onExportResults?: (data: any) => void;
  initialStrategyId?: string;
}

export function StrategyBacktestSuite({
  onSaveBacktest,
  onExportResults,
  initialStrategyId
}: StrategyBacktestSuiteProps) {
  // Backtest state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [backtestCompleted, setBacktestCompleted] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(initialStrategyId || null);
  const [isComparing, setIsComparing] = useState(false);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>(initialStrategyId ? [initialStrategyId] : []);
  
  // Mock strategies for display
  const availableStrategies = [
    { id: "strat-1", name: "Momentum Strategy", color: "#2563eb", type: "momentum" },
    { id: "strat-2", name: "Mean Reversion", color: "#db2777", type: "mean_reversion" },
    { id: "strat-3", name: "Breakout Strategy", color: "#16a34a", type: "breakout" },
    { id: "strat-4", name: "Trend Following", color: "#8b5cf6", type: "trend_following" },
    { id: "strat-5", name: "Custom Strategy", color: "#f59e0b", type: "custom" }
  ];
  
  // Handle run backtest
  const handleRunBacktest = (params: any) => {
    setIsRunning(true);
    setBacktestCompleted(false);
    setProgress(0);
    
    // Simulate backtest progress
    const interval = setInterval(() => {
      setProgress(prevProgress => {
        const nextProgress = prevProgress + 5;
        
        if (nextProgress >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          setBacktestCompleted(true);
          return 100;
        }
        
        return nextProgress;
      });
    }, 300);
  };
  
  // Toggle strategy selection for comparison
  const toggleStrategySelection = (strategyId: string) => {
    if (selectedStrategies.includes(strategyId)) {
      setSelectedStrategies(selectedStrategies.filter(id => id !== strategyId));
    } else {
      setSelectedStrategies([...selectedStrategies, strategyId]);
    }
  };
  
  // Get selected strategy data
  const getSelectedStrategyData = () => {
    if (!selectedStrategy) return null;
    
    const strategy = availableStrategies.find(s => s.id === selectedStrategy);
    if (!strategy) return null;
    
    return {
      id: strategy.id,
      name: strategy.name,
      color: strategy.color,
      type: strategy.type
    };
  };
  
  // Prepare strategies for comparison
  const getComparisonStrategies = () => {
    return selectedStrategies.map(id => {
      const strategy = availableStrategies.find(s => s.id === id);
      if (!strategy) return null;
      
      return {
        id: strategy.id,
        name: strategy.name,
        color: strategy.color,
        type: strategy.type
      };
    }).filter(Boolean);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Strategy Backtesting Suite</h2>
          <p className="text-muted-foreground">
            Comprehensive tools for testing and comparing trading strategies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!backtestCompleted}>
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
          <Button variant="outline" size="sm" disabled={!backtestCompleted}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Backtest
          </Button>
          <Button variant="default" size="sm" disabled={!backtestCompleted}>
            <Save className="h-4 w-4 mr-2" />
            Save Backtest
          </Button>
        </div>
      </div>
      
      {/* Backtest progress indicator */}
      {progress > 0 && progress < 100 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Badge variant={isRunning ? "default" : "outline"}>
              {isRunning ? "Running Backtest" : "Paused"}
            </Badge>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
      
      {/* Backtest completed message */}
      {backtestCompleted && (
        <Card className="bg-muted/50 border-green-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div className="flex-1">
                <div className="font-medium">Backtest Completed Successfully</div>
                <p className="text-sm text-muted-foreground">
                  Backtest results are now available for analysis. You can explore performance metrics, compare strategies, or export results.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Again
                </Button>
                <Button variant="outline" size="sm">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  Analysis
                </Button>
                <Button size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main content */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <BacktestParameters 
            onRunBacktest={handleRunBacktest}
            onSaveParameters={() => {}}
          />
        </div>
        
        <div className="col-span-2">
          <Tabs defaultValue="comparison">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="comparison">
                <LineChart className="h-4 w-4 mr-2" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="risk">
                <BarChart2 className="h-4 w-4 mr-2" />
                Risk Analysis
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                Backtest History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="comparison" className="space-y-6 pt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Strategy Selection</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsComparing(!isComparing)}
                      >
                        {isComparing ? "Single Strategy" : "Compare Strategies"}
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {isComparing ? 
                      "Select multiple strategies to compare performance" : 
                      "Select a strategy to analyze performance"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isComparing ? (
                    <div className="flex flex-wrap gap-2">
                      {availableStrategies.map(strategy => (
                        <Badge
                          key={strategy.id}
                          variant={selectedStrategies.includes(strategy.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          style={{
                            backgroundColor: selectedStrategies.includes(strategy.id) ? strategy.color : "transparent",
                            color: selectedStrategies.includes(strategy.id) ? "white" : strategy.color,
                            borderColor: strategy.color
                          }}
                          onClick={() => toggleStrategySelection(strategy.id)}
                        >
                          {strategy.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <Select 
                      value={selectedStrategy || ""} 
                      onValueChange={(value) => setSelectedStrategy(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStrategies.map(strategy => (
                          <SelectItem key={strategy.id} value={strategy.id}>
                            {strategy.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>
              
              <StrategyComparisonChart 
                strategies={isComparing ? 
                  getComparisonStrategies() as any[] : 
                  selectedStrategy ? [getSelectedStrategyData()] as any[] : []
                }
              />
            </TabsContent>
            
            <TabsContent value="risk" className="space-y-6 pt-4">
              {selectedStrategy ? (
                <RiskMetricsDisplay 
                  strategy={getSelectedStrategyData() as any}
                />
              ) : (
                <Card className="py-12">
                  <CardContent className="text-center space-y-4">
                    <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                    <div className="space-y-2">
                      <h3 className="font-medium">No Strategy Selected</h3>
                      <p className="text-sm text-muted-foreground">
                        Please select a strategy from the Performance tab to view risk analysis
                      </p>
                      <Button variant="outline" className="mt-2">
                        Go to Performance Tab
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="history" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Backtest History</CardTitle>
                  <CardDescription>
                    Previously run backtests and saved configurations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Your backtest history will appear here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Monte Carlo Simulations (if available) */}
      {backtestCompleted && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Monte Carlo Simulations</CardTitle>
            <CardDescription>
              Probabilistic projection of strategy performance
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12 text-muted-foreground">
            <p>Monte Carlo simulation results will appear here when enabled in backtest parameters</p>
            <Button variant="outline" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Monte Carlo Simulation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
