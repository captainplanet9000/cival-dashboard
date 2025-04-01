'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { useToast } from '@/components/ui/use-toast';
import { Target, Plus } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { goalService, Goal } from '@/services/goal-service';
import { farmService, Farm } from '@/services/farm-service';
import { createBrowserClient } from '@/utils/supabase/client';

// Form schema validation
const goalFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Goal name must be at least 2 characters.',
  }).max(50, {
    message: 'Goal name cannot exceed 50 characters.'
  }),
  description: z.string().max(500, {
    message: 'Description cannot exceed 500 characters.'
  }).optional(),
  type: z.string({
    required_error: "Please select a goal type",
  }),
  priority: z.string({
    required_error: "Please select a priority level",
  }),
  farm_id: z.string({
    required_error: "Please select a farm",
  }),
  target_value: z.number().min(0, {
    message: 'Target value must be a positive number.'
  }),
  deadline: z.date().optional(),
  status: z.string().default('not_started'),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

interface GoalCreationDialogProps {
  onSuccess?: (goal: Goal) => void;
  trigger?: React.ReactNode;
  className?: string;
  preselectedFarmId?: string;
}

export function GoalCreationDialog({
  onSuccess,
  trigger,
  className,
  preselectedFarmId,
}: GoalCreationDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [farms, setFarms] = React.useState<Farm[]>([]);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Initialize form with default values
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: '',
      description: '',
      type: '',
      priority: 'medium',
      farm_id: preselectedFarmId || '',
      target_value: 100,
      status: 'not_started',
    },
  });

  // Fetch available farms
  React.useEffect(() => {
    const fetchFarms = async () => {
      setLoading(true);
      try {
        const response = await farmService.getFarms();
        if (response.data) {
          setFarms(response.data);
          
          // If there's a preselected farm ID, set it
          if (preselectedFarmId) {
            form.setValue('farm_id', preselectedFarmId);
          } else if (response.data.length > 0) {
            // Set the first farm as default if no preselection
            form.setValue('farm_id', response.data[0].id.toString());
          }
        }
      } catch (error) {
        console.error('Error fetching farms:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load farms. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFarms();
  }, [preselectedFarmId, form, toast]);

  // Handle form submission
  async function onSubmit(values: GoalFormValues) {
    setIsSubmitting(true);
    try {
      // Create a new goal object
      const newGoal = {
        ...values,
        progress: 0,
        current_value: 0,
        deadline: values.deadline ? values.deadline.toISOString() : undefined,
        created_at: new Date().toISOString(),
      };

      // Insert goal data into Supabase
      const { data, error } = await supabase
        .from('goals')
        .insert([newGoal])
        .select()
        .single();

      if (error) {
        toast({
          variant: "destructive",
          title: "Failed to create goal",
          description: error.message,
        });
      } else {
        toast({
          title: "Goal created",
          description: "Your new goal has been created successfully.",
        });

        // Close the dialog and call success callback
        setOpen(false);
        form.reset();
        
        if (onSuccess && data) {
          onSuccess(data as unknown as Goal);
        }
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        variant: "destructive",
        title: "Failed to create goal",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCancel = () => {
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className={className}>
            <Plus className="mr-2 h-4 w-4" />
            Create Goal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Trading Goal</DialogTitle>
          <DialogDescription>
            Define a new goal to track progress of your trading operations.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Increase profit by 10%" {...field} />
                  </FormControl>
                  <FormDescription>
                    A clear, specific name for your trading goal.
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the details and strategies to achieve this goal..."
                      {...field}
                      rows={3}
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
                    <FormLabel>Goal Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
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
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="farm_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Associated Farm</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select farm" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {farms.map((farm) => (
                        <SelectItem key={farm.id} value={farm.id.toString()}>
                          {farm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The farm this goal is associated with.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_value"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Target Value</FormLabel>
                  <div className="space-y-2">
                    <Slider
                      defaultValue={[value]}
                      max={1000}
                      step={1}
                      onValueChange={(vals) => onChange(vals[0])}
                    />
                    <div className="flex justify-between">
                      <FormControl>
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => onChange(Number(e.target.value))}
                          min={0}
                          className="w-20"
                          {...fieldProps}
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground pt-2">Target: {value}</span>
                    </div>
                  </div>
                  <FormDescription>
                    The target value to achieve for this goal.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Deadline (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When do you aim to complete this goal?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Goal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
