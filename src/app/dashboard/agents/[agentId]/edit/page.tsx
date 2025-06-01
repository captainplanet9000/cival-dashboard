'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { 
    getAgentDetails, 
    getStrategies, 
    getAvailableLlms, // Added
    // getUserWallets, 
    type TradingAgentDetailsInterface, 
    type TradingStrategy,
    // type Wallet 
} from '@/lib/clients/apiClient';
import { AgentEditForm } from '@/components/agent/AgentEditForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft } from 'lucide-react';

export default function EditAgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;

  const [agent, setAgent] = useState<TradingAgentDetailsInterface | null>(null);
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [availableLlms, setAvailableLlms] = useState<string[]>([]); // Added state for LLMs
  // const [userWallets, setUserWallets] = useState<Wallet[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) {
        setError("Agent ID is missing from URL.");
        setIsLoading(false);
        return;
    };

    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const [agentData, strategiesData, llmsData/*, walletsData*/] = await Promise.all([
          getAgentDetails(agentId),
          getStrategies(),
          getAvailableLlms(), // Fetch LLMs
          // getUserWallets(), 
        ]);
        setAgent(agentData);
        setStrategies(strategiesData);
        setAvailableLlms(llmsData); // Set LLMs
        // setUserWallets(walletsData);
      } catch (err: any) {
        console.error("Failed to fetch agent edit data:", err);
        setError(err.message || 'Failed to load data for agent editing.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [agentId]);

  const handleSuccess = (updatedAgent: TradingAgentDetailsInterface) => {
    // Optionally, re-fetch agent data or update local state if needed
    // For now, just navigate back to the agent detail page or agent list
    router.push(`/dashboard/agents`); // Or `/dashboard/agents/${updatedAgent.agent_id}` if detail page exists
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/4 mb-4" />
        <Skeleton className="h-12 w-1/2 mb-8" />
        <div className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-10 w-1/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
         <Button variant="outline" size="sm" asChild className="mb-4">
            <Link href="/dashboard/agents">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Agents
            </Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Error Loading Page</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container mx-auto py-10">
         <Button variant="outline" size="sm" asChild className="mb-4">
            <Link href="/dashboard/agents">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Agents
            </Link>
        </Button>
        <Alert>
          <AlertTitle>Agent Not Found</AlertTitle>
          <AlertDescription>The requested agent could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/agents">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Agents List
            </Link>
        </Button>
      </div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Edit Agent: {agent.agent_name}</h1>
        <p className="text-sm text-muted-foreground">Agent ID: {agent.agent_id}</p>
      </header>
      <AgentEditForm 
        agent={agent} 
        strategies={strategies} 
        availableLlms={availableLlms} // Pass LLMs to form
        // userWallets={userWallets} 
        onSuccess={handleSuccess} 
      />
    </div>
  );
}
