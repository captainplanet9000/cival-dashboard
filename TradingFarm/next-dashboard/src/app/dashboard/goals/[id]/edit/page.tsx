"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { goalService, Goal } from "@/services/goal-service";
import { farmService, Farm } from "@/services/farm-service";
import {
  ChevronLeft,
  Save,
  Target,
  AlertCircle,
  Info,
} from "lucide-react";

// Import Shadcn components
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Form validation schema for the edit goal form
const goalFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100, "Name must be at most 100 characters"),
  description: z.string().optional(),
  type: z.enum(["profit", "risk", "diversification", "automation", "performance"]),
  priority: z.enum(["high", "medium", "low"]),
  status: z.enum(["not_started", "in_progress", "completed", "cancelled"]),
  target_value: z.coerce.number().positive("Target value must be positive"),
  current_value: z.coerce.number().min(0, "Current value cannot be negative"),
  unit: z.string().optional(),
  farm_id: z.string().optional(),
  deadline: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

export default function EditGoalPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = params.id as string;
  const [goal, setGoal] = React.useState<Goal | null>(null);
  const [farms, setFarms] = React.useState<Farm[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();
  
  // Initialize form with empty values, will be updated once data is loaded
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "profit",
      priority: "medium",
      status: "not_started",
      target_value: 100,
      current_value: 0,
      unit: "",
      farm_id: undefined,
      deadline: undefined,
    },
  });

  // Fetch goal and farms data
  React.useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch goal data
        const goalResponse = await goalService.getGoalById(goalId);
        
        if (goalResponse.error) {
          setError(goalResponse.error);
        } else if (goalResponse.data) {
          setGoal(goalResponse.data);
          
          // Format the deadline to match the expected input format
          let formattedDeadline = goalResponse.data.deadline;
          if (formattedDeadline) {
            formattedDeadline = new Date(formattedDeadline).toISOString().split('T')[0];
          }
          
          // Reset form with goal data
          form.reset({
            name: goalResponse.data.name,
            description: goalResponse.data.description || "",
            type: goalResponse.data.type,
            priority: goalResponse.data.priority,
            status: goalResponse.data.status,
            target_value: goalResponse.data.target_value,
            current_value: goalResponse.data.current_value,
            unit: goalResponse.data.unit || "",
            farm_id: goalResponse.data.farm_id?.toString(),
            deadline: formattedDeadline,
          });
        }
        
        // Fetch farms for dropdown
        const farmsResponse = await farmService.getFarms();
        
        if (farmsResponse.data) {
          setFarms(farmsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load goal data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [goalId, form]);

  // Handle form submission
  const onSubmit = async (values: GoalFormValues) => {
    setSubmitting(true);
    
    try {
      // Format deadline if provided
      if (values.deadline) {
        values.deadline = new Date(values.deadline).toISOString();
      }
      
      // Calculate progress based on current and target values
      const progress = values.target_value > 0 
        ? Math.min(values.current_value / values.target_value, 1) 
        : 0;
      
      // Add completed_at timestamp if status is 'completed'
      const additionalData: Partial<Goal> = {
        progress,
      };
      
      if (values.status === 'completed' && (!goal?.completed_at)) {
        additionalData.completed_at = new Date().toISOString();
      }
      
      // If status was previously completed but is no longer, remove completed_at
      if (goal?.status === 'completed' && values.status !== 'completed') {
        additionalData.completed_at = null;
      }
      
      const updatedGoal = {
        ...values,
        ...additionalData,
      };
      
      const response = await goalService.updateGoal(goalId, updatedGoal);
      
      if (response.error) {
        toast({
          variant: "destructive",
          title: "Failed to update goal",
          description: response.error,
        });
      } else {
        toast({
          title: "Goal Updated",
          description: "The goal has been successfully updated",
        });
        
        // Navigate back to goal details page
        router.push(`/dashboard/goals/${goalId}`);
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "An unexpected error occurred",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center mb-6">
          <Skeleton className="h-6 w-6 mr-2" />
          <Skeleton className="h-6 w-32" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !goal) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/goals">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Goals
            </Link>
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            {error || "Goal not found"}
          </h3>
          <p className="text-red-600 mb-4">
            {error 
              ? "We encountered an error while loading the goal data." 
              : "The goal you're trying to edit doesn't exist or has been deleted."}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.refresh()}>
              Try Again
            </Button>
            <Button asChild>
              <Link href="/dashboard/goals">Go Back to Goals</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header navigation */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href={`/dashboard/goals/${goalId}`}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Goal Details
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Goal</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Edit Goal Details</CardTitle>
          <CardDescription>
            Update the information and settings for this goal
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter goal name" {...field} />
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
                          placeholder="Describe the purpose of this goal" 
                          className="min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Goal Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Goal Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Goal Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select goal type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="profit">Profit</SelectItem>
                            <SelectItem value="risk">Risk Management</SelectItem>
                            <SelectItem value="diversification">Diversification</SelectItem>
                            <SelectItem value="automation">Automation</SelectItem>
                            <SelectItem value="performance">Performance</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
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
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select current status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="not_started">Not Started</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="farm_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Associated Farm</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value} 
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a farm" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {farms.map((farm) => (
                              <SelectItem key={farm.id} value={farm.id.toString()}>
                                {farm.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Progress Tracking */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Progress Tracking</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="target_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Value</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="current_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Value</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., USD, %, trades" {...field} />
                        </FormControl>
                        <FormDescription>
                          Unit of measurement for this goal
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>
                        Optional deadline for goal completion
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Calculated progress info */}
              <div className="flex items-center p-4 bg-blue-50 text-blue-800 rounded-md">
                <Info className="h-5 w-5 mr-2 flex-shrink-0" />
                <div className="text-sm">
                  <p>Current progress: {Math.round((form.watch('current_value') / form.watch('target_value')) * 100) || 0}%</p>
                  <p className="text-blue-600">Progress is automatically calculated based on current and target values.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => router.push(`/dashboard/goals/${goalId}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
