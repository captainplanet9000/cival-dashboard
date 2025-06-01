'use client';

import * as React from 'react';
import { Zap, BarChart, ChevronRight, Check, Loader2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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

type AgentFormValues = z.infer<typeof formSchema>;

interface DeployAgentButtonProps {
  className?: string;
}

export function DeployAgentButton({ className }: DeployAgentButtonProps = {}) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Default form values
  const defaultValues: Partial<AgentFormValues> = {
    name: '',
    description: '',
    strategy: '',
    budget: 1000,
    riskLevel: 'medium',
  };

  // Initialize form with react-hook-form
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Form submission handler
  async function onSubmit(data: AgentFormValues) {
    setIsSubmitting(true);
    
    try {
      // Simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Store the agent data in localStorage for simplicity
      const agents = JSON.parse(localStorage.getItem('tradingFarmAgents') || '[]');
      const newAgent = {
        id: crypto.randomUUID(),
        name: data.name,
        description: data.description,
        strategy: data.strategy,
        budget: data.budget,
        risk_level: data.riskLevel,
        status: 'initializing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
        metrics: {},
        trades: Math.floor(Math.random() * 50)
      };
      
      agents.push(newAgent);
      localStorage.setItem('tradingFarmAgents', JSON.stringify(agents));

      toast({
        title: "Agent Deployed Successfully",
        description: `${data.name} is now being initialized.`,
      });

      // Reset form and close modal
      form.reset(defaultValues);
      setOpen(false);
      
      // Reload the page to reflect changes
      window.location.reload();
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
    <>
      <Button onClick={() => setOpen(true)} className="primary-button">
        <Zap className="h-4 w-4 mr-2" /> Deploy New Agent
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] dashboard-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary trading-accent-gradient" />
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
                  className="w-full primary-button"
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
    </>
  );
}
