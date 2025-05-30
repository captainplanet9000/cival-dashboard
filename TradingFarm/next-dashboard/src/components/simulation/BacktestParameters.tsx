"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  CalendarIcon, Play, HelpCircle, Clock, Settings, BarChart2, 
  ArrowRightLeft, Gauge, RefreshCw, History, PlusCircle
} from "lucide-react";
import { format } from "date-fns";

interface BacktestParametersProps {
  onRunBacktest: (params: any) => void;
  onSaveParameters: (params: any) => void;
  defaultParams?: any;
}

export function BacktestParameters({
  onRunBacktest,
  onSaveParameters,
  defaultParams
}: BacktestParametersProps) {
  // Date picker state
  const [startDate, setStartDate] = useState<Date | undefined>(
    defaultParams?.startDate ? new Date(defaultParams.startDate) : new Date(2024, 0, 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    defaultParams?.endDate ? new Date(defaultParams.endDate) : new Date()
  );
  
  // Form state
  const [symbol, setSymbol] = useState(defaultParams?.symbol || "BTC/USD");
  const [timeframe, setTimeframe] = useState(defaultParams?.timeframe || "1h");
  const [strategyType, setStrategyType] = useState(defaultParams?.strategyType || "momentum");
  const [initialCapital, setInitialCapital] = useState(defaultParams?.initialCapital || 10000);
  const [leverage, setLeverage] = useState(defaultParams?.leverage || 1);
  const [slippage, setSlippage] = useState(defaultParams?.slippage || 0.05);
  const [feePercentage, setFeePercentage] = useState(defaultParams?.feePercentage || 0.1);
  const [positionSizing, setPositionSizing] = useState(defaultParams?.positionSizing || "percentage");
  const [positionSize, setPositionSize] = useState(defaultParams?.positionSize || 10);
  const [useStopLoss, setUseStopLoss] = useState(defaultParams?.useStopLoss || true);
  const [stopLossPercentage, setStopLossPercentage] = useState(defaultParams?.stopLossPercentage || 5);
  const [useTakeProfit, setUseTakeProfit] = useState(defaultParams?.useTakeProfit || true);
  const [takeProfitPercentage, setTakeProfitPercentage] = useState(defaultParams?.takeProfitPercentage || 15);
  const [runMonteCarloSimulation, setRunMonteCarloSimulation] = useState(defaultParams?.runMonteCarloSimulation || false);
  const [monteCarloIterations, setMonteCarloIterations] = useState(defaultParams?.monteCarloIterations || 100);
  
  // Strategy-specific parameters for different strategy types
  const [momentumPeriod, setMomentumPeriod] = useState(defaultParams?.momentumPeriod || 14);
  const [meanReversionLookback, setMeanReversionLookback] = useState(defaultParams?.meanReversionLookback || 20);
  const [breakoutPeriod, setBreakoutPeriod] = useState(defaultParams?.breakoutPeriod || 20);
  
  // Available symbols
  const availableSymbols = [
    { value: "BTC/USD", label: "Bitcoin (BTC/USD)" },
    { value: "ETH/USD", label: "Ethereum (ETH/USD)" },
    { value: "SOL/USD", label: "Solana (SOL/USD)" },
    { value: "AAPL", label: "Apple Inc. (AAPL)" },
    { value: "MSFT", label: "Microsoft (MSFT)" },
    { value: "AMZN", label: "Amazon (AMZN)" },
    { value: "GOOGL", label: "Google (GOOGL)" },
    { value: "TSLA", label: "Tesla (TSLA)" },
    { value: "EUR/USD", label: "Euro/USD (EUR/USD)" },
    { value: "GBP/USD", label: "British Pound/USD (GBP/USD)" }
  ];
  
  // Available timeframes
  const availableTimeframes = [
    { value: "1m", label: "1 Minute" },
    { value: "5m", label: "5 Minutes" },
    { value: "15m", label: "15 Minutes" },
    { value: "30m", label: "30 Minutes" },
    { value: "1h", label: "1 Hour" },
    { value: "4h", label: "4 Hours" },
    { value: "1d", label: "1 Day" },
    { value: "1w", label: "1 Week" }
  ];
  
  // Available strategy types
  const availableStrategyTypes = [
    { value: "momentum", label: "Momentum Trading" },
    { value: "mean_reversion", label: "Mean Reversion" },
    { value: "breakout", label: "Breakout Strategy" },
    { value: "trend_following", label: "Trend Following" },
    { value: "custom", label: "Custom Strategy" }
  ];
  
  // Position sizing options
  const positionSizingOptions = [
    { value: "fixed", label: "Fixed Size" },
    { value: "percentage", label: "Percentage of Capital" },
    { value: "risk_based", label: "Risk-Based Position Sizing" },
    { value: "kelly", label: "Kelly Criterion" }
  ];
  
  // Handle run backtest
  const handleRunBacktest = () => {
    // Prepare common parameters
    const params = {
      symbol,
      timeframe,
      strategyType,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      initialCapital,
      leverage,
      slippage,
      feePercentage,
      positionSizing,
      positionSize,
      useStopLoss,
      stopLossPercentage,
      useTakeProfit,
      takeProfitPercentage,
      runMonteCarloSimulation,
      monteCarloIterations
    };
    
    // Add strategy-specific parameters
    if (strategyType === "momentum") {
      Object.assign(params, { momentumPeriod });
    } else if (strategyType === "mean_reversion") {
      Object.assign(params, { meanReversionLookback });
    } else if (strategyType === "breakout") {
      Object.assign(params, { breakoutPeriod });
    }
    
    onRunBacktest(params);
  };
  
  // Handle save parameters
  const handleSaveParameters = () => {
    // Similar to handleRunBacktest but for saving
    const params = {
      symbol,
      timeframe,
      strategyType,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      initialCapital,
      leverage,
      slippage,
      feePercentage,
      positionSizing,
      positionSize,
      useStopLoss,
      stopLossPercentage,
      useTakeProfit,
      takeProfitPercentage,
      runMonteCarloSimulation,
      monteCarloIterations
    };
    
    // Add strategy-specific parameters
    if (strategyType === "momentum") {
      Object.assign(params, { momentumPeriod });
    } else if (strategyType === "mean_reversion") {
      Object.assign(params, { meanReversionLookback });
    } else if (strategyType === "breakout") {
      Object.assign(params, { breakoutPeriod });
    }
    
    onSaveParameters(params);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backtest Parameters</CardTitle>
        <CardDescription>
          Configure parameters for strategy backtesting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="market" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="market">
              <BarChart2 className="h-4 w-4 mr-2" />
              Market
            </TabsTrigger>
            <TabsTrigger value="strategy">
              <Settings className="h-4 w-4 mr-2" />
              Strategy
            </TabsTrigger>
            <TabsTrigger value="execution">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Execution
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="market" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Market Symbol</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger id="symbol">
                  <SelectValue placeholder="Select Symbol" />
                </SelectTrigger>
                <SelectContent>
                  {availableSymbols.map(sym => (
                    <SelectItem key={sym.value} value={sym.value}>
                      {sym.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger id="timeframe">
                  <SelectValue placeholder="Select Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {availableTimeframes.map(tf => (
                    <SelectItem key={tf.value} value={tf.value}>
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="initial-capital" className="flex items-center">
                  <span>Initial Capital ($)</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Starting capital for the backtest</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
              </div>
              <Input
                id="initial-capital"
                type="number"
                min="100"
                value={initialCapital}
                onChange={(e) => setInitialCapital(parseFloat(e.target.value))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="run-monte-carlo" className="flex items-center cursor-pointer">
                <RefreshCw className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>Run Monte Carlo Simulation</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Generate multiple backtest variations to analyze risk</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Switch
                id="run-monte-carlo"
                checked={runMonteCarloSimulation}
                onCheckedChange={setRunMonteCarloSimulation}
              />
            </div>
            
            {runMonteCarloSimulation && (
              <div className="space-y-2 pl-6 border-l-2 border-muted">
                <div className="flex justify-between items-center">
                  <Label htmlFor="monte-carlo-iterations" className="text-sm">Iterations</Label>
                  <span className="text-sm text-muted-foreground">{monteCarloIterations}</span>
                </div>
                <Slider
                  id="monte-carlo-iterations"
                  min={10}
                  max={1000}
                  step={10}
                  value={[monteCarloIterations]}
                  onValueChange={(value) => setMonteCarloIterations(value[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10</span>
                  <span>1000</span>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="strategy" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="strategy-type">Strategy Type</Label>
              <Select value={strategyType} onValueChange={setStrategyType}>
                <SelectTrigger id="strategy-type">
                  <SelectValue placeholder="Select Strategy Type" />
                </SelectTrigger>
                <SelectContent>
                  {availableStrategyTypes.map(strategy => (
                    <SelectItem key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {strategyType === "momentum" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="momentum-period" className="flex items-center">
                    <span>Momentum Period</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Number of periods for momentum calculation (e.g., RSI period)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <span className="text-sm text-muted-foreground">{momentumPeriod}</span>
                </div>
                <Slider
                  id="momentum-period"
                  min={2}
                  max={50}
                  step={1}
                  value={[momentumPeriod]}
                  onValueChange={(value) => setMomentumPeriod(value[0])}
                />
              </div>
            )}
            
            {strategyType === "mean_reversion" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="mean-reversion-lookback" className="flex items-center">
                    <span>Lookback Period</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Period for calculating the mean price or moving average</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <span className="text-sm text-muted-foreground">{meanReversionLookback}</span>
                </div>
                <Slider
                  id="mean-reversion-lookback"
                  min={5}
                  max={100}
                  step={1}
                  value={[meanReversionLookback]}
                  onValueChange={(value) => setMeanReversionLookback(value[0])}
                />
              </div>
            )}
            
            {strategyType === "breakout" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="breakout-period" className="flex items-center">
                    <span>Breakout Period</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Period for calculating support/resistance levels</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <span className="text-sm text-muted-foreground">{breakoutPeriod}</span>
                </div>
                <Slider
                  id="breakout-period"
                  min={5}
                  max={100}
                  step={1}
                  value={[breakoutPeriod]}
                  onValueChange={(value) => setBreakoutPeriod(value[0])}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="use-stop-loss" className="flex items-center cursor-pointer">
                  <span>Use Stop Loss</span>
                </Label>
                <Switch
                  id="use-stop-loss"
                  checked={useStopLoss}
                  onCheckedChange={setUseStopLoss}
                />
              </div>
              
              {useStopLoss && (
                <div className="space-y-2 pl-6 border-l-2 border-muted">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="stop-loss-percentage" className="text-sm">Stop Loss (%)</Label>
                    <span className="text-sm text-muted-foreground">{stopLossPercentage}%</span>
                  </div>
                  <Slider
                    id="stop-loss-percentage"
                    min={0.5}
                    max={20}
                    step={0.5}
                    value={[stopLossPercentage]}
                    onValueChange={(value) => setStopLossPercentage(value[0])}
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="use-take-profit" className="flex items-center cursor-pointer">
                  <span>Use Take Profit</span>
                </Label>
                <Switch
                  id="use-take-profit"
                  checked={useTakeProfit}
                  onCheckedChange={setUseTakeProfit}
                />
              </div>
              
              {useTakeProfit && (
                <div className="space-y-2 pl-6 border-l-2 border-muted">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="take-profit-percentage" className="text-sm">Take Profit (%)</Label>
                    <span className="text-sm text-muted-foreground">{takeProfitPercentage}%</span>
                  </div>
                  <Slider
                    id="take-profit-percentage"
                    min={1}
                    max={50}
                    step={1}
                    value={[takeProfitPercentage]}
                    onValueChange={(value) => setTakeProfitPercentage(value[0])}
                  />
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="execution" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="position-sizing">Position Sizing Method</Label>
              <Select value={positionSizing} onValueChange={setPositionSizing}>
                <SelectTrigger id="position-sizing">
                  <SelectValue placeholder="Select Position Sizing" />
                </SelectTrigger>
                <SelectContent>
                  {positionSizingOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="position-size" className="flex items-center">
                  <span>
                    {positionSizing === "fixed" ? "Fixed Position Size ($)" : 
                    positionSizing === "percentage" ? "Position Size (% of Capital)" :
                    positionSizing === "risk_based" ? "Risk per Trade (%)" :
                    "Kelly Fraction (0-1)"}
                  </span>
                </Label>
                <span className="text-sm text-muted-foreground">
                  {positionSizing === "percentage" || positionSizing === "risk_based" ? `${positionSize}%` : positionSize}
                </span>
              </div>
              <Slider
                id="position-size"
                min={positionSizing === "fixed" ? 100 : positionSizing === "kelly" ? 0.1 : 1}
                max={positionSizing === "fixed" ? 10000 : positionSizing === "kelly" ? 1 : 100}
                step={positionSizing === "fixed" ? 100 : positionSizing === "kelly" ? 0.1 : 1}
                value={[positionSize]}
                onValueChange={(value) => setPositionSize(value[0])}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="leverage" className="flex items-center">
                  <span>Leverage</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Trading leverage (1x = no leverage)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <span className="text-sm text-muted-foreground">{leverage}x</span>
              </div>
              <Slider
                id="leverage"
                min={1}
                max={20}
                step={1}
                value={[leverage]}
                onValueChange={(value) => setLeverage(value[0])}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="slippage" className="flex items-center text-sm">
                    <span>Slippage (%)</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Price slippage on trade execution</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
                <Input
                  id="slippage"
                  type="number"
                  min="0"
                  step="0.01"
                  value={slippage}
                  onChange={(e) => setSlippage(parseFloat(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="fee-percentage" className="flex items-center text-sm">
                    <span>Fee (%)</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Trading fee percentage</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
                <Input
                  id="fee-percentage"
                  type="number"
                  min="0"
                  step="0.01"
                  value={feePercentage}
                  onChange={(e) => setFeePercentage(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleSaveParameters}>
            Save Parameters
          </Button>
          <Button onClick={handleRunBacktest}>
            <Play className="h-4 w-4 mr-2" />
            Run Backtest
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
