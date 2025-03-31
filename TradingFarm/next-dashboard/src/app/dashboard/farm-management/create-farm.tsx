"use client";

import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { Slider } from '../../../components/ui/slider';
import { RadioGroup, RadioGroupItem } from '../../../components/ui/radio-group';
import { api } from '../../../lib/api-client';
import { toast } from '../../../components/ui/use-toast';

interface CreateFarmProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateFarm({ onClose, onSuccess }: CreateFarmProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [maxDrawdown, setMaxDrawdown] = useState(10);
  const [riskPerTrade, setRiskPerTrade] = useState(1);
  const [maxTradeSize, setMaxTradeSize] = useState(1000);
  const [volatilityTolerance, setVolatilityTolerance] = useState<'low' | 'medium' | 'high'>('medium');
  const [isTestMode, setIsTestMode] = useState(true);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Farm name is required',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await api.createFarm({
        name,
        description: description || undefined,
        is_active: isActive,
        risk_profile: {
          max_drawdown: maxDrawdown,
          risk_per_trade: riskPerTrade,
          max_trade_size: maxTradeSize,
          volatility_tolerance: volatilityTolerance
        },
        performance_metrics: {
          win_rate: 0,
          profit_factor: 0,
          trades_count: 0,
          total_profit_loss: 0
        },
        config: {
          test_mode: isTestMode,
          max_agents: 5,
          auto_rebalance: false
        }
      });
      
      if (response.error) {
        toast({
          title: 'Error Creating Farm',
          description: response.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Farm Created',
          description: 'The farm has been successfully created',
        });
        
        if (onSuccess) {
          onSuccess();
        }
        
        onClose();
      }
    } catch (error) {
      toast({
        title: 'Error Creating Farm',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Create New Farm</CardTitle>
          <CardDescription>Configure your trading farm settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="farm-name">Farm Name</Label>
              <Input 
                id="farm-name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Trading Farm"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="farm-description">Description</Label>
              <Textarea 
                id="farm-description" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Purpose and strategy of this trading farm"
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="farm-active">Active Status</Label>
                <p className="text-sm text-muted-foreground">Enable trading for this farm</p>
              </div>
              <Switch 
                id="farm-active" 
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          
          {/* Risk Profile */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium">Risk Profile</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="max-drawdown">Max Drawdown ({maxDrawdown}%)</Label>
                <span className="text-sm font-medium">
                  {maxDrawdown <= 5 ? 'Low Risk' : 
                   maxDrawdown <= 15 ? 'Medium Risk' : 'High Risk'}
                </span>
              </div>
              <Slider 
                id="max-drawdown"
                value={[maxDrawdown]}
                onValueChange={(values) => setMaxDrawdown(values[0])}
                min={1}
                max={30}
                step={1}
              />
              <p className="text-sm text-muted-foreground">
                Maximum drawdown percentage before risk controls activate
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="risk-per-trade">Risk Per Trade ({riskPerTrade}%)</Label>
              <Slider 
                id="risk-per-trade"
                value={[riskPerTrade]}
                onValueChange={(values) => setRiskPerTrade(values[0])}
                min={0.1}
                max={5}
                step={0.1}
              />
              <p className="text-sm text-muted-foreground">
                Maximum percentage of account to risk on a single trade
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-trade-size">Max Trade Size ($)</Label>
              <Input 
                id="max-trade-size" 
                type="number"
                value={maxTradeSize}
                onChange={(e) => setMaxTradeSize(Number(e.target.value))}
                min={100}
              />
              <p className="text-sm text-muted-foreground">
                Maximum position size allowed for any single trade
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="volatility">Volatility Tolerance</Label>
              <Select
                value={volatilityTolerance}
                onValueChange={(value) => setVolatilityTolerance(value as 'low' | 'medium' | 'high')}
              >
                <SelectTrigger id="volatility">
                  <SelectValue placeholder="Select volatility tolerance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Avoid volatile markets</SelectItem>
                  <SelectItem value="medium">Medium - Balanced approach</SelectItem>
                  <SelectItem value="high">High - Accept higher volatility</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Level of market volatility this farm can tolerate
              </p>
            </div>
          </div>
          
          {/* Configuration */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium">Configuration</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="test-mode">Test Mode</Label>
                <p className="text-sm text-muted-foreground">Run with simulated trading</p>
              </div>
              <Switch 
                id="test-mode" 
                checked={isTestMode}
                onCheckedChange={setIsTestMode}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Trading Configuration Presets</Label>
              <RadioGroup defaultValue="balanced" className="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <RadioGroupItem
                    value="conservative"
                    id="conservative"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="conservative"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-muted hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span className="text-sm font-medium">Conservative</span>
                    <span className="text-xs text-muted-foreground">Low risk, stable</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="balanced"
                    id="balanced"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="balanced"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-muted hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span className="text-sm font-medium">Balanced</span>
                    <span className="text-xs text-muted-foreground">Moderate risk & return</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="aggressive"
                    id="aggressive"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="aggressive"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-muted hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span className="text-sm font-medium">Aggressive</span>
                    <span className="text-xs text-muted-foreground">High risk, high return</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Farm'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 