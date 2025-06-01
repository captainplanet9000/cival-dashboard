"use client";

import React, { useState, useEffect } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, FileUp, Check, AlertTriangle, BrainCircuit, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface BrainFileProcessorProps {
  farmId?: string;
}

interface ProcessingTask {
  id: string;
  brain_file_id: string;
  process_type: string;
  status: string;
  created_at: string;
  brain_file?: {
    file_name: string;
    title: string;
  };
}

interface ProcessingStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export function BrainFileProcessor({ farmId }: BrainFileProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<ProcessingStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createBrowserClient();

  // Fetch processing tasks
  const { 
    data: processingTasks = [], 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['brainProcessingTasks', farmId],
    queryFn: async () => {
      let query = supabase
        .from('brain_file_processing_queue')
        .select('*, brain_file:brain_files(file_name, title)')
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (farmId) {
        // Add farm filter with join to brain_files
        query = query.or(`brain_file.farm_id.eq.${farmId},brain_file.farm_id.is.null`);
      }
        
      const { data, error } = await query;
        
      if (error) throw error;
      return data as ProcessingTask[];
    },
    refetchInterval: isProcessing ? 5000 : false, // Poll every 5 seconds when processing
  });

  // Calculate stats whenever tasks change
  useEffect(() => {
    if (processingTasks && processingTasks.length > 0) {
      const newStats = processingTasks.reduce((acc, task) => {
        if (task.status === "pending") acc.pending++;
        else if (task.status === "processing") acc.processing++;
        else if (task.status === "completed") acc.completed++;
        else if (task.status === "failed") acc.failed++;
        acc.total++;
        return acc;
      }, { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 });
      
      setStats(newStats);
      
      // If we have any processing or pending tasks, set processing to true
      setIsProcessing(newStats.pending > 0 || newStats.processing > 0);
    } else {
      setIsProcessing(false);
    }
  }, [processingTasks]);

  const processPendingFiles = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "You need to be logged in to process files",
          variant: "destructive",
        });
        return;
      }
      
      // Get brain files without embeddings that should be auto-processed
      const { data: filesToProcess, error: fetchError } = await supabase
        .from('brain_files')
        .select('id, file_name')
        .eq('has_embedding', false)
        .eq('auto_process', true)
        .eq('is_deleted', false);
        
      if (fetchError) throw fetchError;
      
      if (!filesToProcess || filesToProcess.length === 0) {
        toast({
          title: "No files to process",
          description: "There are no files awaiting processing",
        });
        return;
      }
      
      // Create processing tasks for each file
      const processingTasks = filesToProcess.flatMap(file => ([
        {
          brain_file_id: file.id,
          process_type: 'extract_content',
          priority: 5,
          status: 'pending'
        },
        {
          brain_file_id: file.id,
          process_type: 'generate_embedding',
          priority: 10,
          status: 'pending'
        }
      ]));
      
      const { error: insertError } = await supabase
        .from('brain_file_processing_queue')
        .insert(processingTasks);
        
      if (insertError) throw insertError;
      
      toast({
        title: "Processing started",
        description: `Started processing ${filesToProcess.length} files`,
      });
      
      setIsProcessing(true);
      refetch();
      
      // Invalidate the brain files query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['brainFiles'] });
      
    } catch (error: any) {
      console.error("Error processing files:", error);
      toast({
        title: "Processing error",
        description: error.message || "Failed to start processing",
        variant: "destructive",
      });
    }
  };

  const retryFailedTasks = async () => {
    try {
      // Get failed tasks
      const { data: failedTasks, error: fetchError } = await supabase
        .from('brain_file_processing_queue')
        .select('id')
        .eq('status', 'failed');
        
      if (fetchError) throw fetchError;
      
      if (!failedTasks || failedTasks.length === 0) {
        toast({
          title: "No failed tasks",
          description: "There are no failed tasks to retry",
        });
        return;
      }
      
      // Update failed tasks to pending
      const { error: updateError } = await supabase
        .from('brain_file_processing_queue')
        .update({ status: 'pending' })
        .in('id', failedTasks.map(task => task.id));
        
      if (updateError) throw updateError;
      
      toast({
        title: "Retry initiated",
        description: `Retrying ${failedTasks.length} failed tasks`,
      });
      
      setIsProcessing(true);
      refetch();
      
    } catch (error: any) {
      console.error("Error retrying tasks:", error);
      toast({
        title: "Retry error",
        description: error.message || "Failed to retry tasks",
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'outline' as const;
      case 'processing':
        return 'secondary' as const;
      case 'failed':
        return 'destructive' as const;
      default:
        return 'default' as const;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-3 w-3" />;
      case 'processing':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <FileUp className="h-3 w-3" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Brain File Processing</CardTitle>
            <CardDescription>
              Process your brain files with ElizaOS for knowledge integration
            </CardDescription>
          </div>
          <BrainCircuit className="h-8 w-8 text-primary opacity-80" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Processing Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-md bg-muted/50">
            <div className="text-2xl font-bold">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="p-2 rounded-md bg-muted/50">
            <div className="text-2xl font-bold">{stats.processing}</div>
            <div className="text-xs text-muted-foreground">Processing</div>
          </div>
          <div className="p-2 rounded-md bg-muted/50">
            <div className="text-2xl font-bold">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="p-2 rounded-md bg-muted/50">
            <div className="text-2xl font-bold">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>Processing Progress</span>
            <span>{stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0}%</span>
          </div>
          <Progress value={stats.total > 0 ? (stats.completed / stats.total * 100) : 0} className="h-2" />
        </div>
        
        <Separator />
        
        {/* Recent Tasks */}
        <div>
          <h4 className="text-sm font-medium mb-2">Recent Processing Tasks</h4>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 bg-muted animate-pulse rounded-md" />
              ))}
            </div>
          ) : processingTasks.length > 0 ? (
            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
              {processingTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between text-sm p-2 bg-muted/40 rounded-md">
                  <div className="flex items-center gap-2 truncate">
                    <Badge variant={getStatusVariant(task.status)} className="h-5 w-5 p-0 flex items-center justify-center">
                      {getStatusIcon(task.status)}
                    </Badge>
                    <span className="truncate">{task.brain_file?.title || task.brain_file?.file_name || "Unknown file"}</span>
                  </div>
                  <Badge variant="outline" className="ml-2 whitespace-nowrap">
                    {task.process_type.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No recent processing tasks found
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={retryFailedTasks}
            disabled={stats.failed === 0}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Retry Failed
          </Button>
          
          <Button 
            size="sm" 
            onClick={processPendingFiles}
            disabled={isProcessing}
          >
            <BrainCircuit className="h-4 w-4 mr-2" />
            Process Files
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
