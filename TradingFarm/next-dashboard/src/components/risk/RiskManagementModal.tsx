'use client';

import React from 'react';
const { useState, useEffect } = React;
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogWrapper } from '@/components/ui/dialog-wrapper';
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
import { Loader2, Save, AlertTriangle, ShieldAlert, Shield, AlertCircle, Percent, DollarSign, BarChart, Settings, Sliders } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import { Progress } from '@/components/ui/progress';

interface RiskProfile {
  id: string;
  name: string;
  description: string;
  max_position_size: number;
  max_drawdown: number;
  max_leverage: number;
  stop_loss_percent: number;
  take_profit_percent: number;
  max_positions: number;
  max_daily_loss: number;
  max_daily_trades: number;
  volatility_threshold: number;
  risk_level: 'low' | 'medium' | 'high' | 'custom';
  circuit_breaker_enabled: boolean;
  circuit_breaker_threshold: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface RiskUsage {
  strategies_count: number;
  agents_count: number;
  total_usage_percent: number;
}

interface RiskManagementModalProps {
  riskProfileId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function RiskManagementModal({ riskProfileId, isOpen, onClose, onUpdate }: RiskManagementModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [riskUsage, setRiskUsage] = useState<RiskUsage | null>(null);
  const [activeTab, setActiveTab] = useState('parameters');
  const [maxDrawdownValue, setMaxDrawdownValue] = useState<number[]>([]);
  const [dailyLossValue, setDailyLossValue] = useState<number[]>([]);
  const [riskLevel, setRiskLevel] = useState<string>('medium');

  // Risk level presets
  const riskPresets = {
    low: {
      max_position_size: 5,
      max_drawdown: 5,
      max_leverage: 1,
      stop_loss_percent: 3,
      take_profit_percent: 5,
      max_positions: 3,
      max_daily_loss: 3,
      max_daily_trades: 5,
      volatility_threshold: 2,
      circuit_breaker_enabled: true,
      circuit_breaker_threshold: 5,
    },
    medium: {
      max_position_size: 10,
      max_drawdown: 10,
      max_leverage: 2,
      stop_loss_percent: 5,
      take_profit_percent: 10,
      max_positions: 5,
      max_daily_loss: 5,
      max_daily_trades: 10,
      volatility_threshold: 5,
      circuit_breaker_enabled: true,
      circuit_breaker_threshold: 10,
    },
    high: {
      max_position_size: 20,
      max_drawdown: 20,
      max_leverage: 5,
      stop_loss_percent: 10,
      take_profit_percent: 20,
      max_positions: 10,
      max_daily_loss: 10,
      max_daily_trades: 20,
      volatility_threshold: 10,
      circuit_breaker_enabled: false,
      circuit_breaker_threshold: 20,
    }
  };

  useEffect(() => {
    if (isOpen && riskProfileId) {
      loadRiskProfile();
    }
  }, [isOpen, riskProfileId]);

  async function loadRiskProfile() {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();

      // Get risk profile configuration
      const { data, error } = await supabase
        .from('risk_profiles')
        .select('*')
        .eq('id', riskProfileId)
        .single();

      if (error) throw error;

      // Get usage statistics
      const { data: usageData, error: usageError } = await supabase
        .from('risk_usage_stats')
        .select('*')
        .eq('risk_profile_id', riskProfileId)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        throw usageError;
      }

      setRiskProfile(data);
      setRiskUsage(usageData || { 
        strategies_count: 0, 
        agents_count: 0, 
        total_usage_percent: 0 
      });
    } catch (err: any) {
      console.error('Error loading risk profile:', err);
      setError('Failed to load risk profile configuration');
    } finally {
      setIsLoading(false);
    }
  }

  function handleRiskLevelChange(value: string) {
    // TypeScript check for valid risk level
    if (value !== 'low' && value !== 'medium' && value !== 'high' && value !== 'custom') {
      return;
    }
    if (value === 'custom') {
      setRiskProfile((prev: RiskProfile | null) => prev ? { ...prev, risk_level: 'custom' } : null);
      setRiskLevel('custom');
      return;
    }

    const preset = value === 'low' ? riskPresets.low : 
                 value === 'medium' ? riskPresets.medium : 
                 value === 'high' ? riskPresets.high : null;
    
    if (!preset) return;
    setRiskProfile((prev: RiskProfile | null) => prev ? { 
      ...prev, 
      ...preset,
      risk_level: value
    } : null);
    setRiskLevel(value);
  }

  function handleProfileUpdate(field: string, value: unknown) {
    setRiskProfile((prev: RiskProfile | null) => {
      if (!prev) return null;

      // If changing risk parameters, set to custom risk level
      if (field !== 'name' && field !== 'description' && field !== 'is_default') {
        return { ...prev, [field]: value, risk_level: 'custom' };
      }

      return { ...prev, [field]: value };
    });
  }

