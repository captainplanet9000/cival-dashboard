'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { AlertCircle, Settings, Play, BarChart2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StrategyType } from '@/services/trading-strategy-service';

interface StrategyParameter {
  name: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  defaultValue: any;
  options?: Array<{ value: string; label: string; }>;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

interface StrategyDefinition {
  type: StrategyType;
  name: string;
  description: string;
  parameters: StrategyParameter[];
}

interface StrategyConfiguration {
  strategyType: StrategyType;
  parameters: Record<string, any>;
}

interface StrategySelectorProps {
  agentId: string;
  farmId: string;
  symbol: string;
  exchangeId: string;
  onStrategySelected?: (strategy: StrategyConfiguration) => void;
}

// Predefined strategy definitions
const STRATEGY_DEFINITIONS: StrategyDefinition[] = [
  {
    type: 'trend_following',
    name: 'Trend Following',
    description: 'Strategy that follows the market trend using moving averages',
    parameters: [
      {
        name: 'fastPeriod',
        label: 'Fast Period',
        type: 'number',
        defaultValue: 9,
        min: 2,
        max: 50,
        step: 1,
        description: 'Short-term moving average period'
      },
      {
        name: 'slowPeriod',
        label: 'Slow Period',
        type: 'number',
        defaultValue: 21,
        min: 5,
        max: 200,
        step: 1,
        description: 'Long-term moving average period'
      },
      {
        name: 'signalPeriod',
        label: 'Signal Period',
        type: 'number',
        defaultValue: 9,
        min: 2,
        max: 50,
        step: 1,
        description: 'Signal line period'
      },
      {
        name: 'useRSI',
        label: 'Use RSI Filter',
        type: 'boolean',
        defaultValue: true,
        description: 'Use RSI as an additional filter for entries'
      }
    ]
  },
  {
    type: 'mean_reversion',
    name: 'Mean Reversion',
    description: 'Strategy that trades based on the price reverting to the mean',
    parameters: [
      {
        name: 'period',
        label: 'Period',
        type: 'number',
        defaultValue: 20,
        min: 5,
        max: 100,
        step: 1,
        description: 'Lookback period for calculating the mean'
      },
      {
        name: 'stdDevMultiplier',
        label: 'Standard Deviation Multiplier',
        type: 'number',
        defaultValue: 2,
        min: 0.5,
        max: 4,
        step: 0.1,
        description: 'Multiplier for standard deviation bands'
      },
      {
        name: 'useVolatilityFilter',
        label: 'Use Volatility Filter',
        type: 'boolean',
        defaultValue: true,
        description: 'Only trade during periods of normal volatility'
      }
    ]
  },
  {
    type: 'breakout',
    name: 'Breakout',
    description: 'Strategy that trades breakouts from key levels',
    parameters: [
      {
        name: 'period',
        label: 'Period',
        type: 'number',
        defaultValue: 20,
        min: 5,
        max: 100,
        step: 1,
        description: 'Lookback period for identifying range'
      },
      {
        name: 'confirmationCandles',
        label: 'Confirmation Candles',
        type: 'number',
        defaultValue: 2,
        min: 1,
        max: 10,
        step: 1,
        description: 'Number of candles needed to confirm breakout'
      },
      {
        name: 'volumeThreshold',
        label: 'Volume Threshold',
        type: 'number',
        defaultValue: 1.5,
        min: 1,
        max: 5,
        step: 0.1,
        description: 'Volume must be this multiple of average volume'
      }
    ]
  },
  {
    type: 'grid_trading',
    name: 'Grid Trading',
    description: 'Strategy that places orders at regular intervals within a range',
    parameters: [
      {
        name: 'upperPrice',
        label: 'Upper Price',
        type: 'number',
        defaultValue: 0,
        min: 0,
        step: 0.01,
        description: 'Upper bound of the grid (0 for auto-detect)'
      },
      {
        name: 'lowerPrice',
        label: 'Lower Price',
        type: 'number',
        defaultValue: 0,
        min: 0,
        step: 0.01,
        description: 'Lower bound of the grid (0 for auto-detect)'
      },
      {
        name: 'gridLevels',
        label: 'Grid Levels',
        type: 'number',
        defaultValue: 5,
        min: 3,
        max: 20,
        step: 1,
        description: 'Number of grid levels'
      },
      {
        name: 'useARMAlgorithm',
        label: 'Use Adaptive Range Management',
        type: 'boolean',
        defaultValue: true,
        description: 'Dynamically adjust grid range based on market conditions'
      }
    ]
  },
  {
    type: 'scalping',
    name: 'Scalping',
    description: 'Strategy for very short-term trades with small profits',
    parameters: [
      {
        name: 'timeframe',
        label: 'Timeframe',
        type: 'select',
        defaultValue: '1m',
        options: [
          { value: '1m', label: '1 Minute' },
          { value: '3m', label: '3 Minutes' },
          { value: '5m', label: '5 Minutes' }
        ],
        description: 'Trading timeframe'
      },
      {
        name: 'profitTarget',
        label: 'Profit Target (%)',
        type: 'number',
        defaultValue: 0.2,
        min: 0.05,
        max: 1,
        step: 0.05,
        description: 'Target profit percentage'
      },
      {
        name: 'stopLoss',
        label: 'Stop Loss (%)',
        type: 'number',
        defaultValue: 0.1,
        min: 0.05,
        max: 0.5,
        step: 0.05,
        description: 'Stop loss percentage'
      },
      {
        name: 'maxTradeDuration',
        label: 'Max Trade Duration (min)',
        type: 'number',
        defaultValue: 15,
        min: 1,
        max: 60,
        step: 1,
        description: 'Maximum time to keep a position open'
      }
    ]
  }
];

export function StrategySelector({ 
  agentId, 
  farmId, 
  symbol, 
  exchangeId,
  onStrategySelected 
}: StrategySelectorProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType | ''>('');
  const [selectedStrategyDef, setSelectedStrategyDef] = useState<StrategyDefinition | null>(null);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  
  // Set up default parameters for selected strategy
  useEffect(() => {
    if (selectedStrategy) {
      const strategyDef = STRATEGY_DEFINITIONS.find(s => s.type === selectedStrategy);
      if (strategyDef) {
        setSelectedStrategyDef(strategyDef);
        
        // Initialize parameters with default values
        const defaultParams = strategyDef.parameters.reduce((obj, param) => {
          obj[param.name] = param.defaultValue;
          return obj;
        }, {} as Record<string, any>);
        
        setParameters(defaultParams);
      } else {
        setSelectedStrategyDef(null);
        setParameters({});
      }
    } else {
      setSelectedStrategyDef(null);
      setParameters({});
    }
  }, [selectedStrategy]);
  
  // Update a parameter value
  const updateParameter = (name: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Apply the strategy
  const applyStrategy = () => {
    if (!selectedStrategy || !selectedStrategyDef) {
      setError('Please select a strategy');
      return;
    }
    
    // Validate parameters
    for (const param of selectedStrategyDef.parameters) {
      if (param.type === 'number' && param.min !== undefined && parameters[param.name] < param.min) {
        setError(`${param.label} must be at least ${param.min}`);
        return;
      }
      if (param.type === 'number' && param.max !== undefined && parameters[param.name] > param.max) {
        setError(`${param.label} must be at most ${param.max}`);
        return;
      }
    }
    
    const strategyConfig: StrategyConfiguration = {
      strategyType: selectedStrategy as StrategyType,
      parameters: { ...parameters }
    };
    
    // Call the callback if provided
    if (onStrategySelected) {
      onStrategySelected(strategyConfig);
    }
    
    setError(null);
    
    toast({
      title: 'Strategy Applied',
      description: `${selectedStrategyDef.name} strategy with custom parameters`,
    });
  };
  
  // Render parameter input based on type
  const renderParameterInput = (param: StrategyParameter) => {
    switch (param.type) {
      case 'number':
        return (
          <Input
            id={param.name}
            type="number"
            min={param.min}
            max={param.max}
            step={param.step || 1}
            value={parameters[param.name] || ''}
            onChange={(e) => updateParameter(param.name, parseFloat(e.target.value))}
          />
        );
      case 'string':
        return (
          <Input
            id={param.name}
            type="text"
            value={parameters[param.name] || ''}
            onChange={(e) => updateParameter(param.name, e.target.value)}
          />
        );
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={param.name}
              checked={parameters[param.name] || false}
              onCheckedChange={(checked) => updateParameter(param.name, checked)}
            />
            <Label htmlFor={param.name}>
              {parameters[param.name] ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        );
      case 'select':
        return (
          <Select
            value={parameters[param.name] || ''}
            onValueChange={(value) => updateParameter(param.name, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              {param.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return null;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Trading Strategy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="strategy">Select Strategy</Label>
          <Select
            value={selectedStrategy}
            onValueChange={(value) => setSelectedStrategy(value as StrategyType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a trading strategy" />
            </SelectTrigger>
            <SelectContent>
              {STRATEGY_DEFINITIONS.map((strategy) => (
                <SelectItem key={strategy.type} value={strategy.type}>
                  {strategy.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedStrategyDef && (
          <>
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm">{selectedStrategyDef.description}</p>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Strategy Parameters</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                {selectedStrategyDef.parameters.map((param) => (
                  <div key={param.name} className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor={param.name}>{param.label}</Label>
                    </div>
                    {renderParameterInput(param)}
                    {param.description && (
                      <p className="text-xs text-muted-foreground">{param.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-end space-x-2">
              <Button onClick={applyStrategy} className="w-full" variant="default">
                <Settings className="h-4 w-4 mr-2" />
                Apply Strategy
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
