// src/app/dashboard/agents/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { AgentList } from '@/components/agent/AgentList';
import { getTradingAgents, type TradingAgentWithDetails } from '@/lib/clients/apiClient';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For error state
import { Terminal, PlusCircle } from "lucide-react";

export default function AgentsDashboardPage() {
  const [agents, setAgents] = useState<TradingAgentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedAgents = await getTradingAgents();
      setAgents(fetchedAgents);
    } catch (err: any) {
      console.error("Failed to fetch trading agents:", err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Trading Agents</h1>
        <Link href="/dashboard/agents/create" passHref legacyBehavior>
          <Button asChild>
            <a>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Agent
            </a>
          </Button>
        </Link>
      </div>

      {isLoading && (
         <div className="space-y-4">
            {/* Simple table skeleton */}
            <Skeleton className="h-12 w-full" /> {/* Header */}
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
         </div>
      )}

      {!isLoading && error && (
        <Alert variant="destructive" className="mb-6">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Agents</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <AgentList agents={agents} onRefresh={fetchAgents} />
      )}
    </div>
  );
}