'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAgentSchema, CreateAgentInput } from '@/schemas/agent-schemas';
import { useCreateAgent } from '@/hooks/use-create-agent';
import { useFarms } from '@/hooks/use-farms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For agent type
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function CreateAgentPage() {
  const router = useRouter();
  const createAgentMutation = useCreateAgent();
  const { data: farms, isLoading: isLoadingFarms } = useFarms(true);

  const form = useForm<CreateAgentInput>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      agent_type: '',
      farm_id: null,
    },
  });

  const onSubmit = async (values: CreateAgentInput) => {
    const payload = {
      ...values,
      farm_id: values.farm_id ? Number(values.farm_id) : null,
    };
    try {
      const newAgent = await createAgentMutation.mutateAsync(payload);
      router.push(`/dashboard/agents/${newAgent.id}`);
    } catch (error) {
      console.error("Create agent submission failed:", error);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-2xl mx-auto">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Agents List
      </Button>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Create New Agent</CardTitle>
              <CardDescription>
                Configure the basic details for your new agent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="agent_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select agent type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* TODO: Populate with actual valid agent types */} 
                        <SelectItem value="trading">Trading Agent</SelectItem>
                        <SelectItem value="research">Research Agent</SelectItem>
                        <SelectItem value="monitoring">Monitoring Agent</SelectItem>
                        <SelectItem value="manager">Manager Agent</SelectItem>
                        <SelectItem value="custom">Custom Agent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the primary role for this agent.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="farm_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Farm (Optional)</FormLabel>
                    <Select 
                       onValueChange={(value: string) => field.onChange(value ? parseInt(value, 10) : null)} 
                       value={field.value?.toString() ?? ''}
                       disabled={isLoadingFarms}
                     >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingFarms ? "Loading farms..." : "Select a farm"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">-- No Farm --</SelectItem> 
                        {farms?.map((farm) => (
                          <SelectItem key={farm.id} value={farm.id.toString()}>
                            {farm.name} (ID: {farm.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Optionally assign this agent to one of your farms.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Brain ID Field */}
              <FormField
                control={form.control}
                name="brain_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brain ID (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter Brain UUID (optional)" 
                        {...field} 
                        // Ensure value is always string or empty string for Input
                        value={field.value ?? ''} 
                      />
                    </FormControl>
                    <FormDescription>
                      Optionally link this agent to a specific Brain configuration.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* TODO: Add other fields like metadata */}
            </CardContent>
            <CardFooter className="flex justify-end">
               <Button type="submit" disabled={createAgentMutation.isPending || isLoadingFarms}>
                 {(createAgentMutation.isPending || isLoadingFarms) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Create Agent
               </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
} 