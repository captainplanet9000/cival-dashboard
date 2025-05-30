'use client';

import React, { useState, useEffect } from 'react'; // Added useEffect
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Keep Link if used for task ID link

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select
import { useToast } from '@/components/ui/use-toast';
import { triggerCrewRun, getCrewBlueprints } from '@/lib/clients/apiClient'; // Added getCrewBlueprints
import { type TriggerCrewRunClientPayload, type CrewBlueprintInterface } from '@/lib/types/crew'; // Updated types
import { Loader2 } from 'lucide-react'; // For loading states

const crewLaunchFormSchema = z.object({
  blueprint_id: z.string().uuid("Please select a valid crew blueprint."),
  // These will be part of the 'inputs' object for the selected blueprint
  // For now, keeping them static for the default trading crew.
  // A more dynamic form would build these based on blueprint.input_schema
  symbol: z.string().min(1, 'Symbol is required (e.g., BTC/USD, AAPL)'),
  market_data_summary: z.string().optional(),
});

type CrewLaunchFormValues = z.infer<typeof crewLaunchFormSchema>;

export default function CrewLauncherPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedTaskId, setSubmittedTaskId] = useState<string | null>(null);

  const [availableBlueprints, setAvailableBlueprints] = useState<CrewBlueprintInterface[]>([]);
  const [isLoadingBlueprints, setIsLoadingBlueprints] = useState(true);
  const [fetchBlueprintsError, setFetchBlueprintsError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBlueprints() {
      setIsLoadingBlueprints(true);
      setFetchBlueprintsError(null);
      try {
        const blueprints = await getCrewBlueprints();
        setAvailableBlueprints(blueprints);
      } catch (err: any) {
        console.error("Failed to load crew blueprints:", err);
        setFetchBlueprintsError(err.message || "Failed to load crew blueprints.");
        toast({ title: "Error", description: "Could not load crew blueprints.", variant: "destructive" });
      } finally {
        setIsLoadingBlueprints(false);
      }
    }
    loadBlueprints();
  }, [toast]);

  const form = useForm<CrewLaunchFormValues>({
    resolver: zodResolver(crewLaunchFormSchema),
    defaultValues: {
      blueprint_id: '', // Will be set by Select
      symbol: '',
      market_data_summary: '',
    },
  });

  async function onSubmit(values: CrewLaunchFormValues) {
    setIsSubmitting(true);
    setError(null);
    setSubmittedTaskId(null);

    // Construct the payload for the API
    const payload: TriggerCrewRunClientPayload = {
      blueprint_id: values.blueprint_id,
      inputs: { // Package form fields into the 'inputs' object
        symbol: values.symbol,
        market_data_summary: values.market_data_summary || 'No specific market summary provided by user.',
      },
    };

    try {
      const result = await triggerCrewRun(payload); // API client expects TriggerCrewRunClientPayload
      setSubmittedTaskId(result.task_id);
      toast({
        title: 'Success!',
        description: `Crew run initiated. Task ID: ${result.task_id}`,
      });
      // Optional: Redirect to a task status page
      // router.push(`/dashboard/tasks/${result.task_id}`); 
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred.';
      setError(errorMessage);
      toast({
        title: 'Error Launching Crew',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">CrewAI Task Launcher</h1>
        <p className="text-muted-foreground">
          Initiate a new crew task by selecting a blueprint and providing the required inputs.
        </p>
      </header>

      {isLoadingBlueprints && <div className="flex items-center space-x-2"><Loader2 className="h-5 w-5 animate-spin" /> <p>Loading crew blueprints...</p></div>}
      {fetchBlueprintsError && <p className="text-red-500">Error loading blueprints: {fetchBlueprintsError}</p>}

      {!isLoadingBlueprints && !fetchBlueprintsError && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
            <FormField
              control={form.control}
              name="blueprint_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Crew Blueprint</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a crew to launch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableBlueprints.map((bp) => (
                        <SelectItem key={bp.blueprint_id} value={bp.blueprint_id}>
                          {bp.name} ({bp.description ? bp.description.substring(0,50)+'...' : 'No description'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Each blueprint defines a specific crew and its required inputs.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* TODO: Dynamically render input fields based on selected blueprint's input_schema */}
            {/* For now, static fields for 'default_trading_crew' which expects 'symbol' and 'market_data_summary' */}
            <FormField
              control={form.control}
              name="symbol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Financial Symbol</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., BTC/USD, AAPL, TSLA" {...field} />
                </FormControl>
                <FormDescription>
                  The financial symbol for the crew to analyze (e.g., stock ticker or crypto pair).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="market_data_summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Market Data Summary (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide a brief summary of current market conditions or recent news for this symbol..."
                    className="resize-none"
                    rows={5}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Optional: Any specific market context, news, or observations you want the crew to consider.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Launching...' : 'Launch Crew'}
          </Button>
        </form>
      </Form>

      {error && (
        <div className="mt-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
          <h3 className="font-semibold">Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {submittedTaskId && (
        <div className="mt-6 p-4 bg-green-500/10 border border-green-500 text-green-700 rounded-md">
          <h3 className="font-semibold">Crew Run Initiated!</h3>
          <p>Task ID: {submittedTaskId}</p>
          <p className="mt-2">
            You can monitor the status of this task. 
            {/* Future: <Link href={`/dashboard/tasks/${submittedTaskId}`} className="underline hover:text-green-600">View Task Status</Link> */}
            {/* For now, just display ID. Link to be implemented if task status page exists. */}
          </p>
        </div>
      )}
    </div>
  );
}
