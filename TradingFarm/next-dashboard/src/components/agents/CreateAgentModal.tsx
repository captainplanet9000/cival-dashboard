"use client";

import * as React from 'react';
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
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

// Define validation schema
const agentSchema = z.object({
  name: z.string().min(3, { message: "Agent name must be at least 3 characters" }).max(50),
  description: z.string().optional(),
  type: z.enum(["standard", "grid", "momentum", "ml", "custom"]),
  is_active: z.boolean().default(false),
  capabilities: z.array(z.string()).default([]),
  config: z.object({
    risk_level: z.enum(["low", "medium", "high"]).default("medium"),
    max_trades_per_day: z.number().min(0).max(1000).default(10),
    max_allocation_percent: z.number().min(1).max(100).default(20),
    auto_rebalance: z.boolean().default(false),
  }).default({}),
});

type AgentFormValues = z.infer<typeof agentSchema>;

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmId: string;
  onSuccess?: () => void;
}

export default function CreateAgentModal({ isOpen, onClose, farmId, onSuccess }: CreateAgentModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const queryClient = useQueryClient();

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "standard",
      is_active: false,
      capabilities: ["trade", "analyze"],
      config: {
        risk_level: "medium",
        max_trades_per_day: 10,
        max_allocation_percent: 20,
        auto_rebalance: false,
      }
    }
  });

  const onSubmit = async (values: AgentFormValues) => {
    if (!farmId) {
      toast({
        title: "Error",
        description: "Farm ID is required to create an agent",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('agents')
        .insert({
          name: values.name,
          description: values.description || null,
          type: values.type,
          is_active: values.is_active,
          capabilities: values.capabilities,
          config: values.config,
          farm_id: farmId
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: "Agent Created",
        description: `${values.name} has been created successfully`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['agents', farmId] });
      
      // Reset form and close modal
      form.reset();
      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Error Creating Agent",
        description: error.message || "Failed to create agent. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // List of agent capabilities for the form
  const capabilityOptions = [
    { value: "trade", label: "Trading" },
    { value: "analyze", label: "Market Analysis" },
    { value: "risk", label: "Risk Management" },
    { value: "rebalance", label: "Portfolio Rebalancing" },
    { value: "monitor", label: "Market Monitoring" },
    { value: "ml", label: "Machine Learning" },
    { value: "dca", label: "Dollar Cost Averaging" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create a new Agent</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Smart Trading Agent" {...field} />
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
                      placeholder="Describe what this agent does..."
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
                    <FormLabel>Agent Type</FormLabel>
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
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="grid">Grid Trading</SelectItem>
                        <SelectItem value="momentum">Momentum</SelectItem>
                        <SelectItem value="ml">Machine Learning</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-end space-x-3 rounded-md">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Activate immediately</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Agent Configuration</h3>
              
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
                      Determines the agent's trading aggression and position sizing
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="config.max_trades_per_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Trades Per Day</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0}
                          max={1000}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="config.max_allocation_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Allocation (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1}
                          max={100}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum percentage of portfolio this agent can use
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="config.auto_rebalance"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-x-3 rounded-md border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto Rebalance</FormLabel>
                      <FormDescription>
                        Automatically rebalance portfolio based on market conditions
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
                ) : "Create Agent"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
