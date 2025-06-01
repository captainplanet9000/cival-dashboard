'use client';

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, Info, Lock, Percent, DollarSign, BarChart2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { createRiskProfile, updateRiskProfile } from '@/app/actions/risk-management-actions';

// Define the schema for risk profile
const riskProfileSchema = z.object({
  name: z.string().min(3, {
    message: "Profile name must be at least 3 characters."
  }),
  description: z.string().optional(),
  farm_id: z.string(),
  max_position_size: z.number().positive({
    message: "Maximum position size must be positive."
  }),
  max_position_size_percentage: z.number().min(0).max(100, {
    message: "Position size percentage must be between 0 and 100."
  }),
  max_drawdown_percentage: z.number().min(0).max(100, {
    message: "Maximum drawdown must be between 0 and 100."
  }),
  max_daily_trades: z.number().int().nonnegative({
    message: "Maximum daily trades must be a non-negative integer."
  }),
  max_open_positions: z.number().int().nonnegative({
    message: "Maximum open positions must be a non-negative integer."
  }),
  max_daily_loss_percentage: z.number().min(0).max(100, {
    message: "Maximum daily loss must be between 0 and 100."
  }),
  stop_loss_required: z.boolean(),
  take_profit_required: z.boolean(),
  risk_reward_ratio_minimum: z.number().nonnegative({
    message: "Risk-reward ratio must be non-negative."
  }),
  allowed_symbols: z.array(z.string()).optional(),
  allowed_exchanges: z.array(z.string()).optional(),
  allowed_order_types: z.array(z.string()).optional(),
  risk_level: z.enum(['conservative', 'moderate', 'aggressive', 'custom']),
  is_active: z.boolean(),
  is_default: z.boolean(),
});

export type RiskProfileFormValues = z.infer<typeof riskProfileSchema>;

interface RiskProfileFormProps {
  initialData?: Partial<RiskProfileFormValues>;
  farmId: string;
  onSuccess?: () => void;
  isEditing?: boolean;
}

