'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation'; // Corrected import
import Link from 'next/link';

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
import { useToast } from '@/components/ui/use-toast';
import { triggerCrewRun } from '@/lib/clients/apiClient'; // Ensure this path is correct
import { type TriggerCrewRunPayload } from '@/lib/types/crew'; // Ensure this path is correct

const crewLaunchFormSchema = z.object({
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

  const form = useForm<CrewLaunchFormValues>({
    resolver: zodResolver(crewLaunchFormSchema),
    defaultValues: {
      symbol: '',
      market_data_summary: '',
    },
  });

  async function onSubmit(values: CrewLaunchFormValues) {
    setIsSubmitting(true);
    setError(null);
    setSubmittedTaskId(null);

    const payload: TriggerCrewRunPayload = {
      symbol: values.symbol,
      market_data_summary: values.market_data_summary || 'No specific market summary provided by user.', // Default if empty
      // user_id will be handled by the backend /api/crew/run from Supabase auth
    };

    try {
      const result = await triggerCrewRun(payload);
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
          Initiate a new trading analysis task for the CrewAI agents.
        </p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
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
