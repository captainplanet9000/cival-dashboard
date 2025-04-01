"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { Slider } from '../../../components/ui/slider';
import { Switch } from '../../../components/ui/switch';
import { Button } from '../../../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../../../components/ui/radio-group';
import { api } from '../../../lib/api-client';

interface RiskControlProps {
  farmId: number;
  initialRiskProfile?: {
    max_drawdown: number;
    max_trade_size?: number;
    risk_per_trade?: number;
    volatility_tolerance?: 'low' | 'medium' | 'high';
  };
  onUpdate?: () => void;
}

export default function RiskControl({ farmId, initialRiskProfile, onUpdate }: RiskControlProps) {
  const [riskProfile, setRiskProfile] = useState({
    max_drawdown: initialRiskProfile?.max_drawdown || 5,
    max_trade_size: initialRiskProfile?.max_trade_size || 1000,
    risk_per_trade: initialRiskProfile?.risk_per_trade || 1,
    volatility_tolerance: initialRiskProfile?.volatility_tolerance || 'medium'
  });
  
  const [loading, setLoading] = useState(false);
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [riskFactors, setRiskFactors] = useState<{name: string; impact: number; description: string}[]>([]);
  const [autoStop, setAutoStop] = useState(true);
  const [confirmHighRiskTrades, setConfirmHighRiskTrades] = useState(true);
  
  // Load risk assessment data
  useEffect(() => {
    const loadRiskAssessment = async () => {
      try {
        const response = await api.getFarmRiskProfile(farmId);
        if (response.data) {
          setRiskScore(response.data.riskScore);
          setRiskFactors(response.data.factors);
        }
      } catch (error) {
        console.error('Failed to load risk assessment:', error);
      }
    };
    
    loadRiskAssessment();
  }, [farmId]);
  
  // Update risk profile
  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      const response = await api.updateFarmRiskProfile(farmId, riskProfile);
      if (response.error) {
        console.error('Failed to update risk profile:', response.error);
      } else {
        // Reload risk assessment
        const riskResponse = await api.getFarmRiskProfile(farmId);
        if (riskResponse.data) {
          setRiskScore(riskResponse.data.riskScore);
          setRiskFactors(riskResponse.data.factors);
        }
        
        // Call onUpdate callback if provided
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (error) {
      console.error('Error updating risk profile:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Update state when a risk parameter changes
  const handleRiskChange = (key: string, value: any) => {
    setRiskProfile(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Risk Management Controls</span>
          {riskScore !== null && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal">Risk Score:</span>
              <span className={`text-lg font-semibold ${
                riskScore < 0.4 ? 'text-green-600' : 
                riskScore < 0.7 ? 'text-amber-600' : 
                'text-red-600'
              }`}>
                {Math.round(riskScore * 100)}
              </span>
            </div>
          )}
        </CardTitle>
        <CardDescription>
          Configure risk parameters and safety controls for this trading farm
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Max Drawdown Control */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="max-drawdown">Maximum Drawdown</Label>
            <span className="text-sm font-medium">{riskProfile.max_drawdown}%</span>
          </div>
          <Slider 
            id="max-drawdown"
            min={1} 
            max={25} 
            step={1} 
            value={[riskProfile.max_drawdown]}
            onValueChange={(value) => handleRiskChange('max_drawdown', value[0])}
          />
          <p className="text-xs text-muted-foreground">
            The maximum allowed drawdown before automated risk controls activate
          </p>
        </div>
        
        {/* Max Trade Size Control */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="max-trade-size">Maximum Trade Size</Label>
            <span className="text-sm font-medium">${riskProfile.max_trade_size}</span>
          </div>
          <Slider 
            id="max-trade-size"
            min={100} 
            max={10000} 
            step={100} 
            value={[riskProfile.max_trade_size]}
            onValueChange={(value) => handleRiskChange('max_trade_size', value[0])}
          />
          <p className="text-xs text-muted-foreground">
            The maximum allowed size for any single trade
          </p>
        </div>
        
        {/* Risk Per Trade Control */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="risk-per-trade">Risk Per Trade</Label>
            <span className="text-sm font-medium">{riskProfile.risk_per_trade}%</span>
          </div>
          <Slider 
            id="risk-per-trade"
            min={0.1} 
            max={5} 
            step={0.1} 
            value={[riskProfile.risk_per_trade]}
            onValueChange={(value) => handleRiskChange('risk_per_trade', value[0])}
          />
          <p className="text-xs text-muted-foreground">
            The percentage of account equity risked on any single trade
          </p>
        </div>
        
        {/* Volatility Tolerance */}
        <div className="space-y-2">
          <Label>Volatility Tolerance</Label>
          <RadioGroup 
            value={riskProfile.volatility_tolerance} 
            onValueChange={(value) => handleRiskChange('volatility_tolerance', value)}
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
        
        {/* Safety Controls */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium">Safety Controls</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-stop">Automatic Stop Loss</Label>
              <p className="text-xs text-muted-foreground">
                Automatically apply stop loss to all trades
              </p>
            </div>
            <Switch 
              id="auto-stop"
              checked={autoStop}
              onCheckedChange={setAutoStop}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="confirm-trades">Confirm High-Risk Trades</Label>
              <p className="text-xs text-muted-foreground">
                Require confirmation for trades that exceed normal risk parameters
              </p>
            </div>
            <Switch 
              id="confirm-trades"
              checked={confirmHighRiskTrades}
              onCheckedChange={setConfirmHighRiskTrades}
            />
          </div>
        </div>
        
        {/* Risk Factors */}
        {riskFactors.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium">Risk Assessment Factors</h3>
            
            <div className="space-y-2">
              {riskFactors.map((factor, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{factor.name}</p>
                    <p className="text-xs text-muted-foreground">{factor.description}</p>
                  </div>
                  <div className={`text-sm font-medium ${
                    factor.impact < 0.3 ? 'text-green-600' : 
                    factor.impact < 0.6 ? 'text-amber-600' : 
                    'text-red-600'
                  }`}>
                    {Math.round(factor.impact * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSaveChanges}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 