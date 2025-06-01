'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getAgentDetails,
  getAgentMemories, // New import
  type TradingAgentDetailsInterface,
} from '@/lib/clients/apiClient';
import { type MemoryEntryInterface } from '@/lib/types/memory'; // New import

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Brain, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

// Helper to format date strings
const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString();
  } catch (e) {
    return dateString; 
  }
};

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const agentId = params.agentId as string;

  const [agentDetails, setAgentDetails] = useState<TradingAgentDetailsInterface | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(true);
  const [agentError, setAgentError] = useState<string | null>(null);

  const [memories, setMemories] = useState<MemoryEntryInterface[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [memoriesError, setMemoriesError] = useState<string | null>(null);

  // useCallback for fetchAgentData to avoid re-creating it on every render
  const fetchAgentData = React.useCallback(async () => {
    if (!agentId) return;
    setIsLoadingAgent(true);
    setAgentError(null);
    try {
      const data = await getAgentDetails(agentId);
      setAgentDetails(data);
    } catch (err: any) {
      console.error("Failed to fetch agent details:", err);
      setAgentError(err.message || 'Failed to load agent details.');
      toast({ title: "Error Fetching Agent", description: err.message, variant: "destructive" });
    } finally {
      setIsLoadingAgent(false);
    }
  }, [agentId, toast]);
  
  // useCallback for fetchMemories
  const fetchMemories = React.useCallback(async () => {
    if (!agentId) return;
    setIsLoadingMemories(true);
    setMemoriesError(null);
    try {
      const fetchedMemories = await getAgentMemories(agentId, "*", 20); // Default query and limit
      
      // Check if the response itself is an error structure (e.g., from backend returning error in list)
      if (Array.isArray(fetchedMemories) && fetchedMemories.length > 0 && fetchedMemories[0] && 'error' in fetchedMemories[0]) {
        const errorMsg = (fetchedMemories[0] as any).error;
        setMemoriesError(errorMsg);
        setMemories([]);
        toast({ title: "Error Fetching Memories", description: errorMsg, variant: "destructive" });
      } else {
        setMemories(fetchedMemories);
        if (fetchedMemories.length === 0) {
            toast({ title: "Agent Memories", description: "No memories found for this agent.", variant: "default" });
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch agent memories:", err);
      const errorMsg = err.message || 'Failed to load agent memories.';
      setMemoriesError(errorMsg);
      toast({ title: "Error Fetching Memories", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoadingMemories(false);
    }
  }, [agentId, toast]);

  useEffect(() => {
    fetchAgentData();
    fetchMemories();
  }, [fetchAgentData, fetchMemories]); // Dependencies for useEffect

  if (isLoadingAgent) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/4 mb-4" />
        <Skeleton className="h-12 w-1/2 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (agentError) {
    return (
      <div className="container mx-auto py-10">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/dashboard/agents"><ChevronLeft className="mr-2 h-4 w-4" />Back to Agents</Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Error Loading Agent</AlertTitle>
          <AlertDescription>{agentError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!agentDetails) {
    return (
      <div className="container mx-auto py-10">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/dashboard/agents"><ChevronLeft className="mr-2 h-4 w-4" />Back to Agents</Link>
        </Button>
        <Alert>
          <AlertTitle>Agent Not Found</AlertTitle>
          <AlertDescription>The requested agent (ID: {agentId}) could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Link href={`/dashboard/agents/${agentId}/edit`}>
            <Button variant="outline">Edit Agent</Button>
        </Link>
      </div>

      <header className="mb-4">
        <h1 className="text-3xl font-bold">Agent: {agentDetails.agent_name}</h1>
        <p className="text-sm text-muted-foreground">ID: <span className="font-mono">{agentDetails.agent_id}</span></p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6"> {/* Main content area */}
            <Card>
              <CardHeader><CardTitle>Agent Details</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Status:</strong> <Badge>{agentDetails.status}</Badge></p>
                <p><strong>Description:</strong> {agentDetails.description || 'N/A'}</p>
                <p><strong>Strategy ID:</strong> {agentDetails.assigned_strategy_id || 'N/A'}</p>
                <p><strong>Wallet ID:</strong> {agentDetails.wallet_id || 'N/A'}</p>
                <p><strong>Created At:</strong> {formatDate(agentDetails.created_at)}</p>
                <p><strong>Last Updated:</strong> {formatDate(agentDetails.updated_at)}</p>
              </CardContent>
            </Card>

            {agentDetails.configuration_parameters && (
              <Card>
                <CardHeader><CardTitle>Configuration Parameters</CardTitle></CardHeader>
                <CardContent>
                  <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                    <code>{JSON.stringify(agentDetails.configuration_parameters, null, 2)}</code>
                  </pre>
                </CardContent>
              </Card>
            )}
        </div>

        <div className="lg:col-span-1 space-y-6"> {/* Sidebar area for memories */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center"><Brain className="mr-2 h-5 w-5" /> Agent Memory</CardTitle>
                        <Button variant="outline" size="icon" onClick={fetchMemories} disabled={isLoadingMemories} title="Refresh Memories">
                            {isLoadingMemories ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                    </div>
                    <CardDescription>A sample of recent or relevant memories from MemGPT.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingMemories && !memoriesError && memories.length === 0 && 
                        <div className="flex justify-center items-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    }
                    {memoriesError && 
                        <Alert variant="destructive" className="text-xs">
                            <AlertTitle className="text-sm">Memory Error</AlertTitle>
                            <AlertDescription>{memoriesError}</AlertDescription>
                        </Alert>
                    }
                    {!isLoadingMemories && !memoriesError && memories.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No memories found or available.</p>
                    )}
                    {!isLoadingMemories && !memoriesError && memories.length > 0 && (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 text-xs">
                            {memories.map((memory, index) => (
                                <div key={index} className="p-2.5 border rounded-md bg-background hover:bg-muted/50 transition-colors">
                                    <p className="whitespace-pre-wrap break-words leading-relaxed">{memory.retrieved_memory_content}</p>
                                    {/* Add timestamp or score if available in MemoryEntryInterface and desired */}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
