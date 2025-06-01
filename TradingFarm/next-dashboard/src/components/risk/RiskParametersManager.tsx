/**
 * Risk Parameters Manager Component
 * Manages risk parameters for specific trading entities (farms, strategies, accounts)
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { enhancedRiskService, RiskParameterRecord } from '@/services/enhanced-risk-service';
import { BarChart, AlertCircle, Zap, TrendingUp, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define entity types that can have risk parameters
type EntityType = 'farm' | 'strategy' | 'account' | 'agent';

// Basic parameter interface to avoid deep nesting
interface BasicParameters {
  maxDrawdown: number;
  stopLossRequired: boolean;
  takeProfitRequired: boolean;
  maxDailyTrades: number;
  maxOpenTrades: number;
  positionSizingMethod: string;
  positionSizingValue: number;
  circuitBreakersEnabled: boolean;
  dailyLossPercentage: number;
  weeklyLossPercentage: number;
}

export function RiskParametersManager() {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('account');
  const [entities, setEntities] = useState<{id: string, name: string}[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [parameters, setParameters] = useState<BasicParameters>({
    maxDrawdown: 10,
    stopLossRequired: true,
    takeProfitRequired: false,
    maxDailyTrades: 20,
    maxOpenTrades: 10,
    positionSizingMethod: 'percentage',
    positionSizingValue: 2,
    circuitBreakersEnabled: true,
    dailyLossPercentage: 5,
    weeklyLossPercentage: 8
  });
  const [hasChanges, setHasChanges] = useState(false);
  
  // Mock entities for demo
  const mockEntities = {
    farm: [
      { id: 'farm-1', name: 'AlphaTrade Farm' },
      { id: 'farm-2', name: 'Beta Strategy Farm' },
      { id: 'farm-3', name: 'ElizaOS Autonomous Farm' }
    ],
    strategy: [
      { id: 'strategy-1', name: 'Mean Reversion' },
      { id: 'strategy-2', name: 'Trend Following' },
      { id: 'strategy-3', name: 'Breakout Detection' }
    ],
    account: [
      { id: 'account-1', name: 'Main Trading Account' },
      { id: 'account-2', name: 'Risk-On Account' },
      { id: 'account-3', name: 'Conservative Account' }
    ],
    agent: [
      { id: 'agent-1', name: 'Alpha Trader Agent' },
      { id: 'agent-2', name: 'Beta Scanner Agent' },
      { id: 'agent-3', name: 'Smart Execution Agent' }
    ]
  };
  
  // Load entities when entity type changes
  useEffect(() => {
    loadEntities();
  }, [selectedEntityType]);
  
  // Load parameters when entity selection changes
  useEffect(() => {
    if (selectedEntityId) {
      loadParameters();
    }
  }, [selectedEntityId]);
  
  // Load entities based on selected type
  const loadEntities = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, we would fetch from the API
      // For now, we'll use mock data
      setTimeout(() => {
        setEntities(mockEntities[selectedEntityType]);
        setSelectedEntityId(mockEntities[selectedEntityType][0]?.id || '');
        setIsLoading(false);
      }, 500);
    } catch (error: any) {
      setError(error.message || 'Failed to load entities');
      setIsLoading(false);
    }
  };
  
  // Load parameters for the selected entity
  const loadParameters = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, we would fetch from the API
      // For now, we'll use mock data with slight variations
      setTimeout(() => {
        const randomVariation = () => Math.random() * 2 - 1; // -1 to +1
        
        setParameters({
          maxDrawdown: 10 + randomVariation(),
          stopLossRequired: Math.random() > 0.3,
          takeProfitRequired: Math.random() > 0.6,
          maxDailyTrades: 20 + Math.floor(randomVariation() * 5),
          maxOpenTrades: 10 + Math.floor(randomVariation() * 3),
          positionSizingMethod: Math.random() > 0.7 ? 'risk_based' : 'percentage',
          positionSizingValue: 2 + randomVariation(),
          circuitBreakersEnabled: Math.random() > 0.2,
          dailyLossPercentage: 5 + randomVariation(),
          weeklyLossPercentage: 8 + randomVariation() * 2
        });
        setIsLoading(false);
        setHasChanges(false);
      }, 700);
    } catch (error: any) {
      setError(error.message || 'Failed to load parameters');
      setIsLoading(false);
    }
  };
  
  // Save parameters
  const saveParameters = () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, we would save to the API
      setTimeout(() => {
        setIsLoading(false);
        setHasChanges(false);
        // Show success message or notification here
      }, 1000);
    } catch (error: any) {
      setError(error.message || 'Failed to save parameters');
      setIsLoading(false);
    }
  };
  
  // Handle parameter changes
  const handleParameterChange = (param: keyof BasicParameters, value: any) => {
    setParameters(prev => ({
      ...prev,
      [param]: value
    }));
    setHasChanges(true);
  };
  
  // Get entity name by id
  const getEntityName = (id: string) => {
    return entities.find(e => e.id === id)?.name || 'Unknown';
  };
  
  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Entity Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Parameters Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="entity-type">Entity Type</Label>
                <Select
                  value={selectedEntityType}
                  onValueChange={(value: EntityType) => setSelectedEntityType(value)}
                >
                  <SelectTrigger id="entity-type">
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="farm">Trading Farms</SelectItem>
                    <SelectItem value="strategy">Strategies</SelectItem>
                    <SelectItem value="account">Trading Accounts</SelectItem>
                    <SelectItem value="agent">ElizaOS Agents</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 flex-1">
                <Label htmlFor="entity-id">Select {selectedEntityType}</Label>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={selectedEntityId}
                    onValueChange={setSelectedEntityId}
                  >
                    <SelectTrigger id="entity-id">
                      <SelectValue placeholder={`Select ${selectedEntityType}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map(entity => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadParameters}
                  disabled={isLoading || !selectedEntityId}
                >
                  Refresh
                </Button>
              </div>
            </div>
            
            {selectedEntityId && (
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <h3 className="text-sm font-medium">
                    Risk Parameters for {getEntityName(selectedEntityId)}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Adjust risk settings for this {selectedEntityType}
                  </p>
                </div>
                
                {hasChanges && (
                  <Badge variant="outline" className="text-amber-500 border-amber-500">
                    Unsaved Changes
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Parameters Editor */}
      {selectedEntityId && (
        <div className="space-y-6">
          <Tabs defaultValue="basic">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="basic" className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Basic</span>
              </TabsTrigger>
              <TabsTrigger value="position" className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Position</span>
              </TabsTrigger>
              <TabsTrigger value="limits" className="flex items-center gap-1">
                <BarChart className="h-4 w-4" />
                <span className="hidden sm:inline">Limits</span>
              </TabsTrigger>
              <TabsTrigger value="circuit" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Circuit Breakers</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Basic Tab */}
            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Risk Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="max-drawdown">Maximum Drawdown (%)</Label>
                          <span className="text-sm font-medium">
                            {parameters.maxDrawdown.toFixed(1)}%
                          </span>
                        </div>
                        <Slider 
                          id="max-drawdown"
                          min={1} 
                          max={30} 
                          step={0.5}
                          value={[parameters.maxDrawdown]}
                          onValueChange={(value) => handleParameterChange('maxDrawdown', value[0])}
                          className="py-4"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="stop-loss-required"
                          checked={parameters.stopLossRequired}
                          onCheckedChange={(checked) => handleParameterChange('stopLossRequired', !!checked)}
                        />
                        <Label htmlFor="stop-loss-required">
                          Require stop loss for all trades
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="take-profit-required"
                          checked={parameters.takeProfitRequired}
                          onCheckedChange={(checked) => handleParameterChange('takeProfitRequired', !!checked)}
                        />
                        <Label htmlFor="take-profit-required">
                          Require take profit for all trades
                        </Label>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Position Sizing Tab */}
            <TabsContent value="position">
              <Card>
                <CardHeader>
                  <CardTitle>Position Sizing</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="position-sizing-method">Position Sizing Method</Label>
                        <Select
                          value={parameters.positionSizingMethod}
                          onValueChange={(value) => handleParameterChange('positionSizingMethod', value)}
                        >
                          <SelectTrigger id="position-sizing-method">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed Size</SelectItem>
                            <SelectItem value="percentage">Percentage of Balance</SelectItem>
                            <SelectItem value="risk_based">Risk-Based</SelectItem>
                            <SelectItem value="kelly">Kelly Criterion</SelectItem>
                            <SelectItem value="volatility_adjusted">Volatility Adjusted</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="position-sizing-value">
                            {parameters.positionSizingMethod === 'percentage' 
                              ? 'Percentage of Balance (%)' 
                              : 'Position Sizing Value'}
                          </Label>
                          <span className="text-sm font-medium">
                            {parameters.positionSizingValue.toFixed(1)}
                            {parameters.positionSizingMethod === 'percentage' ? '%' : ''}
                          </span>
                        </div>
                        <Slider 
                          id="position-sizing-value"
                          min={0.1} 
                          max={parameters.positionSizingMethod === 'percentage' ? 10 : 20} 
                          step={0.1}
                          value={[parameters.positionSizingValue]}
                          onValueChange={(value) => handleParameterChange('positionSizingValue', value[0])}
                          className="py-4"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Limits Tab */}
            <TabsContent value="limits">
              <Card>
                <CardHeader>
                  <CardTitle>Trading Limits</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="max-daily-trades">Maximum Daily Trades</Label>
                        <div className="flex gap-2 items-center">
                          <Slider 
                            id="max-daily-trades"
                            min={1} 
                            max={50} 
                            step={1}
                            value={[parameters.maxDailyTrades]}
                            onValueChange={(value) => handleParameterChange('maxDailyTrades', value[0])}
                            className="flex-1"
                          />
                          <Input 
                            type="number"
                            min={1}
                            max={50}
                            value={parameters.maxDailyTrades}
                            onChange={(e) => handleParameterChange('maxDailyTrades', parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="max-open-trades">Maximum Open Trades</Label>
                        <div className="flex gap-2 items-center">
                          <Slider 
                            id="max-open-trades"
                            min={1} 
                            max={30} 
                            step={1}
                            value={[parameters.maxOpenTrades]}
                            onValueChange={(value) => handleParameterChange('maxOpenTrades', value[0])}
                            className="flex-1"
                          />
                          <Input 
                            type="number"
                            min={1}
                            max={30}
                            value={parameters.maxOpenTrades}
                            onChange={(e) => handleParameterChange('maxOpenTrades', parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Circuit Breakers Tab */}
            <TabsContent value="circuit">
              <Card>
                <CardHeader>
                  <CardTitle>Circuit Breakers</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="circuit-breakers-enabled" 
                          checked={parameters.circuitBreakersEnabled}
                          onCheckedChange={(checked) => handleParameterChange('circuitBreakersEnabled', checked)}
                        />
                        <Label htmlFor="circuit-breakers-enabled">Enable Circuit Breakers</Label>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="daily-loss-percentage">Daily Loss Limit (%)</Label>
                          <span className="text-sm font-medium">
                            {parameters.dailyLossPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <Slider 
                          id="daily-loss-percentage"
                          min={1} 
                          max={20} 
                          step={0.5}
                          value={[parameters.dailyLossPercentage]}
                          onValueChange={(value) => handleParameterChange('dailyLossPercentage', value[0])}
                          disabled={!parameters.circuitBreakersEnabled}
                          className="py-4"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="weekly-loss-percentage">Weekly Loss Limit (%)</Label>
                          <span className="text-sm font-medium">
                            {parameters.weeklyLossPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <Slider 
                          id="weekly-loss-percentage"
                          min={2} 
                          max={30} 
                          step={0.5}
                          value={[parameters.weeklyLossPercentage]}
                          onValueChange={(value) => handleParameterChange('weeklyLossPercentage', value[0])}
                          disabled={!parameters.circuitBreakersEnabled}
                          className="py-4"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={loadParameters}
              disabled={isLoading}
            >
              Reset
            </Button>
            <Button 
              onClick={saveParameters}
              disabled={isLoading || !hasChanges}
            >
              Save Parameters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
