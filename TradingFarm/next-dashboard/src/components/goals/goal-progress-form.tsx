'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { Goal } from '@/schemas/goal-schemas';
import { useGoal, useUpdateGoalProgress } from '@/hooks';
import { FormError, FormSuccess } from '@/forms';
import { cn } from '@/lib/utils';

interface GoalProgressFormProps {
  goalId: string;
}

/**
 * Form schema for updating goal progress
 */
const formSchema = z.object({
  current_amount: z.coerce.number().min(0, {
    message: 'Current amount must be a positive number',
  }),
});

/**
 * Goal progress update form component
 */
export function GoalProgressForm({ goalId }: GoalProgressFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [success, setSuccess] = React.useState<string | undefined>(undefined);
  
  // Get goal details
  const { data: goal, isLoading: isLoadingGoal } = useGoal(goalId);
  
  // Use the update progress mutation hook
  const updateGoalProgress = useUpdateGoalProgress(goalId);
  
  // Calculate progress percentage
  const progressPercentage = React.useMemo(() => {
    if (!goal) return 0;
    if (goal.target_amount === 0) return 0;
    return Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
  }, [goal]);
  
  // Create form with React Hook Form and Zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: {
      current_amount: goal?.current_amount || 0,
    },
  });
  
  // Watch the current_amount field to calculate live progress
  const watchedCurrentAmount = form.watch('current_amount');
  
  // Calculate live progress percentage
  const liveProgressPercentage = React.useMemo(() => {
    if (!goal) return 0;
    if (goal.target_amount === 0) return 0;
    return Math.min(100, Math.round((watchedCurrentAmount / goal.target_amount) * 100));
  }, [goal, watchedCurrentAmount]);
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError(undefined);
    setSuccess(undefined);
    
    try {
      await updateGoalProgress.mutateAsync(values.current_amount);
      setSuccess("Goal progress updated successfully!");
      
      // No redirect needed - staying on the same page
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  };
  
  if (isLoadingGoal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Goal...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!goal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Goal Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Unable to load goal details. Please try again.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.back()}>Go Back</Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Goal Progress</CardTitle>
        <CardDescription>
          {goal.name} - Target: {goal.target_amount.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
          })}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Progress: {progressPercentage}%</span>
                <span>Target: {liveProgressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="current_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Amount</FormLabel>
                  <div className="flex items-center gap-4">
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <span className="text-sm font-medium">
                      {((watchedCurrentAmount / goal.target_amount) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <FormDescription>
                    The current progress toward the goal target of {goal.target_amount.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    })}
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
                  <FormLabel>Adjust Progress</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={goal.target_amount * 1.5} // Allow exceeding target
                      step={goal.target_amount / 100} // 1% increments
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      className="py-4"
                    />
                  </FormControl>
                  <FormDescription>
                    Drag the slider to adjust progress
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
              disabled={updateGoalProgress.isPending}
              className={cn(
                updateGoalProgress.isPending && "opacity-50 cursor-not-allowed"
              )}
            >
              {updateGoalProgress.isPending
                ? "Updating..."
                : "Update Progress"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
