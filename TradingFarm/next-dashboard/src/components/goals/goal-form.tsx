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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { Goal, CreateGoalInput, UpdateGoalInput } from '@/schemas/goal-schemas';
import { useCreateGoal, useUpdateGoal, useFarms } from '@/hooks';
import { FormError, FormSuccess } from '@/forms';
import { cn } from '@/lib/utils';

interface GoalFormProps {
  initialData?: Goal;
  isEditMode?: boolean;
  farmId?: number;
}

/**
 * Form schema for creating/editing a goal
 * Derives from the Zod schemas but customizes validation messages
 */
const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Goal name must be at least 3 characters long',
  }).max(50, {
    message: 'Goal name must be less than 50 characters',
  }),
  description: z.string().max(500, {
    message: 'Description must be less than 500 characters',
  }).optional(),
  farm_id: z.string().min(1, {
    message: 'Farm ID is required',
  }),
  target_amount: z.coerce.number().min(0, {
    message: 'Target amount must be a positive number',
  }),
  current_amount: z.coerce.number().min(0, {
    message: 'Current amount must be a positive number',
  }).default(0),
  target_assets: z.array(z.string()).default([]),
  status: z.enum(['PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED'], {
    errorMap: () => ({ message: 'Please select a valid status' }),
  }).default('PENDING'),
});

/**
 * Form component for creating and editing goals
 */
export function GoalForm({ initialData, isEditMode = false, farmId }: GoalFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [success, setSuccess] = React.useState<string | undefined>(undefined);
  
  // Fetch farms for the farm selector
  const { data: farmsData, isLoading: isLoadingFarms } = useFarms();
  
  // Use the appropriate mutation hook
  const createGoal = useCreateGoal();
  const updateGoal = initialData ? useUpdateGoal(initialData.id) : null;
  
  // Pre-populate farm_id if provided
  const presetFarmId = farmId ? String(farmId) : undefined;
  
  // Create form with React Hook Form and Zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      description: initialData.description || '',
      farm_id: String(initialData.farm_id),
      target_amount: initialData.target_amount,
      current_amount: initialData.current_amount,
      target_assets: initialData.target_assets || [],
      status: initialData.status,
    } : {
      name: '',
      description: '',
      farm_id: presetFarmId || '',
      target_amount: 0,
      current_amount: 0,
      target_assets: [],
      status: 'PENDING',
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError(undefined);
    setSuccess(undefined);
    
    try {
      if (isEditMode && initialData) {
        // Update existing goal
        await updateGoal?.mutateAsync(values as UpdateGoalInput);
        setSuccess("Goal updated successfully!");
        
        // Redirect after a brief delay to show success message
        setTimeout(() => {
          router.push(`/dashboard/farms/${values.farm_id}/goals/${initialData.id}`);
        }, 1500);
      } else {
        // Create new goal
        const newGoal = await createGoal.mutateAsync(values as CreateGoalInput);
        setSuccess("Goal created successfully!");
        
        // Redirect after a brief delay to show success message
        setTimeout(() => {
          router.push(`/dashboard/farms/${values.farm_id}/goals/${newGoal.id}`);
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? "Edit Goal" : "Create New Goal"}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter goal name" {...field} />
                  </FormControl>
                  <FormDescription>
                    Give your goal a descriptive name
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
                      placeholder="Enter goal description" 
                      className="resize-none min-h-[100px]" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe what this goal aims to achieve
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {!presetFarmId && (
              <FormField
                control={form.control}
                name="farm_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Farm</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isLoadingFarms}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a farm" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {farmsData?.map(farm => (
                          <SelectItem key={farm.id} value={String(farm.id)}>
                            {farm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The farm this goal belongs to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="target_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      The financial target for this goal
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="current_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      The current progress toward the goal
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
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
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The current status of this goal
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
              disabled={createGoal.isPending || (updateGoal?.isPending ?? false)}
              className={cn(
                (createGoal.isPending || (updateGoal?.isPending ?? false)) && "opacity-50 cursor-not-allowed"
              )}
            >
              {createGoal.isPending || (updateGoal?.isPending ?? false)
                ? "Saving..."
                : isEditMode ? "Update Goal" : "Create Goal"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
