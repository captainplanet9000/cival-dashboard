"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Workflow, WorkflowStatus } from "@/types/workflows";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Terminal, 
  Loader2,
  AlertCircle,
  InfoIcon,
} from "lucide-react";

// Define the workflow form schema
const workflowFormSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters" })
    .max(100, { message: "Name must not be longer than 100 characters" }),
  description: z
    .string()
    .max(500, { message: "Description must not be longer than 500 characters" })
    .optional(),
  status: z.enum(["draft", "active", "paused", "archived"]),
  parameters: z.string().optional(),
  tags: z.string().optional(),
});

type WorkflowFormValues = z.infer<typeof workflowFormSchema>;

// Convert workflow to form values
const mapWorkflowToFormValues = (workflow?: Partial<Workflow>): WorkflowFormValues => {
  return {
    name: workflow?.name || "",
    description: workflow?.description || "",
    status: (workflow?.status as WorkflowStatus) || "draft",
    parameters: workflow?.parameters ? JSON.stringify(workflow.parameters, null, 2) : "",
    tags: workflow?.tags ? workflow.tags.join(", ") : "",
  };
};

interface WorkflowFormProps {
  mode: "create" | "edit";
  workflow?: Partial<Workflow>;
  onSuccess?: (workflow: Workflow) => void;
}

export function WorkflowForm({ mode, workflow, onSuccess }: WorkflowFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the form
  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: mapWorkflowToFormValues(workflow),
    mode: "onChange",
  });

  // Form submission handler
  const onSubmit = async (data: WorkflowFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
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

      // Parse tags if provided
      const tags = data.tags
        ? data.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        : [];

      // Prepare workflow data
      const workflowData = {
        ...data,
        parameters: parsedParameters,
        tags: tags.length > 0 ? tags : null,
      };

      // API endpoint and method based on mode
      const endpoint = mode === "create" 
        ? "/api/workflows" 
        : `/api/workflows/${workflow?.id}`;
      
      const method = mode === "create" ? "POST" : "PUT";

      // Make the API request
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save workflow");
      }

      const savedWorkflow = await response.json();

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(savedWorkflow);
      } else {
        // Redirect to the workflow details page
        router.push(`/dashboard/workflows/${savedWorkflow.id}`);
        router.refresh();
      }
    } catch (err) {
      console.error("Error saving workflow:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Details</CardTitle>
            <CardDescription>
              Define the basic information for your workflow.
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
                      placeholder="Enter a name for your workflow" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name that explains the purpose of this workflow.
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
                      placeholder="Describe what this workflow does and when it should run..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a detailed description of this workflow's purpose and behavior.
                  </FormDescription>
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Set the initial status of your workflow. Draft workflows cannot be executed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="trading, daily, market-analysis" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Comma-separated tags to categorize this workflow.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parameters</CardTitle>
            <CardDescription>
              Define the parameters that this workflow can accept when executed.
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
                      placeholder='{
  "asset": {
    "type": "string",
    "description": "Asset to trade",
    "required": true
  },
  "amount": {
    "type": "number",
    "description": "Amount to trade",
    "required": true
  },
  "maxSlippage": {
    "type": "number",
    "description": "Maximum slippage allowed",
    "default": 0.5
  }
}'
                      rows={10}
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Define parameters as a JSON object. Each parameter should have a type, description, and optionally a default value and required flag.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-4">
              <Alert variant="info">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Tip</AlertTitle>
                <AlertDescription>
                  Parameters will be used when executing this workflow. They can be accessed in workflow steps using expressions like <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{parameters.asset}}'}</code>
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
            {mode === "create" ? "Create Workflow" : "Update Workflow"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
