"use client";

import React, { useEffect, useState } from "react";
import { farmService } from "@/services/farm-service";
import { agentService } from "@/services/agent-service";
import { elizaAgentService } from "@/services/eliza-agent-service"; 
import { goalService } from "@/services/goal-service";
import { Farm } from "@/services/farm-service";
import { Goal } from "@/services/goal-service";
import Link from "next/link";
import { FarmDashboard } from '@/components/farms/farm-dashboard';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FarmDetailPageProps {
  params: {
    id: string;
  };
}

export default function FarmDetailPage({ params }: FarmDetailPageProps) {
  const [farm, setFarm] = useState<Farm | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [elizaAgents, setElizaAgents] = useState<any[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [statusSummary, setStatusSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFarmData() {
      setLoading(true);
      
      try {
        const farmId = params.id;
        
        if (!farmId) {
          setError("Invalid farm ID");
          setLoading(false);
          return;
        }
        
        // Fetch the farm details
        const farmResponse = await farmService.getFarmById(farmId);
        
        if (farmResponse.error || !farmResponse.data) {
          throw new Error(farmResponse.error || "Failed to load farm");
        }
        
        setFarm(farmResponse.data);
        
        // Fetch status summary
        const summaryResponse = await farmService.getFarmStatusSummary(farmId);
        if (!summaryResponse.error && summaryResponse.data) {
          setStatusSummary(summaryResponse.data);
        }
        
        // Fetch standard agents for this farm
        const agentsResponse = await farmService.getAgents(farmId);
        if (!agentsResponse.error && agentsResponse.data) {
          setAgents(agentsResponse.data);
        }
        
        // Fetch ElizaOS agents for this farm
        const elizaResponse = await farmService.getElizaAgents(farmId);
        if (!elizaResponse.error && elizaResponse.data) {
          setElizaAgents(elizaResponse.data);
        }
        
        // Fetch goals for this farm
        const goalsResponse = await goalService.getGoals(farmId);
        if (!goalsResponse.error && goalsResponse.data) {
          setGoals(goalsResponse.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load farm data");
      } finally {
        setLoading(false);
      }
    }
    
    fetchFarmData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-start justify-between space-y-4 sm:flex-row sm:space-y-0">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-[300px] w-full rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center py-8">
        <Alert variant="destructive" className="max-w-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Farm</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <div className="mt-4">
            <Link href="/dashboard/farms" className="text-blue-600 hover:underline">
              Back to Farms
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="flex h-full items-center justify-center py-8">
        <Alert variant="default" className="max-w-xl">
          <AlertTitle>Farm Not Found</AlertTitle>
          <AlertDescription>The requested farm could not be found.</AlertDescription>
          <div className="mt-4">
            <Link href="/dashboard/farms" className="text-blue-600 hover:underline">
              Back to Farms
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <FarmDashboard 
        farm={farm}
        statusSummary={statusSummary}
        agents={agents}
        elizaAgents={elizaAgents}
        goals={goals}
      />
    </div>
  );
}