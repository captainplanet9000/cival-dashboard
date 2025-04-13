'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

interface TimeframeOption {
  value: string;
  label: string;
}

interface SymbolOption {
  value: string;
  label: string;
}

interface BacktestParametersFormProps {
  parameters: any;
  onParamChange: (key: string, value: any) => void;
  onStrategyParamChange: (path: string[], value: any) => void;
  timeframeOptions: TimeframeOption[];
  symbolOptions: SymbolOption[];
}

export function BacktestParametersForm({
  parameters,
  onParamChange,
  onStrategyParamChange,
  timeframeOptions,
  symbolOptions
}: BacktestParametersFormProps) {
  // Handle date changes
  const handleDateChange = (key: string, value: string) => {
    onParamChange(key, value);
  };
  
  // Handle numeric input changes
  const handleNumericChange = (key: string, value: string) => {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      onParamChange(key, numericValue);
    }
  };
  
  // Handle timeframe selection
  const handleTimeframeChange = (value: string) => {
    onParamChange('timeframes', [value]);
    onStrategyParamChange(['timeframe'], value);
  };
  
  // Handle symbol selection
  const handleSymbolChange = (value: string) => {
    onParamChange('symbols', [value]);
    onStrategyParamChange(['symbols'], [value]);
  };
  
  // Handle risk parameter changes
  const handleRiskParamChange = (key: string, value: string) => {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      onStrategyParamChange(['risk', key], numericValue);
    }
  };
  
  // Handle indicator weight changes
  const handleWeightChange = (indicator: string, value: number[]) => {
    onStrategyParamChange(['parameters', 'indicatorWeights', indicator], value[0]);
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Backtest Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={parameters.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={parameters.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select
                value={parameters.timeframes[0]}
                onValueChange={handleTimeframeChange}
              >
                <SelectTrigger id="timeframe">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {timeframeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="symbol">Trading Pair</Label>
              <Select
                value={parameters.symbols[0]}
                onValueChange={handleSymbolChange}
              >
                <SelectTrigger id="symbol">
                  <SelectValue placeholder="Select trading pair" />
                </SelectTrigger>
                <SelectContent>
                  {symbolOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initialCapital">Initial Capital ($)</Label>
              <Input
                id="initialCapital"
                type="number"
                min="1000"
                step="1000"
                value={parameters.initialCapital}
                onChange={(e) => handleNumericChange('initialCapital', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="executionDelay">Execution Delay (ms)</Label>
              <Input
                id="executionDelay"
                type="number"
                min="0"
                step="100"
                value={parameters.executionDelay}
                onChange={(e) => handleNumericChange('executionDelay', e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="feesPercentage">Trading Fees (%)</Label>
              <Input
                id="feesPercentage"
                type="number"
                min="0"
                step="0.01"
                value={parameters.feesPercentage}
                onChange={(e) => handleNumericChange('feesPercentage', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slippagePercentage">Slippage (%)</Label>
              <Input
                id="slippagePercentage"
                type="number"
                min="0"
                step="0.01"
                value={parameters.slippagePercentage}
                onChange={(e) => handleNumericChange('slippagePercentage', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Risk Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxPositionSize">Max Position Size (%)</Label>
              <Input
                id="maxPositionSize"
                type="number"
                min="1"
                max="100"
                step="1"
                value={parameters.strategyParams.risk.maxPositionSize}
                onChange={(e) => handleRiskParamChange('maxPositionSize', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum position size as a percentage of capital
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxDrawdown">Max Risk Per Trade (%)</Label>
              <Input
                id="maxDrawdown"
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={parameters.strategyParams.risk.maxDrawdown}
                onChange={(e) => handleRiskParamChange('maxDrawdown', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum risk percentage per trade
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stopLossPercent">Stop Loss (%)</Label>
              <Input
                id="stopLossPercent"
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                value={parameters.strategyParams.risk.stopLossPercent}
                onChange={(e) => handleRiskParamChange('stopLossPercent', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Default stop loss percentage
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="takeProfitPercent">Take Profit (%)</Label>
              <Input
                id="takeProfitPercent"
                type="number"
                min="0.1"
                max="50"
                step="0.1"
                value={parameters.strategyParams.risk.takeProfitPercent}
                onChange={(e) => handleRiskParamChange('takeProfitPercent', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Default take profit percentage
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {parameters.strategyId === 'ai-adaptive-strategy' && (
        <Card>
          <CardHeader>
            <CardTitle>AI Adaptive Strategy Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="indicators">
                <AccordionTrigger>Indicator Weights</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="trend-weight">Trend ({(parameters.strategyParams.parameters.indicatorWeights.trend * 100).toFixed(0)}%)</Label>
                        <span className="text-sm">{parameters.strategyParams.parameters.indicatorWeights.trend.toFixed(1)}</span>
                      </div>
                      <Slider
                        id="trend-weight"
                        min={0}
                        max={1}
                        step={0.1}
                        value={[parameters.strategyParams.parameters.indicatorWeights.trend]}
                        onValueChange={(value) => handleWeightChange('trend', value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Weight of trend-following indicators (EMAs, MACD)
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="momentum-weight">Momentum ({(parameters.strategyParams.parameters.indicatorWeights.momentum * 100).toFixed(0)}%)</Label>
                        <span className="text-sm">{parameters.strategyParams.parameters.indicatorWeights.momentum.toFixed(1)}</span>
                      </div>
                      <Slider
                        id="momentum-weight"
                        min={0}
                        max={1}
                        step={0.1}
                        value={[parameters.strategyParams.parameters.indicatorWeights.momentum]}
                        onValueChange={(value) => handleWeightChange('momentum', value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Weight of momentum indicators (RSI, Stochastic)
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="volatility-weight">Volatility ({(parameters.strategyParams.parameters.indicatorWeights.volatility * 100).toFixed(0)}%)</Label>
                        <span className="text-sm">{parameters.strategyParams.parameters.indicatorWeights.volatility.toFixed(1)}</span>
                      </div>
                      <Slider
                        id="volatility-weight"
                        min={0}
                        max={1}
                        step={0.1}
                        value={[parameters.strategyParams.parameters.indicatorWeights.volatility]}
                        onValueChange={(value) => handleWeightChange('volatility', value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Weight of volatility indicators (Bollinger Bands, ATR)
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="volume-weight">Volume ({(parameters.strategyParams.parameters.indicatorWeights.volume * 100).toFixed(0)}%)</Label>
                        <span className="text-sm">{parameters.strategyParams.parameters.indicatorWeights.volume.toFixed(1)}</span>
                      </div>
                      <Slider
                        id="volume-weight"
                        min={0}
                        max={1}
                        step={0.1}
                        value={[parameters.strategyParams.parameters.indicatorWeights.volume]}
                        onValueChange={(value) => handleWeightChange('volume', value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Weight of volume indicators (OBV, VWAP)
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="adaptive-settings">
                <AccordionTrigger>AI Adaptation Settings</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Adaptation Frequency</Label>
                      <RadioGroup
                        defaultValue="daily"
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="hourly" id="hourly" />
                          <Label htmlFor="hourly">Hourly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="daily" id="daily" />
                          <Label htmlFor="daily">Daily</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="weekly" id="weekly" />
                          <Label htmlFor="weekly">Weekly</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="market-regime"
                        defaultChecked={true}
                      />
                      <Label htmlFor="market-regime">Market Regime Detection</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Automatically detect and adapt to different market conditions (trending, ranging, volatile)
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}
    </>
  );
}