export default function RiskProfileForm({ 
  initialData, 
  farmId, 
  onSuccess, 
  isEditing = false 
}: RiskProfileFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Define the form with the schema and default values
  const form = useForm<RiskProfileFormValues>({
    resolver: zodResolver(riskProfileSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      farm_id: farmId,
      max_position_size: initialData?.max_position_size || 1000,
      max_position_size_percentage: initialData?.max_position_size_percentage || 5,
      max_drawdown_percentage: initialData?.max_drawdown_percentage || 15,
      max_daily_trades: initialData?.max_daily_trades || 20,
      max_open_positions: initialData?.max_open_positions || 5,
      max_daily_loss_percentage: initialData?.max_daily_loss_percentage || 3,
      stop_loss_required: initialData?.stop_loss_required || true,
      take_profit_required: initialData?.take_profit_required || false,
      risk_reward_ratio_minimum: initialData?.risk_reward_ratio_minimum || 2,
      allowed_symbols: initialData?.allowed_symbols || [],
      allowed_exchanges: initialData?.allowed_exchanges || [],
      allowed_order_types: initialData?.allowed_order_types || [],
      risk_level: initialData?.risk_level || 'moderate',
      is_active: initialData?.is_active !== undefined ? initialData.is_active : true,
      is_default: initialData?.is_default || false,
    },
  });
  
  // Watch form values to dynamically adjust the form
  const riskLevel = form.watch('risk_level');
  
  // Apply preset risk levels
  const applyRiskPreset = (level: 'conservative' | 'moderate' | 'aggressive') => {
    if (level === 'conservative') {
      form.setValue('max_position_size_percentage', 2);
      form.setValue('max_drawdown_percentage', 10);
      form.setValue('max_daily_loss_percentage', 1);
      form.setValue('stop_loss_required', true);
      form.setValue('take_profit_required', true);
      form.setValue('risk_reward_ratio_minimum', 3);
      form.setValue('max_daily_trades', 10);
      form.setValue('max_open_positions', 3);
    } else if (level === 'moderate') {
      form.setValue('max_position_size_percentage', 5);
      form.setValue('max_drawdown_percentage', 15);
      form.setValue('max_daily_loss_percentage', 3);
      form.setValue('stop_loss_required', true);
      form.setValue('take_profit_required', false);
      form.setValue('risk_reward_ratio_minimum', 2);
      form.setValue('max_daily_trades', 20);
      form.setValue('max_open_positions', 5);
    } else if (level === 'aggressive') {
      form.setValue('max_position_size_percentage', 10);
      form.setValue('max_drawdown_percentage', 25);
      form.setValue('max_daily_loss_percentage', 5);
      form.setValue('stop_loss_required', false);
      form.setValue('take_profit_required', false);
      form.setValue('risk_reward_ratio_minimum', 1.5);
      form.setValue('max_daily_trades', 30);
      form.setValue('max_open_positions', 10);
    }
  };
  
  // Handle risk level change
  React.useEffect(() => {
    if (riskLevel !== 'custom') {
      applyRiskPreset(riskLevel);
    }
  }, [riskLevel]);
  
  // Handle form submission
  const onSubmit = async (values: RiskProfileFormValues) => {
    try {
      setIsSubmitting(true);
      
      if (isEditing && initialData?.id) {
        // Update existing profile
        const result = await updateRiskProfile(initialData.id, values);
        
        if (result.success) {
          toast({
            title: "Risk profile updated",
            description: "Your risk profile has been successfully updated.",
          });
          
          if (onSuccess) onSuccess();
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to update risk profile",
            variant: "destructive",
          });
        }
      } else {
        // Create new profile
        const result = await createRiskProfile(values);
        
        if (result.success) {
          toast({
            title: "Risk profile created",
            description: "Your new risk profile has been successfully created.",
          });
          
          form.reset();
          if (onSuccess) onSuccess();
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to create risk profile",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Risk Profile' : 'Create New Risk Profile'}</CardTitle>
            <CardDescription>
              Define risk management parameters to control trading behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Conservative Growth" {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive name for this risk profile
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the purpose and use case for this risk profile" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description to help users understand this profile's intended use
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="risk_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Level</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a risk level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="conservative">Conservative</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="aggressive">Aggressive</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a preset or custom to define your own parameters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Position Size Limits */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Position Size Limits</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_position_size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Position Size</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Maximum position size in account currency
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="max_position_size_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Position Size (% of Portfolio)</FormLabel>
                      <FormControl>
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center">
                            <span className="text-muted-foreground w-8">{field.value}%</span>
                            <Slider
                              defaultValue={[field.value]}
                              max={100}
                              step={1}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Maximum position size as a percentage of total portfolio value
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Risk Management Parameters */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Risk Management Parameters</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_drawdown_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Drawdown (%)</FormLabel>
                      <FormControl>
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center">
                            <span className="text-muted-foreground w-8">{field.value}%</span>
                            <Slider
                              defaultValue={[field.value]}
                              max={100}
                              step={1}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Maximum allowable drawdown before trading is halted
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="max_daily_loss_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Daily Loss (%)</FormLabel>
                      <FormControl>
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center">
                            <span className="text-muted-foreground w-8">{field.value}%</span>
                            <Slider
                              defaultValue={[field.value]}
                              max={20}
                              step={0.1}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Maximum daily loss before trading is paused
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="max_daily_trades"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Daily Trades</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of trades allowed per day
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="max_open_positions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Open Positions</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of positions that can be open simultaneously
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="risk_reward_ratio_minimum"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Risk/Reward Ratio</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum risk/reward ratio required for new trades
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stop_loss_required"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Require Stop Loss</FormLabel>
                        <FormDescription>
                          All orders must include a stop loss
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="take_profit_required"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Require Take Profit</FormLabel>
                        <FormDescription>
                          All orders must include a take profit level
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Profile Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Profile Status</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Profile</FormLabel>
                        <FormDescription>
                          Inactive profiles won't be applied to trading
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Default Profile</FormLabel>
                        <FormDescription>
                          This profile will be used for all trading by default
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {riskLevel === 'aggressive' && (
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>High Risk Profile</AlertTitle>
                <AlertDescription>
                  This is an aggressive risk profile with higher position sizes and drawdown limits.
                  Make sure this aligns with your overall trading strategy and risk tolerance.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSubmitting}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : isEditing ? 'Update Profile' : 'Create Profile'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
