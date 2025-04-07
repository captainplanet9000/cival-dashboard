"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Workflow, StepType } from "@/types/workflows";
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
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  Info,
  MessageSquareText,
  Tool,
  GitBranch,
  Users,
  Bell,
  Settings 
} from "lucide-react";

interface NewStepPageProps {
  params: {
    id: string;
  };
}

// Step type icons
const stepTypeIcons: Record<StepType, React.ReactNode> = {
  llm_analysis: <MessageSquareText className="h-4 w-4" />,
  tool_execution: <Tool className="h-4 w-4" />,
  decision: <GitBranch className="h-4 w-4" />,
  collaboration: <Users className="h-4 w-4" />,
  notification: <Bell className="h-4 w-4" />,
  system: <Settings className="h-4 w-4" />
};

// Step form schema
const stepFormSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters" })
    .max(100, { message: "Name must not be longer than 100 characters" }),
  description: z
    .string()
    .max(500, { message: "Description must not be longer than 500 characters" })
    .optional(),
  type: z.enum(['llm_analysis', 'tool_execution', 'decision', 'collaboration', 'notification', 'system']),
  agent_id: z.string().optional(),
  parameters: z.string().optional(),
  position: z.number().optional(),
  depends_on: z.string().optional(),
});

type StepFormValues = z.infer<typeof stepFormSchema>;

export default function NewStepPage({ params }: NewStepPageProps) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch workflow and agents data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch workflow
        const workflowRes = await fetch(`/api/workflows/${params.id}`);
        if (!workflowRes.ok) {
          throw new Error(`Error fetching workflow: ${workflowRes.statusText}`);
        }
        const workflowData = await workflowRes.json();
        setWorkflow(workflowData);
        
        // Fetch agents
        const agentsRes = await fetch('/api/agents');
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          setAgents(agentsData);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  // Form initialization
  const form = useForm<StepFormValues>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "llm_analysis",
      position: 1, // Default to first position if no steps exist
      parameters: "{}",
    },
    mode: "onChange",
  });

  // Update position field when workflow loads
  useEffect(() => {
    if (workflow && workflow.steps) {
      const nextPosition = workflow.steps.length + 1;
      form.setValue("position", nextPosition);
    }
  }, [workflow, form]);

  // Get placeholder parameters based on step type
  const getParametersPlaceholder = (type: StepType): string => {
    switch (type) {
      case 'llm_analysis':
        return JSON.stringify({
          prompt: "Analyze the following market data and provide trading recommendations: {{data}}",
          model: "gpt-4",
          temperature: 0.7
        }, null, 2);
      case 'tool_execution':
        return JSON.stringify({
          toolName: "fetchMarketData",
          parameters: {
            asset: "BTC",
            timeframe: "1h",
            limit: 100
          }
        }, null, 2);
      case 'decision':
        return JSON.stringify({
          condition: "{{previous_step.sentiment}} === 'bullish'",
          trueStepId: "buy_action_step_id",
          falseStepId: "sell_action_step_id",
          default: "wait_action_step_id"
        }, null, 2);
      case 'collaboration':
        return JSON.stringify({
          collaborators: ["market_analyst", "risk_manager"],
          question: "Should we execute this trade based on current market conditions?",
          timeout: 300, // seconds
          consensus_threshold: 0.7
        }, null, 2);
      case 'notification':
        return JSON.stringify({
          channel: "email",
          recipients: ["user@example.com"],
          subject: "Trading Alert: {{alert_type}}",
          message: "A trading opportunity has been identified for {{asset}}."
        }, null, 2);
      case 'system':
        return JSON.stringify({
          action: "update_balance",
          data: {
            asset: "BTC",
            amount: "{{previous_step.amount}}"
          }
        }, null, 2);
      default:
        return "{}";
    }
  };

  // Update parameters placeholder when type changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'type') {
        const type = value.type as StepType;
        form.setValue('parameters', getParametersPlaceholder(type));
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Handle form submission
  const onSubmit = async (data: StepFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Parse parameters if provided
      let parsedParameters = {};
      if (data.parameters) {
        try {
          parsedParameters = JSON.parse(data.parameters);
        } catch (e) {
          setError("Invalid JSON in parameters field. Please check the format.");
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare step data
      const stepData = {
        workflow_id: params.id,
        name: data.name,
        description: data.description || null,
        type: data.type,
        agent_id: data.agent_id || null,
        parameters: parsedParameters,
        position: data.position || 1,
        depends_on: data.depends_on || null,
        status: 'pending', // Default status
      };

      // Send request to create step
      const response = await fetch(`/api/workflows/${params.id}/steps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stepData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create workflow step");
      }

      // Redirect back to workflow detail page
      router.push(`/dashboard/workflows/${params.id}`);
      router.refresh();
    } catch (err) {
      console.error("Error creating workflow step:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle type change for the form
  const handleTypeChange = (type: StepType) => {
    form.setValue('type', type);
    form.setValue('parameters', getParametersPlaceholder(type));
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
          heading="Add Workflow Step"
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
          heading="Add Workflow Step"
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
        heading="Add Workflow Step"
        text={`Add a new step to the "${workflow?.name || 'workflow'}" workflow.`}
      />
      
      <div className="max-w-2xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Step Information</CardTitle>
                <CardDescription>
                  Define the basic information for this workflow step.
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
                          placeholder="Enter a name for this step" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name that explains what this step does.
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
                          placeholder="Describe what this step does..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A detailed description of this step's purpose and behavior.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Step Type</FormLabel>
                      <Select
                        onValueChange={(value) => handleTypeChange(value as StepType)}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a step type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="llm_analysis">
                            <div className="flex items-center">
                              {stepTypeIcons.llm_analysis}
                              <span className="ml-2">AI Analysis</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="tool_execution">
                            <div className="flex items-center">
                              {stepTypeIcons.tool_execution}
                              <span className="ml-2">Tool Execution</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="decision">
                            <div className="flex items-center">
                              {stepTypeIcons.decision}
                              <span className="ml-2">Decision</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="collaboration">
                            <div className="flex items-center">
                              {stepTypeIcons.collaboration}
                              <span className="ml-2">Collaboration</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="notification">
                            <div className="flex items-center">
                              {stepTypeIcons.notification}
                              <span className="ml-2">Notification</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="system">
                            <div className="flex items-center">
                              {stepTypeIcons.system}
                              <span className="ml-2">System</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type of action this step will perform.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agent_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent (optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an agent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No agent (system execution)</SelectItem>
                          {agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The agent responsible for executing this step. Leave empty for system-executed steps.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {workflow?.steps && workflow.steps.length > 0 && (
                  <FormField
                    control={form.control}
                    name="depends_on"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Depends On (optional)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a dependency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No dependency (execute in sequence)</SelectItem>
                            {workflow.steps.map((step) => (
                              <SelectItem key={step.id} value={step.id}>
                                {step.name || `Step ${step.position}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          This step will only execute after the specified step completes successfully.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1}
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        The execution order of this step in the workflow.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Step Parameters</CardTitle>
                <CardDescription>
                  Define the parameters specific to this step type.
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
                          placeholder={getParametersPlaceholder(form.watch('type') as StepType)}
                          rows={10}
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Define parameters as a JSON object. The required fields depend on the step type.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="mt-4">
                  <Alert variant="info">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Parameter Templates</AlertTitle>
                    <AlertDescription>
                      You can reference workflow parameters and outputs from previous steps using expressions like <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{parameters.asset}}'}</code> or <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{steps.step_id.result}}'}</code>
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
                Add Step
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardShell>
  );
}
