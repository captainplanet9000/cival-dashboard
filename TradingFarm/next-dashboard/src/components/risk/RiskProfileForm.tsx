/**
 * Risk Profile Form Component
 * Form for creating and editing risk profiles with detailed parameters
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RiskProfileRecord } from '@/services/enhanced-risk-service';
import { AlertCircle, Info, Settings, Zap, TrendingUp, BarChart, ChevronRight } from 'lucide-react';

interface RiskProfileFormProps {
  initialData?: Partial<RiskProfileRecord>;
  onSubmit: (data: Partial<RiskProfileRecord>) => void;
  onCancel: () => void;
}

export function RiskProfileForm({ initialData, onSubmit, onCancel }: RiskProfileFormProps) {
  // Form state
  const [formData, setFormData] = useState<Partial<RiskProfileRecord>>(
    initialData || {
      name: '',
      description: '',
      is_default: false,
      parameters: {
        max_drawdown: 10.0,
        position_sizing: {
          method: 'percentage',
          value: 2.0
        },
        trade_limits: {
          max_open_trades: 10,
          max_daily_trades: 20,
          max_trade_size: 10.0
        },
        risk_reward_parameters: {
          min_risk_reward_ratio: 1.5,
          take_profit_required: false,
          stop_loss_required: true
        },
        circuit_breakers: {
          enabled: true,
          daily_loss_percentage: 5.0,
          weekly_loss_percentage: 8.0,
          monthly_loss_percentage: 12.0,
          consecutive_losses: 5,
          volatility_threshold: 3.0
        }
      }
    }
  );
  
  // Helpers for nested updates
  const updateBasicField = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const updateParameter = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [field]: value
      }
    }));
  };
  
  const updateNestedParameter = (
    parentField: string,
    field: string,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [parentField]: {
          ...prev.parameters?.[parentField],
          [field]: value
        }
      }
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  // Access nested values safely
  const getNestedValue = (path: string[], defaultValue: any = undefined) => {
    let current: any = formData;
    for (const key of path) {
      if (current === undefined || current === null) return defaultValue;
      current = current[key];
    }
    return current === undefined ? defaultValue : current;
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Profile Name</Label>
          <Input 
            id="name"
            value={formData.name || ''}
            onChange={(e) => updateBasicField('name', e.target.value)}
            placeholder="Enter profile name"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea 
            id="description"
            value={formData.description || ''}
            onChange={(e) => updateBasicField('description', e.target.value)}
            placeholder="Describe the purpose and characteristics of this risk profile"
            rows={3}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="is_default" 
            checked={formData.is_default}
            onCheckedChange={(checked) => updateBasicField('is_default', checked)}
            disabled={initialData?.is_default === true} // Can't un-default a system default
          />
          <Label htmlFor="is_default">Make this the default risk profile</Label>
        </div>
      </div>
      
      {/* Tabbed Parameters */}
      <Tabs defaultValue="drawdown" className="w-full">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="drawdown" className="flex items-center gap-1">
            <BarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Drawdown</span>
          </TabsTrigger>
          <TabsTrigger value="position" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Position Sizing</span>
          </TabsTrigger>
          <TabsTrigger value="limits" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Trade Limits</span>
          </TabsTrigger>
          <TabsTrigger value="circuit" className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Circuit Breakers</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Drawdown Tab */}
        <TabsContent value="drawdown" className="space-y-4 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="max_drawdown">Maximum Drawdown (%)</Label>
                <span className="text-sm font-medium">
                  {getNestedValue(['parameters', 'max_drawdown'], 10).toFixed(1)}%
                </span>
              </div>
              <Slider 
                id="max_drawdown"
                min={1} 
                max={50} 
                step={0.5}
                value={[getNestedValue(['parameters', 'max_drawdown'], 10)]}
                onValueChange={(value) => updateParameter('max_drawdown', value[0])}
                className="py-4"
              />
              <p className="text-xs text-muted-foreground">
                Maximum allowed drawdown before trading is paused
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="risk_reward_ratio">Minimum Risk-Reward Ratio</Label>
              <div className="flex gap-2">
                <Slider 
                  id="risk_reward_ratio"
                  min={0.5} 
                  max={5} 
                  step={0.1}
                  value={[getNestedValue(['parameters', 'risk_reward_parameters', 'min_risk_reward_ratio'], 1.5)]}
                  onValueChange={(value) => updateNestedParameter('risk_reward_parameters', 'min_risk_reward_ratio', value[0])}
                  className="flex-1 py-4"
                />
                <Input 
                  type="number"
                  min={0.5}
                  max={5}
                  step={0.1}
                  value={getNestedValue(['parameters', 'risk_reward_parameters', 'min_risk_reward_ratio'], 1.5)}
                  onChange={(e) => updateNestedParameter(
                    'risk_reward_parameters', 
                    'min_risk_reward_ratio', 
                    parseFloat(e.target.value) || 1.5
                  )}
                  className="w-20"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum ratio of potential profit to potential loss for trades
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="take_profit_required"
                  checked={getNestedValue(['parameters', 'risk_reward_parameters', 'take_profit_required'], false)}
                  onCheckedChange={(checked) => updateNestedParameter(
                    'risk_reward_parameters', 
                    'take_profit_required', 
                    !!checked
                  )}
                />
                <Label htmlFor="take_profit_required">
                  Require take profit levels for all trades
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="stop_loss_required"
                  checked={getNestedValue(['parameters', 'risk_reward_parameters', 'stop_loss_required'], true)}
                  onCheckedChange={(checked) => updateNestedParameter(
                    'risk_reward_parameters', 
                    'stop_loss_required', 
                    !!checked
                  )}
                />
                <Label htmlFor="stop_loss_required">
                  Require stop loss levels for all trades
                </Label>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Position Sizing Tab */}
        <TabsContent value="position" className="space-y-4 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="position_sizing_method">Position Sizing Method</Label>
              <Select
                value={getNestedValue(['parameters', 'position_sizing', 'method'], 'percentage')}
                onValueChange={(value) => updateNestedParameter('position_sizing', 'method', value)}
              >
                <SelectTrigger id="position_sizing_method">
                  <SelectValue placeholder="Select a position sizing method" />
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
                <Label htmlFor="position_sizing_value">
                  {getNestedValue(['parameters', 'position_sizing', 'method'], 'percentage') === 'percentage' 
                    ? 'Percentage of Balance (%)' 
                    : 'Position Sizing Value'}
                </Label>
                <span className="text-sm font-medium">
                  {getNestedValue(['parameters', 'position_sizing', 'value'], 2).toFixed(1)}
                  {getNestedValue(['parameters', 'position_sizing', 'method'], 'percentage') === 'percentage' ? '%' : ''}
                </span>
              </div>
              <Slider 
                id="position_sizing_value"
                min={0.1} 
                max={getNestedValue(['parameters', 'position_sizing', 'method'], 'percentage') === 'percentage' ? 20 : 100} 
                step={0.1}
                value={[getNestedValue(['parameters', 'position_sizing', 'value'], 2)]}
                onValueChange={(value) => updateNestedParameter('position_sizing', 'value', value[0])}
                className="py-4"
              />
              <p className="text-xs text-muted-foreground">
                {getNestedValue(['parameters', 'position_sizing', 'method'], 'percentage') === 'percentage'
                  ? 'Percentage of account balance to risk per trade'
                  : getNestedValue(['parameters', 'position_sizing', 'method'], 'percentage') === 'risk_based'
                    ? 'Percentage of account balance to risk per trade'
                    : 'Value parameter for the selected position sizing method'
                }
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_trade_size">Maximum Trade Size (USD)</Label>
              <Input 
                id="max_trade_size"
                type="number"
                min={0}
                step={100}
                value={getNestedValue(['parameters', 'trade_limits', 'max_trade_size'], 10000)}
                onChange={(e) => updateNestedParameter(
                  'trade_limits', 
                  'max_trade_size', 
                  parseFloat(e.target.value) || 0
                )}
              />
              <p className="text-xs text-muted-foreground">
                Maximum USD value for any single position (0 = unlimited)
              </p>
            </div>
          </div>
        </TabsContent>
        
        {/* Trade Limits Tab */}
        <TabsContent value="limits" className="space-y-4 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max_open_trades">Maximum Open Trades</Label>
              <div className="flex gap-2">
                <Slider 
                  id="max_open_trades"
                  min={1} 
                  max={50} 
                  step={1}
                  value={[getNestedValue(['parameters', 'trade_limits', 'max_open_trades'], 10)]}
                  onValueChange={(value) => updateNestedParameter('trade_limits', 'max_open_trades', value[0])}
                  className="flex-1 py-4"
                />
                <Input 
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  value={getNestedValue(['parameters', 'trade_limits', 'max_open_trades'], 10)}
                  onChange={(e) => updateNestedParameter(
                    'trade_limits', 
                    'max_open_trades', 
                    parseInt(e.target.value) || 10
                  )}
                  className="w-20"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum number of open positions allowed at any time
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_daily_trades">Maximum Daily Trades</Label>
              <div className="flex gap-2">
                <Slider 
                  id="max_daily_trades"
                  min={1} 
                  max={100} 
                  step={1}
                  value={[getNestedValue(['parameters', 'trade_limits', 'max_daily_trades'], 20)]}
                  onValueChange={(value) => updateNestedParameter('trade_limits', 'max_daily_trades', value[0])}
                  className="flex-1 py-4"
                />
                <Input 
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={getNestedValue(['parameters', 'trade_limits', 'max_daily_trades'], 20)}
                  onChange={(e) => updateNestedParameter(
                    'trade_limits', 
                    'max_daily_trades', 
                    parseInt(e.target.value) || 20
                  )}
                  className="w-20"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum number of trades allowed per day
              </p>
            </div>
          </div>
        </TabsContent>
        
        {/* Circuit Breakers Tab */}
        <TabsContent value="circuit" className="space-y-4 pt-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="circuit_breakers_enabled" 
                checked={getNestedValue(['parameters', 'circuit_breakers', 'enabled'], true)}
                onCheckedChange={(checked) => updateNestedParameter('circuit_breakers', 'enabled', checked)}
              />
              <Label htmlFor="circuit_breakers_enabled">Enable Circuit Breakers</Label>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="daily_loss_percentage">Daily Loss Limit (%)</Label>
                <span className="text-sm font-medium">
                  {getNestedValue(['parameters', 'circuit_breakers', 'daily_loss_percentage'], 5).toFixed(1)}%
                </span>
              </div>
              <Slider 
                id="daily_loss_percentage"
                min={1} 
                max={20} 
                step={0.5}
                value={[getNestedValue(['parameters', 'circuit_breakers', 'daily_loss_percentage'], 5)]}
                onValueChange={(value) => updateNestedParameter('circuit_breakers', 'daily_loss_percentage', value[0])}
                disabled={!getNestedValue(['parameters', 'circuit_breakers', 'enabled'], true)}
                className="py-4"
              />
              <p className="text-xs text-muted-foreground">
                Trading stops when daily loss exceeds this percentage
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="weekly_loss_percentage">Weekly Loss Limit (%)</Label>
                <span className="text-sm font-medium">
                  {getNestedValue(['parameters', 'circuit_breakers', 'weekly_loss_percentage'], 8).toFixed(1)}%
                </span>
              </div>
              <Slider 
                id="weekly_loss_percentage"
                min={2} 
                max={30} 
                step={0.5}
                value={[getNestedValue(['parameters', 'circuit_breakers', 'weekly_loss_percentage'], 8)]}
                onValueChange={(value) => updateNestedParameter('circuit_breakers', 'weekly_loss_percentage', value[0])}
                disabled={!getNestedValue(['parameters', 'circuit_breakers', 'enabled'], true)}
                className="py-4"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="monthly_loss_percentage">Monthly Loss Limit (%)</Label>
                <span className="text-sm font-medium">
                  {getNestedValue(['parameters', 'circuit_breakers', 'monthly_loss_percentage'], 12).toFixed(1)}%
                </span>
              </div>
              <Slider 
                id="monthly_loss_percentage"
                min={5} 
                max={40} 
                step={0.5}
                value={[getNestedValue(['parameters', 'circuit_breakers', 'monthly_loss_percentage'], 12)]}
                onValueChange={(value) => updateNestedParameter('circuit_breakers', 'monthly_loss_percentage', value[0])}
                disabled={!getNestedValue(['parameters', 'circuit_breakers', 'enabled'], true)}
                className="py-4"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="consecutive_losses">Consecutive Losses Limit</Label>
              <Input 
                id="consecutive_losses"
                type="number"
                min={1}
                max={20}
                step={1}
                value={getNestedValue(['parameters', 'circuit_breakers', 'consecutive_losses'], 5)}
                onChange={(e) => updateNestedParameter(
                  'circuit_breakers', 
                  'consecutive_losses', 
                  parseInt(e.target.value) || 5
                )}
                disabled={!getNestedValue(['parameters', 'circuit_breakers', 'enabled'], true)}
              />
              <p className="text-xs text-muted-foreground">
                Trading stops after this many consecutive losing trades
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="volatility_threshold">Volatility Threshold (σ)</Label>
              <Input 
                id="volatility_threshold"
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={getNestedValue(['parameters', 'circuit_breakers', 'volatility_threshold'], 3)}
                onChange={(e) => updateNestedParameter(
                  'circuit_breakers', 
                  'volatility_threshold', 
                  parseFloat(e.target.value) || 3
                )}
                disabled={!getNestedValue(['parameters', 'circuit_breakers', 'enabled'], true)}
              />
              <p className="text-xs text-muted-foreground">
                Trading stops when market volatility exceeds this many standard deviations (0 = disabled)
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit">
          {initialData?.id ? 'Update Profile' : 'Create Profile'}
        </Button>
      </div>
    </form>
  );
}
