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
      setLabel(selectedNode.data?.label || '');
      setParameters(selectedNode.data?.parameters || {});
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

  // Render common node parameters
  const renderCommonParams = () => (
    <>
      <div className="mb-4">
        <Label htmlFor="node-label">Label</Label>
        <Input
          id="node-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={applyLabelChange}
          placeholder="Node Label"
        />
      </div>
    </>
  );

  // Render data source parameters
  const renderDataSourceParams = () => (
    <>
      <div className="mb-4">
        <Label htmlFor="sourceType">Data Source Type</Label>
        <Select 
          value={parameters.sourceType || 'price'} 
          onValueChange={(value) => updateParameter('sourceType', value)}
        >
          <SelectTrigger id="sourceType">
            <SelectValue placeholder="Select source type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price">Price Data</SelectItem>
            <SelectItem value="indicator">Technical Indicator</SelectItem>
            <SelectItem value="volume">Volume Data</SelectItem>
            <SelectItem value="orderbook">Order Book</SelectItem>
            <SelectItem value="custom">Custom Source</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  // Render indicator parameters
  const renderIndicatorParams = () => (
    <>
      <div className="mb-4">
        <Label htmlFor="indicatorType">Indicator Type</Label>
        <Select 
          value={parameters.indicatorType || 'sma'} 
          onValueChange={(value) => updateParameter('indicatorType', value)}
        >
          <SelectTrigger id="indicatorType">
            <SelectValue placeholder="Select indicator type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sma">Simple Moving Average</SelectItem>
            <SelectItem value="ema">Exponential Moving Average</SelectItem>
            <SelectItem value="rsi">Relative Strength Index</SelectItem>
            <SelectItem value="macd">MACD</SelectItem>
            <SelectItem value="bb">Bollinger Bands</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  // Render filter parameters
  const renderFilterParams = () => (
    <>
      <div className="mb-4">
        <Label htmlFor="filterType">Filter Type</Label>
        <Select 
          value={parameters.filterType || 'threshold'} 
          onValueChange={(value) => updateParameter('filterType', value)}
        >
          <SelectTrigger id="filterType">
            <SelectValue placeholder="Select filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="threshold">Threshold</SelectItem>
            <SelectItem value="range">Range</SelectItem>
            <SelectItem value="crossover">Crossover</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  // Render condition parameters - FIXED SYNTAX
  const renderConditionParams = () => (
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
                <SelectItem value="greaterThan">Greater Than (&gt;)</SelectItem>
                <SelectItem value="lessThan">Less Than (&lt;)</SelectItem>
                <SelectItem value="equals">Equals (=)</SelectItem>
                <SelectItem value="greaterThanOrEquals">Greater Than or Equals (&gt;=)</SelectItem>
                <SelectItem value="lessThanOrEquals">Less Than or Equals (&lt;=)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </>
  );
  
  // Render node-specific parameters based on node type
  const renderNodeTypeSpecificParams = () => {
    if (!selectedNode) return null;
    
    const nodeType = selectedNode.data?.type || '';
    
    switch (nodeType) {
      case 'indicator':
        return renderIndicatorParams();
      case 'filter':
        return renderFilterParams();
      case 'condition':
        return renderConditionParams();
      case 'dataSource':
        return renderDataSourceParams();
      default:
        return null;
    }
  };

  // Render content based on node type
  const renderNodeContent = () => {
    if (!selectedNode) {
      return <div className="text-center p-4">No node selected</div>;
    }

    const nodeType = selectedNode.data?.type || 'unknown';
    
    return (
      <>
        <div className="mb-4">
          <h3 className="text-lg font-medium">Node Type: {nodeType}</h3>
        </div>
        
        <Separator className="my-4" />
        
        {renderCommonParams()}
        
        <Separator className="my-4" />
        
        <Tabs defaultValue="parameters" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="parameters">
            {renderNodeTypeSpecificParams()}
          </TabsContent>
          
          <TabsContent value="advanced">
            <div className="mb-4">
              <Label htmlFor="node-id">Node ID</Label>
              <Input id="node-id" value={selectedNode.id} disabled />
            </div>
            
            <div className="mb-4 flex items-center space-x-2">
              <Switch
                id="debug"
                checked={parameters.debug || false}
                onCheckedChange={(checked) => updateParameter('debug', checked)}
              />
              <Label htmlFor="debug">Debug Mode</Label>
            </div>
          </TabsContent>
        </Tabs>
      </>
    );
  };
  
  return (
    <>
      <CardHeader className="p-4">
        <CardTitle className="text-lg">Properties</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {renderNodeContent()}
      </CardContent>
    </>
  );
};

export default PropertiesPanel;