  async function handleSaveRiskProfile() {
    if (!riskProfile) return;

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createBrowserClient();

      // Update risk profile
      const { error } = await supabase
        .from('risk_profiles')
        .update({
          ...riskProfile,
          updated_at: new Date().toISOString()
        })
        .eq('id', riskProfileId);

      if (error) throw error;

      // If this is now the default profile, clear other defaults
      if (riskProfile.is_default) {
        await supabase
          .from('risk_profiles')
          .update({ is_default: false })
          .neq('id', riskProfileId);
      }

      toast({
        title: 'Risk Profile Updated',
        description: 'Risk management settings have been saved successfully.',
      });

      onUpdate();
    } catch (err: any) {
      console.error('Error saving risk profile:', err);
      setError('Failed to save risk profile: ' + (err.message || 'Unknown error'));

      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'There was an error saving your risk profile settings.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  const updateMaxDrawdown = (value: number[]) => {
    setMaxDrawdownValue(value);
    if (riskProfile) {
      handleProfileUpdate('max_drawdown', value[0]);
    }
  };

  const updateDailyLoss = (value: number[]) => {
    setDailyLossValue(value);
    if (riskProfile) {
      handleProfileUpdate('max_daily_loss', value[0]);
    }
  };
  
  const updateLoss = (value: number[]) => {
    if (riskProfile) {
      handleProfileUpdate('max_positions', value[0]);
    }
  };
  
  const updateMaxOrderSize = (value: number[]) => {
    if (riskProfile) {
      handleProfileUpdate('max_leverage', value[0]);
    }
  };

