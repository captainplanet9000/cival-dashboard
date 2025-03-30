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

interface CreateFarmProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateFarm({ onClose, onSuccess }: CreateFarmProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [initialCapital, setInitialCapital] = useState(10000);
  
  // Risk profile
  const [maxDrawdown, setMaxDrawdown] = useState(5);
  const [riskPerTrade, setRiskPerTrade] = useState(1);
  const [maxTradeSize, setMaxTradeSize] = useState(1000);
  const [volatilityTolerance, setVolatilityTolerance] = useState('medium');
  
  // Trading config
  const [testMode, setTestMode] = useState(true);
  const [maxAgents, setMaxAgents] = useState(3);
  const [maxConcurrentTrades, setMaxConcurrentTrades] = useState(5);
  const [autoRebalance, setAutoRebalance] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const farmData = {
        name,
        description,
        is_active: isActive,
        initial_capital: initialCapital,
        risk_profile: {
          max_drawdown: maxDrawdown,
          risk_per_trade: riskPerTrade,
          max_trade_size: maxTradeSize,
          volatility_tolerance: volatilityTolerance,
        },
        performance_metrics: {
          win_rate: 0,
          profit_factor: 0,
          trades_count: 0,
          total_profit_loss: 0,
        },
        config: {
          test_mode: testMode,
          max_agents: maxAgents,
          max_concurrent_trades: maxConcurrentTrades,
          auto_rebalance: autoRebalance,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const response = await api.createFarm(farmData);
      
      if (response.error) {
        console.error('Error creating farm:', response.error);
        alert(`Failed to create farm: ${response.error}`);
      } else {
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }
    } catch (error) {
      console.error('Error creating farm:', error);
      alert('An unexpected error occurred while creating the farm.');
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
            
            <div className="space-y-2">
              <Label htmlFor="initial-capital">Initial Capital (USD)</Label>
              <Input 
                id="initial-capital" 
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                min={1000}
                required
              />
            </div>
          </div>
          
          {/* Risk Profile */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium">Risk Profile</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="max-drawdown">Maximum Drawdown</Label>
                <span className="text-sm font-medium">{maxDrawdown}%</span>
              </div>
              <Slider 
                id="max-drawdown"
                min={1} 
                max={25} 
                step={1} 
                value={[maxDrawdown]}
                onValueChange={(value) => setMaxDrawdown(value[0])}
              />
              <p className="text-xs text-muted-foreground">
                The maximum allowed drawdown before automated risk controls activate
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="risk-per-trade">Risk Per Trade</Label>
                <span className="text-sm font-medium">{riskPerTrade}%</span>
              </div>
              <Slider 
                id="risk-per-trade"
                min={0.1} 
                max={5} 
                step={0.1} 
                value={[riskPerTrade]}
                onValueChange={(value) => setRiskPerTrade(value[0])}
              />
              <p className="text-xs text-muted-foreground">
                The percentage of account equity risked on any single trade
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="max-trade-size">Maximum Trade Size</Label>
                <span className="text-sm font-medium">${maxTradeSize}</span>
              </div>
              <Slider 
                id="max-trade-size"
                min={100} 
                max={10000} 
                step={100} 
                value={[maxTradeSize]}
                onValueChange={(value) => setMaxTradeSize(value[0])}
              />
              <p className="text-xs text-muted-foreground">
                The maximum allowed size for any single trade
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Volatility Tolerance</Label>
              <RadioGroup 
                value={volatilityTolerance} 
                onValueChange={setVolatilityTolerance}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="vol-low" />
                  <Label htmlFor="vol-low" className="cursor-pointer">Low</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="vol-medium" />
                  <Label htmlFor="vol-medium" className="cursor-pointer">Medium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="vol-high" />
                  <Label htmlFor="vol-high" className="cursor-pointer">High</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Preferred level of market volatility for trading strategies
              </p>
            </div>
          </div>
          
          {/* Trading Configuration */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium">Trading Configuration</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="test-mode">Test Mode</Label>
                <p className="text-sm text-muted-foreground">Run farm in simulation mode without real trades</p>
              </div>
              <Switch 
                id="test-mode" 
                checked={testMode}
                onCheckedChange={setTestMode}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-agents">Maximum Agents</Label>
              <Select 
                value={maxAgents.toString()} 
                onValueChange={(value) => setMaxAgents(Number(value))}
              >
                <SelectTrigger id="max-agents">
                  <SelectValue placeholder="Select maximum agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Agent</SelectItem>
                  <SelectItem value="3">3 Agents</SelectItem>
                  <SelectItem value="5">5 Agents</SelectItem>
                  <SelectItem value="10">10 Agents</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Maximum number of trading agents allowed in this farm
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-concurrent-trades">Maximum Concurrent Trades</Label>
              <Select 
                value={maxConcurrentTrades.toString()} 
                onValueChange={(value) => setMaxConcurrentTrades(Number(value))}
              >
                <SelectTrigger id="max-concurrent-trades">
                  <SelectValue placeholder="Select maximum trades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Trade</SelectItem>
                  <SelectItem value="3">3 Trades</SelectItem>
                  <SelectItem value="5">5 Trades</SelectItem>
                  <SelectItem value="10">10 Trades</SelectItem>
                  <SelectItem value="25">25 Trades</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Maximum number of open trades allowed at any given time
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-rebalance">Auto Rebalance</Label>
                <p className="text-sm text-muted-foreground">Automatically balance capital across strategies</p>
              </div>
              <Switch 
                id="auto-rebalance" 
                checked={autoRebalance}
                onCheckedChange={setAutoRebalance}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Farm'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 