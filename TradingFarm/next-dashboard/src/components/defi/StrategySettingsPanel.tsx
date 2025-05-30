import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  AlertCircle, 
  Save, 
  Undo
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '../ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  LendingStrategyType, 
  StrategyExecutionStatus 
} from '@/types/defi-lending.types';
import defiLendingService from '@/services/defi-lending.service';

interface StrategySettingsPanelProps {
  strategy: any;
  onUpdate: () => void;
}

export default function StrategySettingsPanel({ 
  strategy, 
  onUpdate 
}: StrategySettingsPanelProps) {
  const supabase = createBrowserClient();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    targetLtv: strategy.target_ltv,
    targetHealthFactor: strategy.target_health_factor,
    liquidationProtection: strategy.liquidation_protection,
    autoRebalancing: strategy.auto_rebalancing,
    maxIterations: strategy.max_iterations,
    batchProcessing: strategy.batch_processing,
    repaymentInterval: strategy.repayment_interval,
    repaymentThreshold: strategy.repayment_threshold,
    ltvRange: strategy.ltv_range || [40, 60],
    rebalanceInterval: strategy.rebalance_interval
  });
  
  // Check if settings have been changed
  const hasChanges = () => {
    return (
      settings.targetLtv !== strategy.target_ltv ||
      settings.targetHealthFactor !== strategy.target_health_factor ||
      settings.liquidationProtection !== strategy.liquidation_protection ||
      settings.autoRebalancing !== strategy.auto_rebalancing ||
      (strategy.type === LendingStrategyType.RECURSIVE_LOOP && 
        (settings.maxIterations !== strategy.max_iterations ||
        settings.batchProcessing !== strategy.batch_processing)) ||
      (strategy.type === LendingStrategyType.SELF_REPAYING && 
        (settings.repaymentInterval !== strategy.repayment_interval ||
        settings.repaymentThreshold !== strategy.repayment_threshold)) ||
      (strategy.type === LendingStrategyType.DYNAMIC_LTV && 
        (JSON.stringify(settings.ltvRange) !== JSON.stringify(strategy.ltv_range) ||
        settings.rebalanceInterval !== strategy.rebalance_interval))
    );
  };
  
  // Reset settings to original values
  const handleReset = () => {
    setSettings({
      targetLtv: strategy.target_ltv,
      targetHealthFactor: strategy.target_health_factor,
      liquidationProtection: strategy.liquidation_protection,
      autoRebalancing: strategy.auto_rebalancing,
      maxIterations: strategy.max_iterations,
      batchProcessing: strategy.batch_processing,
      repaymentInterval: strategy.repayment_interval,
      repaymentThreshold: strategy.repayment_threshold,
      ltvRange: strategy.ltv_range || [40, 60],
      rebalanceInterval: strategy.rebalance_interval
    });
  };
  
  // Update strategy settings
  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      
      // Update strategy in database
      const { error } = await supabase
        .from('lending_strategies')
        .update({
          target_ltv: settings.targetLtv,
          target_health_factor: settings.targetHealthFactor,
          liquidation_protection: settings.liquidationProtection,
          auto_rebalancing: settings.autoRebalancing,
          max_iterations: settings.maxIterations,
          batch_processing: settings.batchProcessing,
          repayment_interval: settings.repaymentInterval,
          repayment_threshold: settings.repaymentThreshold,
          ltv_range: settings.ltvRange,
          rebalance_interval: settings.rebalanceInterval
        })
        .eq('id', strategy.id);
      
      if (error) throw error;
      
      // If strategy is active, notify the service to update the strategy
      if (strategy.status === StrategyExecutionStatus.ACTIVE) {
        await defiLendingService.updateStrategy(strategy.id);
      }
      
      toast({
        title: 'Success',
        description: 'Strategy settings have been updated',
      });
      
      // Notify parent component
      onUpdate();
    } catch (error) {
      console.error('Error updating strategy settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update strategy settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Display warning for potentially dangerous settings
  const showRiskWarning = () => {
    if (settings.targetLtv > 65) {
      return true;
    }
    
    if (settings.targetHealthFactor < 1.2) {
      return true;
    }
    
    if (strategy.type === LendingStrategyType.RECURSIVE_LOOP && settings.maxIterations > 5) {
      return true;
    }
    
    if (strategy.type === LendingStrategyType.DYNAMIC_LTV && settings.ltvRange[1] > 70) {
      return true;
    }
    
    return false;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategy Settings</CardTitle>
        <CardDescription>
          Adjust parameters for your lending strategy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Core Risk Parameters */}
        <div>
          <h3 className="text-lg font-medium mb-4">Risk Parameters</h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="target-ltv">
                  Target LTV Ratio
                  <InfoTooltip content="Loan-to-Value ratio determines how much you can borrow against your collateral" />
                </Label>
                <span className="text-sm font-medium">{settings.targetLtv}%</span>
              </div>
              <Slider
                id="target-ltv"
                value={[settings.targetLtv]}
                min={0}
                max={75}
                step={1}
                onValueChange={value => setSettings(prev => ({ ...prev, targetLtv: value[0] }))}
                disabled={loading}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Conservative (0%)</span>
                <span>Aggressive (75%)</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="target-health-factor">
                  Target Health Factor
                  <InfoTooltip content="Health factor below 1.0 will result in liquidation. Higher values are safer." />
                </Label>
                <span className="text-sm font-medium">{settings.targetHealthFactor}</span>
              </div>
              <Slider
                id="target-health-factor"
                value={[settings.targetHealthFactor]}
                min={1.05}
                max={3}
                step={0.05}
                onValueChange={value => setSettings(prev => ({ ...prev, targetHealthFactor: value[0] }))}
                disabled={loading}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Risky (1.05)</span>
                <span>Very Safe (3.0)</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="liquidation-protection"
                checked={settings.liquidationProtection}
                onCheckedChange={value => setSettings(prev => ({ ...prev, liquidationProtection: value }))}
                disabled={loading}
              />
              <Label htmlFor="liquidation-protection" className="cursor-pointer">
                Enable Liquidation Protection
                <InfoTooltip content="Automatically adjusts positions when health factor becomes too low" />
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-rebalancing"
                checked={settings.autoRebalancing}
                onCheckedChange={value => setSettings(prev => ({ ...prev, autoRebalancing: value }))}
                disabled={loading}
              />
              <Label htmlFor="auto-rebalancing" className="cursor-pointer">
                Enable Auto-Rebalancing
                <InfoTooltip content="Periodically adjusts positions to maintain target LTV ratio" />
              </Label>
            </div>
          </div>
        </div>
        
        {/* Strategy-specific settings */}
        {strategy.type === LendingStrategyType.RECURSIVE_LOOP && (
          <div>
            <h3 className="text-lg font-medium mb-4">Recursive Loop Settings</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="max-iterations">
                    Maximum Iterations
                    <InfoTooltip content="Number of supply-borrow cycles to execute" />
                  </Label>
                  <span className="text-sm font-medium">{settings.maxIterations || 3}</span>
                </div>
                <Slider
                  id="max-iterations"
                  value={[settings.maxIterations || 3]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={value => setSettings(prev => ({ ...prev, maxIterations: value[0] }))}
                  disabled={loading}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low Leverage (1)</span>
                  <span>High Leverage (10)</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="batch-processing"
                  checked={settings.batchProcessing}
                  onCheckedChange={value => setSettings(prev => ({ ...prev, batchProcessing: value }))}
                  disabled={loading}
                />
                <Label htmlFor="batch-processing" className="cursor-pointer">
                  Batch Process Transactions
                  <InfoTooltip content="Execute all iterations in a single transaction to save gas fees" />
                </Label>
              </div>
            </div>
          </div>
        )}
        
        {strategy.type === LendingStrategyType.SELF_REPAYING && (
          <div>
            <h3 className="text-lg font-medium mb-4">Self-Repaying Loan Settings</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="repayment-interval">
                  Repayment Interval (Days)
                  <InfoTooltip content="How often repayments are made" />
                </Label>
                <Input
                  id="repayment-interval"
                  type="number"
                  min={1}
                  value={settings.repaymentInterval}
                  onChange={e => setSettings(prev => ({ ...prev, repaymentInterval: parseInt(e.target.value) }))}
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="repayment-threshold">
                  Repayment Threshold
                  <InfoTooltip content="Minimum amount to repay each interval" />
                </Label>
                <Input
                  id="repayment-threshold"
                  type="text"
                  placeholder="0.1"
                  value={settings.repaymentThreshold}
                  onChange={e => setSettings(prev => ({ ...prev, repaymentThreshold: e.target.value }))}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        )}
        
        {strategy.type === LendingStrategyType.DYNAMIC_LTV && (
          <div>
            <h3 className="text-lg font-medium mb-4">Dynamic LTV Settings</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="ltv-range">
                    LTV Range
                    <InfoTooltip content="The minimum and maximum LTV for this strategy" />
                  </Label>
                  <span className="text-sm font-medium">
                    {settings.ltvRange?.[0] || 40}% - {settings.ltvRange?.[1] || 60}%
                  </span>
                </div>
                <Slider
                  id="ltv-range"
                  value={settings.ltvRange || [40, 60]}
                  min={0}
                  max={75}
                  step={1}
                  onValueChange={value => setSettings(prev => ({ ...prev, ltvRange: [value[0], value[1]] }))}
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rebalance-interval">
                  Rebalance Interval (Days)
                  <InfoTooltip content="How often the position is rebalanced" />
                </Label>
                <Input
                  id="rebalance-interval"
                  type="number"
                  min={1}
                  value={settings.rebalanceInterval}
                  onChange={e => setSettings(prev => ({ ...prev, rebalanceInterval: parseInt(e.target.value) }))}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Risk Warning */}
        {showRiskWarning() && (
          <Alert variant="warning" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>High Risk Settings</AlertTitle>
            <AlertDescription>
              The settings you've selected may increase your liquidation risk. Please ensure you understand the implications before saving.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-4">
        <Button 
          variant="outline" 
          onClick={handleReset}
          disabled={!hasChanges() || loading}
        >
          <Undo className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button 
          onClick={handleSaveSettings}
          disabled={!hasChanges() || loading}
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
              Saving...
            </div>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Helper components
const InfoTooltip = ({ content }: { content: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted-foreground hover:text-muted">
          ?
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
