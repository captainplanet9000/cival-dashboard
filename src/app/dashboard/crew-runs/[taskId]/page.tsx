'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    getAgentTask, 
    cancelAgentTask,
    approveAgentTrade, // Added
    rejectAgentTrade   // Added
} from '@/lib/clients/apiClient';
import { type AgentTask, type AgentTaskStatus, type ProposedTradeSignalInterface } from '@/lib/types/task'; // Added ProposedTradeSignalInterface

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, PlayCircle, Info, MessageSquare, CheckCircle2, XCircle, AlertTriangle, Zap, ChevronRight, Loader2, Ban, ThumbsUp, ThumbsDown } from 'lucide-react';

// Helper to format date strings
const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  try { return new Date(dateString).toLocaleString(); } catch (e) { return dateString; }
};

// Helper for badge variants
const getStatusBadgeVariant = (status: AgentTaskStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'COMPLETED': return 'default';
    case 'FAILED': return 'destructive';
    case 'RUNNING': return 'secondary';
    case 'PENDING': return 'outline';
    case 'CANCELLED': return 'secondary';
    case 'AWAITING_APPROVAL': return 'destructive'; // Use 'destructive' or a unique color like orange/amber
    default: return 'secondary';
  }
};

export default function CrewRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;
  const { toast } = useToast();

  const [taskDetails, setTaskDetails] = useState<AgentTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  const [wsEvents, setWsEvents] = useState<any[]>([]);
  const [wsStatus, setWsStatus] = useState<string>("Connecting...");
  const MAX_WS_EVENTS = 100;

  const fetchTaskDetails = useCallback(async () => {
    if (!taskId) return;
    // Only set isLoading true if not already loading to avoid flicker during polling
    // if (!isLoading) setIsLoading(true); // This might be too complex, simple setIsLoading is fine.
    setIsLoading(true); 
    try {
      const data = await getAgentTask(taskId);
      setTaskDetails(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch task details.');
      setTaskDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTaskDetails();
  }, [fetchTaskDetails]);

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    if (taskDetails && (taskDetails.status === 'PENDING' || taskDetails.status === 'RUNNING')) {
      timerId = setTimeout(fetchTaskDetails, 5000);
    }
    return () => clearTimeout(timerId);
  }, [taskDetails, fetchTaskDetails]);

  useEffect(() => {
    if (!taskId) return;
    const wsUrl = process.env.NEXT_PUBLIC_PYTHON_WS_URL || 'ws://localhost:8765';
    setWsStatus(`Connecting to ${wsUrl}...`);
    setWsEvents([]);
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => {
      setWsStatus("Connected");
      socket.send(JSON.stringify({ type: "subscribe", agent_id: taskId }));
    };
    socket.onmessage = (event) => {
      try {
        const parsedEvent = JSON.parse(event.data as string);
        if (parsedEvent.type === "custom" && parsedEvent.name === "trade.approval.required") {
            console.log("Trade approval required event received, fetching updated task details.");
            fetchTaskDetails(); 
        }
        setWsEvents(prevEvents => {
          const newEvents = [...prevEvents, parsedEvent];
          return newEvents.length > MAX_WS_EVENTS ? newEvents.slice(-MAX_WS_EVENTS) : newEvents;
        });
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
        setWsEvents(prevEvents => [...prevEvents, {type: "RAW_ERROR", data: event.data, timestamp: new Date().toISOString()}]);
      }
    };
    socket.onerror = (err) => { console.error("WebSocket error:", err); setWsStatus("Error"); };
    socket.onclose = (ev) => { setWsStatus(`Disconnected (Code: ${ev.code})`); console.log("WS closed", ev);};
    return () => { socket.close(); };
  }, [taskId, fetchTaskDetails]);

  const handleCancelTask = async () => {
    if (!taskId) return;
    setIsCancelling(true);
    try {
      const updatedTask = await cancelAgentTask(taskId);
      setTaskDetails(updatedTask);
      toast({ title: "Task Cancellation Requested", description: `Status: ${updatedTask.status}` });
    } catch (err: any) {
      toast({ title: "Cancellation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleApproveTrade = async () => {
    if (!taskId) return;
    setIsSubmittingApproval(true);
    try {
      const updatedTask = await approveAgentTrade(taskId);
      setTaskDetails(updatedTask);
      toast({ title: "Trade Approved", description: `Task status: ${updatedTask.status}` });
    } catch (err: any) {
      toast({ title: "Approval Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleRejectTrade = async () => {
    if (!taskId) return;
    setIsSubmittingApproval(true);
    try {
      const updatedTask = await rejectAgentTrade(taskId);
      setTaskDetails(updatedTask);
      toast({ title: "Trade Rejected", description: `Task status: ${updatedTask.status}` });
    } catch (err: any) {
      toast({ title: "Rejection Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const renderWsEvent = (event: any, index: number) => { /* ... [Keep existing renderWsEvent from T205] ... */ 
    const timestamp = event.timestamp ? formatDate(event.timestamp) : 'N/A';
    let icon = <Info size={14} className="mr-2 flex-shrink-0" />;
    let title = event.type || 'Event';
    let details = "";
    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let cardClassName = "mb-2 p-2.5 rounded-lg border bg-card text-card-foreground shadow-sm text-xs";

    switch (event.type) {
      case 'RunStarted':
        icon = <PlayCircle size={14} className="mr-2 text-blue-500 flex-shrink-0" />;
        title = "Run Started"; details = `Cycle ID: ${event.runId}`; badgeVariant = "default";
        cardClassName += " border-blue-500/50 bg-blue-500/5"; break;
      case 'StepStarted':
        icon = <ChevronRight size={14} className="mr-2 text-gray-500 flex-shrink-0" />;
        title = `Step Started: ${event.stepName}`; badgeVariant = "outline";
        details = event.message || ""; break;
      case 'TextMessageContent':
        icon = <MessageSquare size={14} className="mr-2 text-sky-500 flex-shrink-0" />;
        title = "Thought / Log"; details = event.delta; badgeVariant = "outline";
        cardClassName += " bg-sky-500/5"; break;
      case 'StepFinished':
        icon = <CheckCircle2 size={14} className="mr-2 text-green-500 flex-shrink-0" />;
        title = `Step Finished: ${event.stepName}`; badgeVariant = "default";
        details = event.output ? `Output: ${typeof event.output === 'string' ? event.output.substring(0,150) : JSON.stringify(event.output).substring(0,150)}...` : "No output.";
        cardClassName += " border-green-500/50 bg-green-500/5"; break;
      case 'RunFinished':
        icon = <CheckCircle2 size={14} className="mr-2 text-green-600 flex-shrink-0" />;
        title = "Run Finished";
        details = `Cycle ID: ${event.runId}. Result: ${event.result ? (typeof event.result === 'string' ? event.result.substring(0,150) : JSON.stringify(event.result).substring(0,150)) + '...' : 'N/A'}`;
        badgeVariant = "default"; cardClassName += " border-green-600/60 bg-green-600/10"; break;
      case 'RunError':
        icon = <XCircle size={14} className="mr-2 text-red-500 flex-shrink-0" />;
        title = "Run Error"; details = `Cycle ID: ${event.runId}. Error: ${event.message}`;
        badgeVariant = "destructive"; cardClassName += " border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400"; break;
      case 'RAW_ERROR':
        icon = <AlertTriangle size={14} className="mr-2 text-yellow-500 flex-shrink-0" />;
        title = "Parsing Error"; details = `Could not parse event data: ${event.data.substring(0,150)}...`;
        badgeVariant = "destructive"; cardClassName += " border-yellow-500/50 bg-yellow-500/10"; break;
      // Custom AG-UI events for HIL
      case 'custom':
        if (event.name === 'trade.approval.required') {
            icon = <ThumbsUp size={14} className="mr-2 text-amber-500 flex-shrink-0" />;
            title = "Trade Approval Required";
            const val = event.value as ProposedTradeSignalInterface;
            details = `Signal: ${val.action} ${val.symbol} @ ${val.execution_price || 'Market'}. Rationale: ${val.rationale.substring(0,100)}...`;
            badgeVariant = "destructive"; cardClassName += " border-amber-500/50 bg-amber-500/10";
        } else if (event.name === 'trade.executed' || event.name === 'trade.execution_failed') {
            icon = <CheckCircle2 size={14} className="mr-2 text-green-500 flex-shrink-0" />;
            title = event.name === 'trade.executed' ? "Trade Executed" : "Trade Execution Failed";
            details = `Status: ${event.value?.status}. Reason: ${event.value?.reason || event.value?.notes || 'N/A'}`;
            badgeVariant = event.name === 'trade.executed' && event.value?.status === 'success' ? "default" : "destructive";
        } else if (event.name === 'trade.rejected') {
            icon = <ThumbsDown size={14} className="mr-2 text-orange-500 flex-shrink-0" />;
            title = "Trade Rejected"; details = `Reason: ${event.value?.reason}`; badgeVariant = "secondary";
        } else {
            icon = <Zap size={14} className="mr-2 text-purple-500 flex-shrink-0" />; title = `Custom: ${event.name}`;
            details = JSON.stringify(event.value, null, 2); badgeVariant = "secondary";
        }
        break;
      default:
        icon = <Zap size={14} className="mr-2 text-purple-500 flex-shrink-0" />; title = event.type || 'Unknown Event';
        details = event.message || event.delta || JSON.stringify(event, (key, value) => key === "type" || key === "timestamp" ? undefined : value, 2);
        badgeVariant = "secondary"; break;
    }
    return (
      <div key={index} className={cardClassName}>
        <div className="flex items-center mb-1"> {icon}
          <span className="font-semibold text-xs uppercase tracking-wider mr-2">{title}</span>
          <Badge variant={badgeVariant} className="text-xs h-5 px-1.5 py-0.5">{event.type === 'custom' ? event.name : event.type || 'EVENT'}</Badge>
          <span className="ml-auto font-mono text-xs text-muted-foreground">{timestamp}</span>
        </div>
        {details && <p className="text-xs text-muted-foreground pl-6 break-words whitespace-pre-wrap">{details}</p>}
      </div>
    );
  };
  
  if (!taskId) { /* ... [existing !taskId JSX] ... */ 
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Task ID is missing from the URL.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading and Error states for agent details
  if (isLoading && !taskDetails) { /* ... [existing loading JSX] ... */ 
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/4 mb-4" />
        <Skeleton className="h-12 w-1/2 mb-8" />
        <div className="space-y-6">
          <Card><CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }
  if (error) { /* ... [existing error JSX] ... */ 
    return (
      <div className="container mx-auto py-10">
         <Button variant="outline" size="sm" asChild className="mb-4"><Link href="/dashboard/agents"><ChevronLeft className="mr-2 h-4 w-4" />Back to Agents</Link></Button>
        <Alert variant="destructive"><AlertTitle>Error Fetching Task</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      </div>
    );
  }
  if (!taskDetails) { /* ... [existing !taskDetails JSX] ... */ 
    return (
      <div className="container mx-auto py-10">
        <Button variant="outline" size="sm" asChild className="mb-4"><Link href="/dashboard/agents"><ChevronLeft className="mr-2 h-4 w-4" />Back to Agents</Link></Button>
        <Alert><AlertTitle>Agent Task Not Found</AlertTitle><AlertDescription>The requested task (ID: {taskId}) could not be found.</AlertDescription></Alert>
      </div>
    );
  }

  const proposedSignal = taskDetails.results?.proposed_trade_signal as ProposedTradeSignalInterface | undefined;

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {taskDetails.status === "AWAITING_APPROVAL" && (
            <Link href={`/dashboard/crew-runs/${taskId}#hil-actions`}> {/* Link to HIL section */}
                <Button variant="destructive" className="animate-pulse">
                    <ThumbsUp className="mr-2 h-4 w-4" /> Action Required
                </Button>
            </Link>
        )}
        {(taskDetails.status === "PENDING" || taskDetails.status === "RUNNING") && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isCancelling}>
                {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                Cancel Task
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will request cancellation. If running, it might complete before stopping.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Dismiss</AlertDialogCancel><AlertDialogAction onClick={handleCancelTask} disabled={isCancelling} className="bg-destructive hover:bg-destructive/90">Yes, Cancel</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold break-all">Crew Run Details: {taskId}</h1>
      </header>

      {/* ... [existing taskDetails display cards for summary and input_parameters] ... */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Task Summary</CardTitle></CardHeader>
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
              <CardHeader><CardTitle>Input Parameters</CardTitle></CardHeader>
              <CardContent>
                {taskDetails.input_parameters ? (<pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto"><code>{JSON.stringify(taskDetails.input_parameters, null, 2)}</code></pre>) : (<p className="text-sm text-muted-foreground">No input parameters.</p>)}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card id="hil-actions"> {/* ID for linking */}
              <CardHeader><CardTitle>Results / Error / Pending Actions</CardTitle></CardHeader>
              <CardContent>
                {taskDetails.status === 'AWAITING_APPROVAL' && proposedSignal && (
                  <Card className="mb-4 border-amber-500/50 bg-amber-500/5 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center"><ThumbsUp size={18} className="mr-2"/> Action Required: Approve Trade</CardTitle>
                      <CardDescription>Review the proposed trade signal below and choose to approve or reject.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div><strong>Symbol:</strong> <Badge variant="outline">{proposedSignal.symbol}</Badge></div>
                      <div><strong>Action:</strong> <Badge variant={proposedSignal.action === "BUY" ? "default" : proposedSignal.action === "SELL" ? "destructive" : "secondary"}>{proposedSignal.action}</Badge></div>
                      <div><strong>Confidence:</strong> {proposedSignal.confidence.toFixed(2)}</div>
                      {proposedSignal.execution_price && <div><strong>Proposed Price:</strong> {proposedSignal.execution_price}</div>}
                      <div><strong>Rationale:</strong> <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md whitespace-pre-wrap">{proposedSignal.rationale}</p></div>
                      <div className="flex space-x-3 pt-3">
                        <Button onClick={handleApproveTrade} disabled={isSubmittingApproval} className="bg-green-600 hover:bg-green-700">
                          {isSubmittingApproval ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4"/>} Approve
                        </Button>
                        <Button variant="destructive" onClick={handleRejectTrade} disabled={isSubmittingApproval}>
                          {isSubmittingApproval ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4"/>} Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {/* ... [rest of existing results/error display logic from T203] ... */}
                {taskDetails.status === 'COMPLETED' && taskDetails.results && ( /* ... */ ) }
                {taskDetails.status === 'FAILED' && taskDetails.error_message && ( /* ... */ ) }
                {(taskDetails.status === 'PENDING' || taskDetails.status === 'RUNNING') && !proposedSignal && ( <p>Results will appear once task is complete. Polling...</p> )}
                {(taskDetails.status === 'COMPLETED' && !taskDetails.results) && ( <p>Task completed, but no results were provided.</p> )}
              </CardContent>
            </Card>
            
            <Card> {/* Live Activity Stream Card */}
                <CardHeader><CardTitle>Live Activity Stream</CardTitle><CardDescription>WebSocket Status: <Badge variant={wsStatus === "Connected" ? "default" : "outline"}>{wsStatus}</Badge></CardDescription></CardHeader>
                <CardContent><div className="h-96 overflow-y-auto p-2 border rounded-md bg-muted/20">{wsEvents.length === 0 && <p className="text-sm text-muted-foreground">No events yet...</p>}{wsEvents.map(renderWsEvent)}</div></CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
