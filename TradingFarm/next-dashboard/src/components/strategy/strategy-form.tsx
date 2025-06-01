'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { useCreateStrategy, useUpdateStrategy, StrategyInput } from '@/hooks/react-query/use-strategy-mutations';
import { useStrategies } from '@/hooks/react-query/use-strategy-queries';

// Define schema for form validation
const strategyFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name must be at most 50 characters'),
  description: z.string().optional(),
  type: z.string().min(1, 'Strategy type is required'),
  status: z.enum(['active', 'paused', 'draft']),
  parameters: z.object({
    timeframe: z.string().min(1, 'Timeframe is required'),
    symbols: z.array(z.string()).min(1, 'At least one symbol is required'),
    riskManagement: z.object({
      maxPositionSize: z.number().min(0.01).max(1),
      stopLoss: z.number().min(0.1).max(50).optional(),
      takeProfit: z.number().min(0.1).max(50).optional(),
      trailingStop: z.number().min(0.1).max(50).optional(),
    }),
  }),
  tags: z.array(z.string()).optional(),
});

type StrategyFormValues = z.infer<typeof strategyFormSchema>;

interface StrategyFormProps {
  strategyId?: string;
  initialData?: any;
  farmId: string;
}

export function StrategyForm({ strategyId, initialData, farmId }: StrategyFormProps) {
  const router = useRouter();
  const [symbolInput, setSymbolInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  
  // Use the mutation hooks
  const createStrategy = useCreateStrategy();
  const updateStrategy = useUpdateStrategy();
  
  // Get all strategies to check for duplicate names
  const { data: strategiesData } = useStrategies({ farmId });
  
  // Determine if we're editing or creating
  const isEditing = !!strategyId;
  
  // Setup default values for the form
  const defaultValues: Partial<StrategyFormValues> = initialData ? {
    ...initialData,
    // Ensure correct nested structure
    parameters: {
      ...initialData.parameters,
      riskManagement: {
        maxPositionSize: initialData.parameters?.riskManagement?.maxPositionSize || 0.1,
        stopLoss: initialData.parameters?.riskManagement?.stopLoss,
        takeProfit: initialData.parameters?.riskManagement?.takeProfit,
        trailingStop: initialData.parameters?.riskManagement?.trailingStop,
      }
    }
  } : {
    name: '',
    description: '',
    type: 'technical',
    status: 'draft',
    parameters: {
      timeframe: '1h',
      symbols: [],
      riskManagement: {
        maxPositionSize: 0.1,
      }
    },
    tags: [],
  };
  
  // Initialize the form
  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues,
  });
  
  // Watch form values to conditionally render components
  const watchedSymbols = form.watch('parameters.symbols') || [];
  const watchedTags = form.watch('tags') || [];
  const watchedType = form.watch('type');
  
  // Function to check if name is unique
  const isNameUnique = (name: string) => {
    if (!strategiesData || !strategiesData.length) return true;
    
    // If editing, exclude the current strategy
    const otherStrategies = strategyId 
      ? strategiesData.filter(s => s.id !== strategyId) 
      : strategiesData;
      
    return !otherStrategies.some(s => s.name.toLowerCase() === name.toLowerCase());
  };
  
  // Handle form submission
  const onSubmit = (data: StrategyFormValues) => {
    // Check for duplicate name
    if (!isNameUnique(data.name)) {
      form.setError('name', { 
        type: 'manual', 
        message: 'A strategy with this name already exists' 
      });
      return;
    }
    
    const strategyData: StrategyInput = {
      ...data,
      // Add any additional fields needed for API
    };
    
    if (isEditing) {
      // Update existing strategy
      updateStrategy.mutate(
        { 
          id: strategyId,
          ...strategyData
        },
        {
          onSuccess: () => {
            // Navigate back to strategy details
            router.push(`/trading/strategies/${strategyId}`);
          }
        }
      );
    } else {
      // Create new strategy
      createStrategy.mutate(
        strategyData,
        {
          onSuccess: (newStrategy) => {
            // Navigate to the new strategy
            router.push(`/trading/strategies/${newStrategy.id}`);
          }
        }
      );
    }
  };
  
  // Handle symbol input
  const addSymbol = () => {
    if (!symbolInput.trim()) return;
    
    const normalizedSymbol = symbolInput.toUpperCase().trim();
    const currentSymbols = form.getValues('parameters.symbols') || [];
    
    // Don't add duplicates
    if (!currentSymbols.includes(normalizedSymbol)) {
      form.setValue('parameters.symbols', [...currentSymbols, normalizedSymbol]);
    }
    
    setSymbolInput('');
  };
  
  const removeSymbol = (symbol: string) => {
    const currentSymbols = form.getValues('parameters.symbols') || [];
    form.setValue(
      'parameters.symbols', 
      currentSymbols.filter(s => s !== symbol)
    );
  };
  
  // Handle tag input
  const addTag = () => {
    if (!tagInput.trim()) return;
    
    const normalizedTag = tagInput.trim().toLowerCase();
    const currentTags = form.getValues('tags') || [];
    
    // Don't add duplicates
    if (!currentTags.includes(normalizedTag)) {
      form.setValue('tags', [...currentTags, normalizedTag]);
    }
    
    setTagInput('');
  };
  
  const removeTag = (tag: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue(
      'tags', 
      currentTags.filter(t => t !== tag)
    );
  };
  
  // Check if form is being submitted
  const isSubmitting = createStrategy.isPending || updateStrategy.isPending;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Strategy' : 'Create New Strategy'}</CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Modify your existing trading strategy' 
            : 'Define a new automated trading strategy'}
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strategy Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="My Trading Strategy" />
                    </FormControl>
                    <FormDescription>
                      A unique name to identify your strategy
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
                        {...field} 
                        placeholder="Describe your strategy's approach and objectives"
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional details about how this strategy works
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategy Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a strategy type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="fundamental">Fundamental</SelectItem>
                          <SelectItem value="statistical">Statistical</SelectItem>
                          <SelectItem value="arbitrage">Arbitrage</SelectItem>
                          <SelectItem value="ai">AI/ML-based</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The primary approach of your strategy
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Set to "draft" while configuring, "active" to begin trading
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Parameters Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Strategy Parameters</h3>
              
              <FormField
                control={form.control}
                name="parameters.timeframe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeframe</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1m">1 Minute</SelectItem>
                        <SelectItem value="5m">5 Minutes</SelectItem>
                        <SelectItem value="15m">15 Minutes</SelectItem>
                        <SelectItem value="30m">30 Minutes</SelectItem>
                        <SelectItem value="1h">1 Hour</SelectItem>
                        <SelectItem value="4h">4 Hours</SelectItem>
                        <SelectItem value="1d">1 Day</SelectItem>
                        <SelectItem value="1w">1 Week</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The time interval for your strategy's analysis
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormItem>
                <FormLabel>Trading Symbols</FormLabel>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="BTCUSDT"
                    value={symbolInput}
                    onChange={(e) => setSymbolInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSymbol())}
                  />
                  <Button type="button" size="sm" onClick={addSymbol}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {watchedSymbols.map((symbol) => (
                    <Badge key={symbol} variant="secondary" className="px-2 py-1">
                      {symbol}
                      <button
                        type="button"
                        className="ml-1 rounded-full outline-none focus:ring-2"
                        onClick={() => removeSymbol(symbol)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {watchedSymbols.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Add at least one trading symbol
                    </p>
                  )}
                </div>
                {form.formState.errors.parameters?.symbols && (
                  <p className="text-sm font-medium text-destructive mt-2">
                    {form.formState.errors.parameters.symbols.message}
                  </p>
                )}
              </FormItem>
              
              {/* Risk Management Section */}
              <div className="space-y-2">
                <h4 className="text-md font-medium">Risk Management</h4>
                
                <FormField
                  control={form.control}
                  name="parameters.riskManagement.maxPositionSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Position Size (% of portfolio)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Slider
                            min={0.01}
                            max={1}
                            step={0.01}
                            defaultValue={[field.value]}
                            onValueChange={(values) => field.onChange(values[0])}
                          />
                          <div className="flex justify-between">
                            <span className="text-xs">{(field.value * 100).toFixed(0)}%</span>
                            <Input
                              type="number"
                              className="w-20 h-8 text-xs"
                              min={1}
                              max={100}
                              value={(field.value * 100).toFixed(0)}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (!isNaN(value) && value >= 1 && value <= 100) {
                                  field.onChange(value / 100);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Maximum percentage of your portfolio to allocate to this strategy
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="parameters.riskManagement.stopLoss"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stop Loss (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Optional"
                            {...field}
                            value={field.value === undefined ? '' : field.value}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Exit position if loss exceeds this %
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="parameters.riskManagement.takeProfit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Take Profit (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Optional"
                            {...field}
                            value={field.value === undefined ? '' : field.value}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Exit position when profit reaches this %
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="parameters.riskManagement.trailingStop"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trailing Stop (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Optional"
                            {...field}
                            value={field.value === undefined ? '' : field.value}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Dynamic stop that follows price by this %
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            
            {/* Tags Section */}
            <div className="space-y-2">
              <FormLabel>Tags</FormLabel>
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Add a tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" size="sm" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {watchedTags.map((tag) => (
                  <Badge key={tag} variant="outline" className="px-2 py-1">
                    {tag}
                    <button
                      type="button"
                      className="ml-1 rounded-full outline-none focus:ring-2"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {watchedTags.length === 0 && (
                  <p className="text-sm text-muted-foreground">Optional tags to categorize your strategy</p>
                )}
              </div>
            </div>
            
            {/* Advanced Configuration */}
            {watchedType === 'technical' && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="technical-params">
                  <AccordionTrigger>Advanced Technical Parameters</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <FormLabel>Moving Averages</FormLabel>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <FormLabel className="text-xs">Fast MA</FormLabel>
                            <Input
                              type="number"
                              placeholder="9"
                              min={1}
                            />
                          </div>
                          <div>
                            <FormLabel className="text-xs">Slow MA</FormLabel>
                            <Input
                              type="number"
                              placeholder="21"
                              min={1}
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <FormLabel>RSI Settings</FormLabel>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <div>
                            <FormLabel className="text-xs">Period</FormLabel>
                            <Input
                              type="number"
                              placeholder="14"
                              min={1}
                            />
                          </div>
                          <div>
                            <FormLabel className="text-xs">Overbought</FormLabel>
                            <Input
                              type="number"
                              placeholder="70"
                              min={50}
                              max={100}
                            />
                          </div>
                          <div>
                            <FormLabel className="text-xs">Oversold</FormLabel>
                            <Input
                              type="number"
                              placeholder="30"
                              min={0}
                              max={50}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            
            {/* Error display */}
            {(createStrategy.isError || updateStrategy.isError) && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-start">
                <AlertTriangle className="h-5 w-5 text-destructive mr-2 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive/90">
                    {createStrategy.error instanceof Error ? createStrategy.error.message : 
                     updateStrategy.error instanceof Error ? updateStrategy.error.message : 
                     'An unexpected error occurred. Please try again.'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            
            <div className="flex space-x-2">
              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" type="button" className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700">
                      Reset
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset form changes?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will reset all changes you've made to the form. 
                        Your saved strategy will not be affected until you save.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => form.reset(defaultValues as StrategyFormValues)}
                      >
                        Reset Form
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Update Strategy' : 'Create Strategy'}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
