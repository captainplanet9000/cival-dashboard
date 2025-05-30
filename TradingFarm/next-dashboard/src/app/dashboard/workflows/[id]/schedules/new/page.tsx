"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import cronstrue from 'cronstrue';

import { Workflow } from "@/types/workflows";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  Clock,
  Info,
  RefreshCw,
  CalendarClock,
  Calendar,
  Code
} from "lucide-react";

interface NewSchedulePageProps {
  params: {
    id: string;
  };
}

// Schedule form schema
const scheduleFormSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters" })
    .max(100, { message: "Name must not be longer than 100 characters" }),
  description: z
    .string()
    .max(500, { message: "Description must not be longer than 500 characters" })
    .optional(),
  schedule_type: z.enum(['cron', 'interval', 'daily', 'weekly', 'monthly']),
  cron_expression: z.string().min(9, { message: "Valid cron expression required" }).optional(),
  interval_minutes: z.number().min(5, { message: "Minimum interval is 5 minutes" }).optional(),
  time_of_day: z.string().optional(),
  day_of_week: z.number().min(0).max(6).optional(),
  day_of_month: z.number().min(1).max(31).optional(),
  parameters: z.string().optional(),
  active: z.boolean().default(true),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

// Common cron schedule presets
const cronPresets = [
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 3 hours", value: "0 */3 * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every 12 hours", value: "0 */12 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Daily at 8 AM", value: "0 8 * * *" },
  { label: "Daily at 6 PM", value: "0 18 * * *" },
  { label: "Weekdays at 9 AM", value: "0 9 * * 1-5" },
  { label: "Weekends at 10 AM", value: "0 10 * * 0,6" },
  { label: "Every Monday at 7 AM", value: "0 7 * * 1" },
  { label: "First day of month at noon", value: "0 12 1 * *" },
];

