import { Badge } from "@/components/ui/badge";
import { WorkflowStatus } from "@/types/workflows";

// Define workflow status badge colors and labels
const workflowStatusConfig: Record<WorkflowStatus, { color: string; label: string }> = {
  draft: { 
    color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-500", 
    label: "Draft" 
  },
  active: { 
    color: "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-500", 
    label: "Active" 
  },
  paused: { 
    color: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-500", 
    label: "Paused" 
  },
  completed: { 
    color: "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900/30 dark:text-gray-400", 
    label: "Completed" 
  },
  failed: { 
    color: "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-500", 
    label: "Failed" 
  },
  archived: { 
    color: "bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-500", 
    label: "Archived" 
  },
};

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus;
  showLabel?: boolean;
  className?: string;
}

export function WorkflowStatusBadge({ 
  status, 
  showLabel = true, 
  className = "" 
}: WorkflowStatusBadgeProps) {
  const config = workflowStatusConfig[status] || workflowStatusConfig.draft;
  
  return (
    <Badge className={`${config.color} ${className}`} variant="outline">
      {showLabel ? config.label : status}
    </Badge>
  );
}
