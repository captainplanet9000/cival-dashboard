import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  default?: any;
  description?: string;
}

interface WorkflowParametersViewProps {
  parameters: Parameter[] | Record<string, any> | null | undefined;
}

export function WorkflowParametersView({ parameters }: WorkflowParametersViewProps) {
  // Convert parameters to array format if they are in record format
  const normalizedParameters: Parameter[] = [];
  
  if (parameters) {
    if (Array.isArray(parameters)) {
      normalizedParameters.push(...parameters);
    } else {
      // Convert record to array of parameters
      Object.entries(parameters).forEach(([name, config]) => {
        if (typeof config === 'object') {
          normalizedParameters.push({
            name,
            type: config.type || typeof config.default || 'string',
            required: config.required === undefined ? false : config.required,
            default: config.default,
            description: config.description
          });
        } else {
          // If just a simple value is provided
          normalizedParameters.push({
            name,
            type: typeof config,
            required: false,
            default: config
          });
        }
      });
    }
  }

  if (normalizedParameters.length === 0) {
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <h3 className="mt-2 text-lg font-medium">No parameters</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This workflow doesn't have any parameters defined.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {normalizedParameters.map((param) => (
            <TableRow key={param.name}>
              <TableCell className="font-medium">
                <code className="rounded bg-muted px-1.5 py-0.5">
                  {param.name}
                </code>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {param.type}
                </Badge>
              </TableCell>
              <TableCell>
                {param.required ? (
                  <Badge className="bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-500">
                    Required
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Optional
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {param.default !== undefined ? (
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {typeof param.default === 'object' 
                      ? JSON.stringify(param.default)
                      : String(param.default)}
                  </code>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="max-w-[300px] truncate">
                {param.description || (
                  <span className="text-muted-foreground">No description</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
