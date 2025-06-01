"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import Link from "next/link";
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
import { Separator } from "@/components/ui/separator";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Play, 
  AlertCircle, 
  Loader2, 
  CheckCircle2,
  Info 
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Workflow } from "@/types/workflows";

interface RunWorkflowPageProps {
  params: {
    id: string;
  };
}

export default function RunWorkflowPage({ params }: RunWorkflowPageProps) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<string | null>(null);

  // Fetch workflow data
  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const response = await fetch(`/api/workflows/${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
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

  // Dynamically build the form schema based on workflow parameters
  const buildFormSchema = (workflow: Workflow | null) => {
    if (!workflow || !workflow.parameters) {
      return z.object({});
    }

    const schemaObj: Record<string, z.ZodTypeAny> = {};
    
    Object.entries(workflow.parameters).forEach(([key, config]) => {
      if (typeof config === 'object') {
        const paramType = config.type || 'string';
        const required = config.required === true;
        
        let fieldSchema: z.ZodTypeAny;
        
        switch (paramType) {
          case 'number':
            fieldSchema = z.number();
            break;
          case 'boolean':
            fieldSchema = z.boolean();
            break;
          case 'object':
            fieldSchema = z.object({}).passthrough();
            break;
          case 'array':
            fieldSchema = z.array(z.any());
            break;
          case 'string':
          default:
            fieldSchema = z.string();
        }
        
        // Make optional if not required
        if (!required) {
          fieldSchema = fieldSchema.optional();
        }
        
        schemaObj[key] = fieldSchema;
      }
    });
    
    return z.object(schemaObj);
  };

  const formSchema = buildFormSchema(workflow);
  type FormValues = z.infer<typeof formSchema>;

  // Initialize default values from workflow parameters
  const getDefaultValues = () => {
    if (!workflow || !workflow.parameters) {
      return {};
    }
    
    const defaultValues: Record<string, any> = {};
    
    Object.entries(workflow.parameters).forEach(([key, config]) => {
      if (typeof config === 'object' && config.default !== undefined) {
        defaultValues[key] = config.default;
      }
    });
    
    return defaultValues;
  };

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
    mode: "onChange",
  });

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setExecuting(true);
    setError(null);

    try {
      const response = await fetch(`/api/workflows/${params.id}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parameters: values }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to execute workflow");
      }

      const result = await response.json();
      setExecutionId(result.execution_id);
      setExecutionStatus(result.status);
    } catch (err) {
      console.error("Error executing workflow:", err);
      setError(err instanceof Error ? err.message : "Failed to execute workflow");
    } finally {
      setExecuting(false);
    }
  };

  // Handle viewing execution results
  const viewExecutionResults = () => {
    if (executionId) {
      router.push(`/dashboard/workflows/${params.id}/executions/${executionId}`);
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
          heading="Run Workflow"
          text="Loading workflow details..."
        />
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  // Handle error state
  if (error || !workflow) {
    return (
      <DashboardShell>
        <div className="flex items-center">
          <Link
            href="/dashboard/workflows"
            className="inline-flex items-center rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workflows
          </Link>
        </div>
        <DashboardHeader
          heading="Run Workflow"
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

  // Render success state (after execution)
  if (executionId && executionStatus) {
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
          heading="Workflow Execution Started"
          text={`Your workflow "${workflow.name}" is now running.`}
        />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <CardTitle>Execution Started</CardTitle>
                <CardDescription>
                  Your workflow has been queued for execution.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium">Execution ID</div>
                <code className="rounded bg-muted px-1.5 py-0.5">{executionId}</code>
              </div>
              <div>
                <div className="text-sm font-medium">Status</div>
                <div className="font-medium text-blue-600 dark:text-blue-400 capitalize">
                  {executionStatus}
                </div>
              </div>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Execution in progress</AlertTitle>
              <AlertDescription>
                You can view the execution details and results by clicking the button below.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-end space-x-4">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/workflows/${params.id}`}>
                Return to Workflow
              </Link>
            </Button>
            <Button onClick={viewExecutionResults}>
              View Execution Details
            </Button>
          </CardFooter>
        </Card>
      </DashboardShell>
    );
  }

  // Main render - execution form
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
        heading={`Run Workflow: ${workflow.name}`}
        text="Execute this workflow with custom parameters."
      />
      
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Run Workflow</CardTitle>
            <CardDescription>
              Configure parameters for this workflow execution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!workflow.parameters || Object.keys(workflow.parameters).length === 0) ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No parameters required</AlertTitle>
                <AlertDescription>
                  This workflow doesn't require any parameters. You can run it directly.
                </AlertDescription>
              </Alert>
            ) : (
              <Form {...form}>
                <form id="run-workflow-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {workflow.parameters && Object.entries(workflow.parameters).map(([key, config]) => {
                    if (typeof config !== 'object') return null;
                    
                    const { type = 'string', description, required } = config;
                    
                    return (
                      <FormField
                        key={key}
                        control={form.control}
                        name={key as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {key} {required && <span className="text-destructive">*</span>}
                            </FormLabel>
                            <FormControl>
                              {type === 'string' ? (
                                <Input {...field} value={field.value || ''} />
                              ) : type === 'number' ? (
                                <Input 
                                  type="number" 
                                  {...field} 
                                  value={field.value || ''} 
                                  onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} 
                                />
                              ) : type === 'boolean' ? (
                                <div className="flex items-center space-x-2">
                                  <Input 
                                    type="checkbox" 
                                    className="w-4 h-4" 
                                    checked={field.value || false} 
                                    onChange={(e) => field.onChange(e.target.checked)} 
                                  />
                                  <span>Enabled</span>
                                </div>
                              ) : type === 'object' || type === 'array' ? (
                                <Textarea 
                                  className="font-mono text-sm" 
                                  {...field} 
                                  value={typeof field.value === 'object' ? JSON.stringify(field.value, null, 2) : field.value || ''} 
                                  onChange={(e) => {
                                    try {
                                      field.onChange(JSON.parse(e.target.value));
                                    } catch (err) {
                                      // Allow invalid JSON during typing
                                      field.onChange(e.target.value);
                                    }
                                  }} 
                                />
                              ) : (
                                <Input {...field} value={field.value || ''} />
                              )}
                            </FormControl>
                            {description && (
                              <FormDescription>{description}</FormDescription>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    );
                  })}
                </form>
              </Form>
            )}
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-end space-x-4">
            <Button 
              variant="outline" 
              asChild
              disabled={executing}
            >
              <Link href={`/dashboard/workflows/${params.id}`}>
                Cancel
              </Link>
            </Button>
            <Button 
              type="submit" 
              form="run-workflow-form"
              disabled={executing}
            >
              {executing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Workflow
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardShell>
  );
}
