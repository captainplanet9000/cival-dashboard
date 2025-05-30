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
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

// Define validation schema
const farmSchema = z.object({
  name: z.string().min(3, { message: "Farm name must be at least 3 characters" }).max(50),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  settings: z.object({
    auto_trading: z.boolean().default(false),
    risk_level: z.enum(["low", "medium", "high"]).default("medium"),
    daily_report: z.boolean().default(true),
    max_drawdown_percent: z.number().min(1).max(50).default(10),
    allowed_trading: z.object({
      spot: z.boolean().default(true),
      margin: z.boolean().default(false),
      futures: z.boolean().default(false),
      defi: z.boolean().default(false)
    })
  }).default({})
});

type FarmFormValues = z.infer<typeof farmSchema>;

interface CreateFarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateFarmModal({ isOpen, onClose, onSuccess }: CreateFarmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const queryClient = useQueryClient();

  const form = useForm<FarmFormValues>({
    resolver: zodResolver(farmSchema),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
      settings: {
        auto_trading: false,
        risk_level: "medium",
        daily_report: true,
        max_drawdown_percent: 10,
        allowed_trading: {
          spot: true,
          margin: false,
          futures: false,
          defi: false
        }
      }
    }
  });

  const onSubmit = async (values: FarmFormValues) => {
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('farms')
        .insert({
          name: values.name,
          description: values.description || null,
          is_active: values.is_active,
          settings: values.settings
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: "Farm Created",
        description: `${values.name} has been created successfully`,
      });

      // Invalidate farms query
      queryClient.invalidateQueries({ queryKey: ['farms'] });
      
      // Reset form and close modal
      form.reset();
      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Error Creating Farm",
        description: error.message || "Failed to create farm. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create a new Farm</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Farm Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Trading Farm" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for your trading farm
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
                      placeholder="Farm purpose and strategy goals" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description of the farm's purpose
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>
                      Set the farm to active immediately
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
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Trading Settings</h3>
              
              <FormField
                control={form.control}
                name="settings.auto_trading"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-Trading</FormLabel>
                      <FormDescription>
                        Allow agents to execute trades automatically
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
                name="settings.risk_level"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Risk Level</FormLabel>
                    <div className="flex space-x-2">
                      {["low", "medium", "high"].map((level) => (
                        <Button
                          key={level}
                          type="button"
                          variant={field.value === level ? "default" : "outline"}
                          onClick={() => field.onChange(level)}
                          className="flex-1 capitalize"
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                    <FormDescription>
                      Sets the risk profile for this farm
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="settings.max_drawdown_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Drawdown (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum allowed drawdown before trading is paused
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="settings.daily_report"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Daily Reports</FormLabel>
                      <FormDescription>
                        Receive daily performance reports
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
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Allowed Trading Types</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="settings.allowed_trading.spot"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-sm">Spot Trading</FormLabel>
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
                    name="settings.allowed_trading.margin"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-sm">Margin Trading</FormLabel>
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
                    name="settings.allowed_trading.futures"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-sm">Futures Trading</FormLabel>
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
                    name="settings.allowed_trading.defi"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-sm">DeFi Protocols</FormLabel>
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
                ) : "Create Farm"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
