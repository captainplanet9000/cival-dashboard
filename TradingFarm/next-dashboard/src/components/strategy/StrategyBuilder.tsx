"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Strategy, StrategyTemplate, StrategyType } from '@/types/backtesting';
import { CodeEditor } from '../code/CodeEditor';
import { Save, Code, RefreshCw, ArrowRight, BookOpen, Copy } from 'lucide-react';

// Form validation schema
const strategyFormSchema = z.object({
  name: z.string().min(3, { message: "Strategy name must be at least 3 characters." }),
  description: z.string().optional(),
  type: z.nativeEnum(StrategyType),
  is_public: z.boolean().default(false),
  base_template_id: z.string().optional(),
  parameters: z.record(z.any())
});

type StrategyFormValues = z.infer<typeof strategyFormSchema>;

interface StrategyBuilderProps {
  strategy?: Strategy;
  templates?: StrategyTemplate[];
  onSave?: (strategy: Strategy) => void;
}

export function StrategyBuilder({ strategy, templates = [], onSave }: StrategyBuilderProps) {
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState(strategy?.code || defaultStrategyCode);
  const [activeTab, setActiveTab] = useState<string>("editor");
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate | null>(null);

  // Initialize form with default values or existing strategy
  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: strategy ? {
      name: strategy.name,
      description: strategy.description || "",
      type: strategy.type,
      is_public: strategy.is_public,
      base_template_id: strategy.base_template_id,
      parameters: strategy.parameters
    } : {
      name: "",
      description: "",
      type: StrategyType.TREND_FOLLOWING,
      is_public: false,
      parameters: {}
    }
  });

  // Handle strategy template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      form.setValue("base_template_id", template.id);
      form.setValue("type", template.type);
      form.setValue("parameters", template.default_parameters);
      setCurrentCode(template.code_template);
      
      toast({
        title: "Template Applied",
        description: `Applied template: ${template.name}`,
      });
    }
  };

  // Save strategy to database
  const onSubmit = async (values: StrategyFormValues) => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to save a strategy");
      }

      // Prepare strategy object
      const strategyData: Strategy = {
        ...values,
        user_id: session.user.id,
        code: currentCode,
      };

      // If editing existing strategy, include the ID
      if (strategy?.id) {
        strategyData.id = strategy.id;
      }

      // Save to database
      const { data, error } = strategy?.id
        ? await supabase.from('strategies').update(strategyData).eq('id', strategy.id).select('*').single()
        : await supabase.from('strategies').insert(strategyData).select('*').single();

      if (error) throw error;

      // Call onSave callback if provided
      if (onSave && data) {
        onSave(data);
      }

      toast({
        title: "Strategy Saved",
        description: "Your strategy has been successfully saved.",
      });
    } catch (error: any) {
      console.error("Error saving strategy:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Failed to save strategy. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate dynamic parameter controls based on strategy type and template
  const renderParameterControls = () => {
    const template = selectedTemplate || templates.find(t => t.id === form.watch('base_template_id'));
    if (!template) return null;

    const parameters = template.default_parameters;
    const descriptions = template.parameter_descriptions;

    return (
      <div className="space-y-6">
        {Object.entries(parameters).map(([key, defaultValue]) => {
          const description = descriptions[key] || `Parameter ${key}`;
          
          // Render different control types based on parameter value type
          if (typeof defaultValue === 'boolean') {
            return (
              <FormField
                key={key}
                control={form.control}
                name={`parameters.${key}`}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{key}</FormLabel>
                      <FormDescription>{description}</FormDescription>
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
            );
          } else if (typeof defaultValue === 'number') {
            return (
              <FormField
                key={key}
                control={form.control}
                name={`parameters.${key}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{key}</FormLabel>
                    <FormDescription>{description}</FormDescription>
                    <div className="flex items-center gap-4">
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={1}
                          value={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                        />
                      </FormControl>
                      <div className="w-12 text-center font-mono">
                        {field.value}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          } else {
            return (
              <FormField
                key={key}
                control={form.control}
                name={`parameters.${key}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{key}</FormLabel>
                    <FormDescription>{description}</FormDescription>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          }
        })}
      </div>
    );
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Strategy Builder</CardTitle>
        <CardDescription>
          Create or edit a trading strategy with our strategy builder
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Details</span>
            </TabsTrigger>
            <TabsTrigger value="parameters" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span>Parameters</span>
            </TabsTrigger>
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              <span>Code Editor</span>
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <TabsContent value="details" className="space-y-6 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategy Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Awesome Strategy" {...field} />
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
                        <Textarea 
                          placeholder="Describe your strategy's approach and goals" 
                          className="min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategy Type</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a strategy type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={StrategyType.TREND_FOLLOWING}>Trend Following</SelectItem>
                          <SelectItem value={StrategyType.MEAN_REVERSION}>Mean Reversion</SelectItem>
                          <SelectItem value={StrategyType.BREAKOUT}>Breakout</SelectItem>
                          <SelectItem value={StrategyType.MOMENTUM}>Momentum</SelectItem>
                          <SelectItem value={StrategyType.CUSTOM}>Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Categorize your strategy to help with organization
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_public"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Public Strategy</FormLabel>
                        <FormDescription>
                          Make this strategy visible to other users
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
                  name="base_template_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategy Template</FormLabel>
                      <Select 
                        value={field.value || ""} 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleTemplateSelect(value);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No Template (Custom)</SelectItem>
                          {templates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Start with a pre-built template to speed up development
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="parameters" className="py-4">
                {form.watch('base_template_id') 
                  ? renderParameterControls() 
                  : (
                    <div className="text-center py-10 text-muted-foreground">
                      <p>Select a strategy template to configure parameters</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setActiveTab("details")}
                      >
                        Select Template
                      </Button>
                    </div>
                  )
                }
              </TabsContent>

              <TabsContent value="editor" className="py-4">
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Strategy Code</div>
                  <div className="h-[500px] border rounded-md overflow-hidden">
                    <CodeEditor
                      value={currentCode}
                      onChange={setCurrentCode}
                      language="python"
                    />
                  </div>
                </div>
              </TabsContent>

              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    // Reset to the original strategy or defaults
                    if (strategy) {
                      form.reset({
                        name: strategy.name,
                        description: strategy.description || "",
                        type: strategy.type,
                        is_public: strategy.is_public,
                        base_template_id: strategy.base_template_id,
                        parameters: strategy.parameters
                      });
                      setCurrentCode(strategy.code);
                    } else {
                      form.reset();
                      setCurrentCode(defaultStrategyCode);
                    }

                    toast({
                      title: "Changes Discarded",
                      description: "Strategy reverted to original state.",
                    });
                  }}
                >
                  Discard Changes
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Strategy
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <div className="flex justify-between w-full">
          <Button variant="outline" size="sm" onClick={() => setActiveTab("details")}>
            <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
            Back to Details
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!form.formState.isValid} 
            onClick={() => {
              // Navigate to backtest page or trigger backtest modal
              // This would be implemented in the parent component
              toast({
                title: "Ready for Backtesting",
                description: "Strategy is ready to be backtested.",
              });
              
              if (onSave) {
                onSave({
                  ...form.getValues(),
                  user_id: "",  // Will be filled in by the API
                  code: currentCode,
                });
              }
            }}
          >
            Test Strategy
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

// Default code template for new strategies
const defaultStrategyCode = `# Trading Farm Strategy
# This is a simple strategy template to get you started

def initialize(context):
    """
    Called once at the start of the backtest to set up your strategy
    """
    # Set up strategy parameters
    context.symbols = ["BTC/USDT"]
    context.lookback = 20
    context.ema_short = 9
    context.ema_long = 21
    
    # Data storage
    context.data = {}
    
def handle_data(context, data):
    """
    Called for each candle/bar to make trading decisions
    """
    # Get current symbol price data
    for symbol in context.symbols:
        if symbol not in data:
            continue
            
        current_price = data[symbol]["close"]
        
        # Calculate indicators
        if len(data[symbol]["close_history"]) > context.ema_long:
            ema_short = calculate_ema(data[symbol]["close_history"], context.ema_short)
            ema_long = calculate_ema(data[symbol]["close_history"], context.ema_long)
            
            # Trading logic - simple crossover
            if ema_short > ema_long:
                # Bullish signal - go long if not already
                if not context.portfolio.positions.get(symbol, 0) > 0:
                    # Close any short positions first
                    if context.portfolio.positions.get(symbol, 0) < 0:
                        order_target_percent(symbol, 0)
                    
                    # Enter long position
                    order_target_percent(symbol, 0.95)
                    log(f"LONG: {symbol} at {current_price}")
                    
            elif ema_short < ema_long:
                # Bearish signal - go short if not already
                if not context.portfolio.positions.get(symbol, 0) < 0:
                    # Close any long positions first
                    if context.portfolio.positions.get(symbol, 0) > 0:
                        order_target_percent(symbol, 0)
                    
                    # Enter short position
                    order_target_percent(symbol, -0.95)
                    log(f"SHORT: {symbol} at {current_price}")

# Helper functions
def calculate_ema(prices, period):
    """Calculate Exponential Moving Average"""
    multiplier = 2 / (period + 1)
    if len(prices) < period:
        return prices[-1]
    
    ema = sum(prices[-period:]) / period
    for price in prices[-period:]:
        ema = (price - ema) * multiplier + ema
    return ema
`;

// Component for the code editor 
// This is a placeholder - in a real app, you'd use a code editor component
// like React Monaco Editor or React Ace Editor
export function CodeEditor({ value, onChange, language }: { 
  value: string; 
  onChange: (value: string) => void;
  language: string;
}) {
  return (
    <textarea 
      className="w-full h-full p-4 font-mono text-sm focus:outline-none resize-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
    />
  );
}