export default function NewSchedulePage({ params }: NewSchedulePageProps) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cronTranslation, setCronTranslation] = useState<string>("");
  const [scheduleTab, setScheduleTab] = useState<string>("cron");

  // Fetch workflow data
  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const response = await fetch(`/api/workflows/${params.id}`);
        if (!response.ok) {
          throw new Error(`Error fetching workflow: ${response.statusText}`);
        }
        
        const data = await response.json();
        setWorkflow(data);
      } catch (err) {
        console.error("Error fetching workflow:", err);
        setError(err instanceof Error ? err.message : "Failed to load workflow");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflow();
  }, [params.id]);

  // Form initialization
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      schedule_type: "cron",
      cron_expression: "0 * * * *", // Default to every hour
      interval_minutes: 60,
      time_of_day: "09:00",
      day_of_week: 1, // Monday
      day_of_month: 1,
      parameters: "{}",
      active: true,
    },
    mode: "onChange",
  });

  // Update cron expression translation when it changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'cron_expression' || name === 'schedule_type') {
        const cronExp = form.getValues('cron_expression');
        if (cronExp) {
          try {
            const humanReadable = cronstrue.toString(cronExp);
            setCronTranslation(humanReadable);
          } catch (e) {
            setCronTranslation("Invalid cron expression");
          }
        }
      }

      // Change tabs when schedule type changes
      if (name === 'schedule_type') {
        setScheduleTab(value.schedule_type || 'cron');
      }
    });
    
    // Initial translation
    try {
      const cronExp = form.getValues('cron_expression');
      if (cronExp) {
        const humanReadable = cronstrue.toString(cronExp);
        setCronTranslation(humanReadable);
      }
    } catch (e) {
      // Ignore initial error
    }
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Generate cron expression based on the different schedule types
  const generateCronExpression = () => {
    const scheduleType = form.getValues('schedule_type');
    
    switch (scheduleType) {
      case 'interval':
        const minutes = form.getValues('interval_minutes') || 60;
        if (minutes < 60) {
          return `*/${minutes} * * * *`; // Every X minutes
        } else {
          const hours = Math.floor(minutes / 60);
          return `0 */${hours} * * *`; // Every X hours
        }
      
      case 'daily':
        const time = form.getValues('time_of_day') || '00:00';
        const [hour, minute] = time.split(':').map(Number);
        return `${minute} ${hour} * * *`; // Every day at specific time
      
      case 'weekly':
        const dayOfWeek = form.getValues('day_of_week') || 0;
        const weeklyTime = form.getValues('time_of_day') || '00:00';
        const [weeklyHour, weeklyMinute] = weeklyTime.split(':').map(Number);
        return `${weeklyMinute} ${weeklyHour} * * ${dayOfWeek}`; // Weekly on specific day at specific time
      
      case 'monthly':
        const dayOfMonth = form.getValues('day_of_month') || 1;
        const monthlyTime = form.getValues('time_of_day') || '00:00';
        const [monthlyHour, monthlyMinute] = monthlyTime.split(':').map(Number);
        return `${monthlyMinute} ${monthlyHour} ${dayOfMonth} * *`; // Monthly on specific day at specific time
      
      case 'cron':
      default:
        return form.getValues('cron_expression') || '0 * * * *';
    }
  };

  // Handle form submission
  const onSubmit = async (data: ScheduleFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Generate the final cron expression based on schedule type
      const cronExpression = generateCronExpression();
      
      // Parse parameters if provided
      let parsedParameters = undefined;
      if (data.parameters) {
        try {
          parsedParameters = JSON.parse(data.parameters);
        } catch (e) {
          setError("Invalid JSON in parameters field. Please check the format.");
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare schedule data
      const scheduleData = {
        workflow_id: params.id,
        name: data.name,
        description: data.description || null,
        cron_expression: cronExpression,
        parameters: parsedParameters,
        active: data.active,
      };

      // Send request to create schedule
      const response = await fetch(`/api/workflows/${params.id}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create workflow schedule");
      }

      // Redirect back to workflow detail page
      router.push(`/dashboard/workflows/${params.id}`);
      router.refresh();
    } catch (err) {
      console.error("Error creating workflow schedule:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center">
          <Link
            href={`/dashboard/workflows/${params.id}`}
            className="inline-flex items-center rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workflow
          </Link>
        </div>
        <DashboardHeader
          heading="Create Schedule"
          text="Loading workflow details..."
        />
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  // Handle error state
  if (error) {
    return (
      <DashboardShell>
        <div className="flex items-center">
          <Link
            href={`/dashboard/workflows/${params.id}`}
            className="inline-flex items-center rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workflow
          </Link>
        </div>
        <DashboardHeader
          heading="Create Schedule"
          text="There was an error loading the workflow."
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Failed to load workflow details. Please try again."}
          </AlertDescription>
        </Alert>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex items-center">
        <Link
          href={`/dashboard/workflows/${params.id}`}
          className="inline-flex items-center rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Workflow
        </Link>
      </div>
      <DashboardHeader
        heading="Create Schedule"
        text={`Create a schedule for "${workflow?.name || 'workflow'}" to run automatically.`}
      />
      
      <div className="max-w-2xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Information</CardTitle>
                <CardDescription>
                  Define when this workflow should run automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter a name for this schedule" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name that explains when this schedule runs.
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
                          placeholder="Describe when and why this schedule runs..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A detailed description of this schedule's purpose.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="schedule_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a schedule type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cron">
                            <div className="flex items-center">
                              <Code className="mr-2 h-4 w-4" />
                              <span>Custom (Cron Expression)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="interval">
                            <div className="flex items-center">
                              <RefreshCw className="mr-2 h-4 w-4" />
                              <span>Interval (Every X Minutes)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="daily">
                            <div className="flex items-center">
                              <Clock className="mr-2 h-4 w-4" />
                              <span>Daily</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="weekly">
                            <div className="flex items-center">
                              <Calendar className="mr-2 h-4 w-4" />
                              <span>Weekly</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="monthly">
                            <div className="flex items-center">
                              <CalendarClock className="mr-2 h-4 w-4" />
                              <span>Monthly</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select how you want to define the schedule.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Tabs value={scheduleTab} onValueChange={setScheduleTab} className="w-full">
                  <TabsList className="grid grid-cols-5 mb-4">
                    <TabsTrigger value="cron">Cron</TabsTrigger>
                    <TabsTrigger value="interval">Interval</TabsTrigger>
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="cron" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="cron_expression"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cron Expression</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., 0 * * * *" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            {cronTranslation ? (
                              <span className="text-sm font-medium">
                                Runs: <span className="text-primary">{cronTranslation}</span>
                              </span>
                            ) : (
                              "Enter a valid cron expression."
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Common Presets</div>
                      <div className="grid grid-cols-2 gap-2">
                        {cronPresets.map((preset) => (
                          <Button
                            key={preset.value}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="justify-start h-auto py-2 text-left"
                            onClick={() => form.setValue('cron_expression', preset.value)}
                          >
                            <div className="flex flex-col items-start">
                              <span>{preset.label}</span>
                              <code className="text-xs text-muted-foreground">{preset.value}</code>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="interval" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="interval_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interval (minutes)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={5}
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                            />
                          </FormControl>
                          <FormDescription>
                            Run workflow every X minutes. Minimum 5 minutes.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Common Intervals</div>
                      <div className="grid grid-cols-4 gap-2">
                        {[5, 15, 30, 60, 120, 360, 720, 1440].map((minutes) => (
                          <Button
                            key={minutes}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="justify-center"
                            onClick={() => form.setValue('interval_minutes', minutes)}
                          >
                            {minutes < 60 ? (
                              `${minutes}m`
                            ) : minutes === 60 ? (
                              `1h`
                            ) : minutes < 1440 ? (
                              `${minutes / 60}h`
                            ) : (
                              `1d`
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="daily" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="time_of_day"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time of Day</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Run workflow daily at this time.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Common Times</div>
                      <div className="grid grid-cols-4 gap-2">
                        {['00:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '23:59'].map((time) => (
                          <Button
                            key={time}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="justify-center"
                            onClick={() => form.setValue('time_of_day', time)}
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="weekly" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="day_of_week"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Day of Week</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">Sunday</SelectItem>
                                <SelectItem value="1">Monday</SelectItem>
                                <SelectItem value="2">Tuesday</SelectItem>
                                <SelectItem value="3">Wednesday</SelectItem>
                                <SelectItem value="4">Thursday</SelectItem>
                                <SelectItem value="5">Friday</SelectItem>
                                <SelectItem value="6">Saturday</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Day of the week to run the workflow.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="time_of_day"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time of Day</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Time to run the workflow.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="monthly" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="day_of_month"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Day of Month</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1}
                                max={31}
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormDescription>
                              Day of the month (1-31).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="time_of_day"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time of Day</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Time to run the workflow.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Common Days</div>
                      <div className="grid grid-cols-6 gap-2">
                        {[1, 5, 10, 15, 20, 25, 'last'].map((day) => (
                          <Button
                            key={day.toString()}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="justify-center"
                            onClick={() => {
                              if (day === 'last') {
                                form.setValue('day_of_month', 28);
                              } else {
                                form.setValue('day_of_month', day as number);
                              }
                            }}
                          >
                            {day === 'last' ? 'Last' : day}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Active
                        </FormLabel>
                        <FormDescription>
                          When active, this schedule will automatically run the workflow.
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schedule Parameters</CardTitle>
                <CardDescription>
                  Define parameters to pass to the workflow when executed by this schedule.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="parameters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parameters (JSON format)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`{
  "asset": "BTC",
  "amount": 0.1,
  "maxSlippage": 0.5
}`}
                          rows={10}
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        These parameters will be passed to the workflow when it runs on this schedule.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="mt-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Optional</AlertTitle>
                    <AlertDescription>
                      Parameters are optional. If not provided, the workflow will run with its default parameters.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Schedule
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardShell>
  );
}
