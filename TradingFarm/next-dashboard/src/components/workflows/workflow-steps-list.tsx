import { WorkflowSteps, StepType } from "@/types/workflows";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { ArrowDown, ArrowUp, Edit, MoreHorizontal, Trash } from "lucide-react";
import { Badge } from "../ui/badge";

// Icons for different step types
const StepTypeIcons: Record<StepType, React.ReactNode> = {
  llm_analysis: (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  tool_execution: (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  decision: (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  collaboration: (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  notification: (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  system: (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
};

// Human-readable labels for step types
const StepTypeLabels: Record<StepType, string> = {
  llm_analysis: "AI Analysis",
  tool_execution: "Tool Execution",
  decision: "Decision",
  collaboration: "Collaboration",
  notification: "Notification",
  system: "System"
};

interface WorkflowStepsListProps {
  workflowId: string;
  steps: WorkflowSteps[];
}

export function WorkflowStepsList({ workflowId, steps }: WorkflowStepsListProps) {
  // Sort steps by position
  const sortedSteps = [...steps].sort((a, b) => a.position - b.position);
  
  if (sortedSteps.length === 0) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <h3 className="mt-2 text-lg font-medium">No steps</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This workflow doesn't have any steps defined yet.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href={`/dashboard/workflows/${workflowId}/steps/new`}>
              Add first step
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedSteps.map((step, index) => (
        <Card key={step.id} className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-20"></div>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  Step {step.position}
                </Badge>
                <CardTitle className="text-base">
                  {StepTypeLabels[step.type as StepType]}
                </CardTitle>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/workflows/${workflowId}/steps/${step.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  {index > 0 && (
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/workflows/${workflowId}/steps/${step.id}/move-up`}>
                        <ArrowUp className="mr-2 h-4 w-4" />
                        Move Up
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {index < sortedSteps.length - 1 && (
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/workflows/${workflowId}/steps/${step.id}/move-down`}>
                        <ArrowDown className="mr-2 h-4 w-4" />
                        Move Down
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="text-destructive focus:text-destructive">
                    <Link href={`/dashboard/workflows/${workflowId}/steps/${step.id}/delete`}>
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardDescription>
              {step.agent_id ? (
                <span className="flex items-center text-xs">
                  <svg
                    className="mr-1 h-3 w-3"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Using agent: {step.agent_id}
                </span>
              ) : (
                <span className="flex items-center text-xs">
                  <svg
                    className="mr-1 h-3 w-3"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                  System step (no agent required)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                {StepTypeIcons[step.type as StepType]}
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-sm">
                  {step.type === 'tool_execution' && (
                    <>
                      <span className="font-medium">Tool:</span>{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">
                        {step.parameters?.toolName || "Unknown Tool"}
                      </code>
                    </>
                  )}
                  {step.type === 'decision' && (
                    <>
                      <span className="font-medium">Condition:</span>{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">
                        {step.parameters?.condition ? (
                          step.parameters.condition.length > 50 
                            ? `${step.parameters.condition.slice(0, 50)}...` 
                            : step.parameters.condition
                        ) : "No condition defined"}
                      </code>
                    </>
                  )}
                  {step.type === 'llm_analysis' && (
                    <>
                      <span className="font-medium">Prompt:</span>{" "}
                      <span className="text-muted-foreground">
                        {step.parameters?.prompt ? (
                          step.parameters.prompt.length > 50 
                            ? `${step.parameters.prompt.slice(0, 50)}...` 
                            : step.parameters.prompt
                        ) : "No prompt defined"}
                      </span>
                    </>
                  )}
                  {step.type === 'notification' && (
                    <>
                      <span className="font-medium">Channel:</span>{" "}
                      <span className="text-muted-foreground">
                        {step.parameters?.parameters?.channel || "email"}
                      </span>
                    </>
                  )}
                  {step.type === 'collaboration' && (
                    <>
                      <span className="font-medium">Collaborators:</span>{" "}
                      <span className="text-muted-foreground">
                        {step.parameters?.collaborators?.length || 0} agents
                      </span>
                    </>
                  )}
                  {step.type === 'system' && (
                    <>
                      <span className="font-medium">Action:</span>{" "}
                      <span className="text-muted-foreground">
                        {step.parameters?.action || "Unknown action"}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Status: {step.status}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/workflows/${workflowId}/steps/new`}>
            Add Step
          </Link>
        </Button>
      </div>
    </div>
  );
}
