'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { Agent } from '@/schemas/farm-schemas';
import { useFarm, useFarmAgents } from '@/hooks';
import { FormError, FormSuccess } from '@/forms';
import { cn } from '@/lib/utils';
import { enhancedFarmService } from '@/services/enhanced-farm-service';
import { useFarmStore } from '@/stores';

interface AgentAssignmentFormProps {
  farmId: number;
  goalId?: string;
}

/**
 * Form schema for assigning agents to goals or farms
 */
const formSchema = z.object({
  farm_id: z.coerce.number().min(1, { message: 'Farm ID is required' }),
  goal_id: z.string().optional(),
  agent_id: z.coerce.number().min(1, { message: 'Select an agent' }),
  allocation_percentage: z.coerce.number().min(1).max(100, { 
    message: 'Allocation must be between 1% and 100%' 
  }),
  is_primary: z.boolean().default(false),
  instructions: z.string().max(1000, {
    message: 'Instructions must be less than 1000 characters',
  }).optional(),
});

/**
 * Agent assignment form component
 */
export function AgentAssignmentForm({ farmId, goalId }: AgentAssignmentFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [success, setSuccess] = React.useState<string | undefined>(undefined);
  const [isPending, setIsPending] = React.useState(false);
  
  // Get farm details and agents
  const { data: farm, isLoading: isLoadingFarm } = useFarm(farmId);
  const { data: agents, isLoading: isLoadingAgents } = useFarmAgents(farmId);
  
  // Use the farm store for additional UI state
  const setSelectedFarmId = useFarmStore(state => state.setSelectedFarmId);
  const selectedFarmId = useFarmStore(state => state.selectedFarmId);
  
  // Set the selected farm in the store if it doesn't match
  React.useEffect(() => {
    if (farmId !== selectedFarmId) {
      setSelectedFarmId(farmId);
    }
  }, [farmId, selectedFarmId, setSelectedFarmId]);
  
  // Create form with React Hook Form and Zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      farm_id: farmId,
      goal_id: goalId,
      agent_id: 0,
      allocation_percentage: 100,
      is_primary: true,
      instructions: '',
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError(undefined);
    setSuccess(undefined);
    setIsPending(true);
    
    try {
      // Different API calls based on whether this is a goal or farm assignment
      const response = goalId
        ? await enhancedFarmService.assignAgentToGoal(
            values.agent_id, 
            goalId, 
            values.allocation_percentage, 
            values.is_primary, 
            values.instructions
          )
        : await enhancedFarmService.assignAgentToFarm(
            values.agent_id, 
            farmId, 
            values.allocation_percentage, 
            values.is_primary, 
            values.instructions
          );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSuccess("Agent assigned successfully!");
      
      // Redirect after a brief delay to show success message
      setTimeout(() => {
        if (goalId) {
          router.push(`/dashboard/farms/${farmId}/goals/${goalId}`);
        } else {
          router.push(`/dashboard/farms/${farmId}`);
        }
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  };
  
  if (isLoadingFarm || isLoadingAgents) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!farm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Farm Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Unable to load farm details. Please try again.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.back()}>Go Back</Button>
        </CardFooter>
      </Card>
    );
  }
  
  if (!agents || agents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Agents Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p>There are no agents available for this farm. Please create an agent first.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.push(`/dashboard/farms/${farmId}/agents/create`)}>
            Create Agent
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Assign Agent to {goalId ? 'Goal' : farm.name}
        </CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="agent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Agent</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value ? String(field.value) : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {agents.map((agent: Agent) => (
                        <SelectItem key={agent.id} value={String(agent.id)}>
                          {agent.name} ({agent.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the agent to assign to this {goalId ? 'goal' : 'farm'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="allocation_percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allocation Percentage: {field.value}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={100}
                      step={1}
                      defaultValue={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      className="py-4"
                    />
                  </FormControl>
                  <FormDescription>
                    Percentage of resources allocated to this agent
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="is_primary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Primary Agent</FormLabel>
                    <FormDescription>
                      Set as the primary agent for this {goalId ? 'goal' : 'farm'}
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
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Instructions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter special instructions for this agent" 
                      className="resize-none min-h-[100px]" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional instructions for the agent's behavior
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormError message={error} />
            <FormSuccess message={success} />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isPending}
              className={cn(
                isPending && "opacity-50 cursor-not-allowed"
              )}
            >
              {isPending
                ? "Assigning..."
                : "Assign Agent"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
