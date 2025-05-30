"use client";

import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { api } from '../../../lib/api-client';

interface CreateAgentProps {
  farmId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

// Agent types supported by ElizaOS
const AGENT_TYPES = [
  { id: 'market_maker', name: 'Market Maker', description: 'Provides liquidity by placing limit orders on both sides of the order book' },
  { id: 'trend_follower', name: 'Trend Follower', description: 'Follows market trends using technical indicators' },
  { id: 'arbitrage', name: 'Arbitrage', description: 'Exploits price differences between markets or assets' },
  { id: 'ml_predictor', name: 'ML Predictor', description: 'Uses machine learning to predict price movements' },
  { id: 'grid_trader', name: 'Grid Trader', description: 'Places orders at predetermined price levels forming a grid' },
  { id: 'custom', name: 'Custom', description: 'Custom agent with specialized behavior' }
];

export default function CreateAgent({ farmId, onClose, onSuccess }: CreateAgentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agentType, setAgentType] = useState('trend_follower');
  const [isActive, setIsActive] = useState(false);
  const [useGpu, setUseGpu] = useState(false);
  const [maxConcurrentTrades, setMaxConcurrentTrades] = useState(3);
  
  // Agent parameters - will change based on agent type
  const [parameters, setParameters] = useState<Record<string, any>>({
    timeframe: '1h',
    max_risk_per_trade: 1,
    allowed_markets: ['BTC/USDT', 'ETH/USDT'],
    take_profit_pct: 2,
    stop_loss_pct: 1.5
  });
  
