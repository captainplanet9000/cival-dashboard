"use client";

import { useState, useEffect } from 'react';
import { Slider } from '../../../components/ui/slider';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { api } from '../../../lib/api-client';
import { toast } from '../../../components/ui/use-toast';

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

  // Handle saving risk profile
  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await api.updateFarm(farmId, {
        risk_profile: riskProfile,
        metadata: {
          risk_controls: {
            auto_stop: autoStop,
            confirm_high_risk_trades: confirmHighRiskTrades
          }
        }
      });
      
      if (response.error) {
        toast({
          title: 'Error updating risk profile',
          description: response.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Risk profile updated',
          description: 'Farm risk controls have been successfully updated.',
          variant: 'default',
        });
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      toast({
        title: 'Error updating risk profile',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate risk level based on max drawdown
  const getRiskLevel = () => {
    if (riskProfile.max_drawdown <= 5) return { level: 'Low', color: 'text-green-600' };
    if (riskProfile.max_drawdown <= 15) return { level: 'Medium', color: 'text-amber-600' };
    return { level: 'High', color: 'text-red-600' };
  };
  
  const riskLevel = getRiskLevel();

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
          <div className="flex items-center justify-between">
            <Label htmlFor="max-drawdown" className="text-base">Max Drawdown</Label>
            <span className={`text-sm font-medium ${riskLevel.color}`}>
              {riskProfile.max_drawdown}% ({riskLevel.level} Risk)
            </span>
          </div>
          <Slider
            id="max-drawdown"
            min={1}
            max={30}
            step={1}
            value={[riskProfile.max_drawdown]}
            onValueChange={(values) => setRiskProfile({...riskProfile, max_drawdown: values[0]})}
          />
          <p className="text-sm text-gray-500">
            Maximum allowable drawdown before automated risk controls activate
          </p>
        </div>
        
        {/* Risk Per Trade Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="risk-per-trade" className="text-base">Risk Per Trade</Label>
            <span className="text-sm font-medium">{riskProfile.risk_per_trade}%</span>
          </div>
          <Slider
            id="risk-per-trade"
            min={0.1}
            max={5}
            step={0.1}
            value={[riskProfile.risk_per_trade]}
            onValueChange={(values) => setRiskProfile({...riskProfile, risk_per_trade: values[0]})}
          />
          <p className="text-sm text-gray-500">
            Maximum percentage of account to risk on any single trade
          </p>
        </div>
        
        {/* Max Trade Size */}
        <div className="space-y-2">
          <Label htmlFor="max-trade-size" className="text-base">Max Trade Size ($)</Label>
          <Input
            id="max-trade-size"
            type="number"
            value={riskProfile.max_trade_size}
            onChange={(e) => setRiskProfile({
              ...riskProfile, 
              max_trade_size: parseFloat(e.target.value)
            })}
          />
          <p className="text-sm text-gray-500">
            Maximum position size allowed for any trade
          </p>
        </div>
        
        {/* Volatility Tolerance */}
        <div className="space-y-2">
          <Label htmlFor="volatility" className="text-base">Volatility Tolerance</Label>
          <Select
            value={riskProfile.volatility_tolerance}
            onValueChange={(value) => setRiskProfile({
              ...riskProfile, 
              volatility_tolerance: value as 'low' | 'medium' | 'high'
            })}
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
          <p className="text-sm text-gray-500">
            The level of market volatility this farm can tolerate
          </p>
        </div>
        
        {/* Automated Risk Controls */}
        <div className="pt-4 border-t space-y-4">
          <h3 className="font-medium">Automated Risk Controls</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-stop" className="text-base">Auto-Stop Trading</Label>
              <p className="text-sm text-gray-500">
                Automatically pause trading when drawdown exceeds threshold
              </p>
            </div>
            <Switch
              id="auto-stop"
              checked={autoStop}
              onCheckedChange={setAutoStop}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="confirm-trades" className="text-base">Confirm High-Risk Trades</Label>
              <p className="text-sm text-gray-500">
                Require explicit confirmation for trades exceeding risk thresholds
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
          <div className="pt-4 border-t">
            <h3 className="font-medium mb-3">Risk Assessment Factors</h3>
            <div className="space-y-3">
              {riskFactors.map((factor, index) => (
                <div key={index} className="flex items-start">
                  <div className={`mt-0.5 mr-2 ${
                    factor.impact < 0.4 ? 'text-green-500' : 
                    factor.impact < 0.7 ? 'text-amber-500' : 
                    'text-red-500'
                  }`}>
                    {factor.impact < 0.4 ? <Info size={16} /> : 
                     factor.impact < 0.7 ? <AlertTriangle size={16} /> : 
                     <AlertCircle size={16} />}
                  </div>
                  <div>
                    <p className="font-medium">{factor.name}</p>
                    <p className="text-sm text-gray-500">{factor.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" disabled={loading}>Reset</Button>
        <Button 
          onClick={handleSave} 
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Risk Profile'}
        </Button>
      </CardFooter>
    </Card>
  );
} 