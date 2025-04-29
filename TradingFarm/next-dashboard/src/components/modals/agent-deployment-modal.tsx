'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Zap, Bot, Info, ArrowRight } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';

// Define form schema with Zod for validation
const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Agent name must be at least 2 characters.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
  strategy: z.string({
    required_error: 'Please select a trading strategy.',
  }),
  budget: z.coerce.number().min(1, {
    message: 'Budget must be at least $1.',
  }),
  riskLevel: z.string().optional(),
});

type AgentDeploymentFormValues = z.infer<typeof formSchema>;

interface AgentDeploymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeploySuccess?: (agentId: string) => void;
}

export function AgentDeploymentModal({
  open,
  onOpenChange,
  onDeploySuccess,
}: AgentDeploymentModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const supabase = createBrowserClient();

  // Default form values
  const defaultValues: Partial<AgentDeploymentFormValues> = {
    name: '',
    description: '',
    strategy: '',
    budget: 1000,
    riskLevel: 'medium',
  };

  // Initialize form with react-hook-form
  const form = useForm<AgentDeploymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Form submission handler
  async function onSubmit(data: AgentDeploymentFormValues) {
    setIsSubmitting(true);
    
    try {
      // Insert the agent record into the database
      const { data: agent, error } = await supabase
        .from('agents')
        .insert({
          name: data.name,
          description: data.description,
          strategy: data.strategy,
          budget: data.budget,
          risk_level: data.riskLevel,
          status: 'initializing'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Agent Deployed Successfully",
        description: `${data.name} is now being initialized.`,
      });

      // Reset form and close modal
      form.reset(defaultValues);
      onOpenChange(false);

      // Call the success callback with the new agent ID
      if (onDeploySuccess && agent) {
        onDeploySuccess(agent.id);
      }
    } catch (error) {
      console.error('Error deploying agent:', error);
      toast({
        title: "Deployment Failed",
        description: "There was an error deploying your agent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Deploy New Trading Agent
          </DialogTitle>
          <DialogDescription>
            Configure and deploy a new AI trading agent to execute your strategy
          </DialogDescription>
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
                    <Input placeholder="My Smart Trader" {...field} />
                  </FormControl>
                  <FormDescription>
                    A unique name to identify this agent
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
                      placeholder="This agent will trade crypto with a focus on momentum strategies" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Describe the purpose and goals of this agent
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="strategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trading Strategy</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a trading strategy" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="momentum">Momentum Trading</SelectItem>
                      <SelectItem value="meanReversion">Mean Reversion</SelectItem>
                      <SelectItem value="trendFollowing">Trend Following</SelectItem>
                      <SelectItem value="arbitrage">Arbitrage</SelectItem>
                      <SelectItem value="custom">Custom Strategy</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The trading strategy this agent will use
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" step="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Starting capital
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="riskLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Level</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Risk level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Conservative</SelectItem>
                        <SelectItem value="medium">Moderate</SelectItem>
                        <SelectItem value="high">Aggressive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Agent risk tolerance
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <Bot className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Zap className="mr-2 h-4 w-4" />
                    Deploy Agent
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
