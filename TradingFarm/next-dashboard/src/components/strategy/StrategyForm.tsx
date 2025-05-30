"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Save } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

// Define strategy parameter schema dynamically based on strategy type
const getParametersSchema = (strategyType: string) => {
  switch(strategyType) {
    case "trend_following":
      return z.object({
        fastPeriod: z.number().int().min(1).max(100),
        slowPeriod: z.number().int().min(2).max(200),
        positionSize: z.number().min(0.1).max(100),
        symbols: z.array(z.string().min(1))
      });
    case "mean_reversion":
      return z.object({
        rsiPeriod: z.number().int().min(1).max(50),
        oversoldThreshold: z.number().int().min(1).max(49),
        overboughtThreshold: z.number().int().min(51).max(99),
        positionSize: z.number().min(0.1).max(100),
        symbols: z.array(z.string().min(1))
      });
    case "grid_trading":
      return z.object({
        gridLevels: z.number().int().min(3).max(100),
        gridSpacing: z.number().min(0.1).max(10),
        totalAllocation: z.number().min(1).max(1000),
        symbols: z.array(z.string().min(1))
      });
    case "breakout":
      return z.object({
        breakoutPeriod: z.number().int().min(1).max(100),
        volumeThreshold: z.number().min(1).max(5),
        positionSize: z.number().min(0.1).max(100),
        symbols: z.array(z.string().min(1))
      });
    case "momentum":
      return z.object({
        lookbackPeriod: z.number().int().min(1).max(100),
        topAssets: z.number().int().min(1).max(10),
        rebalancePeriod: z.number().int().min(1).max(30),
        symbols: z.array(z.string().min(1))
      });
    default:
      return z.record(z.any());
  }
};

// Define the form schema using Zod
const strategyFormSchema = z.object({
  name: z.string().min(2, {
    message: "Strategy name must be at least 2 characters long.",
  }),
  description: z.string().optional(),
  type: z.string({
    required_error: "Please select a strategy type.",
  }),
  version: z.string().min(1, {
    message: "Version is required.",
  }),
  // Parameters will be validated dynamically based on the selected type
  parameters: z.record(z.any()),
  is_active: z.boolean().default(false)
});

// Type for the form data
type StrategyFormValues = z.infer<typeof strategyFormSchema>;

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  type: string;
  version: string;
  parameters: Record<string, any>;
  is_active: boolean;
  is_deployed: boolean;
  performance_metrics: Record<string, any>;
  content: string | null;
  created_at: string;
  updated_at: string;
}

interface StrategyFormProps {
  strategy?: Strategy;
  onSuccess: () => void;
  isEdit?: boolean;
}

