"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

// Define validation schema
const strategySchema = z.object({
  name: z.string().min(3, { message: "Strategy name must be at least 3 characters" }).max(50),
  description: z.string().optional(),
  type: z.enum(["trend_following", "mean_reversion", "breakout", "grid", "channel", "ml_prediction", "custom"]),
  status: z.enum(["active", "inactive", "draft"]).default("draft"),
  config: z.object({
    risk_level: z.enum(["low", "medium", "high"]).default("medium"),
    take_profit_percent: z.number().min(0.1).max(100).default(3),
    stop_loss_percent: z.number().min(0.1).max(100).default(2),
    position_sizing_percent: z.number().min(1).max(100).default(5),
    allow_multi_entries: z.boolean().default(false),
    timeframes: z.array(z.string()).default(["1h", "4h"]),
    market_types: z.object({
      bullish: z.boolean().default(true),
      bearish: z.boolean().default(true),
      sideways: z.boolean().default(true),
      volatile: z.boolean().default(false),
    }).default({}),
  }).default({})
});

type StrategyFormValues = z.infer<typeof strategySchema>;

interface CreateStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmId: string;
  onSuccess?: () => void;
}

export default function CreateStrategyModal({ isOpen, onClose, farmId, onSuccess }: CreateStrategyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const queryClient = useQueryClient();

  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategySchema),
    defaultValues: {
      name: "",
      description: "",
      type: "trend_following",
      status: "draft",
      config: {
        risk_level: "medium",
        take_profit_percent: 3,
        stop_loss_percent: 2,
        position_sizing_percent: 5,
        allow_multi_entries: false,
        timeframes: ["1h", "4h"],
        market_types: {
          bullish: true,
          bearish: true,
          sideways: true,
          volatile: false,
        },
      }
    }
  });

  const onSubmit = async (values: StrategyFormValues) => {
    if (!farmId) {
      toast({
        title: "Error",
        description: "Farm ID is required to create a strategy",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // In a real application, this would use a proper table name based on your database schema
      const { data, error } = await supabase
        .from('strategies')
        .insert({
          name: values.name,
          description: values.description || null,
          type: values.type,
          status: values.status,
          config: values.config,
          farm_id: farmId
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: "Strategy Created",
        description: `${values.name} has been created successfully`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['strategies', farmId] });
      
      // Reset form and close modal
      form.reset();
      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Error Creating Strategy",
        description: error.message || "Failed to create strategy. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Available timeframes for strategy
  const timeframeOptions = [
    { value: "1m", label: "1 Minute" },
    { value: "5m", label: "5 Minutes" },
    { value: "15m", label: "15 Minutes" },
    { value: "30m", label: "30 Minutes" },
    { value: "1h", label: "1 Hour" },
    { value: "4h", label: "4 Hours" },
    { value: "1d", label: "1 Day" },
    { value: "1w", label: "1 Week" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a new Trading Strategy</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Trend Following Strategy" {...field} />
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
                      placeholder="Describe how this strategy works..."
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
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
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="trend_following">Trend Following</SelectItem>
                        <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                        <SelectItem value="breakout">Breakout</SelectItem>
                        <SelectItem value="grid">Grid Trading</SelectItem>
                        <SelectItem value="channel">Channel Trading</SelectItem>
                        <SelectItem value="ml_prediction">ML Prediction</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
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
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Set to "Active" to start using this strategy immediately
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Strategy Configuration</h3>
              
              <FormField
                control={form.control}
                name="config.risk_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Level</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Determines the overall risk profile for this strategy
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="config.take_profit_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Take Profit (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0.1}
                          max={100}
                          step={0.1}
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0.1)}
                        />
                      </FormControl>
                      <FormDescription>
                        Default take profit percentage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="config.stop_loss_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stop Loss (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0.1}
                          max={100}
                          step={0.1}
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0.1)}
                        />
                      </FormControl>
                      <FormDescription>
                        Default stop loss percentage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="config.position_sizing_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position Sizing (% of portfolio)</FormLabel>
                    <FormControl>
                      <div className="pt-2">
                        <Slider
                          defaultValue={[field.value]}
                          min={1}
                          max={100}
                          step={1}
                          onValueChange={(values) => field.onChange(values[0])}
                        />
                      </div>
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span>1%</span>
                      <span>{field.value}%</span>
                      <span>100%</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="config.allow_multi_entries"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-x-3 rounded-md border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Allow Multiple Entries</FormLabel>
                      <FormDescription>
                        Allow strategy to enter the same market multiple times
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Market Types</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="config.market_types.bullish"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-sm">Bullish Markets</FormLabel>
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
                    name="config.market_types.bearish"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-sm">Bearish Markets</FormLabel>
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
                    name="config.market_types.sideways"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-sm">Sideways Markets</FormLabel>
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
                    name="config.market_types.volatile"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-sm">Volatile Markets</FormLabel>
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
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : "Create Strategy"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
