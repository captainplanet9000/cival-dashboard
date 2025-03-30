import React, { useState, useEffect } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

interface PropertiesPanelProps {
  selectedNode: any;
  updateNodeData: (id: string, data: any) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  selectedNode, 
  updateNodeData 
}) => {
  const [label, setLabel] = useState('');
  const [parameters, setParameters] = useState<Record<string, any>>({});
  
  // Update local state when selected node changes
  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data.label || '');
      setParameters(selectedNode.data.parameters || {});
    } else {
      setLabel('');
      setParameters({});
    }
  }, [selectedNode]);
  
  // Apply label change to node
  const applyLabelChange = () => {
    if (selectedNode) {
      updateNodeData(selectedNode.id, { ...selectedNode.data, label });
    }
  };
  
  // Update parameter values
  const updateParameter = (key: string, value: any) => {
    const updatedParams = { ...parameters, [key]: value };
    setParameters(updatedParams);
    
    if (selectedNode) {
      updateNodeData(selectedNode.id, { 
        ...selectedNode.data, 
        parameters: updatedParams 
      });
    }
  };
  
  // Render indicator-specific parameters
  const renderIndicatorParams = () => {
    const indicatorType = parameters.indicator || selectedNode?.data?.indicator;
    
    switch (indicatorType) {
      case 'sma':
      case 'ema':
        return (
          <>
            <div className="mb-4">
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                type="number"
                value={parameters.period || 14}
                onChange={(e) => updateParameter('period', parseInt(e.target.value))}
                min={1}
                max={200}
                className="mt-1"
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="source">Price Source</Label>
              <Select
                value={parameters.source || 'close'}
                onValueChange={(value) => updateParameter('source', value)}
              >
                <SelectTrigger id="source">
                  <SelectValue placeholder="Select price source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="close">Close</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="hl2">(High + Low) / 2</SelectItem>
                  <SelectItem value="hlc3">(High + Low + Close) / 3</SelectItem>
                  <SelectItem value="ohlc4">(Open + High + Low + Close) / 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
        
      case 'macd':
        return (
          <>
            <div className="mb-4">
              <Label htmlFor="fastPeriod">Fast Period</Label>
              <Input
                id="fastPeriod"
                type="number"
                value={parameters.fastPeriod || 12}
                onChange={(e) => updateParameter('fastPeriod', parseInt(e.target.value))}
                min={1}
                max={100}
                className="mt-1"
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="slowPeriod">Slow Period</Label>
              <Input
                id="slowPeriod"
                type="number"
                value={parameters.slowPeriod || 26}
                onChange={(e) => updateParameter('slowPeriod', parseInt(e.target.value))}
                min={1}
                max={100}
                className="mt-1"
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="signalPeriod">Signal Period</Label>
              <Input
                id="signalPeriod"
                type="number"
                value={parameters.signalPeriod || 9}
                onChange={(e) => updateParameter('signalPeriod', parseInt(e.target.value))}
                min={1}
                max={100}
                className="mt-1"
              />
            </div>
          </>
        );
        
      case 'rsi':
        return (
          <>
            <div className="mb-4">
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                type="number"
                value={parameters.period || 14}
                onChange={(e) => updateParameter('period', parseInt(e.target.value))}
                min={1}
                max={100}
                className="mt-1"
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="overbought">Overbought Level</Label>
              <Input
                id="overbought"
                type="number"
                value={parameters.overbought || 70}
                onChange={(e) => updateParameter('overbought', parseInt(e.target.value))}
                min={50}
                max={100}
                className="mt-1"
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="oversold">Oversold Level</Label>
              <Input
                id="oversold"
                type="number"
                value={parameters.oversold || 30}
                onChange={(e) => updateParameter('oversold', parseInt(e.target.value))}
                min={0}
                max={50}
                className="mt-1"
              />
            </div>
          </>
        );
        
      case 'bbands':
        return (
          <>
            <div className="mb-4">
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                type="number"
                value={parameters.period || 20}
                onChange={(e) => updateParameter('period', parseInt(e.target.value))}
                min={1}
                max={100}
                className="mt-1"
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="stdDev">Standard Deviation</Label>
              <Input
                id="stdDev"
                type="number"
                value={parameters.stdDev || 2}
                onChange={(e) => updateParameter('stdDev', parseFloat(e.target.value))}
                min={0.1}
                max={5}
                step={0.1}
                className="mt-1"
              />
            </div>
          </>
        );
        
      default:
        return (
          <div className="text-sm text-muted-foreground p-2">
            Select an indicator type to see its parameters
          </div>
        );
    }
  };
  
  // Render filter-specific parameters
  const renderFilterParams = () => {
    const filterType = parameters.filter || selectedNode?.data?.filter;
    
    switch (filterType) {
      case 'time':
        return (
          <>
            <div className="mb-4">
              <Label htmlFor="startTime">Start Time (24h)</Label>
              <Input
                id="startTime"
                type="time"
                value={parameters.startTime || '09:30'}
                onChange={(e) => updateParameter('startTime', e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="endTime">End Time (24h)</Label>
              <Input
                id="endTime"
                type="time"
                value={parameters.endTime || '16:00'}
                onChange={(e) => updateParameter('endTime', e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="mb-4 flex items-center justify-between">
              <Label htmlFor="excludeWeekends">Exclude Weekends</Label>
              <Switch
                id="excludeWeekends"
                checked={parameters.excludeWeekends !== false}
                onCheckedChange={(checked) => updateParameter('excludeWeekends', checked)}
              />
            </div>
          </>
        );
        
      case 'volume':
        return (
          <>
            <div className="mb-4">
              <Label htmlFor="minVolume">Minimum Volume</Label>
              <Input
                id="minVolume"
                type="number"
                value={parameters.minVolume || 1000}
                onChange={(e) => updateParameter('minVolume', parseInt(e.target.value))}
                min={0}
                className="mt-1"
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="relativeVolume">Relative Volume Factor</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Slider
                  id="relativeVolume"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={[parameters.relativeVolume || 1.5]}
                  onValueChange={(value) => updateParameter('relativeVolume', value[0])}
                />
                <span className="w-12 text-center">{parameters.relativeVolume || 1.5}x</span>
              </div>
            </div>
          </>
        );
        
      case 'price':
        return (
          <>
            <div className="mb-4">
              <Label htmlFor="minPrice">Minimum Price</Label>
              <Input
                id="minPrice"
                type="number"
                value={parameters.minPrice || 1}
                onChange={(e) => updateParameter('minPrice', parseFloat(e.target.value))}
                min={0}
                step={0.01}
                className="mt-1"
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="maxPrice">Maximum Price</Label>
              <Input
                id="maxPrice"
                type="number"
                value={parameters.maxPrice || 1000}
                onChange={(e) => updateParameter('maxPrice', parseFloat(e.target.value))}
                min={0}
                step={0.01}
                className="mt-1"
              />
            </div>
          </>
        );
        
      default:
        return (
          <div className="text-sm text-muted-foreground p-2">
            Select a filter type to see its parameters
          </div>
        );
    }
  };
  
  // Render entry/exit node parameters
  const renderSignalParams = () => {
    return (
      <>
        <div className="mb-4">
          <Label htmlFor="direction">Direction</Label>
          <Select
            value={parameters.direction || 'long'}
            onValueChange={(value) => updateParameter('direction', value)}
          >
            <SelectTrigger id="direction">
              <SelectValue placeholder="Select direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {selectedNode?.type === 'entry' && (
          <div className="mb-4">
            <Label htmlFor="orderType">Order Type</Label>
            <Select
              value={parameters.orderType || 'market'}
              onValueChange={(value) => updateParameter('orderType', value)}
            >
              <SelectTrigger id="orderType">
                <SelectValue placeholder="Select order type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
                <SelectItem value="stop">Stop</SelectItem>
                <SelectItem value="stop_limit">Stop Limit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {selectedNode?.type === 'exit' && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <Label htmlFor="useStopLoss">Use Stop Loss</Label>
              <Switch
                id="useStopLoss"
                checked={parameters.useStopLoss || false}
                onCheckedChange={(checked) => updateParameter('useStopLoss', checked)}
              />
            </div>
            {parameters.useStopLoss && (
              <div className="mb-4">
                <Label htmlFor="stopLossValue">Stop Loss (%)</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Slider
                    id="stopLossValue"
                    min={0.1}
                    max={10}
                    step={0.1}
                    value={[parameters.stopLossValue || 2]}
                    onValueChange={(value) => updateParameter('stopLossValue', value[0])}
                  />
                  <span className="w-12 text-center">{parameters.stopLossValue || 2}%</span>
                </div>
              </div>
            )}
            <div className="mb-4 flex items-center justify-between">
              <Label htmlFor="useTakeProfit">Use Take Profit</Label>
              <Switch
                id="useTakeProfit"
                checked={parameters.useTakeProfit || false}
                onCheckedChange={(checked) => updateParameter('useTakeProfit', checked)}
              />
            </div>
            {parameters.useTakeProfit && (
              <div className="mb-4">
                <Label htmlFor="takeProfitValue">Take Profit (%)</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Slider
                    id="takeProfitValue"
                    min={0.1}
                    max={20}
                    step={0.1}
                    value={[parameters.takeProfitValue || 5]}
                    onValueChange={(value) => updateParameter('takeProfitValue', value[0])}
                  />
                  <span className="w-12 text-center">{parameters.takeProfitValue || 5}%</span>
                </div>
              </div>
            )}
          </>
        )}
      </>
    );
  };
  
  // Render condition parameters
  const renderConditionParams = () => {
    return (
      <>
        <div className="mb-4">
          <Label htmlFor="conditionType">Condition Type</Label>
          <Select
            value={parameters.conditionType || 'comparison'}
            onValueChange={(value) => updateParameter('conditionType', value)}
          >
            <SelectTrigger id="conditionType">
              <SelectValue placeholder="Select condition type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comparison">Price Comparison</SelectItem>
              <SelectItem value="crossover">Indicator Crossover</SelectItem>
              <SelectItem value="threshold">Indicator Threshold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {parameters.conditionType === 'comparison' && (
          <>
            <div className="mb-4">
              <Label htmlFor="comparisonOperator">Operator</Label>
              <Select
                value={parameters.comparisonOperator || 'greaterThan'}
                onValueChange={(value) => updateParameter('comparisonOperator', value)}
              >
                <SelectTrigger id="comparisonOperator">
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="greaterThan">Greater Than (>)</SelectItem>
                  <SelectItem value="lessThan">Less Than (<)</SelectItem>
                  <SelectItem value="equals">Equals (=)</SelectItem>
                  <SelectItem value="greaterThanOrEquals">Greater Than or Equals (>=)</SelectItem>
                  <SelectItem value="lessThanOrEquals">Less Than or Equals (<=)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </>
    );
  };
  
  // Render node-specific parameters based on node type
  const renderNodeTypeSpecificParams = () => {
    if (!selectedNode) return null;
    
    switch (selectedNode.type) {
      case 'indicator':
        return renderIndicatorParams();
      case 'filter':
        return renderFilterParams();
      case 'entry':
      case 'exit':
        return renderSignalParams();
      case 'condition':
        return renderConditionParams();
      default:
        return (
          <div className="text-sm text-muted-foreground p-2">
            No specific parameters for this node type
          </div>
        );
    }
  };
  
  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-lg">Properties</CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex items-center justify-center text-muted-foreground">
          Select a node to edit its properties
        </CardContent>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <CardHeader className="px-4 py-3 border-b">
        <CardTitle className="text-lg">Node Properties</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div>
          <Label htmlFor="node-label">Node Label</Label>
          <div className="flex mt-1 space-x-2">
            <Input
              id="node-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="flex-1"
            />
            <button
              className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm"
              onClick={applyLabelChange}
            >
              Apply
            </button>
          </div>
        </div>
        
        <Separator />
        
        <Tabs defaultValue="params" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="params">Parameters</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
          </TabsList>
          
          <TabsContent value="params" className="space-y-4 pt-2">
            {renderNodeTypeSpecificParams()}
          </TabsContent>
          
          <TabsContent value="style" className="space-y-4 pt-2">
            <div className="mb-4">
              <Label htmlFor="nodeColor">Node Color</Label>
              <Select
                value={parameters.nodeColor || 'default'}
                onValueChange={(value) => updateParameter('nodeColor', value)}
              >
                <SelectTrigger id="nodeColor">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="mb-4 flex items-center justify-between">
              <Label htmlFor="isHighlighted">Highlight Node</Label>
              <Switch
                id="isHighlighted"
                checked={parameters.isHighlighted || false}
                onCheckedChange={(checked) => updateParameter('isHighlighted', checked)}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="text-xs mt-2 text-muted-foreground">
          Node ID: {selectedNode.id}
        </div>
      </CardContent>
    </div>
  );
};

export default PropertiesPanel;