export function StrategyForm({ strategy, onSuccess, isEdit = false }: StrategyFormProps) {
  const [selectedType, setSelectedType] = useState<string>(strategy?.type || "trend_following");
  const { toast } = useToast();
  const supabase = createBrowserClient();
  
  // Define form with resolver
  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: {
      name: strategy?.name || "",
      description: strategy?.description || "",
      type: strategy?.type || "trend_following",
      version: strategy?.version || "1.0.0",
      parameters: strategy?.parameters || getDefaultParameters("trend_following"),
      is_active: strategy?.is_active || false
    }
  });
  
  // Update parameters schema when strategy type changes
  const onStrategyTypeChange = (type: string) => {
    setSelectedType(type);
    form.setValue("parameters", getDefaultParameters(type));
  };
  
  // Get default parameters based on strategy type
  function getDefaultParameters(type: string): Record<string, any> {
    switch(type) {
      case "trend_following":
        return {
          fastPeriod: 10,
          slowPeriod: 30,
          positionSize: 1.0,
          symbols: ["BTC/USDT"]
        };
      case "mean_reversion":
        return {
          rsiPeriod: 14,
          oversoldThreshold: 30,
          overboughtThreshold: 70,
          positionSize: 1.0,
          symbols: ["ETH/USDT"]
        };
      case "grid_trading":
        return {
          gridLevels: 10,
          gridSpacing: 0.5,
          totalAllocation: 100,
          symbols: ["BTC/USDT"]
        };
      case "breakout":
        return {
          breakoutPeriod: 20,
          volumeThreshold: 1.5,
          positionSize: 1.0,
          symbols: ["BTC/USDT"]
        };
      case "momentum":
        return {
          lookbackPeriod: 7,
          topAssets: 3,
          rebalancePeriod: 7,
          symbols: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "ADA/USDT", "DOT/USDT"]
        };
      default:
        return {};
    }
  }
  
  // Create or update strategy
  const submitMutation = useMutation({
    mutationFn: async (values: StrategyFormValues) => {
      if (isEdit && strategy) {
        // Update existing strategy
        const { error } = await supabase
          .from('strategies')
          .update({
            name: values.name,
            description: values.description || null,
            type: values.type,
            version: values.version,
            parameters: values.parameters,
            is_active: values.is_active
          })
          .eq('id', strategy.id);
          
        if (error) throw error;
        
        return { id: strategy.id };
      } else {
        // Create new strategy
        const { data, error } = await supabase
          .from('strategies')
          .insert({
            name: values.name,
            description: values.description || null,
            type: values.type,
            version: values.version,
            parameters: values.parameters,
            is_active: values.is_active,
            is_deployed: false,
            performance_metrics: {},
            content: null
          })
          .select('id')
          .single();
          
        if (error) throw error;
        
        return data;
      }
    },
    onSuccess: () => {
      onSuccess();
      toast({
        title: isEdit ? "Strategy Updated" : "Strategy Created",
        description: isEdit 
          ? "Your trading strategy has been successfully updated" 
          : "Your new trading strategy has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isEdit ? "Update Failed" : "Creation Failed",
        description: error.message || `Failed to ${isEdit ? 'update' : 'create'} strategy`,
        variant: "destructive",
      });
    }
  });
  
  // Submit form handler
  function onSubmit(values: StrategyFormValues) {
    submitMutation.mutate(values);
  }
  
  // Get parameter fields based on strategy type
  const renderParameterFields = () => {
    switch(selectedType) {
      case "trend_following":
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="parameters.fastPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fast Period</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of periods for the fast moving average
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="parameters.slowPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slow Period</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of periods for the slow moving average
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="parameters.positionSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position Size</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1" 
                      {...field} 
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Percentage of available capital to use (1.0 = 100%)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="parameters.symbols"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trading Symbols</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value.join(", ")}
                      onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()))}
                      placeholder="BTC/USDT, ETH/USDT"
                    />
                  </FormControl>
                  <FormDescription>
                    Comma-separated list of trading pairs
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
        
      case "mean_reversion":
        return (
          <>
            <FormField
              control={form.control}
              name="parameters.rsiPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RSI Period</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Number of periods for RSI calculation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="parameters.oversoldThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oversold Threshold</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      RSI level for buy signal (typically 30)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="parameters.overboughtThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overbought Threshold</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      RSI level for sell signal (typically 70)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="parameters.positionSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position Size</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1" 
                      {...field} 
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Percentage of available capital to use (1.0 = 100%)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="parameters.symbols"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trading Symbols</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value.join(", ")}
                      onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()))}
                      placeholder="ETH/USDT, SOL/USDT"
                    />
                  </FormControl>
                  <FormDescription>
                    Comma-separated list of trading pairs
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      
      // Add more cases for other strategy types
      case "grid_trading":
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="parameters.gridLevels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grid Levels</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of grid levels to create
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="parameters.gridSpacing"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grid Spacing (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Percentage between grid levels
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="parameters.totalAllocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Allocation</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1"
                      {...field} 
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Total amount to allocate to this grid strategy
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="parameters.symbols"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trading Symbols</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value.join(", ")}
                      onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()))}
                      placeholder="BTC/USDT, ETH/USDT"
                    />
                  </FormControl>
                  <FormDescription>
                    Comma-separated list of trading pairs
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
        
      default:
        return (
          <FormField
            control={form.control}
            name="parameters"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Strategy Parameters (JSON)</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    value={JSON.stringify(field.value, null, 2)}
                    onChange={(e) => {
                      try {
                        field.onChange(JSON.parse(e.target.value));
                      } catch (error) {
                        // Handle JSON parse error
                        console.error("Invalid JSON:", error);
                      }
                    }}
                    className="font-mono"
                    rows={10}
                  />
                </FormControl>
                <FormDescription>
                  Enter the strategy parameters in JSON format
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter strategy name" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for your trading strategy.
                  </FormDescription>
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
                    onValueChange={(value) => {
                      field.onChange(value);
                      onStrategyTypeChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a strategy type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="trend_following">Trend Following</SelectItem>
                      <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                      <SelectItem value="grid_trading">Grid Trading</SelectItem>
                      <SelectItem value="breakout">Breakout</SelectItem>
                      <SelectItem value="momentum">Momentum</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The type of trading strategy you are creating.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version</FormLabel>
                  <FormControl>
                    <Input placeholder="1.0.0" {...field} />
                  </FormControl>
                  <FormDescription>
                    Strategy version (semantic versioning recommended).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 mt-1"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active Strategy</FormLabel>
                    <FormDescription>
                      Enable this strategy for trading. Only active strategies can be deployed.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
          
          <div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter a detailed description of your strategy..."
                      className="h-[231px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe how your strategy works, what indicators it uses, and what assets it trades.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Strategy Parameters</h3>
          {renderParameterFields()}
        </div>
        
        <div className="flex justify-end">
          <Button 
            type="submit"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEdit ? "Update Strategy" : "Create Strategy"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