  // Handle parameter change based on type
  const handleParameterChange = (key: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Handle agent type change
  const handleAgentTypeChange = (type: string) => {
    setAgentType(type);
    
    // Set default parameters based on agent type
    switch (type) {
      case 'market_maker':
        setParameters({
          order_size: 0.01,
          spread_pct: 0.2,
          rebalance_interval: 60,
          max_open_orders: 6,
          allowed_markets: ['BTC/USDT', 'ETH/USDT']
        });
        break;
      case 'trend_follower':
        setParameters({
          timeframe: '1h',
          max_risk_per_trade: 1,
          allowed_markets: ['BTC/USDT', 'ETH/USDT'],
          take_profit_pct: 2,
          stop_loss_pct: 1.5
        });
        break;
      case 'arbitrage':
        setParameters({
          min_profit_pct: 0.5,
          max_execution_time: 5,
          allowed_markets: ['BTC/USDT', 'ETH/USDT'],
          max_slippage: 0.1,
          exchanges: ['Binance', 'FTX']
        });
        break;
      case 'ml_predictor':
        setParameters({
          model_type: 'lstm',
          look_back_periods: 14,
          confidence_threshold: 0.7,
          allowed_markets: ['BTC/USDT', 'ETH/USDT'],
          update_frequency: 86400
        });
        setUseGpu(true);
        break;
      case 'grid_trader':
        setParameters({
          grid_levels: 5,
          grid_spacing_pct: 1,
          total_investment: 1000,
          allowed_markets: ['BTC/USDT'],
          rebalance_threshold: 5
        });
        break;
      case 'custom':
        setParameters({
          custom_script: '',
          startup_parameters: {},
          allowed_markets: ['BTC/USDT', 'ETH/USDT'],
          api_access: true
        });
        break;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const agentData = {
        name,
        description,
        agent_type: agentType,
        farm_id: farmId,
        is_active: isActive,
        parameters: {
          ...parameters,
          use_gpu: useGpu,
          max_concurrent_trades: maxConcurrentTrades
        },
        status: 'initializing',
        metrics: {
          trades_executed: 0,
          win_rate: 0,
          profit_loss: 0,
          avg_trade_duration: 0
        }
      };
      
      const response = await api.createAgent(agentData);
      
      if (response.error) {
        console.error('Error creating agent:', response.error);
        alert(`Failed to create agent: ${response.error}`);
      } else {
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('An unexpected error occurred while creating the agent.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render parameters form based on agent type
  const renderParametersForm = () => {
    switch (agentType) {
      case 'market_maker':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="order-size">Order Size</Label>
              <Input 
                id="order-size" 
                type="number"
                value={parameters.order_size}
                onChange={(e) => handleParameterChange('order_size', parseFloat(e.target.value))}
                step="0.001"
                min="0.001"
              />
              <p className="text-xs text-muted-foreground">Size of each order placed by the agent</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="spread-pct">Spread Percentage</Label>
              <Input 
                id="spread-pct" 
                type="number"
                value={parameters.spread_pct}
                onChange={(e) => handleParameterChange('spread_pct', parseFloat(e.target.value))}
                step="0.1"
                min="0.1"
              />
              <p className="text-xs text-muted-foreground">Percentage away from mid price for order placement</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rebalance-interval">Rebalance Interval (seconds)</Label>
              <Input 
                id="rebalance-interval" 
                type="number"
                value={parameters.rebalance_interval}
                onChange={(e) => handleParameterChange('rebalance_interval', parseInt(e.target.value))}
                min="10"
              />
              <p className="text-xs text-muted-foreground">How often to rebalance positions</p>
            </div>
          </>
        );
        
      case 'trend_follower':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select 
                value={parameters.timeframe} 
                onValueChange={(value) => handleParameterChange('timeframe', value)}
              >
                <SelectTrigger id="timeframe">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 minute</SelectItem>
                  <SelectItem value="5m">5 minutes</SelectItem>
                  <SelectItem value="15m">15 minutes</SelectItem>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="4h">4 hours</SelectItem>
                  <SelectItem value="1d">1 day</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Candlestick timeframe for trend analysis</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-risk">Max Risk Per Trade (%)</Label>
              <Input 
                id="max-risk" 
                type="number"
                value={parameters.max_risk_per_trade}
                onChange={(e) => handleParameterChange('max_risk_per_trade', parseFloat(e.target.value))}
                step="0.1"
                min="0.1"
                max="5"
              />
              <p className="text-xs text-muted-foreground">Maximum percentage of account to risk on a single trade</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="take-profit">Take Profit (%)</Label>
              <Input 
                id="take-profit" 
                type="number"
                value={parameters.take_profit_pct}
                onChange={(e) => handleParameterChange('take_profit_pct', parseFloat(e.target.value))}
                step="0.1"
                min="0.1"
              />
              <p className="text-xs text-muted-foreground">Target profit percentage for trades</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stop-loss">Stop Loss (%)</Label>
              <Input 
                id="stop-loss" 
                type="number"
                value={parameters.stop_loss_pct}
                onChange={(e) => handleParameterChange('stop_loss_pct', parseFloat(e.target.value))}
                step="0.1"
                min="0.1"
              />
              <p className="text-xs text-muted-foreground">Stop loss percentage for risk management</p>
            </div>
          </>
        );
        
      case 'ml_predictor':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="model-type">Model Type</Label>
              <Select 
                value={parameters.model_type} 
                onValueChange={(value) => handleParameterChange('model_type', value)}
              >
                <SelectTrigger id="model-type">
                  <SelectValue placeholder="Select model type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lstm">LSTM</SelectItem>
                  <SelectItem value="transformer">Transformer</SelectItem>
                  <SelectItem value="gru">GRU</SelectItem>
                  <SelectItem value="random_forest">Random Forest</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Type of machine learning model to use</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="look-back">Look Back Periods</Label>
              <Input 
                id="look-back" 
                type="number"
                value={parameters.look_back_periods}
                onChange={(e) => handleParameterChange('look_back_periods', parseInt(e.target.value))}
                min="1"
              />
              <p className="text-xs text-muted-foreground">Number of periods to look back for prediction</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence Threshold</Label>
              <Input 
                id="confidence" 
                type="number"
                value={parameters.confidence_threshold}
                onChange={(e) => handleParameterChange('confidence_threshold', parseFloat(e.target.value))}
                step="0.01"
                min="0.5"
                max="1"
              />
              <p className="text-xs text-muted-foreground">Minimum confidence required to execute trades</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-gpu">Use GPU Acceleration</Label>
                <p className="text-sm text-muted-foreground">Enable GPU for model training and inference</p>
              </div>
              <Switch 
                id="use-gpu" 
                checked={useGpu}
                onCheckedChange={setUseGpu}
              />
            </div>
          </>
        );
        
      // Other agent types would have their own parameter forms
      default:
        return (
          <div className="py-4 text-center text-muted-foreground">
            <p>Configure basic parameters for this agent type</p>
          </div>
        );
    }
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Create New Agent</CardTitle>
          <CardDescription>Configure an ElizaOS trading agent for your farm</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input 
                id="agent-name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Trading Agent"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agent-description">Description</Label>
              <Textarea 
                id="agent-description" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Purpose and strategy of this agent"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agent-type">Agent Type</Label>
              <Select 
                value={agentType} 
                onValueChange={handleAgentTypeChange}
              >
                <SelectTrigger id="agent-type">
                  <SelectValue placeholder="Select agent type" />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_TYPES.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {AGENT_TYPES.find(t => t.id === agentType)?.description}
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="agent-active">Active Status</Label>
                <p className="text-sm text-muted-foreground">Activate agent immediately after creation</p>
              </div>
              <Switch 
                id="agent-active" 
                checked={isActive}
                onCheckedChange={setIsActive}
              />
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
          </div>
          
          {/* Agent-specific parameters */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium">Agent Parameters</h3>
            {renderParametersForm()}
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
            {isSubmitting ? 'Creating...' : 'Create Agent'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 