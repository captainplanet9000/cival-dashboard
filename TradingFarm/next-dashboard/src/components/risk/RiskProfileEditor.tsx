'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RiskLevel, RiskProfile, RISK_PRESETS } from '@/lib/risk/types';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Form schema for risk profile
const riskProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  description: z.string().max(200, 'Description must be less than 200 characters').optional(),
  level: z.enum(['conservative', 'moderate', 'aggressive', 'custom']),
  
  // Parameters
  maxPositionSize: z.number().min(0.1).max(100),
  maxPositionSizeAbsolute: z.number().min(1),
  maxLeverage: z.number().min(1),
  stopLossPercentage: z.number().min(0.1),
  maxDrawdownPercentage: z.number().min(1).max(100),
  trailingStopEnabled: z.boolean(),
  trailingStopActivationPercent: z.number().min(0.1),
  trailingStopDistance: z.number().min(0.1),
  maxOpenPositions: z.number().int().min(1),
  maxSymbolExposure: z.number().min(1).max(100),
  maxSectorExposure: z.number().min(1).max(100),
  volatilityCircuitBreaker: z.number().min(0.1),
  dailyLossCircuitBreaker: z.number().min(0.1),
  minDiversificationCount: z.number().int().min(1),
  correlationThreshold: z.number().min(0.1).max(1),
  tradingHoursStart: z.string(),
  tradingHoursEnd: z.string(),
  timeZone: z.string(),
  excludedDays: z.array(z.string()),
  minSignalConfirmations: z.number().int().min(1),
  signalTimeoutMinutes: z.number().int().min(1)
});

type RiskProfileFormValues = z.infer<typeof riskProfileSchema>;

interface RiskProfileEditorProps {
  profile?: RiskProfile;
  onSave: () => void;
  onCancel: () => void;
}

