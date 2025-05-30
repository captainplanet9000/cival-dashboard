'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, RefreshCw, BarChart4, Settings, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';

interface StrategyParameter {
  id: string;
  name: string;
  value: any;
  type: 'number' | 'boolean' | 'string' | 'select';
  description?: string;
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  step?: number;
}

interface StrategyConfig {
  id: string;
  name: string;
  description: string;
  agent_id?: string;
  type: string;
  asset_class: string;
  is_active: boolean;
  parameters: StrategyParameter[];
  created_at: string;
  updated_at: string;
  backtest_results?: any;
  performance_metrics?: any;
}

interface StrategyConfigModalProps {
  strategyId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function StrategyConfigModal({ strategyId, isOpen, onClose, onUpdate }: StrategyConfigModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<StrategyConfig | null>(null);
  const [params, setParams] = useState<StrategyParameter[]>([]);
  const [activeTab, setActiveTab] = useState('parameters');
  const [isBacktesting, setIsBacktesting] = useState(false);
  
  useEffect(() => {
    if (isOpen && strategyId) {
      loadStrategyConfig();
    }
  }, [isOpen, strategyId]);
  
  async function loadStrategyConfig() {
    setIsLoading(true);
    setError(null);
    
    try {
      const supabase = createBrowserClient();
      
      // Get strategy configuration
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
        
      if (error) throw error;
      
      // Get current parameter values
      const { data: paramData, error: paramError } = await supabase
        .from('strategy_parameters')
        .select('*')
        .eq('strategy_id', strategyId);
        
      if (paramError) throw paramError;
      
      // Get performance metrics if available
      const { data: metricsData } = await supabase
        .from('strategy_performance')
        .select('*')
        .eq('strategy_id', strategyId)
        .single();
      
      const strategyConfig: StrategyConfig = {
        ...data,
        parameters: paramData || [],
        performance_metrics: metricsData || null
      };
      
      setStrategy(strategyConfig);
      setParams(strategyConfig.parameters);
    } catch (err: any) {
      console.error('Error loading strategy configuration:', err);
      setError('Failed to load strategy configuration');
    } finally {
      setIsLoading(false);
    }
  }
  
  function handleParameterChange(paramId: string, value: any) {
    setParams(prevParams => 
      prevParams.map(param => 
        param.id === paramId ? { ...param, value } : param
      )
    );
  }
  
  async function handleSaveParameters() {
    setIsSaving(true);
    setError(null);
    
    try {
      const supabase = createBrowserClient();
      
      // Update each parameter
      const updates = params.map(param => ({
        id: param.id,
        value: param.value,
        updated_at: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('strategy_parameters')
        .upsert(updates);
        
      if (error) throw error;
      
      // Update strategy updated_at timestamp
      await supabase
        .from('strategies')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', strategyId);
      
      toast({
        title: 'Strategy Updated',
        description: 'Strategy parameters have been saved successfully.',
      });
      
      onUpdate();
    } catch (err: any) {
      console.error('Error saving strategy parameters:', err);
      setError('Failed to save parameters: ' + (err.message || 'Unknown error'));
      
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'There was an error saving your strategy parameters.',
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  async function handleRunBacktest() {
    setIsBacktesting(true);
    
    try {
      // Call the backtesting API
      const response = await fetch('/api/strategy/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyId,
          parameters: params.reduce((acc, param) => ({ ...acc, [param.name]: param.value }), {}),
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Backtest failed');
      }
      
      const backtestResults = await response.json();
      
      // Update the strategy with backtest results
      setStrategy(prev => prev ? { ...prev, backtest_results: backtestResults } : null);
      
      toast({
        title: 'Backtest Complete',
        description: 'Strategy backtest has been completed successfully.',
      });
      
      // Switch to the performance tab to show results
      setActiveTab('performance');
    } catch (err: any) {
      console.error('Error running backtest:', err);
      toast({
        variant: 'destructive',
        title: 'Backtest Failed',
        description: err.message || 'There was an error running the backtest',
      });
    } finally {
      setIsBacktesting(false);
    }
  }
  
  function renderParameterInput(param: StrategyParameter) {
    switch (param.type) {
      case 'number':
        if (param.min !== undefined && param.max !== undefined) {
          return (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{param.value}</span>
                <span className="text-sm text-muted-foreground">
                  {param.min} - {param.max}
                </span>
              </div>
              <Slider
                value={[param.value]}
                min={param.min}
                max={param.max}
                step={param.step || 1}
                onValueChange={(value) => handleParameterChange(param.id, value[0])}
              />
            </div>
          );
        }
        return (
          <Input
            type="number"
            value={param.value}
            onChange={(e) => handleParameterChange(param.id, parseFloat(e.target.value))}
            min={param.min}
            max={param.max}
            step={param.step || 1}
          />
        );
      
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={param.id}
              checked={param.value}
              onCheckedChange={(checked) => handleParameterChange(param.id, checked)}
            />
            <Label htmlFor={param.id} className="text-sm text-muted-foreground">
              {param.value ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        );
      
      case 'select':
        return (
          <Select
            value={param.value.toString()}
            onValueChange={(value) => handleParameterChange(param.id, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {param.options?.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      default:
        return (
          <Input
            value={param.value}
            onChange={(e) => handleParameterChange(param.id, e.target.value)}
          />
        );
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {strategy?.name || 'Strategy Configuration'}
          </DialogTitle>
          <DialogDescription>
            {strategy?.description || 'Configure trading strategy parameters'}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex items-center mb-4 space-x-2">
              <Badge variant="outline">{strategy?.type}</Badge>
              <Badge variant="outline">{strategy?.asset_class}</Badge>
              <Badge variant={strategy?.is_active ? 'default' : 'secondary'}>
                {strategy?.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto">
                Last updated: {new Date(strategy?.updated_at || '').toLocaleString()}
              </span>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="parameters">
                  <Settings className="h-4 w-4 mr-2" />
                  Parameters
                </TabsTrigger>
                <TabsTrigger value="performance">
                  <BarChart4 className="h-4 w-4 mr-2" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="schedule">
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="parameters" className="space-y-4 py-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {params.map((param) => (
                    <Card key={param.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{param.name}</CardTitle>
                        {param.description && (
                          <CardDescription className="text-xs">
                            {param.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        {renderParameterInput(param)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={handleRunBacktest}
                    disabled={isBacktesting}
                  >
                    {isBacktesting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Run Backtest
                  </Button>
                  
                  <Button 
                    onClick={handleSaveParameters}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Parameters
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="performance" className="py-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>
                      Historical and backtested performance data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {strategy?.backtest_results || strategy?.performance_metrics ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: 'Win Rate', value: strategy.performance_metrics?.win_rate || strategy.backtest_results?.win_rate || '0%', icon: TrendingUp },
                            { label: 'Sharpe Ratio', value: strategy.performance_metrics?.sharpe_ratio || strategy.backtest_results?.sharpe_ratio || '0.0', icon: BarChart4 },
                            { label: 'Max Drawdown', value: strategy.performance_metrics?.max_drawdown || strategy.backtest_results?.max_drawdown || '0%', icon: TrendingUp },
                            { label: 'Avg. Return', value: strategy.performance_metrics?.avg_return || strategy.backtest_results?.avg_return || '0%', icon: TrendingUp },
                          ].map((metric, i) => (
                            <Card key={i} className="bg-muted/40">
                              <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                  <metric.icon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{metric.label}</span>
                                </div>
                                <div className="text-2xl font-bold mt-2">{metric.value}</div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        
                        {/* Visualization would go here */}
                        <div className="border rounded-lg p-8 h-64 flex items-center justify-center text-muted-foreground">
                          Performance charts and visualizations
                        </div>
                        
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-muted/50 px-4 py-2 font-medium">Trade History</div>
                          <div className="p-4 text-sm text-muted-foreground text-center">
                            {strategy.backtest_results?.trade_count || strategy.performance_metrics?.trade_count || 0} trades in history
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="rounded-full bg-muted p-3 mb-3">
                          <BarChart4 className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="mb-1 font-medium">No performance data available</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Run a backtest or wait for live performance data
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={handleRunBacktest}
                          disabled={isBacktesting}
                        >
                          {isBacktesting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Run Backtest Now
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="schedule" className="py-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Execution Schedule</CardTitle>
                    <CardDescription>
                      Configure when this strategy should actively trade
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid w-full items-center gap-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="isActive">Strategy Active</Label>
                          <Switch
                            id="isActive"
                            checked={strategy?.is_active || false}
                            onCheckedChange={(checked) => {
                              setStrategy(prev => prev ? { ...prev, is_active: checked } : null);
                            }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          When disabled, this strategy will not execute trades
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Trading Hours</Label>
                        <Select defaultValue="always">
                          <SelectTrigger>
                            <SelectValue placeholder="Select trading hours" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="always">Trade 24/7</SelectItem>
                            <SelectItem value="market">Market Hours Only</SelectItem>
                            <SelectItem value="custom">Custom Schedule</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Trading Days</Label>
                        <div className="flex flex-wrap gap-2">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                            <div key={day} className="flex items-center space-x-1">
                              <input type="checkbox" id={`day-${day}`} className="rounded border-gray-300" defaultChecked={day !== 'Sat' && day !== 'Sun'} />
                              <Label htmlFor={`day-${day}`} className="text-sm">{day}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          Schedule changes will take effect after saving parameters
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              handleSaveParameters();
              onClose();
            }} 
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
