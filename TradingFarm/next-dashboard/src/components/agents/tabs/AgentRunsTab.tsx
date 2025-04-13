/**
 * Agent Runs Tab Component
 * Displays agent execution history and activity
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Terminal, CalendarClock, Activity, AlertCircle, PlayCircle, Eye } from 'lucide-react';
import { agentService, AgentRun, AgentMessage } from '@/services/agent-service';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface AgentRunsTabProps {
  agentId: string;
}

export function AgentRunsTab({ agentId }: AgentRunsTabProps) {
  const { toast } = useToast();
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [errorRuns, setErrorRuns] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  useEffect(() => {
    loadAgentRuns();
  }, [agentId]);
  
  const loadAgentRuns = async () => {
    setIsLoadingRuns(true);
    setErrorRuns(null);
    
    try {
      const response = await agentService.getAgentRuns(agentId);
      if (response.success && response.data) {
        setRuns(response.data);
      } else {
        setErrorRuns(response.error || 'Failed to load agent runs');
      }
    } catch (error: any) {
      console.error('Error loading agent runs:', error);
      setErrorRuns(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoadingRuns(false);
    }
  };
  
  const loadRunMessages = async (runId: string) => {
    setIsLoadingMessages(true);
    setErrorMessages(null);
    
    try {
      const response = await agentService.getAgentMessages(runId);
      if (response.success && response.data) {
        setMessages(response.data);
      } else {
        setErrorMessages(response.error || 'Failed to load messages');
      }
    } catch (error: any) {
      console.error('Error loading run messages:', error);
      setErrorMessages(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoadingMessages(false);
    }
  };
  
  const handleViewRun = (run: AgentRun) => {
    setSelectedRun(run);
    loadRunMessages(run.id);
    setIsDialogOpen(true);
  };
  
  const handleStartNewRun = async () => {
    try {
      const response = await agentService.startAgentRun(agentId, {});
      
      if (response.success && response.data) {
        toast({
          title: 'Agent Run Started',
          description: 'A new agent run has been initiated.',
        });
        
        await loadAgentRuns();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to start agent run',
        });
      }
    } catch (error: any) {
      console.error('Error starting agent run:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
      });
    }
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running': return 'bg-blue-500 text-white';
      case 'completed': return 'bg-green-500 text-white';
      case 'failed': return 'bg-red-500 text-white';
      case 'stopped': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };
  
  // Format duration between dates
  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'In progress';
    
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const durationMs = endTime - startTime;
    
    if (durationMs < 60000) {
      return `${Math.round(durationMs / 1000)}s`;
    } else if (durationMs < 3600000) {
      return `${Math.round(durationMs / 60000)}m`;
    } else {
      const hours = Math.floor(durationMs / 3600000);
      const minutes = Math.round((durationMs % 3600000) / 60000);
      return `${hours}h ${minutes}m`;
    }
  };
  
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Agent Runs</h3>
        <Button 
          onClick={handleStartNewRun}
          className="flex items-center gap-2"
        >
          <PlayCircle className="h-4 w-4" />
          <span>Start New Run</span>
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Execution History
          </CardTitle>
          <CardDescription>
            View previous agent executions and their results
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoadingRuns ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center p-3 border rounded-md">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : errorRuns ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorRuns}</AlertDescription>
            </Alert>
          ) : runs.length === 0 ? (
            <div className="text-center py-8 border rounded-md">
              <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground mb-4">
                No execution history for this agent yet
              </p>
              <Button 
                variant="outline"
                onClick={handleStartNewRun}
              >
                Start First Run
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[350px]">
              <div className="space-y-3 p-1">
                {runs.map((run) => (
                  <div 
                    key={run.id}
                    className="flex justify-between items-center p-3 border rounded-md hover:bg-accent/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${getStatusColor(run.status)}`}>
                          {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                        </Badge>
                        <span className="text-sm font-medium">
                          {format(new Date(run.started_at), 'MMM d, yyyy • HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Duration: {formatDuration(run.started_at, run.ended_at)}</span>
                        {run.metrics && run.metrics.actions_count && (
                          <span>Actions: {run.metrics.actions_count}</span>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => handleViewRun(run)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
        
        <CardFooter>
          <div className="w-full flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Total: {runs.length} runs
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadAgentRuns}
              disabled={isLoadingRuns}
            >
              {isLoadingRuns ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  <span>Loading...</span>
                </>
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* Run Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Run Details</DialogTitle>
            <DialogDescription>
              {selectedRun && (
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="outline" className={`${getStatusColor(selectedRun.status)}`}>
                    {selectedRun.status.charAt(0).toUpperCase() + selectedRun.status.slice(1)}
                  </Badge>
                  <span>
                    Started: {format(new Date(selectedRun.started_at), 'MMM d, yyyy • HH:mm')}
                  </span>
                  <span>
                    Duration: {formatDuration(selectedRun.started_at, selectedRun.ended_at)}
                  </span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="messages" className="flex-1 overflow-hidden flex flex-col">
            <TabsList>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="data">Run Data</TabsTrigger>
            </TabsList>
            
            <TabsContent value="messages" className="flex-1 overflow-hidden flex flex-col mt-0 pt-4">
              {isLoadingMessages ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : errorMessages ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessages}</AlertDescription>
                </Alert>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <Terminal className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No messages in this run</p>
                </div>
              ) : (
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div 
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.role === 'system'
                            ? 'bg-yellow-100/50 dark:bg-yellow-900/20'
                            : message.role === 'user'
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : message.role === 'agent'
                            ? 'bg-blue-100/50 dark:bg-blue-900/20'
                            : 'bg-green-100/50 dark:bg-green-900/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            {message.role.charAt(0).toUpperCase() + message.role.slice(1)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.timestamp), 'HH:mm:ss')}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
            
            <TabsContent value="metrics" className="flex-1 overflow-hidden flex flex-col mt-0 pt-4">
              {!selectedRun?.metrics || Object.keys(selectedRun.metrics).length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No metrics available for this run</p>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedRun.metrics).map(([key, value]) => (
                      <Card key={key}>
                        <CardHeader className="py-2">
                          <CardTitle className="text-sm">
                            {key.split('_').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {typeof value === 'number' 
                              ? value % 1 === 0 ? value : value.toFixed(2)
                              : JSON.stringify(value)
                            }
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
            
            <TabsContent value="data" className="flex-1 overflow-hidden flex flex-col mt-0 pt-4">
              {!selectedRun?.data || Object.keys(selectedRun.data).length === 0 ? (
                <div className="text-center py-8">
                  <Terminal className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No data available for this run</p>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <pre className="text-xs p-4 bg-gray-100 dark:bg-gray-800 rounded-md overflow-auto">
                    {JSON.stringify(selectedRun.data, null, 2)}
                  </pre>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