export function RiskProfileEditor({ profile, onSave, onCancel }: RiskProfileEditorProps) {
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Initialize form with profile data or defaults
  const form = useForm<RiskProfileFormValues>({
    resolver: zodResolver(riskProfileSchema),
    defaultValues: profile ? {
      name: profile.name,
      description: profile.description || '',
      level: profile.level,
      
      // Parameters
      maxPositionSize: profile.parameters.maxPositionSize,
      maxPositionSizeAbsolute: profile.parameters.maxPositionSizeAbsolute,
      maxLeverage: profile.parameters.maxLeverage,
      stopLossPercentage: profile.parameters.stopLossPercentage,
      maxDrawdownPercentage: profile.parameters.maxDrawdownPercentage,
      trailingStopEnabled: profile.parameters.trailingStopEnabled,
      trailingStopActivationPercent: profile.parameters.trailingStopActivationPercent,
      trailingStopDistance: profile.parameters.trailingStopDistance,
      maxOpenPositions: profile.parameters.maxOpenPositions,
      maxSymbolExposure: profile.parameters.maxSymbolExposure,
      maxSectorExposure: profile.parameters.maxSectorExposure,
      volatilityCircuitBreaker: profile.parameters.volatilityCircuitBreaker,
      dailyLossCircuitBreaker: profile.parameters.dailyLossCircuitBreaker,
      minDiversificationCount: profile.parameters.minDiversificationCount,
      correlationThreshold: profile.parameters.correlationThreshold,
      tradingHoursStart: profile.parameters.tradingHoursStart,
      tradingHoursEnd: profile.parameters.tradingHoursEnd,
      timeZone: profile.parameters.timeZone,
      excludedDays: profile.parameters.excludedDays,
      minSignalConfirmations: profile.parameters.minSignalConfirmations,
      signalTimeoutMinutes: profile.parameters.signalTimeoutMinutes
    } : {
      name: '',
      description: '',
      level: RiskLevel.MODERATE,
      
      // Default to moderate parameters
      ...RISK_PRESETS[RiskLevel.MODERATE],
      
      // These aren't in the presets
      excludedDays: ['Saturday', 'Sunday'],
    }
  });
  
  // Update form values when level changes
  const handleLevelChange = (level: RiskLevel) => {
    if (level !== RiskLevel.CUSTOM) {
      const presetParams = RISK_PRESETS[level];
      
      Object.entries(presetParams).forEach(([key, value]) => {
        form.setValue(key as keyof RiskProfileFormValues, value as any);
      });
    }
    
    form.setValue('level', level);
  };
  
  // Handle form submission
  const onSubmit = async (data: RiskProfileFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Build parameters object
      const parameters = {
        maxPositionSize: data.maxPositionSize,
        maxPositionSizeAbsolute: data.maxPositionSizeAbsolute,
        maxLeverage: data.maxLeverage,
        stopLossPercentage: data.stopLossPercentage,
        maxDrawdownPercentage: data.maxDrawdownPercentage,
        trailingStopEnabled: data.trailingStopEnabled,
        trailingStopActivationPercent: data.trailingStopActivationPercent,
        trailingStopDistance: data.trailingStopDistance,
        maxOpenPositions: data.maxOpenPositions,
        maxSymbolExposure: data.maxSymbolExposure,
        maxSectorExposure: data.maxSectorExposure,
        volatilityCircuitBreaker: data.volatilityCircuitBreaker,
        dailyLossCircuitBreaker: data.dailyLossCircuitBreaker,
        minDiversificationCount: data.minDiversificationCount,
        correlationThreshold: data.correlationThreshold,
        tradingHoursStart: data.tradingHoursStart,
        tradingHoursEnd: data.tradingHoursEnd,
        timeZone: data.timeZone,
        excludedDays: data.excludedDays,
        minSignalConfirmations: data.minSignalConfirmations,
        signalTimeoutMinutes: data.signalTimeoutMinutes,
        customRiskRules: profile?.parameters.customRiskRules || {}
      };
      
      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('risk_profiles')
          .update({
            name: data.name,
            description: data.description,
            level: data.level,
            parameters
          })
          .eq('id', profile.id);
        
        if (error) throw error;
        
        toast({
          title: 'Profile Updated',
          description: 'Your risk profile has been updated successfully.',
        });
      } else {
        // Create new profile
        const { error } = await supabase
          .from('risk_profiles')
          .insert({
            name: data.name,
            description: data.description,
            level: data.level,
            parameters,
            is_default: false
          });
        
        if (error) throw error;
        
        toast({
          title: 'Profile Created',
          description: 'Your new risk profile has been created successfully.',
        });
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save risk profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Conservative Trading" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="Describe your risk profile..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risk Level</FormLabel>
                  <Select
                    onValueChange={(value) => handleLevelChange(value as RiskLevel)}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a risk level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={RiskLevel.CONSERVATIVE}>Conservative</SelectItem>
                      <SelectItem value={RiskLevel.MODERATE}>Moderate</SelectItem>
                      <SelectItem value={RiskLevel.AGGRESSIVE}>Aggressive</SelectItem>
                      <SelectItem value={RiskLevel.CUSTOM}>Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose a preset or customize your own risk parameters.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Tabs defaultValue="position-sizing" className="mt-6">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="position-sizing">Position Sizing</TabsTrigger>
                <TabsTrigger value="loss-prevention">Loss Prevention</TabsTrigger>
                <TabsTrigger value="exposure-limits">Exposure Limits</TabsTrigger>
                <TabsTrigger value="circuit-breakers">Circuit Breakers</TabsTrigger>
              </TabsList>
              
              <TabsContent value="position-sizing" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="maxPositionSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Position Size (%)</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-4">
                          <Slider
                            min={0.1}
                            max={20}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-20"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Maximum position size as percentage of equity
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="maxPositionSizeAbsolute"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Position Size (Absolute)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum position size in absolute value (e.g., USD)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="maxLeverage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Leverage</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-4">
                          <Slider
                            min={1}
                            max={10}
                            step={0.5}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-20"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Maximum leverage allowed for trades
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="loss-prevention" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="stopLossPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stop Loss (%)</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-4">
                          <Slider
                            min={0.1}
                            max={10}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-20"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Default stop loss percentage for trades
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="maxDrawdownPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Drawdown (%)</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-4">
                          <Slider
                            min={1}
                            max={50}
                            step={0.5}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-20"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Maximum portfolio drawdown allowed before halting trading
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="trailing-stop">
                    <AccordionTrigger>Trailing Stop Settings</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="trailingStopEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Enable Trailing Stops</FormLabel>
                              <FormDescription>
                                Automatically adjust stop loss as trade moves in your favor
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
                        name="trailingStopActivationPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Activation Percentage</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-4">
                                <Slider
                                  min={0.1}
                                  max={5}
                                  step={0.1}
                                  value={[field.value]}
                                  onValueChange={(value) => field.onChange(value[0])}
                                  className="flex-1"
                                  disabled={!form.watch('trailingStopEnabled')}
                                />
                                <Input
                                  type="number"
                                  value={field.value}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  className="w-20"
                                  disabled={!form.watch('trailingStopEnabled')}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Profit percentage required to activate trailing stop
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="trailingStopDistance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trailing Distance (%)</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-4">
                                <Slider
                                  min={0.1}
                                  max={5}
                                  step={0.1}
                                  value={[field.value]}
                                  onValueChange={(value) => field.onChange(value[0])}
                                  className="flex-1"
                                  disabled={!form.watch('trailingStopEnabled')}
                                />
                                <Input
                                  type="number"
                                  value={field.value}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  className="w-20"
                                  disabled={!form.watch('trailingStopEnabled')}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Distance to maintain for trailing stop
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>
              
              <TabsContent value="exposure-limits" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="maxOpenPositions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Open Positions</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of concurrent open positions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="maxSymbolExposure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Symbol Exposure (%)</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-4">
                          <Slider
                            min={1}
                            max={70}
                            step={1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-20"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Maximum exposure to a single symbol as percentage of portfolio
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="maxSectorExposure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Sector Exposure (%)</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-4">
                          <Slider
                            min={1}
                            max={100}
                            step={1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-20"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Maximum exposure to a single sector as percentage of portfolio
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="minDiversificationCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Diversification Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum number of different assets to hold
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="correlationThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correlation Threshold</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-4">
                          <Slider
                            min={0}
                            max={1}
                            step={0.05}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-20"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Maximum correlation allowed between positions (0-1)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="circuit-breakers" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="volatilityCircuitBreaker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volatility Circuit Breaker (%)</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-4">
                          <Slider
                            min={0.1}
                            max={20}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-20"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Halt trading if volatility exceeds this percentage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dailyLossCircuitBreaker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Loss Circuit Breaker (%)</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-4">
                          <Slider
                            min={0.1}
                            max={10}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-20"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Halt trading if daily loss exceeds this percentage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="trading-hours">
                    <AccordionTrigger>Trading Hours</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="tradingHoursStart"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trading Start Time</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="tradingHoursEnd"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trading End Time</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="timeZone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time Zone</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a time zone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                                <SelectItem value="Europe/London">London (GMT)</SelectItem>
                                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
        
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