  return (
    <DialogWrapper open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {riskProfile?.name || 'Risk Management Settings'}
          </DialogTitle>
          <DialogDescription>
            {riskProfile?.description || 'Configure risk parameters and circuit breakers'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-2 md:space-y-0">
              <div className="flex items-center space-x-2">
                <Label>Risk Level</Label>
                <Select 
                  value={riskProfile?.risk_level || 'medium'} 
                  onValueChange={(value: string) => handleRiskLevelChange(value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Risk Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-green-500" />
                        Conservative
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-amber-500" />
                        Moderate
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center">
                        <ShieldAlert className="h-4 w-4 mr-2 text-red-500" />
                        Aggressive
                      </div>
                    </SelectItem>
                    <SelectItem value="custom">
                      <div className="flex items-center">
                        <Settings className="h-4 w-4 mr-2" />
                        Custom
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {riskUsage && (
                <div className="text-sm text-muted-foreground">
                  Used by {riskUsage.strategies_count} strategies and {riskUsage.agents_count} agents
                </div>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="parameters">
                  <Shield className="h-4 w-4 mr-2" />
                  Risk Parameters
                </TabsTrigger>
                <TabsTrigger value="circuit-breakers">
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Circuit Breakers
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
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Position Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Max Position Size (%)</Label>
                          <span className="text-sm font-medium">{riskProfile?.max_position_size}%</span>
                        </div>
                        <Slider
                          value={[riskProfile?.max_position_size || 10]}
                          min={1}
                          max={50}
                          step={1}
                          onValueChange={(value) => handleProfileUpdate('max_position_size', value[0])}
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum size of any single position as a percentage of total capital
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Max Leverage</Label>
                          <span className="text-sm font-medium">{riskProfile?.max_leverage}x</span>
                        </div>
                        <Slider
                          value={riskProfile?.max_leverage || 2}
                          min={1}
                          max={100}
                          step={1}
                          onValueChange={(value) => handleProfileUpdate('max_leverage', value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum leverage allowed for trading positions
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Max Concurrent Positions</Label>
                          <span className="text-sm font-medium">{riskProfile?.max_positions}</span>
                        </div>
                        <Slider
                          value={riskProfile?.max_positions || 5}
                          min={1}
                          max={100}
                          step={1}
                          onValueChange={(value) => handleProfileUpdate('max_positions', value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum number of open positions allowed at one time
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Profit & Loss Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Stop Loss (%)</Label>
                          <span className="text-sm font-medium">{riskProfile?.stop_loss_percent}%</span>
                        </div>
                        <Slider
                          value={[riskProfile?.stop_loss_percent || 5]}
                          min={1}
                          max={25}
                          step={0.5}
                          onValueChange={(value) => handleProfileUpdate('stop_loss_percent', value[0])}
                        />
                        <p className="text-xs text-muted-foreground">
                          Default stop loss percentage for positions
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Take Profit (%)</Label>
                          <span className="text-sm font-medium">{riskProfile?.take_profit_percent}%</span>
                        </div>
                        <Slider
                          value={[riskProfile?.take_profit_percent || 10]}
                          min={1}
                          max={50}
                          step={0.5}
                          onValueChange={(value) => handleProfileUpdate('take_profit_percent', value[0])}
                        />
                        <p className="text-xs text-muted-foreground">
                          Default take profit percentage for positions
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Max Drawdown (%)</Label>
                          <span className="text-sm font-medium">{riskProfile?.max_drawdown}%</span>
                        </div>
                        <Slider
                          value={[riskProfile?.max_drawdown || 10]}
                          min={1}
                          max={50}
                          step={1}
                          onValueChange={(value) => handleProfileUpdate('max_drawdown', value[0])}
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum allowed drawdown before risk reduction
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Daily Limits</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Max Daily Loss (%)</Label>
                          <span className="text-sm font-medium">{riskProfile?.max_daily_loss}%</span>
                        </div>
                        <Slider
                          value={[riskProfile?.max_daily_loss || 5]}
                          min={1}
                          max={25}
                          step={0.5}
                          onValueChange={(value) => handleProfileUpdate('max_daily_loss', value[0])}
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum daily loss allowed as percentage of capital
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Max Daily Trades</Label>
                          <span className="text-sm font-medium">{riskProfile?.max_daily_trades}</span>
                        </div>
                        <Slider
                          value={[riskProfile?.max_daily_trades || 10]}
                          min={1}
                          max={100}
                          step={1}
                          onValueChange={(value) => handleProfileUpdate('max_daily_trades', value[0])}
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum number of trades allowed per day
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Profile Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Profile Name</Label>
                        <Input
                          id="name"
                          value={riskProfile?.name || ''}
                          onChange={(e) => handleProfileUpdate('name', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={riskProfile?.description || ''}
                          onChange={(e) => handleProfileUpdate('description', e.target.value)}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isDefault"
                          checked={riskProfile?.is_default || false}
                          onCheckedChange={(checked) => handleProfileUpdate('is_default', checked)}
                        />
                        <Label htmlFor="isDefault">Set as default profile</Label>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="circuit-breakers" className="py-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Circuit Breakers</CardTitle>
                    <CardDescription>
                      Automatic trading safeguards that pause activity when thresholds are exceeded
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enableCircuitBreakers">Enable Circuit Breakers</Label>
                      <Switch
                        id="enableCircuitBreakers"
                        checked={riskProfile?.circuit_breaker_enabled || false}
                        onCheckedChange={(checked) => handleProfileUpdate('circuit_breaker_enabled', checked)}
                      />
                    </div>
                    
                    <div className={riskProfile?.circuit_breaker_enabled ? '' : 'opacity-50 pointer-events-none'}>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label>Threshold (%)</Label>
                            <span className="text-sm font-medium">{riskProfile?.circuit_breaker_threshold}%</span>
                          </div>
                          <Slider
                            value={[riskProfile?.circuit_breaker_threshold || 10]}
                            min={1}
                            max={25}
                            step={0.5}
                            onValueChange={(value) => handleProfileUpdate('circuit_breaker_threshold', value[0])}
                            className={!riskProfile?.circuit_breaker_enabled ? 'opacity-50' : ''}
                            aria-disabled={!riskProfile?.circuit_breaker_enabled}
                          />
                          <p className="text-xs text-muted-foreground">
                            Trading will pause when losses reach this percentage of account value
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label>Volatility Threshold</Label>
                            <span className="text-sm font-medium">{riskProfile?.volatility_threshold}%</span>
                          </div>
                          <Slider
                            value={[riskProfile?.volatility_threshold || 5]}
                            min={1}
                            max={20}
                            step={0.5}
                            onValueChange={(value) => handleProfileUpdate('volatility_threshold', value[0])}
                            className={!riskProfile?.circuit_breaker_enabled ? 'opacity-50' : ''}
                            aria-disabled={!riskProfile?.circuit_breaker_enabled}
                          />
                          <p className="text-xs text-muted-foreground">
                            Trading will pause when market volatility exceeds this threshold
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="bg-muted/50">
                            <CardContent className="p-4 text-center">
                              <DollarSign className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                              <div className="text-sm font-medium">Loss Protection</div>
                              <div className="text-xs text-muted-foreground">
                                Pauses trading after consecutive losses
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="bg-muted/50">
                            <CardContent className="p-4 text-center">
                              <Percent className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                              <div className="text-sm font-medium">Drawdown Control</div>
                              <div className="text-xs text-muted-foreground">
                                Caps exposure during drawdown periods
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="bg-muted/50">
                            <CardContent className="p-4 text-center">
                              <BarChart className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                              <div className="text-sm font-medium">Volatility Response</div>
                              <div className="text-xs text-muted-foreground">
                                Reduces position sizing in volatile markets
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Circuit breakers can be manually reset through the dashboard interface
                          </AlertDescription>
                        </Alert>
                      </div>
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
              handleSaveRiskProfile();
            }} 
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Risk Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogWrapper>
  );
}
