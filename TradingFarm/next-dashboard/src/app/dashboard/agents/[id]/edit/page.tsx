'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAgent, Agent } from '@/hooks/use-agent';
import { updateAgentSchema, UpdateAgentInput } from '@/schemas/agent-schemas';
import { useUpdateAgent } from '@/hooks/use-update-agent';
import { useFarms } from '@/hooks/use-farms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; // For metadata
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export default function EditAgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const { agent, isLoading: isFetchingAgent, error: fetchError } = useAgent(agentId);
  const updateAgentMutation = useUpdateAgent(agentId);
  const { data: farms, isLoading: isLoadingFarms } = useFarms(true);

  // Initialize the form
  const form = useForm<UpdateAgentInput>({
    resolver: zodResolver(updateAgentSchema),
  });

  // Populate form
  useEffect(() => {
    if (agent) {
      form.reset({
        agent_type: agent.agent_type || '',
        status: agent.status || '',
        metadata: agent.metadata ? JSON.stringify(agent.metadata, null, 2) : '',
        farm_id: agent.farm_id,
        brain_id: agent.brain_id || null,
      });
    } else {
       form.reset({ 
         agent_type: '', 
         status: '', 
         metadata: '',
         farm_id: null,
         brain_id: null,
       });
    }
  }, [agent, form.reset]);

  const onSubmit = async (values: UpdateAgentInput) => {
    const payload: UpdateAgentInput = {};

    if (values.agent_type !== undefined) payload.agent_type = values.agent_type;
    if (values.status !== undefined) payload.status = values.status;

    if (values.farm_id !== undefined) {
      payload.farm_id = values.farm_id ? Number(values.farm_id) : null;
    }

    if (values.brain_id !== undefined) {
      payload.brain_id = values.brain_id || null;
    }

    // Handle metadata string from form -> JSON | null (UNCOMMENTED)
    const metadataString = values.metadata as string | null | undefined;
    if (metadataString === '' || metadataString === null || metadataString === undefined) {
      payload.metadata = null;
    } else {
      try {
        payload.metadata = JSON.parse(metadataString);
      } catch (e) {
        form.setError("metadata", { type: "manual", message: "Invalid JSON format." });
        return; // Stop submission
      }
    }

    // Filter out undefined properties just in case, though constructing based on
    // UpdateAgentInput should minimize this need.
    const finalPayload = Object.entries(payload).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        (acc as any)[key] = value;
      }
      return acc;
    }, {} as UpdateAgentInput); 

    // Check if anything actually changed
    if (Object.keys(finalPayload).length === 0 && !form.formState.isDirty) {
        console.log("No actual changes submitted.");
        // Optionally show a toast message here
        // router.push(`/dashboard/agents/${agentId}`); // Can skip redirect if no changes
        return;
    }

    try {
      await updateAgentMutation.mutateAsync(finalPayload);
      router.push(`/dashboard/agents/${agentId}`);
    } catch (error) {
      console.error("Update agent submission failed:", error);
      // Toast is handled by the hook
    }
  };

  // --- Render logic ---

  if (isFetchingAgent || isLoadingFarms) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-2xl mx-auto animate-pulse">
         <Skeleton className="h-9 w-32 mb-4" />
         <Skeleton className="h-[450px] w-full" /> {/* Updated Card placeholder height */}
      </div>
    );
  }

  if (fetchError) {
    return (
       <div className="p-4 md:p-6 max-w-2xl mx-auto">
         <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Agent Data</AlertTitle>
          <AlertDescription>
            {fetchError || "Could not load agent data for editing."}
             <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-4 ml-auto block">Go Back</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!agent) {
     return (
       <div className="p-4 md:p-6 max-w-2xl mx-auto">
         <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Agent Not Found</AlertTitle>
          <AlertDescription>
            Could not find the agent with ID '{agentId}' to edit.
            <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-4 ml-auto block">Go Back</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // --- Form Rendering ---
  return (
    <div className="space-y-6 p-4 md:p-6 max-w-2xl mx-auto">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Agent Details
      </Button>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Edit Agent</CardTitle>
              <CardDescription>
                Update the configuration for agent <code className="font-mono bg-muted px-1 rounded">{agent.id}</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Agent Type (Readonly or Select?) - Assuming readonly for now */}
              <FormField
                control={form.control}
                name="agent_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Type</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-muted" />
                    </FormControl>
                     <FormDescription>
                      Agent type cannot be changed after creation.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
               {/* Farm Select */}
               <FormField
                control={form.control}
                name="farm_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Farm</FormLabel>
                     <Select 
                       onValueChange={(value: string) => field.onChange(value ? parseInt(value, 10) : null)} 
                       value={field.value?.toString() ?? ''} // Use current value
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
                      Assign this agent to one of your farms (optional).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Agent Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value || ''}> {/* Ensure value is passed */} 
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Populate with valid statuses */} 
                        <SelectItem value="initializing">Initializing</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Set the operational status of the agent.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Metadata Field - UNCOMMENTED */}
              <FormField
                control={form.control}
                name="metadata"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metadata (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{
                          "key": "value",
                          "another_key": 123
                        }'
                        {...field}
                        // Handle null/undefined explicitly for Textarea
                        value={field.value ?? ''}
                        className="min-h-[100px] font-mono"
                      />
                    </FormControl>
                    <FormDescription>
                      Optional JSON object for agent-specific settings.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* End Metadata Field */}

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
                      Link this agent to a specific Brain configuration.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
            <CardFooter className="flex justify-end">
               <Button type="submit" disabled={updateAgentMutation.isPending || isLoadingFarms || !form.formState.isDirty}>
                 {(updateAgentMutation.isPending || isLoadingFarms) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Save Changes
               </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
} 