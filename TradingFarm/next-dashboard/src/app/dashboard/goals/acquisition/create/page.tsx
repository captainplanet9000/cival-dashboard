'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { InfoCircledIcon } from '@radix-ui/react-icons';

// Define form schema with Zod
const formSchema = z.object({
  farm_id: z.string({
    required_error: "Please select a farm",
  }),
  name: z.string()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name must be less than 50 characters"),
  description: z.string().optional(),
  target_amount: z.coerce
    .number()
    .positive("Amount must be positive")
    .min(1, "Amount must be at least 1"),
  target_assets: z.array(z.string())
    .min(1, "At least one target asset must be selected")
    .max(2, "Maximum of two target assets can be selected"),
  completion_actions: z.object({
    transferToBank: z.boolean().default(false),
    startNextGoal: z.boolean().default(false),
    nextGoalId: z.string().optional(),
  }),
});

type FormValues = z.infer<typeof formSchema>;

// Available assets for acquisition
const AVAILABLE_ASSETS = [
  { value: 'SUI', label: 'SUI', description: 'Sui Network native token' },
  { value: 'SONIC', label: 'SONIC', description: 'Sonic DEX governance token' },
  { value: 'CETUS', label: 'CETUS', description: 'Cetus DEX governance token' },
  { value: 'USDC', label: 'USDC', description: 'USD Coin stablecoin' },
  { value: 'WETH', label: 'WETH', description: 'Wrapped Ethereum on Sui' },
];

export default function CreateAcquisitionGoalPage() {
  const router = useRouter();
  const [farms, setFarms] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      target_amount: 10000,
      target_assets: [],
      completion_actions: {
        transferToBank: true,
        startNextGoal: false,
      },
    },
  });

  // Fetch farms list on component mount
  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const response = await fetch('/api/farms');
        const result = await response.json();
        
        if (result.data) {
          setFarms(result.data);
          
          // If there's only one farm, auto-select it
          if (result.data.length === 1) {
            form.setValue('farm_id', result.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching farms:', error);
        toast.error('Failed to load farms');
      }
    };

    const fetchGoals = async () => {
      try {
        const response = await fetch('/api/goals');
        const result = await response.json();
        
        if (result.data) {
          // Filter to only show non-completed goals
          const activeGoals = result.data.filter(
            (goal: any) => goal.status !== 'completed'
          );
          setGoals(activeGoals);
        }
      } catch (error) {
        console.error('Error fetching goals:', error);
        toast.error('Failed to load goals');
      }
    };

    fetchFarms();
    fetchGoals();
  }, [form]);

  // Watch for changes to target_assets for UI updates
  const watchedAssets = form.watch('target_assets');
  useEffect(() => {
    setSelectedAssets(watchedAssets || []);
  }, [watchedAssets]);

  // Toggle asset selection
  const toggleAsset = (value: string) => {
    const currentAssets = form.getValues('target_assets') || [];
    
    if (currentAssets.includes(value)) {
      // Remove asset if already selected
      form.setValue(
        'target_assets', 
        currentAssets.filter(asset => asset !== value)
      );
    } else {
      // Add asset if not selected (limit to 2)
      if (currentAssets.length < 2) {
        form.setValue('target_assets', [...currentAssets, value]);
      } else {
        toast.warning('Maximum of two target assets can be selected');
      }
    }
  };

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    
    try {
      // Make API call to create goal
      const response = await fetch('/api/goals/acquisition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      const result = await response.json();
      
      if (response.ok && result.data) {
        toast.success('Acquisition goal created successfully');
        // Redirect to goal details page
        router.push(`/dashboard/goals/acquisition/${result.data.id}`);
      } else {
        toast.error(result.error || 'Failed to create acquisition goal');
      }
    } catch (error) {
      console.error('Error creating acquisition goal:', error);
      toast.error('Failed to create acquisition goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create Acquisition Goal</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new goal for acquiring cryptocurrency assets
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Define the goal and select which farm will work on it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Farm Selection */}
              <FormField
                control={form.control}
                name="farm_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Farm</FormLabel>
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
                        {farms.map(farm => (
                          <SelectItem key={farm.id} value={farm.id}>
                            {farm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The farm that will work on this acquisition goal
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Goal Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acquire 10,000 SUI" {...field} />
                    </FormControl>
                    <FormDescription>
                      A clear, descriptive name for the acquisition goal
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Optional description of the acquisition goal" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Additional details about the goal (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Acquisition Details</CardTitle>
              <CardDescription>
                Specify what and how much to acquire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Target Amount */}
              <FormField
                control={form.control}
                name="target_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Amount</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormDescription>
                      The amount of the asset you want to acquire
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Target Assets */}
              <div>
                <FormLabel className="block mb-2">Target Assets</FormLabel>
                <FormDescription className="mb-4">
                  Select up to two assets the farm can acquire to fulfill this goal
                </FormDescription>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AVAILABLE_ASSETS.map(asset => (
                    <div
                      key={asset.value}
                      className={`
                        border rounded-md p-4 cursor-pointer transition-all
                        ${selectedAssets.includes(asset.value)
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'}
                      `}
                      onClick={() => toggleAsset(asset.value)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedAssets.includes(asset.value)}
                            onCheckedChange={() => toggleAsset(asset.value)}
                          />
                          <div className="font-medium">{asset.label}</div>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <InfoCircledIcon className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{asset.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
                {form.formState.errors.target_assets && (
                  <p className="text-sm font-medium text-destructive mt-2">
                    {form.formState.errors.target_assets.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Completion Actions</CardTitle>
              <CardDescription>
                What should happen when the goal is completed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Transfer to Bank */}
              <FormField
                control={form.control}
                name="completion_actions.transferToBank"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Transfer to Bank on completion</FormLabel>
                      <FormDescription>
                        Automatically transfer the acquired assets to your bank vault
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              {/* Start Next Goal */}
              <FormField
                control={form.control}
                name="completion_actions.startNextGoal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Start next goal on completion</FormLabel>
                      <FormDescription>
                        Automatically activate another goal when this one completes
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              {/* Next Goal ID (conditional) */}
              {form.watch('completion_actions.startNextGoal') && (
                <FormField
                  control={form.control}
                  name="completion_actions.nextGoalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Goal</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select next goal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {goals.map(goal => (
                            <SelectItem key={goal.id} value={goal.id}>
                              {goal.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The goal to activate after this one completes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/goals')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
