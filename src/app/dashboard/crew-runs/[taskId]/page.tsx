'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation'; // useRouter for back link
import Link from 'next/link';
import { getAgentTask } from '@/lib/clients/apiClient';
import { type AgentTask, type AgentTaskStatus } from '@/lib/types/task'; // Ensure AgentTaskStatus is exported if not already

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { ChevronLeft } from 'lucide-react'; // Icon for back button

// Helper to format date strings (optional)
const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString();
  } catch (e) {
    return dateString; // Fallback if not a valid date
  }
};

// Helper for badge variants
const getStatusBadgeVariant = (status: AgentTaskStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'COMPLETED':
      return 'default'; // Or a success variant if you have one (e.g., green)
    case 'FAILED':
      return 'destructive';
    case 'RUNNING':
      return 'secondary'; // Or an 'info' variant (e.g., blue)
    case 'PENDING':
      return 'outline'; // Or a 'warning' variant (e.g., yellow)
    case 'CANCELLED':
      return 'secondary';
    default:
      return 'secondary';
  }
};


export default function CrewRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [taskDetails, setTaskDetails] = useState<AgentTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AG-UI WebSocket states
  const [wsEvents, setWsEvents] = useState<any[]>([]);
  const [wsStatus, setWsStatus] = useState<string>("Connecting...");
  const MAX_WS_EVENTS = 100; // Max number of events to keep in state

  const fetchTaskDetails = useCallback(async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      const data = await getAgentTask(taskId);
      setTaskDetails(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch task details.');
      setTaskDetails(null); // Clear previous details on error
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTaskDetails();
  }, [fetchTaskDetails]);

  // Effect for polling task details
  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    if (taskDetails && (taskDetails.status === 'PENDING' || taskDetails.status === 'RUNNING')) {
      timerId = setTimeout(() => {
        fetchTaskDetails();
      }, 5000); // Poll every 5 seconds
    }
    return () => clearTimeout(timerId);
  }, [taskDetails, fetchTaskDetails]);

  // Effect for WebSocket connection
  useEffect(() => {
    if (!taskId) return;

    const wsUrl = process.env.NEXT_PUBLIC_PYTHON_WS_URL || 'ws://localhost:8765';
    setWsStatus(`Connecting to ${wsUrl}...`);
    setWsEvents([]); // Clear previous events on new taskId or reconnect attempt

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setWsStatus("Connected");
      console.log(`WebSocket connected and subscribing to agent_id: ${taskId}`);
      socket.send(JSON.stringify({ type: "subscribe", agent_id: taskId }));
    };

    socket.onmessage = (event) => {
      try {
        const parsedEvent = JSON.parse(event.data as string);
        setWsEvents(prevEvents => {
          const newEvents = [...prevEvents, parsedEvent];
          if (newEvents.length > MAX_WS_EVENTS) {
            return newEvents.slice(newEvents.length - MAX_WS_EVENTS); // Keep only the last MAX_WS_EVENTS
          }
          return newEvents;
        });
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
        // Optionally add a raw string message to events if parsing fails
        setWsEvents(prevEvents => [...prevEvents, {type: "RAW_ERROR", data: event.data, timestamp: new Date().toISOString()}]);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      setWsStatus("Error connecting to WebSocket.");
    };

    socket.onclose = (event) => {
      setWsStatus(`Disconnected (Code: ${event.code}, Reason: ${event.reason || 'N/A'})`);
      console.log(`WebSocket disconnected (Code: ${event.code}, Reason: ${event.reason || 'N/A'})`);
      // Optionally implement reconnection logic here
    };

    return () => {
      console.log("Closing WebSocket connection for task:", taskId);
      socket.close();
    };
  }, [taskId]); // Re-run if taskId changes

  // Helper to render individual event (can be moved to a sub-component)
  const renderWsEvent = (event: any, index: number) => {
    const timestamp = event.timestamp ? formatDate(event.timestamp) : 'N/A';
    let content = `Unknown event: ${JSON.stringify(event)}`;

    switch (event.type) {
      case 'RunStarted':
        content = `Cycle ${event.runId} started.`;
        break;
      case 'StepStarted':
        content = `Step '${event.stepName}' started.`;
        break;
      case 'TextMessageContent':
        content = `Thought: ${event.delta}`;
        break;
      case 'StepFinished':
        content = `Step '${event.stepName}' finished.`;
        // Optionally render event.output if simple enough
        if (event.output && typeof event.output === 'string' && event.output.length < 100) {
             content += ` Output: ${event.output}`;
        } else if (event.output) {
            content += ` (Output available)`;
        }
        break;
      case 'RunFinished':
        content = `Cycle ${event.runId} finished.`;
        // Optionally render event.result if simple enough
        if (event.result && typeof event.result === 'string' && event.result.length < 100) {
            content += ` Result: ${event.result}`;
        } else if (event.result) {
            content += ` (Result available)`;
        }
        break;
      case 'RunError':
        content = `Cycle ${event.runId} ERROR: ${event.message}`;
        break;
      case 'RAW_ERROR':
        content = `Error parsing event data: ${event.data}`;
        break;
      default:
        // For other event types, show their type or stringify them if needed
        content = `Event: ${event.type || 'Unknown Type'}`;
        if (event.message) content += ` - ${event.message}`;
        else if (event.delta) content += ` - ${event.delta}`;
        break;
    }

    return (
      <div key={index} className="text-xs p-1.5 mb-1 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <span className="font-mono text-gray-500 dark:text-gray-400 mr-2">{timestamp}</span>
        <Badge variant="outline" className="mr-2 text-xs">{event.type || 'EVENT'}</Badge>
        <span>{content}</span>
      </div>
    );
  };

  if (!taskId) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Task ID is missing from the URL.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10 space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <header className="mb-8">
        <h1 className="text-3xl font-bold break-all">Crew Run Details: {taskId}</h1>
      </header>

      {isLoading && !taskDetails && ( // Show initial loading skeletons
        <div className="space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error Fetching Task</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {taskDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between"><span>Task ID:</span> <span className="font-mono text-sm break-all">{taskDetails.task_id}</span></div>
                <div className="flex justify-between items-center"><span>Status:</span> <Badge variant={getStatusBadgeVariant(taskDetails.status)}>{taskDetails.status}</Badge></div>
                <div className="flex justify-between"><span>Task Name:</span> <span>{taskDetails.task_name || 'N/A'}</span></div>
                <div className="flex justify-between"><span>User ID:</span> <span className="font-mono text-sm break-all">{taskDetails.user_id}</span></div>
                <div className="flex justify-between"><span>Created At:</span> <span>{formatDate(taskDetails.created_at)}</span></div>
                <div className="flex justify-between"><span>Started At:</span> <span>{formatDate(taskDetails.started_at)}</span></div>
                <div className="flex justify-between"><span>Last Updated:</span> <span>{formatDate(taskDetails.updated_at)}</span></div>
                <div className="flex justify-between"><span>Completed At:</span> <span>{formatDate(taskDetails.completed_at)}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Input Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                {taskDetails.input_parameters ? (
                  <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                    <code>{JSON.stringify(taskDetails.input_parameters, null, 2)}</code>
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">No input parameters provided.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Results / Error</CardTitle>
              </CardHeader>
              <CardContent>
                {taskDetails.status === 'COMPLETED' && taskDetails.results && (
                  <div className="space-y-4">
                    <div> {/* Wrapper for all results content */}
                      {taskDetails.results.simulated_trade_outcome && (
                        <div className="mb-4 p-3 border rounded-md bg-blue-500/10 border-blue-500/30">
                          <h4 className="text-md font-semibold mb-2 text-blue-700 dark:text-blue-400">Simulated Trade Outcome:</h4>
                          {(taskDetails.results.simulated_trade_outcome as any).status === "success" && (taskDetails.results.simulated_trade_outcome as any).trade_id ? (
                            <div>
                              <p className="text-sm text-green-600 dark:text-green-400">Simulated trade logged successfully.</p>
                              <p className="text-sm"><strong>Trade ID:</strong> {(taskDetails.results.simulated_trade_outcome as any).trade_id}</p>
                              {/* Optional: Display more details from trade_signal if available */}
                              {taskDetails.results.trade_signal && (
                                <p className="text-sm">
                                  <strong>Signal:</strong> {(taskDetails.results.trade_signal as any).action} {(taskDetails.results.trade_signal as any).symbol}
                                </p>
                              )}
                              {/* Placeholder for future link */}
                              {/* <p className="text-sm mt-1"><Link href={`/dashboard/trades/${(taskDetails.results.simulated_trade_outcome as any).trade_id}`} className="text-blue-500 hover:underline">View Trade Details (Not Implemented)</Link></p> */}
                            </div>
                          ) : (
                            <p className="text-sm text-orange-600 dark:text-orange-400">
                              Simulated trade {(taskDetails.results.simulated_trade_outcome as any).status}: {(taskDetails.results.simulated_trade_outcome as any).reason || "No specific reason provided."}
                            </p>
                          )}
                        </div>
                      )}

                      {taskDetails.results.trade_signal && (
                        <div className="mb-2">
                          <h4 className="text-md font-medium mb-1">Trade Signal Details:</h4>
                          <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                            <code>{JSON.stringify(taskDetails.results.trade_signal, null, 2)}</code>
                          </pre>
                        </div>
                      )}
                      
                      {/* Fallback for other results if they exist and are not the above two */}
                      {Object.keys(taskDetails.results).filter(key => key !== 'trade_signal' && key !== 'simulated_trade_outcome').length > 0 && (
                        <div>
                            <h4 className="text-md font-medium mb-1">Other Results:</h4>
                            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                                <code>
                                    {JSON.stringify(
                                        Object.fromEntries(Object.entries(taskDetails.results).filter(([key]) => key !== 'trade_signal' && key !== 'simulated_trade_outcome')),
                                        null, 
                                        2
                                    )}
                                </code>
                            </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {taskDetails.status === 'FAILED' && taskDetails.error_message && (
                  <div>
                    <h3 className="font-semibold mb-2 text-destructive">Error:</h3>
                    <p className="text-sm text-destructive-foreground bg-destructive/20 p-3 rounded-md">{taskDetails.error_message}</p>
                    {taskDetails.results && ( // Sometimes results might contain partial data even on failure
                        <div className="mt-4">
                            <h4 className="text-md font-medium mb-1">Partial Results (if any):</h4>
                            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                                <code>{JSON.stringify(taskDetails.results, null, 2)}</code>
                            </pre>
                        </div>
                    )}
                  </div>
                )}
                {(taskDetails.status === 'PENDING' || taskDetails.status === 'RUNNING') && (
                  <p className="text-sm text-muted-foreground">Results will appear here once the task is complete. Polling for updates...</p>
                )}
                 {(taskDetails.status === 'COMPLETED' && !taskDetails.results) && (
                  <p className="text-sm text-muted-foreground">Task completed, but no results were provided.</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Live Activity Stream</CardTitle>
                    <CardDescription>WebSocket Status: <Badge variant={wsStatus === "Connected" ? "default" : "outline"}>{wsStatus}</Badge></CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-96 overflow-y-auto p-2 border rounded-md bg-muted/20">
                        {wsEvents.length === 0 && <p className="text-sm text-muted-foreground">No events received yet. Waiting for connection or activity...</p>}
                        {wsEvents.map(renderWsEvent)}
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
