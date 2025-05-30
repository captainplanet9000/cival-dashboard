"use client";

import React from 'react';
import { Slider } from '../../../components/ui/slider';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useToast } from '../../../components/ui/use-toast';
import { Farm, RiskProfile } from '@/types/farm-types';

interface RiskControlProps {
  riskProfile: RiskProfile;
  farm: Farm;
  onUpdate?: (data: Partial<Farm>) => void;
}

export default function RiskControl({ riskProfile, farm, onUpdate }: RiskControlProps) {
  const { toast } = useToast();
  const [formData, setFormData] = React.useState({
    max_drawdown: farm.risk_profile?.max_drawdown || 5,
    max_trade_size: farm.risk_profile?.max_trade_size || 1000,
    risk_per_trade: farm.risk_profile?.risk_per_trade || 1,
    volatility_tolerance: farm.risk_profile?.volatility_tolerance || 'medium' as 'low' | 'medium' | 'high'
  });
  
  const [loading, setLoading] = React.useState(false);
  const [autoStop, setAutoStop] = React.useState(true);
  const [confirmHighRiskTrades, setConfirmHighRiskTrades] = React.useState(true);
  
  // Handle saving risk profile
  const handleSave = async () => {
    if (!onUpdate) {
      toast({
        title: 'Offline Mode',
        description: 'Cannot update risk profile in offline mode.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Only pass the risk_profile in the update payload
      await onUpdate({
        risk_profile: formData
      });
      
      toast({
        title: 'Risk profile updated',
        description: 'Farm risk controls have been successfully updated.',
      });
    } catch (error) {
      toast({
        title: 'Error updating risk profile',
        description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate risk level based on max drawdown
  const getRiskLevel = () => {
    if (formData.max_drawdown <= 5) return { level: 'Low', color: 'text-green-600' };
    if (formData.max_drawdown <= 15) return { level: 'Medium', color: 'text-amber-600' };
    return { level: 'High', color: 'text-red-600' };
  };
  
  const riskLevel = getRiskLevel();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Risk Management Controls</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal">Risk Score:</span>
            <span className={`text-lg font-semibold ${
              riskProfile.riskScore < 40 ? 'text-green-600' : 
              riskProfile.riskScore < 70 ? 'text-amber-600' : 
              'text-red-600'
            }`}>
              {riskProfile.riskScore}
            </span>
          </div>
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
              {formData.max_drawdown}% ({riskLevel.level} Risk)
            </span>
          </div>
          <Slider
            id="max-drawdown"
            min={1}
            max={30}
            step={1}
            value={[formData.max_drawdown]}
            onValueChange={(values: number[]) => setFormData({...formData, max_drawdown: values[0]})}
          />
          <p className="text-sm text-gray-500">
            Maximum allowable drawdown before automated risk controls activate
          </p>
        </div>
        
        {/* Risk Per Trade Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="risk-per-trade" className="text-base">Risk Per Trade</Label>
            <span className="text-sm font-medium">{formData.risk_per_trade}%</span>
          </div>
          <Slider
            id="risk-per-trade"
            min={0.1}
            max={5}
            step={0.1}
            value={[formData.risk_per_trade]}
            onValueChange={(values: number[]) => setFormData({...formData, risk_per_trade: values[0]})}
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
            value={formData.max_trade_size}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
              ...formData, 
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
            value={formData.volatility_tolerance}
            onValueChange={(value: string) => setFormData({
              ...formData, 
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
            How much market volatility the system should tolerate before adjusting strategies
          </p>
        </div>
        
        {/* Safety Controls */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium">Safety Controls</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-stop" className="text-base">Auto-Stop Loss</Label>
              <p className="text-sm text-gray-500">
                Automatically stop trading when max drawdown is reached
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
                Require confirmation for trades exceeding risk thresholds
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
        {riskProfile.factors && riskProfile.factors.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium">Risk Assessment Factors</h3>
            
            <div className="space-y-3">
              {riskProfile.factors.map((factor, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                  <div className={`mt-0.5 ${
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
                    <p className="text-sm text-muted-foreground">{factor.description}</p>
                  </div>
                  <div className="ml-auto">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      factor.impact < 0.4 ? 'bg-green-100 text-green-700' : 
                      factor.impact < 0.7 ? 'bg-amber-100 text-amber-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {Math.round(factor.impact * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={loading || !onUpdate}>
          {loading ? 'Saving...' : 'Save Risk Profile'}
        </Button>
      </CardFooter>
    </Card>
  );
}